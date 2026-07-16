#!/usr/bin/env node
/**
 * jub1-excel-ref — استيراد «اكسل المكتب» إلى جدول jub1_excel_ref كمرجع تحقّق لسندات JUB1.
 *
 * ⚠ المصدر الرسمي لأي قيمة هو صورة السند الورقي. هذا الملف مساعد فقط:
 *   لا يُكتب منه شيء على jub1_receipts، ولا يغيّر حالة مراجعة — العرض والمقارنة فقط.
 *
 * الاستخدام:
 *   node scripts/jub1-excel-ref.mjs import [--file "path.xlsx"] [--dry]
 *   node scripts/jub1-excel-ref.mjs match            # تقرير مطابقة مقابل السندات الحالية
 *
 * الأسرار من scripts/.env.jub1: SUPABASE_SERVICE_ROLE_KEY (+ اختيارياً SUPABASE_URL, EXCEL_FILE)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'
import { buildRefIndex, matchReceipt } from '../src/lib/jub1ExcelMatch.js'

const here = path.dirname(fileURLToPath(import.meta.url))
loadDotEnv(path.join(here, '.env.jub1'))

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gcvshzutdslmdkwqwteh.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const args = process.argv.slice(2)
const cmd = args[0] || 'match'
const argOf = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null }
const DRY = args.includes('--dry')
const FILE = argOf('--file') || process.env.EXCEL_FILE ||
  'C:/Users/mahdi/OneDrive/Desktop/سندات JUB1/اكسل المكتب.xlsx'

if (!SERVICE_KEY) die('SUPABASE_SERVICE_ROLE_KEY غير موجود — ضعه في scripts/.env.jub1')
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

// ── مواصفات الشيتات ────────────────────────────────────────────────────────
// hdr = صف العناوين (0-based)؛ البيانات تبدأ بعده. الأعمدة بالفهرس كما في الملف.
const SPECS = [
  { sheet: 'التنازلات', kind: 'transfer', hdr: 0,
    sanad: [11], name: 1, id_no: 2, phone: 13, party: 14, company: 3, facility: 4, unified: 5,
    occupation: 6, paid: 7, remaining: 8, total: 9 },

  { sheet: 'اصدار مهدي صالح', kind: 'issue', hdr: 0,
    sanad: [6], name: 3, id_no: 5, phone: 11, party: 7, company: 0, facility: 1, unified: 2, paid: 8, remaining: 9 },
  { sheet: 'اصدار رفعة', kind: 'issue', hdr: 0,
    sanad: [6], name: 3, id_no: 5, phone: 11, party: 7, company: 0, facility: 1, unified: 2, paid: 8, remaining: 9 },
  { sheet: 'اصدار العنود', kind: 'issue', hdr: 0,
    sanad: [6], name: 3, id_no: 5, phone: 11, party: 7, company: 0, facility: 1, unified: 2, paid: 8, remaining: 9 },

  { sheet: 'تجديد مهدي صالح', kind: 'renewal', hdr: 0,
    sanad: [3], name: 1, id_no: 2, company: 0, remaining: 6, notes: 4 },
  { sheet: 'تجديد رفعه', kind: 'renewal', hdr: 0,
    sanad: [3], name: 1, id_no: 2, company: 0, remaining: 6, notes: 4 },

  { sheet: 'تاشيرات شركة مهدي صالح.', kind: 'visa', hdr: 1,
    sanad: [18, 22], name: 7, phone: 9, party: 8, company: 2, facility: 3, unified: 4,
    paid: 15, remaining: 16, total: 17, notes: 23 },
  { sheet: 'تاشيرات شركة رفعة فلاح', kind: 'visa', hdr: 1,
    sanad: [22, 26], name: 11, phone: 13, party: 12, company: 3, facility: 4, unified: 5,
    occupation: 9, paid: 19, remaining: 20, total: 21, notes: 27 },
  { sheet: 'تاشيرات شركة العنود', kind: 'visa', hdr: 5,
    sanad: [22, 24, 29], name: 16, phone: 17, party: 18, company: 6, facility: 7, unified: 8,
    occupation: 15, total: 19, notes: 33 },
  { sheet: 'تاشيرات شركة سحر جديد', kind: 'visa', hdr: 3,
    sanad: [20], name: 10, id_no: 19, phone: 11, occupation: 8, total: 12, paid: 13, notes: 17 },
  { sheet: 'التاشيرات المؤقتة جديد', kind: 'visa', hdr: 2,
    sanad: [15], name: 6, id_no: 12, phone: 7, company: 0, facility: 1, unified: 2,
    total: 8, paid: 9, remaining: 10 },
]

// ── أدوات ──────────────────────────────────────────────────────────────────
const txt = (v) => { const s = String(v ?? '').trim(); return s && s !== '-' && s !== '—' ? s : null }
// «10,800.00 ر.س.» → 10800 — يُنتزع أول رقم فقط: لاحقة «ر.س.» فيها نقاط تفسد أي تنظيف بالحذف.
// سقف 100,000: أعمدة المبالغ في شيتات تجديد/اصدار تحمل أحياناً رقم جوال أو إقامة — قيمة أكبر ليست مبلغاً.
const money = (v) => {
  const m = String(v ?? '').match(/-?\d[\d,]*(?:\.\d+)?/)
  if (!m) return null
  const n = Number(m[0].replace(/,/g, ''))
  return Number.isFinite(n) && Math.abs(n) <= 100000 ? n : null
}
// أرقام السندات: تُفصل بـ / أو \ أو فاصلة أو مسافة — «2114//3279» و«2348/1644» و«843/1903»
const sanadsOf = (cell) => String(cell ?? '').split(/[\/\\,،;\s]+/)
  .map(s => s.trim()).filter(s => /^\d{2,5}$/.test(s))

function rowsOf(wb, spec) {
  const ws = wb.Sheets[spec.sheet]
  if (!ws) { console.log(`⚠ شيت مفقود: ${spec.sheet}`); return [] }
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false })
  const hdr = (rows[spec.hdr] || []).map(h => String(h ?? '').trim())
  const out = []
  for (let i = spec.hdr + 1; i < rows.length; i++) {
    const r = rows[i]
    const sanads = [...new Set(spec.sanad.flatMap(c => sanadsOf(r[c])))]
    if (!sanads.length) continue
    const at = (c) => (c == null ? null : txt(r[c]))
    const raw = {}
    r.forEach((v, j) => { const val = txt(v); if (val && hdr[j]) raw[hdr[j]] = val })
    out.push({
      sheet: spec.sheet, row_no: i + 1, kind: spec.kind, sanads,
      client_name: at(spec.name), client_id_no: at(spec.id_no), client_phone: at(spec.phone),
      party: at(spec.party), company: at(spec.company), facility_no: at(spec.facility),
      unified_no: at(spec.unified), occupation: at(spec.occupation),
      total_amount: spec.total != null ? money(r[spec.total]) : null,
      paid_amount: spec.paid != null ? money(r[spec.paid]) : null,
      remaining_amount: spec.remaining != null ? money(r[spec.remaining]) : null,
      notes: at(spec.notes), raw,
    })
  }
  return out
}

// ── import ─────────────────────────────────────────────────────────────────
async function doImport() {
  if (!fs.existsSync(FILE)) die(`الملف غير موجود: ${FILE}`)
  const wb = XLSX.readFile(FILE)
  let all = []
  for (const spec of SPECS) {
    const rows = rowsOf(wb, spec)
    console.log(`${spec.sheet.padEnd(26)} → ${String(rows.length).padStart(4)} صف فيه سند`)
    all = all.concat(rows)
  }
  const tokens = new Set(all.flatMap(r => r.sanads))
  console.log(`\nالإجمالي: ${all.length} صف · ${tokens.size} رقم سند مميّز`)
  if (DRY) { console.log('(--dry — لم يُكتب شيء)'); console.log(JSON.stringify(all.slice(0, 3), null, 2)); return }

  // استبدال كامل: الإكسل ملف واحد يُعاد استيراده كلياً عند تحديثه
  const { error: delErr } = await sb.from('jub1_excel_ref').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (delErr) die('فشل تفريغ الجدول: ' + delErr.message)
  for (let i = 0; i < all.length; i += 500) {
    const chunk = all.slice(i, i + 500)
    const { error } = await sb.from('jub1_excel_ref').insert(chunk)
    if (error) die(`فشل الإدراج عند ${i}: ${error.message}`)
    process.stdout.write(`\rأُدرج ${Math.min(i + 500, all.length)}/${all.length}`)
  }
  console.log('\n✔ تم الاستيراد')
}

// ── match — تقرير مطابقة مقابل السندات الحالية ─────────────────────────────
// يستخدم نفس وحدة المطابقة التي تستخدمها الواجهة — أي تعديل عليها ينعكس هنا تلقائياً.
async function doMatch() {
  const ref = await allRows('jub1_excel_ref', 'id,sanads,sheet,row_no,client_name,client_id_no,total_amount')
  const rec = await allRows('jub1_receipts',
    'id,primary_receipt_no,previous_receipt_nos,client_name,client_id_no,total_amount,review_status,deleted_at')
  const pays = await allRows('jub1_receipt_payments', 'receipt_entry_id,sanad_no')
  const byEntry = {}
  for (const p of pays) (byEntry[p.receipt_entry_id] ||= []).push(p)

  const index = buildRefIndex(ref)
  const live = rec.filter(r => !r.deleted_at).map(r => ({ ...r, payments: byEntry[r.id] || [] }))

  let matched = 0, none = 0, ambiguous = 0, weak = 0, clean = 0
  const diffs = { client_id_no: 0, client_name: 0, total_amount: 0 }
  let anyDiff = 0
  for (const e of live) {
    const m = matchReceipt(e, index)
    if (!m) { none++; continue }
    matched++
    if (m.ambiguous) ambiguous++
    if (m.weak) weak++
    if (m.diffs.length) { anyDiff++; for (const d of m.diffs) diffs[d.key]++ }
    else clean++
  }
  console.log(`سندات حيّة         : ${live.length}`)
  console.log(`لها مقابل بالإكسل  : ${matched}`)
  console.log(`  ├ مطابِقة تماماً : ${clean}`)
  console.log(`  ├ فيها اختلاف    : ${anyDiff}`)
  console.log(`  ├ متعددة المرشحين: ${ambiguous}`)
  console.log(`  └ مطابقة ضعيفة   : ${weak}   (بالرقم وحده — لا اتفاق في أي حقل هوية)`)
  console.log(`بلا مقابل بالإكسل  : ${none}`)
  console.log(`\nتفصيل الاختلافات (الحقلان معبّآن، مقابل أفضل مرشّح):`)
  console.log(`  رقم الإقامة : ${diffs.client_id_no}`)
  console.log(`  الاسم       : ${diffs.client_name}`)
  console.log(`  الإجمالي    : ${diffs.total_amount}`)
}

async function allRows(table, cols) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(cols).range(from, from + 999)
    if (error) die(`${table}: ${error.message}`)
    out.push(...(data || []))
    if (!data || data.length < 1000) return out
  }
}

// ── تشغيل ──────────────────────────────────────────────────────────────────
if (cmd === 'import') await doImport()
else if (cmd === 'match') await doMatch()
else die(`أمر غير معروف: ${cmd} — استخدم import أو match`)

function die(msg) { console.error('✖ ' + msg); process.exit(1) }
function loadDotEnv(file) {
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
