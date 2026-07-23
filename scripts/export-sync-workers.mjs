#!/usr/bin/env node
/**
 * export-sync-workers — تصدير إكسل موحّد لجميع العمالة من مركز المزامنة.
 *
 * المصادر بترتيب الأهمية/الثقة:  مقيم  ثم  قوى  ثم  التأمينات.
 * كل حقل يؤخذ من أعلى مصدر متاح لديه قيمة (رخصة العمل من قوى فقط).
 *
 * الأعمدة: كود فرع المكتب | اسم العامل | رقم الإقامة | الجنسية |
 *          تاريخ انتهاء الإقامة | تاريخ انتهاء رخصة العمل | الرقم الموحد للمنشأة
 *          (+ اسم المنشأة، المصادر)
 *
 * التلوين تنسيق شرطي حيّ يعتمد TODAY():
 *   منتهي            → أحمر غامق
 *   ≤ 10 أيام متبقية → أحمر
 *   ≤ 30 يوم متبقية  → أصفر
 *
 * الاستخدام: node scripts/export-sync-workers.mjs [--out "path.xlsx"]
 * السر: SUPABASE_SERVICE_ROLE_KEY من scripts/.env.jub1
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'

const here = path.dirname(fileURLToPath(import.meta.url))
loadDotEnv(path.join(here, '.env.jub1'))

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gcvshzutdslmdkwqwteh.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SERVICE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY مفقود'); process.exit(1) }
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

async function fetchAll(table, cols) {
  const out = []
  const step = 1000
  for (let from = 0; ; from += step) {
    const { data, error } = await sb.from(table).select(cols).range(from, from + step - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...data)
    if (data.length < step) break
  }
  console.log(`  ${table}: ${out.length}`)
  return out
}

const digits = (v) => String(v ?? '').replace(/\D/g, '')
const txt = (v) => { const s = String(v ?? '').trim(); return s && s !== 'null' ? s : '' }
const day = (v) => {
  const s = txt(v); if (!s) return null
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return null
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
}

console.log('جلب البيانات من مركز المزامنة…')
const [
  muqeem, qiwaEmp, qiwaWp, gosi,
  qiwaCos, gosiEsts, facilities, branches, workers,
] = await Promise.all([
  fetchAll('muqeem_residents', 'iqama_number,sponsor_moi_number,name_ar,name_en,nationality_ar,nationality_en,iqama_expiry_date'),
  fetchAll('qiwa_employees', 'company_id,id_no,border_no,name_full,nationality_ar,nationality_en,iqama_expiry_date,work_permit_expiry_date'),
  fetchAll('qiwa_wp_laborers', 'company_id,employee_id,border_no,employee_name,nationality_name_ar,nationality_name_en,iqama_expiry_date,employee_id_exp_date,work_permit_exp_date'),
  fetchAll('gosi_establishment_contributors', 'registration_no,iqama_no,national_id,border_no,first_name_ar,second_name_ar,third_name_ar,family_name_ar,full_name_en,nationality_ar,nationality_en,iqama_expiry_date'),
  fetchAll('qiwa_companies', 'company_id,cr_national_number,company_name'),
  fetchAll('gosi_establishments', 'registration_no,unified_national_number,name_ar'),
  fetchAll('facilities', 'id,name_ar,name_en,unified_number,gosi_number,branch_id,deleted_at'),
  fetchAll('branches', 'id,branch_code,name_ar,deleted_at'),
  fetchAll('workers', 'iqama_number,border_number,branch_id,current_facility_id,deleted_at'),
])

// ── فهارس المنشآت ───────────────────────────────────────────────────────────
const branchById = new Map(branches.filter(b => !b.deleted_at).map(b => [b.id, b]))
const facByUnified = new Map(), facByGosi = new Map()
for (const f of facilities) {
  if (f.deleted_at) continue
  const u = digits(f.unified_number), g = txt(f.gosi_number)
  if (u && !facByUnified.has(u)) facByUnified.set(u, f)
  if (g && !facByGosi.has(g)) facByGosi.set(g, f)
}
const qiwaCoById = new Map(qiwaCos.map(c => [c.company_id, c]))
const gosiEstByReg = new Map(gosiEsts.map(e => [txt(e.registration_no), e]))

const facById = new Map(facilities.map(f => [f.id, f]))
const brCode = (id) => { const b = id ? branchById.get(id) : null; return b ? txt(b.branch_code) : '' }

/** يحوّل الرقم الموحد إلى (اسم المنشأة، كود فرع المكتب الاحتياطي) */
function facInfo(unified, gosiReg) {
  const f = (unified && facByUnified.get(digits(unified))) || (gosiReg && facByGosi.get(txt(gosiReg))) || null
  return { facName: f ? (txt(f.name_en) || txt(f.name_ar)) : '', facBranchCode: f ? brCode(f.branch_id) : '' }
}

// ── كود فرع المكتب من العمالة الدائمة (workers) ──────────────────────────────
// فرع العامل يرث فرع منشأته افتراضياً ويمكن تخصيصه يدوياً — التخصيص يفوز.
const branchByIqama = new Map()
for (const w of workers) {
  if (w.deleted_at) continue
  const code = brCode(w.branch_id) || brCode(facById.get(w.current_facility_id)?.branch_id)
  if (!code) continue
  for (const k of [digits(w.iqama_number), digits(w.border_number)]) {
    if (k && !branchByIqama.has(k)) branchByIqama.set(k, code)
  }
}
console.log(`  ← كود الفرع متاح لـ ${branchByIqama.size} رقم من العمالة الدائمة`)

// ── تطبيع كل مصدر إلى صف موحّد ──────────────────────────────────────────────
/** @type {Map<string, Array<any>>} iqama → المرشّحون مرتبين حسب أولوية المصدر */
const bucket = new Map()
const push = (row) => {
  if (!row.iqama) return
  if (!bucket.has(row.iqama)) bucket.set(row.iqama, [])
  bucket.get(row.iqama).push(row)
}

for (const r of muqeem) {
  const unified = digits(r.sponsor_moi_number)
  push({
    prio: 1, source: 'Muqeem', iqama: digits(r.iqama_number),
    name: txt(r.name_en) || txt(r.name_ar),
    nationality: txt(r.nationality_en) || txt(r.nationality_ar),
    iqamaExpiry: day(r.iqama_expiry_date), wpExpiry: null,
    unified, ...facInfo(unified, null),
  })
}
for (const r of qiwaEmp) {
  const co = qiwaCoById.get(r.company_id)
  const unified = digits(co?.cr_national_number)
  push({
    prio: 2, source: 'Qiwa', iqama: digits(r.id_no) || digits(r.border_no),
    name: txt(r.name_full),
    nationality: txt(r.nationality_en) || txt(r.nationality_ar),
    iqamaExpiry: day(r.iqama_expiry_date), wpExpiry: day(r.work_permit_expiry_date),
    unified, ...facInfo(unified, null),
  })
}
for (const r of qiwaWp) {
  const co = qiwaCoById.get(r.company_id)
  const unified = digits(co?.cr_national_number)
  push({
    prio: 2.5, source: 'Qiwa', iqama: digits(r.employee_id) || digits(r.border_no),
    name: txt(r.employee_name),
    nationality: txt(r.nationality_name_en) || txt(r.nationality_name_ar),
    iqamaExpiry: day(r.iqama_expiry_date) || day(r.employee_id_exp_date),
    wpExpiry: day(r.work_permit_exp_date),
    unified, ...facInfo(unified, null),
  })
}
for (const r of gosi) {
  const est = gosiEstByReg.get(txt(r.registration_no))
  const unified = digits(est?.unified_national_number)
  const nameAr = [r.first_name_ar, r.second_name_ar, r.third_name_ar, r.family_name_ar]
    .map(txt).filter(Boolean).join(' ')
  push({
    prio: 3, source: 'GOSI', iqama: digits(r.iqama_no) || digits(r.national_id) || digits(r.border_no),
    name: txt(r.full_name_en) || nameAr,
    nationality: txt(r.nationality_en) || txt(r.nationality_ar),
    iqamaExpiry: day(r.iqama_expiry_date), wpExpiry: null,
    unified, ...facInfo(unified, r.registration_no),
  })
}

// ── الدمج: أعلى مصدر لديه قيمة يفوز، حقلاً بحقل ─────────────────────────────
const FIELDS = ['name', 'nationality', 'iqamaExpiry', 'wpExpiry', 'unified', 'facName', 'facBranchCode']
const rows = []
for (const [iqama, cands] of bucket) {
  cands.sort((a, b) => a.prio - b.prio)
  const merged = { iqama }
  for (const f of FIELDS) merged[f] = cands.find(c => c[f])?.[f] ?? (f.endsWith('Expiry') ? null : '')
  // كود الفرع مصدره العمالة الدائمة؛ ولا نُفرّغ الخلية إن لم يوجد سجل دائم — نرجع لفرع المنشأة.
  merged.branchCode = branchByIqama.get(iqama) || merged.facBranchCode
  merged.sources = [...new Set(cands.map(c => c.source))].join(' + ')
  rows.push(merged)
}
rows.sort((a, b) =>
  (a.branchCode || 'zz').localeCompare(b.branchCode || 'zz') ||
  (a.unified || '').localeCompare(b.unified || '') ||
  (a.name || '').localeCompare(b.name || ''))
console.log(`Unified rows: ${rows.length}`)

// ── فلترة اختيارية على فرع المكتب ───────────────────────────────────────────
const brArg = process.argv.indexOf('--branch')
const onlyBranch = brArg > -1 ? String(process.argv[brArg + 1] || '').toUpperCase() : ''
const outRows = onlyBranch ? rows.filter(r => (r.branchCode || '').toUpperCase() === onlyBranch) : rows
if (onlyBranch) console.log(`Filtered to ${onlyBranch}: ${outRows.length} rows`)

// ── بناء الإكسل ─────────────────────────────────────────────────────────────
const wb = new ExcelJS.Workbook()
wb.creator = 'jisr — Sync Hub'
const ws = wb.addWorksheet('Workers', { views: [{ state: 'frozen', ySplit: 1 }] })

ws.columns = [
  { header: 'Office Branch Code', key: 'branchCode', width: 18 },
  { header: 'Worker Name', key: 'name', width: 36 },
  { header: 'Iqama Number', key: 'iqama', width: 16 },
  { header: 'Nationality', key: 'nationality', width: 18 },
  { header: 'Iqama Expiry Date', key: 'iqamaExpiry', width: 19 },
  { header: 'Work Permit Expiry Date', key: 'wpExpiry', width: 24 },
  { header: 'Company Unified Number', key: 'unified', width: 23 },
  { header: 'Company Name', key: 'facName', width: 40 },
  { header: 'Sources', key: 'sources', width: 22 },
]
ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } }
ws.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' }
ws.getRow(1).height = 26

for (const r of outRows) ws.addRow(r)

const last = ws.rowCount
ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: last, column: 9 } }
for (const col of ['C', 'G']) ws.getColumn(col).alignment = { horizontal: 'center' }
for (const col of ['E', 'F']) {
  ws.getColumn(col).numFmt = 'yyyy-mm-dd'
  ws.getColumn(col).alignment = { horizontal: 'center' }
}

// تنسيق شرطي حيّ — يُعاد حسابه كل يوم عبر TODAY()
const RULES = [
  { d: 0, fill: 'FF9C0006', font: 'FFFFFFFF', bold: true },   // منتهية → أحمر غامق
  { d: 10, fill: 'FFFFC7CE', font: 'FF9C0006', bold: false }, // ≤ 10 أيام → أحمر
  { d: 30, fill: 'FFFFEB9C', font: 'FF9C6500', bold: false }, // ≤ 30 يوم → أصفر
]
for (const [col, letter] of [[5, 'E'], [6, 'F']]) {
  const ref = `${letter}2:${letter}${last}`
  ws.addConditionalFormatting({
    ref,
    rules: RULES.map((r, i) => ({
      type: 'expression',
      priority: i + 1,
      formulae: [r.d === 0
        ? `AND(${letter}2<>"",${letter}2<TODAY())`
        : `AND(${letter}2<>"",${letter}2<=TODAY()+${r.d})`],
      style: {
        fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: r.fill } },
        font: { color: { argb: r.font }, bold: r.bold },
      },
    })),
  })
  void col
}

// Colour key sheet
const key = wb.addWorksheet('Colour Key')
key.columns = [{ width: 22 }, { width: 74 }]
const legend = [
  ['Expired', 'Date is earlier than today', 'FF9C0006', 'FFFFFFFF'],
  ['Within 10 days', '10 days or less left before expiry', 'FFFFC7CE', 'FF9C0006'],
  ['Within 30 days', '30 days or less left before expiry', 'FFFFEB9C', 'FF9C6500'],
]
key.addRow(['Status', 'Definition']).font = { bold: true }
for (const [label, desc, fill, font] of legend) {
  const row = key.addRow([label, desc])
  row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } }
  row.getCell(1).font = { color: { argb: font }, bold: true }
}
key.addRow([])
key.addRow(['Note', 'Colours are live conditional formatting based on TODAY() — they refresh every time the file is opened.'])
key.addRow(['Sources', 'Priority: Muqeem → Qiwa → GOSI. Each field is taken from the highest-priority source that has a value.'])
key.addRow(['Work permit', 'Available from Qiwa only.'])
key.addRow(['Office branch code', 'Taken from the permanent workforce (workers), matched by iqama / border number.'])
if (onlyBranch) key.addRow(['Filter', `Office branch = ${onlyBranch}`])
key.addRow(['Exported on', new Date().toISOString().slice(0, 10)])

const outArg = process.argv.indexOf('--out')
const stamp = new Date().toISOString().slice(0, 10)
const out = outArg > -1 ? process.argv[outArg + 1]
  : path.join(process.env.USERPROFILE || here, 'OneDrive', 'Desktop',
      `${onlyBranch ? onlyBranch + '-' : ''}sync-hub-workers-${stamp}.xlsx`)
await wb.xlsx.writeFile(out)
console.log(`Done: ${out}`)
