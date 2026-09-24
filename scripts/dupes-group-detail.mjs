#!/usr/bin/env node
/**
 * dupes-group-detail — يسحب تفاصيل كل مجموعة تكرار كاملةً إلى JSON محلّي
 * (عرض فقط) حتى تُراجَع مجموعةً مجموعة بلا استعلامٍ في كل مرّة.
 *
 * node scripts/dupes-group-detail.mjs            → يكتب tmp/dupe-groups.json
 * node scripts/dupes-group-detail.mjs --show 3   → يطبع المجموعة رقم ٣
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const OUT = path.join(process.cwd(), 'tmp', 'dupe-groups.json')
const showArg = process.argv.indexOf('--show')

if (showArg > -1 && fs.existsSync(OUT)) {
  const all = JSON.parse(fs.readFileSync(OUT, 'utf8'))
  const g = all.find(x => String(x.group_no) === process.argv[showArg + 1])
  console.log(JSON.stringify(g, null, 2))
  process.exit(0)
}

// --list [from] [count] : عرض مختصر — الاسم · الهوية · الجوال · الجنسية · أرقام الفواتير
const listArg = process.argv.indexOf('--list')
if (listArg > -1 && fs.existsSync(OUT)) {
  const all = JSON.parse(fs.readFileSync(OUT, 'utf8'))
  const from = Number(process.argv[listArg + 1] || 0)
  const count = Number(process.argv[listArg + 2] || 999)
  const pad = (s, n) => { s = String(s == null || s === '' ? '—' : s); return s + ' '.repeat(Math.max(0, n - [...s].length)) }
  let shown = 0
  for (const g of all) {
    if (g.group_no < from) continue
    if (shown++ >= count) break
    console.log('\n=== مجموعة ' + g.group_no + ' — ' + g.score + '% — ' + g.reason)
    for (const m of g.members) {
      console.log('  ' + (m.keep_suggested ? '*' : ' ') + ' ' +
        pad(m.name_ar || m.name_en, 26) + ' | ' + pad(m.id_number, 11) + ' | ' +
        pad(m.phone, 13) + ' | ' + pad(m.nationality, 12) + ' | ' +
        (m.requests.length ? m.requests.map(r => r.no).join(' , ') : 'لا فواتير'))
    }
  }
  process.exit(0)
}

const envTxt = fs.readFileSync(path.join(process.cwd(), 'scripts/.env.jub1'), 'utf8')
const KEY = (envTxt.match(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*(\S+)/) || [])[1]
const sb = createClient('https://gcvshzutdslmdkwqwteh.supabase.co', KEY, { auth: { persistSession: false } })

const { data: cands, error: e1 } = await sb
  .from('client_dupe_candidates').select('group_no,client_id,is_primary,score,reason')
if (e1) throw new Error(e1.message)

const ids = [...new Set(cands.map(r => r.client_id))]

const clients = new Map()
for (let i = 0; i < ids.length; i += 300) {
  const { data, error } = await sb.from('clients')
    .select('id,name_ar,name_en,id_number,phone,branch_id,notes,created_at,person_id,branch_ids,nationality_id')
    .in('id', ids.slice(i, i + 300))
  if (error) throw new Error('clients: ' + error.message)
  data.forEach(c => clients.set(c.id, c))
}

const { data: brs } = await sb.from('branches').select('id,branch_code,name_ar')
const branch = new Map((brs || []).map(b => [b.id, b.branch_code || b.name_ar]))

const { data: lk } = await sb.from('lookup_items').select('id,value_ar')
const look = new Map((lk || []).map(l => [l.id, l.value_ar]))

const { data: nats } = await sb.from('nationalities').select('id,name_ar')
const nat = new Map((nats || []).map(x => [x.id, x.name_ar]))

const reqs = new Map()
for (let i = 0; i < ids.length; i += 300) {
  const { data, error } = await sb.from('service_requests')
    .select('id,client_id,request_ref_no,request_date,service_type_id,status_id,beneficiary_person_id,' +
            'facility_id,created_at,invoices(invoice_no,total_amount,paid_amount,remaining_amount,deleted_at)')
    .in('client_id', ids.slice(i, i + 300)).is('deleted_at', null)
  if (error) throw new Error('service_requests: ' + error.message)
  data.forEach(s => { if (!reqs.has(s.client_id)) reqs.set(s.client_id, []); reqs.get(s.client_id).push(s) })
}

const benIds = [...new Set([...reqs.values()].flat().map(s => s.beneficiary_person_id).filter(Boolean))]
const bens = new Map()
for (let i = 0; i < benIds.length; i += 300) {
  const { data } = await sb.from('persons').select('id,name_ar,id_number').in('id', benIds.slice(i, i + 300))
  ;(data || []).forEach(p => bens.set(p.id, p))
}

const facIds = [...new Set([...reqs.values()].flat().map(s => s.facility_id).filter(Boolean))]
const facs = new Map()
for (let i = 0; i < facIds.length; i += 300) {
  const { data } = await sb.from('facilities').select('id,name_ar,unified_number').in('id', facIds.slice(i, i + 300))
  ;(data || []).forEach(f => facs.set(f.id, f))
}

// العامل المطابق في جدول العمالة — بالإقامة ثم بالاسم الوحيد
const norm = s => (s || '').replace(/[^ء-ي0-9a-zA-Z ]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
const wByIqama = new Map(), wByName = new Map()
{
  let from = 0
  for (;;) {
    const { data, error } = await sb.from('workers')
      .select('id,name_ar,name_en,iqama_number,phone,official_mobile,nationality_id')
      .is('deleted_at', null).range(from, from + 999)
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

const groups = new Map()
for (const m of cands) {
  const c = clients.get(m.client_id); if (!c) continue
  const iq = (c.id_number || '').replace(/\D/g, '')
  const byId = wByIqama.get(iq)
  const byName = wByName.get(norm(c.name_ar)) || []
  const w = byId || (byName.length === 1 ? byName[0] : null)
  const list = (reqs.get(c.id) || []).sort((a, b) => (a.request_date || '').localeCompare(b.request_date || ''))

  const member = {
    id: c.id,
    keep_suggested: m.is_primary,
    name_ar: c.name_ar, name_en: c.name_en,
    id_number: c.id_number, phone: c.phone,
    branch: branch.get(c.branch_id) || null,
    branches: (c.branch_ids || []).map(b => branch.get(b)).filter(Boolean),
    notes: c.notes || null,
    nationality: nat.get(c.nationality_id) || (w ? (nat.get(w.nationality_id) || null) : null),
    created: (c.created_at || '').slice(0, 10),
    linked_person: !!c.person_id,
    in_workers: w ? { matched_by: byId ? 'iqama' : 'name', name: w.name_ar || w.name_en,
                      iqama: w.iqama_number, phone: w.phone || w.official_mobile } : null,
    requests: list.map(s => {
      const live = (s.invoices || []).filter(v => !v.deleted_at)
      const b = bens.get(s.beneficiary_person_id)
      const f = facs.get(s.facility_id)
      return {
        no: s.request_ref_no, date: s.request_date,
        service: look.get(s.service_type_id) || null,
        status: look.get(s.status_id) || null,
        beneficiary: b ? (b.name_ar + ' / ' + (b.id_number || '—')) : null,
        facility: f ? f.name_ar : null,
        total: live.reduce((a, v) => a + Number(v.total_amount || 0), 0),
        paid: live.reduce((a, v) => a + Number(v.paid_amount || 0), 0),
        remaining: live.reduce((a, v) => a + Number(v.remaining_amount || 0), 0),
      }
    }),
  }
  if (!groups.has(m.group_no)) groups.set(m.group_no, { group_no: m.group_no, score: m.score, reason: m.reason, members: [] })
  groups.get(m.group_no).members.push(member)
}

const arr = [...groups.values()].sort((a, b) => a.group_no - b.group_no)
arr.forEach(g => g.members.sort((a, b) => (b.keep_suggested ? 1 : 0) - (a.keep_suggested ? 1 : 0)))
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(arr, null, 2), 'utf8')
console.log('تم: ' + OUT + '  (' + arr.length + ' مجموعة)')
