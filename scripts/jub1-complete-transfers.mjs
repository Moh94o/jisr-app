#!/usr/bin/env node
/**
 * jub1-complete-transfers — يكمل فواتير «نقل الكفالة» و«تجديد الإقامة» لفرع JUB1 من اكسل المكتب.
 *
 * يربط صفوف شيت «التنازلات» وشيتات «تجديد» بالفواتير عبر رقم السند، ثم يعبّئ الفراغات فقط:
 *   transfer_applications      : العامل · المنشأة · الرقم الموحد · انتهاء الإقامة
 *   iqama_renewal_applications : العامل · منشأة العامل
 *   workers                    : المهنة · الجوال · الاسم الإنجليزي · انتهاء الإقامة
 *
 * العامل يُربط برقم الإقامة بجدول workers الموجود — لا يُنشئ عمّالاً جدداً.
 * لا يكتب فوق أي قيمة موجودة، ويحفظ نسخة من كل صف يلمسه في jub1x_row_backup.
 *
 * الاستخدام:
 *   node scripts/jub1-complete-transfers.mjs report
 *   node scripts/jub1-complete-transfers.mjs apply
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
const APPLY = (args[0] || 'report') === 'apply'
const argOf = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null }
const FILE = argOf('--file') || 'C:/Users/mahdi/OneDrive/Desktop/jub1.xlsx'
const JUB1 = '5f9431b1-fda9-4738-9d9b-57c542cefb2b'

const sb = createClient('https://gcvshzutdslmdkwqwteh.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// ── تنظيف ─────────────────────────────────────────────────────────────────
const txt = (v) => {
  const s = String(v ?? '').replace(/[\u200e\u200f]/g, '').trim()
  return s && !/^[-—_.\s/]+$/.test(s) ? s : null
}
const digits = (v) => { const s = String(v ?? '').replace(/\D/g, ''); return s || null }
const sanadsOf = (cell) => [...new Set(String(cell ?? '').split(/[/\\,،;\s"']+/)
  .map(s => s.trim()).filter(s => /^\d{1,5}$/.test(s)).map(s => String(Number(s))).filter(s => s !== '0'))]
const norm = (s) => String(s ?? '')
  .replace(/[\u0617-\u061A\u064B-\u0652\u0670\u0640]/g, '')
  .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
  .replace(/\s+/g, ' ').trim().toLowerCase()
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
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2015 || y > 2035) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
const OCC_ALIAS = { 'تحميل وتنزيل': 'عامل تحميل وتنزيل', 'نظافة حدائق': 'عامل نظافة حدائق',
  'عامل عادي': null, 'loader operator': 'عامل تحميل وتنزيل' }

// ── قراءة الشيتات ─────────────────────────────────────────────────────────
function readTransfers (wb) {
  const ws = wb.Sheets['التنازلات']; if (!ws) return []
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false })
  const out = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    const rec = {
      kind: 'transfer', sheet: 'التنازلات', row_no: i + 1,
      worker_en: txt(r[1]), iqama: digits(r[2]), company: txt(r[3]), facility_no: txt(r[4]),
      unified: digits(r[5]), occupation: txt(r[6]), sanads: sanadsOf(r[11]),
      iqama_status: txt(r[12]), phone: digits(r[13]), party: txt(r[14]),
      iqama_expiry: parseDate(r[18]),
    }
    if (!rec.iqama) continue
    out.push(rec)
  }
  return out
}

function readRenewals (wb) {
  const out = []
  for (const sheet of ['تجديد مهدي صالح', 'تجديد رفعه']) {
    const ws = wb.Sheets[sheet]; if (!ws) continue
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false })
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      const rec = { kind: 'renewal', sheet, row_no: i + 1, company: txt(r[0]), worker_en: txt(r[1]),
        iqama: digits(r[2]), sanads: sanadsOf(r[3]), note: txt(r[4]) }
      if (!rec.iqama) continue
      out.push(rec)
    }
  }
  return out
}

// ── الإنتاج ───────────────────────────────────────────────────────────────
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
async function chunked (table, select, col, values) {
  const out = []
  for (let i = 0; i < values.length; i += 200) {
    const { data, error } = await sb.from(table).select(select).in(col, values.slice(i, i + 200))
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...data)
  }
  return out
}

// ── المطابقة بالسند (مجموعة صفوف ⇢ مجموعة طلبات) ──────────────────────────
function matchBySanad (excel, srs, srDate = s => s.request_date) {
  const idx = new Map()
  for (const s of srs) for (const t of sanadsOf(s.slip_no)) {
    if (!idx.has(t)) idx.set(t, new Set()); idx.get(t).add(s.id)
  }
  const srById = new Map(srs.map(s => [s.id, s]))
  const srSanads = new Map(srs.map(s => [s.id, new Set(sanadsOf(s.slip_no))]))
  const groups = new Map(); const stats = { sure: 0, weak: 0, miss: 0 }
  for (const e of excel) {
    const cands = new Set()
    for (const t of e.sanads) for (const s of (idx.get(t) || [])) cands.add(s)
    if (!cands.size) { e.match = 'miss'; stats.miss++; continue }
    const scored = [...cands].map(id => {
      const overlap = e.sanads.filter(t => srSanads.get(id).has(t)).length
      const rd = srDate(srById.get(id))
      const dd = (e.date && rd) ? Math.abs((new Date(e.date) - new Date(rd)) / 864e5) : null
      return { srId: id, score: overlap * 3 + (dd == null ? 0 : dd <= 60 ? 1.5 : 0), overlap, dd }
    }).sort((a, b) => b.score - a.score)
    e.cands = scored
    const clear = cands.size === 1 || scored[0].score - (scored[1]?.score ?? -9) >= 0.5
    e.match = clear ? 'sure' : 'weak'; stats[e.match]++
    const key = clear ? `S|${scored[0].srId}` : `W|${[...cands].sort().join(',')}`
    if (!groups.has(key)) groups.set(key, []); groups.get(key).push(e)
  }
  // طلب واحد لكل صف: نوزّع صفوف المجموعة على الطلبات المرشّحة بالترتيب الزمني
  const pairs = []; const leftover = []; const taken = new Set()
  for (const [key, rows] of groups) {
    rows.sort((a, b) => a.sheet.localeCompare(b.sheet) || a.row_no - b.row_no)
    const srIds = key.startsWith('S|')
      ? [key.slice(2)]
      : [...new Set(rows.flatMap(r => r.cands.map(c => c.srId)))]
        .sort((a, b) => String(srDate(srById.get(a))).localeCompare(String(srDate(srById.get(b)))))
    let k = 0
    for (const r of rows) {
      while (k < srIds.length && taken.has(srIds[k])) k++
      if (k >= srIds.length) { leftover.push(r); continue }
      taken.add(srIds[k]); pairs.push({ excel: r, srId: srIds[k] }); k++
    }
  }
  return { pairs, leftover, stats }
}

// ── التنفيذ ───────────────────────────────────────────────────────────────
async function main () {
  if (!fs.existsSync(FILE)) throw new Error('الملف غير موجود: ' + FILE)
  const wb = XLSX.readFile(FILE)
  const exT = readTransfers(wb)
  const exR = readRenewals(wb)
  console.log(`الإكسل: ${exT.length} تنازل · ${exR.length} تجديد`)

  const lk = await pageAll('lookup_items', 'id,value_ar')
  const idsOf = (n) => lk.filter(l => l.value_ar === n).map(l => l.id)
  const srsT = await pageAll('service_requests', 'id,slip_no,request_date,facility_id',
    q => q.eq('branch_id', JUB1).in('service_type_id', idsOf('نقل كفالة')).is('deleted_at', null))
  const srsR = await pageAll('service_requests', 'id,slip_no,request_date,facility_id',
    q => q.eq('branch_id', JUB1).in('service_type_id', idsOf('تجديد الإقامة')).is('deleted_at', null))
  console.log(`الإنتاج: ${srsT.length} طلب نقل · ${srsR.length} طلب تجديد`)

  const tas = await chunked('transfer_applications',
    'id,service_request_id,worker_id,main_facility_id,unified_number,iqama_expiry_date,new_occupation_id',
    'service_request_id', srsT.map(s => s.id))
  const ras = await chunked('iqama_renewal_applications',
    'id,service_request_id,worker_id,worker_facility_id,worker_phone',
    'service_request_id', srsR.map(s => s.id))
  const taBySr = new Map(tas.filter(r => r.service_request_id).map(r => [r.service_request_id, r]))
  const raBySr = new Map(ras.filter(r => r.service_request_id).map(r => [r.service_request_id, r]))

  const facilities = await pageAll('facilities', 'id,unified_number,deleted_at')
  const facByUni = new Map()
  for (const f of facilities) if (!f.deleted_at && f.unified_number) facByUni.set(digits(f.unified_number), f.id)
  const occs = await pageAll('occupations', 'id,name_ar,name_en')
  const occIdx = new Map()
  for (const o of occs) for (const k of ['name_ar', 'name_en']) { const v = norm(o[k]); if (v && !occIdx.has(v)) occIdx.set(v, o.id) }
  const occOf = (v) => { if (!v) return null
    const a = OCC_ALIAS[norm(v)] ?? OCC_ALIAS[v]; if (a === null) return null
    return occIdx.get(norm(a ?? v)) ?? null }

  const iqamas = [...new Set([...exT, ...exR].map(e => e.iqama).filter(Boolean))]
  const workers = await chunked('workers',
    'id,iqama_number,name_en,name_ar,phone,current_occupation_id,current_facility_id,iqama_expiry_date',
    'iqama_number', iqamas)
  const wByIqama = new Map()
  for (const w of workers) if (!wByIqama.has(w.iqama_number)) wByIqama.set(w.iqama_number, w)
  console.log(`العمّال: ${wByIqama.size} من ${iqamas.length} رقم إقامة موجود في workers`)

  const mT = matchBySanad(exT, srsT)
  const mR = matchBySanad(exR, srsR)
  console.log(`مطابقة النقل   : ${mT.stats.sure} مؤكّد · ${mT.stats.weak} ضعيف · ${mT.stats.miss} بلا فاتورة · ${mT.leftover.length} زائد`)
  console.log(`مطابقة التجديد : ${mR.stats.sure} مؤكّد · ${mR.stats.weak} ضعيف · ${mR.stats.miss} بلا فاتورة · ${mR.leftover.length} زائد`)

  const counters = {}
  const bump = (k) => { counters[k] = (counters[k] || 0) + 1 }
  const rowUpdates = []   // {table, id, patch, before, source}
  const noWorker = []

  const planRow = (table, row, patch, source) => {
    const clean = {}
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === '') continue
      if (row[k] != null && row[k] !== '') continue
      clean[k] = v; bump(`${table}.${k}`)
    }
    if (Object.keys(clean).length) rowUpdates.push({ table, id: row.id, patch: clean, before: row, source })
  }

  // ⚠ لا نكتب شيئاً على جدول workers: تلك الحقول تملكها مزامنة مقيم/قوى ولها مصدر مسجّل
  //   ([[project_field_provenance]])، وعمود «رقم الجوال» في شيت التنازلات هو جوال الطرف
  //   لا جوال العامل (صف 2: 500751635 = العميل «توتل» بينما العامل MD AKIZUR RAHMAN).
  //   بيانات المعاملة تُسجَّل على صفّ المعاملة نفسه، والمهنة/الجنسية تُقرأان من سجل العامل.
  for (const { excel: e, srId } of mT.pairs) {
    const ta = taBySr.get(srId); if (!ta) continue
    const w = wByIqama.get(e.iqama)
    if (!w) noWorker.push({ kind: 'transfer', row: e.row_no, iqama: e.iqama, name: e.worker_en })
    planRow('transfer_applications', ta, {
      worker_id: w?.id ?? null,
      main_facility_id: e.unified ? (facByUni.get(e.unified) ?? null) : null,
      unified_number: e.unified,
      iqama_expiry_date: e.iqama_expiry,
    }, `التنازلات#${e.row_no}`)
  }

  for (const { excel: e, srId } of mR.pairs) {
    const ra = raBySr.get(srId); if (!ra) continue
    const w = wByIqama.get(e.iqama)
    if (!w) { noWorker.push({ kind: 'renewal', row: e.row_no, iqama: e.iqama, name: e.worker_en }); continue }
    planRow('iqama_renewal_applications', ra, {
      worker_id: w.id,
      worker_facility_id: w.current_facility_id ?? null,
    }, `${e.sheet}#${e.row_no}`)
  }

  console.log(`\nالحقول التي ستُعبّأ (${rowUpdates.length} صف):`)
  for (const [k, n] of Object.entries(counters).sort((a, b) => b[1] - a[1])) console.log(`   ${k.padEnd(38)} ${n}`)
  if (noWorker.length) console.log(`⚠ ${noWorker.length} صف بلا عامل مطابق برقم الإقامة`)

  fs.mkdirSync(path.join(here, '../tmp/jub1x'), { recursive: true })
  const out = path.join(here, '../tmp/jub1x/plan-transfers.json')
  fs.writeFileSync(out, JSON.stringify({
    counters,
    transfer: { stats: mT.stats, misses: exT.filter(e => e.match === 'miss').map(e => ({ row: e.row_no, iqama: e.iqama, name: e.worker_en, sanads: e.sanads })), leftover: mT.leftover.map(e => ({ row: e.row_no, iqama: e.iqama })) },
    renewal: { stats: mR.stats, misses: exR.filter(e => e.match === 'miss').map(e => ({ sheet: e.sheet, row: e.row_no, iqama: e.iqama, name: e.worker_en, sanads: e.sanads })), leftover: mR.leftover.map(e => ({ sheet: e.sheet, row: e.row_no, iqama: e.iqama })) },
    noWorker,
    updates: rowUpdates.map(u => ({ table: u.table, id: u.id, patch: u.patch, source: u.source })),
  }, null, 1))
  console.log(`\nالخطة: ${path.relative(process.cwd(), out)}`)

  if (!APPLY) { console.log('(تقرير فقط — لم يُكتب شيء. أضف apply للتنفيذ)'); return }

  for (let i = 0; i < rowUpdates.length; i += 500) {
    const { error } = await sb.from('jub1x_row_backup').insert(rowUpdates.slice(i, i + 500)
      .map(u => ({ table_name: u.table, row_id: u.id, before: u.before, patch: u.patch, source: u.source })))
    if (error) throw new Error('backup: ' + error.message)
  }
  console.log(`✔ حُفظت نسخة احتياطية (${rowUpdates.length} صف) في jub1x_row_backup`)

  let done = 0; const failed = []
  for (const u of rowUpdates) {
    const { error } = await sb.from(u.table).update(u.patch).eq('id', u.id)
    if (error) failed.push({ table: u.table, id: u.id, msg: error.message }); else done++
    if (done % 100 === 0) process.stdout.write(`\rحُدِّث ${done}/${rowUpdates.length}`)
  }
  console.log(`\n✔ حُدِّث ${done} صف${failed.length ? ` · فشل ${failed.length}` : ''}`)
  if (failed.length) console.log(failed.slice(0, 10))
}

main().catch(e => { console.error('✖', e.message); process.exit(1) })
