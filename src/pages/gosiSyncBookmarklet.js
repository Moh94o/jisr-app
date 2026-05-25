// GOSI sync bookmarklet — TINY LOADER (~500 chars).
//
// The real logic lives in public/gosi-bm.js, which Vite serves as a static
// asset. The loader saved in the user's bookmarks just:
//   1) Stashes the syncPersonId on window so the loaded script can read it.
//   2) Injects <script src="<jisr-origin>/gosi-bm.js?_=now"> with cache-bust.
// This means after the user drags this loader ONCE, every future update to
// gosi-bm.js takes effect on the next click — no re-saving needed.
//
// The origin is baked into the loader at render time (window.location.origin
// when the SbcFacilities page is rendered), so the bookmarklet is "tied" to
// whichever Jisr instance produced it (localhost in dev, Netlify in prod).

function loaderBody({ personId, origin }) {
  // The origin and personId are interpolated as JSON-escaped string literals
  // to defend against any quote/backslash weirdness in either value.
  const o = JSON.stringify(origin)
  const p = JSON.stringify(personId || '')
  return `(function(){window._jr_person_id=${p};var s=document.createElement('script');s.src=${o}+'/gosi-bm.js?_='+Date.now();s.onerror=function(){alert('فشل تحميل سكربت جسر من '+${o});};document.head.appendChild(s);})();`
}

export function buildGosiBookmarklet({ personId, origin }) {
  // Fall back to a sensible default origin if the caller didn't pass one —
  // this only happens in tests/SSR, never in the real UI flow.
  const safeOrigin = origin || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173')
  return 'javascript:' + encodeURIComponent(loaderBody({ personId, origin: safeOrigin }))
}
