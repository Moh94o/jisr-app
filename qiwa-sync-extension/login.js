// «الدخول لقوى» — sign in to Qiwa from inside Jisr, by replaying Qiwa's OWN
// sign-in requests (not by typing into its form).
// ──────────────────────────────────────────────────────────────────────────
// Jisr's page collects the ID + password, then the 4-digit SMS code, and sends
// them here through bridge.js. This worker opens a background tab on Qiwa's own
// origin (sso.qiwa.sa) purely so the requests run first-party — with the right
// Origin/Referer, CORS and cookie handling that only a qiwa.sa document gets —
// then injects a MAIN-world function that calls Qiwa's SSO API exactly as the
// SPA does:
//   POST sso-api.qiwa.sa/session/login            (JSON:API {data:{type:account}})
//   POST sso-api.qiwa.sa/session/login-with-otp   ({type:otp})
//   POST sso-api.qiwa.sa/one-time-passwords/resend-on-login
// Login/OTP endpoints, the JSON:API body shape, the RSA-OAEP(SHA-1) password
// encoding and the encode flag are all read live from the page's own
// `window._config`, so this never drifts from Qiwa's front-end. The session
// cookies land in the browser natively; once OTP succeeds we point the SAME tab
// at auth.qiwa.sa (a fresh OAuth round that consumes the session) and reveal it.
//
// Nothing is stored: the password lives only for the duration of the login call.
// One request = one answer (no push events):
//   otp        → Qiwa accepted the password and sent an SMS code ({sentTo,length})
//   otp_error  → the code (or resend) was refused; the OTP step stays open
//   done       → signed in; the tab is kept for `qiwa-login:open` to reveal on Qiwa
//   error      → Qiwa refused the login ({code,message}); the tab is closed
//   manual     → Qiwa needs a person (captcha…) — the tab is brought forward

const SSO_SIGN_IN = 'https://sso.qiwa.sa/sign-in?client_id=EgfgBVENmb071InNk4lV1Q&redirect_uri=https%3A%2F%2Fbab-ajeer.qiwa.sa%2Flogin-success&response_type=code&scope=openid+email+phone+profile&code_challenge=OxgTELvLJnp8Sm2apLxjZbZHomzzNfnFT_1mPtCY4ao&code_challenge_method=S256&state=1'
// The portal starts its own OAuth round (fresh state + PKCE) and lands signed in.
const QIWA_ENTRY = 'https://auth.qiwa.sa/'
const SSO_HOST = 'sso.qiwa.sa'
const TAB_KEY = 'qiwaLoginTabId'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getTabId() {
  const o = await chrome.storage.session.get(TAB_KEY)
  return o[TAB_KEY] == null ? null : o[TAB_KEY]
}
async function setTabId(id) {
  if (id == null) await chrome.storage.session.remove(TAB_KEY)
  else await chrome.storage.session.set({ [TAB_KEY]: id })
}
async function getTab(id) {
  if (id == null) return null
  try { return await chrome.tabs.get(id) } catch (e) { return null }
}
async function closeLoginTab() {
  const id = await getTabId()
  if (id != null) { try { await chrome.tabs.remove(id) } catch (e) {} }
  await setTabId(null)
}
async function reveal(tabId) {
  try {
    const t = await chrome.tabs.update(tabId, { active: true })
    await chrome.windows.update(t.windowId, { focused: true })
  } catch (e) {}
}

function onSso(tab) {
  try { return new URL((tab && (tab.url || tab.pendingUrl)) || '').hostname === SSO_HOST }
  catch (e) { return false }
}

async function waitLoaded(tabId, ms = 30000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    const tab = await getTab(tabId)
    if (!tab) return null
    if (tab.status === 'complete' && /^https?:/.test(tab.url || '')) return tab
    await sleep(300)
  }
  return null
}

// Run a MAIN-world function in the login tab. MAIN world is required so the code
// sees the page's own `window._config` and performs the fetch truly as the page
// (first-party cookies, correct Origin). Returns null if the tab navigated away.
async function runMain(tabId, func, args) {
  try {
    const [r] = await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func, args: args || [] })
    return (r && r.result) || null
  } catch (e) {
    return null
  }
}

// Wait until the page's config (gateway URL + encode flag) is present.
async function waitConfig(tabId, ms = 15000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    const ok = await runMain(tabId, () => !!(window._config && window._config.VITE_APP_GATEWAY_API))
    if (ok) return true
    await sleep(300)
  }
  return false
}

// ── Runs INSIDE Qiwa's page, MAIN world (self-contained; no outer refs) ──────
// Replays the SSO API call for `action`. Endpoints/body/encoding mirror Qiwa's
// own SPA, read from window._config.
async function qiwaApi(action, args) {
  const cfg = window._config || {}
  const GW = String(cfg.VITE_APP_GATEWAY_API || 'https://sso-api.qiwa.sa').replace(/\/+$/, '')
  const PUB = cfg.VITE_APP_ENCODE_PUBLIC_KEY || ''
  const ENC_LOGIN = cfg.VITE_APP_ENCODE_LOGIN_PASSWORD === 'true'
  const lang = (document.documentElement.lang || 'ar').slice(0, 2)

  // JSON:API body: {data:{type, attributes}} with dash-cased keys (jsonapi-serializer default).
  const dash = (s) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
  const serialize = (type, attrs) => {
    const a = {}
    for (const k in attrs) { if (attrs[k] === undefined || attrs[k] === null) continue; a[dash(k)] = attrs[k] }
    return { data: { type, attributes: a } }
  }
  const b64ToBuf = (b) => { const s = atob(b); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer }
  const bufToB64 = (buf) => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s) }
  const encrypt = async (val) => {
    const key = await crypto.subtle.importKey('spki', b64ToBuf(PUB), { name: 'RSA-OAEP', hash: { name: 'SHA-1' } }, false, ['encrypt'])
    const data = new TextEncoder().encode(JSON.stringify(val))
    return bufToB64(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, data))
  }
  const req = async (path, body) => {
    let res
    try {
      res = await fetch(GW + '/' + path, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/plain, */*', 'Cache-Control': 'no-cache' },
        body: body ? JSON.stringify(body) : undefined,
      })
    } catch (e) { return { net: true, error: String((e && e.message) || e) } }
    let text = ''
    try { text = await res.text() } catch (e) {}
    let json = null
    try { json = text ? JSON.parse(text) : null } catch (e) {}
    return { ok: res.ok, status: res.status, json }
  }
  const errOf = (r) => {
    const e = (r.json && r.json.errors && r.json.errors[0]) || {}
    const d = e.details
    const msg = (d && (d[lang] || d.ar || d.en)) || e.detail || e.title || ''
    return { code: String(e.code || ''), status: e.status || r.status, message: (typeof msg === 'string' ? msg : '').slice(0, 300) }
  }
  // The login response carries the masked phone the code was sent to.
  const maskedPhone = (j) => {
    let found = ''
    const walk = (o) => {
      if (!o || typeof o !== 'object' || found) return
      for (const k in o) {
        const v = o[k]
        if (!found && /last.?phone.?digits/i.test(k) && v) { found = '+966 ** *** ** ' + v; return }
        if (!found && /email.?symbols/i.test(k) && v) { found = String(v); return }
        if (v && typeof v === 'object') walk(v)
      }
    }
    walk(j)
    return found
  }

  if (action === 'login') {
    const login = String((args && args.userId) || '').trim()
    const raw = String((args && args.password) || '')
    if (!login || !raw) return { state: 'error', code: 'bad_input' }
    let password
    try { password = ENC_LOGIN ? await encrypt(raw) : raw } catch (e) { return { state: 'error', code: 'encode_failed' } }
    const r = await req('session/login', serialize('account', { login, password }))
    if (r.net) return { state: 'error', code: 'network', message: r.error }
    if (r.ok) return { state: 'otp', sentTo: maskedPhone(r.json), length: 4 }
    const e = errOf(r)
    if (/recaptcha/i.test(e.code)) return { state: 'captcha' }
    if (/multiple.?session/i.test(e.code)) return { state: 'error', code: 'multiple_session', message: e.message }
    if (/lock/i.test(e.code)) return { state: 'error', code: 'locked', message: e.message }
    return { state: 'error', code: 'login', message: e.message }
  }

  if (action === 'otp') {
    const otp = String((args && args.code) || '')
    const r = await req('session/login-with-otp', serialize('otp', { otp }))
    if (r.net) return { state: 'otp_error', code: 'network', message: r.error }
    if (r.ok) return { state: 'done' }
    const e = errOf(r)
    if (/many.?attempt|attempts/i.test(e.code)) return { state: 'otp_error', code: 'too_many', message: e.message }
    if (/expire/i.test(e.code)) return { state: 'otp_error', code: 'expired', message: e.message }
    return { state: 'otp_error', code: 'refused', message: e.message }
  }

  if (action === 'resend') {
    const r = await req('one-time-passwords/resend-on-login', null)
    if (r.net) return { state: 'otp_error', code: 'network', message: r.error }
    if (r.ok) return { state: 'otp', resent: true }
    return { state: 'otp_error', code: 'resend', message: errOf(r).message }
  }

  return { state: 'error', code: 'bad_action' }
}

// Open (or reopen) the background login tab on the SSO origin, ready for API calls.
async function openLoginTab() {
  await closeLoginTab()
  const tab = await chrome.tabs.create({ url: SSO_SIGN_IN, active: false })
  await setTabId(tab.id)
  const loaded = await waitLoaded(tab.id)
  if (!loaded) { await closeLoginTab(); return { error: 'load_timeout' } }
  if (!onSso(loaded)) { await closeLoginTab(); return { error: 'redirected' } }
  if (!(await waitConfig(tab.id))) { await closeLoginTab(); return { error: 'no_config' } }
  return { tabId: tab.id }
}

async function start(p) {
  const userId = p && typeof p.userId === 'string' ? p.userId.trim() : ''
  const password = p && typeof p.password === 'string' ? p.password : ''
  if (!userId || userId.length > 120 || !password || password.length > 200) return { state: 'error', code: 'bad_input' }
  const open = await openLoginTab()
  if (open.error) return { state: 'error', code: open.error }
  const r = await runMain(open.tabId, qiwaApi, ['login', { userId, password }])
  if (!r) { await closeLoginTab(); return { state: 'error', code: 'injection_failed' } }
  if (r.state === 'captcha') { await reveal(open.tabId); return { state: 'manual', code: 'captcha' } }
  if (r.state === 'error') { await closeLoginTab(); return r }
  return r // otp
}

async function submitOtp(p) {
  const code = p && typeof p.code === 'string' ? p.code.trim() : ''
  if (!/^\d{4,8}$/.test(code)) return { state: 'otp_error', code: 'bad_input' }
  const tabId = await getTabId()
  if (!(await getTab(tabId))) { await setTabId(null); return { state: 'error', code: 'tab_closed' } }
  const r = await runMain(tabId, qiwaApi, ['otp', { code }])
  if (!r) return { state: 'error', code: 'tab_closed' }
  // Keep the tab on success — `qiwa-login:open` turns it into the Qiwa portal.
  return r
}

async function resend() {
  const tabId = await getTabId()
  if (!(await getTab(tabId))) { await setTabId(null); return { state: 'error', code: 'tab_closed' } }
  const r = await runMain(tabId, qiwaApi, ['resend', {}])
  return r || { state: 'error', code: 'tab_closed' }
}

// Hand the (now signed-in) tab to the user on the Qiwa portal.
async function openQiwa() {
  const id = await getTabId()
  const tab = await getTab(id)
  const t = tab
    ? await chrome.tabs.update(id, { url: QIWA_ENTRY, active: true })
    : await chrome.tabs.create({ url: QIWA_ENTRY, active: true })
  try { await chrome.windows.update(t.windowId, { focused: true }) } catch (e) {}
  await setTabId(null)
  return { state: 'opened' }
}

const HANDLERS = {
  'qiwa-login:ping': async () => ({ state: 'ready', version: chrome.runtime.getManifest().version }),
  'qiwa-login:start': start,
  'qiwa-login:otp': submitOtp,
  'qiwa-login:resend': resend,
  'qiwa-login:open': openQiwa,
  'qiwa-login:cancel': async () => { await closeLoginTab(); return { state: 'cancelled' } },
}

let active = false

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  const fn = req && typeof req.type === 'string' ? HANDLERS[req.type] : null
  if (!fn) return
  // Only our own bridge (a content script in a Jisr tab) may drive a login.
  if (sender.id !== chrome.runtime.id || !sender.tab) return
  const light = req.type === 'qiwa-login:ping' || req.type === 'qiwa-login:cancel'
  if (!light && active) { sendResponse({ state: 'error', code: 'busy' }); return }
  if (!light) active = true
  // A login waits on Qiwa for up to a minute; an idle MV3 worker is killed after
  // 30s, which would drop the answer — a cheap API call keeps it awake meanwhile.
  const keepAlive = setInterval(() => { try { chrome.runtime.getPlatformInfo(() => {}) } catch (e) {} }, 20000)
  ;(async () => {
    let out
    try { out = await fn(req.payload) } catch (e) { out = { state: 'error', code: 'exception', message: String((e && e.message) || e) } }
    clearInterval(keepAlive)
    if (!light) active = false
    try { sendResponse(out) } catch (e) {}
  })()
  return true
})
