#!/usr/bin/env node
/**
 * fill-renewal-iqama-excel — يملأ شيت «Renewal Iqama - تجديد الإقامات» في ملف FINAL_EXIT
 * من سجل العمالة «البيانات الأساسية»: كل من انتهت إقامته أو تنتهي حتى تاريخٍ محدّد.
 *
 * المصدر: v_ops_workers_registry + طبقة الشيت ops_sheet_rows (permanent_workers) — القيمة
 * المعروضة في الشيت هي المعتمدة (الطبقة أوّلاً ثم السجل، كمحرّك OpsExcelsPage). وباقي الأعمدة
 * بقواعد «قاربت الانتهاء» نفسها: خروج نهائي (fx_issued) · تاريخ نهايته (fx_visa_until) ·
 * إلغاء العقد (fx_qiwa_cancel) · فاتورة التجديد (renewInvCol: غير ملغاة خلال آخر 30 يوماً).
 *
 * يعدّل XML الشيت مباشرةً (jszip) فلا يمسّ بقيّة الملف ولا تنسيقه.
 *
 * الاستخدام: node scripts/fill-renewal-iqama-excel.mjs --file "path.xlsx" [--until 2026-12-31] [--out "path.xlsx"]
 * السر: SUPABASE_SERVICE_ROLE_KEY من scripts/.env.jub1
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import JSZip from 'jszip'

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
const FILE = argOf('--file')
if (!FILE) { console.error('--file مطلوب'); process.exit(1) }
const OUT = argOf('--out', FILE)
const SHEET_NAME = 'Renewal Iqama - تجديد الإقامات'

const p2 = (n) => String(n).padStart(2, '0')
const localYmd = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
const TODAY = localYmd(new Date())
const UNTIL = argOf('--until', `${TODAY.slice(0, 4)}-12-31`)
const FROM30 = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return localYmd(d) })()

const txt = (v) => { const s = String(v ?? '').trim(); return s && s !== 'null' ? s : '' }
const ymd = (v) => { const m = txt(v).match(/(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[1]}-${m[2]}-${m[3]}` : '' }
const digits = (v) => String(v ?? '').replace(/\D/g, '')

async function fetchAll(table, cols, build = (q) => q) {
  const out = []
  const step = 1000
  for (let from = 0; ; from += step) {
    const { data, error } = await build(sb.from(table).select(cols)).range(from, from + step - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...data)
    if (data.length < step) break
  }
  return out
}
async function fetchIn(table, cols, col, vals, build = (q) => q) {
  const out = []
  for (let i = 0; i < vals.length; i += 150) out.push(...await fetchAll(table, cols, (q) => build(q.in(col, vals.slice(i, i + 150)))))
  return out
}

/* ── طبقة الشيت: قيمةُ الخليّة كما يعرضها المحرّك (المسح `__x` ثم الطبقة ثم المصدر) ── */
const OPS_CLR = '__x'
const cleared = (d, k) => !!(d && d[OPS_CLR] && d[OPS_CLR][k])
const ovOf = (d, k) => txt(d && d[k])
const shown = (d, k, base) => (cleared(d, k) ? '' : ovOf(d, k) || base || '')

const FX_YES = 'نعم', FX_NO = 'لا', FX_PROBLEM = 'مشكلة'
const yn = (v) => (v === FX_YES ? 'YES' : v ? 'NO' : '')

async function loadRows() {
  const [reg, ops, exits, followW, persons] = await Promise.all([
    // بلا `order` ثانويّ: الترتيب بالمعرّف يُثبّت الصفحات
    fetchAll('v_ops_workers_registry', 'id,iqama_number,iqama_expiry_date,branch_code,qiwa_contract_status,qiwa_contract_expiry', (q) => q.order('id')),
    fetchAll('ops_sheet_rows', 'row_key,data', (q) => q.eq('view_key', 'permanent_workers').order('row_key')),
    fetchAll('v_muqeem_exit_visas', 'alien_id,kind,visa_number,valid_until', (q) => q.eq('is_valid', true).eq('kind', 'خروج نهائي').order('alien_id').order('visa_number')),
    fetchAll('workers', 'id,follow_person_id', (q) => q.not('follow_person_id', 'is', null).is('deleted_at', null).order('id')),
    fetchAll('sync_persons', 'id,name_ar,name_en'),
  ])
  console.log(`  السجل: ${reg.length} · طبقة الشيت: ${ops.length} · خروج نهائي ساري: ${exits.length}`)

  const opsBy = new Map(ops.map((o) => [String(o.row_key), o.data || {}]))
  const personName = new Map(persons.map((p) => [p.id, txt(p.name_ar) || txt(p.name_en)]))
  const follow = new Map(followW.map((w) => [w.id, personName.get(w.follow_person_id) || '']))

  /* تأشيرة الخروج النهائي السارية (`exitLiveOf`): غير منقضية، والأبعد انتهاءً أوّلاً */
  const feBy = new Map()
  for (const v of exits) {
    const k = txt(v.alien_id); if (!k) continue
    const u = ymd(v.valid_until)
    if (u && u < TODAY) continue
    const cur = feBy.get(k)
    if (!cur || u > cur.until) feBy.set(k, { no: txt(v.visa_number), until: u })
  }

  const target = []
  for (const r of reg) {
    const iq = txt(r.iqama_number)
    const d = opsBy.get(iq || 'w:' + r.id) || {}
    const exp = cleared(d, 'iqama_expiry_date') ? '' : ymd(d.iqama_expiry_date) || ymd(r.iqama_expiry_date)
    if (!exp || exp > UNTIL) continue
    target.push({ r, d, iq, exp })
  }

  /* فاتورة التجديد (`renewInvsOf`): من فواتير العامل في السجل، غير ملغاة، خلال آخر 30 يوماً */
  const via = await fetchIn('v_ops_workers_registry', 'id,via_invoices', 'id', target.map((t) => t.r.id))
  const viaBy = new Map(via.map((v) => [v.id, Array.isArray(v.via_invoices) ? v.via_invoices : []]))
  for (const t of target) {
    const auto = (viaBy.get(t.r.id) || [])
      .filter((x) => x && x.c === 'iqama_renewal' && !x.x && ymd(x.d) >= FROM30)
      .sort((a, b) => String(b.d || '').localeCompare(String(a.d || '')))[0]
    const man = shown(t.d, '_renew_inv', '')
    t.invNo = cleared(t.d, '_renew_inv') ? '' : man || txt(auto && auto.no)
    t.invId = !man && auto ? auto.id : null
  }
  const invNos = [...new Set(target.map((t) => t.invNo).filter(Boolean))]
  const [rens, invs] = await Promise.all([
    fetchIn('v_ops_iqama_renewals', 'invoice_no,renewal_months,invoice_total,paid_amount', 'invoice_no', invNos),
    fetchIn('invoices', 'invoice_no,total_amount,paid_amount', 'invoice_no', invNos, (q) => q.is('deleted_at', null)),
  ])
  const renBy = new Map(rens.map((x) => [txt(x.invoice_no), x]))
  const invBy = new Map(invs.map((x) => [txt(x.invoice_no), x]))

  const rows = target.map((t) => {
    const { r, d, iq } = t
    const fe = feBy.get(iq) || {}
    // «تم الإصدار» (fx_issued): المختار في الطبقة، وإلا «نعم» متى وُجد رقم تأشيرة
    const issued = cleared(d, 'fx_issued') ? '' : ovOf(d, 'fx_issued') || ((ovOf(d, 'fx_visa_no') || fe.no) ? FX_YES : FX_NO)
    // «إلغاء العقد» (fx_qiwa_cancel): المختار، وإلا من حالة عقد قوى (`qiwaContractEnded`)
    const st = txt(r.qiwa_contract_status), qx = ymd(r.qiwa_contract_expiry)
    const ended = /ملغ|انهاء|إنهاء|منته/.test(st) || (!!qx && qx < TODAY)
    const cancel = cleared(d, 'fx_qiwa_cancel') ? '' : ovOf(d, 'fx_qiwa_cancel') || (ended ? FX_YES : FX_NO)
    const ren = renBy.get(t.invNo), inv = invBy.get(t.invNo)
    const notes = [
      issued === FX_PROBLEM && 'خروج نهائي: مشكلة',
      cancel === FX_PROBLEM && 'إلغاء العقد: مشكلة',
      shown(d, 'op_notes', ''),
    ].filter(Boolean).join(' — ')
    return {
      office: shown(d, 'branch_code', txt(r.branch_code) || follow.get(r.id) || ''),
      iqama: iq,
      expiry: t.exp,
      finalExit: yn(issued),
      exitExpiry: ymd(shown(d, 'fx_visa_until', fe.until)),
      contractCancel: yn(cancel),
      invoiceNo: t.invNo,
      months: ren && ren.renewal_months != null ? Number(ren.renewal_months) : null,
      total: ren && ren.invoice_total != null ? Number(ren.invoice_total) : inv && inv.total_amount != null ? Number(inv.total_amount) : null,
      paid: ren && ren.paid_amount != null ? Number(ren.paid_amount) : inv && inv.paid_amount != null ? Number(inv.paid_amount) : null,
      note: notes,
    }
  })
  // الأقدم انتهاءً أوّلاً كـ«قاربت الانتهاء»، ثم المكتب فالإقامة
  rows.sort((a, b) => a.expiry.localeCompare(b.expiry) || a.office.localeCompare(b.office) || a.iqama.localeCompare(b.iqama))
  return rows
}

/* ── XML ─────────────────────────────────────────────────────────────────── */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
const serial = (d) => { const m = d.match(/(\d{4})-(\d{2})-(\d{2})/); return Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 864e5) }
/* أنماط الخلايا كما في القالب: الصفّ الأوّل (3) بحدّه العلويّ، وما بعده بنمط العمود */
const STYLE_FIRST = { A: 15, B: 16, C: 17, D: 18, E: 19, F: 15, G: 20, H: 21, I: 15, J: 22, K: 23, L: 24 }
const STYLE_REST = { A: 3, B: 4, C: 7, D: 9, E: 5, F: 3, G: 10, H: 11, I: 3, J: 6, K: 12, L: 13 }
const COLS = 'ABCDEFGHIJKL'.split('')

function rowXml(n, row) {
  const S = n === 3 ? STYLE_FIRST : STYLE_REST
  const str = (c, v) => (v ? `<c r="${c}${n}" s="${S[c]}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>` : `<c r="${c}${n}" s="${S[c]}"/>`)
  const num = (c, v) => (v == null || v === '' ? `<c r="${c}${n}" s="${S[c]}"/>` : `<c r="${c}${n}" s="${S[c]}"><v>${v}</v></c>`)
  const r = row || {}
  const cells = [
    str('A', r.office), str('B', r.iqama), num('C', r.expiry ? serial(r.expiry) : null),
    str('D', r.finalExit), num('E', r.exitExpiry ? serial(r.exitExpiry) : null), str('F', r.contractCancel),
    str('G', ''), str('H', r.invoiceNo), num('I', r.months), num('J', r.total), num('K', r.paid), str('L', r.note),
  ]
  return `<row r="${n}" spans="1:12" ht="21.95" customHeight="1">${cells.join('')}</row>`
}

async function main() {
  console.log(`العمالة المنتهية أو التي تنتهي حتى ${UNTIL} (اليوم ${TODAY})`)
  const rows = await loadRows()
  console.log(`  الصفوف: ${rows.length} — منتهية: ${rows.filter((r) => r.expiry < TODAY).length}`)

  const zip = await JSZip.loadAsync(fs.readFileSync(FILE))
  const wbXml = await zip.file('xl/workbook.xml').async('string')
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels').async('string')
  const sm = [...wbXml.matchAll(/<sheet\b[^>]*>/g)].map((m) => m[0]).find((s) => s.includes(`name="${SHEET_NAME}"`))
  if (!sm) throw new Error(`الشيت غير موجود: ${SHEET_NAME}`)
  const rid = sm.match(/r:id="([^"]+)"/)[1]
  const rel = [...relsXml.matchAll(/<Relationship\b[^>]*>/g)].map((m) => m[0]).find((s) => s.includes(`Id="${rid}"`))
  const sheetPath = 'xl/' + rel.match(/Target="([^"]+)"/)[1].replace(/^\/?xl\//, '')
  let xml = await zip.file(sheetPath).async('string')

  const oldLast = +xml.match(/<dimension ref="A1:L(\d+)"/)[1]
  // مساحةٌ منسّقة بعد آخر صفٍّ للإضافة اليدوية — مئاتٌ كاملة
  const last = Math.max(oldLast, Math.ceil((rows.length + 2 + 100) / 100) * 100)

  // الصفّان 1–2 (العناوين) كما هما، وما بعدهما يُعاد بناؤه
  const head = xml.match(/<sheetData>([\s\S]*?)<row r="3"/)
  if (!head) throw new Error('بنية الشيت غير متوقّعة')
  const body = []
  for (let n = 3; n <= last; n++) body.push(rowXml(n, rows[n - 3]))
  // المدى: الأبعاد · التصفية · التنسيق الشرطي · التحقّق — من الصفّ القديم الأخير إلى الجديد
  // (خارج `sheetData` وحده: داخله خلايا الصفّ القديم الأخير نفسها)
  const grow = (s) => s.replace(new RegExp(`\\b([A-L]\\$?)${oldLast}\\b`, 'g'), `$1${last}`)
  const at = xml.indexOf('<sheetData>'), end = xml.indexOf('</sheetData>') + '</sheetData>'.length
  xml = grow(xml.slice(0, at)) + `<sheetData>${head[1]}${body.join('')}</sheetData>` + grow(xml.slice(end))

  /* ألوان تاريخ الانتهاء (طلب المستخدم): أحمر منتهية · بنفسجي ≤5 أيام · أصفر ≤14 · أخضر >30.
     الأنماط (dxf) نفسها التي في القالب، والصيغ حيّة بـTODAY() فتتبدّل الألوان مع الأيام. */
  const cf = xml.match(/<conditionalFormatting sqref="C3:C\d+ E3:E\d+">[\s\S]*?<\/conditionalFormatting>/)
  if (!cf) throw new Error('تنسيق تاريخ الانتهاء الشرطي غير موجود')
  const dxf = [...cf[0].matchAll(/dxfId="(\d+)"/g)].map((m) => m[1])   // أحمر · بنفسجي · أصفر · أخضر
  const rule = (i, pri, f) => `<cfRule type="expression" dxfId="${dxf[i]}" priority="${pri}" stopIfTrue="1"><formula>${f}</formula></cfRule>`
  xml = xml.replace(cf[0], `<conditionalFormatting sqref="C3:C${last} E3:E${last}">`
    + rule(0, 7, 'AND(ISNUMBER(C3),INT(C3)&lt;TODAY())')
    + rule(1, 8, 'AND(ISNUMBER(C3),INT(C3)-TODAY()&lt;=5)')
    + rule(2, 9, 'AND(ISNUMBER(C3),INT(C3)-TODAY()&lt;=14)')
    + rule(3, 10, 'AND(ISNUMBER(C3),INT(C3)-TODAY()&gt;30)')
    + '</conditionalFormatting>')
  zip.file(sheetPath, xml)

  // مدى التصفية المسمّى في المصنّف
  const q = SHEET_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  zip.file('xl/workbook.xml', wbXml.replace(new RegExp(`('${q}'!\\$A\\$2:\\$L\\$)${oldLast}`), `$1${last}`))

  fs.writeFileSync(OUT, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }))
  const cnt = (k, v) => rows.filter((r) => r[k] === v).length
  console.log(`  خروج نهائي YES: ${cnt('finalExit', 'YES')} · إلغاء العقد YES: ${cnt('contractCancel', 'YES')} · فاتورة تجديد: ${rows.filter((r) => r.invoiceNo).length} · ملاحظات: ${rows.filter((r) => r.note).length} · بلا مكتب: ${cnt('office', '')}`)
  console.log(`✓ ${OUT} — ${rows.length} صفاً، التنسيق حتى الصفّ ${last}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
