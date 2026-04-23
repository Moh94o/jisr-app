#!/usr/bin/env node
// One-off seeder: inserts Qiwa occupations that are not already in the DB
// (dedup by `code`). Reads JSON from stdin in the same shape as the Qiwa
// lookups endpoint response:
//   { data: [ { attributes: { id, code, "name-ar", "name-en", "saudi-only" } } ] }

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const SUPABASE_URL = 'https://gcvshzutdslmdkwqwteh.supabase.co'
const KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY
if (!KEY) { console.error('Set SUPABASE_SERVICE_ROLE or SUPABASE_ANON_KEY'); process.exit(1) }

const sb = createClient(SUPABASE_URL, KEY)

const path = process.argv[2] || '/dev/stdin'
const raw = readFileSync(path, 'utf8')
const payload = JSON.parse(raw)
const rows = (payload.data || []).map(r => r.attributes || r).map(a => ({
  qiwa_id: a.id,
  code: String(a.code),
  name_ar: (a['name-ar'] || a.name_ar || a.name || '').trim(),
  name_en: (a['name-en'] || a.name_en || '').trim() || null,
  saudi_only: !!(a['saudi-only'] ?? a.saudi_only),
  is_active: true,
}))

console.log(`Parsed ${rows.length} rows from input`)

// Fetch existing codes in batches to avoid URL limits
const { data: existing, error: eErr } = await sb.from('occupations').select('code').is('deleted_at', null)
if (eErr) { console.error('Fetch existing failed:', eErr); process.exit(1) }
const existingCodes = new Set((existing || []).map(r => String(r.code)))
const toInsert = rows.filter(r => r.code && !existingCodes.has(r.code))
console.log(`Already in DB: ${existingCodes.size}. New to insert: ${toInsert.length}`)

if (!toInsert.length) { console.log('Nothing to insert.'); process.exit(0) }

// Assign sort_order continuing after the current max
const { data: maxRow } = await sb.from('occupations').select('sort_order').order('sort_order', { ascending: false, nullsFirst: false }).limit(1)
let nextOrder = ((maxRow && maxRow[0] && maxRow[0].sort_order) || 0) + 1
toInsert.sort((a, b) => a.name_ar.localeCompare(b.name_ar, 'ar'))
toInsert.forEach(r => { r.sort_order = nextOrder++ })

// Insert in chunks of 200
const CHUNK = 200
let inserted = 0
for (let i = 0; i < toInsert.length; i += CHUNK) {
  const batch = toInsert.slice(i, i + CHUNK)
  const { error } = await sb.from('occupations').insert(batch)
  if (error) {
    console.error(`Batch ${i}-${i + batch.length} failed:`, error.message)
    continue
  }
  inserted += batch.length
  process.stdout.write(`\rInserted ${inserted}/${toInsert.length}`)
}
console.log(`\nDone. Inserted ${inserted} new occupations.`)
