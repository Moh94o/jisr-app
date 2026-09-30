#!/usr/bin/env node
/**
 * export-facility-partners — إكسل المنشآت (البيانات الأساسية) مع الشركاء والمدير من المركز السعودي للأعمال.
 *
 * المصدر: جدول facilities (السجل) + sbc_facilities.raw_cr_data (parityList / mangmentInformation / crActivities).
 * الأعمدة: اسم المنشأة | الرقم الموحد | تاريخ قيد السجل | الشريك الأول والثاني (الاسم، رقم الهوية
 *          أو الرقم الموحد إن كان منشأة، قيمة الحصة) | المدير ورقم هويته | النشاط | رأس المال | المدينة | المكتب
 *
 * قيمة الحصة = رأس المال × حصص الشريك ÷ مجموع الحصص.
 * ما ليس في المركز السعودي يُكمَل من حقول السجل (capital / activity_ar / cr_issue_date / city_ar).
 *
 * الاستخدام: node scripts/export-facility-partners.mjs [--out "path.xlsx"]
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

async function fetchAll(table, cols, filter = (q) => q, step = 1000) {
  const out = []
  for (let from = 0; ; from += step) {
    const { data, error } = await filter(sb.from(table).select(cols)).order('id').range(from, from + step - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...data)
    if (data.length < step) break
  }
  console.log(`  ${table}: ${out.length}`)
  return out
}

const txt = (v) => { const s = String(v ?? '').trim(); return s && s !== 'null' ? s : '' }
const num = (v) => (v === null || v === undefined || v === '' || isNaN(+v) ? null : +v)
const day = (v) => {
  const m = txt(v).match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return null
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
}
const personName = (p) => [p?.firstNameAr, p?.fatherNameAr, p?.grandFatherNameAr, p?.familyNameAr].map(txt).filter(Boolean).join(' ')

// شريك واحد من parityList → { kind, name, id, shares }
function partnerOf(p) {
  const shares = num(p?.partnerShare?.totalContributionCount)
  if (p?.personInfo) return { kind: txt(p.parityType?.parityTypeDescriptionAr) || 'فرد', name: personName(p.personInfo), id: txt(p.personInfo.identifierNo), shares }
  const ent = p?.saudiCompany || p?.establishment || p?.gccCompany || p?.foreignCompany || p?.organization || p?.endowment || p?.institute
  if (ent) return {
    kind: txt(p.parityType?.parityTypeDescriptionAr) || 'منشأة',
    name: txt(ent.companyNameAr) || txt(ent.establishmentNameAr) || txt(ent.nameAr) || txt(ent.companyNameEn) || txt(ent.establishmentNameEn),
    id: txt(ent.crNationalNumber) || txt(ent.crNumber) || txt(ent.identifierNo),
    shares,
  }
  return { kind: txt(p?.parityType?.parityTypeDescriptionAr), name: '', id: '', shares }
}

console.log('جلب البيانات…')
const [facilities, sbcRows, branches] = await Promise.all([
  fetchAll('facilities', 'id,name_ar,unified_number,cr_issue_date,activity_ar,capital,city_ar,branch_id,sbc_facility_id',
    (q) => q.is('deleted_at', null).is('merged_into_id', null)),
  fetchAll('sbc_facilities',
    'id,cr_national_number,capital,headquarter_city_ar,cr_issue_date_gregorian,full_activities_text,' +
    'parities:raw_cr_data->parityList,managers:raw_cr_data->mangmentInformation->managerList,acts:raw_cr_data->crActivities->activityList',
    (q) => q, 300),
  fetchAll('branches', 'id,branch_code'),
])
const sbcById = new Map(sbcRows.map((r) => [r.id, r]))
const branchCode = new Map(branches.map((b) => [b.id, txt(b.branch_code)]))

const rows = facilities.map((f) => {
  const s = sbcById.get(f.sbc_facility_id) || {}
  const capital = num(s.capital) ?? num(f.capital)
  const partners = (Array.isArray(s.parities) ? s.parities : []).map(partnerOf)
  const totalShares = partners.reduce((a, p) => a + (p.shares || 0), 0)
  const shareValue = (p) => (p && capital !== null && totalShares > 0 && p.shares !== null ? Math.round((capital * p.shares / totalShares) * 100) / 100 : null)
  const managers = (Array.isArray(s.managers) ? s.managers : []).filter((m) => m?.personInfo)
  const acts = (Array.isArray(s.acts) ? s.acts : []).map((a) => txt(a?.activityDescriptionAr)).filter(Boolean)
  const [p1, p2] = partners
  return {
    name: txt(f.name_ar),
    unified: txt(f.unified_number) || txt(s.cr_national_number),
    crDate: day(s.cr_issue_date_gregorian) || day(f.cr_issue_date),
    p1Name: p1?.name || '', p1Id: p1?.id || '', p1Kind: p1?.kind || '', p1Value: shareValue(p1),
    p2Name: p2?.name || '', p2Id: p2?.id || '', p2Kind: p2?.kind || '', p2Value: shareValue(p2),
    mgrName: managers.map((m) => personName(m.personInfo)).join('\n'),
    mgrId: managers.map((m) => txt(m.personInfo.identifierNo)).join('\n'),
    activity: acts.join('، ') || txt(f.activity_ar) || txt(s.full_activities_text),
    capital,
    city: txt(s.headquarter_city_ar) || txt(f.city_ar),
    office: branchCode.get(f.branch_id) || '',
    hasSbc: Array.isArray(s.parities),
  }
}).filter((r) => r.hasSbc)  // فقط ما له سجلّ في المركز السعودي
  .sort((a, b) => a.name.localeCompare(b.name, 'ar'))

// ── الإكسل ──────────────────────────────────────────────────────────────────
const wb = new ExcelJS.Workbook()
const ws = wb.addWorksheet('المنشآت', { views: [{ state: 'frozen', ySplit: 2, rightToLeft: true }] })

const COLS = [
  ['name', 'اسم المنشأة', 38],
  ['unified', 'الرقم الموحد', 14],
  ['crDate', 'تاريخ قيد السجل', 14],
  ['p1Name', 'الاسم', 32], ['p1Id', 'رقم الهوية / الرقم الموحد', 16], ['p1Kind', 'الصفة', 12], ['p1Value', 'قيمة الحصة', 13],
  ['p2Name', 'الاسم', 32], ['p2Id', 'رقم الهوية / الرقم الموحد', 16], ['p2Kind', 'الصفة', 12], ['p2Value', 'قيمة الحصة', 13],
  ['mgrName', 'اسم المدير', 30], ['mgrId', 'رقم هوية المدير', 14],
  ['activity', 'نشاط الشركة', 60],
  ['capital', 'رأس المال', 13],
  ['city', 'المدينة', 14],
  ['office', 'المكتب', 10],
]
ws.columns = COLS.map(([key, , width]) => ({ key, width }))

// صفّ الأشرطة (الشريك الأول / الثاني / المدير) ثم صفّ العناوين
const band = ws.getRow(1)
const head = ws.getRow(2)
COLS.forEach(([, label], i) => { head.getCell(i + 1).value = label })
const bands = [[1, 3, 'المنشأة'], [4, 7, 'الشريك الأول'], [8, 11, 'الشريك الثاني'], [12, 13, 'المدير'], [14, 17, 'بيانات السجل']]
for (const [a, b, label] of bands) { ws.mergeCells(1, a, 1, b); band.getCell(a).value = label }

const NAVY = 'FF1F3864', GOLD = 'FFB8962E'
for (const [row, color] of [[band, GOLD], [head, NAVY]]) {
  row.height = 24
  row.eachCell({ includeEmpty: true }, (c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    c.border = { left: { style: 'thin', color: { argb: 'FFFFFFFF' } }, right: { style: 'thin', color: { argb: 'FFFFFFFF' } } }
  })
}

rows.forEach((r, i) => {
  const row = ws.addRow(r)
  const zebra = i % 2 ? 'FFF7F3E8' : 'FFFFFFFF'
  row.eachCell({ includeEmpty: true }, (c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebra } }
    c.alignment = { vertical: 'top', wrapText: true, horizontal: c.alignment?.horizontal }
  })
})

const last = ws.rowCount
ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: last, column: COLS.length } }
const colOf = (k) => COLS.findIndex(([key]) => key === k) + 1
for (const k of ['unified', 'crDate', 'p1Id', 'p1Kind', 'p2Id', 'p2Kind', 'mgrId', 'city', 'office']) {
  for (let r = 3; r <= last; r++) ws.getRow(r).getCell(colOf(k)).alignment = { horizontal: 'center', vertical: 'top', wrapText: true }
}
ws.getColumn(colOf('crDate')).numFmt = 'yyyy-mm-dd'
for (const k of ['p1Value', 'p2Value', 'capital']) ws.getColumn(colOf(k)).numFmt = '#,##0.##'

const outArg = process.argv.indexOf('--out')
const out = outArg > -1 ? process.argv[outArg + 1]
  : path.resolve(here, '..', '..', `المنشآت_الشركاء_والمدراء_${new Date().toISOString().slice(0, 10)}.xlsx`)
await wb.xlsx.writeFile(out)

const withSbc = rows.length
console.log(`\nتم: ${rows.length} منشأة (استُبعد ${facilities.length - withSbc} بلا بيانات المركز السعودي)`)
console.log(`  بشريكين: ${rows.filter((r) => r.p2Name).length} · بمدير: ${rows.filter((r) => r.mgrName).length}`)
console.log(`الملف: ${out}`)
