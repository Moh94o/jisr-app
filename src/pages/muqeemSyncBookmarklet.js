// Muqeem sync bookmarklet — TWO modes, auto-detected at runtime:
//
//   • Orchestrator mode  — run on the "الدخول الموحد" picker page
//       (muqeem.sa/#/single-sign-on/absher/login). Pulls the FULL list of
//       establishments the Absher identity can reach via /api/sso/absher/get-users
//       (no manual paging through the ~100-page picker), mints a per-org session
//       token via /api/sso/absher/get-application-jwt, and runs the full deep
//       sync for EACH establishment in one automated, resumable pass.
//
//   • Single mode        — run on any normal muqeem page. Syncs the currently
//       active org only (legacy behaviour), capturing the live session token.
//
// Auth notes:
//   - Absher SSO temp JWT lives in localStorage.tmpJwt (shared across all orgs,
//     ~15-min TTL, cannot be refreshed without redoing the Absher handshake).
//   - get-users / get-application-jwt require Authorization: Bearer <tmpJwt> and
//     the X-XSRF-TOKEN header (mirrors the XSRF-TOKEN cookie).
//   - get-application-jwt returns { id_token } — a full per-org session token
//     used as Authorization: Bearer for that org's data endpoints. We never call
//     setToken, so the browser session is never switched — each org is synced
//     purely via its own bearer token, in memory, with no navigation.
//
// Resumability: every org's detail_synced_at is stamped in muqeem_companies. On
// (re-)start the orchestrator skips any org already deep-synced today, so when a
// tmpJwt window expires mid-run the user just re-opens the picker and re-runs;
// it continues from where it stopped until all establishments are done.
//
// CORS: muqeem.sa is same-origin for every /api call. Supabase writes are blocked
// by muqeem's CSP, so they are piped through the muqeem-bridge.html popup.

const SUPABASE_URL = 'https://gcvshzutdslmdkwqwteh.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdnNoenV0ZHNsbWRrd3F3dGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTkwNjgsImV4cCI6MjA5MDQ3NTA2OH0.5R0I5VvB7lp3wpSrtay3DMcXKsT9l1uK0Ukd1F4_ImM'

function body({ sourceId, personId, proxyBaseUrl }) {
  return `
(async () => {
  const U = '${SUPABASE_URL}', K = '${SUPABASE_ANON}';
  const SOURCE = '${sourceId}', PERSON = '${personId}';
  const API = 'https://muqeem.sa';
  const BRIDGE_URL = '${proxyBaseUrl}/muqeem-bridge.html';

  const msg = (m) => {
    let d = document.getElementById('_jisr_muqeem_ui');
    if (!d) {
      d = document.createElement('div'); d.id = '_jisr_muqeem_ui';
      d.style.cssText = 'position:fixed;top:16px;left:16px;background:#111;color:#f59e0b;padding:12px 18px;border-radius:10px;z-index:2147483647;font:700 13px/1.5 sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.5);max-width:420px;direction:rtl;text-align:right;border:1px solid rgba(245,158,11,.4)';
      document.body.appendChild(d);
    }
    d.textContent = 'جسر مقيم: ' + m;
    return d;
  };

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
      bridgeWin = window.open(BRIDGE_URL, 'jisr_muqeem_bridge');
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
        bridgeWin.postMessage({ id, path, method: opts.method || 'POST', headers: opts.headers || {}, body: opts.body || null, b64: !!opts.b64 }, '*');
      } catch (e) { clearTimeout(timer); pending.delete(id); reject(e); }
    });
    const text = reply.body || '';
    return {
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      text: async () => text,
      json: async () => { try { return JSON.parse(text) } catch { return null } },
    };
  };

  const origFetch = window.fetch;
  const decodeJwt = (t) => { try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch { return null } };
  const getCookie = (name) => {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.$?*|{}()[\\]\\\\\\/+^]/g, '\\\\$&') + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  };
  const getXsrf = () => {
    for (const n of ['XSRF-TOKEN', 'xsrf-token', 'csrf-token', 'CSRF-TOKEN']) { const v = getCookie(n); if (v) return v; }
    return null;
  };

  // ── Per-org deep sync ──────────────────────────────────────────────────
  // Runs the full data pull for ONE establishment using its own bearer token.
  // moi: the establishment MOI number (string). headers: fully-built request
  // headers (Authorization + X-Xsrf-Token). Returns { residentsCount }.
  const syncOrg = async (moi, headers, apiBase, userLogin) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    // Muqeem ROTATES the XSRF-TOKEN cookie on every response, so a cached token
    // goes stale after the first request and every later POST 403s with
    // "Invalid CSRF Token". Read the cookie fresh on each call instead.
    const muq = async (path, opts = {}) => {
      try {
        const r = await origFetch(apiBase + path, { credentials: 'include', ...opts, headers: { ...headers, 'X-Xsrf-Token': getXsrf(), ...(opts.headers || {}) } });
        if (!r.ok) return { ok: false, status: r.status };
        const text = await r.text();
        let data; try { data = JSON.parse(text) } catch { data = text }
        return { ok: true, data };
      } catch (e) { return { ok: false, error: String(e?.message || e) }; }
    };
    const muqPost = (path, b) => muq(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b || {}) });
    // extra lets a caller override headers per request — notably Accept-Language,
    // which is what decides whether Muqeem renders the PDF in Arabic or English.
    const muqPostPdf = async (path, b, contentType = 'application/json', extra) => {
      try {
        const r = await origFetch(apiBase + path, {
          method: 'POST', credentials: 'include',
          headers: { ...headers, 'X-Xsrf-Token': getXsrf(), 'Content-Type': contentType, ...(extra || {}) },
          body: contentType === 'application/json' ? JSON.stringify(b) : b,
        });
        if (!r.ok) return null;
        return await r.blob();
      } catch (e) { return null; }
    };
    // Storage uploads MUST go through the bridge: muqeem's CSP blocks any direct
    // request to supabase.co, so a plain fetch to Storage silently fails (this
    // is why no file ever landed). Base64 the bytes across postMessage instead.
    const blobToB64 = (blob) => new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => { const s = String(fr.result || ''); const i = s.indexOf(','); resolve(i >= 0 ? s.slice(i + 1) : s); };
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    const uploadB64 = async (path, b64, contentType) => {
      try {
        if (!b64) return null;
        const r = await supaFetch('/storage/v1/object/muqeem-pdfs/' + path, {
          method: 'POST',
          headers: { 'Content-Type': contentType, 'x-upsert': 'true' },
          body: b64, b64: true,
        });
        return r.ok ? path : null;
      } catch (e) { return null; }
    };
    const uploadPdf = async (path, blob) => {
      try { return await uploadB64(path, await blobToB64(blob), 'application/pdf'); }
      catch (e) { return null; }
    };

    // Raw capture buffer (every dashboard endpoint saved verbatim).
    const rawRows = [];
    const stashRaw = (endpoint, method, req, r) => {
      if (!r) return;
      rawRows.push({
        moi_number: moi, endpoint, method: method || 'GET',
        request: req != null ? req : null,
        response: r.ok ? (r.data ?? null) : { _error: String(r.status || r.error || 'failed') },
        http_status: r.ok ? 200 : (r.status || null),
        captured_at: new Date().toISOString(),
      });
    };
    const flushRaw = async () => {
      const batch = rawRows.splice(0);
      if (!batch.length) return;
      await supaFetch('/rest/v1/muqeem_raw?on_conflict=moi_number,endpoint,method', {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(batch),
      });
    };

    // Operator/account profile — carries the branch (domain) id for X-Domain.
    const account = await muq('/api/account');
    if (account.ok && account.data && !headers['X-Domain']) {
      const did = account.data?.domains?.[0]?.id;
      if (did != null) headers['X-Domain'] = String(did);
    }
    stashRaw('/api/account', 'GET', null, account);

    // Rich org data — parallel.
    const year = new Date().getFullYear();
    const uLogin = userLogin || moi;
    const [
      details, subOverview, subAll, subApiAll, pointBal, pointPools, expiryNotice,
      remainingUsers, smsBal, chargedSms, utilDate, preLogin, notifs, tawasal, stats,
    ] = await Promise.all([
      muq('/api/organization/details'),
      muq('/api/subscriptions/business/overview'),
      muq('/api/subscriptions/business/all'),
      muq('/api/subscriptions/api/all'),
      muq('/api/point/balance'),
      muq('/api/point/pools'),
      muq('/api/point/expiry-point-notice'),
      muqPost('/api/user-management/users/remaining-users'),
      muq('/api/paid-sms/balance'),
      muq('/api/paid-sms/charged-transactions?page=0&size=5'),
      muq('/api/utility/date'),
      muq('/api/preLoginConfig'),
      muqPost('/api/notification/v1/list?page=0&size=10&sort=id,DESC', { basicSearch: false, read: { equals: false } }),
      muqPost('/api/tawasal-request/list?page=0&size=10&sort=createdDate,DESC', { basicSearch: false }),
      muqPost('/api/report/v1/stats', { userLogin: uLogin, moiNumber: moi, year }),
    ]);
    stashRaw('/api/organization/details', 'GET', null, details);
    stashRaw('/api/subscriptions/business/overview', 'GET', null, subOverview);
    stashRaw('/api/subscriptions/business/all', 'GET', null, subAll);
    stashRaw('/api/subscriptions/api/all', 'GET', null, subApiAll);
    stashRaw('/api/point/balance', 'GET', null, pointBal);
    stashRaw('/api/point/pools', 'GET', null, pointPools);
    stashRaw('/api/point/expiry-point-notice', 'GET', null, expiryNotice);
    stashRaw('/api/user-management/users/remaining-users', 'POST', {}, remainingUsers);
    stashRaw('/api/paid-sms/balance', 'GET', null, smsBal);
    stashRaw('/api/paid-sms/charged-transactions', 'GET', { page: 0, size: 5 }, chargedSms);
    stashRaw('/api/utility/date', 'GET', null, utilDate);
    stashRaw('/api/preLoginConfig', 'GET', null, preLogin);
    stashRaw('/api/notification/v1/list', 'POST', { basicSearch: false, read: { equals: false } }, notifs);
    stashRaw('/api/tawasal-request/list', 'POST', { basicSearch: false }, tawasal);
    stashRaw('/api/report/v1/stats', 'POST', { userLogin: uLogin, moiNumber: moi, year }, stats);

    const patch = { moi_number: moi, synced_at: new Date().toISOString() };
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

    // Residents count.
    const rCount = await muqPost('/api/report/residents-count', { moiNumber: moi });
    if (rCount.ok && rCount.data) {
      patch.residents_count_raw = rCount.data;
      patch.residents_count = rCount.data.residentsCount ?? null;
    }

    // History reports + finance — parallel.
    const reportBody = { moiNumber: moi };
    const PER = '?page=0&size=1000';
    const [
      rIssued, rRenewed, rIssuedER, rExtER, rExtVisit, rFinal, rProbFinal,
      rChangeOcc, rTransferred, rDrop, rTranslated, rPoints, rPayments,
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
    const reportCount = (r) => {
      if (!r?.ok || !r.data) return null;
      const d = r.data;
      if (Array.isArray(d)) return d.length;
      if (Array.isArray(d.content)) return d.totalElements ?? d.content.length;
      if (Array.isArray(d.rows)) return d.totalElements ?? d.rows.length;
      return d.totalElements ?? d.total ?? null;
    };
    const assign = (rep, rawKey, countKey) => {
      if (rep?.ok && rep.data) { patch[rawKey] = rep.data; patch[countKey] = reportCount(rep); }
    };
    assign(rIssued,      'report_issued_iqama_raw',          'report_issued_iqama_count');
    assign(rRenewed,     'report_renewed_iqama_raw',         'report_renewed_iqama_count');
    assign(rIssuedER,    'report_issued_er_visa_raw',        'report_issued_er_visa_count');
    assign(rExtER,       'report_extended_er_visa_raw',      'report_extended_er_visa_count');
    assign(rExtVisit,    'report_extended_visit_visa_raw',   'report_extended_visit_visa_count');
    assign(rFinal,       'report_final_exit_raw',            'report_final_exit_count');
    assign(rProbFinal,   'report_probation_final_exit_raw',  'report_probation_final_exit_count');
    assign(rChangeOcc,   'report_change_occupation_raw',     'report_change_occupation_count');
    assign(rTransferred, 'report_transferred_iqama_raw',     'report_transferred_iqama_count');
    assign(rDrop,        'report_drop_resident_raw',         'report_drop_resident_count');
    assign(rTranslated,  'report_update_translated_name_raw','report_update_translated_name_count');

    // Residents report PDF — kept as two cuts: workers only, and the same report
    // including accompanying dependents. Same endpoint, dependants flag differs.
    const reportBodyPdf = { basicSearch: false, sponsorNumber: { equals: moi } };
    const reportPdf = await muqPostPdf('/api/report/residents/print?dependants=false', reportBodyPdf);
    if (reportPdf && reportPdf.size > 1000) {
      const path = 'residents-report/' + moi + '/' + todayStr + '.pdf';
      const uploaded = await uploadPdf(path, reportPdf);
      if (uploaded) { patch.residents_report_pdf_path = uploaded; patch.residents_report_pdf_at = new Date().toISOString(); }
    }
    const reportPdfDep = await muqPostPdf('/api/report/residents/print?dependants=true', reportBodyPdf);
    if (reportPdfDep && reportPdfDep.size > 1000) {
      const pathDep = 'residents-report/' + moi + '/' + todayStr + '-dep.pdf';
      const uploadedDep = await uploadPdf(pathDep, reportPdfDep);
      if (uploadedDep) { patch.residents_report_dep_pdf_path = uploadedDep; patch.residents_report_dep_pdf_at = new Date().toISOString(); }
    }

    await supaFetch('/rest/v1/muqeem_companies?on_conflict=moi_number', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([patch]),
    });
    await flushRaw();

    // Resident rows — paginate.
    const extractRows = (d) => {
      if (!d) return null;
      if (Array.isArray(d)) return d;
      if (Array.isArray(d.rows)) return d.rows;
      if (Array.isArray(d.content)) return d.content;
      if (Array.isArray(d.data)) return d.data;
      if (Array.isArray(d.items)) return d.items;
      return null;
    };
    const allResidents = [];
    const residentsEndpoints = ['/api/report/residents', '/api/report/active-residents', '/api/report/active-aliens'];
    let endpointWorks = null;
    outer: for (const ep of residentsEndpoints) {
      for (let page = 0; page < 50; page++) {
        // The residents LIST takes the filter DTO ({basicSearch, sponsorNumber:{equals}}),
        // NOT {moiNumber} like residents-count/the other reports — that 400s.
        const rr = await muqPost(ep + '?page=' + page + '&size=1000&sort=iqamaNumber,ASC&dependants=false', { basicSearch: false, sponsorNumber: { equals: moi } });
        if (!rr.ok) { if (page === 0) continue outer; break; }
        const rows = extractRows(rr.data);
        if (!rows) { if (page === 0) continue outer; break; }
        if (rows.length === 0) { if (page === 0) continue outer; break; }
        if (!endpointWorks) endpointWorks = ep;
        allResidents.push(...rows);
        if (rows.length < 1000) break;
      }
      if (endpointWorks) break;
    }

    // Per-resident deep profile — bounded concurrency.
    const profilePdfPaths = new Map();
    const profilePdfEnPaths = new Map();
    const photoPaths = new Map();
    const detailByIqama = new Map();
    if (allResidents.length > 0) {
      const CONCURRENCY = 3; let cursor = 0;
      const fetchDetail = async (iqn) => {
        const b = { iqamaNumber: iqn }; const idBody = { identityNumber: iqn };
        const [profile, insurance, visas, violations, jawazatBalance,
               dependents, drivingLicenses, vehicles, jawazatServices, photo] = await Promise.all([
          muqPost('/api/alien/iqama/search/simple/iqama', b),
          muqPost('/api/alien/iqama/insurance', b),
          muqPost('/api/alien/iqama/visas', b),
          muqPost('/api/alien/iqama/violations?page=1&size=10', b),
          muqPost('/api/alien/iqama/jawazat-balance', idBody),
          muqPost('/api/alien/iqama/depents', b),
          muqPost('/api/alien/iqama/driving-licenses', b),
          muqPost('/api/alien/iqama/vehicles', b),
          muqPost('/api/alien/iqama/get-jawazat-services', b),
          muqPost('/api/alien/photo', { identityNumber: iqn, moiNumber: '' }),
        ]);
        const pick = (r) => (r && r.ok ? r.data : (r ? { _status: r.status || null } : null));
        return {
          profile: pick(profile), insurance: pick(insurance), visas: pick(visas),
          violations: pick(violations), jawazat_balance: pick(jawazatBalance),
          dependents: pick(dependents), driving_licenses: pick(drivingLicenses),
          vehicles: pick(vehicles), jawazat_services: pick(jawazatServices),
          photo: (photo && photo.ok && photo.data && photo.data.photo) ? photo.data.photo : null,
        };
      };
      const worker = async () => {
        while (cursor < allResidents.length) {
          const i = cursor++; const r = allResidents[i]; const iqn = String(r.iqamaNumber);
          const blob = await muqPostPdf('/api/alien/iqama/print', iqn, 'text/plain');
          if (blob && blob.size > 1000) {
            const path = 'iqama-profile/' + moi + '/' + iqn + '/' + todayStr + '.pdf';
            const uploaded = await uploadPdf(path, blob);
            if (uploaded) profilePdfPaths.set(iqn, uploaded);
          }
          // Same endpoint, English rendering — only Accept-Language differs.
          const blobEn = await muqPostPdf('/api/alien/iqama/print', iqn, 'text/plain', { 'Accept-Language': 'en' });
          if (blobEn && blobEn.size > 1000) {
            const pathEn = 'iqama-profile/' + moi + '/' + iqn + '/' + todayStr + '-en.pdf';
            const uploadedEn = await uploadPdf(pathEn, blobEn);
            if (uploadedEn) profilePdfEnPaths.set(iqn, uploadedEn);
          }
          try {
            const det = await fetchDetail(iqn);
            // The photo comes back as base64 JPEG. Park it in Storage like the
            // PDFs and strip it from detail_raw — a ~29KB image per resident
            // inside jsonb bloats every query that reads the column.
            if (det && det.photo) {
              const pPath = 'iqama-photo/' + moi + '/' + iqn + '/' + todayStr + '.jpg';
              const up = await uploadB64(pPath, det.photo, 'image/jpeg');
              if (up) photoPaths.set(iqn, up);
              delete det.photo;
            }
            detailByIqama.set(iqn, det);
          } catch (_) {}
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
          sponsor_moi_number: r.sponsorNumber ? String(r.sponsorNumber) : String(moi),
          name_ar: r.name?.nameAr || null, name_en: r.name?.nameEn || null,
          gender_code: r.gender?.code || null, gender_ar: r.gender?.ar || null, gender_en: r.gender?.en || null,
          nationality_code: r.nationality?.code || null, nationality_ar: r.nationality?.ar || null, nationality_en: r.nationality?.en || null,
          occupation_code: r.occupation?.code || null, occupation_ar: r.occupation?.ar || null, occupation_en: r.occupation?.en || null,
          passport_number: r.passportNumber || null, passport_expiry: r.passportExpiryDate || null,
          status_code: r.status?.code || null, status_ar: r.status?.ar || null, status_en: r.status?.en || null,
          iqama_issue_date: r.iqamaIssueDate || null, iqama_expiry_date: r.iqamaExpiryDate || null,
          iqama_expiry_hijri: r.hijriIqamaExpiryDate || null, birth_date: r.birthDate || null,
          is_outside_kingdom: r.isOutsideTheKingdom ?? null,
          raw: r, synced_at: new Date().toISOString(),
        };
        if (pdfPath) { row.profile_pdf_path = pdfPath; row.profile_pdf_at = new Date().toISOString(); }
        const pdfEnPath = profilePdfEnPaths.get(iqn);
        if (pdfEnPath) { row.profile_pdf_en_path = pdfEnPath; row.profile_pdf_en_at = new Date().toISOString(); }
        const photoPath = photoPaths.get(iqn);
        if (photoPath) { row.photo_path = photoPath; row.photo_at = new Date().toISOString(); }
        const detail = detailByIqama.get(iqn);
        if (detail) { row.detail_raw = detail; row.detail_synced_at = new Date().toISOString(); }
        return row;
      });
      const chunk = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };
      for (const part of chunk(resRows, 100)) {
        await supaFetch('/rest/v1/muqeem_residents?on_conflict=iqama_number', {
          method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(part),
        });
      }
    }

    // Points + payment history.
    const pointsRows = (rPoints?.data?.content || rPoints?.data?.rows || (Array.isArray(rPoints?.data) ? rPoints.data : [])).map(p => ({
      external_id: String(p.id ?? p.transactionId ?? '') || null, moi_number: moi,
      created_by: p.createdBy || null, created_at_muqeem: p.createdDate || p.created_at || p.transactionDate || null,
      amount: p.amount ?? p.points ?? null, transaction_type: p.type || p.transactionType || null,
      description: p.description || p.transactionDescription || null, raw: p, synced_at: new Date().toISOString(),
    })).filter(r => r.external_id);
    if (pointsRows.length > 0) {
      await supaFetch('/rest/v1/muqeem_points_transactions?on_conflict=external_id', {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(pointsRows),
      });
    }
    const paymentRows = (rPayments?.data?.content || rPayments?.data?.rows || (Array.isArray(rPayments?.data) ? rPayments.data : [])).map(p => ({
      external_id: String(p.id ?? p.invoiceId ?? p.paymentId ?? '') || null, moi_number: moi,
      invoice_id: p.invoiceId ?? null, package_id: p.packageId ?? null, package_name_ar: p.packageNameAr || null,
      start_date: p.startDate || null, expiry_date: p.expiryDate || null, amount: p.amount ?? p.totalAmount ?? null,
      status: p.status || p.statusCode || null, raw: p, synced_at: new Date().toISOString(),
    })).filter(r => r.external_id);
    if (paymentRows.length > 0) {
      await supaFetch('/rest/v1/muqeem_payment_history?on_conflict=external_id', {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(paymentRows),
      });
    }

    // Subscription history.
    if (subAll.ok && Array.isArray(subAll.data) && subAll.data.length) {
      const subRows = subAll.data.map(s => ({
        subscription_id: s.subscriptionId, moi_number: moi, package_id: s.packageId ?? null,
        package_name_ar: s.packageNameAr || null, package_name_en: s.packageNameEn || null,
        resident_count_from: s.residentCountFrom ?? null, resident_count_to: s.residentCountTo ?? null,
        start_date: s.startDate || null, expiry_date: s.expiryDate || null,
        original_expiry_date: s.originalExpiryDate || null, extension_expiry_date: s.extensionExpiryDate || null,
        status_code: s.statusCode || null, invoice_id: s.invoiceId ?? null,
        can_renew: s.canRenew ?? null, can_be_upgraded: s.canBeUpgraded ?? null, can_cancel: s.canCancel ?? null,
        raw: s, synced_at: new Date().toISOString(),
      }));
      await supaFetch('/rest/v1/muqeem_subscriptions?on_conflict=subscription_id', {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(subRows),
      });
    }

    // Printing packages — enriched raw only.
    const pkgList = await muqPost('/api/printing/packages?page=0&size=100&sort=id,DESC', { basicSearch: false });
    stashRaw('/api/printing/packages', 'POST', { basicSearch: false }, pkgList);
    if (pkgList.ok && Array.isArray(pkgList.data) && pkgList.data.length) {
      const pkgs = pkgList.data; const enriched = []; const PCONC = 3; let pcur = 0;
      const pkgWorker = async () => {
        while (pcur < pkgs.length) {
          const p = pkgs[pcur++]; const id = p.id;
          const [view, counts, boxes] = await Promise.all([
            muq('/api/printing/packages/' + id + '/view'),
            muq('/api/printing/packages/' + id + '/counts'),
            muq('/api/printing/packages/' + id + '/boxes'),
          ]);
          enriched.push({ ...p, view: view.ok ? view.data : null, counts: counts.ok ? counts.data : null, boxes: boxes.ok ? boxes.data : null });
        }
      };
      await Promise.all(Array.from({ length: PCONC }, pkgWorker));
      stashRaw('/api/printing/packages/enriched', 'GET', null, { ok: true, data: enriched });
    }
    await flushRaw();

    return { residentsCount: allResidents.length };
  };

  try {
    // ── Mode detection ───────────────────────────────────────────────────
    if (!location.hostname.endsWith('muqeem.sa')) return msg('افتح مقيم أولاً (muqeem.sa)');

    const onPicker = /single-sign-on/.test(location.hash) || /single-sign-on/.test(location.pathname);
    const tmpJwt = localStorage.getItem('tmpJwt');
    const tmpPayload = tmpJwt ? decodeJwt(tmpJwt) : null;
    const xsrf = getXsrf();

    // Orchestrator mode requires a live Absher SSO temp JWT + the picker context.
    const canOrchestrate = !!(tmpJwt && tmpPayload && (tmpPayload.AUTH === 'ELM_ABSHER_SSO' || tmpPayload.absherReferenceNumber));

    if (onPicker || canOrchestrate) {
      // ═══ ORCHESTRATOR — sync every establishment ═══
      const now = Math.floor(Date.now() / 1000);
      if (!canOrchestrate) {
        return msg('❌ ما لقيت جلسة أبشر المؤقتة (tmpJwt). افتح «الدخول الموحد» من أبشر ثم شغّل الأداة على تلك الصفحة.');
      }
      const tmpExp = tmpPayload.exp || 0;
      if (tmpExp && tmpExp - now < 30) {
        return msg('❌ انتهت صلاحية جلسة أبشر المؤقتة. ارجع لأبشر واضغط «الانتقال الى مقيم» من جديد ثم شغّل الأداة.');
      }

      // XSRF-TOKEN rotates on every response — recompute per SSO call.
      const ssoHeaders = () => {
        const h = { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tmpJwt };
        const x = getXsrf(); if (x) h['X-XSRF-TOKEN'] = x;
        return h;
      };

      msg('جلب قائمة المنشآت من الدخول الموحد...');
      let users;
      try {
        // get-users requires tmpJwt in the BODY (validated NotBlank), not just the header.
        const ur = await origFetch(API + '/api/sso/absher/get-users', { method: 'POST', credentials: 'include', headers: ssoHeaders(), body: JSON.stringify({ tmpJwt }) });
        if (!ur.ok) return msg('❌ فشل جلب المنشآت (HTTP ' + ur.status + '). جرّب إعادة فتح «الدخول الموحد».');
        users = await ur.json();
      } catch (e) { return msg('❌ فشل جلب المنشآت: ' + ((e && e.message) || e)); }
      if (!Array.isArray(users) || !users.length) return msg('❌ لم تُرجع القائمة أي منشأة.');

      // Master upsert: make sure every establishment has a row (list-only) up front.
      const listRows = users.map(u => ({
        moi_number: String(u.username || u.organizationId),
        name_ar: u.organizationNameAr || null,
        name_en: u.organizationNameEn || null,
        synced_at: new Date().toISOString(),
      }));
      await supaFetch('/rest/v1/muqeem_companies?on_conflict=moi_number', {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(listRows),
      });

      // Resume: skip establishments already deep-synced today.
      const todayStart = new Date().toISOString().slice(0, 10) + 'T00:00:00Z';
      const doneSet = new Set();
      try {
        const doneRes = await supaFetch('/rest/v1/muqeem_companies?select=moi_number&detail_synced_at=gte.' + encodeURIComponent(todayStart), { method: 'GET' });
        const doneArr = await doneRes.json();
        if (Array.isArray(doneArr)) doneArr.forEach(r => doneSet.add(String(r.moi_number)));
      } catch (_) {}

      // One sync_runs row for this pass.
      let runId = null;
      try {
        const runRes = await supaFetch('/rest/v1/sync_runs?select=id', {
          method: 'POST', headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ source_id: SOURCE, person_id: PERSON, status: 'running' }),
        });
        const runArr = await runRes.json();
        runId = Array.isArray(runArr) ? runArr[0]?.id : runArr?.id;
      } catch (_) {}

      const total = users.length;
      const pending = users.filter(u => !doneSet.has(String(u.username || u.organizationId)));
      let done = doneSet.size, ok = 0, failed = 0, stoppedForExpiry = false;

      for (let i = 0; i < pending.length; i++) {
        const u = pending[i];
        const moi = String(u.username || u.organizationId);
        const orgName = u.organizationNameAr || moi;

        // tmpJwt expiry guard — mint tokens only while the temp JWT is valid.
        if (tmpExp && Math.floor(Date.now() / 1000) > tmpExp - 20) { stoppedForExpiry = true; break; }

        msg('(' + (done + 1) + '/' + total + ') ' + orgName + ' — تسجيل الدخول...');
        // Mint this org's session token.
        let idToken = null;
        try {
          const jr = await origFetch(API + '/api/sso/absher/get-application-jwt', {
            method: 'POST', credentials: 'include', headers: ssoHeaders(),
            body: JSON.stringify({ userId: u.userId, tmpJwt }),
          });
          if (jr.status === 401 || jr.status === 400) { stoppedForExpiry = true; break; }
          if (jr.ok) { const jd = await jr.json(); idToken = jd && jd.id_token; }
        } catch (e) { /* fall through as failure */ }
        if (!idToken) { failed++; continue; }

        // Per-org data headers. X-Xsrf-Token is injected fresh per request inside
        // syncOrg (the cookie rotates), so it isn't baked in here.
        const orgHeaders = {
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'ar-ly',
          'Authorization': 'Bearer ' + idToken,
        };

        msg('(' + (done + 1) + '/' + total + ') ' + orgName + ' — مزامنة...');
        try {
          const res = await syncOrg(moi, orgHeaders, API, String(u.userIdentificationNumber || u.username || moi));
          ok++; done++;
          msg('(' + done + '/' + total + ') ✅ ' + orgName + ' — ' + (res.residentsCount || 0) + ' مقيم');
        } catch (e) {
          failed++;
          msg('(' + (done + 1) + '/' + total + ') ⚠️ ' + orgName + ' — ' + ((e && e.message) || e));
        }
      }

      if (runId) {
        await supaFetch('/rest/v1/sync_runs?id=eq.' + runId, {
          method: 'PATCH',
          body: JSON.stringify({ status: stoppedForExpiry ? 'partial' : 'success', completed_at: new Date().toISOString(), records_fetched: ok }),
        });
      }

      const remaining = total - done;
      if (stoppedForExpiry && remaining > 0) {
        msg('⏸️ تمّت مزامنة ' + done + '/' + total + '. انتهت نافذة جلسة أبشر — ارجع لأبشر واضغط «الانتقال الى مقيم»، ثم شغّل الأداة من جديد لإكمال الباقي (' + remaining + ' منشأة).');
      } else if (remaining > 0) {
        msg('✅ ' + done + '/' + total + ' منشأة (نجح ' + ok + '، تعذّر ' + failed + '). أعد التشغيل لإكمال الباقي (' + remaining + ').');
      } else {
        msg('✅ اكتملت مزامنة كل المنشآت: ' + total + ' منشأة.');
        setTimeout(() => { document.getElementById('_jisr_muqeem_ui')?.remove(); }, 12000);
      }
      return;
    }

    // ═══ SINGLE MODE — sync the currently active org ═══
    // Capture the live session token from the SPA's own requests.
    const captured = { token: null, xsrf: xsrf, apiOrigin: null, xdomain: null };
    window.fetch = function (input, init) {
      try {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        const src = (init && init.headers) || (input instanceof Request ? input.headers : null);
        const h = {};
        if (src instanceof Headers) src.forEach((v, k) => { h[k.toLowerCase()] = v; });
        else if (src && typeof src === 'object') for (const k of Object.keys(src)) h[k.toLowerCase()] = src[k];
        const authH = h['authorization'];
        if (!captured.token && typeof authH === 'string' && authH.toLowerCase().startsWith('bearer ')) captured.token = authH.slice(7).trim();
        const xH = h['x-xsrf-token'] || h['xsrf-token'] || h['x-csrf-token'];
        if (!captured.xsrf && xH) captured.xsrf = xH;
        const dH = h['x-domain']; if (!captured.xdomain && dH) captured.xdomain = String(dH);
        if (!captured.apiOrigin && typeof url === 'string' && url.indexOf('/api/') >= 0) { try { captured.apiOrigin = new URL(url, location.href).origin; } catch {} }
      } catch (_) {}
      return origFetch.apply(this, arguments);
    };

    msg('بانتظار جلسة مقيم — افتح أي صفحة من القائمة (مثلاً «المقيمين»).');
    const deadline = Date.now() + 120000;
    while (!captured.token && Date.now() < deadline) {
      msg('بانتظار جلسة مقيم — افتح أي صفحة من القائمة. ' + Math.ceil((deadline - Date.now()) / 1000) + 'ث');
      await new Promise(r => setTimeout(r, 500));
    }
    if (!captured.token) return msg('❌ ما لقيت جلسة مقيم. سجّل دخول ثم أعد المحاولة.');

    const token = captured.token;
    const payload = decodeJwt(token) || {};
    const apiBase = captured.apiOrigin || API;
    let moi = payload.moiNumber || payload.sub || null;

    const headers = { 'Accept': 'application/json, text/plain, */*', 'Accept-Language': 'ar-ly', 'Authorization': 'Bearer ' + token };
    if (captured.xsrf) headers['X-Xsrf-Token'] = captured.xsrf;
    if (captured.xdomain) headers['X-Domain'] = captured.xdomain;

    if (!moi) {
      msg('جلب رقم المنشأة من السياق...');
      try {
        const r = await origFetch(apiBase + '/api/organization/details', { credentials: 'include', headers });
        if (r.ok) { const det = await r.json().catch(() => null); if (det) moi = det.moiNumber || det.organizationId || det.id || (det.crInfoDTO?.crEntityNumber) || null; }
        else if (r.status === 401 || r.status === 403) return msg('❌ غير مصرّح (' + r.status + ').');
      } catch (e) { return msg('❌ فشل الاتصال بـapi مقيم: ' + ((e && e.message) || e)); }
    }
    if (!moi) return msg('❌ ما لقيت رقم المنشأة.');
    moi = String(moi);

    let runId = null;
    try {
      const runRes = await supaFetch('/rest/v1/sync_runs?select=id', {
        method: 'POST', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ source_id: SOURCE, person_id: PERSON, status: 'running' }),
      });
      const runArr = await runRes.json();
      runId = Array.isArray(runArr) ? runArr[0]?.id : runArr?.id;
    } catch (_) {}

    msg('مزامنة المنشأة النشطة...');
    const res = await syncOrg(moi, headers, apiBase, payload.operatorId || moi);

    if (runId) {
      await supaFetch('/rest/v1/sync_runs?id=eq.' + runId, {
        method: 'PATCH', body: JSON.stringify({ status: 'success', completed_at: new Date().toISOString(), records_fetched: res.residentsCount || 0 }),
      });
    }
    msg('✅ ' + moi + ' — ' + (res.residentsCount || 0) + ' مقيم');
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
