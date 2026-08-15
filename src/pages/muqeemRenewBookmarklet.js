// Muqeem iqama-renewal bookmarklet — per-worker, runs on muqeem.sa.
//
// Unlike the establishment SYNC bookmarklet (muqeemSyncBookmarklet.js) this one
// carries a single worker baked in (iqama + chosen duration + our worker id) and
// performs ONE action against the resident's own session:
//
//   POST /api/alien/iqama/renew/validate
//        { iqamaNumber, renewDuration, isBulk:false, sendExpiryNotification:false }
//
// That endpoint returns the renewal quote/eligibility (fees + whether the iqama
// can be renewed for the requested months) — it does NOT execute the renewal.
//
// The response is shown on the muqeem page AND piped back into Jisr: muqeem's CSP
// blocks a direct supabase.co write, so the row goes through the same
// muqeem-bridge.html popup the sync bookmarklet uses. The «التجديد» card then
// reads/realtime-subscribes to muqeem_renewal_checks and renders the reply.
//
// Session capture: the Bearer JWT is added per-request by muqeem's SPA (it is not
// a cookie), so we install a fetch interceptor and wait for the first live
// authenticated call to leak it, exactly like the sync bookmarklet's single mode.
// The XSRF-TOKEN cookie rotates on every response, so it is read fresh per call.

const SUPABASE_URL = 'https://gcvshzutdslmdkwqwteh.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdnNoenV0ZHNsbWRrd3F3dGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTkwNjgsImV4cCI6MjA5MDQ3NTA2OH0.5R0I5VvB7lp3wpSrtay3DMcXKsT9l1uK0Ukd1F4_ImM'

function body({ iqama, duration, workerId, personId, targetMoi, proxyBaseUrl }) {
  return `
(async () => {
  const U = '${SUPABASE_URL}', K = '${SUPABASE_ANON}';
  const IQAMA = ${JSON.stringify(String(iqama || ''))};
  const DURATION = ${Number(duration) || 3};
  const WORKER = ${JSON.stringify(workerId || null)};
  const PERSON = ${JSON.stringify(personId || null)};
  const TARGET_MOI = ${JSON.stringify(targetMoi ? String(targetMoi) : null)};
  const API = 'https://muqeem.sa';
  const BRIDGE_URL = '${proxyBaseUrl}/muqeem-bridge.html';

  const msg = (m, tone) => {
    let d = document.getElementById('_jisr_renew_ui');
    if (!d) {
      d = document.createElement('div'); d.id = '_jisr_renew_ui';
      d.style.cssText = 'position:fixed;top:16px;left:16px;background:#111;color:#f59e0b;padding:12px 18px;border-radius:10px;z-index:2147483647;font:700 13px/1.6 sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.5);max-width:460px;direction:rtl;text-align:right;border:1px solid rgba(245,158,11,.4);white-space:pre-wrap';
      document.body.appendChild(d);
    }
    d.style.color = tone === 'ok' ? '#34d399' : (tone === 'err' ? '#f87171' : '#f59e0b');
    d.textContent = 'تجديد مقيم: ' + m;
    return d;
  };

  // Supabase bridge (postMessage RPC to the popup) — same protocol as the sync
  // bookmarklet / muqeem-bridge.html.
  let bridgeWin = null, bridgeReady = false;
  const pending = new Map(); let nextReqId = 0;
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || typeof d !== 'object') return;
    if (d.ready) { bridgeReady = true; return; }
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
  });
  const ensureBridge = async () => {
    if (bridgeWin && !bridgeWin.closed && bridgeReady) return;
    if (!bridgeWin || bridgeWin.closed) {
      bridgeWin = window.open(BRIDGE_URL, 'jisr_muqeem_bridge');
      if (!bridgeWin) throw new Error('فشل فتح تبويب الجسر — فعّل النوافذ المنبثقة (popups)');
      bridgeReady = false;
    }
    const deadline = Date.now() + 30000;
    while (!bridgeReady && Date.now() < deadline) {
      try { bridgeWin.postMessage({ hello: true }, '*'); } catch (_) {}
      await new Promise(r => setTimeout(r, 250));
      if (bridgeWin.closed) throw new Error('تبويب الجسر أُغلق قبل الحفظ');
    }
    if (!bridgeReady) throw new Error('تبويب الجسر لم يستجب خلال 30 ثانية');
  };
  const supaFetch = async (path, opts = {}) => {
    await ensureBridge();
    const id = 'req_' + (++nextReqId);
    const reply = await new Promise((resolve, reject) => {
      pending.set(id, resolve);
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('timeout from bridge after 45s')); }, 45000);
      try {
        bridgeWin.postMessage({ id, path, method: opts.method || 'POST', headers: opts.headers || {}, body: opts.body || null }, '*');
      } catch (e) { clearTimeout(timer); pending.delete(id); reject(e); }
    });
    return { ok: reply.status >= 200 && reply.status < 300, status: reply.status, body: reply.body || '' };
  };

  const origFetch = window.fetch;
  const getCookie = (name) => {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.$?*|{}()[\\]\\\\\\/+^]/g, '\\\\$&') + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  };
  const getXsrf = () => {
    for (const n of ['XSRF-TOKEN', 'xsrf-token', 'csrf-token', 'CSRF-TOKEN']) { const v = getCookie(n); if (v) return v; }
    return null;
  };

  // Persist the muqeem reply (or the error) into Jisr through the bridge.
  const saveResult = async (payload, resp, httpStatus, okFlag) => {
    try {
      await supaFetch('/rest/v1/muqeem_renewal_checks', {
        method: 'POST', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify([{
          iqama_number: IQAMA, worker_id: WORKER, person_id: PERSON,
          renew_duration: DURATION, action: 'validate',
          ok: okFlag, http_status: httpStatus,
          request: payload, response: resp,
        }]),
      });
      return true;
    } catch (e) { return false; }
  };

  try {
    if (!location.hostname.endsWith('muqeem.sa')) return msg('افتح مقيم أولاً (muqeem.sa) ثم اضغط الزر.', 'err');
    if (!/^[12]\\d{9}$/.test(IQAMA)) return msg('رقم إقامة غير صالح: ' + IQAMA, 'err');

    // Capture the live ORG session token. Muqeem is an Angular app whose
    // HttpClient uses XMLHttpRequest (not fetch), so a fetch-only interceptor
    // never sees the Bearer. We try four ways, fastest first:
    //   1) scan localStorage/sessionStorage for a stored session JWT,
    //   2) the cookie-based /api/refresh-token endpoint,
    //   3) intercept BOTH XHR and fetch and wait for a live call to leak it.
    const captured = { token: null, xsrf: null, xdomain: null, apiOrigin: null };
    const looksJwt = (t) => typeof t === 'string' && /^[\\w-]+\\.[\\w-]+\\.[\\w-]+$/.test(t);
    const decodeJwt = (t) => { try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch (_) { return null; } };
    const nowSec = () => Math.floor(Date.now() / 1000);
    // A usable org token carries moiNumber + a future exp. This deliberately
    // skips the Absher SSO tmpJwt (no moiNumber) which the alien API rejects.
    const goodToken = (t) => { if (!looksJwt(t)) return false; const p = decodeJwt(t); return !!(p && p.moiNumber && (!p.exp || p.exp > nowSec() + 10)); };
    const scanStores = () => {
      for (const store of [(function () { try { return localStorage } catch (_) { return null } })(), (function () { try { return sessionStorage } catch (_) { return null } })()]) {
        if (!store) continue;
        try {
          for (let i = 0; i < store.length; i++) {
            const raw = store.getItem(store.key(i));
            if (!raw || raw.indexOf('eyJ') < 0) continue;
            if (goodToken(raw)) return raw.trim();
            const m = raw.match(/eyJ[\\w-]+\\.[\\w-]+\\.[\\w-]+/g);
            if (m) for (const cand of m) if (goodToken(cand)) return cand;
          }
        } catch (_) {}
      }
      return null;
    };

    const captureFromHeaders = (h) => {
      const authH = h['authorization'] || h['Authorization'];
      if (!captured.token && typeof authH === 'string' && authH.toLowerCase().startsWith('bearer ')) {
        const t = authH.slice(7).trim();
        if (looksJwt(t)) captured.token = t;
      }
      const xH = h['x-xsrf-token'] || h['xsrf-token'] || h['x-csrf-token'];
      if (!captured.xsrf && xH) captured.xsrf = String(xH);
      const dH = h['x-domain'];
      if (!captured.xdomain && dH) captured.xdomain = String(dH);
    };
    window.fetch = function (input, init) {
      try {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        const src = (init && init.headers) || (input instanceof Request ? input.headers : null);
        const h = {};
        if (src instanceof Headers) src.forEach((v, k) => { h[k.toLowerCase()] = v; });
        else if (src && typeof src === 'object') for (const k of Object.keys(src)) h[k.toLowerCase()] = src[k];
        captureFromHeaders(h);
        if (!captured.apiOrigin && typeof url === 'string' && url.indexOf('/api/') >= 0) { try { captured.apiOrigin = new URL(url, location.href).origin; } catch (_) {} }
      } catch (_) {}
      return origFetch.apply(this, arguments);
    };
    try {
      if (typeof XMLHttpRequest !== 'undefined' && XMLHttpRequest.prototype) {
        const oOpen = XMLHttpRequest.prototype.open;
        const oSet = XMLHttpRequest.prototype.setRequestHeader;
        XMLHttpRequest.prototype.open = function (method, url) {
          try { if (!captured.apiOrigin && typeof url === 'string' && url.indexOf('/api/') >= 0) captured.apiOrigin = new URL(url, location.href).origin; } catch (_) {}
          return oOpen.apply(this, arguments);
        };
        XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
          try {
            const lk = String(k).toLowerCase();
            if (!captured.token && lk === 'authorization' && /^bearer /i.test(String(v))) { const t = String(v).slice(7).trim(); if (looksJwt(t)) captured.token = t; }
            if (!captured.xsrf && (lk === 'x-xsrf-token' || lk === 'xsrf-token' || lk === 'x-csrf-token')) captured.xsrf = String(v);
            if (!captured.xdomain && lk === 'x-domain') captured.xdomain = String(v);
          } catch (_) {}
          return oSet.apply(this, arguments);
        };
      }
    } catch (_) {}

    // ── Absher SSO: mint the WORKER'S OWN establishment token ─────────────
    // A renew POST is authorised only when the session belongs to the resident's
    // sponsor establishment; a foreign establishment yields 403 Forbidden. When we
    // know the target (TARGET_MOI = the facility's unified/MOI number, which equals
    // muqeem's moiNumber), mint a session token for exactly that establishment via
    // the same Absher SSO flow the sync bookmarklet uses (needs the tmpJwt from
    // «الدخول الموحد»). This removes any need to switch establishments by hand.
    // NB: /api/refresh-token is deliberately NOT used — it mints a desynced session
    // → 403. We use either this SSO-minted org token or the page's own token.
    let ssoToken = null, ssoNote = null;
    if (TARGET_MOI) {
      const tmpJwt = (function () { try { return localStorage.getItem('tmpJwt'); } catch (_) { return null; } })();
      const tmpP = tmpJwt ? decodeJwt(tmpJwt) : null;
      if (tmpJwt && tmpP && (!tmpP.exp || tmpP.exp > nowSec() + 20)) {
        try {
          const ssoHeaders = () => { const h = { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tmpJwt }; const x = getXsrf(); if (x) h['X-XSRF-TOKEN'] = x; return h; };
          msg('جارٍ تحديد منشأة كفيل العامل عبر الدخول الموحد…');
          const ur = await origFetch(API + '/api/sso/absher/get-users', { method: 'POST', credentials: 'include', headers: ssoHeaders(), body: JSON.stringify({ tmpJwt }) });
          if (ur.ok) {
            const users = await ur.json().catch(() => null);
            const u = Array.isArray(users) ? users.find(x => String(x.username || x.organizationId) === TARGET_MOI) : null;
            if (u) {
              const jr = await origFetch(API + '/api/sso/absher/get-application-jwt', { method: 'POST', credentials: 'include', headers: ssoHeaders(), body: JSON.stringify({ userId: u.userId, tmpJwt }) });
              if (jr.ok) { const jd = await jr.json().catch(() => null); if (jd && jd.id_token && looksJwt(jd.id_token)) ssoToken = jd.id_token; }
            } else { ssoNote = 'notlisted'; }
          }
        } catch (_) {}
      } else { ssoNote = 'notmp'; }
    }
    // The SSO-minted token belongs to the target establishment; its X-Domain/XSRF
    // are re-derived below, so drop the page-session ones.
    if (ssoToken) { captured.token = ssoToken; captured.xdomain = null; captured.xsrf = null; }

    // Page-session fallback (when SSO wasn't available, or TARGET_MOI unknown).
    if (!captured.token) captured.token = scanStores();
    const deadline = Date.now() + 90000;
    while (!captured.token && Date.now() < deadline) {
      const s = scanStores();
      if (s) { captured.token = s; break; }
      msg('بانتظار جلسة مقيم — افتح/حدّث أي صفحة من القائمة (مثلاً «المقيمين»). ' + Math.ceil((deadline - Date.now()) / 1000) + 'ث');
      await new Promise(r => setTimeout(r, 500));
    }
    if (!captured.token) return msg('❌ ما لقيت جلسة مقيم. سجّل الدخول وافتح صفحة «المقيمين» ثم أعد الضغط.', 'err');

    // Establishment guard — a page token for a DIFFERENT establishment would 403.
    // Block it up front with a precise instruction instead of a raw Forbidden.
    const tokMoi = (function () { const p = decodeJwt(captured.token) || {}; return p.moiNumber || p.sub || null; })();
    if (TARGET_MOI && !ssoToken && tokMoi && String(tokMoi) !== String(TARGET_MOI)) {
      const hint = ssoNote === 'notmp'
        ? 'افتح مقيم عبر «الدخول الموحد» من أبشر (نفس طريقة المزامنة) ثم اضغط الزر — سيبدّل للمنشأة الصحيحة تلقائياً.'
        : (ssoNote === 'notlisted' ? 'المنشأة ' + TARGET_MOI + ' غير متاحة عبر حساب أبشر الحالي.' : 'بدّل المنشأة في مقيم إلى كفيل العامل (' + TARGET_MOI + ') ثم أعد الضغط.');
      return msg('⛔ المنشأة النشطة (' + tokMoi + ') ليست كفيل هذا العامل (' + TARGET_MOI + ').\\n' + hint, 'err');
    }

    const apiBase = captured.apiOrigin || API;
    const baseHeaders = {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'ar-ly',
      'Authorization': 'Bearer ' + captured.token,
    };

    // X-Domain (active branch id) is REQUIRED by muqeem's alien operations — the
    // manual renew request carried it, and omitting it yields 403 Forbidden. Take
    // the live-captured value, else read it off /api/account (domains[0].id), same
    // as the sync bookmarklet. Without it the resident isn't scoped to a branch.
    if (!captured.xdomain) {
      try {
        const ar = await origFetch(apiBase + '/api/account', {
          credentials: 'include',
          headers: { ...baseHeaders, 'X-Xsrf-Token': getXsrf() || captured.xsrf || '' },
        });
        if (ar.ok) { const ad = await ar.json().catch(() => null); const did = ad && ad.domains && ad.domains[0] && ad.domains[0].id; if (did != null) captured.xdomain = String(did); }
      } catch (_) {}
    }

    // Build request headers fresh. Muqeem ROTATES the XSRF-TOKEN cookie on every
    // response, so read it fresh here (cookie first, like the sync bookmarklet);
    // the captured header value is only a fallback.
    const headers = {
      ...baseHeaders,
      'Content-Type': 'application/json',
      'X-Xsrf-Token': getXsrf() || captured.xsrf || '',
    };
    if (captured.xdomain) headers['X-Domain'] = captured.xdomain;
    // Active establishment in this muqeem session — decoded so the user can see
    // WHICH sponsor is active. A 403 on renew/validate almost always means this
    // is not the worker's sponsor establishment.
    const sessionMoi = (function () { const p = decodeJwt(captured.token) || {}; return p.moiNumber || p.sub || null; })();
    const payload = { iqamaNumber: IQAMA, renewDuration: String(DURATION), isBulk: false, sendExpiryNotification: false };

    msg('جارٍ فحص التجديد لمدة ' + DURATION + ' شهر…');
    let httpStatus = 0, respData = null, okFlag = false;
    try {
      const r = await origFetch(apiBase + '/api/alien/iqama/renew/validate', {
        method: 'POST', credentials: 'include', headers, body: JSON.stringify(payload),
      });
      httpStatus = r.status;
      const text = await r.text();
      try { respData = JSON.parse(text); } catch (_) { respData = text || null; }
      okFlag = r.ok;
    } catch (e) {
      respData = { _error: String((e && e.message) || e) };
    }

    // A 403 on renew/validate is muqeem's generic Forbidden. Empirically its #1
    // cause is an EXPIRED establishment subscription (باقة مقيم منتهية) — verified
    // across establishments: only the one with a live subscription reached the
    // business layer. So on 403 we probe the subscription overview to say exactly
    // why, instead of a bare code. (Second cause: the session isn't this resident's
    // sponsor / lacks RENEW_IQAMA authority.)
    let subExpired = null, subExpiry = null, subPackage = null;
    if (httpStatus === 403) {
      try {
        const sr = await origFetch(apiBase + '/api/subscriptions/business/overview', {
          credentials: 'include',
          headers: { ...baseHeaders, 'X-Xsrf-Token': getXsrf() || captured.xsrf || '', ...(captured.xdomain ? { 'X-Domain': captured.xdomain } : {}) },
        });
        if (sr.ok) { const sd = await sr.json().catch(() => null); if (sd) { subExpired = sd.expired === true; const ls = sd.latestSubscription || {}; subExpiry = ls.expiryDate || null; subPackage = ls.packageNameAr || null; } }
      } catch (_) {}
    }

    const saved = await saveResult({ ...payload, _sessionMoi: sessionMoi, _subExpired: subExpired, _subExpiry: subExpiry, _subPackage: subPackage }, respData, httpStatus, okFlag);
    const forbidden = httpStatus === 403;
    const brief = (() => {
      try {
        if (forbidden && subExpired) return 'اشتراك المنشأة في مقيم منتهٍ' + (subExpiry ? ' (انتهى ' + subExpiry + ')' : '') + ' — جدّد اشتراك المنشأة في مقيم أولاً، فالتجديد لا يعمل باشتراك منتهٍ.';
        if (forbidden) return 'مقيم رفض العملية (403). غالباً اشتراك المنشأة منتهٍ، أو المنشأة النشطة' + (sessionMoi ? ' (' + sessionMoi + ')' : '') + ' ليست كفيل العامل / لا تملك صلاحية التجديد.';
        if (respData && typeof respData === 'object') {
          const j = respData;
          const fee = j.totalAmount ?? j.total ?? j.amount ?? j.fees ?? j.renewalFees ?? j.fee ?? null;
          const m = j.message;
          const err = j.errorMessage || (m && typeof m === 'object' ? (m.ar || m.en) : m) || j.error || (j.errors && JSON.stringify(j.errors)) || null;
          if (okFlag && fee != null) return 'الرسوم: ' + fee;
          if (err) return String(err);
        }
        return typeof respData === 'string' ? respData.slice(0, 200) : JSON.stringify(respData).slice(0, 200);
      } catch (_) { return ''; }
    })();

    if (okFlag) msg('✅ تم الفحص (HTTP ' + httpStatus + ').\\n' + brief + (saved ? '\\nحُفظ في جسر — راجع كرت التجديد.' : '\\n⚠️ تعذّر الحفظ في جسر.'), 'ok');
    else if (forbidden && subExpired) msg('⛔ اشتراك مقيم منتهٍ.\\n' + brief + (saved ? '\\nحُفظ في جسر.' : ''), 'err');
    else if (forbidden) msg('⛔ رُفض (403).\\n' + brief + (saved ? '\\nحُفظ في جسر.' : ''), 'err');
    else msg('⚠️ رد مقيم HTTP ' + httpStatus + '.\\n' + brief + (saved ? '\\nحُفظ في جسر — راجع كرت التجديد.' : '\\n⚠️ تعذّر الحفظ في جسر.'), 'err');
    setTimeout(() => { document.getElementById('_jisr_renew_ui')?.remove(); }, 14000);
  } catch (e) {
    msg('❌ ' + (e && e.message ? e.message : String(e)), 'err');
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

export function buildMuqeemRenewBookmarklet({ iqama, duration, workerId, personId, targetMoi, proxyBaseUrl }) {
  return 'javascript:' + encodeURIComponent(minify(body({ iqama, duration, workerId, personId, targetMoi, proxyBaseUrl })))
}
