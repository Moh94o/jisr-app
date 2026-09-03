import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { can as canPerm } from '../lib/permissions.js'

/* ═══════════════════════════════════════════════════════════════════════════
   جداول ما بعد إصدار التأشيرة — الوكالة · إصدار الإقامة · توصيل الإقامة.

   نفس بنية «جدول إصدار التأشيرات» (VisaGridPage): طوابير مراحل لا جدول عريض،
   كل تأشيرة في مرحلة واحدة، وكل مرحلة تعرض أعمدتها وحدها، وبيانات الفاتورة
   تُكتب مرة واحدة في سطر عنوان فوق كتلتها. محرّك الشبكة كاملاً منقول كما هو:
   تنقّل بالكيبورد، لصق من إكسل، تعبئة بالسحب، حفظ دفعي متسامح مع الفشل الجزئي.

   الصفحة واحدة بثلاثة أوضاع (prop `mode`) لأن الأوضاع الثلاثة تتشارك الصفّ
   نفسه (التأشيرة + صفّ إصدار إقامتها) ولا تختلف إلا في الأعمدة وإسناد المرحلة:

     wakalah   — الوكالة: تُدخَل على صفّ التأشيرة نفسه (wakalah_*).
     iqama     — إصدار الإقامة: الفحص الطبي ← التأمين ← رخصة العمل ← الإقامة،
                 تُكتب على iqama_issuance_applications (يُنشأ الصفّ عند أول كتابة).
                 التأمين ورخصة العمل يُحفظان في stage_data كما تفعل نافذة الفاتورة،
                 مع مرآة في أعمدة الجدول القديمة ليقرأها من لا يعرف stage_data.
     delivery  — طباعة الإقامة ثم توصيلها.

   فرق مقصود عن جدول التأشيرات: المرحلة تُحسب من القيم **المحفوظة** لا من
   التعديلات المعلّقة، فلا يختفي السطر من طابوره قبل الحفظ.

   تنبيهان تقنيان موروثان:
   · لا تُدرِج في اعتماديات useEffect قيمةً مُعرَّفة أسفله — Vite لا يحلّل TDZ.
   · لا ألوان ثابتة: استعمل var(--*) أو طبقة linear-gradient فوقها.
   ═══════════════════════════════════════════════════════════════════════════ */

const F = "'Cairo','Tajawal',sans-serif"
const MONO = 'ui-monospace,SFMono-Regular,Menlo,monospace'
const C = {
  gold: '#B07D00', gold2: '#D4A017',
  blue: '#5dade2', ok: '#2ecc71', red: '#e87265', gray: '#95a5a6', warn: '#d99400', purple: '#bb8fce',
}
const PAGE_ROWS = 100
const ROW_H = 40
const HEAD_H = 34
const COL_H = 36
const SAVE_CONCURRENCY = 6
const TEMP_CODE = 'work_visa_temporary'   // المؤقتة: فحص ← إقامة، بلا تأمين ولا رخصة عمل
const AUTH_RE = /توكيل|تفويض|authoriz|wakal/i
const FILE_NOTES = ['wakalah_file', 'visa_ins_file', 'visa_wp_file', 'muqeem']
/* رقم الإقامة: نفس شرط نافذة «إصدار الإقامات» في الفاتورة */
const FMT = { iqama_number: /^2\d{9}$/ }

const latin = (s) => String(s ?? '')
  .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
  .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
const p2 = (n) => String(n).padStart(2, '0')
const ymd = (v) => (v ? String(v).slice(0, 10) : '')
const enNum = (n) => Number(n || 0).toLocaleString('en-US')
const doneish = (s) => /^(done|delivered|accomplished)$/i.test(String(s || '').trim())

const parseDate = (v) => {
  const s = latin(v).trim()
  if (!s) return null
  let m
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) return `${m[1]}-${p2(m[2])}-${p2(m[3])}`
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) return `${m[3]}-${p2(m[2])}-${p2(m[1])}`
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
  return undefined
}

const GENDER_AR = { male: 'ذكر', female: 'أنثى' }
const FILE_COLORS = ['#B07D00', '#5dade2', '#bb8fce', '#16a085', '#e8834e', '#5f9ea0']
const fileColor = (n) => (n == null ? 'var(--bd)' : FILE_COLORS[(Number(n) - 1 + FILE_COLORS.length) % FILE_COLORS.length])

/* ── خيارات الأعمدة الاختيارية ─────────────────────────────────────────── */
const DUR_OPTS = [3, 6, 9, 12, 24].map((n) => ({ v: n, ar: `${n} أشهر`, en: `${n} months`, c: C.gold2 }))
const ST_PD = [{ v: 'pending', ar: 'قيد الإجراء', en: 'Pending', c: C.warn }, { v: 'done', ar: 'منجز', en: 'Done', c: C.ok }]
const ST_PRINT = [{ v: 'pending', ar: 'لم تُطبع', en: 'Not printed', c: C.warn }, { v: 'done', ar: 'طُبعت', en: 'Printed', c: C.ok }]
const ST_DELIV = [{ v: 'pending', ar: 'لم تُوصَّل', en: 'Not delivered', c: C.warn }, { v: 'done', ar: 'تم التوصيل', en: 'Delivered', c: C.ok }]

/* ── سجلّ الأعمدة (مشترك بين الأوضاع) ──────────────────────────────────────
   kind: rownum | facname | vstate | pay | text | date | money | select | lookup | ro | file
   الحقول المكتوبة «مسطّحة» على الصفّ (flatten) ثم تُوزَّع عند الحفظ على جدولها. */
const COL_DEFS = {
  _row: { ar: 'التأشيرة', en: 'Visa', w: 150, kind: 'rownum' },
  _facility: { ar: 'المنشأة', en: 'Facility', w: 220, kind: 'facname' },
  _vstate: { ar: 'الحالة', en: 'State', w: 260, kind: 'vstate' },
  _wkpay: { ar: 'دفعة التوكيل', en: 'PoA payment', w: 112, kind: 'pay', pay: 'auth' },
  _iqpay: { ar: 'دفعة الإقامة', en: 'Iqama payment', w: 112, kind: 'pay', pay: 'residence' },
  /* الوكالة — على صفّ التأشيرة */
  wakalah_number: { ar: 'رقم الوكالة', en: 'PoA no.', w: 138, kind: 'text', edit: true, mono: true, color: C.gold2 },
  wakalah_date: { ar: 'تاريخ الوكالة', en: 'PoA date', w: 124, kind: 'date', edit: true, mono: true },
  wakalah_office: { ar: 'مكتب الوكالة', en: 'PoA office', w: 150, kind: 'text', edit: true },
  wakalah_status_id: { ar: 'حالة الوكالة', en: 'PoA status', w: 132, kind: 'lookup', edit: true },
  _wkfile: { ar: 'ملف الوكالة', en: 'PoA file', w: 104, kind: 'file', note: 'wakalah_file', pathKey: 'wakalah_file_path' },
  /* إصدار الإقامة — على صفّ الإقامة */
  medical_status: { ar: 'الفحص الطبي', en: 'Medical exam', w: 140, kind: 'select', opts: ST_PD, edit: true },
  medical_amount: { ar: 'مبلغ الفحص', en: 'Exam amount', w: 124, kind: 'money', edit: true, mono: true },
  ins_expiry: { ar: 'انتهاء التأمين', en: 'Insurance expiry', w: 130, kind: 'date', edit: true, mono: true },
  ins_amount: { ar: 'مبلغ التأمين', en: 'Insurance amount', w: 120, kind: 'money', edit: true, mono: true },
  ins_company: { ar: 'شركة التأمين', en: 'Insurer', w: 150, kind: 'text', edit: true },
  ins_policy: { ar: 'رقم البوليصة', en: 'Policy no.', w: 136, kind: 'text', edit: true, mono: true },
  _insfile: { ar: 'ملف التأمين', en: 'Policy file', w: 104, kind: 'file', note: 'visa_ins_file' },
  wp_duration: { ar: 'مدة الرخصة', en: 'Permit duration', w: 116, kind: 'select', opts: DUR_OPTS, edit: true },
  wp_expiry: { ar: 'انتهاء الرخصة', en: 'Permit expiry', w: 130, kind: 'date', edit: true, mono: true },
  wp_amount: { ar: 'مبلغ الرخصة', en: 'Permit amount', w: 120, kind: 'money', edit: true, mono: true },
  _wpfile: { ar: 'ملف الرخصة', en: 'Permit file', w: 104, kind: 'file', note: 'visa_wp_file' },
  worker_name: { ar: 'اسم العامل', en: 'Worker name', w: 176, kind: 'text', edit: true },
  iqama_number: { ar: 'رقم الإقامة', en: 'Iqama no.', w: 146, kind: 'text', edit: true, mono: true, color: C.gold2 },
  iqama_expiry: { ar: 'انتهاء الإقامة', en: 'Iqama expiry', w: 130, kind: 'date', edit: true, mono: true },
  _muqeem: { ar: 'ملف مقيم', en: 'Muqeem file', w: 104, kind: 'file', note: 'muqeem' },
  /* التوصيل */
  _iqno: { ar: 'رقم الإقامة', en: 'Iqama no.', w: 146, kind: 'ro', src: 'iqama_number', mono: true, color: C.gold2 },
  _worker: { ar: 'اسم العامل', en: 'Worker', w: 170, kind: 'ro', src: 'worker_name' },
  print_status: { ar: 'طباعة الإقامة', en: 'Iqama print', w: 130, kind: 'select', opts: ST_PRINT, edit: true },
  print_amount: { ar: 'مبلغ الطباعة', en: 'Print amount', w: 120, kind: 'money', edit: true, mono: true },
  delivery_request_no: { ar: 'رقم طلب التوصيل', en: 'Delivery request no.', w: 150, kind: 'text', edit: true, mono: true, color: C.gold2 },
  delivery_date: { ar: 'تاريخ التوصيل', en: 'Delivery date', w: 130, kind: 'date', edit: true, mono: true },
  delivery_status: { ar: 'حالة التوصيل', en: 'Delivery status', w: 136, kind: 'select', opts: ST_DELIV, edit: true },
}

/* ── الأوضاع الثلاثة ───────────────────────────────────────────────────────
   stageOf يقرأ القيم المحفوظة فقط (لا التعديلات المعلّقة). الاكتمال يُفحص
   أولاً كما في جدول التأشيرات: صفوف قديمة كثيرة أُكملت قبل وجود المراحل. */
const WK_COLS = ['_row', '_facility', '_wkpay', 'wakalah_number', 'wakalah_date', 'wakalah_office', 'wakalah_status_id', '_wkfile']
const IQ_DONE_COLS = ['_row', '_facility', 'worker_name', 'iqama_number', 'iqama_expiry', '_muqeem']
const DL_DONE_COLS = ['_row', '_facility', '_iqno', '_worker', 'print_status', 'delivery_request_no', 'delivery_date', 'delivery_status']
const isPermanent = (row) => (row.sr?.service_type?.code || '') !== TEMP_CODE

const MODES = {
  wakalah: {
    tab: 'visa_wakalah_grid',
    waitAr: 'لم تُصدر التأشيرة بعد — تُستكمل من جدول إصدار التأشيرات', waitEn: 'Visa not issued yet — complete it in the visa issuance grid',
    emptyAr: 'لا توجد تأشيرات في هذه المرحلة', emptyEn: 'No visas in this stage',
    stages: [
      { key: 'waiting', ar: 'بانتظار إصدار التأشيرة', en: 'Awaiting visa', c: C.gray, cols: ['_row', '_facility', '_vstate'] },
      { key: 'entry', ar: 'إدخال الوكالة', en: 'Enter PoA', c: C.gold2, cols: WK_COLS },
      { key: 'pending', ar: 'قيد الإصدار', en: 'In progress', c: C.blue, cols: WK_COLS },
      { key: 'done', ar: 'مكتملة', en: 'Completed', c: C.ok, cols: WK_COLS },
    ],
    stageOf: (row, ctx) => {
      if (!row.visa_number && !row.border_number) return 'waiting'
      const code = ctx.wkCode(row.wakalah_status_id)
      if (code === 'accomplished' || (!code && row.wakalah_number && row.wakalah_date)) return 'done'
      if (code === 'rejected') return 'entry'
      if (code === 'pending' || row.wakalah_number || row.wakalah_date || row.wakalah_office) return 'pending'
      return 'entry'
    },
    steps: (row, ctx) => [{ ar: 'الوكالة', en: 'PoA', ok: ctx.stage === 'done' }],
  },
  iqama: {
    tab: 'iqama_grid',
    waitAr: 'بانتظار رقم الحدود — يُدخَل في جدول إصدار التأشيرات', waitEn: 'Awaiting border number — entered in the visa issuance grid',
    emptyAr: 'لا توجد إقامات في هذه المرحلة', emptyEn: 'No iqamas in this stage',
    stages: [
      { key: 'waiting', ar: 'بانتظار إصدار التأشيرة', en: 'Awaiting visa', c: C.gray, cols: ['_row', '_facility', '_vstate'] },
      { key: 'medical', ar: 'الفحص الطبي', en: 'Medical exam', c: C.gold2, cols: ['_row', '_facility', '_iqpay', 'worker_name', 'medical_status', 'medical_amount'] },
      { key: 'insurance', ar: 'التأمين الطبي', en: 'Medical insurance', c: C.blue, cols: ['_row', '_facility', 'ins_expiry', 'ins_amount', 'ins_company', 'ins_policy', '_insfile'] },
      { key: 'work_permit', ar: 'رخصة العمل', en: 'Work permit', c: C.purple, cols: ['_row', '_facility', 'wp_duration', 'wp_expiry', 'wp_amount', '_wpfile'] },
      { key: 'iqama', ar: 'إصدار الإقامة', en: 'Iqama issuance', c: C.warn, cols: ['_row', '_facility', '_iqpay', 'worker_name', 'iqama_number', 'iqama_expiry', '_muqeem'] },
      { key: 'done', ar: 'مكتملة', en: 'Completed', c: C.ok, cols: IQ_DONE_COLS },
    ],
    stageOf: (row) => {
      if (!row.border_number) return 'waiting'
      if (row.iqama_number) return 'done'
      if (row.medical_status !== 'done') return 'medical'
      if (isPermanent(row)) {
        if (!row._ins_done) return 'insurance'
        if (!row._wp_done) return 'work_permit'
      }
      return 'iqama'
    },
    steps: (row) => {
      const s = [{ ar: 'الفحص', en: 'Exam', ok: row.medical_status === 'done' }]
      if (isPermanent(row)) s.push({ ar: 'التأمين', en: 'Insurance', ok: row._ins_done }, { ar: 'الرخصة', en: 'Permit', ok: row._wp_done })
      s.push({ ar: 'الإقامة', en: 'Iqama', ok: !!row.iqama_number })
      return s
    },
  },
  delivery: {
    tab: 'iqama_delivery_grid',
    waitAr: 'بانتظار إصدار الإقامة — تُدخَل في جدول إصدار الإقامات', waitEn: 'Awaiting iqama — entered in the iqama issuance grid',
    emptyAr: 'لا توجد إقامات في هذه المرحلة', emptyEn: 'No iqamas in this stage',
    stages: [
      { key: 'waiting', ar: 'بانتظار إصدار الإقامة', en: 'Awaiting iqama', c: C.gray, cols: ['_row', '_facility', '_worker', '_vstate'] },
      { key: 'print', ar: 'طباعة الإقامة', en: 'Iqama print', c: C.gold2, cols: ['_row', '_facility', '_iqno', '_worker', 'print_status', 'print_amount'] },
      { key: 'delivery', ar: 'توصيل الإقامة', en: 'Iqama delivery', c: C.blue, cols: ['_row', '_facility', '_iqno', '_worker', 'delivery_request_no', 'delivery_date', 'delivery_status'] },
      { key: 'done', ar: 'مكتملة', en: 'Completed', c: C.ok, cols: DL_DONE_COLS },
    ],
    stageOf: (row) => {
      if (!row.iqama_number) return 'waiting'
      if (row.delivery_status === 'done' || row.delivery_date) return 'done'
      if (row.print_status !== 'done') return 'print'
      return 'delivery'
    },
    steps: (row) => [
      { ar: 'الطباعة', en: 'Print', ok: row.print_status === 'done' },
      { ar: 'التوصيل', en: 'Delivery', ok: row.delivery_status === 'done' || !!row.delivery_date },
    ],
  },
}

/* الحقول التي تُكتب على visa_applications؛ الباقي على iqama_issuance_applications */
const VISA_KEYS = new Set(['wakalah_number', 'wakalah_date', 'wakalah_office', 'wakalah_status_id', 'worker_name'])

const IQ_FIELDS = 'id,deleted_at,medical_status,medical_amount,insurance_status,insurance_expiry,insurance_amount,work_permit_status,work_permit_expiry,work_permit_amount,work_permit_duration_months,iqama_status,iqama_number,iqama_expiry,iqama_print_status,iqama_print_amount,iqama_delivery_status,iqama_delivery_date,delivery_request_no,stage_data'
const VISA_SELECT = `
  id, visa_number, border_number, unified_number, gender, file_number,
  visa_issue_date, usage_status_id, main_facility_id, created_at,
  wakalah_number, wakalah_date, wakalah_office, wakalah_status_id, wakalah_file_path, worker_name,
  nationality:nationality_id(id,name_ar,name_en),
  occupation:occupation_id(id,name_ar,name_en),
  embassy:embassy_id(id,name_ar,name_en),
  sr:service_request_id(
    id, request_ref_no, request_date,
    branch:branch_id(id,branch_code),
    client:client_id(id,name_ar,name_en),
    service_type:service_type_id(id,code,value_ar,value_en)
  ),
  iq:iqama_issuance_applications(${IQ_FIELDS})
`

/* ── تسطيح الصفّ: التأشيرة + صفّ إقامتها في كائن واحد بمفاتيح الأعمدة ──────
   القيم المرآة (insurance_expiry…) تُقرأ كاحتياط حين لا يوجد stage_data —
   صفوف مستوردة كثيرة (khb1_import) لها حالة «done» بلا تفاصيل. */
function flatten(v) {
  const iqArr = Array.isArray(v.iq) ? v.iq : (v.iq ? [v.iq] : [])
  const iq = iqArr.find((x) => x && x.deleted_at == null) || null
  const sd = (iq?.stage_data && typeof iq.stage_data === 'object') ? iq.stage_data : {}
  const ins = sd.insurance && typeof sd.insurance === 'object' ? sd.insurance : null
  const wp = sd.work_permit && typeof sd.work_permit === 'object' ? sd.work_permit : null
  const insDone = (!!ins && (doneish(ins.status) || (!!ins.expiry && Number(ins.amount) > 0))) || doneish(iq?.insurance_status)
  const wpDone = (!!wp && (doneish(wp.status) || (!!wp.expiry && Number(wp.amount) > 0))) || doneish(iq?.work_permit_status)
  const st = (s) => (doneish(s) ? 'done' : (s ? 'pending' : null))
  const { iq: _drop, ...rest } = v
  return {
    ...rest, _iq: iq,
    medical_status: st(iq?.medical_status),
    medical_amount: iq?.medical_amount ?? null,
    ins_expiry: ins?.expiry || iq?.insurance_expiry || null,
    ins_amount: ins?.amount ?? iq?.insurance_amount ?? null,
    ins_company: ins?.company || null,
    ins_policy: ins?.policy_no || null,
    _ins_done: insDone,
    wp_duration: wp?.duration_months ?? iq?.work_permit_duration_months ?? null,
    wp_expiry: wp?.expiry || iq?.work_permit_expiry || null,
    wp_amount: wp?.amount ?? iq?.work_permit_amount ?? null,
    _wp_done: wpDone,
    iqama_number: iq?.iqama_number || null,
    iqama_expiry: iq?.iqama_expiry || null,
    print_status: st(iq?.iqama_print_status),
    print_amount: iq?.iqama_print_amount ?? null,
    delivery_status: st(iq?.iqama_delivery_status),
    delivery_request_no: iq?.delivery_request_no || null,
    delivery_date: iq?.iqama_delivery_date || null,
  }
}

/* ── تحويل تعديلات الإقامة المسطّحة إلى patch لجدول iqama_issuance_applications ── */
function buildIqPatch(row, p, user, byName, nowIso) {
  const has = (k) => Object.prototype.hasOwnProperty.call(p, k)
  const out = {}
  const iq = row._iq || {}
  const sd = { ...((iq.stage_data && typeof iq.stage_data === 'object') ? iq.stage_data : {}) }
  let sdChanged = false
  if (has('medical_status')) out.medical_status = p.medical_status
  if (has('medical_amount')) out.medical_amount = p.medical_amount
  if (['ins_expiry', 'ins_amount', 'ins_company', 'ins_policy'].some(has)) {
    const cur = (sd.insurance && typeof sd.insurance === 'object') ? sd.insurance : {}
    const next = {
      ...cur,
      expiry: has('ins_expiry') ? p.ins_expiry : (row.ins_expiry || null),
      amount: has('ins_amount') ? p.ins_amount : (row.ins_amount ?? null),
      company: has('ins_company') ? p.ins_company : (row.ins_company || null),
      policy_no: has('ins_policy') ? p.ins_policy : (row.ins_policy || null),
      by_id: user?.id || null, by_name: byName, at: nowIso,
    }
    const complete = !!next.expiry && Number(next.amount) > 0
    if (complete) next.status = 'done'
    sd.insurance = next; sdChanged = true
    out.insurance_expiry = next.expiry
    out.insurance_amount = next.amount
    out.insurance_status = complete ? 'done' : (doneish(iq.insurance_status) ? 'done' : 'pending')
  }
  if (['wp_duration', 'wp_expiry', 'wp_amount'].some(has)) {
    const cur = (sd.work_permit && typeof sd.work_permit === 'object') ? sd.work_permit : {}
    const next = {
      ...cur,
      duration_months: has('wp_duration') ? p.wp_duration : (row.wp_duration ?? null),
      expiry: has('wp_expiry') ? p.wp_expiry : (row.wp_expiry || null),
      amount: has('wp_amount') ? p.wp_amount : (row.wp_amount ?? null),
      by_id: user?.id || null, by_name: byName, at: nowIso,
    }
    const complete = !!next.duration_months && !!next.expiry && Number(next.amount) > 0
    if (complete) next.status = 'done'
    sd.work_permit = next; sdChanged = true
    out.work_permit_duration_months = next.duration_months
    out.work_permit_expiry = next.expiry
    out.work_permit_amount = next.amount
    out.work_permit_status = complete ? 'done' : (doneish(iq.work_permit_status) ? 'done' : 'pending')
  }
  if (has('iqama_number')) { out.iqama_number = p.iqama_number; out.iqama_status = p.iqama_number ? 'done' : 'pending' }
  if (has('iqama_expiry')) out.iqama_expiry = p.iqama_expiry
  if (has('print_status')) out.iqama_print_status = p.print_status
  if (has('print_amount')) out.iqama_print_amount = p.print_amount
  if (has('delivery_status')) out.iqama_delivery_status = p.delivery_status
  if (has('delivery_request_no')) out.delivery_request_no = p.delivery_request_no
  if (has('delivery_date')) {
    out.iqama_delivery_date = p.delivery_date
    /* تاريخ توصيل بلا حالة = تمّ التوصيل (كما يقرؤه شيت «تسليم الإقامة») */
    if (p.delivery_date && !has('delivery_status')) out.iqama_delivery_status = 'done'
  }
  if (sdChanged) out.stage_data = sd
  out.updated_at = nowIso
  out.updated_by = user?.id || null
  return out
}

function GridSkeleton() {
  const sh = { display: 'block', borderRadius: 5, background: 'linear-gradient(90deg,var(--bd2) 25%,var(--bd) 37%,var(--bd2) 63%)', backgroundSize: '400% 100%', animation: 'pg-sh 1.4s ease infinite' }
  return (
    <div>
      <style>{'@keyframes pg-sh{0%{background-position:100% 0}100%{background-position:-100% 0}}'}</style>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[150, 110, 110, 100, 90].map((w, i) => <span key={i} style={{ ...sh, width: w, height: 28, borderRadius: 8 }} />)}
      </div>
      <div style={{ border: '1px solid var(--bd)', borderRadius: 12, overflow: 'hidden' }}>
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: 16, padding: '14px 14px', borderBottom: '1px solid var(--bd2)' }}>
            {[150, 180, 180, 250].map((w, j) => <span key={j} style={{ ...sh, width: w, height: 12 }} />)}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function VisaPipelineGridPage({ sb, user, toast, lang, onTabChange, mode = 'iqama' }) {
  const isAr = lang !== 'en'
  const T = (a, e) => (isAr ? a : e)
  const canEdit = canPerm(user, 'work_visas.edit')
  const M = MODES[mode] || MODES.iqama

  const [rows, setRows] = useState([])
  const [facilities, setFacilities] = useState([])
  const [statuses, setStatuses] = useState([])      // حالات الوكالة (lookup)
  const [fileAtt, setFileAtt] = useState({})        // note → { visaId → url }
  const [insts, setInsts] = useState({})            // visaId → [installments]
  const [loading, setLoading] = useState(true)

  const [stage, setStage] = useState(M.stages[1].key)
  const [search, setSearch] = useState('')
  const [fBranch, setFBranch] = useState('')
  const [fService, setFService] = useState('')
  const [page, setPage] = useState(0)

  const [edits, setEdits] = useState({})
  const [rowErr, setRowErr] = useState({})
  const [saving, setSaving] = useState(false)

  const [uploading, setUploading] = useState(null)
  const fileInputRef = useRef(null)
  const uploadTargetRef = useRef(null)

  const [anchor, setAnchor] = useState({ r: 0, c: 1 })
  const [head, setHead] = useState({ r: 0, c: 1 })
  const [editing, setEditing] = useState(null)
  const editRef = useRef(null)
  const cellInRef = useRef(null)
  const fbRef = useRef(null)
  const [seq, setSeq] = useState(0)
  const dragRef = useRef(false)
  const fillRef = useRef(null)
  const [fillTo, setFillTo] = useState(null)

  const scrollRef = useRef(null)
  const hdrRef = useRef(null)

  useEffect(() => { onTabChange && onTabChange({ tab: M.tab }) }, [])   // eslint-disable-line react-hooks/exhaustive-deps
  /* تبديل الوضع (نفس المكوّن يُعاد استخدامه لتبويب آخر) يعيد المرحلة الافتراضية */
  useEffect(() => { setStage(M.stages[1].key); setEdits({}); setRowErr({}) }, [mode])   // eslint-disable-line react-hooks/exhaustive-deps

  const stageDef = useMemo(() => M.stages.find((s) => s.key === stage) || M.stages[0], [M, stage])
  const COLS = useMemo(() => stageDef.cols.map((k) => ({ key: k, ...COL_DEFS[k], owns: COL_DEFS[k].owns || (COL_DEFS[k].edit ? [k] : undefined) })), [stageDef])
  const firstEditable = useMemo(() => Math.max(0, COLS.findIndex((c) => c.edit)), [COLS])

  /* ── التحميل ─────────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    if (!sb) return
    setLoading(true)
    const [visaR, facR, catR, attR, instR] = await Promise.all([
      /* range صريح: تأشيرات العمل تجاوزت ٣,٠٠٠ صف وسقف PostgREST الافتراضي ١٠٠٠ */
      sb.from('visa_applications').select(VISA_SELECT).is('deleted_at', null).order('created_at', { ascending: false }).range(0, 9999),
      sb.from('facilities').select('id,name_ar,name_en,unified_number,hrsd_number,gosi_number').is('deleted_at', null).order('name_ar').range(0, 4999),
      sb.from('lookup_categories').select('id').eq('category_key', 'wakalah_status').maybeSingle(),
      sb.from('attachments').select('entity_id,file_url,notes,created_at')
        .eq('entity_type', 'visa_application').in('notes', FILE_NOTES)
        .is('deleted_at', null).order('created_at', { ascending: false }).range(0, 9999),
      /* دفعات التوكيل/الإقامة المرتبطة بتأشيرة — للتحذير فقط، لا قفل */
      sb.from('installments').select('id,visa_application_id,total_amount,paid_amount,notes,payment_milestone:payment_milestone_id(value_ar,value_en)')
        .not('visa_application_id', 'is', null).is('deleted_at', null).range(0, 9999),
    ])
    const list = (visaR.data || []).filter((v) => /^work_visa/.test(v.sr?.service_type?.code || '')).map(flatten)
    list.sort((a, b) => {
      const d = String(b.created_at || '').localeCompare(String(a.created_at || ''))
      if (d) return d
      const s = String(a.sr?.id || '').localeCompare(String(b.sr?.id || ''))
      if (s) return s
      return (a.file_number ?? 99) - (b.file_number ?? 99)
    })
    setRows(list)
    setFacilities(facR.data || [])
    if (catR.data?.id) {
      const { data } = await sb.from('lookup_items').select('id,code,value_ar,value_en,sort_order')
        .eq('category_id', catR.data.id).eq('is_active', true).order('sort_order')
      setStatuses(data || [])
    }
    const att = {}
    for (const a of (attR.data || [])) {
      if (!a.entity_id || !a.notes) continue
      if (!att[a.notes]) att[a.notes] = {}
      if (!att[a.notes][a.entity_id]) att[a.notes][a.entity_id] = a.file_url
    }
    setFileAtt(att)
    const im = {}
    for (const it of (instR.data || [])) { (im[it.visa_application_id] ||= []).push(it) }
    setInsts(im)
    setLoading(false)
  }, [sb])
  useEffect(() => { load() }, [load])

  const facById = useMemo(() => { const m = new Map(); for (const f of facilities) m.set(f.id, f); return m }, [facilities])
  const statusById = useMemo(() => { const m = new Map(); for (const s of statuses) m.set(s.id, s); return m }, [statuses])
  const wkCode = useCallback((id) => statusById.get(id)?.code || null, [statusById])
  const rowById = useMemo(() => { const m = new Map(); for (const r of rows) m.set(r.id, r); return m }, [rows])

  const fieldOf = useCallback((row, key) => {
    const e = edits[row.id]
    if (e && Object.prototype.hasOwnProperty.call(e, key)) return e[key]
    return row[key] ?? null
  }, [edits])
  const facOf = useCallback((row) => facById.get(row.main_facility_id) || null, [facById])

  /* دفعة التأشيرة حسب نوعها: توكيل أو إقامة (نفس تصنيف صفحة الفاتورة) */
  const payOf = useCallback((row, kind) => {
    const list = insts[row.id] || []
    const label = (it) => (it.payment_milestone?.value_ar || '') + ' ' + (it.payment_milestone?.value_en || '') + ' ' + (it.notes || '')
    const it = list.find((x) => (kind === 'auth') === AUTH_RE.test(label(x)))
    if (!it) return null
    const total = Number(it.total_amount || 0), paid = Number(it.paid_amount || 0)
    const state = total - paid <= 0.005 ? 'paid' : paid > 0 ? 'partial' : 'pending'
    return { state, total, paid }
  }, [insts])

  /* ── إسناد المرحلة (قيم محفوظة فقط) ─────────────────────────────────── */
  const stageOf = useCallback((row) => M.stageOf(row, { wkCode }), [M, wkCode])

  /* ── الفلترة ─────────────────────────────────────────────────────────── */
  const branchOpts = useMemo(() => {
    const s = new Set()
    for (const r of rows) { const b = r.sr?.branch?.branch_code; if (b) s.add(b) }
    return [...s].sort()
  }, [rows])
  const serviceOpts = useMemo(() => {
    const m = new Map()
    for (const r of rows) { const s = r.sr?.service_type; if (s?.code && !m.has(s.code)) m.set(s.code, s.value_ar || s.code) }
    return [...m.entries()]
  }, [rows])

  const preStage = useMemo(() => rows.filter((r) => {
    if (fService && r.sr?.service_type?.code !== fService) return false
    if (fBranch && r.sr?.branch?.branch_code !== fBranch) return false
    if (search.trim()) {
      const s = latin(search).trim().toLowerCase()
      const fac = facById.get(r.main_facility_id)
      const hay = [r.visa_number, r.border_number, r.unified_number, r.worker_name,
        r.wakalah_number, r.iqama_number, r.delivery_request_no,
        r.sr?.request_ref_no, r.sr?.branch?.branch_code, r.sr?.client?.name_ar,
        r.nationality?.name_ar, r.occupation?.name_ar, r.embassy?.name_ar,
        fac?.name_ar, fac?.unified_number, fac?.hrsd_number, fac?.gosi_number]
      if (!hay.some((v) => String(v || '').toLowerCase().includes(s))) return false
    }
    return true
  }), [rows, fService, fBranch, search, facById])

  const stageCounts = useMemo(() => {
    const m = {}
    for (const s of M.stages) m[s.key] = 0
    for (const r of preStage) m[stageOf(r)]++
    return m
  }, [M, preStage, stageOf])

  const filtered = useMemo(() => preStage.filter((r) => stageOf(r) === stage), [preStage, stageOf, stage])

  /* ── الكتل: فاتورة واحدة = سطر عنوان + تأشيراتها ────────────────────── */
  const blocks = useMemo(() => {
    const out = []
    let cur = null
    for (const r of filtered) {
      const sid = r.sr?.id || r.id
      if (!cur || cur.sid !== sid) { cur = { sid, sr: r.sr, sample: r, rows: [] }; out.push(cur) }
      cur.rows.push(r)
    }
    return out
  }, [filtered])

  const pages = useMemo(() => {
    const out = []
    let cur = [], n = 0
    for (const b of blocks) {
      if (n > 0 && n + b.rows.length > PAGE_ROWS) { out.push(cur); cur = []; n = 0 }
      cur.push(b); n += b.rows.length
    }
    if (cur.length) out.push(cur)
    return out.length ? out : [[]]
  }, [blocks])

  const totalPages = pages.length
  const pageSafe = Math.min(page, totalPages - 1)
  const pageBlocks = pages[pageSafe] || []
  const view = useMemo(() => pageBlocks.flatMap((b) => b.rows), [pageBlocks])
  const rowIndex = useMemo(() => { const m = new Map(); view.forEach((r, i) => m.set(r.id, i)); return m }, [view])
  const firstNo = useMemo(() => pages.slice(0, pageSafe).reduce((a, p) => a + p.reduce((x, b) => x + b.rows.length, 0), 0) + 1, [pages, pageSafe])

  const filterKey = `${mode}|${stage}|${fService}|${fBranch}|${search}`
  useEffect(() => { setPage(0) }, [filterKey])
  useEffect(() => {
    setAnchor({ r: 0, c: firstEditable }); setHead({ r: 0, c: firstEditable })
    editRef.current = null; setEditing(null)
  }, [pageSafe, filterKey, firstEditable])

  /* ── هندسة الشبكة ────────────────────────────────────────────────────── */
  const [widthMap, setWidthMap] = useState({})
  const resizeRef = useRef(null)
  const widths = useMemo(() => COLS.map((c) => widthMap[c.key] ?? c.w), [COLS, widthMap])
  const totalW = useMemo(() => widths.reduce((a, b) => a + b, 0), [widths])
  const tmpl = useMemo(() => widths.map((w, i) => (i === widths.length - 1 ? `minmax(${w}px,1fr)` : `${w}px`)).join(' '), [widths])

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

  useEffect(() => {
    const el = scrollRef.current
    if (!el || editing) return
    const cell = el.querySelector('[data-active="1"]')
    if (cell) cell.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [head, editing])

  /* ── تحويل النص إلى تعديل ───────────────────────────────────────────── */
  const coercePatch = useCallback((col, text) => {
    const s = String(text ?? '').trim()
    switch (col.kind) {
      case 'text': {
        const v = col.mono ? latin(s).trim() : s
        if (!v) return { [col.key]: null }
        const re = FMT[col.key]
        return (re && !re.test(v)) ? undefined : { [col.key]: v }
      }
      case 'date': { const d = parseDate(s); return d === undefined ? undefined : { [col.key]: d } }
      case 'money': {
        const v = latin(s).replace(/[,\s]/g, '')
        if (!v) return { [col.key]: null }
        const n = Number(v)
        return (!Number.isFinite(n) || n < 0) ? undefined : { [col.key]: n }
      }
      case 'select': {
        if (!s) return { [col.key]: null }
        const low = latin(s).toLowerCase()
        const hit = (col.opts || []).find((o) => String(o.v) === low || o.ar === s || o.en.toLowerCase() === low)
        return hit ? { [col.key]: hit.v } : undefined
      }
      case 'lookup': {
        if (!s) return { [col.key]: null }
        const low = s.toLowerCase()
        const hit = statuses.find((o) => o.value_ar === s || (o.value_en || '').toLowerCase() === low || (o.code || '').toLowerCase() === low)
        return hit ? { [col.key]: hit.id } : undefined
      }
      default: return undefined
    }
  }, [statuses])

  const dispOf = useCallback((row, col) => {
    if (!row || !col) return ''
    switch (col.kind) {
      case 'facname': return facOf(row)?.name_ar || facOf(row)?.name_en || ''
      case 'text': { const v = fieldOf(row, col.key); return v == null ? '' : String(v) }
      case 'ro': { const v = row[col.src]; return v == null ? '' : String(v) }
      case 'date': return ymd(fieldOf(row, col.key))
      case 'money': { const v = fieldOf(row, col.key); return v == null || v === '' ? '' : enNum(v) }
      case 'select': { const v = fieldOf(row, col.key); const o = (col.opts || []).find((x) => String(x.v) === String(v)); return o ? (isAr ? o.ar : o.en) : (v == null ? '' : String(v)) }
      case 'lookup': { const s = statusById.get(fieldOf(row, col.key)); return s ? (isAr ? s.value_ar : (s.value_en || s.value_ar)) : '' }
      case 'vstate': return isAr ? M.waitAr : M.waitEn
      default: return ''
    }
  }, [fieldOf, facOf, statusById, isAr, M])

  const invalidMsg = useCallback((col) => {
    if (col.key === 'iqama_number') return T('رقم الإقامة يبدأ بـ2 ويكون 10 أرقام', 'Iqama number must start with 2 and be 10 digits')
    if (col.kind === 'date') return T('تاريخ غير مفهوم — اكتبه YYYY-MM-DD', 'Unrecognized date — use YYYY-MM-DD')
    if (col.kind === 'money') return T('المبلغ يجب أن يكون رقماً', 'Amount must be a number')
    if (col.kind === 'select' || col.kind === 'lookup') return T('اختر قيمة من القائمة', 'Pick a value from the list')
    return T('قيمة غير صالحة — لم تُحفظ', 'Invalid value — not applied')
  }, [T])

  /* ── تفرّد رقم الإقامة (كما رقم الحدود في جدول التأشيرات) ────────────── */
  const iqDup = useMemo(() => {
    const seen = new Map(), dup = new Set()
    for (const r of rows) {
      const e = edits[r.id]
      const b = String((e && Object.prototype.hasOwnProperty.call(e, 'iqama_number') ? e.iqama_number : r.iqama_number) || '').trim()
      if (!b) continue
      if (seen.has(b)) { dup.add(r.id); dup.add(seen.get(b)) } else seen.set(b, r.id)
    }
    return dup
  }, [rows, edits])

  const isDirty = useCallback((row, col) => {
    const e = edits[row.id]
    if (!e || !col.owns) return false
    return col.owns.some((k) => Object.prototype.hasOwnProperty.call(e, k))
  }, [edits])

  const writeCells = useCallback((cells) => {
    if (!canEdit || !cells.length) return { ok: 0, bad: 0 }
    const applied = []
    let bad = 0
    for (const { row, col, text } of cells) {
      if (!col.edit) continue
      const patch = coercePatch(col, text)
      if (patch === undefined) { bad++; continue }
      applied.push({ row, patch })
    }
    if (applied.length) {
      setEdits((prev) => {
        const next = { ...prev }
        for (const { row, patch } of applied) {
          const cur = { ...(next[row.id] || {}) }
          for (const [k, val] of Object.entries(patch)) {
            const original = row[k] ?? null
            const same = (original == null && val == null) || String(original ?? '') === String(val ?? '')
            if (same) delete cur[k]; else cur[k] = val
          }
          if (Object.keys(cur).length) next[row.id] = cur; else delete next[row.id]
        }
        return next
      })
      setRowErr((prev) => { const n = { ...prev }; for (const { row } of applied) delete n[row.id]; return n })
    }
    return { ok: applied.length, bad }
  }, [canEdit, coercePatch])

  /* ── التحرير ─────────────────────────────────────────────────────────── */
  const move = useCallback((dr, dc, extend) => {
    const r = Math.max(0, Math.min(view.length - 1, head.r + dr))
    const c = Math.max(0, Math.min(COLS.length - 1, head.c + dc))
    setHead({ r, c })
    if (!extend) setAnchor({ r, c })
  }, [view.length, COLS.length, head])

  const beginEdit = useCallback((r, c, seed) => {
    const col = COLS[c]
    if (!col?.edit || !canEdit || !view[r]) return
    const ed = { r, c, src: 'cell', seed }
    editRef.current = ed
    setEditing(ed)
  }, [canEdit, view, COLS])

  const cancelEdit = useCallback(() => { editRef.current = null; setEditing(null); setSeq((s) => s + 1) }, [])

  const commitEdit = useCallback((moveDir, overrideText) => {
    const ed = editRef.current
    editRef.current = null
    if (ed) {
      const el = ed.src === 'fb' ? fbRef.current : cellInRef.current
      const text = overrideText != null ? overrideText : (el ? el.value : '')
      const row = view[ed.r], col = COLS[ed.c]
      setEditing(null); setSeq((s) => s + 1)
      if (row && col) {
        const { bad } = writeCells([{ row, col, text }])
        if (bad) toast && toast(invalidMsg(col))
      }
    } else setEditing(null)
    if (moveDir) move(moveDir[0], moveDir[1], false)
  }, [view, COLS, writeCells, move, toast, invalidMsg])

  /* ── العمليات ────────────────────────────────────────────────────────── */
  const doCopy = useCallback(async () => {
    const lines = []
    for (let r = range.r1; r <= range.r2; r++) {
      const row = view[r]; if (!row) continue
      const cells = []
      for (let c = range.c1; c <= range.c2; c++) cells.push(dispOf(row, COLS[c]))
      lines.push(cells.join('\t'))
    }
    try { await navigator.clipboard.writeText(lines.join('\n')); toast && toast(T('تم النسخ', 'Copied')) } catch { /* تجاهل */ }
  }, [range, view, COLS, dispOf, toast, T])

  const doClear = useCallback(() => {
    const cells = []
    for (let r = range.r1; r <= range.r2; r++) {
      const row = view[r]; if (!row) continue
      for (let c = range.c1; c <= range.c2; c++) { const col = COLS[c]; if (col.edit) cells.push({ row, col, text: '' }) }
    }
    if (cells.length) writeCells(cells)
  }, [range, view, COLS, writeCells])

  const doFillDown = useCallback(() => {
    if (range.r2 <= range.r1) return
    const src = view[range.r1]; if (!src) return
    const cells = []
    for (let c = range.c1; c <= range.c2; c++) {
      const col = COLS[c]; if (!col.edit) continue
      const text = dispOf(src, col)
      for (let r = range.r1 + 1; r <= range.r2; r++) { const row = view[r]; if (row) cells.push({ row, col, text }) }
    }
    const { ok } = writeCells(cells)
    if (ok) toast && toast(T(`تمت تعبئة ${ok} خلية`, `Filled ${ok} cells`))
  }, [range, view, COLS, dispOf, writeCells, toast, T])

  const applyFillDrag = useCallback((toRow) => {
    const from = range.r2, dir = toRow > from ? 1 : -1
    if (toRow === from) return
    const cells = []
    for (let c = range.c1; c <= range.c2; c++) {
      const col = COLS[c]; if (!col.edit) continue
      const src = view[dir > 0 ? range.r2 : range.r1]; if (!src) continue
      const text = dispOf(src, col)
      for (let r = from + dir; dir > 0 ? r <= toRow : r >= toRow; r += dir) { const row = view[r]; if (row) cells.push({ row, col, text }) }
    }
    const { ok } = writeCells(cells)
    if (ok) toast && toast(T(`تمت تعبئة ${ok} خلية`, `Filled ${ok} cells`))
  }, [range, view, COLS, dispOf, writeCells, toast, T])

  const onPaste = useCallback((e) => {
    if (!canEdit) return
    const text = e.clipboardData?.getData('text/plain')
    if (!text) return
    e.preventDefault()
    const matrix = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n$/, '').split('\n').map((l) => l.split('\t'))
    const cells = []
    let skippedRO = 0, overflowRows = 0
    for (let i = 0; i < matrix.length; i++) {
      const row = view[range.r1 + i]
      if (!row) { overflowRows = matrix.length - i; break }
      for (let j = 0; j < matrix[i].length; j++) {
        const col = COLS[range.c1 + j]
        if (!col) break
        if (!col.edit) { skippedRO++; continue }
        cells.push({ row, col, text: matrix[i][j] })
      }
    }
    const { ok, bad } = writeCells(cells)
    setHead({ r: Math.min(view.length - 1, range.r1 + matrix.length - 1), c: Math.min(COLS.length - 1, range.c1 + Math.max(...matrix.map((m) => m.length)) - 1) })
    const parts = [T(`لُصقت ${ok} خلية`, `Pasted ${ok} cells`)]
    if (bad) parts.push(T(`${bad} قيمة مرفوضة`, `${bad} rejected`))
    if (skippedRO) parts.push(T(`${skippedRO} للقراءة فقط`, `${skippedRO} read-only`))
    if (overflowRows) parts.push(T(`⚠ ${overflowRows} سطراً تجاوزت نهاية الصفحة ولم تُلصق`, `⚠ ${overflowRows} rows past page end not pasted`))
    toast && toast(parts.join(' · '))
  }, [canEdit, view, COLS, range, writeCells, toast, T])

  const onKeyDown = useCallback((e) => {
    if (editing) return
    const k = e.key
    const ctrl = e.ctrlKey || e.metaKey
    const maxR = view.length - 1, maxC = COLS.length - 1
    if (ctrl && (k === 'c' || k === 'C')) { e.preventDefault(); doCopy(); return }
    if (ctrl && (k === 'd' || k === 'D')) { e.preventDefault(); doFillDown(); return }
    if (ctrl && (k === 'a' || k === 'A')) { e.preventDefault(); setAnchor({ r: 0, c: 0 }); setHead({ r: maxR, c: maxC }); return }
    switch (k) {
      case 'ArrowUp': e.preventDefault(); move(-1, 0, e.shiftKey); return
      case 'ArrowDown': e.preventDefault(); move(1, 0, e.shiftKey); return
      case 'ArrowRight': e.preventDefault(); move(0, isAr ? -1 : 1, e.shiftKey); return
      case 'ArrowLeft': e.preventDefault(); move(0, isAr ? 1 : -1, e.shiftKey); return
      case 'Home': e.preventDefault(); setHead((h) => ({ ...h, c: 0 })); if (!e.shiftKey) setAnchor((a) => ({ ...a, c: 0 })); return
      case 'End': e.preventDefault(); setHead((h) => ({ ...h, c: maxC })); if (!e.shiftKey) setAnchor((a) => ({ ...a, c: maxC })); return
      case 'Tab': e.preventDefault(); move(0, e.shiftKey ? -1 : 1, false); return
      case 'Enter': e.preventDefault(); move(e.shiftKey ? -1 : 1, 0, false); return
      case 'F2': e.preventDefault(); beginEdit(head.r, head.c); return
      case 'Escape': e.preventDefault(); setAnchor(head); return
      case 'Delete': case 'Backspace': e.preventDefault(); doClear(); return
      default: break
    }
    if (!ctrl && !e.altKey && k.length === 1) { e.preventDefault(); beginEdit(head.r, head.c, k) }
  }, [editing, view.length, COLS.length, head, isAr, move, doCopy, doFillDown, doClear, beginEdit])

  /* ── الحفظ ───────────────────────────────────────────────────────────── */
  const dirtyCount = useMemo(() => Object.values(edits).reduce((a, o) => a + Object.keys(o).length, 0), [edits])
  const dirtyRowCount = Object.keys(edits).length

  const save = useCallback(async () => {
    if (!sb || saving || !dirtyRowCount) return
    setSaving(true)
    const entries = Object.entries(edits)
    const nowIso = new Date().toISOString()
    const byName = user?.person?.name_ar || user?.person?.name_en || null
    const errs = {}, saved = []
    /* تفرّد رقم الإقامة قبل أي كتابة: المكرّر داخل الجدول يُرفض فوراً، والباقي
       يُفحص في القاعدة (قد يكون على إقامة لا يعرضها هذا الطابور). */
    const dupMsg = T('رقم الإقامة مستخدَم مسبقاً على تأشيرة أخرى', 'Iqama number is already used on another visa')
    const blocked = new Set()
    const wantIq = new Map()
    for (const [id, patch] of entries) {
      if (!Object.prototype.hasOwnProperty.call(patch, 'iqama_number')) continue
      if (iqDup.has(id)) { errs[id] = dupMsg; blocked.add(id); continue }
      const b = String(patch.iqama_number || '').trim()
      if (b) wantIq.set(b, id)
    }
    if (wantIq.size) {
      const ids = [...new Set(wantIq.values())]
      let q = sb.from('iqama_issuance_applications').select('visa_application_id,iqama_number').in('iqama_number', [...wantIq.keys()]).is('deleted_at', null)
      if (ids.length) q = q.not('visa_application_id', 'in', `(${ids.join(',')})`)
      const { data: clash } = await q
      for (const c of (clash || [])) {
        const id = wantIq.get(String(c.iqama_number || '').trim())
        if (id) { errs[id] = dupMsg; blocked.add(id) }
      }
    }
    const todo = entries.filter(([id]) => !blocked.has(id))
    for (let i = 0; i < todo.length; i += SAVE_CONCURRENCY) {
      await Promise.all(todo.slice(i, i + SAVE_CONCURRENCY).map(async ([id, patch]) => {
        const row = rowById.get(id)
        if (!row) return
        const visa = {}, iq = {}
        for (const [k, v] of Object.entries(patch)) { if (VISA_KEYS.has(k)) visa[k] = v; else iq[k] = v }
        try {
          if (Object.keys(visa).length) {
            const { error } = await sb.from('visa_applications').update({ ...visa, updated_by: user?.id || null, updated_at: nowIso }).eq('id', id)
            if (error) throw new Error(error.message)
          }
          let newIq = null
          if (Object.keys(iq).length) {
            const body = buildIqPatch(row, iq, user, byName, nowIso)
            if (row._iq?.id) {
              const { data, error } = await sb.from('iqama_issuance_applications').update(body).eq('id', row._iq.id).select(IQ_FIELDS).single()
              if (error) throw new Error(error.message)
              newIq = data
            } else {
              /* صفّ الإقامة يُنشأ عند أول كتابة — كما تفعل نافذة التأمين/رخصة العمل في الفاتورة */
              const { data, error } = await sb.from('iqama_issuance_applications').insert({
                service_request_id: row.sr?.id || null,
                visa_application_id: row.id,
                main_facility_id: row.main_facility_id || null,
                created_by: user?.id || null,
                medical_status: 'pending',
                ...body,
              }).select(IQ_FIELDS).single()
              if (error) throw new Error(error.message)
              newIq = data
            }
          }
          saved.push([id, visa, newIq])
        } catch (e) { errs[id] = e.message || String(e) }
      }))
    }
    if (saved.length) {
      const m = new Map(saved.map(([id, visa, iq]) => [id, { visa, iq }]))
      setRows((rs) => rs.map((r) => {
        const s = m.get(r.id)
        if (!s) return r
        return flatten({ ...r, ...s.visa, iq: s.iq || r._iq })
      }))
      setEdits((prev) => { const n = { ...prev }; for (const [id] of saved) delete n[id]; return n })
    }
    setRowErr(errs); setSaving(false); setSeq((s) => s + 1)
    const failed = Object.keys(errs).length
    toast && toast(failed
      ? T(`حُفظ ${saved.length} سطراً · فشل ${failed}`, `Saved ${saved.length} · ${failed} failed`)
      : T(`تم حفظ ${saved.length} سطراً`, `Saved ${saved.length} rows`))
  }, [sb, saving, dirtyRowCount, edits, user, toast, T, iqDup, rowById])

  const discard = useCallback(() => { setEdits({}); setRowErr({}); setSeq((s) => s + 1) }, [])

  useEffect(() => {
    if (!dirtyCount) return
    const h = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirtyCount])

  /* ── رفع ملفات المراحل ───────────────────────────────────────────────── */
  const pickFile = useCallback((row, col) => {
    if (!canEdit) return
    uploadTargetRef.current = { row, col }
    if (fileInputRef.current) { fileInputRef.current.value = ''; fileInputRef.current.click() }
  }, [canEdit])

  const onFileChosen = useCallback(async (e) => {
    const file = e.target.files?.[0]
    const tgt = uploadTargetRef.current
    if (!file || !tgt || !sb) return
    const { row, col } = tgt
    setUploading(row.id + '|' + col.key)
    try {
      const safe = (file.name || col.note).replace(/[^\w.\-]+/g, '_')
      const path = `visa-applications/${row.id}/${col.note}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${safe}`
      const { error: upErr } = await sb.storage.from('attachments').upload(path, file, { cacheControl: '3600', upsert: false })
      if (upErr) throw new Error(upErr.message)
      const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
      const url = pub?.publicUrl || path
      const { error } = await sb.from('attachments').insert({
        entity_type: 'visa_application', entity_id: row.id,
        file_name: file.name, file_url: url, storage_path: path,
        mime_type: file.type || null, size_bytes: file.size || null,
        notes: col.note, uploaded_by: user?.id || null,
      })
      if (error) throw new Error(error.message)
      if (col.pathKey) {
        const { error: e2 } = await sb.from('visa_applications').update({ [col.pathKey]: url, updated_by: user?.id || null }).eq('id', row.id)
        if (e2) throw new Error(e2.message)
        setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, [col.pathKey]: url } : r)))
      }
      setFileAtt((m) => ({ ...m, [col.note]: { ...(m[col.note] || {}), [row.id]: url } }))
      toast && toast(T('تم رفع الملف', 'File uploaded'))
    } catch (err) {
      toast && toast(T('فشل الرفع: ' + (err.message || err), 'Upload failed: ' + (err.message || err)))
    } finally { setUploading(null); uploadTargetRef.current = null }
  }, [sb, user, toast, T])

  /* ── سحب العرض + إنهاء سحب التعبئة ───────────────────────────────────── */
  useEffect(() => {
    const onMove = (ev) => {
      const rz = resizeRef.current; if (!rz) return
      const dx = (isAr ? -1 : 1) * (ev.clientX - rz.x0)
      setWidthMap((w) => ({ ...w, [rz.key]: Math.max(80, rz.w0 + dx) }))
    }
    const onUp = () => {
      resizeRef.current = null; dragRef.current = false
      if (fillRef.current != null) { const to = fillRef.current; fillRef.current = null; setFillTo(null); applyFillDrag(to) }
    }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [isAr, applyFillDrag])

  /* ═══ العرض ═══ */
  if (loading) return <div style={{ fontFamily: F }}><GridSkeleton /></div>

  const cellBase = {
    height: ROW_H, display: 'flex', alignItems: 'center', padding: '0 10px', position: 'relative',
    borderInlineEnd: '1px solid var(--bd2)', borderBottom: '1px solid var(--bd2)',
    fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    boxSizing: 'border-box', userSelect: 'none',
  }
  const activeCol = COLS[head.c], activeRow = view[head.r]
  const fbEditable = !!(activeCol?.edit && canEdit && activeRow)

  return (
    <div style={{ fontFamily: F }}>
      <style>{`
        .pg-hdrwrap{overflow:hidden;border:1px solid var(--bd);border-bottom:none;border-radius:12px 12px 0 0;background:var(--hd)}
        .pg-scroll{overflow-x:auto;overflow-y:hidden;border:1px solid var(--bd);border-top:none;
          border-radius:0 0 12px 12px;background:var(--card-grad2);outline:none}
        .pg-scroll::-webkit-scrollbar{height:10px}
        .pg-scroll::-webkit-scrollbar-thumb{background:rgba(176,125,0,.45);border-radius:5px}
        .pg-scroll{scrollbar-width:thin;scrollbar-color:rgba(176,125,0,.45) transparent}
        .pg-hdr-cell{position:relative;height:${COL_H}px;display:flex;align-items:center;justify-content:center;
          padding:0 8px;font-size:12.5px;font-weight:600;color:var(--hdtx);background:var(--hd);
          border-inline-end:1px solid var(--bd);box-shadow:inset 0 -2px 0 rgba(176,125,0,.55);
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-sizing:border-box;user-select:none}
        .pg-grip{position:absolute;inset-inline-start:-3px;top:0;bottom:0;width:6px;cursor:col-resize;z-index:8}
        .pg-row:hover .pg-cell{background-color:rgba(176,125,0,.05)}
        .pg-in{width:100%;height:100%;background:transparent;border:none;outline:none;font-family:${F};font-size:12.5px;padding:0;box-sizing:border-box}
        .pg-btn{height:36px;padding:0 13px;border-radius:9px;border:1px solid transparent;cursor:pointer;
          font-family:${F};font-size:12.5px;font-weight:600;display:inline-flex;align-items:center;gap:7px;
          background:var(--search-bg);color:var(--tx2);transition:.15s;box-sizing:border-box;flex-shrink:0;white-space:nowrap}
        .pg-btn:hover:not(:disabled){background:var(--accent-soft);color:var(--accent);border-color:var(--accent-bd)}
        .pg-btn:disabled{opacity:.4;cursor:not-allowed}
        .pg-btn.pri{background:${C.gold};color:#000;border-color:${C.gold}}
        .pg-btn.pri:hover:not(:disabled){filter:brightness(1.12);background:${C.gold};color:#000}
        .pg-cellbtn{height:26px;padding:0 10px;border-radius:7px;border:1px solid;cursor:pointer;
          font-family:${F};font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
        .pg-stage{padding:7px 14px;border-radius:9px;font-size:12.5px;font-weight:600;cursor:pointer;
          font-family:${F};border:1px solid transparent;background:var(--search-bg);color:var(--tx3);
          display:inline-flex;align-items:center;gap:8px;transition:.15s;flex-shrink:0}
        .pg-stage:hover{color:var(--tx)}
        .pg-pg{width:32px;height:32px;border-radius:8px;background:var(--search-bg);border:none;color:${C.gold2};
          cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
        .pg-pg:hover:not(:disabled){background:${C.gold};color:#000}
        .pg-pg:disabled{color:var(--tx4);cursor:not-allowed;opacity:.5}
        .pg-fh{position:absolute;width:9px;height:9px;background:${C.gold};border:1px solid var(--bg);
          cursor:crosshair;z-index:5;bottom:-5px;inset-inline-start:-5px}
      `}</style>

      <input ref={fileInputRef} type="file" accept="application/pdf,image/*" style={{ display: 'none' }} onChange={onFileChosen} />

      {/* ── المراحل ── */}
      <div style={{ display: 'flex', gap: 7, marginBottom: 11, flexWrap: 'wrap' }}>
        {M.stages.map((s) => {
          const on = s.key === stage
          return (
            <button key={s.key} type="button" className="pg-stage" onClick={() => setStage(s.key)}
              style={on ? { background: s.c + '22', borderColor: s.c + '66', color: s.c } : undefined}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.c, opacity: on ? 1 : .45 }} />
              {isAr ? s.ar : s.en}
              <span style={{ fontFamily: MONO, direction: 'ltr', fontSize: 11.5, opacity: on ? 1 : .65 }}>{enNum(stageCounts[s.key])}</span>
            </button>
          )
        })}
      </div>

      {/* ── الأدوات ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px', position: 'relative', minWidth: 190 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            style={{ position: 'absolute', top: '50%', insetInlineStart: 13, transform: 'translateY(-50%)', color: 'var(--tx4)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={T('ابحث بالتأشيرة، الحدود، الإقامة، الوكالة، العامل، المرجع، العميل، المنشأة…', 'Search visa, border, iqama, PoA, worker, ref, client, facility…')}
            style={{ width: '100%', height: 36, padding: '0 36px 0 12px', borderRadius: 9, background: 'var(--search-bg)', border: '1px solid transparent', color: 'var(--tx)', fontSize: 12.5, fontFamily: F, boxSizing: 'border-box', outline: 'none' }} />
        </div>
        <select value={fBranch} onChange={(e) => setFBranch(e.target.value)} style={selCss}>
          <option value="">{T('كل المكاتب', 'All offices')}</option>
          {branchOpts.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={fService} onChange={(e) => setFService(e.target.value)} style={selCss}>
          <option value="">{T('كل الخدمات', 'All services')}</option>
          {serviceOpts.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select>
      </div>

      {!canEdit && (
        <div style={{ marginBottom: 10, padding: '9px 13px', borderRadius: 9, background: 'rgba(232,114,101,.08)', border: '1px solid rgba(232,114,101,.28)', color: C.red, fontSize: 12.5, fontWeight: 600 }}>
          {T('ليس لديك صلاحية تعديل التأشيرات — الجدول للعرض فقط.', 'You lack visa edit permission — this grid is read-only.')}
        </div>
      )}

      {/* ── شريط الصيغة ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
        <span style={{ fontSize: 11.5, fontFamily: MONO, fontWeight: 600, color: C.gold2, background: 'var(--accent-soft)',
          border: '1px solid var(--accent-bd)', padding: '6px 11px', borderRadius: 7, whiteSpace: 'nowrap', flexShrink: 0 }}>
          R{activeRow ? firstNo + head.r : 0}
          <span style={{ fontFamily: F, marginInlineStart: 7, opacity: .85 }}>{activeCol ? (isAr ? activeCol.ar : activeCol.en) : ''}</span>
        </span>
        <input key={`fb-${mode}-${stage}-${pageSafe}-${head.r}-${head.c}-${seq}`} ref={fbRef}
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

      {/* ── الشبكة ── */}
      <div style={{ position: 'relative' }}>
        <div ref={hdrRef} className="pg-hdrwrap" style={{ position: 'sticky', top: 0, zIndex: 6 }}>
          <div style={{ display: 'grid', gridTemplateColumns: tmpl, minWidth: totalW }}>
            {COLS.map((col, i) => (
              <div key={col.key} className="pg-hdr-cell" title={isAr ? col.ar : col.en}>
                {col.edit && <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.gold2, marginInlineEnd: 6, flexShrink: 0 }} />}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{isAr ? col.ar : col.en}</span>
                {i > 0 && <span className="pg-grip" onMouseDown={(e) => { e.preventDefault(); resizeRef.current = { key: col.key, x0: e.clientX, w0: widths[i] } }} />}
              </div>
            ))}
          </div>
        </div>

        <div ref={scrollRef} className="pg-scroll" tabIndex={0} onKeyDown={onKeyDown} onPaste={onPaste}
          onScroll={(e) => { if (hdrRef.current) hdrRef.current.scrollLeft = e.currentTarget.scrollLeft }}>
          <div style={{ minWidth: totalW }}>
            {pageBlocks.map((b) => {
              const sr = b.sr, s0 = b.sample
              const fileSet = new Set(b.rows.map((x) => x.file_number ?? '-'))
              return (
                <div key={b.sid}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: HEAD_H, padding: '0 12px',
                    background: 'var(--bd2)', borderBottom: '1px solid var(--bd)', borderTop: '2px solid var(--bd)',
                    borderInlineStart: `3px solid ${C.gold}`, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    <span style={{ fontFamily: MONO, direction: 'ltr', fontWeight: 600, fontSize: 12.5, color: C.gold2, flexShrink: 0 }}>{sr?.request_ref_no || '—'}</span>
                    <span style={{ fontFamily: MONO, direction: 'ltr', fontSize: 11, color: 'var(--tx4)', flexShrink: 0 }}>{sr?.branch?.branch_code || ''}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--tx3)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {[sr?.service_type?.value_ar, sr?.client?.name_ar || sr?.client?.name_en,
                        s0.nationality?.name_ar, GENDER_AR[s0.gender], s0.occupation?.name_ar, s0.embassy?.name_ar]
                        .filter(Boolean).join(' · ')}
                    </span>
                    <span style={{ marginInlineStart: 'auto', fontSize: 11, fontWeight: 600, color: C.gold, flexShrink: 0 }}>
                      {b.rows.length} {T('تأشيرة', 'visas')} · {fileSet.size} {fileSet.size === 1 ? T('ملف', 'file') : T('ملفات', 'files')}
                    </span>
                  </div>

                  {b.rows.map((row) => {
                    const r = rowIndex.get(row.id)
                    const err = rowErr[row.id] || (iqDup.has(row.id)
                      ? T('رقم الإقامة مكرّر — يجب أن يكون فريداً', 'Iqama number is duplicated — it must be unique') : null)
                    return (
                      <div key={row.id} className="pg-row" style={{ display: 'grid', gridTemplateColumns: tmpl, minWidth: totalW }}>
                        {COLS.map((col, c) => {
                          const active = head.r === r && head.c === c
                          const sel = inRange(r, c)
                          const fill = inFill(r, c)
                          const dirty = isDirty(row, col)
                          const isEditing = editing && editing.r === r && editing.c === c && editing.src === 'cell'
                          const txt = dispOf(row, col)

                          let bg = col.edit ? 'rgba(176,125,0,.045)' : 'transparent'
                          if (dirty) bg = 'rgba(176,125,0,.2)'
                          if (sel && !active) bg = 'rgba(176,125,0,.12)'
                          if (fill) bg = 'rgba(176,125,0,.08)'
                          if (err && col.edit) bg = 'rgba(232,114,101,.14)'

                          const centered = col.mono || col.kind === 'pay' || col.kind === 'file' || col.kind === 'select' || col.kind === 'lookup' || (col.edit && txt === '')
                          const style = {
                            ...cellBase, background: bg,
                            color: col.color || 'var(--tx)',
                            fontWeight: col.mono ? 600 : 500,
                            fontFamily: col.mono ? MONO : F,
                            direction: col.mono ? 'ltr' : undefined,
                            justifyContent: centered ? 'center' : 'flex-start',
                            cursor: col.edit && canEdit ? 'cell' : 'default',
                          }
                          if (active) style.boxShadow = `inset 0 0 0 2px ${C.gold2}`

                          let content = txt
                          if (col.kind === 'rownum') {
                            const steps = M.steps(row, { stage: stageOf(row) })
                            const n = steps.filter((s) => s.ok).length
                            content = (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                                <span style={{ width: 5, height: ROW_H - 14, borderRadius: 2, background: fileColor(row.file_number), flexShrink: 0 }} />
                                <span style={{ fontSize: 11.5, color: 'var(--tx3)', fontWeight: 600 }}>
                                  {T('ملف', 'File')} {row.file_number ?? '—'}
                                </span>
                                <span style={{ display: 'inline-flex', gap: 1.5 }} title={steps.map((s) => `${s.ok ? '✓' : '·'} ${isAr ? s.ar : s.en}`).join('  ') + `  (${n}/${steps.length})`}>
                                  {steps.map((s, k) => <i key={k} style={{ width: 4, height: 11, borderRadius: 1, background: s.ok ? C.ok : 'var(--bd)' }} />)}
                                </span>
                              </span>
                            )
                          } else if (col.kind === 'facname') {
                            const f = facOf(row)
                            content = f
                              ? <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name_ar || f.name_en}</span>
                                  {f.hrsd_number && <span style={{ fontSize: 10, color: 'var(--tx4)', fontFamily: MONO, direction: 'ltr' }}>{f.hrsd_number}</span>}
                                </span>
                              : <span style={{ fontSize: 11.5, color: 'var(--tx5)' }}>{T('لم تُحدَّد', 'not set')}</span>
                          } else if (col.kind === 'vstate') {
                            content = <span style={{ fontSize: 11.5, color: 'var(--tx4)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{txt}</span>
                          } else if (col.kind === 'pay') {
                            content = <PayCell T={T} pay={payOf(row, col.pay)} />
                          } else if (col.kind === 'file') {
                            const url = (col.pathKey ? row[col.pathKey] : null) || fileAtt[col.note]?.[row.id] || ''
                            content = uploading === row.id + '|' + col.key
                              ? <span style={{ fontSize: 11, color: C.gold2, fontWeight: 600 }}>{T('جارٍ الرفع…', 'Uploading…')}</span>
                              : url
                                ? <a href={url} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()} className="pg-cellbtn"
                                    style={{ background: 'rgba(46,204,113,.12)', borderColor: 'rgba(46,204,113,.4)', color: C.ok, textDecoration: 'none' }}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                                    {T('عرض', 'View')}
                                  </a>
                                : canEdit
                                  ? <button type="button" className="pg-cellbtn" onMouseDown={(ev) => ev.stopPropagation()} onClick={(ev) => { ev.stopPropagation(); pickFile(row, col) }}
                                      style={{ background: 'transparent', borderColor: 'var(--bd)', color: 'var(--tx4)' }}>
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                      {T('رفع', 'Upload')}
                                    </button>
                                  : <span style={{ color: 'var(--tx5)' }}>—</span>
                          } else if (col.kind === 'select' && txt) {
                            const v = fieldOf(row, col.key)
                            const o = (col.opts || []).find((x) => String(x.v) === String(v))
                            content = <span style={{ color: o?.c || 'var(--tx)', fontWeight: 600 }}>{txt}</span>
                          } else if (col.kind === 'lookup' && txt) {
                            const code = statusById.get(fieldOf(row, col.key))?.code
                            const c2 = code === 'accomplished' ? C.ok : code === 'rejected' ? C.red : C.warn
                            content = <span style={{ color: c2, fontWeight: 600 }}>{txt}</span>
                          } else if (col.edit && txt === '') {
                            content = <span style={{ width: '55%', height: 1, borderBottom: '1px dotted rgba(212,160,23,.45)' }} />
                          }

                          const showFill = canEdit && !editing && r === range.r2 && c === range.c2 && col.edit
                          return (
                            <div key={col.key} className="pg-cell" style={style} data-active={active ? '1' : undefined}
                              title={err && col.edit ? err : (typeof content === 'string' ? content : undefined)}
                              onMouseDown={(e) => {
                                if (e.button !== 0) return
                                if (editRef.current) commitEdit(null)
                                scrollRef.current?.focus()
                                if (e.shiftKey) setHead({ r, c })
                                else { setAnchor({ r, c }); setHead({ r, c }); dragRef.current = true }
                              }}
                              onMouseEnter={() => {
                                if (dragRef.current) setHead({ r, c })
                                else if (fillRef.current != null) { fillRef.current = r; setFillTo(r) }
                              }}
                              onDoubleClick={() => beginEdit(r, c)}>
                              {isEditing
                                ? <CellEditor col={col} seed={editing.seed} initial={dispOf(row, col)} inputRef={cellInRef}
                                    statuses={statuses} isAr={isAr} commit={commitEdit} cancel={cancelEdit} />
                                : content}
                              {showFill && <span className="pg-fh" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); fillRef.current = range.r2; setFillTo(range.r2) }} />}
                            </div>
                          )
                        })}
                        {err && <div title={err} style={{ position: 'absolute', insetInlineStart: 2, marginTop: 15, width: 8, height: 8, borderRadius: '50%', background: C.red }} />}
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {view.length === 0 && (
              <div style={{ padding: 70, textAlign: 'center', color: 'var(--tx4)', fontSize: 13.5 }}>
                {isAr ? M.emptyAr : M.emptyEn}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── الترقيم والتلميحات ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '10px 4px 0' }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx2)' }}>
          <span style={{ color: C.gold2, direction: 'ltr', display: 'inline-block' }}>{enNum(view.length)}</span>
          <span style={{ color: 'var(--tx4)' }}> {T('من', 'of')} </span>
          <span style={{ direction: 'ltr', display: 'inline-block' }}>{enNum(filtered.length)}</span>
          <span style={{ color: 'var(--tx4)' }}> · {pageBlocks.length} {T('فاتورة', 'invoices')}</span>
        </span>
        {totalPages > 1 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <button className="pg-pg" disabled={pageSafe === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx3)' }}>
              {T('صفحة', 'Page')} <span style={{ color: C.gold2, direction: 'ltr', display: 'inline-block' }}>{pageSafe + 1}</span> / <span style={{ direction: 'ltr', display: 'inline-block' }}>{totalPages}</span>
            </span>
            <button className="pg-pg" disabled={pageSafe + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
          </div>
        )}
        <span style={{ marginInlineStart: 'auto', color: 'var(--tx4)', fontSize: 11.5, fontWeight: 500 }}>
          {T('أسهم للتنقل · F2 أو اكتب للتحرير · Ctrl+C نسخ · Ctrl+V لصق · Ctrl+D تعبئة لأسفل · Delete تفريغ',
             'Arrows · F2 or type to edit · Ctrl+C · Ctrl+V · Ctrl+D fill down · Delete clears')}
        </span>
      </div>

      {/* ── شريط الحفظ ── */}
      {dirtyCount > 0 && (
        <div style={{ position: 'sticky', bottom: 12, marginTop: 14, zIndex: 20,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 17px', borderRadius: 12,
          background: 'var(--modal-bg,#1b1b1b)', border: '1px solid var(--accent-bd)', boxShadow: '0 8px 28px rgba(0,0,0,.42)' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: C.gold, boxShadow: `0 0 8px ${C.gold}`, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>
            {T(`${dirtyCount} حقلاً معدّلاً في ${dirtyRowCount} سطر`, `${dirtyCount} edited fields in ${dirtyRowCount} rows`)}
          </span>
          {Object.keys(rowErr).length > 0 && (
            <span style={{ fontSize: 12.5, fontWeight: 600, color: C.red }}>
              · {T(`${Object.keys(rowErr).length} سطر فشل حفظه`, `${Object.keys(rowErr).length} rows failed`)}
            </span>
          )}
          <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 8 }}>
            <button type="button" className="pg-btn" onClick={discard} disabled={saving}>{T('تراجع عن الكل', 'Discard all')}</button>
            <button type="button" className="pg-btn pri" onClick={save} disabled={saving}>{saving ? T('جاري الحفظ…', 'Saving…') : T('حفظ التعديلات', 'Save changes')}</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══ خلية الدفعة — تحذير لا قفل ═══ */
function PayCell({ T, pay }) {
  if (!pay) return <span style={{ fontSize: 11, color: 'var(--tx5)' }}>{T('لا دفعة', 'no installment')}</span>
  const c = pay.state === 'paid' ? C.ok : C.warn
  const label = pay.state === 'paid' ? T('مدفوعة', 'paid')
    : pay.state === 'partial' ? T(`جزئية ${enNum(pay.paid)}/${enNum(pay.total)}`, `partial ${enNum(pay.paid)}/${enNum(pay.total)}`)
    : T('غير مدفوعة', 'unpaid')
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: c }}
      title={pay.state === 'paid' ? undefined : T('الدفعة غير مسدّدة بالكامل — الإدخال مسموح مع التحذير', 'Installment not fully paid — entry allowed with a warning')}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />
      {label}
      {pay.state !== 'paid' && <span>⚠</span>}
    </span>
  )
}

/* ═══ محرّر الخلية — غير متحكَّم به: القيمة تُقرأ من الـref عند الإنهاء ═══ */
function CellEditor({ col, seed, initial, inputRef, statuses, isAr, commit, cancel }) {
  const stop = (e) => e.stopPropagation()
  const onKey = (e) => {
    e.stopPropagation()
    if (e.key === 'Enter') { e.preventDefault(); commit([1, 0]) }
    else if (e.key === 'Escape') { e.preventDefault(); cancel() }
    else if (e.key === 'Tab') { e.preventDefault(); commit([0, e.shiftKey ? -1 : 1]) }
  }
  const selStyle = { width: '100%', height: '100%', background: 'var(--modal-bg,#1a1a1a)', color: 'var(--tx)', border: 'none', outline: 'none', fontFamily: F, fontSize: 12.5 }

  if (col.kind === 'select') {
    return (
      <select autoFocus defaultValue={initial} onMouseDown={stop} onKeyDown={onKey}
        onChange={(e) => commit(null, e.target.value)} onBlur={() => commit(null, initial)} style={selStyle}>
        <option value="">—</option>
        {(col.opts || []).map((o) => { const label = isAr ? o.ar : o.en; return <option key={String(o.v)} value={label}>{label}</option> })}
      </select>
    )
  }
  if (col.kind === 'lookup') {
    return (
      <select autoFocus defaultValue={initial} onMouseDown={stop} onKeyDown={onKey}
        onChange={(e) => commit(null, e.target.value)} onBlur={() => commit(null, initial)} style={selStyle}>
        <option value="">—</option>
        {statuses.map((s) => { const label = isAr ? s.value_ar : (s.value_en || s.value_ar); return <option key={s.id} value={label}>{label}</option> })}
      </select>
    )
  }
  return (
    <input className="pg-in" autoFocus ref={inputRef}
      defaultValue={seed != null ? seed : initial}
      onMouseDown={stop} onKeyDown={onKey} onBlur={() => commit(null)}
      onFocus={(e) => { if (seed == null) e.target.select(); else e.target.setSelectionRange(seed.length, seed.length) }}
      placeholder={col.kind === 'date' ? 'YYYY-MM-DD' : undefined}
      style={{ textAlign: col.mono ? 'center' : 'start', direction: col.mono ? 'ltr' : undefined,
        fontFamily: col.mono ? MONO : F, fontWeight: 600, color: '#D4A017' }} />
  )
}

const selCss = {
  height: 36, padding: '0 10px', borderRadius: 9, background: 'var(--search-bg)',
  border: '1px solid transparent', color: 'var(--tx2)', fontSize: 12.5, fontFamily: F,
  outline: 'none', cursor: 'pointer', boxSizing: 'border-box', maxWidth: 175, flexShrink: 0,
}
