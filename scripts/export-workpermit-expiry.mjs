#!/usr/bin/env node
/**
 * export-workpermit-expiry — إكسل العمالة التي رخصة عملها (كرت العمل) تنتهي قبل تاريخ محدّد
 * أو لا تحمل تاريخ رخصة عمل إطلاقاً.
 *
 * المصدر: v_ops_sync_workforce (مركز المزامنة) + facility_sources/sync_persons لاسم الشخص
 * الذي تمّت منه مزامنة المنشأة، + gosi_establishments كاحتياطي لرقم الموارد البشرية.
 *
 * الاستخدام: node scripts/export-workpermit-expiry.mjs [--before 2027-01-30] [--out "path.xlsx"]
 * السر: SUPABASE_SERVICE_ROLE_KEY من scripts/.env.jub1
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'

const here = path.dirname(fileURLToPath(import.meta.url))
loadDotEnv(path.join(here, '.env.jub1'))
function loadDotEnv(file) {
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gcvshzutdslmdkwqwteh.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SERVICE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY مفقود'); process.exit(1) }
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

const argOf = (flag, dflt) => { const i = process.argv.indexOf(flag); return i > -1 ? process.argv[i + 1] : dflt }
const CUTOFF = argOf('--before', '2027-01-30')

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

/* لون نطاق قوى من اسمه — نفس خريطة nitaqBandColor في البرنامج (OpsExcelsPage) */
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
const mixHex = (hex, a) => 'FF' + [0, 2, 4].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * a + 255 * (1 - a)).toString(16).padStart(2, '0').toUpperCase()).join('')
const bandFill = (hex) => mixHex(hex, 0.30)
const bandText = (hex) => 'FF' + [0, 2, 4].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * 0.55).toString(16).padStart(2, '0').toUpperCase()).join('')

console.log('جلب البيانات…')
const [view, facilities, gosiEsts, gosiContrib, muqeemRes, facSources, persons, qiwaCos, facsDetailed] = await Promise.all([
  fetchAll('v_ops_sync_workforce',
    'iqama_number,name_ar,name_en,nationality_ar,occupation_ar,iqama_expiry_date,work_permit_number,work_permit_status,work_permit_expiry,unified_number,facility_ar,gosi_number,hrsd_number,branch_code,source_platforms,last_sync'),
  fetchAll('facilities', 'id,name_ar,unified_number,gosi_number,hrsd_number,deleted_at'),
  fetchAll('gosi_establishments', 'registration_no,unified_national_number,mol_establishment_id,name_ar'),
  fetchAll('gosi_establishment_contributors', 'iqama_no,registration_no,synced_at'),
  fetchAll('muqeem_residents', 'iqama_number,sponsor_moi_number,synced_at'),
  fetchAll('facility_sources', 'facility_id,source_id,person_id,last_synced_at'),
  fetchAll('sync_persons', 'id,name_ar,name_en,deleted_at'),
  fetchAll('qiwa_companies', 'company_labor_office_id,company_sequence_number,cr_national_number,company_unified_number_id,establishment_name,company_name,nitaqat_color_ar,sc_nitaqat_color_ar,indicator_nitaqat_level_ar,synced_at'),
  fetchAll('v_ops_facilities_detailed', 'name_ar,unified_number,hrsd_number,nitaqat_color,hrsd_nitaq_name'),
])

// ── فهارس ───────────────────────────────────────────────────────────────────
const personName = new Map(persons.map(p => [p.id, txt(p.name_ar) || txt(p.name_en)]))

const facByUnified = new Map(), facByGosi = new Map()
for (const f of facilities) {
  if (f.deleted_at) continue
  const u = digits(f.unified_number)
  if (u && !facByUnified.has(u)) facByUnified.set(u, f)
  const g = txt(f.gosi_number)
  if (g && !facByGosi.has(g)) facByGosi.set(g, f)
}

// احتياطي لربط العامل بمنشأته حين لا يحمل صفّ العرض رقماً موحّداً (سجلّات التأمينات فقط)
const regByIqama = new Map()
for (const c of gosiContrib) {
  const k = digits(c.iqama_no), r = txt(c.registration_no)
  if (k && r && !regByIqama.has(k)) regByIqama.set(k, r)
}
const moiByIqama = new Map()
for (const m of muqeemRes) {
  const k = digits(m.iqama_number), s = digits(m.sponsor_moi_number)
  if (k && s && !moiByIqama.has(k)) moiByIqama.set(k, s)
}
const gosiByUnified = new Map(), gosiByReg = new Map()
for (const e of gosiEsts) {
  const u = digits(e.unified_national_number)
  if (u && !gosiByUnified.has(u)) gosiByUnified.set(u, e)
  const r = txt(e.registration_no)
  if (r && !gosiByReg.has(r)) gosiByReg.set(r, e)
}

/* نطاق المنشأة في قوى — بالمطابقة برقم الموارد البشرية ثم الرقم الموحّد ثم الاسم */
const hrsdKey = (v) => { const d = digits(v); return d ? String(Number(d)) : '' } // 15-4027261 → 154027261
const bandByHrsd = new Map(), bandByUnified = new Map(), bandByName = new Map()
const putBand = (map, k, rec) => { if (!k || !rec.band) return; const p = map.get(k); if (!p || String(rec.at ?? '') > String(p.at ?? '')) map.set(k, rec) }
for (const c of qiwaCos) {
  const rec = { band: txt(c.nitaqat_color_ar) || txt(c.sc_nitaqat_color_ar) || txt(c.indicator_nitaqat_level_ar), at: c.synced_at }
  if (c.company_labor_office_id && c.company_sequence_number) putBand(bandByHrsd, hrsdKey(`${c.company_labor_office_id}${c.company_sequence_number}`), rec)
  putBand(bandByUnified, digits(c.cr_national_number), rec)
  putBand(bandByUnified, digits(c.company_unified_number_id), rec)
  putBand(bandByName, txt(c.establishment_name), rec)
  putBand(bandByName, txt(c.company_name), rec)
}
// احتياطي: نطاق المنشأة من المركز السعودي (SBC) حين لا تكون مزامَنة تفصيلياً في قوى
for (const f of facsDetailed) {
  const rec = { band: txt(f.nitaqat_color) || txt(f.hrsd_nitaq_name), at: '' }
  if (!rec.band) continue
  if (!bandByHrsd.has(hrsdKey(f.hrsd_number))) putBand(bandByHrsd, hrsdKey(f.hrsd_number), rec)
  if (!bandByUnified.has(digits(f.unified_number))) putBand(bandByUnified, digits(f.unified_number), rec)
  if (!bandByName.has(txt(f.name_ar))) putBand(bandByName, txt(f.name_ar), rec)
}
const bandOf = (hrsd, unified, facName) =>
  (bandByHrsd.get(hrsdKey(hrsd)) || bandByUnified.get(digits(unified)) || bandByName.get(txt(facName)) || {}).band || ''

/** facility_id → { source_id → {person, at} } */
const srcByFac = new Map()
for (const s of facSources) {
  if (!s.facility_id) continue
  let m = srcByFac.get(s.facility_id)
  if (!m) { m = {}; srcByFac.set(s.facility_id, m) }
  const prev = m[s.source_id]
  if (!prev || String(s.last_synced_at ?? '') > String(prev.at ?? '')) {
    m[s.source_id] = { person: personName.get(s.person_id) || '', at: s.last_synced_at || null }
  }
}
const PLATFORM_AR = { qiwa: 'قوى', muqeem: 'مقيم', gosi: 'التأمينات', sbc: 'المركز السعودي', sbc_requests: 'طلباتي', mudad: 'مدد', ajeer: 'أجير' }

// ── الصفوف ──────────────────────────────────────────────────────────────────
const rows = []
for (const v of view) {
  const wp = txt(v.work_permit_expiry)
  const missing = !wp
  if (!missing && !(wp < CUTOFF)) continue

  const iq = digits(v.iqama_number)
  const gosiReg = txt(v.gosi_number) || regByIqama.get(iq) || ''
  const gEstByReg = gosiReg ? gosiByReg.get(gosiReg) : null
  const unified = digits(v.unified_number) || moiByIqama.get(iq) || digits(gEstByReg?.unified_national_number)
  const fac = (unified && facByUnified.get(unified)) || (gosiReg && facByGosi.get(gosiReg)) || null
  const gEst = (unified && gosiByUnified.get(unified)) || gEstByReg || null
  const hrsd = txt(v.hrsd_number) || txt(fac?.hrsd_number) || txt(gEst?.mol_establishment_id)

  const srcs = (fac && srcByFac.get(fac.id)) || {}
  // «الشخص الذي صارت منه المزامنة» — قوى أولاً (رخصة العمل مصدرها قوى)، ثم مقيم، ثم التأمينات، ثم أحدث منصّة
  let pick = null, pickKey = ''
  for (const k of ['qiwa', 'muqeem', 'gosi']) {
    if (srcs[k]?.person) { pick = srcs[k]; pickKey = k; break }
  }
  if (!pick) {
    for (const [k, s] of Object.entries(srcs)) {
      if (s.person && (!pick || String(s.at ?? '') > String(pick.at ?? ''))) { pick = s; pickKey = k }
    }
  }

  rows.push({
    branchCode: txt(v.branch_code),
    iqama: txt(v.iqama_number),
    name: txt(v.name_ar) || txt(v.name_en),
    nationality: txt(v.nationality_ar),
    occupation: txt(v.occupation_ar),
    iqamaExpiry: day(v.iqama_expiry_date),
    wpNumber: v.work_permit_number ? String(v.work_permit_number) : '',
    wpStatus: txt(v.work_permit_status),
    wpExpiry: day(wp),
    state: missing ? 'لا يوجد تاريخ رخصة عمل' : `تنتهي قبل ${CUTOFF}`,
    hrsd,
    facName: txt(v.facility_ar) || txt(fac?.name_ar) || txt(gEst?.name_ar),
    band: bandOf(hrsd, unified, txt(v.facility_ar) || txt(fac?.name_ar) || txt(gEst?.name_ar)),
    unified,
    syncPerson: pick?.person || '',
    syncPlatform: pick ? (PLATFORM_AR[pickKey] || pickKey) : '',
    syncAt: day(pick?.at),
    pQiwa: srcs.qiwa?.person || '',
    pMuqeem: srcs.muqeem?.person || '',
    pGosi: srcs.gosi?.person || '',
    sources: txt(v.source_platforms),
  })
}
rows.sort((a, b) =>
  (a.branchCode || 'zz').localeCompare(b.branchCode || 'zz', 'ar') ||
  (a.facName || '').localeCompare(b.facName || '', 'ar') ||
  ((a.wpExpiry ? a.wpExpiry.getTime() : 0) - (b.wpExpiry ? b.wpExpiry.getTime() : 0)) ||
  (a.name || '').localeCompare(b.name || '', 'ar'))

console.log(`الصفوف: ${rows.length}  (بلا تاريخ: ${rows.filter(r => !r.wpExpiry).length})`)
console.log(`بلا رقم موارد: ${rows.filter(r => !r.hrsd).length} — بلا شخص مزامنة: ${rows.filter(r => !r.syncPerson).length}`)

// ── الإكسل ──────────────────────────────────────────────────────────────────
const wb = new ExcelJS.Workbook()
wb.creator = 'jisr — مركز المزامنة'
const ws = wb.addWorksheet('رخص العمل', { views: [{ state: 'frozen', ySplit: 1, rightToLeft: true }] })
ws.columns = [
  { header: 'كود فرع المكتب', key: 'branchCode', width: 14 },
  { header: 'رقم الإقامة', key: 'iqama', width: 14 },
  { header: 'اسم العامل', key: 'name', width: 32 },
  { header: 'الجنسية', key: 'nationality', width: 14 },
  { header: 'المهنة', key: 'occupation', width: 24 },
  { header: 'تاريخ انتهاء الإقامة', key: 'iqamaExpiry', width: 17 },
  { header: 'رقم رخصة العمل', key: 'wpNumber', width: 16 },
  { header: 'حالة رخصة العمل', key: 'wpStatus', width: 16 },
  { header: 'تاريخ انتهاء رخصة العمل', key: 'wpExpiry', width: 21 },
  { header: 'سبب الإدراج', key: 'state', width: 22 },
  { header: 'رقم الموارد البشرية', key: 'hrsd', width: 18 },
  { header: 'اسم المنشأة', key: 'facName', width: 38 },
  { header: 'لون النطاق', key: 'band', width: 22 },
  { header: 'الرقم الموحد', key: 'unified', width: 16 },
  { header: 'الشخص الذي زامن', key: 'syncPerson', width: 18 },
  { header: 'منصّة المزامنة', key: 'syncPlatform', width: 14 },
  { header: 'تاريخ المزامنة', key: 'syncAt', width: 15 },
  { header: 'مزامنة قوى', key: 'pQiwa', width: 15 },
  { header: 'مزامنة مقيم', key: 'pMuqeem', width: 15 },
  { header: 'مزامنة التأمينات', key: 'pGosi', width: 15 },
  { header: 'مصادر بيانات العامل', key: 'sources', width: 22 },
]
const head = ws.getRow(1)
head.font = { color: { argb: 'FFFFFFFF' } }
head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } }
head.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
head.height = 30
for (const r of rows) {
  const row = ws.addRow(r)
  const hex = bandHex(r.band)   // خليّة النطاق ملوّنة بلون نطاقها
  if (hex) {
    const cell = row.getCell('band')
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bandFill(hex) } }
    cell.font = { color: { argb: bandText(hex) } }
  }
}

const last = ws.rowCount
ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: last, column: ws.columns.length } }
for (const k of ['iqama', 'wpNumber', 'hrsd', 'unified', 'branchCode', 'band']) ws.getColumn(k).alignment = { horizontal: 'center' }
for (const k of ['iqamaExpiry', 'wpExpiry', 'syncAt']) {
  ws.getColumn(k).numFmt = 'yyyy-mm-dd'
  ws.getColumn(k).alignment = { horizontal: 'center' }
}
// بلا تاريخ رخصة → رمادي؛ منتهية فعلياً اليوم → أحمر (تنسيق شرطي حيّ)
const wpCol = ws.getColumn('wpExpiry').letter
/* عمود النطاق مستثنى من نطاق التنسيق الشرطي: التنسيق الشرطي يعلو على تعبئة الخليّة
   الثابتة، فلولا الاستثناء لغطّى الأحمر/الرمادي لونَ النطاق. */
const lastCol = ws.getColumn(ws.columns.length).letter
const beforeBand = ws.getColumn(ws.getColumn('band').number - 1).letter
const afterBand = ws.getColumn(ws.getColumn('band').number + 1).letter
ws.addConditionalFormatting({
  ref: `A2:${beforeBand}${last} ${afterBand}2:${lastCol}${last}`,
  rules: [
    { type: 'expression', priority: 1, formulae: [`$${wpCol}2=""`],
      style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFEDEDED' } }, font: { color: { argb: 'FF595959' } } } },
    { type: 'expression', priority: 2, formulae: [`AND($${wpCol}2<>"",$${wpCol}2<TODAY())`],
      style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFC7CE' } }, font: { color: { argb: 'FF9C0006' } } } },
  ],
})

const keyWs = wb.addWorksheet('شرح', { views: [{ rightToLeft: true }] })
keyWs.columns = [{ width: 26 }, { width: 90 }]
keyWs.addRow(['البند', 'الشرح'])
keyWs.getRow(1).font = { color: { argb: 'FFFFFFFF' } }
keyWs.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } }
for (const r of [
  ['الفلتر', `رخصة العمل تنتهي قبل ${CUTOFF} أو لا يوجد لها تاريخ إطلاقاً.`],
  ['المصدر', 'مركز المزامنة (v_ops_sync_workforce): مقيم + قوى + التأمينات. تاريخ رخصة العمل مصدره قوى فقط.'],
  ['لا يوجد تاريخ', 'العامل غير موجود في بيانات قوى، أو موجود بلا تاريخ رخصة — يظهر بخلفية رمادية.'],
  ['رقم الموارد البشرية', 'من المنشأة (hrsd_number)، وإن لم يوجد فمن رقم منشأة المكتب في التأمينات (mol_establishment_id).'],
  ['الشخص الذي زامن', 'صاحب الحساب الذي تمّت منه آخر مزامنة للمنشأة — الأولوية: قوى ← مقيم ← التأمينات ← أحدث منصّة.'],
  ['التلوين', 'أحمر = رخصة منتهية مقارنةً بتاريخ اليوم (تنسيق شرطي حيّ يتحدّث تلقائياً).'],
  ['لون النطاق', 'نطاق المنشأة في قوى (بلاتيني/أخضر بمستوياته/أصفر/أحمر) — الخليّة ملوّنة بلون النطاق نفسه. فارغة = المنشأة غير مزامَنة تفصيلياً من قوى.'],
  ['تاريخ التصدير', new Date().toISOString().slice(0, 10)],
  ['عدد الصفوف', String(rows.length)],
]) keyWs.addRow(r)

const stamp = new Date().toISOString().slice(0, 10)
const out = argOf('--out', path.join(process.env.USERPROFILE || here, 'OneDrive', 'Desktop', `work-permit-expiry-${CUTOFF}-${stamp}.xlsx`))
fs.mkdirSync(path.dirname(out), { recursive: true })
await wb.xlsx.writeFile(out)
console.log(`تم: ${out}`)
