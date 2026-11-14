// qawaem-bot — drains Jisr's financial-statements (قوائم) check queue.
//
// Why a bot on a Saudi-network PC and not a server function:
//   qawaemextapi.scbc.gov.sa (like the other Saudi government hosts) refuses
//   connections from Supabase in every region (tested 2026-11-14: DB `http`
//   extension and Edge Functions in ap-northeast-1/us-east-1/eu-central-1/
//   eu-west-2/ap-south-1 all time out), and the API sends no CORS headers, so
//   the browser cannot read it either. From a Saudi connection it answers fast.
//
// The database owns the schedule and the results:
//   pg_cron `qawaem-monthly-enqueue` (06:00 Riyadh on the 1st) → qawaem_enqueue()
//   fills public.qawaem_queue; this bot claims items (qawaem_bot_claim), calls
//   GET /api/QawaemServices/GetCREnquiry?crno={الرقم الموحد}&fiscalyear={year},
//   and hands the raw answers back (qawaem_bot_report) → public.qawaem_filings.
//   The bot keeps no state — if the PC is off, the queue just waits.
//
// Env (.env next to this file):
//   QAWAEM_BOT_TOKEN   required — secret matched (sha256) against qawaem_bot_config
//   SUPABASE_URL / SUPABASE_ANON_KEY   optional (defaults = prod)
//   POLL_MIN (default 10) · BATCH (default 40) · CONCURRENCY (default 4)

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const envFile = join(here, '.env')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
const env = (k, d) => (process.env[k] || d || '').trim()

const SUPABASE_URL = env('SUPABASE_URL', 'https://gcvshzutdslmdkwqwteh.supabase.co')
const SUPABASE_ANON_KEY = env('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdnNoenV0ZHNsbWRrd3F3dGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTkwNjgsImV4cCI6MjA5MDQ3NTA2OH0.5R0I5VvB7lp3wpSrtay3DMcXKsT9l1uK0Ukd1F4_ImM')
const TOKEN = env('QAWAEM_BOT_TOKEN')
const POLL_MS = Number(env('POLL_MIN', '10')) * 60 * 1000
const BATCH = Number(env('BATCH', '40'))
const CONCURRENCY = Number(env('CONCURRENCY', '4'))
const API = 'https://qawaemextapi.scbc.gov.sa/api/QawaemServices/GetCREnquiry'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => console.log(`[${new Date().toISOString()}]`, ...a)

if (!TOKEN) { console.error('QAWAEM_BOT_TOKEN missing in .env'); process.exit(1) }

async function rpc(fn, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${fn} HTTP ${res.status}: ${text.slice(0, 200)}`)
  return text ? JSON.parse(text) : null
}

async function check(item) {
  const url = `${API}?crno=${encodeURIComponent(item.unified_number)}&fiscalyear=${item.fiscal_year}`
  const base = { un: item.unified_number, cal: item.calendar, y: item.fiscal_year }
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { Accept: 'application/json' } })
    const body = await r.text()
    return { ...base, status: r.status, body: body.slice(0, 2000) }
  } catch (e) {
    return { ...base, error: String(e && e.message || e).slice(0, 200) }
  }
}

async function runBatch() {
  const items = await rpc('qawaem_bot_claim', { p_token: TOKEN, p_limit: BATCH })
  if (!Array.isArray(items) || !items.length) return 0
  const results = []
  let i = 0
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (i < items.length) {
      const it = items[i++]
      results.push(await check(it))
      await sleep(150)
    }
  }))
  await rpc('qawaem_bot_report', { p_token: TOKEN, p_results: results })
  const bad = results.filter((r) => r.error || r.status !== 200).length
  log(`checked ${results.length}${bad ? ` (${bad} failed, will retry)` : ''}`)
  return items.length
}

// ── Fiscal-year end from founding contracts (عقد التأسيس → facility_fiscal_years) ──
// New/changed contracts in documents/sbc-cr-certificates/{un}-contract.pdf (public bucket) are read
// with pdfjs here because the parsing needs the same Node toolchain anyway; the filing deadline in
// Jisr = fiscal-year end + 6 months (نظام الشركات م17/2), so the end date must come from the contract.
const CONTRACT_URL = `${SUPABASE_URL}/storage/v1/object/public/documents/sbc-cr-certificates/`
async function runFiscalYears() {
  const { extractFiscalYear } = await import('./qawaem-fy.mjs')
  let total = 0
  for (;;) {
    const todo = await rpc('qawaem_bot_fy_todo', { p_token: TOKEN, p_limit: 50 })
    if (!Array.isArray(todo) || !todo.length) break
    const out = []
    for (const t of todo) {
      try {
        const r = await fetch(CONTRACT_URL + `${t.unified_number}-contract.pdf`, { signal: AbortSignal.timeout(60000) })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const bytes = Buffer.from(await r.arrayBuffer())
        if (bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error('not a PDF')
        const fy = await extractFiscalYear(bytes, t.issue_g)
        out.push({ un: t.unified_number, ...fy, file_updated_at: t.file_updated_at })
      } catch (e) {
        out.push({ un: t.unified_number, basis: 'not_found', clause: 'error: ' + String(e.message || e).slice(0, 150), file_updated_at: t.file_updated_at })
      }
    }
    await rpc('qawaem_bot_fy_report', { p_token: TOKEN, p_rows: out })
    total += out.length
    const miss = out.filter((o) => o.basis === 'not_found').length
    log(`fiscal years read from ${out.length} contracts${miss ? ` (${miss} without a date)` : ''}`)
    if (todo.length < 50) break
  }
  return total
}

async function main() {
  log(`qawaem-bot up — poll every ${POLL_MS / 60000} min, batch ${BATCH}, concurrency ${CONCURRENCY}`)
  for (;;) {
    try {
      // Keep going while full batches come back; otherwise wait for the next poll.
      let n
      do { n = await runBatch() } while (n >= BATCH)
    } catch (e) {
      log('error:', e.message)
    }
    try { await runFiscalYears() } catch (e) { log('fiscal-year error:', e.message) }
    await sleep(POLL_MS)
  }
}

main()
