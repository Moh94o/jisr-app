// Muqeem sync bookmarklet — runs on muqeem.sa and pulls the active org's
// data plus the full list of MOI numbers the account has access to.
//
// Auth pattern (different from Qiwa):
//   - JWT in localStorage / sessionStorage (we sniff for it by detecting an
//     "eyJ..." value whose decoded payload contains a moiNumber claim)
//   - X-Xsrf-Token header must match the XSRF-TOKEN cookie value
//   - Cookies are auto-included with credentials: 'include'
//
// CORS is same-origin (muqeem.sa) so any endpoint under muqeem.sa works.

const SUPABASE_URL = 'https://gcvshzutdslmdkwqwteh.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdnNoenV0ZHNsbWRrd3F3dGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTkwNjgsImV4cCI6MjA5MDQ3NTA2OH0.5R0I5VvB7lp3wpSrtay3DMcXKsT9l1uK0Ukd1F4_ImM'

function body({ sourceId, personId, proxyBaseUrl }) {
  return `
(async () => {
  const U = '${SUPABASE_URL}', K = '${SUPABASE_ANON}';
  const SOURCE = '${sourceId}', PERSON = '${personId}';
  const API = 'https://muqeem.sa';
  // Muqeem CSP blocks fetch to supabase.co AND blocks fetch to any
  // cross-origin (including our Netlify proxy). The only way out is to
  // open a new tab on the Jisr origin (window.open isn't bound by CSP)
  // and pipe Supabase requests through it via postMessage.
  const BRIDGE_URL = '${proxyBaseUrl}/muqeem-bridge.html';

  const msg = (m) => {
    let d = document.getElementById('_jisr_muqeem_ui');
    if (!d) {
      d = document.createElement('div'); d.id = '_jisr_muqeem_ui';
      d.style.cssText = 'position:fixed;top:16px;left:16px;background:#111;color:#f59e0b;padding:12px 18px;border-radius:10px;z-index:2147483647;font:700 13px/1.5 sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.5);max-width:380px;direction:rtl;text-align:right;border:1px solid rgba(245,158,11,.4)';
      document.body.appendChild(d);
    }
    d.textContent = 'جسر مقيم: ' + m;
    return d;
  };

  // Bridge state — opened lazily by ensureBridge() the first time a Supabase
  // call is made. Bookmarklet → bridge tab postMessage RPC.
  let bridgeWin = null;
  let bridgeReady = false;
  const pending = new Map();
  let nextReqId = 0;
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || typeof d !== 'object') return;
    if (d.ready) { bridgeReady = true; return; }
    if (d.id && pending.has(d.id)) {
      pending.get(d.id)(d);
      pending.delete(d.id);
    }
  });
  const ensureBridge = async () => {
    if (bridgeWin && !bridgeWin.closed && bridgeReady) return;
    if (!bridgeWin || bridgeWin.closed) {
      bridgeWin = window.open(BRIDGE_URL, 'jisr_muqeem_bridge');
      if (!bridgeWin) throw new Error('فشل فتح تبويب الجسر — فعّل النوافذ المنبثقة (popups)');
      bridgeReady = false;
    }
    // Send hello pings until the bridge ACKs ready (up to 30s).
    const deadline = Date.now() + 30000;
    while (!bridgeReady && Date.now() < deadline) {
      try { bridgeWin.postMessage({ hello: true }, '*'); } catch (_) {}
      await new Promise(r => setTimeout(r, 250));
      if (bridgeWin.closed) throw new Error('تبويب الجسر أُغلق قبل بدء المزامنة');
    }
    if (!bridgeReady) throw new Error('تبويب الجسر لم يستجب خلال 30 ثانية');
  };
  // Fetch-like wrapper. Sends the Supabase request to the bridge tab via
  // postMessage and resolves with a Response-shaped object.
  const supaFetch = async (path, opts = {}) => {
    await ensureBridge();
    const id = 'req_' + (++nextReqId);
    const reply = await new Promise((resolve, reject) => {
      pending.set(id, resolve);
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('timeout from bridge after 45s')); }, 45000);
      try {
        bridgeWin.postMessage({ id, path, method: opts.method || 'POST', headers: opts.headers || {}, body: opts.body || null }, '*');
      } catch (e) {
        clearTimeout(timer); pending.delete(id); reject(e);
      }
    });
    const text = reply.body || '';
    return {
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      text: async () => text,
      json: async () => { try { return JSON.parse(text) } catch { return null } },
    };
  };

  // Find the Muqeem JWT by sniffing storage. Newer Muqeem versions stopped
  // putting moiNumber in the JWT payload (or moved to cookie-only auth), so
  // we accept ANY JWT here and extract moiNumber from /api/organization/details
  // later. If no JWT at all, we still proceed and let cookies carry auth.
  const decodeJwt = (t) => { try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch { return null } };
  const looksLikeJwt = (s) => typeof s === 'string' && s.startsWith('eyJ') && s.split('.').length === 3 && s.length > 30;
  // Match any eyJ... substring (handles tokens wrapped in arbitrary JSON or
  // string padding). We then validate by trying to decode the payload.
  const JWT_RE = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
  const harvestJwtsFromString = (s, out) => {
    if (typeof s !== 'string') return;
    const matches = s.match(JWT_RE);
    if (matches) for (const m of matches) if (looksLikeJwt(m) && decodeJwt(m)) out.push(m);
  };
  const findMuqeemJwt = () => {
    const found = [];
    const pushFromStorage = (storage, label) => {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i); if (!key) continue;
        const raw = storage.getItem(key);
        const before = found.length;
        harvestJwtsFromString(raw, found);
        // Tag each newly-pushed token with its source key for diagnostics.
        for (let j = before; j < found.length; j++) found[j] = { token: found[j], source: label + ':' + key };
      }
    };
    pushFromStorage(localStorage, 'local');
    pushFromStorage(sessionStorage, 'session');
    // Cookies — non-HttpOnly only. JS can't see HttpOnly tokens.
    for (const pair of document.cookie.split('; ')) {
      const eq = pair.indexOf('='); if (eq < 0) continue;
      const name = pair.slice(0, eq);
      let raw = pair.slice(eq + 1); try { raw = decodeURIComponent(raw) } catch {}
      const before = found.length;
      harvestJwtsFromString(raw, found);
      for (let j = before; j < found.length; j++) found[j] = { token: found[j], source: 'cookie:' + name };
    }
    if (found.length === 0) return null;
    // Decode each, prefer the one with moiNumber, then the most-recently-issued.
    const decorated = found.map(f => ({ ...f, payload: decodeJwt(f.token) || {} }));
    const withMoi = decorated.find(d => d.payload.moiNumber);
    if (withMoi) return withMoi;
    // Sort by 'iat' (issued-at) descending so we pick the freshest token.
    decorated.sort((a, b) => (b.payload.iat || 0) - (a.payload.iat || 0));
    return decorated[0];
  };
  const getCookie = (name) => {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.$?*|{}()[\\]\\\\\\/+^]/g, '\\\\$&') + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  };
  const getXsrf = () => {
    for (const name of ['XSRF-TOKEN', 'xsrf-token', 'csrf-token', 'CSRF-TOKEN', 'xsrf_token', '_csrf']) {
      const v = getCookie(name); if (v) return { v, name };
    }
    return { v: null, name: null };
  };

  try {
    if (!location.hostname.endsWith('muqeem.sa')) return msg('افتح مقيم أولاً (muqeem.sa)');

    // Install a fetch interceptor that quietly captures the Authorization
    // header (and X-Xsrf-Token) from any request the Muqeem SPA makes. The
    // user just has to navigate around the portal — once the page fires its
    // first authenticated API call, we have what we need.
    const captured = { token: null, xsrf: null, apiOrigin: null };
    const origFetch = window.fetch;
    window.fetch = function (input, init) {
      try {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        // Pull headers from either the init object or a Request object.
        const src = (init && init.headers) || (input instanceof Request ? input.headers : null);
        const h = {};
        if (src instanceof Headers) src.forEach((v, k) => { h[k.toLowerCase()] = v; });
        else if (src && typeof src === 'object') for (const k of Object.keys(src)) h[k.toLowerCase()] = src[k];
        const authH = h['authorization'];
        if (!captured.token && typeof authH === 'string' && authH.toLowerCase().startsWith('bearer ')) {
          captured.token = authH.slice(7).trim();
        }
        const xH = h['x-xsrf-token'] || h['xsrf-token'] || h['x-csrf-token'];
        if (!captured.xsrf && xH) captured.xsrf = xH;
        if (!captured.apiOrigin && typeof url === 'string' && url.indexOf('/api/') >= 0) {
          try { captured.apiOrigin = new URL(url, location.href).origin; } catch {}
        }
      } catch (_) {}
      return origFetch.apply(this, arguments);
    };

    // Start by snapshotting what's already in storage — if a fresh token is
    // sitting in localStorage we use it immediately.
    let auth = findMuqeemJwt();
    if (auth?.token) captured.token = auth.token;
    const xsrfCookie = getXsrf();
    if (xsrfCookie.v) captured.xsrf = captured.xsrf || xsrfCookie.v;

    // The user navigates by themselves — we just sit on the page they're on
    // with the interceptor installed and wait. Auto-navigating via location.hash
    // turned out to fight the Muqeem SPA's own router (and on some landing
    // pages a hash change kicks off a full redirect that kills the bookmarklet).
    msg('افتح صفحة «التقارير → المقيمين» في تبويب مقيم — راح ألتقط الجلسة تلقائياً.');
    // Poll for up to 120s for the interceptor to capture a token.
    const deadline = Date.now() + 120000;
    while (!captured.token && Date.now() < deadline) {
      msg('بانتظار جلسة مقيم — افتح أي صفحة من القائمة (مثلاً «المقيمين»). ' + Math.ceil((deadline - Date.now()) / 1000) + 'ث');
      await new Promise(r => setTimeout(r, 500));
      // Re-check storage too — login flows can drop a fresh token mid-wait.
      if (!captured.token) { const a2 = findMuqeemJwt(); if (a2?.token) captured.token = a2.token; }
    }
    if (!captured.token) {
      return msg('❌ ما لقيت جلسة مقيم بعد 90ث. سجّل دخول من جديد ثم أعد المحاولة.');
    }

    const token = captured.token;
    const xsrf = { v: captured.xsrf || null, name: xsrfCookie.name };
    auth = { token, payload: decodeJwt(token) || {}, source: auth?.source || 'intercepted' };
    let payload = auth.payload;
    let moi = payload.moiNumber || null;
    // Some captured fetches go through a sibling subdomain (api.muqeem.sa etc).
    // Honor that if we saw it on the wire — otherwise fall back to same-origin.
    const apiBase = captured.apiOrigin || API;

    const headers = {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'ar-ly',
      'Authorization': 'Bearer ' + token,
    };
    if (xsrf.v) headers['X-Xsrf-Token'] = xsrf.v;

    // Build a single-line diagnostic snapshot used in any later auth/moi failure.
    const lsKeys = []; for (let i = 0; i < localStorage.length; i++) lsKeys.push(localStorage.key(i));
    const ssKeys = []; for (let i = 0; i < sessionStorage.length; i++) ssKeys.push(sessionStorage.key(i));
    const cookieNames = document.cookie.split('; ').map(s => s.split('=')[0]).filter(Boolean);
    const truncate = (a, n) => a.length > n ? a.slice(0, n).concat(['+' + (a.length - n)]) : a;
    const diag = '·jwt=' + auth.source
      + (xsrf.v ? '·xsrf=' + (xsrf.name || 'intercepted') : '·no-xsrf')
      + '·api=' + apiBase
      + '·ls[' + lsKeys.length + ']=' + truncate(lsKeys, 6).join(',')
      + '·ck[' + cookieNames.length + ']=' + truncate(cookieNames, 6).join(',');

    if (!moi) {
      msg('جلب رقم المنشأة من السياق...');
      try {
        const r = await origFetch(apiBase + '/api/organization/details', { credentials: 'include', headers });
        if (r.ok) {
          const det = await r.json().catch(() => null);
          if (det) {
            moi = det.moiNumber || det.organizationId || det.id || null;
            if (!moi && det.crInfoDTO?.crEntityNumber) moi = String(det.crInfoDTO.crEntityNumber);
          }
        } else if (r.status === 401 || r.status === 403) {
          return msg('❌ غير مصرّح (' + r.status + '). ' + diag);
        }
      } catch (e) {
        return msg('❌ فشل الاتصال بـapi مقيم: ' + ((e && e.message) || e) + ' ' + diag);
      }
    }
    if (!moi) {
      return msg('❌ ما لقيت رقم المنشأة. ' + diag);
    }
    moi = String(moi);

    const muq = async (path, opts = {}) => {
      try {
        const r = await origFetch(apiBase + path, { credentials: 'include', ...opts, headers: { ...headers, ...(opts.headers || {}) } });
        if (!r.ok) return { ok: false, status: r.status };
        const text = await r.text();
        let data; try { data = JSON.parse(text) } catch { data = text }
        return { ok: true, data };
      } catch (e) { return { ok: false, error: String(e?.message || e) }; }
    };
    const muqPost = (path, body) => muq(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });

    // PDF download helper — returns a Blob (or null on failure). Differs from
    // muq() because the response is binary, not JSON.
    const muqPostPdf = async (path, body, contentType = 'application/json') => {
      try {
        const r = await origFetch(apiBase + path, {
          method: 'POST',
          credentials: 'include',
          headers: { ...headers, 'Content-Type': contentType },
          body: contentType === 'application/json' ? JSON.stringify(body) : body,
        });
        if (!r.ok) return null;
        const blob = await r.blob();
        return blob;
      } catch (e) { return null; }
    };
    // Upload a Blob to Supabase Storage and return the public URL on success.
    const uploadPdf = async (path, blob) => {
      try {
        const r = await fetch(U + '/storage/v1/object/muqeem-pdfs/' + path, {
          method: 'POST',
          headers: { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/pdf', 'x-upsert': 'true' },
          body: blob,
        });
        if (!r.ok) return null;
        return path;
      } catch (e) { return null; }
    };

    // First Supabase round-trip — opens the bridge tab (via window.open)
    // and waits for its ready handshake before sending anything. Any error
    // here is surfaced verbatim so the user knows whether to allow popups,
    // re-open the bridge, etc.
    msg('فتح تبويب الجسر — اسمح بالنوافذ المنبثقة إذا طُلب...');
    let runRes;
    try {
      runRes = await supaFetch('/rest/v1/sync_runs?select=id', {
        method: 'POST', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ source_id: SOURCE, person_id: PERSON, status: 'running' }),
      });
    } catch (e) {
      return msg('❌ ' + ((e && e.message) || e));
    }
    if (!runRes.ok) {
      return msg('❌ Supabase رفض الطلب (HTTP ' + runRes.status + ')');
    }
    const runArr = await runRes.json();
    const runId = Array.isArray(runArr) ? runArr[0]?.id : runArr.id;

    // 1) Full account-wide list of facilities (lightweight — moiNumber + name)
    msg('جلب قائمة المنشآت...');
    const list = await muq('/api/organization/related-moi-numbers-with-names');
    let listCount = 0;
    if (list.ok && Array.isArray(list.data) && list.data.length) {
      const rows = list.data.map(x => ({
        moi_number: String(x.moiNumber),
        name_ar: x.name || null,
        synced_at: new Date().toISOString(),
      }));
      await supaFetch('/rest/v1/muqeem_companies?on_conflict=moi_number', {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(rows),
      });
      listCount = rows.length;
    }

    // 2) Current org's rich data — runs in parallel.
    msg('جلب تفاصيل المنشأة...');
    const userLogin = payload.operatorId || moi;
    const year = new Date().getFullYear();
    const [details, subOverview, subAll, pointBal, pointPools, remainingUsers, smsBal, stats] = await Promise.all([
      muq('/api/organization/details'),
      muq('/api/subscriptions/business/overview'),
      muq('/api/subscriptions/business/all'),
      muq('/api/point/balance'),
      muq('/api/point/pools'),
      muqPost('/api/user-management/users/remaining-users'),
      muq('/api/paid-sms/balance'),
      muqPost('/api/report/v1/stats', { userLogin, moiNumber: moi, year }),
    ]);

    const patch = { moi_number: moi, synced_at: new Date().toISOString() };
    // detail_synced_at — only set when we have organization details (so the
    // tracker can distinguish "list-only" rows from fully-synced ones).
    if (details.ok && details.data) patch.detail_synced_at = new Date().toISOString();

    if (details.ok && details.data) {
      const d = details.data;
      patch.organization_details_raw = d;
      patch.organization_id  = d.id ?? null;
      patch.name_ar          = d.nameAr || null;
      patch.name_en          = d.nameEn || null;
      patch.short_name_ar    = d.shortNameAr || null;
      patch.short_name_en    = d.shortNameEn || null;
      patch.owner_name       = d.ownerName || null;
      patch.phone_number     = d.phoneNumber != null ? String(d.phoneNumber) : null;
      patch.fax_number       = d.faxNumber || null;
      patch.cci_number       = d.cciNumber || null;
      patch.cci_issue_date_h = d.cciIssueDateH || null;
      const c = d.crInfoDTO || {};
      patch.has_cr           = c.hasCr ?? null;
      patch.cr_name          = c.crName || null;
      patch.cr_number        = c.crNumber || null;
      patch.cr_entity_number = c.crEntityNumber || null;
      patch.cr_issue_date    = c.crIssueDate || null;
      patch.cr_expiry_date   = c.crExpiryDate || null;
      patch.cr_status        = c.crStatus || null;
      patch.cr_activities    = c.crActivities || null;
      patch.business_type    = c.businessType || null;
      const a = d.address || {};
      patch.city_id           = a.cityId ?? null;
      patch.city_name         = a.cityName || null;
      patch.city_name_en      = a.cityNameEn || null;
      patch.district          = a.district || null;
      patch.district_en       = a.districtEn || null;
      patch.building_number   = a.buildingNumber ?? null;
      patch.additional_number = a.additionalNumber ?? null;
      patch.zip_code          = a.zipCode ?? null;
      patch.unit_no           = a.unitNo ?? null;
      patch.street_name       = a.streetName || null;
      patch.street_name_en    = a.streetNameEn || null;
      const b = d.billingAddress || {};
      patch.vat_number          = b.vatNumber || null;
      patch.billing_address_raw = b;
      patch.service_provider_name_ar = d.serviceProviderNameAr || null;
      patch.service_provider_name_en = d.serviceProviderNameEn || null;
      patch.service_provider_contact = d.serviceProviderContactNumber || null;
      patch.service_provider_location = d.serviceProviderLocation || null;
      patch.approval_otp_activated = d.approvalOTPActivated ?? null;
      patch.approval_otp_allowed   = d.approvalOTPAllowed ?? null;
    }
    if (pointBal.ok && pointBal.data) {
      patch.point_balance       = pointBal.data.pointsBalance ?? null;
      patch.point_total_pending = pointBal.data.totalPending ?? null;
    }
    if (smsBal.ok) {
      // /api/paid-sms/balance returns a bare number (e.g. 0) — coerce.
      const v = smsBal.data;
      patch.sms_balance = typeof v === 'number' ? v : (Number.isFinite(Number(v)) ? Number(v) : null);
    }
    if (subOverview.ok && subOverview.data) {
      patch.subscription_overview_raw = subOverview.data;
      const ls = subOverview.data.latestSubscription || {};
      patch.latest_subscription_id    = ls.subscriptionId ?? null;
      patch.latest_package_id         = ls.packageId ?? null;
      patch.latest_package_name_ar    = ls.packageNameAr || null;
      patch.latest_package_name_en    = ls.packageNameEn || null;
      patch.latest_resident_count_from = ls.residentCountFrom ?? null;
      patch.latest_resident_count_to  = ls.residentCountTo ?? null;
      patch.latest_start_date         = ls.startDate || null;
      patch.latest_expiry_date        = ls.expiryDate || null;
      patch.latest_status_code        = ls.statusCode || null;
      patch.latest_invoice_id         = ls.invoiceId ?? null;
      patch.subscription_expired      = subOverview.data.expired ?? null;
      patch.has_waiting_payment_sub   = subOverview.data.waitingForPaymentSubscription != null;
      patch.has_future_sub            = subOverview.data.futureSubscription != null;
    }
    if (stats.ok && stats.data)         patch.monthly_stats_raw     = stats.data;
    if (pointPools.ok && pointPools.data) patch.point_pools_raw     = pointPools.data;
    if (remainingUsers.ok && remainingUsers.data) patch.remaining_users_raw = remainingUsers.data;

    // 3) Residents — count + full list (paginated, page_size=1000).
    msg('جلب المقيمين...');
    const rCount = await muqPost('/api/report/residents-count', { moiNumber: moi });
    if (rCount.ok && rCount.data) {
      patch.residents_count_raw = rCount.data;
      patch.residents_count = rCount.data.residentsCount ?? null;
    }
    // 4) The 10 history reports + finance — all in parallel.
    msg('جلب التقارير...');
    const reportBody = { moiNumber: moi };
    const PER = '?page=0&size=1000';
    const [
      rIssued, rRenewed, rIssuedER, rExtER, rExtVisit, rFinal, rProbFinal,
      rChangeOcc, rTransferred, rDrop, rTranslated,
      rPoints, rPayments,
    ] = await Promise.all([
      muqPost('/api/report/issued-iqama' + PER + '&sort=newIQamaNumber,ASC', reportBody),
      muqPost('/api/report/renewed-iqama' + PER + '&sort=alienId,ASC', reportBody),
      muqPost('/api/report/issued-exit-reentry-visa' + PER + '&sort=alienId,ASC', reportBody),
      muqPost('/api/report/extended-exit-reentry-visa' + PER + '&sort=alienId,ASC', reportBody),
      muqPost('/api/report/extended-visit-visa' + PER + '&sort=visitorID,ASC', reportBody),
      muqPost('/api/report/final-exit' + PER + '&sort=alienId,ASC', reportBody),
      muqPost('/api/report/issue-final-exit-during-the-probationary-period' + PER + '&sort=borderID,ASC', reportBody),
      muqPost('/api/report/change-occupation' + PER + '&sort=alienId,ASC', reportBody),
      muqPost('/api/report/transferred-iqama' + PER + '&sort=alienID,ASC', reportBody),
      muqPost('/api/report/drop-resident' + PER + '&sort=alienID,ASC', reportBody),
      muqPost('/api/report/update-translated-name' + PER + '&sort=personId,ASC', reportBody),
      muqPost('/api/report/points-transaction?page=0&size=1000&sort=createdBy,ASC', reportBody),
      muqPost('/api/report/payment-history?page=0&size=1000&sort=startDate,ASC', reportBody),
    ]);
    // Helper to extract the row count from common Muqeem response shapes.
    const reportCount = (r) => {
      if (!r?.ok || !r.data) return null;
      const d = r.data;
      if (Array.isArray(d)) return d.length;
      if (Array.isArray(d.content)) return d.totalElements ?? d.content.length;
      if (Array.isArray(d.rows)) return d.totalElements ?? d.rows.length;
      return d.totalElements ?? d.total ?? null;
    };
    const assign = (rep, rawKey, countKey) => {
      if (rep?.ok && rep.data) {
        patch[rawKey] = rep.data;
        patch[countKey] = reportCount(rep);
      }
    };
    assign(rIssued,      'report_issued_iqama_raw',         'report_issued_iqama_count');
    assign(rRenewed,     'report_renewed_iqama_raw',        'report_renewed_iqama_count');
    assign(rIssuedER,    'report_issued_er_visa_raw',       'report_issued_er_visa_count');
    assign(rExtER,       'report_extended_er_visa_raw',     'report_extended_er_visa_count');
    assign(rExtVisit,    'report_extended_visit_visa_raw',  'report_extended_visit_visa_count');
    assign(rFinal,       'report_final_exit_raw',           'report_final_exit_count');
    assign(rProbFinal,   'report_probation_final_exit_raw', 'report_probation_final_exit_count');
    assign(rChangeOcc,   'report_change_occupation_raw',    'report_change_occupation_count');
    assign(rTransferred, 'report_transferred_iqama_raw',    'report_transferred_iqama_count');
    assign(rDrop,        'report_drop_resident_raw',        'report_drop_resident_count');
    assign(rTranslated,  'report_update_translated_name_raw','report_update_translated_name_count');

    // 4b) Download residents-report PDF (Muqeem-generated, public-side accurate).
    // Same-origin so no CORS issue; we POST the search filter and stream the
    // PDF to Supabase Storage. Skip silently if it fails.
    msg('تنزيل تقرير المقيمين PDF...');
    const todayStr = new Date().toISOString().slice(0, 10);
    const reportPdf = await muqPostPdf('/api/report/residents/print?dependants=false', {
      basicSearch: false,
      sponsorNumber: { equals: moi },
    });
    if (reportPdf && reportPdf.size > 1000) {
      const path = 'residents-report/' + moi + '/' + todayStr + '.pdf';
      const uploaded = await uploadPdf(path, reportPdf);
      if (uploaded) {
        patch.residents_report_pdf_path = uploaded;
        patch.residents_report_pdf_at = new Date().toISOString();
      }
    }

    msg('حفظ بيانات المنشأة...');
    await supaFetch('/rest/v1/muqeem_companies?on_conflict=moi_number', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([patch]),
    });

    // 5) Resident rows — loop pages until we have them all. The Muqeem
    // backend returns at least three different shapes depending on which
    // sub-app the report comes from (rows[], content[], or bare arrays),
    // so we pick whichever array we find. Two endpoints exist; try both.
    const extractRows = (d) => {
      if (!d) return null;
      if (Array.isArray(d)) return d;
      if (Array.isArray(d.rows)) return d.rows;
      if (Array.isArray(d.content)) return d.content;
      if (Array.isArray(d.data)) return d.data;
      if (Array.isArray(d.items)) return d.items;
      return null;
    };
    msg('جلب المقيمين...');
    const allResidents = [];
    const residentsEndpoints = [
      '/api/report/residents',
      '/api/report/active-residents',
      '/api/report/active-aliens',
    ];
    let endpointWorks = null;
    outer: for (const ep of residentsEndpoints) {
      for (let page = 0; page < 50; page++) {
        const rr = await muqPost(ep + '?page=' + page + '&size=1000&sort=iqamaNumber,ASC&dependants=false', { moiNumber: moi });
        if (!rr.ok) {
          if (page === 0) continue outer;
          break;
        }
        const rows = extractRows(rr.data);
        if (!rows) {
          if (page === 0) continue outer;
          break;
        }
        if (rows.length === 0) {
          if (page === 0) continue outer;
          break;
        }
        if (!endpointWorks) endpointWorks = ep;
        allResidents.push(...rows);
        if (rows.length < 1000) break;
      }
      if (endpointWorks) break;
    }
    msg('جلب المقيمين: ' + allResidents.length + (endpointWorks ? ' (' + endpointWorks + ')' : ' — لم يُعَدّ أي شكل response مفهوم'));
    // 5b) Per-resident profile PDFs — bounded concurrency so a 100-resident
    // facility doesn't fire 100 simultaneous PDF generations on Muqeem.
    const profilePdfPaths = new Map();
    if (allResidents.length > 0) {
      msg('تنزيل ملفات المقيمين PDF (' + allResidents.length + ')...');
      const CONCURRENCY = 3;
      let cursor = 0;
      const worker = async () => {
        while (cursor < allResidents.length) {
          const i = cursor++;
          const r = allResidents[i];
          const iqn = String(r.iqamaNumber);
          const blob = await muqPostPdf('/api/alien/iqama/print', iqn, 'text/plain');
          if (blob && blob.size > 1000) {
            const path = 'iqama-profile/' + moi + '/' + iqn + '/' + todayStr + '.pdf';
            const uploaded = await uploadPdf(path, blob);
            if (uploaded) profilePdfPaths.set(iqn, uploaded);
          }
        }
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    }

    if (allResidents.length > 0) {
      const resRows = allResidents.map(r => {
        const iqn = String(r.iqamaNumber);
        const pdfPath = profilePdfPaths.get(iqn);
        const row = {
        iqama_number: iqn,
        sponsor_moi_number: r.sponsorNumber ? String(r.sponsorNumber) : null,
        name_ar: r.name?.nameAr || null,
        name_en: r.name?.nameEn || null,
        gender_code: r.gender?.code || null,
        gender_ar: r.gender?.ar || null,
        gender_en: r.gender?.en || null,
        nationality_code: r.nationality?.code || null,
        nationality_ar: r.nationality?.ar || null,
        nationality_en: r.nationality?.en || null,
        occupation_code: r.occupation?.code || null,
        occupation_ar: r.occupation?.ar || null,
        occupation_en: r.occupation?.en || null,
        passport_number: r.passportNumber || null,
        passport_expiry: r.passportExpiryDate || null,
        status_code: r.status?.code || null,
        status_ar: r.status?.ar || null,
        status_en: r.status?.en || null,
        iqama_issue_date: r.iqamaIssueDate || null,
        iqama_expiry_date: r.iqamaExpiryDate || null,
        iqama_expiry_hijri: r.hijriIqamaExpiryDate || null,
        birth_date: r.birthDate || null,
        is_outside_kingdom: r.isOutsideTheKingdom ?? null,
        raw: r,
        synced_at: new Date().toISOString(),
        };
        // Only set the PDF columns if we have a fresh path — avoids
        // null-overwriting a previously-saved path when a re-sync fails.
        if (pdfPath) {
          row.profile_pdf_path = pdfPath;
          row.profile_pdf_at = new Date().toISOString();
        }
        return row;
      });
      // chunk to keep request size reasonable
      const chunk = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };
      for (const part of chunk(resRows, 100)) {
        await supaFetch('/rest/v1/muqeem_residents?on_conflict=iqama_number', {
          method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(part),
        });
      }
    }

    // 6) Points + payment history — flatten arrays into rows.
    const pointsRows = (rPoints?.data?.content || rPoints?.data?.rows || (Array.isArray(rPoints?.data) ? rPoints.data : [])).map(p => ({
      external_id: String(p.id ?? p.transactionId ?? '') || null,
      moi_number: moi,
      created_by: p.createdBy || null,
      created_at_muqeem: p.createdDate || p.created_at || p.transactionDate || null,
      amount: p.amount ?? p.points ?? null,
      transaction_type: p.type || p.transactionType || null,
      description: p.description || p.transactionDescription || null,
      raw: p,
      synced_at: new Date().toISOString(),
    })).filter(r => r.external_id);
    if (pointsRows.length > 0) {
      await supaFetch('/rest/v1/muqeem_points_transactions?on_conflict=external_id', {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(pointsRows),
      });
    }
    const paymentRows = (rPayments?.data?.content || rPayments?.data?.rows || (Array.isArray(rPayments?.data) ? rPayments.data : [])).map(p => ({
      external_id: String(p.id ?? p.invoiceId ?? p.paymentId ?? '') || null,
      moi_number: moi,
      invoice_id: p.invoiceId ?? null,
      package_id: p.packageId ?? null,
      package_name_ar: p.packageNameAr || null,
      start_date: p.startDate || null,
      expiry_date: p.expiryDate || null,
      amount: p.amount ?? p.totalAmount ?? null,
      status: p.status || p.statusCode || null,
      raw: p,
      synced_at: new Date().toISOString(),
    })).filter(r => r.external_id);
    if (paymentRows.length > 0) {
      await supaFetch('/rest/v1/muqeem_payment_history?on_conflict=external_id', {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(paymentRows),
      });
    }

    // 3) Subscription history — one row per subscriptionId.
    if (subAll.ok && Array.isArray(subAll.data) && subAll.data.length) {
      const subRows = subAll.data.map(s => ({
        subscription_id: s.subscriptionId,
        moi_number: moi,
        package_id: s.packageId ?? null,
        package_name_ar: s.packageNameAr || null,
        package_name_en: s.packageNameEn || null,
        resident_count_from: s.residentCountFrom ?? null,
        resident_count_to: s.residentCountTo ?? null,
        start_date: s.startDate || null,
        expiry_date: s.expiryDate || null,
        original_expiry_date: s.originalExpiryDate || null,
        extension_expiry_date: s.extensionExpiryDate || null,
        status_code: s.statusCode || null,
        invoice_id: s.invoiceId ?? null,
        can_renew: s.canRenew ?? null,
        can_be_upgraded: s.canBeUpgraded ?? null,
        can_cancel: s.canCancel ?? null,
        raw: s,
        synced_at: new Date().toISOString(),
      }));
      await supaFetch('/rest/v1/muqeem_subscriptions?on_conflict=subscription_id', {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(subRows),
      });
    }

    if (runId) {
      await supaFetch('/rest/v1/sync_runs?id=eq.' + runId, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'success', completed_at: new Date().toISOString(), records_fetched: listCount }),
      });
    }

    msg('✅ ' + listCount + ' منشأة + ' + allResidents.length + ' مقيم — ' + moi);
    setTimeout(() => { document.getElementById('_jisr_muqeem_ui')?.remove(); }, 8000);
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

export function buildMuqeemBookmarklet({ sourceId, personId, proxyBaseUrl }) {
  return 'javascript:' + encodeURIComponent(minify(body({ sourceId, personId, proxyBaseUrl })))
}
