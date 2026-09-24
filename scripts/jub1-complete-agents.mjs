#!/usr/bin/env node
/**
 * jub1-complete-agents — يربط «الوسيط» بفواتير JUB1 من عمود «الطرف» في اكسل المكتب.
 *
 * عمود «الطرف» / «من طرف» / «تبع من العامل» / «اسم الوسيط» = الوسيط (قرار المستخدم 2026-09-20).
 * الربط بالسند كبقية جولات الإكمال، والكتابة تطابق ما تفعله الواجهة بالضبط:
 *   service_request_agents (صف واحد لكل طلب) + invoices.agent_id
 *
 * الفارغ فقط — أي فاتورة لها وسيط الآن تُترك كما هي. لا يُنشئ وسطاء جدداً:
 * الأسماء التي لا تقابل وسيطاً موجوداً تُدرَج في التقرير لتُضاف يدوياً.
 *
 * الاستخدام:
 *   node scripts/jub1-complete-agents.mjs report
 *   node scripts/jub1-complete-agents.mjs apply
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

const txt = (v) => {
  const s = String(v ?? '').replace(/[\u200e\u200f]/g, '').trim()
  return s && !/^[-—_.\s/]+$/.test(s) ? s : null
}
const sanadsOf = (cell) => [...new Set(String(cell ?? '').split(/[/\\,،;\s"']+/)
  .map(s => s.trim()).filter(s => /^\d{1,5}$/.test(s)).map(s => String(Number(s))).filter(s => s !== '0'))]
const norm = (s) => String(s ?? '')
  .replace(/[\u0617-\u061A\u064B-\u0652\u0670\u0640]/g, '')
  .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
  .replace(/\s+/g, ' ').trim().toLowerCase()

// الشيتات التي فيها عمود وسيط + أعمدة السندات المقابلة + الخدمة المستهدفة.
// «تجديد مهدي صالح» و«تجديد رفعه» لا تحتويان عمود طرف — فلا وسيط يُستخرج منهما.
const SPECS = [
  { sheet: 'التنازلات', start: 1, party: 14, sanadCols: [11], svc: ['نقل كفالة'] },
  { sheet: 'تاشيرات شركة مهدي صالح.', start: 2, party: 8, sanadCols: [17, 21], svc: null },
  { sheet: 'تاشيرات شركة رفعة فلاح', start: 2, party: 12, sanadCols: [22, 26], svc: null },
  { sheet: 'تاشيرات شركة العنود', start: 6, party: 18, sanadCols: [22, 24, 29], svc: null },
  { sheet: 'تاشيرات شركة سحر جديد', start: 4, party: 10, partyPhone: 11, sanadCols: [20], svc: null },
]
const VISA_SVCS = ['تأشيرة بإقامة 12 شهر', 'تأشيرة بإقامة 9 أشهر', 'تأشيرة بإقامة 6 أشهر', 'تأشيرة بإقامة 3 شهور']

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

async function main () {
  const wb = XLSX.readFile(FILE)
  const rows = []
  for (const sp of SPECS) {
    const ws = wb.Sheets[sp.sheet]; if (!ws) { console.warn(`⚠ شيت مفقود: ${sp.sheet}`); continue }
    const sheet = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false })
    for (let i = sp.start; i < sheet.length; i++) {
      const r = sheet[i]
      const party = txt(r[sp.party]); if (!party) continue
      const sanads = [...new Set(sp.sanadCols.flatMap(c => sanadsOf(r[c])))]
      if (!sanads.length) continue
      rows.push({ sheet: sp.sheet, row_no: i + 1, party, sanads,
        partyPhone: sp.partyPhone != null ? String(r[sp.partyPhone] ?? '').replace(/\D/g, '') || null : null,
        svc: sp.svc ?? VISA_SVCS })
    }
  }
  console.log(`الإكسل: ${rows.length} صف فيه طرف + سند`)

  const agents = await pageAll('agents', 'id,name_ar,name_en,phone,deleted_at')
  const live = agents.filter(a => !a.deleted_at)
  const agIdx = new Map()
  for (const a of live) for (const k of ['name_ar', 'name_en']) { const v = norm(a[k]); if (v && !agIdx.has(v)) agIdx.set(v, a) }
  const agByPhone = new Map()
  for (const a of live) if (a.phone) agByPhone.set(String(a.phone).replace(/\D/g, '').slice(-9), a)
  const agentOf = (r) => agIdx.get(norm(r.party))
    ?? (r.partyPhone ? agByPhone.get(r.partyPhone.slice(-9)) : null) ?? null

  const lk = await pageAll('lookup_items', 'id,value_ar')
  const svcIds = (names) => lk.filter(l => names.includes(l.value_ar)).map(l => l.id)
  const invs = await pageAll('invoices', 'id,invoice_no,agent_id,service_request_id,created_at,service_type_id',
    q => q.eq('branch_id', JUB1).is('deleted_at', null))
  const srs = await pageAll('service_requests', 'id,slip_no,service_type_id,request_date',
    q => q.eq('branch_id', JUB1).is('deleted_at', null))
  const srById = new Map(srs.map(s => [s.id, s]))
  const svcName = new Map(lk.map(l => [l.id, l.value_ar]))
  const existingSra = new Set((await pageAll('service_request_agents', 'service_request_id')).map(r => r.service_request_id))

  // فهرس السند → فواتير، مقصوراً على الخدمات المسموحة لكل شيت
  const byService = new Map()
  for (const inv of invs) {
    const sr = srById.get(inv.service_request_id); if (!sr) continue
    const name = svcName.get(sr.service_type_id); if (!name) continue
    if (!byService.has(name)) byService.set(name, [])
    byService.get(name).push({ inv, sr, sanads: new Set(sanadsOf(sr.slip_no)) })
  }

  const noAgentName = new Map()
  const plan = []; const taken = new Set()
  const stats = { filled: 0, alreadySet: 0, noInvoice: 0, noAgent: 0, ambiguous: 0 }

  for (const r of rows) {
    const ag = agentOf(r)
    if (!ag) { stats.noAgent++; noAgentName.set(r.party, (noAgentName.get(r.party) || 0) + 1); continue }
    const pool = r.svc.flatMap(n => byService.get(n) || [])
    const cands = pool.filter(c => r.sanads.some(t => c.sanads.has(t)))
    if (!cands.length) { stats.noInvoice++; continue }
    const scored = cands.map(c => ({ c, overlap: r.sanads.filter(t => c.sanads.has(t)).length }))
      .sort((a, b) => b.overlap - a.overlap || String(a.c.inv.created_at).localeCompare(String(b.c.inv.created_at)))
    const best = scored[0]
    if (scored[1] && scored[1].overlap === best.overlap && scored[1].c.inv.agent_id == null && best.c.inv.agent_id == null) {
      // سند مشترك بين فاتورتين فارغتين — نأخذ الأقدم فقط إن كان الطرف واحداً في كلتيهما
      stats.ambiguous++
    }
    for (const { c } of scored) {
      if (c.inv.agent_id != null) { stats.alreadySet++; break }
      if (taken.has(c.inv.id)) continue
      taken.add(c.inv.id)
      plan.push({ invoice_id: c.inv.id, invoice_no: c.inv.invoice_no, service_request_id: c.sr.id,
        agent_id: ag.id, agent_name: ag.name_ar || ag.name_en, party: r.party,
        source: `${r.sheet}#${r.row_no}`, svc: svcName.get(c.sr.service_type_id),
        hasSra: existingSra.has(c.sr.id) })
      stats.filled++
      break
    }
  }

  const bySvc = {}
  for (const p of plan) bySvc[p.svc] = (bySvc[p.svc] || 0) + 1
  console.log(`\nسيُربط وسيط بـ${plan.length} فاتورة:`)
  for (const [k, n] of Object.entries(bySvc).sort((a, b) => b[1] - a[1])) console.log(`   ${k.padEnd(24)} ${n}`)
  console.log(`\nالمتجاهَل: ${stats.alreadySet} لها وسيط · ${stats.noInvoice} بلا فاتورة مطابقة · ${stats.noAgent} اسم طرف غير مسجّل كوسيط`)
  if (noAgentName.size) {
    console.log(`\n⚠ ${noAgentName.size} اسم طرف لا يقابل وسيطاً موجوداً (لم يُنشأ أحد):`)
    for (const [n, c] of [...noAgentName].sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log(`   ${n} (${c})`)
  }

  const out = path.join(here, '../tmp/jub1x/plan-agents.json')
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify({ stats, bySvc, unmatchedParties: [...noAgentName], plan }, null, 1))
  console.log(`\nالخطة: ${path.relative(process.cwd(), out)}`)
  if (!APPLY) { console.log('(تقرير فقط — لم يُكتب شيء. أضف apply للتنفيذ)'); return }

  for (let i = 0; i < plan.length; i += 500) {
    const { error } = await sb.from('jub1x_row_backup').insert(plan.slice(i, i + 500).map(p => ({
      table_name: 'invoices.agent_id', row_id: p.invoice_id,
      before: { agent_id: null, invoice_no: p.invoice_no, service_request_id: p.service_request_id, had_sra: p.hasSra },
      patch: { agent_id: p.agent_id, agent_name: p.agent_name, party: p.party }, source: p.source,
    })))
    if (error) throw new Error('backup: ' + error.message)
  }
  console.log(`✔ حُفظت نسخة احتياطية (${plan.length} صف) في jub1x_row_backup`)

  let done = 0; const failed = []
  for (const p of plan) {
    // نفس ترتيب الواجهة: صفّ الوسيط على الطلب ثم invoices.agent_id
    const sra = p.hasSra
      ? await sb.from('service_request_agents').update({ agent_id: p.agent_id }).eq('service_request_id', p.service_request_id)
      : await sb.from('service_request_agents').insert({ service_request_id: p.service_request_id, agent_id: p.agent_id })
    if (sra.error) { failed.push({ inv: p.invoice_no, msg: 'sra: ' + sra.error.message }); continue }
    const { error } = await sb.from('invoices').update({ agent_id: p.agent_id }).eq('id', p.invoice_id)
    if (error) { failed.push({ inv: p.invoice_no, msg: error.message }); continue }
    done++
    if (done % 100 === 0) process.stdout.write(`\rرُبط ${done}/${plan.length}`)
  }
  console.log(`\n✔ رُبط وسيط بـ${done} فاتورة${failed.length ? ` · فشل ${failed.length}` : ''}`)
  if (failed.length) console.log(failed.slice(0, 10))
}

main().catch(e => { console.error('✖', e.message); process.exit(1) })
