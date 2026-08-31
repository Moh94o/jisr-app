#!/usr/bin/env node
/**
 * add-nitaqat-color — يضيف عمود «لون النطاق» إلى إكسل رخص العمل الموجود، ملوّناً بلون النطاق نفسه.
 *
 * المصدر (بالأولوية):
 *   1) qiwa_companies.nitaqat_color_ar        — النطاق الحيّ من قوى (المطابقة برقم الموارد البشرية ثم الرقم الموحّد)
 *   2) qiwa_companies.sc_nitaqat_color_ar     — لون شهادة السعودة
 *   3) v_ops_facilities_detailed.hrsd_nitaq_name — نطاق المنشأة من المركز السعودي (SBC)
 *
 * الاستخدام: node scripts/add-nitaqat-color.mjs --file "path.xlsx" [--dry]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'

const here = path.dirname(fileURLToPath(import.meta.url))
for (const line of fs.readFileSync(path.join(here, '.env.jub1'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const sb = createClient(process.env.SUPABASE_URL || 'https://gcvshzutdslmdkwqwteh.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const argOf = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d }
const DRY = process.argv.includes('--dry')
const FILE = argOf('--file', path.join(process.env.USERPROFILE, 'OneDrive', 'Desktop', 'work-permit-expiry-2027-01-30-2026-08-31.xlsx'))

const txt = (v) => { const s = String(v ?? '').trim(); return s && s !== 'null' ? s : '' }
const digits = (v) => String(v ?? '').replace(/\D/g, '')
const hrsdKey = (v) => { const d = digits(v); return d ? String(Number(d)) : '' } // 15-4027261 → 154027261

async function fetchAll(table, cols) {
  const out = []; const step = 1000
  for (let from = 0; ; from += step) {
    const { data, error } = await sb.from(table).select(cols).range(from, from + step - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...data); if (data.length < step) break
  }
  console.log(`  ${table}: ${out.length}`)
  return out
}

/* لون النطاق — نفس خريطة nitaqBandColor في البرنامج (OpsExcelsPage) */
function bandHex(name) {
  const n = txt(name); if (!n) return null
  if (n.includes('بلاتيني') || n.includes('بلاتين')) return '8F96A3'
  if (n.includes('أحمر') || n.includes('احمر')) return 'EF4444'
  if (n.includes('أصفر') || n.includes('اصفر')) return 'EAB308'
  if (n.includes('أخضر') || n.includes('اخضر')) {
    if (n.includes('مرتفع')) return '22C55E'
    if (n.includes('متوسط')) return '16A085'
    if (n.includes('منخفض') || n.includes('صغير')) return '84CC16'
    return '22C55E'
  }
  return null
}
/* خلفية فاتحة من اللون (مزج مع الأبيض) ليبقى النص مقروءاً — نظير rgba(...,.30) في الواجهة */
const tint = (hex, a = 0.30) => {
  if (!hex) return null
  const mix = (c) => Math.round(parseInt(c, 16) * a + 255 * (1 - a)).toString(16).padStart(2, '0').toUpperCase()
  return 'FF' + mix(hex.slice(0, 2)) + mix(hex.slice(2, 4)) + mix(hex.slice(4, 6))
}
const dark = (hex) => {
  if (!hex) return null
  const mix = (c) => Math.round(parseInt(c, 16) * 0.55).toString(16).padStart(2, '0').toUpperCase()
  return 'FF' + mix(hex.slice(0, 2)) + mix(hex.slice(2, 4)) + mix(hex.slice(4, 6))
}

console.log('جلب النطاقات…')
const [qiwa, facs, view, muqeemRes, gosiContrib, gosiEsts] = await Promise.all([
  fetchAll('qiwa_companies', 'company_labor_office_id,company_sequence_number,cr_national_number,company_unified_number_id,establishment_name,company_name,nitaqat_color_ar,sc_nitaqat_color_ar,indicator_nitaqat_level_ar,synced_at'),
  fetchAll('v_ops_facilities_detailed', 'name_ar,unified_number,hrsd_number,nitaqat_color,hrsd_nitaq_name'),
  fetchAll('v_ops_sync_workforce', 'iqama_number,unified_number,hrsd_number,facility_ar,gosi_number'),
  fetchAll('muqeem_residents', 'iqama_number,sponsor_moi_number'),
  fetchAll('gosi_establishment_contributors', 'iqama_no,registration_no'),
  fetchAll('gosi_establishments', 'registration_no,unified_national_number'),
])

const byHrsd = new Map(), byUnified = new Map(), byName = new Map()
const put = (map, k, v) => { if (!k || !v.band) return; const p = map.get(k); if (!p || String(v.at ?? '') > String(p.at ?? '')) map.set(k, v) }
for (const c of qiwa) {
  const band = txt(c.nitaqat_color_ar) || txt(c.sc_nitaqat_color_ar) || txt(c.indicator_nitaqat_level_ar)
  const rec = { band, src: 'قوى', at: c.synced_at }
  if (c.company_labor_office_id && c.company_sequence_number) put(byHrsd, hrsdKey(`${c.company_labor_office_id}${c.company_sequence_number}`), rec)
  put(byUnified, digits(c.cr_national_number), rec)
  put(byUnified, digits(c.company_unified_number_id), rec)
  put(byName, txt(c.establishment_name), rec)
  put(byName, txt(c.company_name), rec)
}
for (const f of facs) {
  const rec = { band: txt(f.nitaqat_color) || txt(f.hrsd_nitaq_name), src: txt(f.nitaqat_color) ? 'قوى' : 'المركز السعودي', at: '' }
  if (!rec.band) continue
  if (!byHrsd.has(hrsdKey(f.hrsd_number))) put(byHrsd, hrsdKey(f.hrsd_number), rec)
  if (!byUnified.has(digits(f.unified_number))) put(byUnified, digits(f.unified_number), rec)
  if (!byName.has(txt(f.name_ar))) put(byName, txt(f.name_ar), rec)
}
// احتياطات الرقم الموحّد حين لا يحمله صفّ العرض: من مقيم (رقم كفيل الداخلية) ثم من التأمينات
const moiByIqama = new Map()
for (const m of muqeemRes) { const k = digits(m.iqama_number), s = digits(m.sponsor_moi_number); if (k && s && !moiByIqama.has(k)) moiByIqama.set(k, s) }
const regByIqama = new Map()
for (const c of gosiContrib) { const k = digits(c.iqama_no), r = txt(c.registration_no); if (k && r && !regByIqama.has(k)) regByIqama.set(k, r) }
const unifiedByReg = new Map()
for (const e of gosiEsts) { const r = txt(e.registration_no), u = digits(e.unified_national_number); if (r && u && !unifiedByReg.has(r)) unifiedByReg.set(r, u) }

// الإقامة → الرقم الموحّد/رقم الموارد (لصفوف بلا رقم موارد في الإكسل)
const wfByIqama = new Map()
for (const v of view) {
  const k = digits(v.iqama_number); if (!k || wfByIqama.has(k)) continue
  const reg = txt(v.gosi_number) || regByIqama.get(k) || ''
  const unified = digits(v.unified_number) || moiByIqama.get(k) || unifiedByReg.get(reg) || ''
  wfByIqama.set(k, { unified, hrsd: hrsdKey(v.hrsd_number), fac: txt(v.facility_ar) })
}

const lookup = (hrsd, iqama, facName) => {
  const w = wfByIqama.get(digits(iqama)) || {}
  return byHrsd.get(hrsdKey(hrsd)) || byUnified.get(w.unified) || byHrsd.get(w.hrsd)
    || byName.get(txt(facName)) || byName.get(w.fac) || null
}

console.log(`فتح الملف: ${FILE}`)
const wb = new ExcelJS.Workbook()
await wb.xlsx.readFile(FILE)
const ws = wb.getWorksheet('رخص العمل')
if (!ws) throw new Error('ورقة «رخص العمل» غير موجودة')

const header = ws.getRow(1).values.map((v) => txt(v))
const colOf = (label) => header.findIndex((h) => h === label)
const cHrsd = colOf('رقم الموارد البشرية'), cIqama = colOf('رقم الإقامة'), cFac = colOf('اسم المنشأة')
if (cHrsd < 0 || cIqama < 0) throw new Error('أعمدة المطابقة غير موجودة في الملف')

let target = colOf('لون النطاق')
const isNew = target < 0
if (isNew) {
  target = (cFac > 0 ? cFac : ws.columnCount) + 1   // بعد «اسم المنشأة»
  ws.spliceColumns(target, 0, [])
  ws.getColumn(target).width = 22
}

const hcell = ws.getRow(1).getCell(target)
hcell.value = 'لون النطاق'
hcell.font = { color: { argb: 'FFFFFFFF' } }
hcell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } }
hcell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }

const stats = { total: 0, hit: 0, byBand: new Map(), missFac: new Set() }
for (let r = 2; r <= ws.rowCount; r++) {
  const row = ws.getRow(r)
  const facName = cFac > 0 ? txt(row.getCell(cFac).value) : ''
  const rec = lookup(row.getCell(cHrsd).value, row.getCell(cIqama).value, facName)
  stats.total++
  const cell = row.getCell(target)
  cell.value = rec?.band || ''
  cell.alignment = { horizontal: 'center', vertical: 'middle' }
  if (rec?.band) {
    stats.hit++
    stats.byBand.set(rec.band, (stats.byBand.get(rec.band) || 0) + 1)
    const hex = bandHex(rec.band)
    if (hex) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: tint(hex) } }
      cell.font = { color: { argb: dark(hex) } }
    }
  } else if (facName) stats.missFac.add(facName)
}

// نطاق الفلتر يشمل العمود الجديد
ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: ws.rowCount, column: ws.columnCount } }

/* التنسيق الشرطي (رمادي = بلا تاريخ رخصة، أحمر = رخصة منتهية) يلوّن الصفّ كلّه ويعلو على
   تعبئة الخليّة الثابتة — فنستثني عمود النطاق من نطاقه ليبقى لونه ظاهراً، ونمدّه ليشمل
   الأعمدة التي أزاحها الإدراج. */
const colLetter = (n) => { let s = ''; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = (n - r - 1) / 26 } return s }
const lastRow = ws.rowCount, lastCol = ws.columnCount
for (const cf of ws.conditionalFormattings || []) {
  const left = target > 1 ? `A2:${colLetter(target - 1)}${lastRow}` : ''
  const right = target < lastCol ? `${colLetter(target + 1)}2:${colLetter(lastCol)}${lastRow}` : ''
  cf.ref = [left, right].filter(Boolean).join(' ')
}

console.log(`الصفوف: ${stats.total} — بنطاق: ${stats.hit} — بلا نطاق: ${stats.total - stats.hit}`)
console.log('التوزيع: ' + [...stats.byBand.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(' · '))
if (stats.missFac.size) console.log(`منشآت بلا نطاق (${stats.missFac.size}): ` + [...stats.missFac].slice(0, 25).join(' | '))

// سطر شرح
const keyWs = wb.getWorksheet('شرح')
if (keyWs) {
  let found = 0
  keyWs.eachRow((row, i) => { if (i > 1 && txt(row.getCell(1).value) === 'لون النطاق') found = i })
  const vals = ['لون النطاق', 'نطاق المنشأة في قوى (بلاتيني/أخضر بمستوياته/أصفر/أحمر) — الخليّة ملوّنة بلون النطاق نفسه. المصدر: قوى، وإن غاب فمن المركز السعودي.']
  if (found) { keyWs.getRow(found).getCell(1).value = vals[0]; keyWs.getRow(found).getCell(2).value = vals[1] }
  else keyWs.addRow(vals)
}

if (DRY) { console.log('— تجربة فقط، لم يُكتب الملف'); process.exit(0) }
await wb.xlsx.writeFile(FILE)
console.log(`تم: ${FILE}`)
