// Mudad sync bookmarklet — runs on mudad.com.sa (نظام الالتزام).
//
// Mudad is shaped like Qiwa, not Ajeer: a clean JSON API (api.mudad.sa), not
// server-rendered HTML. But it differs from BOTH in the ways that matter here:
//
//   • No context switching. Qiwa needs PATCH /context/company and Ajeer needs
//     POST /auth/login before each establishment, which forces a strictly
//     sequential sweep. Mudad carries the establishment in a per-request
//     `organizationId` header, so establishments can be swept CONCURRENTLY and
//     the user's own active session is never disturbed.
//
//   • Auth is NOT `Authorization: Bearer`. Mudad wants two custom headers:
//       x-apikey     — a constant baked into the Angular bundle (NOT in storage)
//       bearer_token — the session token from sessionStorage
//     Sending `Authorization: Bearer <token>` instead returns 402
//     "Authorization Failed. Please contact administrator." — a misleading
//     status that looks like billing/permissions but only means "wrong headers".
//     Omitting x-apikey → 402; omitting bearer_token → 401. Everything else
//     (session_id, systemType, Accept-Language) is optional.
//
//   • The session lives 1200s (20 MINUTES) — far shorter than Qiwa or Ajeer.
//     A sweep of ~220 establishments cannot finish inside one token, so the
//     token keeper below is mandatory, not an optimisation. This is the same
//     failure that produced the 401 waves in the SBC sync
//     (project_sbc_requests_sync): a token frozen at capture dies mid-run.
//
// CSP: mudad.com.sa sends `connect-src 'self' … api.mudad.sa …` with NO
// supabase.co, so this bookmarklet CANNOT write to our database directly. Every
// Supabase write is piped through the sync-bridge.html popup on the Jisr origin
// — the same bridge pattern as the Muqeem sync.
//
// Secrets: x-apikey and the refresh Basic credential are read out of Mudad's own
// public bundle at runtime rather than being frozen into this repo, so they
// survive a Mudad rotation and are never committed here.

const SUPABASE_URL = 'https://gcvshzutdslmdkwqwteh.supabase.co'

function body({ sourceId, personId, proxyBaseUrl, force = false, resetAt = '' }) {
  return `
(async () => {
  const SOURCE = '${sourceId}', PERSON = '${personId}';
  const FORCE = ${force ? 'true' : 'false'};
  const RESET_AT = ${JSON.stringify(resetAt || '')};
  const API = 'https://api.mudad.sa/';
  const BRIDGE_URL = '${proxyBaseUrl}/sync-bridge.html?p=' + encodeURIComponent('مدد');
  const SYSTEM_TYPE = 'MUDAD_COMPLIANCE_APP';
  // The compliance-summary report takes ~25 SECONDS inside Mudad itself —
  // measured live on 2026-07-17: a clean sweep at concurrency 2 held a steady
  // 4.7 establishments/min with zero errors, i.e. ~25s per request of pure
  // server time. That latency, not our request count, is the sweep's floor.
  //
  // An earlier run at concurrency 4 timed out on 144 of ~280 requests and was
  // read as "Mudad serialises per session — back off". That experiment was
  // confounded: its timeout was 20s, BELOW the ~25s service time, so every
  // request died at any concurrency; the fix then lowered concurrency and
  // raised the timeout together, crediting the wrong change. Concurrency 6 is
  // the retest with the timeout held at 45s — and because the serialisation
  // theory was never disproven either, the sweep steps itself back down to 2
  // if a timeout streak appears (queue-wait past the deadline is exactly how
  // per-session serialisation would show up).
  const EST_CONC = 6;
  const CONC_FLOOR = 2;
  const REQ_TIMEOUT = 45000;

  const msg = (m) => {
    let d = document.getElementById('_jisr_mudad_ui');
    if (!d) {
      d = document.createElement('div'); d.id = '_jisr_mudad_ui';
      d.style.cssText = 'position:fixed;top:16px;left:16px;background:#111;color:#0ea5e9;padding:12px 18px;border-radius:10px;z-index:2147483647;font:700 13px/1.5 sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.5);max-width:420px;direction:rtl;text-align:right;border:1px solid rgba(14,165,233,.4)';
      document.body.appendChild(d);
    }
    d.textContent = 'جسر مدد 3: ' + m;
    return d;
  };

  const origFetch = window.fetch;

  // ── Supabase bridge (postMessage RPC to the popup) ─────────────────────
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
      bridgeWin = window.open(BRIDGE_URL, 'jisr_mudad_bridge');
      if (!bridgeWin) throw new Error('فشل فتح تبويب الجسر — فعّل النوافذ المنبثقة (popups)');
      bridgeReady = false;
    }
    const deadline = Date.now() + 30000;
    while (!bridgeReady && Date.now() < deadline) {
      try { bridgeWin.postMessage({ hello: true }, '*'); } catch (_) {}
      await new Promise(r => setTimeout(r, 250));
      if (bridgeWin.closed) throw new Error('تبويب الجسر أُغلق قبل بدء المزامنة');
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
    const text = reply.body || '';
    return { ok: reply.status >= 200 && reply.status < 300, status: reply.status, text, json: () => { try { return JSON.parse(text) } catch (_) { return null } } };
  };
  // A failed write must never pass silently: the first run wrote 346
  // establishments but zero raw rows, and because this ignored the response
  // there was nothing to say whether the rows were rejected or never sent.
  let writeErr = null;
  const upsert = async (table, rows, onConflict) => {
    if (!rows || !rows.length) return 0;
    for (let i = 0; i < rows.length; i += 100) {
      const r = await supaFetch('/rest/v1/' + table + '?on_conflict=' + onConflict, {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(rows.slice(i, i + 100)),
      });
      if (!r.ok) { writeErr = table + ' ' + r.status + ': ' + String(r.text || '').slice(0, 140); }
    }
    return rows.length;
  };

  // ── Credentials ────────────────────────────────────────────────────────
  // x-apikey and the refresh Basic credential are constants compiled into the
  // compliance bundle. They are read from it at runtime (never frozen into our
  // repo) so a Mudad rotation doesn't silently break this button.
  let APIKEY = null, BASIC = null;
  const loadBundleConsts = async () => {
    let srcs = [...document.querySelectorAll('script[src]')].map((s) => s.src).filter((u) => /\\/compliance\\/main\\.[a-z0-9]+\\.js/i.test(u));
    if (!srcs.length) {
      const html = await origFetch('/compliance/', { credentials: 'include' }).then((r) => r.text());
      const m = html.match(/["']([^"']*main\\.[a-z0-9]+\\.js)["']/i);
      if (m) {
        let p = m[1].replace(/^\\.\\//, '');
        if (!/^https?:/.test(p)) p = location.origin + (p.charAt(0) === '/' ? '' : '/compliance/') + p;
        srcs = [p];
      }
    }
    for (const u of srcs) {
      try {
        const t = await origFetch(u).then((r) => r.text());
        const a = t.match(/xAPIKey:"([^"]+)"/); if (a && !APIKEY) APIKEY = a[1];
        const b = t.match(/basicAuth:"Basic "\\+btoa\\("([^"]+)"\\)/); if (b && !BASIC) BASIC = 'Basic ' + btoa(b[1]);
      } catch (_) {}
      if (APIKEY) break;
    }
    return !!APIKEY;
  };

  // The token is held in memory, NOT read from sessionStorage per call. The
  // Angular app is still live in this tab and its own idle watcher CLEARS
  // sessionStorage and bounces to /login when it decides the session lapsed —
  // which pulled the token out from under the first sweep mid-run. Every later
  // request then sent an empty bearer_token and Mudad answered 401
  // "Authorization Failed", the same text it returns for a missing x-apikey.
  // That message describes a malformed request, never an expired one, so it
  // reads like a permissions wall and hides the real cause.
  let TOKEN = sessionStorage.getItem('bearerToken');
  let RTOKEN = sessionStorage.getItem('refreshToken');
  const SESSION_ID = sessionStorage.getItem('session_id');
  const headers = (extra) => {
    const h = { 'x-apikey': APIKEY, bearer_token: TOKEN, systemType: SYSTEM_TYPE, 'Accept-Language': 'ar', Accept: 'application/json' };
    if (SESSION_ID) h.session_id = SESSION_ID;
    return Object.assign(h, extra || {});
  };

  // ── Token keeper ───────────────────────────────────────────────────────
  // Mudad's session is 1200s. Without this, a full sweep dies mid-run in 401s
  // and the "failures" look like permission problems rather than an expired
  // token — the exact misdiagnosis that cost two rounds on the SBC sync.
  // ONE timer only: refresh_token is single-use, so concurrent refreshes race
  // and invalidate each other.
  let keeper = null, refreshOk = 0, refreshFail = 0, refreshSeq = 0;
  // Expiry is tracked on our own clock rather than read back from
  // sessionStorage, which the app clears on logout.
  let expiresAt = (() => {
    const at = sessionStorage.getItem('bearerTokenExpiryAt');
    const t = at ? new Date(at).getTime() : NaN;
    return isNaN(t) ? Date.now() + 1200000 : t;
  })();
  const secsLeft = () => Math.round((expiresAt - Date.now()) / 1000);

  // Serialised through a single in-flight promise: the refresh_token is
  // single-use, so parallel refreshes rotate it out from under each other and
  // both die. Callers AWAIT the one in flight instead of skipping — an earlier
  // version returned immediately when a refresh was already running, so the
  // other workers retried with the token that had just been replaced.
  let inFlight = null;
  const doRefresh = async () => {
    refreshSeq++;
    const seq = refreshSeq;
    let status = 0, note = null;
    try {
      if (!RTOKEN || !BASIC) { note = !RTOKEN ? 'no refresh_token' : 'no basicAuth from bundle'; refreshFail++; return false; }
      const r = await origFetch(API + 'token/v1/refreshtoken?grant_type=refresh_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', refresh_token: RTOKEN, Authorization: BASIC, 'x-apikey': APIKEY },
        body: JSON.stringify({}),
      });
      status = r.status;
      const j = await r.json().catch(() => null);
      const at = j && (j.access_token || (j.body && j.body.access_token));
      const exp = j && (j.expires_in || (j.body && j.body.expires_in));
      const nrt = j && (j.refresh_token || (j.body && j.body.refresh_token));
      if (at) {
        TOKEN = at;
        expiresAt = Date.now() + ((exp || 1200) * 1000);
        if (nrt) RTOKEN = nrt;
        // Mirror back so the app's own watcher sees a live session and doesn't
        // bounce the tab to /login underneath the sweep.
        try {
          sessionStorage.setItem('bearerToken', at);
          sessionStorage.setItem('bearerTokenExpiryAt', new Date(expiresAt).toISOString());
          if (nrt) sessionStorage.setItem('refreshToken', nrt);
        } catch (_) {}
        refreshOk++;
        return true;
      }
      note = 'no access_token in response; keys=' + (j ? Object.keys(j).join(',') : 'null');
      refreshFail++;
      return false;
    } catch (e) { note = String(e && e.message); refreshFail++; return false; }
    finally {
      // Recorded so a failed refresh is diagnosable from the data instead of
      // showing up only as an unexplained wave of 401s.
      rawRows.push({ mlsd_unified_id: '_token', endpoint: 'refresh:' + seq, method: 'POST',
        request: null, response: { ok: refreshOk, fail: refreshFail, note },
        http_status: status, captured_at: new Date().toISOString() });
    }
  };
  const refreshTok = async () => {
    if (!inFlight) inFlight = doRefresh().finally(() => { inFlight = null; });
    return inFlight;
  };
  const startKeeper = () => { keeper = setInterval(() => { if (secsLeft() < 300) refreshTok(); }, 30000); };
  const stopKeeper = () => { if (keeper) clearInterval(keeper); keeper = null; };

  // ── Mudad API ──────────────────────────────────────────────────────────
  // Returns the parsed body plus the status, so a failure is recorded rather
  // than silently collapsing to an empty row.
  // Every call is time-boxed. Without this the first run wedged: four workers
  // each blocked forever on a request Mudad never answered, so the sweep sat at
  // 0/346 with no error and no rows — a hang reads exactly like slow progress.
  // Three attempts: a timeout is retried rather than written off. Mudad is slow
  // under load, and a first sweep discarded 144 establishments on single 20s
  // misses that a retry would likely have caught.
  const mudad = async (path, extraHeaders) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), REQ_TIMEOUT);
      try {
        const r = await origFetch(API + path, { headers: headers(extraHeaders), signal: ac.signal });
        const ct = r.headers.get('content-type') || '';
        const b = ct.indexOf('json') !== -1 ? await r.json().catch(() => null) : (await r.text()).slice(0, 2000);
        // 401 mid-sweep = the session died; refresh once and retry.
        if (r.status === 401 && attempt < 2) { await refreshTok(); continue; }
        return { status: r.status, body: b };
      } catch (e) {
        const aborted = e && e.name === 'AbortError';
        if (attempt === 2) return { status: 0, body: { fetchError: aborted ? ('timeout after ' + (REQ_TIMEOUT / 1000) + 's ×3') : String(e && e.message) } };
        // Brief backoff before retrying — an immediate retry just re-joins the
        // same queue that timed out.
        await new Promise((r2) => setTimeout(r2, 1500));
      } finally { clearTimeout(timer); }
    }
    return { status: 0, body: null };
  };

  const rawRows = [];
  const stashRaw = (est, endpoint, res, request) => {
    rawRows.push({
      mlsd_unified_id: est, endpoint, method: 'GET',
      request: request || null, response: res.body == null ? null : res.body,
      http_status: res.status, captured_at: new Date().toISOString(),
    });
  };

  // ── Establishment list ─────────────────────────────────────────────────
  const listPage = async (pageNumber, pageSize) => {
    const q = new URLSearchParams({ activeEmployment: 'true', mlsdUnifiedId: '', pageNumber: String(pageNumber), pageSize: String(pageSize) });
    return mudad('compliance/v1/users/compliance-user/landing-page-info?' + q.toString());
  };

  const num = (v) => { if (v == null) return null; const n = parseFloat(String(v).replace(/[^\\d.]/g, '')); return isNaN(n) ? null : n; };
  const str = (v) => { if (v == null) return null; const s = String(v).trim(); return s ? s : null; };

  // ── Per-establishment endpoints ────────────────────────────────────────
  // Mudad's per-establishment paths carry NO id — the establishment comes from
  // the organizationId header, whose value the list already hands us at
  // authorizations[].organizationId. It is NOT derivable: it reads
  // "1-4507856-1-4507856", i.e. mlsdUnifiedId repeated. An earlier version
  // tried to discover it by probing candidate values against an endpoint, which
  // was the wrong shape of test — the probe endpoint was itself unverified, so
  // the correct candidate failed alongside the wrong ones and the run reported
  // "no context found" while the answer sat in the data.
  const auth0 = (e) => (Array.isArray(e.authorizations) ? e.authorizations[0] : null) || {};
  const orgOf = (e) => { const v = auth0(e).organizationId; return v == null ? null : String(v); };
  // The landing page already carries each establishment's current compliance
  // state. This snapshot of it is stamped onto the row when the detail sweep
  // COMPLETES, and the next run skips any establishment whose fresh list row
  // still matches — the delta test that makes a re-run near-instant.
  const snapOf = (e) => {
    const cd = e.complianceDetails || {};
    return {
      pct: num(cd.compliancePercentage), status: str(cd.complianceStatus),
      period: str(cd.wageperiod || cd.wagePeriod),
      viol: e.openViolations == null ? null : !!e.openViolations,
      just: e.pendingJustifications == null ? null : !!e.pendingJustifications,
    };
  };

  // Captured from the live app's own traffic (not guessed from the bundle) and
  // confirmed 200. compliance_months is the "معلومات الإلتزام" table — the
  // monthly compliance history the establishment screen shows, and the ONLY
  // per-establishment data the Jisr UI renders.
  //
  // This list is deliberately down to that single endpoint. Four more paths are
  // confirmed working (current-status, report violations,
  // certificates/establishments/mlsd-unified-id/compliance, wage-commitments)
  // but nothing displays them — they landed in mudad_raw and stopped there,
  // while quintupling the sweep on a platform that serialises per session and
  // whose bottleneck is queueing, not auth. Same reasoning that dropped the
  // uploaded-wage-file lists (submitted-files, files/summary) earlier: a
  // request per establishment is the unit of cost here, so an endpoint earns
  // its place only when a card actually renders it.
  //
  // Also permanently out: compliance/resources/v1/wage-periods/all and the bare
  // certificates/establishments path — both 403 on every establishment (the
  // real certificates path carries the /mlsd-unified-id/compliance suffix).
  const ENDPOINTS = [
    { key: 'compliance_months', path: 'compliance/v1/compliance-report/mlsd-unified-id/summary?monthYearList=default&status=all' },
  ];

  const statusTally = {};
  const doneRows = [];
  const monthRows = [];
  const takeMonths = (est, res) => {
    const list = (res.body && res.body.complianceInfo) || [];
    for (const m of list) {
      if (!m || m.wagePeriodId == null) continue;
      monthRows.push({
        mlsd_unified_id: est, wage_period_id: Number(m.wagePeriodId),
        month_year_ar: str(m.monthYearAr), month_year_en: str(m.monthYearEn),
        compliance_percentage: num(m.compliancePercentage), status: str(m.status),
        total_laborers: m.totalLaborers, included_laborers: m.includedLaborers,
        excluded_laborers: m.excludedLaborers, compliant_laborers: m.compliantLaborer,
        paid_laborers: m.paidLaborers, violated_laborers: m.violatedLaborers,
        expat_laborers: m.expatLaborers,
        mlsd_status: str(m.mlsdStatus),
        mlsd_status_start_ar: str(m.mlsdStatusStartDateAr), mlsd_status_start_en: str(m.mlsdStatusStartDateEn),
        raw: m, synced_at: new Date().toISOString(),
      });
    }
  };

  // A run of consecutive 401s that survive a refresh means the session is gone
  // for good. Stopping there beats grinding the remaining establishments into
  // 401s — the first sweep did exactly that, writing ~660 rows that recorded
  // nothing but the dead token while looking like coverage.
  let consec401 = 0, authDead = false;
  // The adaptive throttle: if per-session serialisation is real, concurrency 6
  // shows up as requests queueing past the 45s deadline — a streak of triple-
  // timeout failures. Three of those in a row and the sweep sheds workers down
  // to the floor that is known to run clean, recording the step-down so the
  // data says which world we were in.
  let maxWorkers = EST_CONC, timeoutStreak = 0;
  const syncEst = async (e) => {
    const est = String(e.mlsdUnifiedId);
    const org = orgOf(e);
    const extra = org ? { organizationId: org } : undefined;
    let allOk = true;
    for (const ep of ENDPOINTS) {
      const r = await mudad(ep.path, extra);
      const k = ep.key + ':' + r.status;
      statusTally[k] = (statusTally[k] || 0) + 1;
      stashRaw(est, ep.key, r, org ? { organizationId: org } : null);
      if (r.status === 200 && ep.key === 'compliance_months') takeMonths(est, r);
      if (r.status === 200) { consec401 = 0; timeoutStreak = 0; }
      else if (r.status === 401 || r.status === 402) { if (++consec401 >= 12) authDead = true; }
      if (r.status === 0 && /timeout/.test(String(r.body && r.body.fetchError))) {
        if (++timeoutStreak >= 3 && maxWorkers > CONC_FLOOR) {
          maxWorkers = CONC_FLOOR;
          rawRows.push({ mlsd_unified_id: '_tuning', endpoint: 'conc-step-down', method: 'POST',
            request: null, response: { from: EST_CONC, to: CONC_FLOOR, after: timeoutStreak + ' timeouts' },
            http_status: 0, captured_at: new Date().toISOString() });
        }
      }
      if (r.status !== 200) allOk = false;
    }
    // Only a clean establishment is stamped done, so a re-run retries the ones
    // that died with the token rather than skipping them as finished. The
    // snapshot rides along so the next run's delta test compares against the
    // state that was ACTUALLY synced, not whatever the list upsert wrote last.
    if (allOk) doneRows.push({ mlsd_unified_id: est, detail_synced_at: new Date().toISOString(), detail_snapshot: snapOf(e) });
    return allOk;
  };

  // ── main ───────────────────────────────────────────────────────────────
  try {
    msg('جاري القراءة...');

    if (!/mudad\\.com\\.sa$/.test(location.hostname)) { msg('❌ افتح موقع مدد أولاً ثم اضغط الزر'); return; }
    if (!TOKEN) { msg('❌ لا توجد جلسة مدد — سجّل الدخول ثم اضغط الزر (الجلسة تنتهي بعد 20 دقيقة)'); return; }
    if (!(await loadBundleConsts())) { msg('❌ تعذّر استخراج مفتاح الواجهة من مدد'); return; }

    await ensureBridge();
    let runId = null;
    try {
      const runRes = await supaFetch('/rest/v1/sync_runs?select=id', {
        method: 'POST', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ source_id: SOURCE, person_id: PERSON, status: 'running' }),
      });
      const arr = runRes.json();
      runId = Array.isArray(arr) ? (arr[0] || {}).id : (arr || {}).id;
    } catch (_) {}

    startKeeper();

    const first = await listPage(1, 100);
    if (first.status === 401 || first.status === 402) { stopKeeper(); msg('❌ الجلسة منتهية (' + first.status + ') — أعد تسجيل الدخول في مدد ثم اضغط الزر'); return; }
    if (first.status !== 200 || !first.body) { stopKeeper(); msg('❌ تعذّر جلب قائمة المنشآت (' + first.status + ')'); return; }

    const total = first.body.totalNoOfUserEstablishments || 0;
    let ests = (first.body.userEstablishmentsInfoList || []).slice();
    const pageSize = first.body.pageSize || 100;
    // Page until the server's own total is covered — never trust one page.
    let page = 2, guard = 0;
    while (ests.length < total && guard++ < 60) {
      const nxt = await listPage(page++, pageSize);
      const rows = (nxt.body && nxt.body.userEstablishmentsInfoList) || [];
      if (!rows.length) break;
      ests = ests.concat(rows);
      msg('القائمة: ' + ests.length + '/' + total);
    }
    stashRaw('_user', 'landing-page-info', { status: first.status, body: { totalNoOfUserEstablishments: total, count: ests.length } }, null);

    if (!ests.length) { stopKeeper(); msg('❌ لم أجد أي منشأة في الحساب'); return; }
    msg('القائمة: ' + ests.length + ' منشأة — جاري الحفظ...');

    await upsert('mudad_establishments', ests.filter((e) => e && e.mlsdUnifiedId).map((e) => {
      const cd = e.complianceDetails || {};
      const a = auth0(e);
      return {
        mlsd_unified_id: String(e.mlsdUnifiedId),
        person_id: PERSON || null,
        national_unified_id: str(e.nationalUnifiedId),
        // The name lives on the authorization, not on the establishment — the
        // first run wrote 346 rows with name null looking for establishmentName.
        name: str(a.organizationName),
        organization_id: orgOf(e),
        active_employment: a.activeEmployment == null ? null : !!a.activeEmployment,
        roles: a.roles || null,
        compliance_percentage: num(cd.compliancePercentage),
        compliance_status: str(cd.complianceStatus),
        wage_period: str(cd.wageperiod || cd.wagePeriod),
        open_violations: e.openViolations == null ? null : !!e.openViolations,
        pending_justifications: e.pendingJustifications == null ? null : !!e.pendingJustifications,
        authorizations: e.authorizations || null,
        raw: e,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }), 'mlsd_unified_id');
    if (writeErr) { stopKeeper(); msg('❌ فشل حفظ المنشآت — ' + writeErr); return; }

    const withOrg = ests.filter(orgOf).length;
    msg('حُفظت ' + ests.length + ' منشأة · سياق ' + withOrg + ' — جاري المسح...');

    // No context switching in Mudad (the establishment is a header), so unlike
    // Qiwa/Ajeer the sweep can run concurrently.
    // Delta sweep, which replaced the old "done in the last 12h" window: an
    // establishment is fetched only when its fresh list row differs from the
    // snapshot stamped when its detail sweep last COMPLETED. Unchanged
    // establishments are skipped no matter how old their sync is, and a changed
    // one is re-fetched even if it was synced an hour ago. The comparison uses
    // detail_snapshot — written only on completion — because the list upsert
    // above refreshes the live columns at sweep start, so an establishment that
    // changed and then died with the session would otherwise read as
    // "unchanged" forever. This also doubles as resume: a dead session leaves
    // no snapshot, so those establishments queue again on the next click.
    const prior = new Map();
    try {
      const r = await supaFetch('/rest/v1/mudad_establishments?select=mlsd_unified_id,detail_synced_at,detail_snapshot', { method: 'GET' });
      const arr = r.json();
      if (Array.isArray(arr)) for (const x of arr) prior.set(String(x.mlsd_unified_id), x);
    } catch (_) {}
    const unchanged = (e) => {
      const p = prior.get(String(e.mlsdUnifiedId));
      if (!p || !p.detail_synced_at || !p.detail_snapshot) return false;
      const s = snapOf(e), d = p.detail_snapshot;
      return d.pct === s.pct && d.status === s.status && d.period === s.period && d.viol === s.viol && d.just === s.just;
    };

    // إعادة ضبط: يعيد كل المنشآت (تجاوز فحص التغيّر) لكن يستأنف ما أُنجز بعد
    // لحظة التفعيل RESET_AT، فلا يبدأ من الصفر عند انقطاع النت أو الخروج.
    const resetBase = RESET_AT ? Date.parse(RESET_AT) : 0;
    const doneAfterReset = (e) => {
      const p = prior.get(String(e.mlsdUnifiedId));
      if (!p || !p.detail_synced_at) return false;
      const t = Date.parse(p.detail_synced_at);
      return !isNaN(t) && t >= resetBase;
    };
    const queue = (FORCE && RESET_AT)
      ? ests.filter((e) => !doneAfterReset(e))
      : ests.filter((e) => !unchanged(e));
    const todo = queue.length;
    const skipped = ests.length - todo;
    if (!todo) {
      stopKeeper();
      if (runId) {
        await supaFetch('/rest/v1/sync_runs?id=eq.' + runId, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'success', completed_at: new Date().toISOString(), records_fetched: ests.length }),
        });
      }
      msg('✅ لا تغيير — كل المنشآت (' + ests.length + ') مُزامَنة');
      return;
    }
    // Cumulative counter against the FULL establishment count: unchanged
    // (already-synced) establishments count as done so the number reads e.g.
    // "41/91" and climbs — visibly continuing, not restarting from 0.
    msg('مسح: ' + skipped + '/' + ests.length + (skipped ? (' · بلا تغيير ' + skipped) : ''));

    let done = 0;
    // Flushed every 40 rows (~20 establishments) rather than 100: the first run
    // ended with zero raw rows because nothing was ever written before it
    // wedged, leaving no evidence of how far it got.
    const flush = async () => {
      if (monthRows.length) await upsert('mudad_compliance_months', monthRows.splice(0, monthRows.length), 'mlsd_unified_id,wage_period_id');
      if (rawRows.length) await upsert('mudad_raw', rawRows.splice(0, rawRows.length), 'mlsd_unified_id,endpoint,method');
      // Stamped last: an establishment must not be marked done before its rows
      // are actually stored, or a crash would skip it forever on the re-run.
      if (doneRows.length) await upsert('mudad_establishments', doneRows.splice(0, doneRows.length), 'mlsd_unified_id');
    };
    // Workers carry an index so the adaptive throttle can shed the extras:
    // when maxWorkers drops, the high-index workers finish their current
    // establishment and exit instead of re-joining the queue.
    const worker = async (wid) => {
      while (queue.length && !authDead && wid < maxWorkers) {
        const e = queue.shift();
        try { await syncEst(e); } catch (_) {}
        done++;
        if (done % 10 === 0 || done === todo) msg('مسح: ' + (skipped + done) + '/' + ests.length + (refreshOk ? (' · تجديد ' + refreshOk) : ''));
        if (rawRows.length >= 40) await flush();
      }
    };
    await Promise.all(Array.from({ length: Math.min(EST_CONC, todo) }, (_, i) => worker(i)));
    await flush();

    stopKeeper();
    if (runId) {
      await supaFetch('/rest/v1/sync_runs?id=eq.' + runId, {
        method: 'PATCH',
        body: JSON.stringify({ status: writeErr ? 'error' : 'success', completed_at: new Date().toISOString(), records_fetched: ests.length }),
      });
    }
    // The tally is the point of this run: it says which of the unverified
    // endpoints Mudad actually serves, instead of leaving that to be guessed.
    const tally = Object.keys(statusTally).sort().map((k) => k + '×' + statusTally[k]).join(' · ');
    const head = authDead
      ? ('⚠️ توقّف: انتهت جلسة مدد عند ' + (skipped + done) + '/' + ests.length + ' منشأة — سجّل الدخول واضغط الزر ثانية ليكمل من حيث وقف')
      : ('✅ تم ' + (skipped + done) + '/' + ests.length + ' منشأة' + (skipped ? (' · بلا تغيير ' + skipped) : ''));
    msg(head + (refreshOk ? (' · جدّد التوكن ' + refreshOk) : '') + (refreshFail ? (' · فشل تجديد ' + refreshFail) : '') + (writeErr ? (' · ⚠️ ' + writeErr) : '') + (tally ? ('\\n' + tally) : ''));
    setTimeout(() => { const el = document.getElementById('_jisr_mudad_ui'); if (el) el.remove(); }, 30000);
  } catch (e) {
    stopKeeper();
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

export function buildMudadBookmarklet({ sourceId, personId, proxyBaseUrl, force = false, resetAt = '' }) {
  return 'javascript:' + encodeURIComponent(minify(body({ sourceId, personId, proxyBaseUrl, force, resetAt })))
}
