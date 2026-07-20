// Qiwa sync — MV3 background service worker.
// ──────────────────────────────────────────
// host_permissions for *.qiwa.sa let this worker fetch EVERY Qiwa subdomain in
// one run (no per-origin CORS wall), and credentials:'include' sends the live
// Nafath session cookies. So a single click sweeps all establishments and fills
// employees + visas + establishment files together — the thing a bookmarklet
// (locked to one origin) and an edge function (no HttpOnly cookie) both can't do.
// Attribute the sync to an active sync-person BEFORE importing the sweep, because
// the generated sweep reads self.__QIWA_PERSON_ID when it builds the sync_runs row
// (RLS `sync_runs_anon_write` requires is_active_sync_person(person_id)). Override
// per-install via chrome.storage.local key `qiwaPersonId`.
const DEFAULT_QIWA_PERSON_ID = 'dbbcf9c1-d269-4f72-b9f9-3690d8072ca2'
self.__QIWA_PERSON_ID = DEFAULT_QIWA_PERSON_ID

import './sweep.generated.js' // defines self.__runQiwaSweep

let running = false

// Pick up a configured person id (if any) — static import above already ran with
// the default, so we refresh the global before each sweep starts.
async function loadPersonId() {
  try {
    const { qiwaPersonId } = await chrome.storage.local.get('qiwaPersonId')
    if (qiwaPersonId) self.__QIWA_PERSON_ID = qiwaPersonId
  } catch (e) {}
}

// ── Session-cookie bridge ─────────────────────────────────────────────
// Qiwa's session cookie is SameSite=Lax/Strict, so the browser refuses to
// attach it to a fetch initiated from the extension's (cross-site) origin — the
// SW requests arrive unauthenticated. `Cookie` is also a forbidden fetch header,
// so we can't set it manually. The fix: read the cookies via chrome.cookies
// (which exposes HttpOnly + SameSite cookies), then a declarativeNetRequest rule
// injects them into the Cookie header. The rule is scoped to tabId -1 (requests
// with no tab = our SW fetches only), so the user's own Qiwa tabs are untouched.
const QIWA_COOKIE_RULE_ID = 4711

async function installCookieBridge() {
  const jar = await chrome.cookies.getAll({ domain: 'qiwa.sa' })
  if (!jar || !jar.length) return { ok: false, count: 0 }
  const cookieStr = jar.map((c) => `${c.name}=${c.value}`).join('; ')
  const names = jar.map((c) => c.name)
  const hasAuth = names.some((n) => /authoriz|token|session|jwt/i.test(n))
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [QIWA_COOKIE_RULE_ID],
    addRules: [{
      id: QIWA_COOKIE_RULE_ID,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        // Qiwa's gateway (WAF) 503-blocks requests that don't look like they came
        // from the Qiwa SPA. Spoof the SPA's provenance headers so the request is
        // accepted; host_permissions already lets us read the response regardless
        // of the Origin's CORS verdict.
        requestHeaders: [
          { header: 'cookie', operation: 'set', value: cookieStr },
          { header: 'origin', operation: 'set', value: 'https://dashboard.qiwa.sa' },
          { header: 'referer', operation: 'set', value: 'https://dashboard.qiwa.sa/' },
          { header: 'sec-fetch-site', operation: 'set', value: 'same-site' },
          { header: 'sec-fetch-mode', operation: 'set', value: 'cors' },
          { header: 'sec-fetch-dest', operation: 'set', value: 'empty' },
        ],
      },
      condition: {
        // No resourceTypes filter → match every request type the SW may emit.
        urlFilter: '||qiwa.sa^',
        tabIds: [-1], // only extension/SW-initiated requests, never the user's tabs
      },
    }],
  })
  return { ok: true, count: jar.length, hasAuth }
}

async function removeCookieBridge() {
  try {
    await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [QIWA_COOKIE_RULE_ID] })
  } catch (e) {}
}

// Quick auth probe: confirms the browser is actually signed in to Qiwa before we
// kick off a long sweep, so a logged-out run fails loudly instead of writing empties.
async function authProbe() {
  try {
    const r = await fetch('https://api.qiwa.sa/context/company', {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
    let bodyStart = ''
    try { bodyStart = (await r.text()).slice(0, 90) } catch (e) {}
    return { ok: r.ok, status: r.status, bodyStart }
  } catch (e) {
    // A thrown error here means the request never reached Qiwa authenticated.
    return { ok: false, status: 0, error: String(e && e.message || e) }
  }
}

function progress(text) {
  try { chrome.runtime.sendMessage({ type: 'qiwa-progress', text }) } catch (e) {}
}

chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
  if (!req || req.type !== 'qiwa-start') return
  if (running) { sendResponse({ ok: false, error: 'المزامنة تعمل بالفعل' }); return }
  running = true
  ;(async () => {
    let ok = false
    try {
      await loadPersonId()
      progress('جسر قوى: تجهيز جلسة قوى…')
      const bridge = await installCookieBridge()
      if (!bridge.ok) {
        progress('❌ لم أجد كوكيز قوى — افتح بوابة قوى وسجّل الدخول عبر نفاذ ثم أعد المحاولة.')
        return
      }
      progress(`🔎 كوكيز: ${bridge.count} · كوكي جلسة: ${bridge.hasAuth ? 'موجود' : 'غير موجود'}`)
      progress('جسر قوى: التحقق من جلسة قوى…')
      const probe = await authProbe()
      if (!probe.ok) {
        progress(`🔎 حالة /context/company: ${probe.status}${probe.error ? ' · ' + probe.error : ''}${probe.bodyStart ? ' · ' + probe.bodyStart : ''}`)
        progress('❌ لم تصل جلسة قوى — تأكد أنك مسجّل الدخول في قوى ثم أعد المحاولة.')
        return
      }
      await self.__runQiwaSweep()
      ok = true
    } catch (e) {
      progress('❌ ' + (e && e.message ? e.message : String(e)))
    } finally {
      await removeCookieBridge()
      running = false
      chrome.runtime.sendMessage({ type: 'qiwa-done', ok })
    }
  })()
  sendResponse({ ok: true })
  return true // keep the message channel open for the async sendResponse
})
