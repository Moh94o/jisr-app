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
// عند فشل تسجيل الدخول (غير قفل الحساب) نعيد المحاولة بسرعة بدل انتظار الدورة الكاملة،
// حتى لا تسبّب تعثّرة واحدة (تأخّر OTP مثلاً) فجوة انقطاع طويلة لجلسة مقيم (JWT عمره ~15 دقيقة).
const RETRY_AFTER_MS = parseInt(env('RETRY_AFTER_SEC', '90')) * 1000
// حدّ أقصى لعدد إعادات المحاولة السريعة المتتالية — بعده نعود للدورة العادية (كل 10 دقائق)
// حتى لا نُغرق منصة مقيم بطلبات OTP عند تعطّل وصول الرمز (قد يُقفل الحساب).
const MAX_FAST_RETRIES = parseInt(env('MAX_FAST_RETRIES', '2'))
// استطلاع أمر «إعادة الاتصال» القادم من واجهة جسر (زر إعادة الاتصال في حاسبة نقل الكفالة).
const CMD_POLL_MS = parseInt(env('CMD_POLL_SEC', '15')) * 1000
// أدنى فاصل بين دخولَين قسريَّين بطلب من الواجهة — حماية من إغراق مقيم بطلبات OTP.
const MIN_FORCED_GAP_MS = parseInt(env('MIN_FORCED_GAP_SEC', '90')) * 1000
// «الشبكة ميتة داخل العملية» (net::ERR_INTERNET_DISCONNECTED بينما الجهاز متصل):
// حالة موثّقة لا تُصلح نفسها أبداً — العلاج الوحيد عملية جديدة. بعد هذا العدد من الفشل
// الشبكي المتتالي نُنهي العملية عمداً ليُعيد PM2 تشغيلها بعملية سليمة.
const NET_DEAD_EXIT_AFTER = parseInt(env('NET_DEAD_EXIT_AFTER', '2'))
const NET_DEAD_RE = /ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_NETWORK_CHANGED|ERR_PROXY_CONNECTION_FAILED|ERR_TUNNEL_CONNECTION_FAILED|fetch failed/i
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

async function fetchLatestOtp(sinceSeconds = 120) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_latest_muqeem_otp`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ since_seconds: sinceSeconds }),
  })
  if (!res.ok) return null
  const v = await res.json()
  return typeof v === 'string' ? v : null
}

// يلتقط طلب «إعادة الاتصال» المعلّق من الواجهة ويصفّره ذرّياً (RPC security definer).
async function takeReconnectRequest() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/take_muqeem_reconnect_request`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  })
  if (!res.ok) throw new Error(`take_muqeem_reconnect_request ${res.status}`)
  return (await res.json()) === true
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
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/upsert_muqeem_session`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_auth_bearer: session.auth_bearer,
      p_xsrf_token:  session.xsrf_token,
      p_x_domain:    session.x_domain,
      p_cookies:     session.cookies,
      p_jwt_exp:     session.jwt_exp,
      p_moi_number:  session.moi_number,
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
    try {
      await page.waitForFunction(() => {
        return [...document.querySelectorAll('input')].some(i => {
          if (!i.offsetParent || i.type === 'hidden' || i.type === 'password') return false
          const meta = `${i.placeholder||''} ${i.id||''} ${i.name||''}`.toLowerCase()
          return /otp|verify|code|رمز|التحقق/.test(meta) || (i.maxLength >= 4 && i.maxLength <= 8)
        })
      }, { timeout: 30000 })
    } catch (e) {
      const pageText = await page.evaluate(() => document.body.innerText || '').catch(() => '')
      const compact = pageText.replace(/\s+/g, ' ').slice(0, 400)
      // Stop hammering the endpoint if Muqeem reports the account is temporarily locked.
      // The lock self-clears after ~15 min; further attempts can extend it.
      if (/قفل|locked|blocked/i.test(compact)) {
        const err = new Error('ACCOUNT_LOCKED: ' + compact.slice(0, 200))
        err.code = 'ACCOUNT_LOCKED'
        throw err
      }
      log(`  page text: ${compact}`)
      throw e
    }

    log('→ Polling Supabase for OTP (180s window)')
    let otp = null
    const otpStart = Date.now()
    // Muqeem's OTP SMS latency drifts (seen up to ~100s), so wait up to 180s rather than 90s
    // — a token gap costs ~15 min, while a wider wait sends no extra OTP requests.
    while (Date.now() - otpStart < 180_000) {
      // Anchor the lookback to the login click so we never grab a stale OTP from a prior cycle.
      const sinceSec = Math.max(8, Math.ceil((Date.now() - loginStart) / 1000))
      otp = await fetchLatestOtp(sinceSec)
      // Give the SMS time to land — accept only after at least 8s past the login click.
      if (otp && Date.now() - loginStart > 8_000) break
      await sleep(3000)
    }
    if (!otp) throw new Error('OTP did not arrive in 180s')
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
let cooldownUntil = 0
let busy = false            // منع تشغيل جلستَي تسجيل دخول متوازيتين (loginOnce يفتح متصفحًا headless)
let retryTimer = null       // مؤقّت إعادة المحاولة السريعة عند الفشل — واحد فقط في كل مرة
let consecutiveFailures = 0 // عدّاد الفشل المتتالي — يُصفَّر عند أي نجاح، ويحدّ إعادات المحاولة السريعة
let netDeadFailures = 0     // فشل شبكي متتالٍ في تسجيل الدخول — عند بلوغ الحدّ نخرج ليُعيدنا PM2
let pollFailures = 0        // فشل متتالٍ في استطلاع أمر إعادة الاتصال (Supabase غير قابلة للوصول من داخل العملية)
let lastForcedAt = 0        // آخر دخول قسري بطلب من الواجهة — لفرض أدنى فاصل بين الطلبات

// جدولة إعادة محاولة سريعة بعد فشل غير قفل الحساب (تُلغى عند نجاح أي دورة لاحقة).
function scheduleRetry() {
  if (retryTimer) return                    // إعادة محاولة مجدولة أصلاً — لا تُكدّس
  if (Date.now() < cooldownUntil) return    // الحساب في تهدئة — لا تُعِد بسرعة
  if (consecutiveFailures > MAX_FAST_RETRIES) {
    log(`  ⏸ ${consecutiveFailures} consecutive failures — pausing fast retries, waiting for the next scheduled tick (avoids OTP spam / lock). Likely the OTP is not arriving in Supabase.`)
    return
  }
  log(`  ↻ Scheduling a fast retry in ${Math.round(RETRY_AFTER_MS / 1000)}s (failure #${consecutiveFailures})`)
  retryTimer = setTimeout(() => { retryTimer = null; tick() }, RETRY_AFTER_MS)
}

async function tick() {
  if (busy) { log('⏭ Skipping tick — a login run is already in progress'); return }
  if (Date.now() < cooldownUntil) {
    const waitMin = Math.ceil((cooldownUntil - Date.now()) / 60_000)
    log(`⏸ Skipping tick — account cooldown active (${waitMin} min remaining)`)
    return
  }
  busy = true
  try {
    await loginOnce()
    consecutiveFailures = 0                                           // نجحنا — صفّر العدّاد
    netDeadFailures = 0
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null }   // وألغِ أي إعادة محاولة معلّقة
  } catch (e) {
    consecutiveFailures++
    log(`✗ Login failed (#${consecutiveFailures}): ${e.message}`)
    // عطل «الشبكة ميتة داخل العملية»: لا يتعافى ذاتياً مهما أعدنا المحاولة داخل نفس العملية —
    // الخروج المتعمّد هنا يجعل PM2 يعيد التشغيل بعملية جديدة (مكافئ pm2 restart اليدوي).
    if (NET_DEAD_RE.test(e.message || '')) {
      netDeadFailures++
      if (netDeadFailures >= NET_DEAD_EXIT_AFTER) {
        log(`💀 ${netDeadFailures} consecutive network-dead login failures — process network stack is wedged. Exiting so PM2 restarts a fresh process.`)
        process.exit(1)
      }
    } else {
      netDeadFailures = 0
    }
    if (e.code === 'ACCOUNT_LOCKED') {
      cooldownUntil = Date.now() + 17 * 60_000
      log(`  ⏸ Cooling down for 17 min to let Muqeem unlock the account`)
    } else {
      if (e.stack) log(e.stack.split('\n').slice(0, 5).join('\n'))
      scheduleRetry()   // فشل عابر — أعد المحاولة سريعًا (ضمن الحدّ) حتى لا تطول فجوة انقطاع الجلسة
    }
  } finally {
    busy = false
  }
}

// استطلاع أمر «إعادة الاتصال» القادم من زر الواجهة — يلتقط الطلب ويطلق دخولاً فورياً
// بدل انتظار الدورة المجدولة (كل 10 دقائق). يعمل حتى أثناء إيقاف «المحاولات السريعة».
async function pollReconnectCommand() {
  try {
    const requested = await takeReconnectRequest()
    pollFailures = 0
    if (!requested) return
    log('📣 Reconnect requested from the app (زر «إعادة الاتصال»)')
    if (busy) { log('  ✓ A login run is already in progress — it covers this request'); return }
    if (Date.now() < cooldownUntil) {
      const waitMin = Math.ceil((cooldownUntil - Date.now()) / 60_000)
      log(`  ⏸ Ignored — account cooldown active (${waitMin} min remaining)`)
      return
    }
    if (Date.now() - lastForcedAt < MIN_FORCED_GAP_MS) { log('  ⏸ Ignored — a forced re-login ran moments ago'); return }
    lastForcedAt = Date.now()
    consecutiveFailures = 0                                           // الطلب اليدوي يرفع إيقاف المحاولات السريعة
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null }
    tick()
  } catch (e) {
    // فشل الاستطلاع نفسه = Supabase غير قابلة للوصول من داخل العملية. إن استمرّ ~دقيقتين
    // فالعملية عالقة في عطل الشبكة الداخلي — نخرج ليُعيدنا PM2 بعملية سليمة، فيتعافى
    // البوت وحده حتى لو لم يضغط أحد الزر.
    pollFailures++
    if (pollFailures % 4 === 1) log(`  ⚠ Reconnect-command poll failed (#${pollFailures}): ${e.message}`)
    if (pollFailures >= 8) {
      log('💀 8 consecutive Supabase poll failures (~2 min) — process network is dead. Exiting so PM2 restarts a fresh process.')
      process.exit(1)
    }
  }
}

;(async function main() {
  log(`Muqeem bot started (every ${RUN_EVERY_MS / 60_000} min, retry ${RETRY_AFTER_MS / 1000}s on failure, cmd-poll ${CMD_POLL_MS / 1000}s, headless=${HEADLESS})`)
  setInterval(pollReconnectCommand, CMD_POLL_MS)
  await tick()
  setInterval(tick, RUN_EVERY_MS)
})()
