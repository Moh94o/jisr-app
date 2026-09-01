import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { can as canPerm } from '../lib/permissions.js'
import { Modal as FKModal, ModalSection, ActionButton, SuccessView, GRID } from '../components/ui/FormKit.jsx'

/* ═══════════════════════════════════════════════════════════════════════════
   جدول إصدار التأشيرات — طوابير مراحل، لا جدول واحد عريض.

   العمل فعلياً أربع مراحل متعاقبة، فالشاشة تتبعها بدل أن تعرض كل شيء دائماً:

     تحديد المنشأة  →  طلب السداد  →  بانتظار السداد  →  الإصدار  →  مكتملة

   كل تأشيرة تقع في مرحلة واحدة فقط، وكل مرحلة تعرض أعمدتها وحدها (٣–٧ أعمدة).
   وهذا يحلّ التمرير الأفقي من جذره: لا شيء يتجاوز عرض الشاشة، فلا حاجة لطيّ
   أعمدة ولا لملاءمة تلقائية ولا لوضع ملء شاشة.

   وبيانات الفاتورة (المكتب · الخدمة · العميل · الجنسية · المهنة) تُكتب مرة
   واحدة في سطر عنوان فوق كتلتها، بدل تكرارها حرفياً مع كل تأشيرة.

   بقي كما هو من النسخة السابقة: محرّك الشبكة كاملاً — تنقّل بالكيبورد، لصق
   من إكسل، تعبئة بالسحب، حفظ دفعي متسامح مع الفشل الجزئي، نافذة طلب السداد،
   ورفع ملف التأشيرة.

   تنبيهان تقنيان مدفوعان بأخطاء وقعت فعلاً:
   · لا تُدرِج في قائمة اعتماديات useEffect قيمةً مُعرَّفة أسفله — Vite لا يحلّل
     TDZ فيمرّ البناء والصفحة بيضاء.
   · لا ألوان ثابتة: اللون الداكن الثابت يصير شريطاً أسود على الثيم الفاتح.
     استعمل var(--*) أو طبقة linear-gradient فوقها.
   ═══════════════════════════════════════════════════════════════════════════ */

const F = "'Cairo','Tajawal',sans-serif"
const MONO = 'ui-monospace,SFMono-Regular,Menlo,monospace'
const C = {
  gold: '#B07D00', gold2: '#D4A017',
  blue: '#5dade2', ok: '#2ecc71', red: '#e87265', gray: '#95a5a6', warn: '#d99400',
}
const PAGE_ROWS = 100          // تقريبي: الكتلة لا تُشطر بين صفحتين
const ROW_H = 40
const HEAD_H = 34              // سطر عنوان الفاتورة
const COL_H = 36
const SAVE_CONCURRENCY = 6
const VISA_FEE_AMOUNT = 2000
const FEE_KIND_CODE = 'visa_cost'
/* صيغ الأرقام — هي نفسها التي تفرضها نافذة «بيانات التأشيرات» في الفاتورة.
   الإدخال صار من مكانين، ولو تساهل الجدول لصار باباً خلفياً لبيانات لا تقبلها
   النافذة ثم تظهر ناقصة في «حالة المعاملة». */
const FMT = {
  visa_number: /^1\d{9}$/,
  border_number: /^3\d{9}$/,
  unified_number: /^7\d{9}$/,
}

const latin = (s) => String(s ?? '')
  .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
  .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
const p2 = (n) => String(n).padStart(2, '0')
const ymd = (v) => (v ? String(v).slice(0, 10) : '')
const enNum = (n) => Number(n || 0).toLocaleString('en-US')

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
const STATUS_COLOR = { unused: C.gray, used: C.ok, awaiting_cancellation: C.gold2, cancelled: C.red }
/* لون لكل ملف تأشيرات داخل الفاتورة — الملف يسع ٤ تأشيرات */
const FILE_COLORS = ['#B07D00', '#5dade2', '#bb8fce', '#16a085', '#e8834e', '#5f9ea0']
const fileColor = (n) => (n == null ? 'var(--bd)' : FILE_COLORS[(Number(n) - 1 + FILE_COLORS.length) % FILE_COLORS.length])

/* ── سجلّ الأعمدة ───────────────────────────────────────────────────────────
   kind: rownum | facname | text | date | status | uni | hrsd | fee | sadad | file
   owns: الحقول الحقيقية التي يكتبها العمود (عمود واحد قد يكتب حقلين)        */
const COL_DEFS = {
  _row: { ar: 'التأشيرة', en: 'Visa', w: 156, kind: 'rownum' },
  unified_number: { ar: 'الرقم الموحد', en: 'Unified no.', w: 172, kind: 'uni', edit: true, mono: true, owns: ['unified_number', 'main_facility_id'] },
  _hrsd: { ar: 'رقم الموارد البشرية', en: 'HRSD no.', w: 176, kind: 'hrsd', edit: true, mono: true, owns: ['main_facility_id', 'unified_number'] },
  _gosi: { ar: 'رقم التأمينات', en: 'GOSI no.', w: 160, kind: 'gosi', edit: true, mono: true, owns: ['main_facility_id', 'unified_number'] },
  _facility: { ar: 'المنشأة', en: 'Facility', w: 250, kind: 'facname' },
  _fee: { ar: 'رسوم التأشيرة', en: 'Visa fee', w: 172, kind: 'fee' },
  _sadad: { ar: 'رقم السداد', en: 'SADAD no.', w: 160, kind: 'sadad', mono: true },
  visa_number: { ar: 'رقم التأشيرة', en: 'Visa no.', w: 158, kind: 'text', edit: true, mono: true, color: C.gold2, owns: ['visa_number'] },
  border_number: { ar: 'رقم الحدود', en: 'Border no.', w: 148, kind: 'text', edit: true, mono: true, color: C.blue, owns: ['border_number'] },
  visa_issue_date: { ar: 'تاريخ الإصدار', en: 'Issue date', w: 138, kind: 'date', edit: true, mono: true, owns: ['visa_issue_date'] },
  _file: { ar: 'ملف التأشيرة', en: 'Visa file', w: 118, kind: 'file' },
  usage_status_id: { ar: 'حالة التأشيرة', en: 'Visa status', w: 150, kind: 'status', edit: true, owns: ['usage_status_id'] },
}

const STAGES = [
  { key: 'facility', ar: 'تحديد المنشأة', en: 'Set facility', c: C.gold2,
    cols: ['_row', 'unified_number', '_hrsd', '_gosi', '_facility'] },
  { key: 'request', ar: 'طلب السداد', en: 'Request payment', c: C.blue,
    cols: ['_row', '_facility', '_fee'] },
  { key: 'awaiting', ar: 'بانتظار السداد', en: 'Awaiting payment', c: C.warn,
    cols: ['_row', '_facility', '_fee', '_sadad'] },
  { key: 'issue', ar: 'الإصدار', en: 'Issuance', c: C.ok,
    cols: ['_row', '_facility', 'visa_number', 'border_number', 'visa_issue_date', '_file', 'usage_status_id'] },
  { key: 'done', ar: 'مكتملة', en: 'Completed', c: C.gray,
    cols: ['_row', '_facility', 'visa_number', 'border_number', 'visa_issue_date', '_file', 'usage_status_id'] },
]

const CORE_KEYS = ['visa_number', 'border_number', 'visa_issue_date']

const VISA_SELECT = `
  id, visa_number, border_number, unified_number, gender, file_number,
  visa_issue_date, visa_file_path, usage_status_id, main_facility_id, created_at,
  nationality:nationality_id(id,name_ar,name_en),
  occupation:occupation_id(id,name_ar,name_en),
  embassy:embassy_id(id,name_ar,name_en),
  sr:service_request_id(
    id, request_ref_no, request_date,
    branch:branch_id(id,branch_code),
    client:client_id(id,name_ar,name_en),
    service_type:service_type_id(id,code,value_ar,value_en)
  )
`

function GridSkeleton() {
  const sh = { display: 'block', borderRadius: 5, background: 'linear-gradient(90deg,var(--bd2) 25%,var(--bd) 37%,var(--bd2) 63%)', backgroundSize: '400% 100%', animation: 'vg-sh 1.4s ease infinite' }
  return (
    <div>
      <style>{'@keyframes vg-sh{0%{background-position:100% 0}100%{background-position:-100% 0}}'}</style>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[130, 110, 130, 90, 100].map((w, i) => <span key={i} style={{ ...sh, width: w, height: 28, borderRadius: 8 }} />)}
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
export default function VisaGridPage({ sb, user, toast, lang, onTabChange }) {
  const isAr = lang !== 'en'
  const T = (a, e) => (isAr ? a : e)
  const canEdit = canPerm(user, 'work_visas.edit')

  const [rows, setRows] = useState([])
  const [facilities, setFacilities] = useState([])
  const [statuses, setStatuses] = useState([])
  const [fees, setFees] = useState({})
  const [fileAtt, setFileAtt] = useState({})   // visa_id → ملف التأشيرة المرفوع من نافذة الفاتورة
  const [feeKindId, setFeeKindId] = useState(null)
  const [loading, setLoading] = useState(true)

  const [stage, setStage] = useState('facility')
  const [search, setSearch] = useState('')
  const [fBranch, setFBranch] = useState('')
  const [fService, setFService] = useState('')
  const [page, setPage] = useState(0)

  const [edits, setEdits] = useState({})
  const [rowErr, setRowErr] = useState({})
  const [saving, setSaving] = useState(false)

  const [feeTarget, setFeeTarget] = useState(null)
  const [feeBusy, setFeeBusy] = useState(false)
  const [feeErr, setFeeErr] = useState(null)
  const [feeDone, setFeeDone] = useState(false)
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

  useEffect(() => { onTabChange && onTabChange({ tab: 'visa_grid' }) }, [])

  const stageDef = useMemo(() => STAGES.find((s) => s.key === stage) || STAGES[0], [stage])
  const COLS = useMemo(() => stageDef.cols.map((k) => ({ key: k, ...COL_DEFS[k] })), [stageDef])
  const firstEditable = useMemo(() => Math.max(0, COLS.findIndex((c) => c.edit)), [COLS])

  /* ── التحميل ─────────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    if (!sb) return
    setLoading(true)
    const [visaR, facR, catR, feeKindR, attR] = await Promise.all([
      sb.from('visa_applications').select(VISA_SELECT).is('deleted_at', null).order('created_at', { ascending: false }),
      /* range صريح: المنشآت ١,١٩١ صفاً وسقف PostgREST الافتراضي ١٠٠٠ — بدونه تختفي
         ~٢٠٠ منشأة من بحث الأرقام فيُقال «لا توجد منشأة» وهي موجودة. */
      sb.from('facilities').select('id,name_ar,name_en,unified_number,cr_number,hrsd_number,gosi_number').is('deleted_at', null).order('name_ar').range(0, 4999),
      sb.from('lookup_categories').select('id').eq('category_key', 'visa_usage_status').maybeSingle(),
      sb.from('lookup_items').select('id').eq('code', FEE_KIND_CODE).limit(1).maybeSingle(),
      /* ملف التأشيرة المرفوع من نافذة الفاتورة يُسجَّل صفاً في attachments بلا
         visa_file_path — فبدون قراءته يظهر الصفّ هنا «بلا ملف» وهو مرفوع فعلاً. */
      sb.from('attachments').select('entity_id,file_url,created_at')
        .eq('entity_type', 'visa_application').eq('notes', 'visa_file')
        .is('deleted_at', null).order('created_at', { ascending: false }).range(0, 4999),
    ])
    const list = (visaR.data || []).filter((v) => /^work_visa/.test(v.sr?.service_type?.code || ''))
    /* ترتيب يُبقي تأشيرات الفاتورة متلاصقة ثم مرتّبة بملفّها */
    list.sort((a, b) => {
      const d = String(b.created_at || '').localeCompare(String(a.created_at || ''))
      if (d) return d
      const s = String(a.sr?.id || '').localeCompare(String(b.sr?.id || ''))
      if (s) return s
      return (a.file_number ?? 99) - (b.file_number ?? 99)
    })
    setRows(list)
    setFacilities(facR.data || [])
    setFeeKindId(feeKindR.data?.id || null)
    if (catR.data?.id) {
      const { data } = await sb.from('lookup_items').select('id,code,value_ar,value_en,sort_order')
        .eq('category_id', catR.data.id).eq('is_active', true).order('sort_order')
      setStatuses(data || [])
    }
    const { data: feeRows } = await sb.from('transaction_fees')
      .select('id,visa_application_id,amount,paid_amount,status,sadad_no')
      .not('visa_application_id', 'is', null).is('deleted_at', null)
    const map = {}
    for (const f of (feeRows || [])) if (!map[f.visa_application_id]) map[f.visa_application_id] = f
    setFees(map)
    const att = {}
    for (const a of (attR.data || [])) if (a.entity_id && !att[a.entity_id]) att[a.entity_id] = a.file_url
    setFileAtt(att)
    setLoading(false)
  }, [sb])
  useEffect(() => { load() }, [load])

  const facById = useMemo(() => { const m = new Map(); for (const f of facilities) m.set(f.id, f); return m }, [facilities])
  /* ── فهرس أرقام المنشأة ─────────────────────────────────────────────────
     مفتاح واحد لكل رقم تعرفه المنشأة: الموحّد · التأمينات · الموارد — بصيغته
     كما هي وبأرقامه المجرّدة (رقم الموارد يُكتب `18-4048702` وقد يُلصق بلا
     شرطة). فأي عمود من الثلاثة يقبل أيّ رقم منها ويحدّد المنشأة نفسها. */
  const digits = (v) => latin(v).replace(/\D+/g, '')
  const facIndex = useMemo(() => {
    const m = new Map()
    const put = (k, f) => { const s = String(k ?? '').trim(); if (s && !m.has(s)) m.set(s, f) }
    for (const f of facilities) {
      for (const v of [f.unified_number, f.gosi_number, f.hrsd_number]) {
        if (!v) continue
        put(latin(v).trim(), f)
        put(digits(v), f)
      }
    }
    return m
  }, [facilities])
  const facLookup = useCallback((text) => {
    const s = latin(text).trim()
    if (!s) return null
    return facIndex.get(s) || facIndex.get(digits(s)) || null
  }, [facIndex])
  const statusById = useMemo(() => { const m = new Map(); for (const s of statuses) m.set(s.id, s); return m }, [statuses])

  const fieldOf = useCallback((row, key) => {
    const e = edits[row.id]
    if (e && Object.prototype.hasOwnProperty.call(e, key)) return e[key]
    return row[key] ?? null
  }, [edits])
  const facOf = useCallback((row) => facById.get(fieldOf(row, 'main_facility_id')) || null, [facById, fieldOf])

  /* ── إسناد المرحلة ──────────────────────────────────────────────────────
     الاكتمال أولاً: صفوف قديمة كثيرة أُصدرت قبل وجود مسار السداد، فلو قُدّم
     شرط الرسم عليها لعادت إلى طابور لا معنى له. */
  const stageOf = useCallback((row) => {
    const complete = CORE_KEYS.every((k) => { const v = fieldOf(row, k); return v != null && v !== '' })
    if (complete) return 'done'
    if (!fieldOf(row, 'main_facility_id')) return 'facility'
    const fee = fees[row.id]
    if (!fee) return 'request'
    if (fee.status !== 'paid') return 'awaiting'
    return 'issue'
  }, [fieldOf, fees])

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

  /* المصفّى قبل المرحلة — منه تُحسب أعداد التبويبات */
  const preStage = useMemo(() => rows.filter((r) => {
    if (fService && r.sr?.service_type?.code !== fService) return false
    if (fBranch && r.sr?.branch?.branch_code !== fBranch) return false
    if (search.trim()) {
      const s = latin(search).trim().toLowerCase()
      const fac = facById.get(fieldOf(r, 'main_facility_id'))
      const hay = [r.visa_number, r.border_number, r.unified_number,
        r.sr?.request_ref_no, r.sr?.branch?.branch_code, r.sr?.client?.name_ar,
        r.nationality?.name_ar, r.occupation?.name_ar, r.embassy?.name_ar,
        fac?.name_ar, fac?.unified_number, fac?.hrsd_number, fac?.gosi_number]
      if (!hay.some((v) => String(v || '').toLowerCase().includes(s))) return false
    }
    return true
  }), [rows, fService, fBranch, search, facById, fieldOf])

  const stageCounts = useMemo(() => {
    const m = { facility: 0, request: 0, awaiting: 0, issue: 0, done: 0 }
    for (const r of preStage) m[stageOf(r)]++
    return m
  }, [preStage, stageOf])

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

  /* ترقيم الصفحات بالكتل — الكتلة لا تُشطر بين صفحتين */
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
  /* الصفوف المسطّحة للصفحة — عليها يقوم التحديد والتنقّل */
  const view = useMemo(() => pageBlocks.flatMap((b) => b.rows), [pageBlocks])
  const rowIndex = useMemo(() => { const m = new Map(); view.forEach((r, i) => m.set(r.id, i)); return m }, [view])
  const firstNo = useMemo(() => pages.slice(0, pageSafe).reduce((a, p) => a + p.reduce((x, b) => x + b.rows.length, 0), 0) + 1, [pages, pageSafe])

  const filterKey = `${stage}|${fService}|${fBranch}|${search}`
  useEffect(() => { setPage(0) }, [filterKey])
  useEffect(() => {
    setAnchor({ r: 0, c: firstEditable }); setHead({ r: 0, c: firstEditable })
    editRef.current = null; setEditing(null)
  }, [pageSafe, filterKey, firstEditable])

  /* ── هندسة الشبكة ────────────────────────────────────────────────────── */
  const [widthMap, setWidthMap] = useState({})
  const resizeRef = useRef(null)
  const widths = useMemo(() => COLS.map((c) => widthMap[c.key] ?? c.w), [COLS, widthMap])
  const offsets = useMemo(() => { const o = []; let x = 0; for (const w of widths) { o.push(x); x += w } return o }, [widths])
  const totalW = useMemo(() => widths.reduce((a, b) => a + b, 0), [widths])
  /* آخر عمود يتمدّد ليملأ العرض — الجدول ضيق أصلاً فلا يبقى فراغ مبتور */
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

  /* ── تحويل النص إلى تعديل ───────────────────────────────────────────────
     عمود واحد قد يكتب حقلين: رقم الموارد البشرية يحدّد المنشأة ويملأ الموحد. */
  const coercePatch = useCallback((col, text) => {
    const s = String(text ?? '').trim()
    switch (col.kind) {
      case 'text': {
        const v = latin(s).trim()
        if (!v) return { [col.key]: null }
        const re = FMT[col.key]
        return (re && !re.test(v)) ? undefined : { [col.key]: v }
      }
      case 'date': { const d = parseDate(s); return d === undefined ? undefined : { [col.key]: d } }
      case 'status': {
        if (!s) return { usage_status_id: null }
        const low = s.toLowerCase()
        const hit = statuses.find((o) => o.value_ar === s || (o.value_en || '').toLowerCase() === low || (o.code || '').toLowerCase() === low)
        return hit ? { usage_status_id: hit.id } : undefined
      }
      /* الأعمدة الثلاثة تمرّ على الفهرس نفسه: اكتب الموحّد أو التأمينات أو
         الموارد في أيٍّ منها فتُحدَّد المنشأة وتُملأ بقيّة الخلايا منها. */
      case 'uni': {
        const v = latin(s)
        if (!v) return { unified_number: null, main_facility_id: null }
        const fac = facLookup(v)
        /* الرقم يُحفظ حتى بلا منشأة مطابقة — بيانات قديمة فيها أرقام بلا منشأة
           مسجّلة، ومنعُها يمنع تصحيحها — لكن بصيغته الرسمية (يبدأ بـ7 و10 أرقام)
           كما تشترط نافذة الفاتورة. */
        if (fac) return { unified_number: fac.unified_number || v, main_facility_id: fac.id }
        return FMT.unified_number.test(v) ? { unified_number: v } : undefined
      }
      case 'hrsd':
      case 'gosi': {
        const v = latin(s)
        if (!v) return { main_facility_id: null }
        const fac = facLookup(v)
        return fac ? { main_facility_id: fac.id, unified_number: fac.unified_number || null } : undefined
      }
      default: return undefined
    }
  }, [statuses, facLookup])

  const dispOf = useCallback((row, col) => {
    if (!row || !col) return ''
    switch (col.kind) {
      case 'uni': return fieldOf(row, 'unified_number') || ''
      case 'hrsd': return facOf(row)?.hrsd_number || ''
      case 'gosi': return facOf(row)?.gosi_number || ''
      case 'facname': return facOf(row)?.name_ar || facOf(row)?.name_en || ''
      case 'status': { const s = statusById.get(fieldOf(row, 'usage_status_id')); return s ? (isAr ? s.value_ar : (s.value_en || s.value_ar)) : '' }
      case 'date': return ymd(fieldOf(row, col.key))
      case 'text': { const v = fieldOf(row, col.key); return v == null ? '' : String(v) }
      case 'sadad': return fees[row.id]?.sadad_no || ''
      default: return ''
    }
  }, [fieldOf, facOf, statusById, isAr, fees])

  /* رسالة الرفض تُسمّي الشرط المخالف — «قيمة غير صالحة» وحدها تترك الموظف يخمّن. */
  const invalidMsg = useCallback((col) => {
    if (col.kind === 'hrsd' || col.kind === 'gosi') return T('لا توجد منشأة بهذا الرقم', 'No facility with that number')
    if (col.key === 'visa_number') return T('رقم التأشيرة يبدأ بـ1 ويكون 10 أرقام', 'Visa number must start with 1 and be 10 digits')
    if (col.key === 'border_number') return T('رقم الحدود يبدأ بـ3 ويكون 10 أرقام', 'Border number must start with 3 and be 10 digits')
    if (col.kind === 'uni') return T('الرقم الموحد يبدأ بـ7 ويكون 10 أرقام، أو اكتب رقم منشأة معروفة', 'Unified number must start with 7 and be 10 digits, or type a known facility number')
    return T('قيمة غير صالحة — لم تُحفظ', 'Invalid value — not applied')
  }, [T])

  /* ── تفرّد رقم الحدود ───────────────────────────────────────────────────
     نافذة الفاتورة تمنع تكرار رقم الحدود بين التأشيرات، فالجدول يمنعه أيضاً:
     نقطة حمراء فور الكتابة، وفحص في القاعدة عند الحفظ (يمنع التسابق ويكشف
     تكراراً مع تأشيرة خارج الصفحة). */
  const borderDup = useMemo(() => {
    const seen = new Map(), dup = new Set()
    for (const r of rows) {
      const e = edits[r.id]
      const b = String((e && Object.prototype.hasOwnProperty.call(e, 'border_number') ? e.border_number : r.border_number) || '').trim()
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
      /* في RTL: السهم الأيمن يرجع للخلف والأيسر يتقدّم — كما في إكسل العربي */
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
    const errs = {}, saved = []
    /* تفرّد رقم الحدود قبل أي كتابة — نفس شرط نافذة الفاتورة:
       ما تكرّر داخل الجدول يُرفض فوراً، وما بقي يُفحص في القاعدة (قد يكون على
       تأشيرة لا يعرضها هذا الطابور). الصفوف المرفوضة تبقى متسخة بنقطة حمراء. */
    const dupMsg = T('رقم الحدود مستخدَم مسبقاً على تأشيرة أخرى', 'Border number is already used on another visa')
    const blocked = new Set()
    const wantBorder = new Map()   // رقم الحدود → معرّف الصف
    for (const [id, patch] of entries) {
      if (!Object.prototype.hasOwnProperty.call(patch, 'border_number')) continue
      if (borderDup.has(id)) { errs[id] = dupMsg; blocked.add(id); continue }
      const b = String(patch.border_number || '').trim()
      if (b) wantBorder.set(b, id)
    }
    if (wantBorder.size) {
      const ids = [...new Set(wantBorder.values())]
      let q = sb.from('visa_applications').select('id,border_number').in('border_number', [...wantBorder.keys()]).is('deleted_at', null)
      if (ids.length) q = q.not('id', 'in', `(${ids.join(',')})`)
      const { data: clash } = await q
      for (const c of (clash || [])) {
        const id = wantBorder.get(String(c.border_number || '').trim())
        if (id) { errs[id] = dupMsg; blocked.add(id) }
      }
    }
    const todo = entries.filter(([id]) => !blocked.has(id))
    for (let i = 0; i < todo.length; i += SAVE_CONCURRENCY) {
      await Promise.all(todo.slice(i, i + SAVE_CONCURRENCY).map(async ([id, patch]) => {
        const body = { ...patch, updated_by: user?.id || null, updated_at: nowIso }
        if (Object.prototype.hasOwnProperty.call(patch, 'usage_status_id')) {
          body.usage_status_changed_at = nowIso
          body.usage_status_changed_by = user?.id || null
        }
        const { error } = await sb.from('visa_applications').update(body).eq('id', id)
        if (error) errs[id] = error.message || String(error)
        else saved.push([id, patch])
      }))
    }
    if (saved.length) {
      const m = new Map(saved)
      setRows((rs) => rs.map((r) => (m.has(r.id) ? { ...r, ...m.get(r.id) } : r)))
      setEdits((prev) => { const n = { ...prev }; for (const [id] of saved) delete n[id]; return n })
    }
    setRowErr(errs); setSaving(false); setSeq((s) => s + 1)
    const failed = Object.keys(errs).length
    toast && toast(failed
      ? T(`حُفظ ${saved.length} سطراً · فشل ${failed}`, `Saved ${saved.length} · ${failed} failed`)
      : T(`تم حفظ ${saved.length} سطراً`, `Saved ${saved.length} rows`))
  }, [sb, saving, dirtyRowCount, edits, user, toast, T, borderDup])

  const discard = useCallback(() => { setEdits({}); setRowErr({}); setSeq((s) => s + 1) }, [])

  useEffect(() => {
    if (!dirtyCount) return
    const h = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirtyCount])

  /* ── طلب السداد ──────────────────────────────────────────────────────── */
  const requestFee = useCallback(async () => {
    if (!sb || !feeTarget || feeBusy) return
    setFeeBusy(true); setFeeErr(null)
    try {
      const { data, error } = await sb.from('transaction_fees').insert({
        service_request_id: feeTarget.sr?.id || null,
        facility_id: fieldOf(feeTarget, 'main_facility_id') || null,
        visa_application_id: feeTarget.id,
        fee_kind_id: feeKindId,
        fee_label_ar: 'رسوم التأشيرة',
        amount: VISA_FEE_AMOUNT, paid_amount: 0, status: 'pending',
        file_number: feeTarget.file_number ?? null,
        notes: 'visa_grid_request', created_by: user?.id || null,
      }).select('id,visa_application_id,amount,paid_amount,status,sadad_no').single()
      if (error) throw new Error(error.message)
      setFees((f) => ({ ...f, [feeTarget.id]: data }))
      setFeeDone(true)
    } catch (e) {
      setFeeErr(T('فشل إنشاء طلب السداد: ' + (e.message || e), 'Failed: ' + (e.message || e)))
    } finally { setFeeBusy(false) }
  }, [sb, feeTarget, feeBusy, feeKindId, fieldOf, user, T])

  const closeFee = useCallback(() => { if (!feeBusy) { setFeeTarget(null); setFeeErr(null); setFeeDone(false) } }, [feeBusy])

  /* ── رفع ملف التأشيرة ────────────────────────────────────────────────── */
  const pickFile = useCallback((row) => {
    if (!canEdit) return
    uploadTargetRef.current = row
    if (fileInputRef.current) { fileInputRef.current.value = ''; fileInputRef.current.click() }
  }, [canEdit])

  const onFileChosen = useCallback(async (e) => {
    const file = e.target.files?.[0]
    const row = uploadTargetRef.current
    if (!file || !row || !sb) return
    setUploading(row.id)
    try {
      const safe = (file.name || 'visa').replace(/[^\w.\-]+/g, '_')
      const path = `visa_application/${row.id}/visa_file/${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${safe}`
      const { error: upErr } = await sb.storage.from('attachments').upload(path, file, { cacheControl: '3600', upsert: false })
      if (upErr) throw new Error(upErr.message)
      const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
      const url = pub?.publicUrl || path
      const { error } = await sb.from('visa_applications').update({ visa_file_path: url, updated_by: user?.id || null }).eq('id', row.id)
      if (error) throw new Error(error.message)
      await sb.from('attachments').insert({
        entity_type: 'visa_application', entity_id: row.id,
        file_name: file.name, file_url: url, storage_path: path,
        mime_type: file.type || null, size_bytes: file.size || null,
        notes: 'visa_file', uploaded_by: user?.id || null,
      })
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, visa_file_path: url } : r)))
      toast && toast(T('تم رفع ملف التأشيرة', 'Visa file uploaded'))
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
        .vg-hdrwrap{overflow:hidden;border:1px solid var(--bd);border-bottom:none;border-radius:12px 12px 0 0;background:var(--hd)}
        .vg-scroll{overflow-x:auto;overflow-y:hidden;border:1px solid var(--bd);border-top:none;
          border-radius:0 0 12px 12px;background:var(--card-grad2);outline:none}
        .vg-scroll::-webkit-scrollbar{height:10px}
        .vg-scroll::-webkit-scrollbar-thumb{background:rgba(176,125,0,.45);border-radius:5px}
        .vg-scroll{scrollbar-width:thin;scrollbar-color:rgba(176,125,0,.45) transparent}
        .vg-hdr-cell{position:relative;height:${COL_H}px;display:flex;align-items:center;justify-content:center;
          padding:0 8px;font-size:12.5px;font-weight:600;color:var(--hdtx);background:var(--hd);
          border-inline-end:1px solid var(--bd);box-shadow:inset 0 -2px 0 rgba(176,125,0,.55);
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-sizing:border-box;user-select:none}
        .vg-grip{position:absolute;inset-inline-start:-3px;top:0;bottom:0;width:6px;cursor:col-resize;z-index:8}
        .vg-row:hover .vg-cell{background-color:rgba(176,125,0,.05)}
        .vg-in{width:100%;height:100%;background:transparent;border:none;outline:none;font-family:${F};font-size:12.5px;padding:0;box-sizing:border-box}
        .vg-btn{height:36px;padding:0 13px;border-radius:9px;border:1px solid transparent;cursor:pointer;
          font-family:${F};font-size:12.5px;font-weight:600;display:inline-flex;align-items:center;gap:7px;
          background:var(--search-bg);color:var(--tx2);transition:.15s;box-sizing:border-box;flex-shrink:0;white-space:nowrap}
        .vg-btn:hover:not(:disabled){background:var(--accent-soft);color:var(--accent);border-color:var(--accent-bd)}
        .vg-btn:disabled{opacity:.4;cursor:not-allowed}
        .vg-btn.pri{background:${C.gold};color:#000;border-color:${C.gold}}
        .vg-btn.pri:hover:not(:disabled){filter:brightness(1.12);background:${C.gold};color:#000}
        .vg-cellbtn{height:26px;padding:0 10px;border-radius:7px;border:1px solid;cursor:pointer;
          font-family:${F};font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
        .vg-stage{padding:7px 14px;border-radius:9px;font-size:12.5px;font-weight:600;cursor:pointer;
          font-family:${F};border:1px solid transparent;background:var(--search-bg);color:var(--tx3);
          display:inline-flex;align-items:center;gap:8px;transition:.15s;flex-shrink:0}
        .vg-stage:hover{color:var(--tx)}
        .vg-pg{width:32px;height:32px;border-radius:8px;background:var(--search-bg);border:none;color:${C.gold2};
          cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
        .vg-pg:hover:not(:disabled){background:${C.gold};color:#000}
        .vg-pg:disabled{color:var(--tx4);cursor:not-allowed;opacity:.5}
        .vg-fh{position:absolute;width:9px;height:9px;background:${C.gold};border:1px solid var(--bg);
          cursor:crosshair;z-index:5;bottom:-5px;inset-inline-start:-5px}
      `}</style>

      <input ref={fileInputRef} type="file" accept="application/pdf,image/*" style={{ display: 'none' }} onChange={onFileChosen} />

      {/* ── المراحل ── */}
      <div style={{ display: 'flex', gap: 7, marginBottom: 11, flexWrap: 'wrap' }}>
        {STAGES.map((s) => {
          const on = s.key === stage
          return (
            <button key={s.key} type="button" className="vg-stage" onClick={() => setStage(s.key)}
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
            placeholder={T('ابحث برقم التأشيرة، الحدود، الموحد، المرجع، العميل، المنشأة…', 'Search visa, border, unified, ref, client, facility…')}
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
        <input key={`fb-${stage}-${pageSafe}-${head.r}-${head.c}-${seq}`} ref={fbRef}
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
        {/* الرأس خارج حاوية التمرير: sticky يُقاس على أقرب حاوية تمرير، والجسم
            لا يُمرَّر رأسياً — فلو بقي الرأس بداخله لما تجمّد أصلاً. */}
        <div ref={hdrRef} className="vg-hdrwrap" style={{ position: 'sticky', top: 0, zIndex: 6 }}>
          <div style={{ display: 'grid', gridTemplateColumns: tmpl, minWidth: totalW }}>
            {COLS.map((col, i) => (
              <div key={col.key} className="vg-hdr-cell" title={isAr ? col.ar : col.en}>
                {col.edit && <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.gold2, marginInlineEnd: 6, flexShrink: 0 }} />}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{isAr ? col.ar : col.en}</span>
                {i > 0 && <span className="vg-grip" onMouseDown={(e) => { e.preventDefault(); resizeRef.current = { key: col.key, x0: e.clientX, w0: widths[i] } }} />}
              </div>
            ))}
          </div>
        </div>

        <div ref={scrollRef} className="vg-scroll" tabIndex={0} onKeyDown={onKeyDown} onPaste={onPaste}
          onScroll={(e) => { if (hdrRef.current) hdrRef.current.scrollLeft = e.currentTarget.scrollLeft }}>
          <div style={{ minWidth: totalW }}>
            {pageBlocks.map((b) => {
              const sr = b.sr, s0 = b.sample
              const fileSet = new Set(b.rows.map((x) => x.file_number ?? '-'))
              return (
                <div key={b.sid}>
                  {/* سطر عنوان الفاتورة — بياناتها مرة واحدة لا مع كل تأشيرة */}
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
                    /* التكرار يُعلَّم فوراً — لا ينتظر محاولة حفظ تفشل */
                    const err = rowErr[row.id] || (borderDup.has(row.id)
                      ? T('رقم الحدود مكرّر — يجب أن يكون فريداً', 'Border number is duplicated — it must be unique') : null)
                    const fee = fees[row.id]
                    const hasIssuance = CORE_KEYS.some((k) => { const v = fieldOf(row, k); return v != null && v !== '' })
                    return (
                      <div key={row.id} className="vg-row" style={{ display: 'grid', gridTemplateColumns: tmpl, minWidth: totalW }}>
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

                          const style = {
                            ...cellBase, background: bg,
                            color: col.color || 'var(--tx)',
                            fontWeight: col.mono ? 600 : 500,
                            fontFamily: col.mono ? MONO : F,
                            direction: col.mono ? 'ltr' : undefined,
                            justifyContent: col.mono || col.kind === 'fee' || col.kind === 'file' || (col.edit && txt === '') ? 'center' : 'flex-start',
                            cursor: col.edit && canEdit ? 'cell' : 'default',
                          }
                          if (active) style.boxShadow = `inset 0 0 0 2px ${C.gold2}`

                          let content = txt
                          if (col.kind === 'rownum') {
                            const done = CORE_KEYS.map((k) => { const v = fieldOf(row, k); return v != null && v !== '' })
                            const n = done.filter(Boolean).length
                            content = (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                                <span style={{ width: 5, height: ROW_H - 14, borderRadius: 2, background: fileColor(row.file_number), flexShrink: 0 }} />
                                <span style={{ fontSize: 11.5, color: 'var(--tx3)', fontWeight: 600 }}>
                                  {T('ملف', 'File')} {row.file_number ?? '—'}
                                </span>
                                <span style={{ display: 'inline-flex', gap: 1.5 }} title={T(`${n} من ${CORE_KEYS.length} حقول إصدار`, `${n}/${CORE_KEYS.length} issuance fields`)}>
                                  {done.map((d, k) => <i key={k} style={{ width: 4, height: 11, borderRadius: 1, background: d ? C.ok : 'var(--bd)' }} />)}
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
                          } else if (col.kind === 'fee') {
                            content = <FeeCell T={T} fee={fee} hasIssuance={hasIssuance} canEdit={canEdit}
                              onRequest={() => { setFeeErr(null); setFeeDone(false); setFeeTarget(row) }} />
                          } else if (col.kind === 'sadad') {
                            content = txt ? <span style={{ color: C.gold2, fontWeight: 600 }}>{txt}</span>
                                          : <span style={{ fontSize: 11, color: 'var(--tx5)' }}>{T('لم يُسجَّل بعد', 'not set yet')}</span>
                          } else if (col.kind === 'file') {
                            /* المصدران معاً: الجدول يكتب visa_file_path، ونافذة الفاتورة
                               تكتب صفّ attachments فقط — فأيّهما وُجد فالملف موجود. */
                            const url = fieldOf(row, 'visa_file_path') || fileAtt[row.id] || ''
                            content = uploading === row.id
                              ? <span style={{ fontSize: 11, color: C.gold2, fontWeight: 600 }}>{T('جارٍ الرفع…', 'Uploading…')}</span>
                              : url
                                ? <a href={url} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()} className="vg-cellbtn"
                                    style={{ background: 'rgba(46,204,113,.12)', borderColor: 'rgba(46,204,113,.4)', color: C.ok, textDecoration: 'none' }}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                                    {T('عرض', 'View')}
                                  </a>
                                : canEdit
                                  ? <button type="button" className="vg-cellbtn" onMouseDown={(ev) => ev.stopPropagation()} onClick={(ev) => { ev.stopPropagation(); pickFile(row) }}
                                      title={hasIssuance ? T('أُدخلت بيانات الإصدار بلا ملف تأشيرة — النافذة في الفاتورة تشترطه', 'Issuance data entered without a visa file — the invoice modal requires it') : undefined}
                                      style={hasIssuance
                                        ? { background: 'rgba(217,148,0,.12)', borderColor: 'rgba(217,148,0,.45)', color: C.warn }
                                        : { background: 'transparent', borderColor: 'var(--bd)', color: 'var(--tx4)' }}>
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                      {hasIssuance ? T('رفع ⚠', 'Upload ⚠') : T('رفع', 'Upload')}
                                    </button>
                                  : <span style={{ color: 'var(--tx5)' }}>—</span>
                          } else if (col.kind === 'status' && txt) {
                            const code = statusById.get(fieldOf(row, 'usage_status_id'))?.code
                            content = <span style={{ color: STATUS_COLOR[code] || 'var(--tx)', fontWeight: 600 }}>{txt}</span>
                          } else if (col.edit && txt === '') {
                            content = <span style={{ width: '55%', height: 1, borderBottom: '1px dotted rgba(212,160,23,.45)' }} />
                          }

                          const showFill = canEdit && !editing && r === range.r2 && c === range.c2 && col.edit
                          return (
                            <div key={col.key} className="vg-cell" style={style} data-active={active ? '1' : undefined}
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
                                    statuses={statuses} facilities={facilities} isAr={isAr} commit={commitEdit} cancel={cancelEdit} />
                                : content}
                              {/* مقبض التعبئة داخل الخلية — لا حساب إحداثيات عام مع اختلاف
                                  ارتفاعات الأسطر بسبب عناوين الفواتير */}
                              {showFill && <span className="vg-fh" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); fillRef.current = range.r2; setFillTo(range.r2) }} />}
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
                {T('لا توجد تأشيرات في هذه المرحلة', 'No visas in this stage')}
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
            <button className="vg-pg" disabled={pageSafe === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx3)' }}>
              {T('صفحة', 'Page')} <span style={{ color: C.gold2, direction: 'ltr', display: 'inline-block' }}>{pageSafe + 1}</span> / <span style={{ direction: 'ltr', display: 'inline-block' }}>{totalPages}</span>
            </span>
            <button className="vg-pg" disabled={pageSafe + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
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
            <button type="button" className="vg-btn" onClick={discard} disabled={saving}>{T('تراجع عن الكل', 'Discard all')}</button>
            <button type="button" className="vg-btn pri" onClick={save} disabled={saving}>{saving ? T('جاري الحفظ…', 'Saving…') : T('حفظ التعديلات', 'Save changes')}</button>
          </div>
        </div>
      )}

      {/* ── نافذة طلب السداد ── */}
      {feeTarget && (() => {
        const fac = facById.get(fieldOf(feeTarget, 'main_facility_id'))
        return (
          <FKModal open onClose={closeFee} width={480} variant="create"
            title={T('طلب سداد رسوم التأشيرة', 'Request visa fee payment')}
            errorMsg={feeErr}
            success={feeDone ? <SuccessView title={T('أُرسل الطلب إلى السدادات', 'Sent to payments')} /> : undefined}
            footer={<ActionButton disabled={feeBusy} onClick={requestFee}>
              {feeBusy ? T('جارٍ الإرسال…', 'Sending…') : T('إرسال للسدادات', 'Send to payments')}
            </ActionButton>}>
            <ModalSection label={T('تفاصيل الطلب', 'Request details')}>
              <div style={{ ...GRID, paddingBlock: 8 }}>
                <InfoRow l={T('رقم المرجع', 'Ref no.')} v={feeTarget.sr?.request_ref_no || '—'} mono />
                <InfoRow l={T('المنشأة', 'Facility')} v={fac ? (fac.name_ar || fac.name_en) : T('لم تُحدَّد', 'not set')} />
                <InfoRow l={T('الرقم الموحد', 'Unified no.')} v={fieldOf(feeTarget, 'unified_number') || '—'} mono />
                <InfoRow l={T('رقم الموارد البشرية', 'HRSD no.')} v={fac?.hrsd_number || '—'} mono />
                <InfoRow l={T('المبلغ', 'Amount')} v={`${enNum(VISA_FEE_AMOUNT)} ${T('ريال', 'SAR')}`} strong />
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--tx4)', lineHeight: 1.7, marginTop: 6 }}>
                {T('يُنشأ طلب سداد معلّق يظهر في «سدادات الخدمات»، ويُستكمل هناك برقم السداد بعد الدفع.',
                   'Creates a pending fee that appears in Service Payments, completed there with the SADAD number.')}
              </div>
            </ModalSection>
          </FKModal>
        )
      })()}
    </div>
  )
}

/* ═══ خلية السداد ═══ */
function FeeCell({ T, fee, hasIssuance, canEdit, onRequest }) {
  if (!fee) {
    if (!canEdit) return <span style={{ color: 'var(--tx5)' }}>—</span>
    return (
      <button type="button" className="vg-cellbtn" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onRequest() }}
        style={{ background: 'rgba(176,125,0,.14)', borderColor: 'rgba(176,125,0,.45)', color: '#D4A017' }}>
        {T('طلب سداد 2٬000', 'Request 2,000')}
      </button>
    )
  }
  const paid = fee.status === 'paid'
  const c = paid ? '#2ecc71' : '#d99400'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: c }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />
      {paid ? T('مدفوع', 'paid') : T('بانتظار السداد', 'pending')}
      {/* لا قفل صلب — تحذير فقط، بقرار المستخدم */}
      {!paid && hasIssuance && <span title={T('أُدخلت بيانات الإصدار قبل سداد الرسم', 'Issuance data entered before the fee was paid')}>⚠</span>}
    </span>
  )
}

function InfoRow({ l, v, mono, strong }) {
  return (
    <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--bd2)' }}>
      <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600 }}>{l}</span>
      <span style={{ fontSize: strong ? 14 : 12.5, fontWeight: 600, color: strong ? '#D4A017' : 'var(--tx)',
        fontFamily: mono ? MONO : F, direction: mono ? 'ltr' : undefined }}>{v}</span>
    </div>
  )
}

/* ═══ محرّر الخلية — غير متحكَّم به: القيمة تُقرأ من الـref عند الإنهاء ═══ */
function CellEditor({ col, seed, initial, inputRef, statuses, facilities, isAr, commit, cancel }) {
  const stop = (e) => e.stopPropagation()
  const onKey = (e) => {
    e.stopPropagation()
    if (e.key === 'Enter') { e.preventDefault(); commit([1, 0]) }
    else if (e.key === 'Escape') { e.preventDefault(); cancel() }
    else if (e.key === 'Tab') { e.preventDefault(); commit([0, e.shiftKey ? -1 : 1]) }
  }

  if (col.kind === 'status') {
    return (
      <select autoFocus defaultValue={initial} onMouseDown={stop} onKeyDown={onKey}
        onChange={(e) => commit(null, e.target.value)} onBlur={() => commit(null, initial)}
        style={{ width: '100%', height: '100%', background: 'var(--modal-bg,#1a1a1a)', color: 'var(--tx)', border: 'none', outline: 'none', fontFamily: F, fontSize: 12.5 }}>
        <option value="">—</option>
        {statuses.map((s) => {
          const label = isAr ? s.value_ar : (s.value_en || s.value_ar)
          return <option key={s.id} value={label}>{label}</option>
        })}
      </select>
    )
  }

  const listId = col.kind === 'uni' ? 'vg-uni-list' : col.kind === 'hrsd' ? 'vg-hrsd-list' : col.kind === 'gosi' ? 'vg-gosi-list' : undefined
  return (
    <>
      <input className="vg-in" autoFocus ref={inputRef} list={listId}
        defaultValue={seed != null ? seed : initial}
        onMouseDown={stop} onKeyDown={onKey} onBlur={() => commit(null)}
        onFocus={(e) => { if (seed == null) e.target.select(); else e.target.setSelectionRange(seed.length, seed.length) }}
        placeholder={col.kind === 'date' ? 'YYYY-MM-DD' : undefined}
        style={{ textAlign: col.mono ? 'center' : 'start', direction: col.mono ? 'ltr' : undefined,
          fontFamily: col.mono ? MONO : F, fontWeight: 600, color: '#D4A017' }} />
      {listId && (
        <datalist id={listId}>
          {facilities.slice(0, 1500).map((f) => {
            const v = col.kind === 'uni' ? f.unified_number : col.kind === 'gosi' ? f.gosi_number : f.hrsd_number
            return v ? <option key={f.id} value={v}>{f.name_ar || f.name_en || ''}</option> : null
          })}
        </datalist>
      )}
    </>
  )
}

const selCss = {
  height: 36, padding: '0 10px', borderRadius: 9, background: 'var(--search-bg)',
  border: '1px solid transparent', color: 'var(--tx2)', fontSize: 12.5, fontFamily: F,
  outline: 'none', cursor: 'pointer', boxSizing: 'border-box', maxWidth: 175, flexShrink: 0,
}
