#!/usr/bin/env node
/**
 * jub1-complete-from-excel — يكمل بيانات فواتير JUB1 من «اكسل مكتب الجبيل».
 *
 * الفواتير دخلت البرنامج أولاً من سندات القبض، فبقيت حقول المعاملة فارغة.
 * هذا السكربت يربط صفوف الإكسل بالفواتير عبر «رقم السند» ثم يعبّئ الفراغات فقط:
 *   visa_applications: رقم الحدود · رقم التأشيرة · الجنسية · المهنة · السفارة ·
 *                      الرقم الموحد · المنشأة · اسم العامل · حالة الاستخدام
 *
 * لا يكتب فوق أي قيمة موجودة، ويحفظ نسخة من كل صف يلمسه في jub1x_visa_backup.
 *
 * الاستخدام:
 *   node scripts/jub1-complete-from-excel.mjs report            # تقرير فقط
 *   node scripts/jub1-complete-from-excel.mjs apply             # يكتب
 *   node scripts/jub1-complete-from-excel.mjs apply --only-sure # يتجاهل المطابقات الضعيفة
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'

const here = path.dirname(fileURLToPath(import.meta.url))
for (const line of fs.readFileSync(path.join(here, '.env.jub1'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] ??= m[2].trim()
}
const args = process.argv.slice(2)
const CMD = args[0] || 'report'
const APPLY = CMD === 'apply'
const argOf = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null }
const FILE = argOf('--file') || 'C:/Users/mahdi/OneDrive/Desktop/jub1.xlsx'
const JUB1 = '5f9431b1-fda9-4738-9d9b-57c542cefb2b'
const USED = '985fc50c-9b03-406a-9470-ea8bad768545'     // visa_usage_status: مستخدمة
const UNUSED = 'c5e310a5-427e-4533-adf3-cc0a7d5c03d3'   // visa_usage_status: غير مستخدمة

const sb = createClient('https://gcvshzutdslmdkwqwteh.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// ── تنظيف القيم ───────────────────────────────────────────────────────────
const txt = (v) => {
  const s = String(v ?? '').replace(/[\u200e\u200f]/g, '').trim()
  return s && !/^[-—_.\s/]+$/.test(s) ? s : null
}
const digits = (v) => { const s = String(v ?? '').replace(/\D/g, ''); return s || null }
// أرقام السندات تُكتب «2114//3279» و«2549/2657/0003» و«1032»
const sanadsOf = (cell) => [...new Set(String(cell ?? '').split(/[/\\,،;\s"']+/)
  .map(s => s.trim()).filter(s => /^\d{1,5}$/.test(s)).map(s => String(Number(s))).filter(s => s !== '0'))]
const norm = (s) => String(s ?? '')
  .replace(/[\u0617-\u061A\u064B-\u0652\u0670\u0640]/g, '')
  .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
  .replace(/\s+/g, ' ').trim().toLowerCase()
// شيتات المكتب مكتوبة M/D/Y غالباً وفيها D/M/Y متفرّق — نصدّق الشكل الذي يصلح فقط
function parseDate (v) {
  if (v == null || v === '') return null
  if (typeof v === 'number' && v > 20000 && v < 60000) {
    const d = XLSX.SSF.parse_date_code(v); if (!d) return null
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }
  const m = String(v).trim().match(/^(\d{1,4})[/\-.](\d{1,2})[/\-.](\d{2,4})$/)
  if (!m) return null
  const [, a, b, c] = m.map(Number)
  const y = c < 100 ? 2000 + c : c
  const [mo, d] = a > 12 ? [b, a] : [a, b]
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2015 || y > 2032) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// ── مواصفات شيتات التأشيرات ───────────────────────────────────────────────
// hdr = صف العناوين (0-based). FFILL = أعمدة الخلايا المدموجة تُنسخ من الصف السابق.
const VISA_SHEETS = [
  { sheet: 'تاشيرات شركة مهدي صالح.', hdr: 1, sanadCols: [17, 21],
    cols: { date: 1, company: 2, facility_no: 3, unified_no: 4, border: 5, visa_no: 6, worker: 7, party: 8, phone: 9, notes: 22 } },
  { sheet: 'تاشيرات شركة رفعة فلاح', hdr: 1, sanadCols: [22, 26],
    cols: { date: 2, company: 3, facility_no: 4, unified_no: 5, border: 6, visa_no: 7, embassy: 8, occupation: 9, nationality: 10, worker: 11, party: 12, phone: 13, notes: 27 } },
  { sheet: 'تاشيرات شركة العنود', hdr: 5, sanadCols: [22, 24, 29], issueDate: true,
    cols: { company: 6, facility_no: 7, unified_no: 8, date: 10, visa_no: 11, border: 12, nationality: 13, embassy: 14, occupation: 15, worker: 16, phone: 17, party: 18, notes: 33 } },
  { sheet: 'تاشيرات شركة سحر جديد', hdr: 3, sanadCols: [20], issueDate: true,
    cols: { company: 1, facility_no: 2, unified_no: 3, date: 5, visa_no: 6, border: 7, occupation: 8, embassy: 9, party: 10, phone: 11, iqama_no: 19 } },
]
const FFILL = ['company', 'facility_no', 'unified_no']
// شيتات «الاصدار»: رقم الحدود ⇒ رقم الإقامة + اسم العامل بالإنجليزي ⇒ التأشيرة مستخدمة
const ISSUE_BLOCKS = [
  { sheet: 'اصدار مهدي صالح', base: 0 }, { sheet: 'اصدار رفعة', base: 0 },
  { sheet: 'اصدار العنود', base: 0 }, { sheet: 'اصدار العنود', base: 14 },
]

function readVisas (wb) {
  const out = []
  for (const sp of VISA_SHEETS) {
    const ws = wb.Sheets[sp.sheet]
    if (!ws) { console.warn(`⚠ شيت مفقود: ${sp.sheet}`); continue }
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false })
    const carry = {}
    for (let i = sp.hdr + 1; i < rows.length; i++) {
      const r = rows[i]
      const at = (k) => sp.cols[k] == null ? null : txt(r[sp.cols[k]])
      const rec = {
        sheet: sp.sheet, row_no: i + 1, issueDate: !!sp.issueDate,
        border: digits(at('border')), visa_no: digits(at('visa_no')), worker: at('worker'),
        embassy: at('embassy'), occupation: at('occupation'), nationality: at('nationality'),
        party: at('party'), phone: digits(at('phone')), iqama_no: digits(at('iqama_no')),
        company: at('company'), facility_no: at('facility_no'), unified_no: digits(at('unified_no')),
        date: parseDate(sp.cols.date != null ? r[sp.cols.date] : null), notes: at('notes'),
        sanads: [...new Set(sp.sanadCols.flatMap(c => sanadsOf(r[c])))],
      }
      for (const k of FFILL) { if (rec[k]) carry[k] = rec[k]; else rec[k] = carry[k] ?? null }
      if (!rec.border && !rec.visa_no) continue   // صف ليس تأشيرة
      out.push(rec)
    }
  }
  return out
}

function readIssues (wb) {
  const out = []
  for (const { sheet, base: b } of ISSUE_BLOCKS) {
    const ws = wb.Sheets[sheet]; if (!ws) continue
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false })
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      const rec = { sheet, row_no: i + 1, unified_no: digits(r[b + 2]), worker_en: txt(r[b + 3]),
        border: digits(r[b + 4]), iqama_no: digits(r[b + 5]) }
      if (rec.border) out.push(rec)
    }
  }
  return out
}

// ── تحميل بيانات الإنتاج ──────────────────────────────────────────────────
async function pageAll (table, select, tweak) {
  const out = []; let from = 0
  for (;;) {
    let q = sb.from(table).select(select); if (tweak) q = tweak(q)
    const { data, error } = await q.range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...data); if (data.length < 1000) break; from += 1000
  }
  return out
}

async function loadProd () {
  const visas = await pageAll('visa_applications',
    'id,service_request_id,border_number,visa_number,worker_name,unified_number,nationality_id,occupation_id,embassy_id,main_facility_id,visa_issue_date,usage_status_id,created_at',
    q => q.is('deleted_at', null))
  const srIds = [...new Set(visas.map(v => v.service_request_id).filter(Boolean))]
  const srs = []
  for (let i = 0; i < srIds.length; i += 300) {
    const { data, error } = await sb.from('service_requests')
      .select('id,slip_no,branch_id,request_date,facility_id').in('id', srIds.slice(i, i + 300))
    if (error) throw new Error('service_requests: ' + error.message)
    srs.push(...data)
  }
  const srById = new Map(srs.map(s => [s.id, s]))
  const jubVisas = visas.filter(v => srById.get(v.service_request_id)?.branch_id === JUB1)
  const facilities = await pageAll('facilities', 'id,name_ar,unified_number,deleted_at')
  const [nats, embs, occs] = await Promise.all([
    pageAll('nationalities', 'id,name_ar,name_en,country_name_ar'),
    pageAll('embassies', 'id,name_ar,name_en'),
    pageAll('occupations', 'id,name_ar,name_en'),
  ])
  return { jubVisas, srById, facilities, nats, embs, occs }
}

// ── المعاجم ───────────────────────────────────────────────────────────────
const NAT_ALIAS = { 'بنجلاديش': 'بنجلادشي', 'بنغلاديش': 'بنجلادشي', 'الهند': 'هندي', 'اليمن': 'يمني',
  'باكستان': 'باكستاني', 'نيبال': 'نيبالي', 'سريلانكا': 'سريلانكي', 'مصر': 'مصري', 'السودان': 'سوداني' }
const EMB_ALIAS = { 'مومباي': 'بومباي' }
const OCC_ALIAS = { 'تحميل وتنزيل': 'عامل تحميل وتنزيل', 'نظافة حدائق': 'عامل نظافة حدائق',
  'loader operator': 'عامل تحميل وتنزيل' }
const buildIdx = (rows, keys) => {
  const m = new Map()
  for (const r of rows) for (const k of keys) { const v = norm(r[k]); if (v && !m.has(v)) m.set(v, r.id) }
  return m
}
const resolve = (idx, alias, v) => v ? (idx.get(norm(alias[norm(v)] ?? alias[v] ?? v)) ?? null) : null

// ── المطابقة بالسند ───────────────────────────────────────────────────────
function nameScore (a, b) {
  a = norm(a).replace(/\d+/g, ' ').replace(/\s+/g, ' ').trim()
  b = norm(b).replace(/\d+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!a || !b) return 0
  if (a === b) return 1
  const B = new Set(b.split(' '))
  return a.split(' ').some(t => t.length > 2 && B.has(t)) ? 0.6 : 0
}

function matchRows (excel, jubVisas, srById) {
  const visasBySr = new Map()
  for (const v of jubVisas) {
    if (!visasBySr.has(v.service_request_id)) visasBySr.set(v.service_request_id, [])
    visasBySr.get(v.service_request_id).push(v)
  }
  for (const list of visasBySr.values()) {
    list.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || a.id.localeCompare(b.id))
  }

  const srSanads = new Map(); const bySanad = new Map()
  for (const srId of visasBySr.keys()) {
    const set = new Set(sanadsOf(srById.get(srId)?.slip_no))
    srSanads.set(srId, set)
    for (const t of set) { if (!bySanad.has(t)) bySanad.set(t, new Set()); bySanad.get(t).add(srId) }
  }

  const rank = (e, srId) => {
    const set = srSanads.get(srId)
    const overlap = e.sanads.filter(t => set.has(t)).length
    const ws = visasBySr.get(srId) || []
    const nm = Math.max(0, ...ws.map(w => nameScore(e.worker, w.worker_name)))
    const rd = srById.get(srId)?.request_date
    const dd = (e.date && rd) ? Math.abs((new Date(e.date) - new Date(rd)) / 864e5) : null
    const ds = dd == null ? 0 : dd <= 45 ? 1 : dd <= 180 ? 0.4 : 0
    return { srId, score: overlap * 3 + nm * 2.5 + ds * 1.5, overlap, nm, dd }
  }

  const groups = new Map()   // مجموعات الصفوف المتساوية السند: تُوزَّع دفعة واحدة
  const stats = { sure: 0, weak: 0, miss: 0 }
  for (const e of excel) {
    const cands = new Set()
    for (const t of e.sanads) for (const s of (bySanad.get(t) || [])) cands.add(s)
    if (!cands.size) { e.match = 'miss'; stats.miss++; continue }
    const scored = [...cands].map(id => rank(e, id)).sort((a, b) => b.score - a.score)
    e.cands = scored
    const clear = cands.size === 1 || scored[0].score - (scored[1]?.score ?? -9) >= 0.5
    e.match = clear ? 'sure' : 'weak'
    stats[e.match]++
    const key = clear ? `S|${scored[0].srId}` : `W|${[...cands].sort().join(',')}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(e)
  }

  // التوزيع: كل مجموعة → خانات التأشيرات في الطلبات المرشّحة بالترتيب
  const pairs = []          // {excel, visa}
  const leftover = []
  for (const [key, rows] of groups) {
    rows.sort((a, b) => a.sheet.localeCompare(b.sheet) || a.row_no - b.row_no)
    const srIds = key.startsWith('S|')
      ? [key.slice(2)]
      : [...new Set(rows.flatMap(r => r.cands.map(c => c.srId)))]
        .sort((a, b) => String(srById.get(a)?.request_date).localeCompare(String(srById.get(b)?.request_date)))
    const slots = srIds.flatMap(id => visasBySr.get(id) || [])
    const n = Math.min(rows.length, slots.length)
    for (let i = 0; i < n; i++) pairs.push({ excel: rows[i], visa: slots[i] })
    for (let i = n; i < rows.length; i++) leftover.push(rows[i])
    for (const r of rows) r.slotCount = slots.length
  }
  return { pairs, leftover, stats, visasBySr }
}

// ── التنفيذ ───────────────────────────────────────────────────────────────
async function main () {
  if (!fs.existsSync(FILE)) throw new Error('الملف غير موجود: ' + FILE)
  const wb = XLSX.readFile(FILE)
  const excel = readVisas(wb)
  const issues = readIssues(wb)
  const issueByBorder = new Map()
  for (const r of issues) if (!issueByBorder.has(r.border)) issueByBorder.set(r.border, r)
  console.log(`الإكسل: ${excel.length} صف تأشيرة · ${issues.length} صف إصدار إقامة (${issueByBorder.size} رقم حدود)`)

  const { jubVisas, srById, facilities, nats, embs, occs } = await loadProd()
  console.log(`الإنتاج: ${jubVisas.length} تأشيرة في ${new Set(jubVisas.map(v => v.service_request_id)).size} طلب لفرع JUB1`)

  const nIdx = buildIdx(nats, ['name_ar', 'country_name_ar', 'name_en'])
  const eIdx = buildIdx(embs, ['name_ar', 'name_en'])
  const oIdx = buildIdx(occs, ['name_ar', 'name_en'])
  const facByUni = new Map()
  for (const f of facilities) if (!f.deleted_at && f.unified_number) facByUni.set(digits(f.unified_number), f.id)

  const { pairs, leftover, stats } = matchRows(excel, jubVisas, srById)
  console.log(`المطابقة: ${stats.sure} مؤكّد · ${stats.weak} ضعيف · ${stats.miss} بلا فاتورة · ${leftover.length} زائد عن خانات الطلب`)

  const ONLY_SURE = args.includes('--only-sure')
  const unresolved = { nationality: new Set(), occupation: new Set(), embassy: new Set() }
  const updates = []
  const counters = {}
  const bump = (k) => { counters[k] = (counters[k] || 0) + 1 }

  for (const { excel: e, visa: v } of pairs) {
    if (ONLY_SURE && e.match !== 'sure') continue
    const patch = {}
    const set = (col, val) => {
      if (val != null && val !== '' && (v[col] == null || v[col] === '')) { patch[col] = val; bump(col) }
    }
    set('border_number', e.border)
    set('visa_number', e.visa_no)
    set('unified_number', e.unified_no)
    set('worker_name', e.worker)
    if (e.issueDate) set('visa_issue_date', e.date)
    if (e.unified_no) set('main_facility_id', facByUni.get(e.unified_no) ?? null)
    if (e.nationality) { const id = resolve(nIdx, NAT_ALIAS, e.nationality); if (id) set('nationality_id', id); else unresolved.nationality.add(e.nationality) }
    if (e.occupation) { const id = resolve(oIdx, OCC_ALIAS, e.occupation); if (id) set('occupation_id', id); else unresolved.occupation.add(e.occupation) }
    if (e.embassy) { const id = resolve(eIdx, EMB_ALIAS, e.embassy); if (id) set('embassy_id', id); else unresolved.embassy.add(e.embassy) }
    // حالة الاستخدام: «مستخدمة» إذا ظهر رقم الحدود في شيت إصدار الإقامة
    const iss = e.border ? issueByBorder.get(e.border) : null
    if (v.usage_status_id == null) { patch.usage_status_id = iss ? USED : UNUSED; bump(iss ? 'usage:used' : 'usage:unused') }
    if (Object.keys(patch).length) updates.push({ id: v.id, patch, before: v, excel: e, iqama_no: iss?.iqama_no ?? null, worker_en: iss?.worker_en ?? null })
  }

  console.log(`\nالحقول التي ستُعبّأ (${updates.length} صف تأشيرة):`)
  for (const [k, n] of Object.entries(counters).sort((a, b) => b[1] - a[1])) console.log(`   ${k.padEnd(20)} ${n}`)
  for (const [k, s] of Object.entries(unresolved)) if (s.size) console.log(`⚠ ${k} غير معروف: ${[...s].join(' · ')}`)

  fs.mkdirSync(path.join(here, '../tmp/jub1x'), { recursive: true })
  const out = path.join(here, '../tmp/jub1x/plan.json')
  fs.writeFileSync(out, JSON.stringify({
    stats,
    counters,
    unresolved: Object.fromEntries(Object.entries(unresolved).map(([k, v]) => [k, [...v]])),
    misses: excel.filter(e => e.match === 'miss').map(e => ({ sheet: e.sheet, row: e.row_no, sanads: e.sanads, worker: e.worker, border: e.border, date: e.date })),
    leftover: leftover.map(e => ({ sheet: e.sheet, row: e.row_no, sanads: e.sanads, border: e.border, slots: e.slotCount })),
    weak: excel.filter(e => e.match === 'weak').map(e => ({ sheet: e.sheet, row: e.row_no, sanads: e.sanads, worker: e.worker, cands: e.cands })),
    updates: updates.map(u => ({ id: u.id, patch: u.patch, sheet: u.excel.sheet, row: u.excel.row_no, match: u.excel.match })),
  }, null, 1))
  console.log(`\nالخطة: ${path.relative(process.cwd(), out)}`)

  if (!APPLY) { console.log('(تقرير فقط — لم يُكتب شيء. أضف apply للتنفيذ)'); return }

  // نسخة احتياطية قبل الكتابة
  const backup = updates.map(u => ({
    visa_application_id: u.id, before: u.before, patch: u.patch,
    source: `${u.excel.sheet}#${u.excel.row_no}`, match: u.excel.match,
  }))
  for (let i = 0; i < backup.length; i += 500) {
    const { error } = await sb.from('jub1x_visa_backup').insert(backup.slice(i, i + 500))
    if (error) throw new Error('backup: ' + error.message)
  }
  console.log(`✔ حُفظت نسخة احتياطية (${backup.length} صف) في jub1x_visa_backup`)

  let done = 0; const failed = []
  for (const u of updates) {
    const { error } = await sb.from('visa_applications').update(u.patch).eq('id', u.id)
    if (error) failed.push({ id: u.id, msg: error.message })
    else done++
    if (done % 100 === 0) process.stdout.write(`\rحُدِّث ${done}/${updates.length}`)
  }
  console.log(`\n✔ حُدِّث ${done} صف تأشيرة${failed.length ? ` · فشل ${failed.length}` : ''}`)
  if (failed.length) console.log(failed.slice(0, 10))
}

main().catch(e => { console.error('✖', e.message); process.exit(1) })
