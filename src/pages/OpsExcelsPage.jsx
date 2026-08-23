import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { can as canPerm, cardVisible, canCardBtn, hasPerm } from '../lib/permissions.js'
import { Modal, ActionButton, Dropdown, CalendarPopup } from '../components/ui/FormKit.jsx'
import OpsChatPanel, { useOpsChat, cellMarkKey } from '../components/OpsChat.jsx'
import { buildAjeerContractBookmarklet, buildAjeerNoticeBookmarklet, buildAjeerSecondmentBookmarklet, buildAjeerSecondmentInvoiceBookmarklet, buildAjeerEligibilityScanBookmarklet, buildAjeerTraceBookmarklet } from './ajeerRequestBookmarklet.js'
import { Save, Trash2 } from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════════
   «جداول العمل» (كان اسمها «اكسلات العمليات») — تبويب رئيسي مستقلّ.
   ملاحظة: مفاتيح التخزين والكود (view_key · ops_sheet_* · OpsExcelsPage) بقيت
   على `ops` عمداً — تسميةُ واجهةٍ لا تُهاجَر لها بياناتٌ محفوظة.

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

/* ── اللقطات الأسبوعية ────────────────────────────────────────────────────────
   المزامنة تُعاد كل أسبوع، والمستخدم يريد حالة كل أسبوع محفوظة يرجع لها. تُخزَّن
   في `ops_sheet_snapshots` (صف لكل view_key × أسبوع) = صفوف المزامنة كما كانت
   + طبقة الإدخال اليدوي وقتها. **الأسبوع يبدأ يوم الجمعة** (طلب صريح)، وقيد
   CHECK على الجدول يرفض أي week_start ليس جمعة.                              */
const WEEK_START_DOW = 5   // getDay(): 0=الأحد … 5=الجمعة

// بداية الأسبوع (الجمعة) الذي يقع فيه التاريخ — بالتوقيت المحلي، كنص YYYY-MM-DD.
const weekStartOf = (d) => {
  const x = new Date(d || Date.now())
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - ((x.getDay() - WEEK_START_DOW + 7) % 7))
  const p = (n) => String(n).padStart(2, '0')
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`
}

// «أسبوع الجمعة 2026-08-14 → الخميس 2026-08-20» بصيغة مختصرة للمنتقي.
const weekLabel = (ws, isAr) => {
  const a = new Date(ws + 'T00:00:00')
  const b = new Date(a); b.setDate(b.getDate() + 6)
  const p = (n) => String(n).padStart(2, '0')
  const f = (x) => `${p(x.getMonth() + 1)}-${p(x.getDate())}`
  return isAr ? `أسبوع ${ws} (${f(a)} ← ${f(b)})` : `Week ${ws} (${f(a)} → ${f(b)})`
}

/* الصفوف تحمل أحياناً قيماً غير قابلة للتحويل إلى JSON — أبرزها `_validInvoices`
   وهو Set يُلحَق بكل صف في عرض السعودة. JSON.stringify يحوّل الـSet إلى `{}`،
   فيصير الحارس `row._validInvoices && row._validInvoices.has(...)` صادقاً بلا
   دالة has → انهيار عند عرض اللقطة. لذلك تُحذف هذه المفاتيح قبل التخزين. */
const snapClean = (rows) => (rows || []).map((r) => {
  if (!r || typeof r !== 'object') return r
  let drop = null
  for (const k of Object.keys(r)) {
    const v = r[k]
    if (v instanceof Set || v instanceof Map || typeof v === 'function') (drop ||= []).push(k)
  }
  if (!drop) return r
  const out = { ...r }
  for (const k of drop) delete out[k]
  return out
})

const latin = (s) => String(s ?? '')
  .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
  .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
const ymd = (v) => (v ? String(v).slice(0, 10) : '')
/* روابط المرفقات الموروثة من Bubble تصل **بلا بروتوكول** — «//cdn…/f…/VISA.pdf» —
   فتُفهَم مساراً نسبياً داخل التطبيق لو وُضعت في href كما هي. */
const docUrl = (v) => { const s = String(v ?? '').trim(); return s.startsWith('//') ? 'https:' + s : s }
/* أحدث تاريخ بين عدة أختام مزامنة (نص ISO أو null) — القيم بصيغة ISO فالمقارنة النصّية كافية */
const maxDate = (...vs) => vs.filter(Boolean).map(String).sort().pop() || ''
const enNum = (n) => Number(n || 0).toLocaleString('en-US')
const newKey = () => 'm_' + ((globalThis.crypto?.randomUUID?.()) || (Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36)))
const yn = (v, isAr) => (v == null ? '' : (v ? (isAr ? 'نعم' : 'Yes') : (isAr ? 'لا' : 'No')))
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/* حالة الالتزام في مدد تصل بالإنجليزية من الواجهة — تُعرَّب حين تكون لغة البرنامج
   عربية (كل الأعمدة التي تقرأها: شيت «مدد» و«المنشآت تفصيلي»). */
const MUDAD_STATUS_AR = { compliant: 'ملتزمة', noncompliant: 'غير ملتزمة', suspended: 'خدمات موقفة' }
const mudadStatus = (v, isAr) => {
  if (v == null || v === '') return ''
  const s = String(v).trim()
  return isAr ? (MUDAD_STATUS_AR[s.toLowerCase()] || s) : s
}
/* فترة الأجور تصل مضغوطة «202607» — تُفصَل السنة عن الشهر «2026-07» (نفس ترتيب
   YYYY-MM-DD المعتمد في كل الصفحات، فيبقى الفرز النصّي زمنياً صحيحاً). */
const mudadPeriod = (v) => {
  const s = latin(String(v ?? '')).trim()
  if (!/^\d{6}$/.test(s)) return s
  const m = Number(s.slice(4, 6))
  return (m >= 1 && m <= 12) ? `${s.slice(0, 4)}-${s.slice(4, 6)}` : s
}
/* خلفية حالة الالتزام: ملتزمة أخضر · غير ملتزمة أحمر (نفس تدرّج بقية أعمدة
   الحالة في الشبكة). تُقرأ من القيمة الخام لا المعروضة كي تعمل بالعربي وبالإنجليزي. */
const mudadStatusBg = (shown, raw) => {
  const s = String(shown ?? '').trim().toLowerCase() || String(raw ?? '').trim().toLowerCase()
  if (s === 'compliant' || s === 'ملتزمة' || s === 'ملتزم') return 'rgba(46,204,113,.32)'
  if (s === 'noncompliant' || s === 'غير ملتزمة' || s === 'غير ملتزم') return 'rgba(232,114,101,.32)'
  return null
}
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
/* ── نقطة رأس العمود: لونان لا خمسة ─────────────────────────────────────────
   قاعدة المستخدم في البرنامج كلّه: **الذهبي = قيمةٌ تُجلب من مكانٍ آخر** (فاتورة
   · منشأة · مزامنة · صيغة) فلا تُدخَل بيد، و**السماوي = خانةٌ يكتب فيها الموظف**.
   كان الدليل يفرّق بين مصادر الجلب بأربعة ألوان، وهو تمييزٌ لا يغيّر شيئاً في
   عمل الموظف: ما يعنيه أمام كل عمود هو «هل أكتب هنا أم لا». المفاتيح القديمة
   تبقى مفهومة (تخطيطات محفوظة وأعمدة تحمل `source`) وتُحَلّ إلى الذهبي. */
const COL_SRC = {
  fetched: { ar: 'مجلوب — لا يُدخَل', en: 'Fetched — read-only', color: '#D4A017' },
  entry: { ar: 'إدخال', en: 'Entry', color: '#06b6d4' },
}
const COL_SRC_ALIAS = { sync: 'fetched', invoice: 'fetched', facility: 'fetched', formula: 'fetched' }
/* نقطة سؤال المحادثة على الخليّة/العمود: **رصاصي = مفتوح** (ساكنٌ ينتظر جواباً)
   · **أخضر = أُجيب عنه**. الأزرق كان يزاحم معناه في الشبكة (تجاوز المزامنة). */
const CHAT_DOT = { open: '#94a3b8', done: 'rgba(46,204,113,.85)' }
const srcKeyOf = (k) => (COL_SRC[k] ? k : (COL_SRC_ALIAS[k] || 'fetched'))
/* ── انضباط الألوان في الشبكة ─────────────────────────────────────────────────
   القاعدة: **خلفية الخليّة للتنبيه، ورأسُ العمود للتصنيف.** الأعمدة التي لا
   تُكتب بيد (تُجلب · تُختَم · تُملأ) كانت تُصبغ سماويةً في **كل خليّة**، فتبتلع
   نصف الجدول ويضيع معها الأحمر والأخضر اللذان يعنيان شيئاً. صارت السماوية على
   **الرأس وحده** (مع ⟳ ونقطة المصدر)، والخليّة تُعرف بنصّها الأهدأ — فالتصنيف
   يُقرأ مرّة في الأعلى، والتنبيه يُقرأ حيث وقع. */
/* غسلةُ «هذه ليست خانة إدخال»: **رماديّة محايدة** لا لوناً دلالياً — تقول للعين
   إن الخليّة تُجلب ولا تُكتب، بلا أن تزاحم الأحمر والأخضر والذهبي التي تعني
   أشياء بعينها. تقع تحت أي تنبيه (التنبيه يغلبها)، ولا تُلبَس للأعمدة التي
   تُملأ تلقائياً **وتُحرَّر** (`filled`) — تلك يكتب فيها المستخدم فعلاً. */
const READONLY_BG = 'rgba(150,138,120,.10)'
/* «لا يكتبه المستخدم بيده» أوسع من `auto`: منه ما يُختَم آلياً ويُقفل (`readOnly`:
   وقت الطلب · مسدِّد الطلب)، ومنه ما **يُملأ تلقائياً ويبقى قابلاً للتصحيح**
   (`filled`: اسم العامل وإقامته ومدّته من الفاتورة · مقدّم الطلب من المستخدم).
   الثلاثة تشترك في الخلفية السماوية لأن سؤال الموظف واحد: أهذا عليّ أن أكتبه؟ */
const autoLike = (col) => !!(col && (col.auto || col.readOnly || col.filled))
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
/* سعوديّ في مشتركي التأمينات: الجنسية «السعودية» (⚠️ اسم البلد لا «سعودي» كما في
   قوى) — واحتياطاً مَن لا إقامة له ويحمل هوية وطنية تبدأ بـ1. غير السعودي يحمل
   `iqama_no` ولا يحمل `national_id` (مؤكَّد: 2277 سعودياً كلهم بهوية بلا إقامة). */
const isSaudiContributor = (w) => {
  const nat = String(w?.nationality_ar || '')
  if (/سعودي/.test(nat)) return true
  const nid = latin(String(w?.national_id || '')).trim()
  return !w?.iqama_no && nid.startsWith('1')
}
/* ── «الشخص» = الحساب الذي زامن الصف ─────────────────────────────────────────
   جداول المزامنة الخام (مدد · أجير) تحمل `person_id` وحده، فيُحلّ لاسمه ولونه من
   `sync_persons` (جدول صغير يُقرأ مرّة لكل تحميل). العمود واحد في كل الشيتات —
   نفس المفتاح والعنوان ولون الشخص خلفيةً — كي يُقرأ صاحب المزامنة بالطريقة
   نفسها أينما ظهر (نفس منطق أعمدة الحسابات في «الاشتراكات»). */
async function attachSyncPerson(sb, rows) {
  const { data } = await sb.from('sync_persons').select('id,name_ar,name_en,color')
  const pmap = new Map((data || []).map((p) => [p.id, p]))
  return rows.map((r) => {
    const p = pmap.get(r.person_id)
    return {
      ...r,
      sync_person: p ? (p.name_ar || p.name_en || '') : '',
      sync_person_en: p ? (p.name_en || p.name_ar || '') : '',
      sync_color: p ? (p.color || '') : '',
    }
  })
}
const SYNC_PERSON_COL = {
  ...personBgCol('sync_person', 'الشخص', 'Synced by', 'sync_color'),
  get: (r, isAr) => (isAr ? r.sync_person : (r.sync_person_en || r.sync_person)) || '',
}

/* ── اسم المنشأة عند تعارض الجهات = اسم **المركز السعودي للأعمال** ────────────
   كل بوابة تحمل اسمها المسجَّل عندها، وقد يتخلّف عن السجل التجاري (اسمُ مالكٍ
   قديم مثلاً بعد تغيّر الاسم). السجل التجاري هو المرجع النظامي، فيفوز اسمه على
   اسم مدد/أجير حين يختلفان، ويبقى اسم الجهة احتياطياً لمن لا سجلَّ له عندنا.
   الربط بالرقم الوطني الموحّد (`cr_national_number`)، والاسم الأصلي يبقى في
   الصف (`r.name`) فيظلّ البحث به ناجحاً. */
async function sbcNameMap(sb) {
  const src = await fetchAll(sb, 'sbc_facilities', 'cr_national_number,entity_full_name_ar,entity_full_name_en,last_synced_at')
  const m = new Map()
  for (const s of src) {
    const k = s.cr_national_number
    if (!k) continue
    const prev = m.get(k)
    if (!prev || String(s.last_synced_at || '') > String(prev.last_synced_at || '')) m.set(k, s)
  }
  return m
}
async function attachSbcName(sb, rows, unifiedOf) {
  const m = await sbcNameMap(sb)
  return rows.map((r) => {
    const s = m.get(unifiedOf(r))
    return s ? { ...r, sbc_name_ar: s.entity_full_name_ar || '', sbc_name_en: s.entity_full_name_en || '' } : r
  })
}
const sbcName = (r, isAr, fallback) => {
  const n = isAr ? (r.sbc_name_ar || r.sbc_name_en) : (r.sbc_name_en || r.sbc_name_ar)
  return String(n || '').trim() || String(fallback || '').trim()
}
/* الصيغة العامّة: يُعلن العرضُ `sbcName: { unified, field }` فيتولّى المحرّك
   استبدال حقل اسم المنشأة بعد `load` — بلا لمس أعمدة العرض، فيتبعه الفرز
   والتصفية والدمج والتصدير تلقائياً. الاسم القديم يُحفَظ في `_orig_facility`
   ويلحقه البحث الشامل، فمن يعرف اسم المنصّة القديم يجد صفّه. */
async function applySbcName(sb, rows, cfg) {
  if (!cfg || !rows.length) return rows
  const m = await sbcNameMap(sb)
  const { unified, field } = cfg
  return rows.map((r) => {
    const s = m.get(String(unified(r) ?? ''))
    const n = String((s && (s.entity_full_name_ar || s.entity_full_name_en)) || '').trim()
    if (!n) return r
    const cur = String(r[field] ?? '').trim()
    if (!cur || n === cur) return r
    return { ...r, [field]: n, _orig_facility: cur }
  })
}

/* ── عمود الفرع: واحدٌ في كل الشيتات ─────────────────────────────────────────
   لون المكتب واسمه وشكله (رمزٌ فوق واسمٌ تحته) لا يصحّ أن يختلف من جدول لآخر —
   العين تحفظ اللون فتقرأ به المكتب بلا قراءة. فيُبنى كل عمود فرعٍ من هذا المصنع
   مهما اختلف مفتاحه في العرض. والعمود متعدّد الفروع («JUB1، KHB1») يأخذ لون
   أوّلها ويعرضها كما هي.
   ⚠️ يُعرَّف هنا — قبل `WFC` — لأن أعمدتها تُبنى منه لحظة تحميل الملف. وجسدُه
   يشير إلى دوالّ أسفله، وذلك سليم: لا تُستدعى إلا وقت الرسم. */
const branchCol = (base) => ({
  kind: 'text', w: 150, ...base,
  get: (r) => srBranchText(r[base.key]),
  bg: (v, r) => srBranchBg(String(r[base.key] || '').split(/[،,]/)[0].trim()),
  fg: () => 'var(--tx)',
})

/* ── الجوال في عشر خانات ────────────────────────────────────────────────────
   الأرقام تصل من الحسبات ومركز المزامنة بتسع خانات «5xxxxxxxx» بلا الصفر،
   والمعروف عند الناس والمكتوب في كل ورقة هو «05xxxxxxxx». نُطبّع **العرض** ولا
   نمسّ المخزَّن: الصفر يُضاف لتسع خاناتٍ لا تبدأ به، ومفتاح الدولة (966 أو
   00966) يُنزع أولاً. مطبَّق على كل عمود جوال في كل الشيتات — لا في نقل الكفالة
   وحده — فالخانة الواحدة لا تختلف صورتها بين جدول وآخر. */
const phone10 = (v) => {
  let d = latin(String(v ?? '')).replace(/\D/g, '')
  if (!d) return ''
  if (d.length >= 12) d = d.replace(/^(00)?966/, '')
  return (d.length === 9 && d[0] !== '0') ? '0' + d : d
}
const phoneCol = (base) => ({ kind: 'mono', w: 130, ...base, get: (r) => phone10(r[base.key]) })

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
/* ⚠️ الرقم يجب أن يكون رقماً **كاملاً** لا بادئةً من نصّ مركّب: `parseFloat` يقف
   عند أول حرفٍ غير رقمي، فكان «2026-07» و«2026-08-15» يعودان بـ**2026** — فتتساوى
   كل التواريخ وكل الفترات في الفرز والتجميع والتنسيق الشرطي، ويبدو الفرز معطّلاً
   (شهر 7 ثم 6 ثم 7 لنفس السنة). فمن لم يكن كلّه رقماً يُردّ null ليتولّاه
   `cfDate` أو المقارنة النصّية (وهي تُرتّب YYYY-MM وYYYY-MM-DD زمنياً بطبعها). */
const cfNum = (s) => {
  const t = latin(String(s ?? '')).replace(/[^\d.\-]/g, '')
  if (!/^-?\d*\.?\d+$/.test(t)) return null
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : null
}
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

/* شهادات السجل التجاري المُزامَنة: ملفٌ واحد لكل منشأة باسم `{الموحّد}-ar.pdf`
   في مجلّد `documents/sbc-cr-certificates` (النسخ القديمة تحت `_versions/`
   فلا تظهر في سرد المستوى الأول). نسرد المجلّد مرّة واحدة عند تحميل الشيت —
   1121 شهادة من 3890 ملفاً — بدل فحص HEAD لكل صف كما تفعل صفحة المنشأة
   المفردة. المخرَج: Map من الرقم الموحّد إلى الرابط العام. */
const CR_DIR = 'sbc-cr-certificates'
async function listCrCertificates(sb) {
  const map = new Map()
  try {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await sb.storage.from('documents')
        .list(CR_DIR, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } })
      if (error) throw error
      for (const o of (data || [])) {
        if (!o.name.endsWith('-ar.pdf')) continue
        const cr = o.name.slice(0, -'-ar.pdf'.length)
        map.set(cr, sb.storage.from('documents').getPublicUrl(`${CR_DIR}/${o.name}`).data.publicUrl)
      }
      if (!data || data.length < 1000) break
    }
  } catch { /* تعذّر سرد المخزن — العمود يظهر فارغاً بدل كسر الشيت كلّه */ }
  return map
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
  fac_branch: branchCol({ key: 'facility_branches', ar: 'فرع المنشأة', en: 'Facility branch', w: 150 }),
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
  branch: branchCol({ key: 'branch_code', ar: 'الفرع', en: 'Branch', w: 150 }),
  worker_branch: branchCol({ key: 'branch_code', ar: 'فرع العامل', en: 'Worker branch', w: 150 }),
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
/* خلية ملفات للقراءة فقط (kind:'files'): تعرض مرفقات جاهزة قادمة من النظام —
   بخلاف FileCell التي ترفع ملفاً وتخزّن رابطه كقيمة الخلية. تُستعمل لإيصالات
   الحوالات البنكية المربوطة بالدفعة: أيقونة لكل ملف تفتحه في تبويب جديد،
   واسم الملف في التلميح لأن عرض العمود لا يتّسع له. */
/* عارض المرفقات: المرفق يُفتح **داخل الصفحة** لا في تبويب جديد — الخروج من
   الشيت لرؤية إيصال يعني فقدان مكانك فيه والرجوع بإعادة تحميل. النوع يُعرف من
   الـmime أو من امتداد الاسم (الرفع القديم قد لا يحمل mime). */
const fvKind = (f) => {
  const m = String((f && f.mime) || '').toLowerCase()
  const n = String((f && (f.name || f.url)) || '').toLowerCase().split('?')[0]
  if (m.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(n)) return 'image'
  if (m === 'application/pdf' || /\.pdf$/.test(n)) return 'pdf'
  return 'other'
}
/* النقر يفتح العارض، لكن `href` يبقى موضوعاً: Ctrl/الوسطى/«فتح في تبويب» تعمل
   كأي رابط — من أراد تبويباً منفصلاً فله ذلك. */
const fvOpen = (e, onView, url, name, mime) => {
  e.stopPropagation()
  if (!onView || e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return
  e.preventDefault()
  onView({ url, name: name || fileNameOf(url), mime: mime || '' })
}

function FilesCell({ files, isAr, onView }) {
  const list = Array.isArray(files) ? files.filter((f) => f && f.u) : []
  if (!list.length) return <span style={{ color: 'var(--tx4)', fontSize: 11.5 }}>—</span>
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap', overflow: 'hidden' }}>
      {list.map((f, i) => {
        const img = String(f.m || '').startsWith('image/')
        return (
          <a key={i} href={f.u} target="_blank" rel="noopener noreferrer"
            title={f.n || (isAr ? 'إيصال الحوالة' : 'Transfer receipt')}
            onClick={(e) => fvOpen(e, onView, f.u, f.n, f.m)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 3, height: 21, padding: '0 7px',
              borderRadius: 999, fontSize: 11, fontWeight: 600, fontFamily: F, textDecoration: 'none',
              whiteSpace: 'nowrap', border: '1px solid rgba(93,173,226,.35)', background: 'rgba(93,173,226,.12)', color: '#5dade2' }}>
            {img ? '🖼' : '📄'}{list.length > 1 && <span style={{ fontFamily: MONO, opacity: .75 }}>{i + 1}</span>}
          </a>
        )
      })}
    </span>
  )
}

/* خلية عدّة ملفات (kind:'multifile'): القيمة نصّ JSON لمصفوفة {n,u,m}.
   تتسامح مع رابط مفرد قديم مخزَّن كنصّ، فلا تضيع بيانات سابقة. */
const mfParse = (v) => {
  if (!v) return []
  if (Array.isArray(v)) return v
  const s = String(v).trim()
  if (s.startsWith('[')) { try { const a = JSON.parse(s); return Array.isArray(a) ? a.filter((x) => x && x.u) : [] } catch { return [] } }
  return s.startsWith('http') ? [{ n: s.split('/').pop(), u: s }] : []
}

/* خلية نصّ طويل (kind:'longtext'): محرّر الشبكة سطر واحد، والحقل هنا قد يحمل
   عشر رسائل بنكية — رسالة لكل دفعة. الخلية تعرض أول سطر مع عدّاد الرسائل،
   والتحرير يفتح نافذة textarea. كل سطر غير فارغ = رسالة. */
const ltLines = (v) => String(v ?? '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean)

/* `unit === false` = الأسطر ليست وحداتٍ مستقلة بل نصّ واحد مقسَّم (رسالة بنك
   من ستة أسطر ليست ستّ رسائل). عندها يُعرض دليل «فيه المزيد» بدل عدّاد كاذب. */
function LongTextCell({ value, isAr, unit }) {
  const lines = ltLines(value)
  if (!lines.length) return <span style={{ color: 'var(--tx4)', fontSize: 11.5 }}>—</span>
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, width: '100%', overflow: 'hidden' }}
      title={isAr ? 'نقر مزدوج لعرض النصّ كاملاً' : 'Double-click to view the full text'}>
      {lines.length > 1 && unit === false && (
        <span style={{ flexShrink: 0, width: 18, height: 17, borderRadius: 999, fontSize: 10, fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid rgba(93,173,226,.35)', background: 'rgba(93,173,226,.12)', color: '#5dade2' }}>⤢</span>
      )}
      {lines.length > 1 && unit !== false && (
        <span title={isAr ? `${lines.length} رسائل` : `${lines.length} messages`}
          style={{ flexShrink: 0, minWidth: 18, height: 17, padding: '0 5px', borderRadius: 999, fontSize: 10,
            fontWeight: 600, fontFamily: MONO, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(93,173,226,.35)', background: 'rgba(93,173,226,.12)', color: '#5dade2' }}>
          {lines.length}
        </span>
      )}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'start' }}>{lines[0]}</span>
    </span>
  )
}

function MultiFileCell({ value, busy, canEdit, isAr, onPick, onRemove, onView }) {
  const inRef = useRef(null)
  const list = mfParse(value)
  const chip = {
    display: 'inline-flex', alignItems: 'center', gap: 3, height: 21, padding: '0 7px', borderRadius: 999,
    fontSize: 11, fontWeight: 600, fontFamily: F, textDecoration: 'none', whiteSpace: 'nowrap', border: '1px solid',
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
      <input ref={inRef} type="file" multiple style={{ display: 'none' }}
        onChange={(e) => { const fs = [...(e.target.files || [])]; e.target.value = ''; fs.forEach((f) => onPick(f)) }} />
      {list.map((f, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
          <a href={f.u} target="_blank" rel="noopener noreferrer" title={f.n || ''} onClick={(e) => fvOpen(e, onView, f.u, f.n, f.m)}
            style={{ ...chip, borderColor: 'rgba(46,204,113,.35)', background: 'rgba(46,204,113,.12)', color: '#2ecc71' }}>
            {String(f.m || '').startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(f.n || '') ? '🖼' : '📄'}
            <span style={{ fontFamily: MONO, opacity: .75 }}>{i + 1}</span>
          </a>
          {canEdit && (
            <button onClick={(e) => { e.stopPropagation(); onRemove(i) }} title={isAr ? 'حذف' : 'Remove'}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--tx4)', fontSize: 11, padding: '0 2px' }}>✕</button>
          )}
        </span>
      ))}
      {busy && <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{isAr ? '… يرفع' : '… uploading'}</span>}
      {canEdit && !busy && (
        /* الخليّة الفارغة: زرّ الرفع بلا إطار — الإطار صندوقٌ يعلو خلفية الخليّة
           فيجعل خانةً إلزامية فارغة تبدو بلونٍ غير لون أخواتها الإلزامية. ومتى
           كان فيها مرفق عاد الإطار ليفصل الزرّ عن الشارات. */
        <button onClick={(e) => { e.stopPropagation(); inRef.current?.click() }}
          title={isAr ? 'أضف ملفاً (يمكن اختيار عدّة ملفات)' : 'Add file(s)'}
          style={{ ...chip, cursor: 'pointer', borderColor: list.length ? 'var(--bd)' : 'transparent', background: 'transparent', color: 'var(--tx3)' }}>＋</button>
      )}
      {!list.length && !canEdit && <span style={{ color: 'var(--tx4)', fontSize: 11.5 }}>—</span>}
    </span>
  )
}

function FileCell({ url, busy, canEdit, isAr, onPick, onClear, onView }) {
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
        onMouseDown={(e) => e.stopPropagation()} onClick={(e) => fvOpen(e, onView, url, fileNameOf(url), '')}
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

/* ── أرقام المنشأة الثلاثة: يُكتب واحد فيُملأ الباقي ─────────────────────────
   المنشأة تُعرف بثلاثة أرقام (الموحّد · التأمينات · الموارد) واسمها، وهي مبعثرة
   على جداول شتّى: السجل الداخلي `facilities` وما تجلبه المزامنة من التأمينات
   والسجل التجاري وقوى ومدد وأجير ومقيم — ومنشأةٌ غائبةٌ عن الأول قد تكون في
   الثاني. فالفهرس `v_facility_numbers` يجمعها كلها في هويّةٍ واحدة لكل منشأة،
   ويعطي `keys` = كل رقمٍ رآه أي جدولٍ لها. نفهرسها هنا بكل مفتاحٍ منها، فيقع
   البحث **بأي رقمٍ من الثلاثة** ويُملأ الباقي.

   العرض يُلحق `facNumStamp` بـ`autoStamp` فيعمل في أي شيت فيه هذه الأعمدة —
   وهو ختمٌ لا دهس: ما كُتب أو جاء من النظام يبقى، ولا يُملأ إلا الفارغ. */
const FAC_NUM = { by: new Map() }
const facNumKey = (v) => String(v ?? '').replace(/\D/g, '')
/* أيّ سجلٍّ يفوز حين يشير رقمٌ واحد إلى أكثر من منشأة (خطأ إدخالٍ قديم يُبادل
   الموحّد بالتأمينات): الأصحّ شكلاً ثم الأغنى حقولاً — لا أوّل من وصل. */
const facNumRank = (f) => (/^7\d{9}$/.test(facNumKey(f.unified)) ? 8 : 0)
  + (f.gosi ? 2 : 0) + (f.hrsd ? 2 : 0) + (f.name ? 1 : 0)
async function loadFacNums(sb) {
  const rows = await fetchAll(sb, 'v_facility_numbers', 'unified_number,gosi_number,hrsd_number,name_ar,sources,keys')
  const m = new Map()
  for (const r of rows) {
    const rec = {
      unified: r.unified_number || '', gosi: r.gosi_number || '',
      hrsd: r.hrsd_number || '', name: r.name_ar || '', sources: r.sources || '',
    }
    for (const k of [...(r.keys || []), r.unified_number, r.gosi_number, r.hrsd_number]) {
      const key = facNumKey(k); if (!key) continue
      const cur = m.get(key)
      if (!cur || facNumRank(rec) > facNumRank(cur)) m.set(key, rec)
    }
  }
  FAC_NUM.by = m
}
const facNumOf = (v) => { const k = facNumKey(v); return k ? (FAC_NUM.by.get(k) || null) : null }
/* عمود الشبكة → حقل الهويّة. اسم المنشأة هدفٌ يُملأ ولا يُبحث به: الأسماء
   تتكرّر بين منشآت المالك الواحد فلا تدلّ على واحدة بعينها. */
const FAC_NUM_COLS = { unified_number: 'unified', gosi_number: 'gosi', hrsd_number: 'hrsd', facility_ar: 'name' }
const facNumStamp = (row, ctx) => {
  const c = ctx || {}
  if (c.col === 'facility_ar' || !FAC_NUM_COLS[c.col] || !c.val) return null
  const f = facNumOf(c.val); if (!f) return null
  const out = {}
  for (const k in FAC_NUM_COLS) {
    const v = f[FAC_NUM_COLS[k]]
    if (k === c.col || !v || av(row, k)) continue
    out[k] = v
  }
  return out
}
/* رقمٌ لا تعرفه أيّ منشأة في أيّ جدول — أحمر، فيعرف الموظف لماذا لم يُملأ
   الباقي (خطأ رقمٍ، أو منشأة لم تُزامَن بعد) بدل أن يظنّ التعبئة معطّلة. */
const facNumFg = (v) => (String(v ?? '').trim() && !facNumOf(v) ? C.red : undefined)

/* ── سجلّ العروض ─────────────────────────────────────────────────────────────
   kind: text | mono | date
   ops:true    → عمود تشغيلي يُحرَّر دائماً (كل الصفوف)
   manual:true → يُحرَّر فقط في الصفوف اليدوية (لا معنى لتعديله في المُزامَن)
   get(row)    → قيمة مشتقّة للعرض (قراءة فقط للصفوف المُزامَنة)                 */
/* ── متابعة الإيداعات ────────────────────────────────────────────────────────
   نقل ملف «متابعة_الإيداعات.xlsx» (ورقة لكل مكتب + لوحة ملخّص) إلى شيت واحد
   مدموج بالمكتب. صف = مكتب × يوم.

   المستحق والحوالة **يُجلبان تلقائياً من الفواتير** (قرار المستخدم):
     المستحق  = دفعات «نقد» لفواتير المكتب ذلك اليوم        ← v_ops_office_deposits.cash_total
     الحوالة  = دفعات «حوالة بنكية»                          ← bank_total (تُتابَع مستقلّة)
   مُتحقَّق مقابل الإكسل: DMM3 07-16 = 4800/3000 · JUB5 07-16 = 23100/8500 · JUB5 08-08 = 22000.

   اليدوي الوحيد: «المبلغ المودع» و«ملاحظات» (طبقة overlay المعتادة).
   والباقي (مرحّل من أمس · إجمالي المستحق · تم الإيداع؟ · المتبقي · الحالة)
   سلسلة متتابعة عبر الأيام تُحسب في `derive` — لا يمكن التعبير عنها بمحرّك
   الصيغ لأنه لا يرى إلا صفّه (لا مراجع عبر الصفوف).                          */
/* بداية المتابعة = أول يوم معبّأ في أوراق الإكسل الخمس كلها (7/15/26)، لا أول
   الشهر. الفرق جوهري: النظام فيه نقد محصَّل بين 07-01 و07-14 (~286 ألف عبر
   المكاتب الخمسة) لم تُسجَّل له إيداعات لأن المتابعة لم تكن بدأت — فالبدء من
   07-01 كان سيخترع متأخرات وهمية تتراكم عبر كل الأيام التالية. الرصيد الافتتاحي
   في ورقة الإكسل نفسها «-» أي صفر عند بدء المتابعة. */
const DEP_START = '2026-07-15'
const DEP_DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const DEP_DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
// نتائج السلسلة لكل صف — تُملأ في derive وتقرأها الأعمدة (نفس نمط SDE_REF)
const DEP_REF = { calc: new Map() }
const depNum = (v) => { const n = Number(String(v ?? '').replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : 0 }
// «-» بدل الصفر تماماً كورقة الإكسل — الصفر البصري ضجيج في شيت مالي
const depMoney = (n) => (!n ? '-' : enNum(n))

/* قائمة أيام YYYY-MM-DD من DEP_START حتى `endYmd`.
   المدى ينتهي **باليوم** لا بشهر قادم: الأيام المستقبلية الفارغة كانت ذيلاً من
   عشرات الصفوف الفارغة تحت آخر يوم فيه حركة. و`endYmd` تُحسب كأقصى من (اليوم،
   آخر يوم فيه دفعات، آخر يوم فيه إدخال محفوظ) — فلا يختفي صفٌّ فيه بيانات لو
   سُجّلت دفعة أو إدخال بتاريخ مستقبلي. */
const depDateSpine = (endYmd) => {
  const p = (n) => String(n).padStart(2, '0')
  const end = new Date(endYmd + 'T00:00:00')
  const out = []
  for (const d = new Date(DEP_START + 'T00:00:00'); d <= end; d.setDate(d.getDate() + 1)) {
    out.push({ ymd: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, dow: d.getDay() })
  }
  return out
}
// تاريخ اليوم محلياً بصيغة YYYY-MM-DD — يُقرأ عند كل استدعاء فينتقل الافتراضي
// لليوم التالي وحده عند تغيّر اليوم، بلا إعادة تحميل
const todayYmd = () => { const p = (n) => String(n).padStart(2, '0'); const d = new Date(); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` }
const depToday = todayYmd

/* السلسلة المتتابعة لكل مكتب. تقرأ «المودع» من الـoverlay ومن التعديلات غير
   المحفوظة معاً، فالمتبقّي والمرحّل يتحدّثان لحظة الكتابة لا بعد الحفظ. */
const depDerive = (rows, edits) => {
  const calc = new Map()
  const byOffice = new Map()
  // القيمة الفعّالة لعمود إدخال: التعديل غير المحفوظ أولاً ثم المحفوظ
  const entry = (r, k) => depNum((edits && edits[r._id] && edits[r._id][k] !== undefined)
    ? edits[r._id][k]
    : (r._ops && r._ops[k]))
  for (const r of rows) {
    if (!r || !r.branch_code) continue
    if (!byOffice.has(r.branch_code)) byOffice.set(r.branch_code, [])
    byOffice.get(r.branch_code).push(r)
  }
  for (const list of byOffice.values()) {
    list.sort((a, b) => String(a.dep_date).localeCompare(String(b.dep_date)))
    let carry = 0
    let lateDays = 0   // كم يوماً متتالياً وهذا المتأخّر قائم (يُصفَّر عند السداد)
    for (const r of list) {
      const due = depNum(r.dep_due)
      const paid = entry(r, 'dep_paid')
      // التسوية تُطفئ فرقاً لن يُودَع (فرق قديم، دفعة بأثر رجعي، خطأ إسناد فرع…).
      // بدونها يبقى أي فرق مرحّلاً إلى ما لا نهاية فيصبغ كل الأيام التالية أحمر.
      const adj = entry(r, 'dep_adjust')
      const total = due + carry
      const rem = total - paid - adj
      lateDays = rem > 0 ? lateDays + 1 : 0
      // لا يوم مستحق ⇒ لا حالة (شرطة، كالإكسل). وإلا: كامل / مسوّى / جزئي / لم يتم.
      const idle = total <= 0 && paid <= 0 && adj === 0
      // عدد أيام التأخير يُلحَق بالنص كي يقرأه المستخدم بلا حساب ذهني.
      // ⚠️ ألوان الحالة تُقرأ من الحرف الأول لا من النص كاملاً (انظر depStatusBg).
      const late = lateDays > 1 ? ` · ${lateDays} أيام` : ''
      calc.set(r._id, {
        carry,
        total,
        paid,
        adj,
        rem,
        lateDays,
        ok: idle ? '—' : (rem <= 0 ? 'نعم' : 'لا'),
        status: idle ? '—'
          : rem > 0 ? ((paid > 0 ? '◐ جزئي' : '✗ لم يتم') + late)
          : (adj !== 0 && paid <= 0) ? '⊘ مسوّى'   // أُغلق بتسوية لا بإيداع
          : '✓ تم بالكامل',
      })
      // يُرحَّل كما هو (حتى السالب = رصيد فائض للمكتب). القصّ عند الصفر كان
      // «ينسى» الفائض ويكسر المطابقة: مع الترحيل الكامل يصير رصيد آخر يوم
      // مساوياً تماماً لـ(مجموع المستحق − مجموع المودع)، وهي الحسبة التي
      // يعتمد عليها شريط الملخّص.
      carry = rem
    }
  }
  DEP_REF.calc = calc
}

/* ملخّص المكتب. الأعمدة المتتابعة (المرحّل/الإجمالي/المتبقي) لا يصحّ جمعها
   عمودياً — المبلغ غير المدفوع يتكرّر في كل يوم تالٍ فيتضاعف الناتج مرات.
   الرقم الصحيح للمتبقي هو رصيد آخر يوم = مجموع المستحق − مجموع المودع. */
const depSummary = (rows, isAr) => {
  let due = 0, paid = 0, bank = 0, late = 0, adj = 0
  let dutyDays = 0, clearedDays = 0
  for (const r of rows) {
    due += depNum(r.dep_due)
    bank += depNum(r.dep_bank)
    const c = DEP_REF.calc.get(r._id)
    if (!c) continue
    adj += c.adj
    paid += c.paid
    // «أيام بلا إيداع» = يوم **حصّل فيه المكتب نقداً** ولم يُودِع شيئاً. الشرط على
    // مستحق اليوم نفسه لا على الإجمالي: الإجمالي يحمل المتأخّر مرحّلاً، فكانت
    // الأيام الفارغة اللاحقة (وكل أيام المدى المستقبلية) تُعدّ متأخرة بلا معنى.
    if (depNum(r.dep_due) > 0) {
      dutyDays++                          // يوم عليه واجب إيداع
      if (c.rem <= 0) clearedDays++       // أُقفل بالكامل في حينه
      if (c.paid <= 0) late++
    }
  }
  const out = due - paid - adj
  const duty = dutyDays ? Math.round((clearedDays / dutyDays) * 100) : 100
  /* سلسلة الأيام النظيفة = كم يوماً مضى منذ آخر يوم أُقفل وعليه متأخّر. تُحسب
     رجوعاً من آخر يوم: أي متأخّر قائم يكسر السلسلة فوراً (لأنه يُرحَّل يومياً). */
  const sorted = [...rows].sort((a, b) => String(b.dep_date).localeCompare(String(a.dep_date)))
  let streak = 0
  for (const r of sorted) {
    const c = DEP_REF.calc.get(r._id)
    if (!c || c.rem > 0) break
    streak++
  }
  return [
    { label: isAr ? 'إجمالي المستحق' : 'Total due', value: enNum(due) },
    { label: isAr ? 'إجمالي المودع' : 'Total deposited', value: enNum(paid) },
    ...(adj ? [{ label: isAr ? 'تسويات' : 'Adjustments', value: enNum(adj), tone: 'warn' }] : []),
    { label: isAr ? 'المتبقي الآن' : 'Outstanding now', value: enNum(out), tone: out > 0 ? 'bad' : 'good' },
    { label: isAr ? 'نسبة الالتزام' : 'Compliance', value: enNum(duty) + '%',
      tone: duty >= 95 ? 'good' : duty >= 80 ? 'warn' : 'bad' },
    { label: isAr ? 'أيام متتالية بلا متأخرات' : 'Clean-day streak', value: enNum(streak),
      tone: streak >= 7 ? 'good' : streak ? 'warn' : 'bad' },
    { label: isAr ? 'حوالات بنكية' : 'Bank transfers', value: enNum(bank) },
    { label: isAr ? 'أيام بلا إيداع' : 'Days with no deposit', value: enNum(late), tone: late ? 'warn' : 'good' },
  ]
}
const depGet = (r, k) => { const c = DEP_REF.calc.get(r && r._id); return c ? c[k] : undefined }
/* لون الحالة من **الحرف الأول** لا من النص كاملاً — النص يحمل عدد أيام التأخير
   («✗ لم يتم · ٤ أيام») فمطابقة النص الكامل كانت ستكسر التلوين. */
const DEP_STATUS_BG = {
  '✓': 'rgba(46,204,113,.20)',
  '⊘': 'rgba(155,140,225,.22)',   // بنفسجي: أُغلق بقرار إداري لا بإيداع
  '◐': 'rgba(212,160,23,.22)',
  '✗': 'rgba(232,114,101,.20)',
}
const depStatusBg = (v) => DEP_STATUS_BG[String(v || '').charAt(0)] || undefined

/* تدرّج التأخير: أصفر في اليوم الأول ← أحمر كامل عند عشرة أيام. اللون وحده
   يكفي لفرز الشبكة بصرياً بلا قراءة أرقام. */
const depLateBg = (days) => {
  if (!days || days <= 0) return undefined
  const t = Math.min(1, (days - 1) / 9)
  const mix = (a, b) => Math.round(a + (b - a) * t)
  return `rgba(${mix(212, 232)},${mix(160, 114)},${mix(23, 101)},${(0.14 + 0.22 * t).toFixed(2)})`
}
// أسباب التسوية — قائمة مغلقة كي تكون قابلة للفرز والإحصاء لاحقاً
const DEP_ADJ_REASONS = [
  'فرق ما قبل بدء المتابعة',
  'دفعة سُجّلت بأثر رجعي',
  'خطأ إسناد فرع',
  'حوالة بنكية غير مسجّلة',
  'مصروف/خصم من المكتب',
  'فاتورة ملغاة أو مرتجعة',
  'أخرى',
]

/* ── دفتر السدادات ───────────────────────────────────────────────────────────
   نقل «amr.xlsx» (٥ دفاتر أستاذ: ٤ مكاتب + بنك الأهلي) إلى شيت واحد بأزرار
   لكل حساب. صف = حركة (سحب/إيداع) على حساب السداد.

   كل الصفوف يدوية (overlay) — لا مصدر مزامنة لهذه الحركات؛ فـ`load` يُرجع [].
   و«الرصيد بعد العملية» **يُحسَب** ولا يُكتب: في الإكسل كان عموداً يدوياً، وأي
   تعديل في مبلغ قديم كان يترك كل الأرصدة بعده خاطئة بصمت.
   مُتحقَّق عند الاستيراد: الرصيد المحسوب طابق آخر رصيد مكتوب في الإكسل بفرق
   صفر في الحسابات الخمسة كلها. */
const SD_NA = 'NA'   // حساب لم يُحدَّد بعد
const SD_ACCOUNTS = [
  { key: 'JUB5', label: 'الجبيل - المدرسة' },
  { key: 'KHB1', label: 'الخبر - الصبيخة' },
  { key: 'KHB2', label: 'الخبر - الثقبة' },
  { key: 'DMM3', label: 'الدمام - سيكو' },
  { key: 'AHLI', label: 'بنك الأهلي' },
]
/* «لم تُحدَّد بعد» — مجموعة في شيت الطلبات وحده، لا في الدفتر.
   طلبات السجلات (قيد مؤسسة/شركة، تحويل، حجز اسم) لا مكتب لها تُصرف منه ساعة
   تُطلَب، فتُجمَّع هنا حتى يقرّر المحاسب الحساب ويكتبه في عمود «حساب السداد» —
   وعندها ينتقل الطلب لمجموعة حسابه ويُرحَّل للدفتر. ولا يُرحَّل قبل ذلك (انظر
   srPostToLedger): حركة بلا حساب تفسد رصيد أي دفتر تُنسب إليه.
   وهي غائبة عن تبويبات الدفتر لأن لا شيء يُرحَّل إليها أصلاً؛ وجودها هناك تبويب
   ميت يوحي بحساب حقيقي مكشوف. */
/* حسابات الدفتر التي يجوز أن تُرحَّل إليها حركة — يُفحص بها الحساب المشتقّ قبل
   الترحيل: حركةٌ بحسابٍ لا تبويب له في الدفتر تختفي عن العين ولا تدخل رصيداً. */
const SD_ACCT_KEYS = new Set(SD_ACCOUNTS.map((a) => a.key))
/* ── تبويبا الطلبات: «المكاتب» و«لم تُحدَّد بعد» ────────────────────────────────
   المكاتب كانت تبويباً لكل مكتب، والمحاسب يسدّد لها جميعاً في يوم واحد — فكان
   يفتح خمسة جداول ليرى عمل يومه. جُمعت في جدول واحد. أمّا «لم تُحدَّد بعد» فتبقى
   مستقلّة: أعمدتها أخرى (سجلات لا عمّال) وأغراضها أخرى، ودمجها يخلط جدولين. */
const SR_TAB_OFFICES = 'OFFICES'
const SR_TABS = [
  { key: SR_TAB_OFFICES, label: 'المكاتب' },
  { key: SD_NA, label: 'لم تُحدَّد بعد' },
]
/* مجموعة الصف: «لم تُحدَّد بعد» تُختَم في `sr_office` عند الإنشاء، وما عداها من
   المكاتب. والصفّ **الفارغ تماماً** وحده يبقى بلا مجموعة كي يظهر صفّ الإدخال
   الجاهز في أي تبويب فُتح — ولو أُعطي الفراغُ مجموعةً لظهر كل صفّ مكتبٍ في
   تبويب السجلات أيضاً. (تُستدعى بصفّ كامل أو ببيانات وحدها.) */
const srTabOf = (r) => {
  const o = (r && r._ops) || r || {}
  const v = o.sr_office || ''
  if (v === SD_NA) return SD_NA
  return (v || Object.keys(o).length) ? SR_TAB_OFFICES : ''
}
/* ما يُختَم في `sr_office` عند الكتابة في صفّ جديد: «لم تُحدَّد بعد» وحدها —
   طلبات المكاتب لم يعد لها عمود حساب، فحسابها يُشتقّ من فرع فاتورتها (srAcct). */
const srTabStamp = (t) => (t === SD_NA ? SD_NA : '')
/* أغراض السداد المرصودة في الإكسل — قائمة مغلقة تبقى قابلة للفرز والإحصاء.
   مكوّنات **تجديد الإقامة** تأتي مباشرة بعده: هي سداداتٌ تُطلَب معاً في فاتورة
   واحدة، فتجاورها في القائمة يوفّر تنقّلاً في كل صفّ من صفوف التجديد. */
const SD_PURPOSES = [
  'إصدار إقامة', 'تجديد إقامة', 'اشتراك مقيم', 'نقاط مقيم', 'اشتراك قوى', 'رخصة عمل', 'تأمين طبي',
  // «كرت عمل» صار «رخصة عمل» و«تأمين» صار «تأمين طبي» — اسمان لشيء واحد، دُمجا
  // في الاسم الرسمي وحُوِّلت حركات الدفتر القديمة إليه (727 حركة، 2026-08-16)
  'إصدار تأشيرة', 'توكيل التأشيرة',
  'نقل الخدمات', 'عقد أجير', 'إعارة أجير',
  'إصدار تأشيرة خروج وعودة', 'تمديد تأشيرة خروج وعودة', 'إلغاء الخروج النهائي', 'تغيير مهنة',
  'تصديق مطبوعات', 'طلب مفتوح', 'دفع مديونيات منشأة',
  'جوازات', 'حجز اسم تجاري', 'استرداد', 'أخرى',
]
/* أغراض فاتورة تجديد الإقامة — **قائمتها وحدها** متى كانت الفاتورة تجديداً (قرار
   المستخدم): التجديد يُسدَّد بمكوّناته هذه لا بغيرها، وإتاحة البقيّة تفتح باب
   غرضٍ لا يقع في تجديد. */
const SD_RENEWAL_PURPOSES = ['تجديد إقامة', 'اشتراك مقيم', 'نقاط مقيم', 'اشتراك قوى', 'رخصة عمل', 'تأمين طبي']
// اسم الخدمة كما يرد من فاتورة النظام (99 فاتورة في الإنتاج)
const SR_RENEWAL_SERVICE = 'تجديد الإقامة'
/* وقائمةٌ لكل خدمةٍ لها أغراضها المحصورة — تُقرأ باسم الخدمة كما يرد من الفاتورة.
   خروج وعودة: تأشيرتها أو استردادُ رسمها، ولا ثالث لهما. */
/* أغراض **التأشيرة بإقامة**: إصدارها وتوكيلها ثم مكوّنات إقامة العامل بعدها.
   وثلاثةُ أشهر تستثني ما لا يقع فيها: التأمين الطبي ورخصة العمل وإصدار الإقامة
   ونقاط مقيم — مدّتها أقصر من أن تستلزمها. */
const SD_VISA_PURPOSES = ['إصدار تأشيرة', 'توكيل التأشيرة', 'تأمين طبي', 'رخصة عمل',
  'إصدار إقامة', 'اشتراك قوى', 'اشتراك مقيم', 'نقاط مقيم', 'استرداد']
const SD_VISA_3M_PURPOSES = ['إصدار تأشيرة', 'توكيل التأشيرة', 'اشتراك قوى', 'اشتراك مقيم', 'استرداد']
const SD_PURPOSES_BY_SERVICE = {
  [SR_RENEWAL_SERVICE]: SD_RENEWAL_PURPOSES,
  'خروج وعودة': ['إصدار تأشيرة خروج وعودة', 'تمديد تأشيرة خروج وعودة', 'استرداد'],
  // أسماء الخدمات كما ترد من فاتورة النظام حرفاً بحرف
  'تأشيرة بإقامة 12 شهر': SD_VISA_PURPOSES,
  'تأشيرة بإقامة 9 أشهر': SD_VISA_PURPOSES,
  'تأشيرة بإقامة 6 أشهر': SD_VISA_PURPOSES,
  'تأشيرة بإقامة 3 شهور': SD_VISA_3M_PURPOSES,
  // نقل الكفالة: نقل الخدمات ثم ما يترتّب عليه من إقامة العامل واشتراكاته
  'نقل كفالة': ['نقل الخدمات', 'تأمين طبي', 'رخصة عمل', 'اشتراك قوى', 'اشتراك مقيم', 'نقاط مقيم'],
  'عقد أجير': ['عقد أجير', 'إعارة أجير'],
  'الغرفة التجارية': ['تصديق مطبوعات', 'طلب مفتوح'],
  'تأمين طبي': ['تأمين طبي'],
  'تغيير المهنة': ['تغيير مهنة'],
  'الموافقة للنقل الخارجي': ['اشتراك قوى'],
  'تعديل الراتب': ['دفع مديونيات منشأة'],
  'خروج نهائي': ['اشتراك مقيم', 'إلغاء الخروج النهائي'],
  'طباعة الإقامة': ['اشتراك مقيم', 'نقاط مقيم'],
  // «عام» ليست هنا عمداً: خدمةٌ بلا حدّ ⇒ القائمة الكاملة بما فيها «أخرى»
}
/* ── المفوتر لكل غرض ──────────────────────────────────────────────────────────
   مستخرَج من قروب السداد نفسه (تصدير محادثة الواتساب، ٥٠٧ رسالة بنك): الرمز
   يقوله البنك في «مفوتر NNN»، ومعناه يُعرف من الرسائل المرافقة والمبالغ الثابتة:
     085 مقيم        — الاشتراك 57.50 · باقة النقاط 1265 · «SADAD MUQEEM» (263 مرة)
     368 قوى         — الاشتراك 1075.25 ثابتاً · «سداد طلب الاشتراك» (82)
     050 الموارد     — رخصة العمل 2425 لثلاثة أشهر · كرت التنازل 100 · «الجهة:
                       وزارة الموارد البشرية والتنمية الاجتماعية» (60)
     199 أجير        — 69 للعقد ومضاعفاتها (47)
     903 التأمين الطبي — أقساط غير منتظمة · «تم سداد التأمين» (47)
     001 الإنترنت · 002 الكهرباء — مصروفات المكتب لا خدمات العملاء
   وأغراض **وزارة الداخلية** (تجديد إقامة · إصدار إقامة · نقل كفالة · تأشيرة ·
   خروج وعودة · جوازات) تصل برسالة أخرى: «مدفوعات وزارة الداخلية … الجهة خدمات
   المقيمين … الخدمة تجديد إقامة» — بلا رقم مفوتر أصلاً، فيُقال اسم الجهة وحده.
   (رمزٌ واحد `279` ورد مرّة يتيمة ولم تُعرف جهته، فلم يُدرَج.)                  */
const SD_MOI = 'وزارة الداخلية'
const SD_BILLERS = {
  'اشتراك مقيم': ['085', 'مقيم'],
  'نقاط مقيم': ['085', 'مقيم'],
  'اشتراك قوى': ['368', 'قوى'],
  'رخصة عمل': ['050', 'الموارد البشرية'],
  'تأمين طبي': ['903', 'التأمين الطبي'],
  'أجير': ['199', 'أجير'],
  'عقد أجير': ['199', 'أجير'],
  'إعارة أجير': ['199', 'أجير'],
  'نقل الخدمات': ['', SD_MOI],
  'إصدار إقامة': ['', SD_MOI],
  'تجديد إقامة': ['', SD_MOI],
  'نقل كفالة': ['', SD_MOI],
  'تأشيرة': ['', SD_MOI],
  'إصدار تأشيرة': ['', SD_MOI],
  'إصدار تأشيرة خروج وعودة': ['', SD_MOI],
  'إلغاء الخروج النهائي': ['', SD_MOI],
  'تمديد تأشيرة خروج وعودة': ['', SD_MOI],
  'تأشيرة خروج وعودة': ['', SD_MOI],
  'جوازات': ['', SD_MOI],
}
/* سطران لا نقطة فاصلة: الرقم أساسٌ (هو ما يُدخَل في بوابة سداد) واسم الجهة تحته
   أهدأ — «085 · مقيم» في سطرٍ واحد يُقرأ عبارةً واحدة، والعين تحتاج الرقم وحده. */
const srBiller = (d) => {
  const b = SD_BILLERS[String((d || {}).sr_purpose || '').trim()]
  return b ? (b[0] ? `${b[0]}\n${b[1]}` : b[1]) : ''
}
/* ── رصيد مقيم ونقاطه ────────────────────────────────────────────────────────
   سؤالٌ يسبق السداد: **هل يلزم السداد أصلاً؟** في تجديد الإقامة يُنظر إلى رصيد
   العامل في مقيم (رصيد الجوازات) — فقد يكفي الرسم أو بعضه. وفي نقاط مقيم يُنظر
   إلى رصيد نقاط **المنشأة** — فلا تُشترى باقةٌ ورصيدها قائم.
   المصدر مركز المزامنة (مقيم)، فيُذيَّل بتاريخ آخر مزامنة: رصيدٌ قديمٌ يُقرأ
   قراراً وهو خبرٌ منقضٍ. */
const SD_MUQ_RESIDENT = 'تجديد إقامة'
const SD_MUQ_POINTS = 'نقاط مقيم'
const srMuqeem = (d, isAr) => {
  const o = d || {}
  const p = String(o.sr_purpose || '').trim()
  // السطر الثاني تاريخُ المزامنة وحده بلا كلمة تعرّفه — موضعه تحت الرصيد يقوله
  const stamp = (s) => { const t = ymd(s); return t ? `\n${t}` : '' }
  /* الفراغ لا يقول شيئاً: قد يعني «رصيده صفر» وقد يعني «لم يُزامَن بعد» — وهما
     قراران مختلفان. فيُقال الثاني صراحةً حين لا يوجد للعامل (أو المنشأة) صفٌّ في
     مقيم أصلاً. (مقيم فيه 2,423 عاملاً برصيد؛ من ليس فيه لا رصيد له يُقرأ.) */
  const unsynced = isAr ? 'غير مُزامَن في مقيم' : 'not synced in Muqeem'
  if (p === SD_MUQ_RESIDENT) {
    const iq = String(o.sr_iqama || srInvOf(o, 'worker_iqama') || '').replace(/\D/g, '')
    if (!iq) return ''
    const m = SR_REF.muqRes.get(iq)
    if (!m) return unsynced
    return `${enNum(m.bal)} ${isAr ? 'ريال' : 'SAR'}${stamp(m.at)}`
  }
  if (p === SD_MUQ_POINTS) {
    const un = String(o.sr_unified || srInvOf(o, 'unified_number') || '').replace(/\D/g, '')
    if (!un) return ''
    const m = SR_REF.muqCo.get(un)
    if (!m) return unsynced
    return `${enNum(m.pts)} ${isAr ? 'نقطة' : 'pts'}${stamp(m.at)}`
  }
  return ''
}
/* أغراض «لم تُحدَّد بعد» — سدادات السجلات التجارية. قائمة مستقلة لأن أغراض
   المكاتب (إقامة/نقل كفالة/…) لا تقع فيها أصلاً، وخلطهما يجعل القائمة ركاماً. */
// مرتَّبة على تسلسل دورة السجل لا على الحروف: اسم ← مؤسسة ← تحويل ← شركة
const SD_NA_PURPOSES = [
  'حجز اسم تجاري', 'قيد سجل مؤسسة', 'تجديد سجل مؤسسة', 'تحويل مؤسسة لشركة',
  'قيد سجل شركة', 'تجديد سجل شركة', 'رخصة البلدية', 'شهادة السلامة', 'أخرى',
]
/* أسماءٌ قديمة في حركات الدفتر المستورَدة: لم تعد تُنتقى في الطلبات (فُصِّلت إلى
   إصدارٍ وتمديد)، لكنها باقية على ١٢٦ حركة — فتبقى في قائمة الدفتر وإلا بدت
   خارجها عند تحرير حركةٍ قديمة. */
const SD_LEGACY_PURPOSES = ['تأشيرة خروج وعودة', 'تأشيرة', 'أجير', 'نقل كفالة']
/* الدفتر يقبل الاثنين: الطلب المرحَّل يحمل غرضه معه، وغرض سجلٍ يصل بعد أن
   يُسنَد لحسابه فلا بد أن يبقى ضمن قائمة الدفتر وإلا بدا خارجها عند التحرير. */
const SD_ALL_PURPOSES = [...SD_PURPOSES, ...SD_LEGACY_PURPOSES,
  ...SD_NA_PURPOSES.filter((p) => !SD_PURPOSES.includes(p))]
const SD_KINDS = ['سحب', 'ايداع']
/* حسابات بلا رصيد جارٍ: يُخفى عمود الرصيد وبطاقته ويُعرض المجموع بدلاً منه.
   «لم تُحدَّد بعد» ليست من تبويبات الدفتر أصلاً، لكن تبقى هنا حارساً: لو تسرّبت
   حركة بلا حساب إلى الدفتر يوماً، تُجمَع ولا يُحسب لها رصيد يوحي بحساب مكشوف. */
const SD_FEED_ACCOUNTS = new Set([SD_NA, ''])
const SD_REF = { calc: new Map(), finals: new Map() }

/* الرصيد الجاري لكل حساب. الترتيب بالتاريخ ثم `sd_seq` (تسلسل الصف في الإكسل)
   كي يطابق ترتيب الحركات داخل اليوم الواحد؛ الصفوف الجديدة بلا تسلسل تأتي
   بعدها في نفس اليوم. */
const sdDerive = (rows, edits) => {
  const calc = new Map()
  const val = (r, k) => ((edits && edits[r._id] && edits[r._id][k] !== undefined) ? edits[r._id][k] : (r._ops && r._ops[k]))
  const byAcct = new Map()
  for (const r of rows) {
    const a = val(r, 'sd_account') || ''
    if (!byAcct.has(a)) byAcct.set(a, [])
    byAcct.get(a).push(r)
  }
  const finals = new Map()
  for (const [acct, list] of byAcct.entries()) {
    list.sort((a, b) => String(val(a, 'sd_date') || '').localeCompare(String(val(b, 'sd_date') || ''))
      || (depNum(val(a, 'sd_seq')) - depNum(val(b, 'sd_seq'))))
    const feed = SD_FEED_ACCOUNTS.has(acct)
    let bal = 0
    for (const r of list) {
      const amt = depNum(val(r, 'sd_amount'))
      const isIn = /ايداع|إيداع/.test(String(val(r, 'sd_kind') || ''))
      bal += isIn ? amt : -amt
      calc.set(r._id, { bal: feed ? null : bal, in: isIn ? amt : 0, out: isIn ? 0 : amt, feed })
    }
    // رصيد آخر حركة بالترتيب الزمني — مأخوذ من نهاية القائمة المرتَّبة نفسها،
    // لا بمقارنة مفاتيح نصّية في مكان آخر (مصدر خطأ سابق عند غياب التاريخ)
    finals.set(acct, feed ? null : bal)
  }
  SD_REF.calc = calc
  SD_REF.finals = finals
}
/* ── طلبات السداد ─────────────────────────────────────────────────────────────
   الطلب يبدأ من **رقم فاتورة النظام** لا من بيانات مفكّكة — فيرتبط السداد
   بالفاتورة والعميل والمنشأة والفرع، وتُقفل الحلقة بين المعاملة والمصروف.
   المنشأة والرقم الموحّد كانا مملوءين في ٣.٦٪ فقط، فبعد تعبئة
   `service_requests.facility_id` من جداول الطلبات صارا ٦٠٪ وأُدرجا هنا. */
const SR_REF = { inv: new Map(), days: new Map(), grp: new Map(), dup: new Map(), day: '', tab: '', prices: {}, fac: new Map(), branchLabel: new Map(), branches: [], muqRes: new Map(), muqCo: new Map(), wf: new Map() }
// المنشأة بالرقم الموحّد — منها يُملأ رقما التأمينات والموارد في طلبات التجديد
const srFac = (v) => SR_REF.fac.get(String(v ?? '').replace(/\D/g, ''))
/* اسم المكتب مع رمزه (`JUB5 · الجبيل - المدرسة`) — الرمز وحده لا يقول لمن الفاتورة.
   الأسماء من جدول الفروع لا من قائمة ثابتة (الفروع تُفتح وتُغلق، وفواتير قديمة
   تحمل فرعاً مغلقاً)، ولاحقة الترقيم «[5]» تُحذف لأن الرمز يقولها. */
/* لون لكل مكتب — الفرز البصريّ أسرع من قراءة الرمز في جدولٍ يجمع المكاتب كلها.
   الألوان تِنتات خفيفة (شفافية ~٢٠٪) فتعمل في الثيمين معاً ولا تطمس النصّ.
   والمكتب غير المعروف يأخذ لوناً مشتقّاً من رمزه — فأي فرع جديد يُلوَّن من تلقائه
   بلونٍ ثابت له لا يتبدّل بين الجلسات. */
/* ⚠️ ألوان **خارج لوحة النظام** عمداً: الذهبي والسماوي والأخضر والأحمر (وكل
   قريبٍ منه: وردي · فوشيا · عنّابي) والبنفسجي الفاتح والرمادي كلها تحمل معاني في
   هذا الجدول (تحديد · عمود تلقائي · أقلّ من الفاتورة · أكثر منها · صيغة · لا محلّ
   له) — فلو أخذها مكتبٌ لالتبس اللونان. هذه هويّات لا أحكام. */
/* الشدّة مرفوعة (~٣٥٪): العمود صار خلفيته صمّاء فوق أرضية الصفحة، والغسلة
   الخفيفة كانت تبهت فيها فلا تُفرَّق المكاتب بلمحة — وهي غرض العمود كلّه. */
const SR_BRANCH_PALETTE = [
  'rgba(75,61,196,.34)',    // نيلي
  'rgba(0,128,139,.36)',    // بترولي
  'rgba(107,122,47,.38)',   // زيتوني
  'rgba(139,90,43,.38)',    // بنّي
  'rgba(106,27,154,.30)',   // باذنجاني
  'rgba(58,110,96,.38)',    // طحلبي
  'rgba(30,60,120,.34)',    // كحلي
  'rgba(72,90,110,.40)',    // أردوازي
]
const SR_BRANCH_BG = {
  JUB5: SR_BRANCH_PALETTE[0],    // نيلي — الأكثر وروداً
  KHB1: SR_BRANCH_PALETTE[1],    // بترولي
  KHB2: SR_BRANCH_PALETTE[2],    // زيتوني
  DMM3: SR_BRANCH_PALETTE[3],    // بنّي
  RYD8: SR_BRANCH_PALETTE[4],    // باذنجاني
  JUB6: SR_BRANCH_PALETTE[5],    // طحلبي
  KHB102: SR_BRANCH_PALETTE[6],  // كحلي — فرع مغلق
  DMM4: SR_BRANCH_PALETTE[7],    // أردوازي
}
/* فرعٌ غير مذكور يأخذ لوناً من اللوحة نفسها بمفتاحٍ مشتقّ من رمزه — ثابت له عبر
   الجلسات، ويبقى خارج ألوان النظام (لا يُولَّد لونٌ عشوائي قد يقع على الذهبي). */
/* لون المكتب **لا يتأثّر بلون الصفّ**: تُسنَد الغسلة على أرضية الصفحة نفسها
   (طبقتان: التِنت فوق `--bg`) فتُغلق ما تحتها — وإلا اختلط لون المكتب بغسلة
   العملية أو بحمرة التكرار، فصار للمكتب الواحد لونان تُخطئهما العين. */
/* خلفيةٌ **صمّاء**: طبقةُ اللون فوق أرضية الصفحة، فتُغلق ما تحتها من غسلة الصفّ.
   تُستعمل حيث يجب أن يبقى اللون واحداً لا يتبدّل بجاره: هويّة المكتب · الحالة ·
   كتلة اليوم · رقم الفاتورة · عمود الترقيم. */
const solidBg = (tint) => `linear-gradient(${tint},${tint}), var(--bg)`
const srBranchBg = (code) => {
  const c = String(code ?? '').trim()
  if (!c) return undefined
  let tint = SR_BRANCH_BG[c]
  if (!tint) {
    let h = 0
    for (let i = 0; i < c.length; i++) h = (h * 31 + c.charCodeAt(i)) % 997
    tint = SR_BRANCH_PALETTE[h % SR_BRANCH_PALETTE.length]
  }
  return solidBg(tint)
}
const srBranchName = (v) => String(SR_REF.branchLabel.get(String(v ?? '').trim()) || '')
  .replace(/\s*\[\d+\]\s*$/, '').trim()
const srBranchText = (v) => {
  const code = String(v ?? '').trim()
  if (!code) return ''
  const name = srBranchName(code)
  // سطران: الرمز أساساً واسم المكتب تحته أهدأ (كعمود المفوتر)
  return name ? `${code}\n${name}` : code
}

/* المدّة من وقت الطلب إلى وقت السداد. تُحسب من **التاريخ والوقت** معاً: الساعة
   وحدها تنقلب سالبة متى سُدِّد الطلب في يوم تالٍ. وتُعرض ساعاتٍ ودقائق تتراكم
   (26س 10د) لا أياماً — سؤال «كم استغرق» جوابه مدّة لا تقويم. */
const srTook = (r, isAr) => {
  const o = (r && r._ops) || {}
  if (!o.sr_date || !o.sr_time || !o.sr_paid_time) return ''
  /* في العملية الجماعية تُحسب من **آخر** طلبٍ فيها: المحاسب لا يستطيع السداد قبل
     أن يكتمل آخر عامل في الفاتورة، فقياسُها من أوّلهم يحمّله انتظاراً ليس منه. */
  const g = srIsGrpPurpose(o) ? SR_REF.grp.get(srGrpKey(o)) : null
  const last = (g && g.n > 1 && g.last) ? g.last : `${o.sr_date}T${o.sr_time}:00`
  const t0 = new Date(last)
  const t1 = new Date(`${o.sr_paid_date || o.sr_date}T${o.sr_paid_time}:00`)
  const ms = t1 - t0
  if (!Number.isFinite(ms) || ms < 0) return ''      // بيانات غير متسقة: لا رقم مضلِّل
  return srDuration(Math.round(ms / 60000), isAr)
}
/* تُقرأ جملةً لا رمزاً: «ساعتان و35 دقيقة». والعربية تُميّز المفرد والمثنّى
   والجمع بالعدد (دقيقة · دقيقتان · 5 دقائق · 35 دقيقة)، والمثنّى هنا مرفوع
   لأنها عبارة قائمة بذاتها لا مفعول لفعل. والأجزاء الصفرية تُحذف — لا «0 ساعة». */
const arCount = (n, one, two, few, many) => (n === 1 ? one : n === 2 ? two : `${enNum(n)} ${n <= 10 ? few : many}`)
const srDuration = (mins, isAr) => {
  const h = Math.floor(mins / 60), m = mins % 60
  if (!isAr) return !mins ? 'under a minute' : [h ? `${h}h` : '', m ? `${m}m` : ''].filter(Boolean).join(' ')
  if (!mins) return 'أقل من دقيقة'
  const hh = h ? arCount(h, 'ساعة', 'ساعتان', 'ساعات', 'ساعة') : ''
  const mm = m ? arCount(m, 'دقيقة', 'دقيقتان', 'دقائق', 'دقيقة') : ''
  return hh && mm ? `${hh} و${mm}` : (hh || mm)
}
/* تسعيرة الأغراض: لكل غرض إمّا سعر ثابت أو نطاق (أدنى/أعلى). الثابت يُملأ في
   المبلغ فور اختيار الغرض، والنطاق يُترك للمستخدم ويُدقَّق: ما خرج عنه يُصبغ.
   تُخزَّن في layout.prices للشيت نفسه، فلا جدول جديد ولا صلاحيات جديدة. */
const srPriceOf = (purpose, qty) => {
  const p = SR_REF.prices[String(purpose || '').trim()]
  if (!p) return null
  const q = Math.max(1, depNum(qty) || 1)
  const fixed = depNum(p.v)
  if (p.mode === 'range') {
    const lo = depNum(p.min), hi = depNum(p.max)
    return (lo || hi) ? { lo: lo * q, hi: hi * q } : null
  }
  return fixed ? { lo: fixed * q, hi: fixed * q, fixed: fixed * q } : null
}
const SR_OVER_BG = 'rgba(232,114,101,.18)'   // أحمر: خرج أكثر مما دخل
const SR_UNDER_BG = 'rgba(46,204,113,.18)'   // أخضر: خرج أقلّ
/* ── مطابقة غرض السداد ببند تسعير الفاتورة ───────────────────────────────────
   الفاتورة مفصّلة ببنودها (تجديد الإقامة 162.5 · رخصة العمل 2425 · التأمين
   الطبي 500 · رسوم المكتب) — فالمقارنة الصحيحة لكل طلبٍ هي **ببنده** لا بإجمالي
   الفاتورة: سدادُ 300 على بندٍ سعره 162.5 خسارةٌ وإن بقي الإجمالي رابحاً.
   التطبيع يُسقط ما بين القوسين («(3 شهر)») وأل التعريف ويوحّد الهمزات والتاء
   المربوطة والألف المقصورة، فيلتقي «تجديد إقامة» بـ«تجديد الإقامة (3 شهر)». */
const arNorm = (s) => latin(String(s ?? ''))
  .replace(/\(.*?\)/g, ' ')
  .replace(/[إأآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ـ/g, '')
  .replace(/(^|\s)ال/g, '$1')
  .replace(/\s+/g, ' ').trim()
// الاسمان المدمجان يبقيان مقروءين في فواتير كُتبت بالاسم السابق
const SR_LINE_ALIAS = { 'رخصة عمل': ['كرت عمل'], 'تأمين طبي': ['تأمين'] }
const srLineAmt = (d) => {
  const o = d || {}
  const purpose = String(o.sr_purpose || '').trim()
  if (!purpose) return null
  const br = srInvOf(o, 'pricing_breakdown')
  if (!Array.isArray(br) || !br.length) return null
  const keys = [purpose, ...(SR_LINE_ALIAS[purpose] || [])].map(arNorm).filter(Boolean)
  for (const ln of br) {
    if (!ln || ln.discount) continue          // الخصم بندُ فاتورةٍ لا يُسدَّد
    const lab = arNorm(ln.label)
    if (!lab) continue
    if (keys.some((k) => lab === k || lab.includes(k) || k.includes(lab))) return depNum(ln.amount)
  }
  return null
}
/* التسعير المتوقَّع للغرض: من **التسعيرة** إن كان له فيها سعرٌ أو نطاق، وإلا من
   **بند الفاتورة** المقابل له. والسطر الثاني يسمّي المصدر. */
const srExpected = (d, isAr) => {
  const o = d || {}
  const p = srPriceOf(o.sr_purpose, o.sr_qty)
  if (p) {
    const one = p.fixed || (p.lo && p.hi && p.lo === p.hi ? p.lo : 0)
    const txt = one ? enNum(one) : [p.lo, p.hi].filter(Boolean).map(enNum).join(' – ')
    if (txt) return `${txt}\n${isAr ? 'التسعيرة' : 'price book'}`
  }
  const a = srLineAmt(o)
  return a ? `${enNum(a)}\n${isAr ? 'الفاتورة' : 'invoice'}` : ''
}
/* المبلغ **يُدخَل بيد** ولا يُشتقّ (قرار المستخدم): التسعير المتوقَّع معروضٌ في
   عموده للاسترشاد، لكن ما خرج فعلاً يقوله من دفعه — واشتقاقه يجعل رقماً لم يره
   أحد يصل الدفتر. */
const srAmountOf = (d) => depNum((d || {}).sr_amount)
/* مبلغ العملية كما قاله البنك — يُقرأ من رسالة السداد الملصقة. به يُتحقَّق من أن
   مجموع حصص العمّال يساوي ما خرج فعلاً: الفارق يكشف حصّةً ناقصة أو خاطئة. */
const srPaidRefAmt = (d) => {
  const m = latin(String((d || {}).sr_paid_ref || '')).match(/مبلغ\s*([\d.,]+)/)
  return m ? depNum(m[1].replace(/,/g, '')) : 0
}
/* المبلغ مقابل **التسعير المتوقَّع** المعروض في عموده — أياً كان مصدره:
   ١) التسعيرة إن كان للغرض فيها سعرٌ أو نطاق (فوق الأعلى أحمر · تحت الأدنى أخضر)،
   ٢) وإلا بند الفاتورة المقابل للغرض (أعلى منه أحمر · أقلّ أخضر).
   والمطابق — أو الواقع داخل النطاق — بلا لون، ولا متوقَّع أصلاً ⇒ بلا لون: رقمٌ
   لا مرجع له لا يُحكم عليه. */
/* تسامحُ ريالٍ واحد قبل التلوين: فروق التقريب والكسور (163 مقابل 162.50) ليست
   تجاوزاً يستحق تنبيهاً، وتلوينها يُفقد اللونَ معناه بكثرة تكراره. */
const SR_AMT_TOL = 1
const srAmtBg = (v, r) => {
  const o = (r && r._ops) || {}
  const n = depNum(v); if (!n) return undefined
  const p = srPriceOf(o.sr_purpose, o.sr_qty)
  if (p) {
    if (p.hi && n > p.hi + SR_AMT_TOL) return SR_OVER_BG
    if (p.lo && n < p.lo - SR_AMT_TOL) return SR_UNDER_BG
    return undefined
  }
  const line = srLineAmt(o)
  if (!line) return undefined
  if (n > line + SR_AMT_TOL) return SR_OVER_BG
  if (n < line - SR_AMT_TOL) return SR_UNDER_BG
  return undefined
}
/* ── السداد الجماعي ──────────────────────────────────────────────────────────
   فاتورة رخصة العمل أو التأمين قد تُسدَّد لأربعة عمّال **بعملية واحدة**: رقم سداد
   واحد ومبلغ واحد يخرج من الحساب، وحصّة كل عامل معروفة، وبعضهم قد لا فاتورة له.
   فالصفّ يبقى **لكل عامل** (فتُنسب حصّته لفاتورته ويُقاس ربحها) ويجمعهم **رقم
   السداد**: عنده تُرحَّل حركةٌ واحدة للدفتر بمجموع الحصص، فيطابق كشفَ البنك. */
/* المفتاح **رقم السداد وحده**: هو فاتورة الجهة وهي فريدة، فلا يحتاج تمييزاً
   بحساب. ⚠️ ولا يصحّ ضمّ الحساب إليه: العامل الذي لم تصدر فاتورته لا فرع له ولا
   حسابَ مشتقّاً، فينفصل عن إخوته وهو صاحبُ الحالة التي جُمعت لأجلها الصفوف.
   وحسابُ المجموعة يُؤخذ ممّن يعرفه منها (انظر srPostToLedger). */
const srGrpKey = (d) => String((d || {}).sr_sadad_no || '').trim() || srSadadOf(d)
/* والسدادُ الجماعي لا يقع إلا في **رخصة العمل والتأمين الطبي** — فاتورةُ الجهة
   فيهما تُصدَر لعدّة عمّال. أمّا غيرهما فرقمٌ يتكرّر إنما هو العامل نفسه يُدفع
   له مرّتين، ولو اختلفت فاتورته. */
const SD_GROUP_PURPOSES = new Set(['رخصة عمل', 'تأمين طبي'])
const srIsGrpPurpose = (d) => SD_GROUP_PURPOSES.has(String((d || {}).sr_purpose || '').trim())
// مَن يُميّز الصفّ داخل العملية: فاتورته وإلا إقامته
const srWhoKey = (d) => String((d || {}).sr_invoice || '').trim() || String((d || {}).sr_iqama || '').replace(/\D/g, '')
/* مفتاح فحص التكرار: في أغراض السداد الجماعي = رقم السداد + صاحبُ الصفّ (فتكرار
   الرقم لعمّالٍ مختلفين مشروع)، وفي غيرها = رقم السداد وحده. */
const srDupKey = (d) => {
  const no = srGrpKey(d); if (!no) return ''
  if (!srIsGrpPurpose(d)) return no
  const who = srWhoKey(d)
  return who ? `${no}|${who}` : ''
}
/* اليوم الذي سيأخذه أي صف جديد: اليوم المعروض، أو تاريخ اليوم في وضع «كل
   الأيام» (`all` مُرشِّح لا تاريخ — ختمه على صفّ كان يكتب `sr_date='all'`). */
const srDay = (day) => ((day && day !== 'all') ? day : todayYmd())
// وقت إدخال الطلب (٢٤ ساعة). يبقى قابلاً للتصحيح — الطلب قد يُقيَّد متأخّراً
const nowHm = () => { const d = new Date(); const p = (x) => String(x).padStart(2, '0'); return `${p(d.getHours())}:${p(d.getMinutes())}` }
// أغراض السداد تتبع حساب الصف — أو المجموعة المفتوحة إن كان الصف جاهزاً بلا حساب
/* طلبٌ بلا رقم فاتورة في تبويب المكاتب = عاملٌ ضمن **سدادٍ جماعي** لم تصدر
   فاتورته بعد، وهذا لا يقع إلا في رخصة العمل والتأمين الطبي — فتُقصر قائمته
   عليهما. وما إن يُكتب رقم الفاتورة حتى تنفتح القائمة كاملةً (أو قائمة التجديد). */
const SD_NO_INVOICE_PURPOSES = ['رخصة عمل', 'تأمين طبي', 'اشتراك قوى']
const srPurposes = (r) => {
  const o = (r && r._ops) || {}
  if (((o.sr_office || SR_REF.tab) === SD_NA)) return SD_NA_PURPOSES
  // وتتبع خدمة الفاتورة: لكل خدمةٍ محصورةٍ أغراضُها وحدها
  const svc = SD_PURPOSES_BY_SERVICE[srInv(r, 'service_ar')]
  if (svc) return svc
  if (!String(o.sr_invoice || '').trim()) return SD_NO_INVOICE_PURPOSES
  return SD_PURPOSES
}
/* يوم الصف: تاريخه المكتوب، أو اليوم المعروض إن كان صفّاً جاهزاً فارغاً (فهو
   ما سيأخذه فعلاً). وصفٌ فيه بيانات بلا تاريخ يُرجع فراغاً — خلل يستحق تنبيهاً. */
const srRowDay = (r) => {
  const o = (r && r._ops) || {}
  return o.sr_date || (Object.keys(o).length ? '' : SR_REF.day)
}

/* تجميع الطلبات بيومها: كل يوم كتلة واحدة برأس مدموج يحمل عدّاده ومجموعه،
   فيعمل المحاسب يوماً بيوم بدل قائمة متصلة. يُحسب في derive لأنه يحتاج مسحاً
   على كل الصفوف — لا يمكن لعمود أن يعرف مجموع يومه من صفّه وحده. */
const srDerive = (rows, edits, ctx) => {
  // اليوم والمجموعة المفتوحان — تقرأهما الأعمدة التي لا يكفيها صفّها وحده
  // (رأس اليوم على الصف الجاهز، وقائمة الأغراض قبل أن يُختم الحساب)
  SR_REF.day = srDay(ctx && ctx.day)
  SR_REF.tab = (ctx && ctx.tab) || ''
  SR_REF.prices = (ctx && ctx.prices) || {}
  const val = (r, k) => ((edits && edits[r._id] && edits[r._id][k] !== undefined) ? edits[r._id][k] : (r._ops && r._ops[k]))
  const days = new Map()
  /* مجموعات السداد الجماعي: كم عاملاً في العملية الواحدة وكم مجموعها — يقرأها
     عمود «ضمن سداد» فيعرف الموظف أن مبلغ صفّه حصّةٌ لا كامل العملية. */
  const grp = new Map()
  /* وحارسٌ من الدفع مرّتين: رقم سدادٍ واحد على **الفاتورة نفسها** في أكثر من صفّ
     = الفاتورة تُسدَّد ثانيةً بالخطأ. (تكرارُه على فواتير مختلفة سدادٌ جماعي
     مشروع، فلا يُنبَّه عليه.) */
  const dup = new Map()
  /* المجموعات والتكرار يُمسحان على **كل صفوف الشيت** لا على المعروض: العملية قد
     تُدخل صفوفها في يومين، والدفع المكرّر للفاتورة نفسها قد يقع بعد أسبوع — وهو
     أخطر ما يُكتشف، فلا يصحّ أن يُخفيه مرشِّح اليوم. */
  for (const r of (ctx && ctx.all) || rows) {
    // بيانات الصفّ بعد التعديل غير المحفوظ — المجاميع تتحدّث لحظة الكتابة
    const dat = { ...(r._ops || {}), ...((edits && edits[r._id]) || {}) }
    const dk = srDupKey(dat)
    if (dk) dup.set(dk, (dup.get(dk) || 0) + 1)
    // «ضمن سداد» لا يُحسب إلا لأغراضه: رخصة العمل والتأمين الطبي
    const gk = srIsGrpPurpose(dat) ? srGrpKey(dat) : ''
    if (gk) {
      const g = grp.get(gk) || { n: 0, total: 0, paid: 0, last: '', firstT: '', firstHm: '' }
      g.n++; g.total += srAmountOf(dat)
      // مبلغ العملية من رسالة البنك (يقوله صفٌّ واحد منها ويكفي)
      if (!g.paid) g.paid = srPaidRefAmt(dat)
      if (dat.sr_date && dat.sr_time) {
        const t = `${dat.sr_date}T${dat.sr_time}:00`
        // آخر طلبٍ في العملية — منه تُقاس مدّتها (لا من أوّلها)
        if (t > g.last) g.last = t
        // وأوّلها — عنده تقع المجموعة كلها في الترتيب فلا تتقدّم على أقدم منها
        if (!g.firstT || t < g.firstT) { g.firstT = t; g.firstHm = dat.sr_time }
      }
      grp.set(gk, g)
    }
  }
  // وكتلُ الأيام على المعروض وحده — هي عرضٌ لا فحص
  for (const r of rows) {
    const dat = { ...(r._ops || {}), ...((edits && edits[r._id]) || {}) }
    const amt = srAmountOf(dat)
    const d = String(val(r, 'sr_date') || '').trim()
    if (!d) continue                       // الصفوف الفارغة الجاهزة ليست طلبات
    const g = days.get(d) || { n: 0, total: 0, open: 0 }
    g.n++
    g.total += amt
    if ((val(r, 'sr_status') || 'جديد') !== 'تم السداد') g.open++
    days.set(d, g)
  }
  SR_REF.days = days
  SR_REF.grp = grp
  SR_REF.dup = dup
}
/* وسمُ العملية على الصفّ كلّه: صفوف السداد الواحد تأخذ **غسلةً واحدة** خفيفة
   جداً (٧٪) فتُقرأ شريطاً واحداً بالعين ولو طال الجدول — واللون مشتقّ من رقم
   السداد فيثبت له، والصفّ المنفرد يبقى بلا غسلة. الغسلة أخفت من أن تطمس ألوان
   الخلايا (الإلزام · المبلغ · حالة الفاتورة) لأنها تحتها لا فوقها. */
const SR_GRP_TINTS = SR_BRANCH_PALETTE.map((c) => c.replace(/,[.\d]+\)$/, ',.07)'))
// صفٌّ يُنذر بدفعٍ مكرّر للفاتورة نفسها: أحمر بكامله — الخليّة وحدها قد تفوت العين
const SR_DUP_ROW_BG = 'rgba(192,57,43,.16)'
const srRowBg = (r) => {
  const o = (r && r._ops) || {}
  if (srDupCount(o) > 1) return SR_DUP_ROW_BG
  const k = srIsGrpPurpose(o) ? srGrpKey(o) : ''; if (!k) return undefined
  const g = SR_REF.grp.get(k); if (!g || g.n < 2) return undefined
  let h = 0
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) % 997
  return SR_GRP_TINTS[h % SR_GRP_TINTS.length]
}
// كم مرّة تكرّر رقم السداد لصاحب الصفّ نفسه (١ = مرّة واحدة سليمة)
const srDupCount = (d) => { const k = srDupKey(d); return k ? (SR_REF.dup.get(k) || 0) : 0 }
// تنقّل بالأيام: ±يوم واحد حول تاريخ معطى
const dayShift = (ymd, n) => {
  const d = new Date((ymd || todayYmd()) + 'T00:00:00')
  d.setDate(d.getDate() + n)
  const p = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
/* قراءة حقل من فاتورة النظام المرتبطة بالطلب. `srInvOf` يأخذ بيانات الصف
   وحدها كي يقرأها الترحيل للدفتر أيضاً — هناك لا صفّ بل `data` محفوظة. */
const srInvOf = (d, k) => { const v = SR_REF.inv.get(String((d || {}).sr_invoice ?? '').trim()); return v ? (v[k] ?? '') || '' : '' }
const srInv = (r, k) => srInvOf(r && r._ops, k)
/* ── العامل برقم إقامته ───────────────────────────────────────────────────────
   طلبٌ بلا فاتورة (عاملٌ ضمن سدادٍ جماعي) لا يجد اسمه ولا منشأته في فاتورة —
   فيُقرآن من مركز المزامنة برقم الإقامة الذي يكتبه الموظف. أي: يكفي أن يُدخل
   الرقم فتُملأ بقيّة خاناته. والفاتورة تسبقه متى وُجدت (هي أخصّ بالطلب). */
const srWfOf = (d, k) => {
  const iq = String((d || {}).sr_iqama || '').replace(/\D/g, '')
  const w = iq && SR_REF.wf.get(iq)
  return w ? (w[k] || '') : ''
}
// حقلٌ من الفاتورة أولاً ثم من بيانات العامل — للحقول المشتركة بينهما
const srInvWf = (r, invKey, wfKey) => srInv(r, invKey) || srWfOf(r && r._ops, wfKey)
/* حساب السداد لم يعد عموداً يُدخَل: طلبُ مكتبٍ يُصرف من حساب **فرع فاتورته**،
   فالفرع يفوز. والمخزَّن لا يُقرأ إلا حين لا فاتورة: طلبات السجلات مختومة بـ`NA`،
   وطلباتٌ قديمة تحمل ختم التبويب الذي أُدخلت فيه (JUB1 مثلاً) وهو ليس حساباً في
   الدفتر أصلاً — ولو قُدِّم المخزَّن لبقيت محجوبة عن الترحيل بلا مخرج بعد حذف
   العمود الذي كان يصحّحها. */
const srAcct = (d) => String(srInvOf(d, 'branch_code') || srWfOf(d, 'branch_code') || (d || {}).sr_office || '')
/* ── رقم السداد يتبع الغرض ────────────────────────────────────────────────────
   في بوابة سداد يُدخَل لكل جهةٍ **رقمُها المعروف**، وهو يختلف بالغرض: إقامة
   العامل في التجديد وتغيير المهنة · رقم الحدود في إصدار الإقامة (لا إقامة له
   بعد) · الرقم الموحّد للمنشأة في إصدار التأشيرة · ورقم تأمينات المنشأة في
   مديونياتها. فيُقرأ من الفاتورة ولا يُكتب بيد، والمكتوب يدوياً يفوز.
   وأغراضُ الغرفة التجارية لا رقم سدادٍ لها أصلاً — تُشطب ولا تُطلب. */
const SD_IQAMA_RENEWAL = 'تجديد إقامة'
const SD_SADAD_SOURCE = {
  'تجديد إقامة': 'iqama',
  'تغيير مهنة': 'iqama',
  'إصدار إقامة': 'border',
  'إصدار تأشيرة': 'unified',
  'دفع مديونيات منشأة': 'gosi',
}
const SD_NO_SADAD_PURPOSES = new Set(['تصديق مطبوعات', 'طلب مفتوح'])
const srSadadOf = (d) => {
  const o = d || {}
  const typed = String(o.sr_sadad_no || '').trim()
  if (typed) return typed
  const src = SD_SADAD_SOURCE[String(o.sr_purpose || '').trim()]
  if (!src) return ''
  if (src === 'iqama') return String(o.sr_iqama || srInvOf(o, 'worker_iqama') || '').trim()
  if (src === 'border') return String(srInvOf(o, 'worker_border') || o.sr_iqama || '').trim()
  if (src === 'unified') return String(o.sr_unified || srInvOf(o, 'unified_number') || srWfOf(o, 'unified_number') || '').trim()
  if (src === 'gosi') {
    // تأمينات المنشأة: من الفاتورة، وإلا من سجلّ المنشأة بالرقم الموحّد
    const un = String(o.sr_unified || srInvOf(o, 'unified_number') || srWfOf(o, 'unified_number') || '')
    const fac = srFac(un)
    return String(srInvOf(o, 'gosi_number') || (fac && fac.gosi) || '').trim()
  }
  return ''
}

/* الحقول الإلزامية للطلب. الإلزام **لا يمنع الحفظ** — الإدخال قد يبدأ بالمبلغ
   والحفظ تلقائي، فمنعه يعني ضياع ما كُتب. يقع الإلزام في موضعين: تخطيط الخلية
   الفارغة بشكل مميّز في صفٍّ فيه بيانات، ومنع الترحيل للدفتر حتى تكتمل. */
const SR_REQUIRED = [
  { key: 'sr_purpose', ar: 'غرض السداد', en: 'purpose' },
  { key: 'sr_sadad_no', ar: 'رقم السداد', en: 'SADAD no.' },
  // المبلغ إلزامٌ عامّ: طلبٌ بلا مبلغ لا يُسدَّد ولا يصير حركةً في الدفتر
  { key: 'sr_amount', ar: 'مبلغ السداد', en: 'paid amount' },
]
/* وإلزامٌ يتبع الغرض: ما لا يُسدَّد بدونه. حجز الاسم التجاري يُقيَّد على سعوديٍّ
   بعينه، فبلا اسمه وهويته لا يُعرف لمن الاسم؛ وبلا مبلغ ومرفق سداد لا يُنفَّذ. */
const SR_REQ_UNIFIED = { key: 'sr_unified', ar: 'الرقم الموحّد', en: 'unified no.' }
/* اسم المنشأة: هو ما يتغيّر في «تحويل مؤسسة لشركة» — الأرقام تبقى كما هي. */
const SR_REQ_FAC_NAME = { key: 'sr_facility_name', ar: 'اسم المنشأة', en: 'facility name' }
/* قيدٌ جديد (مؤسسة · شركة · تحويل) ⇒ المنشأة ليست في قاعدة البيانات بعد، فتُدخَل
   أرقامها الثلاثة يدوياً. أمّا التجديد فمنشأته قائمة: يكفي الرقم الموحّد،
   ويُملأ منه رقما التأمينات والموارد آلياً (انظر autoStamp). */
const SR_REQ_NEW_FACILITY = [
  SR_REQ_FAC_NAME,
  SR_REQ_UNIFIED,
  { key: 'sr_gosi_no', ar: 'رقم التأمينات', en: 'GOSI no.' },
  { key: 'sr_hrsd_no', ar: 'رقم الموارد', en: 'HRSD no.' },
]
const SR_REQ_FILE = { key: 'sr_file_sadad', ar: 'مرفق السداد', en: 'SADAD file' }
// المبلغ صار إلزاماً عامّاً (SR_REQUIRED)، فما يزيده السجلات هو إثبات السداد
const SR_REQ_PAY = [SR_REQ_FILE]
const SR_REQ_FACILITY = [...SR_REQ_PAY, ...SR_REQ_NEW_FACILITY]
/* سجلٌّ جديد يُفتح (قيد مؤسسة · قيد شركة · تحويل مؤسسة لشركة) ⇒ صورة السجل
   نفسه إثباتُ نتيجته، فلا يكتمل الطلب بدونها. */
const SR_REQ_CR = [...SR_REQ_FACILITY, { key: 'sr_file_cr', ar: 'مرفق السجل', en: 'CR file' }]
const SR_REQ_LICENSE = [...SR_REQ_PAY, SR_REQ_UNIFIED, { key: 'sr_license_no', ar: 'رقم الرخصة', en: 'license no.' }]
const SR_REQUIRED_BY_PURPOSE = {
  /* اشتراك مقيم: **مرفق السداد** إلزامي — الاشتراك لا يُثبته رقمٌ في كشف، بل
     إيصاله. (وتجديد الإقامة عكسه: مرفقه مشطوب — انظر SR_NA_BY_PURPOSE.) */
  'اشتراك مقيم': [SR_REQ_FILE],
  'قيد سجل مؤسسة': SR_REQ_CR,
  'قيد سجل شركة': SR_REQ_CR,
  'تحويل مؤسسة لشركة': SR_REQ_CR,
  'تجديد سجل مؤسسة': SR_REQ_FACILITY,
  'تجديد سجل شركة': SR_REQ_FACILITY,
  /* رخصة البلدية والسلامة: منشأة قائمة، فالرقم الموحّد يجلب بياناتها، ورقم
     الرخصة/الشهادة هو ما تُعرف به. (اسم المنشأة والتأمينات والموارد تُقرأ منه
     تلقائياً فلا تُطلب.) */
  'رخصة البلدية': SR_REQ_LICENSE,
  'شهادة السلامة': SR_REQ_LICENSE,
  'حجز اسم تجاري': [
    ...SR_REQ_PAY,
    { key: 'sr_saudi_name', ar: 'اسم السعودي', en: 'Saudi name' },
    { key: 'sr_saudi_id', ar: 'هوية السعودي', en: 'Saudi ID' },
    { key: 'sr_booking_no', ar: 'رقم الحجز', en: 'reservation no.' },
  ],
}
/* حقولٌ تخصّ غرضاً دون غيره. ما لا يخصّ الغرضَ المختار يُشطَب في الشبكة بخطّ
   مائل وخلفية باهتة — فيعرف المستخدم أنها ليست ناقصة بل **لا محلّ لها**، وهو
   فرقٌ لا يقوله الفراغ وحده. (شطبٌ بصريّ لا قفل: خريطةُ الاختصاص قد تنقص،
   ومنعُ الكتابة على أساسها يحبس بياناتٍ صحيحة.) */
const SR_PURPOSE_FIELDS = ['sr_saudi_name', 'sr_saudi_id', 'sr_booking_no', 'sr_license_no', 'sr_facility_name', 'sr_unified', 'sr_gosi_no', 'sr_hrsd_no', 'sr_file_cr']
const SR_FAC_FIELDS = ['sr_facility_name', 'sr_unified', 'sr_gosi_no', 'sr_hrsd_no', 'sr_file_cr']
const SR_APPLIES = {
  // حجز اسم تجاري: لا سجلّ بعد — أرقام المنشأة ومرفق السجل لا محلّ لها
  'حجز اسم تجاري': ['sr_saudi_name', 'sr_saudi_id', 'sr_booking_no'],
  'قيد سجل مؤسسة': SR_FAC_FIELDS,
  'قيد سجل شركة': SR_FAC_FIELDS,
  'تحويل مؤسسة لشركة': SR_FAC_FIELDS,
  'تجديد سجل مؤسسة': SR_FAC_FIELDS,
  'تجديد سجل شركة': SR_FAC_FIELDS,
  /* رخصة البلدية وشهادة السلامة تخصّان المنشأة لا شخصاً (يُشطب السعودي وهويته)،
     ورقمهما هو «رقم الرخصة» لا «رقم الحجز» — فالأخير مشطوب فيهما. */
  'رخصة البلدية': [...SR_FAC_FIELDS, 'sr_license_no'],
  'شهادة السلامة': [...SR_FAC_FIELDS, 'sr_license_no'],
}
/* شطبٌ مباشر لحقلٍ **خارج** حقول السجلات: `SR_APPLIES` قائمةُ ما يخصّ الغرض من
   حقول السجلات وحدها، فلا تصلح لشطب حقلٍ عامّ (مرفق السداد) في غرضٍ واحد.
   تجديد الإقامة: السداد يُثبته رقمه ورسالة البنك، فمرفقه لا محلّ له. */
const SR_NA_BY_PURPOSE = {
  'تجديد إقامة': ['sr_file_sadad'],
  // الغرفة التجارية: تُسدَّد بلا رقم سدادٍ أصلاً
  'تصديق مطبوعات': ['sr_sadad_no'],
  'طلب مفتوح': ['sr_sadad_no'],
}

/* بياناتٌ لا تُوجد قبل السداد: السجل التجاري يصدر **بعد** دفع رسومه، فأرقامه
   ومرفقه لا يملكهما مقدّم الطلب ساعة الطلب. تبقى إلزامية — لكن تنبيهها **أحمر**
   لا مخطَّطاً: ليست إهمالاً بل ناقصاً يُستكمل بعد السداد. ولذلك تُستثنى من قفل
   الصفّ بعد الدفع، وإلا لتعذّر إدخالها أبداً. */
const SR_POST_PAY = {
  'قيد سجل مؤسسة': ['sr_unified', 'sr_gosi_no', 'sr_hrsd_no', 'sr_file_cr'],
  'قيد سجل شركة': ['sr_unified', 'sr_gosi_no', 'sr_hrsd_no', 'sr_file_cr'],
  // التحويل: الأرقام لا تتغيّر (المنشأة قائمة)، والصادر بعد السداد سجلّها الجديد
  'تحويل مؤسسة لشركة': ['sr_file_cr'],
}
const SR_PENDING_BG = 'rgba(232,114,101,.20)'
// فتح سجلٍّ جديد: المنشأة غير مسجَّلة بعد، فلا يُجلب لها اسم من القاعدة
const SR_NEW_CR_PURPOSES = new Set(['قيد سجل مؤسسة', 'قيد سجل شركة'])
const srPostPay = (r, key) => (SR_POST_PAY[String(((r && r._ops) || {}).sr_purpose || '').trim()] || []).includes(key)
const SR_NA_BG = 'linear-gradient(to top left, transparent calc(50% - 0.6px), rgba(150,138,120,.55) calc(50% - 0.6px), rgba(150,138,120,.55) calc(50% + 0.6px), transparent calc(50% + 0.6px)), rgba(150,138,120,.13)'

/* أغراضٌ منشأتها قائمة (تجديد سجل · رخصة بلدية · شهادة سلامة): بياناتها تُقرأ
   من القاعدة ولا تُكتب — رقمٌ نملكه لا يُعاد إدخاله بيد. والحقول الثلاثة تُقفل
   **بشرط أن تكون المنشأة معروفة**: لو لم يُعرف الرقم الموحّد فلا شيء يُقرأ منه،
   وقفلُها حينئذٍ يحبس الصفّ في حقولٍ إلزامية لا سبيل لملئها. */
const SR_RENEWAL_PURPOSES = new Set([
  'تجديد سجل مؤسسة', 'تجديد سجل شركة', 'رخصة البلدية', 'شهادة السلامة',
])
const SR_DERIVED_FIELDS = ['sr_facility_name', 'sr_gosi_no', 'sr_hrsd_no']
const SR_DERIVED_BG = 'rgba(93,173,226,.10)'
const srDerivedLocked = (r, key) => {
  const o = (r && r._ops) || {}
  /* المدّة بالأشهر لا محلّ لها إلا في تجديد الإقامة — تُقفل في غيره متى عُرفت
     خدمة الفاتورة، فلا تُكتب مدّةٌ في صفٍّ لا تعني فيه شيئاً. والصفّ بلا فاتورة
     يبقى مفتوحاً: خدمته غير معروفة بعد. */
  if (key === 'sr_months') { const s = srInv(r, 'service_ar'); return !!s && s !== SR_RENEWAL_SERVICE }
  if (!SR_DERIVED_FIELDS.includes(key)) return false
  if (!SR_RENEWAL_PURPOSES.has(String(o.sr_purpose || '').trim())) return false
  return !!srFac(o.sr_unified)
}
/* صيغ أرقام المنشأة — مشتقّة من ١٣٢٥ منشأة في الإنتاج لا مفروضة:
   الموحّد ١٠ خانات تبدأ بـ٧ (٩٩٫٦٪) · التأمينات ٩ خانات (تبدأ بـ٦ غالباً و٥
   في أربع حالات، فلا يُقيَّد أولها) · الموارد ١٠ خانات تبدأ بـ١ (٩٢٫٧٪) **أو**
   ٩ خانات: المنشأة المسجَّلة في التأمينات فقط يُختَم رقم مواردها من رقم
   تأميناتها (٨٩ حالة)، وإلزام العشرة كان سيردّها وهي صحيحة.
   `coerce` يوحّد الأرقام العربية ويُسقط ما ليس رقماً قبل الفحص. */
const digitsOnly = (v) => latin(v).replace(/\D/g, '')
const numRule = (re, ar, en) => ({
  coerce: digitsOnly,
  validate: (v, r, isAr) => (re.test(v) ? '' : (isAr ? ar : en)),
})
const SR_NUM_UNIFIED = numRule(/^7\d{9}$/, 'الرقم الموحّد: يبدأ بـ 7 و10 خانات', 'Unified no.: starts with 7, 10 digits')
const SR_NUM_GOSI = numRule(/^\d{9}$/, 'رقم التأمينات: 9 خانات', 'GOSI no.: 9 digits')
const SR_NUM_HRSD = numRule(/^(1\d{9}|\d{9})$/, 'رقم الموارد: 10 خانات تبدأ بـ 1 (أو 9 خانات للمسجَّل في التأمينات فقط)', 'HRSD no.: 10 digits starting with 1 (or 9 digits for GOSI-only)')

// الملفات قيمتها مصفوفة JSON: «[]» فراغ لا قيمة
const srEmpty = (v) => { const s = String(v ?? '').trim(); return !s || s === '[]' || (s.startsWith('[') && !mfParse(s).length) }
const SR_REQ_IQAMA = { key: 'sr_iqama', ar: 'رقم إقامة العامل', en: 'worker iqama' }
const SR_REQ_MONTHS = { key: 'sr_months', ar: 'المدة بالأشهر', en: 'months' }
const srRequiredFor = (d) => {
  const o = d || {}
  const p = String(o.sr_purpose || '').trim()
  // أغراضٌ لا رقم سدادٍ لها (الغرفة التجارية): يُسقَط من الإلزام كما يُشطب في الشبكة
  const req = [...SR_REQUIRED.filter((f) => !(f.key === 'sr_sadad_no' && SD_NO_SADAD_PURPOSES.has(p))),
    ...(SR_REQUIRED_BY_PURPOSE[p] || [])]
  /* رخصة عملٍ بلا فاتورة (عاملٌ ضُمَّ إلى سدادٍ جماعي): لا فاتورة تقول من هو ولا
     كم مدّته — فيلزم **رقم إقامته** (به يُعرف ويُجلب اسمه ومنشأته) و**عدد
     الأشهر** (به يُقاس رسمه). وبدونهما حصّةٌ في عمليةٍ لا يُعرف صاحبها. */
  if (p === 'رخصة عمل' && !String(o.sr_invoice || '').trim()) req.push(SR_REQ_IQAMA, SR_REQ_MONTHS)
  return req
}
/* القيمة الفعّالة لحقلٍ قد يكون مشتقّاً: «ناقص» يُقاس بما سيُرحَّل فعلاً لا بما
   كُتب بيد. بدونه يبقى رقم السداد في التجديد «ناقصاً» أبداً وهو ظاهر أمام العين. */
const srFieldOf = (d, k) => (k === 'sr_sadad_no' ? srSadadOf(d) : (d || {})[k])
const srMissing = (d) => srRequiredFor(d).filter((f) => srEmpty(srFieldOf(d, f.key)))
/* الخلية الإلزامية الفارغة تُخطَّط بخطوط مائلة — شكل لا لون، فلا يشتبه بألوان
   الحالات (أزرق جديد · كهرماني قيد التنفيذ · أخضر مسدَّد · أحمر مرفوض) ولا
   يُقرأ خطأً. والصفّ الجاهز الفارغ يبقى صامتاً حتى يُكتب فيه شيء. */
const SR_REQ_STRIPES = 'repeating-linear-gradient(45deg,rgba(176,125,0,.05) 0 6px,rgba(176,125,0,.20) 6px 12px)'
/* وبعد السداد يشتدّ التنبيه: خانةٌ إلزامية بقيت فارغة والمال قد خرج ليست «قيد
   الإدخال» بل خللٌ قائم — الحركة لا تصل الدفتر حتى تُملأ. أحمر غامق لا مخطَّط. */
const SR_MISSING_PAID_BG = 'rgba(192,57,43,.42)'
const srReq = (key) => (v, r) => {
  const o = (r && r._ops) || {}
  if (!Object.keys(o).length) return undefined
  // «لا محلّ له» أسبق من «ناقص»: الحقل الذي لا يخصّ الغرض ليس ناقصاً أصلاً
  const purpose = String(o.sr_purpose || '').trim()
  if ((SR_NA_BY_PURPOSE[purpose] || []).includes(key)) return SR_NA_BG
  const applies = SR_APPLIES[purpose]
  if (applies && SR_PURPOSE_FIELDS.includes(key) && !applies.includes(key)) return SR_NA_BG
  // ومقروءٌ من القاعدة أسبق من «ناقص» أيضاً — ليس على المستخدم أن يملأه
  if (srDerivedLocked(r, key)) return SR_DERIVED_BG
  if (!srEmpty(v)) return undefined
  if (srPostPay(r, key)) return SR_PENDING_BG            // ناقصٌ يُستكمل بعد السداد
  if (!srRequiredFor(o).some((f) => f.key === key)) return undefined
  // مسدَّدٌ وفيه نقص = خللٌ قائم يحجب الترحيل، لا إدخالٌ لم يكتمل بعد
  return String(o.sr_status || '').trim() === 'تم السداد' ? SR_MISSING_PAID_BG : SR_REQ_STRIPES
}
const SR_STATUSES = ['جديد', 'قيد التنفيذ', 'تم السداد', 'مرفوض']
/* القائمة تعرض ما **يُنتقى** فقط: «تم السداد» تُكتب وحدها عند إدخال رسالة البنك
   (autoSet) — وإتاحتها تسمح بطلبٍ «مسدَّد» بلا إثبات ولا حركة في الدفتر.
   و«جديد» حالةُ الصفّ ساعةَ يُدخَل لا قراراً يُتَّخذ: هي ما يُعرض للخليّة الفارغة،
   ووجودها في القائمة يوهم أنها خطوةٌ تُختار. (وللرجوع إليها: امسح الخليّة.) */
const SR_STATUS_PICK = SR_STATUSES.filter((s) => s !== 'تم السداد' && s !== 'جديد')
const SR_STATUS_BG = {
  /* بنفسجي لا أزرق: السماوي صار معناه «عمود لا يُكتب فيه»، فحالةٌ بلونه تُقرأ
     خطأً. والبنفسجي غير مستعمل في خلفيات هذا الشيت. */
  'جديد': 'rgba(155,120,220,.22)',       // بنفسجي: بانتظار المحاسب
  'قيد التنفيذ': 'rgba(212,160,23,.22)',  // أصفر: تحت التنفيذ
  'تم السداد': 'rgba(46,204,113,.20)',    // أخضر: أُنجز
  'مرفوض': 'rgba(232,114,101,.20)',       // أحمر: لن يُسدَّد
}
const srSummary = (rows, isAr) => {
  let n = 0, open = 0, doing = 0, done = 0, pendingAmt = 0, unassigned = 0, incomplete = 0
  for (const r of rows) {
    const o = r._ops || {}
    // الصف الفارغ الجاهز ليس طلباً — لا يُحتسب حتى يُكتب فيه شيء
    if (!Object.keys(o).length) continue
    n++
    if (srMissing(o).length) incomplete++
    /* طلب مسدَّد لكن حسابه غير معروف للدفتر = عالق: لن يُرحَّل. والحساب مشتقّ من
       فرع الفاتورة، فالعالق اليوم = طلب سجلات (NA) أو فرعٌ بلا حساب في الدفتر. */
    if (o.sr_status === 'تم السداد' && !SD_ACCT_KEYS.has(srAcct(o))) unassigned++
    const st = o.sr_status || 'جديد'
    if (st === 'جديد') { open++; pendingAmt += srAmountOf(o) }
    else if (st === 'قيد التنفيذ') { doing++; pendingAmt += srAmountOf(o) }
    else if (st === 'تم السداد') done++
  }
  return [
    { label: isAr ? 'طلبات جديدة' : 'New', value: enNum(open), tone: open ? 'bad' : 'good' },
    { label: isAr ? 'قيد التنفيذ' : 'In progress', value: enNum(doing), tone: doing ? 'warn' : 'good' },
    { label: isAr ? 'تم السداد' : 'Paid', value: enNum(done), tone: 'good' },
    { label: isAr ? 'مبلغ بانتظار السداد' : 'Awaiting payment', value: enNum(pendingAmt), tone: pendingAmt ? 'warn' : 'good' },
    { label: isAr ? 'إجمالي الطلبات' : 'Total requests', value: enNum(n) },
    ...(unassigned ? [{ label: isAr ? 'بانتظار تحديد الحساب' : 'Awaiting account', value: enNum(unassigned), tone: 'warn' }] : []),
    ...(incomplete ? [{ label: isAr ? 'ينقصها حقل إلزامي' : 'Missing required', value: enNum(incomplete), tone: 'warn' }] : []),
  ]
}

/* ── الرخص البلدية: مراجعها ومشتقّاتها ───────────────────────────────────────
   المنشأة تُقرأ بالرقم الموحّد من `facilities` (يُحمَّل مرّة في `load`)، والمتبقّي
   يُحسب كل رسم من تاريخ الانتهاء — فالرخصة تُتابَع بما بقي لها لا بما مضى. */
/* المتبقّي بالأيام من تاريخ الانتهاء الميلادي (المُزامَن)، وللتجاوز اليدوي
   الأسبقية إن كُتب. يستمر بالسالب بعد الانتهاء ولا يُفرَّغ. */
const blDaysLeft = (r) => {
  const o = r || {}
  const s = ymd((o._ops && o._ops.bl_expiry) || o.expiry_g)
  if (!s) return null
  const t = new Date(`${s}T00:00:00`).getTime()
  if (!Number.isFinite(t)) return null
  return Math.round((t - new Date(`${todayYmd()}T00:00:00`).getTime()) / 86400000)
}
const blStatus = (n, isAr) => (n == null ? ''
  : n < 0 ? (isAr ? 'منتهية' : 'Expired')
  : n <= 30 ? (isAr ? 'قاربت الانتهاء' : 'Expiring')
  : (isAr ? 'سارية' : 'Valid'))
const blSummary = (rows, isAr) => {
  let n = 0, valid = 0, soon = 0, expired = 0, fees = 0
  for (const r of rows) {
    if (!r || (!r.license_no && !Object.keys(r._ops || {}).length)) continue
    n++
    fees += depNum((r._ops || {}).bl_fee)
    const d = blDaysLeft(r)
    if (d == null) continue
    if (d < 0) expired++; else if (d <= 30) soon++; else valid++
  }
  return [
    { label: isAr ? 'إجمالي الرخص' : 'Licences', value: enNum(n) },
    { label: isAr ? 'سارية' : 'Valid', value: enNum(valid), tone: 'good' },
    { label: isAr ? 'قاربت الانتهاء (≤ 30 يوم)' : 'Expiring ≤30d', value: enNum(soon), tone: soon ? 'warn' : 'good' },
    { label: isAr ? 'منتهية' : 'Expired', value: enNum(expired), tone: expired ? 'bad' : 'good' },
    ...(fees ? [{ label: isAr ? 'رسوم التجديد' : 'Renewal fees', value: enNum(fees) }] : []),
  ]
}

/* ترحيل الطلب المنفَّذ إلى دفتر السدادات.
   مفتاح صف الدفتر مشتقّ من مفتاح الطلب (`SD-<حساب>-REQ-<طلب>`)، فالترحيل
   **متكرّر بلا تكرار**: إعادة الحفظ تُحدِّث الصف نفسه ولا تُنشئ ثانياً. ويُكتب
   `sd_req` على صف الدفتر و`sr_ledger` على الطلب ليبقى الأصل معروفاً.
   `sd_seq` = ثوانٍ منذ الحقبة: يفوق تسلسلات الإكسل المستورَدة (أقصاها ~1700)
   فتأتي الحركة المرحَّلة في ذيل يومها، ويبقى الترتيب مستقرّاً. */
/* `auto`: تشغيلٌ تلقائي (بعد التحميل) لا حفظٌ صريح — فيصمت عن المحجوب: تنبيهٌ
   بما ينقص صفّاً قديماً يتكرّر مع كل فتحةٍ للصفحة بلا أن يطلبه أحد. */
const srPostToLedger = async (sb, savedRows, { isAr, auto }) => {
  const paid = savedRows.filter(({ data }) => (data.sr_status === 'تم السداد') && srAmountOf(data) > 0)
  /* ما ينقص الطلب قبل أن يصير حركةً في الدفتر: حسابٌ **يعرفه الدفتر** وحقول
     `SR_REQUIRED`. الحساب يُشتقّ من فرع الفاتورة، وقد يكون فرعاً بلا حساب في
     الدفتر (فرع مغلق أو مكتب خارج الحسابات الخمسة) — فيُقال الفرع باسمه بدل
     ترحيلٍ إلى حسابٍ لا تبويب له تختفي فيه الحركة عن العين. */
  /* حساب العملية: الصفوف التي تشترك في رقم السداد خرج مالها من حسابٍ واحد —
     فمن عرفه منها (صاحب الفاتورة) عرّفه لإخوته الذين لا فاتورة لهم. */
  const acctOfGrp = new Map()
  for (const { data } of paid) {
    const k = srGrpKey(data); if (!k) continue
    const a = srAcct(data)
    if (a && !acctOfGrp.has(k)) acctOfGrp.set(k, a)
  }
  const acctOf = (d) => acctOfGrp.get(srGrpKey(d)) || srAcct(d)
  const missing = (d) => {
    const a = acctOf(d)
    return [
      ...(SD_ACCT_KEYS.has(a) ? []
        : [!a || a === SD_NA
            ? (isAr ? 'حساب السداد' : 'the SADAD account')
            : (isAr ? `حساب السداد لفرع ${a}` : `a SADAD account for branch ${a}`)]),
      ...srMissing(d).map((f) => (isAr ? f.ar : f.en)),
    ]
  }
  const held = paid.filter(({ data }) => missing(data).length)
  const ready = paid.filter(({ data }) => !missing(data).length)
  const heldNote = () => {
    const what = [...new Set(held.flatMap(({ data }) => missing(data)))].join(isAr ? ' و' : ', ')
    return isAr ? `لم يُرحَّل ${arCount(held.length, 'طلب', 'طلبان', 'طلبات', 'طلباً')}: أكمل ${what}`
                : `${enNum(held.length)} request(s) not posted: fill in ${what}`
  }
  if (!ready.length) return (held.length && !auto) ? heldNote() : ''
  /* ── تجميع الطلبات في حركات ────────────────────────────────────────────────
     رقم السداد الواحد = عمليةٌ واحدة خرج فيها المال، ولو غطّت أربعة عمّال. فهي
     **حركة واحدة** في الدفتر بمجموع الحصص، مفتاحها `SD-<حساب>-SADAD-<رقم>` —
     وطلبٌ بلا رقم يبقى وحده بمفتاح صفّه. والمفتاح مشتقّ لا مولَّد، فإعادة الحفظ
     تُحدِّث الحركة نفسها ولا تُنشئ ثانية مهما تكرّرت. */
  const groups = new Map()
  for (const { id, data } of ready) {
    const no = srGrpKey(data)
    const k = no || `REQ-${id}`
    const g = groups.get(k) || { key: no ? `SD-${acctOf(data)}-SADAD-${no}` : `SD-${acctOf(data)}-REQ-${id}`, acct: acctOf(data), rows: [] }
    g.rows.push({ id, data })
    groups.set(k, g)
  }
  const uniq = (xs) => [...new Set(xs.filter(Boolean))]
  const seq0 = Math.floor(Date.now() / 1000)
  const ledger = [...groups.values()].map((g, i) => {
    const first = g.rows[0].data
    const all = g.rows.map((x) => x.data)
    // قيمٌ تُجمَع أو تُوصَل بفاصلة: الحركة واحدة وأصحابها عدّة
    const list = (f) => uniq(all.map(f)).join('، ')
    return {
      view_key: 'sadad',
      row_key: g.key,
      is_manual: true, hidden: false,
      data: {
        sd_account: g.acct,
        sd_seq: String(seq0 + i),
        sd_date: first.sr_paid_date || first.sr_date || '',
        sd_kind: 'سحب',
        sd_amount: String(all.reduce((s, d) => s + srAmountOf(d), 0)),
        ...(srSadadOf(first) ? { sd_no: srSadadOf(first) } : {}),
        ...(list((d) => d.sr_purpose) ? { sd_purpose: list((d) => d.sr_purpose) } : {}),
        // عدد العمّال في العملية — الكمية في الدفتر هي عدد ما سُدِّد له
        ...(all.length > 1 ? { sd_qty: String(all.length) } : (first.sr_qty ? { sd_qty: first.sr_qty } : {})),
        /* العامل وإقامته ورقم المنشأة تُقرأ من الفاتورة ما لم تُكتب يدوياً — القيمة
           المشتقّة معروضة في الشبكة لكنها ليست في `data`، ولولا هذه العودة للفاتورة
           لوصلت الحركة الدفترَ بخانات فارغة والموظف يراها مملوءة أمامه. */
        ...(list((d) => d.sr_iqama || srInvOf(d, 'worker_iqama')) ? { sd_iqama: list((d) => d.sr_iqama || srInvOf(d, 'worker_iqama')) } : {}),
        ...(list((d) => d.sr_unified || srInvOf(d, 'unified_number')) ? { sd_unified: list((d) => d.sr_unified || srInvOf(d, 'unified_number')) } : {}),
        ...(list((d) => d.sr_worker || srInvOf(d, 'worker_name') || d.sr_requester)
          ? { sd_staff: list((d) => d.sr_worker || srInvOf(d, 'worker_name') || d.sr_requester) } : {}),
        /* رسالة البنك تنزل في ملاحظات الحركة لا في «رقم الفاتورة»: صارت نصّاً
           طويلاً، ووضعها في خانة رقمٍ يُفسد فرز الدفتر وبحثه. */
        ...((first.sr_notes || first.sr_paid_ref)
          ? { sd_notes: [first.sr_notes, first.sr_paid_ref].filter(Boolean).join('\n') } : {}),
        // رابط العملية بالنظام: فواتير الطلبات تنتقل مع الحركة فيبقى المصروف
        // متتبَّعاً إلى معاملاته الأصلية من داخل الدفتر نفسه
        ...(list((d) => d.sr_invoice) ? { sd_app_invoice: list((d) => d.sr_invoice) } : {}),
        sd_req: g.rows.map((x) => x.id).join(','),
      },
    }
  })
  const { error } = await sb.from('ops_sheet_rows').upsert(ledger, { onConflict: 'view_key,row_key' })
  if (error) throw error
  // ختم مرجع الدفتر على الطلبات — يُدمج مع بياناتها ولا يستبدلها
  const stamped = [...groups.values()].flatMap((g) => g.rows.map(({ id, data }) => [id, { ...data, sr_ledger: g.key }]))
  await Promise.all(stamped.map(([id, data]) => sb.from('ops_sheet_rows').upsert({
    view_key: 'sadad_requests', row_key: id, is_manual: true, hidden: false, data,
  }, { onConflict: 'view_key,row_key' })))
  const note = isAr
    ? `رُحِّل ${arCount(ready.length, 'طلب', 'طلبان', 'طلبات', 'طلباً')} إلى دفتر السدادات`
    : `Posted ${enNum(ready.length)} request(s) to the SADAD ledger`
  /* `patch` = البيانات كما استقرّت في القاعدة، فيُحدّث المكوّن طبقته منها بلا
     إعادة تحميل: الختم يظهر في عمود «رُحِّل للدفتر» فوراً، ويبقى مكان المستخدم
     من الجدول وتحديده وتمريره كما هو. */
  return {
    note: (held.length && !auto) ? `${note} · ${heldNote()}` : note,
    patch: Object.fromEntries(stamped),
  }
}

const sdSummary = (rows, isAr) => {
  let inn = 0, out = 0, n = 0, acct = ''
  for (const r of rows) {
    const c = SD_REF.calc.get(r._id); if (!c) continue
    inn += c.in; out += c.out; n++
    if (!acct) acct = (r._ops && r._ops.sd_account) || ''
  }
  const feed = SD_FEED_ACCOUNTS.has(acct)
  const bal = SD_REF.finals.get(acct)
  return [
    ...(feed ? [] : [{ label: isAr ? 'الرصيد الحالي' : 'Balance', value: enNum(bal ?? 0), tone: (bal ?? 0) < 0 ? 'bad' : 'good' }]),
    ...(feed
      ? [{ label: isAr ? 'إجمالي الإشعارات' : 'Total notified', value: enNum(out + inn) }]
      : [{ label: isAr ? 'إجمالي الإيداع' : 'Total in', value: enNum(inn) },
         { label: isAr ? 'إجمالي السحب' : 'Total out', value: enNum(out) }]),
    { label: isAr ? (feed ? 'عدد الإشعارات' : 'عدد الحركات') : (feed ? 'Notifications' : 'Entries'), value: enNum(n) },
  ]
}

/* ── شيتات مال المكتب: للمدير العام وحده ──────────────────────────────────────
   بقيّة الشيتات تشغيليّة يحتاجها كل موظف (منشآت · عمالة · تأشيرات · مزامنة)،
   أمّا هذه فتكشف ما فُوتر وما حُصِّل وحركةَ نقد المكاتب. الفلترة عند بناء قائمة
   العروض نفسها فلا يظهر الشيت في المنتقي ولا يُفتح بمفتاحٍ محفوظ.
   ⚠️ «طلبات السداد» (`sadad_requests`) ليست منها عمداً: الموظف هو من يُدخل فيها
   طلبه والمحاسب يحدّث حالته — قفلُها يوقف العمل لا يحمي مالاً. */
const GM_ONLY_VIEWS = new Set(['invoices', 'permanent_workers_invoices', 'deposits', 'sadad'])

/* ═══ نقل الكفالة — تعبئة المراحل وإنهاء المعاملة من الشبكة ═══════════════════
   شيت `transfer_txn` صفٌّ لكل فاتورة نقل كفالة سارية. ما يُكتب في أعمدة المراحل
   يُرحَّل بعد الحفظ إلى **مكان النظام نفسه** الذي تكتب فيه صفحة الفاتورة:
   `transfer_calculation.stage_data` وأعمدة الحسبة المرافقة، والمرحلة الأخيرة
   (مقيم) تحوّل حالة الطلب إلى «منجز» — فالمعاملة المُنجَزة من الشبكة تظهر في
   الفاتورة وصفحة المعاملة كما لو أُنجزت منهما، ولا يوجد مسار بيانات ثانٍ.
   الترتيب مفروضٌ كما في صفحة الفاتورة: نقل ← تأمين ← رخصة عمل ← مقيم. */
const TR_DONE = 'تم', TR_SKIP = 'لا يحتاج', TR_CANCEL = 'ملغاة'
/* حالتان **تشغيليّتان** لا تُرحَّلان للمعاملة: المرحلة لم تُنجَز بعد، والخليّة
   تقول أين وقفت. النظام لا يعرف لهما مقابلاً في `stage_data`، فوجودهما هنا
   متابعةٌ للمكتب لا سجلٌّ للمعاملة — ولذلك لا تكتبان شيئاً. */
const TR_WAIT = 'في الإنتظار', TR_ISSUE = 'مشكلة'
/* نصّ «آخر ما وصلت إليه المعاملة» لكل مرحلة — عمود «حالة المعاملة بالكامل» */
const TR_REACHED_AR = { transfer: 'تم النقل', insurance: 'تم التأمين', work_permit: 'تمت رخصة العمل', muqeem: 'تمت الإقامة' }
const TR_REACHED_EN = { transfer: 'Transferred', insurance: 'Insured', work_permit: 'Work permit', muqeem: 'Iqama done' }
const TR_ST_BG = {
  [TR_DONE]: 'rgba(46,204,113,.28)', [TR_SKIP]: 'rgba(176,125,0,.26)', [TR_CANCEL]: 'rgba(232,114,101,.28)',
  // الانتظار أصفر (نفس أصفر التنبيه في الشبكة `#eab308`) لا أزرق: حالةُ ترقّبٍ
  // بين المنجز والمشكلة، فبينهما لونها.
  [TR_WAIT]: 'rgba(234,179,8,.30)', [TR_ISSUE]: 'rgba(232,114,101,.28)',
}
const TR_ST_CODE = { [TR_DONE]: 'done', [TR_SKIP]: 'skipped', [TR_CANCEL]: 'cancelled' }
const TR_ST_AR = { done: TR_DONE, skipped: TR_SKIP, cancelled: TR_CANCEL }
/* مفاتيح الأعمدة لكل مرحلة + حقولها الإجبارية قبل الترحيل — نفس ما تشترطه
   صفحة الفاتورة (InvoicePage `canSubmit`)، فلا تصل المعاملةَ مرحلةٌ ناقصة. */
const TR_STAGES = [
  { key: 'transfer', ar: 'النقل', st: 'tr_s_move', req: [], file: 'tr_move_file', note: 'tr_move_file' },
  { key: 'insurance', ar: 'التأمين', st: 'tr_s_ins', skip: true, file: 'tr_ins_file', note: 'tr_ins_file',
    req: [['tr_ins_company', 'شركة التأمين'], ['tr_ins_policy', 'رقم البوليصة'], ['tr_ins_expiry', 'انتهاء التأمين'], ['tr_ins_amount', 'مبلغ التأمين']] },
  { key: 'work_permit', ar: 'رخصة العمل', st: 'tr_s_wp', skip: true, onlyIfNotTransferOnly: true, file: 'tr_wp_file', note: 'tr_wp_file',
    req: [['tr_wp_months', 'مدة الرخصة'], ['tr_wp_expiry', 'انتهاء الرخصة'], ['tr_wp_amount', 'مبلغ الرخصة']] },
  { key: 'muqeem', ar: 'الإقامة (مقيم)', st: 'tr_s_muq', final: true, file: 'tr_muq_file', note: 'muqeem_file',
    req: [['tr_muq_via', 'التجديد عبر تواصل'], ['tr_muq_expiry', 'انتهاء الإقامة'], ['tr_muq_occupation', 'المهنة']] },
]
/* استعلام مقيم — نفس مسار حسبة نقل الكفالة وصفحة العامل: Edge Function
   `query-muqeem` (الرابط والمفتاح العام منسوخان حرفياً من WorkforcePage).
   الجلسة تُقرأ في الخادم فلا تمسّ المتصفّح، ولذلك يعمل من أي بيئة.
   يُرجع تاريخ انتهاء الإقامة ميلادياً — وهو ما يعنينا هنا. */
const MUQEEM_FN_URL = 'https://gcvshzutdslmdkwqwteh.supabase.co/functions/v1/query-muqeem'
const MUQEEM_FN_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdnNoenV0ZHNsbWRrd3F3dGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTkwNjgsImV4cCI6MjA5MDQ3NTA2OH0.5R0I5VvB7lp3wpSrtay3DMcXKsT9l1uK0Ukd1F4_ImM'
/* النداء الواحد يرجع **كل** ما يعطيه مقيم: انتهاء الإقامة (ميلادي وهجري)
   والمهنة وحالة المقيم وعدد مرات النقل. فصلناه عن `muqeemExpiry` كي تملأ
   الجلبة الواحدة أربع خانات في شيت الحسبات بدل أربعة نداءات — والاستدعاء
   مكلف: كل نداء يمرّ بجلسة مقيم الحيّة (JWT عمره ~15 دقيقة). */
const muqeemLookup = async (iqamaRaw, isAr) => {
  const iqama = String(iqamaRaw || '').replace(/\D/g, '')
  if (!/^[12]\d{9}$/.test(iqama)) throw new Error(isAr ? 'رقم إقامة غير صالح للاستعلام' : 'Invalid iqama number')
  const res = await fetch(MUQEEM_FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: MUQEEM_FN_KEY, Authorization: `Bearer ${MUQEEM_FN_KEY}` },
    body: JSON.stringify({ iqama }),
  }).catch(() => null)
  const data = res ? await res.json().catch(() => ({})) : {}
  if (!res || !res.ok || !data.ok) {
    // 400 من مقيم = لا بيانات لهذا المقيم (لا عطل في الخدمة) — يُقال كما هو
    throw new Error(data.status === 400
      ? (isAr ? 'لا توجد بيانات لهذا العامل في مقيم' : 'No Muqeem data for this worker')
      : (isAr ? 'خدمة مقيم غير متاحة حالياً — حاول لاحقاً' : 'Muqeem unavailable — try again later'))
  }
  return data.result || {}
}
const muqeemExpiry = async (iqamaRaw, isAr) => ymd((await muqeemLookup(iqamaRaw, isAr)).iqamaExpiryGregorian || '')

/* جلبةٌ واحدة تملأ عمود الانتهاء وإخوته الثلاثة — `runColFetch` يقبل خريطة
   {مفتاح العمود: القيمة} فيكتبها كلها معاً. الخانة الفارغة لا تُكتب (مقيم قد
   يسكت عن حقل)، والصفر في «مرات النقل» قيمةٌ لا فراغ. */
const muqeemRowPatch = async (iqamaRaw, isAr) => {
  const r = await muqeemLookup(iqamaRaw, isAr)
  const changes = typeof r.sponsorChanges === 'number' ? String(r.sponsorChanges) : ''
  return {
    mq_iqama_expiry: ymd(r.iqamaExpiryGregorian || ''),
    mq_occupation: r.occupationAr || '',
    mq_status: r.statusAr || '',
    mq_sponsor_changes: changes,
    mq_at: todayYmd(),
  }
}

/* مرحلة **تشغيليّة** بعد إنجاز المعاملة: تسليم بطاقة الإقامة للعميل. النظام لا
   يعرفها — `stage_data` أربع مراحل تنتهي بمقيم — فهي متابعةُ مكتبٍ تُخزَّن في
   طبقة الشيت وحدها ولا تُرحَّل. لذلك هي **خارج `TR_STAGES`**: لا تدخل ترتيب
   المراحل ولا حساب «المرحلة الحالية» ولا الترحيل، وتأخذ شكل المراحل نفسه
   (قائمة ملوّنة وفاصل ذهبي) لأن الموظف يقرؤها كأخواتها. */
const TR_DELIVERY = { key: 'delivery', ar: 'توصيل الإقامة', st: 'tr_s_deliv' }

/* مدّة التجديد = ما بين **انتهاء الإقامة الحالية** و**انتهائها الجديد** بالتقويم
   لا بقسمةٍ على 30: شهورٌ ميلادية كاملة ثم ما دون الشهر أياماً — «31 يناير +
   شهر» = 28 فبراير لا 3 مارس.
   ⚠️ `setMonth` وحده يفيض في نهايات الشهور فيعطي أياماً **سالبة** (جرّبتُه:
   31/1 → 1/3 أعطى «شهر و-2 يوم»). فالإضافة تُبنى بيومٍ مقصوصٍ على آخر الشهر،
   والمسبار يُحسب من `a` في كل مرّة لا بتعديل مسبارٍ سبق أن فاض. */
const addMonths = (d0, n) => {
  const t = new Date(d0.getFullYear(), d0.getMonth() + n, 1)
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()
  t.setDate(Math.min(d0.getDate(), last))
  return t
}
const monthsDays = (from, to) => {
  const a = new Date(`${String(from).slice(0, 10)}T00:00:00`)
  const b = new Date(`${String(to).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(+a) || Number.isNaN(+b) || b <= a) return null
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  if (addMonths(a, m) > b) m -= 1
  if (m < 0) m = 0
  return { m, d: Math.round((b - addMonths(a, m)) / 86400000) }
}
/* صيغة المدّة حرفاً بحرف كما تقولها الفاتورة («8 أشهر و 6 أيام») — نفس قواعد
   الجمع في InvoicePage، فلا يقرأ الموظف مدّةً بصيغتين. */
const moU = (n, isAr) => (isAr ? ((n >= 3 && n <= 10) ? 'أشهر' : 'شهر') : (n === 1 ? 'month' : 'months'))
const dyU = (n, isAr) => (isAr ? ((n >= 3 && n <= 10) ? 'أيام' : 'يوم') : (n === 1 ? 'day' : 'days'))
const durText = (m, d, isAr) => {
  const p = []
  if (m > 0) p.push(`${m} ${moU(m, isAr)}`)
  if (d > 0) p.push(`${d} ${dyU(d, isAr)}`)
  return p.join(isAr ? ' و ' : ' · ')
}
const monthsDaysText = (md, isAr) => (md ? (durText(md.m, md.d, isAr) || (isAr ? '0 يوم' : '0 d')) : '')
/* مدّة التجديد = من **تاريخ النقل** إلى **انتهاء الإقامة في مقيم**:
   - البداية: `tr_move_date` المُدخَل، وإن كان فارغاً فتاريخ الفاتورة.
   - النهاية: انتهاء الإقامة المجلوب من مقيم، وإن لم يُجلب فالانتهاء الجديد
     (المُدخَل في مرحلة مقيم أو المتوقّع في الحسبة).
   تُقرأ بـ`ev` لا من الصفّ الخام، فتتحدّث **لحظة الكتابة** قبل الحفظ. */
const trActualDur = (r, pend) => {
  const from = ev(r, 'tr_move_date', pend) || ymd(r.invoice_at)
  const to = ev(r, 'mq_iqama_expiry', pend) || ev(r, 'tr_muq_expiry', pend) || TR_FIELDS.tr_muq_expiry(r)
  return (from && to) ? monthsDays(from, to) : null
}

/* مراجع تُحمَّل مرّة مع الشيت: المهن (الاسم ← المعرّف، فالمعاملة تُخزّن المعرّف
   لا النصّ) ومعرّف حالة الطلب «منجز». */
const TRX_REF = { occ: new Map(), doneStatusId: null }
const trNorm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
const trNum = (v) => { const n = parseFloat(latin(String(v ?? '')).replace(/[^\d.\-]/g, '')); return Number.isFinite(n) ? n : null }
const trSD = (r) => ((r && r.stage_data && typeof r.stage_data === 'object') ? r.stage_data : {})
const trStage = (r, k) => { const s = trSD(r)[k]; return (s && typeof s === 'object') ? s : null }
const trStoredSt = (r, k) => TR_ST_AR[trStage(r, k)?.status] || ''
/* الحالة الفعّالة لمرحلة: ما يكتبه المستخدم الآن ← المحفوظ في الشبكة ← المعاملة */
const trEff = (r, s, pend) => ev(r, s.st, pend) || trStoredSt(r, s.key)
/* ما تعرضه خانة كل حقلٍ حين لا إدخال فيها = ما في المعاملة. تعريفٌ واحد يقرأه
   العمود (`get`) والترحيل معاً — وإلا لقال الترحيلُ «ينقص انتهاء التأمين» وهو
   ظاهرٌ في الخليّة أمام الموظف لأنه جاء من المعاملة لا من يده. */
const TR_FIELDS = {
  tr_ins_company: (r) => trStage(r, 'insurance')?.company || r.insurance_company || '',
  tr_ins_policy: (r) => trStage(r, 'insurance')?.policy_no || '',
  tr_ins_expiry: (r) => ymd(trStage(r, 'insurance')?.expiry || r.insurance_expiry),
  tr_ins_amount: (r) => { const a = trStage(r, 'insurance')?.amount; return a == null ? '' : String(a) },
  tr_wp_months: (r) => { const m = trStage(r, 'work_permit')?.duration_months; return m == null ? '' : String(m) },
  tr_wp_expiry: (r) => ymd(trStage(r, 'work_permit')?.expiry || r.work_permit_expiry),
  tr_wp_amount: (r) => { const a = trStage(r, 'work_permit')?.amount; return a == null ? '' : String(a) },
  tr_muq_via: (r) => { const v = trStage(r, 'muqeem')?.via_contact; return v == null ? '' : (v ? 'نعم' : 'لا') },
  tr_muq_expiry: (r) => ymd(trStage(r, 'muqeem')?.iqama_expiry || r.expected_expiry_date),
  /* الاقتراح لا يأخذ المهنة الجديدة إلا إذا كانت **مفوترة** (رسم تغيير مهنة):
     غير المفوترة مشطوبةٌ في عمودها، فاقتراحُها هنا يُدخل مهنةً لم تُدفع في مقيم. */
  tr_muq_occupation: (r) => trStage(r, 'muqeem')?.occupation_name_ar
    || (depNum(r.prof_change_fee) > 0 ? r.new_occupation_name_ar : '') || r.occupation_name_ar || '',
}
const trFieldCol = (key, ar, en, w, kind) => ({ key, ar, en, w, kind, ops: true, get: TR_FIELDS[key] })
// القيمة الفعّالة لحقل عند الترحيل: ما كُتب في الشبكة ← ما في المعاملة
const trF = (r, data, k) => trNorm(data[k]) || trNorm(TR_FIELDS[k] ? TR_FIELDS[k](r) : '')
// مسار الملف داخل بكت المرفقات من رابطه العام — يُخزَّن مع صف المرفق كما تفعل صفحة الفاتورة
const trStoragePath = (url) => { const m = String(url || '').match(/\/object\/public\/attachments\/(.+)$/); return m ? decodeURIComponent(m[1]) : null }
const trApplies = (r, s) => !(s.onlyIfNotTransferOnly && r && r.transfer_only)
/* المرحلة التي ينتظرها الصف الآن — عمود «المرحلة الحالية» وحارس الترتيب معاً */
const trPending = (r, pend) => {
  for (const s of TR_STAGES) {
    if (!trApplies(r, s)) continue
    const v = trEff(r, s, pend)
    if (v !== TR_DONE && v !== TR_SKIP) return s
  }
  return null
}

/* عمود حالة المرحلة: قائمة منسدلة ملوّنة تعرض المحفوظ في المعاملة ما لم يُكتب
   فيها شيء. «لا يحتاج» لا تُعرض إلا لمرحلةٍ يقبلها النظام تخطّياً. */
const trStCol = (s) => ({
  key: s.st, ar: `مرحلة ${s.ar}`, en: s.ar, w: 135, kind: 'text', ops: true, select: true,
  // فاصلٌ ذهبي عند رأس كل مرحلة: المراحل الأربع أربع كتل لا شريطٌ واحد طويل
  sectionStart: true,
  /* القائمة واحدة في المراحل الأربع: تم · في الإنتظار · مشكلة. «لا يحتاج»
     و«ملغاة» تبقيان مفهومتين عرضاً (تُعرضان إن جاءتا من صفحة الفاتورة) لكنهما
     لا تُختاران من هنا. */
  options: () => s.opts || [TR_DONE, TR_WAIT, TR_ISSUE],
  bg: (v) => TR_ST_BG[v] || null,
  get: (r) => trStoredSt(r, s.key),
})
/* أعمدة رخصة العمل — تُقفَل في «نقل فقط» (النظام يتخطّى المرحلة أصلاً) */
const TR_WP_COLS = new Set(['tr_s_wp', 'tr_wp_months', 'tr_wp_expiry', 'tr_wp_amount', 'tr_wp_file'])

/* بصمة ما رُحِّل من مرحلة: الحالة + حقولها + ملفها. تُخزَّن في `<st>_p` فيُعرف
   المُرحَّل من غيره، **ويُعاد الترحيل تلقائياً إذا صحّح الموظف قيمةً بعده** —
   ختمُ وقتٍ مجرّد كان سيُجمّد الخطأ في المعاملة بلا سبيل لتصحيحه من الشبكة. */
const trFp = (r, s, data) => [trNorm(data[s.st]), ...s.req.map(([k]) => trF(r, data, k)), trNorm(data[s.file])].join('|')

/* ترحيل ما عُبِّئ إلى المعاملة — يُستدعى بعد الحفظ (view.afterSave).
   يُرحَّل من المراحل ما **كتبه المستخدم في هذا الشيت** (الموجود في `data`) دون
   ما هو معروضٌ من المعاملة أصلاً، فلا يُعاد كتابة مرحلةٍ لم تُمَسّ. */
const trPostStages = async (sb, savedRows, { user, isAr, rows }) => {
  const byId = new Map((rows || []).map((r) => [r._id, r]))
  const nowIso = new Date().toISOString()
  const byName = user?.person?.name_ar || user?.person?.name_en || null
  const held = [], posted = [], patch = {}
  let completed = 0
  for (const { id, data } of savedRows) {
    const row = byId.get(id); if (!row) continue
    const todo = TR_STAGES.filter((s) => trApplies(row, s) && TR_ST_CODE[trNorm(data[s.st])]
      && data[`${s.st}_p`] !== trFp(row, s, data))
    if (!todo.length) continue
    const sd = { ...trSD(row) }
    const patchCalc = {}
    const stamps = {}
    let doComplete = false
    let blocked = ''
    for (const s of todo) {
      const stAr = trNorm(data[s.st])
      const code = TR_ST_CODE[stAr]
      if (code === 'skipped' && !s.skip) { blocked = blocked || `«${s.ar}» لا تقبل «${TR_SKIP}»`; continue }
      /* «ملغاة» على المرحلة الأخيرة = إلغاء المعاملة كلها في النظام، وهو قرارٌ
         بسببٍ مكتوب — يبقى في صفحة الفاتورة. الشبكة تُنجز ولا تُلغي. */
      if (code === 'cancelled' && s.final) { blocked = blocked || 'إلغاء المعاملة يكون من صفحة الفاتورة'; continue }
      /* الترتيب: لا تُرحَّل مرحلةٌ وقبلها مرحلةٌ لم تُنجَز أو تُتخطَّ — المعاملة
         في النظام متسلسلة، وترحيلٌ خارج الترتيب يترك ثقباً لا تراه الفاتورة. */
      const prev = TR_STAGES.slice(0, TR_STAGES.indexOf(s)).filter((p) => trApplies(row, p))
        .find((p) => { const v = ev(row, p.st, data) || trStoredSt(row, p.key); return v !== TR_DONE && v !== TR_SKIP })
      if (prev && code !== 'cancelled') { blocked = blocked || `أكمل «${prev.ar}» قبل «${s.ar}»`; continue }
      const F = (k) => trF(row, data, k)
      if (code === 'done') {
        const gone = s.req.filter(([k]) => !F(k)).map(([, ar]) => ar)
        if (gone.length) { blocked = blocked || `«${s.ar}»: ${gone.join('، ')}`; continue }
      }
      if (code !== 'done') {
        sd[s.key] = { status: code, reason: trNorm(data.op_notes) || null, at: nowIso, by: user?.id || null, by_name: byName }
      } else if (s.key === 'transfer') {
        sd.transfer = { status: 'done', at: nowIso, by: user?.id || null, by_name: byName }
      } else if (s.key === 'insurance') {
        sd.insurance = { status: 'done', company: F('tr_ins_company'), policy_no: F('tr_ins_policy'),
          expiry: F('tr_ins_expiry') || null, amount: trNum(F('tr_ins_amount')), at: nowIso, by: user?.id || null, by_name: byName }
        patchCalc.insurance_company = F('tr_ins_company') || null
        patchCalc.insurance_expiry = F('tr_ins_expiry') || null
      } else if (s.key === 'work_permit') {
        sd.work_permit = { status: 'done', duration_months: trNum(F('tr_wp_months')), expiry: F('tr_wp_expiry') || null,
          amount: trNum(F('tr_wp_amount')), at: nowIso, by: user?.id || null, by_name: byName }
        patchCalc.work_permit_expiry = F('tr_wp_expiry') || null
      } else {
        const occName = F('tr_muq_occupation')
        const occId = TRX_REF.occ.get(occName) || null
        if (!occId) { blocked = blocked || `مهنة غير مسجّلة: ${occName}`; continue }
        sd.muqeem = { status: 'done', via_contact: F('tr_muq_via') === 'نعم', iqama_expiry: F('tr_muq_expiry') || null,
          occupation_id: occId, occupation_name_ar: occName, at: nowIso, by: user?.id || null, by_name: byName }
        patchCalc.occupation_id = occId
        patchCalc.occupation_name_ar = occName
        if (F('tr_muq_expiry')) patchCalc.expected_expiry_date = F('tr_muq_expiry')
        doComplete = true
      }
      stamps[`${s.st}_p`] = trFp(row, s, data)
      stamps.tr_posted_at = nowIso
    }
    if (!Object.keys(stamps).length) { if (blocked) held.push(blocked); continue }
    const { data: upd, error } = await sb.from('transfer_calculation')
      .update({ ...patchCalc, stage_data: sd, updated_at: nowIso, updated_by: user?.id || null })
      .eq('id', id).select('id')
    if (error) throw error
    if (!upd || !upd.length) { held.push(isAr ? 'تعذّر الحفظ في المعاملة — تحقّق من الصلاحيات' : 'Could not write to the transaction — check permissions'); continue }
    /* ملفات المراحل تُسجَّل مرفقاتٍ **للمعاملة** بنفس وسوم صفحة الفاتورة، فتظهر
       هناك مع بقيّة مرفقاتها (الملف نفسه مرفوعٌ سلفاً بخلية الملف). */
    const srId = row.service_request_id
    const files = TR_STAGES.filter((s) => s.file && stamps[`${s.st}_p`] && trNorm(data[s.file]))
    if (srId && files.length) {
      try {
        await sb.from('attachments').insert(files.map((s) => ({
          entity_type: 'service_request', entity_id: srId, file_name: fileNameOf(data[s.file]),
          file_url: data[s.file], storage_path: trStoragePath(data[s.file]),
          notes: s.note, uploaded_by: user?.id || null,
        })))
      } catch { /* تسجيل المرفق أفضل-جهد — لا يُبطل ترحيل المرحلة */ }
    }
    /* `data.tr_txn_done` حارسٌ لازم: صفوف الشيت لا يُعاد تحميلها بعد الترحيل،
       فحالة الطلب في الصف تبقى القديمة ولولاه لأُعيد إنجاز المعاملة كل حفظة. */
    if (doComplete && srId && TRX_REF.doneStatusId && !data.tr_txn_done
      && row.request_status_code !== 'done' && row.request_status_code !== 'cancelled') {
      const { data: srUpd } = await sb.from('service_requests')
        .update({ status_id: TRX_REF.doneStatusId, completed_by: user?.id || null, completed_at: nowIso, updated_at: nowIso })
        .eq('id', srId).select('id')
      if (srUpd && srUpd.length) { stamps.tr_txn_done = nowIso; completed++ }
      else held.push(isAr ? 'حُفظت المراحل ولم تُنجَز المعاملة — تحقّق من الصلاحيات' : 'Stages saved but the transaction was not completed — check permissions')
    }
    posted.push(id)
    patch[id] = { ...data, ...stamps }
    if (blocked) held.push(blocked)
  }
  if (Object.keys(patch).length) {
    const { error } = await sb.from('ops_sheet_rows').upsert(
      Object.entries(patch).map(([rowKey, d]) => ({ view_key: 'transfer_txn', row_key: rowKey, data: d, is_manual: false, hidden: false })),
      { onConflict: 'view_key,row_key' })
    if (error) throw error
  }
  const notes = []
  if (posted.length) notes.push(isAr ? `سُجّلت مراحل ${arCount(posted.length, 'معاملة', 'معاملتين', 'معاملات', 'معاملة')}` : `Stages saved for ${enNum(posted.length)} transaction(s)`)
  if (completed) notes.push(isAr ? `وأُنجزت ${arCount(completed, 'معاملة', 'معاملتان', 'معاملات', 'معاملة')}` : `${enNum(completed)} completed`)
  if (held.length) notes.push([...new Set(held)].join(' · '))
  return { note: notes.join(' · '), patch }
}

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
      // عمود إدخال: التطبيع يقع على المكتوب نفسه (`coerce`) لا على عرضه
      { key: 'absher_phone', ar: 'جوال أبشر', en: 'Absher phone', w: 150, kind: 'mono', ops: true, coerce: (v) => phone10(v) },
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
      /* «آخر مزامنة» لا تُقرأ من last_synced_at وحده — 404 من 1185 منشأة تتركه فارغاً
         لأن سحبها تمّ عبر مسار آخر (الموارد · طلباتي · ملفات طلباتي)، و55 منها
         منشآت تأمينات-فقط بلا سجل تجاري أصلاً فختمها في gosi_establishments.
         نأخذ أحدث ختم عبر كل هذه المسارات → تغطية 1184/1185. */
      const [src, gosi, crDocs] = await Promise.all([
        fetchAll(sb, 'sbc_facilities',
          'id,entity_full_name_ar,entity_full_name_en,cr_national_number,cr_status_ar,headquarter_city_ar,gosi_registration_number,hrsd_labor_office_id,hrsd_sequence_number,zakat_tax_number,coc_chamber_number,spl_national_address_id,last_synced_at,hrsd_synced_at,requests_synced_at,requests_files_synced_at',
          (q) => q.order('entity_full_name_ar', { nullsFirst: false })),
        fetchAll(sb, 'gosi_establishments', 'registration_no,synced_at'),
        listCrCertificates(sb),
      ])
      const gSync = new Map()
      for (const g of gosi) {
        if (!g.synced_at) continue
        const k = String(g.registration_no)
        if (maxDate(gSync.get(k), g.synced_at) === g.synced_at) gSync.set(k, g.synced_at)
      }
      return src.map((r) => ({
        ...r, _id: r.id,
        _last_sync: maxDate(r.last_synced_at, r.hrsd_synced_at, r.requests_synced_at,
          r.requests_files_synced_at, gSync.get(String(r.gosi_registration_number))),
        _cr_doc: crDocs.get(String(r.cr_national_number)) || '',
      }))
    },
    search: (r) => [r.entity_full_name_ar, r.entity_full_name_en, r.cr_national_number],
    addFields: [
      { key: 'entity_full_name_ar', ar: 'الاسم', en: 'Name', required: true },
      { key: 'cr_national_number', ar: 'الرقم الموحّد', en: 'Unified no.' },
    ],
    columns: [
      { key: 'entity_full_name_ar', ar: 'اسم المنشأة', en: 'Facility', w: 280, kind: 'text', manual: true, get: (r, isAr) => (isAr ? r.entity_full_name_ar : (r.entity_full_name_en || r.entity_full_name_ar)) || '' },
      { key: 'cr_national_number', ar: 'الرقم الموحّد', en: 'Unified no.', w: 140, kind: 'mono', manual: true },
      { key: 'headquarter_city_ar', ar: 'المدينة', en: 'City', w: 120, kind: 'text' },
      { key: 'gosi_registration_number', ar: 'رقم التأمينات', en: 'GOSI no.', w: 130, kind: 'mono' },
      { key: 'hrsd_number', ar: 'رقم الموارد البشرية', en: 'HRSD no.', w: 150, kind: 'mono', get: (r) => (r.hrsd_labor_office_id != null && r.hrsd_sequence_number) ? `${r.hrsd_labor_office_id}-${r.hrsd_sequence_number}` : '' },
      { key: 'zakat_tax_number', ar: 'الرقم المميز', en: 'VAT no.', w: 150, kind: 'mono' },
      { key: 'coc_chamber_number', ar: 'رقم الغرفة', en: 'Chamber no.', w: 130, kind: 'mono' },
      { key: 'spl_national_address_id', ar: 'رقم سبل', en: 'SPL no.', w: 140, kind: 'mono' },
      { key: 'cr_document', ar: 'مرفق السجل التجاري', en: 'CR document', w: 160, kind: 'link', doc: true,
        linkLabel: 'السجل التجاري', linkLabelEn: 'CR', get: (r) => r._cr_doc || '' },
      { key: 'last_synced_at', ar: 'آخر مزامنة', en: 'Last sync', w: 130, kind: 'date', get: (r) => ymd(r._last_sync) },
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
      phoneCol({ key: 'phone_no', ar: 'الهاتف', en: 'Phone', w: 120 }),
      phoneCol({ key: 'mobile_no', ar: 'الجوال', en: 'Mobile', w: 130 }),
      { key: 'email', ar: 'البريد', en: 'Email', w: 180, kind: 'text' },
      { key: 'website_url', ar: 'الموقع', en: 'Website', w: 160, kind: 'text' },
      { key: 'license_issuer', ar: 'جهة الترخيص', en: 'License issuer', w: 140, kind: 'text' },
      /* أرقام الجهات الحكومية (SBC) */
      { key: 'gosi_registration_number', ar: 'رقم التأمينات', en: 'GOSI no.', w: 130, kind: 'mono' },
      { key: 'hrsd_number', ar: 'رقم الموارد البشرية', en: 'HRSD no.', w: 150, kind: 'mono' },
      { key: 'zakat_tax_number', ar: 'الرقم المميز', en: 'VAT no.', w: 150, kind: 'mono' },
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
      { key: 'mudad_status', ar: 'حالة مدد', en: 'Mudad status', w: 130, kind: 'text',
        get: (r, isAr) => mudadStatus(r.mudad_status, isAr), bg: (v, r) => mudadStatusBg(v, r?.mudad_status) },
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
      // نفس سلوك شيت نقل الكفالة: الرقم بابٌ إلى فاتورته (`_id` هنا هو معرّفها)
      { key: 'invoice_no', ar: 'رقم الفاتورة', en: 'Invoice no.', w: 130, kind: 'open',
        open: (r) => goInvoice(r.id), openTip: { ar: 'فتح صفحة الفاتورة', en: 'Open the invoice' } },
      { key: 'service_ar', ar: 'الخدمة', en: 'Service', w: 150, kind: 'text' },
      { key: 'client_name', ar: 'العميل', en: 'Client', w: 200, kind: 'text' },
      { key: 'facility_ar', ar: 'المنشأة', en: 'Facility', w: 200, kind: 'text' },
      { key: 'request_ref_no', ar: 'رقم الطلب', en: 'Request no.', w: 130, kind: 'mono' },
      branchCol({ key: 'branch_code', ar: 'الفرع', en: 'Branch', w: 150 }),
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
    /* اسم المنشأة من السجل التجاري إن وُجد — القاعدة العامة (applySbcName) */
    sbcName: { unified: (r) => r.unified_number, field: 'facility_ar' },
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
      branchCol({ key: 'facility_branches', ar: 'الفرع', en: 'Branch', w: 150 }),
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
      phoneCol({ key: 'mobile', ar: 'الجوال', en: 'Mobile', w: 130 }),
      ...OPS_COLS,
    ],
  },

  /* ── تأشيرات العمل — v_ops_work_visas ──────────────────────────────────────
     الشيت مبنيٌّ على شاكلة شيت «نقل الكفالة» (`transfer_txn`): **ثلاث كتل**
     يفصلها الخطّ الذهبي —
       (1) **بيانات التأشيرة من الفاتورة**: الفاتورة والطلب والفرع والعميل
           والوسيط وحال السداد، ثم مواصفات التأشيرة كما طُلبت فيها (الجنسية
           والمهنة ونوع التأشيرة ونوع الطلب والجنس والسفارة والتكلفة).
       (2) **البيانات المدخلة**: المنشأة وأرقامها الثلاثة، ثم الإصدار (رقم
           التأشيرة والحدود وتاريخ الإصدار وحالة الاستخدام والملف).
       (3) **بيانات الوكالة**: رقمها وتاريخها ومكتبها وحالتها ورسومها ومرفقها.
     الصفّ **تأشيرةٌ لا فاتورة** — الفاتورة الواحدة تحمل عدّة تأشيرات، فتتكرّر
     كتلتها الأولى على صفوفها. الترتيب بتاريخ الفاتورة نازلاً فتتلاصق تأشيرات
     الفاتورة الواحدة، ومعه مِرقاةٌ فريدة (`id`) لأن الجلب يقع على صفحاتٍ من ألف
     صفّ وترتيبٌ غير فريدٍ يُكرّر صفوفاً ويُسقط أخرى بين صفحةٍ وأختها.
     ونقطة المصدر ذهبيّة في الكتل الثلاث: القيم كلها من النظام نفسه (الفاتورة
     والتأشيرة) — كما في شيت نقل الكفالة تماماً. */
  {
    key: 'work_visas',
    /* اسم المنشأة من السجل التجاري إن وُجد — القاعدة العامة (applySbcName) */
    sbcName: { unified: (r) => r.unified_number, field: 'facility_ar' },
    ar: 'تأشيرات العمل', en: 'Work visas',
    hintAr: 'تأشيرة لكل صف — بيانات التأشيرة من الفاتورة أولاً، ثم البيانات المدخلة (المنشأة وأرقامها والإصدار)، ثم بيانات الوكالة',
    hintEn: 'One row per visa — invoice data first, then entered data (facility & issuance), then wakalah',
    async load(sb) {
      const [src] = await Promise.all([
        fetchAll(sb, 'v_ops_work_visas', '*', (q) => q
          .order('invoice_at', { ascending: false, nullsFirst: false })
          .order('invoice_no', { nullsFirst: false })
          .order('id')),
        /* فهرس أرقام المنشآت — يُكمل اسم المنشأة ورقمَي التأمينات والموارد من
           الرقم الموحّد المكتوب على التأشيرة حين لا تكون مرتبطةً بمنشأةٍ في
           السجل الداخلي (نفس الفهرس الذي يستعمله شيت نقل الكفالة). */
        loadFacNums(sb),
      ])
      return src.map((r) => ({ ...r, _id: r.id }))
    },
    search: (r) => [r.invoice_no, r.request_ref_no, r.client_name, r.agent_name, r.worker_name,
      r.visa_number, r.border_number, r.unified_number, r.gosi_number, r.hrsd_number,
      r.facility_ar, r.wakalah_number],
    addFields: [
      { key: 'worker_name', ar: 'اسم العامل', en: 'Worker', required: true },
      { key: 'visa_number', ar: 'رقم التأشيرة', en: 'Visa no.' },
    ],
    columns: [
      /* ═══ (1) بيانات التأشيرة من الفاتورة ═══ */
      { key: 'invoice_no', ar: 'رقم الفاتورة', en: 'Invoice no.', w: 115, kind: 'open',
        open: (r) => goInvoice(r.invoice_id), openTip: { ar: 'فتح صفحة الفاتورة', en: 'Open the invoice' } },
      { key: 'invoice_at', ar: 'تاريخ الفاتورة', en: 'Invoice date', w: 115, kind: 'date', get: (r) => ymd(r.invoice_at) },
      branchCol({ key: 'branch_code', ar: 'الفرع', en: 'Branch', w: 150 }),
      { key: 'service_ar', ar: 'الخدمة', en: 'Service', w: 175, kind: 'text' },
      { key: 'request_ref_no', ar: 'رقم الطلب', en: 'Request no.', w: 120, kind: 'mono' },
      { key: 'client_name', ar: 'العميل', en: 'Client', w: 180, kind: 'text' },
      { key: 'agent_name', ar: 'الوسيط', en: 'Agent', w: 165, kind: 'text' },
      phoneCol({ key: 'agent_phone', ar: 'جوال الوسيط', en: 'Agent mobile', w: 130 }),
      /* الفاتورة في خليّة واحدة مرسومة (`kind:'pay'`) كما في شيت نقل الكفالة:
         الإجمالي وشارة النسبة وشريط التحصيل والمتبقّي. و`get` يبقى نصّاً مفهوماً —
         هو ما يُبحَث فيه ويُفرَز ويُصدَّر. */
      { key: 'inv_state', ar: 'الفاتورة', en: 'Invoice', w: 195, kind: 'pay',
        pay: (r) => ({ total: depNum(r.invoice_total), remaining: depNum(r.remaining_amount) }),
        get: (r, isAr2) => {
          const tot = depNum(r.invoice_total)
          if (!tot) return r.payment_state || ''
          const rem = depNum(r.remaining_amount)
          const pct = Math.round(((tot - rem) / tot) * 100)
          return `${enNum(tot)} · ${pct}%${rem > 0 ? ` · ${isAr2 ? 'متبقّي' : 'due'} ${enNum(rem)}` : ''}`
        } },
      { key: 'request_status_ar', ar: 'حالة الطلب', en: 'Request status', w: 120, kind: 'text',
        bg: (v, r) => (r.request_status_code === 'done' ? 'rgba(46,204,113,.26)'
          : r.request_status_code === 'cancelled' ? 'rgba(232,114,101,.26)' : null) },
      /* مواصفات التأشيرة كما طُلبت في الفاتورة — تُقرأ ولا تُدخَل هنا */
      { key: 'nationality_ar', ar: 'الجنسية', en: 'Nationality', w: 120, kind: 'text' },
      { key: 'occupation_ar', ar: 'المهنة', en: 'Occupation', w: 160, kind: 'text' },
      { key: 'visa_type_ar', ar: 'نوع التأشيرة', en: 'Visa type', w: 130, kind: 'text' },
      { key: 'order_kind_ar', ar: 'نوع الطلب', en: 'Order kind', w: 120, kind: 'text' },
      // مخزَّنة `male`/`female` من الاستيراد القديم — تُعرَّب عرضاً ولا يُمسّ المخزَّن
      { key: 'gender', ar: 'الجنس', en: 'Gender', w: 80, kind: 'text',
        get: (r, isAr2) => (!r.gender ? '' : (isAr2 ? (r.gender === 'female' ? 'أنثى' : 'ذكر') : r.gender)) },
      { key: 'embassy_ar', ar: 'السفارة', en: 'Embassy', w: 140, kind: 'text' },
      { key: 'visa_cost', ar: 'تكلفة التأشيرة', en: 'Visa cost', w: 120, kind: 'num' },

      /* ═══ (2) البيانات المدخلة ═══ */
      /* المنشأة أوّل ما يُدخَل: الرقم الموحّد ورقم الموارد هما ما يحدّدانها
         (راجع تسلسل الإصدار). واسمُها ورقما التأمينات والموارد يُكمَلان من فهرس
         أرقام المنشآت حين لا يعرفها السجل الداخلي، فلا تفرغ الخانة لمجرّد أن
         المنشأة لم تُربَط بعد. */
      { key: 'facility_ar', ar: 'المنشأة', en: 'Facility', w: 220, kind: 'text', sectionStart: true,
        get: (r) => r.facility_ar || (facNumOf(r.unified_number) || {}).name || '' },
      { key: 'unified_number', ar: 'الرقم الموحّد', en: 'Unified no.', w: 140, kind: 'mono', fg: facNumFg },
      { key: 'gosi_number', ar: 'رقم التأمينات', en: 'GOSI no.', w: 130, kind: 'mono',
        get: (r) => r.gosi_number || (facNumOf(r.unified_number) || {}).gosi || '' },
      { key: 'hrsd_number', ar: 'رقم الموارد البشرية', en: 'HRSD no.', w: 150, kind: 'mono',
        get: (r) => r.hrsd_number || (facNumOf(r.unified_number) || {}).hrsd || '' },
      { key: 'worker_name', ar: 'اسم العامل', en: 'Worker', w: 200, kind: 'text', manual: true },
      { key: 'visa_number', ar: 'رقم التأشيرة', en: 'Visa no.', w: 140, kind: 'mono', manual: true },
      { key: 'border_number', ar: 'رقم الحدود', en: 'Border no.', w: 130, kind: 'mono' },
      { key: 'visa_issue_date', ar: 'تاريخ الإصدار', en: 'Issue date', w: 120, kind: 'date', get: (r) => ymd(r.visa_issue_date) },
      { key: 'usage_status_ar', ar: 'حالة الاستخدام', en: 'Usage', w: 125, kind: 'text' },
      { key: 'visa_used', ar: 'مستخدَمة', en: 'Used', w: 90, kind: 'text', get: (r, isAr2) => yn(r.visa_used, isAr2) },
      { key: 'file_number', ar: 'رقم الملف', en: 'File no.', w: 95, kind: 'num' },
      /* المرفقات روابطُ Bubble قديمة تبدأ بـ`//` بلا بروتوكول — تُكمَّل عرضاً
         وإلا فُهمت مساراً نسبياً داخل التطبيق. */
      { key: 'visa_file', ar: 'ملف التأشيرة', en: 'Visa file', w: 130, kind: 'link', doc: true,
        linkLabel: 'التأشيرة', linkLabelEn: 'Visa', get: (r) => docUrl(r.visa_file_path) },
      { key: 'notes', ar: 'ملاحظات', en: 'Notes', w: 200, kind: 'text' },

      /* ═══ (3) بيانات الوكالة ═══ */
      { key: 'wakalah_number', ar: 'رقم الوكالة', en: 'Wakalah no.', w: 130, kind: 'mono', sectionStart: true },
      { key: 'wakalah_date', ar: 'تاريخ الوكالة', en: 'Wakalah date', w: 120, kind: 'date', get: (r) => ymd(r.wakalah_date) },
      { key: 'wakalah_office', ar: 'مكتب الوكالة', en: 'Wakalah office', w: 150, kind: 'text' },
      { key: 'wakalah_status_ar', ar: 'حالة الوكالة', en: 'Wakalah status', w: 125, kind: 'text' },
      /* الرسمان من الاستيراد القديم: الأوّل تصديق الخارجية (≈40 ر.س) والثاني
         مكتب الوكالة (35 ر.س) — كما تقوله رسائل البنك المرافقة لهما. */
      { key: 'wakalah_price_1', ar: 'رسم الخارجية', en: 'MOFA fee', w: 110, kind: 'num' },
      { key: 'wakalah_price_2', ar: 'رسم مكتب الوكالة', en: 'Wakalah office fee', w: 130, kind: 'num' },
      { key: 'wakalah_file', ar: 'ملف الوكالة', en: 'Wakalah file', w: 130, kind: 'link', doc: true,
        linkLabel: 'الوكالة', linkLabelEn: 'Wakalah', get: (r) => docUrl(r.wakalah_file_path) },

      { key: 'src', ar: 'المصدر', en: 'Source', w: 100, kind: 'text', get: (r, isAr) => (isAr ? 'النظام' : 'Office') },
      ...OPS_COLS,
    ],
  },

  /* ── نقل الكفالة — v_ops_transfers (حاسبة النقل) ─────────────────────────── */
  {
    key: 'transfers',
    /* الحسبات كلها (ولو بلا فاتورة) — تمييزاً عن شيت «نقل الكفالة» الذي صفُّه
       فاتورةٌ سارية وتُعبَّأ منه المراحل. */
    ar: 'نقل الكفالة — الحسبات', en: 'Transfer quotes',
    hintAr: 'حسبات نقل الكفالة — الإقامة والمهنة والرسوم والحالة وتاريخ الانتهاء المتوقّع',
    hintEn: 'Sponsorship transfer quotes — iqama, occupation, fees, status',
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
      branchCol({ key: 'branch_code', ar: 'الفرع', en: 'Branch', w: 150 }),
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
      phoneCol({ key: 'phone', ar: 'الجوال', en: 'Mobile', w: 130 }),
      /* ═══ مقيم — ما تقوله البوابة عن العامل **الآن** ═══
         الحسبة تُبنى على ما أُدخل يوم التسعير، وقد يمضي عليها أسابيع: تُجدَّد
         الإقامة، أو تتغيّر المهنة، أو يُنقَل العامل مرّةً أخرى فيقفز رسم النقل
         شريحةً. فزرّ الجلب في «انتهاء الإقامة (مقيم)» ينادي مقيم **مرّةً واحدة**
         ويملأ الخانات الأربع معاً (الانتهاء والمهنة والحالة ومرات النقل) ثم يختم
         يوم الجلب — فيُقارَن المجلوب بما في الحسبة سطراً بسطر.
         الخانات **تشغيليّة** (`ops`): تُخزَّن في طبقة الشيت ولا تمسّ الحسبة —
         الحسبة وثيقةٌ مجمّدة بسعرها، وتصحيحها يقع في صفحتها لا هنا. */
      { key: 'mq_iqama_expiry', ar: 'انتهاء الإقامة (مقيم)', en: 'Iqama expiry (Muqeem)', w: 165, kind: 'fetch', ops: true,
        sectionStart: true,
        fetchTip: { ar: 'جلب بيانات العامل من مقيم — يملأ الانتهاء والمهنة والحالة ومرات النقل', en: 'Fetch from Muqeem — fills expiry, occupation, status & transfers' },
        fetch: (r, ctx) => muqeemRowPatch(r.iqama_number, ctx.isAr),
        /* اختلافُ المجلوب عن انتهاء الإقامة في الحسبة نداءٌ لا وصف: الإقامة
           جُدّدت أو صُحّحت بعد التسعير، والمدّة المسعّرة مبنيّةٌ على القديم. */
        bg: (v, r) => (v && ymd(r.iqama_expiry_gregorian) && v !== ymd(r.iqama_expiry_gregorian)
          ? 'rgba(234,179,8,.26)' : null) },
      { key: 'mq_occupation', ar: 'المهنة (مقيم)', en: 'Occupation (Muqeem)', w: 165, kind: 'text', ops: true,
        bg: (v, r) => (v && r.occupation_name_ar && trNorm(v) !== trNorm(r.occupation_name_ar)
          ? 'rgba(234,179,8,.26)' : null) },
      { key: 'mq_status', ar: 'حالة المقيم (مقيم)', en: 'Resident status (Muqeem)', w: 150, kind: 'text', ops: true,
        bg: (v, r) => (v && r.resident_status_ar && trNorm(v) !== trNorm(r.resident_status_ar)
          ? 'rgba(234,179,8,.26)' : null) },
      /* مرّات النقل هي ما يحدّد شريحة الرسم (0 ← 2000 · 1 ← 4000 · 2+ ← 6000)،
         فاختلافها عن الحسبة يعني أن الرسم المُسعَّر لم يعد صحيحاً — أحمر لا أصفر. */
      { key: 'mq_sponsor_changes', ar: 'مرات النقل (مقيم)', en: 'Transfers (Muqeem)', w: 130, kind: 'num', ops: true,
        bg: (v, r) => (v !== '' && v != null && r.sponsor_changes != null
          && depNum(v) !== depNum(r.sponsor_changes) ? 'rgba(232,114,101,.26)' : null) },
      { key: 'mq_at', ar: 'تاريخ الجلب من مقيم', en: 'Fetched from Muqeem', w: 145, kind: 'date', ops: true },
      { key: 'src', ar: 'المصدر', en: 'Source', w: 100, kind: 'text', get: (r, isAr) => (isAr ? 'النظام' : 'Office') },
      ...OPS_COLS,
    ],
  },

  /* ── نقل الكفالة (المعاملة) — v_ops_transfer_invoices ─────────────────────
     صفٌّ لكل فاتورة نقل كفالة سارية. الأعمدة الأولى من النظام (الفاتورة والعامل
     والسداد)، ثم أعمدة المراحل يعبّئها المُعقّب فتُرحَّل بعد الحفظ إلى المعاملة
     نفسها (`trPostStages`). المرحلة المُنجَزة في النظام تظهر في خليّتها ولو لم
     تُدخَل من هنا — فالشيت مرآةُ المعاملة لا دفتراً موازياً لها. */
  {
    key: 'transfer_txn',
    ar: 'نقل الكفالة', en: 'Sponsorship transfer',
    hintAr: 'فاتورة نقل الكفالة ومراحلها — عبّئ المرحلة فتُسجَّل في المعاملة، وبمرحلة الإقامة تُنجَز · واكتب أحد أرقام المنشأة (الموحّد أو التأمينات أو الموارد) فتُملأ البقيّة واسمها من أي جدولٍ تعرفها',
    hintEn: 'Transfer invoices and their stages — filling a stage writes it to the transaction · typing any facility number (unified, GOSI or HRSD) fills the other two and the name from any table that knows it',
    /* الكتابة في المعاملة **بضغطة لا بحفظ**: `manualPost` يمنع الترحيل التلقائي
       بعد كل حفظة، و«رحّل للمعاملة الآن» في قائمة الصفّ (كليك يمين على رقم
       الصفّ) هي ما يُنفّذه. الحفظ يبقى تلقائياً في الشيت كما هو. */
    afterSave: trPostStages,
    manualPost: true,
    postLabel: { ar: 'رحّل للمعاملة الآن', en: 'Post to transaction now' },
    // صفٌّ فيه مرحلةٌ مُعبَّأة لم تصل المعاملة بعد (أو تغيّرت قيمتها بعد ترحيلها)
    repostable: (r) => {
      const d = (r && r._ops) || {}
      return TR_STAGES.some((s) => trApplies(r, s) && TR_ST_CODE[trNorm(d[s.st])] && d[`${s.st}_p`] !== trFp(r, s, d))
    },
    /* إرفاق مرفق النقل يختم تاريخه — مرّةً واحدة، ولا يدهس تاريخاً مكتوباً.
       وأرقام المنشأة الثلاثة يُكمل بعضها بعضاً (facNumStamp): ٢٦٣ فاتورةً من
       ٨٢٠ لا منشأة مرتبطة بطلبها، فخاناتها الأربع فارغة — يكتب المُعقّب رقماً
       واحداً منها فتُملأ البقيّة والاسم من أي جدولٍ يعرف المنشأة. */
    autoStamp: (row, ctx) => ((ctx.col === 'tr_move_file' && ctx.val)
      ? { tr_move_date: todayYmd() }
      : facNumStamp(row, ctx)),
    rowBg: (r) => (r.request_status_code === 'done' ? 'rgba(46,204,113,.10)' : null),
    /* الصفّ يُقفل بإنجاز المعاملة أو إلغائها في النظام. ويُقفل التوصيلُ معها
       متى سُلّمت الإقامة — عندها لم يبقَ في الملف شيء. */
    rowLocked: (r) => r.request_status_code === 'done' || r.request_status_code === 'cancelled',
    /* التوصيل يقع **بعد** الإنجاز، فقفلُه عليه فخّ: تُنجَز المعاملة فتُقفل الخانة
       التي لا تُملأ إلا بعدها. يبقى مفتوحاً حتى يُسجَّل التسليم. */
    lockExempt: (r, col) => {
      const k = col.key
      if (k === 'op_follow' || k === 'op_notes') return true
      if (av(r, TR_DELIVERY.st) === TR_DONE) return false
      return k.startsWith('tr_deliv') || k === TR_DELIVERY.st
    },
    // «نقل فقط» = لا رخصة عمل في هذه المعاملة، فخاناتها مقفولة لا فارغة تُغري بالتعبئة.
    // (وحالةُ تغيير المهنة مفتوحةٌ لكل الصفوف — كانت مقفولةً لمن لا مهنة جديدة
    // في حسبته، فبدت خانةً جامدةً بلا قائمة؛ والمكتب قد يتابعها قبل أن تُسجَّل.)
    cellLocked: (r, col) => !!(r.transfer_only && TR_WP_COLS.has(col.key)),
    async load(sb) {
      const [src, occs, doneSt] = await Promise.all([
        fetchAll(sb, 'v_ops_transfer_invoices', '*', (q) => q.order('invoice_at', { ascending: false, nullsFirst: false })),
        fetchAll(sb, 'occupations', 'id,name_ar', (q) => q.eq('is_active', true)),
        sb.from('lookup_items').select('id,code,category:lookup_categories!inner(category_key)')
          .eq('category.category_key', 'request_status').eq('code', 'done').maybeSingle(),
        loadFacNums(sb),                       // فهرس أرقام المنشآت — تعبئة الأرقام الثلاثة
      ])
      TRX_REF.occ = new Map((occs || []).map((o) => [trNorm(o.name_ar), o.id]))
      TRX_REF.doneStatusId = doneSt?.data?.id || null
      return src.map((r) => ({ ...r, _id: r.id }))
    },
    search: (r) => [r.invoice_no, r.worker_name, r.iqama_number, r.facility_ar, r.quote_no, r.phone, r.agent_name,
      r.unified_number, r.gosi_number, r.hrsd_number],
    columns: [
      /* الفاتورة والمعاملة */
      { key: 'invoice_no', ar: 'رقم الفاتورة', en: 'Invoice no.', w: 110, kind: 'open',
        open: (r) => goInvoice(r.invoice_id), openTip: { ar: 'فتح صفحة الفاتورة', en: 'Open the invoice' } },
      { key: 'invoice_at', ar: 'تاريخ الفاتورة', en: 'Invoice date', w: 115, kind: 'date', get: (r) => ymd(r.invoice_at) },
      branchCol({ key: 'branch_code', ar: 'الفرع', en: 'Branch', w: 150 }),
      /* المنشأة وأرقامها مصدرها **سجلّ المنشآت** لا الحسبة ولا الفاتورة، فلها
         نقطتها السماوية في دليل المصادر. الترتيب المعتاد: الموحّد ← التأمينات ←
         الموارد. وتفرغ حيث لا منشأة مرتبطة بالطلب (263 صفاً من 820) — فتُكتب
         باليد، ويكفي رقمٌ واحد منها ليُملأ الباقي (`facNumStamp`). */
      { key: 'facility_ar', ar: 'المنشأة', en: 'Facility', w: 220, kind: 'text' },
      { key: 'unified_number', ar: 'الرقم الموحّد', en: 'Unified no.', w: 140, kind: 'mono', fg: facNumFg },
      { key: 'gosi_number', ar: 'رقم التأمينات', en: 'GOSI no.', w: 130, kind: 'mono', fg: facNumFg },
      { key: 'hrsd_number', ar: 'رقم الموارد البشرية', en: 'HRSD no.', w: 150, kind: 'mono', fg: facNumFg },
      { key: 'client_name', ar: 'العميل', en: 'Client', w: 180, kind: 'text' },
      // الوسيط من الفاتورة (`invoices.agent_id`) لا من الحسبة — 614 من 820 لها وسيط
      { key: 'agent_name', ar: 'الوسيط', en: 'Agent', w: 170, kind: 'text' },
      phoneCol({ key: 'agent_phone', ar: 'جوال الوسيط', en: 'Agent mobile', w: 130 }),
      /* العامل */
      { key: 'worker_name', ar: 'اسم العامل', en: 'Worker', w: 200, kind: 'text', sectionStart: true },
      { key: 'iqama_number', ar: 'رقم الإقامة', en: 'Iqama no.', w: 120, kind: 'mono' },
      /* انتهاء الإقامة **الحالية** كما في الحسبة — وهو أول طرفَي «مدة التجديد»
         (الطرف الآخر «انتهاء الإقامة الجديد» في مرحلة مقيم). */
      { key: 'iqama_expiry_gregorian', ar: 'انتهاء الإقامة', en: 'Iqama expiry', w: 125, kind: 'date',
        get: (r) => ymd(r.iqama_expiry_gregorian) },
      { key: 'nationality', ar: 'الجنسية', en: 'Nationality', w: 110, kind: 'text' },
      phoneCol({ key: 'phone', ar: 'الجوال', en: 'Mobile', w: 125 }),
      { key: 'occupation_name_ar', ar: 'المهنة الحالية', en: 'Occupation', w: 150, kind: 'text' },
      /* مهنةٌ جديدة بلا رسم تغيير مهنة في الفاتورة = مكتوبةٌ في الحسبة ولم تُفوتَر،
         فلا تُنفَّذ. تُشطَب ولا تُخفى كي يراها الموظف ويعرف أنها ليست في محلّها. */
      { key: 'new_occupation_name_ar', ar: 'المهنة الجديدة', en: 'New occupation', w: 150, kind: 'text',
        strike: (v, r) => !!v && depNum(r.prof_change_fee) <= 0,
        openTip: null },
      /* متابعة تنفيذ تغيير المهنة — تشغيليّة لا تُرحَّل: النظام لا يعرف مرحلةً
         للمهنة (المهنة الجديدة تُكتب في مرحلة مقيم). ومقفولة لمن لا مهنة جديدة
         له أصلاً، فلا تُغري بتعبئة حالةٍ لشيءٍ ليس في الحسبة. */
      { key: 'tr_prof_state', ar: 'حالة تغيير المهنة', en: 'Profession change', w: 150, kind: 'text', ops: true, select: true,
        options: () => [TR_DONE, TR_WAIT, TR_ISSUE],
        bg: (v) => TR_ST_BG[v] || null },
      /* ما تقوله الفاتورة عن هذه الحسبة: إمّا «نقل فقط»، وإمّا **المدة المتوقعة في
         الإقامة** بنصّها كما في كرت الملخّص المالي — `duration_months/days`
         المجمّدان في الحسبة (492 من 682)، ثم أشهر التجديد لمن لا مدّة له. */
      { key: 'transfer_kind', ar: 'المدة المتوقعة', en: 'Expected duration', w: 140, kind: 'text',
        get: (r, isAr2) => {
          if (r.transfer_only) return isAr2 ? 'نقل فقط' : 'Transfer only'
          const t = durText(depNum(r.duration_months), depNum(r.duration_days), isAr2)
          if (t) return t
          const m = [r.renewal_months, r.billed_renewal_months, r.expected_duration_months].map(depNum).find((n) => n > 0)
          if (m) return `${m} ${moU(m, isAr2)}`
          return r.renew_iqama ? (isAr2 ? 'مع تجديد' : 'With renewal') : ''
        },
        fg: (v, r) => (r.transfer_only ? 'var(--tx2)' : undefined) },
      /* المدّة **محسوبةً من الحسبة نفسها**: من انتهاء الإقامة الحالية إلى انتهائها
         الجديد (المُدخَل في مرحلة مقيم إن وُجد، وإلا المتوقّع في الحسبة) بالشهور
         والأيام. وحيث لا تاريخ انتهاءٍ جديد أصلاً (457 صفاً) يبقى عدد الأشهر
         المفوتَر آخرَ ما يُقال، فلا تفرغ الخليّة بلا سبب. */
      { key: 'renew_months', ar: 'مدة التجديد', en: 'Renewal duration', w: 140, kind: 'text',
        get: (r, isAr2, pend) => {
          if (r.transfer_only) return ''
          const md = trActualDur(r, pend)
          if (md) return monthsDaysText(md, isAr2)
          const m = [r.renewal_months, r.billed_renewal_months, r.expected_duration_months].map(depNum).find((n) => n > 0)
          return m ? `${m} ${moU(m, isAr2)}` : ''
        },
        /* المحسوبة مقابل «المدة المتوقعة»: **الأطول وحده يُلوَّن أخضر**، وما دونه
           بلا خلفية — الخلفية في هذه الشبكة نداءٌ لا وصف، والأقصر هو الحال
           الغالب فتلوينه ضجيج. والمقارنة **شهراً بشهر ثم يوماً بيوم** لا بجمع
           الأيام: المتوقّع مسعَّرٌ بشهورٍ من ثلاثين يوماً والمحسوبة بشهورٍ تقويمية،
           فجمعُ الأيام كان سيقول «أطول» لكل مدّةٍ طويلة بلا سبب. */
        bg: (v, r) => {
          if (r.transfer_only) return null
          const act = trActualDur(r); if (!act) return null
          const em = depNum(r.duration_months), ed = depNum(r.duration_days)
          if (!em && !ed) return null
          const cmp = act.m !== em ? (act.m - em) : (act.d - ed)
          return cmp > 0 ? 'rgba(46,204,113,.26)' : null
        } },
      /* المدة الفعلية للإقامة — **بتعريف صفحة الفاتورة**: من يوم التسعير إلى
         انتهاء الإقامة المُدخَل في مرحلة مقيم، فتُقارَن مباشرةً بـ«المدة المتوقعة»
         (كلتاهما من نفس المبدأ). تفرغ حتى تُدخَل الإقامة الجديدة. */
      { key: 'actual_dur', ar: 'المدة الفعلية للإقامة', en: 'Actual iqama duration', w: 160, kind: 'text',
        get: (r, isAr2) => {
          const mu = trStage(r, 'muqeem')
          if (!mu || mu.status === 'cancelled' || !mu.iqama_expiry) return ''
          const start = r.priced_at || mu.at
          if (!start) return ''
          const md = monthsDays(start, mu.iqama_expiry)
          return md ? monthsDaysText(md, isAr2) : (isAr2 ? 'منتهية' : 'Expired')
        } },
      /* الفاتورة في خليّة واحدة مرسومة (`kind:'pay'`): الإجمالي وشارة النسبة
         وشريط التحصيل والمتبقّي. و`get` يبقى نصّاً مفهوماً — هو ما يُبحَث فيه
         ويُفرَز ويُصدَّر، فالشكل لا يُخفي القيمة عن بقيّة أدوات الشبكة. */
      /* نقطة المصدر ذهبية كبقيّة أعمدة هذا الشيت: قيمُه كلها من النظام نفسه
         (الفاتورة والحسبة)، فلا معنى لتمييز عمودٍ واحد بالأزرق — الأزرق في دليل
         المصادر لفواتير تُقرأ من شيتٍ آخر. */
      { key: 'inv_state', ar: 'الفاتورة', en: 'Invoice', w: 195, kind: 'pay',
        pay: (r) => ({ total: depNum(r.invoice_total ?? r.calc_total), remaining: depNum(r.remaining_amount) }),
        get: (r, isAr2) => {
          const tot = depNum(r.invoice_total ?? r.calc_total)
          if (!tot) return r.payment_state || ''
          const rem = depNum(r.remaining_amount)
          const pct = Math.round(((tot - rem) / tot) * 100)
          return `${enNum(tot)} · ${pct}%${rem > 0 ? ` · ${isAr2 ? 'متبقّي' : 'due'} ${enNum(rem)}` : ''}`
        } },
      /* المراحل — إدخال يُرحَّل إلى المعاملة */
      trStCol(TR_STAGES[0]),
      /* تاريخ النقل: يُختَم بيوم إرفاق مرفق النقل (المرفق هو الدليل، ويومُ رفعه
         هو يوم النقل عملياً). يُملأ مرّة ويبقى قابلاً للتصحيح بيد. */
      { key: 'tr_move_date', ar: 'تاريخ النقل', en: 'Transfer date', w: 125, kind: 'date', ops: true },
      { key: 'tr_move_file', ar: 'مرفق النقل', en: 'Transfer file', w: 140, kind: 'file', ops: true },
      trStCol(TR_STAGES[1]),
      trFieldCol('tr_ins_company', 'شركة التأمين', 'Insurer', 150, 'text'),
      trFieldCol('tr_ins_policy', 'رقم البوليصة', 'Policy no.', 130, 'mono'),
      trFieldCol('tr_ins_expiry', 'انتهاء التأمين', 'Insurance expiry', 125, 'date'),
      trFieldCol('tr_ins_amount', 'مبلغ التأمين', 'Insurance amount', 110, 'num'),
      { key: 'tr_ins_file', ar: 'مرفق البوليصة', en: 'Policy file', w: 140, kind: 'file', ops: true },
      trStCol(TR_STAGES[2]),
      trFieldCol('tr_wp_months', 'مدة الرخصة (شهر)', 'Permit months', 120, 'num'),
      trFieldCol('tr_wp_expiry', 'انتهاء الرخصة', 'Permit expiry', 125, 'date'),
      trFieldCol('tr_wp_amount', 'مبلغ الرخصة', 'Permit amount', 110, 'num'),
      { key: 'tr_wp_file', ar: 'مرفق الرخصة', en: 'Permit file', w: 140, kind: 'file', ops: true },
      trStCol(TR_STAGES[3]),
      { ...trFieldCol('tr_muq_via', 'التجديد عبر تواصل', 'Via contact', 130, 'text'), select: true, options: () => ['نعم', 'لا'] },
      trFieldCol('tr_muq_expiry', 'انتهاء الإقامة الجديد', 'New iqama expiry', 145, 'date'),
      /* المهنة تُخزَّن في المعاملة بمعرّفها لا بنصّها — فالمكتوب يُطابَق باسم مهنة
         مسجّلة، والاقتراح الافتراضي هو المهنة الجديدة في الحسبة. */
      { ...trFieldCol('tr_muq_occupation', 'المهنة (مقيم)', 'Occupation (Muqeem)', 170, 'text'),
        coerce: (v) => trNorm(v),
        validate: (v, r, isAr2) => (TRX_REF.occ.has(trNorm(v)) ? '' : (isAr2 ? `مهنة غير مسجّلة: ${v}` : `Unknown occupation: ${v}`)) },
      { key: 'tr_muq_file', ar: 'مرفق مقيم', en: 'Muqeem file', w: 140, kind: 'file', ops: true },
      /* انتهاء الإقامة كما يقوله **مقيم** الآن — يُجلب بالزر ويُخزَّن في الشيت،
         فيُقارَن بما أُدخل في المرحلة وبما في الحسبة. */
      { key: 'mq_iqama_expiry', ar: 'انتهاء الإقامة (مقيم)', en: 'Iqama expiry (Muqeem)', w: 165, kind: 'fetch', ops: true,
        fetchTip: { ar: 'جلب تاريخ انتهاء الإقامة من مقيم', en: 'Fetch iqama expiry from Muqeem' },
        fetch: (r, ctx) => muqeemExpiry(r.iqama_number, ctx.isAr) },
      /* توصيل الإقامة — متابعة مكتبٍ بعد الإنجاز، لا تُرحَّل للمعاملة */
      trStCol(TR_DELIVERY),
      { key: 'tr_deliv_date', ar: 'تاريخ التوصيل', en: 'Delivered on', w: 125, kind: 'date', ops: true },
      { key: 'tr_deliv_to', ar: 'اسم المستلم', en: 'Received by', w: 150, kind: 'text', ops: true },
      { key: 'tr_deliv_file', ar: 'مرفق التسليم', en: 'Delivery file', w: 140, kind: 'file', ops: true },
      /* الحالة */
      { key: 'txn_stage', ar: 'المرحلة الحالية', en: 'Current stage', w: 150, kind: 'text', readOnly: true, sectionStart: true,
        get: (r, isAr2, pend) => {
          if (r.request_status_code === 'cancelled') return isAr2 ? 'المعاملة ملغاة' : 'Cancelled'
          if (r.request_status_code === 'done') return isAr2 ? 'منجزة' : 'Completed'
          const s = trPending(r, pend)
          return s ? s.ar : (isAr2 ? 'بانتظار الترحيل' : 'Awaiting posting')
        },
        bg: (v, r) => (r.request_status_code === 'done' ? 'rgba(46,204,113,.26)'
          : r.request_status_code === 'cancelled' ? 'rgba(232,114,101,.26)' : null) },
      /* حالة المعاملة بالكامل = **آخر ما وصلت إليه** لا ما يُختار: تُقرأ من
         المراحل نفسها (آخر مرحلة أُنجزت أو تُخطّيت، والتوصيل بعدها). فهي مرآة
         للعمل لا خانةً تُملأ — وأختها «المرحلة الحالية» تقول ما ينتظر بعدها. */
      { key: 'tr_reached', ar: 'حالة المعاملة بالكامل', en: 'Overall status', w: 190, kind: 'text', readOnly: true,
        /* سطران: **آخر ما تمّ** فوق، وتحته **كم مرحلة تمّت وأين وقفت** — فالسؤالان
           اللذان يُسألان عن أي معاملة («وين وصلت؟» و«وين واقفة؟») يُجابان بنظرة
           واحدة. العدد على المراحل التي تخصّ هذه المعاملة (ثلاث في «نقل فقط»). */
        get: (r, isAr2, pend) => {
          if (r.request_status_code === 'cancelled') return isAr2 ? 'ملغاة' : 'Cancelled'
          const mine = TR_STAGES.filter((s) => trApplies(r, s))
          const done = mine.filter((s) => { const v = trEff(r, s, pend); return v === TR_DONE || v === TR_SKIP })
          const last = done.length ? done[done.length - 1] : null
          const next = trPending(r, pend)
          const head = ev(r, TR_DELIVERY.st, pend) === TR_DONE ? (isAr2 ? 'تم التوصيل' : 'Delivered')
            : last ? (isAr2 ? (TR_REACHED_AR[last.key] || last.ar) : (TR_REACHED_EN[last.key] || last.ar))
              : (isAr2 ? 'لم تبدأ' : 'Not started')
          const tail = isAr2
            ? `${done.length} من ${mine.length} · ${next ? `واقفة عند ${next.ar}` : 'اكتملت المراحل'}`
            : `${done.length}/${mine.length} · ${next ? `at ${next.ar}` : 'all stages done'}`
          return `${head}\n${tail}`
        },
        bg: (v, r) => (r.request_status_code === 'cancelled' ? 'rgba(232,114,101,.26)'
          : (av(r, TR_DELIVERY.st) === TR_DONE || r.request_status_code === 'done') ? 'rgba(46,204,113,.26)' : null) },
      { key: 'request_status_ar', ar: 'حالة الطلب في النظام', en: 'System status', w: 130, kind: 'text' },
      { key: 'tr_posted_at', ar: 'آخر ترحيل للمعاملة', en: 'Last posted', w: 140, kind: 'date', ops: true, readOnly: true,
        get: (r) => ymd(av(r, 'tr_posted_at')) },
      ...OPS_COLS,
    ],
  },

  /* ── نطاقات والاستقطاب — qiwa_companies ──────────────────────────────────── */
  {
    key: 'nitaqat',
    /* قوى تحمل اسمها الخاص — السجل التجاري أصحّ (القاعدة العامة) */
    sbcName: { unified: (r) => r.cr_national_number, field: 'establishment_name' },
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
    /* اسم المنشأة من السجل التجاري إن وُجد — القاعدة العامة (applySbcName) */
    sbcName: { unified: (r) => r.unified_number, field: 'facility_ar' },
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
    /* اسم المنشأة من السجل التجاري إن وُجد — القاعدة العامة (applySbcName) */
    sbcName: { unified: (r) => r.unified_number, field: 'facility_ar' },
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
    /* اسم المنشأة من السجل التجاري إن وُجد — القاعدة العامة (applySbcName) */
    sbcName: { unified: (r) => r.unified_number, field: 'facility_ar' },
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
    /* اسم المنشأة من السجل التجاري إن وُجد — القاعدة العامة (applySbcName) */
    sbcName: { unified: (r) => r.unified_number, field: 'facility_ar' },
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
    /* اسم المنشأة من السجل التجاري إن وُجد — القاعدة العامة (applySbcName) */
    sbcName: { unified: (r) => r.unified_number, field: 'facility_ar' },
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
    /* اسم المنشأة من السجل التجاري إن وُجد — القاعدة العامة (applySbcName) */
    sbcName: { unified: (r) => r.unified_number, field: 'facility_ar' },
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
      phoneCol({ key: 'phone', ar: 'الجوال', en: 'Mobile', w: 130 }),
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
    /* اسم المنشأة من السجل التجاري إن وُجد — القاعدة العامة (applySbcName) */
    sbcName: { unified: (r) => r.unified_number, field: 'facility_ar' },
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
    /* اسم المنشأة من السجل التجاري إن وُجد — القاعدة العامة (applySbcName) */
    sbcName: { unified: (r) => r.unified_number, field: 'facility_ar' },
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
    hintAr: 'منشآت مدد وعمّالها غير السعوديين — الالتزام والمخالفات، واسم العامل وإقامته وراتبه من التأمينات',
    hintEn: 'Mudad establishments & their non-Saudi workers — compliance plus GOSI name, iqama & wage',
    /* صفٌّ لكل **عامل غير سعودي**، وبطاقة المنشأة مدمجة رأسياً فوق عمّالها (نفس
       نمط عروض العمالة والسعودة). المنشأة بلا عامل غير سعودي تبقى بصفٍّ واحد
       فارغ الأعمدة العمّالية — كي لا تختفي منشأة من الشيت. */
    // الترقيم بالمنشأة لا بالعامل — «١، ٢، ٣…» عدد المنشآت لا عدد الصفوف
    groupNumbering: true,
    mergeKey: (r) => String(r.national_unified_id || r.mlsd_unified_id || ''),
    mergeCols: ['name', 'national_unified_id', 'mlsd_unified_id', 'gosi_number', 'hrsd_number',
      'compliance_percentage', 'compliance_status', 'wage_period', 'open_violations',
      'pending_justifications', 'active_employment', 'wps_notes_score', 'src', 'sync_person', 'last_synced_at',
      'op_follow', 'op_notes'],
    /* «المتابعة» و«الملاحظات» شأنُ المنشأة لا العامل — خليّة واحدة لكل منشأة،
       وقيمتها تُخزَّن تحت مفتاح المنشأة فلا تتبدّل ولا تضيع مع تغيّر عمّالها. */
    groupRowKey: (r) => (r.mlsd_unified_id ? `fac__${r.mlsd_unified_id}` : null),
    groupCols: ['op_follow', 'op_notes'],
    async load(sb) {
      /* أربعة مصادر: مدد (الصف الأساس) · قوى لدرجة ملاحظات WPS · المنشآت لأرقام
         التأمينات والموارد · مشتركو التأمينات للعمّال. سلسلة الربط:
         مدد.national_unified_id → facilities.unified_number → gosi_number →
         gosi_establishment_contributors.registration_no */
      const [src, qc, facs, contrib] = await Promise.all([
        fetchAll(sb, 'mudad_establishments',
          'mlsd_unified_id,national_unified_id,name,compliance_percentage,compliance_status,wage_period,open_violations,pending_justifications,active_employment,last_synced_at,detail_synced_at,person_id',
          (q) => q.order('name', { nullsFirst: false })),
        fetchAll(sb, 'qiwa_companies', 'cr_national_number,score_notes_in_wps,detail_synced_at,synced_at'),
        fetchAll(sb, 'facilities', 'unified_number,gosi_number,hrsd_number'),
        fetchAll(sb, 'gosi_establishment_contributors',
          'id,registration_no,iqama_no,national_id,nationality_ar,first_name_ar,second_name_ar,third_name_ar,family_name_ar,full_name_en,wage_total,status_type'),
      ])
      /* qiwa_companies مكرَّر (1171 صفاً / 968 رقماً) — أحدث صفٍّ لكل رقم */
      const wps = new Map()
      for (const c of qc) {
        const k = c.cr_national_number
        if (!k) continue
        const t = String(c.detail_synced_at || c.synced_at || '')
        const prev = wps.get(k)
        if (!prev || t > prev.t) wps.set(k, { t, score: c.score_notes_in_wps })
      }
      const fmap = new Map()
      for (const f of facs) {
        if (!f.unified_number) continue
        const prev = fmap.get(f.unified_number)
        // أوّل صفٍّ يحمل رقمي التأمينات والموارد يفوز (الجدول قد يحمل صفوفاً ناقصة)
        if (!prev || (!prev.gosi_number && f.gosi_number)) fmap.set(f.unified_number, f)
      }
      /* العمّال المعروضون **غير السعوديين** فقط (طلب المستخدم) */
      const cmap = new Map()
      for (const w of contrib) {
        if (!w.registration_no || isSaudiContributor(w)) continue
        const a = cmap.get(w.registration_no)
        if (a) a.push(w); else cmap.set(w.registration_no, [w])
      }
      const gosiName = (w) => [w.first_name_ar, w.second_name_ar, w.third_name_ar, w.family_name_ar]
        .filter(Boolean).join(' ').trim() || w.full_name_en || ''
      const rows = []
      for (const r of src) {
        const f = fmap.get(r.national_unified_id)
        const base = {
          ...r,
          gosi_number: f?.gosi_number || '',
          hrsd_number: f?.hrsd_number || '',
          wps_notes_score: wps.get(r.national_unified_id)?.score ?? null,
        }
        const ws = (f?.gosi_number && cmap.get(f.gosi_number)) || []
        if (!ws.length) { rows.push({ ...base, _id: r.mlsd_unified_id, name_ar: '', iqama_no: '', wage_total: null }); continue }
        for (const w of ws) {
          const idn = w.iqama_no || w.national_id || ''
          rows.push({
            ...base,
            _id: `${r.mlsd_unified_id}__${idn || w.id}`,
            /* `name_ar` هو مفتاح عمود اسم العامل — واسمه هذا مقصود: `nameRank`
               يرتّب داخل كل مجموعة دمج بـname_ar، فيتجاور عمّال المنشأة مرتَّبين. */
            name_ar: gosiName(w),
            iqama_no: idn,
            wage_total: w.wage_total,
            gosi_status: w.status_type,
          })
        }
      }
      return attachSyncPerson(sb, await attachSbcName(sb, rows, (r) => r.national_unified_id))
    },
    // الاسم الأصلي في مدد (`r.name`) يبقى في البحث ولو عُرض اسم السجل التجاري
    search: (r) => [r.name, r.sbc_name_ar, r.national_unified_id, r.mlsd_unified_id, r.gosi_number, r.hrsd_number,
      r.sync_person, r.name_ar, r.iqama_no],
    addFields: [{ key: 'name', ar: 'اسم المنشأة', en: 'Establishment', required: true }],
    columns: [
      /* الاسم من المركز السعودي للأعمال متى وُجد — واسم مدد احتياطياً */
      { key: 'name', ar: 'اسم المنشأة', en: 'Establishment', w: 240, kind: 'text', manual: true,
        get: (r, isAr) => sbcName(r, isAr, r.name) },
      { key: 'national_unified_id', ar: 'الرقم الوطني الموحّد', en: 'National unified', w: 150, kind: 'mono' },
      /* نفس تسمية كرت مدد في مركز المزامنة — «رقم منشأة مدد» لا «معرّف» */
      { key: 'mlsd_unified_id', ar: 'رقم منشأة مدد', en: 'Mudad establishment no.', w: 150, kind: 'mono' },
      /* رقما التأمينات والموارد من جدول المنشآت — نفس ترتيبهما في كل الشيتات */
      { key: 'gosi_number', ar: 'التأمينات', en: 'GOSI', w: 130, kind: 'mono' },
      { key: 'hrsd_number', ar: 'رقم الموارد', en: 'HRSD', w: 130, kind: 'mono' },
      { key: 'compliance_percentage', ar: 'نسبة الالتزام', en: 'Compliance', w: 120, kind: 'num' },
      { key: 'compliance_status', ar: 'حالة الالتزام', en: 'Status', w: 130, kind: 'text',
        get: (r, isAr) => mudadStatus(r.compliance_status, isAr), bg: (v, r) => mudadStatusBg(v, r?.compliance_status) },
      { key: 'wage_period', ar: 'فترة الأجور', en: 'Wage period', w: 120, kind: 'text', get: (r) => mudadPeriod(r.wage_period) },
      { key: 'open_violations', ar: 'مخالفات مفتوحة', en: 'Open violations', w: 130, kind: 'text', get: (r, isAr) => yn(r.open_violations, isAr) },
      { key: 'pending_justifications', ar: 'مبررات معلّقة', en: 'Pending justif.', w: 130, kind: 'text', get: (r, isAr) => yn(r.pending_justifications, isAr) },
      { key: 'active_employment', ar: 'توظيف نشط', en: 'Active employ.', w: 110, kind: 'text', get: (r, isAr) => yn(r.active_employment, isAr) },
      /* مؤشّر قوى لا مدد — 100 = بلا ملاحظات (أخضر) · 0 = عليها ملاحظات (أحمر) */
      { key: 'wps_notes_score', ar: 'درجة ملاحظات WPS', en: 'WPS notes score', w: 150, kind: 'num', source: 'sync',
        bg: (v) => { const n = parseFloat(latin(String(v ?? ''))); return Number.isNaN(n) ? null : (n >= 100 ? 'rgba(46,204,113,.32)' : 'rgba(232,114,101,.32)') } },
      { key: 'src', ar: 'المصدر', en: 'Source', w: 90, kind: 'text', get: (r, isAr) => (isAr ? 'مدد' : 'Mudad') },
      SYNC_PERSON_COL,
      /* أحدث الختمين: مسح القائمة (last_synced_at، يُختم لكل الصفوف في كل تشغيل)
         ومسح تفاصيل المنشأة (detail_synced_at، يُختم عند نجاح المنشأة وحدها) —
         فالتاريخ حاضر دائماً ويعكس آخر مرة لمستها المزامنة فعلاً. */
      { key: 'last_synced_at', ar: 'آخر مزامنة', en: 'Last sync', w: 140, kind: 'date',
        get: (r) => ymd(maxDate(r.last_synced_at, r.detail_synced_at)) },
      /* ── عمّال المنشأة من التأمينات — صفٌّ لكل عامل (غير مدمجة) ───────────── */
      { key: 'name_ar', ar: 'اسم العامل', en: 'Worker', w: 220, kind: 'text' },
      { key: 'iqama_no', ar: 'رقم الإقامة', en: 'Iqama no.', w: 130, kind: 'mono' },
      { key: 'wage_total', ar: 'الراتب', en: 'Wage', w: 110, kind: 'num' },
      /* «المتابعة» هنا قائمة محصورة بحالتَي رفع ملف الأجور — تخصّ شيت مدد وحده،
         وفي بقية الشيتات تبقى `OPS_COLS.op_follow` نصّاً حرّاً كما كانت. */
      { key: 'op_follow', ar: 'المتابعة', en: 'Follow-up', w: 150, kind: 'text', ops: true, select: true,
        options: () => ['تم رفع الملف', 'مشكلة'],
        bg: (v) => (v === 'تم رفع الملف' ? 'rgba(46,204,113,.32)' : v === 'مشكلة' ? 'rgba(232,114,101,.32)' : null) },
      OPS_COLS[1],
    ],
  },

  /* ── اجير — ajeer_establishments ─────────────────────────────────────────── */
  {
    key: 'ajeer',
    ar: 'اجير', en: 'Ajeer',
    hintAr: 'منشآت أجير — نوع الحساب وحالة الحجب ومؤشرات الأداء',
    hintEn: 'Ajeer establishments — account type, block status & indicators',
    async load(sb) {
      /* أجير لا يحمل الرقم الموحّد — يُستنبَط من `facilities` برقم الموارد
         (`establishment_no` = `hrsd_number`) ثم يُقاد به اسمُ السجل التجاري. */
      const [src, facs] = await Promise.all([
        fetchAll(sb, 'ajeer_establishments',
          'establishment_no,name,account_type,is_blocked,blocked_reason,indicator_weekly,indicator_quarterly,indicator_yearly,last_synced_at,person_id',
          (q) => q.order('name', { nullsFirst: false })),
        fetchAll(sb, 'facilities', 'hrsd_number,unified_number'),
      ])
      const hmap = new Map()
      for (const f of facs) {
        if (!f.hrsd_number) continue
        const prev = hmap.get(f.hrsd_number)
        if (!prev || (!prev.unified_number && f.unified_number)) hmap.set(f.hrsd_number, f)
      }
      const rows = src.map((r) => ({ ...r, _id: r.establishment_no, _unified: hmap.get(r.establishment_no)?.unified_number || '' }))
      return attachSyncPerson(sb, await attachSbcName(sb, rows, (r) => r._unified))
    },
    search: (r) => [r.name, r.sbc_name_ar, r.establishment_no, r._unified, r.sync_person],
    addFields: [{ key: 'name', ar: 'اسم المنشأة', en: 'Establishment', required: true }],
    columns: [
      /* الاسم من المركز السعودي للأعمال متى وُجد — واسم أجير احتياطياً */
      { key: 'name', ar: 'اسم المنشأة', en: 'Establishment', w: 240, kind: 'text', manual: true,
        get: (r, isAr) => sbcName(r, isAr, r.name) },
      { key: 'establishment_no', ar: 'رقم المنشأة', en: 'Establishment no.', w: 150, kind: 'mono' },
      { key: 'account_type', ar: 'نوع الحساب', en: 'Account type', w: 130, kind: 'text' },
      { key: 'is_blocked', ar: 'محجوب', en: 'Blocked', w: 90, kind: 'text', get: (r, isAr) => yn(r.is_blocked, isAr) },
      { key: 'blocked_reason', ar: 'سبب الحجب', en: 'Block reason', w: 180, kind: 'text' },
      { key: 'indicator_weekly', ar: 'مؤشر أسبوعي', en: 'Weekly', w: 110, kind: 'num' },
      { key: 'indicator_quarterly', ar: 'مؤشر ربعي', en: 'Quarterly', w: 120, kind: 'num' },
      { key: 'indicator_yearly', ar: 'مؤشر سنوي', en: 'Yearly', w: 110, kind: 'num' },
      { key: 'src', ar: 'المصدر', en: 'Source', w: 90, kind: 'text', get: (r, isAr) => (isAr ? 'أجير' : 'Ajeer') },
      SYNC_PERSON_COL,
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

  /* ── متابعة الإيداعات — بديل «متابعة_الإيداعات.xlsx» ─────────────────────── */
  {
    key: 'deposits',
    ar: 'متابعة الإيداعات', en: 'Deposit tracking',
    hintAr: 'المستحق والحوالة يُجلبان من دفعات فواتير المكتب · المودَع إدخال يدوي · المتبقي يُرحَّل لليوم التالي',
    hintEn: 'Due & transfers pulled from office invoice payments · deposited is entered · remainder carries to the next day',
    // كل مكتب جدوله المستقل (أزرار فوق الشبكة) بدل خلط الفروع في جدول واحد —
    // فلا دمج رأسي ولا عمود مكتب مكرَّر في كل صف؛ هوية المكتب في الزر المختار.
    tabs: { key: (r) => r.branch_code || '', label: (r) => r.branch_name || r.branch_code || '' },
    derive: depDerive,
    summary: depSummary,
    /* تفصيل الخلية القابلة للفتح: الدفعات التي كوّنت مستحق ذلك اليوم. مُتحقَّق
       أن مجموع سطور «نقد» يساوي رقم الشيت تماماً. */
    drillLoad: async (sb, row, isAr) => {
      const { data, error } = await sb.from('v_ops_office_deposit_lines')
        .select('amount,method_ar,method_code,receipt_no,invoice_no,service_ar,client_name,facility_ar,created_by_name,paid_at')
        .eq('branch_code', row.branch_code).eq('pay_date', row.dep_date)
        .order('paid_at', { ascending: true })
      if (error) throw error
      const lines = data || []
      const cash = lines.filter((l) => l.method_code === 'cash').reduce((a, l) => a + Number(l.amount || 0), 0)
      return {
        title: (isAr ? 'تفصيل مستحق ' : 'Due breakdown ') + row.dep_date + ' — ' + (row.branch_name || row.branch_code),
        note: isAr
          ? `${enNum(lines.length)} دفعة · منها نقد ${enNum(cash)} ريال (وهو المبلغ المستحق في الشيت)`
          : `${enNum(lines.length)} payments · cash ${enNum(cash)} SAR (the sheet's due figure)`,
        columns: [
          { key: 'invoice_no', ar: 'الفاتورة', en: 'Invoice', mono: true },
          { key: 'client_name', ar: 'العميل', en: 'Client' },
          { key: 'service_ar', ar: 'الخدمة', en: 'Service' },
          { key: 'amount', ar: 'المبلغ', en: 'Amount', num: true },
          { key: 'method_ar', ar: 'الطريقة', en: 'Method' },
          { key: 'receipt_no', ar: 'رقم السند', en: 'Receipt', mono: true },
          { key: 'created_by_name', ar: 'سجّلها', en: 'Recorded by' },
        ],
        rows: lines,
      }
    },
    async load(sb) {
      const [agg, ovKeys] = await Promise.all([
        fetchAll(sb, 'v_ops_office_deposits',
          'branch_id,branch_code,branch_name_ar,pay_date,cash_total,bank_total,bank_files',
          (q) => q.gte('pay_date', DEP_START)),
        // مفاتيح الإدخال المحفوظ فقط (لا حمولة) — لتحديد نهاية المدى بأمان
        sb.from('ops_sheet_rows').select('row_key').eq('view_key', 'deposits'),
      ])
      // المكاتب = ما ظهر منها في الحركة (فينضمّ أي مكتب جديد تلقائياً)
      const offices = new Map()
      for (const a of agg) if (!offices.has(a.branch_code)) offices.set(a.branch_code, a.branch_name_ar || a.branch_code)
      const byKey = new Map(agg.map((a) => [a.branch_code + '|' + a.pay_date, a]))
      let end = depToday()
      for (const a of agg) if (a.pay_date > end) end = a.pay_date
      for (const o of (ovKeys.data || [])) { const d = String(o.row_key).split('|')[1]; if (d && d > end) end = d }
      const days = depDateSpine(end)
      const out = []
      for (const [code, name] of [...offices.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        for (const d of days) {
          const a = byKey.get(code + '|' + d.ymd)
          out.push({
            _id: code + '|' + d.ymd,          // مفتاح overlay ثابت لا يتأثّر بإعادة الترتيب
            branch_code: code, branch_name: name,
            dep_date: d.ymd, dep_dow: d.dow,
            dep_due: a ? Number(a.cash_total) : 0,
            dep_bank: a ? Number(a.bank_total) : 0,
            bank_files: (a && a.bank_files) || [],
          })
        }
      }
      return out
    },
    search: (r) => [r.branch_code, r.branch_name, r.dep_date],
    addFields: [],
    columns: [
      { key: 'dep_date', ar: 'التاريخ', en: 'Date', w: 120, kind: 'date', auto: true, source: 'sync' },
      { key: 'dep_dayname', ar: 'اليوم', en: 'Day', w: 95, kind: 'text', auto: true, source: 'sync',
        get: (r, isAr) => (isAr ? DEP_DAYS_AR : DEP_DAYS_EN)[r.dep_dow] || '' },
      { key: 'dep_bank', ar: 'حوالة بنكية', en: 'Bank transfer', w: 120, kind: 'num', auto: true, source: 'invoice',
        get: (r) => depMoney(depNum(r.dep_bank)) },
      // إيصالات الحوالة المرفقة بالدفعة نفسها. `get` يُرجع الأسماء نصّاً كي يعمل
      // البحث والتصدير، بينما الخلية تُرسَّم روابط من `row.bank_files`.
      { key: 'dep_bank_files', ar: 'ملفات الحوالة', en: 'Transfer files', w: 130, kind: 'files', auto: true, source: 'invoice',
        get: (r) => (r.bank_files || []).map((f) => f && f.n).filter(Boolean).join(' · ') },
      // قابل للفتح: الرقم تلقائي، فلا بد أن يكون قابلاً للتدقيق بضغطة
      { key: 'dep_due', ar: 'المبلغ المستحق', en: 'Amount due', w: 130, kind: 'num', auto: true, source: 'invoice',
        drill: (r) => depNum(r.dep_due) > 0,
        get: (r) => depMoney(depNum(r.dep_due)) },
      { key: 'dep_carry', ar: 'مرحّل من أمس', en: 'Carried over', w: 125, kind: 'num', auto: true, source: 'formula',
        get: (r) => depMoney(depGet(r, 'carry')) },
      { key: 'dep_total', ar: 'إجمالي المستحق', en: 'Total due', w: 135, kind: 'num', auto: true, source: 'formula',
        get: (r) => depMoney(depGet(r, 'total')) },
      { key: 'dep_paid', ar: 'المبلغ المودع', en: 'Deposited', w: 130, kind: 'num', ops: true },
      // إثبات خروج المال للبنك — يقابل «ملفات الحوالة» التي تُثبت دخوله
      { key: 'dep_receipt', ar: 'إيصالات الإيداع', en: 'Deposit slips', w: 165, kind: 'multifile', ops: true },
      // نصّ البنك كما وصل. الإيداع الواحد قد يُقسَّم على عشر دفعات، ولكلٍّ رسالتها
      // — سطر لكل رسالة، والتحرير في نافذة لا في سطر الشبكة.
      { key: 'dep_bank_sms', ar: 'رسالة البنك', en: 'Bank SMS', w: 230, kind: 'longtext', ops: true },
      { key: 'dep_adjust', ar: 'تسوية', en: 'Adjustment', w: 105, kind: 'num', ops: true },
      { key: 'dep_adjust_reason', ar: 'سبب التسوية', en: 'Adjustment reason', w: 175, kind: 'text', ops: true,
        select: true, options: () => DEP_ADJ_REASONS },
      // مرفقات عامّة لليوم: ما لا يندرج تحت إيصال إيداع ولا حوالة — مستند تسوية،
      // محضر، مراسلة، أي إثبات آخر. عدّة ملفات لكل يوم.
      { key: 'dep_docs', ar: 'مرفقات', en: 'Attachments', w: 150, kind: 'multifile', ops: true },
      { key: 'dep_ok', ar: 'تم الإيداع؟', en: 'Deposited?', w: 105, kind: 'text', auto: true, source: 'formula',
        get: (r) => depGet(r, 'ok') || '—' },
      { key: 'dep_rem', ar: 'المتبقي', en: 'Remaining', w: 115, kind: 'num', auto: true, source: 'formula',
        get: (r) => depMoney(depGet(r, 'rem')),
        // المتأخّر أحمر والفائض أخضر — الرقم وحده لا يقول أيّهما
        fg: (v, r) => { const x = depGet(r, 'rem'); return x > 0 ? C.red : (x < 0 ? '#2ecc71' : undefined) },
        // وخلفيته تتدرّج مع طول التأخير: أصفر أول يوم ← أحمر عند العاشر
        bg: (v, r) => depLateBg(depGet(r, 'lateDays')) },
      { key: 'dep_status', ar: 'الحالة', en: 'Status', w: 150, kind: 'text', auto: true, source: 'formula',
        get: (r) => depGet(r, 'status') || '—',
        bg: (v) => depStatusBg(v) },
      { key: 'dep_notes', ar: 'ملاحظات', en: 'Notes', w: 240, kind: 'text', ops: true },
    ],
  },

  /* ── دفتر السدادات — بديل «amr.xlsx» ─────────────────────────────────────── */
  {
    key: 'sadad',
    ar: 'دفتر السدادات', en: 'SADAD ledger',
    hintAr: 'حركات حسابات السداد لكل مكتب · الرصيد يُحسب بعد كل عملية ولا يُكتب يدوياً',
    hintEn: 'SADAD account movements per office · balance is computed after each entry, never typed',
    tabs: { list: SD_ACCOUNTS, key: (r) => (r.sd_account || ''), field: 'sd_account' },
    derive: sdDerive,
    summary: sdSummary,
    load: async () => [],          // كل الصفوف يدوية في ops_sheet_rows
    blankRows: 10,
    search: (r) => Object.values(r._ops || {}),
    addFields: [
      { key: 'sd_date', ar: 'التاريخ', en: 'Date', type: 'date', required: true },
      { key: 'sd_kind', ar: 'العملية', en: 'Type', required: true },
      { key: 'sd_amount', ar: 'المبلغ', en: 'Amount', required: true },
      { key: 'sd_purpose', ar: 'غرض السداد', en: 'Purpose' },
    ],
    columns: [
      { key: 'sd_date', ar: 'التاريخ', en: 'Date', w: 115, kind: 'date', ops: true },
      { key: 'sd_kind', ar: 'العملية', en: 'Type', w: 95, kind: 'text', ops: true, select: true,
        options: () => SD_KINDS,
        bg: (v) => /ايداع|إيداع/.test(String(v)) ? 'rgba(46,204,113,.18)' : (v ? 'rgba(232,114,101,.14)' : undefined) },
      { key: 'sd_amount', ar: 'المبلغ', en: 'Amount', w: 115, kind: 'num', ops: true },
      { key: 'sd_balance', ar: 'الرصيد بعد العملية', en: 'Balance after', w: 145, kind: 'num',
        auto: true, source: 'formula',
        get: (r) => { const c = SD_REF.calc.get(r._id); return (c && c.bal != null) ? enNum(c.bal) : '' },
        fg: (v, r) => { const c = SD_REF.calc.get(r._id); return (c && c.bal != null && c.bal < 0) ? C.red : undefined } },
      // فاتورة النظام (تأتي مع الطلب المرحَّل) — تميّزها عن رقم فاتورة السداد
      { key: 'sd_app_invoice', ar: 'فاتورة النظام', en: 'System invoice', w: 140, kind: 'mono', ops: true },
      { key: 'sd_invoice', ar: 'رقم الفاتورة', en: 'Invoice no.', w: 165, kind: 'mono', ops: true },
      { key: 'sd_no', ar: 'رقم السداد', en: 'SADAD no.', w: 165, kind: 'mono', ops: true },
      { key: 'sd_purpose', ar: 'غرض السداد', en: 'Purpose', w: 150, kind: 'text', ops: true,
        select: true, options: () => SD_ALL_PURPOSES },
      { key: 'sd_qty', ar: 'الكمية', en: 'Qty', w: 80, kind: 'num', ops: true },
      { key: 'sd_iqama', ar: 'رقم الإقامة / الحدود', en: 'Iqama / border', w: 190, kind: 'mono', ops: true },
      { key: 'sd_unified', ar: 'الموحّد / قوى', en: 'Unified / Qiwa', w: 165, kind: 'mono', ops: true },
      { key: 'sd_office', ar: 'المكتب', en: 'Office', w: 130, kind: 'text', ops: true },
      { key: 'sd_staff', ar: 'الموظف / البيان', en: 'Staff / memo', w: 175, kind: 'text', ops: true },
      { key: 'sd_docs', ar: 'مرفقات', en: 'Attachments', w: 150, kind: 'multifile', ops: true },
      { key: 'sd_notes', ar: 'ملاحظات', en: 'Notes', w: 220, kind: 'longtext', ops: true },
    ],
  },

  /* ── طلبات السداد — الطرف الأمامي لدفتر السدادات ───────────────────────────
     سير العمل الواقعي (كما كان يجري في قروب الواتساب): الموظف يرسل ما يريد
     سداده، والمحاسب يسدّده ثم يقيّده في الدفتر. هذا الشيت يستبدل القروب:
     الموظف يُدخل طلبه في صف، والمحاسب يتابع «جديد» ويحدّث الحالة بعد السداد.
     الأعمدة مطابقة لأعمدة الدفتر كي ينتقل الطلب إليه بلا إعادة كتابة.        */
  {
    key: 'sadad_requests',
    ar: 'طلبات السداد', en: 'SADAD requests',
    hintAr: 'الموظف يُدخل ما يريد سداده · المحاسب يحدّث الحالة بعد التنفيذ',
    hintEn: 'Staff enter what needs paying · the accountant updates the status once done',
    tabs: { list: SR_TABS, key: srTabOf, field: 'sr_office', stamp: srTabStamp },
    /* كتلة لكل يوم: الرأس المدموج يحمل عدّاد اليوم ومجموعه، وصفوفه تحته.
       والصفوف الجاهزة الفارغة تنضمّ لكتلة اليوم المعروض — هو التاريخ الذي
       ستأخذه فعلاً عند أول كتابة، فلا تبقى معلّقة بعمود يوم فارغ. */
    mergeKey: (r) => (r._ops && r._ops.sr_date) || ((r._ops && Object.keys(r._ops).length) ? null : SR_REF.day),
    mergeCols: ['sr_day'],
    /* بُعدُ دمجٍ ثانٍ: **العملية الواحدة**. ما يخصّ السداد نفسه لا العامل — رقمه
       ومفوتره وأختام تنفيذه — يُكتب مرّة ويمتدّ عبر صفوف عمّاله، فيُقرأ أنه شيء
       واحد لا أربعة متشابهة. وما يخصّ كل عامل (اسمه · إقامته · حصّته · فاتورته)
       يبقى في صفّه. (الأعمدة ذات المكوّنات الخاصة — القوائم والمرفقات والنصّ
       الطويل — تُرسم في كل صفّ بحكم المحرّك، فلم تُدرَج.) */
    merges: [{
      key: (r) => { const o = (r && r._ops) || {}
        if (!srIsGrpPurpose(o)) return ''
        const k = srGrpKey(o); const g = k && SR_REF.grp.get(k)
        return (g && g.n > 1) ? k : '' },
      cols: ['sr_sadad_no', 'sr_biller', 'sr_group', 'sr_paid_date', 'sr_paid_time', 'sr_payer', 'sr_ledger',
        // إثبات السداد ورسالته: عمليةٌ واحدة ⇒ مرفقٌ واحد ورسالةٌ واحدة
        'sr_paid_ref', 'sr_file_sadad',
        // والمدّة: مدّةُ العملية من آخر طلبٍ فيها حتى سدادها — واحدة لا أربع
        'sr_took'],
    }],
    /* الترتيب **تصاعديّ**: الأقدم أعلى والأحدث أسفل، والصفّ الفارغ الجاهز (بلا
       تاريخ = `9999`) يقع في الذيل — فهو موضع الإدخال، وما يُكتب فيه يبقى مكانه
       ويُولَّد الفارغ الجديد **تحته**. (جُرّب العكس فاضطرب الإدخال: الصفّ الجديد
       يُدرَج فوق فيدفع ما تحته وتقفز الخليّة من تحت المؤشّر.)
       والمفتاح: اليوم ← ثم العملية (رقم السداد) ← ثم وقت الإدخال، فتبقى صفوف
       السداد الواحد (رخصة عمل · تأمين طبي) متجاورة داخل يومها. */
    /* ⚠️ الصفّ الفارغ يأخذ **يومه المعروض** لا تاريخاً بعيداً، ويُذيَّل داخله
       بمفتاحٍ يفوق كل وقت (`9`). وبهذا لا يقفز حين يُكتب فيه: كان يحمل
       `9999-99-99` فيقع في ذيل الجدول كلّه، فإذا كُتب فيه صار تاريخه اليوم
       فارتفع فوق الصفّ الفارغ الجديد — والتحديد يتبع **موضع** الخليّة لا هُويّة
       صفّها، فتنتقل الكتابة إلى الصفّ التالي أمام عين المستخدم. */
    /* ترتيب اليوم على ثلاث مراتب: (١) الطلبات المكتملة بوقتها · (٢) ما هو **قيد
       الإدخال** الآن (له تاريخ ولا وقت — الوقت يُختَم عند اكتمال حقوله) · (٣)
       الصفّ الفارغ الجاهز. فيبقى ما تكتبه في ذيل اليوم تحت يدك حتى يكتمل، ثم
       يستقرّ في موضعه الزمني — ولا يقفز فوق الصفوف بمجرّد كتابة رقم الفاتورة
       (كان غياب الوقت يجعله يتصدّر اليوم كلّه).
       والاستثناء الوحيد من الترتيب الزمني: **عملية سدادٍ جماعي فعلية** (رخصة عمل
       أو تأمين طبي · رقم سداد واحد · أكثر من صفّ) — تُوضع صفوفها عند وقت أوّلها
       فتتجاور. وما عداها — ومنه تجديد الإقامة — يبقى على وقته. */
    rowRank: (r) => {
      const o = (r && r._ops) || {}
      const day = o.sr_date || SR_REF.day || '9999-99-99'
      if (!Object.keys(o).length) return `${day}|3`
      const t = o.sr_time
      if (!t) return `${day}|2`
      const gk = srIsGrpPurpose(o) ? srGrpKey(o) : ''
      const g = gk && SR_REF.grp.get(gk)
      return (g && g.n > 1)
        ? `${day}|1${g.firstHm || t}|0${gk}|${t}`
        : `${day}|1${t}|1|${t}`
    },
    // الشيت يفتح على يوم واحد افتراضه اليوم الحالي، مع تنقّل لأي يوم آخر
    dayFilter: { field: 'sr_date' },
    // الصف الجديد يأخذ **اليوم المعروض** لا تاريخ اليوم: لو كان المستخدم يراجع
    // يوماً سابقاً ويُدخل فيه طلباً، ختم «اليوم» كان سيُقفزه من أمام عينيه.
    /* ختم الصف الجديد: يومه المعروض، ووقت إدخاله، ومقدّمه = المستخدم الحالي.
       كلها تُكتب مرّة واحدة وتبقى قابلة للتصحيح — الموجود يفوز دائماً. */
    autoStamp: (r, ctx) => {
      const c = ctx || {}
      const d = c.data || (r && r._ops) || {}
      // الغرض قد يكون هو المكتوب في هذه اللحظة نفسها — الصف لا يحمله بعد
      const purpose = (c.col === 'sr_purpose' ? c.val : '') || d.sr_purpose || ''
      const p = srPriceOf(purpose, d.sr_qty)
      /* منشأة قائمة ⇒ رقما التأمينات والموارد يُقرآن منها لا يُكتبان: تجديدُ سجلٍّ
         لمنشأة مسجَّلة عندنا لا يحتمل خطأً في رقمٍ نملكه أصلاً. ولو لم تُعرف
         المنشأة لم يُملأ شيء — والقيد الجديد يُدخل أرقامه بيده. */
      const fac = srFac((c.col === 'sr_unified' ? c.val : '') || d.sr_unified || '')
      return {
        sr_date: srDay(c.day),
        sr_requester: c.user || '',
        /* وقت الطلب = لحظة **اكتماله** لا أول حرف فيه: يُختم عند ملء آخر حقل
           إلزامي (وهي تختلف بالغرض — حجز الاسم التجاري يلزمه ستّة). ويُكتب مرة
           واحدة فلا يتغيّر بتعديل لاحق. */
        ...(!srMissing(d).length ? { sr_time: nowHm() } : {}),
        // السعر الثابت يُملأ وحده؛ النطاق قرارُ مُدخِله ويُدقَّق بلونه
        ...(p && p.fixed ? { sr_amount: String(p.fixed) } : {}),
        ...(fac && fac.gosi ? { sr_gosi_no: fac.gosi } : {}),
        ...(fac && fac.hrsd ? { sr_hrsd_no: fac.hrsd } : {}),
        /* الاسم يُقرأ من المنشأة في كل الأغراض إلا **فتح سجل جديد**: هناك لا
           منشأة بعد، فأيّ اسم يُجلب إنما هو لمنشأة أخرى صادف رقمها. */
        ...(fac && fac.name && !SR_NEW_CR_PURPOSES.has(purpose) ? { sr_facility_name: fac.name } : {}),
      }
    },
    /* السداد يُثبت نفسه: إدخال رسالة البنك في «مرجع العملية» هو الحدث الذي يقول
       إن المال خرج — فيُختم وقت السداد وتصير الحالة «تم السداد»، ومن ثمّ يُرحَّل
       الطلب للدفتر (afterSave). خطوةٌ واحدة بدل ثلاث يدوية يُنسى بعضها.
       الوقت يُكتب مرة واحدة: تصحيح نصّ الرسالة لاحقاً لا يُزحزح لحظة السداد. */
    /* بإدخال مرجع العملية يُقفل الصف: المال خرج، وحركة الدفتر بُنيت على قيمه —
       فتعديل مبلغ أو غرض بعدها يجعل الدفتر يقول غير ما جرى. */
    rowLocked: (r) => !!String((r._ops || {}).sr_paid_ref || '').trim(),
    // خليّة مقفولة لأن قيمتها مقروءة من مصدر آخر (بيانات المنشأة في التجديد)
    cellLocked: (r, col) => srDerivedLocked(r, col.key),
    /* استثناء من قفل الصفّ: بيانات السجل تصدر بعد السداد، فلو قُفلت معه لبقيت
       فارغة أبداً — والصفّ يُقفل ليمنع تغيير ما بُني عليه الدفع، لا لمنع إكماله.
       ومعها **رقم الفاتورة**: في السداد الجماعي قد يُسدَّد لعاملٍ لم تصدر فاتورته
       بعد، فتُكتب حين تصدر لتُعرف تكلفة تلك الفاتورة الحقيقية. (تعديله يُعيد
       ترحيل الحركة نفسها لأن مفتاحها رقم السداد لا رقم الفاتورة.) */
    lockExempt: (r, col) => srPostPay(r, col.key) || col.key === 'sr_invoice',
    /* رسالة البنك تُثبت **عملية** سداد لا صفّاً: تُنسخ هي وما تستتبعه إلى صفوف
       العمّال الآخرين في العملية نفسها (رقم السداد الواحد). */
    spread: { cols: ['sr_paid_ref'], key: srGrpKey },
    autoSet: (r, ctx) => {
      const c = ctx || {}
      if (c.col !== 'sr_paid_ref' || !String(c.val || '').trim()) return null
      const d = c.data || (r && r._ops) || {}
      return {
        // تاريخ السداد يُختَم مع وقته (مخفيّ لكنه مخزَّن): بدونه تُحسب المدّة
        // بفارق الساعات وحده فتنقلب سالبة متى سُدِّد الطلب في يوم تالٍ
        ...(d.sr_paid_time ? {} : { sr_paid_time: nowHm(), sr_paid_date: todayYmd() }),
        // ومَن سدّده: يُختَم مرّة واحدة، فتصحيح الرسالة لاحقاً لا ينسب السداد لغيره
        ...(d.sr_payer ? {} : { sr_payer: c.user || '' }),
        sr_status: 'تم السداد',
      }
    },
    /* تسعيرة الأغراض — زرّ «التسعيرة» فوق الشبكة يحرّرها، وتُخزَّن في layout.prices.
       مجموعتان لأن أغراض المكاتب وأغراض السجلات لا تُقرأ إحداهما مع الأخرى. */
    priceBook: {
      groups: () => [
        { ar: 'أغراض المكاتب', en: 'Office purposes', list: SD_PURPOSES },
        /* بترتيب القائمة نفسها كما تظهر في الخلية. الغرض المشترك بين المجموعتين
           (حجز اسم تجاري · أخرى) يظهر في كليهما وسعره **واحد** — المفتاح اسمه. */
        { ar: 'أغراض السجلات · لم تُحدَّد بعد', en: 'Registry purposes · unassigned', list: SD_NA_PURPOSES },
      ],
    },
    derive: srDerive,
    summary: srSummary,
    // غسلةٌ خفيفة تجمع صفوف السداد الواحد بالعين (انظر srRowBg)
    rowBg: srRowBg,
    afterSave: srPostToLedger,
    // طلبٌ مسدَّد بلا مرجع دفتر = حُجب يومَ حفظه؛ قائمة الصف تتيح إعادة ترحيله
    repostable: (r) => { const o = (r && r._ops) || {}; return o.sr_status === 'تم السداد' && !o.sr_ledger },
    // لا صفوف مزامنة — التحميل يبني فهرس الفواتير الذي تقرأ منه الأعمدة التلقائية
    async load(sb) {
      // الفروع (أسماؤها وألوانها) محمَّلة على مستوى الصفحة — لا تُجلب هنا ثانيةً
      const [rows, facs, wf, wfc, muqR, muqC] = await Promise.all([
        fetchAll(sb, 'v_ops_invoice_ref',
          'invoice_no,service_ar,facility_ar,unified_number,gosi_number,branch_code,payment_state,total_amount,paid_amount,worker_name,worker_iqama,worker_border,worker_count,iqama_months,pricing_breakdown'),
        // المنشآت بأرقامها — مصدر التعبئة التلقائية في طلبات التجديد
        fetchAll(sb, 'facilities', 'unified_number,gosi_number,hrsd_number,name_ar',
          (q) => q.is('deleted_at', null).not('unified_number', 'is', null)),
        /* بيانات العامل برقم إقامته — لطلبٍ لا فاتورة له تُملأ منها خاناته.
           **مصدران لا واحد**: مركز المزامنة (مقيم/قوى/التأمينات) أغنى وأحدث، لكن
           ١٥٣ عاملاً في العمالة الكانونية ليسوا فيه أصلاً (لم يُزامَنوا بعد) —
           فيُدمجان: المزامنة أولاً، والكانوني يسدّ ما نقص حقلاً حقلاً. */
        fetchAll(sb, 'v_ops_sync_workforce', 'iqama_number,name_ar,name_en,facility_ar,unified_number,branch_code'),
        fetchAll(sb, 'v_ops_workers', 'iqama_number,name_ar,name_en,facility_ar,unified_number,branch_code'),
        // رصيد الجوازات لكل مقيم · ونقاط مقيم لكل منشأة — من مركز المزامنة
        fetchAll(sb, 'v_ops_muqeem_balance', 'iqama_number,jawazat_balance,synced_at'),
        fetchAll(sb, 'muqeem_companies', 'moi_number,point_balance,synced_at',
          (q) => q.not('point_balance', 'is', null)),
      ])
      const m = new Map()
      for (const r of rows) m.set(String(r.invoice_no).trim(), r)
      SR_REF.inv = m
      const wfMap = new Map()
      // المزامنة أولاً ثم الكانوني: كلٌّ يملأ ما وجده فارغاً، فلا يُلغي أحدهما الآخر
      for (const w of [...(wf || []), ...(wfc || [])]) {
        const k = String(w.iqama_number || '').replace(/\D/g, '')
        if (!k) continue
        const cur = wfMap.get(k) || { name: '', facility_ar: '', unified_number: '', branch_code: '' }
        if (!cur.name) cur.name = w.name_ar || w.name_en || ''
        if (!cur.facility_ar) cur.facility_ar = w.facility_ar || ''
        if (!cur.unified_number) cur.unified_number = w.unified_number == null ? '' : String(w.unified_number)
        if (!cur.branch_code) cur.branch_code = w.branch_code || ''
        wfMap.set(k, cur)
      }
      SR_REF.wf = wfMap
      SR_REF.muqRes = new Map((muqR || []).map((m) => [String(m.iqama_number || '').replace(/\D/g, ''),
        { bal: depNum(m.jawazat_balance), at: m.synced_at }]))
      SR_REF.muqCo = new Map((muqC || []).map((m) => [String(m.moi_number || '').replace(/\D/g, ''),
        { pts: depNum(m.point_balance), at: m.synced_at }]))
      SR_REF.fac = new Map((facs || []).map((f) => [String(f.unified_number).replace(/\D/g, ''), {
        gosi: f.gosi_number == null ? '' : String(f.gosi_number),
        hrsd: f.hrsd_number == null ? '' : String(f.hrsd_number),
        name: f.name_ar || '',
      }]))
      return []
    },
    /* صفٌّ فارغ **واحد** في رأس الجدول: يُكتب فيه فيصير طلباً ويُولَّد بدله فارغ
       جديد فوقه. (كانت خمسة أسطر بدفعات — ذيلٌ طويل فارغ لا معنى له حين يتصدّر
       الجدول بدل أن يذيّله.) */
    blankRows: 1,
    // البحث يشمل ما يُقرأ من الفاتورة أيضاً (اسم العامل وإقامته والمنشأة) — وإلا
    // بحثتَ عن عاملٍ تراه أمامك في الجدول فلا يظهر، لأن قيمته ليست في بيانات الصف
    search: (r) => [
      // نصوص الإدخال وحدها — ختم الخلايا `__m` كائنٌ لا يُبحث فيه
      ...Object.values(r._ops || {}).filter((v) => typeof v !== 'object'),
      srInv(r, 'worker_name'), srInv(r, 'worker_iqama'), srInv(r, 'facility_ar'), srInv(r, 'service_ar'),
    ],
    addFields: [
      { key: 'sr_date', ar: 'تاريخ الطلب', en: 'Requested', type: 'date', required: true },
      { key: 'sr_purpose', ar: 'غرض السداد', en: 'Purpose', required: true },
      { key: 'sr_worker', ar: 'اسم العامل', en: 'Worker' },
      { key: 'sr_amount', ar: 'المبلغ', en: 'Amount' },
    ],
    columns: [
      /* رأس اليوم المدموج — قراءة فقط. عمود `sr_date` يبقى هو القابل للتحرير:
         وضع عمود قابل للتحرير داخل mergeCols يترك خلايا التكرار فارغة المظهر
         لكن قابلة للنقر، فيحرّر المستخدم خلية لا يراها. */
      { key: 'sr_day', ar: 'اليوم', en: 'Day', w: 205, kind: 'text', auto: true, source: 'formula',
        get: (r, isAr) => {
          const d = srRowDay(r)
          // صفّ فيه بيانات بلا تاريخ خللٌ فعلي — أما الجاهز الفارغ فيعرض اليوم
          // المعروض الذي سيأخذه عند أول كتابة، فلا يبقى عمود اليوم فارغاً
          if (!d) return isAr ? '⚠ بلا تاريخ' : '⚠ no date'
          const g = SR_REF.days.get(d)
          if (!g) return d
          /* التاريخ سطراً، وعدّاد اليوم ومجموعه تحته. والعدد يُصرَّف عربياً:
             طلب · طلبان · ٣-١٠ طلبات · ١١+ طلباً — «9 طلب» ليست عربية. */
          return `${d}\n${isAr ? arCount(g.n, 'طلب', 'طلبان', 'طلبات', 'طلباً')
            : `${enNum(g.n)} ${g.n === 1 ? 'req.' : 'reqs.'}`} · ${enNum(g.total)}`
        },
        /* كتلة اليوم صفراء ما دام فيها طلب لم يُسدَّد · وحمراء للصف المؤرَّخ الناقص.
           وخلفيتها صمّاء دائماً — الكتلة عمودٌ واحد يمتدّ عبر صفوف مختلفة الغسلات،
           فلو نفذت غسلاتها إليه لتقطّع لونه. */
        bg: (v, r) => {
          const d = srRowDay(r)
          if (!d) return solidBg('rgba(232,114,101,.16)')
          const g = SR_REF.days.get(d)
          return solidBg(g && g.open ? 'rgba(212,160,23,.14)' : 'transparent')
        } },
      /* لا عمودَ «فرع المكتب» ولا «حساب السداد»: كلاهما هو فرع الفاتورة نفسه —
         يُقرأ منها بلا إدخال (srAcct)، وأعمدةٌ لمعنى واحد لا تفترق إلا بالخطأ.
         وطلبات السجلات وحدها تبقى مختومة بـ«لم تُحدَّد بعد» في تبويبها. */
      /* ── من هنا يبدأ عمل المسؤول عن السداد ── (ما قبله إدخال مقدّم الطلب) */
      { key: 'sr_status', ar: 'الحالة', en: 'Status', w: 130, kind: 'text', ops: true, select: true, sectionStart: true,
        options: () => SR_STATUS_PICK,
        // فارغ = طلب جديد لم يُلمس بعد؛ يأخذ لون «جديد» نفسه كي لا يبدو مهملاً
        get: (r) => (r._ops && r._ops.sr_status) || 'جديد',
        // لون الحالة صمّاء: هي حكمٌ على الطلب لا يتلوّن بجاره
        bg: (v) => solidBg(SR_STATUS_BG[String(v || 'جديد')] || 'transparent') },
      /* نقطة البداية: رقم فاتورة النظام. أخضر = موجودة · أحمر = لا مقابل لها،
         فيُكتشف الخطأ لحظة الكتابة لا بعد السداد. */
      { key: 'sr_invoice', ar: 'رقم الفاتورة', en: 'Invoice no.', w: 150, kind: 'mono', ops: true,
        // خلفية صمّاء: الرقم مفتاح الصفّ، يُقرأ على أرضيةٍ ثابتة لا على غسلة
        bg: () => solidBg('transparent'),
        fg: (v) => { const s = String(v ?? '').trim(); return s ? (SR_REF.inv.has(s) ? '#2ecc71' : C.red) : undefined } },
      { key: 'sr_inv_service', ar: 'الخدمة', en: 'Service', w: 160, kind: 'text', auto: true, source: 'invoice',
        get: (r) => srInv(r, 'service_ar') },
      /* العامل لا العميل: السداد يقع على عاملٍ بعينه (إقامته · تأشيرته · نقل
         كفالته)، واسم العميل لا يقول على مَن دُفع. الاسم والإقامة يُقرآن من
         فاتورة النظام ويبقيان قابلين للكتابة فوقهما — التغطية ليست تامّة، وطلبٌ
         بلا فاتورة يُدخل عامله بيده. والقيمة اليدوية تفوز دائماً. */
      { key: 'sr_worker', ar: 'اسم العامل', en: 'Worker', w: 200, kind: 'text', ops: true, filled: true,
        get: (r, isAr) => {
          const n = srInvWf(r, 'worker_name', 'name')
          if (!n) return ''
          // فاتورة بعدّة عمّال (تأشيرات مثلاً): الاسم الأول ثم عدد الباقين
          const c = depNum(srInv(r, 'worker_count'))
          return c > 1 ? `${n}\n+${enNum(c - 1)} ${isAr ? 'عاملاً آخر' : 'more'}` : n
        } },
      { key: 'sr_iqama', ar: 'رقم إقامة العامل', en: 'Worker iqama', w: 175, kind: 'mono', ops: true, filled: true,
        get: (r) => srInv(r, 'worker_iqama'),
        bg: srReq('sr_iqama') },
      { key: 'sr_inv_facility', ar: 'المنشأة', en: 'Facility', w: 200, kind: 'text', auto: true, source: 'invoice',
        get: (r) => srInvWf(r, 'facility_ar', 'facility_ar') },
      /* الرقم الموحّد بجانب اسم المنشأة — الاسم يتشابه ويتكرّر، والرقم يقطع الشكّ.
         (غير `sr_unified` المُدخَل في طلبات السجلات: هذا مقروء من الفاتورة.) */
      { key: 'sr_inv_unified', ar: 'الرقم الموحّد', en: 'Unified no.', w: 150, kind: 'mono', auto: true, source: 'invoice',
        get: (r) => srInvWf(r, 'unified_number', 'unified_number') },
      /* الفرع باسمه مع رمزه: هو المكتب صاحب الطلب، ومنه يُعرف حساب السداد.
         ولكل مكتب لون خلفية ثابت — الجدول يجمع المكاتب كلها، والعين تفرزها
         باللون أسرع من قراءة الرمز في كل صفّ. */
      { key: 'sr_inv_branch', ar: 'فرع الفاتورة', en: 'Invoice branch', w: 200, kind: 'text', auto: true, source: 'invoice',
        get: (r) => srBranchText(srInvWf(r, 'branch_code', 'branch_code')),
        bg: (v, r) => srBranchBg(srInvWf(r, 'branch_code', 'branch_code')),
        /* النصّ بلون النصّ الكامل دائماً: العمود هويّةُ مكتبٍ لا حكمٌ عليه، فلا
           يُصبغ اسم مكتبٍ بالأحمر بحال. وتعذّرُ الترحيل (فرعٌ بلا حساب في الدفتر)
           يُقال في موضعه: تنبيهُ الحفظ · بطاقة «بانتظار تحديد الحساب» · وخلوّ
           عمود «رُحِّل للدفتر». */
        fg: () => 'var(--tx)' },
      /* الحالة وحدها لا تكفي المحاسب: «مدفوعة جزئياً» قد تعني عشرة بالمئة أو
         تسعين. فتحتها نسبةُ المحصَّل ومبلغُه من الإجمالي — به يُقرَّر السداد. */
      { key: 'sr_inv_state', ar: 'حالة الفاتورة', en: 'Invoice state', w: 175, kind: 'text', auto: true, source: 'invoice',
        get: (r, isAr) => {
          const st = srInv(r, 'payment_state')
          if (!st) return ''
          const tot = depNum(srInv(r, 'total_amount'))
          const paid = depNum(srInv(r, 'paid_amount'))
          if (!tot) return st
          const pct = Math.round((paid / tot) * 100)
          return `${st}\n${enNum(pct)}% · ${enNum(paid)} ${isAr ? 'من' : 'of'} ${enNum(tot)}`
        },
        /* حالة الفاتورة **بلون الخطّ** لا الخلفية: هي وصفٌ لا تنبيهاً على الطلب —
           والخلفية محجوزة لما يحتاج تدخّلاً. (اللون يتبع الحالة لا نصّ الخليّة،
           فقد صارت سطرين.) */
        fg: (v, r) => { const s = srInv(r, 'payment_state')
          return s === 'مدفوعة' ? '#2ecc71' : s === 'مدفوعة جزئياً' ? C.gold2 : s ? C.red : undefined } },
      { key: 'sr_date', ar: 'تاريخ الطلب', en: 'Requested', w: 115, kind: 'date', ops: true },
      /* اليوم يقوله رأس الكتلة، فما يضيفه الصف هو **وقته** داخل اليوم.
         `readOnly`: يُختَم آلياً ولا يُكتب — وقتٌ يُدخله صاحبه يدوياً ليس شهادة
         على شيء. (يُخزَّن كأي حقل تشغيلي، لكنه مقفول عن الإدخال.) */
      { key: 'sr_time', ar: 'وقت الطلب', en: 'Time', w: 95, kind: 'mono', ops: true, readOnly: true },
      { key: 'sr_purpose', ar: 'غرض السداد', en: 'Purpose', w: 150, kind: 'text', ops: true,
        // القائمة تتبع الحساب: سدادات السجلات لها أغراضها، والمكاتب لها أغراضها
        select: true, options: (r) => srPurposes(r),
        bg: srReq('sr_purpose') },
      /* المدّة بالأشهر — **لتجديد الإقامة وحده** (قرار المستخدم): هي مدّة التجديد
         المسدَّد عنها، ولا معنى لها في نقل كفالة أو تأشيرة. تُقرأ من طلب التجديد
         أو حسبته، وتبقى قابلة للكتابة: قد يُسدَّد لمدّة غير التي فُوترت. */
      { key: 'sr_months', ar: 'المدة بالأشهر', en: 'Months', w: 120, kind: 'mono', ops: true, filled: true,
        get: (r) => {
          if (srInv(r, 'service_ar') !== SR_RENEWAL_SERVICE) return ''
          const m = srInv(r, 'iqama_months')
          return m ? String(m) : ''
        },
        bg: srReq('sr_months') },
      /* الموحّد يأتي من الفاتورة تلقائياً؛ ويبقى قابلاً للكتابة فوقه لأن التغطية
         ٦٠٪ — فما لم تُربط منشأته بعد يُدخله الموظف يدوياً. القيمة اليدوية تفوز. */
      // اسم المنشأة — يُقرأ من القاعدة، وفي «تحويل مؤسسة لشركة» يُكتب الاسم الجديد
      { key: 'sr_facility_name', ar: 'اسم المنشأة', en: 'Facility name', w: 220, kind: 'text', ops: true,
        bg: srReq('sr_facility_name') },
      /* أخضر = منشأة معروفة عندنا (فتُملأ أرقامها) · أحمر = غير معروفة، وهو
         تنبيهٌ في التجديد بالذات: المنشأة يُفترض أنها مسجَّلة. */
      { key: 'sr_unified', ar: 'الرقم الموحّد', en: 'Unified no.', w: 155, kind: 'mono', ops: true,
        get: (r) => srInv(r, 'unified_number'), ...SR_NUM_UNIFIED,
        bg: srReq('sr_unified'),
        fg: (v) => { const s = String(v ?? '').replace(/\D/g, ''); return s.length === 10 ? (srFac(s) ? '#2ecc71' : C.red) : undefined } },
      /* ── حقول سدادات السجلات («لم تُحدَّد بعد») ──────────────────────────────
         قيد سجل أو تجديده يقوم على **صاحبه السعودي** ومنشأته، لا على عامل
         وإقامة. الأعمدة معرَّفة للشيت كله ومخفيّة في مجموعات المكاتب
         (layout.tabHidden) — تعريف واحد، وظهورٌ حيث تعني. */
      /* الاسم الثلاثي شرط القيد: الاسم المفرد أو الثنائي لا يُميّز شخصاً في
         السجلات، فيُردّ عند الإدخال لا بعد السداد. */
      { key: 'sr_saudi_name', ar: 'اسم السعودي', en: 'Saudi name', w: 200, kind: 'text', ops: true, bg: srReq('sr_saudi_name'),
        validate: (v, r, isAr) => (String(v).trim().split(/\s+/).filter(Boolean).length >= 3
          ? '' : (isAr ? 'اسم السعودي: ثلاثة أسماء على الأقل' : 'Saudi name: at least three names')) },
      /* هوية السعودي: تبدأ بـ١ وعشر خانات. `coerce` يحوّل الأرقام العربية
         ويُسقط الفواصل والمسافات — اللصق من مستند لا يُردّ لشكله. */
      { key: 'sr_saudi_id', ar: 'هوية السعودي', en: 'Saudi ID', w: 145, kind: 'mono', ops: true, bg: srReq('sr_saudi_id'),
        coerce: (v) => latin(v).replace(/\D/g, ''),
        validate: (v, r, isAr) => (/^1\d{9}$/.test(v)
          ? '' : (isAr ? 'هوية السعودي: تبدأ بـ 1 وتتكوّن من 10 خانات' : 'Saudi ID: must start with 1 and be 10 digits')) },
      { key: 'sr_gosi_no', ar: 'رقم التأمينات', en: 'GOSI no.', w: 130, kind: 'mono', ops: true, ...SR_NUM_GOSI, bg: srReq('sr_gosi_no') },
      { key: 'sr_hrsd_no', ar: 'رقم الموارد', en: 'HRSD no.', w: 130, kind: 'mono', ops: true, ...SR_NUM_HRSD, bg: srReq('sr_hrsd_no') },
      // رقم حجز الاسم التجاري — بلا فحص صيغة: لم تُرصد صيغته في بيانات النظام بعد
      { key: 'sr_booking_no', ar: 'رقم الحجز', en: 'Reservation no.', w: 140, kind: 'mono', ops: true,
        bg: srReq('sr_booking_no') },
      // رقم الرخصة/الشهادة الصادرة — لرخصة البلدية وشهادة السلامة
      { key: 'sr_license_no', ar: 'رقم الرخصة', en: 'License no.', w: 145, kind: 'mono', ops: true,
        bg: srReq('sr_license_no') },
      // ملاحظة: بقية حقول الاختصاص (اسم السعودي · الهوية · الموحّد · التأمينات
      // · الموارد) تحمل `srReq` كلٌّ بمفتاحه — فالشطب والتنبيه يتبعان الغرض
      { key: 'sr_file_invoice', ar: 'مرفق الفاتورة', en: 'Invoice file', w: 150, kind: 'multifile', ops: true },
      { key: 'sr_file_cr', ar: 'مرفق السجل', en: 'CR file', w: 150, kind: 'multifile', ops: true, bg: srReq('sr_file_cr') },
      // إثبات السداد نفسه — يقابل مرفقي الفاتورة والسجل، وظاهر في كل المجموعات
      { key: 'sr_file_sadad', ar: 'مرفق السداد', en: 'SADAD file', w: 150, kind: 'multifile', ops: true, bg: srReq('sr_file_sadad') },
      /* المفوتر يتبع الغرض — هو أول ما يُختار في بوابة سداد قبل الرقم. يُملأ
         تلقائياً ويبقى قابلاً للتصحيح: قد تُسدَّد جهةٌ من مفوترٍ آخر. */
      { key: 'sr_biller', ar: 'المفوتر', en: 'Biller', w: 165, kind: 'text', ops: true, filled: true,
        get: (r) => srBiller(r && r._ops) },
      /* في تجديد الإقامة يُملأ برقم إقامة العامل — وفي غيره يُدخله الموظف بيده.
         فهو عمود إدخال في الأصل: لا خلفية سماوية له (`filled` يعني «لا تكتبه»،
         وهنا يُكتب غالباً). وأيقونة النسخ لأنه الرقم الذي يُلصق في بوابة سداد. */
      { key: 'sr_sadad_no', ar: 'رقم السداد / الفاتورة', en: 'SADAD / invoice no.', w: 180, kind: 'mono', ops: true, copy: true,
        get: (r, isAr) => {
          const no = srSadadOf(r && r._ops)
          if (!no) return ''
          const n = srDupCount(r && r._ops)
          // تكرارُ الرقم على الفاتورة نفسها: يُقال عدده صراحةً قبل أن يُدفع ثانيةً
          return n > 1 ? `${no}\n${isAr ? `مكرّر ×${enNum(n)}` : `repeated ×${enNum(n)}`}` : no
        },
        bg: (v, r) => (srDupCount(r && r._ops) > 1 ? SR_OVER_BG : srReq('sr_sadad_no')(v, r)) },
      /* يُدخَل بيد — والتسعير المتوقَّع بجانبه للاسترشاد، وحصص السداد الجماعي
         تُراجَع بمجموعها مقابل مبلغ رسالة البنك في عمود «ضمن سداد». */
      { key: 'sr_amount', ar: 'مبلغ السداد', en: 'Paid amount', w: 120, kind: 'num', ops: true,
        bg: (v, r) => srReq('sr_amount')(v, r) || srAmtBg(v, r) },
      /* التسعير المتوقَّع لهذا الغرض — بجانب ما خرج فعلاً. مصدره يتبع الغرض:
         ما له سعرٌ في **التسعيرة** (الاشتراكات ورسوم السجلات) يُقرأ منها، وما
         لا سعر ثابت له (تجديد إقامة · رخصة عمل …) يُقرأ من **بند الفاتورة**.
         والسطر الثاني يقول أيّهما — رقمٌ بلا مصدرٍ يُصدَّق أكثر مما يستحق. */
      { key: 'sr_inv_line', ar: 'التسعير المتوقع', en: 'Expected price', w: 175, kind: 'text',
        auto: true, source: 'invoice',
        get: (r, isAr) => srExpected(r && r._ops, isAr) },
      /* سدادٌ واحد لعدّة عمّال: يقول العمود إن مبلغ الصفّ **حصّة** لا كامل ما خرج،
         ويعرض عدد شركائه ومجموع العملية — الذي يظهر في الدفتر حركةً واحدة. */
      { key: 'sr_group', ar: 'ضمن سداد', en: 'In one payment', w: 165, kind: 'text',
        auto: true, source: 'formula',
        get: (r, isAr) => {
          const o = (r && r._ops) || {}
          const g = srIsGrpPurpose(o) ? SR_REF.grp.get(srGrpKey(o)) : null
          if (!g || g.n < 2) return ''
          const head = isAr ? arCount(g.n, 'عامل', 'عاملان', 'عمّال', 'عاملاً') : `${enNum(g.n)} workers`
          /* مجموع الحصص مقابل ما خرج من الحساب فعلاً (من رسالة البنك): الفارق
             يقول إن حصّةً نقصت أو أُخطئ فيها — وهو السؤال العملي في السداد
             الجماعي، إذ الحصص غالباً غير متساوية. */
          const diff = g.paid ? g.total - g.paid : 0
          return `${head}\n${enNum(g.total)}${g.paid ? ` / ${enNum(g.paid)}` : ''}${diff ? (isAr ? ` (فارق ${enNum(Math.abs(diff))})` : ` (Δ${enNum(Math.abs(diff))})`) : ''}`
        },
        /* بلا خلفية للحالة السليمة — غسلةُ الصفّ تقول إنه ضمن عملية. والخلفية
           هنا لأمرٍ واحد: مجموع الحصص لا يساوي ما خرج من الحساب. */
        bg: (v, r) => {
          const o = (r && r._ops) || {}
          const g = srIsGrpPurpose(o) ? SR_REF.grp.get(srGrpKey(o)) : null
          return (g && g.n > 1 && g.paid && g.total !== g.paid) ? SR_OVER_BG : undefined
        } },
      { key: 'sr_qty', ar: 'الكمية', en: 'Qty', w: 75, kind: 'num', ops: true },
      { key: 'sr_docs', ar: 'مرفقات', en: 'Attachments', w: 150, kind: 'multifile', ops: true },
      // يُختَم باسم المستخدم عند أول كتابة (autoStamp) ويبقى قابلاً للتصحيح
      { key: 'sr_requester', ar: 'مقدّم الطلب', en: 'Requested by', w: 150, kind: 'text', ops: true, filled: true },
      { key: 'sr_notes', ar: 'ملاحظات', en: 'Notes', w: 220, kind: 'longtext', ops: true },
      /* ── جانب المحاسب ── */
      { key: 'sr_paid_date', ar: 'تاريخ السداد', en: 'Paid on', w: 115, kind: 'date', ops: true },
      // وقت السداد يُختَم عند إدخال رسالة البنك — اليوم يقوله رأس الكتلة
      // مَن نفّذ السداد — يُختَم باسم المستخدم لحظة إدخال رسالة البنك
      { key: 'sr_payer', ar: 'مسدِّد الطلب', en: 'Paid by', w: 165, kind: 'text', ops: true, readOnly: true },
      { key: 'sr_paid_time', ar: 'وقت السداد', en: 'Paid at', w: 95, kind: 'mono', ops: true, readOnly: true },
      /* رصيد مقيم — في قسم المسدِّد وقبل رسالة البنك: يُنظر إليه قبل الدفع لا
         بعده. تجديد إقامة ⇒ رصيد العامل · نقاط مقيم ⇒ رصيد نقاط المنشأة. */
      { key: 'sr_muqeem', ar: 'رصيد ونقاط مقيم', en: 'Muqeem balance / points', w: 175, kind: 'text',
        auto: true, source: 'sync',
        get: (r, isAr) => srMuqeem(r && r._ops, isAr) },
      // كم استغرق الطلب من إدخاله حتى سداده — محسوب، لا يُكتب
      { key: 'sr_took', ar: 'المدّة', en: 'Took', w: 195, kind: 'text', auto: true, source: 'formula', get: srTook },
      /* رسالة البنك كما وصلت هي مرجع العملية: نصّ طويل يُحرَّر في نافذة، وإدخاله
         هو ما يُثبت السداد (انظر autoSet). */
      { key: 'sr_paid_ref', ar: 'رسالة البنك', en: 'Bank message', w: 230, kind: 'longtext', ops: true,
        // رسالة واحدة موزّعة على أسطر — لا عدّاد «رسائل» كاذب
        longUnit: false,
        longHint: { ar: 'الصق رسالة البنك بالدفع كما وصلت. بحفظها يُختم وقت السداد وتصير الحالة «تم السداد».',
                    en: 'Paste the bank payment SMS as received. Saving stamps the paid time and sets the status to paid.' } },
      { key: 'sr_accountant', ar: 'المحاسب', en: 'Accountant', w: 140, kind: 'text', ops: true },
      /* إثبات الترحيل — يُكتب آلياً عند «تم السداد». وجوده يعني أن حركة الدفتر
         أُنشئت فعلاً، فلا يقع المحاسب في ترحيل يدوي مكرَّر. */
      { key: 'sr_ledger', ar: 'رُحِّل للدفتر', en: 'Posted to ledger', w: 175, kind: 'mono',
        auto: true, source: 'formula',
        get: (r) => ((r._ops && r._ops.sr_ledger) ? '✓ ' + r._ops.sr_ledger : ''),
        bg: (v) => v ? 'rgba(46,204,113,.14)' : undefined },
    ],
  },

  /* ── الرخص البلدية ─────────────────────────────────────────────────────────
     كلّها **من مزامنة المركز السعودي**: بلدي يُستعلَم عنه بالسجل التجاري في
     `momrah/commercial-licenses-by-cr-number`، وردُّه يعيش في `sbc_sync_debug`
     كحال القوائم المالية — فبُني عليه `v_ops_baladi_licenses`: صفٌّ لكل رخصة
     برقمها ونشاطها وأمانتها وبلديتها وحالتها وتاريخ انتهائها ورابط طباعتها.
     ⚠️ وزارة البلديات ترفض الاستعلام لأكثر السجلات («تعذر استرداد بيانات
     الرخص»)، فيُؤخذ **أحدث ردٍّ فيه قائمة فعلاً** لا أحدث ردٍّ مطلقاً — وإلا حجب
     خطأُ اليوم بياناتِ الأمس. والمتابعة والرسوم تُدخَل فوقها كطبقة يدوية. */
  {
    key: 'baladi_licenses',
    ar: 'الرخص البلدية', en: 'Municipal licences',
    hintAr: 'من مزامنة المركز السعودي (بلدي) · صف لكل رخصة، والمتابعة بتاريخ الانتهاء',
    hintEn: 'From the Saudi Business Center sync (Balady) · one row per licence, tracked by expiry',
    async load(sb) {
      // الفروع محمَّلة على مستوى الصفحة (اسمُها ولونها واحدٌ في كل الشيتات)
      const rows = await fetchAll(sb, 'v_ops_baladi_licenses',
        'unified_number,facility_ar,gosi_number,hrsd_number,branch_code,license_no,shop_name,amana,baladia,district,activity,status_ar,expiry_g,expiry_h,print_url,extra_activities,permits,synced_at')
      // مفتاح الصفّ: الرخصة داخل سجلّها — ثابتٌ عبر المزامنات فتلتصق به طبقة الإدخال
      return (rows || []).map((r) => ({ ...r, _id: `${r.unified_number}|${r.license_no}` }))
    },
    defaultSource: 'sync',
    search: (r) => [r.license_no, r.facility_ar, r.shop_name, r.unified_number, r.baladia, r.activity],
    summary: blSummary,
    // الأقرب انتهاءً أولاً — الرخصة تُتابَع بما بقي لها لا بما مضى
    rowRank: (r) => `${(r && r.expiry_g) || '9999-99-99'}`,
    columns: [
      { key: 'facility_ar', ar: 'المنشأة', en: 'Facility', w: 230, kind: 'text' },
      { key: 'unified_number', ar: 'الرقم الموحّد', en: 'Unified no.', w: 140, kind: 'mono' },
      /* الفرع المسؤول عن متابعة الرخصة: يُقترح من فرع المنشأة ويبقى **قابلاً
         للاختيار** — قد تتابعها إدارةٌ أخرى. والخيار سطرٌ واحد بالرمز والاسم. */
      { key: 'bl_branch', ar: 'الفرع', en: 'Branch', w: 185, kind: 'text', ops: true, filled: true,
        select: true, options: () => SR_REF.branches, optLabel: srBranchText,
        get: (r) => r.branch_code || '',
        bg: (v, r) => srBranchBg(((r._ops || {}).bl_branch) || r.branch_code),
        fg: () => 'var(--tx)' },
      { key: 'license_no', ar: 'رقم الرخصة', en: 'Licence no.', w: 160, kind: 'mono', copy: true },
      // اسم المحل في الرخصة قد يخالف اسم المنشأة في السجل — كلاهما يُعرض
      { key: 'shop_name', ar: 'اسم المحل', en: 'Shop name', w: 230, kind: 'text' },
      { key: 'activity', ar: 'النشاط', en: 'Activity', w: 200, kind: 'text' },
      { key: 'baladia', ar: 'البلدية', en: 'Municipality', w: 170, kind: 'text' },
      { key: 'amana', ar: 'الأمانة', en: 'Amana', w: 170, kind: 'text' },
      { key: 'district', ar: 'الحي', en: 'District', w: 130, kind: 'text' },
      { key: 'expiry_g', ar: 'تاريخ الانتهاء', en: 'Expiry', w: 125, kind: 'date' },
      { key: 'expiry_h', ar: 'الانتهاء هجري', en: 'Expiry (H)', w: 120, kind: 'mono' },
      /* المتبقّي يُحسب هنا لا يُقرأ من بلدي: `expirationLeftPeriod` في ردّه يقول
         «0» للمنتهية فلا يُفرِّق بين اليوم وسنةٍ مضت. ويستمر بالسالب بعد الانتهاء. */
      { key: 'bl_left', ar: 'المتبقّي (يوم)', en: 'Days left', w: 120, kind: 'num', source: 'formula',
        get: (r) => { const n = blDaysLeft(r); return n == null ? '' : String(n) },
        fg: daysFg },
      /* الحالة محسوبة من التاريخ لا منقولة من بلدي: «سارية» في ردّه تبقى سارية
         بعد انقضاء تاريخها متى تأخّرت المزامنة. */
      { key: 'bl_status', ar: 'الحالة', en: 'Status', w: 130, kind: 'text', source: 'formula',
        get: (r, isAr) => blStatus(blDaysLeft(r), isAr) || r.status_ar || '',
        bg: (v, r) => {
          const n = blDaysLeft(r)
          if (n == null) return undefined
          return solidBg(n < 0 ? 'rgba(232,114,101,.20)' : n <= 30 ? 'rgba(234,179,8,.22)' : 'rgba(46,204,113,.18)')
        } },
      { key: 'print_url', ar: 'طباعة الرخصة', en: 'Print licence', w: 130, kind: 'link', linkLabel: 'بلدي' },
      { key: 'gosi_number', ar: 'رقم التأمينات', en: 'GOSI no.', w: 130, kind: 'mono' },
      { key: 'hrsd_number', ar: 'رقم الموارد', en: 'HRSD no.', w: 130, kind: 'mono' },
      { key: 'extra_activities', ar: 'أنشطة إضافية', en: 'Extra activities', w: 110, kind: 'num' },
      { key: 'permits', ar: 'التصاريح', en: 'Permits', w: 100, kind: 'num' },
      // التاريخ وحده: ختمُ المزامنة يحمل وقتاً بالثواني لا يفيد قارئ الجدول
      { key: 'synced_at', ar: 'آخر مزامنة', en: 'Last sync', w: 120, kind: 'date',
        get: (r) => ymd(r.synced_at) },
      /* ── طبقة المتابعة (إدخال يدوي فوق المُزامَن) ── */
      { key: 'bl_fee', ar: 'رسوم التجديد', en: 'Renewal fee', w: 120, kind: 'num', ops: true, sectionStart: true },
      { key: 'bl_sadad_no', ar: 'رقم السداد', en: 'SADAD no.', w: 160, kind: 'mono', ops: true, copy: true },
      { key: 'bl_paid_date', ar: 'تاريخ السداد', en: 'Paid on', w: 120, kind: 'date', ops: true },
      { key: 'bl_follow', ar: 'المتابعة', en: 'Follow-up', w: 140, kind: 'text', ops: true, select: true,
        options: () => ['قيد التجديد', 'بانتظار العميل', 'مكتملة', 'لا حاجة للتجديد'] },
      { key: 'bl_file', ar: 'مرفقات', en: 'Attachments', w: 150, kind: 'multifile', ops: true },
      { key: 'bl_notes', ar: 'ملاحظات', en: 'Notes', w: 220, kind: 'longtext', ops: true },
    ],
  },
]

const ROW_COL = { key: '_row', ar: '#', en: '#', w: 66, kind: 'rownum' }

/* `col.sectionStart` — حدّ قسمٍ في الجدول: خطّ ذهبي عريض على حافة العمود يفصل
   ما قبله عمّا بعده. يُعرَّف على العمود لا على موضعه، فيتبع الفاصلُ العمودَ
   أينما نُقل. (في شيت الطلبات: ما قبل «الحالة» إدخال الموظف، وما بعدها عمل
   المسؤول عن السداد.) */
/* `kind:'open'` — قيمةٌ تفتح صفحتها في التطبيق: رقم الفاتورة يفتح الفاتورة.
   الفتح عبر حدث `app-navigate-invoice` الذي يلتقطه App.jsx فيسجّل خطوة الرجوع
   ثم ينتقل — نفس ما تفعله بقيّة الصفحات، فسلسلة «رجوع» تعمل من الجدول أيضاً.
   النقر على **النصّ** يفتح، والنقر على بقيّة الخليّة يبقى تحديداً كأي خليّة. */
const goInvoice = (id) => { if (id) { try { window.dispatchEvent(new CustomEvent('app-navigate-invoice', { detail: { id } })) } catch { /* لا تنقّل */ } } }

const SECTION_LINE = '3px solid rgba(176,125,0,.72)'
const SECTION_EDGE = { borderInlineStart: SECTION_LINE }
const SECTION_EDGE_CSS = { start: SECTION_EDGE, end: { borderInlineEnd: SECTION_LINE } }
// الجهة الفعّالة لعمود: اختيار المستخدم (`layout.sectionEdge`) وإلا تعريف العرض
const edgeSideOf = (col, map) => {
  const v = (map || {})[col.key]
  if (v) return v === 'none' ? null : v
  return col.sectionStart ? 'start' : null
}

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
/* نصّ الخلية على أكثر من سطر: `col.get` يُرجع سطوراً مفصولة بـ`\n`، فيُرسم
   الأول أساسياً والباقي أصغر وأهدأ تحته (رأس اليوم: التاريخ ثم عدّاده ومجموعه).
   القيمة الخام تبقى سطراً واحداً بفواصلها — فالبحث والتصدير لا يتأثّران. */
/* غلافُ خلية مدمجة ذات مكوّن تفاعلي: يتمركز عبر ارتفاع المجموعة كطبقة — كنصّ
   الخلايا المدمجة تماماً، لكن بلا `pointerEvents:none` كي يبقى الرفع والفتح
   عاملَين. (`height` بالبكسل = عدد صفوف المجموعة × ارتفاع الصفّ.) */
const mSpanWrap = (on, h, el) => (on
  ? <span style={{ position: 'absolute', insetInlineStart: 0, insetInlineEnd: 0, top: 0, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}>{el}</span>
  : el)
/* ── خليّة الفاتورة (`kind:'pay'`) ──────────────────────────────────────────
   المال ثلاث حقائق (إجمالي · نسبة محصَّلة · متبقٍّ) وقراءتها من ثلاثة أعمدة
   أبطأ من لمحةٍ واحدة. الشكل: المبلغ سطراً أوّل ومعه شارة النسبة، وتحته شريطٌ
   رفيع يملأ بقدر ما حُصِّل ويقول المتبقّي بطرفه. اللون يتبع الحالة (مكتملة
   أخضر · جزئية ذهبي · لا شيء أحمر) على الخطّ والشريط لا على خلفية الخليّة —
   الخلفية في هذه الشبكة محجوزة لما يستدعي تدخّلاً.
   يقرأ `col.pay(row) → {total, remaining}` فيصلح لأي شيت فيه فاتورة. */
/* الجزئية **أزرق لا ذهبي**: الذهبي لون واجهة البرنامج كلّها (الحدود والرؤوس
   والأزرار) فتذوب فيه النسبة ولا تُقرأ لمحةً. والأزرق هو لون «الفاتورة» في دليل
   مصادر الأعمدة، فالمعنى متّسق: أخضر مكتملة · أزرق جزئية · أحمر لم يُدفع شيء. */
const PAY_TONES = { full: '#2ecc71', part: C.blue, none: C.red }
function PayCell({ total, remaining, isAr }) {
  const tot = Number(total) || 0
  if (!tot) return <span style={{ color: 'var(--tx4)', fontSize: 11.5 }}>—</span>
  const rem = Math.max(0, Math.min(tot, Number(remaining) || 0))
  const pct = Math.max(0, Math.min(100, Math.round(((tot - rem) / tot) * 100)))
  const t = PAY_TONES[pct >= 100 ? 'full' : pct > 0 ? 'part' : 'none']
  return (
    <span title={isAr ? `الإجمالي ${enNum(tot)} · المحصَّل ${enNum(tot - rem)} · المتبقّي ${enNum(rem)}`
      : `Total ${enNum(tot)} · Paid ${enNum(tot - rem)} · Due ${enNum(rem)}`}
      style={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%', minWidth: 0, padding: '0 2px' }}>
      {/* السطر الأول كتلةٌ واحدة في وسط الخليّة: المبلغ ووحدته ونسبته تُقرأ معاً،
          وتباعدُها على الطرفين كان يفكّها إلى معلومتين متباعدتين. */}
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minWidth: 0 }}>
        <span style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--tx)', fontVariantNumeric: 'tabular-nums', direction: 'ltr' }}>{enNum(tot)}</span>
        <span style={{ fontSize: 9.5, fontWeight: 500, color: 'var(--tx4)' }}>{isAr ? 'ريال' : 'SAR'}</span>
        {/* النسبة نصٌّ مجرّد لا شارة: الشريط تحتها يقولها شكلاً، فإطارٌ حولها
            تكرارٌ ثالث للمعنى نفسه في خليّةٍ ضيّقة. */}
        <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 600,
          color: t, fontVariantNumeric: 'tabular-nums', direction: 'ltr' }}>{pct}%</span>
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <span style={{ flex: 1, height: 4, borderRadius: 999, background: 'var(--bd2, rgba(255,255,255,.10))', overflow: 'hidden', minWidth: 24 }}>
          <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: t, borderRadius: 999, transition: 'width .25s' }} />
        </span>
        {/* المتبقّي **أحمر دائماً** ما دام أكبر من صفر: دَينٌ قائم على الفاتورة
            مهما بلغت نسبة التحصيل — فلا يأخذ لون الحالة الهادئ. */}
        <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 500, color: rem ? C.red : 'var(--tx4)', opacity: rem ? 1 : .7,
          fontVariantNumeric: 'tabular-nums' }}>
          {rem ? `${isAr ? 'متبقّي' : 'due'} ${enNum(rem)}` : (isAr ? 'مكتملة' : 'settled')}
        </span>
      </span>
    </span>
  )
}

/* ── محرّر خليّة التاريخ ─────────────────────────────────────────────────────
   منتقي المتصفّح (`input type=date`) شكلٌ غريبٌ عن البرنامج ويختلف بين متصفّح
   وآخر. الخليّة الآن تفتح **تقويم البرنامج نفسه** (`CalendarPopup` من FormKit)
   الذي تراه في نوافذ الفواتير والمعاملات، مع بقاء الكتابة اليدوية والصقّ
   والسحب كما هي في الشبكة.
   ⚠️ الحيلة الضرورية: النقر داخل التقويم كان يُفقد الحقلَ تركيزه فيُغلق المحرّر
   قبل أن تصل النقرة (onBlur يسبق onClick). التقويم يُرسم ببوّابة (portal) لكن
   أحداث React تصعد في **شجرة المكوّنات** لا شجرة DOM، فيلتقط الغلافُ حدثَ
   `mousedown` ويمنع سلوكه الافتراضي — فلا يُنقل التركيز أصلاً، والنقرة تعمل. */
function DateCellEditor({ seed, value, ltr, inRef, onPick, onKeyDown, onBlur }) {
  const boxRef = useRef(null)
  const [anchor, setAnchor] = useState(null)
  useEffect(() => {
    const el = boxRef.current; if (!el) return
    const r = el.getBoundingClientRect()
    setAnchor({ top: r.top, bottom: r.bottom, left: r.left, width: Math.max(r.width, 160) })
  }, [])
  const ymdOk = /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))
  return (
    <span ref={boxRef} style={{ display: 'block', width: '100%', height: '100%' }}>
      <input ref={inRef} className="ox-in" autoFocus type="text" placeholder="yyyy-mm-dd"
        defaultValue={seed} onKeyDown={onKeyDown} onBlur={onBlur}
        style={{ color: C.gold2, fontWeight: 600, textAlign: 'center', direction: ltr ? 'ltr' : undefined }} />
      {anchor && (
        <span onMouseDown={(e) => e.preventDefault()}>
          <CalendarPopup value={ymdOk ? value : ''} anchor={anchor}
            onPick={(s) => onPick(s)} onClose={() => onBlur()} />
        </span>
      )}
    </span>
  )
}

/* زرّ نسخ صغير داخل الخليّة: رقمٌ يُنقل إلى بوّابةٍ حكومية أو رسالةٍ للعميل
   يُنسَخ بضغطة بدل تحديد الخليّة. يتحوّل لعلامة صحّ لحظةً بعد النسخ — النسخ بلا
   إقرارٍ يترك المستخدم يخمّن هل وقع. (تحديد الخليّة و`Ctrl+C` يبقيان كما هما.) */
function CopyBtn({ text, title }) {
  const [ok, setOk] = useState(false)
  if (!text) return null
  return (
    <button type="button" title={title}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        try { navigator.clipboard.writeText(String(text)); setOk(true); setTimeout(() => setOk(false), 1400) } catch { /* لا حافظة */ }
      }}
      onMouseEnter={(e) => { if (!ok) e.currentTarget.style.color = C.gold }}
      onMouseLeave={(e) => { if (!ok) e.currentTarget.style.color = 'var(--tx4)' }}
      style={{ width: 16, height: 16, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer',
        color: ok ? '#2ecc71' : 'var(--tx4)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'color .15s' }}>
      {ok
        ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>}
    </button>
  )
}

/* تلميح «من أدخل هذه الخليّة ومتى» — من ختم الخليّة `__m` في بيانات الصف.
   التاريخ والوقت بالتوقيت المحلّي وبصيغة الشبكة (سنة-شهر-يوم ساعة:دقيقة). */
const stampWhen = (iso) => {
  const d = new Date(iso)
  if (Number.isNaN(+d)) return String(iso || '').slice(0, 16).replace('T', ' ')
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
const cellStamp = (row, col, isAr) => {
  const m = row && row._ops && row._ops.__m && row._ops.__m[col.key]
  if (!m || !m.at) return undefined
  return isAr
    ? `أدخلها ${m.u || 'مستخدم'} · ${stampWhen(m.at)}`
    : `Entered by ${m.u || 'user'} · ${stampWhen(m.at)}`
}

/* ── خليّة «جلب» (`kind:'fetch'`) ────────────────────────────────────────────
   خليّةٌ قيمتها تُجلب من مصدرٍ خارجي بضغطة: تعرض ما جُلب، وبجانبه زرٌّ صغير
   بشعار المصدر. الجلب يُعرَّف على العمود (`col.fetch(row)`) فالمحرّك لا يعرف
   مقيماً ولا غيره — أي عمود يحتاج جلباً خارجياً يأخذ نفس الخليّة. */
function FetchCell({ value, busy, tip, icon, onFetch, canEdit }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <span style={{ fontVariantNumeric: 'tabular-nums', direction: 'ltr', color: value ? 'var(--tx)' : 'var(--tx4)', fontWeight: value ? 600 : 400 }}>
        {value || '—'}
      </span>
      {canEdit && (
        <button type="button" title={tip} disabled={busy}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onFetch() }}
          style={{ width: 22, height: 22, padding: 0, borderRadius: '50%', flexShrink: 0, cursor: busy ? 'default' : 'pointer',
            border: '1px dashed rgba(245,158,11,.55)', background: 'rgba(245,158,11,.10)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: busy ? .55 : 1 }}>
          {busy
            ? <span style={{ fontSize: 9, color: '#b45309' }}>…</span>
            : <img src={icon || '/muqeem-logo.png'} alt="" width="13" height="13"
                style={{ borderRadius: '50%', objectFit: 'contain', background: '#fff', padding: 1 }} />}
        </button>
      )}
    </span>
  )
}

const cellLines = (v) => {
  const s = String(v ?? '')
  if (!s.includes('\n')) return s
  /* السطر الثاني يهدأ بالشفافية لا بلونٍ رماديّ ثابت: فيتبع لون خليّته — يقوى
     حيث النصّ قويّ (اسم المكتب على خلفيته الملوّنة) ويهدأ حيث هدأ. واللون الثابت
     كان يذوب في الخلفيات المصبوغة. */
  return s.split('\n').map((t, i) => (
    <span key={i} style={{ display: 'block', lineHeight: 1.25, ...(i ? { fontSize: 11, fontWeight: 500, opacity: .78 } : {}) }}>{t}</span>
  ))
}

/* optLabel: نصّ معروض يختلف عن القيمة المخزَّنة — القيمة تبقى رمزاً ثابتاً
   (مفتاح حساب مثلاً) تُبنى منه المفاتيح والمقارنات، والمعروض اسمه المفهوم. */
function CellSelect({ value, options, onChange, disabled, optBg, optLabel }) {
  const lab = (o) => (optLabel ? (optLabel(o) || o) : o)
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
        style={{ padding: '9px 12px', fontSize: 12.5, fontWeight: 600, color: sub ? 'var(--tx3)' : 'var(--tx)', cursor: 'pointer', borderRadius: 7, textAlign: 'center', background: base, boxShadow: o === value ? `inset 0 0 0 1.5px ${C.gold}` : 'none', margin: '1px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cellLines(label)}</div>
    )
  }
  return (
    <>
      <button ref={btnRef} type="button" onMouseDown={(e) => e.stopPropagation()} onClick={openIt}
        style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'transparent', border: 'none', outline: 'none', cursor: disabled ? 'default' : 'pointer', color: value ? 'var(--tx)' : 'var(--tx4)', fontFamily: F, fontWeight: value ? 600 : 500, fontSize: 12.5, padding: '0 8px' }}>
        {/* `\n` في نصّ الخيار يُرسم سطرين (رمز المكتب ثم اسمه) — كبقيّة خلايا الشبكة */}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value ? cellLines(lab(value)) : '—'}</span>
        {!disabled && <span aria-hidden style={{ fontSize: 8, color: C.gold, opacity: .85, transition: '.2s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>}
      </button>
      {open && ReactDOM.createPortal(
        <div ref={popRef} style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxH, overflowY: 'auto', background: 'var(--card-grad2)', border: `1.5px solid ${C.gold}`, borderRadius: 10, boxShadow: '0 14px 44px rgba(0,0,0,.30)', zIndex: 4000, fontFamily: F, padding: 5, boxSizing: 'border-box' }}>
        {item('', '—', true)}
        {(options || []).map((o) => item(o, lab(o)))}
        </div>, document.body)}
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* حاجز أخطاء: خطأٌ واحد أثناء الرسم كان يُفرِّغ الصفحة كلها بلا كلمة واحدة —
   لا في الشاشة ولا في متناول من يستعملها. الآن يظهر نصّ الخطأ وموضعه ليُنقَل
   كما هو، ويبقى زرّ إعادة المحاولة. (الحاجز يجب أن يكون **أباً** للمكوّن، فلا
   يلتقط المكوّن خطأ نفسه — لذلك التغليف عند التصدير.) */
class OxErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null, info: null } }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch(err, info) { this.setState({ info }); console.error('[OpsExcels] render error:', err, info) }
  render() {
    if (!this.state.err) return this.props.children
    const ar = this.props.lang !== 'en'
    const msg = String(this.state.err?.message || this.state.err)
    const where = String(this.state.info?.componentStack || '').trim().split('\n').slice(0, 4).join('\n')
    return (
      <div style={{ margin: 16, padding: 18, borderRadius: 12, border: `1px solid ${C.red}`, background: 'rgba(232,114,101,.08)', fontFamily: F, direction: ar ? 'rtl' : 'ltr' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.red, marginBottom: 8 }}>
          {ar ? 'تعطّل عرض الجدول' : 'The sheet failed to render'}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--tx2)', marginBottom: 10 }}>
          {ar ? 'انسخ النصّ التالي كما هو وأرسله — فيه سبب العطل بالضبط:' : 'Copy the text below as-is and send it — it names the exact cause:'}
        </div>
        <pre dir="ltr" style={{ margin: 0, padding: 12, borderRadius: 9, background: 'var(--bd2)', color: 'var(--tx)', fontSize: 11.5, fontFamily: MONO, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 260, overflow: 'auto' }}>
          {msg}{where ? '\n' + where : ''}
        </pre>
        <button onClick={() => this.setState({ err: null, info: null })}
          style={{ marginTop: 12, height: 34, padding: '0 18px', borderRadius: 9, border: '1px solid rgba(176,125,0,.5)', background: 'rgba(176,125,0,.16)', color: C.gold2, fontSize: 12.5, fontWeight: 600, fontFamily: F, cursor: 'pointer' }}>
          {ar ? 'إعادة المحاولة' : 'Retry'}
        </button>
      </div>
    )
  }
}

export default function OpsExcelsPageBoundary(props) {
  return <OxErrorBoundary lang={props.lang}><OpsExcelsPage {...props} /></OxErrorBoundary>
}

function OpsExcelsPage({ sb, user, toast, lang, onTabChange }) {
  const isAr = lang !== 'en'
  const T = (a, e) => (isAr ? a : e)
  /* صلاحية التعديل. الصلاحية الفعلية `canEdit` تُشتقّ منها أدناه بعد معرفة
     الأسبوع المعروض — الأرشيف للقراءة فقط مهما كانت صلاحية المستخدم.
     **وحدة «جداول العمل» هي المرجع متى مُنحت**: أي دورٍ نال شيئاً منها يُحكَم
     بها وحدها. والصلاحيتان القديمتان (`sync_hub.access`/`work_visas.edit`)
     تبقيان بديلاً **فقط** لدورٍ لم يُضبط له شيء في «جداول العمل» بعد — وإلا
     لصار منح «تعديل الخلايا» بلا أثر عند من يملك المزامنة، وبلا معنى عند من
     لا يملكها (وهو ما حدث: الدور ممنوحٌ `ops_excels.edit` والشريط يقول «للعرض فقط»). */
  const hasOpsGrants = (user?.perms || []).some((p) => p.module === 'ops_excels')
  const legacyEdit = canPerm(user, 'sync_hub.access') || canPerm(user, 'work_visas.edit')
  const canEditPerm = (user?.role_key === 'gm') || hasPerm(user, 'ops_excels', 'edit') || (!hasOpsGrants && legacyEdit)
  /* اسم المستخدم الحالي — يُختَم على الصفوف التي تسأل «من أدخل هذا؟».
     ⚠️ الاسم في `user.person` لا في `user` نفسه (جدول الأشخاص الموحّد)، والقراءة
     من `user.name_ar` كانت تُرجع فراغاً فيسقط الختم للبريد. */
  const userName = (() => {
    const p = user?.person || {}
    return (isAr ? (p.name_ar || p.name_en) : (p.name_en || p.name_ar))
      || user?.name_ar || user?.name_en || user?.email || ''
  })()

  /* الصفحة مفتوحة لكل المستخدمين، إلا شيتات **مال المكتب** فللمدير العام وحده:
     من يفتح «الفواتير» يرى ما فُوتر وما بقي على كل عميل، ومن يفتح «الإيداعات»
     أو «دفتر السدادات» يرى حركة نقد المكاتب. («طلبات السداد» ليست منها عمداً —
     الموظف هو من يُدخل فيها ما يريد سداده، فقفلها يوقف العمل لا يحميه.) */
  const isGM = user?.role_key === 'gm'
  /* الصلاحيات على مستويين (تبويب «الأدوار والصلاحيات» ← جداول العمل):
     ① بطاقةٌ لكل **جدول** — إخفاؤها تُخرجه من القائمة كلياً.
     ② زرٌّ لكل **خاصيّة** داخل الجدول (تعديل/إضافة/حذف/أعمدة/تصدير/لقطات/محادثة…)
        — تُستثنى على جدولٍ بعينه ولو كانت ممنوحةً عموماً.
     التوافق مع القائم: من يملك `sync_hub.access` يبقى كما كان، وأي استثناء
     صريح (`false`) يسحب الخاصيّة منه — فلا ينكسر دورٌ قائم قبل ضبطه. */
  const uvis = user?.ui_visibility || {}
  const sheetShown = useCallback((k) => isGM || uvis[`card:ops_excels:${k}`] !== false, [isGM, uvis])
  const visibleViews = useMemo(() => {
    const base = isGM ? VIEWS : VIEWS.filter((v) => !GM_ONLY_VIEWS.has(v.key))
    return base.filter((v) => sheetShown(v.key))
  }, [isGM, sheetShown])
  const [viewKey, setViewKey] = useState(() => (user?.role_key === 'gm' ? VIEWS[0].key : VIEWS.find((v) => !GM_ONLY_VIEWS.has(v.key)).key))
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
  const allViews = useMemo(() => [...visibleViews, ...customViews], [visibleViews, customViews])
  /* الاحتياطي أوّلُ عرضٍ **مسموح** لا `VIEWS[0]`: مفتاحٌ محفوظ من جلسةٍ سابقة (أو
     رابط) يشير لشيت مالي كان سيفتحه لغير المدير العام عبر هذا الاحتياطي. */
  const view = useMemo(() => allViews.find((v) => v.key === viewKey) || allViews[0], [viewKey, allViews])
  // حدود مجموعات الدمج — تُملأ عند الرسم ويقرؤها `move` (المعرَّف قبلها)
  const mergeRef = useRef(null)
  const colSpecRef = useRef(null)
  // أعمدةٌ قيمتها للمجموعة كلها لا للصفّ (انظر `groupRowKey` عند بناء allRows)
  const groupColSet = useMemo(() => new Set(view.groupCols || []), [view])
  const isGroupCol = useCallback((k) => groupColSet.has(k), [groupColSet])

  // تخطيط الأعمدة المحفوظ لكل عرض: { order:[keys], hidden:[keys], custom:[{key,ar,w,kind}] }
  const [layout, setLayout] = useState({})
  const [syncRows, setSyncRows] = useState([])

  /* ── أزرار المجموعات (view.tabs) ──────────────────────────────────────────────
     عرض فيه مجموعات طبيعية (مكاتب مثلاً) يُقسَّم إلى جدول مستقل لكل مجموعة بدل
     شبكة واحدة مختلطة: الأزرار فوق الشبكة، والصفوف تُقصر على المجموعة المختارة
     قبل كل شيء — فالبحث والفرز والفلترة وصف الإجماليات كلها ضمنها وحدها.
     القيم تُشتقّ من البيانات نفسها، فأي مجموعة جديدة يظهر زرّها تلقائياً.
     يُحسب هنا مبكّراً لأن **الأعمدة نفسها تتبع المجموعة** (layout.tabHidden). */
  const tabDefs = useMemo(() => {
    if (!view.tabs) return []
    // قائمة ثابتة (شيت يدوي بلا صفوف مزامنة تُشتقّ منها المجموعات)…
    if (view.tabs.list) return view.tabs.list
    // …أو مشتقّة من صفوف المزامنة، فتنضمّ أي مجموعة جديدة تلقائياً
    const m = new Map()
    for (const r of syncRows) {
      const k = view.tabs.key(r)
      if (k && !m.has(k)) m.set(k, view.tabs.label(r))
    }
    return [...m.entries()].map(([key, label]) => ({ key, label })).sort((a, b) => String(a.key).localeCompare(String(b.key)))
  }, [view, syncRows])
  // مقترن بالعرض (كاختيار الأسبوع) كي لا يُطبَّق زر عرضٍ على عرض آخر
  const [tabPick, setTabPick] = useState({ k: '', t: '' })
  const tabSel = (view.tabs && tabPick.k === viewKey && tabDefs.some((t) => t.key === tabPick.t))
    ? tabPick.t
    : (tabDefs[0]?.key || '')
  const setTabSel = useCallback((t) => setTabPick({ k: viewKey, t }), [viewKey])

  /* الأعمدة المخفية: العامّة + **مخفيّات المجموعة المفتوحة**. المجموعات في شيت
     واحد قد تكون جداول مختلفة فعلاً (سدادات السجلات لا فاتورة نظام لها أصلاً
     بينما سدادات المكاتب تقوم عليها)، فإخفاء عمود يقع في مجموعته وحدها.
     «حذف نهائي» وحده يبقى عامّاً — معناه «هذا العمود لا مكان له في الشيت». */
  const hiddenCols = useMemo(
    () => new Set([...(layout.hidden || []), ...(((layout.tabHidden || {})[tabSel]) || [])]),
    [layout, tabSel])
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
  /* ⚠️ **ترتيب المستخدم لا يُمسّ.** العمود الجديد كان يُلحَق بآخر الجدول، فكل
     تحديثٍ يضيف عموداً يبدو وكأنه «أعاد ترتيب الأعمدة»: يظهر غريباً في الذيل
     بعيداً عن إخوته، ويعيد المستخدمُ سحبَه كل مرّة. الآن يُدرَج **بجوار جيرانه
     كما عُرِّف في العرض**: بعد أقرب عمودٍ يسبقه في التعريف وله موضعٌ في الترتيب
     المحفوظ، وإلا قبل أقرب لاحقٍ له، وإلا في الآخر (الأعمدة المخصّصة). فالترتيب
     المحفوظ يبقى كما تركه صاحبه حرفاً بحرف. */
  const orderKeys = useMemo(() => {
    const removed = new Set(layout.removed || [])
    const base = (layout.order && layout.order.length) ? layout.order.slice() : view.columns.map((c) => c.key)
    const codeAt = new Map(view.columns.map((c, i) => [c.key, i]))
    for (const k of colDefs.keys()) {
      if (base.includes(k)) continue
      const ci = codeAt.get(k)
      let at = -1
      if (ci != null) {
        for (let j = ci - 1; j >= 0 && at < 0; j--) { const p = base.indexOf(view.columns[j].key); if (p >= 0) at = p + 1 }
        for (let j = ci + 1; j < view.columns.length && at < 0; j++) { const n = base.indexOf(view.columns[j].key); if (n >= 0) at = n }
      }
      if (at < 0) base.push(k); else base.splice(at, 0, k)
    }
    return base.filter((k) => colDefs.has(k) && !removed.has(k))
  }, [layout, view, colDefs])
  // الأعمدة الظاهرة (عمود الترقيم أولاً دائماً)
  const COLS = useMemo(() => [ROW_COL, ...orderKeys.filter((k) => !hiddenCols.has(k)).map((k) => colDefs.get(k))], [orderKeys, hiddenCols, colDefs])
  const firstEditable = useMemo(() => { const i = COLS.findIndex((c) => c.ops || c.manual); return i < 0 ? 1 : i }, [COLS])
  // أعمدة مثبَّتة (تبقى ظاهرة عند التمرير الأفقي) + أعمدة مقفلة (للقراءة فقط)
  const frozenCount = Math.max(0, Math.min(layout.frozenCount || 0, COLS.length))
  const lockedSet = useMemo(() => new Set(layout.locked || []), [layout])

  const [priceModal, setPriceModal] = useState(false)  // نافذة تسعيرة الأغراض
  const [priceDraft, setPriceDraft] = useState({})
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
  // عارض المرفقات داخل الصفحة: { url, name, mime } — صورة أو PDF أو بطاقة ملف
  const [fileView, setFileView] = useState(null)
  const [fileBusy, setFileBusy] = useState(null)    // `${rowId}|${colKey}` أثناء رفع ملف الخلية
  useEffect(() => {
    if (!fileView) return
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setFileView(null) } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [fileView])
  const [pwModal, setPwModal] = useState(null)      // { key, mode:'set'|'unlock' }
  const [pwInput, setPwInput] = useState('')
  const [unlockedCols, setUnlockedCols] = useState(() => new Set())  // أعمدة فُتحت بكلمة السر هذه الجلسة
  const [hdrCtx, setHdrCtx] = useState(null)        // { x, y, colKey } قائمة سياق رأس العمود
  const dragColRef = useRef(null)                   // مفتاح العمود المسحوب
  const dragRowRef = useRef(null)                   // مفتاح الصف المسحوب

  const [overlay, setOverlay] = useState({})     // row_key → { data, sort_order, hidden, is_manual }
  const [loading, setLoading] = useState(true)
  // ── الأرشيف الأسبوعي ──
  const thisWeek = weekStartOf()                       // جمعة الأسبوع الجاري
  const [weeks, setWeeks] = useState([])               // [{week_start, captured_at, row_count}] بلا حمولة
  /* الاختيار مقترن بالعرض الذي اختير فيه. لو صُفِّر بـeffect عند تبديل العرض،
     لجرت جولة تحميل واحدة بالأسبوع القديم على العرض الجديد (لقطة غير موجودة →
     ومضة خطأ) قبل أن يسري التصفير. الاشتقاق أثناء الرسم يمنع ذلك أصلاً. */
  const [weekPick, setWeekPick] = useState({ k: '', w: 'live' })
  const weekSel = weekPick.k === viewKey ? weekPick.w : 'live'   // 'live' أو تاريخ جمعة
  const setWeekSel = useCallback((w) => setWeekPick({ k: viewKey, w }), [viewKey])
  const [snapBusy, setSnapBusy] = useState(false)
  const toastRef = useRef(toast); toastRef.current = toast
  /* تفصيل الخلية (view.drillLoad): الأعمدة المحسوبة تلقائياً يجب أن تكون قابلة
     للتدقيق — ضغطة على الرقم تفتح مصدره سطراً سطراً. */
  const [drill, setDrill] = useState(null)      // { loading, title, note, columns, rows, err }
  const [longEdit, setLongEdit] = useState(null) // { row, col, text } محرّر النصّ الطويل
  const openDrill = useCallback(async (row, col) => {
    if (!sb || !view.drillLoad) return
    setDrill({ loading: true })
    try { setDrill({ ...(await view.drillLoad(sb, row, isAr)), loading: false }) }
    catch (e) { setDrill({ loading: false, err: e.message || String(e) }) }
  }, [sb, view, isAr])
  const [snapInfo, setSnapInfo] = useState(null)       // بيانات اللقطة المعروضة حالياً
  const archived = weekSel !== 'live'
  // اللقطة سجلّ تاريخي — لا يُعدَّل. كل ما في الشبكة (تحرير الخلايا، إضافة صف/عمود،
  // الحفظ، اللصق، السحب) مربوط بـcanEdit فيُعطَّل كله دفعةً واحدة هنا.
  /* خاصيّةٌ على الجدول المفتوح: تُمنَع باستثناءٍ صريح على هذا الجدول، وتُمنَح
     بمنحِ الدورِ إياها في «جداول العمل» أو بالصلاحية القديمة (توافقاً). */
  const sheetCan = useCallback((action, key) => {
    if (isGM) return true
    const k = key || viewKey
    if (uvis[`cardact:ops_excels:${k}:${action}`] === false) return false
    if (hasPerm(user, 'ops_excels', action)) return true
    return !hasOpsGrants && legacyEdit   // دورٌ لم يُضبط في «جداول العمل» بعد
  }, [isGM, uvis, user, viewKey, hasOpsGrants, legacyEdit])
  const canEdit = canEditPerm && !archived && sheetCan('edit')
  const canAddRow = canEdit && sheetCan('create')
  const canDelRow = canEdit && sheetCan('delete')
  const canCols = canEdit && sheetCan('columns')
  const canExport = sheetCan('export')
  const canRefresh = sheetCan('refresh')
  const canSnapshot = sheetCan('snapshot')
  const canChat = sheetCan('chat')
  const canNewSheet = !archived && sheetCan('new_sheet')
  const canRename = canEdit && sheetCan('rename')
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
  /* زرّا القفز لطرفَي الجدول.
     ⚠️ **ليست النافذة هي التي تُمرَّر**: هيكل التطبيق `.dash-wrap` بارتفاع الشاشة
     و`overflow:hidden`، والتمرير يقع داخل `.dash-content` (App.jsx). فـ
     `window.scrollTo` لا يحرّك شيئاً — لذلك نبحث عن **أقرب جدٍّ قابل للتمرير**
     كما يفعل مستمع التمرير في الرسم الافتراضي (يلتقط بـcapture لا من النافذة). */
  const gridBoxRef = useRef(null)
  const scrollParentOf = (el) => {
    for (let p = el?.parentElement; p; p = p.parentElement) {
      const oy = getComputedStyle(p).overflowY
      if (/(auto|scroll|overlay)/.test(oy) && p.scrollHeight > p.clientHeight + 4) return p
    }
    return null
  }
  const jumpGrid = useCallback((dir) => {
    const el = gridBoxRef.current; if (!el) return
    const sp = scrollParentOf(el)
    // «أعلى» = رأس الجدول عند حدّ الحاوية (الرأس لاصق فيعلو الصفوف)
    // «أسفل» = آخر صفٍّ عند قاع الحاوية
    if (sp) {
      const top = sp.scrollTop + el.getBoundingClientRect().top - sp.getBoundingClientRect().top
      sp.scrollTo({ top: Math.max(0, dir < 0 ? top - 6 : top + el.offsetHeight - sp.clientHeight + 6), behavior: 'smooth' })
      return
    }
    const top = el.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: Math.max(0, dir < 0 ? top - 6 : top + el.offsetHeight - window.innerHeight + 6), behavior: 'smooth' })
  }, [])
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

  /* ── التحميل: صفوف المصدر + طبقة الـoverlay ──────────────────────────────────
     مصدران محتملان حسب الأسبوع المختار:
       'live'  → view.load(sb) + ops_sheet_rows الحاليان (السلوك الأصلي)
       أسبوع   → صفوف وoverlay اللقطة المخزَّنة، بلا أي مساس بالبيانات الحيّة.
     التخطيط (الأعمدة/العرض/الفرز) يُقرأ من ops_sheet_config في الحالتين — الأرشيف
     يحفظ البيانات لا شكل الجدول، فترتيب الأعمدة الحالي يُطبَّق على أي أسبوع.    */
  const load = useCallback(async () => {
    if (!sb) return
    setLoading(true); setLoadErr(null)
    try {
      const cfgP = sb.from('ops_sheet_config').select('layout').eq('view_key', view.key).maybeSingle()
      let src = [], ov = {}, snap = null
      if (weekSel === 'live') {
        const [s, ovR] = await Promise.all([
          view.load(sb),
          sb.from('ops_sheet_rows').select('row_key,data,sort_order,hidden,is_manual').eq('view_key', view.key),
        ])
        // اسم المنشأة من السجل التجاري يفوز على اسم أي منصّة أخرى (view.sbcName)
        src = view.sbcName ? await applySbcName(sb, s, view.sbcName) : s
        for (const o of (ovR.data || [])) ov[o.row_key] = { data: o.data || {}, sort_order: o.sort_order, hidden: !!o.hidden, is_manual: !!o.is_manual }
      } else {
        const { data, error } = await sb.from('ops_sheet_snapshots')
          .select('rows,overlay,row_count,captured_at,captured_by')
          .eq('view_key', view.key).eq('week_start', weekSel).maybeSingle()
        if (error) throw error
        if (!data) throw new Error(isAr ? 'لا توجد لقطة محفوظة لهذا الأسبوع' : 'No saved snapshot for this week')
        src = data.rows || []
        ov = data.overlay || {}
        snap = { week_start: weekSel, captured_at: data.captured_at, row_count: data.row_count }
      }
      const cfgR = await cfgP
      const lay = cfgR?.data?.layout || {}
      setSyncRows(src); setOverlay(ov); setLayout(lay); setSnapInfo(snap)
      setWidthMap({}); setRowH(lay.rowHeight || ROW_H)
      setEdits({}); setRowErr({}); undoStackRef.current = []; redoStackRef.current = []
    } catch (e) {
      setLoadErr(e.message || String(e)); setSyncRows([]); setOverlay({}); setSnapInfo(null)
    } finally { setLoading(false) }
    // ⚠️ لا تضع `T` (ولا أي دالة تُبنى كل رسم) في هذه المصفوفة: `load` يُستدعى من
    // effect يعتمد عليه، فأي اعتماد غير مستقرّ = إعادة تحميل بلا نهاية (الشبكة
    // تبقى هيكلاً عظمياً والطلبات تُقطَع). استعمل `isAr` وهو قيمة منطقية ثابتة.
  }, [sb, view, weekSel, isAr])
  useEffect(() => { load() }, [load])

  /* ── الأرشيف الأسبوعي: قائمة الأسابيع · الالتقاط · الالتقاط التلقائي ──────── */
  // القائمة تستبعد عمودَي rows/overlay عمداً — حمولتهما بالميغابايتات ولا حاجة
  // لها إلا عند فتح أسبوع بعينه.
  const loadWeeks = useCallback(async () => {
    if (!sb) return
    const { data } = await sb.from('ops_sheet_snapshots')
      .select('week_start,captured_at,row_count').eq('view_key', view.key).order('week_start', { ascending: false })
    setWeeks(data || [])
  }, [sb, view.key])
  useEffect(() => { loadWeeks() }, [loadWeeks])

  // يلتقط حالة الأسبوع الجاري (يستبدل لقطته إن وُجدت — تُعاد بعد كل مزامنة).
  // يعمل على البيانات الحيّة فقط؛ لا معنى لالتقاط لقطة من لقطة.
  const captureWeek = useCallback(async ({ silent } = {}) => {
    if (!sb || archived || loading) return false
    setSnapBusy(true)
    try {
      const payload = {
        view_key: view.key,
        week_start: thisWeek,
        rows: snapClean(syncRows),
        overlay,
        row_count: (syncRows || []).length,
        captured_at: new Date().toISOString(),
        captured_by: user?.id || null,
      }
      const { error } = await sb.from('ops_sheet_snapshots').upsert(payload, { onConflict: 'view_key,week_start' })
      if (error) throw error
      await loadWeeks()
      if (!silent) toastRef.current?.(isAr ? `تم حفظ لقطة ${thisWeek}` : `Snapshot saved for ${thisWeek}`)
      return true
    } catch (e) {
      if (!silent) toastRef.current?.((isAr ? 'تعذّر حفظ اللقطة: ' : 'Snapshot failed: ') + (e.message || e), 'error')
      return false
    } finally { setSnapBusy(false) }
    // `toast` عبر ref لا عبر الاعتمادات: هويته تتغيّر كل رسم، ووجوده هنا يجعل
    // effect الالتقاط التلقائي (الذي يعتمد على هذه الدالة) يعمل في كل رسم بلا داعٍ.
  }, [sb, archived, loading, view.key, thisWeek, syncRows, overlay, user, loadWeeks, isAr])

  /* الالتقاط التلقائي: أول مرة يُفتح فيها العرض في أسبوع جديد تُحفظ لقطة تلقائياً،
     كي لا يضيع أسبوع لو نسي أحد الضغط على الزر. الزر يبقى للتحديث بعد المزامنة —
     المزامنة تجري خلال الأسبوع، والضغطة تستبدل اللقطة بأحدث حالة. */
  const autoSnapRef = useRef('')
  useEffect(() => {
    if (!sb || archived || loading || loadErr || !canEditPerm) return
    // لا شيء يستحق الحفظ: لا صفوف مزامنة ولا إدخال يدوي (الجداول المخصّصة كلها overlay)
    if (!syncRows.length && !Object.keys(overlay).length) return
    const stamp = view.key + '|' + thisWeek
    if (autoSnapRef.current === stamp) return                  // مرة واحدة لكل عرض/أسبوع في الجلسة
    if (weeks.some((w) => w.week_start === thisWeek)) return   // الأسبوع محفوظ أصلاً
    autoSnapRef.current = stamp
    captureWeek({ silent: true })
  }, [sb, archived, loading, loadErr, canEditPerm, weeks, syncRows.length, view.key, thisWeek, captureWeek])

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

  /* الفروع تُحمَّل **مرّة للصفحة كلها**: اسم المكتب ولونه واحدٌ في كل الشيتات،
     فلا يُجلب في كل عرضٍ على حدة ولا يظهر رمزٌ بلا اسم في شيتٍ لم يجلبه. */
  useEffect(() => {
    if (!sb) return
    let alive = true
    ;(async () => {
      try {
        const brs = await fetchAll(sb, 'branches', 'branch_code,name_ar,is_active,is_test',
          (q) => q.is('deleted_at', null).order('branch_code'))
        if (!alive) return
        SR_REF.branchLabel = new Map((brs || []).map((b) => [String(b.branch_code || '').trim(), b.name_ar || '']))
        // قوائم الاختيار تقتصر على العامل من الفروع (المغلق والتجريبي لا يُختاران)
        SR_REF.branches = (brs || []).filter((b) => b.is_active && !b.is_test)
          .map((b) => String(b.branch_code || '').trim()).filter(Boolean)
        setSeq((s) => s + 1)   // إعادة رسمٍ بعد وصول الأسماء
      } catch { /* الأسماء زينة: الرمز وحده يكفي حتى تصل */ }
    })()
    return () => { alive = false }
  }, [sb])

  // زر «تحديث من المزامنة»: يعيد جلب أحدث بيانات المزامنة — طبقة الإدخال اليدوي (overlay) محفوظة دائماً
  const refresh = useCallback(async () => {
    if (Object.keys(edits).length && typeof window !== 'undefined' && !window.confirm(T('لديك تعديلات غير محفوظة ستُفقد عند التحديث. احفظ أولاً ثم حدّث. متابعة بدون حفظ؟', 'You have unsaved edits that will be lost. Save first. Continue without saving?'))) return
    await load()
    toast && toast(T('تم جلب أحدث بيانات المزامنة · الإدخالات اليدوية المحفوظة سليمة', 'Latest synced data pulled · saved manual entries preserved'))
  }, [load, edits, toast, T])

  /* نتيجة `afterSave`: إمّا نصّ تنبيه، أو `{note, patch}` حيث `patch` بيانات
     الصفوف كما استقرّت في القاعدة. تُدمج في الطبقة اليدوية محلّياً — فلا إعادة
     تحميل بعد الترحيل: الجدول يبقى في مكانه ويظهر الختم في مكانه.
     (تُعرَّف قبل مستعمليها — الاعتماديات تُقرأ لحظة الرسم لا لحظة الاستدعاء.) */
  const applyAfterSave = useCallback((res) => {
    if (!res) return ''
    if (typeof res === 'string') return res
    const patch = res.patch
    if (patch && Object.keys(patch).length) {
      setOverlay((prev) => {
        const n = { ...prev }
        for (const [id, data] of Object.entries(patch)) n[id] = { ...(n[id] || {}), data, is_manual: true }
        return n
      })
      setSeq((s) => s + 1)
    }
    return res.note || ''
  }, [])

  /* إعادة الترحيل يدوياً (`view.repostable`): الترحيل أثرٌ **بعد الحفظ**، فصفٌّ
     حُجب يومها (نقصه حقل أو حسابه غير معروف) ثم صُحّح لا يُرحَّل من تلقائه —
     ولا سبيل لحفظه ثانيةً لأنه صار مقفولاً بمرجع العملية. فهذه ضغطةٌ تعيد
     تشغيل الأثر على صفٍّ واحد بقيمه المحفوظة، والحرّاس أنفسهم يفحصونه. */
  const repostRow = useCallback(async (row) => {
    if (!sb || !row || !view.afterSave) return
    const data = (overlay[row._id] && overlay[row._id].data) || row._ops || {}
    try {
      const note = applyAfterSave(await view.afterSave(sb, [{ id: row._id, data }], { user, isAr, rows: [row] }))
      toast && toast(note || T('لا شيء يُرحَّل', 'Nothing to post'))
    } catch (e) {
      toast && toast(T('تعذّر الترحيل للدفتر: ', 'Posting to the ledger failed: ') + (e.message || e), 'error')
    }
  }, [sb, view, overlay, user, isAr, toast, T, applyAfterSave])

  /* ── ترحيل تلقائي لما فات ─────────────────────────────────────────────────
     الترحيل أثرٌ بعد الحفظ، فالطلب الذي حُجب يومَه (نقصه حقل أو حسابه غير معروف)
     ثم صار مستوفياً لا يُرحَّل من تلقائه — ولا سبيل لحفظه ثانيةً لأنه صار مقفولاً
     بمرجع العملية. فبعد كل تحميل: أي طلبٍ «تم السداد» بلا مرجع دفتر يُحاول
     ترحيله بقيمه المحفوظة، والحرّاس أنفسهم يفحصونه. صامتٌ إن لم يُرحَّل شيء —
     فلا يتكرّر تنبيهُ صفٍّ ناقصٍ مع كل فتحة. ولا يدور: المُرحَّل يُختَم بمرجعه
     فيخرج من القائمة، والمحجوب لا يُعيد التحميل. */
  const autoPostRef = useRef(false)
  useEffect(() => {
    // العرض اليدوي لا يُرحَّل من تلقائه أبداً — ولا حتى «ترحيل ما فات» عند التحميل
    if (!sb || loading || weekSel !== 'live' || !view.afterSave || !view.repostable || view.manualPost) return
    if (autoPostRef.current) return
    const pend = Object.entries(overlay)
      .map(([id, ov]) => ({ _id: id, _ops: (ov && ov.data) || {} }))
      .filter((r) => view.repostable(r))
    if (!pend.length) return
    autoPostRef.current = true
    ;(async () => {
      try {
        const note = applyAfterSave(await view.afterSave(sb, pend.map((r) => ({ id: r._id, data: r._ops })), { user, isAr, auto: true }))
        if (note) toast && toast(note)
      } catch (e) { /* الترحيل التلقائي لا يُزعج بخطأ لم يطلبه المستخدم */ }
      finally { autoPostRef.current = false }
    })()
  }, [overlay, sb, view, weekSel, loading, user, isAr, toast, applyAfterSave])

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
  const editsRef = useRef(edits); editsRef.current = edits
  useEffect(() => { setBlankKeys([]) }, [viewKey])
  /* `blankBatch`: دفعة كاملة بدل تعويض صفّ بصفّ. الشيت يبقى بخمسة أسطر نظيفة،
     فإذا بلغ الإدخال آخرها بسطر واحد فُتحت دفعة جديدة. التعويض المستمرّ يُبقي
     الذيل الفارغ ثابت الطول دائماً، وهو ما لا يريده شيتُ يومٍ قصير. */
  useEffect(() => {
    // في العرض الأرشيفي لا صفوف فارغة — لا شيء يُدخَل في سجلّ تاريخي.
    const n = archived ? 0 : (view.blankRows || 0)
    if (!n) { if (blankKeys.length) setBlankKeys([]); return }
    const free = blankKeys.filter((k) => !overlay[k] && !edits[k]).length
    if (view.blankBatch) {
      if (!blankKeys.length || free <= 1) setBlankKeys((p) => [...p, ...Array.from({ length: n }, () => newKey())])
    } else if (free < n) {
      setBlankKeys((p) => [...p, ...Array.from({ length: n - free }, () => newKey())])
    }
  }, [view, blankKeys, overlay, edits, archived])
  /* ── منتقي اليوم (view.dayFilter) ────────────────────────────────────────────
     العرض يفتح على **يوم واحد**، افتراضه اليوم الحالي. الافتراضي يُشتقّ عند كل
     رسم لا يُخزَّن، فينتقل لليوم التالي من تلقائه عند تغيّر التاريخ ولو بقيت
     الصفحة مفتوحة. والاختيار مقترن بالعرض كنمط الأسبوع والتبويب. */
  const dayField = view.dayFilter && view.dayFilter.field
  const [dayPick, setDayPick] = useState({ k: '', d: '' })
  const daySel = !dayField ? '' : (dayPick.k === viewKey && dayPick.d ? dayPick.d : todayYmd())
  const setDaySel = useCallback((d) => setDayPick({ k: viewKey, d }), [viewKey])

  /* تبديل اليوم يعيد الذيل لدفعة واحدة نظيفة — الصفوف الفارغة معفاة من تصفية
     اليوم، فبدون هذا يحمل اليوم الجديد ما تراكم في سابقه. ما فيه إدخال غير
     محفوظ لا يُمسّ (المحفوظ صار صفّاً حقيقياً في الـoverlay ولا يتأثّر أصلاً). */
  useEffect(() => {
    if (!view.blankBatch) return
    setBlankKeys((p) => (p.some((k) => editsRef.current[k]) ? p : []))
  }, [daySel, view])

  /* ── دمج المُزامَن + اليدوي، ثم الترتيب ──────────────────────────────────── */
  const allRows = useMemo(() => {
    const out = []
    const seen = new Set()
    /* ── أعمدةٌ تخصّ **المجموعة** لا الصفّ (`view.groupRowKey` + `view.groupCols`) ──
       في شيتٍ صفُّه عامل وبطاقتُه منشأة، «المتابعة» و«الملاحظات» شأنُ المنشأة
       كلها: كتابتها على عاملٍ بعينه تجعلها تختفي عن إخوته وتتبدّل مع أي تغيّر في
       عمّالها. فتُخزَّن هذه الأعمدة تحت **مفتاح مجموعةٍ** مستقلّ في نفس الـoverlay
       (`fac__<id>`)، ويُلبَسها كل صفوف المجموعة عند القراءة. مفتاح المجموعة ليس
       صفّاً مُزامَناً ولا يدوياً فلا يُنتج صفّاً شبحاً في الجدول. */
    const gKeyOf = view.groupRowKey || null
    for (const r of syncRows) {
      const ov = overlay[r._id] || {}
      const gk = gKeyOf ? gKeyOf(r) : null
      const gd = gk ? (overlay[gk] || {}).data : null
      out.push({
        ...r,
        _ops: gd ? { ...(ov.data || {}), ...gd } : (ov.data || {}),
        _gkey: gk || null,
        _sort: ov.sort_order ?? null, _hidden: !!ov.hidden, _manual: false,
      })
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
    // التصفية على الناتج كاملاً لا داخل حلقة المزامنة وحدها: الشيتات اليدوية
    // (السداد) كل صفوفها من الـoverlay، ومفتاح مجموعتها في بيانات الصف نفسه.
    // الصفوف الفارغة/الجديدة بلا مفتاح تبقى ظاهرة في التبويب المفتوح — وإلا
    // اختفى صفّ الإدخال الجاهز فور إنشائه ولم يستطع الموظف الكتابة أصلاً.
    let res = (view.tabs && tabSel)
      ? out.filter((r) => { const k = view.tabs.key(r); return k === tabSel || (!k && (r._blank || r._manual)) })
      : out
    /* تصفية اليوم. الصفوف الفارغة الجاهزة تبقى دائماً — وإلا اختفى صفّ الإدخال
       من كل يوم لا يحمل تاريخه، فتعذّرت الإضافة أصلاً. */
    if (dayField && daySel !== 'all') {
      res = res.filter((r) => {
        const v = (r._ops && r._ops[dayField]) || ''
        return v ? v === daySel : true
      })
    }
    /* `_all` = الصفوف قبل تصفية اليوم والمجموعة. يحتاجها `derive` لفحوصٍ لا تصحّ
       على المعروض وحده: تكرار سدادِ فاتورةٍ وقع في **يومٍ آخر** لا يُكتشف بمسح
       يومٍ واحد، وهو بالضبط ما يُدفع مرّتين. */
    res._all = out
    return res
  }, [syncRows, overlay, blankKeys, view, tabSel, dayField, daySel])

  /* ── أعمدة مشتقّة عبر الصفوف (view.derive) ────────────────────────────────────
     محرّك الصيغ لا يرى إلا صفّه الواحد، فالأعمدة التي تحتاج **سلسلة عبر الصفوف**
     (رصيد يُرحَّل من يوم ليوم مثلاً) تُحسب هنا مرة واحدة قبل الرسم، وتودَع في
     مرجع module-scope تقرأه `col.get` — نفس نمط SDE_REF في «السعودة-إدخال».
     الاعتماد على `edits` مقصود: القيم المشتقّة تتحدّث لحظة الكتابة لا بعد الحفظ.
     القيمة المُرجَعة غير مستعملة؛ المطلوب أثر التشغيل نفسه قبل رسم الخلايا. */
  // ctx: اليوم والمجموعة المفتوحان — يحتاجهما العرض ليعرف ما سيأخذه الصف الجاهز
  // (تاريخه ومجموعته) قبل أن يُكتب فيه شيء
  useMemo(() => { view.derive && view.derive(allRows, edits, { day: daySel, tab: tabSel, prices: layout.prices || {}, all: allRows._all || allRows }) },
    [view, allRows, edits, daySel, tabSel, layout])

  const nameRank = useMemo(() => {
    const m = new Map()
    const rows = [...allRows]
    /* ترتيبٌ افتراضي يعرّفه العرض (`view.rowRank`): في طلبات السداد يُبقي صفوف
       العملية الواحدة (رقم سداد واحد) متجاورة — ولولاه لتفرّقت بحسب زمن إدخالها
       وهي مالٌ خرج دفعةً واحدة. */
    if (view.rowRank) {
      const dir = view.rowRankDir === 'desc' ? -1 : 1
      rows.sort((a, b) => dir * String(view.rowRank(a)).localeCompare(String(view.rowRank(b)), 'ar'))
    } else if (view.mergeKey) {
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
  const edgeMap = useMemo(() => layout.sectionEdge || {}, [layout])  // { key: 'start'|'end'|'none' }
  const srcMap = useMemo(() => layout.srcMap || {}, [layout])        // { key: مفتاح في COL_SRC }
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
    /* عمود المجموعة يُكتب في دلو المجموعة لا في دلو الصفّ — فلولا هذه القراءة
       لبقيت الخليّة تعرض القديم حتى الحفظ. */
    if (row._gkey && isGroupCol(col.key)) {
      const ge = edits[row._gkey]
      if (ge && Object.prototype.hasOwnProperty.call(ge, col.key)) return ge[col.key] ?? ''
    }
    const ov = row._ops ? row._ops[col.key] : undefined
    if (ov != null && ov !== '') return ov
    // الوسيط الثالث = تعديلات الصف غير المحفوظة، كي تتحدّث الأعمدة المشتقّة
    // (شيت «السعودة-إدخال») لحظة الكتابة في العمود الذي تعتمد عليه لا بعد الحفظ.
    if (col.ops) { if (col.get) return col.get(row, isAr, e) ?? ''; return '' }
    if (col.get) return col.get(row, isAr, e) ?? ''
    const v = row[col.key]
    return v == null ? '' : String(v)
  }, [edits, isAr, isGroupCol])

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
      // اسم المنشأة الذي حلّ محلّه اسمُ السجل التجاري يبقى مطلوباً بالبحث
      || hit(r._orig_facility)
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
      // التاريخ قبل الرقم: «2026-08-15» تاريخٌ لا رقم، وترتيبه زمنيّ لا عدديّ
      const ad = cfDate(av), bd = cfDate(bv)
      if (ad !== null && bd !== null) return (ad - bd) * dir
      const an = cfNum(av), bn = cfNum(bv)
      if (an !== null && bn !== null) return (an - bn) * dir
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
  /* صفّ مقفول: العرض يقرّر متى يُغلق (view.rowLocked) — في طلبات السداد بإدخال
     مرجع العملية، فالسداد وقع ولا يُعدَّل ما بُني عليه. ويبقى للمدير العام فتحه
     لهذه الجلسة (قائمة الصف) — قفلٌ بلا مخرج يعني أن خطأً واحداً يجمّد الصف
     أبداً وهو مرحَّل للدفتر أصلاً. */
  const [unlockedRows, setUnlockedRows] = useState(() => new Set())
  const isRowLocked = useCallback((row) => !!(view.rowLocked && row && view.rowLocked(row) && !unlockedRows.has(row._id)), [view, unlockedRows])
  const isEditable = useCallback((row, col) => !!(canEdit && row && col && col.kind !== 'rownum' && col.kind !== 'photo' && col.kind !== 'bmk' && col.kind !== 'link' && col.kind !== 'pay' && col.kind !== 'open' && !col.auto && !col.readOnly && !lockedSet.has(col.key) && !(layout.protected?.[col.key] && !unlockedCols.has(col.key)) && !(layout.formula?.[col.key]) && !(view.cellLocked && view.cellLocked(row, col))
    && !(isRowLocked(row) && !(view.lockExempt && view.lockExempt(row, col)))), [canEdit, lockedSet, layout, unlockedCols, isRowLocked, view])

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
    /* كل خليّة تاريخ تُعرض **سنة-شهر-يوم** مهما كان شكل المخزَّن: قيمةٌ جاءت
       ختماً زمنياً كاملاً (استيراد أو لصق) كانت تُعرض بذيلها «T00:00:00+00:00».
       العرض وحده يُقصّ — القيمة الخام تبقى كما هي للفرز والتصدير. */
    if (col.kind === 'date' || colTypeMap[col.key] === 'date') {
      const s = String(raw)
      if (/^\d{4}-\d{2}-\d{2}[T ]/.test(s)) return s.slice(0, 10)
    }
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
    const rejects = []
    let bad = 0
    for (const { row, col, text } of cells) {
      if (!isEditable(row, col)) { bad++; continue }
      /* `col.coerce` يُسوّي القيمة قبل كل شيء (أرقام عربية ← لاتينية مثلاً)،
         و`col.validate` يردّ سبب الرفض نصّاً. القيمة الفارغة لا تُفحَص أبداً —
         المسح يجب أن يبقى ممكناً، والإلزام شأن آخر (SR_REQUIRED). */
      let val = String(text ?? '').trim()
      if (col.coerce) val = col.coerce(val)
      const why = (val && col.validate) ? col.validate(val, row, isAr) : ''
      if (why) { bad++; if (!rejects.includes(why)) rejects.push(why); continue }
      applied.push({ row, col, val })
    }
    // الرفض يُقال بسببه لا بعدده — «لم يُقبل» بلا تفسير يترك المستخدم يخمّن
    if (rejects.length) toastRef.current?.(rejects.join(' · '), 'error')
    if (applied.length) {
      setEdits((prev) => {
        undoStackRef.current.push(prev)                       // لقطة للتراجع
        if (undoStackRef.current.length > 120) undoStackRef.current.shift()
        redoStackRef.current = []
        const next = { ...prev }
        for (const { row, col, val } of applied) {
          /* عمود المجموعة: القيمة تُكتب في دلو المنشأة فتراها كل صفوفها، ولا
             تُطبَّق عليها ختوم الصفّ (المجموعة/autoStamp/spread) — تلك شؤون صفٍّ. */
          if (row._gkey && isGroupCol(col.key)) {
            const gcur = { ...(next[row._gkey] || {}) }
            if (String(savedVal(row, col)) === val) delete gcur[col.key]; else gcur[col.key] = val
            if (Object.keys(gcur).length) next[row._gkey] = gcur; else delete next[row._gkey]
            continue
          }
          const cur = { ...(next[row._id] || {}) }
          const original = savedVal(row, col)
          if (String(original) === val) delete cur[col.key]; else cur[col.key] = val
          /* ختم المجموعة على الصفوف الجديدة: في عرضٍ بأزرار، الصف الفارغ/المضاف
             لا يحمل مفتاح مجموعته بعد — فبمجرّد الكتابة فيه يختفي من التصفية.
             نكتب مفتاح التبويب المفتوح معه في نفس الدفعة. و`tabs.stamp` يفصل
             **مفتاح التبويب** عن **القيمة المكتوبة**: تبويبٌ يجمع عدّة قيم (المكاتب)
             لا قيمة له تُختَم، فيُترك الحقل فارغاً ليختاره المستخدم. */
          const f = view.tabs && view.tabs.field
          const fStamp = (f && tabSel) ? (view.tabs.stamp ? (view.tabs.stamp(tabSel) || '') : tabSel) : ''
          if (fStamp && col.key !== f && !cur[f] && !(row._ops && row._ops[f])) cur[f] = fStamp
          /* قيم افتراضية للصف الجديد (view.autoStamp) — تاريخ اليوم مثلاً، كي
             ينضمّ الصف لكتلة يومه فور الكتابة. تُكتب مرة واحدة فقط: أي قيمة
             موجودة (محفوظة أو غير محفوظة) تفوز، فلا يُدهس ما أدخله المستخدم. */
          /* `data` = حالة الصف **بعد** هذه الكتابة (المحفوظ + غير المحفوظ)، كي
             يستطيع العرض أن يختم على اكتمال الصف لا على أول حرف فيه.
             يُبنى قبل الكتلتين معاً — `autoStamp` و`autoSet` كلتاهما تقرأه. */
          const stampCtx = { day: daySel, tab: tabSel, user: userName, col: col.key, val,
            data: { ...(row._ops || {}), ...cur }, prices: layout.prices || {} }
          if (view.autoStamp) {
            for (const [k, v] of Object.entries(view.autoStamp(row, stampCtx) || {})) {
              if (k !== col.key && v && !cur[k] && !(row._ops && row._ops[k])) cur[k] = v
            }
          }
          /* `view.autoSet` — قيم تُكتب **فوق القائم** لا تُملأ مرة: انتقالُ حالةٍ
             يستتبع غيره (إدخال رسالة البنك ⇒ الحالة «تم السداد»). ولذلك يجب أن
             تُطلق على الكتابة المعنيّة وحدها، لا على كل كتابة في الصف — وإلا
             تعذّر على المستخدم تغيير ما تكتبه أبداً. */
          if (view.autoSet) {
            for (const [k, v] of Object.entries(view.autoSet(row, stampCtx) || {})) {
              if (k !== col.key && v) cur[k] = v
            }
          }
          if (Object.keys(cur).length) next[row._id] = cur; else delete next[row._id]
          /* ── أثرٌ يتعدّى الصفّ (`view.spread`) ─────────────────────────────
             بعض القيم تخصّ **عمليةً** لا صفّاً: رسالة بنكٍ واحدة تُثبت سداداً
             غطّى أربعة عمّال في أربعة صفوف. فتُنسخ هي وما استتبعته (الحالة ووقت
             السداد ومسدِّده) إلى إخوة الصفّ — من يشاركونه مفتاح العملية — وإلا
             بقيت ثلاثة صفوف «قيد التنفيذ» أبداً ولم تُرحَّل حصصها. */
          const sp = view.spread
          if (sp && sp.cols.includes(col.key) && val) {
            const key = sp.key({ ...(row._ops || {}), ...cur })
            if (key) {
              for (const sib of allRows) {
                if (sib._id === row._id) continue
                const sd = { ...(sib._ops || {}), ...(next[sib._id] || {}) }
                if (!Object.keys(sd).length || sp.key(sd) !== key) continue
                const sc = { ...(next[sib._id] || {}) }
                if (!sd[col.key]) sc[col.key] = val
                if (view.autoSet) {
                  const ctx2 = { ...stampCtx, data: { ...sd, [col.key]: val } }
                  for (const [k, v] of Object.entries(view.autoSet(sib, ctx2) || {})) if (v) sc[k] = v
                }
                if (Object.keys(sc).length) next[sib._id] = sc
              }
            }
          }
        }
        return next
      })
      setRowErr((prev) => { const n = { ...prev }; for (const { row } of applied) delete n[row._id]; return n })
      /* نقل صفّ إلى مجموعة أخرى: التصفية تقرأ القيمة **المحفوظة**، فالصف يبقى
         أمام عينيه حتى الحفظ ثم يختفي. قوله صراحةً يمنع ظنّ أن الصف ضاع. */
      const tf = view.tabs && view.tabs.field
      if (tf && tabSel) {
        // المقارنة بمجموعة القيمة لا بالقيمة نفسها: تبويب «المكاتب» يضمّ عدّة
        // حسابات، فاختيار حسابٍ منها ليس نقلاً لصفٍّ خارج الجدول المفتوح
        const grpOf = (v) => (view.tabs.key ? view.tabs.key({ [tf]: v }) : v)
        const moved = applied.filter(({ col, val }) => col.key === tf && val && grpOf(val) !== tabSel)
        if (moved.length) {
          const to = String(grpOf(moved[moved.length - 1].val))
          const lbl = (tabDefs.find((t) => t.key === to) || {}).label || to
          toastRef.current?.(isAr
            ? `سيُنقل ${enNum(moved.length)} صفّاً إلى «${lbl}» بعد الحفظ`
            : `${enNum(moved.length)} row(s) will move to “${lbl}” once saved`)
        }
      }
    }
    return { ok: applied.length, bad }
    // view/tabSel/daySel في الاعتمادات: بدونها يبقى ختم المجموعة واليوم على قيم
    // أول رسم، فيُختَم الصف الجديد بمجموعة كانت مفتوحة قبل أن يبدّلها المستخدم
  }, [canEdit, isEditable, savedVal, isGroupCol, view, tabSel, daySel, tabDefs, isAr, userName, layout, allRows])

  /* رفع ملف في خلية kind:'file' — يُرفع لبكت attachments العام ويُكتب رابطه
     في الخلية كأي قيمة (يبقى ضمن التعديلات حتى يُضغط «حفظ»). */
  /* تشغيل جلب العمود (`col.fetch`) لصفٍّ واحد: النتيجة تُكتب في الخليّة كأي
     إدخال (فتُحفظ تلقائياً وتُختَم باسم من ضغط)، والفشل يُقال بسببه لا بصمت. */
  const [fetchBusy, setFetchBusy] = useState('')
  const runColFetch = useCallback(async (row, col) => {
    if (!sb || !col.fetch) return
    const key = `${row._id}|${col.key}`
    setFetchBusy(key)
    try {
      const out = await col.fetch(row, { sb, isAr })
      if (out == null || out === '') { toast && toast(T('لا نتيجة', 'No result')); return }
      /* `fetch` ترجع إمّا قيمةً للعمود نفسه، وإمّا **خريطة** {مفتاح العمود: القيمة}
         فتملأ الجلبة الواحدة عدّة خانات — نداءُ مقيم يعطي الانتهاء والمهنة
         والحالة ومرات النقل معاً، فلا معنى لأربعة نداءات. تُكتب الخانة الموجودة
         في الشيت والقابلة للكتابة فقط، والقيمة الفارغة تُترك كما هي. */
      const patch = (typeof out === 'object' && !Array.isArray(out)) ? out : { [col.key]: out }
      const cells = []
      for (const k of Object.keys(patch)) {
        const c = colDefs.get(k)
        const v = patch[k]
        if (!c || v == null || v === '') continue
        cells.push({ row, col: c, text: String(v) })
      }
      if (!cells.length) { toast && toast(T('لا نتيجة', 'No result')); return }
      writeCells(cells)
    } catch (e) {
      toast && toast((e && e.message) || T('تعذّر الجلب', 'Fetch failed'), 'error')
    } finally { setFetchBusy('') }
  }, [sb, isAr, colDefs, writeCells, toast, T])

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
      const url = pub?.publicUrl || path
      // multifile: القيمة مصفوفة JSON ويُلحَق الملف الجديد بها بدل استبدالها.
      // نقرأ آخر قيمة فعّالة (تعديل غير محفوظ ثم المحفوظ) كي يعمل رفع عدّة ملفات
      // متتابعة قبل الحفظ.
      if (col.kind === 'multifile') {
        const cur = mfParse(edits[row._id]?.[col.key] ?? savedVal(row, col))
        writeCells([{ row, col, text: JSON.stringify([...cur, { n: file.name || safe, u: url, m: file.type || '' }]) }])
      } else {
        writeCells([{ row, col, text: url }])
      }
      toast && toast(T('رُفع الملف — اضغط «حفظ» لتثبيته في الصف', 'File uploaded — press Save to store it on the row'))
    } catch (e) {
      toast && toast(T('تعذّر رفع الملف: ', 'Upload failed: ') + (e.message || String(e)))
    } finally { setFileBusy(null) }
  }, [sb, canEdit, viewKey, writeCells, edits, savedVal, toast, T])

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
    let r = Math.max(0, Math.min(viewRows.length - 1, head.r + dr))
    const c = Math.max(1, Math.min(COLS.length - 1, head.c + dc))
    /* الخليّة المدمجة خليّةٌ واحدة، فالسهم يتخطّاها كلها لا شطراً منها: نزولاً
       يقفز إلى ما بعد آخر صفوف المجموعة، وصعوداً إلى ما قبل أولها. بدونه يبقى
       التحديد واقفاً على الكتلة نفسها عشرين ضغطة في منشأةٍ بعشرين عاملاً.
       (المراجع لا الحالة: `mergeGroups` تُحسب بعد `move` في ترتيب الملف.) */
    const g = mergeRef.current
    if (dr && g) {
      const spec = colSpecRef.current?.get(COLS[c]?.key)
      if (spec != null && g[spec]) {
        const { starts, ends } = g[spec]
        if (starts[head.r] === starts[r] && ends[head.r] === ends[r]) {
          r = dr > 0 ? Math.min(viewRows.length - 1, ends[r] + 1) : Math.max(0, starts[r] - 1)
        } else {
          r = dr > 0 ? starts[r] : starts[r]   // ادخل المجموعة من رأسها دائماً
        }
      }
    }
    setHead({ r, c })
    if (!extend) setAnchor({ r, c })
  }, [viewRows.length, COLS, head])

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
    // خليّة ملف أو جلب: تُدار بزرّها (رفع/استعلام) لا بمحرّر نصّي
    if (col.kind === 'file' || col.kind === 'multifile' || col.kind === 'fetch') return
    // نصّ طويل: نفس إيماءة التحرير (نقر مزدوج/Enter) لكن في نافذة بمساحة كافية
    // بدل محرّر السطر الواحد — الحقل قد يحمل عشر رسائل، سطراً لكل دفعة.
    if (col.kind === 'longtext') { setLongEdit({ row, col, text: String(baseVal(row, col) ?? '') }); return }
    const ed = { r, c, src: 'cell', seed }
    editRef.current = ed
    setEditing(ed)
  }, [isEditable, viewRows, COLS, baseVal])

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

  /* حدث copy الأصلي: لا يقع في الشبكة إلا و**فيها تحديد نصّ** — الشبكة تحدّد
     خلايا لا نصّاً، فالحدث لا يُطلق أصلاً عند Ctrl+C فيها (مُتحقَّق في Chrome:
     مع تحديدٍ فارغ لا يُطلق حدث نسخ ولا ينجح execCommand). فيبقى هذا المسار
     لحالةٍ واحدة: نسخُ نصٍّ محدَّد داخل محرّر خليّة — وتلك **للمتصفّح لا لنا**،
     فلا نخطفها. وإلا نسخ الموظفُ نصفَ رقمٍ في محرّر فوجد الجدولَ كلّه. */
  const onCopyEvent = useCallback((e) => {
    if (editRef.current) return                       // محرّر خليّة مفتوح — النسخ نسخُه
    const s = typeof window !== 'undefined' ? window.getSelection?.() : null
    if (s && !s.isCollapsed && String(s).trim()) return   // تحديد نصّ حقيقي — لا نخطفه
    const { text, count } = buildCopyText()
    if (!text) return
    e.preventDefault()
    e.clipboardData.setData('text/plain', text)
    toast && toast(T(`تم نسخ ${count} سطر`, `Copied ${count} rows`))
  }, [buildCopyText, toast, T])

  /* الكتابة في الحافظة بمسارين — الترتيب مقصود:
       ① `clipboard.writeText` — المسار الحديث، يكتب نصّنا بيقين.
       ② textarea خفيّ نُحدّده ثم `execCommand('copy')` — يعمل في السياق غير
          الآمن (http على شبكة المكتب) وحيث تُمنع واجهة الحافظة.
     ولا نستعمل `execCommand` **بلا** textarea كما كان: يعمل على تحديد الصفحة
     القائم، فيرجع `true` وقد نسخ شيئاً آخر — نصّاً قديماً كان محدَّداً في مكانٍ
     من الصفحة — فيظنّ المستخدم أن النسخ عمل وقد نُسخ غيرُ ما أراد. */
  const writeClipboard = useCallback(async (text) => {
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true }
    } catch { /* نجرّب البديل */ }
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0'
      document.body.appendChild(ta)
      const prev = document.activeElement
      ta.select(); ta.setSelectionRange(0, ta.value.length)
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      if (prev && prev.focus) prev.focus({ preventScroll: true })
      return !!ok
    } catch { return false }
  }, [])

  /* Ctrl+C وزرّ «نسخ التحديد» — ينسخ ما هو محدَّد في الشبكة، ويقول ما جرى:
     نجاحاً بعدد الأسطر، أو «لا خلايا محدّدة»، أو فشلاً صريحاً. الصمت كان أسوأ
     ما في المسار القديم: يُضغط Ctrl+C فلا شيء، ولا يُعرف أوقع النسخ أم لا. */
  const doCopy = useCallback(async () => {
    const { text, count } = buildCopyText()
    if (!text) { toast && toast(T('لا خلايا محدّدة للنسخ', 'No cells selected')); return }
    const ok = await writeClipboard(text)
    toast && toast(ok
      ? T(`تم نسخ ${count} سطر`, `Copied ${count} rows`)
      : T('تعذّر النسخ — تحقّق من إذن الحافظة في المتصفّح', 'Copy failed — check the browser clipboard permission'),
    ok ? undefined : 'error')
    scrollRef.current?.focus({ preventScroll: true })
  }, [buildCopyText, writeClipboard, toast, T])

  /* نسخ خليّة واحدة بقيمتها وحدها — أكثر ما يُنسخ من هذه الجداول رقمٌ يُلصق في
     بوابة (موحّد · إقامة · سداد)، فأخذُه بلا صفٍّ ولا جدولٍ حوله هو المطلوب. */
  const doCopyCell = useCallback(async (row, col) => {
    const text = dispOf(row, col)
    if (!text) { toast && toast(T('الخليّة فارغة', 'Empty cell')); return }
    const ok = await writeClipboard(text)
    toast && toast(ok ? T('نُسخت الخليّة', 'Cell copied')
      : T('تعذّر النسخ — تحقّق من إذن الحافظة في المتصفّح', 'Copy failed — check the browser clipboard permission'),
    ok ? undefined : 'error')
    scrollRef.current?.focus({ preventScroll: true })
  }, [dispOf, writeClipboard, toast, T])

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

  /* تطبيق نصّ إكسل (أسطر ↵ وأعمدة ⇥) بدءاً من أعلى يمين التحديد. مفصولة عن
     الحدث ليستدعيها الثلاثة: Ctrl+V، ومستمع المستند، وبند «لصق» في قائمة اليمين. */
  const applyPasteText = useCallback((text) => {
    if (!canEdit || !text) return
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

  const onPaste = useCallback((e) => {
    if (!canEdit) return
    const text = e.clipboardData?.getData('text/plain')
    if (!text) return
    e.preventDefault()
    applyPasteText(text)
  }, [canEdit, applyPasteText])

  /* حدث paste لا يصل `div` غير قابل للتحرير في كل المتصفّحات — المتصفّح يوجّهه
     للمستند حين لا يكون المُركَّز حقلَ إدخال، فيضيع Ctrl+V داخل الشبكة رغم أن
     onPaste موضوعٌ عليها. نلتقطه على المستند ونحوّله للشبكة ما دامت هي المُركَّزة
     ولا محرّرَ خليّة مفتوحاً (فاللصق داخل المحرّر يبقى للمتصفّح). */
  useEffect(() => {
    if (!canEdit) return undefined
    const onDocPaste = (e) => {
      const el = scrollRef.current
      if (!el || editRef.current) return
      if (!el.contains(document.activeElement)) return
      if (e.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return
      const text = e.clipboardData?.getData('text/plain')
      if (!text) return
      e.preventDefault()
      applyPasteText(text)
    }
    document.addEventListener('paste', onDocPaste, true)
    return () => document.removeEventListener('paste', onDocPaste, true)
  }, [canEdit, applyPasteText])

  /* لصق من قائمة الزر الأيمن: لا حدث لصق هنا فنقرأ الحافظة مباشرة. القراءة
     تحتاج إذن المتصفّح (يُطلب أول مرة)، وإن رُفض نوجّه المستخدم لـCtrl+V. */
  const pasteFromClipboard = useCallback(async () => {
    if (!canEdit) return
    let text = ''
    try { text = (await navigator.clipboard?.readText()) || '' } catch { text = '' }
    if (!text) { toast && toast(T('تعذّرت قراءة الحافظة — استخدم Ctrl+V', 'Clipboard read blocked — use Ctrl+V')); return }
    applyPasteText(text)
  }, [canEdit, applyPasteText, toast, T])

  const onKeyDown = useCallback((e) => {
    if (editing) return
    const k = e.key
    const ctrl = e.ctrlKey || e.metaKey
    const maxR = viewRows.length - 1, maxC = COLS.length - 1
    if (ctrl && (k === 'c' || k === 'C')) { e.preventDefault(); doCopy(); return }
    // Ctrl+V: بلا preventDefault — نترك المتصفّح يطلق حدث اللصق ليلتقطه المستمعان
    if (ctrl && (k === 'v' || k === 'V')) return
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
        /* ختم الخليّة: **من أدخلها ومتى**، لكل خليّة على حدة، في مفتاحٍ محجوز
           `__m` داخل بيانات الصف — لا عمود له ولا يظهر في الشبكة، ويقرأه تلميحُ
           الخليّة عند المرور. (كان في الصفّ ختمٌ واحد `updated_by/at` يقول آخر
           من مسّ الصفّ لا من كتب هذه الخانة.) الخانة التي تُفرَّغ يسقط ختمها. */
        {
          const meta = { ...(mergedData.__m || {}) }
          for (const kk of Object.keys(patch)) {
            if (kk === '__m' || !colDefs.has(kk)) continue
            if (mergedData[kk] == null || mergedData[kk] === '') delete meta[kk]
            else meta[kk] = { u: userName || '', at: nowIso }
          }
          if (Object.keys(meta).length) mergedData.__m = meta; else delete mergedData.__m
        }
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
    /* أثر جانبي بعد الحفظ يعرّفه العرض نفسه (view.afterSave) — يُستعمل لترحيل
       طلب السداد المنفَّذ إلى الدفتر. يُستدعى بالصفوف المحفوظة فعلاً فقط، ولا
       يُفشل الحفظ إن تعثّر (الحفظ نجح؛ الترحيل يُعاد بالضغط على الحالة ثانيةً). */
    /* `view.manualPost` — عرضٌ يرفض الترحيل التلقائي: يُحفظ الإدخال في الشيت
       وحده، ولا يصل النظامَ إلا بضغطةٍ من قائمة الصف. (نقل الكفالة: الكتابة في
       المعاملة قرارٌ يُتّخذ متى اكتمل الصف، لا أثرٌ لكل حفظةٍ عابرة.) */
    if (view.afterSave && !view.manualPost && saved.length) {
      try {
        // `rows` = صفوف الشيت كما حُمّلت — الأثر قد يحتاج بيانات النظام في الصف
        // (حالة المعاملة ومراحلها في شيت نقل الكفالة) لا الإدخال وحده.
        const note = applyAfterSave(await view.afterSave(sb, saved.map(([id, data]) => ({ id, data })), { user, isAr, rows: allRows }))
        if (note) toast && toast(note)
      } catch (e) { toast && toast(T('تعذّر الترحيل للدفتر: ', 'Posting to the ledger failed: ') + (e.message || e), 'error') }
    }
  }, [sb, saving, dirtyRowCount, edits, allRows, overlay, view, user, userName, toast, T, isAr, colDefs, syncVal, applyAfterSave])

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
    /* الصف المضاف من النافذة يُختَم كالصف المكتوب في الشبكة: مجموعته المفتوحة
       وقيمها الافتراضية. بدونه كان يُولد بلا مجموعة فيظهر في كل التبويبات. */
    const tf = view.tabs && view.tabs.field
    const tStamp = (tf && tabSel) ? (view.tabs.stamp ? (view.tabs.stamp(tabSel) || '') : tabSel) : ''
    if (tf && tStamp && !data[tf]) data[tf] = tStamp
    if (view.autoStamp) {
      for (const [k, v] of Object.entries(view.autoStamp({ _ops: data }, { day: daySel, tab: tabSel, user: userName, prices: layout.prices || {} }) || {})) {
        if (v && !data[k]) data[k] = v
      }
    }
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
  }, [sb, busy, view, addForm, allRows, user, toast, T, isAr, tabSel, daySel, userName, layout])

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
      if (c.kind === 'rownum' || c.kind === 'photo' || c.kind === 'bmk' || c.kind === 'file' || c.kind === 'files' || c.kind === 'multifile') continue
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
    } else if (view.tabs && tabSel) {
      // في عرضٍ بمجموعات: الإخفاء يقع في المجموعة المفتوحة وحدها
      const tabHidden = { ...(layout.tabHidden || {}) }
      tabHidden[tabSel] = Array.from(new Set([...(tabHidden[tabSel] || []), key]))
      persistLayout({ ...layout, tabHidden })
    } else {
      const hidden = Array.from(new Set([...(layout.hidden || []), key]))
      persistLayout({ ...layout, hidden })
    }
  }, [layout, orderKeys, persistLayout, view, tabSel])

  const unhideColumn = useCallback((key) => {
    const tabHidden = { ...(layout.tabHidden || {}) }
    if (tabSel && tabHidden[tabSel]) tabHidden[tabSel] = tabHidden[tabSel].filter((k) => k !== key)
    persistLayout({ ...layout, tabHidden, hidden: (layout.hidden || []).filter((k) => k !== key) })
  }, [layout, persistLayout, tabSel])

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
    // ولا يبقى له أثر في مخفيّات المجموعات — صار خارج الشيت كلّه
    const tabHidden = {}
    for (const [t, list] of Object.entries(layout.tabHidden || {})) tabHidden[t] = list.filter((k) => k !== key)
    persistLayout({ ...layout, removed, hidden, order, custom, tabHidden })
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

  // قائمة «أعمدة مخفية» تجمع العامّ ومخفيّات المجموعة المفتوحة — فما أُخفي هنا يُستعاد من هنا
  const hiddenColList = useMemo(() => {
    const rm = new Set(layout.removed || [])
    const keys = [...new Set([...(layout.hidden || []), ...(((layout.tabHidden || {})[tabSel]) || [])])]
    return keys.filter((k) => !rm.has(k)).map((k) => colDefs.get(k)).filter(Boolean)
  }, [layout, colDefs, tabSel])
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
  /* الفاصل الذهبي صار اختياراً للمستخدم على أي عمود (`layout.sectionEdge`):
     `start` = قبل العمود · `end` = بعده · `none` = إلغاء فاصلٍ معرَّفٍ في الكود.
     الجهة **منطقية لا فيزيائية**: «يمين» في العربية هي بداية السطر، فيبقى
     الفاصل في موضعه من ترتيب القراءة حين تُقلب الواجهة للإنجليزية كما تُقلب
     الأعمدة نفسها. وما لم يختر المستخدم شيئاً يبقى `col.sectionStart` المعرَّف
     في العرض هو الحكم. */
  const setColEdge = useCallback((key, side) => {
    const next = { ...(layout.sectionEdge || {}) }
    if (side) next[key] = side; else delete next[key]
    persistLayout({ ...layout, sectionEdge: next })
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

    // نقطة المصدر: مفتاحٌ من دليل المصادر (لا لونٌ خام) — فيتغيّر اللون والتلميح معاً
    const srcMap = { ...(layout.srcMap || {}) }
    if (draft.src && COL_SRC[draft.src]) srcMap[key] = draft.src; else delete srcMap[key]

    persistLayout({ ...layout, styles, colType, colOptions, numFmt, formula, srcMap })
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
  /* أبعاد الدمج: العرض قد يدمج بأكثر من مفتاح — كتلةُ اليوم لعمود اليوم، وعمليةُ
     السداد الواحد لأعمدتها (رقم السداد ومفوتره وأختامه). لكل بُعدٍ حدودُه. */
  const mergeSpecs = useMemo(() => {
    const list = []
    if (view.mergeKey && view.mergeCols) list.push({ key: view.mergeKey, cols: view.mergeCols })
    for (const m of (view.merges || [])) if (m && m.key && m.cols) list.push(m)
    return list
  }, [view])
  const mergeColSpec = useMemo(() => {
    const m = new Map()
    mergeSpecs.forEach((s, i) => s.cols.forEach((k) => { if (!m.has(k)) m.set(k, i) }))
    return m
  }, [mergeSpecs])
  const mergeGroups = useMemo(() => {
    if (!mergeSpecs.length) return null
    const n = viewRows.length
    return mergeSpecs.map((spec) => {
    const starts = new Int32Array(n), ends = new Int32Array(n)
    let i = 0
    while (i < n) {
      const mk = spec.key(viewRows[i])
      let j = i
      // مفتاحٌ فارغ = صفٌّ خارج أي مجموعة (لا يُدمج مع جاره ولو تشابها فراغاً)
      if (mk != null && mk !== '') while (j + 1 < n && spec.key(viewRows[j + 1]) === mk) j++
      for (let k = i; k <= j; k++) { starts[k] = i; ends[k] = j }
      i = j + 1
    }
    return { starts, ends }
    })
  }, [viewRows, mergeSpecs])
  /* ترقيم بالمنشأة لا بالصفّ (`view.groupNumbering`): في شيتٍ صفُّه عاملٌ وبطاقتُه
     منشأة، «١، ٢، ٣…» بجانب كل عامل تقول عدد العمّال لا عدد المنشآت. فيُرقَّم رأسُ
     كل مجموعة برقمها التسلسلي وتُترك صفوف عمّالها بلا رقم، وتُزال الحدود الأفقية
     بينها فتُقرأ الكتلة رقماً واحداً. يتبع بُعد الدمج الأول (بطاقة المنشأة). */
  const groupNo = useMemo(() => {
    if (!view.groupNumbering || !mergeGroups || !mergeGroups[0]) return null
    const { starts } = mergeGroups[0]
    const out = new Int32Array(viewRows.length)
    let n = 0
    for (let i = 0; i < viewRows.length; i++) { if (starts[i] === i) n++; out[i] = n }
    return out
  }, [view, mergeGroups, viewRows.length])
  /* `move` مُعرَّف قبل هذه الحسابات في ترتيب الملف، فيقرؤها بمرجعٍ يُحدَّث كل رسم
     (نقلُها لأعلى يجرّ viewRows وتوابعه معها ويفتح باب TDZ). */
  mergeRef.current = mergeGroups
  colSpecRef.current = mergeColSpec
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
    if (mergeGroups && s > 0 && s < total) s = Math.min(...mergeGroups.map((g) => g.starts[s]))
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
        {!view.custom && !archived && canRefresh && <button className="ox-btn" onClick={refresh} disabled={loading} title={T('جلب أحدث البيانات من مركز المزامنة — إدخالات الموظفين المحفوظة لا تتأثّر', 'Pull latest data from the Sync Center — saved staff entries are never affected')} style={{ height: 40, background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent-bd)' }}>{loading ? '⟳ …' : '⟳'} {T('تحديث من المزامنة', 'Refresh from sync')}</button>}

        {/* ── الأرشيف الأسبوعي: منتقي الأسبوع + زر حفظ لقطة الأسبوع الجاري ──
            الأسبوع يبدأ الجمعة. «مباشر» = البيانات الحيّة، وأي أسبوع آخر = لقطة
            محفوظة تُعرض للقراءة فقط. */}
        <div style={{ minWidth: 210, flex: '0 0 auto' }}>
          <Dropdown value={weekSel} onChange={(k) => setWeekSel(k)}
            options={[{ key: 'live', ar: 'مباشر — الأسبوع الجاري', en: 'Live — current week' },
              ...weeks.map((w) => ({ key: w.week_start, ar: weekLabel(w.week_start, true), en: weekLabel(w.week_start, false), n: w.row_count }))]}
            getKey={(o) => o.key}
            getLabel={(o) => (isAr ? o.ar : o.en)}
            getSub={(o) => o.key === 'live' ? T('يتغيّر مع كل مزامنة', 'Changes with every sync')
              : T(`${enNum(o.n || 0)} صف · محفوظ`, `${enNum(o.n || 0)} rows · archived`)} />
        </div>
        {canEditPerm && canSnapshot && !archived && !loading && (
          <button className="ox-btn" onClick={() => captureWeek()} disabled={snapBusy}
            title={T('احفظ حالة هذا الأسبوع كما هي الآن — اضغطه بعد المزامنة الأسبوعية. لو الأسبوع محفوظ مسبقاً تُستبدل لقطته.',
              'Save this week\'s state as it is now — press after the weekly sync. Replaces this week\'s snapshot if one exists.')}
            style={{ height: 40 }}>
            {snapBusy ? '⏱ …' : '⏱'} {weeks.some((w) => w.week_start === thisWeek)
              ? T('حدّث لقطة الأسبوع', 'Update week snapshot')
              : T('احفظ لقطة الأسبوع', 'Save week snapshot')}
          </button>
        )}
        {canNewSheet && <button className="ox-btn" onClick={() => { setSheetName({ ar: '', en: '' }); setSheetModal(true) }} title={T('أنشئ جدولاً مخصّصاً من الصفر', 'Create a blank custom sheet')} style={{ height: 40 }}>＋ {T('جدول جديد', 'New sheet')}</button>}
        {canRename && <button className="ox-btn" onClick={() => { const n = effName(view); setSheetName({ ar: n.ar, en: n.en === n.ar ? '' : n.en }); setSheetModal('rename') }} title={T('غيّر اسم هذا العرض', 'Rename this view')} style={{ height: 40 }}>✎ {T('تسمية العرض', 'Rename view')}</button>}
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

      {/* شريط واحد: أزرار المجموعات ثم منتقي اليوم — كلاهما «أي جدول أرى»،
          فصفّان لسؤال واحد يبعثران العين ويأكلان ارتفاعاً بلا معنى. الفاصل
          الرأسيّ يبقي المجموعتين مميّزتين داخل الصفّ. */}
      {(tabDefs.length > 1 || dayField) && (
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
          {tabDefs.length > 1 && tabDefs.map((t) => {
            const on = t.key === tabSel
            return (
              /* المحدَّد: غسلة ذهبية فاتحة + إطار ذهبي صريح، والنصّ بلون النصّ
                 العادي فيقرأ في الثيمين. لا يصحّ استعمال `--accent-soft` هنا:
                 هو نفسه لون `.ox-btn:hover`، فيصير مرور الماوس على أي زر آخر
                 مطابقاً للمحدَّد. الفرق هنا في شدّة الخلفية (.26 مقابل .12)
                 وصلابة الإطار معاً. */
              <button key={t.key} className="ox-btn" onClick={() => setTabSel(t.key)}
                style={{ height: 34, ...(on ? {
                  background: 'rgba(176,125,0,.26)', color: 'var(--tx)',
                  borderColor: 'var(--accent)', fontWeight: 600,
                } : {}) }}>
                {t.label}
              </button>
            )
          })}
          {tabDefs.length > 1 && dayField && (
            <span aria-hidden style={{ width: 1, height: 22, background: 'var(--bd)', margin: '0 3px' }} />
          )}
          {/* ── منتقي اليوم ── يفتح على اليوم الحالي، والأسهم تتنقّل يوماً بيوم،
              وحقل التاريخ يقفز لأي يوم، و«كل الأيام» يعرض الكل. */}
          {dayField && (<>
            <button className="ox-btn" style={{ height: 34, minWidth: 38, justifyContent: 'center' }}
              title={T('اليوم السابق', 'Previous day')} disabled={daySel === 'all'}
              onClick={() => setDaySel(dayShift(daySel, -1))}>‹</button>
            <input type="date" value={daySel === 'all' ? '' : daySel}
              onChange={(e) => setDaySel(e.target.value || todayYmd())}
              style={{ height: 34, padding: '0 10px', borderRadius: 9, border: '1px solid var(--bd)',
                background: 'var(--search-bg)', color: 'var(--tx)', fontSize: 12.5, fontFamily: MONO, outline: 'none' }} />
            <button className="ox-btn" style={{ height: 34, minWidth: 38, justifyContent: 'center' }}
              title={T('اليوم التالي', 'Next day')} disabled={daySel === 'all'}
              onClick={() => setDaySel(dayShift(daySel, 1))}>›</button>
            <button className="ox-btn" style={{ height: 34, ...(daySel === todayYmd() ? { background: 'rgba(176,125,0,.26)', color: 'var(--tx)', borderColor: 'var(--accent)' } : {}) }}
              onClick={() => setDaySel(todayYmd())}>{T('اليوم', 'Today')}</button>
            <button className="ox-btn" style={{ height: 34, ...(daySel === 'all' ? { background: 'rgba(176,125,0,.26)', color: 'var(--tx)', borderColor: 'var(--accent)' } : {}) }}
              onClick={() => setDaySel('all')}>{T('كل الأيام', 'All days')}</button>
            {daySel !== 'all' && daySel !== todayYmd() && (
              <span style={{ fontSize: 11.5, color: C.gold2, fontWeight: 600 }}>
                {T('تعرض يوماً سابقاً — الإدخال الجديد يُسجَّل بتاريخه', 'Viewing another day — new entries take its date')}
              </span>
            )}
          </>)}
        </div>
      )}

      {/* ملخّص المجموعة المعروضة (view.summary) — الأرقام التي لا يصحّ أخذها من
          صف الإجماليات لأن أعمدتها متتابعة لا مستقلّة. */}
      {!loading && !loadErr && view.summary && allRows.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {view.summary(allRows, isAr).map((s) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '8px 14px', borderRadius: 10,
              border: '1px solid var(--bd)', background: 'var(--sf)' }}>
              <span style={{ fontSize: 11.5, color: 'var(--tx3)', fontWeight: 600 }}>{s.label}</span>
              <span style={{ fontSize: 14, fontWeight: 600, fontFamily: MONO,
                color: s.tone === 'bad' ? C.red : s.tone === 'warn' ? C.gold2 : s.tone === 'good' ? '#2ecc71' : 'var(--tx)' }}>
                {s.value}
              </span>
            </div>
          ))}
        </div>
      )}

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
        {canAddRow && <button className="ox-btn" onClick={() => { setAddForm({}); setAddOpen(true) }} disabled={busy}>＋ {T('صف', 'Row')}</button>}
        {canCols && <button className="ox-btn" onClick={() => { setColName(''); setColModal(true) }} disabled={busy}>＋ {T('عمود', 'Column')}</button>}
        {canExport && <button className="ox-btn" onClick={exportCsv} title={T('تصدير إلى CSV/إكسل', 'Export to CSV/Excel')}>⭳ {T('تصدير', 'Export')}</button>}
        {canChat && <button className="ox-btn" onClick={() => setChatOpen(true)}
          title={T('محادثة هذا العرض — اسأل المسؤول عن أي صف أو قيمة', 'Chat for this view — ask the owner about any row or value')}
          style={{ position: 'relative', ...(chatOpen ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent-bd)' } : {}) }}>
          💬 {T('المحادثة', 'Chat')}
          {chat.unread > 0 && (
            <span style={{ minWidth: 17, height: 17, padding: '0 4px', borderRadius: 9, background: C.red, color: '#fff',
              fontSize: 10, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO }}>
              {chat.unread > 99 ? '99+' : enNum(chat.unread)}
            </span>
          )}
        </button>}
        {canEdit && <button className="ox-btn" onClick={() => setFindModal(true)} title={T('بحث واستبدال (Ctrl+H)', 'Find & replace (Ctrl+H)')}>🔎 {T('بحث/استبدال', 'Find/Replace')}</button>}
        {canEdit && view.priceBook && (
          <button className="ox-btn" onClick={() => { setPriceDraft({ ...(layout.prices || {}) }); setPriceModal(true) }}
            title={T('سعر كل غرض — ثابت أو نطاق', 'Price per purpose — fixed or a range')}>
            🏷 {T('التسعيرة', 'Price book')}
            {Object.keys(layout.prices || {}).length > 0 && (
              <span style={{ marginInlineStart: 6, fontFamily: MONO, fontSize: 10.5, color: 'var(--tx4)' }}>{enNum(Object.keys(layout.prices).length)}</span>
            )}
          </button>
        )}
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

      {/* شريط الأرشيف: يوضّح أن المعروض لقطة تاريخية للقراءة فقط، ولا يُترك للمستخدم
          أن يستنتج ذلك من تعطّل التحرير وحده. */}
      {archived && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10, padding: '10px 14px', borderRadius: 10,
          border: '1px solid rgba(176,125,0,.35)', background: 'rgba(176,125,0,.10)', color: 'var(--tx2)', fontSize: 12.5, fontWeight: 600 }}>
          <span style={{ color: C.gold2 }}>⏱ {T('عرض أرشيفي — للقراءة فقط', 'Archived view — read only')}</span>
          <span>{weekLabel(weekSel, isAr)}</span>
          {snapInfo?.captured_at && (
            <span style={{ color: 'var(--tx4)' }}>
              {T('لقطة بتاريخ ', 'captured ')}<span style={{ fontFamily: MONO }}>{String(snapInfo.captured_at).slice(0, 16).replace('T', ' ')}</span>
            </span>
          )}
          <button className="ox-btn" onClick={() => setWeekSel('live')} style={{ height: 30, marginInlineStart: 'auto' }}>
            ↩ {T('رجوع للمباشر', 'Back to live')}
          </button>
        </div>
      )}

      {loading ? <GridSkeleton /> : loadErr ? (
        <div style={{ padding: 20, borderRadius: 12, border: '1px solid rgba(232,114,101,.3)', background: 'rgba(232,114,101,.07)', color: C.red, fontSize: 13 }}>
          {T('تعذّر التحميل: ', 'Load failed: ')}{loadErr}
        </div>
      ) : (
        <div ref={gridBoxRef} style={{ position: 'relative' }}>
          {/* زرّا طرفَي الجدول — ثابتان على حافة الشاشة فيبقيان في المتناول
              مهما طال الجدول، ويختفيان إن كان الجدول أقصر من الشاشة. */}
          {viewRows.length > 14 && (
            <div style={{ position: 'fixed', insetInlineEnd: 14, bottom: 96, zIndex: 30, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[['▲', -1, T('أعلى الجدول', 'Top of table')], ['▼', 1, T('أسفل الجدول', 'Bottom of table')]].map(([ic, dir, tip]) => (
                <button key={ic} type="button" title={tip} aria-label={tip} onClick={() => jumpGrid(dir)}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(176,125,0,.22)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--card-grad2)' }}
                  style={{ width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', fontFamily: F, fontSize: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '.15s',
                    border: `1px solid ${C.gold}`, background: 'var(--card-grad2)', color: C.gold2,
                    boxShadow: '0 6px 18px rgba(0,0,0,.22)' }}>{ic}</button>
              ))}
            </div>
          )}
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
                    /* صفّ الرؤوس بلونٍ واحد لا يتبدّل بنوع العمود — التمييز فيه
                       بالعلامات (⟳ · ⏱ · نقطة المصدر) لا بالخلفية. */
                    style={{ cursor: canDrag ? 'grab' : 'default', ...(frozenStyle(i, 'var(--hd)', 7) || {}),
                      ...(SECTION_EDGE_CSS[edgeSideOf(col, edgeMap)] || {}) }}>
                    {autoLike(col) && <span title={col.readOnly
                      ? T('يُختَم آلياً — غير قابل للإدخال', 'Stamped automatically — not editable')
                      : col.freeze
                        ? T('لقطة تُثبَّت لحظة إدخال الصف — لا تتغيّر بالمزامنة بعدها', 'Snapshot frozen when the row is first entered — later syncs do not change it')
                        : col.filled
                          ? T('يُملأ تلقائياً — ويمكن تعديله', 'Auto-filled — editable')
                          : T('يُجلب تلقائياً — غير قابل للإدخال', 'Auto-filled — not editable')}
                      style={{ marginInlineEnd: 4, fontSize: 10, color: 'var(--tx3)', flexShrink: 0 }}>{(col.readOnly || col.freeze) ? '⏱' : '⟳'}</span>}
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
                    {/* اختيار المستخدم (تنسيق العمود ← نقطة المصدر) يسبق ما عرّفه الكود */}
                    {(() => {
                      /* سماوي = خانة إدخال · ذهبي = مجلوبة. الأعمدة التشغيليّة
                         (`ops`) هي خانات الإدخال، والصيغة محسوبة فتُعدّ مجلوبة.
                         واختيار المستخدم (تنسيق العمود) يسبق ذلك كلّه. */
                      const auto = (col.ops && !formulaMap[col.key]) ? 'entry' : 'fetched'
                      const sc = COL_SRC[srcKeyOf(srcMap[col.key] || col.source || auto)]
                      return <span title={T('المصدر: ' + sc.ar, 'Source: ' + sc.en)} style={{ width: 6, height: 6, borderRadius: '50%', background: sc.color, marginInlineStart: 6, flexShrink: 0 }} />
                    })()}
                    {(() => {
                      const mk = chat.marks.cols.get(col.key); if (!mk) return null
                      return <span title={T('سؤال في المحادثة عن هذا العمود', 'A chat question refers to this column')}
                        onClick={(e) => { e.stopPropagation(); setChatOpen(true) }}
                        style={{ width: 7, height: 7, borderRadius: '50%', marginInlineStart: 5, flexShrink: 0, cursor: 'pointer',
                          background: mk.open ? CHAT_DOT.open : CHAT_DOT.done }} />
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
                const mRanges = mergeGroups ? mergeGroups.map((g) => [g.starts[r], g.ends[r]]) : null
                return (
                  <div key={row._id} className="ox-row" data-r={r} style={{ display: 'grid', gridTemplateColumns: tmpl, minWidth: totalW, opacity: row._hidden ? .5 : 1, background: selRows.has(row._id) ? 'rgba(176,125,0,.10)' : (view.rowBg ? (view.rowBg(row) || undefined) : undefined) }}
                    onContextMenu={(e) => { e.preventDefault(); if (!selRows.has(row._id)) { setSelRows(new Set([row._id])); selAnchorRef.current = row._id }; setCtx({ x: e.clientX, y: e.clientY, rowId: row._id }) }}
                    onDragOver={(e) => { if (canEdit && dragRowRef.current) { e.preventDefault(); e.dataTransfer.dropEffect = 'move' } }}
                    onDrop={(e) => { if (!canEdit) return; const from = dragRowRef.current; dragRowRef.current = null; if (from) { e.preventDefault(); reorderRows(from, row._id) } }}>
                    {COLS.map((col, c) => {
                      if (col.kind === 'rownum') {
                        const rowSel = selRows.has(row._id)
                        /* ترقيم بالمنشأة: رقمٌ واحد لكل منشأة، وصفوفها بلا حدٍّ
                           فاصل، والرقم **طبقةٌ متمركزة عبر ارتفاع الكتلة** فتُقرأ
                           خليّةً واحدة كبقية الخلايا المدمجة لا رقماً في أعلاها. */
                        const gN = groupNo ? mergeGroups[0] : null
                        const gHead = !gN || gN.starts[r] === r
                        const gDown = gN && r < gN.ends[r]
                        const gSize = gN ? (gN.ends[r] - gN.starts[r] + 1) : 1
                        const gSpan = gN && gHead && gSize > 1
                        return (
                          <div key={col.key} className="ox-cell" title={T('انقر للتحديد · اسحب لإعادة الترتيب', 'Click to select · drag to reorder')}
                            draggable={canEdit}
                            onDragStart={(e) => { if (!canEdit) return; dragRowRef.current = row._id; e.dataTransfer.effectAllowed = 'move' }}
                            onDragEnd={() => { dragRowRef.current = null }}
                            onClick={(e) => { if (canEdit) selectRowClick(row._id, r, e) }}
                            onDoubleClick={() => setDetailRow(row._id)}
                            // خلفية عمود الترقيم صمّاء: شريطٌ ثابت لا تنفذ إليه غسلة الصفّ
                            style={{ ...cellBase, height: rowH, justifyContent: 'center', color: rowSel ? '#000' : 'var(--tx3)', fontWeight: rowSel ? 600 : 400, fontFamily: MONO, fontSize: 11.5, background: rowSel ? C.gold2 : 'linear-gradient(var(--bd2),var(--bd2)), var(--bg)', cursor: canEdit ? 'grab' : 'default', gap: 5, ...(frozenStyle(c, rowSel ? C.gold2 : FROZEN_BG, 4) || {}), ...(gDown ? { borderBottom: 'none' } : {}), ...(gSpan ? { overflow: 'visible', zIndex: 6 } : {}) }}>
                            {row._manual && <span title={T('صف يدوي', 'Manual row')} style={{ width: 6, height: 6, borderRadius: '50%', background: rowSel ? '#000' : C.blue, display: 'inline-block' }} />}
                            {(() => {
                              const mk = chat.marks.rows.get(row._id); if (!mk) return null
                              return <span title={T('سؤال في المحادثة عن هذا الصف', 'A chat question refers to this row')}
                                onClick={(e) => { e.stopPropagation(); setChatOpen(true) }}
                                style={{ position: 'absolute', top: 2, insetInlineEnd: 2, width: 7, height: 7, borderRadius: '50%', cursor: 'pointer',
                                  background: mk.open ? CHAT_DOT.open : CHAT_DOT.done, boxShadow: '0 0 0 1.5px var(--bg)' }} />
                            })()}
                            {err
                              ? <span title={err} style={{ width: 7, height: 7, borderRadius: '50%', background: C.red, display: 'inline-block' }} />
                              : edits[row._id] ? <span style={{ width: 7, height: 7, borderRadius: '50%', background: rowSel ? '#000' : C.gold2, display: 'inline-block' }} />
                              : isRowLocked(row) ? <span title={T('مقفول: سُدِّد ورُحِّل', 'Locked: paid & posted')} style={{ fontSize: 10 }}>🔒</span>
                              : groupNo
                                ? (gSpan
                                  ? <span aria-hidden style={{ position: 'absolute', insetInlineStart: 0, insetInlineEnd: 0, top: 0, height: gSize * rowH, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>{groupNo[r]}</span>
                                  : (gHead ? groupNo[r] : ''))
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
                      /* الصفّ الفارغ الجاهز بلا ألوان مهما كان العمود: هو موضع
                         إدخالٍ لم يُكتب فيه بعد، فحالةٌ ملوّنة أو كتلة يومٍ عليه
                         تُقرأ حكماً على طلبٍ لا وجود له. */
                      const bandBg = (col.bg && !row._blank) ? col.bg(disp, row) : null
                      /* خليّة تُجلب ولا تُكتب: غسلة رمادية محايدة تحت أي تنبيه.
                         العمود المقفول بيد المستخدم منها — القفل يجب أن يُرى في
                         الخلايا لا في رأس العمود وحده، وإلا اكتُشف بالمحاولة. */
                      const autoBg = ((col.auto || col.readOnly || lockedSet.has(col.key)) && c >= frozenCount) ? READONLY_BG : null
                      const fgColor = (disp !== '' && col.fg) ? col.fg(disp, row) : null   // لون خط مشتقّ (تحقّق الفاتورة)
                      const st = styleOf(col.key)
                      // دمج رأسي لأعمدة المنشأة: خلية أول الصف تحمل القيمة كطبقة
                      // متمركزة عبر ارتفاع المجموعة؛ صفوف التكرار فارغة بلا حد سفلي.
                      const mSpec = mergeColSpec.get(col.key)
                      const mergeOn = mSpec != null && !!mRanges
                      const mGroupStart = mergeOn ? mRanges[mSpec][0] : r
                      const mGroupEnd = mergeOn ? mRanges[mSpec][1] : r
                      const mGroupSize = mGroupEnd - mGroupStart + 1
                      const mHead = mergeOn && r === mGroupStart   // أول صف المجموعة (يعرض القيمة)
                      const mDown = mergeOn && r < mGroupEnd        // ليس آخر المجموعة → أزل الحد السفلي
                      const mSpan = mHead && mGroupSize > 1         // خلية مدمجة فعلية (أكثر من صف)
                      /* الخليّة المدمجة **خليّة واحدة** لا شكلاً فحسب: أي نقرة في
                         أي شطرٍ منها تُنشّط رأس المجموعة، وحلقة التنشيط تُرسَم
                         بارتفاع المجموعة كلها. بدونها كان التحديد يقع على شطرٍ
                         فارغٍ في وسط الكتلة فيبدو الجدول مفصّلاً وهو مدموج. */
                      const mr = mergeOn ? mGroupStart : r
                      const mActive = mergeOn ? (head.r >= mGroupStart && head.r <= mGroupEnd && head.c === c) : active
                      // التحديد بالسحب: تُضاء الكتلة كلها إن مسّ النطاق أيّ شطرٍ منها
                      const mSelOn = mergeOn && !mActive
                        && c >= range.c1 && c <= range.c2 && mGroupEnd >= range.r1 && mGroupStart <= range.r2
                      return (
                        <div key={col.key} data-active={active ? '1' : undefined}
                          className="ox-cell"
                          /* تلميح الخليّة: من أدخل هذه القيمة ومتى — يُقرأ من ختم
                             الخليّة المحفوظ (`__m`)، فيظهر للمُدخَل وحده. */
                          title={cellStamp(row, col, isAr)}
                          onMouseDown={(e) => {
                            if (e.button !== 0) return
                            if (isEd) return
                            // تركيزٌ صريح: الشبكة هي متلقّي المفاتيح واللصق
                            scrollRef.current?.focus({ preventScroll: true })
                            dragRef.current = true
                            if (selRows.size) setSelRows(new Set())
                            if (e.shiftKey) setHead({ r: mr, c })
                            else { setAnchor({ r: mr, c }); setHead({ r: mr, c }) }
                            editRef.current = null; setEditing(null)
                          }}
                          onMouseEnter={() => { if (dragRef.current) setHead({ r: mr, c }) }}
                          onDoubleClick={() => {
                            /* النصّ الطويل يُفتح للقراءة ولو كان الصفّ مقفولاً —
                               القفل يمنع التعديل لا الاطّلاع، ورسالةُ بنكٍ لا
                               تُقرأ في خليّة سطرٍ واحد. */
                            if (col.kind === 'longtext' && !editable) {
                              setLongEdit({ row, col, text: String(baseVal(row, col) ?? ''), ro: true }); return
                            }
                            if (editable) beginEdit(mr, c)
                          }}
                          /* كليك يمين **داخل** تحديدٍ قائم يُبقيه (كإكسل): وإلا
                             ضاع النطاق المحدَّد لحظةَ فتح القائمة التي فيها زرّ
                             نسخه. وخارجه ينتقل التحديد للخليّة المنقورة. */
                          onContextMenu={(e) => {
                            e.preventDefault(); e.stopPropagation()
                            const inSel = mr >= range.r1 && mr <= range.r2 && c >= range.c1 && c <= range.c2
                            if (!inSel) { setAnchor({ r: mr, c }); setHead({ r: mr, c }) }
                            setCtx({ x: e.clientX, y: e.clientY, rowId: viewRows[mr]?._id || row._id, colKey: col.key })
                          }}
                          style={{
                            ...cellBase,
                            // كل الخلايا تبقى RTL (حتى يبقى الفاصل العمودي borderInlineEnd على جهة واحدة
                            // ثابتة لكل الأعمدة مهما أُعيد ترتيبها). الاتجاه LTR يُطبَّق على النص وحده أدناه.
                            justifyContent: 'center',
                            height: wrap ? 'auto' : rowH, minHeight: rowH,
                            fontFamily: (col.kind === 'mono' || col.kind === 'num') ? MONO : F,
                            cursor: editable ? 'cell' : 'default',
                            /* في العمود المدمج لا تُرسَم حالة التنشيط على الشطر
                               وحده — تُرسَم طبقةً بارتفاع المجموعة أدناه، وإلا ظهر
                               إطارٌ يقطع الكتلة نصفين. */
                            background: (mActive && !mergeOn) ? 'var(--accent-soft)' : (sel && !mergeOn) ? 'rgba(176,125,0,.13)' : fill ? 'rgba(176,125,0,.07)' : (cfBg || bandBg || autoBg || (frozen ? FROZEN_BG : 'transparent')),
                            boxShadow: (mActive && !mergeOn) ? `inset 0 0 0 2px ${C.gold}` : (sel && !mergeOn) ? 'inset 0 0 0 1px rgba(176,125,0,.35)' : undefined,
                            fontSize: st?.size || 12.5,
                            // نصُّ ما لا يُكتب بيد أهدأ لوناً — به يُميَّز بعد رفع خلفيته
                            color: fgColor || (dirty ? C.gold2 : overridden ? C.blue : (st?.color || (autoLike(col) ? 'var(--tx2)' : 'var(--tx)'))),
                            fontWeight: dirty ? 600 : overridden ? 600 : (st?.weight || 400),
                            /* `col.strike(value,row)` — قيمةٌ **موجودة ولا تسري**:
                               تُشطَب ولا تُخفى، فيبقى الاطّلاع عليها ويظهر أنها
                               ليست في محلّها (مهنة جديدة بلا رسمٍ في الفاتورة). */
                            ...(col.strike && col.strike(raw, row) ? { textDecoration: 'line-through', textDecorationThickness: '1.5px', opacity: .75 } : {}),
                            ...(frozen ? { position: 'sticky', [stickSide]: offsets[c], zIndex: 2 } : {}),
                            ...(mDown ? { borderBottom: 'none' } : {}),
                            ...(mSpan ? { overflow: 'visible', zIndex: 3 } : {}),
                            ...(SECTION_EDGE_CSS[edgeSideOf(col, edgeMap)] || {}),
                          }}>
                          {/* طبقة التنشيط/التحديد للخليّة المدمجة: تُرسَم مرّة في
                              رأس المجموعة بارتفاعها كاملاً، فتُحاط الكتلة كلها بإطارٍ
                              واحد كما في إكسل بدل إطارٍ حول شطرٍ منها. */}
                          {mHead && (mActive || mSelOn) && (
                            <span aria-hidden style={{
                              position: 'absolute', insetInlineStart: 0, insetInlineEnd: 0, top: 0,
                              height: mGroupSize * rowH, pointerEvents: 'none', zIndex: 0,
                              background: mActive ? 'var(--accent-soft)' : 'rgba(176,125,0,.13)',
                              boxShadow: mActive ? `inset 0 0 0 2px ${C.gold}` : 'inset 0 0 0 1px rgba(176,125,0,.35)',
                            }} />
                          )}
                          {/* خلايا المكوّنات (مرفق · نصّ طويل · قائمة منسدلة) تُدمج
                              كغيرها: تُفرَّغ في صفوف التكرار، وتتمركز في رأس المجموعة
                              عبر ارتفاعها — مع إبقاء التفاعل (الرفع والفتح والاختيار)
                              عاملاً فيها. ⚠️ فرع القائمة كان يسبق منطق الدمج فتُرسَم
                              قائمةٌ في كل صفوف المجموعة؛ صار يحترمه كبقية المكوّنات. */}
                          {(mergeOn && !mHead && (col.kind === 'longtext' || col.kind === 'multifile' || col.kind === 'file'
                            || (editable && colType === 'select'))) ? null
                            : col.kind === 'photo' ? (
                            <PhotoCell path={raw} name={row.name_ar || row.name_en} size={rowH} onOpen={setFileView} />
                          ) : col.kind === 'bmk' ? (
                            <BmkCell href={raw} label={col.label || (isAr ? col.ar : col.en)}
                              missing={col.req ? bmkMissing(row, col.req) : ''}
                              onCopy={() => toast && toast(T('نُسخ رابط البوكماركت — الصقه في مفضّلة المتصفّح', 'Bookmarklet copied — paste it into your bookmarks'))} />
                          ) : col.kind === 'link' ? (
                            /* رابط خارجي (طباعة رخصة بلدي مثلاً): شارةٌ تُفتح في
                               تبويب جديد، وفارغةٌ حين لا رابط — لا نصّ URL خام
                               يملأ الخليّة ويُفسد الفرز والبحث. و`col.doc` = مرفقٌ
                               من مخزننا (شهادة السجل التجاري) فيُفتح **داخل
                               الصفحة** في عارض المرفقات كبقية مرفقات النظام،
                               مع إبقاء Ctrl/الزر الأوسط لفتحه بتبويب جديد. */
                            raw ? (
                              <a href={raw} target="_blank" rel="noopener noreferrer"
                                title={col.doc ? fileNameOf(raw) : undefined}
                                onClick={(e) => (col.doc
                                  ? fvOpen(e, setFileView, raw, isAr ? (col.linkLabel || col.ar) : (col.linkLabelEn || col.en), 'application/pdf')
                                  : e.stopPropagation())}
                                onMouseDown={(e) => e.stopPropagation()}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 21, padding: '0 9px',
                                  borderRadius: 999, fontSize: 11, fontWeight: 600, fontFamily: F, textDecoration: 'none',
                                  border: '1px solid rgba(93,173,226,.35)', background: 'rgba(93,173,226,.12)', color: '#5dade2' }}>
                                {col.doc ? '📎 ' : ''}{(isAr ? col.linkLabel : (col.linkLabelEn || col.linkLabel)) || (isAr ? 'فتح' : 'Open')}{col.doc ? '' : ' ↗'}
                              </a>
                            ) : null
                          ) : col.kind === 'open' ? (
                            raw ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                                <span onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => { e.stopPropagation(); col.open && col.open(row) }}
                                  title={col.openTip ? (isAr ? col.openTip.ar : col.openTip.en) : T('فتح', 'Open')}
                                  style={{ cursor: 'pointer', color: C.blue, textDecoration: 'underline', textUnderlineOffset: 3,
                                    fontVariantNumeric: 'tabular-nums', direction: 'ltr', fontWeight: 600,
                                    overflow: 'hidden', textOverflow: 'ellipsis' }}>{raw}</span>
                                <CopyBtn text={raw} title={T('نسخ الرقم', 'Copy')} />
                              </span>
                            ) : null
                          ) : col.kind === 'fetch' ? (
                            <FetchCell value={raw} canEdit={editable} icon={col.fetchIcon}
                              busy={fetchBusy === `${row._id}|${col.key}`}
                              tip={col.fetchTip ? (isAr ? col.fetchTip.ar : col.fetchTip.en) : T('جلب', 'Fetch')}
                              onFetch={() => runColFetch(row, col)} />
                          ) : col.kind === 'pay' ? (
                            <PayCell {...(col.pay ? col.pay(row) : {})} isAr={isAr} />
                          ) : col.kind === 'files' ? (
                            <FilesCell files={row.bank_files} isAr={isAr} onView={setFileView} />
                          ) : col.kind === 'longtext' ? (
                            mSpanWrap(mSpan, mGroupSize * rowH,
                              <LongTextCell value={raw} isAr={isAr} unit={col.longUnit} />)
                          ) : col.kind === 'multifile' ? (
                            mSpanWrap(mSpan, mGroupSize * rowH,
                            <MultiFileCell value={raw} isAr={isAr} canEdit={editable} onView={setFileView}
                              busy={fileBusy === `${row._id}|${col.key}`}
                              onPick={(f) => uploadCellFile(row, col, f)}
                              onRemove={(i) => { const a = mfParse(raw); a.splice(i, 1); writeCells([{ row, col, text: a.length ? JSON.stringify(a) : '' }]) }} />)
                          ) : col.kind === 'file' ? (
                            <FileCell url={raw} isAr={isAr} canEdit={editable} onView={setFileView}
                              busy={fileBusy === `${row._id}|${col.key}`}
                              onPick={(f) => uploadCellFile(row, col, f)}
                              onClear={() => writeCells([{ row, col, text: '' }])} />
                          ) : editable && colType === 'select' ? (
                            mSpanWrap(mSpan, mGroupSize * rowH,
                              <CellSelect value={raw}
                                options={col.options ? col.options(row) : (colOptsMap[col.key] || [])}
                                optBg={col.bg ? ((o) => col.bg(o, row)) : null}
                                optLabel={col.optLabel}
                                onChange={(v) => writeCells([{ row, col, text: v }])} disabled={!canEdit} />)
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
                            ) : colType === 'date' ? (
                              <DateCellEditor inRef={cellInRef} ltr={ltr} value={raw}
                                seed={editing.seed != null ? editing.seed : raw}
                                onPick={(s) => commitEdit([1, 0], s)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { e.preventDefault(); commitEdit([1, 0]) }
                                  else if (e.key === 'Tab') { e.preventDefault(); commitEdit([0, e.shiftKey ? -1 : 1]) }
                                  else if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
                                }}
                                onBlur={() => commitEdit(null)} />
                            ) : (
                              <input ref={cellInRef} className="ox-in" autoFocus type="text"
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
                              <span style={{ position: 'absolute', insetInlineStart: 0, insetInlineEnd: 0, top: 0, height: mGroupSize * rowH, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', direction: ltr ? 'ltr' : undefined, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pointerEvents: 'none', padding: '0 10px' }}>{cellLines(disp)}</span>
                            ) : (mergeOn && !mHead) ? null : (
                              <span style={{ overflow: wrap ? 'visible' : 'hidden', textOverflow: 'ellipsis', whiteSpace: wrap ? 'normal' : 'nowrap', width: '100%', textAlign: wrap ? 'start' : 'center', direction: ltr ? 'ltr' : undefined, lineHeight: wrap ? 1.35 : undefined, padding: wrap ? '4px 0' : undefined }}>{cellLines(disp)}</span>
                            )
                          )}
                          {(() => {
                            // نقطة على الخلية التي عليها سؤال في المحادثة (زرقاء = مفتوح · خضراء = أُجيب)
                            const mk = chat.cellMarks.get(cellMarkKey(row._id, col.key)); if (!mk) return null
                            return <span title={mk.open ? T(`${mk.open} سؤال مفتوح عن هذه الخلية`, `${mk.open} open question on this cell`) : T('سؤال أُجيب عنه', 'Answered question')}
                              onClick={(e) => { e.stopPropagation(); setChatOpen(true) }}
                              style={{ position: 'absolute', bottom: 2, insetInlineEnd: 2, width: 7, height: 7, borderRadius: '50%', cursor: 'pointer',
                                background: mk.open ? CHAT_DOT.open : CHAT_DOT.done, boxShadow: '0 0 0 1.5px var(--bg)' }} />
                          })()}
                          {overridden && !isEd && <span title={T('قيمة مُعدَّلة يدوياً — تجاوز المزامنة', 'Manually overridden — differs from sync')} style={{ position: 'absolute', top: 2, insetInlineStart: 2, width: 0, height: 0, borderTop: `6px solid ${C.blue}`, borderInlineEnd: '6px solid transparent', pointerEvents: 'none' }} />}
                          {/* عدسة التفصيل: الرقم المحسوب تلقائياً قابل للتدقيق بضغطة.
                              في الركن العلوي الخارجي — الأركان الثلاثة الأخرى مشغولة
                              (مثلث التجاوز · نقطة المحادثة · مقبض التعبئة). */}
                          {/* أيقونة نسخ داخل الخلية (`col.copy`): رقمٌ يُلصق في بوابة
                              أخرى (سداد) — تحديدُه بالماوس في خليّة شبكة عناء، وضغطةٌ
                              واحدة تغني عنه. لا تظهر إلا وفي الخلية قيمة. */}
                          {col.copy && !isEd && disp !== '' && (
                            <span title={T('نسخ الرقم', 'Copy')}
                              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                              onClick={(e) => {
                                e.stopPropagation()
                                // السطر الأول وحده: ما تحته شرحٌ لا يُلصق في بوابة سداد
                                const txt = String(disp).split('\n')[0]
                                try { navigator.clipboard?.writeText(txt) } catch { /* تجاهل */ }
                                toast && toast(T(`نُسخ ${txt}`, `Copied ${txt}`))
                              }}
                              style={{ position: 'absolute', insetInlineEnd: 4, top: '50%', transform: 'translateY(-50%)',
                                fontSize: 11, lineHeight: '11px', cursor: 'pointer', color: C.blue, opacity: .8 }}>⧉</span>
                          )}
                          {col.drill && !isEd && col.drill(row) && (
                            <span title={T('اعرض تفصيل هذا الرقم', 'Show how this number is made up')}
                              onClick={(e) => { e.stopPropagation(); openDrill(row, col) }}
                              style={{ position: 'absolute', top: 1, insetInlineEnd: 2, fontSize: 9.5, lineHeight: '10px',
                                cursor: 'pointer', color: C.blue, opacity: .75 }}>🔍</span>
                          )}
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
        <span style={{ fontWeight: 600, color: 'var(--tx3)' }}>{T('نقطة رأس العمود:', 'Header dot:')}</span>
        {Object.values(COL_SRC).map((sc) => (
          <span key={sc.en} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: sc.color }} />{isAr ? sc.ar : sc.en}</span>
        ))}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 0, height: 0, borderTop: `7px solid ${C.blue}`, borderInlineEnd: '7px solid transparent' }} />{T('قيمة مُعدَّلة (تجاوز مزامنة)', 'Overridden value')}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: C.blue }} />{T('صف يدوي', 'Manual row')}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: CHAT_DOT.open }} />{T('سؤال مفتوح على الخلية (كليك يمين ← اسأل عن هذه الخلية)', 'Open question on the cell (right-click → Ask about this cell)')}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: CHAT_DOT.done }} />{T('سؤال أُجيب عنه', 'Answered question')}</span>
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
              <button onClick={() => { setCtx(null); doCopy() }}>📋 {T('نسخ الصفوف المحددة (Ctrl+C)', 'Copy selected rows (Ctrl+C)')}</button>
              {canEdit && selHiddenCount > 0 && <button disabled={busy} onClick={() => { restoreSelected(); setCtx(null) }}>↺ {T('استعادة المحدد', 'Restore selected')}</button>}
              {canEdit && <button className="del" disabled={busy} onClick={() => { deleteSelected(); setCtx(null) }}>🗑 {T('حذف المحدد', 'Delete selected')}</button>}
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
                    {/* نسخ الخليّة وحدها قبل نسخ التحديد: هو الأكثر طلباً — رقمٌ
                        يُلصق في بوابة، لا جدولٌ يُلصق في إكسل. */}
                    <button onClick={() => { setCtx(null); doCopyCell(ctxRow, col) }}>📄 {T('نسخ قيمة الخليّة', 'Copy cell value')}</button>
                    <button onClick={() => { setCtx(null); doCopy() }}>📋 {T('نسخ التحديد (Ctrl+C)', 'Copy selection (Ctrl+C)')}</button>
                    {canEdit && <button onClick={() => { setCtx(null); pasteFromClipboard() }}>📥 {T('لصق هنا (Ctrl+V)', 'Paste here (Ctrl+V)')}</button>}
                    {isEditable(ctxRow, col) && <button onClick={() => { writeCells([{ row: ctxRow, col, text: '' }]); setCtx(null) }}>⌫ {T('مسح الخلية', 'Clear cell')}</button>}
                    {cellOverridden && <button onClick={() => { writeCells([{ row: ctxRow, col, text: syncVal(ctxRow, col) }]); setCtx(null) }}>↺ {T('استرجاع قيمة المزامنة', 'Restore synced value')}</button>}
                    <div style={{ height: 1, background: 'var(--bd)', margin: '5px 6px' }} />
                  </>
                )
              })()}
              <button onClick={() => { askAbout('row', ctxRow, null); setCtx(null) }}>💬 {T('اسأل عن هذا الصف', 'Ask about this row')}</button>
              <button onClick={() => { setDetailRow(ctx.rowId); setCtx(null) }}>🔎 {T('تفاصيل الصف', 'Row details')}</button>
              {/* ما دون هذا كلّه تعديلٌ في الجدول — لا يُعرَض لمن لا يملك تعديله.
                  (القائمة نفسها صارت تُفتح بلا صلاحية تعديل: النسخ والاطّلاع
                  حقُّ كل من يرى الجدول، وكانا محبوسين خلف صلاحية الكتابة.) */}
              {canEdit && <>
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
              </>}
              {/* طلبٌ مسدَّد لم يصل الدفتر — أعِد المحاولة بقيمه المحفوظة */}
              {view.repostable && view.repostable(ctxRow) && (
                <button disabled={busy} onClick={() => { setCtx(null); repostRow(ctxRow) }}>
                  ⇪ {view.postLabel ? (isAr ? view.postLabel.ar : view.postLabel.en) : T('رحّل للدفتر الآن', 'Post to ledger now')}
                </button>
              )}
              {/* مخرج القفل — للمدير العام وحده، ولهذه الجلسة فقط */}
              {isRowLocked(ctxRow) && user?.role_key === 'gm' && (
                <button onClick={() => { setUnlockedRows((p) => new Set([...p, ctx.rowId])); setCtx(null) }}>
                  🔓 {T('فتح الصف للتعديل (هذه الجلسة)', 'Unlock row (this session)')}
                </button>
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
              {/* الفاصل الذهبي: جهتان وإلغاء. الجهة منطقية — «يمين» بداية السطر
                  في العربية، فتنقلب مع الواجهة كما تنقلب الأعمدة. */}
              {(() => {
                const cur = edgeSideOf(hdrCtxCol || { key: hdrCtx.colKey }, edgeMap)
                const btn = (side, label) => (
                  <button style={{ flex: 1, justifyContent: 'center', ...(cur === side ? { color: C.gold2, fontWeight: 600 } : {}) }}
                    onClick={() => { setColEdge(hdrCtx.colKey, side); setHdrCtx(null) }}>{label}</button>
                )
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--tx3)', padding: '0 8px', whiteSpace: 'nowrap' }}>▌ {T('فاصل ذهبي', 'Gold divider')}</span>
                    {btn('start', T('يمين', 'Left'))}
                    {btn('end', T('يسار', 'Right'))}
                    <button style={{ width: 34, justifyContent: 'center' }} title={T('بلا فاصل', 'No divider')}
                      onClick={() => { setColEdge(hdrCtx.colKey, (hdrCtxCol && hdrCtxCol.sectionStart) ? 'none' : null); setHdrCtx(null) }}>✕</button>
                  </div>
                )
              })()}
              {(() => { const idx = COLS.findIndex((c) => c.key === hdrCtx.colKey); return idx >= 0 && (
                <button onClick={() => { setFrozen(frozenCount === idx + 1 ? 0 : idx + 1); setHdrCtx(null) }}>📌 {frozenCount === idx + 1 ? T('إلغاء التثبيت', 'Unfreeze') : T('تثبيت حتى هنا', 'Freeze up to here')}</button>
              ) })()}
              {/* القفل يُعرَض على **كل** عمود. كان مقصوراً على أعمدة الإدخال
                  (`ops`/`manual`) من زمنٍ كان فيه العمود المُزامَن غير قابل للتحرير
                  أصلاً — ثم صار كلُّ عمود قابلاً للتجاوز ولم يُرفع الشرط معه، فبقي
                  عمودٌ كالرقم الوطني الموحّد يُعدَّل بلا سبيل لقفله. */}
              <button onClick={() => { toggleLock(hdrCtx.colKey); setHdrCtx(null) }}>{lockedSet.has(hdrCtx.colKey) ? T('🔓 فتح الإدخال', '🔓 Unlock') : T('🔒 قفل الإدخال (قراءة فقط)', '🔒 Lock (read-only)')}</button>
              <button onClick={() => { const cur = (layout.cf || {})[hdrCtx.colKey]; setCfDraft({ dup: cur?.dup || null, rules: (cur?.rules || []).map((r) => ({ ...r })) }); setCfModal(hdrCtx.colKey); setHdrCtx(null) }}>🎨 {T('تنسيق شرطي', 'Conditional format')}</button>
              <button onClick={() => { const k = hdrCtx.colKey; setFmtDraft({ ...(styleOf(k) || {}), type: colTypeMap[k] || '', options: (colOptsMap[k] || []).join('\n'), numFmt: numFmtMap[k] || '', formula: formulaMap[k] || '', src: srcMap[k] || '' }); setFmtModal(k); setHdrCtx(null) }}>🅰 {T('تنسيق العمود', 'Column format')}</button>
              {protectedMap[hdrCtx.colKey] ? (
                <>
                  {!unlockedCols.has(hdrCtx.colKey) && <button onClick={() => { setPwInput(''); setPwModal({ key: hdrCtx.colKey, mode: 'unlock' }); setHdrCtx(null) }}>🔑 {T('إظهار العمود', 'Reveal column')}</button>}
                  <button className="del" onClick={() => { removeProtect(hdrCtx.colKey); setHdrCtx(null) }}>🗝 {T('إزالة الحماية', 'Remove protection')}</button>
                </>
              ) : (
                <button onClick={() => { setPwInput(''); setPwModal({ key: hdrCtx.colKey, mode: 'set' }); setHdrCtx(null) }}>🔑 {T('حماية بكلمة سر', 'Protect with password')}</button>
              )}
              <button onClick={() => { setColName(''); setColModal(true); setHdrCtx(null) }}>＋ {T('إضافة عمود', 'Add column')}</button>
              {!hdrCtxCol?.custom && (
                <button onClick={() => { deleteColumn(hdrCtx.colKey); setHdrCtx(null) }}>
                  🚫 {(view.tabs && tabSel)
                    ? T(`إخفاء العمود في «${(tabDefs.find((t) => t.key === tabSel) || {}).label || tabSel}»`,
                        `Hide column in “${(tabDefs.find((t) => t.key === tabSel) || {}).label || tabSel}”`)
                    : T('إخفاء العمود (يمكن إظهاره)', 'Hide column (restorable)')}
                </button>
              )}
              <button className="del" onClick={() => { removeColumn(hdrCtx.colKey); setHdrCtx(null) }}>
                🗑 {T('حذف العمود نهائياً (من الشيت كله)', 'Delete column permanently (whole sheet)')}
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
      {/* محرّر النصّ الطويل — رسائل البنك: سطر لكل دفعة */}
      {longEdit && (() => {
        const n = ltLines(longEdit.text).length
        const ro = !!longEdit.ro          // عرضٌ للقراءة (صفّ مقفول)
        const unit = longEdit.col.longUnit
        const save = () => { writeCells([{ row: longEdit.row, col: longEdit.col, text: longEdit.text }]); setLongEdit(null) }
        return (
          <Modal open onClose={() => setLongEdit(null)} closeOnOverlay lang={lang} accent={C.gold} width={640}
            title={(isAr ? longEdit.col.ar : longEdit.col.en)
              + ((longEdit.row.dep_date || longEdit.row._ops?.sr_date) ? ' — ' + (longEdit.row.dep_date || longEdit.row._ops.sr_date) : '')}
            subtitle={longEdit.col.longHint
              ? T(longEdit.col.longHint.ar, longEdit.col.longHint.en)
              : T('كل سطر = رسالة. الإيداع المقسَّم على عدّة دفعات: الصق رسالة كل دفعة في سطر.',
                'One message per line. For a deposit split across several transactions, paste each message on its own line.')}
            footer={ro ? null : <ActionButton Icon={Save} onClick={save}>{T('حفظ', 'Save')}</ActionButton>}>
            <textarea autoFocus={!ro} readOnly={ro} value={longEdit.text}
              onChange={(e) => setLongEdit((s) => ({ ...s, text: e.target.value }))}
              onKeyDown={(e) => { if (!ro && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save() } }}
              rows={12} dir="auto"
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: 220,
                background: 'var(--modal-input-bg)', border: '1px solid var(--bd)', borderRadius: 9,
                color: 'var(--tx)', fontFamily: F, fontSize: 12.5, lineHeight: 1.9, padding: '10px 12px', outline: 'none',
                cursor: ro ? 'text' : undefined, opacity: ro ? .92 : 1 }} />
            <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--tx3)', display: 'flex', justifyContent: 'space-between' }}>
              <span>{unit === false
                ? T(`${enNum(n)} سطراً`, `${enNum(n)} line(s)`)
                : T(`${enNum(n)} رسالة`, `${enNum(n)} message(s)`)}</span>
              <span style={{ fontFamily: MONO }}>{ro ? T('مقفول — للقراءة فقط', 'Locked — read only') : 'Ctrl+Enter'}</span>
            </div>
          </Modal>
        )
      })()}

      {/* تفصيل الخلية — من أين جاء الرقم المحسوب تلقائياً */}
      {drill && (
        <Modal open onClose={() => setDrill(null)} closeOnOverlay lang={lang} accent={C.blue} width={860} scroll
          title={drill.title || T('التفصيل', 'Breakdown')} subtitle={drill.note || ''}>
          {drill.loading ? (
            <div style={{ padding: 26, textAlign: 'center', color: 'var(--tx3)', fontSize: 12.5 }}>{T('جارٍ التحميل…', 'Loading…')}</div>
          ) : drill.err ? (
            <div style={{ padding: 16, color: C.red, fontSize: 12.5 }}>{drill.err}</div>
          ) : !(drill.rows || []).length ? (
            <div style={{ padding: 26, textAlign: 'center', color: 'var(--tx3)', fontSize: 12.5 }}>{T('لا سطور لهذا اليوم', 'No lines for this day')}</div>
          ) : (
            <div style={{ overflowX: 'auto' }} className="ox-scrolly">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {drill.columns.map((c) => (
                      <th key={c.key} style={{ textAlign: 'start', padding: '8px 10px', color: 'var(--tx3)', fontWeight: 600,
                        borderBottom: '1px solid var(--bd)', whiteSpace: 'nowrap' }}>{isAr ? c.ar : c.en}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drill.rows.map((r, i) => (
                    <tr key={i}>
                      {drill.columns.map((c) => (
                        <td key={c.key} style={{ padding: '7px 10px', borderBottom: '1px solid var(--bd2)', color: 'var(--tx)',
                          fontFamily: (c.mono || c.num) ? MONO : F, whiteSpace: 'nowrap',
                          textAlign: c.num ? 'end' : 'start' }}>
                          {c.num ? enNum(r[c.key]) : (r[c.key] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}

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

      {/* ── نافذة تسعيرة الأغراض ── */}
      {priceModal && view.priceBook && (() => {
        const groups = view.priceBook.groups()
        const all = groups.flatMap((g) => g.list)
        const cur = (p) => priceDraft[p] || {}
        const modeOf = (p) => (cur(p).mode === 'range' ? 'range' : 'fixed')
        const upd = (p, patch) => setPriceDraft((d) => ({ ...d, [p]: { ...(d[p] || {}), ...patch } }))
        const save = () => {
          // لا يُحفظ إلا ما فيه رقم — الغرض بلا سعر يبقى بلا سعر، لا بسعر صفر
          const clean = {}
          for (const p of all) {
            const v = cur(p)
            if (modeOf(p) === 'range') {
              const min = String(v.min ?? '').trim(), max = String(v.max ?? '').trim()
              if (min || max) clean[p] = { mode: 'range', min, max }
            } else {
              const one = String(v.v ?? '').trim()
              if (one) clean[p] = { mode: 'fixed', v: one }
            }
          }
          persistLayout({ ...layout, prices: clean })
          setPriceModal(false)
          toast && toast(T(`حُفظت تسعيرة ${enNum(Object.keys(clean).length)} غرضاً`, `Saved ${enNum(Object.keys(clean).length)} purpose prices`))
        }
        const modeBtn = (p, m, lbl) => (
          <button className="ox-btn" style={{ height: 30, padding: '0 11px', ...(modeOf(p) === m ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent-bd)' } : {}) }}
            onClick={() => upd(p, { mode: m })}>{lbl}</button>
        )
        return (
          <Modal open onClose={() => setPriceModal(false)} closeOnOverlay lang={lang} accent={C.gold} width={640} scroll
            title={T('تسعيرة أغراض السداد', 'Purpose price book')}
            subtitle={T('السعر الثابت يُملأ في «المبلغ» فور اختيار الغرض · والنطاق يُترك لك، ويُصبغ ما خرج عنه',
              'A fixed price fills the amount as soon as the purpose is picked · a range is left to you, and anything outside it is tinted')}
            footerStart={<ActionButton variant="ghost" Icon={Trash2} onClick={() => setPriceDraft({})}>{T('تفريغ الكل', 'Clear all')}</ActionButton>}
            footer={<ActionButton Icon={Save} onClick={save}>{T('حفظ', 'Save')}</ActionButton>}>
            {groups.filter((g) => g.list.length).map((g) => (
              <div key={g.ar}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 6px', fontSize: 11.5, fontWeight: 600, color: 'var(--tx3)' }}>
                  <span>{isAr ? g.ar : g.en}</span>
                  <span style={{ flex: 1, height: 1, background: 'var(--bd2)' }} />
                </div>
                {g.list.map((p) => (
                  <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 2px', borderBottom: '1px solid var(--bd2)', flexWrap: 'wrap' }}>
                    <span style={{ flex: '1 1 140px', fontSize: 12.5, fontWeight: 600, color: 'var(--tx2)' }}>{p}</span>
                    {modeBtn(p, 'fixed', T('سعر واحد', 'Fixed'))}
                    {modeBtn(p, 'range', T('نطاق', 'Range'))}
                    {modeOf(p) === 'range' ? (
                      <>
                        <input className="ox-fld" type="number" dir="ltr" style={{ width: 94, height: 32 }} placeholder={T('الأدنى', 'Min')}
                          value={cur(p).min || ''} onChange={(e) => upd(p, { min: e.target.value })} />
                        <input className="ox-fld" type="number" dir="ltr" style={{ width: 94, height: 32 }} placeholder={T('الأعلى', 'Max')}
                          value={cur(p).max || ''} onChange={(e) => upd(p, { max: e.target.value })} />
                      </>
                    ) : (
                      <input className="ox-fld" type="number" dir="ltr" style={{ width: 196, height: 32 }} placeholder={T('السعر', 'Price')}
                        value={cur(p).v || ''} onChange={(e) => upd(p, { v: e.target.value })} />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </Modal>
        )
      })()}

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

              {/* نقطة المصدر: تُختار **بمعناها** لا بلونها الخام، فيتغيّر اللون
                  والتلميح ودليلُ الأسفل معاً ويبقى للنقطة معنى يُقرأ. */}
              <div style={{ height: 1, background: 'var(--bd)', margin: '14px 0' }} />
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tx2)', marginBottom: 6 }}>{T('نقطة المصدر (رأس العمود)', 'Source dot (header)')}</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="ox-btn" style={{ height: 34, ...(!fmtDraft.src ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent-bd)' } : {}) }}
                  onClick={() => setFmtDraft((d) => ({ ...d, src: '' }))}>{T('تلقائي', 'Auto')}</button>
                {Object.entries(COL_SRC).map(([k, sc]) => (
                  <button key={k} className="ox-btn" style={{ height: 34, display: 'inline-flex', alignItems: 'center', gap: 6, ...(fmtDraft.src === k ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent-bd)' } : {}) }}
                    onClick={() => setFmtDraft((d) => ({ ...d, src: k }))}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc.color, flexShrink: 0 }} />
                    {isAr ? sc.ar : sc.en}
                  </button>
                ))}
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

      {/* ── عارض المرفقات داخل الصفحة (صورة · PDF · بطاقة ملف) ── */}
      {fileView && ReactDOM.createPortal(
        <div onClick={() => setFileView(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.78)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, maxWidth: '94vw', maxHeight: '94vh', cursor: 'default' }}>
            {fvKind(fileView) === 'image' ? (
              <img src={fileView.url} alt=""
                style={{ maxWidth: '88vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 14, border: '2px solid rgba(176,125,0,.5)', boxShadow: '0 12px 48px rgba(0,0,0,.55)', background: '#111' }} />
            ) : fvKind(fileView) === 'pdf' ? (
              <iframe src={fileView.url} title={fileView.name || 'PDF'}
                style={{ width: 'min(1080px,90vw)', height: '82vh', borderRadius: 14, border: '2px solid rgba(176,125,0,.5)', boxShadow: '0 12px 48px rgba(0,0,0,.55)', background: '#fff' }} />
            ) : (
              /* نوع لا يُعرض داخل الصفحة (إكسل/وورد/مضغوط) — يبقى التنزيل مخرجاً */
              <div style={{ padding: '30px 34px', borderRadius: 14, border: '2px solid rgba(176,125,0,.5)', background: 'var(--card-grad2)', textAlign: 'center', minWidth: 300 }}>
                <div style={{ fontSize: 34, marginBottom: 10 }}>📄</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--tx)', fontFamily: F, wordBreak: 'break-all' }}>{fileView.name || fileNameOf(fileView.url)}</div>
                <div style={{ fontSize: 11.5, color: 'var(--tx3)', fontFamily: F, marginTop: 6 }}>{T('هذا النوع لا يُعرض داخل الصفحة', 'This type cannot be previewed here')}</div>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {fvKind(fileView) !== 'other' && fileView.name && (
                <span style={{ color: '#fff', fontSize: 13.5, fontWeight: 600, fontFamily: F, textShadow: '0 1px 4px rgba(0,0,0,.6)' }}>{fileView.name}</span>
              )}
              <a href={fileView.url} download={fileView.name || undefined} target="_blank" rel="noreferrer"
                style={{ height: 36, padding: '0 18px', borderRadius: 9, border: '1px solid rgba(176,125,0,.5)', background: 'rgba(176,125,0,.18)', color: '#f5deb3', fontSize: 13, fontWeight: 600, fontFamily: F, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
                ⭳ {T('تنزيل', 'Download')}
              </a>
              <button onClick={() => setFileView(null)}
                style={{ height: 36, padding: '0 20px', borderRadius: 9, border: '1px solid rgba(176,125,0,.5)', background: 'rgba(176,125,0,.18)', color: '#f5deb3', fontSize: 13, fontWeight: 600, fontFamily: F, cursor: 'pointer' }}>
                {T('إغلاق', 'Close')}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

const cellBase = {
  height: ROW_H, display: 'flex', alignItems: 'center', padding: '0 10px', position: 'relative',
  /* شبكةٌ كإكسل: فاصلٌ عمودي بين كل الأعمدة يبقى مهما أُعيد الترتيب أو الإخفاء،
     وفاصلٌ أفقي بلونه نفسه أخفّ قليلاً — كان `--bd2` باهتاً على الخلفيات المصبوغة
     فتلتصق الصفوف وتُقرأ كتلةً واحدة. */
  borderInlineEnd: '1px solid rgba(176,125,0,.22)', borderBottom: '1px solid rgba(176,125,0,.20)',
  fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  boxSizing: 'border-box', userSelect: 'none',
}
