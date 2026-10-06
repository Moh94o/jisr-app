// Jisr page ⇄ extension bridge (content script, runs only on Jisr's own origins).
// ──────────────────────────────────────────────────────────────────────────
// The «الدخول لقوى» tab in Jisr cannot talk to an extension directly, so it posts
// `{source:'jisr-app', type:'qiwa-login:…'}` on its own window and this script
// relays it to the service worker, then posts the answer back. Only the
// `qiwa-login:` family is relayed — nothing else on the page can reach the worker.
const PAGE = 'jisr-app'
const EXT = 'jisr-qiwa-ext'

function reply(id, body) {
  window.postMessage({ source: EXT, replyTo: id, ...body }, location.origin)
}

window.addEventListener('message', (e) => {
  if (e.source !== window || e.origin !== location.origin) return
  const d = e.data
  if (!d || d.source !== PAGE || typeof d.type !== 'string' || !d.type.startsWith('qiwa-login:')) return
  try {
    chrome.runtime.sendMessage({ type: d.type, payload: d.payload || null }, (resp) => {
      const err = chrome.runtime.lastError
      if (err) reply(d.id, { ok: false, error: err.message })
      else reply(d.id, { ok: true, data: resp })
    })
  } catch (err) {
    // The extension was reloaded while this tab stayed open — the page must refresh.
    reply(d.id, { ok: false, error: 'stale', stale: true })
  }
})
