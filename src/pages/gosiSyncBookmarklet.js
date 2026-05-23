// GOSI sync bookmarklet — step 1: per-establishment main info.
//
// Flow:
//   1) Captures the bearer + x-apikey from any outbound fetch to api.gosi.gov.sa
//      that ameen.gosi.gov.sa fires while the user navigates the portal.
//   2) Decodes the bearer JWT and reads gosiscp[].e — the list of GOSI
//      establishment registration numbers the logged-in user can access.
//   3) For each regNo calls GET /v1/establishment/{regNo} and stores the
//      response in public.gosi_establishments (raw_main JSONB + extracted
//      registration_no / cr_number for joins to sbc_facilities).
//
// Additional endpoints will be added as the user shares them.

const SUPABASE_URL = 'https://gcvshzutdslmdkwqwteh.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdnNoenV0ZHNsbWRrd3F3dGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTkwNjgsImV4cCI6MjA5MDQ3NTA2OH0.5R0I5VvB7lp3wpSrtay3DMcXKsT9l1uK0Ukd1F4_ImM'

function body({ personId }) {
  return `
(async () => {
  const U='${SUPABASE_URL}', K='${SUPABASE_ANON}';
  const API='https://api.gosi.gov.sa';
  const PERSON='${personId}';

  const msg = (m) => {
    let d = document.getElementById('_jisr_gosi_ui');
    if (!d) {
      d = document.createElement('div');
      d.id = '_jisr_gosi_ui';
      d.style.cssText = 'position:fixed;top:16px;left:16px;background:#111;color:#22c55e;padding:12px 18px;border-radius:10px;z-index:2147483647;font:700 13px/1.5 sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.5);max-width:380px;direction:rtl;text-align:right;border:1px solid rgba(34,197,94,.4)';
      document.body.appendChild(d);
    }
    d.textContent = 'جسر · تأمينات: ' + m;
    return d;
  };

  const supaFetch = (path, opts) => fetch(U + path, {
    ...(opts || {}),
    headers: { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json', ...((opts && opts.headers) || {}) },
  });

  // Capture Authorization + X-Apikey by intercepting fetch. ameen.gosi.gov.sa
  // hits api.gosi.gov.sa for every screen, so by the time the user clicks the
  // bookmarklet there is usually at least one outbound call we can copy from.
  let captured = null;
  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    try {
      const u = typeof input === 'string' ? input : (input && input.url);
      if (u && u.indexOf('api.gosi.gov.sa') !== -1) {
        const src = (init && init.headers) || (input instanceof Request ? input.headers : null);
        const h = {};
        if (src instanceof Headers) src.forEach((v, k) => { h[k.toLowerCase()] = v; });
        else if (src && typeof src === 'object') for (const k of Object.keys(src)) h[k.toLowerCase()] = src[k];
        const auth = h['authorization'];
        const ak = h['x-apikey'];
        if (auth) captured = { auth, apikey: ak || (captured && captured.apikey) || null };
      }
    } catch (_) {}
    return origFetch.apply(this, arguments);
  };

  try {
    if (!location.hostname.endsWith('gosi.gov.sa'))
      return msg('افتح بوابة التأمينات أولاً (ameen.gosi.gov.sa)');

    msg('جارٍ التقاط الجلسة...');
    // Nudge the portal to fire a fresh API call so we can grab the headers.
    try {
      history.pushState({}, '', location.pathname + '?_jr=' + Date.now());
      dispatchEvent(new PopStateEvent('popstate'));
    } catch (_) {}
    for (let i = 0; i < 40 && !captured; i++) await new Promise(r => setTimeout(r, 200));
    if (!captured || !captured.auth) return msg('تعذّر التقاط التوكن. تنقّل بين الصفحات ثم اضغط مرة أخرى.');

    // Decode JWT payload (middle segment, base64url) and pull gosiscp[].e.
    const parts = captured.auth.replace(/^Bearer\\s+/i, '').split('.');
    if (parts.length < 2) return msg('التوكن غير صالح.');
    const pad = (s) => s + '='.repeat((4 - s.length % 4) % 4);
    const b64u = (s) => atob(pad(s.replace(/-/g, '+').replace(/_/g, '/')));
    let claims = null;
    try { claims = JSON.parse(b64u(parts[1])); } catch (_) { return msg('فشل فك التوكن.'); }
    let scp = [];
    try { scp = typeof claims.gosiscp === 'string' ? JSON.parse(claims.gosiscp) : (claims.gosiscp || []); }
    catch (_) { scp = []; }
    const regNos = Array.from(new Set((scp || []).map(x => x && x.e).filter(Boolean)));
    if (!regNos.length) return msg('لا توجد منشآت في التوكن.');

    msg('جلب بيانات ' + regNos.length + ' منشأة من التأمينات...');

    // Bounded-concurrency loop. GOSI tends to throttle aggressively; 4 in
    // flight is a safe starting point and roughly mirrors what ameen does.
    const CONC = 4;
    let ok = 0, fail = 0;
    let idx = 0;
    const headers = { Authorization: captured.auth, Accept: 'application/json, text/plain, */*' };
    if (captured.apikey) headers['X-Apikey'] = captured.apikey;

    const worker = async () => {
      while (true) {
        const i = idx++;
        if (i >= regNos.length) return;
        const reg = String(regNos[i]);
        const t0 = Date.now();
        let res = null, payload = null, rawText = '', netErr = null;
        try {
          res = await fetch(API + '/v1/establishment/' + encodeURIComponent(reg), { headers });
          rawText = await res.text().catch(() => '');
          try { payload = rawText ? JSON.parse(rawText) : null; } catch (_) { payload = { _parseError: true, raw: rawText.slice(0, 2000) }; }
        } catch (e) { netErr = (e && e.message) ? e.message : String(e); }

        // Log every call (success or failure) so we can audit later.
        await supaFetch('/rest/v1/gosi_sync_debug', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            sync_person_id: PERSON || null,
            endpoint: 'v1/establishment',
            request_method: 'GET',
            request_body: { registrationNo: reg },
            response_status: res ? res.status : 0,
            response_body: payload,
            notes: netErr ? ('network: ' + netErr) : ('elapsed_ms=' + (Date.now() - t0)),
          }),
        }).catch(() => {});

        if (!res || !res.ok || !payload || payload._parseError) { fail++; if (i % 10 === 0) msg('جارٍ... ' + (ok + fail) + '/' + regNos.length); continue; }

        const crNum = payload && payload.crn && payload.crn.number != null ? String(payload.crn.number) : null;
        const row = {
          registration_no: String(payload.registrationNo || reg),
          cr_number: crNum,
          sync_person_id: PERSON || null,
          raw_main: payload,
          synced_at: new Date().toISOString(),
        };
        const save = await supaFetch('/rest/v1/gosi_establishments?on_conflict=registration_no', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(row),
        }).catch(() => null);

        if (save && save.ok) ok++; else fail++;
        if (i % 10 === 0) msg('جارٍ... ' + (ok + fail) + '/' + regNos.length + ' (نجاح ' + ok + ')');
      }
    };
    await Promise.all(Array.from({ length: CONC }, worker));

    msg('✅ تمت مزامنة ' + ok + '/' + regNos.length + ' منشأة' + (fail ? ' (فشل ' + fail + ')' : ''));
    setTimeout(() => { const el = document.getElementById('_jisr_gosi_ui'); if (el) el.remove(); }, 20000);
  } catch (e) {
    msg('❌ ' + (e && e.message ? e.message : String(e)));
  }
})();
`
}

function minify(src) {
  return src
    .replace(/^[ \t]*\/\/.*$/gm, '')
    .replace(/\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function buildGosiBookmarklet({ personId }) {
  return 'javascript:' + encodeURIComponent(minify(body({ personId })))
}
