// SBC sync bookmarklet — incremental rebuild.
//
// Step 1 (current): capture ipapi-nl session and call the CR-list endpoint
//   POST /sbc/externalgw/ipapi-nl/api/app/mcV2/get-crs-by-personal-identifier-number
//   with {pageNumber:1, pageSize:1000}. The raw response is stored in
//   public.sbc_sync_debug so we can review the payload before mapping it.
//
// Additional endpoints will be added one at a time as we agree on their shape.

const SUPABASE_URL = 'https://gcvshzutdslmdkwqwteh.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdnNoenV0ZHNsbWRrd3F3dGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTkwNjgsImV4cCI6MjA5MDQ3NTA2OH0.5R0I5VvB7lp3wpSrtay3DMcXKsT9l1uK0Ukd1F4_ImM'

// Per-backend clientId constants baked into the SBC portal bundles. The
// gateway rejects a token whose clientId isn't subscribed to the backend
// being called ("Cannot find valid subscription for..."), so each backend
// needs its own. We hardcode them because the طلباتي flow runs on the
// companies portal, which never calls requestsapi itself — there'd be no
// live request to capture the header from.
const CLIENT_ID_REQUESTS = '8b907aa5799863128483d1d4121b0930'
const CLIENT_ID_COMPANIES_PROCESSING = 'a5fb5f0df5605d7aef65c02d3f36197b'

function body({ sourceId, personId, proxyBaseUrl }) {
  return `
(async () => {
  const U='${SUPABASE_URL}', K='${SUPABASE_ANON}';
  const API_BASE='https://api.saudibusiness.gov.sa/sbc/externalgw';
  const IP = API_BASE + '/ipapi-nl/api/app';
  const SOURCE='${sourceId}', PERSON='${personId}';
  // Netlify PDF proxy URL. Fired fire-and-forget right after each print
  // response so the downloadUrl token is still fresh — separate-pass design
  // failed because tokens expire in minutes.
  const PROXY='${proxyBaseUrl}/.netlify/functions/proxy-sbc-pdf';

  const msg = (m) => {
    let d = document.getElementById('_jisr_sync_ui');
    if (!d) {
      d = document.createElement('div');
      d.id = '_jisr_sync_ui';
      d.style.cssText = 'position:fixed;top:16px;left:16px;background:#111;color:#B07D00;padding:12px 18px;border-radius:10px;z-index:2147483647;font:700 13px/1.5 sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.5);max-width:380px;direction:rtl;text-align:right;border:1px solid rgba(176,125,0,.35)';
      document.body.appendChild(d);
    }
    d.textContent = 'جسر: ' + m;
    return d;
  };

  const supaFetch = (path, opts) => fetch(U + path, {
    ...(opts || {}),
    headers: { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json', ...((opts && opts.headers) || {}) },
  });

  // Capture per-backend headers (clientId etc.) by intercepting fetch.
  const captured = {};
  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    try {
      const u = typeof input === 'string' ? input : (input && input.url);
      if (u && u.includes('/sbc/externalgw/')) {
        const m = u.match(/\\/sbc\\/externalgw\\/([^\\/]+)\\//);
        const backend = m ? m[1] : null;
        if (backend && !captured[backend]) {
          const src = (init && init.headers) || (input instanceof Request ? input.headers : null);
          const h = {};
          if (src instanceof Headers) src.forEach((v, k) => { h[k] = v; });
          else if (src && typeof src === 'object') for (const k of Object.keys(src)) h[k] = src[k];
          if (h.authorization || h.Authorization) captured[backend] = h;
        }
      }
    } catch (_) {}
    return origFetch.apply(this, arguments);
  };

  // The captured headers freeze the Authorization token as it was at capture time, but a
  // تيسير token lives only ~28 min while a full run takes ~2h. A long run's frozen token
  // expires mid-way and every later call 401s (measured 2026-07-17: 0% → ~40% 401 around
  // the 20-min mark, then 0% again only because a fresh click re-captured). The portal's
  // OIDC library silently refreshes the localStorage token (it carries refresh_token +
  // offline_access), so re-reading it per call always yields a live token — the clientId
  // and everything else stay frozen (they don't rotate), only the token is refreshed.
  const OIDC_KEYS = [
    'oidc.user:https://www.saudibusiness.gov.sa:InvestorPortal',
    'oidc.user:https://www.saudibusiness.gov.sa:NewCompaniesClient',
  ];
  const oidcKey = () => OIDC_KEYS.find(k => localStorage.getItem(k)) || null;
  const currentToken = () => {
    const k = oidcKey();
    if (!k) return null;
    try { const o = JSON.parse(localStorage.getItem(k)); if (o && o.access_token) return o.access_token; } catch (_) {}
    return null;
  };

  // The portal does NOT silently renew an idle tab (verified 2026-07-17: the token just
  // expired at -17s without refreshing), so a long run's token would die mid-way. But the
  // OIDC entry carries a refresh_token, and POST /connect/token?grant_type=refresh_token
  // mints a fresh 30-min token (verified live). A single background keeper refreshes it a
  // couple of minutes before expiry and writes it back to localStorage — so headersFor
  // stays synchronous (just reads the fresh token) and only ONE refresh ever runs at a
  // time, which matters because the refresh_token is single-use/rotating.
  const AUTH_ISSUER = 'https://www.saudibusiness.gov.sa';
  const doRefresh = async () => {
    const k = oidcKey();
    if (!k) return;
    let o; try { o = JSON.parse(localStorage.getItem(k)); } catch (_) { return; }
    if (!o || !o.refresh_token) return;
    const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: o.refresh_token, client_id: k.split(':').pop() });
    const r = await origFetch(AUTH_ISSUER + '/connect/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }).catch(() => null);
    if (!r || !r.ok) return;
    const j = await r.json().catch(() => null);
    if (!j || !j.access_token) return;
    o.access_token = j.access_token;
    if (j.refresh_token) o.refresh_token = j.refresh_token;
    o.expires_at = Math.floor(Date.now() / 1000) + (j.expires_in || 1800);
    localStorage.setItem(k, JSON.stringify(o));
  };
  const startTokenKeeper = () => setInterval(async () => {
    try {
      const k = oidcKey(); if (!k) return;
      const o = JSON.parse(localStorage.getItem(k) || '{}');
      const now = Math.floor(Date.now() / 1000);
      if (o.expires_at && o.expires_at - now < 120) await doRefresh();
    } catch (_) {}
  }, 60000);

  const headersFor = (backend, opts) => {
    opts = opts || {};
    const base = captured[backend] || Object.values(captured).find(h => h && (h.authorization || h.Authorization)) || {};
    const out = { ...base, 'X-Correlation-Id': crypto.randomUUID() };
    const tok = currentToken();
    if (tok) { delete out.authorization; delete out.Authorization; out.Authorization = 'Bearer ' + tok; }
    if (opts.noContentType) { delete out['content-type']; delete out['Content-Type']; }
    delete out['content-length']; delete out['Content-Length'];
    return out;
  };

  // Navigate around to make the portal fire its own API calls so we can
  // capture the Authorization/clientId headers attached to ipapi-nl requests.
  const visit = async (path) => {
    if (location.pathname !== path) {
      history.pushState({}, '', path);
      dispatchEvent(new PopStateEvent('popstate'));
    } else {
      history.pushState({}, '', '/');
      dispatchEvent(new PopStateEvent('popstate'));
      await new Promise(r => setTimeout(r, 350));
      history.pushState({}, '', path);
      dispatchEvent(new PopStateEvent('popstate'));
    }
    await new Promise(r => setTimeout(r, 800));
  };

  let tokenKeeper = null;
  try {
    if (!location.hostname.includes('saudibusiness') && !location.hostname.endsWith('business.sa'))
      return msg('افتح بوابة تيسير أولاً (e2.business.sa)');

    // Either portal's session works. تيسير parks its OIDC user under
    // InvestorPortal, بوابة الشركات under NewCompaniesClient — oidcKey() and
    // currentToken() already read whichever this origin has, and the gateway
    // keys off token + clientId, not the calling origin. The old guard read the
    // InvestorPortal key only, which silently killed the CR-list flow on the
    // companies portal and forced the user to visit both portals for one sync.
    if (!oidcKey()) return msg('لم يتم تسجيل الدخول بنفاذ. سجّل الدخول ثم اضغط الإشارة مرة أخرى.');
    if (!currentToken()) return msg('الجلسة غير صالحة. أعد تسجيل الدخول.');

    // Header capture works by making the تيسير SPA fire its own ipapi-nl calls,
    // and the routes visit() walks exist only there. On بوابة الشركات the
    // headers are built statically instead: ipapi-nl answers to the same known
    // clientId as requestsapi (the qawaem tab already relies on that), and
    // headersFor() adds the live token + correlation id on every call.
    const onCompanies = location.hostname === 'companies.saudibusiness.gov.sa';
    if (!onCompanies) {
      msg('جارٍ التقاط الجلسة...');
      try { await visit('/commercial-records'); } catch (_) {}
      await new Promise(r => setTimeout(r, 1500));
      try { await visit('/requests'); } catch (_) {}
      await new Promise(r => setTimeout(r, 1500));
      if (!captured['ipapi-nl']) {
        for (let i = 0; i < 30 && !captured['ipapi-nl']; i++) await new Promise(r => setTimeout(r, 200));
      }
    }
    if (!captured['ipapi-nl']) {
      if (onCompanies) captured['ipapi-nl'] = { clientId: '${CLIENT_ID_REQUESTS}' };
      else return msg('تعذّر التقاط الجلسة. افتح صفحة «سجلاتي» ثم جرّب مرة أخرى.');
    }

    // Keep the token alive for the whole run (cleared at the end / on error).
    tokenKeeper = startTokenKeeper();

    // ─────────── Step 1: CR list (paged, pageSize 1000) ───────────
    const reqBody = { pageNumber: 1, pageSize: 1000 };
    msg('جلب جميع السجلات التجارية (pageSize 1000)...');
    const t0 = Date.now();
    let netErr = null;
    const res = await fetch(IP + '/mcV2/get-crs-by-personal-identifier-number', {
      method: 'POST',
      headers: { ...headersFor('ipapi-nl'), 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(reqBody),
    }).catch(e => { netErr = (e && e.message) ? e.message : String(e); return null; });

    const status = res ? res.status : 0;
    let payload = null;
    let rawText = '';
    if (res) {
      rawText = await res.text().catch(() => '');
      try { payload = rawText ? JSON.parse(rawText) : null; } catch (_) { payload = { _parseError: true, raw: rawText.slice(0, 2000) }; }
    }
    const itemsCount = (payload && Array.isArray(payload.items)) ? payload.items.length : null;
    const elapsedMs = Date.now() - t0;

    const debugRow = {
      person_id: PERSON || null,
      endpoint: 'mcV2/get-crs-by-personal-identifier-number',
      request_method: 'POST',
      request_body: reqBody,
      response_status: status,
      response_body: payload,
      items_count: itemsCount,
      notes: netErr ? ('network: ' + netErr) : ('elapsed_ms=' + elapsedMs),
    };
    const saveRes = await supaFetch('/rest/v1/sbc_sync_debug', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(debugRow),
    });

    if (!res || !res.ok) {
      const reason = res ? ('HTTP ' + status) : ('network: ' + (netErr || 'unknown'));
      return msg('❌ CR list ' + reason + (rawText ? ' — ' + rawText.slice(0, 120) : ''));
    }
    if (!saveRes.ok) {
      const txt = await saveRes.text().catch(() => '');
      return msg('⚠ تم استلام السجلات (' + itemsCount + ') لكن فشل الحفظ في sbc_sync_debug ' + saveRes.status + ' — ' + txt.slice(0, 120));
    }

    // ─────────── Steps 2-5: per-facility data (parallel) ───────────
    // For each facility we fire 4 endpoints in parallel via Promise.all —
    // violations, qawaem, gosi, case violations. Each call has its own
    // retry path (fetchWithRetry), so a slow/failed endpoint on one facility
    // doesn't block the others. Concurrency is at the FACILITY level: with
    // limit=2 we have at most 8 in-flight calls (2 facilities × 4 endpoints).
    // This drops the total wall-clock from ~3 min (4 sequential loops) to
    // roughly one loop's worth — ~45-60s.
    const items = (payload && Array.isArray(payload.items)) ? payload.items : [];
    const perFacilityTargets = items
      .filter(it => it && it.crInformation && it.crInformation.encryptedCrNationalNumber)
      .map(it => ({
        enc: it.crInformation.encryptedCrNationalNumber,
        cr: it.crInformation.crNationalNumber || null,
        // isCompany: distinguishes شركة (LLC/JSC/...) from مؤسسة. The CR
        // contract endpoint only applies to companies — establishments are
        // sole proprietorships with no founding contract.
        isCompany: !!(it.crInformation.entityType && it.crInformation.entityType.entityTypeDescAr === 'شركة'),
        // Full CR-list item — passed to bot_upsert_sbc_facility as p_raw_cr so
        // the captured response maps into the production sbc_facilities table.
        raw: it,
      }));

    // mapLimit: bounded concurrency over an array. Each worker pulls the next
    // index until exhausted. We keep limit low because the gateway throttles
    // (X-RateLimit-Limit: name=default,100 per window).
    const mapLimit = async (arr, limit, fn) => {
      const out = new Array(arr.length);
      let idx = 0;
      const workers = Array.from({ length: limit }, async () => {
        while (true) {
          const i = idx++;
          if (i >= arr.length) return;
          try { out[i] = await fn(arr[i], i); } catch (e) { out[i] = null; }
        }
      });
      await Promise.all(workers);
      return out;
    };

    // How many facilities to process at once. Measured 2026-07-17: at 2, a full run
    // showed ZERO 429s (~20 calls/min against a 100/window limit) — the low value was
    // pure caution, not a real ceiling, so it was doubling the wall clock for nothing.
    // 4 keeps a wide margin (~4 facilities × ~13 endpoints ≈ 52 in-flight < 100) while
    // roughly halving the time. Same endpoints, same retries, same data — only more
    // facilities in parallel. Raise further only if runs stay 429-free.
    const FACILITY_CONCURRENCY = 4;

    // fetchWithRetry: retries on ANY failure (network error OR non-2xx) up
    // to MAX_ATTEMPTS times. 429 honours Retry-After (or 30s). Other failures
    // use 1.5s, 3s backoff. Returns final Response + "seen" array recording
    // each attempt's status code (e.g. [401,401,200] = recovered).
    //
    // noRetryOn(status): optional callback. If it returns true for the
    // first failure status, we skip retries and return immediately. Useful
    // for endpoints where a specific non-2xx is the documented "empty data"
    // shape (e.g. Momrah 400 = no municipal licenses).
    const fetchWithRetry = async (url, init, noRetryOn) => {
      const MAX_ATTEMPTS = 3;
      const TIMEOUT_MS = 60000;
      const seen = [];
      let lastErr = null;
      let lastRes = null;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        let r = null;
        // AbortController-based per-call timeout. Without this, a hung
        // backend can block the whole facility's Promise.all forever.
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
        try { r = await fetch(url, Object.assign({}, init, { signal: ac.signal })); }
        catch (e) { lastErr = (e && e.message) || String(e); r = null; }
        finally { clearTimeout(timer); }
        if (!r) {
          seen.push(0);
          if (attempt < MAX_ATTEMPTS - 1) await new Promise(res => setTimeout(res, 1500 * (attempt + 1)));
          continue;
        }
        lastRes = r;
        seen.push(r.status);
        if (r.ok) return { res: r, seen, netErr: null };
        // Skip retries when the caller says this status is a known terminal
        // state (e.g. an "empty data" 400 that won't ever turn into 200).
        if (noRetryOn && noRetryOn(r.status)) return { res: r, seen, netErr: null };
        if (attempt >= MAX_ATTEMPTS - 1) return { res: r, seen, netErr: null };
        let waitMs = 1500 * (attempt + 1);
        if (r.status === 429) {
          const ra = r.headers.get('Retry-After');
          waitMs = 30000;
          if (ra) {
            const asInt = parseInt(ra, 10);
            if (Number.isFinite(asInt)) waitMs = Math.min(asInt * 1000, 120000);
          }
        }
        await new Promise(res => setTimeout(res, waitMs));
      }
      return { res: lastRes, seen, netErr: lastErr };
    };

    // Endpoint registry: each describes one per-facility call. Add new
    // endpoints here and the loop below picks them up automatically.
    // - key: short identifier used in counters
    // - label: Arabic UI label
    // - name: endpoint string stored in sbc_sync_debug.endpoint
    // - url(target): builds the full URL from {enc, cr}
    // - reqBody(target): the request_body JSON saved into sbc_sync_debug
    // - extractCount(payload): how to derive items_count from this endpoint
    const ENDPOINTS = [
      {
        key: 'v', label: 'مخالفات',
        name: 'mcV2/GetViolationsQuery',
        url: ({ enc }) => IP + '/mcV2/GetViolationsQuery?crNationalNumber=' + encodeURIComponent(enc) + '&pageNumber=1&pageSize=1000',
        reqBody: ({ enc, cr }) => ({ crNationalNumber_encrypted: enc, crNationalNumber: cr, pageNumber: 1, pageSize: 1000 }),
        extractCount: (p) => (p && typeof p.totalViolationCount === 'number')
          ? p.totalViolationCount
          : (p && Array.isArray(p.violations) ? p.violations.length
          : (p && Array.isArray(p.items) ? p.items.length : null)),
      },
      {
        key: 'q', label: 'قوائم',
        name: 'Qawaem/GetQawaemStatistics',
        url: ({ enc }) => IP + '/Qawaem/GetQawaemStatistics?nCrNumber=' + encodeURIComponent(enc),
        reqBody: ({ enc, cr }) => ({ nCrNumber_encrypted: enc, crNationalNumber: cr }),
        extractCount: (p) => (p && typeof p.total === 'number') ? p.total : null,
      },
      {
        key: 'qs', label: 'حالة القوائم',
        name: 'Qawaem/GetCRSubmissionInfo',
        // Per-year filing status behind the «حالة القوائم المالية» tab —
        // the sibling of GetQawaemStatistics, which only gives yearly counts.
        // delegationReference is sent empty, exactly as the portal does.
        url: ({ enc }) => IP + '/Qawaem/GetCRSubmissionInfo?nCrNumber=' + encodeURIComponent(enc) + '&delegationReference=',
        reqBody: ({ enc, cr }) => ({ nCrNumber_encrypted: enc, crNationalNumber: cr, delegationReference: '' }),
        // Response is a bare array, one entry per financial year.
        extractCount: (p) => Array.isArray(p) ? p.length : null,
        // 404 is the portal's own "no statements filed" signal — it renders an
        // empty state for it rather than an error. Don't burn retries on it.
        noRetryOn: (status) => status === 404,
      },
      {
        key: 'g', label: 'تأمينات',
        name: 'gosi/establishments-main-info-by-cr-national-number',
        url: ({ enc }) => IP + '/gosi/establishments-main-info-by-cr-national-number/' + encodeURIComponent(enc),
        reqBody: ({ enc, cr }) => ({ encryptedCrNationalNumber: enc, crNationalNumber: cr }),
        extractCount: (p) => (p && p.numberOfContributors != null && Number.isFinite(Number(p.numberOfContributors)))
          ? Number(p.numberOfContributors) : null,
      },
      {
        key: 'c', label: 'لجان',
        name: 'mcV2/GetCaseViolationsQuery',
        url: ({ enc }) => IP + '/mcV2/GetCaseViolationsQuery?crNationalNumber=' + encodeURIComponent(enc) + '&pageNumber=1&pageSize=1000',
        reqBody: ({ enc, cr }) => ({ crNationalNumber_encrypted: enc, crNationalNumber: cr, pageNumber: 1, pageSize: 1000 }),
        extractCount: (p) => (p && typeof p.totalViolationCount === 'number')
          ? p.totalViolationCount
          : (p && Array.isArray(p.violations) ? p.violations.length
          : (p && Array.isArray(p.items) ? p.items.length : null)),
      },
      {
        key: 'h', label: 'موارد بشرية',
        name: 'hrsd/get-establishment-statistics',
        url: ({ enc }) => IP + '/hrsd/get-establishment-statistics/' + encodeURIComponent(enc),
        reqBody: ({ enc, cr }) => ({ encryptedCrNationalNumber: enc, crNationalNumber: cr }),
        // items_count: totalLaborers is the most useful single aggregate
        // (Saudi + foreign). Server returns it as a number here, so no coerce.
        extractCount: (p) => (p && typeof p.totalLaborers === 'number') ? p.totalLaborers : null,
      },
      {
        key: 'm', label: 'رخص بلدية',
        name: 'momrah/commercial-licenses-by-cr-number',
        url: ({ enc }) => IP + '/momrah/commercial-licenses-by-cr-number?crNumber=' + encodeURIComponent(enc),
        reqBody: ({ enc, cr }) => ({ crNumber_encrypted: enc, crNationalNumber: cr }),
        // items_count: number of municipal licenses (list length under
        // data.result.list). Envelope shape is data.responseCode/result/list.
        extractCount: (p) => {
          const list = p && p.data && p.data.result && p.data.result.list;
          return Array.isArray(list) ? list.length : null;
        },
        // 400 from Momrah means "this facility has no municipal licenses"
        // — a permanent empty state, not a transient failure. Skip retries
        // so we don't waste 2 extra round-trips per license-less facility.
        noRetryOn: (status) => status === 400,
      },
      {
        key: 'e', label: 'امتثال',
        name: 'mcV2/GetEmtethalViolationsQuery',
        // Encrypted CR is a PATH param; pageNumber/pageSize as query.
        url: ({ enc }) => IP + '/mcV2/GetEmtethalViolationsQuery/' + encodeURIComponent(enc) + '?pageNumber=1&pageSize=1000',
        reqBody: ({ enc, cr }) => ({ crNationalNumber_encrypted: enc, crNationalNumber: cr, pageNumber: 1, pageSize: 1000 }),
        // Success shape is assumed to mirror GetViolationsQuery; 422 with the
        // error envelope means "no data for this facility" and items_count
        // will fall through to null (we still capture the raw response).
        extractCount: (p) => (p && typeof p.totalViolationCount === 'number')
          ? p.totalViolationCount
          : (p && Array.isArray(p.violations) ? p.violations.length
          : (p && Array.isArray(p.items) ? p.items.length : null)),
        // 422 is the documented "no Emtethal record exists for this facility"
        // response — permanent, not transient. Don't burn 2 retries on it.
        noRetryOn: (status) => status === 422,
      },
      {
        key: 'p', label: 'طباعة سجل',
        name: 'mcV2/get-print-cr-by-national-number',
        // Returns { content, downloadUrl, extension, message }. The actual
        // PDF lives at downloadUrl on printcr.mc.gov.sa (cross-origin) —
        // chained PDF fetch + Storage upload happens inside the per-facility
        // loop right after this endpoint resolves.
        url: ({ enc }) => IP + '/mcV2/get-print-cr-by-national-number?crNationalNumber=' + encodeURIComponent(enc) + '&crNumber=&culture=ar',
        reqBody: ({ enc, cr }) => ({ crNationalNumber_encrypted: enc, crNumber: '', culture: 'ar', crNationalNumber: cr }),
        // items_count: 1 if we got a downloadUrl, else 0/null.
        extractCount: (p) => (p && p.downloadUrl) ? 1 : 0,
      },
      {
        key: 'pc', label: 'عقد تأسيس',
        name: 'mcV2/get-print-cr-contract-by-national-number',
        // Founding contract — only meaningful for companies. Establishments
        // (sole proprietorships) have no contract. Skip via shouldFire so
        // we don't waste calls (and avoid likely 4xx responses).
        shouldFire: (target) => target.isCompany === true,
        // Note: query param is "crNumber" (not crNationalNumber) but it
        // carries the same encryptedCrNationalNumber value.
        url: ({ enc }) => IP + '/mcV2/get-print-cr-contract-by-national-number?crNumber=' + encodeURIComponent(enc) + '&culture=ar',
        reqBody: ({ enc, cr }) => ({ crNumber_encrypted: enc, culture: 'ar', crNationalNumber: cr }),
        extractCount: (p) => (p && p.downloadUrl) ? 1 : 0,
      },
    ];

    // Chained endpoints — fire only after their parent resolves with the
    // needed data. Defined separately because their URL / body need values
    // extracted from the parent response.
    //
    //   gosi-main ─► gosi-file ─► gosi-compliance
    //                              (POST with derived officeID + unifiedID)
    const GOSI_FILE_EP = {
      key: 'gf', label: 'ملف تأمينات',
      name: 'gosi/establishments-file-info-by-registration-number',
      // numberOfContributors comes back as a string here too (same as main info).
      extractCount: (p) => (p && p.numberOfContributors != null && Number.isFinite(Number(p.numberOfContributors)))
        ? Number(p.numberOfContributors) : null,
    };
    const GOSI_COMPLIANCE_EP = {
      key: 'gc', label: 'التزام',
      name: 'gosi/establishment-compliance',
      // numberOfPaidLaborers is the most concrete signal; fall back to null
      // when the server returns all-nulls (the typical empty-compliance shape).
      extractCount: (p) => (p && typeof p.numberOfPaidLaborers === 'number') ? p.numberOfPaidLaborers : null,
    };

    // Per-endpoint counters keyed by ep.key (including chained gosi-file and gosi-compliance).
    const stats = {};
    for (const ep of ENDPOINTS) stats[ep.key] = { ok: 0, fail: 0, retried: 0, recovered: 0 };
    stats[GOSI_FILE_EP.key] = { ok: 0, fail: 0, retried: 0, recovered: 0 };
    stats[GOSI_COMPLIANCE_EP.key] = { ok: 0, fail: 0, retried: 0, recovered: 0 };
    // Separate counters per language for the PDF download+upload pipeline
    // (not proper endpoints — fetch a binary from printcr.mc.gov.sa and
    // pipe it to Supabase Storage). May fail with a CORS error if the
    // source server doesn't expose the right headers. Each language has
    // its own bucket of stats so we can report ar/en separately.
    // PDF upload is fired fire-and-forget right after each successful print
    // response — the downloadUrl token expires in minutes, so we cannot defer
    // the upload to a later run. The Netlify proxy fetches printcr.mc.gov.sa
    // server-side and writes to documents/sbc-cr-certificates/{cr}-{lang}.pdf.
    const pdfStats = { uploaded: 0, fetchFail: 0, uploadFail: 0, skipped: 0 };
    // Counters for the staging→production mapping (bot_upsert_sbc_facility).
    const mapStats = { ok: 0, fail: 0 };
    // triggerPdfUpload: fire-and-forget proxy upload. "opts" lets the caller
    // override the storage folder/filename so we can store municipal-license
    // PDFs (sbc-municipal-licenses/{licenseId}.pdf) alongside the CR PDFs.
    const triggerPdfUpload = (cr, dlUrl, lang, opts) => {
      if (!dlUrl) { pdfStats.skipped++; return; }
      opts = opts || {};
      const folder = opts.folder || 'sbc-cr-certificates';
      const fname = opts.fname || ((cr || 'unknown') + '-' + lang + '.pdf');
      const storagePath = folder + '/' + fname;
      const debugEndpoint = opts.debugEndpoint || 'storage/cr-certificate-pdf';
      const extraReqBody = opts.extraReqBody || {};
      const tCall = Date.now();
      // Fire-and-forget — we don't await so PDF upload runs in parallel with
      // the next facility's data fetches. Logging into sbc_sync_debug still
      // happens, just asynchronously to the main loop.
      fetch(PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ downloadUrl: dlUrl, bucket: 'documents', path: storagePath }),
      }).then(async (r) => {
        let payload = null;
        try { payload = await r.json(); } catch (_) {}
        const ok = !!(r && r.ok && payload && payload.ok);
        const errMsg = payload && payload.error;
        if (ok) pdfStats.uploaded++;
        else if (errMsg && /pdf fetch/i.test(errMsg)) pdfStats.fetchFail++;
        else pdfStats.uploadFail++;
        return supaFetch('/rest/v1/sbc_sync_debug', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            person_id: PERSON || null,
            endpoint: debugEndpoint,
            request_method: 'POST',
            request_body: Object.assign({ bucket: 'documents', path: storagePath, downloadUrl: dlUrl, crNationalNumber: cr, lang: lang, via: 'netlify-proxy-inline' }, extraReqBody),
            response_status: r ? r.status : 0,
            response_body: payload,
            items_count: ok ? 1 : 0,
            notes: ok
              ? ('pdf via proxy [' + lang + '] · size=' + (payload.sizeBytes || 0) + 'B · ' + (Date.now() - tCall) + 'ms · cr=' + (cr || '?'))
              : ('proxy fail [' + lang + ']: ' + (errMsg || ('HTTP ' + (r ? r.status : 0))) + ' · cr=' + (cr || '?')),
          }),
        }).catch(() => {});
      }).catch(e => {
        pdfStats.uploadFail++;
        supaFetch('/rest/v1/sbc_sync_debug', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            person_id: PERSON || null,
            endpoint: debugEndpoint,
            request_method: 'POST',
            request_body: Object.assign({ bucket: 'documents', path: storagePath, downloadUrl: dlUrl, crNationalNumber: cr, lang: lang, via: 'netlify-proxy-inline' }, extraReqBody),
            response_status: 0,
            response_body: { error: (e && e.message) || String(e) },
            items_count: 0,
            notes: 'proxy net err [' + lang + ']: ' + ((e && e.message) || String(e)) + ' · cr=' + (cr || '?'),
          }),
        }).catch(() => {});
      });
    };

    // runEndpoint: shared call + persist for any endpoint (top-level or
    // chained). Accepts an options bag so chained POSTs can supply their
    // own URL / body / method:
    //   - url:     override the URL (default ep.url(target))
    //   - reqBody: what to record in sbc_sync_debug.request_body
    //   - method:  HTTP method (default 'GET')
    //   - apiBody: JSON body sent to the API (for POSTs); also sets Content-Type
    // Returns { ep, status, payload, seen, netErr } so callers can chain off it.
    const runEndpoint = async (target, ep, opts) => {
      opts = opts || {};
      const tCall = Date.now();
      const url = opts.url || ep.url(target);
      const method = opts.method || 'GET';
      const apiBody = opts.apiBody || null;

      // For POST with JSON body we need Content-Type explicitly. For GETs we
      // strip Content-Type from the captured headers (gateway rejects it).
      const headers = apiBody
        ? { ...headersFor('ipapi-nl'), 'Content-Type': 'application/json', Accept: 'application/json' }
        : headersFor('ipapi-nl', { noContentType: true });
      const fetchInit = { method, headers };
      if (apiBody) fetchInit.body = JSON.stringify(apiBody);

      const { res, seen, netErr } = await fetchWithRetry(url, fetchInit, ep.noRetryOn);
      const attempts = seen.length;
      if (attempts > 1) stats[ep.key].retried++;
      if (attempts > 1 && res && res.ok) stats[ep.key].recovered++;

      const status = res ? res.status : 0;
      let pl = null;
      if (res) {
        const txt = await res.text().catch(() => '');
        try { pl = txt ? JSON.parse(txt) : null; } catch (_) { pl = { _parseError: true, raw: txt.slice(0, 2000) }; }
      }
      if (res && res.ok) stats[ep.key].ok++; else stats[ep.key].fail++;

      const reqBody = opts.reqBody || (ep.reqBody ? ep.reqBody(target) : null);
      supaFetch('/rest/v1/sbc_sync_debug', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          person_id: PERSON || null,
          endpoint: ep.name,
          request_method: method,
          request_body: reqBody,
          response_status: status,
          response_body: pl,
          items_count: ep.extractCount(pl),
          notes: (netErr ? ('network: ' + netErr) : ('elapsed_ms=' + (Date.now() - tCall))) + ' · cr=' + (target.cr || '?') + (seen.length > 1 ? (' · seen=[' + seen.join(',') + ']') : ''),
        }),
      }).catch(() => {});

      return { ep, status, payload: pl, seen, netErr };
    };

    msg('جلب بيانات ' + perFacilityTargets.length + ' منشأة على ' + (ENDPOINTS.length + 1) + ' نقاط بالتوازي...');
    let facDone = 0;
    let facInFlight = 0;
    const inFlightCrs = new Set();
    const allT0 = Date.now();

    // Live progress ticker — updates the overlay every 2s even when no
    // facility has completed in that window. So if a single endpoint hangs,
    // you can see elapsed time keep climbing instead of a frozen message.
    const fmtTime = (s) => {
      const m = Math.floor(s / 60);
      const r = s % 60;
      return m + ':' + (r < 10 ? '0' : '') + r;
    };
    const tickProgress = () => {
      const elapsed = Math.floor((Date.now() - allT0) / 1000);
      const total = perFacilityTargets.length;
      let etaStr = '?';
      if (facDone > 0) {
        const ratePer = elapsed / facDone;
        etaStr = fmtTime(Math.ceil((total - facDone) * ratePer));
      }
      const inFlightList = Array.from(inFlightCrs).slice(0, 2).join(',');
      const inFlightPart = facInFlight > 0 ? (' · جاري ' + facInFlight + (inFlightList ? (' [' + inFlightList + ']') : '')) : '';
      msg('منشأة ' + facDone + '/' + total + inFlightPart + ' · مضى ' + fmtTime(elapsed) + ' · متبقي ~' + etaStr);
    };
    const progressTimer = setInterval(tickProgress, 2000);
    tickProgress();

    await mapLimit(perFacilityTargets, FACILITY_CONCURRENCY, async (target) => {
      const { enc, cr } = target;
      facInFlight++;
      inFlightCrs.add(cr || '?');
      try {
      // Fire all top-level endpoints in parallel for this facility.
      // The gosi-main worker chains an additional gosi-file call AS SOON AS
      // gosi-main resolves — that chained call runs concurrently with the
      // other top-level endpoints (e.g. the slow Qawaem), so it doesn't
      // extend the per-facility wall clock.
      const epResults = {};
      await Promise.all(ENDPOINTS.map(async (ep) => {
        // shouldFire lets an endpoint opt out per-facility (e.g. contract
        // skips non-company entities). Skipped endpoints don't count as
        // ok or fail in stats — just silently not called.
        if (ep.shouldFire && !ep.shouldFire(target)) return;

        const result = await runEndpoint(target, ep);
        epResults[ep.key] = result;

        // Fire PDF upload immediately when a print/contract response with
        // downloadUrl lands. The token in downloadUrl expires in minutes,
        // so we can't defer this to a later run.
        if ((ep.key === 'p' || ep.key === 'pc') && result.status === 200) {
          const dlUrl = result.payload && result.payload.downloadUrl;
          const lang = ep.key === 'p' ? 'ar' : 'contract';
          triggerPdfUpload(cr, dlUrl, lang);
        }

        // Fire municipal-license PDF uploads — one per license — when the
        // Momrah call lands with a populated result.list. Stored under
        // documents/sbc-municipal-licenses/{licenseId}.pdf so the UI can
        // reference them via Supabase Storage instead of momra.gov.sa.
        if (ep.key === 'm' && result.status === 200) {
          const list = (result.payload && result.payload.data && result.payload.data.result && result.payload.data.result.list) || [];
          for (const lic of list) {
            if (!lic || !lic.printLicenseUrl || !lic.licenseId) continue;
            triggerPdfUpload(cr, lic.printLicenseUrl, 'momrah', {
              folder: 'sbc-municipal-licenses',
              fname: lic.licenseId + '.pdf',
              debugEndpoint: 'storage/municipal-license-pdf',
              extraReqBody: { licenseId: lic.licenseId, shopName: lic.shopName },
            });
          }
        }

        if (ep.key === 'g' && result.status === 200) {
          const regNum = result.payload
            && result.payload.establishmentList
            && result.payload.establishmentList[0]
            && result.payload.establishmentList[0].registrationNumber;
          if (regNum) {
            const fileUrl = IP + '/gosi/establishments-file-info-by-registration-number/' + encodeURIComponent(regNum);
            const fileReqBody = { registrationNumber: regNum, encryptedCrNationalNumber: enc, crNationalNumber: cr };
            const fileResult = await runEndpoint(target, GOSI_FILE_EP, { url: fileUrl, reqBody: fileReqBody });

            // Chain gosi-compliance off gosi-file. officeID and unifiedID
            // come from gosi-file's molofficeID + moluniID. month/year are
            // the current month (1-12) and year. This is a POST with JSON.
            if (fileResult.status === 200 && fileResult.payload) {
              const officeID = fileResult.payload.molofficeID;
              const unifiedID = fileResult.payload.moluniID;
              if (officeID != null && unifiedID != null) {
                const now = new Date();
                const apiBody = { month: now.getMonth() + 1, year: now.getFullYear(), officeID: officeID, unifiedID: unifiedID };
                const compUrl = IP + '/gosi/establishment-compliance';
                const compReqBody = Object.assign({}, apiBody, { encryptedCrNationalNumber: enc, crNationalNumber: cr });
                await runEndpoint(target, GOSI_COMPLIANCE_EP, { url: compUrl, reqBody: compReqBody, method: 'POST', apiBody: apiBody });
              }
            }
          }
        }
      }));

      // Map this facility's captured raw responses into the production
      // sbc_facilities table via the bot_upsert RPC; the canonical trigger
      // then upserts into facilities. GOSI/HRSD payloads only when they
      // returned 200 — otherwise pass null (the RPC tolerates nulls).
      const gosiPayload = (epResults.g && epResults.g.status === 200) ? epResults.g.payload : null;
      const hrsdPayload = (epResults.h && epResults.h.status === 200) ? epResults.h.payload : null;
      const upRes = await supaFetch('/rest/v1/rpc/bot_upsert_sbc_facility', {
        method: 'POST',
        body: JSON.stringify({
          p_person_id: PERSON || null,
          p_run_id: null,
          p_cr_national_number: cr,
          p_raw_cr: target.raw,
          p_raw_gosi: gosiPayload,
          p_raw_hrsd: hrsdPayload,
        }),
      }).catch(() => null);
      if (upRes && upRes.ok) mapStats.ok++; else mapStats.fail++;
      } finally {
        facInFlight--;
        inFlightCrs.delete(cr || '?');
        facDone++;
      }
      // Detailed per-10 update is preserved on top of the live ticker so the
      // user occasionally sees the per-endpoint breakdown, not just a count.
      if (facDone % 10 === 0 || facDone === perFacilityTargets.length) {
        const allEps = ENDPOINTS.concat([GOSI_FILE_EP, GOSI_COMPLIANCE_EP]);
        const summary = allEps.map(ep => ep.label + ' ' + stats[ep.key].ok + '/' + stats[ep.key].fail).join(' · ');
        const anyRetried = allEps.some(ep => stats[ep.key].retried > 0);
        const pdfPart = ' · PDF ' + pdfStats.uploaded + ' (فشل ' + (pdfStats.fetchFail + pdfStats.uploadFail) + ')';
        msg('منشأة ' + facDone + '/' + perFacilityTargets.length + ' · ' + summary + pdfPart + (anyRetried ? ' · إعادة محاولات نشطة' : ''));
      }
    });

    clearInterval(progressTimer);
    const allElapsed = Math.round((Date.now() - allT0) / 1000);

    // ─────────── Second pass: English CR print ───────────
    // Earlier we tried a blind 5-minute wait between Arabic and English to
    // satisfy the print service's per-facility cooldown. Bad idea — the SBC
    // backend session token has a TTL around 5 min, so the wait was killing
    // our session and every English call came back 401 "Cannot pass the
    // security checks". Without the wait, we keep the session alive and
    // most facilities have already accumulated enough Arabic-to-English gap
    // because the main loop took several minutes. The tail few will hit a
    // 403 cooldown, but that's a per-row failure not a session collapse.
    //
    // To be extra safe we also re-trigger the session capture (revisit
    // /commercial-records) right before the English pass — that prompts
    // the portal to refresh its backend tokens, which our fetch interceptor
    // then re-captures into the "captured" map.
    // 6-minute cooldown between Arabic and English print fetches.
    // SBC enforces a ~5-minute per-CR rate limit on /get-print-cr-by-national-number
    // regardless of culture (ar vs en) — so the second call for the same CR
    // within that window comes back with a quota/cooldown error and no
    // downloadUrl, which is why English PDFs were missing in earlier runs.
    // We sleep 6 minutes (360s) to clear the window for every CR with margin,
    // showing a live countdown so the user knows the sync isn't stuck.
    const COOLDOWN_MS = 6 * 60 * 1000;
    const cooldownStart = Date.now();
    while (true) {
      const elapsed = Date.now() - cooldownStart;
      if (elapsed >= COOLDOWN_MS) break;
      const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      msg('⏳ انتظار تبريد SBC قبل النسخة الإنجليزية · ' + m + ':' + (s < 10 ? '0' : '') + s);
      await new Promise(r => setTimeout(r, 1000));
    }

    msg('تحديث الجلسة قبل النسخة الإنجليزية...');
    captured['ipapi-nl'] = null;
    try { await visit('/commercial-records'); } catch (_) {}
    await new Promise(r => setTimeout(r, 1500));
    if (!captured['ipapi-nl']) {
      try { await visit('/requests'); } catch (_) {}
      await new Promise(r => setTimeout(r, 1500));
    }
    if (!captured['ipapi-nl']) {
      for (let i = 0; i < 30 && !captured['ipapi-nl']; i++) await new Promise(r => setTimeout(r, 200));
    }

    const PRINT_EN_EP = {
      key: 'pe', label: 'سجل إنجليزي',
      name: 'mcV2/get-print-cr-by-national-number(en)',
      url: ({ enc }) => IP + '/mcV2/get-print-cr-by-national-number?crNationalNumber=' + encodeURIComponent(enc) + '&crNumber=&culture=en',
      reqBody: ({ enc, cr }) => ({ crNationalNumber_encrypted: enc, crNumber: '', culture: 'en', crNationalNumber: cr }),
      extractCount: (p) => (p && p.downloadUrl) ? 1 : 0,
    };
    stats[PRINT_EN_EP.key] = { ok: 0, fail: 0, retried: 0, recovered: 0 };

    msg('المرحلة الثانية: جلب نسخة إنجليزية لكل سجل (تزامن ' + FACILITY_CONCURRENCY + ')...');
    let enDone = 0;
    const enT0 = Date.now();
    await mapLimit(perFacilityTargets, FACILITY_CONCURRENCY, async (target) => {
      const result = await runEndpoint(target, PRINT_EN_EP);
      if (result.status === 200) {
        const dlUrl = result.payload && result.payload.downloadUrl;
        triggerPdfUpload(target.cr, dlUrl, 'en');
      }

      enDone++;
      if (enDone % 10 === 0 || enDone === perFacilityTargets.length) {
        msg('إنجليزي ' + enDone + '/' + perFacilityTargets.length + ' · سجل ' + stats.pe.ok + '/' + stats.pe.fail + ' · PDF ' + pdfStats.uploaded);
      }
    });
    const enElapsed = Math.round((Date.now() - enT0) / 1000);

    // PDF uploads are fire-and-forget — give the in-flight ones a moment to
    // settle before the final summary so the count is accurate. We poll
    // pdfStats every 500ms and stop when the total matches expected (or
    // 30s timeout, whichever comes first).
    const expectedPdfs = stats.p.ok + stats.pc.ok + stats.pe.ok;
    const pdfWaitT0 = Date.now();
    while (true) {
      const done = pdfStats.uploaded + pdfStats.fetchFail + pdfStats.uploadFail + pdfStats.skipped;
      if (done >= expectedPdfs) break;
      if (Date.now() - pdfWaitT0 > 30000) break;
      msg('في انتظار رفع PDFs... ' + done + '/' + expectedPdfs);
      await new Promise(r => setTimeout(r, 500));
    }

    const finalSummary = ENDPOINTS.concat([GOSI_FILE_EP, GOSI_COMPLIANCE_EP, PRINT_EN_EP]).map(ep => {
      const s = stats[ep.key];
      return ep.label + ' ' + s.ok + '/' + s.fail + (s.retried ? (' (أعيد ' + s.retried + ' تعافى ' + s.recovered + ')') : '');
    }).join(' · ');
    const pdfSummary = 'PDF ' + pdfStats.uploaded + ' نجح · ' + (pdfStats.fetchFail + pdfStats.uploadFail) + ' فشل';
    clearInterval(tokenKeeper);
    msg('✅ ' + itemsCount + ' سجل · حُفظ ' + mapStats.ok + ' منشأة (فشل ' + mapStats.fail + ') · ' + finalSummary + ' · ' + pdfSummary + ' في ' + (allElapsed + enElapsed) + 's');
    setTimeout(() => { const el = document.getElementById('_jisr_sync_ui'); if (el) el.remove(); }, 30000);
  } catch (e) {
    try { clearInterval(tokenKeeper); } catch (_) {}
    msg('❌ ' + (e && e.message ? e.message : String(e)));
  }
})();
`
}

// bodyPdf — separate bookmarklet body that ONLY handles PDF download+upload.
// Reads the most recent print/contract responses from sbc_sync_debug, then
// for each (cr, lang, downloadUrl) attempts a direct browser fetch and
// upload to Supabase Storage. Direct browser fetch is the right approach
// here because the user is on a Saudi IP (printcr.mc.gov.sa is reachable
// from their network, unlike from Supabase edge functions which got
// network-blocked). CORS still applies — if printcr.mc.gov.sa doesn't allow
// e2.business.sa as an origin, this will fail and we'll need a different
// strategy (Cloudflare Worker with a Riyadh PoP, or a local script).
function bodyPdf({ personId, proxyBaseUrl }) {
  return `
(async () => {
  const U='${SUPABASE_URL}', K='${SUPABASE_ANON}';
  const PERSON='${personId}';
  const PROXY='${proxyBaseUrl}/.netlify/functions/proxy-sbc-pdf';

  const msg = (m) => {
    let d = document.getElementById('_jisr_sync_ui');
    if (!d) {
      d = document.createElement('div');
      d.id = '_jisr_sync_ui';
      d.style.cssText = 'position:fixed;top:16px;left:16px;background:#111;color:#B07D00;padding:12px 18px;border-radius:10px;z-index:2147483647;font:700 13px/1.5 sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.5);max-width:380px;direction:rtl;text-align:right;border:1px solid rgba(176,125,0,.35)';
      document.body.appendChild(d);
    }
    d.textContent = 'جسر PDFs: ' + m;
    return d;
  };

  const supaFetch = (path, opts) => fetch(U + path, {
    ...(opts || {}),
    headers: { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json', ...((opts && opts.headers) || {}) },
  });

  try {
    msg('قراءة روابط التحميل من قاعدة البيانات...');

    // Pull the most recent print/contract responses for this person.
    // We query each endpoint separately because PostgREST's in.(...) filter
    // breaks when the values contain parens — and 'mcV2/get-print-cr-by-
    // national-number(en)' contains "(en)" which closes the in.() syntax
    // early. (That's what caused our last PDF run to only see Arabic rows.)
    const personFilter = PERSON ? ('&person_id=eq.' + PERSON) : '';
    const eps = [
      { name: 'mcV2/get-print-cr-by-national-number', lang: 'ar' },
      { name: 'mcV2/get-print-cr-by-national-number(en)', lang: 'en' },
      { name: 'mcV2/get-print-cr-contract-by-national-number', lang: 'contract' },
    ];
    const allRows = [];
    for (const ep of eps) {
      const url = '/rest/v1/sbc_sync_debug'
        + '?endpoint=eq.' + encodeURIComponent(ep.name)
        + '&response_status=eq.200'
        + personFilter
        + '&order=created_at.desc&limit=2000';
      const r = await supaFetch(url);
      if (!r.ok) {
        const txt = await r.text().catch(() => '');
        return msg('❌ فشل قراءة ' + ep.lang + ': ' + r.status + ' ' + txt.slice(0, 120));
      }
      const arr = await r.json();
      for (const row of arr) row._lang = ep.lang;
      Array.prototype.push.apply(allRows, arr);
    }

    // Build dedup'd list of (cr, lang, downloadUrl). Newest row per pair wins
    // because each per-endpoint query was ordered desc; we mark the lang
    // from the query that pulled the row so it can't be misclassified.
    const seen = new Set();
    const targets = [];
    for (const r of allRows) {
      const cr = r.request_body && r.request_body.crNationalNumber;
      const dl = r.response_body && r.response_body.downloadUrl;
      if (!cr || !dl) continue;
      const k = cr + '|' + r._lang;
      if (seen.has(k)) continue;
      seen.add(k);
      targets.push({ cr: cr, lang: r._lang, dlUrl: dl });
    }

    if (targets.length === 0) {
      return msg('لا توجد روابط — شغّل بوكماركلت البيانات أولاً.');
    }

    msg('وُجد ' + targets.length + ' ملف للتحميل. جارٍ المعالجة...');

    let done = 0, ok = 0, fetchFail = 0, uploadFail = 0;
    const T0 = Date.now();

    // mapLimit-style worker pool, concurrency 3 for PDFs.
    const CONC = 3;
    let idx = 0;
    const worker = async () => {
      while (true) {
        const i = idx++;
        if (i >= targets.length) return;
        const t = targets[i];
        const fname = t.cr + '-' + t.lang + '.pdf';
        const storagePath = 'sbc-cr-certificates/' + fname;
        const tCall = Date.now();

        // Delegate to the Netlify proxy — it fetches printcr.mc.gov.sa
        // server-side and uploads directly to Storage. No CORS in the
        // browser path; the Lambda has its own egress that the source
        // server treats as a normal click-to-download.
        let proxyRes = null;
        let proxyErr = null;
        try {
          proxyRes = await fetch(PROXY, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ downloadUrl: t.dlUrl, bucket: 'documents', path: storagePath }),
          });
        } catch (e) { proxyErr = (e && e.message) || String(e); }

        const proxyStatus = proxyRes ? proxyRes.status : 0;
        let proxyPayload = null;
        if (proxyRes) {
          try { proxyPayload = await proxyRes.json(); } catch (_) { proxyPayload = null; }
        }
        const proxyOk = !!(proxyRes && proxyRes.ok && proxyPayload && proxyPayload.ok);
        const errMsg = proxyPayload && proxyPayload.error;

        if (proxyOk) ok++;
        else if (errMsg && /pdf fetch/i.test(errMsg)) fetchFail++;
        else uploadFail++;

        supaFetch('/rest/v1/sbc_sync_debug', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            person_id: PERSON || null,
            endpoint: 'storage/cr-certificate-pdf',
            request_method: 'POST',
            request_body: { bucket: 'documents', path: storagePath, downloadUrl: t.dlUrl, crNationalNumber: t.cr, lang: t.lang, via: 'netlify-proxy' },
            response_status: proxyStatus,
            response_body: proxyPayload,
            items_count: proxyOk ? 1 : 0,
            notes: proxyErr
              ? ('proxy net err [' + t.lang + ']: ' + proxyErr + ' · cr=' + t.cr)
              : proxyOk
                ? ('pdf via proxy [' + t.lang + '] · size=' + (proxyPayload.sizeBytes || 0) + 'B · ' + (Date.now() - tCall) + 'ms · cr=' + t.cr)
                : ('proxy fail [' + t.lang + ']: ' + (errMsg || ('HTTP ' + proxyStatus)) + ' · cr=' + t.cr),
          }),
        }).catch(() => {});

        done++;
        if (done % 5 === 0 || done === targets.length) {
          const elapsed = Math.round((Date.now() - T0) / 1000);
          msg('PDF ' + done + '/' + targets.length + ' · نجاح ' + ok + ' · فشل تحميل ' + fetchFail + ' · فشل رفع ' + uploadFail + ' · ' + elapsed + 's');
        }
      }
    };
    await Promise.all(Array.from({ length: CONC }, worker));

    const elapsed = Math.round((Date.now() - T0) / 1000);
    msg('✅ ' + ok + '/' + targets.length + ' PDF رُفع (فشل تحميل ' + fetchFail + ' · فشل رفع ' + uploadFail + ') في ' + elapsed + 's');
    setTimeout(() => { const el = document.getElementById('_jisr_sync_ui'); if (el) el.remove(); }, 25000);
  } catch (e) {
    msg('❌ ' + (e && e.message ? e.message : String(e)));
  }
})();
`
}

// bodyRequests — the «مزامنة من طلباتي» flow.
//
// Why this exists: get-crs-by-personal-identifier-number (the CR list the main
// flow walks) only returns records the person is an owner/partner/manager on.
// Companies established THROUGH this account but not owned by it never appear
// there, so they land in sbc_facilities as GOSI-only ghosts — a name and a CR
// number with no CR payload behind them. Those same companies DO appear under
// طلباتي, and each request exposes the full registration status.
//
// Origin matters: api.saudibusiness.gov.sa only allows the companies* backends
// from the companies.saudibusiness.gov.sa origin — calling them from
// e2.business.sa is a CORS failure with no workaround from the page. The
// reverse is fine: requestsapi accepts the companies origin as long as the
// requestsapi clientId is used. So this whole flow runs on the companies
// portal, and the dispatcher below routes to it by hostname.
//
// Two calls per request:
//   app/request?requestId={encryptedId}      → internal GUID + reference no
//   app/smartFlow/registrationStatus/{guid}  → mc.crNationalNumber + the
//                                              gosi/hrsd/coc/spl/zakat/sca/moj
//                                              file numbers
function bodyRequests({ personId }) {
  return `
(async () => {
  const U='${SUPABASE_URL}', K='${SUPABASE_ANON}';
  const GW='https://api.saudibusiness.gov.sa/sbc/externalgw';
  const REQ_API = GW + '/requestsapi/api/app';
  const CP_API = GW + '/companiesprocessingapi-nl/api/app';
  const PERSON='${personId}';
  const CID_REQ='${CLIENT_ID_REQUESTS}';
  const CID_CP='${CLIENT_ID_COMPANIES_PROCESSING}';

  const msg = (m) => {
    let d = document.getElementById('_jisr_sync_ui');
    if (!d) {
      d = document.createElement('div');
      d.id = '_jisr_sync_ui';
      d.style.cssText = 'position:fixed;top:16px;left:16px;background:#111;color:#B07D00;padding:12px 18px;border-radius:10px;z-index:2147483647;font:700 13px/1.5 sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.5);max-width:380px;direction:rtl;text-align:right;border:1px solid rgba(176,125,0,.35)';
      document.body.appendChild(d);
    }
    d.textContent = 'جسر طلباتي: ' + m;
    return d;
  };

  const supaFetch = (path, opts) => fetch(U + path, {
    ...(opts || {}),
    headers: { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json', ...((opts && opts.headers) || {}) },
  });

  let tokenKeeper = null;
  try {
    // Either portal works — the gateway keys off the token + clientId, not the
    // calling origin (verified 2026-07-17: requestList returns 200/805 from
    // e2.business.sa). Each portal parks its own OIDC user under a different
    // client name, so try both and use whichever this origin is logged into.
    // NOTE: minify() only strips comments on their OWN line and then joins every line
    // into one — an end-of-line comment here would swallow the rest of the array.
    // NewCompaniesClient = بوابة الشركات · InvestorPortal = تيسير / e2.business.sa
    const TOK_KEYS = [
      'oidc.user:https://www.saudibusiness.gov.sa:NewCompaniesClient',
      'oidc.user:https://www.saudibusiness.gov.sa:InvestorPortal',
    ];
    let tok = null, tokExp = null, tokIsCompanies = false, tokKey = null;
    for (const k of TOK_KEYS) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      try { const o = JSON.parse(raw); if (o.access_token) { tok = o.access_token; tokExp = o.expires_at || null; tokIsCompanies = k.endsWith('NewCompaniesClient'); tokKey = k; break; } } catch (_) {}
    }
    if (!tok) return msg('لم يتم تسجيل الدخول بنفاذ. سجّل الدخول ثم أعد المحاولة.');

    // Re-read the token per call so a long طلباتي run always sends a live one. The portal
    // does NOT auto-renew an idle tab, so a background keeper refreshes it via the
    // refresh_token grant a couple of minutes before expiry and writes it back — same
    // mechanism the CR-list flow uses. liveTok() then just reads the fresh value.
    const liveTok = () => {
      try { const o = JSON.parse(localStorage.getItem(tokKey) || '{}'); if (o.access_token) return o.access_token; } catch (_) {}
      return tok;
    };
    const refreshTok = async () => {
      let o; try { o = JSON.parse(localStorage.getItem(tokKey) || '{}'); } catch (_) { return; }
      if (!o || !o.refresh_token) return;
      const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: o.refresh_token, client_id: tokKey.split(':').pop() });
      const r = await fetch('https://www.saudibusiness.gov.sa/connect/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }).catch(() => null);
      if (!r || !r.ok) return;
      const j = await r.json().catch(() => null);
      if (!j || !j.access_token) return;
      o.access_token = j.access_token;
      if (j.refresh_token) o.refresh_token = j.refresh_token;
      o.expires_at = Math.floor(Date.now() / 1000) + (j.expires_in || 1800);
      localStorage.setItem(tokKey, JSON.stringify(o));
    };
    tokenKeeper = setInterval(async () => {
      try { const o = JSON.parse(localStorage.getItem(tokKey) || '{}'); const now = Math.floor(Date.now() / 1000); if (o.expires_at && o.expires_at - now < 120) await refreshTok(); } catch (_) {}
    }, 60000);

    // requestList answers from either origin, but companiesprocessingapi-nl — which
    // turns a request into a CR number — is CORS-locked to the companies portal
    // (re-verified 2026-07-17: it throws from e2.business.sa on every attempt).
    // Listing requests we can't resolve is pointless, so bail early on تيسير.
    if (!tokIsCompanies)
      return msg('طلباتي: افتح بوابة الشركات (companies.saudibusiness.gov.sa) واضغط الزر لجلب طلبات هذا الحساب.');

    // Park the portal token so the app can pull the PDFs server-side later.
    // The files can't be fetched from this page at all — see
    // netlify/functions/sbc-request-files.mjs for why — so the token is the
    // one thing this origin uniquely has and must hand over.
    await supaFetch('/rest/v1/sbc_sessions?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        id: 'companies',
        person_id: PERSON || null,
        access_token: tok,
        token_type: 'Bearer',
        expires_at: tokExp,
        client_id: CID_CP,
        updated_at: new Date().toISOString(),
      }),
    }).catch(() => {});

    // Accept-Language is what selects the CR certificate language — the crFile
    // endpoint takes no culture param; it echoes this header into the lang of
    // the printcr download URL it hands back.
    const hdrs = (cid, lang) => ({ clientId: cid, Authorization: 'Bearer ' + liveTok(), 'Accept-Language': lang || 'ar', 'X-Correlation-Id': crypto.randomUUID(), Accept: 'application/json' });

    const fetchWithRetry = async (url, cid, noRetryOn, lang) => {
      const MAX_ATTEMPTS = 3;
      const TIMEOUT_MS = 45000;
      const seen = [];
      let lastRes = null, lastErr = null;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
        let r = null;
        try { r = await fetch(url, { headers: hdrs(cid, lang), signal: ac.signal }); }
        catch (e) { lastErr = (e && e.message) || String(e); r = null; }
        finally { clearTimeout(timer); }
        if (!r) { seen.push(0); if (attempt < MAX_ATTEMPTS - 1) await new Promise(res => setTimeout(res, 1500 * (attempt + 1))); continue; }
        lastRes = r; seen.push(r.status);
        if (r.ok) return { res: r, seen, netErr: null };
        if (noRetryOn && noRetryOn(r.status)) return { res: r, seen, netErr: null };
        if (attempt >= MAX_ATTEMPTS - 1) return { res: r, seen, netErr: null };
        let waitMs = 1500 * (attempt + 1);
        if (r.status === 429) {
          const ra = r.headers.get('Retry-After');
          waitMs = 30000;
          if (ra) { const n = parseInt(ra, 10); if (Number.isFinite(n)) waitMs = Math.min(n * 1000, 120000); }
        }
        await new Promise(res => setTimeout(res, waitMs));
      }
      return { res: lastRes, seen, netErr: lastErr };
    };

    const jsonOf = async (r) => {
      if (!r) return null;
      const t = await r.text().catch(() => '');
      try { return t ? JSON.parse(t) : null; } catch (_) { return { _parseError: true, raw: t.slice(0, 500) }; }
    };

    const mapLimit = async (arr, limit, fn) => {
      const out = new Array(arr.length);
      let idx = 0;
      await Promise.all(Array.from({ length: limit }, async () => {
        while (true) {
          const i = idx++;
          if (i >= arr.length) return;
          try { out[i] = await fn(arr[i], i); } catch (e) { out[i] = null; }
        }
      }));
      return out;
    };

    // Files are deliberately NOT fetched here. The PDFs live behind
    // printcr.mc.gov.sa URLs that need a server-side hop, and this origin
    // cannot reach one: every request from companies.saudibusiness.gov.sa to
    // the local proxy stalls (the same call from e2.business.sa returns
    // instantly). The token parked above lets the app pull them instead —
    // see netlify/functions/sbc-request-files.mjs.

    msg('جلب قائمة الطلبات...');
    // PAGE_SIZE is a hard server limit — requestList 400s ("لا يمكن أن يكون
    // MaxResultCount ...") above 1000, so we page with SkipCount instead of
    // asking for everything at once.
    const PAGE_SIZE = 1000;
    const items = [];
    let total = null;
    let lastStatus = 0;
    for (let skip = 0; ; skip += PAGE_SIZE) {
      const listUrl = REQ_API + '/requestservice/requestList?SkipCount=' + skip + '&MaxResultCount=' + PAGE_SIZE + '&IsDelegator=false';
      const listRes = await fetchWithRetry(listUrl, CID_REQ);
      const listPayload = await jsonOf(listRes.res);
      lastStatus = listRes.res ? listRes.res.status : 0;
      if (!listRes.res || !listRes.res.ok) {
        return msg('❌ تعذّر جلب قائمة الطلبات: ' + (listRes.res ? ('HTTP ' + lastStatus) : ('شبكة: ' + listRes.netErr)));
      }
      const page = (listPayload && Array.isArray(listPayload.items)) ? listPayload.items : [];
      if (total === null) total = listPayload && listPayload.totalCount;
      Array.prototype.push.apply(items, page);
      await supaFetch('/rest/v1/sbc_sync_debug', {
        method: 'POST', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          person_id: PERSON || null,
          endpoint: 'requestsapi/requestList',
          request_method: 'GET',
          request_body: { SkipCount: skip, MaxResultCount: PAGE_SIZE, IsDelegator: false },
          response_status: lastStatus,
          response_body: listPayload,
          items_count: page.length,
          notes: 'via طلباتي · totalCount=' + total + ' · تراكمي=' + items.length,
        }),
      }).catch(() => {});
      if (!page.length || items.length >= (total || 0)) break;
      msg('جلب قائمة الطلبات... ' + items.length + '/' + total);
    }

    if (!items.length) return msg('لا توجد طلبات في هذا الحساب.');

    const targets = items.filter(it => it && it.encryptedId);
    // skipped: the companies backend 404s for anything that is not a company
    // formation it owns — cancelled/rejected requests, and whole service
    // families handled elsewhere (حجز اسم تجاري, الفرع الرقمي, تعديل الغرفة,
    // مؤسسة فردية). Those have no facility behind them, so a 404 here is a
    // normal outcome, not an error. Counted apart from the failure tally so
    // the summary does not cry wolf.
    const stats = { resolved: 0, skipped: 0, noCr: 0, failed: 0, saved: 0, saveFail: 0 };
    let done = 0;
    const T0 = Date.now();
    const fmt = (s) => Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
    const tick = () => {
      const el = Math.floor((Date.now() - T0) / 1000);
      let eta = '?';
      if (done > 0) eta = fmt(Math.ceil((targets.length - done) * (el / done)));
      msg('طلب ' + done + '/' + targets.length + ' · منشآت ' + stats.saved + ' · لا ينطبق ' + stats.skipped + ' · فشل ' + stats.failed + ' · مضى ' + fmt(el) + ' · متبقي ~' + eta);
    };
    const timer = setInterval(tick, 2000);
    tick();

    await mapLimit(targets, 3, async (it) => {
      try {
        const d1 = await fetchWithRetry(CP_API + '/request?requestId=' + encodeURIComponent(it.encryptedId), CID_CP, (s) => s === 404 || s === 403);
        if (d1.res && (d1.res.status === 404 || d1.res.status === 403)) { stats.skipped++; return; }
        const j1 = await jsonOf(d1.res);
        if (!d1.res || !d1.res.ok || !j1 || !j1.requestId) { stats.failed++; return; }

        const d2 = await fetchWithRetry(CP_API + '/smartFlow/registrationStatus/' + j1.requestId, CID_CP, (s) => s === 404 || s === 400 || s === 422);
        if (d2.res && d2.res.status === 404) { stats.skipped++; return; }
        const j2 = await jsonOf(d2.res);
        if (!d2.res || !d2.res.ok || !j2) { stats.failed++; return; }

        const cr = j2.mc && j2.mc.crNationalNumber;
        supaFetch('/rest/v1/sbc_sync_debug', {
          method: 'POST', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            person_id: PERSON || null,
            endpoint: 'companiesprocessingapi-nl/smartFlow/registrationStatus',
            request_method: 'GET',
            request_body: { requestId: j1.requestId, encryptedId: it.encryptedId, requestReference: it.requestReference, serviceCode: it.serviceCode },
            response_status: d2.res.status,
            response_body: j2,
            items_count: cr ? 1 : 0,
            notes: 'via طلباتي · cr=' + (cr || 'none') + ' · ' + (it.requestReference || '?'),
          }),
        }).catch(() => {});

        if (!cr) { stats.noCr++; return; }
        stats.resolved++;

        const up = await supaFetch('/rest/v1/rpc/bot_upsert_sbc_facility_from_request', {
          method: 'POST',
          body: JSON.stringify({
            p_person_id: PERSON || null,
            p_run_id: null,
            p_cr_national_number: String(cr),
            p_raw_status: j2,
            p_request_meta: {
              requestId: j1.requestId,
              requestReference: it.requestReference || j1.requestReferenceNumber || null,
              serviceCode: it.serviceCode || null,
              serviceNameAr: it.serviceNameAr || null,
              statusNameAr: it.statusNameAr || null,
            },
          }),
        }).catch(() => null);
        if (up && up.ok) stats.saved++; else stats.saveFail++;
      } finally {
        done++;
      }
    });

    clearInterval(timer);
    clearInterval(tokenKeeper);
    const el = Math.round((Date.now() - T0) / 1000);
    msg('✅ ' + targets.length + ' طلب · حُفظ ' + stats.saved + ' منشأة (فشل حفظ ' + stats.saveFail + ') · لا ينطبق ' + stats.skipped + ' · بلا سجل تجاري ' + stats.noCr + ' · فشل جلب ' + stats.failed + ' · في ' + el + 'ث · الملفات تُجلب من مركز المزامنة');
    setTimeout(() => { const e = document.getElementById('_jisr_sync_ui'); if (e) e.remove(); }, 30000);
  } catch (e) {
    try { clearInterval(tokenKeeper); } catch (_) {}
    msg('❌ ' + (e && e.message ? e.message : String(e)));
  }
})();
`
}

// One bookmarklet, both flows attempted on every click, in sequence. Each flow guards
// its own origin/token and bails harmlessly where it can't run, so the click does
// whatever the current portal allows:
//   تيسير            → CR-list sync (طلباتي bails: its resolver API is CORS-locked)
//   بوابة الشركات    → both (CR-list may also answer here)
// This matters because طلباتي is per-account and the user syncs several accounts —
// pairing it with every sync keeps the current account's requests from being missed.
//
// CR-list runs first: it seeds sbc_facilities, and طلباتي then fills the gaps (its RPC
// only COALESCEs into missing fields, so it can't clobber what CR-list wrote).
function bodyDispatch({ sourceId, personId, proxyBaseUrl }) {
  return `
(async () => {
  // Each flow is a self-invoking async IIFE, so it must be awaited — without this
  // they run concurrently and race each other's writes to the same sbc_facilities
  // rows. A failure in one must not skip the other, hence the separate try blocks.
  try {
    await ${body({ sourceId, personId, proxyBaseUrl })}
  } catch (e) {}
  try {
    await ${bodyRequests({ personId })}
  } catch (e) {}
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

export function buildBookmarklet({ sourceId, personId, proxyBaseUrl }) {
  return 'javascript:' + encodeURIComponent(minify(bodyDispatch({ sourceId, personId, proxyBaseUrl })))
}

export function buildPdfBookmarklet({ personId, proxyBaseUrl }) {
  return 'javascript:' + encodeURIComponent(minify(bodyPdf({ personId, proxyBaseUrl })))
}

export const SBC_SYNC_BOOKMARKLET = buildBookmarklet({ sourceId: 'sbc', personId: '' })
