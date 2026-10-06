// «الدخول لقوى» — sign in to Qiwa entirely in the BACKGROUND (no window, no tab,
// no visible Qiwa page or URL), then open the Qiwa portal already signed in.
// ──────────────────────────────────────────────────────────────────────────
// Earlier designs opened a Qiwa sign-in window to get first-party cookies; Chrome
// won't let such a window be hidden (off-screen bounds are rejected, minimized
// ones get restored), so the user kept seeing it. This version removes the window
// completely:
//   1. The service worker replays Qiwa's own SSO requests (session/login →
//      session/login-with-otp) with fetch — same technique the sync uses, so CORS
//      is bypassed by host_permissions and a declarativeNetRequest rule spoofs the
//      SPA's Origin/Referer so Qiwa's gateway accepts them.
//   2. Qiwa's Set-Cookie responses can't be auto-stored from the SW's cross-site
//      context (SameSite), so a webRequest listener reads the Set-Cookie headers and
//      chrome.cookies.set writes the session into the browser jar directly.
//   3. Opening auth.qiwa.sa in a normal tab then lands signed in — the only thing
//      the user ever sees.
// The password is used only for the login request and never stored.
//
// One request = one answer: otp / otp_error / done / error. No window means no
// captcha fallback — if Qiwa demands a captcha (only after repeated failures) the
// attempt returns an error asking the user to try again shortly.

const SSO_API = 'https://sso-api.qiwa.sa'
const QIWA_ENTRY = 'https://auth.qiwa.sa/'
const RULE_ID = 4720 // distinct from the sync's cookie-bridge rule (4711)
// The Ajeer OAuth client. Qiwa only allows password ("basic") login once the
// session is bound to a client that permits it — the sign-in SPA does this on load
// via GET /session then POST /session/state {client-id}. The SW must replay that
// handshake before /session/login, otherwise Qiwa answers
// "basic-login-not-allowed-for-application".
const CLIENT_ID = 'EgfgBVENmb071InNk4lV1Q'
// The sign-in URL of the Ajeer OAuth client. Qiwa's gateway reads which client the
// login belongs to from the Referer's client_id — the real SPA sends this full URL
// as Referer. Sending a bare referer makes Qiwa assume the default client, which
// rejects password login ("basic login not allowed for this application"). So the
// bridge must set Referer to exactly this URL.
const SSO_SIGN_IN = 'https://sso.qiwa.sa/sign-in?client_id=EgfgBVENmb071InNk4lV1Q&redirect_uri=https%3A%2F%2Fbab-ajeer.qiwa.sa%2Flogin-success&response_type=code&scope=openid+email+phone+profile&code_challenge=OxgTELvLJnp8Sm2apLxjZbZHomzzNfnFT_1mPtCY4ao&code_challenge_method=S256&state=1'

// Qiwa SSO config, baked (extracted from Qiwa's bundle). ENC mirrors
// VITE_APP_ENCODE_LOGIN_PASSWORD (currently "false" → plaintext). Flip to true here
// if Qiwa ever starts encrypting the login password.
const GW = SSO_API
const ENCODE_PUBLIC_KEY = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnF8Rfp4Qo+w3ZmCY11M8cLj1hQnsyPSB18Jd5FbJ4v8sF8AThMDOWmKpI38ymyMyGBK5lC8SeGb+HEQB/J7c0iU15C6Sov8hKntnQ+LFUs2983kgMOPSLv+fn4ESF9svF3USjyk1qYNGNNr+bR0d5xj1oksBHDM3iK4iMvvY4Rq/0XDHGA5jRgv6D1NZ5UonRnyuzfSQ8aHsE3cKmLt+NMaBzLUqbVWrteimJfBxYHmUD3S469TtRiCbVM5TTyKAm5I/gKOvW1J5BwZhuiYNlbLukR3y++ztiie6RVLbGZRnTt6hiQHjBSp74KsOroJNE5Nb1apeKk1lEYCwZzb3jQIDAQAB'
const ENCODE_LOGIN = false

// ── Set-Cookie capture (webRequest) ──────────────────────────────────────────
// SW fetch can't auto-store Qiwa's SameSite cookies, so we read Set-Cookie off the
// responses and write them with chrome.cookies.set. The listener must be (re)added
// per flow because the SW may sleep while the user types the OTP.
let captured = []
function onHeaders(details) {
  for (const h of details.responseHeaders || []) {
    if (h.name && h.name.toLowerCase() === 'set-cookie' && h.value) {
      for (const line of h.value.split('\n')) captured.push(line)
    }
  }
}
function startCapture() {
  captured = []
  try {
    if (!chrome.webRequest.onHeadersReceived.hasListener(onHeaders)) {
      chrome.webRequest.onHeadersReceived.addListener(onHeaders, { urls: [SSO_API + '/*'] }, ['responseHeaders', 'extraHeaders'])
    }
  } catch (e) {}
}
function stopCapture() {
  try { chrome.webRequest.onHeadersReceived.removeListener(onHeaders) } catch (e) {}
  captured = []
}

function parseSetCookie(raw) {
  const parts = String(raw).split(';')
  const nv = parts.shift() || ''
  const eq = nv.indexOf('=')
  if (eq < 0) return null
  const c = { name: nv.slice(0, eq).trim(), value: nv.slice(eq + 1).trim(), path: '/' }
  if (!c.name) return null
  for (const a of parts) {
    const i = a.indexOf('=')
    const k = (i < 0 ? a : a.slice(0, i)).trim().toLowerCase()
    const v = i < 0 ? '' : a.slice(i + 1).trim()
    if (k === 'domain') c.domain = v
    else if (k === 'path') c.path = v || '/'
    else if (k === 'secure') c.secure = true
    else if (k === 'httponly') c.httpOnly = true
    else if (k === 'samesite') c.sameSite = { lax: 'lax', strict: 'strict', none: 'no_restriction' }[v.toLowerCase()]
    else if (k === 'max-age') { const s = parseInt(v, 10); if (!isNaN(s)) c.expirationDate = Math.floor(Date.now() / 1000) + s }
    else if (k === 'expires' && !c.expirationDate) { const t = Date.parse(v); if (!isNaN(t)) c.expirationDate = Math.floor(t / 1000) }
  }
  return c
}

// Write every captured cookie into the browser jar so a normal tab to auth.qiwa.sa
// is authenticated. Writing via the API is not subject to the SameSite storing rule.
async function applyCaptured() {
  const list = captured.splice(0)
  for (const raw of list) {
    const c = parseSetCookie(raw)
    if (!c) continue
    const host = (c.domain || 'sso-api.qiwa.sa').replace(/^\./, '')
    const det = { url: 'https://' + host + (c.path || '/'), name: c.name, value: c.value, path: c.path || '/' }
    if (c.domain) det.domain = c.domain
    if (c.secure) det.secure = true
    if (c.httpOnly) det.httpOnly = true
    if (c.sameSite) { det.sameSite = c.sameSite; if (c.sameSite === 'no_restriction') det.secure = true }
    if (c.expirationDate) det.expirationDate = c.expirationDate
    try { await chrome.cookies.set(det) } catch (e) {}
  }
}

// ── declarativeNetRequest bridge: send jar cookies + spoof SPA provenance ─────
async function installBridge() {
  let cookieStr = ''
  try {
    const jar = await chrome.cookies.getAll({ domain: 'qiwa.sa' })
    cookieStr = (jar || []).map((c) => c.name + '=' + c.value).join('; ')
  } catch (e) {}
  const requestHeaders = [
    { header: 'origin', operation: 'set', value: 'https://sso.qiwa.sa' },
    { header: 'referer', operation: 'set', value: SSO_SIGN_IN },
    { header: 'sec-fetch-site', operation: 'set', value: 'same-site' },
    { header: 'sec-fetch-mode', operation: 'set', value: 'cors' },
    { header: 'sec-fetch-dest', operation: 'set', value: 'empty' },
  ]
  if (cookieStr) requestHeaders.unshift({ header: 'cookie', operation: 'set', value: cookieStr })
  try {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [RULE_ID],
      addRules: [{
        id: RULE_ID, priority: 1,
        action: { type: 'modifyHeaders', requestHeaders },
        condition: { urlFilter: '||sso-api.qiwa.sa^', tabIds: [-1] },
      }],
    })
  } catch (e) {}
}
async function removeBridge() {
  try { await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [RULE_ID] }) } catch (e) {}
}

// ── JSON:API + crypto helpers (SW context) ───────────────────────────────────
const dash = (s) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
function serialize(type, attrs) {
  const a = {}
  for (const k in attrs) { if (attrs[k] == null) continue; a[dash(k)] = attrs[k] }
  return { data: { type, attributes: a } }
}
function b64ToBuf(b) { const s = atob(b); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer }
function bufToB64(buf) { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s) }
async function encrypt(val) {
  const key = await crypto.subtle.importKey('spki', b64ToBuf(ENCODE_PUBLIC_KEY), { name: 'RSA-OAEP', hash: { name: 'SHA-1' } }, false, ['encrypt'])
  return bufToB64(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, new TextEncoder().encode(JSON.stringify(val))))
}
function errOf(r) {
  const e = (r.json && r.json.errors && r.json.errors[0]) || {}
  const d = e.details
  const m = (d && (d.ar || d.en)) || e.detail || e.title || ''
  return { code: String(e.code || ''), message: (typeof m === 'string' ? m : '').slice(0, 300) }
}
function maskedPhone(j) {
  let f = ''
  const w = (o) => {
    if (!o || typeof o !== 'object' || f) return
    for (const k in o) {
      const v = o[k]
      if (!f && /last.?phone.?digits/i.test(k) && v) { f = '+966 ** *** ** ' + v; return }
      if (!f && /email.?symbols/i.test(k) && v) { f = String(v); return }
      if (v && typeof v === 'object') w(v)
    }
  }
  w(j)
  return f
}

// Call the SSO gateway, capturing any Set-Cookie it returns into the jar so the
// next request (via the DNR bridge) carries the freshly-minted session cookie.
async function req(method, path, body) {
  await installBridge()
  const headers = { Accept: 'application/json, text/plain, */*', 'Cache-Control': 'no-cache' }
  if (body) headers['Content-Type'] = 'application/json'
  let r
  try {
    r = await fetch(GW + '/' + path, { method, credentials: 'include', headers, body: body ? JSON.stringify(body) : undefined })
  } catch (e) { return { net: true, error: String((e && e.message) || e) } }
  await applyCaptured()
  let tx = ''
  try { tx = await r.text() } catch (e) {}
  let j = null
  try { j = tx ? JSON.parse(tx) : null } catch (e) {}
  return { ok: r.ok, status: r.status, json: j }
}

// Replay the SPA's on-load handshake: create a session, then bind it to the Ajeer
// client so password login is permitted. Errors are non-fatal — the login call
// will surface the real problem if this didn't take.
async function primeSession() {
  await req('GET', 'session', null)
  await req('POST', 'session/state', serialize('state', { clientId: CLIENT_ID }))
}

// ── Flow ─────────────────────────────────────────────────────────────────────
async function start(p) {
  const login = p && typeof p.userId === 'string' ? p.userId.trim() : ''
  const raw = p && typeof p.password === 'string' ? p.password : ''
  if (!login || login.length > 120 || !raw || raw.length > 200) return { state: 'error', code: 'bad_input' }
  startCapture()
  let password
  try { password = ENCODE_LOGIN ? await encrypt(raw) : raw } catch (e) { stopCapture(); return { state: 'error', code: 'encode_failed' } }
  await primeSession()
  const r = await req('POST', 'session/login', serialize('account', { login, password }))
  if (r.net) { stopCapture(); return { state: 'error', code: 'network', message: r.error } }
  if (r.ok) return { state: 'otp', sentTo: maskedPhone(r.json), length: 4 } // keep capturing for the OTP step
  stopCapture()
  const e = errOf(r)
  if (/recaptcha/i.test(e.code)) return { state: 'error', code: 'captcha' }
  if (/multiple.?session/i.test(e.code)) return { state: 'error', code: 'multiple_session', message: e.message }
  if (/lock/i.test(e.code)) return { state: 'error', code: 'locked', message: e.message }
  return { state: 'error', code: 'login', message: e.message }
}

async function submitOtp(p) {
  const code = p && typeof p.code === 'string' ? p.code.trim() : ''
  if (!/^\d{4,8}$/.test(code)) return { state: 'otp_error', code: 'bad_input' }
  startCapture() // SW may have slept while the user typed; re-arm (jar holds the pre-auth cookie)
  const r = await req('POST', 'session/login-with-otp', serialize('otp', { otp: code }))
  if (r.net) return { state: 'otp_error', code: 'network', message: r.error }
  if (r.ok) { stopCapture(); await removeBridge(); return { state: 'done' } }
  const e = errOf(r)
  if (/many.?attempt|attempts/i.test(e.code)) return { state: 'otp_error', code: 'too_many', message: e.message }
  if (/expire/i.test(e.code)) return { state: 'otp_error', code: 'expired', message: e.message }
  return { state: 'otp_error', code: 'refused', message: e.message }
}

async function resend() {
  startCapture()
  const r = await req('POST', 'one-time-passwords/resend-on-login', null)
  if (r.net) return { state: 'otp_error', code: 'network', message: r.error }
  if (r.ok) return { state: 'otp', resent: true }
  return { state: 'otp_error', code: 'resend', message: errOf(r).message }
}

// Open the Qiwa portal (signed in) in a normal, visible tab — the only UI shown.
async function openQiwa() {
  await removeBridge()
  stopCapture()
  let target = null
  try {
    const wins = await chrome.windows.getAll({ windowTypes: ['normal'] })
    target = wins.find((w) => w.focused) || wins[0] || null
  } catch (e) {}
  try {
    if (target) {
      const t = await chrome.tabs.create({ windowId: target.id, url: QIWA_ENTRY, active: true })
      await chrome.windows.update(t.windowId, { focused: true })
    } else {
      await chrome.windows.create({ url: QIWA_ENTRY, focused: true })
    }
  } catch (e) {
    try { await chrome.tabs.create({ url: QIWA_ENTRY, active: true }) } catch (e2) {}
  }
  return { state: 'opened' }
}

async function cancel() {
  await removeBridge()
  stopCapture()
  return { state: 'cancelled' }
}

const HANDLERS = {
  'qiwa-login:ping': async () => ({ state: 'ready', version: chrome.runtime.getManifest().version }),
  'qiwa-login:start': start,
  'qiwa-login:otp': submitOtp,
  'qiwa-login:resend': resend,
  'qiwa-login:open': openQiwa,
  'qiwa-login:cancel': cancel,
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
  // The login waits on Qiwa for up to a minute; keep the idle SW alive meanwhile.
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
