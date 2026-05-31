// GOSI sync bookmarklet — INLINED.
//
// Previously this was a tiny loader that fetched /gosi-bm.js from the
// Jisr origin at click-time. That broke when the bookmarklet was built
// on http://localhost:5173 (dev) and then clicked on the HTTPS GOSI portal
// (ameen.gosi.gov.sa) — browsers block HTTP scripts loaded into HTTPS
// pages (mixed-content), so the script never loaded and the user got
// "فشل تحميل سكربت جسر من http://localhost:5173".
//
// Fix: inline the full body of public/gosi-bm.js into the bookmarklet
// at build time using Vite's `?raw` import, exactly like the SBC / Qiwa
// / Muqeem bookmarklets do. The bookmarklet is now self-contained and
// works from any origin against any HTTPS portal.
//
// Trade-off: every time we update public/gosi-bm.js the user must re-drag
// the bookmarklet to pick up the new code (matching SBC/Qiwa/Muqeem
// behaviour). The on-screen toast prints the version so a stale build
// is visible at a glance.
//
// PERSON is injected via `window._jr_person_id` (set by the prefix below
// before the script body runs) — this matches the contract gosi-bm.js
// already expects, so the file itself didn't need any edits.

import gosiBmSource from '../../public/gosi-bm.js?raw'

function loaderBody({ personId }) {
  const p = JSON.stringify(personId || '')
  // `window._jr_person_id` must be set BEFORE gosi-bm.js's IIFE runs,
  // because the IIFE reads it on its first line.
  return `window._jr_person_id=${p};${gosiBmSource}`
}

export function buildGosiBookmarklet({ personId, origin: _ignoredOrigin }) {
  // `origin` is kept in the signature for backwards-compat with the
  // call-site in SbcFacilities.jsx, but is no longer used — the script
  // is fully inlined so the originating Jisr URL doesn't matter.
  return 'javascript:' + encodeURIComponent(loaderBody({ personId }))
}
