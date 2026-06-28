// ════════════════════════════════════════════════════════════════════════════
// Jisr WhatsApp Invoice Bot
// Posts a live feed of every invoice financial event (create / payment / refund /
// cancel / pricing-or-payment edit) to the office WhatsApp group, each invoice as its
// own searchable message + PDF file. Plus a daily summary: preliminary at 01:00 Riyadh
// and a corrected final at 05:0X (only if anything changed between 01:00 and 05:00).
//
// Architecture: DB triggers enqueue events into public.wa_outbox. This bot polls
// wa_claim_jobs, renders the message (+ PDF via the app's shared buildInvoiceDoc), sends
// to the group via whatsapp-web.js, then marks each job done. Mirrors the muqeem-bot
// deployment pattern (start.bat / install-autostart.bat / LocalAuth session).
//
// ⚠ Uses an UNOFFICIAL WhatsApp library — pair a DEDICATED office number, never a personal one.
// ════════════════════════════════════════════════════════════════════════════
import 'dotenv/config'
import { execFileSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import pkg from 'whatsapp-web.js'
const { Client, LocalAuth, MessageMedia } = pkg
import qrcode from 'qrcode-terminal'
import { createClient } from '@supabase/supabase-js'
import { initDb, db, fetchInvoice, fetchInvoiceData } from './lib/invoiceData.mjs'
import { buildInvoiceDoc } from '../src/lib/invoicePrint.js'
import { renderInvoicePdf } from './lib/pdf.mjs'
import { businessDayOf, riyadh } from './lib/businessDay.mjs'
import { formatEvent, formatCard, formatDayHeader, formatSummary, summaryKey, pdfFileName, party, clientLangs } from './lib/format.mjs'

// ── config ──
const env = (k, d) => (process.env[k] ?? d ?? '').toString().trim()
const int = (k, d) => (parseInt(env(k, String(d)), 10) || d)
const SUPABASE_URL = env('SUPABASE_URL')
const SERVICE_KEY = env('SUPABASE_SERVICE_ROLE_KEY')
const GROUP_ID = env('WA_GROUP_ID')
const GROUP_NAME = env('WA_GROUP_NAME')
const POLL_MS = int('POLL_SEC', 20) * 1000
const RIPEN_SEC = int('RIPEN_SEC', 60)
const PREVIEW_HOUR = int('SUMMARY_PREVIEW_HOUR', 1)
const FINAL_HOUR = int('SUMMARY_FINAL_HOUR', 5)
const FINAL_MIN = int('SUMMARY_FINAL_MINUTE', 5)
const DELAY_MIN = int('SEND_DELAY_MIN', 3000)
const DELAY_MAX = int('SEND_DELAY_MAX', 8000)
const SEND_TO_CLIENT = env('SEND_TO_CLIENT', 'true') !== 'false'
const CLIENT_DELAY_MIN = int('CLIENT_DELAY_MIN', 5000)
const CLIENT_DELAY_MAX = int('CLIENT_DELAY_MAX', 12000)
const LIST_GROUPS = process.argv.includes('--list-groups')

const log = (...a) => console.log(`[${new Date().toISOString()}]`, ...a)
const sleep = ms => new Promise(r => setTimeout(r, ms))
const rand = (a, b) => a + Math.floor(Math.random() * Math.max(1, b - a))

if (!SUPABASE_URL || !SERVICE_KEY) { log('✗ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env'); process.exit(1) }

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
initDb(SUPABASE_URL, SERVICE_KEY)

// Every event carries the up-to-date invoice PDF (payment / cancel / refund / edit all include the file).

let ready = false, groupId = null
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] },
})

// ── self-healing ───────────────────────────────────────────────────────────
// whatsapp-web.js runs a headless Chromium; when WhatsApp logs the device out or the
// page reloads, the puppeteer frame "detaches" and every send throws forever while the
// Node process stays alive — a zombie PM2 won't restart (it never crashed). We detect
// these connection-level faults and EXIT so PM2 brings up a fresh browser that restores
// the saved LocalAuth session. Restarting the process is far more reliable than trying
// to re-init Chromium in place.
const FAULT_RE = /detached frame|session closed|target closed|protocol error|execution context|not connected|page has been closed|navigation|websocket/i
const isFault = e => FAULT_RE.test(String(e?.message || e))

// On Windows, a force-killed bot (PM2 SIGKILL, crash) leaves an orphaned Chromium that
// keeps the LocalAuth profile locked → the NEXT launch hangs forever at initialize() with
// no QR/ready/error. Before starting, kill any chrome still bound to THIS profile and drop
// stale lock files. Filtering by the profile path makes this safe for the user's own Chrome.
const SESSION_DIR = process.cwd().replace(/\\/g, '\\\\') + '\\\\.wwebjs_auth'
function cleanStaleBrowser() {
  try {
    execFileSync('powershell', ['-NoProfile', '-Command',
      `Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -match 'wwebjs_auth' } | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force } catch {} }`,
    ], { stdio: 'ignore', timeout: 15000 })
  } catch (e) { log('cleanup kill warn:', e.message) }
  for (const f of ['lockfile', 'DevToolsActivePort', 'SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
    const p = `./.wwebjs_auth/session/${f}`
    try { if (existsSync(p)) rmSync(p, { force: true }) } catch {}
  }
  log('↻ pre-start cleanup done (stale Chromium / locks cleared)')
}

let dying = false
// Close Chromium cleanly on every exit path so we never orphan a browser (the cause of
// hung restarts). Best-effort with a hard timeout — a detached client.destroy() can itself
// hang, so we never wait on it longer than 8s before forcing exit.
async function shutdown(reason, code) {
  if (dying) return
  dying = true
  ready = false
  log('↘ shutdown —', reason, '→ exit', code)
  try { await Promise.race([client.destroy(), sleep(8000)]) } catch (e) { log('destroy warn:', e.message) }
  process.exit(code)
}
const fatal = reason => { shutdown(reason, 1) }
process.on('SIGINT', () => shutdown('SIGINT', 0))
process.on('SIGTERM', () => shutdown('SIGTERM', 0))

client.on('qr', q => { log('▶ Scan this QR with the OFFICE WhatsApp number (NOT your personal number):'); qrcode.generate(q, { small: true }) })
client.on('auth_failure', m => { log('✗ auth_failure', m); fatal('auth_failure') })
client.on('disconnected', r => { log('✗ disconnected:', r); fatal('disconnected: ' + r) })
client.on('ready', async () => {
  try {
    const chats = await client.getChats()
    const groups = chats.filter(c => c.isGroup)
    if (LIST_GROUPS) { log('Your WhatsApp groups:'); for (const g of groups) log('  •', g.name, '=>', g.id._serialized); await sleep(500); process.exit(0) }
    if (GROUP_ID) groupId = GROUP_ID
    else if (GROUP_NAME) groupId = groups.find(g => g.name === GROUP_NAME)?.id?._serialized || null
    if (!groupId) {
      log('⚠ Target group not set/found. Set WA_GROUP_ID or WA_GROUP_NAME in .env. Available groups:')
      for (const g of groups) log('  •', g.name, '=>', g.id._serialized)
    } else {
      const RENAME = env('WA_GROUP_RENAME')
      if (RENAME) {
        try {
          const chat = groups.find(c => c.id?._serialized === groupId) || await client.getChatById(groupId).catch(() => null)
          if (!chat) log('rename: chat not found for', groupId)
          else { log('group current name:', chat.name); if (chat.name !== RENAME) { await chat.setSubject(RENAME); log('renamed group →', RENAME) } }
        } catch (e) { log('rename failed:', e.message) }
      }
      // Recover any jobs left in 'processing' by a previous crash mid-batch.
      try { const { data: n } = await sb.rpc('wa_reap_stale', { p_seconds: 120 }); if (n) log('↻ reaped', n, 'stale processing job(s) → pending') } catch (e) { log('reap err:', e.message) }
      ready = true
      log('✓ Ready — posting to group', groupId)
    }
  } catch (e) { log('ready handler error:', e.message) }
})

const waSend = (content, opts) => client.sendMessage(groupId, content, opts || {})

// Resolve a phone (966xxxxxxxxx) to a WhatsApp chat id, or null if not a WhatsApp user.
async function resolveWaId(waDigits) {
  try { const id = await client.getNumberId(waDigits); return id?._serialized || null }
  catch (e) { log('  getNumberId err', e.message); return null }
}

async function sendJob(j) {
  const { kind, invoice_id: invId, payload } = j
  if (kind === 'announce') { await client.sendMessage(groupId, (payload && payload.text) || ''); return }
  if (kind === 'preview_card') { const pv = await fetchInvoice(payload.invoice_id); if (pv) await client.sendMessage(groupId, formatCard(payload.kind || 'invoice_created', pv, payload.payload || {}, payload.lang || 'ar')); return }
  if (!invId) return
  const inv = await fetchInvoice(invId)
  if (!inv) throw new Error('invoice not found ' + invId)
  const data = await fetchInvoiceData(inv)
  const pdfCache = {}
  const pdfFor = async lang => (pdfCache[lang] ||= await renderInvoicePdf(buildInvoiceDoc(inv, data, lang)))
  const sendTo = async (to, lang, isClient) => {
    const caption = isClient ? formatCard(kind, inv, payload || {}, lang) : formatEvent(kind, inv, payload || {}, lang)
    const media = new MessageMedia('application/pdf', Buffer.from(await pdfFor(lang)).toString('base64'), pdfFileName(inv, lang))
    await client.sendMessage(to, media, { caption })
  }

  // 1) office group — Arabic (compact)
  await sendTo(groupId, 'ar', false)

  // 2) client / worker direct — their language (by nationality) + Arabic base
  if (SEND_TO_CLIENT) {
    const { wa, natCode, name } = party(inv)
    if (!wa) { log('  ↳ no client phone — group only'); return }
    const chatId = await resolveWaId(wa)
    if (!chatId) { log('  ↳ client not on WhatsApp — skip', wa); return }
    for (const lang of clientLangs(natCode)) {
      await sleep(rand(CLIENT_DELAY_MIN, CLIENT_DELAY_MAX))
      await sendTo(chatId, lang, true)
      log('  ✓ client', lang, '→', name)
    }
  }
}

// Overlap guard: each batch is sent serially with 3–8s gaps, so a 25-job batch takes
// minutes — longer than POLL_MS. Without this flag the timer would claim fresh batches
// on top of the running one, sending far faster than the intended anti-spam spacing
// (WhatsApp ban risk on a big backlog). Only one processJobs runs at a time.
let processing = false
async function processJobs() {
  if (processing) return
  processing = true
  try { await drainJobs() } finally { processing = false }
}
async function drainJobs() {
  const { data: jobs, error } = await sb.rpc('wa_claim_jobs', { p_limit: 25, p_ripen_seconds: RIPEN_SEC })
  if (error) { log('claim error:', error.message); return }
  if (!jobs?.length) return
  log(`claimed ${jobs.length} job(s)`)
  jobs.sort((a, b) => String(a.event_at || '').localeCompare(String(b.event_at || '')))

  const headered = new Set()
  for (const j of jobs) {
    try {
      const day = businessDayOf(new Date(j.event_at))
      if (!headered.has(day)) {
        headered.add(day)
        const { data: claimed } = await sb.rpc('wa_claim_day_header', { p_day: day })
        if (claimed) { await waSend(formatDayHeader(day)); await sleep(rand(DELAY_MIN, DELAY_MAX)) }
      }
      await sendJob(j)
      await sb.rpc('wa_complete_job', { p_id: j.id, p_ok: true })
      log('  ✓ sent', j.kind, j.invoice_id || '')
    } catch (e) {
      // Connection-level fault → requeue this job WITHOUT burning an attempt, stop the
      // batch, and exit so PM2 restarts with a healthy session. Prevents the zombie loop
      // that marked 189 real events 'failed' over 3 days.
      if (isFault(e)) {
        log('  ⚠ transport fault on', j.kind, '—', e.message, '→ requeue + restart')
        await sb.rpc('wa_requeue_job', { p_id: j.id, p_error: String(e.message || e).slice(0, 300) }).catch(() => {})
        fatal('send fault: ' + e.message)
        return
      }
      // Genuine data error (e.g. invoice not found) → normal retry/fail path.
      log('  ✗ failed', j.kind, e.message)
      await sb.rpc('wa_complete_job', { p_id: j.id, p_ok: false, p_error: String(e.message || e).slice(0, 300) })
    }
    await sleep(rand(DELAY_MIN, DELAY_MAX))
  }
}

const getState = async day => (await sb.rpc('wa_get_summary_state', { p_business_day: day })).data || null
const setState = (day, phase, payload) => sb.rpc('wa_set_summary_state', { p_business_day: day, p_phase: phase, p_payload: payload })
const daySummary = async day => (await sb.rpc('wa_day_summary', { p_business_day: day })).data

async function checkSummaries() {
  const now = new Date(), r = riyadh(now)
  // Preliminary at 01:xx — summarizes the still-open business day.
  if (r.h === PREVIEW_HOUR) {
    const day = businessDayOf(now)
    const st = await getState(day)
    if (!st?.preview_sent_at) {
      const sum = await daySummary(day)
      await waSend(formatSummary(sum, 'preview'))
      await setState(day, 'preview', summaryKey(sum))
      log('📊 preview summary sent for', day)
    }
  }
  // Final at 05:0X — the just-closed business day (1h earlier is still that day).
  if (r.h === FINAL_HOUR && r.m >= FINAL_MIN) {
    const day = businessDayOf(new Date(now.getTime() - 3600 * 1000))
    const st = await getState(day)
    if (!st?.final_sent_at) {
      const sum = await daySummary(day)
      const key = summaryKey(sum)
      const changed = !st?.preview_payload || JSON.stringify(st.preview_payload) !== JSON.stringify(key)
      if (changed) { await waSend(formatSummary(sum, 'final')); log('📊 FINAL summary sent (changed) for', day) }
      else log('final summary unchanged — skip send for', day)
      await setState(day, 'final', key)
    }
  }
}

setInterval(() => { if (ready) processJobs().catch(e => log('processJobs err:', e.message)) }, POLL_MS)
setInterval(() => { if (ready && groupId) checkSummaries().catch(e => log('summary err:', e.message)) }, POLL_MS)

// Watchdog: probe the live connection every 60s so a silent zombie is caught even when
// no events are queued. getState() itself touches the page — if the frame detached it
// throws, and any non-CONNECTED state means the link is gone → restart via PM2.
setInterval(async () => {
  if (!ready || dying) return
  try {
    const st = await client.getState()
    if (st !== 'CONNECTED') fatal('unhealthy state: ' + st)
  } catch (e) { fatal('getState threw: ' + e.message) }
}, 60000)

log(`WA invoice bot starting — poll ${POLL_MS / 1000}s · ripen ${RIPEN_SEC}s · summaries ${PREVIEW_HOUR}:00 / ${FINAL_HOUR}:${String(FINAL_MIN).padStart(2, '0')} Riyadh`)
cleanStaleBrowser()
client.initialize()
