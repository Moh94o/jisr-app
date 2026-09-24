#!/usr/bin/env node
/**
 * client-dupe-clusters — تجميع العملاء المحتمل تكرارهم، مرتّبين من الأكثر تكراراً.
 * عرض فقط: لا يكتب في القاعدة شيئاً.
 *
 * يربط سجلّين إذا تحقّق واحد من:
 *   ① نفس رقم الهوية
 *   ② نفس الجوال (جوال لا يتكرّر في أكثر من ١٠ سجلّات) + الاسم متقارب (≥ 0.6)
 *   ③ جوالان يفرقان خانة واحدة + الاسم متقارب (≥ 0.7)
 *   ④ (فقط مع --name-only) نفس الاسم حرفياً — الافتراضي معطّل: الاسم وحده لا يكفي
 * جوال الكفيل يتكرّر على عمّاله بأسماء مختلفة، فلا ربط بالجوال وحده أبداً.
 * ثم يجمع المرتبطين في مجموعات (مكوّنات متّصلة) ويرتّبها بعدد السجلّات تنازلياً.
 *
 * node scripts/client-dupe-clusters.mjs              → يبني tmp/dupe-clusters.json
 * node scripts/client-dupe-clusters.mjs --list 1 10  → يطبع المجموعات ١–١٠
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const OUT = path.join(process.cwd(), 'tmp', 'dupe-clusters.json')
const listArg = process.argv.indexOf('--list')

if (listArg > -1) {
  const all = JSON.parse(fs.readFileSync(OUT, 'utf8'))
  const from = Number(process.argv[listArg + 1] || 1)
  const count = Number(process.argv[listArg + 2] || 10)
  for (const g of all.filter(x => x.rank >= from).slice(0, count)) {
    console.log('\n### ' + g.rank + ' — ' + g.members.length + ' سجلّات')
    g.members.forEach((m, i) => console.log(
      (i + 1) + ' | ' + (m.name || '—') + ' | ' + (m.id_number || '—') + ' | ' + (m.phone || '—') +
      ' | ' + (m.nationality || '—') + ' | ' + (m.invoices.length ? m.invoices.join(' ') : 'لا فواتير')))
  }
  process.exit(0)
}

const envTxt = fs.readFileSync(path.join(process.cwd(), 'scripts/.env.jub1'), 'utf8')
const KEY = (envTxt.match(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*(\S+)/) || [])[1]
const sb = createClient('https://gcvshzutdslmdkwqwteh.supabase.co', KEY, { auth: { persistSession: false } })

async function all(table, cols, filter) {
  const rows = []; let from = 0
  for (;;) {
    let q = sb.from(table).select(cols).range(from, from + 999)
    if (filter) q = filter(q)
    const { data, error } = await q
    if (error) throw new Error(table + ': ' + error.message)
    rows.push(...data); if (data.length < 1000) break; from += 1000
  }
  return rows
}

const clients = await all('clients', 'id,name_ar,name_en,id_number,phone,nationality_id,created_at',
  q => q.is('deleted_at', null))
const nats = new Map((await all('nationalities', 'id,name_ar')).map(n => [n.id, n.name_ar]))
const reqs = await all('service_requests', 'client_id,request_ref_no,request_date',
  q => q.is('deleted_at', null).not('client_id', 'is', null))
const inv = new Map()
reqs.sort((a, b) => String(a.request_date).localeCompare(String(b.request_date)))
  .forEach(r => { if (!inv.has(r.client_id)) inv.set(r.client_id, []); inv.get(r.client_id).push(r.request_ref_no) })

// ── التطبيع ─────────────────────────────────────────────────────────────
const stripTail = s => (s || '').replace(/[\s\-]*[0٠]+\s*$/, '').replace(/\(؟\)/g, '')
const normAr = s => stripTail(s)
  .replace(/[ً-ْـ]/g, '')
  .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
  .replace(/[^ء-ي ]/g, ' ').replace(/\s+/g, ' ').trim()
const normEn = s => stripTail(s).toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim()
const cleanId = s => {
  const d = (s || '').replace(/\D/g, '')
  return /^[1-4]\d{9}$/.test(d) && !/^(\d)\1+$/.test(d) ? d : null
}
const normPhone = s => {
  const d = (s || '').replace(/\D/g, '')
  const m = d.match(/5\d{8}$/)
  return m ? m[0] : null
}
const bigrams = s => { const a = []; const t = s.replace(/ /g, ''); for (let i = 0; i < t.length - 1; i++) a.push(t.slice(i, i + 2)); return a }
function dice(a, b) {
  if (!a || !b) return 0
  const A = bigrams(a), B = bigrams(b); if (!A.length || !B.length) return 0
  const m = new Map(); A.forEach(x => m.set(x, (m.get(x) || 0) + 1))
  let hit = 0; B.forEach(x => { const n = m.get(x); if (n) { hit++; m.set(x, n - 1) } })
  return 2 * hit / (A.length + B.length)
}
function jac(a, b) {
  if (!a || !b) return 0
  const A = new Set(a.split(' ')), B = new Set(b.split(' '))
  let i = 0; A.forEach(x => { if (B.has(x)) i++ })
  return i / (A.size + B.size - i)
}

const C = clients.map(c => ({
  id: c.id, raw: c,
  ar: normAr(c.name_ar), en: normEn(c.name_en),
  cid: cleanId(c.id_number), ph: normPhone(c.phone),
}))

// null = لا يمكن المقارنة (أحدهما عربي فقط والآخر إنجليزي فقط)
function sim(x, y) {
  const s = []
  if (x.ar && y.ar) s.push(Math.max(jac(x.ar, y.ar), dice(x.ar, y.ar)))
  if (x.en && y.en) s.push(Math.max(jac(x.en, y.en), dice(x.en, y.en)))
  return s.length ? Math.max(...s) : null
}

// ── الروابط ─────────────────────────────────────────────────────────────
const parent = new Map(C.map(c => [c.id, c.id]))
const find = x => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x) } return x }
// قرارات «ليسا نفس الشخص» (client_not_same) تمنع الربط المباشر بين الزوج
const notSame = new Set((await all('client_not_same', 'a_id,b_id')).map(r => r.a_id + '|' + r.b_id))
const union = (a, b) => {
  if (notSame.has(a < b ? a + '|' + b : b + '|' + a)) return
  const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb)
}
const bucket = keyFn => {
  const m = new Map()
  C.forEach(c => { for (const k of [].concat(keyFn(c) || [])) { if (!m.has(k)) m.set(k, []); m.get(k).push(c) } })
  return m
}
const pairs = (list, fn) => { for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) fn(list[i], list[j]) }

// ① نفس الهوية
bucket(c => c.cid).forEach(l => pairs(l, (a, b) => union(a.id, b.id)))

// ② نفس الجوال
bucket(c => c.ph).forEach(l => {
  if (l.length > 10) return
  pairs(l, (a, b) => { const s = sim(a, b); if (s !== null && s >= 0.6) union(a.id, b.id) })
})

// ③ جوال يفرق خانة واحدة + اسم متقارب
bucket(c => c.ph ? [...c.ph].map((_, i) => c.ph.slice(0, i) + '*' + c.ph.slice(i + 1)) : null)
  .forEach(l => {
    if (l.length > 12) return
    pairs(l, (a, b) => { if (a.ph !== b.ph) { const s = sim(a, b); if (s !== null && s >= 0.7) union(a.id, b.id) } })
  })

// ④ نفس الاسم حرفياً — معطّل بطلب المستخدم: الاسم وحده لا يكفي، يلزم جوال أو هوية
if (process.argv.includes('--name-only')) for (const key of ['ar', 'en']) {
  bucket(c => (c[key] && c[key].split(' ').length >= 2) ? c[key] : null).forEach(l => {
    if (l.length > 25) return
    pairs(l, (a, b) => union(a.id, b.id))
  })
}

// ── المجموعات ───────────────────────────────────────────────────────────
const groups = new Map()
C.forEach(c => { const r = find(c.id); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(c) })

const out = [...groups.values()].filter(g => g.length > 1).map(g => {
  const members = g.map(c => ({
    id: c.id,
    name: c.raw.name_ar || c.raw.name_en,
    name_en: c.raw.name_ar ? c.raw.name_en : null,
    id_number: c.raw.id_number,
    phone: c.raw.phone,
    nationality: nats.get(c.raw.nationality_id) || null,
    created: String(c.raw.created_at).slice(0, 10),
    invoices: inv.get(c.id) || [],
  })).sort((a, b) => b.invoices.length - a.invoices.length || a.created.localeCompare(b.created))
  return { size: members.length, inv: members.reduce((s, m) => s + m.invoices.length, 0), members }
}).sort((a, b) => b.size - a.size || b.inv - a.inv)
out.forEach((g, i) => { g.rank = i + 1 })

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8')
const dist = {}
out.forEach(g => { dist[g.size] = (dist[g.size] || 0) + 1 })
console.log('عملاء: ' + C.length + ' · مجموعات: ' + out.length + ' · سجلّات فيها: ' + out.reduce((s, g) => s + g.size, 0))
console.log('التوزيع (حجم: عدد):', JSON.stringify(dist))
