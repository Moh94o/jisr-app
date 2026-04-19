// Jisr Muqeem Sync — captures the user's Muqeem JWT + cookies and pushes them
// to Jisr's Supabase. Also drives periodic auto-login so the session never lapses.

const SUPABASE_URL = 'https://gcvshzutdslmdkwqwteh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdnNoenV0ZHNsbWRrd3F3dGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTkwNjgsImV4cCI6MjA5MDQ3NTA2OH0.5R0I5VvB7lp3wpSrtay3DMcXKsT9l1uK0Ukd1F4_ImM'
const LOGIN_URL = 'https://muqeem.sa/#/login'

let lastSyncedJwt = null
let lastSyncTs = 0
let activeLoginTabId = null

function decodeJwt(jwt) {
  try {
    const part = jwt.split('.')[1]
    const padded = part + '='.repeat((4 - part.length % 4) % 4)
    const json = JSON.parse(atob(padded.replace(/-/g, '+').replace(/_/g, '/')))
    return { exp: json.exp || null, moiNumber: json.moiNumber || json.sub || null }
  } catch { return { exp: null, moiNumber: null } }
}

async function buildSessionFromHeaders(headers) {
  const auth = headers.find(h => h.name.toLowerCase() === 'authorization')
  if (!auth || !/^Bearer\s+/i.test(auth.value)) return null
  const jwt = auth.value.replace(/^Bearer\s+/i, '')
  const { exp, moiNumber } = decodeJwt(jwt)
  if (!exp || exp <= Math.floor(Date.now() / 1000)) return null
  const xsrf = headers.find(h => h.name.toLowerCase() === 'x-xsrf-token')
  const xDomain = headers.find(h => h.name.toLowerCase() === 'x-domain')
  const cookies = await chrome.cookies.getAll({ domain: 'muqeem.sa' })
  return {
    auth_bearer: jwt,
    xsrf_token: xsrf?.value || null,
    x_domain: xDomain?.value || null,
    cookies: cookies.map(c => `${c.name}=${c.value}`).join('; '),
    jwt_exp: exp,
    moi_number: moiNumber,
  }
}

async function syncSessionToJisr(session) {
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
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
}

async function setBadge(state) {
  if (state === 'ok')      { await chrome.action.setBadgeText({ text: '✓' }); await chrome.action.setBadgeBackgroundColor({ color: '#27a046' }) }
  else if (state === 'err'){ await chrome.action.setBadgeText({ text: '!' }); await chrome.action.setBadgeBackgroundColor({ color: '#c0392b' }) }
  else if (state === 'busy'){ await chrome.action.setBadgeText({ text: '•' }); await chrome.action.setBadgeBackgroundColor({ color: '#3483b4' }) }
  else                     { await chrome.action.setBadgeText({ text: '' }) }
}

async function handleHeaders(headers) {
  const session = await buildSessionFromHeaders(headers)
  if (!session) return
  if (session.auth_bearer === lastSyncedJwt && Date.now() - lastSyncTs < 30_000) return
  try {
    await syncSessionToJisr(session)
    lastSyncedJwt = session.auth_bearer
    lastSyncTs = Date.now()
    await chrome.storage.local.set({
      lastSync: Date.now(),
      sessionExp: session.jwt_exp,
      moiNumber: session.moi_number,
      lastError: null,
    })
    await setBadge('ok')
    // If we opened a login tab, close it now — capture is complete
    if (activeLoginTabId !== null) {
      try { await chrome.tabs.remove(activeLoginTabId) } catch {}
      activeLoginTabId = null
    }
  } catch (e) {
    await chrome.storage.local.set({ lastError: e.message || String(e) })
    await setBadge('err')
  }
}

chrome.webRequest.onSendHeaders.addListener(
  (details) => { if (details.requestHeaders) handleHeaders(details.requestHeaders) },
  { urls: ['https://muqeem.sa/api/*'] },
  ['requestHeaders', 'extraHeaders'],
)

// ─── Auto-login orchestration ─────────────────────────────────
async function triggerLogin() {
  const c = await chrome.storage.local.get(['username', 'password'])
  if (!c.username || !c.password) {
    await chrome.storage.local.set({ lastError: 'الدخول التلقائي مفعّل لكن لا يوجد اسم مستخدم / كلمة مرور' })
    await setBadge('err')
    return
  }
  // Don't open multiple tabs
  if (activeLoginTabId !== null) {
    try { await chrome.tabs.get(activeLoginTabId) } catch { activeLoginTabId = null }
    if (activeLoginTabId !== null) return
  }
  await setBadge('busy')
  const tab = await chrome.tabs.create({ url: LOGIN_URL, active: false })
  activeLoginTabId = tab.id
  // Safety: kill the tab after 3 minutes if it never captured
  setTimeout(async () => {
    if (activeLoginTabId === tab.id) {
      try { await chrome.tabs.remove(activeLoginTabId) } catch {}
      activeLoginTabId = null
      await setBadge('err')
      await chrome.storage.local.set({ lastError: 'Auto-login timed out (3 min)' })
    }
  }, 180_000)
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'TRIGGER_LOGIN') triggerLogin().finally(() => sendResponse({ ok: true }))
  return true
})

chrome.alarms.create('jisr-tick', { periodInMinutes: 1 })
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'jisr-tick') return
  const c = await chrome.storage.local.get(['autoLogin', 'sessionExp'])
  const now = Math.floor(Date.now() / 1000)
  // Refresh badge for expiry visibility
  if (c.sessionExp && c.sessionExp <= now) await setBadge('err')
  // Trigger login if auto enabled and session expires within 10 min (or already gone)
  if (c.autoLogin) {
    const expiresIn = (c.sessionExp || 0) - now
    if (expiresIn < 10 * 60) await triggerLogin()
  }
})

chrome.runtime.onInstalled.addListener(() => setBadge(''))
