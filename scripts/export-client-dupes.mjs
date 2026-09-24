#!/usr/bin/env node
/**
 * export-client-dupes — تصدير إكسل لتكرار العملاء (عرض فقط، لا يعدّل شيئاً).
 *
 * ورقتان:
 *  ① «مؤكد» — مجموعات client_dupe_candidates (score ≥ 90): سجلّات نجزم أنها عميل واحد.
 *  ② «للمراجعة» — أزواج client_dupe_review (45–89): تحتاج عين المدير.
 *
 * لكل سجلّ: الاسم · رقم الهوية · الجوال · الفرع · عدد الفواتير · أرقام الفواتير
 * · هل هو موجود في العمالة (مطابقة برقم الإقامة أو الاسم).
 *
 * الاستخدام: node scripts/export-client-dupes.mjs [--out "path.xlsx"]
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'

const envTxt = fs.readFileSync(path.join(process.cwd(), 'scripts/.env.jub1'), 'utf8')
const KEY = (envTxt.match(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*(\S+)/) || [])[1]
const URL = 'https://gcvshzutdslmdkwqwteh.supabase.co'
if (!KEY) { console.error('لا يوجد SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
const sb = createClient(URL, KEY, { auth: { persistSession: false } })

const outArg = process.argv.indexOf('--out')
const OUT = outArg > -1 ? process.argv[outArg + 1]
  : path.join('C:/Users/mahdi/OneDrive/Desktop', 'تكرار_العملاء_2026-09-19.xlsx')

async function all(table, cols) {
  const rows = []; let from = 0
  for (;;) {
    const { data, error } = await sb.from(table).select(cols).range(from, from + 999)
    if (error) throw new Error(table + ': ' + error.message)
    rows.push(...data); if (data.length < 1000) break; from += 1000
  }
  return rows
}

console.log('… تحميل البيانات')
const cands  = await all('client_dupe_candidates', 'group_no,client_id,is_primary,score,reason')
const review = await all('client_dupe_review', 'a_id,b_id,score,reason')

const ids = new Set([...cands.map(r => r.client_id), ...review.flatMap(r => [r.a_id, r.b_id])])
const idList = [...ids]
console.log('… ' + cands.length + ' سجلّ مؤكد · ' + review.length + ' زوج للمراجعة · ' + idList.length + ' عميلاً معنيّاً')

const clients = new Map()
for (let i = 0; i < idList.length; i += 300) {
  const { data, error } = await sb.from('clients')
    .select('id,name_ar,name_en,id_number,phone,branch_id,created_at')
    .in('id', idList.slice(i, i + 300))
  if (error) throw new Error('clients: ' + error.message)
  data.forEach(c => clients.set(c.id, c))
}

const { data: brs } = await sb.from('branches').select('id,branch_code,name_ar')
const branch = new Map((brs || []).map(b => [b.id, b.branch_code || b.name_ar]))

const invs = new Map()
for (let i = 0; i < idList.length; i += 300) {
  const { data, error } = await sb.from('service_requests')
    .select('id,client_id,request_ref_no,invoices(total_amount,paid_amount,deleted_at)')
    .in('client_id', idList.slice(i, i + 300)).is('deleted_at', null)
  if (error) throw new Error('service_requests: ' + error.message)
  data.forEach(s => {
    const live = (s.invoices || []).filter(v => !v.deleted_at)
    const rec = {
      no: s.request_ref_no,
      total: live.reduce((a, v) => a + Number(v.total_amount || 0), 0),
      paid: live.reduce((a, v) => a + Number(v.paid_amount || 0), 0),
    }
    if (!invs.has(s.client_id)) invs.set(s.client_id, [])
    invs.get(s.client_id).push(rec)
  })
}

const norm = s => (s || '').replace(/[^\u0621-\u064A0-9a-zA-Z ]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
const wByIqama = new Map(), wByName = new Map()
{
  let from = 0
  for (;;) {
    const { data, error } = await sb.from('workers')
      .select('name_ar,name_en,iqama_number,phone,official_mobile').is('deleted_at', null).range(from, from + 999)
    if (error) throw new Error('workers: ' + error.message)
    data.forEach(w => {
      const iq = (w.iqama_number || '').replace(/\D/g, '')
      if (iq.length === 10) wByIqama.set(iq, w)
      const n = norm(w.name_ar)
      if (n) { if (!wByName.has(n)) wByName.set(n, []); wByName.get(n).push(w) }
    })
    if (data.length < 1000) break; from += 1000
  }
}
console.log('… ' + wByIqama.size + ' عاملاً بأرقام إقامة')

function row(c, extra) {
  const iq = (c.id_number || '').replace(/\D/g, '')
  const byId = wByIqama.get(iq)
  const byName = wByName.get(norm(c.name_ar)) || []
  const w = byId || (byName.length === 1 ? byName[0] : null)
  const list = invs.get(c.id) || []
  return Object.assign({
    name: c.name_ar || c.name_en || '—',
    name_en: (c.name_ar && c.name_en) ? c.name_en : '',
    id_number: c.id_number || '',
    phone: c.phone || '',
    branch: branch.get(c.branch_id) || '',
    inv_n: list.length,
    inv_nos: list.map(s => s.no).filter(Boolean).join('، '),
    inv_sum: list.reduce((a, s) => a + s.total, 0),
    inv_paid: list.reduce((a, s) => a + s.paid, 0),
    worker: w ? (byId ? 'نعم — بالهوية' : 'نعم — بالاسم') : 'لا',
    worker_iqama: w ? (w.iqama_number || '') : '',
    worker_phone: w ? (w.phone || w.official_mobile || '') : '',
    created: (c.created_at || '').slice(0, 10),
    id: c.id,
  }, extra)
}

const wb = new ExcelJS.Workbook()
const COLS = [
  { header: 'المجموعة', key: 'g', width: 10 },
  { header: 'السجلّ', key: 'keep', width: 12 },
  { header: 'الثقة', key: 'score', width: 7 },
  { header: 'الاسم', key: 'name', width: 30 },
  { header: 'بالإنجليزية', key: 'name_en', width: 26 },
  { header: 'رقم الهوية', key: 'id_number', width: 14 },
  { header: 'الجوال', key: 'phone', width: 14 },
  { header: 'الفرع', key: 'branch', width: 8 },
  { header: 'عدد الفواتير', key: 'inv_n', width: 11 },
  { header: 'أرقام الفواتير', key: 'inv_nos', width: 30 },
  { header: 'إجمالي الفواتير', key: 'inv_sum', width: 14 },
  { header: 'المسدَّد', key: 'inv_paid', width: 12 },
  { header: 'ضمن العمالة؟', key: 'worker', width: 14 },
  { header: 'إقامة العامل', key: 'worker_iqama', width: 14 },
  { header: 'جوال العامل', key: 'worker_phone', width: 14 },
  { header: 'أُنشئ', key: 'created', width: 11 },
  { header: 'سبب الاشتباه', key: 'reason', width: 58 },
  { header: 'المعرّف', key: 'id', width: 38 },
]

function style(ws, n) {
  ws.views = [{ rightToLeft: true, state: 'frozen', ySplit: 1 }]
  const h = ws.getRow(1)
  h.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
  h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } }
  h.height = 24
  h.alignment = { vertical: 'middle', horizontal: 'center' }
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: n } }
  ws.getColumn('inv_sum').numFmt = '#,##0.00'; ws.getColumn('inv_paid').numFmt = '#,##0.00'
}

const s1 = wb.addWorksheet('مؤكد - نفس العميل')
s1.columns = COLS
const byGroup = new Map()
cands.forEach(r => { if (!byGroup.has(r.group_no)) byGroup.set(r.group_no, []); byGroup.get(r.group_no).push(r) })
let shade = false
for (const g of [...byGroup.keys()].sort((a, b) => a - b)) {
  const members = byGroup.get(g).slice().sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
  shade = !shade
  for (const m of members) {
    const c = clients.get(m.client_id); if (!c) continue
    const r = s1.addRow(row(c, { g, keep: m.is_primary ? 'يُبقى' : 'مكرّر', score: m.score, reason: m.reason }))
    if (shade) r.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F5FA' } } })
    r.getCell('keep').font = m.is_primary
      ? { bold: true, color: { argb: 'FF1D7A3C' } }
      : { color: { argb: 'FFB3261E' } }
  }
  s1.addRow({})
}
style(s1, COLS.length)

const s2 = wb.addWorksheet('للمراجعة')
s2.columns = COLS
review.sort((a, b) => b.score - a.score)
shade = false
review.forEach((p, i) => {
  shade = !shade
  for (const side of ['a_id', 'b_id']) {
    const c = clients.get(p[side]); if (!c) continue
    const r = s2.addRow(row(c, { g: i + 1, keep: side === 'a_id' ? 'أ' : 'ب', score: p.score, reason: p.reason }))
    if (shade) r.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F5FA' } } })
    const col = p.score >= 80 ? 'FFB3261E' : p.score >= 60 ? 'FFB26B00' : 'FF666666'
    r.getCell('score').font = { bold: true, color: { argb: col } }
  }
  s2.addRow({})
})
style(s2, COLS.length)

await wb.xlsx.writeFile(OUT)
console.log('تم: ' + OUT)
