// Ajeer sync bookmarklet — runs on ajeer.qiwa.sa.
//
// Ajeer is NOT shaped like Qiwa. Qiwa is a set of JSON APIs split across subdomains
// (so CORS dictates what each origin can reach); Ajeer is a single server-rendered
// Laravel app on one origin. Every /api/* path 404s. So this bookmarklet fetches HTML
// pages same-origin and parses the tables out of them.
//
// Context (the "active establishment") is server-side session state shared by every tab:
//   POST /auth/login {number, type, page, _token}  →  switch to an establishment
//   GET  /auth/qiwa/login                          →  account chooser; CLEARS the context
// Because the context is global to the session, the sweep must be strictly sequential —
// same constraint as Qiwa's PATCH /context/company.
//
// Gate: an establishment whose representatives list is stale is redirected to
// /profile/representatives ("يرجى تحديث قائمة المسؤولين") from EVERY other screen.
// Those are recorded as blocked and skipped, rather than written as empty.

const SUPABASE_URL = 'https://gcvshzutdslmdkwqwteh.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdnNoenV0ZHNsbWRrd3F3dGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTkwNjgsImV4cCI6MjA5MDQ3NTA2OH0.5R0I5VvB7lp3wpSrtay3DMcXKsT9l1uK0Ukd1F4_ImM'

function body({ sourceId, personId, force = false, resetAt = '' }) {
  return `
(async () => {
  const U = '${SUPABASE_URL}', K = '${SUPABASE_ANON}';
  const SOURCE = '${sourceId}', PERSON = '${personId}';
  const FORCE = ${force ? 'true' : 'false'};
  const RESET_AT = ${JSON.stringify(resetAt || '')};
  const GATE_TEXT = 'تحديث قائمة المسؤولين';
  const GATE_PATH = '/profile/representatives';

  const msg = (m) => {
    let d = document.getElementById('_jisr_ajeer_ui');
    if (!d) {
      d = document.createElement('div'); d.id = '_jisr_ajeer_ui';
      d.style.cssText = 'position:fixed;top:16px;left:16px;background:#111;color:#27a046;padding:12px 18px;border-radius:10px;z-index:2147483647;font:700 13px/1.5 sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.5);max-width:380px;direction:rtl;text-align:right;border:1px solid rgba(39,160,70,.4)';
      document.body.appendChild(d);
    }
    d.textContent = 'جسر أجير: ' + m;
    return d;
  };

  const supaFetch = (path, opts = {}) => fetch(U + path, { ...opts, headers: { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  const upsert = async (table, rows, onConflict) => {
    if (!rows || !rows.length) return 0;
    // Chunked so a large establishment can't blow the request size limit.
    for (let i = 0; i < rows.length; i += 200) {
      await supaFetch('/rest/v1/' + table + '?on_conflict=' + onConflict, {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(rows.slice(i, i + 200)),
      });
    }
    return rows.length;
  };

  // ---- page fetch + parse -------------------------------------------------
  const getDoc = async (path) => {
    const r = await fetch(path, { credentials: 'include', headers: { 'Accept': 'text/html' } });
    const text = await r.text();
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const finalPath = (() => { try { return new URL(r.url).pathname } catch (e) { return path } })();
    // Both signals must be checked: Laravel 302s to the gate, and the gate page also
    // carries the notice text. Either alone has produced false negatives.
    const gated = finalPath === GATE_PATH || text.indexOf(GATE_TEXT) !== -1;
    return { status: r.status, doc, finalPath, gated, text };
  };

  // Ajeer renders NO <table> elements — every "table" is div/li markup:
  //   div.tableList > ul.tableList__list
  //     > li.tableList__item.tableList__item--header  (cells are div.tableList__title)
  //     > li.tableList__item                          (cells are div.tableList__column)
  // Parsing for <table>/<th>/<td> silently yields zero rows on every screen.
  const txt = (el) => (el ? (el.textContent || '').trim().replace(/\\s+/g, ' ') : '');

  const parseTables = (doc) => {
    // Two lists can share one panel ("فواتير بانتظار الدفع" + "فواتير"), so a section is
    // identified by the nearest PRECEDING header in document order — not by container
    // or by index.
    const nodes = [...doc.querySelectorAll('.panel__header, .tableList')];
    let section = null;
    const out = [];
    for (const n of nodes) {
      if (n.classList.contains('panel__header')) { section = txt(n).split(' تنزيل')[0].split(' تصدير')[0].split(' إصدار')[0].trim(); continue; }
      const head = n.querySelector('li.tableList__item--header');
      // The header row exposes clean labels in .tableList__title; the data row's own
      // cells carry the filter dropdowns' text too, so never read names off a data row.
      const headers = head ? [...head.querySelectorAll('.tableList__title')].map(txt) : [];
      const items = [...n.querySelectorAll('li.tableList__item')].filter((li) => !li.classList.contains('tableList__item--header'));
      const rows = [];
      for (const li of items) {
        const cols = [...li.querySelectorAll(':scope > .tableList__column')];
        const cells = cols.map(txt);
        if (!cells.length || !cells.join('').trim() || /لا توجد بيانات/.test(cells.join(' '))) continue;
        // Status also arrives as a machine-readable modifier (…--status-paid), which
        // survives any Arabic label change.
        let statusCode = null;
        for (const c of cols) {
          const m = String(c.className).match(/tableList__column--status-([a-zA-Z-]+)/);
          if (m) { statusCode = m[1]; break; }
        }
        const links = [...li.querySelectorAll('a[href]')].map((a) => { try { return new URL(a.getAttribute('href'), location.origin).pathname } catch (e) { return null } }).filter(Boolean);
        rows.push({ cells, statusCode, links });
      }
      out.push({ section, headers, rows });
    }
    return out;
  };

  // Column order differs between the "طلبات بانتظار الرد" list and the main one, so
  // cells are addressed by header name, never by a fixed index.
  const cell = (t, row, name) => {
    const i = t.headers.indexOf(name);
    return i === -1 ? null : (row.cells[i] || null);
  };
  // These take values from two sources now — HTML cell text and JSON fields (which may be
  // numbers) — so they coerce rather than assume a string.
  const clean = (v) => { if (v == null) return null; const s = String(v).trim(); return s && s !== '-' ? s : null; };
  const date = (v) => { const s = clean(v); return s && /^\\d{4}-\\d{2}-\\d{2}$/.test(s) ? s : null; };
  const num = (v) => { const s = clean(v); if (!s) return null; const n = parseFloat(s.replace(/[^\\d.]/g, '')); return isNaN(n) ? null : n; };

  // Pagination is a "التالي" link (a.paginationWrapper__button → ?page=N). Following it is
  // the only approach that covers every screen: /notices prints a "6 من 6" total but
  // /taqaul/indicators prints none at all, so a total-driven pager would silently stop
  // at page 1 there.
  const nextPage = (doc) => {
    const a = [...doc.querySelectorAll('a.paginationWrapper__button, .panel__footer a')]
      .find((x) => txt(x) === 'التالي' && x.getAttribute('href') && x.getAttribute('href') !== '/');
    if (!a) return null;
    try { const u = new URL(a.getAttribute('href'), location.origin); return u.pathname + u.search } catch (e) { return null }
  };

  // Fetch a list screen, following pagination and merging each page's rows section-wise.
  const getList = async (path) => {
    const first = await getDoc(path);
    if (first.gated) return first;
    const tables = parseTables(first.doc);
    let url = nextPage(first.doc), guard = 0;
    const seen = new Set([path]);
    while (url && guard < 50 && !seen.has(url)) {
      seen.add(url); guard++;
      const nxt = await getDoc(url);
      if (nxt.gated) break;
      for (const t of parseTables(nxt.doc)) {
        // Merge into the same section from page 1; a section that only appears on a
        // later page is appended rather than dropped.
        const prev = tables.find((p) => p.section === t.section && p.headers.join('|') === t.headers.join('|'));
        if (prev) prev.rows = prev.rows.concat(t.rows); else tables.push(t);
      }
      url = nextPage(nxt.doc);
    }
    first.tables = tables;
    return first;
  };

  const stashRaw = (est, path, r) => ({
    establishment_no: est, path,
    http_status: r.status, final_path: r.finalPath,
    parsed: r.gated ? { gated: true } : (r.json ? { json: r.json } : { tables: r.tables || parseTables(r.doc) }),
  });

  // /notices and /contracts render an empty shell and fill it over AJAX — their rows are
  // NOT in the server HTML (the shell literally reads ".. من .. تصريح"), so they must be
  // read from the JSON endpoint. /payments and /taqaul/indicators have no such endpoint
  // (their /search 404s) and stay on the HTML parser above.
  const searchJson = async (base) => {
    const all = [];
    let page = 0, total = null, guard = 0;
    while (guard++ < 100) {
      const r = await fetch(base + '/search?page=' + page, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
        body: new URLSearchParams({ _token: token || '' }),
      });
      if (!r.ok) return { status: r.status, finalPath: base, gated: false, rows: all, total };
      const j = await r.json();
      const data = Array.isArray(j?.data) ? j.data : [];
      all.push(...data);
      total = j?.total ?? total;
      const limit = j?.limit || data.length;
      // page is 0-based; stop once the server's own total is covered.
      if (!data.length || !limit || !total || all.length >= total) break;
      page++;
    }
    return { status: 200, finalPath: base, gated: false, rows: all, total, json: { total, rows: all } };
  };

  // ---- context switching --------------------------------------------------
  const csrf = () => document.querySelector('meta[name=csrf-token]')?.content
    || document.querySelector('input[name=_token]')?.value;
  // Laravel rotates the token on session changes, so re-read it from a freshly
  // fetched page rather than trusting the one this bookmarklet was launched with.
  const csrfFrom = (doc) => doc.querySelector('meta[name=csrf-token]')?.content
    || doc.querySelector('input[name=_token]')?.value;

  let token = csrf();
  const switchTo = async (number, type) => {
    const b = new URLSearchParams({ number, type: type || 'establishment', page: '1', _token: token || '' });
    const r = await fetch('/auth/login', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json, text/html' },
      body: b,
    });
    return r.ok;
  };

  // ---- per-establishment sync --------------------------------------------
  const syncActive = async (est) => {
    const raws = [];
    let blocked = false, blockedReason = null, summary = null;

    // The gate is detected on an HTML page — the JSON endpoints don't redirect, so they
    // can't reveal it.
    const shell = await getDoc('/notices');
    if (shell.gated) { blocked = true; blockedReason = GATE_TEXT; }
    raws.push(stashRaw(est, '/notices-shell', shell));
    // The token is rotated per session, and the JSON POSTs need the current one.
    token = csrfFrom(shell.doc) || token;

    if (!blocked) {
      const actionUrl = (row, cls) => {
        const a = (row.actions || []).find((x) => x && x.class === cls && x.link);
        return a ? a.link : null;
      };

      const notices = await searchJson('/notices');
      raws.push(stashRaw(est, '/notices', notices));
      await upsert('ajeer_notices', (notices.rows || []).filter((n) => n && n.id != null).map((n) => ({
        establishment_no: est,
        notice_id: n.id,
        contract_no: n.contract_number != null ? String(n.contract_number) : null,
        iqama_no: n.laborer_id_number != null ? String(n.laborer_id_number) : null,
        worker_name: clean(n.laborer_name),
        notice_type: clean(n.notice_type),
        status: clean(n.status),
        status_code: clean(n.status_code),
        end_date: date(n.end_date),
        view_url: actionUrl(n, 'view'),
        raw: n,
        synced_at: new Date().toISOString(),
      })), 'establishment_no,notice_id');

      const contracts = await searchJson('/contracts');
      raws.push(stashRaw(est, '/contracts', contracts));
      await upsert('ajeer_contracts', (contracts.rows || []).filter((c) => c && c.id != null).map((c) => ({
        establishment_no: est,
        contract_id: c.id,
        contract_no: c.contract_number != null ? String(c.contract_number) : null,
        second_party: clean(c.other_party),
        notice_type: clean(c.notice_type),
        status: clean(c.status),
        status_code: clean(c.status_code),
        end_date: date(c.end_date),
        view_url: actionUrl(c, 'view'),
        raw: c,
        synced_at: new Date().toISOString(),
      })), 'establishment_no,contract_id');

      const pays = await getList('/payments/list');
      raws.push(stashRaw(est, '/payments/list', pays));
      const payRows = [];
      for (const t of (pays.tables || [])) {
        // Which list a row sits in comes from its section heading, not its position:
        // both lists share one panel and identical columns.
        const awaiting = /بانتظار/.test(t.section || '');
        for (const c of t.rows) {
          const no = clean(cell(t, c, 'رقم الفاتورة'));
          if (!no) continue;
          // "رقم الفاتورة" (1000265483) is not the id the printable ZATCA invoice uses
          // (/payments/697730/print) — that one exists only on the row's action link.
          const printLink = (c.links || []).find((l) => /^\\/payments\\/\\d+\\/print$/.test(l));
          payRows.push({
            establishment_no: est, invoice_no: no,
            amount: num(cell(t, c, 'القيمة')),
            status: clean(cell(t, c, 'الحالة')),
            due_date: date(cell(t, c, 'تاريخ الانتهاء')),
            awaiting_payment: awaiting,
            print_id: printLink ? printLink.split('/')[2] : null,
            raw: { section: t.section, headers: t.headers, cells: c.cells, status_code: c.statusCode, links: c.links },
            synced_at: new Date().toISOString(),
          });
        }
      }
      await upsert('ajeer_payments', payRows, 'establishment_no,invoice_no');

      // مؤشرات عمالة المنشأة — weekly history + the three summary percentages.
      const ind = await getList('/taqaul/indicators');
      raws.push(stashRaw(est, '/taqaul/indicators', ind));
      const indRows = [];
      for (const t of (ind.tables || [])) {
        for (const c of t.rows) {
          const wk = clean(cell(t, c, 'الأسابيع'));
          if (!wk || !/^\\d+$/.test(wk)) continue;
          indRows.push({
            establishment_no: est, week_no: parseInt(wk, 10),
            period_days: num(cell(t, c, 'الفترة الزمنية')),
            weekly: num(cell(t, c, 'المؤشر الأسبوعي')),
            quarterly: num(cell(t, c, 'المؤشر الربع سنوي')),
            yearly: num(cell(t, c, 'المؤشر السنوي')),
            raw: { headers: t.headers, cells: c.cells },
            synced_at: new Date().toISOString(),
          });
        }
      }
      await upsert('ajeer_indicators', indRows, 'establishment_no,week_no');
      // The summary cards sit outside the list; they are read as the three percentages
      // appearing before it, in the order the page states them.
      try {
        const pct = (ind.doc.body.textContent || '').match(/(\\d+(?:\\.\\d+)?)%/g) || [];
        if (pct.length >= 3) {
          summary = {
            indicator_weekly: parseFloat(pct[0]), indicator_quarterly: parseFloat(pct[1]), indicator_yearly: parseFloat(pct[2]),
          };
        }
      } catch (e) {}

      try { raws.push(stashRaw(est, '/dashboard', await getDoc('/dashboard'))); } catch (e) {}
    }

    // profile/* stays reachable even behind the gate, so it is fetched either way.
    for (const p of ['/profile/information', '/profile/address', '/profile/representatives']) {
      try { raws.push(stashRaw(est, p, await getDoc(p))); } catch (e) {}
    }

    await upsert('ajeer_raw', raws, 'establishment_no,path');
    return { blocked, blockedReason, summary };
  };

  // ---- main ---------------------------------------------------------------
  try {
    msg('جاري القراءة...');
    let runId = null;
    try {
      const runRes = await supaFetch('/rest/v1/sync_runs?select=id', {
        method: 'POST', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ source_id: SOURCE, person_id: PERSON, status: 'running' }),
      });
      const runArr = await runRes.json();
      runId = Array.isArray(runArr) ? runArr[0]?.id : runArr?.id;
    } catch (e) {}

    // Account list. Ajeer's chooser is now client-rendered (moved under
    // qiwa.sa), so fetching /auth/qiwa/login returns an empty SPA shell with
    // zero account <li>s — the old fetch-then-parse silently found nothing.
    // Read the LIVE document when we're on the chooser page, and only fall back
    // to a fetch if the live DOM has none (e.g. the tool was run elsewhere).
    const readAccounts = (doc) => [...doc.querySelectorAll('li.registration__account')].map((li) => ({
      establishment_no: li.dataset.number,
      account_type: li.dataset.type,
      name: (li.querySelector('.registration__accountText') || {}).textContent?.trim() || null,
    })).filter((a) => a.establishment_no);
    token = csrfFrom(document) || token;
    let accounts = readAccounts(document);
    if (!accounts.length) {
      // Fetch also clears the active establishment — harmless, the sweep sets
      // context explicitly before every establishment anyway.
      const chooser = await getDoc('/auth/qiwa/login');
      token = csrfFrom(chooser.doc) || token;
      accounts = readAccounts(chooser.doc);
    }

    if (!accounts.length) { msg('❌ لم أجد قائمة الحسابات — افتح صفحة اختيار الحساب (ajeer.qiwa.sa/auth/qiwa/login) وشغّل الأداة منها'); return; }
    await upsert('ajeer_establishments', accounts.map((a) => ({ ...a, person_id: PERSON || null, raw: a })), 'establishment_no');
    msg('القائمة: ' + accounts.length + ' حساب');

    let sweep = accounts.filter((a) => a.account_type === 'establishment');
    // Resume: skip establishments swept within the last 2 hours, so a sweep
    // interrupted by leaving the site continues instead of restarting. A full
    // re-sync is still possible once the 2h window passes.
    const RESUME_WINDOW_MS = 2 * 60 * 60 * 1000;
    // إعادة ضبط: الأساس RESET_AT بدل نافذة الساعتين — يعيد ما قبله ويستأنف ما بعده.
    const resumeAfter = (FORCE && RESET_AT) ? RESET_AT : new Date(Date.now() - RESUME_WINDOW_MS).toISOString();
    let skippedRecent = 0;
    try {
      const dr = await supaFetch('/rest/v1/ajeer_establishments?select=establishment_no&last_synced_at=gte.' + encodeURIComponent(resumeAfter) + '&limit=5000');
      if (dr.ok) {
        const da = await dr.json();
        if (Array.isArray(da)) {
          const doneSet = new Set(da.map((r) => String(r.establishment_no)));
          const before = sweep.length;
          sweep = sweep.filter((a) => !doneSet.has(String(a.establishment_no)));
          skippedRecent = before - sweep.length;
        }
      }
    } catch (e) {}
    // Cumulative counter against the FULL list: count resumed establishments as
    // done so a run continued after a logout reads e.g. "41/91" and climbs,
    // making it visible that it picked up where it stopped instead of restarting.
    const grandTotal = sweep.length + skippedRecent;
    if (skippedRecent) msg('استئناف: مكتمل سابقاً ' + skippedRecent + '/' + grandTotal + ' — إكمال الباقي');
    let done = 0, okCount = 0, blockedCount = 0;
    for (const a of sweep) {
      try {
        const ok = await switchTo(a.establishment_no, a.account_type);
        if (!ok) { blockedCount++; }
        else {
          const res = await syncActive(a.establishment_no);
          if (res.blocked) blockedCount++; else okCount++;
          await upsert('ajeer_establishments', [{
            establishment_no: a.establishment_no, account_type: a.account_type, name: a.name,
            person_id: PERSON || null,
            is_blocked: res.blocked, blocked_reason: res.blockedReason,
            ...(res.summary || {}),
            last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          }], 'establishment_no');
        }
      } catch (e) {}
      done++;
      if (done % 5 === 0 || done === sweep.length) {
        msg('مسح: ' + (skippedRecent + done) + '/' + grandTotal + ' · تم ' + okCount + ' · محجوب ' + blockedCount);
      }
    }

    if (runId) {
      await supaFetch('/rest/v1/sync_runs?id=eq.' + runId, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'success', completed_at: new Date().toISOString(), records_fetched: okCount }),
      });
    }
    msg('✅ تم ' + (skippedRecent + okCount) + '/' + grandTotal + ' · محجوب ' + blockedCount + (skippedRecent ? ' · سابقاً ' + skippedRecent : ''));
    setTimeout(() => { document.getElementById('_jisr_ajeer_ui')?.remove(); }, 30000);
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

export function buildAjeerBookmarklet({ sourceId, personId, force = false, resetAt = '' }) {
  return 'javascript:' + encodeURIComponent(minify(body({ sourceId, personId, force, resetAt })))
}
