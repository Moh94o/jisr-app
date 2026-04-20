// Muqeem Auto-Login Bot
// ──────────────────────
// Runs forever. Every 10 minutes (RUN_EVERY_MIN env, default 10):
//   1. Opens muqeem.sa login in headless Chromium
//   2. Fills username + password (auto-passes most reCAPTCHA via stealth plugin)
//   3. Polls Supabase for the latest OTP (sent to Jisr via existing SMS pipeline)
//   4. Submits OTP, lands on the enquiry page
//   5. Captures the JWT + cookies + XSRF
//   6. Pushes the session to muqeem_sessions in Supabase
// The Jisr frontend reads this session every 30s, so the kafala calculator always
// has a live JWT without anyone touching anything.

import 'dotenv/config'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

puppeteer.use(StealthPlugin())

// ─── config from env ────────────────────────────────────────
const env = (k, dflt) => (process.env[k] || dflt || '').trim()
// Env credentials are an optional fallback. The primary source is the
// muqeem_credentials table in Supabase (editable from Jisr Settings page).
const ENV_MUQEEM_USERNAME = env('MUQEEM_USERNAME')
const ENV_MUQEEM_PASSWORD = env('MUQEEM_PASSWORD')
const SUPABASE_URL = env('SUPABASE_URL', 'https://gcvshzutdslmdkwqwteh.supabase.co')
const SUPABASE_ANON_KEY = env('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdnNoenV0ZHNsbWRrd3F3dGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTkwNjgsImV4cCI6MjA5MDQ3NTA2OH0.5R0I5VvB7lp3wpSrtay3DMcXKsT9l1uK0Ukd1F4_ImM')
const RUN_EVERY_MS = parseInt(env('RUN_EVERY_MIN', '10')) * 60 * 1000
const HEADLESS = env('HEADLESS', 'new') === 'new' ? 'new' : env('HEADLESS') === 'false' ? false : true

// ─── helpers ────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))
const log = (...a) => console.log(`[${new Date().toISOString()}]`, ...a)

function decodeJwt(jwt) {
  try {
    const part = jwt.split('.')[1]
    const padded = part + '='.repeat((4 - part.length % 4) % 4)
    const json = JSON.parse(Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))
    return { exp: json.exp || null, moiNumber: json.moiNumber || json.sub || null }
  } catch { return { exp: null, moiNumber: null } }
}

async function fetchLatestOtp() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_latest_muqeem_otp`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ since_seconds: 120 }),
  })
  if (!res.ok) return null
  const v = await res.json()
  return typeof v === 'string' ? v : null
}

// Prefer credentials stored in Supabase (editable from Jisr Settings → General).
// Falls back to env vars if the RPC is unreachable or the row is missing.
async function fetchCredentials() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_muqeem_credentials`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    })
    if (res.ok) {
      const v = await res.json()
      const username = (v && typeof v === 'object' && v.username) ? String(v.username).trim() : ''
      const password = (v && typeof v === 'object' && v.password) ? String(v.password).trim() : ''
      if (username && password) return { username, password, source: 'supabase' }
    }
  } catch (e) {
    log(`  ⚠ Supabase credentials fetch failed: ${e.message} — falling back to .env`)
  }
  if (ENV_MUQEEM_USERNAME && ENV_MUQEEM_PASSWORD) {
    return { username: ENV_MUQEEM_USERNAME, password: ENV_MUQEEM_PASSWORD, source: 'env' }
  }
  return null
}

async function pushSession(session) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/muqeem_sessions?on_conflict=id`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      id: 'default',
      ...session,
      updated_at: new Date().toISOString(),
    }),
  })
  if (!res.ok) throw new Error(`Supabase upsert failed ${res.status}: ${(await res.text()).slice(0, 200)}`)
}

// ─── login flow ────────────────────────────────────────────
async function loginOnce() {
  const creds = await fetchCredentials()
  if (!creds) throw new Error('No credentials — set them in Jisr Settings → General → Muqeem, or define MUQEEM_USERNAME/MUQEEM_PASSWORD in .env')
  log(`→ Using credentials from ${creds.source} (username: ${creds.username.replace(/.(?=.{3})/g, '•')})`)

  const browser = await puppeteer.launch({
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
  })
  let captured = null

  try {
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36')
    await page.setViewport({ width: 1366, height: 768 })

    // Capture the first authenticated API call
    page.on('request', (req) => {
      if (captured) return
      const url = req.url()
      if (!url.includes('muqeem.sa/api/')) return
      const headers = req.headers()
      const auth = headers['authorization'] || headers['Authorization']
      if (!auth || !/^Bearer\s+/i.test(auth)) return
      captured = {
        authBearer: auth.replace(/^Bearer\s+/i, ''),
        xsrfToken: headers['x-xsrf-token'] || headers['X-Xsrf-Token'] || null,
        xDomain: headers['x-domain'] || headers['X-Domain'] || null,
      }
      log('  ✓ Captured Authorization header')
    })

    log('→ Navigating to muqeem.sa/#/login')
    await page.goto('https://muqeem.sa/#/login', { waitUntil: 'networkidle2', timeout: 60000 })
    await sleep(2000)

    log('→ Filling credentials')
    await page.waitForSelector('input[type="password"]', { timeout: 30000 })
    const usernameSel = await page.evaluate(() => {
      const all = [...document.querySelectorAll('input')].filter(i => i.offsetParent && i.type !== 'hidden' && i.type !== 'password')
      const u = all.find(i => /username|userid|nationalid|loginid/i.test(`${i.id} ${i.name} ${i.formControlName||''}`))
              || all.find(i => /اسم|مستخدم|هوية/.test(i.placeholder || ''))
              || all[0]
      if (u) { u.id = u.id || `auto-username-${Date.now()}`; return '#' + CSS.escape(u.id) }
      return null
    })
    if (!usernameSel) throw new Error('Could not locate username field')

    await page.click(usernameSel, { clickCount: 3 })
    await page.type(usernameSel, creds.username, { delay: 70 })
    await page.click('input[type="password"]', { clickCount: 3 })
    await page.type('input[type="password"]', creds.password, { delay: 70 })

    log('→ Clicking login')
    const loginStart = Date.now()
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button, input[type="submit"]')]
        .filter(b => b.offsetParent && !b.disabled)
        .find(b => /دخول|login|تسجيل/i.test(b.textContent || b.value || ''))
      if (btn) btn.click()
    })

    log('→ Waiting for OTP input')
    await page.waitForFunction(() => {
      return [...document.querySelectorAll('input')].some(i => {
        if (!i.offsetParent || i.type === 'hidden' || i.type === 'password') return false
        const meta = `${i.placeholder||''} ${i.id||''} ${i.name||''}`.toLowerCase()
        return /otp|verify|code|رمز|التحقق/.test(meta) || (i.maxLength >= 4 && i.maxLength <= 8)
      })
    }, { timeout: 30000 })

    log('→ Polling Supabase for OTP (90s window)')
    let otp = null
    const otpStart = Date.now()
    while (Date.now() - otpStart < 90_000) {
      otp = await fetchLatestOtp()
      // Only accept OTPs that arrived AFTER we triggered login
      if (otp) {
        // We accept any recent OTP; the SQL function already filters to last 120s.
        // To be safe, give the SMS time to land — wait at least 8s after login click.
        if (Date.now() - loginStart > 8_000) break
      }
      await sleep(3000)
    }
    if (!otp) throw new Error('OTP did not arrive in 90s')
    log(`→ Got OTP: ${otp}`)

    const otpSel = await page.evaluate(() => {
      const all = [...document.querySelectorAll('input')].filter(i => i.offsetParent && i.type !== 'hidden' && i.type !== 'password')
      const o = all.find(i => /otp|verify|code|رمز|التحقق/i.test(`${i.id} ${i.name} ${i.placeholder||''}`))
              || all.find(i => i.maxLength >= 4 && i.maxLength <= 8)
              || all[0]
      if (o) { o.id = o.id || `auto-otp-${Date.now()}`; return '#' + CSS.escape(o.id) }
      return null
    })
    if (!otpSel) throw new Error('Could not locate OTP input')

    await page.click(otpSel, { clickCount: 3 })
    await page.type(otpSel, otp, { delay: 80 })

    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button, input[type="submit"]')]
        .filter(b => b.offsetParent && !b.disabled)
        .find(b => /تحقق|تأكيد|verify|confirm|continue|متابعة|دخول|submit/i.test(b.textContent || b.value || ''))
      if (btn) btn.click()
    })

    log('→ Waiting for dashboard, then triggering an enquiry to capture JWT')
    await sleep(4000)
    await page.goto('https://muqeem.sa/#/enquiry-services/search-unsponsored-resident', { waitUntil: 'networkidle2', timeout: 30000 })

    // Wait until we capture a JWT (dashboard usually fires API calls automatically)
    const captureWait = Date.now()
    while (!captured && Date.now() - captureWait < 30_000) await sleep(500)
    if (!captured) throw new Error('Did not capture JWT — login may have failed')

    const cookies = await page.cookies('https://muqeem.sa')
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ')
    const { exp, moiNumber } = decodeJwt(captured.authBearer)
    if (!exp) throw new Error('Captured JWT could not be decoded')

    const session = {
      auth_bearer: captured.authBearer,
      xsrf_token: captured.xsrfToken,
      x_domain: captured.xDomain,
      cookies: cookieStr,
      jwt_exp: exp,
      moi_number: moiNumber,
    }

    log('→ Pushing session to Supabase')
    await pushSession(session)
    log(`✓ Session active until ${new Date(exp * 1000).toLocaleString('en-GB', { timeZone: 'Asia/Riyadh' })}`)
  } finally {
    await browser.close().catch(() => {})
  }
}

// ─── main loop ─────────────────────────────────────────────
async function tick() {
  try {
    await loginOnce()
  } catch (e) {
    log(`✗ Login failed: ${e.message}`)
    if (e.stack) log(e.stack.split('\n').slice(0, 5).join('\n'))
  }
}

;(async function main() {
  log(`Muqeem bot started (every ${RUN_EVERY_MS / 60_000} min, headless=${HEADLESS})`)
  await tick()
  setInterval(tick, RUN_EVERY_MS)
})()
