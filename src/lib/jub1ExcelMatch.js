// مطابقة سندات JUB1 مع مرجع «اكسل المكتب» (jub1_excel_ref).
//
// ⚠ قاعدة ثابتة: المصدر الرسمي لأي قيمة هو صورة السند الورقي.
//   الإكسل مساعد تحقّق فقط — هذه الوحدة تَعرِض الفرق ولا تكتب ولا تُرجِّح قيمة على أخرى.
//
// تُستخدم من الواجهة (Jub1ReceiptsPage) ومن scripts/jub1-excel-ref.mjs — مصدر واحد لمنطق المطابقة.

export const normId = (s) => String(s ?? '').replace(/\D/g, '')
export const normName = (s) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9؀-ۿ]/g, '')
export const normPhone = (s) => { const d = normId(s); return d.length > 9 ? d.slice(-9) : d }
const numOf = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null }

// كل أرقام السندات التي يحملها إدخال واحد: السند الرئيسي + سندات الدفعات + أرقام السندات السابقة.
export function sanadsOfReceipt(e) {
  const out = [
    e?.primary_receipt_no,
    ...((e?.payments || []).map(p => p?.sanad_no)),
    ...String(e?.previous_receipt_nos ?? '').split(/[^\d]+/),
  ].map(s => String(s ?? '').trim()).filter(s => /^\d{2,5}$/.test(s))
  return [...new Set(out)]
}

// فهرس: رقم السند → صفوف الإكسل التي تذكره (سند واحد قد يغطي عدة صفوف في شيتات التأشيرات).
export function buildRefIndex(refRows) {
  const m = new Map()
  for (const r of refRows || []) {
    for (const s of r.sanads || []) {
      const k = String(s).trim()
      if (!k) continue
      if (!m.has(k)) m.set(k, [])
      m.get(k).push(r)
    }
  }
  return m
}

// وزن الاتفاق: الإقامة أقوى دليل هوية، ثم الاسم، ثم الإجمالي.
// يُستخدم لاختيار أفضل صف مرشّح حين يطابق السند أكثر من صف — لا لترجيح قيمة الإكسل.
function score(e, r) {
  let s = 0
  const eId = normId(e.client_id_no), rId = normId(r.client_id_no)
  if (eId && rId) s += (eId === rId ? 4 : -2)
  const eN = normName(e.client_name), rN = normName(r.client_name)
  if (eN && rN) s += (eN === rN ? 2 : -1)
  const eT = numOf(e.total_amount), rT = numOf(r.total_amount)
  if (eT != null && rT != null) s += (Math.abs(eT - rT) <= 0.5 ? 1 : 0)
  // الجوال: تطابقه يقوّي، واختلافه لا يُعاقَب — جوال الإكسل قد يكون جوال الطرف لا العامل
  const eP = normPhone(e.client_phone), rP = normPhone(r.client_phone)
  if (eP && rP && eP === rP) s += 1
  return s
}

const FIELDS = [
  { key: 'client_id_no', label: ['رقم الإقامة', 'ID number'], cmp: (a, b) => normId(a) === normId(b) },
  { key: 'client_name', label: ['اسم العميل', 'Client name'], cmp: (a, b) => normName(a) === normName(b) },
  { key: 'total_amount', label: ['الإجمالي', 'Total'], cmp: (a, b) => Math.abs(numOf(a) - numOf(b)) <= 0.5 },
]

// هل تختلف قيمة السند عن قيمة الإكسل في هذا الحقل؟ (فارغ في أي طرف = لا يُعدّ اختلافاً)
export function fieldDiffers(key, mine, excel) {
  const f = FIELDS.find(x => x.key === key)
  const filled = (v) => v !== null && v !== undefined && String(v).trim() !== ''
  if (!f || !filled(mine) || !filled(excel)) return false
  return !f.cmp(mine, excel)
}

/**
 * يطابق إدخالاً واحداً مع الإكسل.
 * @returns {null | {best, candidates, ambiguous, weak, diffs: [{key,label,mine,excel}]}}
 *   null = لا يوجد أي صف بالإكسل يذكر أرقام سندات هذا الإدخال.
 *   diffs = الحقول المعبّأة في الطرفين والمختلفة عن أفضل مرشّح.
 *   weak = لا مرشّح يتفق في أي حقل هوية (المطابقة بالرقم وحده — تُعامل بحذر).
 */
export function matchReceipt(e, index) {
  const cands = []
  const seen = new Set()
  for (const s of sanadsOfReceipt(e)) {
    for (const r of index.get(s) || []) {
      if (seen.has(r.id)) continue
      seen.add(r.id); cands.push(r)
    }
  }
  if (!cands.length) return null

  const scored = cands.map(r => ({ r, s: score(e, r) })).sort((a, b) => b.s - a.s)
  const best = scored[0].r
  const diffs = []
  for (const f of FIELDS) {
    const mine = e[f.key], excel = best[f.key]
    const filled = (v) => v !== null && v !== undefined && String(v).trim() !== ''
    if (!filled(mine) || !filled(excel)) continue
    if (!f.cmp(mine, excel)) diffs.push({ key: f.key, label: f.label, mine, excel })
  }
  return { best, candidates: cands, ambiguous: cands.length > 1, weak: scored[0].s <= 0, diffs }
}
