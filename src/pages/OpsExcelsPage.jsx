import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { can as canPerm } from '../lib/permissions.js'
import { Modal, ActionButton, Dropdown } from '../components/ui/FormKit.jsx'
import OpsChatPanel, { useOpsChat, cellMarkKey } from '../components/OpsChat.jsx'
import { buildAjeerContractBookmarklet, buildAjeerNoticeBookmarklet, buildAjeerSecondmentBookmarklet, buildAjeerSecondmentInvoiceBookmarklet, buildAjeerEligibilityScanBookmarklet, buildAjeerTraceBookmarklet } from './ajeerRequestBookmarklet.js'
import { Save, Trash2 } from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════════
   اكسلات العمليات — تبويب تحت «مركز المزامنة».

   قائمة منسدلة تختار «العرض» (view). كل عرض = شيت إكسل مستقل بأعمدته الخاصة،
   يُعرض بنفس محرّك شبكة «جدول إصدار التأشيرات» (تنقّل كيبورد، لصق من إكسل،
   تعبئة بالسحب، نسخ، سحب عرض الأعمدة، تجميد الرأس، حفظ دفعي).

   عمودان نوعان:
     · مزامنة/مشتقّة (قراءة فقط) — من جداول مركز المزامنة (عبر col.get).
     · تشغيلية (ops:true, تُحرَّر)  — يُدخلها الموظف يدوياً وتُخزَّن في overlay عام.

   عمليات إكسل على الصفوف (طلب المستخدم):
     · إضافة شخص جديد  — صف يدوي (is_manual) كل خلاياه تُحرَّر.
     · حذف صف          — الصف المُزامَن يُخفى (hidden)، والصف اليدوي يُحذف فعلاً.
     · إعادة الترتيب    — sort_order يحدده المستخدم (تحريك لأعلى/أسفل).

   طبقة التخزين العامة: ops_sheet_rows(view_key, row_key, data jsonb,
   sort_order, hidden, is_manual). لإضافة عرض جديد: أضف عنصراً في VIEWS فقط.

   تنبيهان تقنيان (من الجدول الشقيق): لا ألوان ثابتة داكنة (var(--*))، ولا تُدرِج
   في اعتماديات useEffect قيمةً مُعرَّفة أسفله (Vite لا يحلّل TDZ).
   ═══════════════════════════════════════════════════════════════════════════ */

const F = "'Cairo','Tajawal',sans-serif"
const MONO = 'ui-monospace,SFMono-Regular,Menlo,monospace'
const C = { gold: '#B07D00', gold2: '#D4A017', blue: '#5dade2', red: '#e87265' }
// كل الصفوف في صفحة واحدة (بلا ترقيم عملياً): الرسم الافتراضي يتكفّل بالأداء —
// لا يُرسَم إلا ما يظهر في الشاشة، فالتمرير المتواصل أفضل من تقطيع الصفحات.
const PAGE_ROWS = 1000000
const ROW_H = 38
const COL_H = 36
const SAVE_CONCURRENCY = 6
// لوحة المحادثة تبقى مفتوحة بعد تحديث الصفحة
const CHAT_OPEN_LS = 'jisr_ops_chat_open'

const latin = (s) => String(s ?? '')
  .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
  .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
const ymd = (v) => (v ? String(v).slice(0, 10) : '')
const enNum = (n) => Number(n || 0).toLocaleString('en-US')
const newKey = () => 'm_' + ((globalThis.crypto?.randomUUID?.()) || (Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36)))
const yn = (v, isAr) => (v == null ? '' : (v ? (isAr ? 'نعم' : 'Yes') : (isAr ? 'لا' : 'No')))
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/* لون نطاق قوى من اسمه (بلاتيني/أحمر/أصفر/أخضر بمستوياته) — يطابق nitaqBandColor في بقية الصفحات */
function nitaqBandColor(name) {
  if (!name) return null
  const n = String(name)
  if (n.includes('بلاتيني')) return '#8f96a3'
  if (n.includes('أحمر') || n.includes('احمر')) return '#ef4444'
  if (n.includes('أصفر') || n.includes('اصفر')) return '#eab308'
  if (n.includes('أخضر') || n.includes('اخضر')) {
    if (n.includes('مرتفع')) return '#22c55e'
    if (n.includes('متوسط')) return '#16a085'
    if (n.includes('منخفض') || n.includes('صغير')) return '#84cc16'
    return '#22c55e'
  }
  return null
}
/* ترجمة حالة إيداع القوائم المالية (SBC) للعربية عند لغة عربية */
const QAWAEM_STATUS_AR = {
  'pending for sbc approval': 'بانتظار موافقة المركز',
  'approved by sbc': 'معتمدة من المركز',
  'rejected by sbc': 'مرفوضة من المركز',
  'draft': 'مسودة',
}
const qawaemStatusLabel = (v, isAr) => { if (v == null || v === '') return ''; if (!isAr) return v; return QAWAEM_STATUS_AR[String(v).trim().toLowerCase()] || v }
/* خلفية خلية النطاق: تدرّج شفاف من لون النطاق ليُقرأ بلمحة مع بقاء النص واضحاً */
const nitaqBandBg = (name) => {
  const c = nitaqBandColor(name); if (!c) return null
  const r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16)
  return `rgba(${r},${g},${b},.30)`
}
/* مصدر كل عمود: مزامنة / فاتورة / إدخال / صيغة — يُعرض بنقطة ملوّنة في الرأس */
const COL_SRC = {
  sync: { ar: 'مزامنة', en: 'Sync', color: '#D4A017' },
  invoice: { ar: 'فاتورة', en: 'Invoice', color: '#5dade2' },
  entry: { ar: 'إدخال', en: 'Entry', color: '#2ecc71' },
  formula: { ar: 'صيغة', en: 'Formula', color: '#bb8fce' },
}
/* عمود «يُجلب تلقائياً» (auto:true): قراءة فقط، وخلفيته تظليل خفيف بلون مصدره
   (مزامنة ذهبي · فاتورة أزرق) — فيميّزه الموظف بلمحة عن أعمدة الإدخال. */
const AUTO_BG = { sync: 'rgba(212,160,23,.14)', invoice: 'rgba(93,173,226,.14)', formula: 'rgba(187,143,206,.14)', entry: 'rgba(46,204,113,.14)' }
/* اشتقاق مصدر البيانات من field_sources (مركز المزامنة): كل حقل → منصّته، و_synced → تواريخ المزامنة */
const SRC_LABELS = { qiwa: 'قوى', muqeem: 'مقيم', gosi: 'التأمينات', sbc: 'السجل التجاري', mudad: 'مدد', ajeer: 'أجير', absher: 'أبشر', chi: 'التأمين الصحي', hrsd: 'الموارد', nic: 'المركز الوطني' }
const srcLabel = (code, isAr) => (!code ? '' : (isAr ? (SRC_LABELS[code] || code) : code))
const deriveSources = (fs, isAr) => {
  if (!fs || typeof fs !== 'object') return ''
  const set = new Set()
  for (const k in fs) { if (k === '_synced') continue; const v = fs[k]; if (typeof v === 'string' && v) set.add(v) }
  return [...set].map((c) => srcLabel(c, isAr)).join('، ')
}
const deriveLastSync = (fs, fallback) => {
  let max = ''
  if (fs && typeof fs === 'object' && fs._synced) for (const k in fs._synced) { const v = fs._synced[k]; if (typeof v === 'string' && v > max) max = v }
  return max ? ymd(max) : ymd(fallback)
}
/* عمودان تشغيليان مشتركان يُلحَقان بكل عرض مُزامَن (يُحرَّران ويُخزَّنان في overlay) */
/* تظليل خفيف من لون سداسي — يبقى مقروءاً على الثيم الفاتح والداكن معاً،
   فلا نستعمل اللون الصريح خلفيةً بل rgba بشفافية منخفضة (كنمط nitaqBandBg). */
const hexTint = (hex, a = 0.26) => {
  const h = String(hex || '').trim().replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null
  const n = parseInt(h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}
/* عمود «اسم صاحب الحساب»: خلفيته لون الشخص نفسه — تمييز بلمحة بصر */
const personBgCol = (key, ar, en, colorKey) => ({
  key, ar, en, w: 150, kind: 'text',
  bg: (v, r) => (v ? hexTint(r?.[colorKey]) : null),
})

/* لون «المتبقّي بالأيام»: سالب = منتهٍ (أحمر) · ≤30 = قرب الانتهاء (أصفر) */
const daysFg = (v) => {
  const n = parseFloat(latin(String(v ?? '')).replace(/[^\d.\-]/g, ''))
  if (!Number.isFinite(n)) return null
  if (n < 0) return C.red
  if (n <= 30) return '#eab308'
  return null
}

const OPS_COLS = [
  { key: 'op_follow', ar: 'المتابعة', en: 'Follow-up', w: 150, kind: 'text', ops: true },
  { key: 'op_notes', ar: 'ملاحظات تشغيلية', en: 'Ops notes', w: 220, kind: 'text', ops: true },
]

/* ── التنسيق الشرطي: مقارنة القيمة (رقم/تاريخ/نص) بقاعدة ─────────────────── */
const cfNum = (s) => { const n = parseFloat(latin(String(s ?? '')).replace(/[^\d.\-]/g, '')); return Number.isFinite(n) ? n : null }
const cfDate = (s) => { const m = ymd(s); if (!m || !/^\d{4}-\d{2}-\d{2}/.test(m)) return null; const t = new Date(m + 'T00:00:00').getTime(); return Number.isNaN(t) ? null : t }
function cfMatch(cell, op, val) {
  const c = String(cell ?? ''), v = String(val ?? '')
  if (c === '') return false
  if (op === 'contains') return v !== '' && c.includes(v)
  let a = cfNum(c), b = cfNum(v)
  if (a === null || b === null) { const da = cfDate(c), db = cfDate(v); if (da !== null && db !== null) { a = da; b = db } else { if (op === '=') return c === v; if (op === '≠') return c !== v; return false } }
  switch (op) { case '>': return a > b; case '<': return a < b; case '>=': return a >= b; case '<=': return a <= b; case '=': return a === b; case '≠': return a !== b; default: return false }
}
// تدرّجات ناعمة تصلح للثيمين
const CF_COLORS = ['rgba(212,160,23,.32)', 'rgba(46,204,113,.28)', 'rgba(232,114,101,.28)', 'rgba(93,173,226,.28)', 'rgba(187,143,206,.30)', 'rgba(232,131,78,.30)']
const CF_OPS = ['>', '<', '>=', '<=', '=', '≠', 'contains']
const cfOpLabel = (op, isAr) => (op === 'contains' ? (isAr ? 'يحتوي' : 'contains') : op)

/* تنسيق النص لكل عمود */
const FONT_SIZES = [{ v: 11, ar: 'صغير', en: 'Small' }, { v: 12.5, ar: 'عادي', en: 'Normal' }, { v: 14, ar: 'متوسط', en: 'Medium' }, { v: 16, ar: 'كبير', en: 'Large' }, { v: 18.5, ar: 'أكبر', en: 'X-Large' }]
const TEXT_COLORS = ['var(--tx)', '#B07D00', '#2ecc71', '#e87265', '#5dade2', '#bb8fce', '#e8834e']

/* تنسيق الأرقام لكل عمود (اختيار المستخدم — يُحفظ في layout.numFmt) */
const NUM_FMTS = [
  { v: '', ar: 'كما هو', en: 'Plain' },
  { v: 'int', ar: 'صحيح', en: 'Integer' },
  { v: 'thousands', ar: 'فواصل آلاف', en: 'Thousands' },
  { v: 'currency', ar: 'ريال ﷼', en: 'SAR ﷼' },
  { v: 'percent', ar: 'نسبة %', en: 'Percent %' },
]
const COL_TYPES = [
  { v: '', ar: 'نص', en: 'Text' },
  { v: 'number', ar: 'رقم', en: 'Number' },
  { v: 'date', ar: 'تاريخ', en: 'Date' },
  { v: 'select', ar: 'قائمة منسدلة', en: 'Dropdown' },
]
const AGGS = [
  { v: '', ar: 'بدون', en: 'None' },
  { v: 'count', ar: 'عدد المعبّأ', en: 'Count' },
  { v: 'sum', ar: 'المجموع', en: 'Sum' },
  { v: 'avg', ar: 'المتوسط', en: 'Average' },
  { v: 'min', ar: 'الأدنى', en: 'Min' },
  { v: 'max', ar: 'الأعلى', en: 'Max' },
]
const aggLabel = (v, isAr) => (AGGS.find((a) => a.v === v) ? (isAr ? AGGS.find((a) => a.v === v).ar : AGGS.find((a) => a.v === v).en) : '')
function fmtNumber(raw, fmt) {
  if (raw == null || raw === '') return ''
  const n = cfNum(String(raw))
  if (n === null) return String(raw)
  if (fmt === 'int') return Math.round(n).toLocaleString('en-US')
  if (fmt === 'thousands') return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (fmt === 'currency') return n.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ﷼'
  if (fmt === 'percent') return n.toLocaleString('en-US', { maximumFractionDigits: 1 }) + '%'
  return String(raw)
}
/* حساب تجميع عمود على مجموعة صفوف */
function computeAgg(rows, col, valFn, kind) {
  const nums = []; let filled = 0
  for (const r of rows) { const d = valFn(r, col); if (d !== '' && d != null) { filled++; const n = cfNum(String(d)); if (n !== null) nums.push(n) } }
  if (kind === 'count') return filled
  if (!nums.length) return null
  if (kind === 'sum') return nums.reduce((a, b) => a + b, 0)
  if (kind === 'avg') return nums.reduce((a, b) => a + b, 0) / nums.length
  if (kind === 'min') return Math.min(...nums)
  if (kind === 'max') return Math.max(...nums)
  return null
}

/* ── الفلترة المتقدّمة: شروط حسب نوع العمود + اختصارات تاريخ ──────────────── */
const COND_OPS = {
  text: [
    { v: 'contains', ar: 'يحتوي', en: 'Contains' },
    { v: 'ncontains', ar: 'لا يحتوي', en: 'Not contains' },
    { v: 'eq', ar: 'يساوي', en: 'Equals' },
    { v: 'neq', ar: 'لا يساوي', en: 'Not equal' },
    { v: 'begins', ar: 'يبدأ بـ', en: 'Begins with' },
    { v: 'ends', ar: 'ينتهي بـ', en: 'Ends with' },
    { v: 'empty', ar: 'فارغ', en: 'Is empty' },
    { v: 'nempty', ar: 'غير فارغ', en: 'Not empty' },
  ],
  number: [
    { v: 'eq', ar: 'يساوي =', en: 'Equals =' },
    { v: 'neq', ar: 'لا يساوي ≠', en: 'Not = ' },
    { v: 'gt', ar: 'أكبر >', en: 'Greater >' },
    { v: 'gte', ar: 'أكبر أو يساوي ≥', en: '≥' },
    { v: 'lt', ar: 'أصغر <', en: 'Less <' },
    { v: 'lte', ar: 'أصغر أو يساوي ≤', en: '≤' },
    { v: 'between', ar: 'بين', en: 'Between' },
    { v: 'empty', ar: 'فارغ', en: 'Is empty' },
    { v: 'nempty', ar: 'غير فارغ', en: 'Not empty' },
  ],
  date: [
    { v: 'eq', ar: 'بتاريخ', en: 'On' },
    { v: 'before', ar: 'قبل', en: 'Before' },
    { v: 'after', ar: 'بعد', en: 'After' },
    { v: 'between', ar: 'بين تاريخين', en: 'Between' },
    { v: 'empty', ar: 'فارغ', en: 'Is empty' },
    { v: 'nempty', ar: 'غير فارغ', en: 'Not empty' },
  ],
}
const DATE_PRESETS = [
  { v: 'today', ar: 'اليوم', en: 'Today' },
  { v: 'this_week', ar: 'هذا الأسبوع', en: 'This week' },
  { v: 'this_month', ar: 'هذا الشهر', en: 'This month' },
  { v: 'this_year', ar: 'هذه السنة', en: 'This year' },
  { v: 'last7', ar: 'آخر ٧ أيام', en: 'Last 7 days' },
  { v: 'last30', ar: 'آخر ٣٠ يوم', en: 'Last 30 days' },
  { v: 'next7', ar: 'خلال ٧ أيام', en: 'Next 7 days' },
  { v: 'next30', ar: 'خلال ٣٠ يوم', en: 'Next 30 days' },
  { v: 'past', ar: 'منتهٍ (قبل اليوم)', en: 'Overdue' },
  { v: 'future', ar: 'قادم (بعد اليوم)', en: 'Upcoming' },
]
const presetLabel = (v, isAr) => { const p = DATE_PRESETS.find((x) => x.v === v); return p ? (isAr ? p.ar : p.en) : v }
const opNeedsValue = (op) => op !== 'empty' && op !== 'nempty'
function evalDatePreset(dTs, key, now) {
  const day = 86400000
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const endToday = startToday + day - 1
  switch (key) {
    case 'today': return dTs >= startToday && dTs <= endToday
    case 'this_week': { const s = startToday - new Date(startToday).getDay() * day; return dTs >= s && dTs < s + 7 * day }
    case 'this_month': { const s = new Date(now.getFullYear(), now.getMonth(), 1).getTime(); const e = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime(); return dTs >= s && dTs < e }
    case 'this_year': { const s = new Date(now.getFullYear(), 0, 1).getTime(); const e = new Date(now.getFullYear() + 1, 0, 1).getTime(); return dTs >= s && dTs < e }
    case 'last7': return dTs >= startToday - 7 * day && dTs <= endToday
    case 'last30': return dTs >= startToday - 30 * day && dTs <= endToday
    case 'next7': return dTs >= startToday && dTs <= endToday + 7 * day
    case 'next30': return dTs >= startToday && dTs <= endToday + 30 * day
    case 'past': return dTs < startToday
    case 'future': return dTs > endToday
    default: return false
  }
}
function evalCond(cell, cond, family, now) {
  const op = cond.op
  const s = String(cell ?? '')
  if (op === 'empty') return s === ''
  if (op === 'nempty') return s !== ''
  if (op === 'preset') { const d = cfDate(s); return d === null ? false : evalDatePreset(d, cond.a, now) }
  if (family === 'number') {
    const n = cfNum(s); if (n === null) return false
    const a = cfNum(cond.a), b = cfNum(cond.b)
    switch (op) {
      case 'eq': return a !== null && n === a
      case 'neq': return a === null || n !== a
      case 'gt': return a !== null && n > a
      case 'gte': return a !== null && n >= a
      case 'lt': return a !== null && n < a
      case 'lte': return a !== null && n <= a
      case 'between': return a !== null && b !== null && n >= Math.min(a, b) && n <= Math.max(a, b)
      default: return false
    }
  }
  if (family === 'date') {
    const d = cfDate(s); if (d === null) return false
    const a = cfDate(cond.a), b = cfDate(cond.b)
    switch (op) {
      case 'eq': return a !== null && new Date(d).toISOString().slice(0, 10) === new Date(a).toISOString().slice(0, 10)
      case 'before': return a !== null && d < a
      case 'after': return a !== null && d > a
      case 'between': return a !== null && b !== null && d >= Math.min(a, b) && d <= Math.max(a, b)
      default: return false
    }
  }
  const c = latin(s).toLowerCase(), v = latin(String(cond.a ?? '')).toLowerCase()
  switch (op) {
    case 'contains': return c.includes(v)
    case 'ncontains': return !c.includes(v)
    case 'eq': return c === v
    case 'neq': return c !== v
    case 'begins': return c.startsWith(v)
    case 'ends': return c.endsWith(v)
    default: return false
  }
}

/* ── محرّك الصيغ (Formulas) — آمن، بلا eval، recursive descent ─────────────── */
const fxNum = (v) => { if (typeof v === 'number') return v; if (typeof v === 'boolean') return v ? 1 : 0; const n = cfNum(v); return n === null ? 0 : n }
const fxStr = (v) => { if (v == null) return ''; if (typeof v === 'number') return String(v); if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'; return String(v) }
const fxDate = (v) => { if (typeof v === 'number') return v; return cfDate(v) }
function fxTokenize(s) {
  const t = []; let i = 0; const n = s.length; const isD = (c) => c >= '0' && c <= '9'
  while (i < n) {
    const c = s[i]
    if (c === ' ' || c === '\t' || c === '\n') { i++; continue }
    if (c === '[') { let j = s.indexOf(']', i); if (j < 0) j = n; t.push({ t: 'ref', v: s.slice(i + 1, j).trim() }); i = j + 1; continue }
    if (c === '"' || c === "'") { let j = i + 1, str = ''; while (j < n && s[j] !== c) { str += s[j]; j++ } t.push({ t: 'str', v: str }); i = j + 1; continue }
    if (isD(c) || (c === '.' && isD(s[i + 1]))) { let j = i; while (j < n && (isD(s[j]) || s[j] === '.')) j++; t.push({ t: 'num', v: parseFloat(s.slice(i, j)) }); i = j; continue }
    if (/[A-Za-z_؀-ۿ]/.test(c)) { let j = i; while (j < n && /[A-Za-z0-9_؀-ۿ]/.test(s[j])) j++; t.push({ t: 'id', v: s.slice(i, j) }); i = j; continue }
    const two = s.slice(i, i + 2)
    if (['<=', '>=', '<>', '!='].includes(two)) { t.push({ t: 'op', v: two === '!=' ? '<>' : two }); i += 2; continue }
    if ('+-*/%(),&<>='.includes(c)) { t.push({ t: 'op', v: c }); i++; continue }
    i++
  }
  return t
}
function fxMakeFns(now) {
  const day = 86400000
  const startToday = () => { const d = new Date(now); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() }
  return {
    TODAY: () => startToday(), NOW: () => now,
    DAYS: (a, b) => { const da = fxDate(a), db = fxDate(b); return (da == null || db == null) ? 0 : Math.round((da - db) / day) },
    YEAR: (a) => { const d = fxDate(a); return d == null ? '' : new Date(d).getFullYear() },
    MONTH: (a) => { const d = fxDate(a); return d == null ? '' : new Date(d).getMonth() + 1 },
    DAY: (a) => { const d = fxDate(a); return d == null ? '' : new Date(d).getDate() },
    ROUND: (x, n) => { const p = Math.pow(10, fxNum(n) || 0); return Math.round(fxNum(x) * p) / p },
    INT: (x) => Math.trunc(fxNum(x)), ABS: (x) => Math.abs(fxNum(x)),
    MIN: (...a) => Math.min(...a.map(fxNum)), MAX: (...a) => Math.max(...a.map(fxNum)),
    SUM: (...a) => a.map(fxNum).reduce((x, y) => x + y, 0), AVG: (...a) => a.length ? a.map(fxNum).reduce((x, y) => x + y, 0) / a.length : 0,
    IF: (c, a, b) => (c ? a : b), AND: (...a) => a.every(Boolean), OR: (...a) => a.some(Boolean), NOT: (a) => !a,
    CONCAT: (...a) => a.map(fxStr).join(''), LEN: (a) => fxStr(a).length,
    UPPER: (a) => fxStr(a).toUpperCase(), LOWER: (a) => fxStr(a).toLowerCase(), TRIM: (a) => fxStr(a).trim(),
    LEFT: (a, n) => fxStr(a).slice(0, fxNum(n)), RIGHT: (a, n) => { const s = fxStr(a); return s.slice(s.length - fxNum(n)) },
    NUMBER: (a) => fxNum(a), ISBLANK: (a) => (a == null || a === ''),
  }
}
function fxParse(tokens, getRef, now) {
  let p = 0; const fns = fxMakeFns(now)
  const peek = () => tokens[p]; const eat = () => tokens[p++]
  function expr() { return compare() }
  function compare() {
    let l = concat()
    while (peek() && peek().t === 'op' && ['=', '<>', '<', '>', '<=', '>='].includes(peek().v)) {
      const op = eat().v; const r = concat()
      const bothNum = cfNum(l) !== null && cfNum(r) !== null
      const a = bothNum ? fxNum(l) : fxStr(l), b = bothNum ? fxNum(r) : fxStr(r)
      l = op === '=' ? a === b : op === '<>' ? a !== b : op === '<' ? a < b : op === '>' ? a > b : op === '<=' ? a <= b : a >= b
    }
    return l
  }
  function concat() { let l = add(); while (peek() && peek().t === 'op' && peek().v === '&') { eat(); l = fxStr(l) + fxStr(add()) } return l }
  function add() { let l = mul(); while (peek() && peek().t === 'op' && (peek().v === '+' || peek().v === '-')) { const op = eat().v; const r = mul(); l = op === '+' ? fxNum(l) + fxNum(r) : fxNum(l) - fxNum(r) } return l }
  function mul() { let l = unary(); while (peek() && peek().t === 'op' && (peek().v === '*' || peek().v === '/' || peek().v === '%')) { const op = eat().v; const r = unary(); l = op === '*' ? fxNum(l) * fxNum(r) : op === '/' ? (fxNum(r) === 0 ? 0 : fxNum(l) / fxNum(r)) : fxNum(l) % fxNum(r) } return l }
  function unary() { if (peek() && peek().t === 'op' && (peek().v === '-' || peek().v === '+')) { const op = eat().v; const v = unary(); return op === '-' ? -fxNum(v) : fxNum(v) } return primary() }
  function primary() {
    const tk = peek(); if (!tk) return ''
    if (tk.t === 'num') { eat(); return tk.v }
    if (tk.t === 'str') { eat(); return tk.v }
    if (tk.t === 'ref') { eat(); return getRef(tk.v) }
    if (tk.t === 'op' && tk.v === '(') { eat(); const v = expr(); if (peek() && peek().v === ')') eat(); return v }
    if (tk.t === 'id') {
      eat(); const name = tk.v.toUpperCase()
      if (peek() && peek().t === 'op' && peek().v === '(') {
        eat(); const args = []
        if (!(peek() && peek().v === ')')) { args.push(expr()); while (peek() && peek().v === ',') { eat(); args.push(expr()) } }
        if (peek() && peek().v === ')') eat()
        const fn = fns[name]; return fn ? fn(...args) : ''
      }
      if (name === 'TRUE') return true
      if (name === 'FALSE') return false
      return getRef(tk.v)
    }
    eat(); return ''
  }
  return expr()
}
function evalFormula(expr, getRef, now) {
  try { const r = fxParse(fxTokenize(String(expr || '')), getRef, now); return r == null ? '' : (typeof r === 'boolean' ? (r ? 'TRUE' : 'FALSE') : r) }
  catch { return '#خطأ' }
}
const FX_HELP = 'أمثلة: [عمود1]+[عمود2] · DAYS([انتهاء قوى],TODAY()) · IF([المتبقّي]<30,"قرب","ساري") · ROUND([الأجر]*0.09,2) · [الاسم]&" - "&[الهوية]  ·  الدوال: TODAY DAYS IF AND OR MIN MAX SUM ROUND ABS LEN LEFT RIGHT UPPER LOWER CONCAT YEAR MONTH DAY'

/* تجزئة بسيطة لكلمة سر إظهار العمود (حماية خفيفة لا تشفير قوي) */
const strHash = (s) => { let h = 5381; const str = String(s ?? ''); for (let i = 0; i < str.length; i++) h = (((h << 5) + h) ^ str.charCodeAt(i)) >>> 0; return h.toString(36) }

/* أم القرى عبر Intl — تحويل تاريخ الميلاد الميلادي إلى هجري (قراءة فقط). */
function toHijri(dateStr) {
  const s = ymd(dateStr)
  if (!s) return ''
  const d = new Date(s + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return ''
  const f = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const o = {}
  for (const p of f.formatToParts(d)) { if (p.type === 'year') o.y = p.value; if (p.type === 'month') o.m = p.value; if (p.type === 'day') o.d = p.value }
  return o.y ? `${o.y}-${o.m}-${o.d}` : ''
}

/* جلب كل الصفوف متجاوزاً سقف 1000 صف في PostgREST. */
async function fetchAll(sb, table, cols, mod) {
  const out = []
  const size = 1000
  for (let from = 0; ; from += size) {
    let q = sb.from(table).select(cols).range(from, from + size - 1)
    if (mod) q = mod(q)
    const { data, error } = await q
    if (error) throw error
    out.push(...(data || []))
    if (!data || data.length < size) break
  }
  return out
}

/* ═══ محمّل عروض العمالة — كله من «مركز المزامنة» عبر v_ops_sync_workforce ═══════
   المصدر = مقيم (muqeem_residents) + قوى (qiwa_employees) + التأمينات
   (gosi_establishment_contributors)، مجمّعةً في الخادم داخل view واحد (صف لكل
   رقم إقامة، اتحاد الجهات الثلاث) — استعلام واحد خفيف بدل جلب عدّة جداول ثقيلة
   للمتصفّح (كان يُبطّئ الصفحة). لا شيء يأتي من العمالة الدائمة الكانونية كأساس؛
   فقط جوال أبشر/مدينة المقر/المهنة الفعلية/الفواتير تُستكمَل من الكانوني لأنها
   غير موجودة في مركز المزامنة. الفواتير (العرض الرابع) عبر RPC حسب worker_id. */
const fmtMobile = (v) => { const s = String(v || '').replace(/\D/g, '').replace(/^966/, '').replace(/^0/, '').slice(-9); return s ? '0' + s : '' }
async function loadSyncWorkforce(sb, { invoices = false } = {}) {
  // مرتّب حسب المنشأة ثم الاسم كي تتجاور صفوف كل منشأة للدمج الرأسي
  const rows = await fetchAll(sb, 'v_ops_sync_workforce', '*',
    (q) => q.order('unified_number', { nullsFirst: false }).order('name_ar', { nullsFirst: false }))
  const invMap = {}
  if (invoices) {
    const ids = [...new Set(rows.map((r) => r.worker_id).filter(Boolean))]
    for (let i = 0; i < ids.length; i += 800) {
      const { data } = await sb.rpc('worker_invoices_summary', { p_worker_ids: ids.slice(i, i + 800) })
      for (const row of (data || [])) {
        const wid = row.worker_id; if (!wid) continue
        const m = invMap[wid] || (invMap[wid] = { nos: [], services: [], remaining: 0 })
        m.nos.push(row.invoice_no)
        if (row.status_code !== 'cancelled') m.remaining += Number(row.remaining) || 0
        if (row.service_ar && !m.services.includes(row.service_ar)) m.services.push(row.service_ar)
      }
    }
  }
  return rows.map((r) => {
    const inv = invMap[r.worker_id]
    return {
      ...r, _id: r.iqama_number,
      _inv_nos: inv ? inv.nos.join('، ') : '',
      _inv_services: inv ? inv.services.join('، ') : '',
      _inv_remaining: inv ? inv.remaining : '',
    }
  })
}
/* أعمدة العمالة — كلها أعمدة حقيقية في v_ops_sync_workforce (تُحرَّر مباشرةً كتجاوز).
   الصورة من photo_path، والفواتير مشتقّة (_inv_*)، والمصدر/آخر مزامنة من الـview. */
const WF_ADD = [
  { key: 'name_ar', ar: 'اسم العامل', en: 'Worker', required: true },
  { key: 'iqama_number', ar: 'رقم الإقامة', en: 'Iqama no.' },
]
const wfSearch = (r) => [r.name_ar, r.name_en, r.iqama_number, r.border_number, r.passport_number, r.nationality_ar, r.facility_ar, r.branch_code]
const WFC = {
  // بيانات المنشأة — تُدمج رأسياً عبر صفوف عمّال نفس المنشأة (mergeCols)
  fac_branch: { key: 'facility_branches', ar: 'فرع المنشأة', en: 'Facility branch', w: 130, kind: 'text' },
  facility: { key: 'facility_ar', ar: 'المنشأة', en: 'Facility', w: 230, kind: 'text' },
  unified: { key: 'unified_number', ar: 'الرقم الموحّد', en: 'Unified no.', w: 140, kind: 'mono' },
  gosi: { key: 'gosi_number', ar: 'التأمينات', en: 'GOSI no.', w: 130, kind: 'mono' },
  hrsd: { key: 'hrsd_number', ar: 'الموارد', en: 'HRSD no.', w: 130, kind: 'mono' },
  absher: { key: 'absher_balance', ar: 'رصيد أبشر (قوى)', en: 'Absher balance (Qiwa)', w: 140, kind: 'num' },
  photo: { key: '_photo', ar: 'الصورة', en: 'Photo', w: 58, kind: 'photo', get: (r) => r.photo_path || '' },
  name: { key: 'name_ar', ar: 'الاسم', en: 'Name', w: 210, kind: 'text', manual: true, get: (r, isAr) => (isAr ? (r.name_ar || r.name_en) : (r.name_en || r.name_ar)) || '' },
  iqama: { key: 'iqama_number', ar: 'الهوية', en: 'Iqama', w: 130, kind: 'mono', manual: true },
  nationality: { key: 'nationality_ar', ar: 'الجنسية', en: 'Nationality', w: 120, kind: 'text' },
  occupation: { key: 'occupation_ar', ar: 'المهنة الرسمية', en: 'Official Occupation', w: 170, kind: 'text' },
  iqama_expiry: { key: 'iqama_expiry_date', ar: 'الإقامة', en: 'Iqama', w: 130, kind: 'date' },
  salary: { key: 'wage_total', ar: 'الراتب', en: 'Salary', w: 100, kind: 'num' },
  balance: { key: 'jawazat_balance', ar: 'الرصيد', en: 'Balance', w: 100, kind: 'num' },
  branch: { key: 'branch_code', ar: 'الفرع', en: 'Branch', w: 120, kind: 'text' },
  worker_branch: { key: 'branch_code', ar: 'فرع العامل', en: 'Worker branch', w: 120, kind: 'text' },
  work_permit_expiry: { key: 'work_permit_expiry', ar: 'الرخصة', en: 'Work Permit', w: 120, kind: 'date' },
  passport_expiry: { key: 'passport_expiry', ar: 'الجواز', en: 'Passport', w: 120, kind: 'date' },
  vehicles: { key: 'vehicles_count', ar: 'المركبة', en: 'Vehicle', w: 90, kind: 'num' },
  absher_mobile: { key: 'official_mobile', ar: 'رقم ابشر', en: 'Absher Mobile', w: 130, kind: 'mono', get: (r) => fmtMobile(r.official_mobile) },
  hq_city: { key: 'hq_city_ar', ar: 'المدينة', en: 'City', w: 120, kind: 'text' },
  official_occupation: { key: 'official_occupation_ar', ar: 'المهنة الفعلية', en: 'Actual Occupation', w: 170, kind: 'text' },
  invoices: { key: '_inv_nos', ar: 'الفواتير', en: 'Invoices', w: 220, kind: 'text', source: 'invoice', get: (r) => r._inv_nos },
  invoice_types: { key: '_inv_services', ar: 'نوع الفواتير', en: 'Invoice Type', w: 190, kind: 'text', source: 'invoice', get: (r) => r._inv_services },
  invoice_remaining: { key: '_inv_remaining', ar: 'المتبقي', en: 'Remaining', w: 110, kind: 'num', source: 'invoice', get: (r) => r._inv_remaining },
  src: { key: 'src', ar: 'المصدر', en: 'Source', w: 150, kind: 'text', get: (r) => r.source_platforms || '' },
  src_synced: { key: 'src_synced', ar: 'آخر مزامنة', en: 'Last sync', w: 120, kind: 'date', get: (r) => ymd(r.last_sync) },
}
/* دمج صفوف عمّال المنشأة الواحدة رأسياً (كعرض السعودة): مفتاح الدمج = الرقم الموحّد،
   والأعمدة المدمجة = بطاقة المنشأة (الاسم/الموحّد/التأمينات/الموارد). */
const WF_MERGE_KEY = (r) => (r.unified_number != null && r.unified_number !== '' ? String(r.unified_number) : (r.facility_ar || null))
const WF_MERGE_COLS = ['facility_branches', 'facility_ar', 'unified_number', 'gosi_number', 'hrsd_number', 'absher_balance']
const WF_FAC = [WFC.facility, WFC.unified, WFC.gosi, WFC.hrsd]
/* عمود «حالة استرجاع» (إدخال يدوي بقائمة منسدلة تلوّن الخلية) — يُبنى لكل رصيد */
const recoveryStatusCol = (key, ar, en) => ({
  key, ar, en, w: 175, kind: 'text', ops: true, select: true,
  options: () => ['تم الاسترجاع', 'في الانتظار', 'مشكلة'],
  bg: (v) => v === 'تم الاسترجاع' ? 'rgba(46,204,113,.32)'
    : v === 'في الانتظار' ? 'rgba(234,179,8,.32)'
      : v === 'مشكلة' ? 'rgba(232,114,101,.32)' : null,
})

/* صورة العامل تأتي من مزامنة مقيم (bucket عام muqeem-pdfs) عبر workers.photo_path */
const WORKER_PHOTO_BASE = 'https://gcvshzutdslmdkwqwteh.supabase.co/storage/v1/object/public/muqeem-pdfs/'
const workerPhotoUrl = (path) => (path ? WORKER_PHOTO_BASE + String(path).split('/').map(encodeURIComponent).join('/') : null)
/* خلية صورة داخل الشبكة: صورة مصغّرة (أو الحرف الأول عند غيابها) + النقر يفتحها مكبّرة */
function PhotoCell({ path, name, size, onOpen }) {
  const [err, setErr] = useState(false)
  const url = workerPhotoUrl(path)
  const s = Math.max(24, Math.min((size || 38) - 8, 30))
  const initial = String(name || '؟').trim().charAt(0) || '؟'
  if (url && !err) return (
    <img src={url} alt="" loading="lazy" onError={() => setErr(true)}
      onClick={(e) => { e.stopPropagation(); onOpen && onOpen({ url, name }) }}
      title={name || ''}
      style={{ width: s, height: s, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: '1px solid rgba(176,125,0,.4)', background: 'var(--inputBg)', cursor: 'zoom-in', flexShrink: 0 }} />
  )
  return (
    <span style={{ width: s, height: s, borderRadius: '50%', background: 'rgba(176,125,0,.12)', border: '1px solid rgba(176,125,0,.28)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: s * 0.42, fontWeight: 600, color: C.gold, flexShrink: 0 }}>{initial}</span>
  )
}

/* خلية بوكماركت: رابط javascript: يُسحَب لشريط المفضّلة (أو يُنسخ بالنقر).
   ملاحظة مقصودة: النقر لا يُشغّل الرابط داخل صفحتنا — الزر يعمل داخل أجير فقط. */
function BmkCell({ href, label, missing, onCopy }) {
  const bad = !href || missing
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 5, height: 22, padding: '0 10px',
    borderRadius: 999, fontSize: 11.5, fontWeight: 600, fontFamily: F, whiteSpace: 'nowrap',
    border: '1px solid', textDecoration: 'none', flexShrink: 0,
  }
  if (bad) return (
    <span title={missing || ''} style={{ ...base, color: 'var(--tx3)', borderColor: 'var(--bd)', background: 'transparent', cursor: 'help' }}>
      ⚠ {label}
    </span>
  )
  return (
    <a href={href} draggable title="اسحبه إلى شريط المفضّلة · أو انقر لنسخه"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard?.writeText(href); onCopy && onCopy() }}
      onDragStart={(e) => e.stopPropagation()}
      style={{ ...base, color: C.gold, borderColor: 'rgba(176,125,0,.45)', background: 'rgba(176,125,0,.12)', cursor: 'grab' }}>
      ⚑ {label}
    </a>
  )
}

/* ── خلية ملف مرفق (kind:'file') ─────────────────────────────────────────────
   الملف يُرفع لبكت attachments العام، ويُخزَّن رابطه العام في قيمة الخلية نفسها
   (طبقة overlay) — فيبقى مع الصف، ويظهر في التصدير، ويُفتح بنقرة. */
const fileNameOf = (url) => {
  if (!url) return ''
  let last = String(url).split('?')[0].split('/').pop() || ''
  try { last = decodeURIComponent(last) } catch { /* رابط غير مُرمَّز */ }
  return last.replace(/^\d{10,}_[a-z0-9]{4,8}_/i, '')
}
function FileCell({ url, busy, canEdit, isAr, onPick, onClear }) {
  const inRef = useRef(null)
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 5, height: 22, padding: '0 10px',
    borderRadius: 999, fontSize: 11.5, fontWeight: 600, fontFamily: F, whiteSpace: 'nowrap',
    border: '1px solid', textDecoration: 'none', flexShrink: 1, maxWidth: '100%', overflow: 'hidden',
  }
  const picker = (
    <input ref={inRef} type="file" style={{ display: 'none' }}
      onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) onPick(f) }} />
  )
  if (busy) return <span style={{ ...base, color: 'var(--tx3)', borderColor: 'var(--bd)', background: 'transparent' }}>{isAr ? '… جارٍ الرفع' : '… uploading'}</span>
  if (url) return (
    <>
      {picker}
      <a href={url} target="_blank" rel="noreferrer" title={fileNameOf(url)}
        onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}
        style={{ ...base, color: '#2ecc71', borderColor: 'rgba(46,204,113,.45)', background: 'rgba(46,204,113,.12)', textOverflow: 'ellipsis' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>📎 {fileNameOf(url) || (isAr ? 'الملف' : 'File')}</span>
      </a>
      {canEdit && (
        <button type="button" title={isAr ? 'إزالة الملف' : 'Remove file'}
          onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onClear() }}
          style={{ marginInlineStart: 3, background: 'transparent', border: 'none', color: 'var(--tx4)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: 2, flexShrink: 0 }}>✕</button>
      )}
    </>
  )
  if (!canEdit) return <span style={{ color: 'var(--tx4)', fontSize: 11.5 }}>—</span>
  return (
    <>
      {picker}
      <button type="button" title={isAr ? 'اختر ملف الحوالة' : 'Pick a file'}
        onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); inRef.current && inRef.current.click() }}
        style={{ ...base, color: C.gold, borderColor: 'rgba(176,125,0,.45)', background: 'rgba(176,125,0,.12)', cursor: 'pointer' }}>
        ⇧ {isAr ? 'رفع' : 'Upload'}
      </button>
    </>
  )
}

/* قراءة قيمة صف في جدول «رفع طلبات أجير»: الإدخال المحفوظ في overlay أولاً */
const av = (r, k) => String((r && r._ops && r._ops[k] != null && r._ops[k] !== '' ? r._ops[k] : (r ? r[k] : '')) ?? '').trim()
/* قيمة خلية أثناء الإدخال: التعديل غير المحفوظ ← المحفوظ (overlay) ← الخام.
   تُستعمل في الأعمدة المشتقّة كي تتحدّث لحظة الكتابة لا بعد الحفظ. */
const ev = (r, k, pend) => (pend && Object.prototype.hasOwnProperty.call(pend, k)) ? String(pend[k] ?? '').trim() : av(r, k)
/* الحقول الإجبارية لكل زر — تُعرَض في التلميح عند نقصها */
const bmkMissing = (r, fields) => {
  const gone = fields.filter(([k]) => !av(r, k)).map(([, ar]) => ar)
  return gone.length ? 'ينقص: ' + gone.join('، ') : ''
}
/* موقع العمل ثابت لكل الطلبات (نفس موقع أول طلب رفعناه) — يبقى العمود قابلاً
   للتعديل: أي قيمة يكتبها الموظف في الخلية تتجاوز الثابت. */
const AJ_DEF_ADDRESS = 'الورود 2، الورود، الرياض 12251، السعودية'
const AJ_DEF_COORDS = '24.7210533,46.6713508'
const AJ_CONTRACT_REQ = [['aj_labor_office', 'مكتب العمل'], ['aj_sequence_number', 'التسلسلي'], ['aj_unified_number', 'الموحّد'],
  ['aj_contract_desc', 'نبذة العقد'], ['aj_estimated_cost', 'التكلفة'], ['aj_contract_start', 'بداية العقد'],
  ['aj_contract_end', 'نهاية العقد']]
const AJ_NOTICE_REQ = [['aj_contract_id', 'معرّف العقد'], ['aj_iqama', 'رقم الإقامة'],
  ['aj_notice_start', 'بداية التصريح'], ['aj_notice_end', 'نهاية التصريح']]
/* الإعارة (التعاقد بين المنشآت): العقد والعامل في معالج واحد — لا تصريح لاحق. */
const AJ_SEC_TYPES = [['2', 'إعارة أجير'], ['17', 'إعارة أجير — المنشآت الفردية (1-5)'],
  ['33', 'إسناد السعوديين'], ['73', 'الحراسات الأمنية'], ['87', 'إعارة أجير — المناطق الاقتصادية الخاصة']]
const AJ_SEC_REQ = [['sc_labor_office', 'مكتب العمل'], ['sc_sequence_number', 'التسلسلي'],
  ['sc_unified_number', 'الموحّد'], ['sc_start', 'بداية العقد'], ['sc_iqama', 'رقم الإقامة']]

/* ── «السعودة-إدخال»: جداول مرجعية للاشتقاق ─────────────────────────────────
   شيت إدخال بحت (لا صفوف من المزامنة) — لكن أعمدةً تُملأ تلقائياً ممّا يكتبه
   الموظف: رقم الموارد البشرية → (التأمينات · اسم المنشأة · نطاقها)، ورقم
   الفاتورة → (نوع الخدمة · فرع المكتب). تُبنى الخرائط مرّة واحدة داخل load ثم
   تقرأها دوال col.get عند كل رسم (module scope كسجلّ العروض نفسه). */
const SDE_REF = { fac: new Map(), facSeq: new Map(), inv: new Map(), banks: [], saudiIds: new Set(), saudiPairs: new Set() }
const sdeKey = (v) => latin(String(v ?? '')).replace(/\s/g, '').trim()
const sdeSeq = (k) => (k.includes('-') ? k.split('-').pop() : k)
/* المنشأة برقم الموارد: مطابقة كاملة (18-4048833) وإلا بالتسلسلي وحده (4048833) */
const sdeFacOf = (hrsd) => {
  const k = sdeKey(hrsd); if (!k) return null
  return SDE_REF.fac.get(k) || SDE_REF.facSeq.get(sdeSeq(k)) || null
}
const sdeInvOf = (no) => { const k = sdeKey(no); return k ? (SDE_REF.inv.get(k) || null) : null }
/* «المطابق»: هل هذا السعودي موجود فعلاً في عرض «السعودة-مزامنة» (سعوديو قوى)؟
   نعم = بنفس المنشأة · نعم/منشأة أخرى = هويته في قوى لكن تحت منشأة غيرها · لا */
const sdeMatchOf = (id, hrsd, isAr) => {
  const k = sdeKey(id); if (!k) return ''
  const fac = sdeFacOf(hrsd)
  const u = fac ? sdeKey(fac.unified) : ''
  if (u && SDE_REF.saudiPairs.has(`${u}|${k}`)) return isAr ? 'نعم' : 'Yes'
  if (SDE_REF.saudiIds.has(k)) return isAr ? 'نعم — منشأة أخرى' : 'Yes — other facility'
  return isAr ? 'لا' : 'No'
}
const sdeMatchBg = (v) => {
  const s = String(v || ''); if (!s) return null
  if (s.includes('—')) return 'rgba(234,179,8,.32)'                    // موجود لكن بمنشأة أخرى
  if (s === 'نعم' || s === 'Yes') return 'rgba(46,204,113,.32)'
  return 'rgba(232,114,101,.32)'
}

/* ── سجلّ العروض ─────────────────────────────────────────────────────────────
   kind: text | mono | date
   ops:true    → عمود تشغيلي يُحرَّر دائماً (كل الصفوف)
   manual:true → يُحرَّر فقط في الصفوف اليدوية (لا معنى لتعديله في المُزامَن)
   get(row)    → قيمة مشتقّة للعرض (قراءة فقط للصفوف المُزامَنة)                 */
const VIEWS = [
  {
    key: 'persons',
    ar: 'الأشخاص', en: 'Persons',
    hintAr: 'الملّاك والشركاء والمدراء من المركز السعودي للأعمال',
    hintEn: 'Owners, partners & managers from the Saudi Business Center',
    async load(sb) {
      const src = await fetchAll(sb, 'v_sbc_persons',
        'id_number,name_ar,name_en,is_partner,is_manager,facility_count,person_id,birth_date',
        (q) => q.order('name_ar', { nullsFirst: false }))
      return src.map((p) => ({
        _id: p.id_number,                 // مفتاح الـoverlay = رقم الهوية (ثابت)
        id_number: p.id_number, name_ar: p.name_ar, name_en: p.name_en,
        birth_date: p.birth_date, is_partner: p.is_partner, is_manager: p.is_manager,
      }))
    },
    search: (r) => [r.name_ar, r.name_en, r.id_number],
    addFields: [
      { key: 'name_ar', ar: 'الاسم', en: 'Name', required: true },
      { key: 'id_number', ar: 'رقم الهوية', en: 'ID number', required: true },
      { key: 'birth_date', ar: 'الميلاد (ميلادي)', en: 'Birth (Greg.)', type: 'date' },
    ],
    columns: [
      { key: 'name_ar', ar: 'الاسم', en: 'Name', w: 300, kind: 'text', manual: true, get: (r, isAr) => (isAr ? r.name_ar : (r.name_en || r.name_ar)) || '' },
      { key: 'id_number', ar: 'رقم الهوية', en: 'ID number', w: 150, kind: 'mono', manual: true },
      { key: 'birth_date', ar: 'الميلاد - ميلادي', en: 'Birth (Greg.)', w: 150, kind: 'date', manual: true, get: (r) => ymd(r.birth_date) },
      // هجين: الافتراضي تحويل أم القرى (مركز المزامنة يوفّر الميلادي فقط)، وقابل للتعديل اليدوي للقيمة الرسمية الأدق
      { key: 'birth_h', ar: 'الميلاد - هجري', en: 'Birth (Hijri)', w: 150, kind: 'mono', ops: true, get: (r) => toHijri(r.birth_date) },
      { key: 'nafath', ar: 'نفاذ', en: 'Nafath', w: 160, kind: 'text', ops: true },
      { key: 'qiwa', ar: 'قوى', en: 'Qiwa', w: 170, kind: 'text', ops: true },
      { key: 'absher_phone', ar: 'جوال أبشر', en: 'Absher phone', w: 150, kind: 'mono', ops: true },
    ],
  },

  /* ── الشركات (المنشآت) — sbc_facilities (السجل التجاري من مركز المزامنة) ──── */
  {
    key: 'companies',
    ar: 'الشركات', en: 'Companies',
    hintAr: 'منشآت السجل التجاري من مركز المزامنة — بيانات SBC والتأمينات والموارد',
    hintEn: 'Commercial-registry establishments from the Sync Center (SBC)',
    rowBg: (r) => (r.cr_status_ar === 'مشطوب' ? 'rgba(232,114,101,.20)' : null),   // صف أحمر للمنشأة المشطوبة من SBC
    async load(sb) {
      const src = await fetchAll(sb, 'sbc_facilities',
        'id,entity_full_name_ar,entity_full_name_en,cr_national_number,cr_status_ar,gosi_registration_number,hrsd_labor_office_id,hrsd_sequence_number,zakat_tax_number,coc_chamber_number,last_synced_at',
        (q) => q.order('entity_full_name_ar', { nullsFirst: false }))
      return src.map((r) => ({ ...r, _id: r.id }))
    },
    search: (r) => [r.entity_full_name_ar, r.entity_full_name_en, r.cr_national_number],
    addFields: [
      { key: 'entity_full_name_ar', ar: 'الاسم', en: 'Name', required: true },
      { key: 'cr_national_number', ar: 'الرقم الموحّد', en: 'Unified no.' },
    ],
    columns: [
      { key: 'entity_full_name_ar', ar: 'اسم المنشأة', en: 'Facility', w: 280, kind: 'text', manual: true, get: (r, isAr) => (isAr ? r.entity_full_name_ar : (r.entity_full_name_en || r.entity_full_name_ar)) || '' },
      { key: 'cr_national_number', ar: 'الرقم الموحّد', en: 'Unified no.', w: 140, kind: 'mono', manual: true },
      { key: 'gosi_registration_number', ar: 'رقم التأمينات', en: 'GOSI no.', w: 130, kind: 'mono' },
      { key: 'hrsd_number', ar: 'رقم الموارد البشرية', en: 'HRSD no.', w: 150, kind: 'mono', get: (r) => (r.hrsd_labor_office_id != null && r.hrsd_sequence_number) ? `${r.hrsd_labor_office_id}-${r.hrsd_sequence_number}` : '' },
      { key: 'zakat_tax_number', ar: 'الرقم الضريبي', en: 'VAT no.', w: 150, kind: 'mono' },
      { key: 'coc_chamber_number', ar: 'رقم الغرفة', en: 'Chamber no.', w: 130, kind: 'mono' },
      { key: 'last_synced_at', ar: 'آخر مزامنة', en: 'Last sync', w: 130, kind: 'date', get: (r) => ymd(r.last_synced_at) },
    ],
  },

  /* ── المنشآت (تفصيلي) — v_ops_facilities_detailed ────────────────────────────
     منشأة واحدة لكل صف، تجمع كل الجهات: السجل التجاري (المركز السعودي للأعمال)
     + التأمينات + الموارد/النطاقات + قوى + مقيم + مدد + أجير. */
  {
    key: 'companies_detailed',
    ar: 'المنشآت تفصيلي', en: 'Facilities (detailed)',
    hintAr: 'المنشأة من كل الجهات — السجل التجاري (المركز السعودي) والتأمينات والموارد وقوى ومقيم ومدد وأجير',
    hintEn: 'Facility across all authorities — SBC registry, GOSI, HRSD, Qiwa, Muqeem, Mudad & Ajeer',
    rowBg: (r) => (r.cr_status_ar === 'مشطوب' ? 'rgba(232,114,101,.20)' : null),
    async load(sb) {
      const src = await fetchAll(sb, 'v_ops_facilities_detailed', '*', (q) => q.order('name_ar', { nullsFirst: false }))
      return src.map((r) => ({ ...r, _id: r.id }))
    },
    search: (r) => [r.name_ar, r.name_en, r.unified_number, r.cr_number, r.gosi_registration_number],
    addFields: [
      { key: 'name_ar', ar: 'اسم المنشأة', en: 'Facility', required: true },
      { key: 'unified_number', ar: 'الرقم الموحّد', en: 'Unified no.' },
    ],
    columns: [
      /* الهوية والسجل التجاري (المركز السعودي للأعمال) */
      { key: 'name_ar', ar: 'اسم المنشأة', en: 'Facility', w: 280, kind: 'text', manual: true, get: (r, isAr) => (isAr ? r.name_ar : (r.name_en || r.name_ar)) || '' },
      { key: 'unified_number', ar: 'الرقم الموحّد', en: 'Unified no.', w: 140, kind: 'mono', manual: true },
      { key: 'cr_number', ar: 'السجل التجاري', en: 'CR number', w: 130, kind: 'mono' },
      { key: 'main_cr_number', ar: 'السجل الرئيسي', en: 'Main CR', w: 130, kind: 'mono' },
      { key: 'legal_status', ar: 'الحالة النظامية', en: 'Legal status', w: 120, kind: 'text' },
      { key: 'entity_type_ar', ar: 'نوع الكيان', en: 'Entity type', w: 140, kind: 'text' },
      { key: 'company_form_ar', ar: 'الشكل القانوني', en: 'Company form', w: 150, kind: 'text' },
      { key: 'cr_status_ar', ar: 'حالة السجل', en: 'CR status', w: 110, kind: 'text' },
      { key: 'is_main', ar: 'سجل رئيسي', en: 'Main CR?', w: 90, kind: 'text', get: (r, isAr) => yn(r.is_main, isAr) },
      { key: 'capital', ar: 'رأس المال', en: 'Capital', w: 130, kind: 'num' },
      { key: 'capital_currency_ar', ar: 'العملة', en: 'Currency', w: 90, kind: 'text' },
      { key: 'company_duration', ar: 'مدة الشركة (سنة)', en: 'Duration (yr)', w: 120, kind: 'num' },
      { key: 'management_structure_ar', ar: 'هيكل الإدارة', en: 'Mgmt structure', w: 140, kind: 'text' },
      { key: 'partners_nationality_ar', ar: 'جنسية الشركاء', en: 'Partners nat.', w: 130, kind: 'text' },
      { key: 'has_ecommerce', ar: 'متجر إلكتروني', en: 'E-commerce', w: 110, kind: 'text', get: (r, isAr) => yn(r.has_ecommerce, isAr) },
      { key: 'in_liquidation_process', ar: 'تحت التصفية', en: 'In liquidation', w: 110, kind: 'text', get: (r, isAr) => yn(r.in_liquidation_process, isAr) },
      { key: 'is_in_confirmation_period', ar: 'فترة التأكيد', en: 'Confirm period', w: 110, kind: 'text', get: (r, isAr) => yn(r.is_in_confirmation_period, isAr) },
      { key: 'cr_issue_date_gregorian', ar: 'إصدار السجل', en: 'CR issue', w: 120, kind: 'date' },
      { key: 'cr_issue_date_hijri', ar: 'إصدار هجري', en: 'CR issue (H)', w: 120, kind: 'mono' },
      { key: 'cr_confirm_date_gregorian', ar: 'التأكيد السنوي', en: 'Annual confirm', w: 130, kind: 'date' },
      { key: 'cr_confirm_date_hijri', ar: 'التأكيد هجري', en: 'Confirm (H)', w: 120, kind: 'mono' },
      { key: 'company_contract_from_date', ar: 'عقد التأسيس من', en: 'Contract from', w: 130, kind: 'date' },
      { key: 'last_cr_suspension_date', ar: 'آخر إيقاف', en: 'Last suspend', w: 120, kind: 'date' },
      { key: 'last_cr_reactivation_date', ar: 'آخر تنشيط', en: 'Last reactivate', w: 120, kind: 'date' },
      { key: 'delete_date', ar: 'تاريخ الشطب', en: 'Strike-off date', w: 120, kind: 'date' },
      /* النشاط والعنوان ووسائل التواصل (SBC) */
      { key: 'activities_type_ar', ar: 'نوع النشاط', en: 'Activity type', w: 180, kind: 'text' },
      { key: 'full_activities_text', ar: 'الأنشطة', en: 'Activities', w: 260, kind: 'text' },
      { key: 'headquarter_city_ar', ar: 'مدينة المقر', en: 'HQ city', w: 120, kind: 'text' },
      { key: 'phone_no', ar: 'الهاتف', en: 'Phone', w: 120, kind: 'mono' },
      { key: 'mobile_no', ar: 'الجوال', en: 'Mobile', w: 130, kind: 'mono' },
      { key: 'email', ar: 'البريد', en: 'Email', w: 180, kind: 'text' },
      { key: 'website_url', ar: 'الموقع', en: 'Website', w: 160, kind: 'text' },
      { key: 'license_issuer', ar: 'جهة الترخيص', en: 'License issuer', w: 140, kind: 'text' },
      /* أرقام الجهات الحكومية (SBC) */
      { key: 'gosi_registration_number', ar: 'رقم التأمينات', en: 'GOSI no.', w: 130, kind: 'mono' },
      { key: 'hrsd_number', ar: 'رقم الموارد البشرية', en: 'HRSD no.', w: 150, kind: 'mono' },
      { key: 'zakat_tax_number', ar: 'الرقم الضريبي', en: 'VAT no.', w: 150, kind: 'mono' },
      { key: 'coc_chamber_number', ar: 'رقم الغرفة', en: 'Chamber no.', w: 120, kind: 'mono' },
      { key: 'coc_has_subscription', ar: 'اشتراك الغرفة', en: 'Chamber sub.', w: 110, kind: 'text', get: (r, isAr) => yn(r.coc_has_subscription, isAr) },
      { key: 'spl_national_address_id', ar: 'العنوان الوطني', en: 'National addr.', w: 140, kind: 'mono' },
      { key: 'spl_has_subscription', ar: 'اشتراك العنوان', en: 'SPL sub.', w: 110, kind: 'text', get: (r, isAr) => yn(r.spl_has_subscription, isAr) },
      { key: 'sca_contractor_number', ar: 'رقم المقاول', en: 'Contractor no.', w: 130, kind: 'mono' },
      { key: 'moj_contract_number', ar: 'عقد العدل', en: 'MoJ contract', w: 130, kind: 'mono' },
      { key: 'mc_contract_number', ar: 'عقد التجارة', en: 'MC contract', w: 130, kind: 'mono' },
      { key: 'momrah_licenses_count', ar: 'رخص البلدية', en: 'Momrah licenses', w: 120, kind: 'num' },
      /* ملخص التأمينات (SBC) */
      { key: 'gosi_number_of_contributors', ar: 'المشتركون', en: 'Contributors', w: 110, kind: 'num' },
      { key: 'gosi_number_of_saudi_contributors', ar: 'مشتركون سعوديون', en: 'Saudi contrib.', w: 130, kind: 'num' },
      { key: 'gosi_number_of_non_saudi_contributors', ar: 'مشتركون غير سعوديين', en: 'Non-Saudi contrib.', w: 160, kind: 'num' },
      { key: 'gosi_total_contribution', ar: 'إجمالي الاشتراك', en: 'Total contribution', w: 130, kind: 'num' },
      { key: 'gosi_total_debit', ar: 'إجمالي المستحق', en: 'Total debit', w: 130, kind: 'num' },
      { key: 'gosi_total_penalties', ar: 'الغرامات', en: 'Penalties', w: 110, kind: 'num' },
      { key: 'total_violation_count', ar: 'عدد المخالفات', en: 'Violations', w: 110, kind: 'num' },
      /* الموارد البشرية / النطاقات (SBC) */
      { key: 'hrsd_labor_office_name', ar: 'مكتب العمل', en: 'Labor office', w: 150, kind: 'text' },
      { key: 'hrsd_nitaq_name', ar: 'النطاق', en: 'Nitaqat', w: 110, kind: 'text' },
      { key: 'hrsd_nitaqat_activity_name', ar: 'نشاط النطاقات', en: 'Nitaqat activity', w: 180, kind: 'text' },
      { key: 'hrsd_saudi_laborers', ar: 'عمالة سعودية', en: 'Saudi labor', w: 120, kind: 'num' },
      { key: 'hrsd_foreign_laborers', ar: 'عمالة وافدة', en: 'Foreign labor', w: 120, kind: 'num' },
      { key: 'hrsd_total_laborers', ar: 'إجمالي العمالة', en: 'Total labor', w: 120, kind: 'num' },
      { key: 'hrsd_saudi_percentage', ar: 'نسبة السعودة', en: 'Saudi %', w: 110, kind: 'num' },
      { key: 'hrsd_total_issued_permits', ar: 'رخص صادرة', en: 'Issued permits', w: 110, kind: 'num' },
      { key: 'hrsd_total_expired_permits', ar: 'رخص منتهية', en: 'Expired permits', w: 110, kind: 'num' },
      { key: 'qawaem_total', ar: 'قوائم مالية', en: 'Qawaem', w: 110, kind: 'num' },
      /* التأمينات الاجتماعية — الحيّة */
      { key: 'gosi_status_ar', ar: 'حالة التأمينات', en: 'GOSI status', w: 120, kind: 'text' },
      { key: 'gosi_outstanding', ar: 'مديونية التأمينات', en: 'GOSI outstanding', w: 140, kind: 'num' },
      { key: 'gosi_bill_status', ar: 'حالة سداد التأمينات', en: 'GOSI bill', w: 140, kind: 'text' },
      { key: 'gosi_active_contributors', ar: 'مشتركون نشطون', en: 'Active contrib.', w: 130, kind: 'num' },
      { key: 'gosi_oh_rate', ar: 'معدل الأخطار المهنية', en: 'OH rate', w: 130, kind: 'num' },
      { key: 'gosi_cert_status', ar: 'شهادة التأمينات', en: 'GOSI cert', w: 130, kind: 'text' },
      { key: 'gosi_violations_unpaid', ar: 'مخالفات غير مدفوعة', en: 'Unpaid violations', w: 140, kind: 'num' },
      /* قوى — الحيّة */
      { key: 'qiwa_expiry', ar: 'انتهاء اشتراك قوى', en: 'Qiwa expiry', w: 140, kind: 'date' },
      { key: 'qiwa_days_left', ar: 'متبقّي قوى (يوم)', en: 'Qiwa days', w: 120, kind: 'num' },
      { key: 'qiwa_panel_status', ar: 'حالة لوحة قوى', en: 'Qiwa panel', w: 120, kind: 'text' },
      { key: 'qiwa_size', ar: 'حجم المنشأة', en: 'Size', w: 110, kind: 'text' },
      { key: 'nitaqat_color', ar: 'لون النطاق (قوى)', en: 'Nitaqat (Qiwa)', w: 130, kind: 'text' },
      { key: 'nitaqat_next_color', ar: 'النطاق التالي', en: 'Next band', w: 120, kind: 'text' },
      { key: 'saudization_rate', ar: 'نسبة السعودة (قوى)', en: 'Saudization (Qiwa)', w: 150, kind: 'num' },
      { key: 'nitaq_saudis', ar: 'سعوديون (نطاقات)', en: 'Saudis (band)', w: 130, kind: 'num' },
      { key: 'nitaq_foreigners', ar: 'وافدون (نطاقات)', en: 'Expats (band)', w: 130, kind: 'num' },
      { key: 'nitaq_total_laborers', ar: 'إجمالي (نطاقات)', en: 'Total (band)', w: 130, kind: 'num' },
      { key: 'visa_work_quota', ar: 'تأشيرات عمل', en: 'Work quota', w: 110, kind: 'num' },
      { key: 'visa_work_unused', ar: 'عمل متبقّي', en: 'Work unused', w: 110, kind: 'num' },
      { key: 'transfer_balance', ar: 'رصيد النقل/الاستقطاب', en: 'Transfer bal.', w: 150, kind: 'num' },
      { key: 'absher_balance', ar: 'رصيد أبشر', en: 'Absher bal.', w: 110, kind: 'num' },
      { key: 'work_permits_valid', ar: 'رخص سارية (قوى)', en: 'Valid WP', w: 120, kind: 'num' },
      { key: 'work_permits_expired', ar: 'رخص منتهية (قوى)', en: 'Expired WP', w: 120, kind: 'num' },
      { key: 'wps_compliance_rate', ar: 'التزام حماية الأجور', en: 'WPS compliance', w: 140, kind: 'num' },
      { key: 'wps_cert_status', ar: 'شهادة حماية الأجور', en: 'WPS cert', w: 140, kind: 'text' },
      /* مقيم — الحيّة */
      { key: 'muqeem_package', ar: 'باقة مقيم', en: 'Muqeem package', w: 170, kind: 'text' },
      { key: 'muqeem_expiry', ar: 'انتهاء مقيم', en: 'Muqeem expiry', w: 120, kind: 'date' },
      { key: 'muqeem_expired', ar: 'مقيم منتهٍ', en: 'Muqeem expired', w: 100, kind: 'text', get: (r, isAr) => yn(r.muqeem_expired, isAr) },
      { key: 'muqeem_waiting_payment', ar: 'دفعة مقيم معلّقة', en: 'Muqeem pending pay', w: 140, kind: 'text', get: (r, isAr) => yn(r.muqeem_waiting_payment, isAr) },
      { key: 'muqeem_points', ar: 'رصيد نقاط مقيم', en: 'Muqeem points', w: 120, kind: 'num' },
      { key: 'muqeem_residents', ar: 'عدد المقيمين', en: 'Residents', w: 110, kind: 'num' },
      /* مدد */
      { key: 'mudad_compliance', ar: 'التزام مدد', en: 'Mudad compliance', w: 120, kind: 'num' },
      { key: 'mudad_status', ar: 'حالة مدد', en: 'Mudad status', w: 130, kind: 'text' },
      { key: 'mudad_open_violations', ar: 'مخالفات مدد', en: 'Mudad violations', w: 120, kind: 'text', get: (r, isAr) => yn(r.mudad_open_violations, isAr) },
      /* أجير */
      { key: 'ajeer_account_type', ar: 'نوع حساب أجير', en: 'Ajeer account', w: 120, kind: 'text' },
      { key: 'ajeer_blocked', ar: 'محجوب بأجير', en: 'Ajeer blocked', w: 110, kind: 'text', get: (r, isAr) => yn(r.ajeer_blocked, isAr) },
      /* الربط بالنظام والمزامنة */
      { key: 'linked_to_system', ar: 'مرتبطة بالنظام', en: 'Linked', w: 110, kind: 'text', get: (r, isAr) => yn(r.linked_to_system, isAr) },
      { key: 'saudi_center', ar: 'مركز سعودي', en: 'Saudi center', w: 100, kind: 'text', get: (r, isAr) => yn(r.saudi_center, isAr) },
      { key: 'is_gosi_only', ar: 'تأمينات فقط', en: 'GOSI-only', w: 100, kind: 'text', get: (r, isAr) => yn(r.is_gosi_only, isAr) },
      { key: 'sync_status', ar: 'حالة مزامنة السجل', en: 'SBC sync status', w: 130, kind: 'text' },
      { key: 'sbc_synced_at', ar: 'مزامنة السجل', en: 'SBC sync', w: 120, kind: 'date', get: (r) => ymd(r.sbc_synced_at) },
      { key: 'gosi_synced_at', ar: 'مزامنة التأمينات', en: 'GOSI sync', w: 120, kind: 'date', get: (r) => ymd(r.gosi_synced_at) },
      { key: 'qiwa_synced_at', ar: 'مزامنة قوى', en: 'Qiwa sync', w: 120, kind: 'date', get: (r) => ymd(r.qiwa_synced_at) },
      { key: 'muqeem_synced_at', ar: 'مزامنة مقيم', en: 'Muqeem sync', w: 120, kind: 'date', get: (r) => ymd(r.muqeem_synced_at) },
      ...OPS_COLS,
    ],
  },

  /* ── الفواتير — v_ops_invoices ───────────────────────────────────────────── */
  {
    key: 'invoices',
    ar: 'الفواتير', en: 'Invoices',
    defaultSource: 'invoice',
    hintAr: 'الفواتير — الخدمة والعميل والمنشأة والفرع والمبالغ وحالة السداد',
    hintEn: 'Invoices — service, client, facility, branch, amounts & payment state',
    async load(sb) {
      const src = await fetchAll(sb, 'v_ops_invoices', '*', (q) => q.order('created_at', { ascending: false, nullsFirst: false }))
      return src.map((r) => ({ ...r, _id: r.id }))
    },
    search: (r) => [r.invoice_no, r.client_name, r.facility_ar, r.request_ref_no, r.service_ar],
    addFields: [
      { key: 'invoice_no', ar: 'رقم الفاتورة', en: 'Invoice no.', required: true },
      { key: 'total_amount', ar: 'الإجمالي', en: 'Total', type: 'number' },
    ],
    columns: [
      { key: 'invoice_no', ar: 'رقم الفاتورة', en: 'Invoice no.', w: 130, kind: 'mono', manual: true },
      { key: 'service_ar', ar: 'الخدمة', en: 'Service', w: 150, kind: 'text' },
      { key: 'client_name', ar: 'العميل', en: 'Client', w: 200, kind: 'text' },
      { key: 'facility_ar', ar: 'المنشأة', en: 'Facility', w: 200, kind: 'text' },
      { key: 'request_ref_no', ar: 'رقم الطلب', en: 'Request no.', w: 130, kind: 'mono' },
      { key: 'branch_code', ar: 'الفرع', en: 'Branch', w: 90, kind: 'text' },
      { key: 'total_amount', ar: 'الإجمالي', en: 'Total', w: 110, kind: 'num' },
      { key: 'service_amount', ar: 'قيمة الخدمة', en: 'Service amt', w: 110, kind: 'num' },
      { key: 'vat_amount', ar: 'الضريبة', en: 'VAT', w: 100, kind: 'num' },
      { key: 'govt_fees_recovery', ar: 'رسوم حكومية', en: 'Gov fees', w: 120, kind: 'num' },
      { key: 'paid_amount', ar: 'المدفوع', en: 'Paid', w: 110, kind: 'num' },
      { key: 'remaining_amount', ar: 'المتبقّي', en: 'Remaining', w: 110, kind: 'num' },
      { key: 'payment_state', ar: 'حالة السداد', en: 'Payment', w: 120, kind: 'text' },
      { key: 'status_ar', ar: 'حالة الفاتورة', en: 'Status', w: 120, kind: 'text' },
      { key: 'payment_plan', ar: 'خطة السداد', en: 'Plan', w: 110, kind: 'text' },
      { key: 'installments_count', ar: 'عدد الأقساط', en: 'Installments', w: 100, kind: 'num' },
      { key: 'note_public', ar: 'ملاحظة', en: 'Note', w: 200, kind: 'text' },
      { key: 'created_at', ar: 'تاريخ الإصدار', en: 'Created', w: 120, kind: 'date', get: (r) => ymd(r.created_at) },
      ...OPS_COLS,
    ],
  },

  /* ── الاشتراكات — v_ops_subscriptions (مقيم + قوى + الانتهاء) ─────────────── */
  {
    key: 'subscriptions',
    ar: 'الاشتراكات', en: 'Subscriptions',
    hintAr: 'اشتراك مقيم واشتراك قوى لكل منشأة — الحالة وتاريخ الانتهاء والأيام المتبقية',
    hintEn: 'Muqeem & Qiwa subscriptions per facility — status, expiry & days left',
    async load(sb) {
      const src = await fetchAll(sb, 'v_ops_subscriptions', '*', (q) => q.order('muqeem_days_left', { ascending: true, nullsFirst: false }))
      return src.map((r) => ({ ...r, _id: r.id }))
    },
    search: (r) => [r.facility_ar, r.unified_number, r.cr_number, r.gosi_number, r.hrsd_number,
      r.muqeem_sync_person, r.qiwa_sync_person, r.sbc_sync_person],
    addFields: [
      { key: 'facility_ar', ar: 'اسم المنشأة', en: 'Facility', required: true },
      { key: 'unified_number', ar: 'الرقم الموحّد', en: 'Unified no.' },
    ],
    columns: [
      // ترتيب المستخدم: المنشأة ← أرقامها ← مقيم ← قوى ← التأكيد السنوي،
      // وكل جهة يليها انتهاؤها والمتبقّي واسم الحساب الذي زامنها.
      { key: 'facility_ar', ar: 'المنشأة', en: 'Facility', w: 240, kind: 'text', manual: true },
      { key: 'unified_number', ar: 'الرقم الموحّد', en: 'Unified no.', w: 130, kind: 'mono', manual: true },
      { key: 'gosi_number', ar: 'التأمينات', en: 'GOSI', w: 120, kind: 'mono' },
      personBgCol('gosi_sync_person', 'مزامنة التأمينات — الحساب', 'GOSI synced by', 'gosi_sync_color'),
      { key: 'hrsd_number', ar: 'الموارد', en: 'HRSD', w: 120, kind: 'mono' },
      { key: 'facility_branches', ar: 'الفرع', en: 'Branch', w: 120, kind: 'text' },
      // نفس مصدر «موظفو المنشأة — غير سعوديين» في عرض السعودة
      { key: 'est_emp_non', ar: 'المنشأة - أجنبي', en: 'Estab. — foreign', w: 120, kind: 'num' },

      { key: 'muqeem_expiry', ar: 'انتهاء مقيم', en: 'Muqeem expiry', w: 120, kind: 'date' },
      { key: 'muqeem_days_left', ar: 'متبقّي مقيم (يوم)', en: 'Muqeem days left', w: 120, kind: 'num', fg: daysFg },
      personBgCol('muqeem_sync_person', 'مزامنة مقيم — الحساب', 'Muqeem synced by', 'muqeem_sync_color'),
      { key: 'muqeem_points', ar: 'رصيد نقاط مقيم', en: 'Muqeem points', w: 120, kind: 'num' },

      { key: 'qiwa_expiry', ar: 'انتهاء قوى', en: 'Qiwa expiry', w: 120, kind: 'date' },
      { key: 'qiwa_days_left', ar: 'متبقّي قوى (يوم)', en: 'Qiwa days left', w: 120, kind: 'num', fg: daysFg },
      // اشتراك قوى يُشترى لكل (منشأة × حساب)، فالتاريخ المعروض يخصّ حساباً بعينه —
      // وقد يكون حساب مفوَّض غير آخر من زامن. لذلك عمودان منفصلان.
      personBgCol('qiwa_sub_person', 'اشتراك قوى — الحساب', 'Qiwa subscription account', 'qiwa_sub_color'),
      { key: 'qiwa_accounts', ar: 'حسابات قوى', en: 'Qiwa accounts', w: 100, kind: 'num',
        fg: (v) => (parseFloat(latin(String(v ?? ''))) > 1 ? C.blue : null) },
      personBgCol('qiwa_sync_person', 'مزامنة قوى — الحساب', 'Qiwa synced by', 'qiwa_sync_color'),

      { key: 'cr_confirm_date', ar: 'التأكيد السنوي', en: 'Annual confirmation', w: 130, kind: 'date' },
      // المتبقّي هنا بمعنيين حسب المرحلة (كما في كرت السجل التجاري): قبل التاريخ =
      // أيام حتى فتح النافذة (أصفر) · بعده = أيام قبل تعليق السجل (أحمر).
      { key: 'cr_confirm_days_left', ar: 'متبقّي التأكيد (يوم)', en: 'Confirmation days left', w: 130, kind: 'num',
        fg: (v, r) => (r?.cr_confirm_stage === 'متأخّر عن التأكيد' || r?.cr_confirm_stage === 'داخل نافذة التأكيد'
          ? C.red : r?.cr_confirm_stage === 'قبل فتح النافذة' ? '#eab308' : null) },
      personBgCol('sbc_sync_person', 'مزامنة المركز — الحساب', 'SBC synced by', 'sbc_sync_color'),

      // ── أعمدة إضافية (مخفيّة افتراضياً — أظهرها من «أعمدة مخفية») ──
      { key: 'cr_confirm_stage', ar: 'مرحلة التأكيد', en: 'Confirmation stage', w: 140, kind: 'text' },
      { key: 'muqeem_status', ar: 'حالة مقيم', en: 'Muqeem status', w: 110, kind: 'text' },
      { key: 'qiwa_status', ar: 'حالة قوى', en: 'Qiwa status', w: 110, kind: 'text' },
      { key: 'muqeem_package', ar: 'باقة مقيم', en: 'Muqeem package', w: 170, kind: 'text' },
      { key: 'muqeem_start', ar: 'بداية مقيم', en: 'Muqeem start', w: 120, kind: 'date' },
      { key: 'muqeem_waiting_payment', ar: 'دفعة مقيم معلّقة', en: 'Muqeem pending pay', w: 130, kind: 'text', get: (r, isAr) => yn(r.muqeem_waiting_payment, isAr) },
      { key: 'qiwa_panel_status', ar: 'حالة لوحة قوى', en: 'Qiwa panel', w: 120, kind: 'text' },
      { key: 'cr_number', ar: 'السجل التجاري', en: 'CR number', w: 130, kind: 'mono' },
      { key: 'city_ar', ar: 'المدينة', en: 'City', w: 110, kind: 'text' },
      { key: 'mobile', ar: 'الجوال', en: 'Mobile', w: 130, kind: 'mono' },
      ...OPS_COLS,
    ],
  },

  /* ── تأشيرات العمل — v_ops_work_visas ────────────────────────────────────── */
  {
    key: 'work_visas',
    ar: 'تأشيرات العمل', en: 'Work visas',
    hintAr: 'تأشيرات العمل — الجنسية والمهنة ونوع التأشيرة وحالة الاستخدام والوكالة',
    hintEn: 'Work visas — nationality, occupation, type, usage & wakalah',
    async load(sb) {
      const src = await fetchAll(sb, 'v_ops_work_visas', '*', (q) => q.order('created_at', { ascending: false, nullsFirst: false }))
      return src.map((r) => ({ ...r, _id: r.id }))
    },
    search: (r) => [r.worker_name, r.visa_number, r.border_number, r.unified_number, r.facility_ar],
    addFields: [
      { key: 'worker_name', ar: 'اسم العامل', en: 'Worker', required: true },
      { key: 'visa_number', ar: 'رقم التأشيرة', en: 'Visa no.' },
    ],
    columns: [
      { key: 'worker_name', ar: 'اسم العامل', en: 'Worker', w: 200, kind: 'text', manual: true },
      { key: 'visa_number', ar: 'رقم التأشيرة', en: 'Visa no.', w: 140, kind: 'mono', manual: true },
      { key: 'border_number', ar: 'رقم الحدود', en: 'Border no.', w: 130, kind: 'mono' },
      { key: 'facility_ar', ar: 'المنشأة', en: 'Facility', w: 220, kind: 'text' },
      { key: 'nationality_ar', ar: 'الجنسية', en: 'Nationality', w: 120, kind: 'text' },
      { key: 'occupation_ar', ar: 'المهنة', en: 'Occupation', w: 160, kind: 'text' },
      { key: 'visa_type_ar', ar: 'نوع التأشيرة', en: 'Visa type', w: 130, kind: 'text' },
      { key: 'order_kind_ar', ar: 'نوع الطلب', en: 'Order kind', w: 120, kind: 'text' },
      { key: 'usage_status_ar', ar: 'حالة الاستخدام', en: 'Usage', w: 120, kind: 'text' },
      { key: 'gender', ar: 'الجنس', en: 'Gender', w: 80, kind: 'text' },
      { key: 'visa_cost', ar: 'تكلفة التأشيرة', en: 'Visa cost', w: 120, kind: 'num' },
      { key: 'embassy_ar', ar: 'السفارة', en: 'Embassy', w: 140, kind: 'text' },
      { key: 'wakalah_number', ar: 'رقم الوكالة', en: 'Wakalah no.', w: 130, kind: 'mono' },
      { key: 'wakalah_date', ar: 'تاريخ الوكالة', en: 'Wakalah date', w: 120, kind: 'date' },
      { key: 'wakalah_office', ar: 'مكتب الوكالة', en: 'Wakalah office', w: 150, kind: 'text' },
      { key: 'wakalah_status_ar', ar: 'حالة الوكالة', en: 'Wakalah status', w: 120, kind: 'text' },
      { key: 'visa_issue_date', ar: 'تاريخ الإصدار', en: 'Issue date', w: 120, kind: 'date' },
      { key: 'request_ref_no', ar: 'رقم الطلب', en: 'Request no.', w: 130, kind: 'mono' },
      { key: 'notes', ar: 'ملاحظات', en: 'Notes', w: 200, kind: 'text' },
      { key: 'src', ar: 'المصدر', en: 'Source', w: 100, kind: 'text', get: (r, isAr) => (isAr ? 'النظام' : 'Office') },
      ...OPS_COLS,
    ],
  },

  /* ── نقل الكفالة — v_ops_transfers (حاسبة النقل) ─────────────────────────── */
  {
    key: 'transfers',
    ar: 'نقل الكفالة', en: 'Sponsorship transfer',
    hintAr: 'نقل الكفالة — الإقامة والمهنة والرسوم والحالة وتاريخ الانتهاء المتوقّع',
    hintEn: 'Sponsorship transfers — iqama, occupation, fees, status',
    async load(sb) {
      const src = await fetchAll(sb, 'v_ops_transfers', '*', (q) => q.order('created_at', { ascending: false, nullsFirst: false }))
      return src.map((r) => ({ ...r, _id: r.id }))
    },
    search: (r) => [r.worker_name, r.iqama_number, r.quote_no, r.phone],
    addFields: [
      { key: 'worker_name', ar: 'اسم العامل', en: 'Worker', required: true },
      { key: 'iqama_number', ar: 'رقم الإقامة', en: 'Iqama no.' },
    ],
    columns: [
      { key: 'worker_name', ar: 'اسم العامل', en: 'Worker', w: 200, kind: 'text', manual: true },
      { key: 'iqama_number', ar: 'رقم الإقامة', en: 'Iqama no.', w: 120, kind: 'mono', manual: true },
      { key: 'quote_no', ar: 'رقم العرض', en: 'Quote no.', w: 110, kind: 'mono' },
      { key: 'branch_code', ar: 'الفرع', en: 'Branch', w: 90, kind: 'text' },
      { key: 'nationality', ar: 'الجنسية', en: 'Nationality', w: 120, kind: 'text' },
      { key: 'occupation_name_ar', ar: 'المهنة الحالية', en: 'Occupation', w: 160, kind: 'text' },
      { key: 'new_occupation_name_ar', ar: 'المهنة الجديدة', en: 'New occupation', w: 160, kind: 'text' },
      { key: 'resident_status_ar', ar: 'حالة المقيم', en: 'Resident status', w: 120, kind: 'text' },
      { key: 'sponsor_changes', ar: 'مرات النقل', en: 'Transfers', w: 90, kind: 'num' },
      { key: 'iqama_expiry_gregorian', ar: 'انتهاء الإقامة', en: 'Iqama expiry', w: 120, kind: 'date' },
      { key: 'iqama_expiry_hijri', ar: 'الانتهاء هجري', en: 'Expiry (H)', w: 120, kind: 'mono' },
      { key: 'transfer_only', ar: 'نقل فقط', en: 'Transfer only', w: 100, kind: 'text', get: (r, isAr) => yn(r.transfer_only, isAr) },
      { key: 'renew_iqama', ar: 'تجديد إقامة', en: 'Renew iqama', w: 100, kind: 'text', get: (r, isAr) => yn(r.renew_iqama, isAr) },
      { key: 'renewal_months', ar: 'أشهر التجديد', en: 'Renew months', w: 100, kind: 'num' },
      { key: 'insurance_status', ar: 'حالة التأمين', en: 'Insurance', w: 110, kind: 'text' },
      { key: 'insurance_company', ar: 'شركة التأمين', en: 'Insurer', w: 150, kind: 'text' },
      { key: 'transfer_fee', ar: 'رسم النقل', en: 'Transfer fee', w: 110, kind: 'num' },
      { key: 'iqama_renewal_fee', ar: 'رسم التجديد', en: 'Renewal fee', w: 120, kind: 'num' },
      { key: 'medical_fee', ar: 'الفحص الطبي', en: 'Medical', w: 100, kind: 'num' },
      { key: 'office_fee', ar: 'رسم المكتب', en: 'Office fee', w: 100, kind: 'num' },
      { key: 'government_fees', ar: 'رسوم حكومية', en: 'Gov fees', w: 120, kind: 'num' },
      { key: 'total_amount', ar: 'الإجمالي', en: 'Total', w: 120, kind: 'num' },
      { key: 'status', ar: 'الحالة', en: 'Status', w: 110, kind: 'text' },
      { key: 'expected_expiry_date', ar: 'الانتهاء المتوقّع', en: 'Expected expiry', w: 130, kind: 'date' },
      { key: 'phone', ar: 'الجوال', en: 'Mobile', w: 130, kind: 'mono' },
      { key: 'src', ar: 'المصدر', en: 'Source', w: 100, kind: 'text', get: (r, isAr) => (isAr ? 'النظام' : 'Office') },
      ...OPS_COLS,
    ],
  },

  /* ── نطاقات والاستقطاب — qiwa_companies ──────────────────────────────────── */
  {
    key: 'nitaqat',
    ar: 'نطاقات والاستقطاب', en: 'Nitaqat & recruitment',
    hintAr: 'نطاقات المنشآت ونسبة السعودة وأرصدة التأشيرات وحدود الاستقطاب',
    hintEn: 'Establishment nitaqat, saudization & visa/recruitment balances',
    async load(sb) {
      const src = await fetchAll(sb, 'qiwa_companies',
        'company_id,establishment_name,cr_number,cr_national_number,entity_number,nitaqat_color_ar,nitaqat_next_color_ar,nitaqat_nationalization_rate,nitaq_saudis,nitaq_foreigners,nitaq_total_laborers,nitaqat_saudis_to_be_hired,size_name,nitaqat_activity_name,visa_work_quota,visa_work_unused,visa_visit_quota,visa_visit_unused,transfer_available_balance,absher_balance,work_permits_valid,work_permits_expired,subscription_expiry_date,city_name_ar,synced_at',
        (q) => q.order('establishment_name', { nullsFirst: false }))
      return src.map((r) => ({ ...r, _id: String(r.company_id) }))
    },
    search: (r) => [r.establishment_name, r.cr_number, r.entity_number],
    addFields: [{ key: 'establishment_name', ar: 'اسم المنشأة', en: 'Establishment', required: true }],
    columns: [
      { key: 'establishment_name', ar: 'اسم المنشأة', en: 'Establishment', w: 240, kind: 'text', manual: true },
      { key: 'cr_national_number', ar: 'الرقم الموحّد', en: 'Unified no.', w: 140, kind: 'mono' },
      { key: 'cr_number', ar: 'السجل التجاري', en: 'CR number', w: 120, kind: 'mono' },
      { key: 'entity_number', ar: 'رقم المنشأة', en: 'Entity no.', w: 130, kind: 'mono' },
      { key: 'nitaqat_color_ar', ar: 'لون النطاق', en: 'Nitaqat', w: 110, kind: 'text' },
      { key: 'nitaqat_next_color_ar', ar: 'النطاق التالي', en: 'Next band', w: 120, kind: 'text' },
      { key: 'nitaqat_nationalization_rate', ar: 'نسبة السعودة', en: 'Saudization', w: 120, kind: 'num' },
      { key: 'nitaq_saudis', ar: 'سعوديون', en: 'Saudis', w: 95, kind: 'num' },
      { key: 'nitaq_foreigners', ar: 'وافدون', en: 'Expats', w: 95, kind: 'num' },
      { key: 'nitaq_total_laborers', ar: 'إجمالي العمالة', en: 'Total', w: 110, kind: 'num' },
      { key: 'nitaqat_saudis_to_be_hired', ar: 'سعوديون مطلوبون', en: 'Saudis needed', w: 130, kind: 'num' },
      { key: 'size_name', ar: 'حجم المنشأة', en: 'Size', w: 110, kind: 'text' },
      { key: 'nitaqat_activity_name', ar: 'النشاط', en: 'Activity', w: 200, kind: 'text' },
      { key: 'visa_work_quota', ar: 'تأشيرات عمل', en: 'Work quota', w: 110, kind: 'num' },
      { key: 'visa_work_unused', ar: 'عمل متبقّي', en: 'Work unused', w: 110, kind: 'num' },
      { key: 'visa_visit_quota', ar: 'تأشيرات زيارة', en: 'Visit quota', w: 110, kind: 'num' },
      { key: 'visa_visit_unused', ar: 'زيارة متبقّي', en: 'Visit unused', w: 110, kind: 'num' },
      { key: 'transfer_available_balance', ar: 'رصيد النقل', en: 'Transfer bal.', w: 120, kind: 'num' },
      { key: 'absher_balance', ar: 'رصيد أبشر', en: 'Absher bal.', w: 120, kind: 'num' },
      { key: 'work_permits_valid', ar: 'رخص سارية', en: 'Valid WP', w: 110, kind: 'num' },
      { key: 'work_permits_expired', ar: 'رخص منتهية', en: 'Expired WP', w: 110, kind: 'num' },
      { key: 'subscription_expiry_date', ar: 'انتهاء الاشتراك', en: 'Sub. expiry', w: 130, kind: 'date' },
      { key: 'city_name_ar', ar: 'المدينة', en: 'City', w: 110, kind: 'text' },
      { key: 'src', ar: 'المصدر', en: 'Source', w: 90, kind: 'text', get: (r, isAr) => (isAr ? 'قوى' : 'Qiwa') },
      { key: 'src_synced', ar: 'آخر مزامنة', en: 'Last sync', w: 120, kind: 'date', get: (r) => ymd(r.synced_at) },
      ...OPS_COLS,
    ],
  },

  /* ── العمالة الدائمة — أربعة عروض تطابق صفحة WorkforcePage (v_ops_workers) ───
     كل عرض = جدول بنفس أعمدة العرض المقابل في صفحة «العمالة الدائمة». */
  {
    key: 'permanent_workers',
    ar: 'العمالة الدائمة — البيانات الأساسية', en: 'Permanent workforce — Core data',
    hintAr: 'من مركز المزامنة (مقيم+قوى+التأمينات) — عمّال كل منشأة مجمّعين تحتها (اسم/موحّد/تأمينات/موارد) مع الهوية والجنسية والمهنة والإقامة والراتب (تأمينات) ورصيد الجوازات (مقيم)',
    hintEn: 'From Sync Center (Muqeem+Qiwa+GOSI) — workers grouped by facility with iqama, nationality, occupation, GOSI salary & jawazat balance',
    mergeKey: WF_MERGE_KEY, mergeCols: WF_MERGE_COLS,
    load: (sb) => loadSyncWorkforce(sb),
    search: wfSearch,
    addFields: WF_ADD,
    columns: [
      ...WF_FAC, WFC.photo, WFC.name, WFC.iqama, WFC.nationality, WFC.occupation, WFC.iqama_expiry, WFC.salary, WFC.balance, WFC.branch,
      WFC.src, WFC.src_synced, ...OPS_COLS,
    ],
  },
  {
    key: 'permanent_workers_dates',
    ar: 'العمالة الدائمة — التواريخ والتأشيرات', en: 'Permanent workforce — Dates & visas',
    hintAr: 'من مركز المزامنة — عمّال كل منشأة مجمّعين تحتها، مع الإقامة ورخصة العمل (قوى) والجواز والمركبات (مقيم)',
    hintEn: 'From Sync Center — workers grouped by facility, with iqama, work permit (Qiwa), passport & vehicles (Muqeem)',
    mergeKey: WF_MERGE_KEY, mergeCols: WF_MERGE_COLS,
    load: (sb) => loadSyncWorkforce(sb),
    search: wfSearch,
    addFields: WF_ADD,
    columns: [
      ...WF_FAC, WFC.photo, WFC.name, WFC.iqama, WFC.nationality, WFC.iqama_expiry, WFC.work_permit_expiry, WFC.passport_expiry, WFC.vehicles, WFC.branch,
      WFC.src, WFC.src_synced, ...OPS_COLS,
    ],
  },
  {
    key: 'permanent_workers_actual',
    ar: 'العمالة الدائمة — البيانات الفعلية', en: 'Permanent workforce — Actual data',
    hintAr: 'من مركز المزامنة — عمّال كل منشأة مجمّعين تحتها، مع المهنة، ورقم أبشر ومدينة المقر والمهنة الفعلية (تُستكمَل من بيانات المكتب لأنها غير متوفّرة في مركز المزامنة)',
    hintEn: 'From Sync Center — workers grouped by facility, with occupation; Absher mobile, HQ city & actual occupation (filled from office data, not in Sync Center)',
    mergeKey: WF_MERGE_KEY, mergeCols: WF_MERGE_COLS,
    load: (sb) => loadSyncWorkforce(sb),
    search: wfSearch,
    addFields: WF_ADD,
    columns: [
      ...WF_FAC, WFC.photo, WFC.name, WFC.iqama, WFC.occupation, WFC.absher_mobile, WFC.hq_city, WFC.official_occupation, WFC.branch,
      WFC.src, WFC.src_synced, ...OPS_COLS,
    ],
  },
  {
    key: 'permanent_workers_invoices',
    ar: 'العمالة الدائمة — الفواتير', en: 'Permanent workforce — Invoices',
    hintAr: 'من مركز المزامنة — عمّال كل منشأة مجمّعين تحتها، مع فواتير كل عامل ونوعها والمتبقي (الفواتير من المكتب مربوطة برقم الإقامة)',
    hintEn: "From Sync Center — workers grouped by facility, with each worker's office invoices, types & remaining (linked by iqama)",
    mergeKey: WF_MERGE_KEY, mergeCols: WF_MERGE_COLS,
    load: (sb) => loadSyncWorkforce(sb, { invoices: true }),
    search: (r) => [r.name_ar, r.name_en, r.iqama_number, r.nationality_ar, r.facility_ar, r._inv_nos],
    addFields: WF_ADD,
    columns: [
      ...WF_FAC, WFC.photo, WFC.name, WFC.iqama, WFC.nationality, WFC.invoices, WFC.invoice_types, WFC.invoice_remaining, WFC.branch,
      WFC.src, WFC.src_synced, ...OPS_COLS,
    ],
  },

  /* ── الاسترجاعات — متابعة استرجاع الرصيدين لكل عامل ─────────────────────────
     من مركز المزامنة: بطاقة المنشأة (مدمجة) + رصيد أبشر من قوى (مستوى المنشأة)
     ثم صف لكل عامل برصيده. حالتا استرجاع منفصلتان (إدخال يدوي في overlay) كلٌّ
     بجانب رصيدها، بقائمة منسدلة تلوّن الخلية: تم الاسترجاع أخضر · في الانتظار
     أصفر · مشكلة أحمر. */
  {
    key: 'recoveries',
    ar: 'الاسترجاعات', en: 'Recoveries',
    hintAr: 'متابعة استرجاع الأرصدة — رصيد أبشر (قوى) وحالة استرجاعه، ورصيد كل عامل وحالة استرجاعه',
    hintEn: 'Balance recovery tracking — Qiwa Absher balance with its status, and each worker balance with its status',
    mergeKey: WF_MERGE_KEY, mergeCols: WF_MERGE_COLS,
    load: (sb) => loadSyncWorkforce(sb),
    search: wfSearch,
    addFields: WF_ADD,
    columns: [
      WFC.fac_branch, WFC.facility, WFC.unified, WFC.gosi, WFC.hrsd,
      WFC.absher, recoveryStatusCol('op_absher_recovery_status', 'حالة استرجاع رصيد أبشر', 'Absher balance status'),
      WFC.photo, WFC.name, WFC.iqama, WFC.iqama_expiry, WFC.worker_branch,
      WFC.balance, recoveryStatusCol('op_recovery_status', 'حالة استرجاع رصيد العامل', 'Worker balance status'),
      WFC.src, WFC.src_synced, ...OPS_COLS,
    ],
  },

  /* ── خروج نهائي — v_ops_workers (مرشّح بحقول الخروج) ─────────────────────── */
  {
    key: 'final_exit',
    ar: 'خروج نهائي', en: 'Final exit',
    hintAr: 'العمالة على تأشيرة خروج نهائي — نوع الخروج ورقمها وتاريخها والفاتورة',
    hintEn: 'Workers on final-exit visas — type, number, dates & invoice',
    async load(sb) {
      const src = await fetchAll(sb, 'v_ops_workers', '*',
        (q) => q.or('exit_visa_type.not.is.null,exit_visa_number.not.is.null,final_exit_kind.not.is.null').order('name_ar', { nullsFirst: false }))
      return src.map((r) => ({ ...r, _id: r.id }))
    },
    search: (r) => [r.name_ar, r.iqama_number, r.exit_visa_number, r.facility_ar],
    addFields: [
      { key: 'name_ar', ar: 'اسم العامل', en: 'Worker', required: true },
      { key: 'iqama_number', ar: 'رقم الإقامة', en: 'Iqama no.' },
    ],
    columns: [
      { key: 'name_ar', ar: 'اسم العامل', en: 'Worker', w: 200, kind: 'text', manual: true, get: (r, isAr) => (isAr ? r.name_ar : (r.name_en || r.name_ar)) || '' },
      { key: 'iqama_number', ar: 'رقم الإقامة', en: 'Iqama no.', w: 120, kind: 'mono', manual: true },
      { key: 'nationality_ar', ar: 'الجنسية', en: 'Nationality', w: 120, kind: 'text' },
      { key: 'occupation_ar', ar: 'المهنة', en: 'Occupation', w: 150, kind: 'text' },
      { key: 'facility_ar', ar: 'المنشأة', en: 'Facility', w: 200, kind: 'text' },
      { key: 'exit_visa_type', ar: 'نوع تأشيرة الخروج', en: 'Exit visa type', w: 130, kind: 'text' },
      { key: 'exit_visa_number', ar: 'رقم تأشيرة الخروج', en: 'Exit visa no.', w: 130, kind: 'mono' },
      { key: 'exit_visa_issue_date', ar: 'تاريخ الإصدار', en: 'Issue date', w: 130, kind: 'date' },
      { key: 'exit_visa_expiry', ar: 'تاريخ الانتهاء', en: 'Expiry', w: 130, kind: 'date' },
      { key: 'final_exit_kind', ar: 'نوع الخروج النهائي', en: 'Final exit kind', w: 130, kind: 'text' },
      { key: 'exit_final_reason', ar: 'سبب الخروج', en: 'Reason', w: 160, kind: 'text' },
      { key: 'exit_reentry_kind', ar: 'نوع العودة', en: 'Re-entry kind', w: 130, kind: 'text' },
      { key: 'exit_final_invoice_no', ar: 'رقم الفاتورة', en: 'Invoice no.', w: 130, kind: 'mono' },
      { key: 'is_outside_kingdom', ar: 'خارج المملكة', en: 'Outside KSA', w: 110, kind: 'text', get: (r, isAr) => yn(r.is_outside_kingdom, isAr) },
      { key: 'work_permit_expiry', ar: 'انتهاء الرخصة', en: 'WP expiry', w: 120, kind: 'date' },
      { key: 'phone', ar: 'الجوال', en: 'Mobile', w: 130, kind: 'mono' },
      { key: 'src', ar: 'المصدر', en: 'Source', w: 140, kind: 'text', get: (r, isAr) => deriveSources(r.field_sources, isAr) },
      { key: 'src_synced', ar: 'آخر مزامنة', en: 'Last sync', w: 120, kind: 'date', get: (r) => deriveLastSync(r.field_sources, r.source_synced_at) },
      ...OPS_COLS,
    ],
  },

  /* ── السعودة — v_ops_saudization (سعوديو قوى من مركز المزامنة) ────────────────
     المصدر = qiwa_employees (nationality_ar='سعودي') — الموظفون السعوديون الفعليون
     المسجّلون في قوى لكل منشأة، صف لكل سعودي. أعمدة المنشأة (mergeCols) تُدمج عبر
     صفوف سعوديي نفس المنشأة: القيمة تظهر مرة أعلى المجموعة وتُفرَّغ في بقية الصفوف
     بلا فاصل أفقي داخلها. أعداد السعوديين للمطابقة: المركز/التأمينات/قوى. */
  {
    key: 'saudization',
    ar: 'السعودة', en: 'Saudization',
    hintAr: 'السعوديون في قوى لكل منشأة (من مركز المزامنة) — صف لكل سعودي، وأعداد المطابقة من المركز والتأمينات وقوى',
    hintEn: 'Saudi employees in Qiwa per facility (from Sync Center) — one row per Saudi, with cross-check counts',
    // أعمدة على مستوى المنشأة تُدمج رأسياً عبر صفوف نفس المنشأة (مفتاح الدمج = الرقم الموحّد)
    mergeKey: (r) => (r.unified_number != null ? String(r.unified_number) : (r.facility_ar || null)),
    mergeCols: ['facility_ar', 'unified_number', 'gosi_number', 'hrsd_number', 'saudis_sbc', 'saudis_gosi', 'saudis_qiwa', 'gosi_active_contributors', 'fac_nitaqat_color', 'fac_transfer_balance', 'fac_visa_work_quota', 'fac_visa_expansion_balance', 'ent_emp_total', 'ent_emp_saudis', 'ent_emp_non', 'ent_nitaq_saudis', 'ent_nitaq_non', 'est_emp_total', 'est_emp_saudis', 'est_emp_non', 'est_nitaq_saudis', 'est_nitaq_non'],
    async load(sb) {
      // نجلب أرقام الفواتير الحقيقية للتحقق: عمود «رقم الفاتورة» يُظلَّل أخضر عند مطابقته فاتورة فعلية
      const [src, invs] = await Promise.all([
        fetchAll(sb, 'v_ops_saudization', '*',
          (q) => q.order('unified_number', { nullsFirst: false }).order('saudi_name', { nullsFirst: false })),
        fetchAll(sb, 'invoices', 'invoice_no', (q) => q.not('invoice_no', 'is', null)),
      ])
      const invSet = new Set(invs.map((i) => String(i.invoice_no).trim()))
      return src.map((r) => ({ ...r, _id: r.id, _validInvoices: invSet }))
    },
    search: (r) => [r.saudi_name, r.saudi_national_id, r.facility_ar, r.unified_number],
    addFields: [
      { key: 'saudi_name', ar: 'اسم السعودي', en: 'Saudi name', required: true },
      { key: 'saudi_national_id', ar: 'رقم الهوية', en: 'National ID' },
    ],
    columns: [
      /* بيانات المنشأة — مدمجة عبر صفوف سعودييها */
      { key: 'facility_ar', ar: 'اسم المنشأة', en: 'Facility', w: 240, kind: 'text' },
      { key: 'unified_number', ar: 'الرقم الموحّد', en: 'Unified no.', w: 140, kind: 'mono' },
      { key: 'gosi_number', ar: 'رقم التأمينات', en: 'GOSI no.', w: 130, kind: 'mono' },
      { key: 'hrsd_number', ar: 'الموارد البشرية', en: 'HRSD no.', w: 130, kind: 'mono' },
      { key: 'saudis_sbc', ar: 'عدد السعوديين (المركز)', en: 'Saudis (SBC)', w: 150, kind: 'num' },
      { key: 'saudis_gosi', ar: 'عدد السعوديين (التأمينات)', en: 'Saudis (GOSI)', w: 160, kind: 'num' },
      { key: 'saudis_qiwa', ar: 'عدد السعوديين (قوى)', en: 'Saudis (Qiwa)', w: 150, kind: 'num' },
      { key: 'gosi_active_contributors', ar: 'المشتركون النشطون (تأمينات)', en: 'Active contributors (GOSI)', w: 170, kind: 'num' },
      /* بيانات السعودي — صف مستقل لكل سعودي */
      { key: 'saudi_name', ar: 'اسم السعودي', en: 'Saudi name', w: 200, kind: 'text', manual: true },
      { key: 'saudi_national_id', ar: 'رقم الهوية', en: 'National ID', w: 120, kind: 'mono', manual: true },
      { key: 'occupation_ar', ar: 'المهنة', en: 'Occupation', w: 160, kind: 'text' },
      { key: 'employment_status_ar', ar: 'حالة التوظيف', en: 'Employment', w: 110, kind: 'text' },
      { key: 'contract_start_date', ar: 'بداية العقد', en: 'Contract start', w: 120, kind: 'date', get: (r) => ymd(r.contract_start_date) },
      { key: 'work_permit_status', ar: 'حالة رخصة العمل', en: 'Work permit', w: 130, kind: 'text' },
      /* إدخال يدوي: رقم الفاتورة (يُظلَّل أخضر عند مطابقة فاتورة حقيقية) + السبب (قائمة) */
      { key: 'op_invoice_no', ar: 'رقم الفاتورة', en: 'Invoice no.', w: 150, kind: 'mono', ops: true, fg: (v, row) => (row && row._validInvoices && row._validInvoices.has(String(v).trim())) ? '#2ecc71' : '#e87265' },
      { key: 'op_saud_reason', ar: 'السبب', en: 'Reason', w: 150, kind: 'text', ops: true, select: true, options: () => ['رصيد استقطاب', 'أجير', 'كرت عمل'] },
      { key: 'op_status', ar: 'الحالة', en: 'Status', w: 130, kind: 'text', ops: true, select: true, options: () => ['تم التحقق', 'في الانتظار', 'مشكلة'], bg: (v) => v === 'تم التحقق' ? 'rgba(46,204,113,.32)' : v === 'في الانتظار' ? 'rgba(234,179,8,.32)' : v === 'مشكلة' ? 'rgba(232,114,101,.32)' : null },
      /* نطاقات وأرصدة المنشأة من قوى — مدمجة */
      { key: 'fac_nitaqat_color', ar: 'نطاق المنشأة (قوى)', en: 'Facility band', w: 130, kind: 'text', bg: (v) => nitaqBandBg(v) },
      { key: 'fac_visa_work_quota', ar: 'تأشيرات عمل — المسموح', en: 'Work visas — quota', w: 150, kind: 'num' },
      { key: 'fac_visa_expansion_balance', ar: 'رصيد تأشيرات التوسّع', en: 'Expansion balance', w: 150, kind: 'num' },
      { key: 'fac_transfer_balance', ar: 'الرصيد المتاح (استقطاب)', en: 'Transfer balance', w: 150, kind: 'num' },
      /* ملخص موظفي المنشأة من قوى — على مستوى الكيان ثم المنشأة (مدمجة) */
      { key: 'ent_emp_total', ar: 'موظفو الكيان — الإجمالي', en: 'Entity emp — total', w: 150, kind: 'num' },
      { key: 'ent_emp_saudis', ar: 'موظفو الكيان — سعوديون', en: 'Entity emp — Saudis', w: 160, kind: 'num' },
      { key: 'ent_emp_non', ar: 'موظفو الكيان — غير سعوديين', en: 'Entity emp — non-Saudis', w: 170, kind: 'num' },
      { key: 'ent_nitaq_saudis', ar: 'محتسب نطاقات الكيان — سعوديون', en: 'Entity nitaqat — Saudis', w: 180, kind: 'num' },
      { key: 'ent_nitaq_non', ar: 'محتسب نطاقات الكيان — غير سعوديين', en: 'Entity nitaqat — non-Saudis', w: 190, kind: 'num' },
      { key: 'est_emp_total', ar: 'موظفو المنشأة — الإجمالي', en: 'Estab. emp — total', w: 150, kind: 'num' },
      { key: 'est_emp_saudis', ar: 'موظفو المنشأة — سعوديون', en: 'Estab. emp — Saudis', w: 160, kind: 'num' },
      { key: 'est_emp_non', ar: 'موظفو المنشأة — غير سعوديين', en: 'Estab. emp — non-Saudis', w: 170, kind: 'num' },
      { key: 'est_nitaq_saudis', ar: 'محتسب نطاقات المنشأة — سعوديون', en: 'Estab. nitaqat — Saudis', w: 180, kind: 'num' },
      { key: 'est_nitaq_non', ar: 'محتسب نطاقات المنشأة — غير سعوديين', en: 'Estab. nitaqat — non-Saudis', w: 190, kind: 'num' },
      ...OPS_COLS,
    ],
  },

  /* ── السعودة-إدخال — شيت إدخال يدوي بحت (لا صفوف من المزامنة) ────────────────
     صف لكل سعودي يُدخله الموظف. ثلاثة أعمدة تُملأ ذاتياً ممّا يكتبه:
       · رقم الموارد البشرية → رقم التأمينات · اسم المنشأة · نطاق المنشأة (مزامنة)
       · رقم الفاتورة       → نوع الخدمة · فرع المكتب (من الفواتير)
     الباقي إدخال: اسم السعودي والهوية والبنك وصاحب الحساب والآيبان + ملف الحوالة
     (يُرفع لبكت attachments ويُحفَظ رابطه في الخلية). المشتقّ يبقى قابلاً
     للتعديل — أي قيمة يكتبها الموظف تتجاوز الاشتقاق (تظهر بمثلث التجاوز). */
  {
    key: 'saudization_entry',
    ar: 'السعودة-إدخال', en: 'Saudization-entry',
    blankRows: 20,          // عشرون صفاً فارغاً جاهزاً للإدخال دائماً
    hintAr: 'إدخال يدوي لكل سعودي — اكتب رقم الموارد البشرية فتُملأ التأمينات واسم المنشأة ونطاقها، واكتب رقم الفاتورة فيُملأ نوع الخدمة وفرع المكتب، ثم بيانات الحساب البنكي وملف الحوالة',
    hintEn: 'Manual entry per Saudi — HRSD no. fills GOSI/facility/nitaqat band, invoice no. fills service & office branch, plus bank details and the transfer file',
    async load(sb) {
      // لا صفوف مصدر — نبني خرائط الاشتقاق فقط (منشآت · فواتير · نطاقات · بنوك)
      const [facs, invs, qcs, sauds, bk] = await Promise.all([
        fetchAll(sb, 'facilities', 'name_ar,unified_number,gosi_number,hrsd_number', (q) => q.is('deleted_at', null)),
        fetchAll(sb, 'v_ops_invoices', 'invoice_no,service_ar,branch_code'),
        fetchAll(sb, 'qiwa_companies', 'cr_national_number,nitaqat_color_ar,synced_at',
          (q) => q.order('synced_at', { ascending: false, nullsFirst: false })),
        fetchAll(sb, 'v_ops_saudization', 'saudi_national_id,unified_number'),
        sb.from('lookup_items').select('value_ar,sort_order,lookup_categories!inner(category_key)')
          .eq('lookup_categories.category_key', 'saudi_banks').eq('is_active', true).order('sort_order'),
      ])
      // النطاق من قوى بالرقم الموحّد (أحدث صف له نطاق — الجدول فيه تكرار لكل منشأة)
      const band = new Map()
      for (const q of qcs) {
        const k = sdeKey(q.cr_national_number)
        if (!k || band.has(k) || !q.nitaqat_color_ar) continue
        band.set(k, q.nitaqat_color_ar)
      }
      SDE_REF.fac.clear(); SDE_REF.facSeq.clear(); SDE_REF.inv.clear()
      for (const f of facs) {
        const k = sdeKey(f.hrsd_number); if (!k) continue
        const rec = {
          name_ar: f.name_ar || '', unified: f.unified_number || '',
          gosi: f.gosi_number || '', hrsd: f.hrsd_number || '',
          band: band.get(sdeKey(f.unified_number)) || '',
        }
        if (!SDE_REF.fac.has(k)) SDE_REF.fac.set(k, rec)
        const s = sdeSeq(k)
        if (s && !SDE_REF.facSeq.has(s)) SDE_REF.facSeq.set(s, rec)
      }
      for (const i of invs) { const k = sdeKey(i.invoice_no); if (k && !SDE_REF.inv.has(k)) SDE_REF.inv.set(k, i) }
      // سعوديو «السعودة-مزامنة» للمطابقة: بالهوية، وبالهوية+المنشأة معاً
      SDE_REF.saudiIds = new Set(); SDE_REF.saudiPairs = new Set()
      for (const s of sauds) {
        const id = sdeKey(s.saudi_national_id); if (!id) continue
        SDE_REF.saudiIds.add(id)
        const u = sdeKey(s.unified_number); if (u) SDE_REF.saudiPairs.add(`${u}|${id}`)
      }
      SDE_REF.banks = [...new Set(((bk && bk.data) || []).map((b) => b.value_ar).filter(Boolean))]
      return []
    },
    search: (r) => Object.values(r._ops || {}),
    addFields: [
      { key: 'sde_name', ar: 'اسم السعودي', en: 'Saudi name' },
      { key: 'sde_id', ar: 'رقم الهوية', en: 'National ID' },
      { key: 'sde_hrsd', ar: 'رقم الموارد البشرية', en: 'HRSD no.' },
    ],
    columns: [
      /* ① المنشأة — يُكتب رقم الموارد فقط، والباقي يُشتقّ من مركز المزامنة */
      { key: 'sde_hrsd', ar: 'رقم الموارد البشرية', en: 'HRSD no.', w: 160, kind: 'mono', ops: true,
        fg: (v) => (String(v || '').trim() === '' ? null : (sdeFacOf(v) ? null : C.red)) },
      { key: 'sde_gosi', ar: 'رقم التأمينات', en: 'GOSI no.', w: 140, kind: 'mono', auto: true,
        get: (r, isAr, p) => (sdeFacOf(ev(r, 'sde_hrsd', p))?.gosi) || '' },
      { key: 'sde_facility', ar: 'اسم المنشأة', en: 'Facility', w: 240, kind: 'text', auto: true,
        get: (r, isAr, p) => (sdeFacOf(ev(r, 'sde_hrsd', p))?.name_ar) || '' },
      /* ② السعودي — إدخال */
      { key: 'sde_name', ar: 'الاسم', en: 'Saudi name', w: 210, kind: 'text', ops: true },
      { key: 'sde_id', ar: 'رقم الهوية', en: 'National ID', w: 130, kind: 'mono', ops: true },
      /* المطابقة مع «السعودة-مزامنة»: هل هذا السعودي مسجَّل فعلاً في قوى تحت المنشأة نفسها */
      { key: 'sde_match', ar: 'المطابق', en: 'Matched', w: 150, kind: 'text', auto: true,
        get: (r, isAr, p) => sdeMatchOf(ev(r, 'sde_id', p), ev(r, 'sde_hrsd', p), isAr),
        bg: (v) => sdeMatchBg(v) },
      { key: 'sde_via', ar: 'من طرف', en: 'Via', w: 160, kind: 'text', ops: true },
      /* ③ الفاتورة — يُكتب رقمها، ونوع الخدمة والفرع يُشتقّان منها */
      { key: 'sde_invoice', ar: 'رقم الفاتورة', en: 'Invoice no.', w: 140, kind: 'mono', ops: true, source: 'entry',
        fg: (v) => (String(v || '').trim() === '' ? null : (sdeInvOf(v) ? '#2ecc71' : C.red)) },
      { key: 'sde_service', ar: 'نوع الخدمة', en: 'Service', w: 180, kind: 'text', source: 'invoice', auto: true,
        get: (r, isAr, p) => (sdeInvOf(ev(r, 'sde_invoice', p))?.service_ar) || '' },
      { key: 'sde_branch', ar: 'فرع المكتب', en: 'Office branch', w: 120, kind: 'text', source: 'invoice', auto: true,
        get: (r, isAr, p) => (sdeInvOf(ev(r, 'sde_invoice', p))?.branch_code) || '' },
      /* ④ نطاق المنشأة من قوى — قراءتان أسبوعيتان بخلفية بلون النطاق:
         · الأسبوع الأول = لقطة تُثبَّت لحظة إدخال الصف (freeze) فلا تتغيّر بعدها.
         · الأسبوع الثاني = النطاق الحالي من آخر مزامنة — فبعد مزامنة الأسبوع
           التالي يظهر فيه النطاق الجديد بينما يبقى الأول كما كان. */
      { key: 'sde_band_w1', ar: 'نطاق المنشأة — الأسبوع الأول', en: 'Nitaqat band — week 1', w: 190, kind: 'text', auto: true, freeze: true,
        get: (r, isAr, p) => (sdeFacOf(ev(r, 'sde_hrsd', p))?.band) || '',
        bg: (v) => nitaqBandBg(v) },
      { key: 'sde_band_w2', ar: 'نطاق المنشأة — الأسبوع الثاني', en: 'Nitaqat band — week 2', w: 190, kind: 'text', auto: true,
        get: (r, isAr, p) => (sdeFacOf(ev(r, 'sde_hrsd', p))?.band) || '',
        bg: (v) => nitaqBandBg(v) },
      /* ⑤ الحساب البنكي — إدخال */
      { key: 'sde_bank', ar: 'اسم البنك', en: 'Bank', w: 190, kind: 'text', ops: true, select: true,
        options: () => SDE_REF.banks },
      { key: 'sde_account_name', ar: 'اسم صاحب الحساب البنكي', en: 'Account holder', w: 210, kind: 'text', ops: true },
      { key: 'sde_iban', ar: 'الآيبان', en: 'IBAN', w: 240, kind: 'mono', ops: true },
      /* ⑥ المرفقات — كل ملف يُرفع لبكت attachments ويُخزَّن رابطه في خليته */
      { key: 'sde_qiwa_contract', ar: 'ملف عقد قوى', en: 'Qiwa contract file', w: 170, kind: 'file', ops: true, source: 'entry' },
      { key: 'sde_gosi_file', ar: 'ملف الاشتراك', en: 'Subscription file', w: 170, kind: 'file', ops: true, source: 'entry' },
      { key: 'sde_transfer_file', ar: 'ملف الحوالة', en: 'Transfer file', w: 170, kind: 'file', ops: true, source: 'entry' },
      ...OPS_COLS,
    ],
  },

  /* ── القوائم المالية — v_ops_qawaem (من المركز السعودي، صف لكل سنة مالية) ──── */
  {
    key: 'qawaem',
    ar: 'القوائم المالية', en: 'Financial statements',
    hintAr: 'حالة القوائم المالية لكل منشأة (من المركز السعودي) — صف لكل سنة مالية، وبيانات المنشأة مدمجة',
    hintEn: 'Financial statements status per facility (SBC) — one row per fiscal year',
    mergeKey: (r) => (r.unified_number != null ? String(r.unified_number) : (r.facility_ar || null)),
    mergeCols: ['facility_ar', 'unified_number', 'gosi_number', 'hrsd_number', 'annual_confirm_date'],
    async load(sb) {
      const src = await fetchAll(sb, 'v_ops_qawaem', '*',
        (q) => q.order('unified_number', { nullsFirst: false }).order('fiscal_year', { ascending: false, nullsFirst: false }))
      return src.map((r) => ({ ...r, _id: r.id }))
    },
    search: (r) => [r.facility_ar, r.unified_number, r.fiscal_year, r.filing_status],
    addFields: [
      { key: 'facility_ar', ar: 'اسم المنشأة', en: 'Facility', required: true },
      { key: 'unified_number', ar: 'الرقم الموحّد', en: 'Unified no.' },
    ],
    columns: [
      /* بيانات المنشأة — مدمجة عبر سنواتها المالية */
      { key: 'facility_ar', ar: 'اسم المنشأة', en: 'Facility', w: 240, kind: 'text' },
      { key: 'unified_number', ar: 'الرقم الموحّد', en: 'Unified no.', w: 140, kind: 'mono' },
      { key: 'gosi_number', ar: 'رقم التأمينات', en: 'GOSI no.', w: 130, kind: 'mono' },
      { key: 'hrsd_number', ar: 'رقم الموارد', en: 'HRSD no.', w: 130, kind: 'mono' },
      { key: 'annual_confirm_date', ar: 'تاريخ التأكيد السنوي', en: 'Annual confirm', w: 140, kind: 'date', get: (r) => ymd(r.annual_confirm_date), bg: (v, row) => {
        const conf = row && row.annual_confirm_date
        if (!conf) return null
        const cd = new Date(String(conf).slice(0, 10) + 'T00:00:00')
        if (Number.isNaN(cd.getTime())) return null
        const limit = new Date(cd); limit.setMonth(limit.getMonth() + 6)   // التأكيد + ٦ أشهر
        return new Date() < limit ? 'rgba(46,204,113,.28)' : 'rgba(234,179,8,.26)'
      } },
      /* القوائم المالية — صف لكل سنة */
      { key: 'fiscal_year', ar: 'السنة المالية', en: 'Fiscal year', w: 110, kind: 'text' },
      /* حالة متابعة (إدخال يدوي) — قائمة منسدلة ملوّنة */
      { key: 'op_status', ar: 'الحالة', en: 'Status', w: 130, kind: 'text', ops: true, select: true, options: () => ['تم', 'في الانتظار', 'مشكلة'], bg: (v) => v === 'تم' ? 'rgba(46,204,113,.32)' : v === 'في الانتظار' ? 'rgba(234,179,8,.32)' : v === 'مشكلة' ? 'rgba(232,114,101,.32)' : null },
      { key: 'filing_status', ar: 'حالة الإيداع (المركز)', en: 'Filing status (SBC)', w: 200, kind: 'text', get: (r, isAr) => qawaemStatusLabel(r.filing_status, isAr), bg: (v, row) => { const s = String((row && row.filing_status) || '').toLowerCase(); return s.includes('approved') ? 'rgba(46,204,113,.28)' : s.includes('pending') ? 'rgba(234,179,8,.26)' : s.includes('rejected') ? 'rgba(232,114,101,.28)' : null } },
      { key: 'calendar_type', ar: 'نوع التقويم', en: 'Calendar', w: 100, kind: 'text' },
      { key: 'statutory_period', ar: 'الفترة النظامية للإيداع', en: 'Statutory period', w: 210, kind: 'mono', get: (r) => { const s = r.statutory_period; if (!s) return ''; const p = String(s).split(' → '); return p.length === 2 ? `${p[1]} ← ${p[0]}` : s } },
      { key: 'filed_on', ar: 'تاريخ الإيداع', en: 'Filed on', w: 120, kind: 'date', bg: (v, row) => {
        const conf = row && row.annual_confirm_date, filed = row && row.filed_on
        if (!conf || !filed) return null
        const cd = new Date(String(conf).slice(0, 10) + 'T00:00:00'), fd = new Date(String(filed).slice(0, 10) + 'T00:00:00')
        if (Number.isNaN(cd.getTime()) || Number.isNaN(fd.getTime())) return null
        const limit = new Date(cd); limit.setMonth(limit.getMonth() + 6)   // التأكيد + ٦ أشهر
        return fd < limit ? 'rgba(46,204,113,.28)' : 'rgba(232,114,101,.28)'
      } },
      { key: 'on_time', ar: 'أُودعت خلال المدة النظامية', en: 'On time', w: 160, kind: 'text' },
      { key: 'unaudited', ar: 'غير مدققة', en: 'Unaudited', w: 100, kind: 'text' },
      { key: 'audit_firm', ar: 'مكتب المراجعة', en: 'Audit firm', w: 170, kind: 'text' },
      { key: 'resubmission', ar: 'إعادة إيداع', en: 'Resubmission', w: 100, kind: 'text' },
      ...OPS_COLS,
    ],
  },

  /* ── مدد — mudad_establishments ──────────────────────────────────────────── */
  {
    key: 'mudad',
    ar: 'مدد', en: 'Mudad',
    hintAr: 'منشآت مدد — نسبة الالتزام وحالة حماية الأجور والمخالفات',
    hintEn: 'Mudad establishments — WPS compliance, status & violations',
    async load(sb) {
      const src = await fetchAll(sb, 'mudad_establishments',
        'mlsd_unified_id,national_unified_id,name,compliance_percentage,compliance_status,wage_period,open_violations,pending_justifications,active_employment,last_synced_at',
        (q) => q.order('name', { nullsFirst: false }))
      return src.map((r) => ({ ...r, _id: r.mlsd_unified_id }))
    },
    search: (r) => [r.name, r.national_unified_id, r.mlsd_unified_id],
    addFields: [{ key: 'name', ar: 'اسم المنشأة', en: 'Establishment', required: true }],
    columns: [
      { key: 'name', ar: 'اسم المنشأة', en: 'Establishment', w: 240, kind: 'text', manual: true },
      { key: 'national_unified_id', ar: 'الرقم الوطني الموحّد', en: 'National unified', w: 150, kind: 'mono' },
      { key: 'mlsd_unified_id', ar: 'معرّف مدد', en: 'Mudad ID', w: 140, kind: 'mono' },
      { key: 'compliance_percentage', ar: 'نسبة الالتزام', en: 'Compliance', w: 120, kind: 'num' },
      { key: 'compliance_status', ar: 'حالة الالتزام', en: 'Status', w: 130, kind: 'text' },
      { key: 'wage_period', ar: 'فترة الأجور', en: 'Wage period', w: 120, kind: 'text' },
      { key: 'open_violations', ar: 'مخالفات مفتوحة', en: 'Open violations', w: 130, kind: 'text', get: (r, isAr) => yn(r.open_violations, isAr) },
      { key: 'pending_justifications', ar: 'مبررات معلّقة', en: 'Pending justif.', w: 130, kind: 'text', get: (r, isAr) => yn(r.pending_justifications, isAr) },
      { key: 'active_employment', ar: 'توظيف نشط', en: 'Active employ.', w: 110, kind: 'text', get: (r, isAr) => yn(r.active_employment, isAr) },
      { key: 'src', ar: 'المصدر', en: 'Source', w: 90, kind: 'text', get: (r, isAr) => (isAr ? 'مدد' : 'Mudad') },
      { key: 'last_synced_at', ar: 'آخر مزامنة', en: 'Last sync', w: 140, kind: 'date', get: (r) => ymd(r.last_synced_at) },
      ...OPS_COLS,
    ],
  },

  /* ── اجير — ajeer_establishments ─────────────────────────────────────────── */
  {
    key: 'ajeer',
    ar: 'اجير', en: 'Ajeer',
    hintAr: 'منشآت أجير — نوع الحساب وحالة الحجب ومؤشرات الأداء',
    hintEn: 'Ajeer establishments — account type, block status & indicators',
    async load(sb) {
      const src = await fetchAll(sb, 'ajeer_establishments',
        'establishment_no,name,account_type,is_blocked,blocked_reason,indicator_weekly,indicator_quarterly,indicator_yearly,last_synced_at',
        (q) => q.order('name', { nullsFirst: false }))
      return src.map((r) => ({ ...r, _id: r.establishment_no }))
    },
    search: (r) => [r.name, r.establishment_no],
    addFields: [{ key: 'name', ar: 'اسم المنشأة', en: 'Establishment', required: true }],
    columns: [
      { key: 'name', ar: 'اسم المنشأة', en: 'Establishment', w: 240, kind: 'text', manual: true },
      { key: 'establishment_no', ar: 'رقم المنشأة', en: 'Establishment no.', w: 150, kind: 'mono' },
      { key: 'account_type', ar: 'نوع الحساب', en: 'Account type', w: 130, kind: 'text' },
      { key: 'is_blocked', ar: 'محجوب', en: 'Blocked', w: 90, kind: 'text', get: (r, isAr) => yn(r.is_blocked, isAr) },
      { key: 'blocked_reason', ar: 'سبب الحجب', en: 'Block reason', w: 180, kind: 'text' },
      { key: 'indicator_weekly', ar: 'مؤشر أسبوعي', en: 'Weekly', w: 110, kind: 'num' },
      { key: 'indicator_quarterly', ar: 'مؤشر ربعي', en: 'Quarterly', w: 120, kind: 'num' },
      { key: 'indicator_yearly', ar: 'مؤشر سنوي', en: 'Yearly', w: 110, kind: 'num' },
      { key: 'src', ar: 'المصدر', en: 'Source', w: 90, kind: 'text', get: (r, isAr) => (isAr ? 'أجير' : 'Ajeer') },
      { key: 'last_synced_at', ar: 'آخر مزامنة', en: 'Last sync', w: 140, kind: 'date', get: (r) => ymd(r.last_synced_at) },
      ...OPS_COLS,
    ],
  },

  /* ── رفع طلبات أجير — جدول فارغ (قيد التعريف) ───────────────────────────────
     الهدف: صف لكل عامل، يُدخل الموظف مدخلات طلب عقد أجير (الأعمدة تُحدَّد بعد
     تتبّع شاشة الطلب في أجير)، ثم عمود «بوكماركت» يولّد لكل صف زرّاً يُشغَّل
     داخل ajeer.qiwa.sa فيرفع الطلب بالبيانات المُدخلة.
     حالياً: بلا مصدر مزامنة — كل الصفوف يدوية والأعمدة فارغة قابلة للتسمية من
     «＋ عمود» / «تنسيق العمود» حتى تُعرَّف مدخلات الطلب الحقيقية. */
  {
    key: 'ajeer_requests',
    ar: 'رفع طلبات أجير', en: 'Ajeer request uploads',
    hintAr: 'صف لكل عامل — تُدخَل مدخلات طلب عقد أجير، ثم يُولَّد بوكماركت لكل صف يُشغَّل داخل أجير لرفع الطلب (الأعمدة تُعرَّف بعد تتبّع شاشة الطلب)',
    hintEn: 'One row per worker — enter the Ajeer contract-request inputs, then a per-row bookmarklet submits it inside Ajeer (columns pending the request-screen walkthrough)',
    load: async () => [],
    search: (r) => Object.values(r._ops || {}),
    addFields: [
      { key: 'aj_worker', ar: 'اسم العامل', en: 'Worker' },
      { key: 'aj_iqama', ar: 'رقم الإقامة', en: 'Iqama no.' },
    ],
    columns: [
      { key: 'aj_status', ar: 'الحالة', en: 'Status', w: 120, kind: 'text', ops: true, select: true,
        options: () => ['تم الرفع', 'في الانتظار', 'مشكلة'],
        bg: (v) => v === 'تم الرفع' ? 'rgba(46,204,113,.32)' : v === 'في الانتظار' ? 'rgba(234,179,8,.32)' : v === 'مشكلة' ? 'rgba(232,114,101,.32)' : null },

      /* ① بيانات المنشأة المستفيدة — مدخلات خطوة beneficiary */
      { key: 'aj_beneficiary', ar: 'المنشأة المستفيدة', en: 'Beneficiary', w: 220, kind: 'text', ops: true },
      { key: 'aj_labor_office', ar: 'مكتب العمل', en: 'Labor office', w: 100, kind: 'mono', ops: true },
      { key: 'aj_sequence_number', ar: 'الرقم التسلسلي', en: 'Sequence no.', w: 130, kind: 'mono', ops: true },
      { key: 'aj_unified_number', ar: 'الرقم الموحّد', en: 'Unified no.', w: 140, kind: 'mono', ops: true },
      /* ② بيانات العقد — مدخلات خطوة information/confirm */
      { key: 'aj_contract_desc', ar: 'نبذة عن العقد', en: 'Description', w: 160, kind: 'text', ops: true },
      { key: 'aj_estimated_cost', ar: 'التكلفة التقديرية', en: 'Est. cost', w: 120, kind: 'num', ops: true },
      { key: 'aj_contract_start', ar: 'بداية العقد', en: 'Contract start', w: 120, kind: 'date', ops: true },
      { key: 'aj_contract_end', ar: 'نهاية العقد', en: 'Contract end', w: 120, kind: 'date', ops: true },
      { key: 'aj_address', ar: 'عنوان موقع العمل', en: 'Work location', w: 260, kind: 'text', ops: true, get: () => AJ_DEF_ADDRESS },
      { key: 'aj_coords', ar: 'الإحداثيات', en: 'Coordinates', w: 150, kind: 'mono', ops: true, get: () => AJ_DEF_COORDS },
      /* ③ زر العقد */
      { key: 'aj_bmk_contract', ar: 'بوكماركت العقد', en: 'Contract bookmarklet', w: 140, kind: 'bmk',
        label: 'عقد', req: AJ_CONTRACT_REQ,
        get: (r) => buildAjeerContractBookmarklet({
          labor_office: av(r, 'aj_labor_office'), sequence_number: av(r, 'aj_sequence_number'), unified_number: av(r, 'aj_unified_number'),
          description: av(r, 'aj_contract_desc'), cost: av(r, 'aj_estimated_cost'),
          start: av(r, 'aj_contract_start'), end: av(r, 'aj_contract_end'),
          address: av(r, 'aj_address') || AJ_DEF_ADDRESS, coords: av(r, 'aj_coords') || AJ_DEF_COORDS,
          beneficiary: av(r, 'aj_beneficiary'),
        }) },
      { key: 'aj_contract_no', ar: 'رقم العقد', en: 'Contract no.', w: 140, kind: 'mono', ops: true },
      { key: 'aj_contract_id', ar: 'معرّف العقد', en: 'Contract ID', w: 110, kind: 'mono', ops: true },
      /* تتبّع خام بأسلوب Burp — للتوثيق والتشخيص، بمستويَي عمق */
      { key: 'aj_bmk_tr1', ar: 'تتبّع — بلا مسوّدة', en: 'Trace (no draft)', w: 165, kind: 'bmk',
        label: 'تتبّع ١', req: [],
        get: () => buildAjeerTraceBookmarklet({ service: 'taqaul', depth: 'service' }) },
      { key: 'aj_bmk_tr2', ar: 'تتبّع — حتى المسوّدة', en: 'Trace (to draft)', w: 175, kind: 'bmk',
        label: 'تتبّع ٢', req: [['aj_labor_office', 'مكتب العمل'], ['aj_sequence_number', 'التسلسلي'], ['aj_unified_number', 'الموحّد']],
        get: (r) => buildAjeerTraceBookmarklet({ service: 'taqaul', depth: 'draft',
          labor_office: av(r, 'aj_labor_office'), sequence_number: av(r, 'aj_sequence_number'), unified_number: av(r, 'aj_unified_number') }) },

      /* ④ العامل ومدة التصريح — مدخلات خطوة notices */
      { key: 'aj_worker', ar: 'اسم العامل', en: 'Worker', w: 200, kind: 'text', ops: true },
      { key: 'aj_iqama', ar: 'رقم الإقامة', en: 'Iqama no.', w: 130, kind: 'mono', ops: true },
      { key: 'aj_notice_start', ar: 'بداية التصريح', en: 'Notice start', w: 120, kind: 'date', ops: true },
      { key: 'aj_notice_end', ar: 'نهاية التصريح', en: 'Notice end', w: 120, kind: 'date', ops: true },
      /* ⑤ زر التصريح */
      { key: 'aj_bmk_notice', ar: 'بوكماركت التصريح', en: 'Notice bookmarklet', w: 145, kind: 'bmk',
        label: 'تصريح', req: AJ_NOTICE_REQ,
        get: (r) => buildAjeerNoticeBookmarklet({
          contract_id: av(r, 'aj_contract_id') || av(r, 'aj_contract_no'), iqama: av(r, 'aj_iqama'),
          notice_start: av(r, 'aj_notice_start'), notice_end: av(r, 'aj_notice_end'), worker: av(r, 'aj_worker'),
        }) },
      ...OPS_COLS,
    ],
  },

  /* ── رفع طلبات الإعارة (التعاقد بين المنشآت) ──────────────────────────────
     مسار أجير مستقل عن «تعاقد أجير»: العقد والعامل يُرفعان في معالج واحد
     فيصدر العقد مباشرة (بلا تصريح لاحق) — لذلك زر واحد لكل صف.
     تفاصيل السلسلة: memory/project_ajeer_tempwork_flow. */
  {
    key: 'ajeer_secondment',
    ar: 'رفع طلبات الإعارة', en: 'Ajeer secondment uploads',
    hintAr: 'صف لكل عامل — عقد الإعارة والعامل يُرفعان معاً بضغطة واحدة داخل أجير (التعاقد بين المنشآت)',
    hintEn: 'One row per worker — the secondment contract and its worker are submitted together by one bookmarklet inside Ajeer',
    load: async () => [],
    search: (r) => Object.values(r._ops || {}),
    addFields: [
      { key: 'sc_worker', ar: 'اسم العامل', en: 'Worker' },
      { key: 'sc_iqama', ar: 'رقم الإقامة', en: 'Iqama no.' },
    ],
    columns: [
      { key: 'sc_status', ar: 'الحالة', en: 'Status', w: 120, kind: 'text', ops: true, select: true,
        options: () => ['تم الرفع', 'في الانتظار', 'مشكلة'],
        bg: (v) => v === 'تم الرفع' ? 'rgba(46,204,113,.32)' : v === 'في الانتظار' ? 'rgba(234,179,8,.32)' : v === 'مشكلة' ? 'rgba(232,114,101,.32)' : null },

      /* ① المنشأة المستفيدة — خطوة beneficiary */
      { key: 'sc_beneficiary', ar: 'المنشأة المستفيدة', en: 'Beneficiary', w: 220, kind: 'text', ops: true },
      { key: 'sc_labor_office', ar: 'مكتب العمل', en: 'Labor office', w: 100, kind: 'mono', ops: true },
      { key: 'sc_sequence_number', ar: 'الرقم التسلسلي', en: 'Sequence no.', w: 130, kind: 'mono', ops: true },
      { key: 'sc_unified_number', ar: 'الرقم الموحّد', en: 'Unified no.', w: 140, kind: 'mono', ops: true },
      /* ② نوع التصريح ومدة العقد — خطوتا type و information */
      { key: 'sc_notice_type', ar: 'نوع التصريح', en: 'Notice type', w: 190, kind: 'text', ops: true, select: true,
        options: () => AJ_SEC_TYPES.map(([, ar]) => ar), get: () => AJ_SEC_TYPES[0][1] },
      { key: 'sc_start', ar: 'بداية العقد', en: 'Contract start', w: 120, kind: 'date', ops: true },
      { key: 'sc_duration', ar: 'المدة (أشهر)', en: 'Duration (months)', w: 110, kind: 'text', ops: true, select: true,
        options: () => ['1', '2', '3', '4', '5', '6'], get: () => '3' },
      /* ③ العامل */
      { key: 'sc_worker', ar: 'اسم العامل', en: 'Worker', w: 200, kind: 'text', ops: true },
      { key: 'sc_iqama', ar: 'رقم الإقامة', en: 'Iqama no.', w: 130, kind: 'mono', ops: true },
      /* ④ زر الرفع — يُنفّذ المعالج كاملاً */
      { key: 'sc_bmk', ar: 'بوكماركت الإعارة', en: 'Secondment bookmarklet', w: 150, kind: 'bmk',
        label: 'إعارة', req: AJ_SEC_REQ,
        get: (r) => buildAjeerSecondmentBookmarklet({
          labor_office: av(r, 'sc_labor_office'), sequence_number: av(r, 'sc_sequence_number'),
          unified_number: av(r, 'sc_unified_number'),
          notice_type: (AJ_SEC_TYPES.find(([, ar]) => ar === av(r, 'sc_notice_type')) || AJ_SEC_TYPES[0])[0],
          start: av(r, 'sc_start'), duration: av(r, 'sc_duration') || '3',
          iqama: av(r, 'sc_iqama'), worker: av(r, 'sc_worker'), beneficiary: av(r, 'sc_beneficiary'),
        }) },
      { key: 'sc_contract_no', ar: 'رقم العقد', en: 'Contract no.', w: 140, kind: 'mono', ops: true },
      /* أهلية أجير تختلف بين منشآت المستخدم — نفس الرابط لكل الصفوف (فحص حساب لا صف) */
      { key: 'sc_bmk_scan', ar: 'فحص أهلية المنشآت', en: 'Eligibility scan', w: 160, kind: 'bmk',
        label: 'فحص الأهلية', req: [], get: () => buildAjeerEligibilityScanBookmarklet('tempwork') },
      /* ⑤ الفاتورة — بعد قبول المنشأة المستفيدة، بلا تصريح وسيط */
      { key: 'sc_bmk_invoice', ar: 'بوكماركت الفاتورة', en: 'Invoice bookmarklet', w: 150, kind: 'bmk',
        label: 'فاتورة', req: [['sc_iqama', 'رقم الإقامة']],
        get: (r) => buildAjeerSecondmentInvoiceBookmarklet({ iqama: av(r, 'sc_iqama'), worker: av(r, 'sc_worker') }) },
      { key: 'sc_invoice_no', ar: 'رقم الفاتورة', en: 'Invoice no.', w: 130, kind: 'mono', ops: true },
      { key: 'sc_invoice_amount', ar: 'المبلغ', en: 'Amount', w: 100, kind: 'num', ops: true },
      ...OPS_COLS,
    ],
  },
]

const ROW_COL = { key: '_row', ar: '#', en: '#', w: 66, kind: 'rownum' }

function GridSkeleton() {
  const sh = { display: 'block', borderRadius: 5, background: 'linear-gradient(90deg,var(--bd2) 25%,var(--bd) 37%,var(--bd2) 63%)', backgroundSize: '400% 100%', animation: 'ox-sh 1.4s ease infinite' }
  return (
    <div>
      <style>{'@keyframes ox-sh{0%{background-position:100% 0}100%{background-position:-100% 0}}'}</style>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[220, 260].map((w, i) => <span key={i} style={{ ...sh, width: w, height: 30, borderRadius: 9 }} />)}
      </div>
      <div style={{ border: '1px solid var(--bd)', borderRadius: 12, overflow: 'hidden' }}>
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: 16, padding: '13px 14px', borderBottom: '1px solid var(--bd2)' }}>
            {[60, 240, 140, 150, 150, 130].map((w, j) => <span key={j} style={{ ...sh, width: w, height: 12 }} />)}
          </div>
        ))}
      </div>
    </div>
  )
}

/* قائمة منسدلة مدمجة داخل خلية الشبكة — نافذتها بورتال بعرض الخلية (= عرض العمود)،
   بشكل أنيق بالثيم كقائمة اختيار العرض. تكتب القيمة عبر onChange (writeCells). */
function CellSelect({ value, options, onChange, disabled, optBg }) {
  const btnRef = useRef(null)
  const popRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxH: 240 })
  const openIt = () => {
    if (disabled) return
    const r = btnRef.current?.getBoundingClientRect()
    if (r) {
      const below = window.innerHeight - r.bottom - 12
      const above = r.top - 12
      const flipUp = below < 150 && above > below
      const maxH = Math.max(120, Math.min(260, (flipUp ? above : below)))
      setPos({ top: flipUp ? r.top - maxH - 4 : r.bottom + 4, left: r.left, width: r.width, maxH })
    }
    setOpen((o) => !o)
  }
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (btnRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const t = setTimeout(() => document.addEventListener('mousedown', onDoc), 0)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', onDoc) }
  }, [open])
  const pick = (v) => { onChange(v); setOpen(false) }
  const item = (o, label, sub) => {
    const base = (!sub && optBg && optBg(o)) || (o === value ? 'rgba(176,125,0,.24)' : 'transparent')
    return (
      <div key={o || '_empty'} onMouseDown={(e) => e.stopPropagation()} onClick={() => pick(o)}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(176,125,0,.20)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = base }}
        style={{ padding: '9px 12px', fontSize: 12.5, fontWeight: 600, color: sub ? 'var(--tx3)' : 'var(--tx)', cursor: 'pointer', borderRadius: 7, textAlign: 'center', background: base, boxShadow: o === value ? `inset 0 0 0 1.5px ${C.gold}` : 'none', margin: '1px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
    )
  }
  return (
    <>
      <button ref={btnRef} type="button" onMouseDown={(e) => e.stopPropagation()} onClick={openIt}
        style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'transparent', border: 'none', outline: 'none', cursor: disabled ? 'default' : 'pointer', color: value ? 'var(--tx)' : 'var(--tx4)', fontFamily: F, fontWeight: value ? 600 : 500, fontSize: 12.5, padding: '0 8px' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || '—'}</span>
        {!disabled && <span aria-hidden style={{ fontSize: 8, color: C.gold, opacity: .85, transition: '.2s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>}
      </button>
      {open && ReactDOM.createPortal(
        <div ref={popRef} style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxH, overflowY: 'auto', background: 'var(--card-grad2)', border: `1.5px solid ${C.gold}`, borderRadius: 10, boxShadow: '0 14px 44px rgba(0,0,0,.30)', zIndex: 4000, fontFamily: F, padding: 5, boxSizing: 'border-box' }}>
        {item('', '—', true)}
        {(options || []).map((o) => item(o, o))}
        </div>, document.body)}
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function OpsExcelsPage({ sb, user, toast, lang, onTabChange }) {
  const isAr = lang !== 'en'
  const T = (a, e) => (isAr ? a : e)
  const canEdit = canPerm(user, 'sync_hub.access') || canPerm(user, 'work_visas.edit') || (user?.role_key === 'gm')

  const [viewKey, setViewKey] = useState(VIEWS[0].key)
  // جداول مخصّصة يبنيها المستخدم من الصفر (بديل ملفات الإكسل) — مخزّنة في ops_sheet_config بمفتاح custom_*
  const [customSheets, setCustomSheets] = useState([])   // [{ key, ar, en }]
  const [nameOverrides, setNameOverrides] = useState({}) // { view_key: { ar, en } } — تسمية أي عرض
  const [sheetModal, setSheetModal] = useState(false)
  const [sheetName, setSheetName] = useState({ ar: '', en: '' })
  const effName = useCallback((v) => { const o = nameOverrides[v.key]; return { ar: o?.ar || v.ar, en: o?.en || v.en } }, [nameOverrides])
  const customViews = useMemo(() => customSheets.map((s) => ({
    key: s.key, ar: s.ar, en: s.en || s.ar, custom: true,
    hintAr: 'جدول مخصّص — أنشئ أعمدته وصفوفه كما تريد', hintEn: 'Custom sheet — build your own columns and rows',
    load: async () => [], search: (r) => Object.values(r._ops || {}), addFields: [], columns: [],
  })), [customSheets])
  const allViews = useMemo(() => [...VIEWS, ...customViews], [customViews])
  const view = useMemo(() => allViews.find((v) => v.key === viewKey) || VIEWS[0], [viewKey, allViews])

  // تخطيط الأعمدة المحفوظ لكل عرض: { order:[keys], hidden:[keys], custom:[{key,ar,w,kind}] }
  const [layout, setLayout] = useState({})
  const hiddenCols = useMemo(() => new Set(layout.hidden || []), [layout])
  // خرائط تعريف الأعمدة: المدمجة (built-in) + المُضافة يدوياً (custom → عمود تشغيلي)
  const colDefs = useMemo(() => {
    const m = new Map()
    for (const c of view.columns) m.set(c.key, c)
    for (const c of (layout.custom || [])) m.set(c.key, { key: c.key, ar: c.ar, en: c.ar, w: c.w || 150, kind: c.kind || 'text', ops: true, custom: true })
    // تجاوز التسمية المحفوظ (إعادة تسمية العمود) — يطغى على المسمى الأصلي.
    // القيمة إمّا نص واحد (توافق قديم) أو {ar,en} لدعم تبديل اللغة.
    const labels = layout.labels || {}
    for (const [k, def] of m) {
      const L = labels[k]; if (!L) continue
      const ar = typeof L === 'string' ? L : L.ar
      const en = typeof L === 'string' ? L : (L.en || L.ar)
      m.set(k, { ...def, ar: ar || def.ar, en: en || def.en })
    }
    return m
  }, [view, layout])
  // ترتيب الأعمدة الفعّال: layout.order إن وُجد، مع إلحاق أي تعريف جديد وإسقاط المفقود
  const orderKeys = useMemo(() => {
    const removed = new Set(layout.removed || [])
    const base = (layout.order && layout.order.length) ? layout.order.slice() : view.columns.map((c) => c.key)
    for (const k of colDefs.keys()) if (!base.includes(k)) base.push(k)
    return base.filter((k) => colDefs.has(k) && !removed.has(k))
  }, [layout, view, colDefs])
  // الأعمدة الظاهرة (عمود الترقيم أولاً دائماً)
  const COLS = useMemo(() => [ROW_COL, ...orderKeys.filter((k) => !hiddenCols.has(k)).map((k) => colDefs.get(k))], [orderKeys, hiddenCols, colDefs])
  const firstEditable = useMemo(() => { const i = COLS.findIndex((c) => c.ops || c.manual); return i < 0 ? 1 : i }, [COLS])
  // أعمدة مثبَّتة (تبقى ظاهرة عند التمرير الأفقي) + أعمدة مقفلة (للقراءة فقط)
  const frozenCount = Math.max(0, Math.min(layout.frozenCount || 0, COLS.length))
  const lockedSet = useMemo(() => new Set(layout.locked || []), [layout])

  const [colModal, setColModal] = useState(false)   // نافذة إضافة عمود
  const [colName, setColName] = useState('')
  const [renameCol, setRenameCol] = useState(null)  // { key, name } نافذة إعادة تسمية
  const [cfModal, setCfModal] = useState(null)      // مفتاح العمود لنافذة التنسيق الشرطي
  const [cfDraft, setCfDraft] = useState({ dup: null, rules: [] })
  const [fmtModal, setFmtModal] = useState(null)    // مفتاح العمود لنافذة تنسيق النص/النوع
  const [fmtDraft, setFmtDraft] = useState({})      // { size, weight, color, type, options, numFmt }
  const [filterModal, setFilterModal] = useState(null)  // مفتاح العمود لنافذة الفلترة
  const [filterDraft, setFilterDraft] = useState({ text: '', values: null, q: '' })
  const [aggModal, setAggModal] = useState(null)    // مفتاح العمود لنافذة التجميع
  const [findModal, setFindModal] = useState(false) // بحث واستبدال
  const [findState, setFindState] = useState({ find: '', replace: '', matchCase: false, colOnly: false })
  const [detailRow, setDetailRow] = useState(null)  // rowId لبطاقة تفاصيل الصف
  const [photoView, setPhotoView] = useState(null)  // { url, name } لعرض صورة العامل مكبّرة
  const [fileBusy, setFileBusy] = useState(null)    // `${rowId}|${colKey}` أثناء رفع ملف الخلية
  useEffect(() => {
    if (!photoView) return
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setPhotoView(null) } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [photoView])
  const [pwModal, setPwModal] = useState(null)      // { key, mode:'set'|'unlock' }
  const [pwInput, setPwInput] = useState('')
  const [unlockedCols, setUnlockedCols] = useState(() => new Set())  // أعمدة فُتحت بكلمة السر هذه الجلسة
  const [hdrCtx, setHdrCtx] = useState(null)        // { x, y, colKey } قائمة سياق رأس العمود
  const dragColRef = useRef(null)                   // مفتاح العمود المسحوب
  const dragRowRef = useRef(null)                   // مفتاح الصف المسحوب

  const [syncRows, setSyncRows] = useState([])
  const [overlay, setOverlay] = useState({})     // row_key → { data, sort_order, hidden, is_manual }
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState(null)
  const [search, setSearch] = useState('')
  // نص البحث المؤجَّل: البحث يمسح كل الأعمدة لكل الصفوف، فنؤجّله قليلاً بعد آخر
  // ضغطة كي تبقى الكتابة في الحقل فورية بلا تعليق.
  const [searchQ, setSearchQ] = useState('')
  useEffect(() => { const t = setTimeout(() => setSearchQ(search), 180); return () => clearTimeout(t) }, [search])
  const [page, setPage] = useState(0)
  const [showHidden, setShowHidden] = useState(false)

  const [edits, setEdits] = useState({})          // { rowId: { colKey: value } }
  const [rowErr, setRowErr] = useState({})
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)         // عمليات الصفوف (إضافة/حذف/ترتيب)

  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({})
  const [ctx, setCtx] = useState(null)            // { x, y, rowId }
  const [selRows, setSelRows] = useState(() => new Set())   // تحديد صفوف متعدد (عبر عمود الترقيم)
  const selAnchorRef = useRef(null)               // مرساة تحديد الصفوف (لـShift)

  const [anchor, setAnchor] = useState({ r: 0, c: 1 })
  const [head, setHead] = useState({ r: 0, c: 1 })
  const [editing, setEditing] = useState(null)
  const editRef = useRef(null)
  const cellInRef = useRef(null)
  const fbRef = useRef(null)
  const [seq, setSeq] = useState(0)
  const dragRef = useRef(false)
  const fillRef = useRef(null)
  const undoStackRef = useRef([])   // لقطات edits السابقة (تراجع)
  const redoStackRef = useRef([])
  const [fillTo, setFillTo] = useState(null)

  const scrollRef = useRef(null)
  const hdrRef = useRef(null)
  // ── التمرير الافتراضي (virtualization) بالنسبة لنافذة العرض ──────────────────
  //    الجدول يبقى بكامل ارتفاعه والصفحة هي التي تُمرَّر (بلا لوحة قصيرة بارتفاع
  //    ثابت)، لكن لا نرسم إلا الصفوف الواقعة ضمن نافذة العرض + هامش. القياس عبر
  //    موضع حاوية الصفوف من أعلى الشاشة، فيعمل أياً كان العنصر الذي يُمرَّر فعلاً.
  const rowsRef = useRef(null)
  const [rowsEl, setRowsEl] = useState(null)
  const setRowsNode = useCallback((node) => { rowsRef.current = node; setRowsEl(node) }, [])
  // start = كم بكسل من منطقة الصفوف صار فوق حافة الشاشة · height = ارتفاع الشاشة
  const [vport, setVport] = useState({ start: 0, height: 900 })
  const [rowH, setRowH] = useState(ROW_H)   // ارتفاع الصف (يُعرَّف مبكّراً: تستعمله حسابات النافذة أعلاه)

  useEffect(() => { onTabChange && onTabChange({ tab: 'ops_excels' }) }, [])
  // يعتمد على rowsEl (ref كدالة) فيعمل لحظة تركيب الشبكة مهما تأخّر ظهورها،
  // ويلتقط التمرير بالـcapture حتى لو كان العنصر المُمرَّر أحد الأجداد لا النافذة.
  useEffect(() => {
    const node = rowsEl; if (!node) return
    let raf = 0
    const recompute = () => {
      raf = 0
      const rect = node.getBoundingClientRect()
      const h = window.innerHeight || 900
      const start = Math.max(0, -rect.top)
      // لا نُعيد الرسم إلا بعد تمرير مسافة معتبرة (الهامش الكبير أدناه يغطّي ما بينها،
      // فيبقى المرسوم سابقاً لعينك دائماً بينما يقلّ عدد مرات إعادة الرسم أثناء التمرير)
      setVport((p) => (Math.abs(p.start - start) < 400 && p.height === h) ? p : { start, height: h })
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(recompute) }
    recompute()
    document.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [rowsEl])

  /* ── التحميل: صفوف المصدر + طبقة الـoverlay ──────────────────────────────── */
  const load = useCallback(async () => {
    if (!sb) return
    setLoading(true); setLoadErr(null)
    try {
      const [src, ovR, cfgR] = await Promise.all([
        view.load(sb),
        sb.from('ops_sheet_rows').select('row_key,data,sort_order,hidden,is_manual').eq('view_key', view.key),
        sb.from('ops_sheet_config').select('layout').eq('view_key', view.key).maybeSingle(),
      ])
      const ov = {}
      for (const o of (ovR.data || [])) ov[o.row_key] = { data: o.data || {}, sort_order: o.sort_order, hidden: !!o.hidden, is_manual: !!o.is_manual }
      const lay = cfgR?.data?.layout || {}
      setSyncRows(src); setOverlay(ov); setLayout(lay)
      setWidthMap({}); setRowH(lay.rowHeight || ROW_H)
      setEdits({}); setRowErr({}); undoStackRef.current = []; redoStackRef.current = []
    } catch (e) {
      setLoadErr(e.message || String(e)); setSyncRows([]); setOverlay({})
    } finally { setLoading(false) }
  }, [sb, view])
  useEffect(() => { load() }, [load])

  /* ── الجداول المخصّصة: تحميل/إنشاء/حذف ───────────────────────────────────── */
  const loadSheets = useCallback(async () => {
    if (!sb) return
    const { data } = await sb.from('ops_sheet_config').select('view_key,layout')
    const list = (data || []).filter((r) => r.layout && r.layout.sheet).map((r) => ({ key: r.view_key, ar: r.layout.name_ar || 'جدول', en: r.layout.name_en || r.layout.name_ar || 'Sheet' }))
    setCustomSheets(list)
    // أسماء مخصّصة لأي عرض (جاهز أو مخصّص) خُزِّن له name_ar
    const ov = {}
    for (const r of (data || [])) { if (r.layout && r.layout.name_ar) ov[r.view_key] = { ar: r.layout.name_ar, en: r.layout.name_en || r.layout.name_ar } }
    setNameOverrides(ov)
  }, [sb])
  useEffect(() => { loadSheets() }, [loadSheets])

  // زر «تحديث من المزامنة»: يعيد جلب أحدث بيانات المزامنة — طبقة الإدخال اليدوي (overlay) محفوظة دائماً
  const refresh = useCallback(async () => {
    if (Object.keys(edits).length && typeof window !== 'undefined' && !window.confirm(T('لديك تعديلات غير محفوظة ستُفقد عند التحديث. احفظ أولاً ثم حدّث. متابعة بدون حفظ؟', 'You have unsaved edits that will be lost. Save first. Continue without saving?'))) return
    await load()
    toast && toast(T('تم جلب أحدث بيانات المزامنة · الإدخالات اليدوية المحفوظة سليمة', 'Latest synced data pulled · saved manual entries preserved'))
  }, [load, edits, toast, T])

  const createSheet = useCallback(async () => {
    const ar = sheetName.ar.trim(); if (!ar || !sb) return
    const rnd = () => (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 12)).replace(/-/g, '')
    const key = 'custom_' + rnd().slice(0, 12)
    const mk = () => 'c_' + rnd().slice(0, 8)
    const cols = [{ key: mk(), ar: 'العمود ١', w: 220, kind: 'text' }, { key: mk(), ar: 'العمود ٢', w: 180, kind: 'text' }, { key: mk(), ar: 'العمود ٣', w: 180, kind: 'text' }]
    const layout = { sheet: true, name_ar: ar, name_en: sheetName.en.trim() || ar, custom: cols, order: cols.map((c) => c.key) }
    const { error } = await sb.from('ops_sheet_config').upsert({ view_key: key, layout, updated_by: user?.id || null, updated_at: new Date().toISOString() }, { onConflict: 'view_key' })
    if (error) { toast && toast(T('فشل إنشاء الجدول', 'Create failed')); return }
    setCustomSheets((prev) => [...prev, { key, ar, en: sheetName.en.trim() || ar }])
    setSheetModal(false); setSheetName({ ar: '', en: '' }); setViewKey(key)
    toast && toast(T('تم إنشاء الجدول', 'Sheet created'))
  }, [sheetName, sb, user, toast, T])

  const deleteSheet = useCallback(async (key) => {
    if (!sb || !String(key).startsWith('custom_')) return
    await sb.from('ops_sheet_rows').delete().eq('view_key', key)
    await sb.from('ops_sheet_config').delete().eq('view_key', key)
    setCustomSheets((prev) => prev.filter((s) => s.key !== key))
    setViewKey(VIEWS[0].key)
    toast && toast(T('حُذف الجدول', 'Sheet deleted'))
  }, [sb, toast, T])

  // إعادة تسمية العرض الحالي (جاهز أو مخصّص) — يُخزَّن الاسم في layout.name_ar/en
  const renameSheet = useCallback(async (ar, en) => {
    const a = String(ar || '').trim(); if (!a || !sb) return
    const en2 = String(en || '').trim() || a
    const isCustom = String(viewKey).startsWith('custom_')
    const next = { ...layout, name_ar: a, name_en: en2, ...(isCustom ? { sheet: true } : {}) }
    setLayout(next)
    const { error } = await sb.from('ops_sheet_config').upsert({ view_key: viewKey, layout: next, updated_by: user?.id || null, updated_at: new Date().toISOString() }, { onConflict: 'view_key' })
    if (error) { toast && toast(T('فشل تعديل الاسم', 'Rename failed')); return }
    setNameOverrides((prev) => ({ ...prev, [viewKey]: { ar: a, en: en2 } }))
    if (isCustom) setCustomSheets((prev) => prev.map((s) => (s.key === viewKey ? { ...s, ar: a, en: en2 } : s)))
    setSheetModal(false); setSheetName({ ar: '', en: '' })
    toast && toast(T('تم تعديل اسم العرض', 'View renamed'))
  }, [layout, viewKey, sb, user, toast, T])

  /* ── شيتات الإدخال: صفوف فارغة جاهزة دائماً في ذيل الجدول (كإكسل) ─────────
     العرض يطلب عدداً (view.blankRows) من الصفوف الفارغة. لا وجود لها في
     التخزين — مجرّد مفاتيح صفوف يدوية فارغة؛ فور الكتابة في أحدها وحفظه يصير
     صفاً حقيقياً في ops_sheet_rows ويُولَّد بدله فارغ جديد فيبقى العدد ثابتاً. */
  const [blankKeys, setBlankKeys] = useState([])
  useEffect(() => { setBlankKeys([]) }, [viewKey])
  useEffect(() => {
    const n = view.blankRows || 0
    if (!n) { if (blankKeys.length) setBlankKeys([]); return }
    const free = blankKeys.filter((k) => !overlay[k] && !edits[k]).length
    if (free < n) setBlankKeys((p) => [...p, ...Array.from({ length: n - free }, () => newKey())])
  }, [view, blankKeys, overlay, edits])

  /* ── دمج المُزامَن + اليدوي، ثم الترتيب ──────────────────────────────────── */
  const allRows = useMemo(() => {
    const out = []
    const seen = new Set()
    for (const r of syncRows) {
      const ov = overlay[r._id] || {}
      out.push({ ...r, _ops: ov.data || {}, _sort: ov.sort_order ?? null, _hidden: !!ov.hidden, _manual: false })
      seen.add(r._id)
    }
    for (const [k, ov] of Object.entries(overlay)) {
      if (!ov.is_manual || seen.has(k)) continue
      const d = ov.data || {}
      out.push({ _id: k, ...d, _ops: d, _sort: ov.sort_order ?? null, _hidden: !!ov.hidden, _manual: true })
      seen.add(k)
    }
    for (const k of blankKeys) {
      if (seen.has(k)) continue
      out.push({ _id: k, _ops: {}, _sort: null, _hidden: false, _manual: true, _blank: true })
    }
    return out
  }, [syncRows, overlay, blankKeys])

  const nameRank = useMemo(() => {
    const m = new Map()
    const rows = [...allRows]
    if (view.mergeKey) {
      // عروض الدمج: رتّب حسب مفتاح المنشأة ثم الاسم كي تتجاور صفوف كل منشأة (شرط الدمج الرأسي)
      rows.sort((a, b) =>
        String(view.mergeKey(a) ?? '').localeCompare(String(view.mergeKey(b) ?? ''), 'ar')
        || String(a.name_ar || a.saudi_name || '').localeCompare(String(b.name_ar || b.saudi_name || ''), 'ar'))
    } else {
      rows.sort((a, b) => String(a.name_ar || '').localeCompare(String(b.name_ar || ''), 'ar'))
    }
    rows.forEach((r, i) => m.set(r._id, i))
    return m
  }, [allRows, view])

  const ordered = useMemo(() => {
    const eff = (r) => (r._sort == null ? 1e6 + (nameRank.get(r._id) || 0) : r._sort)
    return [...allRows].sort((a, b) => (eff(a) - eff(b)) || ((nameRank.get(a._id) || 0) - (nameRank.get(b._id) || 0)))
  }, [allRows, nameRank])

  const hiddenCount = useMemo(() => allRows.reduce((a, r) => a + (r._hidden ? 1 : 0), 0), [allRows])
  // صفوف محذوفة نهائياً (تُستبعد كلياً حتى من قائمة «المحذوفة») — تُخزَّن في layout
  const removedRowSet = useMemo(() => new Set(layout.removedRows || []), [layout])
  const visible = useMemo(() => {
    const base = showHidden ? ordered : ordered.filter((r) => !r._hidden)
    return removedRowSet.size ? base.filter((r) => !removedRowSet.has(r._id)) : base
  }, [ordered, showHidden, removedRowSet])

  // ── مطوّرات المحرّك (كلها مخزّنة في layout — يعدّلها المستخدم بلا كود) ──
  const sortCfg = layout.sort || null                         // { key, dir:'asc'|'desc' }
  const colFilters = useMemo(() => layout.filters || {}, [layout])   // { key: {values:[], text:''} }
  const aggMap = useMemo(() => layout.agg || {}, [layout])          // { key: 'sum'|'avg'|... }
  const numFmtMap = useMemo(() => layout.numFmt || {}, [layout])    // { key: 'thousands'|'currency'|'percent'|'int' }
  const colTypeMap = useMemo(() => layout.colType || {}, [layout])  // { key: 'number'|'date'|'select' }
  const colOptsMap = useMemo(() => layout.colOptions || {}, [layout]) // { key: [options] }
  const wrapMap = useMemo(() => layout.wrap || {}, [layout])        // { key: true }
  const formulaMap = useMemo(() => layout.formula || {}, [layout])  // { key: 'expr' }
  // فهرس مراجع الصيغ: مفتاح/اسم عربي/اسم إنجليزي → تعريف العمود
  const refIndex = useMemo(() => {
    const m = new Map()
    for (const [k, def] of colDefs) { m.set(String(k).toLowerCase(), def); if (def.ar) m.set(String(def.ar).trim().toLowerCase(), def); if (def.en) m.set(String(def.en).trim().toLowerCase(), def) }
    return m
  }, [colDefs])

  // القيمة الأساس للخلية (بلا صيغة) — الأولوية: تعديل غير محفوظ ← تجاوز overlay ← مزامنة/مشتقّة
  const baseVal = useCallback((row, col) => {
    if (!row || !col || col.kind === 'rownum') return ''
    const e = edits[row._id]
    if (e && Object.prototype.hasOwnProperty.call(e, col.key)) return e[col.key] ?? ''
    const ov = row._ops ? row._ops[col.key] : undefined
    if (ov != null && ov !== '') return ov
    // الوسيط الثالث = تعديلات الصف غير المحفوظة، كي تتحدّث الأعمدة المشتقّة
    // (شيت «السعودة-إدخال») لحظة الكتابة في العمود الذي تعتمد عليه لا بعد الحفظ.
    if (col.ops) { if (col.get) return col.get(row, isAr, e) ?? ''; return '' }
    if (col.get) return col.get(row, isAr, e) ?? ''
    const v = row[col.key]
    return v == null ? '' : String(v)
  }, [edits, isAr])

  // قارئ القيمة النهائي — عمود بصيغة يُحسب من قيم بقية الأعمدة (قراءة فقط)
  const valOf = useCallback((row, col) => {
    if (!row || !col || col.kind === 'rownum') return ''
    const fx = formulaMap[col.key]
    if (fx) {
      const getRef = (name) => { const c = refIndex.get(String(name).trim().toLowerCase()); return c && c !== col ? baseVal(row, c) : '' }
      return String(evalFormula(fx, getRef, Date.now()) ?? '')
    }
    return baseVal(row, col)
  }, [formulaMap, refIndex, baseVal])

  // القيمة الأصلية من المزامنة (تتجاهل التجاوز والتعديل) — للكشف عن التجاوز والرجوع
  const syncVal = useCallback((row, col) => {
    if (!row || !col || col.kind === 'rownum' || col.ops) return ''
    if (col.get) return String(col.get(row, isAr) ?? '')
    const v = row[col.key]
    return v == null ? '' : String(v)
  }, [isAr])
  // القيمة المحفوظة الفعّالة (تشمل التجاوز، تتجاهل التعديل غير المحفوظ)
  const savedVal = useCallback((row, col) => {
    const ov = row._ops ? row._ops[col.key] : undefined
    if (ov != null && ov !== '') return String(ov)
    if (col.ops) return col.get ? String(col.get(row, isAr) ?? '') : ''
    if (col.get) return String(col.get(row, isAr) ?? '')
    const v = row[col.key]
    return v == null ? '' : String(v)
  }, [isAr])
  // خلية مُزامَنة جرى تجاوز قيمتها يدوياً (محفوظ)
  const isOverridden = useCallback((row, col) => {
    if (!col || col.ops || col.kind === 'rownum' || !row._ops) return false
    const ov = row._ops[col.key]
    if (ov == null || ov === '') return false
    return String(ov) !== syncVal(row, col)
  }, [syncVal])

  // بحث شامل: يطابق أي قيمة في أي عمود (مزامنة/إدخال/صيغة/تجاوز)، إضافةً إلى
  // حقول view.search المختارة (تشمل حقولاً قد لا يكون لها عمود مثل الاسم الإنجليزي).
  const searched = useMemo(() => {
    const s = latin(searchQ).trim().toLowerCase()
    if (!s) return visible
    // أعمدة البوكماركت نصّها كود، وأعمدة الملفات نصّها رابط تخزين — لا يُبحث فيهما
    const cols = [...colDefs.values()].filter((c) => c.kind !== 'bmk' && c.kind !== 'file')
    const hit = (v) => v != null && v !== '' && latin(v).toLowerCase().includes(s)
    return visible.filter((r) =>
      cols.some((c) => hit(valOf(r, c)))
      || (view.search ? view.search(r) : []).some(hit))
  }, [visible, searchQ, view, colDefs, valOf])

  // عائلة العمود لتحديد شروط الفلترة (نص/رقم/تاريخ)
  const familyOf = useCallback((col) => {
    const t = colTypeMap[col.key]
    if (t === 'number' || col.kind === 'num') return 'number'
    if (t === 'date' || col.kind === 'date') return 'date'
    return 'text'
  }, [colTypeMap])

  // فلترة متقدّمة لكل عمود: قيم مسموحة + شروط (كل/أي) + نص قديم
  const activeFilterKeys = useMemo(() => Object.keys(colFilters).filter((k) => {
    const f = colFilters[k]
    return f && ((Array.isArray(f.values) && f.values.length) || (Array.isArray(f.conds) && f.conds.length) || (f.text && String(f.text).trim() !== ''))
  }), [colFilters])

  const colFiltered = useMemo(() => {
    if (!activeFilterKeys.length) return searched
    const now = new Date()
    return searched.filter((row) => activeFilterKeys.every((k) => {
      const col = colDefs.get(k); if (!col) return true
      const f = colFilters[k]
      const v = String(valOf(row, col) ?? '')
      // 1) نص قديم (توافق)
      if (f.text && String(f.text).trim() !== '' && !latin(v).toLowerCase().includes(latin(f.text).trim().toLowerCase())) return false
      // 2) قائمة القيم المسموحة
      if (Array.isArray(f.values) && f.values.length && !f.values.includes(v)) return false
      // 3) الشروط
      if (Array.isArray(f.conds) && f.conds.length) {
        const fam = familyOf(col)
        const usable = f.conds.filter((c) => c && c.op && (!opNeedsValue(c.op) || c.op === 'preset' || String(c.a ?? '') !== ''))
        if (usable.length) {
          const results = usable.map((c) => evalCond(v, c, fam, now))
          const ok = f.join === 'or' ? results.some(Boolean) : results.every(Boolean)
          if (!ok) return false
        }
      }
      return true
    }))
  }, [searched, activeFilterKeys, colFilters, colDefs, valOf, familyOf])

  // فرز حسب عمود (يتجاوز الترتيب اليدوي أثناء تفعيله)
  const filtered = useMemo(() => {
    if (!sortCfg || !sortCfg.key) return colFiltered
    const col = colDefs.get(sortCfg.key); if (!col) return colFiltered
    const dir = sortCfg.dir === 'desc' ? -1 : 1
    const cmp = (a, b) => {
      const av = valOf(a, col), bv = valOf(b, col)
      if (av === '' && bv === '') return 0
      if (av === '') return 1
      if (bv === '') return -1
      const an = cfNum(av), bn = cfNum(bv)
      if (an !== null && bn !== null) return (an - bn) * dir
      const ad = cfDate(av), bd = cfDate(bv)
      if (ad !== null && bd !== null) return (ad - bd) * dir
      return String(av).localeCompare(String(bv), 'ar') * dir
    }
    // ── عروض الدمج: الفرز لا يجوز أن يبعثر عمّال المنشأة الواحدة ──────────────
    // نرتّب داخل كل مجموعة منشأة، ثم نرتّب المجموعات بأفضل صف فيها — فتبقى
    // بطاقة المنشأة مدمجة وصفوفها متجاورة مهما كان عمود الفرز.
    if (view.mergeKey) {
      const groups = new Map()
      for (const r of colFiltered) {
        const mk = view.mergeKey(r)
        // الصفوف بلا مفتاح (بلا منشأة) لا تُدمَج في الرسم، فتُعامَل هنا كمجموعة مستقلة
        const k = (mk == null || mk === '') ? ` ${r._id}` : String(mk)
        const g = groups.get(k); if (g) g.push(r); else groups.set(k, [r])
      }
      const arr = [...groups.values()]
      for (const g of arr) g.sort(cmp)
      arr.sort((ga, gb) => cmp(ga[0], gb[0]))
      return arr.flat()
    }
    return colFiltered.slice().sort(cmp)
  }, [colFiltered, sortCfg, colDefs, valOf, view])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_ROWS))
  const pageSafe = Math.min(page, totalPages - 1)
  const viewRows = useMemo(() => filtered.slice(pageSafe * PAGE_ROWS, pageSafe * PAGE_ROWS + PAGE_ROWS), [filtered, pageSafe])
  const firstNo = pageSafe * PAGE_ROWS + 1

  const filterKey = `${viewKey}|${searchQ}|${showHidden}|${activeFilterKeys.join(',')}|${sortCfg ? sortCfg.key + sortCfg.dir : ''}`
  useEffect(() => { setPage(0) }, [filterKey])
  useEffect(() => { setUnlockedCols(new Set()) }, [viewKey])   // الأعمدة المحمية تُقفل عند تبديل العرض
  // إبقاء الخلية النشطة داخل نطاق الأعمدة بعد إضافة/حذف عمود
  useEffect(() => {
    setHead((h) => (h.c > COLS.length - 1 ? { ...h, c: COLS.length - 1 } : h))
    setAnchor((a) => (a.c > COLS.length - 1 ? { ...a, c: COLS.length - 1 } : a))
  }, [COLS.length])
  useEffect(() => {
    setAnchor({ r: 0, c: firstEditable }); setHead({ r: 0, c: firstEditable })
    editRef.current = null; setEditing(null); setSelRows(new Set()); selAnchorRef.current = null
  }, [pageSafe, filterKey, firstEditable])

  /* ── قابلية التحرير / العرض / الاتّساخ ───────────────────────────────────── */
  // تحكّم كامل (كالمدير العام): أي عمود قابل للتحرير عدا عمود الترقيم والأعمدة المقفلة/المحمية.
  // تعديل عمود مُزامَن يُخزَّن كتجاوز يظلّل القيمة الأصلية (مع إمكانية الرجوع إليها).
  const isEditable = useCallback((row, col) => !!(canEdit && row && col && col.kind !== 'rownum' && col.kind !== 'photo' && col.kind !== 'bmk' && !col.auto && !lockedSet.has(col.key) && !(layout.protected?.[col.key] && !unlockedCols.has(col.key)) && !(layout.formula?.[col.key])), [canEdit, lockedSet, layout, unlockedCols])

  const dispOf = useCallback((row, col) => {
    if (!row || !col) return ''
    if (col.kind === 'rownum') return ''
    const prot = layout.protected
    if (prot && prot[col.key] && !unlockedCols.has(col.key)) return '••••••'   // عمود محمي بكلمة سر
    return valOf(row, col)
  }, [valOf, layout, unlockedCols])

  // تنسيق العرض فقط (فواصل/عملة/نسبة) — لا يُستعمل في التحرير حتى تبقى القيمة الخام سليمة
  const numFmtOf = useCallback((col) => numFmtMap[col.key] || (col.kind === 'num' ? 'thousands' : ''), [numFmtMap])
  const fmtDisp = useCallback((row, col) => {
    const raw = dispOf(row, col)
    if (raw === '' || raw === '••••••') return raw
    const fmt = numFmtOf(col)
    if (fmt && (col.kind === 'num' || colTypeMap[col.key] === 'number')) return fmtNumber(raw, fmt)
    return raw
  }, [dispOf, numFmtOf, colTypeMap])

  const isDirty = useCallback((row, col) => {
    if (col.kind === 'rownum') return false
    const e = edits[row._id]
    return !!(e && Object.prototype.hasOwnProperty.call(e, col.key))
  }, [edits])

  /* ── التنسيق الشرطي: مجموعات القيم المكرَّرة لكل عمود مُفعَّل + لون كل خلية ── */
  const cfDupSets = useMemo(() => {
    const cf = layout.cf || {}
    const out = {}
    for (const col of COLS) {
      if (col.kind === 'rownum' || !cf[col.key]?.dup) continue
      const counts = new Map()
      for (const row of filtered) { const v = dispOf(row, col); if (v === '') continue; counts.set(v, (counts.get(v) || 0) + 1) }
      const s = new Set(); for (const [v, n] of counts) if (n > 1) s.add(v)
      out[col.key] = s
    }
    return out
  }, [layout, COLS, filtered, dispOf])

  const cfColor = useCallback((row, col) => {
    const rule = (layout.cf || {})[col.key]; if (!rule) return null
    const v = dispOf(row, col); if (v === '') return null
    if (rule.dup && cfDupSets[col.key]?.has(v)) return rule.dup
    for (const r of (rule.rules || [])) if (r.value !== '' && cfMatch(v, r.op, r.value)) return r.color
    return null
  }, [layout, dispOf, cfDupSets])

  /* كتابة قيم في الخلايا (تعديل الحالة فقط — الحفظ لاحق ودفعي) */
  const writeCells = useCallback((cells) => {
    if (!canEdit || !cells.length) return { ok: 0, bad: 0 }
    const applied = []
    let bad = 0
    for (const { row, col, text } of cells) {
      if (!isEditable(row, col)) { bad++; continue }
      applied.push({ row, col, val: String(text ?? '').trim() })
    }
    if (applied.length) {
      setEdits((prev) => {
        undoStackRef.current.push(prev)                       // لقطة للتراجع
        if (undoStackRef.current.length > 120) undoStackRef.current.shift()
        redoStackRef.current = []
        const next = { ...prev }
        for (const { row, col, val } of applied) {
          const cur = { ...(next[row._id] || {}) }
          const original = savedVal(row, col)
          if (String(original) === val) delete cur[col.key]; else cur[col.key] = val
          if (Object.keys(cur).length) next[row._id] = cur; else delete next[row._id]
        }
        return next
      })
      setRowErr((prev) => { const n = { ...prev }; for (const { row } of applied) delete n[row._id]; return n })
    }
    return { ok: applied.length, bad }
  }, [canEdit, isEditable, savedVal])

  /* رفع ملف في خلية kind:'file' — يُرفع لبكت attachments العام ويُكتب رابطه
     في الخلية كأي قيمة (يبقى ضمن التعديلات حتى يُضغط «حفظ»). */
  const uploadCellFile = useCallback(async (row, col, file) => {
    if (!sb || !file || !canEdit) return
    const busyKey = `${row._id}|${col.key}`
    setFileBusy(busyKey)
    try {
      const safe = (file.name || 'file').replace(/[^\w.\-]+/g, '_')
      const path = `ops_sheets/${viewKey}/${row._id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safe}`
      const { error } = await sb.storage.from('attachments').upload(path, file, { cacheControl: '3600', upsert: false })
      if (error) throw error
      const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
      writeCells([{ row, col, text: pub?.publicUrl || path }])
      toast && toast(T('رُفع الملف — اضغط «حفظ» لتثبيته في الصف', 'File uploaded — press Save to store it on the row'))
    } catch (e) {
      toast && toast(T('تعذّر رفع الملف: ', 'Upload failed: ') + (e.message || String(e)))
    } finally { setFileBusy(null) }
  }, [sb, canEdit, viewKey, writeCells, toast, T])

  const undo = useCallback(() => {
    if (!undoStackRef.current.length) { toast && toast(T('لا تراجع', 'Nothing to undo')); return }
    setEdits((cur) => { redoStackRef.current.push(cur); return undoStackRef.current.pop() })
    setSeq((s) => s + 1)
  }, [toast, T])
  const redo = useCallback(() => {
    if (!redoStackRef.current.length) return
    setEdits((cur) => { undoStackRef.current.push(cur); return redoStackRef.current.pop() })
    setSeq((s) => s + 1)
  }, [])

  /* ── التحديد والتنقّل ───────────────────────────────────────────────────── */
  const range = useMemo(() => ({
    r1: Math.min(anchor.r, head.r), r2: Math.max(anchor.r, head.r),
    c1: Math.min(anchor.c, head.c), c2: Math.max(anchor.c, head.c),
  }), [anchor, head])
  const inRange = useCallback((r, c) => r >= range.r1 && r <= range.r2 && c >= range.c1 && c <= range.c2, [range])
  const inFill = useCallback((r, c) => {
    if (fillTo == null) return false
    const lo = Math.min(range.r2 + 1, fillTo), hi = Math.max(range.r2 + 1, fillTo)
    return r >= lo && r <= hi && c >= range.c1 && c <= range.c2
  }, [fillTo, range])

  const move = useCallback((dr, dc, extend) => {
    const r = Math.max(0, Math.min(viewRows.length - 1, head.r + dr))
    const c = Math.max(1, Math.min(COLS.length - 1, head.c + dc))
    setHead({ r, c })
    if (!extend) setAnchor({ r, c })
  }, [viewRows.length, COLS.length, head])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || editing) return
    // الصف النشط مضمون الرسم (vwin يضمّ head.r)، فيكفي تمرير الخلية للرؤية.
    const cell = el.querySelector('[data-active="1"]')
    if (cell) cell.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [head, editing])
  // عند تبديل العرض/الصفحة: أعِد الصفحة لأعلى الجدول
  useEffect(() => {
    const node = rowsRef.current; if (!node) return
    const rect = node.getBoundingClientRect()
    if (rect.top < 0) node.scrollIntoView({ block: 'start' })
  }, [viewKey, pageSafe])

  const beginEdit = useCallback((r, c, seed) => {
    const col = COLS[c], row = viewRows[r]
    if (!isEditable(row, col)) return
    if (col.kind === 'file') return   // خلية ملف: تُدار بزرّ الرفع لا بمحرّر نصّي
    const ed = { r, c, src: 'cell', seed }
    editRef.current = ed
    setEditing(ed)
  }, [isEditable, viewRows, COLS])

  const cancelEdit = useCallback(() => { editRef.current = null; setEditing(null); setSeq((s) => s + 1) }, [])

  const commitEdit = useCallback((moveDir, overrideText) => {
    const ed = editRef.current
    editRef.current = null
    if (ed) {
      const el = ed.src === 'fb' ? fbRef.current : cellInRef.current
      const text = overrideText != null ? overrideText : (el ? el.value : '')
      const row = viewRows[ed.r], col = COLS[ed.c]
      setEditing(null); setSeq((s) => s + 1)
      if (row && col) writeCells([{ row, col, text }])
    } else setEditing(null)
    if (moveDir) move(moveDir[0], moveDir[1], false)
  }, [viewRows, COLS, writeCells, move])

  /* ── العمليات (نسخ/مسح/تعبئة/لصق) ──────────────────────────────────────── */
  /* يبني نص TSV للنسخ: الصفوف المحددة كاملةً، أو نطاق الخلايا. */
  const buildCopyText = useCallback(() => {
    const lines = []
    const dataCols = COLS.filter((c) => c.kind !== 'rownum')
    if (selRows.size > 0) {
      for (const row of viewRows) {
        if (!selRows.has(row._id)) continue
        lines.push(dataCols.map((c) => dispOf(row, c)).join('\t'))
      }
    } else {
      for (let r = range.r1; r <= range.r2; r++) {
        const row = viewRows[r]; if (!row) continue
        const cells = []
        for (let c = range.c1; c <= range.c2; c++) cells.push(dispOf(row, COLS[c]))
        lines.push(cells.join('\t'))
      }
    }
    return { text: lines.join('\n'), count: lines.length }
  }, [range, viewRows, COLS, dispOf, selRows])

  /* المسار الأساس للنسخ: حدث copy الأصلي — بلا صلاحيات ولا قيود iframe. */
  const onCopyEvent = useCallback((e) => {
    const { text, count } = buildCopyText()
    if (!text) return
    e.preventDefault()
    e.clipboardData.setData('text/plain', text)
    toast && toast(T(`تم نسخ ${count} سطر`, `Copied ${count} rows`))
  }, [buildCopyText, toast, T])

  /* Ctrl+C: يطلق حدث copy (يلتقطه onCopyEvent)، مع بديل Clipboard API. */
  const doCopy = useCallback(async () => {
    scrollRef.current?.focus()
    let fired = false
    try { fired = document.execCommand('copy') } catch { fired = false }   // يُشغّل onCopyEvent
    if (fired) return
    const { text, count } = buildCopyText()
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); toast && toast(T(`تم نسخ ${count} سطر`, `Copied ${count} rows`)); return }
    } catch { /* تجاهل */ }
    toast && toast(T('تعذّر النسخ — الصق يدوياً', 'Copy failed — paste manually'))
  }, [buildCopyText, toast, T])

  const doClear = useCallback(() => {
    const cells = []
    for (let r = range.r1; r <= range.r2; r++) {
      const row = viewRows[r]; if (!row) continue
      for (let c = range.c1; c <= range.c2; c++) { const col = COLS[c]; if (isEditable(row, col)) cells.push({ row, col, text: '' }) }
    }
    if (cells.length) writeCells(cells)
  }, [range, viewRows, COLS, writeCells, isEditable])

  const doFillDown = useCallback(() => {
    if (range.r2 <= range.r1) return
    const src = viewRows[range.r1]; if (!src) return
    const cells = []
    for (let c = range.c1; c <= range.c2; c++) {
      const col = COLS[c]
      const text = dispOf(src, col)
      for (let r = range.r1 + 1; r <= range.r2; r++) { const row = viewRows[r]; if (row && isEditable(row, col)) cells.push({ row, col, text }) }
    }
    const { ok } = writeCells(cells)
    if (ok) toast && toast(T(`تمت تعبئة ${ok} خلية`, `Filled ${ok} cells`))
  }, [range, viewRows, COLS, dispOf, writeCells, isEditable, toast, T])

  const applyFillDrag = useCallback((toRow) => {
    const from = range.r2, dir = toRow > from ? 1 : -1
    if (toRow === from) return
    const cells = []
    for (let c = range.c1; c <= range.c2; c++) {
      const col = COLS[c]
      const src = viewRows[dir > 0 ? range.r2 : range.r1]; if (!src) continue
      const text = dispOf(src, col)
      for (let r = from + dir; dir > 0 ? r <= toRow : r >= toRow; r += dir) { const row = viewRows[r]; if (row && isEditable(row, col)) cells.push({ row, col, text }) }
    }
    const { ok } = writeCells(cells)
    if (ok) toast && toast(T(`تمت تعبئة ${ok} خلية`, `Filled ${ok} cells`))
  }, [range, viewRows, COLS, dispOf, writeCells, isEditable, toast, T])

  const onPaste = useCallback((e) => {
    if (!canEdit) return
    const text = e.clipboardData?.getData('text/plain')
    if (!text) return
    e.preventDefault()
    const matrix = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n$/, '').split('\n').map((l) => l.split('\t'))
    const cells = []
    let skippedRO = 0, overflowRows = 0
    for (let i = 0; i < matrix.length; i++) {
      const row = viewRows[range.r1 + i]
      if (!row) { overflowRows = matrix.length - i; break }
      for (let j = 0; j < matrix[i].length; j++) {
        const col = COLS[range.c1 + j]
        if (!col) break
        if (!isEditable(row, col)) { skippedRO++; continue }
        cells.push({ row, col, text: matrix[i][j] })
      }
    }
    const { ok } = writeCells(cells)
    setHead({ r: Math.min(viewRows.length - 1, range.r1 + matrix.length - 1), c: Math.min(COLS.length - 1, range.c1 + Math.max(...matrix.map((m) => m.length)) - 1) })
    const parts = [T(`لُصقت ${ok} خلية`, `Pasted ${ok} cells`)]
    if (skippedRO) parts.push(T(`${skippedRO} للقراءة فقط`, `${skippedRO} read-only`))
    if (overflowRows) parts.push(T(`⚠ ${overflowRows} سطراً تجاوزت الصفحة`, `⚠ ${overflowRows} rows past page`))
    toast && toast(parts.join(' · '))
  }, [canEdit, viewRows, COLS, range, writeCells, isEditable, toast, T])

  const onKeyDown = useCallback((e) => {
    if (editing) return
    const k = e.key
    const ctrl = e.ctrlKey || e.metaKey
    const maxR = viewRows.length - 1, maxC = COLS.length - 1
    if (ctrl && (k === 'c' || k === 'C')) { e.preventDefault(); doCopy(); return }
    if (ctrl && (k === 'd' || k === 'D')) { e.preventDefault(); doFillDown(); return }
    if (ctrl && (k === 'z' || k === 'Z') && !e.shiftKey) { e.preventDefault(); undo(); return }
    if (ctrl && ((k === 'y' || k === 'Y') || ((k === 'z' || k === 'Z') && e.shiftKey))) { e.preventDefault(); redo(); return }
    if (ctrl && (k === 'h' || k === 'H')) { e.preventDefault(); setFindModal(true); return }
    if (ctrl && (k === 'a' || k === 'A')) { e.preventDefault(); setAnchor({ r: 0, c: 1 }); setHead({ r: maxR, c: maxC }); return }
    switch (k) {
      case 'ArrowUp': e.preventDefault(); move(-1, 0, e.shiftKey); return
      case 'ArrowDown': e.preventDefault(); move(1, 0, e.shiftKey); return
      /* في RTL: السهم الأيمن يرجع للخلف والأيسر يتقدّم */
      case 'ArrowRight': e.preventDefault(); move(0, isAr ? -1 : 1, e.shiftKey); return
      case 'ArrowLeft': e.preventDefault(); move(0, isAr ? 1 : -1, e.shiftKey); return
      case 'Home': e.preventDefault(); setHead((h) => ({ ...h, c: 1 })); if (!e.shiftKey) setAnchor((a) => ({ ...a, c: 1 })); return
      case 'End': e.preventDefault(); setHead((h) => ({ ...h, c: maxC })); if (!e.shiftKey) setAnchor((a) => ({ ...a, c: maxC })); return
      case 'Tab': e.preventDefault(); move(0, e.shiftKey ? -1 : 1, false); return
      case 'Enter': e.preventDefault(); move(e.shiftKey ? -1 : 1, 0, false); return
      case 'F2': e.preventDefault(); beginEdit(head.r, head.c); return
      case 'Escape': e.preventDefault(); setAnchor(head); return
      case 'Delete': case 'Backspace': e.preventDefault(); doClear(); return
      default: break
    }
    if (!ctrl && !e.altKey && k.length === 1) { e.preventDefault(); beginEdit(head.r, head.c, k) }
  }, [editing, viewRows.length, COLS.length, head, isAr, move, doCopy, doFillDown, doClear, beginEdit, undo, redo])

  /* ── الحفظ الدفعي (upsert لكل صف متسخ) ──────────────────────────────────── */
  const dirtyCount = useMemo(() => Object.values(edits).reduce((a, o) => a + Object.keys(o).length, 0), [edits])
  const dirtyRowCount = Object.keys(edits).length

  const save = useCallback(async (quiet) => {
    if (!sb || saving || !dirtyRowCount) return
    setSaving(true)
    const byId = new Map(allRows.map((r) => [r._id, r]))
    const entries = Object.entries(edits)
    const nowIso = new Date().toISOString()
    const errs = {}, saved = []
    for (let i = 0; i < entries.length; i += SAVE_CONCURRENCY) {
      await Promise.all(entries.slice(i, i + SAVE_CONCURRENCY).map(async ([rowKey, patch]) => {
        const ov = overlay[rowKey] || {}
        const rowRef = byId.get(rowKey)
        const base = ov.data || rowRef?._ops || {}
        const mergedData = { ...base }
        for (const [kk, v] of Object.entries(patch)) { if (v === '' || v == null) delete mergedData[kk]; else mergedData[kk] = v }
        // أعمدة «لقطة» (freeze): تُلتقط قيمتها المشتقّة أوّل حفظ تكون فيه غير فارغة
        // وتُخزَّن — فتبقى كما كانت مهما تغيّرت المزامنة بعدها (نطاق الأسبوع الأول).
        for (const cd of colDefs.values()) {
          if (!cd.freeze || !cd.get) continue
          if (mergedData[cd.key] != null && mergedData[cd.key] !== '') continue
          const v = String(cd.get({ ...(rowRef || {}), _ops: mergedData }, isAr) ?? '')
          if (v) mergedData[cd.key] = v
        }
        // تنظيف: تجاوز عمود مُزامَن أصبح مطابقاً لقيمة المزامنة يُحذف (لا حاجة لتخزينه)
        if (rowRef) for (const kk of Object.keys(mergedData)) { const cd = colDefs.get(kk); if (cd && !cd.ops && !cd.freeze && String(mergedData[kk]) === syncVal(rowRef, cd)) delete mergedData[kk] }
        const isMan = !!(ov.is_manual || rowRef?._manual)
        const { error } = await sb.from('ops_sheet_rows').upsert({
          view_key: view.key, row_key: rowKey, data: mergedData,
          sort_order: ov.sort_order ?? null, hidden: ov.hidden ?? false, is_manual: isMan,
          updated_by: user?.id || null, updated_at: nowIso,
        }, { onConflict: 'view_key,row_key' })
        if (error) errs[rowKey] = error.message || String(error)
        else saved.push([rowKey, mergedData, isMan])
      }))
    }
    if (saved.length) {
      setOverlay((prev) => {
        const n = { ...prev }
        for (const [id, data, isMan] of saved) n[id] = { ...(n[id] || {}), data, is_manual: isMan }
        return n
      })
      setEdits((prev) => { const n = { ...prev }; for (const [id] of saved) delete n[id]; return n })
    }
    setRowErr(errs); setSaving(false); setSeq((s) => s + 1)
    const failed = Object.keys(errs).length
    if (failed) toast && toast(T(`حُفظ ${saved.length} سطراً · فشل ${failed}`, `Saved ${saved.length} · ${failed} failed`))
    else if (!quiet) toast && toast(T(`تم حفظ ${saved.length} سطراً`, `Saved ${saved.length} rows`))   // الحفظ التلقائي صامت
  }, [sb, saving, dirtyRowCount, edits, allRows, overlay, view, user, toast, T, isAr, colDefs, syncVal])

  // حفظ تلقائي: بعد ثوانٍ يسيرة من آخر تعديل (Enter/Tab/لصق) يُحفظ بلا زر
  const saveRef = useRef(save); useEffect(() => { saveRef.current = save }, [save])
  useEffect(() => {
    if (!dirtyRowCount || saving) return
    const h = setTimeout(() => { saveRef.current && saveRef.current(true) }, 500)
    return () => clearTimeout(h)
  }, [edits, dirtyRowCount, saving])

  const discard = useCallback(() => { setEdits({}); setRowErr({}); undoStackRef.current = []; redoStackRef.current = []; setSeq((s) => s + 1) }, [])

  useEffect(() => {
    if (!dirtyCount) return
    const h = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirtyCount])

  /* ── عمليات الصفوف: إضافة / حذف / ترتيب ─────────────────────────────────── */
  const addPerson = useCallback(async () => {
    if (!sb || busy) return
    const req = (view.addFields || []).filter((f) => f.required)
    for (const f of req) if (!String(addForm[f.key] || '').trim()) { toast && toast(T(`${isAr ? f.ar : f.en} مطلوب`, `${isAr ? f.ar : f.en} required`)); return }
    setBusy(true)
    const key = newKey()
    const data = {}
    for (const f of (view.addFields || [])) { const v = String(addForm[f.key] || '').trim(); if (v) data[f.key] = v }
    const maxSort = allRows.reduce((m, r) => Math.max(m, r._sort ?? 0), 0)
    const sort_order = maxSort + 10
    const nowIso = new Date().toISOString()
    const { error } = await sb.from('ops_sheet_rows').insert({
      view_key: view.key, row_key: key, data, sort_order, hidden: false, is_manual: true,
      created_by: user?.id || null, updated_by: user?.id || null, updated_at: nowIso,
    })
    setBusy(false)
    if (error) { toast && toast(T('فشل الإضافة: ', 'Add failed: ') + (error.message || error)); return }
    setOverlay((prev) => ({ ...prev, [key]: { data, sort_order, hidden: false, is_manual: true } }))
    setAddOpen(false); setAddForm({})
    toast && toast(T('تمت الإضافة', 'Added'))
  }, [sb, busy, view, addForm, allRows, user, toast, T, isAr])

  const deleteRow = useCallback(async (rowId) => {
    if (!sb || busy || !rowId) return
    const row = allRows.find((r) => r._id === rowId); if (!row) return
    setBusy(true)
    const nowIso = new Date().toISOString()
    if (row._manual) {
      const { error } = await sb.from('ops_sheet_rows').delete().eq('view_key', view.key).eq('row_key', rowId)
      setBusy(false)
      if (error) { toast && toast(T('فشل الحذف', 'Delete failed')); return }
      setOverlay((prev) => { const n = { ...prev }; delete n[rowId]; return n })
      setEdits((prev) => { const n = { ...prev }; delete n[rowId]; return n })
      setBlankKeys((prev) => prev.filter((k) => k !== rowId))   // صف فارغ حُذف: يُستبدل بفارغ جديد
      toast && toast(T('حُذف الصف', 'Row deleted'))
    } else {
      const { error } = await sb.from('ops_sheet_rows').upsert({
        view_key: view.key, row_key: rowId, data: row._ops || {}, sort_order: row._sort ?? null,
        hidden: true, is_manual: false, updated_by: user?.id || null, updated_at: nowIso,
      }, { onConflict: 'view_key,row_key' })
      setBusy(false)
      if (error) { toast && toast(T('فشل الإخفاء', 'Hide failed')); return }
      setOverlay((prev) => ({ ...prev, [rowId]: { ...(prev[rowId] || {}), data: row._ops || {}, hidden: true, is_manual: false } }))
      toast && toast(T('أُخفي الصف (المُزامَن لا يُحذف نهائياً)', 'Row hidden (synced rows are not deleted)'))
    }
  }, [sb, busy, allRows, view, user, toast, T])

  const restoreRow = useCallback(async (rowId) => {
    if (!sb || busy) return
    const row = allRows.find((r) => r._id === rowId); if (!row) return
    setBusy(true)
    const { error } = await sb.from('ops_sheet_rows').upsert({
      view_key: view.key, row_key: rowId, data: row._ops || {}, sort_order: row._sort ?? null,
      hidden: false, is_manual: row._manual, updated_by: user?.id || null, updated_at: new Date().toISOString(),
    }, { onConflict: 'view_key,row_key' })
    setBusy(false)
    if (error) { toast && toast(T('فشل الاستعادة', 'Restore failed')); return }
    setOverlay((prev) => ({ ...prev, [rowId]: { ...(prev[rowId] || {}), hidden: false } }))
    toast && toast(T('استُعيد الصف', 'Row restored'))
  }, [sb, busy, allRows, view, user, toast, T])

  /* ترقيم قائمة صفوف مُرتّبة وحفظها دفعة واحدة. */
  const persistOrder = useCallback(async (list) => {
    setBusy(true)
    const nowIso = new Date().toISOString()
    const payload = list.map((r, idx) => ({
      view_key: view.key, row_key: r._id, data: r._ops || {}, sort_order: (idx + 1) * 10,
      hidden: r._hidden, is_manual: r._manual, updated_by: user?.id || null, updated_at: nowIso,
    }))
    const { error } = await sb.from('ops_sheet_rows').upsert(payload, { onConflict: 'view_key,row_key' })
    setBusy(false)
    if (error) { toast && toast(T('فشل الترتيب', 'Reorder failed')); return }
    setOverlay((prev) => {
      const n = { ...prev }
      payload.forEach((p) => { n[p.row_key] = { ...(n[p.row_key] || {}), data: p.data, sort_order: p.sort_order, hidden: p.hidden, is_manual: p.is_manual } })
      return n
    })
  }, [sb, view, user, toast, T])

  /* تحريك صف لأعلى/أسفل (زر). */
  const moveRow = useCallback((rowId, dir) => {
    if (busy) return
    const list = visible.slice()
    const i = list.findIndex((r) => r._id === rowId)
    const j = i + dir
    if (i < 0 || j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    persistOrder(list)
  }, [busy, visible, persistOrder])

  /* إفلات صف/صفوف مسحوبة فوق صف هدف (سحب كإكسل، يدعم التحديد المتعدد). */
  const reorderRows = useCallback((fromId, toId) => {
    if (busy || !fromId || !toId) return
    const movingIds = (selRows.has(fromId) && selRows.size > 1)
      ? visible.filter((r) => selRows.has(r._id)).map((r) => r._id)
      : [fromId]
    if (movingIds.includes(toId)) return
    const list = visible.slice()
    const movingSet = new Set(movingIds)
    const targetIdx = list.findIndex((r) => r._id === toId)
    const firstMovingIdx = list.findIndex((r) => movingSet.has(r._id))
    const moving = list.filter((r) => movingSet.has(r._id))
    const rest = list.filter((r) => !movingSet.has(r._id))
    let ti = rest.findIndex((r) => r._id === toId)
    if (ti < 0) return
    rest.splice(ti + (firstMovingIdx < targetIdx ? 1 : 0), 0, ...moving)
    persistOrder(rest)
  }, [busy, visible, selRows, persistOrder])

  /* نقر عمود الترقيم لتحديد صف (Ctrl يضيف، Shift يحدد نطاقاً). */
  const selectRowClick = useCallback((id, idx, e) => {
    if (e.shiftKey && selAnchorRef.current != null) {
      const aIdx = viewRows.findIndex((x) => x._id === selAnchorRef.current)
      if (aIdx >= 0) {
        const lo = Math.min(aIdx, idx), hi = Math.max(aIdx, idx)
        const s = new Set(); for (let k = lo; k <= hi; k++) if (viewRows[k]) s.add(viewRows[k]._id)
        setSelRows(s); return
      }
    }
    if (e.ctrlKey || e.metaKey) {
      setSelRows((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
      selAnchorRef.current = id; return
    }
    setSelRows((prev) => (prev.size === 1 && prev.has(id) ? new Set() : new Set([id])))
    selAnchorRef.current = id
  }, [viewRows])

  /* حذف/إخفاء الصفوف المحددة دفعة. */
  const deleteSelected = useCallback(async () => {
    if (!sb || busy || !selRows.size) return
    const rows = [...selRows].map((id) => allRows.find((r) => r._id === id)).filter(Boolean)
    const manualIds = rows.filter((r) => r._manual).map((r) => r._id)
    const syncTargets = rows.filter((r) => !r._manual)
    setBusy(true)
    const nowIso = new Date().toISOString()
    if (manualIds.length) await sb.from('ops_sheet_rows').delete().eq('view_key', view.key).in('row_key', manualIds)
    if (syncTargets.length) {
      const payload = syncTargets.map((r) => ({
        view_key: view.key, row_key: r._id, data: r._ops || {}, sort_order: r._sort ?? null,
        hidden: true, is_manual: false, updated_by: user?.id || null, updated_at: nowIso,
      }))
      await sb.from('ops_sheet_rows').upsert(payload, { onConflict: 'view_key,row_key' })
    }
    setBusy(false)
    setOverlay((prev) => {
      const n = { ...prev }
      for (const id of manualIds) delete n[id]
      for (const r of syncTargets) n[r._id] = { ...(n[r._id] || {}), data: r._ops || {}, hidden: true, is_manual: false }
      return n
    })
    setSelRows(new Set())
    toast && toast(T(`حُذف/أُخفي ${rows.length} صفاً`, `${rows.length} rows removed`))
  }, [sb, busy, selRows, allRows, view, user, toast, T])

  /* استعادة الصفوف المحددة المخفية دفعة. */
  const restoreSelected = useCallback(async () => {
    if (!sb || busy || !selRows.size) return
    const rows = [...selRows].map((id) => allRows.find((r) => r._id === id)).filter((r) => r && r._hidden)
    if (!rows.length) return
    setBusy(true)
    const nowIso = new Date().toISOString()
    const payload = rows.map((r) => ({
      view_key: view.key, row_key: r._id, data: r._ops || {}, sort_order: r._sort ?? null,
      hidden: false, is_manual: r._manual, updated_by: user?.id || null, updated_at: nowIso,
    }))
    await sb.from('ops_sheet_rows').upsert(payload, { onConflict: 'view_key,row_key' })
    setBusy(false)
    setOverlay((prev) => { const n = { ...prev }; for (const r of rows) n[r._id] = { ...(n[r._id] || {}), hidden: false }; return n })
    setSelRows(new Set())
    toast && toast(T(`استُعيد ${rows.length} صفاً`, `${rows.length} rows restored`))
  }, [sb, busy, selRows, allRows, view, user, toast, T])

  /* ── عمليات الأعمدة: إضافة / حذف / ترتيب ──────────────────────────────────
     الحفظ **يدمج ولا يستبدل**: التخطيط سجلّ واحد مشترك لكل العرض، وكان كل حفظ
     يكتب نسخة الذاكرة كاملةً — فأي تبويب مفتوح من قبل (أو تعديل من شخص آخر أو
     من SQL) يُدهَس ويرجع الترتيب للخلف عند التحديث. الآن نحسب **ما تغيّر فعلاً
     في هذه العملية** ونطبّقه على أحدث نسخة من الخادم، فتتعايش التعديلات. */
  const persistLayout = useCallback(async (next) => {
    setLayout(next)
    if (!sb) return
    const prev = layout || {}
    const changed = {}
    for (const k of new Set([...Object.keys(next || {}), ...Object.keys(prev)])) {
      if (JSON.stringify(next?.[k]) !== JSON.stringify(prev[k])) changed[k] = next?.[k]
    }
    // أحدث نسخة من الخادم ثم نطبّق التغيير وحده فوقها
    const { data: cur } = await sb.from('ops_sheet_config').select('layout').eq('view_key', view.key).maybeSingle()
    const merged = { ...(cur?.layout || {}), ...changed }
    for (const k of Object.keys(merged)) if (merged[k] === undefined) delete merged[k]
    const { error } = await sb.from('ops_sheet_config').upsert({
      view_key: view.key, layout: merged, updated_by: user?.id || null, updated_at: new Date().toISOString(),
    }, { onConflict: 'view_key' })
    if (error) { toast && toast(T('فشل حفظ تخطيط الأعمدة', 'Failed to save column layout')); return }
    setLayout(merged)
  }, [sb, view, user, layout, toast, T])

  /* ── المحادثة: سؤال عن صف وقيمة محدَّدة ─────────────────────────────────
     المسؤولون عن العرض في layout.owners · المرجع لقطة (اسم الصف/العمود/القيمة)
     تُلتقط وقت السؤال فيبقى واضحاً حتى لو تغيّرت البيانات. */
  const chat = useOpsChat(sb, user, viewKey)
  // اللوحة تبقى مفتوحة بعد تحديث الصفحة (الرسائل نفسها محفوظة في قاعدة البيانات)
  const [chatOpen, setChatOpen] = useState(() => { try { return localStorage.getItem(CHAT_OPEN_LS) === '1' } catch { return false } })
  useEffect(() => { try { chatOpen ? localStorage.setItem(CHAT_OPEN_LS, '1') : localStorage.removeItem(CHAT_OPEN_LS) } catch { /* noop */ } }, [chatOpen])
  const [pendingRefs, setPendingRefs] = useState([])
  const owners = useMemo(() => (Array.isArray(layout.owners) ? layout.owners : []), [layout])
  const saveOwners = useCallback(async (ids) => { await persistLayout({ ...layout, owners: ids }) }, [layout, persistLayout])

  // اسم يُعرِّف الصف للبشر: أول قيمتين غير فارغتين من الأعمدة النصّية الظاهرة
  const rowLabelOf = useCallback((row) => {
    const parts = []
    for (const c of COLS) {
      if (c.kind === 'rownum' || c.kind === 'photo' || c.kind === 'bmk' || c.kind === 'file') continue
      const v = fmtDisp(row, c)
      if (v === '' || v == null) continue
      parts.push(String(v))
      if (parts.length === 2) break
    }
    return parts.join(' · ') || String(row._id)
  }, [COLS, fmtDisp])

  // مرجع واحد من صف/عمود: { type, row_key, col_key, row_label, col_label, value }
  const makeRef = useCallback((kind, row, col) => {
    if (kind === 'col') {
      if (!col) return null
      return { type: 'col', row_key: null, col_key: col.key, row_label: null, col_label: isAr ? col.ar : col.en, value: null }
    }
    if (!row) return null
    if (kind === 'row') return { type: 'row', row_key: row._id, col_key: null, row_label: rowLabelOf(row), col_label: null, value: null }
    if (!col) return null
    return { type: 'cell', row_key: row._id, col_key: col.key, row_label: rowLabelOf(row), col_label: isAr ? col.ar : col.en, value: String(fmtDisp(row, col) ?? '') }
  }, [rowLabelOf, fmtDisp, isAr])

  const addRefs = useCallback((list) => {
    setPendingRefs((p) => {
      const out = p.slice()
      for (const r of list.filter(Boolean)) {
        if (!out.some((x) => x.type === r.type && x.row_key === r.row_key && x.col_key === r.col_key)) out.push(r)
      }
      return out
    })
  }, [])

  // كليك يمين ← «اسأل عن هذه الخلية/هذا الصف/هذا العمود»
  const askAbout = useCallback((kind, row, col) => {
    const r = makeRef(kind, row, col)
    if (!r) return
    addRefs([r]); setChatOpen(true)
  }, [makeRef, addRefs])

  // الخلية المحدَّدة حالياً في الشبكة — تغذّي أزرار «＋ الخلية/الصف/العمود» باللوحة
  const selRow = viewRows[head.r]
  const selCol = COLS[head.c]
  const buildRefFromSelection = useCallback((kind) => makeRef(kind, selRow, selCol), [makeRef, selRow, selCol])
  const selectionInfo = useMemo(() => ({
    cell: selRow && selCol && selCol.kind !== 'rownum' ? `${isAr ? selCol.ar : selCol.en} — ${rowLabelOf(selRow)}` : null,
    row: selRow ? rowLabelOf(selRow) : null,
    col: selCol && selCol.kind !== 'rownum' ? (isAr ? selCol.ar : selCol.en) : null,
  }), [selRow, selCol, rowLabelOf, isAr])

  // القفز من بطاقة المرجع في المحادثة إلى موضعها في الجدول
  const jumpToRef = useCallback((ref) => {
    if (!ref) return
    const c = ref.col_key ? COLS.findIndex((x) => x.key === ref.col_key) : -1
    if (ref.type === 'col') {
      if (c < 0) { toast && toast(T('العمود مخفي حالياً', 'That column is hidden')); return }
      setAnchor({ r: head.r, c }); setHead({ r: head.r, c }); setSeq((s) => s + 1); return
    }
    const r = viewRows.findIndex((x) => x._id === ref.row_key)
    if (r < 0) { toast && toast(T('الصف غير ظاهر حالياً — امسح الفلاتر أو البحث', 'Row not visible — clear filters or search')); return }
    const cc = c >= 0 ? c : Math.max(1, firstEditable)
    setAnchor({ r, c: cc }); setHead({ r, c: cc }); setSeq((s) => s + 1)
  }, [viewRows, COLS, head.r, firstEditable, toast, T])

  // تنبيه فوري عند ذِكرك باسمك واللوحة مغلقة
  const lastMentionRef = useRef(null)
  useEffect(() => {
    if (chatOpen || !user?.id) return
    const mine = chat.msgs.filter((m) => (m.mentions || []).includes(user.id) && m.user_id !== user.id)
    const last = mine[mine.length - 1]
    if (!last) return
    if (lastMentionRef.current === null) { lastMentionRef.current = last.id; return }   // أول تحميل: لا تنبيه
    if (lastMentionRef.current === last.id) return
    lastMentionRef.current = last.id
    toast && toast(T('ذُكرت في محادثة هذا العرض', 'You were mentioned in this view’s chat'))
  }, [chat.msgs, chatOpen, user?.id, toast, T])
  useEffect(() => { lastMentionRef.current = null }, [viewKey])

  const addColumn = useCallback((label) => {
    const name = String(label || '').trim()
    if (!name) return
    const key = 'c_' + ((globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 8)))
    const custom = [...(layout.custom || []), { key, ar: name, w: 160, kind: 'text' }]
    const order = orderKeys.slice(); order.push(key)
    persistLayout({ ...layout, custom, order })
  }, [layout, orderKeys, persistLayout])

  const deleteColumn = useCallback((key) => {
    const isCustom = (layout.custom || []).some((c) => c.key === key)
    if (isCustom) {
      const custom = (layout.custom || []).filter((c) => c.key !== key)
      const order = (layout.order || orderKeys).filter((k) => k !== key)
      persistLayout({ ...layout, custom, order })
    } else {
      const hidden = Array.from(new Set([...(layout.hidden || []), key]))
      persistLayout({ ...layout, hidden })
    }
  }, [layout, orderKeys, persistLayout])

  const unhideColumn = useCallback((key) => {
    persistLayout({ ...layout, hidden: (layout.hidden || []).filter((k) => k !== key) })
  }, [layout, persistLayout])

  const renameColumn = useCallback((key, ar, en) => {
    if (!key) return
    const a = String(ar || '').trim(), e = String(en || '').trim()
    const labels = { ...(layout.labels || {}) }
    if (a || e) labels[key] = { ar: a || e, en: e || a }; else delete labels[key]   // فارغ = رجوع للأصل
    persistLayout({ ...layout, labels })
  }, [layout, persistLayout])

  // حذف نهائي لعمود مدمج/مخفي: يُنقل إلى removed فيختفي حتى من قائمة «أعمدة مخفية»
  const removeColumn = useCallback((key) => {
    const removed = Array.from(new Set([...(layout.removed || []), key]))
    const hidden = (layout.hidden || []).filter((k) => k !== key)
    const order = (layout.order || orderKeys).filter((k) => k !== key)
    const custom = (layout.custom || []).filter((c) => c.key !== key)
    persistLayout({ ...layout, removed, hidden, order, custom })
  }, [layout, orderKeys, persistLayout])

  const restoreRemovedColumns = useCallback(() => {
    persistLayout({ ...layout, removed: [] })
  }, [layout, persistLayout])

  // حذف صف نهائياً: اليدوي يُحذف فعلاً؛ المُزامَن يُضاف لقائمة removedRows فلا يظهر إطلاقاً
  const removeRowPermanent = useCallback((rowId) => {
    const row = allRows.find((r) => r._id === rowId); if (!row) return
    if (row._manual) { deleteRow(rowId); return }
    persistLayout({ ...layout, removedRows: Array.from(new Set([...(layout.removedRows || []), rowId])) })
  }, [allRows, deleteRow, layout, persistLayout])
  const restoreRemovedRows = useCallback(() => persistLayout({ ...layout, removedRows: [] }), [layout, persistLayout])

  /* إفلات رأس عمود مسحوب فوق رأس عمود هدف. */
  const reorderCols = useCallback((fromKey, toKey) => {
    if (!fromKey || !toKey || fromKey === toKey) return
    const list = orderKeys.slice()
    const from = list.indexOf(fromKey); let to = list.indexOf(toKey)
    if (from < 0 || to < 0) return
    list.splice(from, 1)
    to = list.indexOf(toKey)
    list.splice(to + (from < to ? 1 : 0), 0, fromKey)
    persistLayout({ ...layout, order: list })
  }, [orderKeys, layout, persistLayout])

  const hiddenColList = useMemo(() => { const rm = new Set(layout.removed || []); return (layout.hidden || []).filter((k) => !rm.has(k)).map((k) => colDefs.get(k)).filter(Boolean) }, [layout, colDefs])
  const removedCount = (layout.removed || []).length

  const setFrozen = useCallback((n) => persistLayout({ ...layout, frozenCount: Math.max(0, n) }), [layout, persistLayout])
  const toggleLock = useCallback((key) => { const s = new Set(layout.locked || []); s.has(key) ? s.delete(key) : s.add(key); persistLayout({ ...layout, locked: [...s] }) }, [layout, persistLayout])

  // فرز: نقر رأس العمود يدوّر بلا فرز → تصاعدي → تنازلي → بلا
  const cycleSort = useCallback((key) => {
    const cur = layout.sort
    let next
    if (!cur || cur.key !== key) next = { key, dir: 'asc' }
    else if (cur.dir === 'asc') next = { key, dir: 'desc' }
    else next = null
    persistLayout({ ...layout, sort: next })
  }, [layout, persistLayout])
  const setColFilter = useCallback((key, f) => {
    const filters = { ...(layout.filters || {}) }
    const conds = (f?.conds || []).filter((c) => c && c.op && (!opNeedsValue(c.op) || c.op === 'preset' || String(c.a ?? '') !== ''))
    const hasVals = Array.isArray(f?.values) && f.values.length
    const hasText = f?.text && String(f.text).trim() !== ''
    if (f && (hasVals || conds.length || hasText)) filters[key] = { values: hasVals ? f.values : null, conds, join: f.join === 'or' ? 'or' : 'and', text: hasText ? f.text : '' }
    else delete filters[key]
    persistLayout({ ...layout, filters })
  }, [layout, persistLayout])
  const setAgg = useCallback((key, kind) => {
    const agg = { ...(layout.agg || {}) }
    if (kind) agg[key] = kind; else delete agg[key]
    persistLayout({ ...layout, agg, showTotals: true })
  }, [layout, persistLayout])
  const toggleWrap = useCallback((key) => {
    const wrap = { ...(layout.wrap || {}) }
    if (wrap[key]) delete wrap[key]; else wrap[key] = true
    persistLayout({ ...layout, wrap })
  }, [layout, persistLayout])
  // ضبط عرض العمود تلقائياً حسب أطول محتوى معروض (نقر مزدوج على حدّ العمود)
  const autoFitCol = useCallback((col) => {
    let maxLen = String((isAr ? col.ar : col.en) || '').length + 3
    for (const row of viewRows) { const s = String(fmtDisp(row, col) ?? ''); if (s.length > maxLen) maxLen = s.length }
    const w = Math.max(70, Math.min(600, Math.round(maxLen * 8.4) + 26))
    persistLayout({ ...layout, widths: { ...(layout.widths || {}), [col.key]: w } })
  }, [viewRows, fmtDisp, isAr, layout, persistLayout])

  const saveCf = useCallback((key, draft) => {
    const cf = { ...(layout.cf || {}) }
    const rules = (draft?.rules || []).filter((r) => String(r.value).trim() !== '')
    if (draft?.dup || rules.length) cf[key] = { dup: draft.dup || null, rules }
    else delete cf[key]
    persistLayout({ ...layout, cf })
  }, [layout, persistLayout])

  // تنسيق العمود: مظهر النص + النوع + القائمة + تنسيق الأرقام (كلها في نافذة واحدة)
  const saveStyle = useCallback((key, draft) => {
    const styles = { ...(layout.styles || {}) }
    const clean = {}
    if (draft.size) clean.size = draft.size
    if (draft.weight) clean.weight = draft.weight
    if (draft.color && draft.color !== 'var(--tx)') clean.color = draft.color
    if (Object.keys(clean).length) styles[key] = clean; else delete styles[key]

    const colType = { ...(layout.colType || {}) }
    if (draft.type) colType[key] = draft.type; else delete colType[key]

    const colOptions = { ...(layout.colOptions || {}) }
    const opts = String(draft.options || '').split(/[\n,،]/).map((s) => s.trim()).filter(Boolean)
    if (draft.type === 'select' && opts.length) colOptions[key] = opts; else delete colOptions[key]

    const numFmt = { ...(layout.numFmt || {}) }
    if (draft.numFmt) numFmt[key] = draft.numFmt; else delete numFmt[key]

    const formula = { ...(layout.formula || {}) }
    if (draft.formula && String(draft.formula).trim()) formula[key] = String(draft.formula).trim(); else delete formula[key]

    persistLayout({ ...layout, styles, colType, colOptions, numFmt, formula })
  }, [layout, persistLayout])
  const styleOf = useCallback((key) => (layout.styles || {})[key] || null, [layout])

  // حماية عمود بكلمة سر (إظهار/إخفاء)
  const protectedMap = useMemo(() => layout.protected || {}, [layout])
  const isProtected = useCallback((key) => !!protectedMap[key] && !unlockedCols.has(key), [protectedMap, unlockedCols])
  const setProtect = useCallback((key, pw) => {
    if (!pw) return
    persistLayout({ ...layout, protected: { ...(layout.protected || {}), [key]: strHash(pw) } })
    setUnlockedCols((s) => new Set(s).add(key))   // من يضع السر يراه فوراً
  }, [layout, persistLayout])
  const tryUnlock = useCallback((key, pw) => {
    if (protectedMap[key] && strHash(pw) === protectedMap[key]) { setUnlockedCols((s) => new Set(s).add(key)); return true }
    return false
  }, [protectedMap])
  const removeProtect = useCallback((key) => {
    const p = { ...(layout.protected || {}) }; delete p[key]
    persistLayout({ ...layout, protected: p })
  }, [layout, persistLayout])

  /* ── سحب عرض العمود + ارتفاع الصف + إنهاء سحب التعبئة ──────────────────────
     العروض والارتفاع يُحفظان في layout (widths + rowHeight) عند إفلات الماوس. */
  const [widthMap, setWidthMap] = useState({})     // تعديل حيّ أثناء السحب
  const resizeRef = useRef(null)
  const rowResizeRef = useRef(null)
  const widths = useMemo(() => COLS.map((c) => widthMap[c.key] ?? layout.widths?.[c.key] ?? c.w), [COLS, widthMap, layout])
  const totalW = useMemo(() => widths.reduce((a, b) => a + b, 0), [widths])
  const tmpl = useMemo(() => widths.map((w, i) => (i === widths.length - 1 ? `minmax(${w}px,1fr)` : `${w}px`)).join(' '), [widths])
  // إزاحات تراكمية لتثبيت الأعمدة (sticky) — الجهة تتبع الاتجاه
  const offsets = useMemo(() => { const o = []; let x = 0; for (const w of widths) { o.push(x); x += w } return o }, [widths])
  const stickSide = isAr ? 'right' : 'left'
  const FROZEN_BG = 'var(--bg)'   // خلفية معتمة خفيفة مميّزة للأعمدة المثبَّتة — بدل الظل، تمنع ظهور المحتوى المُمرَّر خلفها
  // نمط تثبيت (بلا box-shadow حتى لا يطمس تسطير الرأس أو إطار الخلية النشطة)
  const frozenStyle = (i, opaqueBg, z) => (i < frozenCount ? { position: 'sticky', [stickSide]: offsets[i], zIndex: z, background: opaqueBg } : null)

  // مرايا للحالة الحالية تُستعمل داخل مستمع mouseup (يُنشأ مرة ولا يرى الحالة الطازجة)
  const layoutRef = useRef(layout); useEffect(() => { layoutRef.current = layout }, [layout])
  const widthMapRef = useRef(widthMap); useEffect(() => { widthMapRef.current = widthMap }, [widthMap])
  const rowHRef = useRef(rowH); useEffect(() => { rowHRef.current = rowH }, [rowH])

  useEffect(() => {
    const onMove = (ev) => {
      const rz = resizeRef.current
      if (rz) { const dx = (isAr ? -1 : 1) * (ev.clientX - rz.x0); setWidthMap((w) => ({ ...w, [rz.key]: Math.max(70, rz.w0 + dx) })); return }
      const rr = rowResizeRef.current
      if (rr) { const dy = ev.clientY - rr.y0; setRowH(Math.max(28, Math.min(140, rr.h0 + dy))) }
    }
    const onUp = () => {
      const wasCol = resizeRef.current, wasRow = rowResizeRef.current
      resizeRef.current = null; rowResizeRef.current = null; dragRef.current = false
      if (wasCol || wasRow) {
        const base = layoutRef.current || {}
        const next = { ...base }
        if (wasCol) next.widths = { ...(base.widths || {}), ...widthMapRef.current }
        if (wasRow) next.rowHeight = rowHRef.current
        persistLayout(next)
      }
      if (fillRef.current != null) { const to = fillRef.current; fillRef.current = null; setFillTo(null); applyFillDrag(to) }
    }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [isAr, applyFillDrag, persistLayout])

  useEffect(() => {
    if (!ctx && !hdrCtx) return
    const close = (e) => { if (e?.target?.closest?.('.ox-ctx')) return; setCtx(null); setHdrCtx(null) }  // لا تُغلق عند التمرير/النقر داخل القائمة نفسها
    window.addEventListener('click', close); window.addEventListener('scroll', close, true)
    return () => { window.removeEventListener('click', close); window.removeEventListener('scroll', close, true) }
  }, [ctx, hdrCtx])

  /* ═══ العرض ═══ */
  const activeCol = COLS[head.c], activeRow = viewRows[head.r]
  // حدود مجموعات الدمج تُحسب مرة لكل مجموعة صفوف (بدل مسح أمامي/خلفي لكل صف في كل رسم)
  const mergeGroups = useMemo(() => {
    if (!view.mergeKey || !view.mergeCols) return null
    const n = viewRows.length
    const starts = new Int32Array(n), ends = new Int32Array(n)
    let i = 0
    while (i < n) {
      const mk = view.mergeKey(viewRows[i])
      let j = i
      if (mk != null) while (j + 1 < n && view.mergeKey(viewRows[j + 1]) === mk) j++
      for (let k = i; k <= j; k++) { starts[k] = i; ends[k] = j }
      i = j + 1
    }
    return { starts, ends }
  }, [viewRows, view])
  // نافذة الرسم الافتراضي: مدى الصفوف المرئية + هامش، مع ضمّ رأس مجموعة الدمج
  const vwin = useMemo(() => {
    const total = viewRows.length
    const h = rowH || ROW_H
    // هامش سخيّ (شاشة ونصف فوق وتحت) كي تكون الصفوف مرسومة سلفاً قبل وصولك إليها
    const over = Math.max(600, vport.height * 1.5)
    let s = Math.max(0, Math.floor((vport.start - over) / h))
    let e = Math.min(total, Math.ceil((vport.start + vport.height + over) / h))
    // ضمّ الصف النشط دائماً (قد يقفز التنقّل بالكيبورد خارج النافذة)
    if (head.r < s) s = Math.max(0, head.r - 2)
    if (head.r >= e) e = Math.min(total, head.r + 3)
    // ضمّ رأس مجموعة الدمج كي تظهر خلية المنشأة المدمجة
    if (mergeGroups && s > 0 && s < total) s = mergeGroups.starts[s]
    return { s, e }
  }, [viewRows, vport, rowH, head.r, mergeGroups])
  const fbEditable = isEditable(activeRow, activeCol)
  const selCss = { height: 40, paddingInlineStart: 38, paddingInlineEnd: 14, borderRadius: 10, background: 'var(--search-bg)', border: '1px solid var(--accent-bd)', color: 'var(--tx)', fontSize: 13.5, fontFamily: F, fontWeight: 600, cursor: 'pointer', outline: 'none', minWidth: 200, appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: 'none' }
  const ctxRow = ctx ? allRows.find((r) => r._id === ctx.rowId) : null
  const hdrCtxCol = hdrCtx ? colDefs.get(hdrCtx.colKey) : null
  const selHiddenCount = useMemo(() => [...selRows].reduce((a, id) => a + (allRows.find((r) => r._id === id)?._hidden ? 1 : 0), 0), [selRows, allRows])
  const ctxMulti = ctx && selRows.size > 1 && selRows.has(ctx.rowId)
  // يضبط موضع قائمة كليك اليمين لتبقى كاملة داخل الشاشة (وتتمرّر لو طالت)
  const ctxMenuRef = useCallback((el) => {
    if (!el) return
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800
    const r = el.getBoundingClientRect()
    let top = r.top, left = r.left
    if (r.bottom > vh - 8) top = vh - 8 - r.height
    if (top < 8) top = 8
    if (r.right > vw - 8) left = vw - 8 - r.width
    if (left < 8) left = 8
    el.style.top = top + 'px'
    el.style.left = left + 'px'
  }, [])

  // ── صف الإجماليات (تجميع كل عمود مُفعَّل على كامل الصفوف المُصفّاة) ──
  const hasTotals = useMemo(() => COLS.some((c) => aggMap[c.key]), [COLS, aggMap])
  const totalsVals = useMemo(() => {
    if (!hasTotals) return {}
    const out = {}
    for (const col of COLS) { const kind = aggMap[col.key]; if (!kind) continue; out[col.key] = computeAgg(filtered, col, valOf, kind) }
    return out
  }, [hasTotals, COLS, aggMap, filtered, valOf])

  // ── شريط إحصاء التحديد (كشريط حالة إكسل) ──
  const selStats = useMemo(() => {
    let count = 0, filled = 0; const nums = []
    const doCell = (row, col) => {
      if (!row || !col || col.kind === 'rownum') return
      count++
      const d = valOf(row, col)
      if (d !== '' && d != null) { filled++; const n = cfNum(String(d)); if (n !== null) nums.push(n) }
    }
    if (selRows.size) { for (const row of viewRows) { if (!selRows.has(row._id)) continue; for (const col of COLS) doCell(row, col) } }
    else { for (let r = range.r1; r <= range.r2; r++) { const row = viewRows[r]; for (let c = range.c1; c <= range.c2; c++) doCell(row, COLS[c]) } }
    if (count <= 1) return null
    const sum = nums.reduce((a, b) => a + b, 0)
    return { count, filled, numCount: nums.length, sum, avg: nums.length ? sum / nums.length : null, min: nums.length ? Math.min(...nums) : null, max: nums.length ? Math.max(...nums) : null }
  }, [selRows, viewRows, COLS, range, valOf])

  // ── تصدير CSV (يفتح مباشرة في إكسل — بادئة BOM للعربية) ──
  const exportCsv = useCallback(() => {
    const cols = COLS.filter((c) => c.kind !== 'rownum')
    const esc = (s) => { const v = String(s ?? ''); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v }
    const lines = [cols.map((c) => esc(isAr ? c.ar : c.en)).join(',')]
    for (const row of filtered) lines.push(cols.map((c) => esc(fmtDisp(row, c))).join(','))
    const csv = '﻿' + lines.join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `${view.key}_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast && toast(T(`صُدِّر ${enNum(filtered.length)} صف`, `Exported ${enNum(filtered.length)} rows`))
  }, [COLS, filtered, fmtDisp, isAr, view, toast, T])

  // ── بحث واستبدال (كإكسل) ──
  const replaceCols = useMemo(() => {
    const dataCols = COLS.filter((c) => c.kind !== 'rownum')
    if (findState.colOnly) { const ac = COLS[head.c]; return ac && ac.kind !== 'rownum' ? [ac] : dataCols }
    return dataCols
  }, [COLS, findState.colOnly, head.c])
  const findMatches = useMemo(() => {
    const f = findState.find; if (!f) return 0
    const re = new RegExp(escapeRegex(f), findState.matchCase ? 'g' : 'gi')
    let n = 0
    for (const row of filtered) for (const col of replaceCols) { const v = String(dispOf(row, col) ?? ''); if (!v) continue; const m = v.match(re); if (m) n += m.length }
    return n
  }, [findState.find, findState.matchCase, filtered, replaceCols, dispOf])
  const doReplaceAll = useCallback(() => {
    const f = findState.find; if (!f) return
    const re = new RegExp(escapeRegex(f), findState.matchCase ? 'g' : 'gi')
    const cells = []
    for (const row of filtered) for (const col of replaceCols) {
      if (!isEditable(row, col)) continue
      const cur = String(dispOf(row, col) ?? ''); if (!cur) continue
      const next = cur.replace(re, findState.replace)
      if (next !== cur) cells.push({ row, col, text: next })
    }
    const { ok } = writeCells(cells)
    toast && toast(ok ? T(`استُبدل في ${enNum(ok)} خلية`, `Replaced in ${enNum(ok)} cells`) : T('لا مطابقات قابلة للتعديل', 'No editable matches'))
  }, [findState, filtered, replaceCols, isEditable, dispOf, writeCells, toast, T])

  return (
    <div style={{ fontFamily: F }}>
      <style>{`
        .ox-hdrwrap{overflow:hidden;border:1px solid var(--bd);border-bottom:none;border-radius:0;background:var(--hd)}
        .ox-scroll{overflow-x:auto;overflow-y:hidden;border:1px solid var(--bd);border-top:none;
          border-radius:0;background:var(--card-grad2);outline:none}
        .ox-scroll::-webkit-scrollbar{height:10px}
        .ox-scroll::-webkit-scrollbar-thumb{background:rgba(176,125,0,.45);border-radius:5px}
        .ox-scroll{scrollbar-width:thin;scrollbar-color:rgba(176,125,0,.45) transparent}
        .ox-hdr-cell{position:relative;height:${COL_H}px;display:flex;align-items:center;justify-content:center;
          padding:0 8px;font-size:12.5px;font-weight:600;color:var(--hdtx);background:var(--hd);
          border-inline-end:1px solid rgba(176,125,0,.3);box-shadow:inset 0 -2px 0 rgba(176,125,0,.55);
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-sizing:border-box;user-select:none}
        .ox-grip{position:absolute;inset-inline-end:-3px;top:0;bottom:0;width:6px;cursor:col-resize;z-index:8}
        .ox-rowgrip{position:absolute;left:0;right:0;bottom:-3px;height:8px;cursor:row-resize;z-index:9}
        .ox-rowgrip:hover{background:rgba(176,125,0,.5)}
        .ox-row:hover .ox-cell{background-color:rgba(176,125,0,.05)}
        .ox-scrolly::-webkit-scrollbar{width:9px}
        .ox-scrolly::-webkit-scrollbar-thumb{background:rgba(176,125,0,.45);border-radius:5px}
        .ox-scrolly::-webkit-scrollbar-track{background:transparent}
        .ox-scrolly{scrollbar-width:thin;scrollbar-color:rgba(176,125,0,.45) transparent}
        .ox-in{width:100%;height:100%;background:transparent;border:none;outline:none;font-family:${F};font-size:12.5px;padding:0;box-sizing:border-box}
        .ox-btn{height:38px;padding:0 14px;border-radius:9px;border:1px solid transparent;cursor:pointer;
          font-family:${F};font-size:12.5px;font-weight:600;display:inline-flex;align-items:center;gap:7px;
          background:var(--search-bg);color:var(--tx2);transition:.15s;box-sizing:border-box;flex-shrink:0;white-space:nowrap}
        .ox-btn:hover:not(:disabled){background:var(--accent-soft);color:var(--accent);border-color:var(--accent-bd)}
        .ox-btn:disabled{opacity:.4;cursor:not-allowed}
        .ox-btn.pri{background:${C.gold};color:#000;border-color:${C.gold}}
        .ox-btn.pri:hover:not(:disabled){filter:brightness(1.12);background:${C.gold};color:#000}
        .ox-pg{width:32px;height:32px;border-radius:8px;background:var(--search-bg);border:none;color:${C.gold2};
          cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
        .ox-pg:hover:not(:disabled){background:${C.gold};color:#000}
        .ox-pg:disabled{color:var(--tx4);cursor:not-allowed;opacity:.5}
        .ox-fh{position:absolute;width:9px;height:9px;background:${C.gold};border:1px solid var(--bg);
          cursor:crosshair;z-index:5;bottom:-5px;inset-inline-start:-5px}
        .ox-ctx{position:fixed;z-index:60;min-width:190px;max-width:280px;background:var(--card-grad2,var(--card));border:1px solid var(--bd);
          border-radius:10px;box-shadow:0 12px 34px rgba(0,0,0,.34);padding:6px;font-family:${F};
          max-height:calc(100vh - 16px);overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:rgba(176,125,0,.45) transparent}
        .ox-ctx::-webkit-scrollbar{width:8px}
        .ox-ctx::-webkit-scrollbar-thumb{background:rgba(176,125,0,.45);border-radius:4px}
        .ox-ctx button{width:100%;text-align:start;background:transparent;border:none;cursor:pointer;color:var(--tx2);
          font-family:${F};font-size:12.5px;font-weight:600;padding:8px 10px;border-radius:7px;display:flex;align-items:center;gap:9px}
        .ox-ctx button:hover:not(:disabled){background:var(--accent-soft);color:var(--accent)}
        .ox-ctx button:disabled{opacity:.4;cursor:not-allowed}
        .ox-ctx .del:hover{background:rgba(232,114,101,.12);color:${C.red}}
        .ox-ov{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px}
        .ox-modal{width:min(440px,96vw);background:var(--card-grad2,var(--card));border:1px solid var(--bd);border-radius:14px;
          box-shadow:0 24px 60px rgba(0,0,0,.4);padding:20px;font-family:${F}}
        .ox-fld{width:100%;height:40px;border-radius:9px;padding:0 12px;box-sizing:border-box;background:var(--inputBg);
          border:1px solid var(--bd);color:var(--tx);font-size:13px;font-family:${F};outline:none}
        .ox-fld:focus{border-color:${C.gold2}}
      `}</style>

      {/* ── العنوان + اختيار العرض ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 230, flex: '0 0 auto' }}>
          <Dropdown value={viewKey} onChange={(k) => setViewKey(k)} options={allViews} searchable
            getKey={(o) => o.key}
            getLabel={(o) => { const n = effName(o); return (isAr ? n.ar : n.en) || o.key }}
            getSub={(o) => o.custom ? T('جدول مخصّص', 'Custom sheet') : T('مركز المزامنة', 'Sync center')} />
        </div>
        {!view.custom && <button className="ox-btn" onClick={refresh} disabled={loading} title={T('جلب أحدث البيانات من مركز المزامنة — إدخالات الموظفين المحفوظة لا تتأثّر', 'Pull latest data from the Sync Center — saved staff entries are never affected')} style={{ height: 40, background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent-bd)' }}>{loading ? '⟳ …' : '⟳'} {T('تحديث من المزامنة', 'Refresh from sync')}</button>}
        {canEdit && <button className="ox-btn" onClick={() => { setSheetName({ ar: '', en: '' }); setSheetModal(true) }} title={T('أنشئ جدولاً مخصّصاً من الصفر', 'Create a blank custom sheet')} style={{ height: 40 }}>＋ {T('جدول جديد', 'New sheet')}</button>}
        {canEdit && <button className="ox-btn" onClick={() => { const n = effName(view); setSheetName({ ar: n.ar, en: n.en === n.ar ? '' : n.en }); setSheetModal('rename') }} title={T('غيّر اسم هذا العرض', 'Rename this view')} style={{ height: 40 }}>✎ {T('تسمية العرض', 'Rename view')}</button>}
        {canEdit && view.custom && <button className="ox-btn" onClick={() => { if (typeof window !== 'undefined' && window.confirm(T('حذف هذا الجدول وكل صفوفه نهائياً؟', 'Delete this sheet and all its rows?'))) deleteSheet(viewKey) }} style={{ height: 40, color: C.red, borderColor: 'rgba(232,114,101,.4)' }}>🗑 {T('حذف الجدول', 'Delete sheet')}</button>}
        <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600 }}>{isAr ? view.hintAr : view.hintEn}</span>
        <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {dirtyCount > 0 && (
            <span style={{ fontSize: 11.5, fontWeight: 600, color: C.gold2, background: 'var(--accent-soft)', border: '1px solid var(--accent-bd)', padding: '5px 10px', borderRadius: 20 }}>
              {T(`${enNum(dirtyCount)} غير محفوظ`, `${enNum(dirtyCount)} unsaved`)}
            </span>
          )}
          {sortCfg && (
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--tx3)', background: 'var(--search-bg)', padding: '5px 10px', borderRadius: 20 }}>
              {sortCfg.dir === 'desc' ? '▼' : '▲'} {isAr ? (colDefs.get(sortCfg.key)?.ar || '') : (colDefs.get(sortCfg.key)?.en || '')}
            </span>
          )}
          {activeFilterKeys.length > 0 && (
            <span style={{ fontSize: 11.5, fontWeight: 600, color: C.blue, background: 'rgba(93,173,226,.10)', padding: '5px 10px', borderRadius: 20 }}>
              {T(`${enNum(activeFilterKeys.length)} فلتر`, `${enNum(activeFilterKeys.length)} filters`)}
            </span>
          )}
          <span style={{ fontSize: 12, fontFamily: MONO, direction: 'ltr', color: 'var(--tx2)', fontWeight: 600, background: 'var(--search-bg)', padding: '5px 11px', borderRadius: 20 }}>
            {enNum(filtered.length)} {T('صف', 'rows')}
          </span>
        </div>
      </div>

      {/* ── الأدوات ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px', position: 'relative', minWidth: 200 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            style={{ position: 'absolute', top: '50%', insetInlineStart: 13, transform: 'translateY(-50%)', color: 'var(--tx4)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={T('ابحث في كل الأعمدة…', 'Search all columns…')}
            style={{ width: '100%', height: 38, padding: '0 36px 0 12px', borderRadius: 9, background: 'var(--search-bg)', border: '1px solid transparent', color: 'var(--tx)', fontSize: 12.5, fontFamily: F, boxSizing: 'border-box', outline: 'none' }} />
        </div>
        {canEdit && <button className="ox-btn" onClick={() => { setAddForm({}); setAddOpen(true) }} disabled={busy}>＋ {T('صف', 'Row')}</button>}
        {canEdit && <button className="ox-btn" onClick={() => { setColName(''); setColModal(true) }} disabled={busy}>＋ {T('عمود', 'Column')}</button>}
        <button className="ox-btn" onClick={exportCsv} title={T('تصدير إلى CSV/إكسل', 'Export to CSV/Excel')}>⭳ {T('تصدير', 'Export')}</button>
        <button className="ox-btn" onClick={() => setChatOpen(true)}
          title={T('محادثة هذا العرض — اسأل المسؤول عن أي صف أو قيمة', 'Chat for this view — ask the owner about any row or value')}
          style={{ position: 'relative', ...(chatOpen ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent-bd)' } : {}) }}>
          💬 {T('المحادثة', 'Chat')}
          {chat.unread > 0 && (
            <span style={{ minWidth: 17, height: 17, padding: '0 4px', borderRadius: 9, background: C.red, color: '#fff',
              fontSize: 10, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO }}>
              {chat.unread > 99 ? '99+' : enNum(chat.unread)}
            </span>
          )}
        </button>
        {canEdit && <button className="ox-btn" onClick={() => setFindModal(true)} title={T('بحث واستبدال (Ctrl+H)', 'Find & replace (Ctrl+H)')}>🔎 {T('بحث/استبدال', 'Find/Replace')}</button>}
        {(activeFilterKeys.length > 0 || sortCfg) && (
          <button className="ox-btn" onClick={() => persistLayout({ ...layout, filters: {}, sort: null })} style={{ color: C.blue, borderColor: 'rgba(93,173,226,.4)' }}>
            ✕ {T(`مسح الفلاتر/الفرز${activeFilterKeys.length ? ` (${activeFilterKeys.length})` : ''}`, `Clear filters/sort${activeFilterKeys.length ? ` (${activeFilterKeys.length})` : ''}`)}
          </button>
        )}
        {(hiddenColList.length > 0 || removedCount > 0) && (
          <button className="ox-btn" onClick={(e) => { e.stopPropagation(); setHdrCtx({ x: e.clientX, y: e.clientY + 8, colKey: '__hidden__' }) }}>
            {T(`أعمدة مخفية (${hiddenColList.length})`, `Hidden cols (${hiddenColList.length})`)}
          </button>
        )}
        {hiddenCount > 0 && (
          <button className="ox-btn" onClick={() => setShowHidden((v) => !v)} style={showHidden ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent-bd)' } : undefined}>
            {showHidden ? T('إخفاء المحذوفة', 'Hide removed') : T(`المحذوفة (${hiddenCount})`, `Removed (${hiddenCount})`)}
          </button>
        )}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            title={T(`${enNum(filtered.length)} صف موزّعة على ${totalPages} صفحات (${enNum(PAGE_ROWS)} لكل صفحة)`,
              `${enNum(filtered.length)} rows across ${totalPages} pages (${enNum(PAGE_ROWS)} per page)`)}>
            <button className="ox-pg" disabled={pageSafe <= 0} onClick={() => setPage(0)} title={T('الأولى', 'First')}>{isAr ? '»' : '«'}</button>
            <button className="ox-pg" disabled={pageSafe <= 0} onClick={() => setPage(pageSafe - 1)}>{isAr ? '›' : '‹'}</button>
            <span style={{ fontSize: 12, fontFamily: MONO, direction: 'ltr', color: 'var(--tx3)', minWidth: 108, textAlign: 'center' }}>
              {pageSafe + 1}/{totalPages} · {enNum(firstNo)}–{enNum(firstNo + viewRows.length - 1)}
            </span>
            <button className="ox-pg" disabled={pageSafe >= totalPages - 1} onClick={() => setPage(pageSafe + 1)}>{isAr ? '‹' : '›'}</button>
            <button className="ox-pg" disabled={pageSafe >= totalPages - 1} onClick={() => setPage(totalPages - 1)} title={T('الأخيرة', 'Last')}>{isAr ? '«' : '»'}</button>
          </div>
        )}
        <span style={{ flex: '1 1 8px' }} />
        {canEdit && <button className="ox-btn" onClick={undo} disabled={saving} title={T('تراجع خطوة (Ctrl+Z)', 'Undo (Ctrl+Z)')} style={{ width: 40, justifyContent: 'center' }}>↶</button>}
        {canEdit && <button className="ox-btn" onClick={redo} disabled={saving} title={T('إعادة خطوة (Ctrl+Y)', 'Redo (Ctrl+Y)')} style={{ width: 40, justifyContent: 'center' }}>↷</button>}
        <button className="ox-btn" onClick={discard} disabled={!dirtyCount || saving}>{T('تراجع الكل', 'Discard')}</button>
        <button className="ox-btn pri" onClick={save} disabled={!dirtyCount || saving}>
          {saving ? T('جارٍ الحفظ…', 'Saving…') : T(`حفظ${dirtyCount ? ` (${dirtyCount})` : ''}`, `Save${dirtyCount ? ` (${dirtyCount})` : ''}`)}
        </button>
      </div>

      {!canEdit && (
        <div style={{ marginBottom: 10, padding: '9px 13px', borderRadius: 9, background: 'rgba(232,114,101,.08)', border: '1px solid rgba(232,114,101,.28)', color: C.red, fontSize: 12.5, fontWeight: 600 }}>
          {T('ليس لديك صلاحية التعديل — الجدول للعرض فقط.', 'You lack edit permission — this grid is read-only.')}
        </div>
      )}

      {canEdit && selRows.size > 0 && (
        <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 9, background: 'var(--accent-soft)', border: '1px solid var(--accent-bd)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent)' }}>{T(`محدَّد: ${selRows.size} صف`, `Selected: ${selRows.size} rows`)}</span>
          {selHiddenCount > 0 && <button className="ox-btn" onClick={restoreSelected} disabled={busy} style={{ height: 32 }}>↺ {T('استعادة', 'Restore')}</button>}
          <button className="ox-btn" onClick={deleteSelected} disabled={busy} style={{ height: 32, color: C.red, borderColor: 'rgba(232,114,101,.4)' }}>🗑 {T('حذف المحدد', 'Delete selected')}</button>
          <button className="ox-btn" onClick={() => setSelRows(new Set())} style={{ height: 32 }}>{T('إلغاء التحديد', 'Clear')}</button>
          <span style={{ marginInlineStart: 'auto', fontSize: 11, color: 'var(--tx4)' }}>{T('Ctrl+نقر يضيف · Shift+نقر نطاق · اسحب أرقام الصفوف لنقلها معاً', 'Ctrl+click adds · Shift+click range · drag row numbers to move together')}</span>
        </div>
      )}

      {/* ── شريط الصيغة ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
        <span style={{ fontSize: 11.5, fontFamily: MONO, fontWeight: 600, color: C.gold2, background: 'var(--accent-soft)',
          border: '1px solid var(--accent-bd)', padding: '6px 11px', borderRadius: 7, whiteSpace: 'nowrap', flexShrink: 0 }}>
          R{activeRow ? firstNo + head.r : 0}
          <span style={{ fontFamily: F, marginInlineStart: 7, opacity: .85 }}>{activeCol ? (isAr ? activeCol.ar : activeCol.en) : ''}</span>
        </span>
        <input key={`fb-${viewKey}-${pageSafe}-${head.r}-${head.c}-${seq}`} ref={fbRef}
          defaultValue={dispOf(activeRow, activeCol)}
          readOnly={!fbEditable}
          placeholder={fbEditable ? T('اكتب هنا أو الصق…', 'Type here or paste…') : T('عمود للقراءة فقط', 'Read-only column')}
          onInput={() => { if (fbEditable && !editRef.current) editRef.current = { r: head.r, c: head.c, src: 'fb' } }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commitEdit([1, 0]); scrollRef.current?.focus() }
            else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); scrollRef.current?.focus() }
          }}
          onBlur={() => { if (editRef.current?.src === 'fb') commitEdit(null) }}
          style={{ flex: 1, height: 34, borderRadius: 8, padding: '0 12px', boxSizing: 'border-box',
            background: fbEditable ? 'var(--inputBg)' : 'var(--search-bg)', border: '1px solid transparent',
            color: fbEditable ? C.gold2 : 'var(--tx4)', fontSize: 13, fontWeight: 600, fontFamily: F, outline: 'none',
            cursor: fbEditable ? 'text' : 'default' }} />
      </div>

      {/* ── شريط إحصاء التحديد (كشريط حالة إكسل) ── */}
      {selStats && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', margin: '-2px 0 10px', padding: '6px 13px', borderRadius: 8, background: 'var(--search-bg)', fontSize: 12, fontWeight: 600, color: 'var(--tx3)' }}>
          <span>{T('عدد الخلايا', 'Count')}: <b style={{ color: C.gold2, fontFamily: MONO }}>{enNum(selStats.count)}</b></span>
          <span>{T('المعبّأ', 'Filled')}: <b style={{ color: C.gold2, fontFamily: MONO }}>{enNum(selStats.filled)}</b></span>
          {selStats.numCount > 0 && (
            <>
              <span>{T('المجموع', 'Sum')}: <b style={{ color: C.gold2, fontFamily: MONO }}>{selStats.sum.toLocaleString('en-US', { maximumFractionDigits: 2 })}</b></span>
              <span>{T('المتوسط', 'Avg')}: <b style={{ color: C.gold2, fontFamily: MONO }}>{selStats.avg.toLocaleString('en-US', { maximumFractionDigits: 2 })}</b></span>
              <span>{T('الأدنى', 'Min')}: <b style={{ color: C.gold2, fontFamily: MONO }}>{selStats.min.toLocaleString('en-US', { maximumFractionDigits: 2 })}</b></span>
              <span>{T('الأعلى', 'Max')}: <b style={{ color: C.gold2, fontFamily: MONO }}>{selStats.max.toLocaleString('en-US', { maximumFractionDigits: 2 })}</b></span>
            </>
          )}
        </div>
      )}

      {loading ? <GridSkeleton /> : loadErr ? (
        <div style={{ padding: 20, borderRadius: 12, border: '1px solid rgba(232,114,101,.3)', background: 'rgba(232,114,101,.07)', color: C.red, fontSize: 13 }}>
          {T('تعذّر التحميل: ', 'Load failed: ')}{loadErr}
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <div ref={hdrRef} className="ox-hdrwrap" style={{ position: 'sticky', top: 0, zIndex: 6 }}>
            <div style={{ display: 'grid', gridTemplateColumns: tmpl, minWidth: totalW }}>
              {COLS.map((col, i) => {
                const canDrag = canEdit && col.kind !== 'rownum'
                if (col.kind === 'rownum') {
                  // فحص الحجم أولاً: يتفادى مسح كل الصفوف في كل رسم أثناء التمرير
                  const allSel = viewRows.length > 0 && selRows.size >= viewRows.length && viewRows.every((rr) => selRows.has(rr._id))
                  return (
                    <div key={col.key} className="ox-hdr-cell" title={T('نقر: تحديد الكل · اسحب الأسفل: ارتفاع الصفوف', 'Click: select all · drag bottom: row height')}
                      onClick={() => { if (!canEdit) return; setSelRows(allSel ? new Set() : new Set(viewRows.map((rr) => rr._id))); selAnchorRef.current = viewRows[0]?._id || null }}
                      style={{ cursor: canEdit ? 'pointer' : 'default', color: allSel ? C.gold2 : undefined, ...(frozenStyle(i, 'var(--hd)', 7) || {}) }}>
                      {allSel ? '✓' : (isAr ? col.ar : col.en)}
                      {canEdit && <span className="ox-rowgrip" title={T('اسحب لتغيير ارتفاع الصفوف', 'Drag to change row height')}
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); rowResizeRef.current = { y0: e.clientY, h0: rowH } }} />}
                    </div>
                  )
                }
                return (
                  <div key={col.key} className="ox-hdr-cell" title={isAr ? col.ar : col.en}
                    draggable={canDrag}
                    onDragStart={(e) => { if (!canDrag) return; dragColRef.current = col.key; e.dataTransfer.effectAllowed = 'move' }}
                    onDragOver={(e) => { if (canDrag && dragColRef.current) { e.preventDefault(); e.dataTransfer.dropEffect = 'move' } }}
                    onDrop={(e) => { if (!canDrag) return; e.preventDefault(); const from = dragColRef.current; dragColRef.current = null; if (from) reorderCols(from, col.key) }}
                    onContextMenu={(e) => { if (!canEdit || col.kind === 'rownum') return; e.preventDefault(); setHdrCtx({ x: e.clientX, y: e.clientY, colKey: col.key }) }}
                    style={{ cursor: canDrag ? 'grab' : 'default', ...(frozenStyle(i, 'var(--hd)', 7) || {}),
                      ...(col.auto && i >= frozenCount ? { background: AUTO_BG[col.source || 'sync'] || AUTO_BG.sync } : {}) }}>
                    {col.auto && <span title={col.freeze
                      ? T('لقطة تُثبَّت لحظة إدخال الصف — لا تتغيّر بالمزامنة بعدها', 'Snapshot frozen when the row is first entered — later syncs do not change it')
                      : T('يُجلب تلقائياً — غير قابل للإدخال', 'Auto-filled — not editable')}
                      style={{ marginInlineEnd: 4, fontSize: 10, color: 'var(--tx3)', flexShrink: 0 }}>{col.freeze ? '⏱' : '⟳'}</span>}
                    <span onClick={(e) => { if (canEdit) { e.stopPropagation(); cycleSort(col.key) } }}
                      title={T('نقر للفرز', 'Click to sort')}
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', cursor: canEdit ? 'pointer' : 'default' }}>{isAr ? col.ar : col.en}</span>
                    {sortCfg?.key === col.key && <span style={{ marginInlineStart: 4, fontSize: 10, color: C.gold2, flexShrink: 0 }}>{sortCfg.dir === 'desc' ? '▼' : '▲'}</span>}
                    {colFilters[col.key] && (
                      <svg title={T('عليه فلتر', 'Filtered')} width="10" height="10" viewBox="0 0 24 24" fill={C.blue} style={{ marginInlineStart: 4, flexShrink: 0 }}>
                        <polygon points="3 4 21 4 14 13 14 20 10 18 10 13" />
                      </svg>
                    )}
                    {aggMap[col.key] && <span title={aggLabel(aggMap[col.key], isAr)} style={{ marginInlineStart: 4, fontSize: 10, color: 'var(--tx4)', flexShrink: 0 }}>Σ</span>}
                    {formulaMap[col.key] && <span title={formulaMap[col.key]} style={{ marginInlineStart: 4, fontSize: 11, color: C.gold2, flexShrink: 0, fontStyle: 'italic', fontWeight: 600 }}>ƒ</span>}
                    {(() => { const cs = col.source || (formulaMap[col.key] ? 'formula' : (col.ops ? 'entry' : (view.defaultSource || 'sync'))); const sc = COL_SRC[cs] || COL_SRC.sync; return <span title={T('المصدر: ' + sc.ar, 'Source: ' + sc.en)} style={{ width: 6, height: 6, borderRadius: '50%', background: sc.color, marginInlineStart: 6, flexShrink: 0 }} /> })()}
                    {(() => {
                      const mk = chat.marks.cols.get(col.key); if (!mk) return null
                      return <span title={T('سؤال في المحادثة عن هذا العمود', 'A chat question refers to this column')}
                        onClick={(e) => { e.stopPropagation(); setChatOpen(true) }}
                        style={{ width: 7, height: 7, borderRadius: '50%', marginInlineStart: 5, flexShrink: 0, cursor: 'pointer',
                          background: mk.open ? C.blue : 'rgba(46,204,113,.85)' }} />
                    })()}
                    {protectedMap[col.key] && <span title={T('محمي بكلمة سر','Password-protected')} style={{ marginInlineStart: 5, fontSize: 10, flexShrink: 0 }}>🔑</span>}
                    {lockedSet.has(col.key) && <span title={T('مقفل','Locked')} style={{ marginInlineStart: 5, fontSize: 10, opacity: .8, flexShrink: 0 }}>🔒</span>}
                    {i < frozenCount && <span title={T('مثبَّت','Pinned')} style={{ marginInlineStart: 5, fontSize: 9.5, color: C.gold2, flexShrink: 0 }}>📌</span>}
                    {i > 0 && <span className="ox-grip" title={T('اسحب لتغيير العرض · نقر مزدوج للضبط التلقائي', 'Drag to resize · double-click to auto-fit')} onMouseDown={(e) => { e.preventDefault(); resizeRef.current = { key: col.key, x0: e.clientX, w0: widths[i] } }} onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); autoFitCol(col) }} />}
                  </div>
                )
              })}
            </div>
          </div>

          <div ref={scrollRef} className="ox-scroll" tabIndex={0} onKeyDown={onKeyDown} onPaste={onPaste} onCopy={onCopyEvent}
            onScroll={(e) => { if (hdrRef.current) hdrRef.current.scrollLeft = e.currentTarget.scrollLeft }}>
            <div ref={setRowsNode} style={{ minWidth: totalW }}>
              {viewRows.length === 0 && (
                <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--tx4)', fontSize: 13 }}>
                  {T('لا صفوف مطابقة', 'No matching rows')}
                </div>
              )}
              {vwin.s > 0 && <div aria-hidden style={{ height: vwin.s * rowH }} />}
              {viewRows.slice(vwin.s, vwin.e).map((row, j) => {
                const r = vwin.s + j
                const err = rowErr[row._id]
                // حدود مجموعة الدمج لهذا الصف (أعمدة المنشأة): تُحسب مرة للصف وتُستعمل
                // لكل خلية مدمجة — القيمة تُعرض في أول صف كطبقة متمركزة رأسياً عبر
                // كامل ارتفاع المجموعة، وتُفرَّغ صفوف التكرار بلا فاصل أفقي داخلها.
                let mGroupStart = r, mGroupEnd = r
                if (mergeGroups) { mGroupStart = mergeGroups.starts[r]; mGroupEnd = mergeGroups.ends[r] }
                const mGroupSize = mGroupEnd - mGroupStart + 1
                return (
                  <div key={row._id} className="ox-row" data-r={r} style={{ display: 'grid', gridTemplateColumns: tmpl, minWidth: totalW, opacity: row._hidden ? .5 : 1, background: selRows.has(row._id) ? 'rgba(176,125,0,.10)' : (view.rowBg ? (view.rowBg(row) || undefined) : undefined) }}
                    onContextMenu={(e) => { if (!canEdit) return; e.preventDefault(); if (!selRows.has(row._id)) { setSelRows(new Set([row._id])); selAnchorRef.current = row._id }; setCtx({ x: e.clientX, y: e.clientY, rowId: row._id }) }}
                    onDragOver={(e) => { if (canEdit && dragRowRef.current) { e.preventDefault(); e.dataTransfer.dropEffect = 'move' } }}
                    onDrop={(e) => { if (!canEdit) return; const from = dragRowRef.current; dragRowRef.current = null; if (from) { e.preventDefault(); reorderRows(from, row._id) } }}>
                    {COLS.map((col, c) => {
                      if (col.kind === 'rownum') {
                        const rowSel = selRows.has(row._id)
                        return (
                          <div key={col.key} className="ox-cell" title={T('انقر للتحديد · اسحب لإعادة الترتيب', 'Click to select · drag to reorder')}
                            draggable={canEdit}
                            onDragStart={(e) => { if (!canEdit) return; dragRowRef.current = row._id; e.dataTransfer.effectAllowed = 'move' }}
                            onDragEnd={() => { dragRowRef.current = null }}
                            onClick={(e) => { if (canEdit) selectRowClick(row._id, r, e) }}
                            onDoubleClick={() => setDetailRow(row._id)}
                            style={{ ...cellBase, height: rowH, justifyContent: 'center', color: rowSel ? '#000' : 'var(--tx3)', fontWeight: rowSel ? 600 : 400, fontFamily: MONO, fontSize: 11.5, background: rowSel ? C.gold2 : 'var(--bd2)', cursor: canEdit ? 'grab' : 'default', gap: 5, ...(frozenStyle(c, rowSel ? C.gold2 : FROZEN_BG, 4) || {}) }}>
                            {row._manual && <span title={T('صف يدوي', 'Manual row')} style={{ width: 6, height: 6, borderRadius: '50%', background: rowSel ? '#000' : C.blue, display: 'inline-block' }} />}
                            {(() => {
                              const mk = chat.marks.rows.get(row._id); if (!mk) return null
                              return <span title={T('سؤال في المحادثة عن هذا الصف', 'A chat question refers to this row')}
                                onClick={(e) => { e.stopPropagation(); setChatOpen(true) }}
                                style={{ position: 'absolute', top: 2, insetInlineEnd: 2, width: 7, height: 7, borderRadius: '50%', cursor: 'pointer',
                                  background: mk.open ? C.blue : 'rgba(46,204,113,.85)', boxShadow: '0 0 0 1.5px var(--bg)' }} />
                            })()}
                            {err
                              ? <span title={err} style={{ width: 7, height: 7, borderRadius: '50%', background: C.red, display: 'inline-block' }} />
                              : edits[row._id] ? <span style={{ width: 7, height: 7, borderRadius: '50%', background: rowSel ? '#000' : C.gold2, display: 'inline-block' }} />
                              : (firstNo + r)}
                          </div>
                        )
                      }
                      const active = head.r === r && head.c === c
                      const sel = inRange(r, c)
                      const fill = inFill(r, c)
                      const editable = isEditable(row, col)
                      const dirty = isDirty(row, col)
                      const overridden = !dirty && isOverridden(row, col)
                      const isEd = editing && editing.r === r && editing.c === c
                      const raw = dispOf(row, col)
                      const disp = fmtDisp(row, col)
                      const colType = colTypeMap[col.key] || (col.select ? 'select' : (col.kind === 'num' ? 'number' : (col.kind === 'date' ? 'date' : '')))
                      const wrap = !!wrapMap[col.key]
                      const ltr = col.kind === 'mono' || col.kind === 'date' || col.kind === 'num'
                      const frozen = c < frozenCount
                      const cfBg = cfColor(row, col)
                      const bandBg = col.bg ? col.bg(disp, row) : null   // خلفية مشتقّة من القيمة (لون النطاق)
                      // عمود يُجلب تلقائياً (قراءة فقط): تظليل خفيف بلون مصدره + نص أهدأ
                      const autoBg = (col.auto && c >= frozenCount) ? (AUTO_BG[col.source || 'sync'] || AUTO_BG.sync) : null
                      const fgColor = (disp !== '' && col.fg) ? col.fg(disp, row) : null   // لون خط مشتقّ (تحقّق الفاتورة)
                      const st = styleOf(col.key)
                      // دمج رأسي لأعمدة المنشأة: خلية أول الصف تحمل القيمة كطبقة
                      // متمركزة عبر ارتفاع المجموعة؛ صفوف التكرار فارغة بلا حد سفلي.
                      const mergeOn = !!(view.mergeCols && view.mergeCols.includes(col.key))
                      const mHead = mergeOn && r === mGroupStart   // أول صف المجموعة (يعرض القيمة)
                      const mDown = mergeOn && r < mGroupEnd        // ليس آخر المجموعة → أزل الحد السفلي
                      const mSpan = mHead && mGroupSize > 1         // خلية مدمجة فعلية (أكثر من صف)
                      return (
                        <div key={col.key} data-active={active ? '1' : undefined}
                          className="ox-cell"
                          onMouseDown={(e) => {
                            if (e.button !== 0) return
                            if (isEd) return
                            dragRef.current = true
                            if (selRows.size) setSelRows(new Set())
                            if (e.shiftKey) setHead({ r, c })
                            else { setAnchor({ r, c }); setHead({ r, c }) }
                            editRef.current = null; setEditing(null)
                          }}
                          onMouseEnter={() => { if (dragRef.current) setHead({ r, c }) }}
                          onDoubleClick={() => editable && beginEdit(r, c)}
                          onContextMenu={(e) => { if (!canEdit) return; e.preventDefault(); e.stopPropagation(); setAnchor({ r, c }); setHead({ r, c }); setCtx({ x: e.clientX, y: e.clientY, rowId: row._id, colKey: col.key }) }}
                          style={{
                            ...cellBase,
                            // كل الخلايا تبقى RTL (حتى يبقى الفاصل العمودي borderInlineEnd على جهة واحدة
                            // ثابتة لكل الأعمدة مهما أُعيد ترتيبها). الاتجاه LTR يُطبَّق على النص وحده أدناه.
                            justifyContent: 'center',
                            height: wrap ? 'auto' : rowH, minHeight: rowH,
                            fontFamily: (col.kind === 'mono' || col.kind === 'num') ? MONO : F,
                            cursor: editable ? 'cell' : 'default',
                            background: active ? 'var(--accent-soft)' : sel ? 'rgba(176,125,0,.13)' : fill ? 'rgba(176,125,0,.07)' : (cfBg || bandBg || autoBg || (frozen ? FROZEN_BG : 'transparent')),
                            boxShadow: active ? `inset 0 0 0 2px ${C.gold}` : sel ? 'inset 0 0 0 1px rgba(176,125,0,.35)' : undefined,
                            fontSize: st?.size || 12.5,
                            color: fgColor || (dirty ? C.gold2 : overridden ? C.blue : (st?.color || (col.auto ? 'var(--tx2)' : 'var(--tx)'))),
                            fontWeight: dirty ? 600 : overridden ? 600 : (st?.weight || 400),
                            ...(frozen ? { position: 'sticky', [stickSide]: offsets[c], zIndex: 2 } : {}),
                            ...(mDown ? { borderBottom: 'none' } : {}),
                            ...(mSpan ? { overflow: 'visible', zIndex: 3 } : {}),
                          }}>
                          {col.kind === 'photo' ? (
                            <PhotoCell path={raw} name={row.name_ar || row.name_en} size={rowH} onOpen={setPhotoView} />
                          ) : col.kind === 'bmk' ? (
                            <BmkCell href={raw} label={col.label || (isAr ? col.ar : col.en)}
                              missing={col.req ? bmkMissing(row, col.req) : ''}
                              onCopy={() => toast && toast(T('نُسخ رابط البوكماركت — الصقه في مفضّلة المتصفّح', 'Bookmarklet copied — paste it into your bookmarks'))} />
                          ) : col.kind === 'file' ? (
                            <FileCell url={raw} isAr={isAr} canEdit={editable}
                              busy={fileBusy === `${row._id}|${col.key}`}
                              onPick={(f) => uploadCellFile(row, col, f)}
                              onClear={() => writeCells([{ row, col, text: '' }])} />
                          ) : editable && colType === 'select' ? (
                            <CellSelect value={raw}
                              options={col.options ? col.options(row) : (colOptsMap[col.key] || [])}
                              optBg={col.bg ? ((o) => col.bg(o, row)) : null}
                              onChange={(v) => writeCells([{ row, col, text: v }])} disabled={!canEdit} />
                          ) : (<>
                          {isEd ? (
                            colType === 'select' ? (
                              <select ref={cellInRef} className="ox-sel" autoFocus
                                defaultValue={editing.seed != null ? editing.seed : raw}
                                onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); cancelEdit() } }}
                                onChange={(e) => commitEdit([1, 0], e.target.value)}
                                onBlur={() => commitEdit(null)}
                                style={{
                                  width: '94%', height: '84%', margin: 'auto', display: 'block',
                                  color: 'var(--tx)', fontWeight: 600, fontFamily: F, fontSize: 12.5,
                                  textAlign: 'center', textAlignLast: 'center', cursor: 'pointer',
                                  background: 'var(--card-grad2)', border: `1.5px solid ${C.gold}`,
                                  borderRadius: 7, padding: '0 6px', outline: 'none',
                                  boxShadow: `0 2px 8px rgba(0,0,0,.18)`,
                                }}>
                                <option value="" style={{ background: 'var(--hd)', color: 'var(--tx3)' }}>—</option>
                                {(col.options ? col.options(row) : (colOptsMap[col.key] || [])).map((o) => (
                                  <option key={o} value={o} style={{ background: 'var(--hd)', color: 'var(--tx)', fontWeight: 600, padding: '6px 8px' }}>{o}</option>
                                ))}
                              </select>
                            ) : (
                              <input ref={cellInRef} className="ox-in" autoFocus
                                type={colType === 'date' ? 'date' : 'text'}
                                defaultValue={editing.seed != null ? editing.seed : raw}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { e.preventDefault(); commitEdit([1, 0]) }
                                  else if (e.key === 'Tab') { e.preventDefault(); commitEdit([0, e.shiftKey ? -1 : 1]) }
                                  else if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
                                }}
                                onBlur={() => commitEdit(null)}
                                style={{ color: C.gold2, fontWeight: 600, textAlign: 'center', direction: ltr ? 'ltr' : undefined }} />
                            )
                          ) : (
                            mSpan ? (
                              // القيمة كطبقة متمركزة رأسياً عبر كامل ارتفاع المجموعة المدمجة
                              <span style={{ position: 'absolute', insetInlineStart: 0, insetInlineEnd: 0, top: 0, height: mGroupSize * rowH, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', direction: ltr ? 'ltr' : undefined, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pointerEvents: 'none', padding: '0 10px' }}>{disp}</span>
                            ) : (mergeOn && !mHead) ? null : (
                              <span style={{ overflow: wrap ? 'visible' : 'hidden', textOverflow: 'ellipsis', whiteSpace: wrap ? 'normal' : 'nowrap', width: '100%', textAlign: wrap ? 'start' : 'center', direction: ltr ? 'ltr' : undefined, lineHeight: wrap ? 1.35 : undefined, padding: wrap ? '4px 0' : undefined }}>{disp}</span>
                            )
                          )}
                          {(() => {
                            // نقطة على الخلية التي عليها سؤال في المحادثة (زرقاء = مفتوح · خضراء = أُجيب)
                            const mk = chat.cellMarks.get(cellMarkKey(row._id, col.key)); if (!mk) return null
                            return <span title={mk.open ? T(`${mk.open} سؤال مفتوح عن هذه الخلية`, `${mk.open} open question on this cell`) : T('سؤال أُجيب عنه', 'Answered question')}
                              onClick={(e) => { e.stopPropagation(); setChatOpen(true) }}
                              style={{ position: 'absolute', bottom: 2, insetInlineEnd: 2, width: 7, height: 7, borderRadius: '50%', cursor: 'pointer',
                                background: mk.open ? C.blue : 'rgba(46,204,113,.85)', boxShadow: '0 0 0 1.5px var(--bg)' }} />
                          })()}
                          {overridden && !isEd && <span title={T('قيمة مُعدَّلة يدوياً — تجاوز المزامنة', 'Manually overridden — differs from sync')} style={{ position: 'absolute', top: 2, insetInlineStart: 2, width: 0, height: 0, borderTop: `6px solid ${C.blue}`, borderInlineEnd: '6px solid transparent', pointerEvents: 'none' }} />}
                          {active && editable && !isEd && (
                            <span className="ox-fh"
                              onMouseDown={(e) => {
                                e.preventDefault(); e.stopPropagation()
                                fillRef.current = range.r2; setFillTo(range.r2)
                                const host = scrollRef.current
                                const onMv = (ev) => {
                                  if (!host) return
                                  let target = range.r2
                                  // نستعمل data-r (الفهرس الحقيقي) لأن الرسم الافتراضي لا يعرض إلا صفوف النافذة
                                  host.querySelectorAll('.ox-row').forEach((el) => { const rect = el.getBoundingClientRect(); if (ev.clientY >= rect.top) { const dr = Number(el.dataset.r); if (!Number.isNaN(dr)) target = dr } })
                                  fillRef.current = target; setFillTo(target)
                                }
                                const onUp2 = () => { window.removeEventListener('mousemove', onMv); window.removeEventListener('mouseup', onUp2) }
                                window.addEventListener('mousemove', onMv); window.addEventListener('mouseup', onUp2)
                              }} />
                          )}
                          </>)}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
              {vwin.e < viewRows.length && <div aria-hidden style={{ height: (viewRows.length - vwin.e) * rowH }} />}
              {hasTotals && viewRows.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: tmpl, minWidth: totalW, borderTop: `2px solid ${C.gold}` }}>
                  {COLS.map((col, c) => {
                    const frozen = c < frozenCount
                    const kind = aggMap[col.key]
                    const v = totalsVals[col.key]
                    const txt = col.kind === 'rownum' ? 'Σ'
                      : kind ? (v == null ? '' : (kind === 'count' ? enNum(v) : fmtNumber(v, numFmtOf(col) || 'thousands'))) : ''
                    const numish = col.kind === 'mono' || col.kind === 'num' || !!kind
                    return (
                      <div key={col.key} title={kind ? aggLabel(kind, isAr) : ''}
                        style={{ ...cellBase, height: 32, minHeight: 32, justifyContent: 'center', background: 'var(--hd)', fontWeight: 600, fontSize: 11.5,
                          color: col.kind === 'rownum' ? C.gold2 : 'var(--tx2)', fontFamily: numish ? MONO : F, borderBottom: 'none',
                          direction: numish ? 'ltr' : undefined,
                          ...(frozen ? { position: 'sticky', [stickSide]: offsets[c], zIndex: 4, background: 'var(--hd)' } : {}) }}>
                        {txt}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 9, fontSize: 11, color: 'var(--tx4)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <span>{T('تحرير: نقر مزدوج / F2 / ابدأ بالكتابة', 'Edit: double-click / F2 / type')}</span>
        <span>{T('لصق من إكسل · Ctrl+D تعبئة · Ctrl+C نسخ · Ctrl+Z/Y تراجع/إعادة', 'Paste · Ctrl+D fill · Ctrl+C copy · Ctrl+Z/Y undo/redo')}</span>
        <span>{T('انقر رأس العمود للفرز · كليك يمين للتصفية والإجمالي والنوع', 'Click a header to sort · right-click for filter, total & type')}</span>
        <span>{T('اسحب رقم الصف لإعادة الترتيب · اسحب رأس العمود لترتيب الأعمدة', 'Drag row number to reorder · drag header to move columns')}</span>
        <span>{T('كل الخلايا قابلة للتعديل — تعديل قيمة مُزامَنة يُنشئ «تجاوزاً» · كليك يمين ← استرجاع قيمة المزامنة', 'Every cell is editable — editing a synced value creates an override · right-click → restore synced value')}</span>
        <span>{T('صيغ ƒ (تنسيق العمود) · بحث/استبدال Ctrl+H · نقر مزدوج على رقم الصف = تفاصيله · نقر مزدوج على حدّ العمود = ضبط تلقائي', 'Formulas ƒ (column format) · Find/Replace Ctrl+H · double-click row # = details · double-click column edge = auto-fit')}</span>
        <span>{T('حدّد عدة خلايا لعرض المجموع والمتوسط · «تصدير» يفتح في إكسل', 'Select cells for Sum/Avg · Export opens in Excel')}</span>
        <span style={{ fontWeight: 600, color: 'var(--tx3)' }}>{T('مصدر العمود:', 'Column source:')}</span>
        {Object.values(COL_SRC).map((sc) => (
          <span key={sc.en} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: sc.color }} />{isAr ? sc.ar : sc.en}</span>
        ))}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 0, height: 0, borderTop: `7px solid ${C.blue}`, borderInlineEnd: '7px solid transparent' }} />{T('قيمة مُعدَّلة (تجاوز مزامنة)', 'Overridden value')}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: C.blue }} />{T('صف يدوي', 'Manual row')}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: C.blue }} />{T('سؤال مفتوح على الخلية (كليك يمين ← اسأل عن هذه الخلية)', 'Open question on the cell (right-click → Ask about this cell)')}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(46,204,113,.85)' }} />{T('سؤال أُجيب عنه', 'Answered question')}</span>
      </div>

      {/* ── لوحة المحادثة ── */}
      <OpsChatPanel sb={sb} user={user} lang={lang} toast={toast}
        open={chatOpen} onClose={() => setChatOpen(false)}
        chat={chat} viewKey={viewKey} viewName={(isAr ? effName(view).ar : effName(view).en) || view.key}
        owners={owners} canManageOwners={canEdit} onSaveOwners={saveOwners}
        pendingRefs={pendingRefs} onSetRefs={setPendingRefs}
        buildRef={buildRefFromSelection} selectionInfo={selectionInfo} onJump={jumpToRef} />

      {/* ── قائمة السياق (كليك يمين) ── */}
      {ctx && ctxRow && (
        <div className="ox-ctx" ref={ctxMenuRef} style={{ top: ctx.y, left: ctx.x }}>
          {ctxMulti ? (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx4)', padding: '4px 10px 6px' }}>{T(`${selRows.size} صف محدد`, `${selRows.size} rows selected`)}</div>
              {selHiddenCount > 0 && <button disabled={busy} onClick={() => { restoreSelected(); setCtx(null) }}>↺ {T('استعادة المحدد', 'Restore selected')}</button>}
              <button className="del" disabled={busy} onClick={() => { deleteSelected(); setCtx(null) }}>🗑 {T('حذف المحدد', 'Delete selected')}</button>
            </>
          ) : (
            <>
              {ctx.colKey && (() => {
                const col = colDefs.get(ctx.colKey)
                if (!col || col.kind === 'rownum') return null
                const ov = ctxRow._ops ? ctxRow._ops[ctx.colKey] : undefined
                const cellOverridden = !col.ops && ov != null && ov !== '' && String(ov) !== syncVal(ctxRow, col)
                return (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx4)', padding: '4px 10px 6px', maxWidth: 210, overflow: 'hidden', textOverflow: 'ellipsis' }}>{isAr ? col.ar : col.en}</div>
                    <button onClick={() => { askAbout('cell', ctxRow, col); setCtx(null) }}>💬 {T('اسأل عن هذه الخلية', 'Ask about this cell')}</button>
                    <button onClick={() => { askAbout('col', ctxRow, col); setCtx(null) }}>💬 {T('اسأل عن هذا العمود كله', 'Ask about this whole column')}</button>
                    {isEditable(ctxRow, col) && <button onClick={() => { writeCells([{ row: ctxRow, col, text: '' }]); setCtx(null) }}>⌫ {T('مسح الخلية', 'Clear cell')}</button>}
                    {cellOverridden && <button onClick={() => { writeCells([{ row: ctxRow, col, text: syncVal(ctxRow, col) }]); setCtx(null) }}>↺ {T('استرجاع قيمة المزامنة', 'Restore synced value')}</button>}
                    <div style={{ height: 1, background: 'var(--bd)', margin: '5px 6px' }} />
                  </>
                )
              })()}
              <button onClick={() => { askAbout('row', ctxRow, null); setCtx(null) }}>💬 {T('اسأل عن هذا الصف', 'Ask about this row')}</button>
              <button onClick={() => { setDetailRow(ctx.rowId); setCtx(null) }}>🔎 {T('تفاصيل الصف', 'Row details')}</button>
              <button onClick={() => { setAddForm({}); setAddOpen(true); setCtx(null) }}>＋ {T('إضافة صف', 'Add row')}</button>
              <button disabled={busy} onClick={() => { moveRow(ctx.rowId, -1); setCtx(null) }}>▲ {T('تحريك لأعلى', 'Move up')}</button>
              <button disabled={busy} onClick={() => { moveRow(ctx.rowId, 1); setCtx(null) }}>▼ {T('تحريك لأسفل', 'Move down')}</button>
              {ctxRow._hidden
                ? <button disabled={busy} onClick={() => { restoreRow(ctx.rowId); setCtx(null) }}>↺ {T('استعادة', 'Restore')}</button>
                : ctxRow._manual
                  ? <button className="del" disabled={busy} onClick={() => { deleteRow(ctx.rowId); setCtx(null) }}>🗑 {T('حذف الصف', 'Delete row')}</button>
                  : (
                    <>
                      <button disabled={busy} onClick={() => { deleteRow(ctx.rowId); setCtx(null) }}>🚫 {T('إخفاء (يمكن استعادته)', 'Hide (restorable)')}</button>
                      <button className="del" onClick={() => { removeRowPermanent(ctx.rowId); setCtx(null) }}>🗑 {T('حذف نهائي من الجدول', 'Delete permanently')}</button>
                    </>
                  )}
            </>
          )}
        </div>
      )}

      {/* ── قائمة سياق رأس العمود ── */}
      {hdrCtx && (
        <div className="ox-ctx" ref={ctxMenuRef} style={{ top: hdrCtx.y, left: hdrCtx.x }}>
          {hdrCtx.colKey === '__hidden__' ? (
            <>
              {hiddenColList.length === 0 && removedCount === 0 && <button disabled>{T('لا أعمدة مخفية', 'No hidden columns')}</button>}
              {hiddenColList.map((c) => (
                <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <button style={{ flex: 1 }} onClick={() => { unhideColumn(c.key); setHdrCtx(null) }}>↺ {T('إظهار', 'Show')} «{isAr ? c.ar : c.en}»</button>
                  <button className="del" title={T('حذف نهائي', 'Delete permanently')} style={{ width: 34, justifyContent: 'center' }} onClick={() => { removeColumn(c.key); setHdrCtx(null) }}>✕</button>
                </div>
              ))}
              {removedCount > 0 && <button onClick={() => { restoreRemovedColumns(); setHdrCtx(null) }}>↺ {T(`استعادة المحذوفة نهائياً (${removedCount})`, `Restore removed (${removedCount})`)}</button>}
            </>
          ) : (
            <>
              <button onClick={() => { setRenameCol({ key: hdrCtx.colKey, ar: hdrCtxCol?.ar || '', en: hdrCtxCol?.en || '' }); setHdrCtx(null) }}>✎ {T('إعادة تسمية', 'Rename')}</button>
              <button onClick={() => { persistLayout({ ...layout, sort: { key: hdrCtx.colKey, dir: 'asc' } }); setHdrCtx(null) }}>▲ {T('فرز تصاعدي', 'Sort ascending')}</button>
              <button onClick={() => { persistLayout({ ...layout, sort: { key: hdrCtx.colKey, dir: 'desc' } }); setHdrCtx(null) }}>▼ {T('فرز تنازلي', 'Sort descending')}</button>
              {sortCfg?.key === hdrCtx.colKey && <button onClick={() => { persistLayout({ ...layout, sort: null }); setHdrCtx(null) }}>⇕ {T('إلغاء الفرز', 'Clear sort')}</button>}
              <button onClick={() => { const cur = colFilters[hdrCtx.colKey]; setFilterDraft({ text: cur?.text || '', values: Array.isArray(cur?.values) ? cur.values.slice() : null, conds: (cur?.conds || []).map((c) => ({ ...c })), join: cur?.join || 'and', q: '' }); setFilterModal(hdrCtx.colKey); setHdrCtx(null) }}>⧩ {T('تصفية وفرز', 'Filter & sort')}{colFilters[hdrCtx.colKey] ? ' •' : ''}</button>
              <button onClick={() => { setAggModal(hdrCtx.colKey); setHdrCtx(null) }}>Σ {T('إجمالي العمود', 'Column total')}{aggMap[hdrCtx.colKey] ? ` · ${aggLabel(aggMap[hdrCtx.colKey], isAr)}` : ''}</button>
              <button onClick={() => { toggleWrap(hdrCtx.colKey); setHdrCtx(null) }}>↵ {wrapMap[hdrCtx.colKey] ? T('إلغاء لفّ النص', 'Unwrap text') : T('لفّ النص', 'Wrap text')}</button>
              {(() => { const idx = COLS.findIndex((c) => c.key === hdrCtx.colKey); return idx >= 0 && (
                <button onClick={() => { setFrozen(frozenCount === idx + 1 ? 0 : idx + 1); setHdrCtx(null) }}>📌 {frozenCount === idx + 1 ? T('إلغاء التثبيت', 'Unfreeze') : T('تثبيت حتى هنا', 'Freeze up to here')}</button>
              ) })()}
              {(hdrCtxCol?.ops || hdrCtxCol?.manual) && (
                <button onClick={() => { toggleLock(hdrCtx.colKey); setHdrCtx(null) }}>{lockedSet.has(hdrCtx.colKey) ? T('🔓 فتح الإدخال', '🔓 Unlock') : T('🔒 قفل الإدخال (قراءة فقط)', '🔒 Lock (read-only)')}</button>
              )}
              <button onClick={() => { const cur = (layout.cf || {})[hdrCtx.colKey]; setCfDraft({ dup: cur?.dup || null, rules: (cur?.rules || []).map((r) => ({ ...r })) }); setCfModal(hdrCtx.colKey); setHdrCtx(null) }}>🎨 {T('تنسيق شرطي', 'Conditional format')}</button>
              <button onClick={() => { const k = hdrCtx.colKey; setFmtDraft({ ...(styleOf(k) || {}), type: colTypeMap[k] || '', options: (colOptsMap[k] || []).join('\n'), numFmt: numFmtMap[k] || '', formula: formulaMap[k] || '' }); setFmtModal(k); setHdrCtx(null) }}>🅰 {T('تنسيق العمود', 'Column format')}</button>
              {protectedMap[hdrCtx.colKey] ? (
                <>
                  {!unlockedCols.has(hdrCtx.colKey) && <button onClick={() => { setPwInput(''); setPwModal({ key: hdrCtx.colKey, mode: 'unlock' }); setHdrCtx(null) }}>🔑 {T('إظهار العمود', 'Reveal column')}</button>}
                  <button className="del" onClick={() => { removeProtect(hdrCtx.colKey); setHdrCtx(null) }}>🗝 {T('إزالة الحماية', 'Remove protection')}</button>
                </>
              ) : (
                <button onClick={() => { setPwInput(''); setPwModal({ key: hdrCtx.colKey, mode: 'set' }); setHdrCtx(null) }}>🔑 {T('حماية بكلمة سر', 'Protect with password')}</button>
              )}
              <button onClick={() => { setColName(''); setColModal(true); setHdrCtx(null) }}>＋ {T('إضافة عمود', 'Add column')}</button>
              {!hdrCtxCol?.custom && <button onClick={() => { deleteColumn(hdrCtx.colKey); setHdrCtx(null) }}>🚫 {T('إخفاء العمود (يمكن إظهاره)', 'Hide column (restorable)')}</button>}
              <button className="del" onClick={() => { removeColumn(hdrCtx.colKey); setHdrCtx(null) }}>
                🗑 {T('حذف العمود نهائياً', 'Delete column permanently')}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── نافذة إنشاء/إعادة تسمية عرض (بمكوّن FormKit — تمركز وأزرار موحّدة) ── */}
      {sheetModal && (() => {
        const isRename = sheetModal === 'rename'
        const submit = () => { if (!sheetName.ar.trim()) return; isRename ? renameSheet(sheetName.ar, sheetName.en) : createSheet() }
        const lbl = { display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--tx2)', margin: '2px 0 7px', textAlign: 'center' }
        const fld = { textAlign: 'center' }
        return (
          <Modal open onClose={() => setSheetModal(false)} closeOnOverlay lang={lang} width={440} accent={C.gold}
            title={isRename ? T('إعادة تسمية العرض', 'Rename view') : T('جدول مخصّص جديد', 'New custom sheet')}
            subtitle={isRename ? T('غيّر اسم العرض فقط — الأعمدة والصفوف والبيانات لا تتأثّر.', 'Change the display name only — columns, rows & data are untouched.') : T('جدول فارغ تبنيه كما تريد — بديل ملف إكسل. يبدأ بثلاثة أعمدة.', 'A blank sheet you build — an Excel replacement. Starts with 3 columns.')}
            footer={<ActionButton Icon={Save} disabled={!sheetName.ar.trim()} onClick={submit}>{isRename ? T('حفظ', 'Save') : T('إنشاء', 'Create')}</ActionButton>}>
            <label style={lbl}>{T('اسم العرض (عربي)', 'View name (Arabic)')}</label>
            <input className="ox-fld" style={fld} value={sheetName.ar} onChange={(e) => setSheetName((s) => ({ ...s, ar: e.target.value }))} autoFocus dir="rtl"
              onKeyDown={(e) => { if (e.key === 'Enter') submit() }} />
            <label style={{ ...lbl, marginTop: 14 }}>{T('الاسم بالإنجليزية (اختياري)', 'English name (optional)')}</label>
            <input className="ox-fld" style={fld} value={sheetName.en} onChange={(e) => setSheetName((s) => ({ ...s, en: e.target.value }))} dir="ltr"
              onKeyDown={(e) => { if (e.key === 'Enter') submit() }} />
          </Modal>
        )
      })()}

      {/* ── نافذة بحث واستبدال ── */}
      {findModal && (
        <Modal open onClose={() => setFindModal(false)} closeOnOverlay lang={lang} accent={C.gold} width={460}
          title={T('بحث واستبدال', 'Find & replace')} subtitle={T('يستبدل في الخلايا القابلة للتعديل ضمن النتائج المعروضة (بعد الفلترة)', 'Replaces editable cells within the filtered results')}
          footer={<ActionButton Icon={Save} disabled={!findState.find || !findMatches} onClick={doReplaceAll}>{T('استبدال الكل', 'Replace all')}</ActionButton>}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tx2)', marginBottom: 6 }}>{T('البحث عن', 'Find')}</label>
          <input className="ox-fld" value={findState.find} onChange={(e) => setFindState((s) => ({ ...s, find: e.target.value }))} autoFocus dir="auto" />
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tx2)', margin: '12px 0 6px' }}>{T('استبدال بـ', 'Replace with')}</label>
          <input className="ox-fld" value={findState.replace} onChange={(e) => setFindState((s) => ({ ...s, replace: e.target.value }))} dir="auto"
            onKeyDown={(e) => { if (e.key === 'Enter' && findState.find) doReplaceAll() }} />
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--tx2)', cursor: 'pointer' }}>
              <input type="checkbox" checked={findState.matchCase} onChange={(e) => setFindState((s) => ({ ...s, matchCase: e.target.checked }))} style={{ width: 15, height: 15, accentColor: C.gold }} />{T('مطابقة حالة الأحرف', 'Match case')}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--tx2)', cursor: 'pointer' }}>
              <input type="checkbox" checked={findState.colOnly} onChange={(e) => setFindState((s) => ({ ...s, colOnly: e.target.checked }))} style={{ width: 15, height: 15, accentColor: C.gold }} />{T('العمود الحالي فقط', 'Active column only')}
            </label>
            {findState.find && <span style={{ marginInlineStart: 'auto', fontSize: 12, fontFamily: MONO, color: findMatches ? C.gold2 : 'var(--tx4)', fontWeight: 600 }}>{enNum(findMatches)} {T('مطابقة', 'matches')}</span>}
          </div>
        </Modal>
      )}

      {/* ── بطاقة تفاصيل الصف ── */}
      {detailRow && (() => {
        const row = allRows.find((r) => r._id === detailRow); if (!row) return null
        const cols = COLS.filter((c) => c.kind !== 'rownum')
        return (
          <Modal open onClose={() => setDetailRow(null)} closeOnOverlay lang={lang} accent={C.gold} width={560} scroll
            title={T('تفاصيل الصف', 'Row details') + (row._manual ? T(' · يدوي', ' · manual') : '')}>
            {cols.map((c) => {
              const val = fmtDisp(row, c)
              return (
                <div key={c.key} style={{ display: 'flex', gap: 12, padding: '9px 2px', borderBottom: '1px solid var(--bd2)', alignItems: 'baseline' }}>
                  <span style={{ flex: '0 0 40%', fontSize: 12, fontWeight: 600, color: 'var(--tx3)' }}>{isAr ? c.ar : c.en}{formulaMap[c.key] ? ' ƒ' : ''}</span>
                  <span style={{ flex: 1, fontSize: 13, color: val ? 'var(--tx)' : 'var(--tx4)', fontFamily: (c.kind === 'mono' || c.kind === 'num') ? MONO : F, direction: (c.kind === 'mono' || c.kind === 'num' || c.kind === 'date') ? 'ltr' : undefined, wordBreak: 'break-word' }}>{val || '—'}</span>
                </div>
              )
            })}
          </Modal>
        )
      })()}

      {/* ── نافذة إضافة عمود ── */}
      {colModal && (
        <Modal open onClose={() => setColModal(false)} closeOnOverlay lang={lang} accent={C.gold} width={440}
          title={T('إضافة عمود جديد', 'Add new column')} subtitle={T('عمود تشغيلي — يُحرَّر ويُخزَّن مع الشيت', 'Operational column — editable, stored with the sheet')}
          footer={<ActionButton Icon={Save} disabled={!colName.trim()} onClick={() => { addColumn(colName); setColModal(false) }}>{T('إضافة', 'Add')}</ActionButton>}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tx2)', marginBottom: 6 }}>{T('اسم العمود', 'Column name')}</label>
          <input className="ox-fld" value={colName} onChange={(e) => setColName(e.target.value)} autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter' && colName.trim()) { addColumn(colName); setColModal(false) } }} />
        </Modal>
      )}

      {/* ── نافذة إعادة تسمية العمود ── */}
      {renameCol && (
        <Modal open onClose={() => setRenameCol(null)} closeOnOverlay lang={lang} accent={C.gold} width={440}
          title={T('إعادة تسمية العمود', 'Rename column')} subtitle={T('اكتب الاسمين ليتبدّلا مع لغة البرنامج · فارغ = رجوع للأصل', 'Enter both names to follow the app language · empty = original')}
          footer={<ActionButton Icon={Save} onClick={() => { renameColumn(renameCol.key, renameCol.ar, renameCol.en); setRenameCol(null) }}>{T('حفظ', 'Save')}</ActionButton>}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tx2)', marginBottom: 6 }}>{T('الاسم بالعربية', 'Arabic name')}</label>
          <input className="ox-fld" value={renameCol.ar} onChange={(e) => setRenameCol((s) => ({ ...s, ar: e.target.value }))} autoFocus dir="rtl"
            onKeyDown={(e) => { if (e.key === 'Enter') { renameColumn(renameCol.key, renameCol.ar, renameCol.en); setRenameCol(null) } }} />
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tx2)', margin: '12px 0 6px' }}>{T('الاسم بالإنجليزية', 'English name')}</label>
          <input className="ox-fld" value={renameCol.en} onChange={(e) => setRenameCol((s) => ({ ...s, en: e.target.value }))} dir="ltr"
            onKeyDown={(e) => { if (e.key === 'Enter') { renameColumn(renameCol.key, renameCol.ar, renameCol.en); setRenameCol(null) } }} />
        </Modal>
      )}

      {/* ── نافذة التنسيق الشرطي ── */}
      {cfModal && (() => {
        const colDef = colDefs.get(cfModal)
        const Swatch = ({ value, onPick }) => (
          <div style={{ display: 'inline-flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
            {CF_COLORS.map((col) => (
              <span key={col} onClick={() => onPick(col)} title={T('لون', 'Color')}
                style={{ width: 20, height: 20, borderRadius: 6, background: col, cursor: 'pointer', border: value === col ? '2px solid var(--accent)' : '1px solid var(--bd)', boxSizing: 'border-box' }} />
            ))}
            {value && <span onClick={() => onPick(null)} title={T('بلا', 'None')} style={{ fontSize: 11, color: 'var(--tx4)', cursor: 'pointer', padding: '0 4px' }}>✕</span>}
          </div>
        )
        return (
          <Modal open onClose={() => setCfModal(null)} closeOnOverlay lang={lang} accent={C.gold} width={520} scroll
            title={`${T('تنسيق شرطي', 'Conditional format')} — «${colDef ? (isAr ? colDef.ar : colDef.en) : ''}»`}
            subtitle={T('ظلّل الخلايا حسب قيمتها (أرقام أو تواريخ أو نص)', 'Highlight cells by value (numbers, dates, or text)')}
            footerStart={<ActionButton variant="ghost" Icon={Trash2} onClick={() => { saveCf(cfModal, { dup: null, rules: [] }); setCfModal(null) }}>{T('مسح الكل', 'Clear all')}</ActionButton>}
            footer={<ActionButton Icon={Save} onClick={() => { saveCf(cfModal, cfDraft); setCfModal(null) }}>{T('حفظ', 'Save')}</ActionButton>}>
              {/* المكرّر */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--bd)', marginBottom: 12 }}>
                <input type="checkbox" checked={!!cfDraft.dup} onChange={(e) => setCfDraft((s) => ({ ...s, dup: e.target.checked ? (s.dup || CF_COLORS[0]) : null }))} style={{ width: 16, height: 16, accentColor: C.gold }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--tx2)' }}>{T('ظلّل القيم المكرَّرة', 'Highlight duplicate values')}</span>
                {cfDraft.dup && <Swatch value={cfDraft.dup} onPick={(col) => setCfDraft((s) => ({ ...s, dup: col || CF_COLORS[0] }))} />}
              </div>

              {/* القواعد */}
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)', marginBottom: 8 }}>{T('قواعد حسب القيمة', 'Value rules')}</div>
              {(cfDraft.rules || []).map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  <select value={r.op} onChange={(e) => setCfDraft((s) => { const rr = s.rules.slice(); rr[i] = { ...rr[i], op: e.target.value }; return { ...s, rules: rr } })}
                    style={{ height: 34, borderRadius: 8, border: '1px solid var(--bd)', background: 'var(--inputBg)', color: 'var(--tx)', fontFamily: F, fontSize: 13, padding: '0 8px' }}>
                    {CF_OPS.map((op) => <option key={op} value={op}>{cfOpLabel(op, isAr)}</option>)}
                  </select>
                  <input className="ox-fld" style={{ flex: 1, minWidth: 90, height: 34 }} placeholder={T('القيمة (رقم/تاريخ/نص)', 'value')} value={r.value}
                    onChange={(e) => setCfDraft((s) => { const rr = s.rules.slice(); rr[i] = { ...rr[i], value: e.target.value }; return { ...s, rules: rr } })} dir="ltr" />
                  <Swatch value={r.color} onPick={(col) => setCfDraft((s) => { const rr = s.rules.slice(); rr[i] = { ...rr[i], color: col || CF_COLORS[0] }; return { ...s, rules: rr } })} />
                  <button className="ox-btn" style={{ width: 32, height: 34, justifyContent: 'center', color: C.red }} onClick={() => setCfDraft((s) => ({ ...s, rules: s.rules.filter((_, j) => j !== i) }))}>✕</button>
                </div>
              ))}
              <button className="ox-btn" style={{ height: 32 }} onClick={() => setCfDraft((s) => ({ ...s, rules: [...(s.rules || []), { op: '>', value: '', color: CF_COLORS[1] }] }))}>＋ {T('أضف قاعدة', 'Add rule')}</button>
          </Modal>
        )
      })()}

      {/* ── نافذة تنسيق النص ── */}
      {fmtModal && (() => {
        const colDef = colDefs.get(fmtModal)
        return (
          <Modal open onClose={() => setFmtModal(null)} closeOnOverlay lang={lang} accent={C.gold} width={460} scroll
            title={`${T('تنسيق العمود', 'Column format')} — «${colDef ? (isAr ? colDef.ar : colDef.en) : ''}»`}
            subtitle={T('النوع والتحقّق وتنسيق الأرقام والمظهر لهذا العمود', 'Type, validation, number format & appearance for this column')}
            footerStart={<ActionButton variant="ghost" Icon={Trash2} onClick={() => { saveStyle(fmtModal, {}); setFmtModal(null) }}>{T('إفتراضي', 'Reset')}</ActionButton>}
            footer={<ActionButton Icon={Save} onClick={() => { saveStyle(fmtModal, fmtDraft); setFmtModal(null) }}>{T('حفظ', 'Save')}</ActionButton>}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tx2)', marginBottom: 6 }}>ƒ {T('صيغة محسوبة (اختياري)', 'Computed formula (optional)')}</label>
              <input className="ox-fld" value={fmtDraft.formula || ''} onChange={(e) => setFmtDraft((d) => ({ ...d, formula: e.target.value }))} dir="ltr"
                placeholder={'= [عمود1] + [عمود2]'} style={{ fontFamily: MONO, marginBottom: 6 }} />
              <div style={{ fontSize: 10.5, color: 'var(--tx4)', lineHeight: 1.6, marginBottom: 4 }}>{T(FX_HELP, 'e.g. [Col1]+[Col2] · DAYS([expiry],TODAY()) · IF([left]<30,"soon","ok") · funcs: TODAY DAYS IF AND OR MIN MAX SUM ROUND ABS LEN CONCAT YEAR MONTH DAY')}</div>
              <div style={{ fontSize: 10.5, color: C.gold2, marginBottom: 14 }}>{T('عمود بصيغة = محسوب تلقائياً وللقراءة فقط · اترك الحقل فارغاً لإلغائها', 'A formula column is auto-computed & read-only · clear it to remove')}</div>

              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tx2)', marginBottom: 6 }}>{T('نوع الإدخال', 'Input type')}</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                {COL_TYPES.map((t) => (
                  <button key={t.v} className="ox-btn" style={{ height: 34, ...((fmtDraft.type || '') === t.v ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent-bd)' } : {}) }}
                    onClick={() => setFmtDraft((d) => ({ ...d, type: t.v }))}>{isAr ? t.ar : t.en}</button>
                ))}
              </div>
              {fmtDraft.type === 'select' && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tx2)', marginBottom: 6 }}>{T('خيارات القائمة (سطر لكل خيار)', 'List options (one per line)')}</label>
                  <textarea className="ox-fld" value={fmtDraft.options || ''} onChange={(e) => setFmtDraft((d) => ({ ...d, options: e.target.value }))}
                    rows={4} dir="auto" style={{ height: 'auto', padding: '8px 12px', resize: 'vertical', lineHeight: 1.5 }} placeholder={T('قيد التنفيذ\nمكتمل\nملغى', 'Pending\nDone\nCancelled')} />
                </div>
              )}

              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tx2)', marginBottom: 6 }}>{T('تنسيق الأرقام', 'Number format')}</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                {NUM_FMTS.map((n) => (
                  <button key={n.v} className="ox-btn" style={{ height: 34, ...((fmtDraft.numFmt || '') === n.v ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent-bd)' } : {}) }}
                    onClick={() => setFmtDraft((d) => ({ ...d, numFmt: n.v }))}>{isAr ? n.ar : n.en}</button>
                ))}
              </div>

              <div style={{ height: 1, background: 'var(--bd)', margin: '4px 0 14px' }} />

              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tx2)', marginBottom: 6 }}>{T('الحجم', 'Size')}</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                {FONT_SIZES.map((s) => (
                  <button key={s.v} className="ox-btn" style={{ height: 34, ...(String(fmtDraft.size || 12.5) === String(s.v) ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent-bd)' } : {}) }}
                    onClick={() => setFmtDraft((d) => ({ ...d, size: s.v }))}><span style={{ fontSize: Math.min(s.v, 15) }}>{isAr ? s.ar : s.en}</span></button>
                ))}
              </div>

              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tx2)', marginBottom: 6 }}>{T('الوزن', 'Weight')}</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                <button className="ox-btn" style={{ height: 34, ...((fmtDraft.weight || 400) < 700 ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent-bd)' } : {}) }} onClick={() => setFmtDraft((d) => ({ ...d, weight: 400 }))}>{T('عادي', 'Normal')}</button>
                <button className="ox-btn" style={{ height: 34, fontWeight: 600, ...((fmtDraft.weight || 400) >= 700 ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent-bd)' } : {}) }} onClick={() => setFmtDraft((d) => ({ ...d, weight: 700 }))}>{T('عريض', 'Bold')}</button>
              </div>

              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tx2)', marginBottom: 6 }}>{T('اللون', 'Color')}</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                {TEXT_COLORS.map((col) => (
                  <span key={col} onClick={() => setFmtDraft((d) => ({ ...d, color: col }))} title={T('لون', 'Color')}
                    style={{ width: 24, height: 24, borderRadius: 7, background: col === 'var(--tx)' ? 'var(--tx3)' : col, cursor: 'pointer', border: (fmtDraft.color || 'var(--tx)') === col ? '2px solid var(--accent)' : '1px solid var(--bd)', boxSizing: 'border-box' }} />
                ))}
                <input type="color" value={/^#/.test(fmtDraft.color || '') ? fmtDraft.color : '#B07D00'} onChange={(e) => setFmtDraft((d) => ({ ...d, color: e.target.value }))} title={T('لون مخصّص', 'Custom color')} style={{ width: 28, height: 28, border: '1px solid var(--bd)', borderRadius: 7, background: 'transparent', cursor: 'pointer', padding: 0 }} />
              </div>

          </Modal>
        )
      })()}

      {/* ── نافذة التصفية والفرز (قائمة عمود احترافية على طراز إكسل) ── */}
      {filterModal && (() => {
        const col = colDefs.get(filterModal)
        const family = familyOf(col)
        const ops = COND_OPS[family]
        const defOp = family === 'number' ? 'gt' : family === 'date' ? 'before' : 'contains'
        const counts = new Map()
        for (const row of visible) { const v = String(valOf(row, col) ?? ''); if (v === '') continue; counts.set(v, (counts.get(v) || 0) + 1) }
        const allVals = [...counts.keys()].sort((a, b) => { const an = cfNum(a), bn = cfNum(b); if (an !== null && bn !== null) return an - bn; const da = cfDate(a), db = cfDate(b); if (da !== null && db !== null) return da - db; return a.localeCompare(b, 'ar') })
        const q = latin(filterDraft.q || '').trim().toLowerCase()
        const shown = q ? allVals.filter((v) => latin(v).toLowerCase().includes(q)) : allVals
        const isAll = filterDraft.values === null
        const selSet = isAll ? null : new Set(filterDraft.values || [])
        const isChecked = (v) => isAll || selSet.has(v)
        const toggle = (v) => setFilterDraft((d) => { const base = d.values === null ? allVals.slice() : (d.values || []); const s = new Set(base); s.has(v) ? s.delete(v) : s.add(v); const arr = [...s]; return { ...d, values: arr.length === allVals.length ? null : arr } })
        const conds = filterDraft.conds || []
        const addCond = () => setFilterDraft((d) => ({ ...d, conds: [...(d.conds || []), { op: defOp, a: '', b: '' }] }))
        const updCond = (i, patch) => setFilterDraft((d) => { const cc = (d.conds || []).slice(); cc[i] = { ...cc[i], ...patch }; return { ...d, conds: cc } })
        const rmCond = (i) => setFilterDraft((d) => ({ ...d, conds: (d.conds || []).filter((_, j) => j !== i) }))
        const addPreset = (key) => setFilterDraft((d) => { const cc = (d.conds || []); if (cc.some((c) => c.op === 'preset' && c.a === key)) return d; return { ...d, conds: [...cc, { op: 'preset', a: key }] } })
        const valInput = family === 'date' ? 'date' : 'text'
        const sortLabel = family === 'date' ? [T('الأقدم أولاً', 'Oldest first'), T('الأحدث أولاً', 'Newest first')] : family === 'number' ? [T('الأصغر أولاً', 'Smallest first'), T('الأكبر أولاً', 'Largest first')] : [T('أ ← ي', 'A → Z'), T('ي ← أ', 'Z → A')]
        const sortActive = sortCfg?.key === filterModal ? sortCfg.dir : null
        const secLbl = { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--tx2)', margin: '2px 0 8px' }
        const selOpStyle = { height: 34, borderRadius: 8, border: '1px solid var(--bd)', background: 'var(--inputBg)', color: 'var(--tx)', fontFamily: F, fontSize: 12.5, padding: '0 8px', flexShrink: 0 }
        return (
          <Modal open onClose={() => setFilterModal(null)} closeOnOverlay lang={lang} accent={C.gold} width={560} scroll
            title={`${T('تصفية وفرز', 'Filter & sort')} — «${col ? (isAr ? col.ar : col.en) : ''}»`}
            subtitle={T(`نوع العمود: ${family === 'number' ? 'رقم' : family === 'date' ? 'تاريخ' : 'نص'}`, `Column type: ${family}`)}
            footerStart={<ActionButton variant="ghost" Icon={Trash2} onClick={() => { setColFilter(filterModal, null); setFilterModal(null) }}>{T('مسح الفلتر', 'Clear filter')}</ActionButton>}
            footer={<ActionButton Icon={Save} onClick={() => { setColFilter(filterModal, { values: filterDraft.values === null ? [] : filterDraft.values, conds: filterDraft.conds || [], join: filterDraft.join, text: filterDraft.text || '' }); setFilterModal(null) }}>{T('تطبيق', 'Apply')}</ActionButton>}>
                {/* الفرز */}
                <div style={secLbl}>↕ {T('الترتيب', 'Sort')}</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <button className="ox-btn" style={{ flex: 1, height: 36, ...(sortActive === 'asc' ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent-bd)' } : {}) }}
                    onClick={() => persistLayout({ ...layout, sort: { key: filterModal, dir: 'asc' } })}>▲ {sortLabel[0]}</button>
                  <button className="ox-btn" style={{ flex: 1, height: 36, ...(sortActive === 'desc' ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent-bd)' } : {}) }}
                    onClick={() => persistLayout({ ...layout, sort: { key: filterModal, dir: 'desc' } })}>▼ {sortLabel[1]}</button>
                  {sortActive && <button className="ox-btn" style={{ width: 40, height: 36, justifyContent: 'center' }} title={T('إلغاء الفرز', 'Clear sort')} onClick={() => persistLayout({ ...layout, sort: null })}>✕</button>}
                </div>

                {/* اختصارات التاريخ */}
                {family === 'date' && (
                  <>
                    <div style={secLbl}>⚡ {T('اختصارات سريعة', 'Quick ranges')}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                      {DATE_PRESETS.map((p) => {
                        const on = conds.some((c) => c.op === 'preset' && c.a === p.v)
                        return <button key={p.v} className="ox-btn" style={{ height: 30, fontSize: 11.5, ...(on ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent-bd)' } : {}) }}
                          onClick={() => on ? setFilterDraft((d) => ({ ...d, conds: (d.conds || []).filter((c) => !(c.op === 'preset' && c.a === p.v)) })) : addPreset(p.v)}>{isAr ? p.ar : p.en}</button>
                      })}
                    </div>
                  </>
                )}

                {/* الشروط */}
                <div style={{ ...secLbl, justifyContent: 'space-between' }}>
                  <span>⚙ {T('شروط مخصّصة', 'Custom conditions')}</span>
                  {conds.filter((c) => c.op !== 'preset').length > 1 && (
                    <div style={{ display: 'flex', gap: 4, background: 'var(--search-bg)', borderRadius: 7, padding: 2 }}>
                      <button className="ox-btn" style={{ height: 26, padding: '0 10px', ...(filterDraft.join !== 'or' ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : { background: 'transparent' }) }} onClick={() => setFilterDraft((d) => ({ ...d, join: 'and' }))}>{T('كل الشروط', 'All')}</button>
                      <button className="ox-btn" style={{ height: 26, padding: '0 10px', ...(filterDraft.join === 'or' ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : { background: 'transparent' }) }} onClick={() => setFilterDraft((d) => ({ ...d, join: 'or' }))}>{T('أي شرط', 'Any')}</button>
                    </div>
                  )}
                </div>
                {conds.map((c, i) => c.op === 'preset' ? (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ flex: 1, height: 34, display: 'flex', alignItems: 'center', padding: '0 10px', borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12.5, fontWeight: 600 }}>⚡ {presetLabel(c.a, isAr)}</span>
                    <button className="ox-btn" style={{ width: 32, height: 34, justifyContent: 'center', color: C.red }} onClick={() => rmCond(i)}>✕</button>
                  </div>
                ) : (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                    <select value={c.op} onChange={(e) => updCond(i, { op: e.target.value })} style={selOpStyle}>
                      {ops.map((o) => <option key={o.v} value={o.v}>{isAr ? o.ar : o.en}</option>)}
                    </select>
                    {opNeedsValue(c.op) && <input className="ox-fld" type={valInput} style={{ flex: 1, minWidth: 90, height: 34 }} value={c.a || ''} dir="auto" onChange={(e) => updCond(i, { a: e.target.value })} placeholder={T('قيمة', 'value')} />}
                    {c.op === 'between' && <input className="ox-fld" type={valInput} style={{ flex: 1, minWidth: 90, height: 34 }} value={c.b || ''} dir="auto" onChange={(e) => updCond(i, { b: e.target.value })} placeholder={T('إلى', 'to')} />}
                    <button className="ox-btn" style={{ width: 32, height: 34, justifyContent: 'center', color: C.red }} onClick={() => rmCond(i)}>✕</button>
                  </div>
                ))}
                <button className="ox-btn" style={{ height: 32, marginBottom: 16 }} onClick={addCond}>＋ {T('أضف شرطاً', 'Add condition')}</button>

                {/* قائمة القيم */}
                <div style={{ ...secLbl, justifyContent: 'space-between' }}>
                  <span>☑ {T('القيم', 'Values')}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx4)' }}>{enNum(allVals.length)} {T('قيمة', 'values')}</span>
                </div>
                <input className="ox-fld" placeholder={T('ابحث في القيم…', 'Search values…')} value={filterDraft.q || ''} dir="auto"
                  onChange={(e) => setFilterDraft((d) => ({ ...d, q: e.target.value }))} style={{ marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button className="ox-btn" style={{ height: 28 }} onClick={() => setFilterDraft((d) => ({ ...d, values: null }))}>{T('تحديد الكل', 'Select all')}</button>
                  <button className="ox-btn" style={{ height: 28 }} onClick={() => setFilterDraft((d) => ({ ...d, values: [] }))}>{T('إلغاء الكل', 'Clear all')}</button>
                </div>
                <div className="ox-scrolly" style={{ overflowY: 'auto', maxHeight: 220, border: '1px solid var(--bd)', borderRadius: 9, padding: 4 }}>
                  {shown.length === 0 && <div style={{ padding: 14, textAlign: 'center', color: 'var(--tx4)', fontSize: 12 }}>{T('لا قيم', 'No values')}</div>}
                  {shown.map((v) => (
                    <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 9px', borderRadius: 7, cursor: 'pointer', fontSize: 12.5, color: 'var(--tx2)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-soft)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                      <input type="checkbox" checked={isChecked(v)} onChange={() => toggle(v)} style={{ width: 15, height: 15, accentColor: C.gold, flexShrink: 0 }} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
                      <span style={{ fontSize: 10.5, fontFamily: MONO, color: 'var(--tx4)' }}>{enNum(counts.get(v))}</span>
                    </label>
                  ))}
                </div>
          </Modal>
        )
      })()}

      {/* ── نافذة إجمالي العمود ── */}
      {aggModal && (() => {
        const col = colDefs.get(aggModal)
        return (
          <Modal open onClose={() => setAggModal(null)} closeOnOverlay lang={lang} accent={C.gold} width={400}
            title={`${T('إجمالي العمود', 'Column total')} — «${col ? (isAr ? col.ar : col.en) : ''}»`}
            subtitle={T('يظهر في صف الإجماليات أسفل الجدول', 'Shown in the totals row at the bottom')}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {AGGS.map((a) => (
                <button key={a.v} className="ox-btn" style={{ height: 36, ...((aggMap[aggModal] || '') === a.v ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent-bd)' } : {}) }}
                  onClick={() => { setAgg(aggModal, a.v); setAggModal(null) }}>{isAr ? a.ar : a.en}</button>
              ))}
            </div>
          </Modal>
        )
      })()}

      {/* ── نافذة كلمة سر العمود ── */}
      {pwModal && (() => {
        const colDef = colDefs.get(pwModal.key)
        const submit = () => {
          if (pwModal.mode === 'set') { if (!pwInput.trim()) return; setProtect(pwModal.key, pwInput.trim()); toast && toast(T('تم تفعيل الحماية', 'Protection enabled')); setPwModal(null) }
          else { if (tryUnlock(pwModal.key, pwInput)) { setPwModal(null) } else { toast && toast(T('كلمة السر غير صحيحة', 'Wrong password')) } }
        }
        return (
          <Modal open onClose={() => setPwModal(null)} closeOnOverlay lang={lang} accent={C.gold} width={400}
            title={`${pwModal.mode === 'set' ? T('حماية العمود بكلمة سر', 'Protect column') : T('إظهار العمود', 'Reveal column')} — «${colDef ? (isAr ? colDef.ar : colDef.en) : ''}»`}
            subtitle={pwModal.mode === 'set' ? T('ستُخفى قيم العمود حتى تُدخل كلمة السر (حماية خفيفة للعرض)', 'Values hidden until the password is entered (light view protection)') : T('أدخل كلمة السر لإظهار القيم', 'Enter the password to reveal values')}
            footer={<ActionButton Icon={Save} disabled={!pwInput.trim()} onClick={submit}>{pwModal.mode === 'set' ? T('تفعيل', 'Enable') : T('إظهار', 'Reveal')}</ActionButton>}>
            <input className="ox-fld" type="password" value={pwInput} onChange={(e) => setPwInput(e.target.value)} autoFocus dir="ltr"
              onKeyDown={(e) => { if (e.key === 'Enter') submit() }} />
          </Modal>
        )
      })()}

      {/* ── نافذة إضافة صف ── */}
      {addOpen && (
        <Modal open onClose={() => setAddOpen(false)} closeOnOverlay lang={lang} accent={C.gold} width={440} scroll
          title={T('إضافة صف جديد', 'Add new row')} subtitle={T('صف يدوي — كل خلاياه قابلة للتحرير', 'Manual row — all cells editable')}
          footer={<ActionButton Icon={Save} disabled={busy} onClick={addPerson}>{busy ? T('...', '...') : T('إضافة', 'Add')}</ActionButton>}>
          {(view.addFields || []).map((f) => (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tx2)', marginBottom: 6 }}>{isAr ? f.ar : f.en}</label>
              <input className="ox-fld" type={f.type === 'date' ? 'date' : 'text'}
                value={addForm[f.key] || ''} onChange={(e) => setAddForm((s) => ({ ...s, [f.key]: e.target.value }))}
                dir={f.type === 'date' || f.key === 'id_number' ? 'ltr' : undefined} autoFocus={f === (view.addFields || [])[0]} />
            </div>
          ))}
        </Modal>
      )}

      {/* ── معرض صورة العامل (نقر على المصغّرة يفتحها مكبّرة) ── */}
      {photoView && ReactDOM.createPortal(
        <div onClick={() => setPhotoView(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.78)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, maxWidth: '92vw', maxHeight: '92vh' }}>
            <img src={photoView.url} alt=""
              style={{ maxWidth: '86vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 14, border: '2px solid rgba(176,125,0,.5)', boxShadow: '0 12px 48px rgba(0,0,0,.55)', background: '#111' }} />
            {photoView.name && <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, fontFamily: F, textShadow: '0 1px 4px rgba(0,0,0,.6)' }}>{photoView.name}</div>}
            <button onClick={() => setPhotoView(null)}
              style={{ marginTop: 2, height: 36, padding: '0 20px', borderRadius: 9, border: '1px solid rgba(176,125,0,.5)', background: 'rgba(176,125,0,.18)', color: '#f5deb3', fontSize: 13, fontWeight: 600, fontFamily: F, cursor: 'pointer' }}>
              {T('إغلاق', 'Close')}
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

const cellBase = {
  height: ROW_H, display: 'flex', alignItems: 'center', padding: '0 10px', position: 'relative',
  // فاصل عمودي واضح بين كل الأعمدة (شبكة كإكسل) يبقى مهما أُعيد ترتيب/إخفاء الأعمدة، وخط صفوف أخف
  borderInlineEnd: '1px solid rgba(176,125,0,.22)', borderBottom: '1px solid var(--bd2)',
  fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  boxSizing: 'border-box', userSelect: 'none',
}
