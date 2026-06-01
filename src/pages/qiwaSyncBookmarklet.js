// Qiwa sync bookmarklet — runs on any *.qiwa.sa domain and fetches whatever
// endpoints the current origin can reach (CORS is per-subdomain in Qiwa):
//   auth.qiwa.sa     → /context/workspaces-v2/new + /groups (full list)
//   dashboard.qiwa.sa → /context/company + /api/v1/criteria/primary + indicators + cases
//   visa.qiwa.sa     → /visa-proxy/v3/absher-balance (current company)
// All requests must include credentials so the HttpOnly qiwa.authorization cookie flows.

const SUPABASE_URL = 'https://gcvshzutdslmdkwqwteh.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdnNoenV0ZHNsbWRrd3F3dGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTkwNjgsImV4cCI6MjA5MDQ3NTA2OH0.5R0I5VvB7lp3wpSrtay3DMcXKsT9l1uK0Ukd1F4_ImM'

function body({ sourceId, personId }) {
  return `
(async () => {
  const U = '${SUPABASE_URL}', K = '${SUPABASE_ANON}';
  const SOURCE = '${sourceId}', PERSON = '${personId}';
  const API_CORE = 'https://api.qiwa.sa';
  const API_INDICATORS = 'https://indicators-api.qiwa.sa';
  const API_DASHBOARD = 'https://dashboard-api.qiwa.sa';
  // Hosts added Part-1: address, WPS, violations, locations, employees, group, visa-balance.
  // CORS for these is restricted to establishment-information.qiwa.sa — bookmarklet
  // must be run from that origin for these endpoints to succeed.
  const API_FILE = 'https://establishment-file-api.qiwa.sa';
  const API_LOCATIONS = 'https://establishment-location-management-api.qiwa.sa';
  // Part-4: employee-management-api.qiwa.sa — CORS scoped to employee-management.qiwa.sa.
  const API_EMP_MGT = 'https://employee-management-api.qiwa.sa';
  // Part-5: change-occupation. CORS scoped to change-occupation.qiwa.sa.
  const API_CHG_OCC = 'https://api-change-occupation.qiwa.sa';
  // Part-6: contracts. CORS scoped to contract-management.qiwa.sa.
  const API_CONTRACTS = 'https://contract-management-api.qiwa.sa';
  // Part-9: employee transfer. CORS scoped to employee-transfer.qiwa.sa.
  const API_TRANSFER = 'https://employee-transfer-api.qiwa.sa';
  const msg = (m) => {
    let d = document.getElementById('_jisr_qiwa_ui');
    if (!d) {
      d = document.createElement('div'); d.id = '_jisr_qiwa_ui';
      d.style.cssText = 'position:fixed;top:16px;left:16px;background:#111;color:#27a046;padding:12px 18px;border-radius:10px;z-index:2147483647;font:700 13px/1.5 sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.5);max-width:380px;direction:rtl;text-align:right;border:1px solid rgba(39,160,70,.4)';
      document.body.appendChild(d);
    }
    d.textContent = 'جسر قوى: ' + m;
    return d;
  };
  const supaFetch = (path, opts = {}) => fetch(U + path, { ...opts, headers: { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  // Cross-subdomain GET, cookies included, swallows CORS failures silently.
  const qiwaGet = async (url) => {
    try {
      const r = await fetch(url, { credentials: 'include', headers: { 'Accept': 'application/json, text/plain, */*' } });
      if (!r.ok) return { ok: false, status: r.status };
      const text = await r.text();
      const jwt = r.headers.get('HTTP_AUTHORIZATION') || null;
      let data; try { data = JSON.parse(text) } catch { data = null }
      return { ok: true, data, jwt };
    } catch (e) {
      return { ok: false, error: String(e && e.message || e) };
    }
  };
  // POST with empty body — used for WPS check-eligibility (Content-Length: 0).
  const qiwaPost = async (url) => {
    try {
      const r = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'Accept': 'application/json, text/plain, */*' } });
      if (!r.ok) return { ok: false, status: r.status };
      const text = await r.text();
      let data; try { data = JSON.parse(text) } catch { data = null }
      return { ok: true, data };
    } catch (e) {
      return { ok: false, error: String(e && e.message || e) };
    }
  };
  // Decode JWT payload (no verification).
  const decodeJwt = (t) => { try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch { return null } };

  try {
    if (!location.hostname.endsWith('qiwa.sa')) return msg('افتح بوابة قوى أولاً (qiwa.sa)');

    msg('إنشاء سجل مزامنة...');
    const runRes = await supaFetch('/rest/v1/sync_runs?select=id', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ source_id: SOURCE, person_id: PERSON, status: 'running' }) });
    const runArr = await runRes.json();
    const runId = Array.isArray(runArr) ? runArr[0]?.id : runArr.id;
    if (!runId) return msg('❌ فشل إنشاء سجل المزامنة');

    let jwtStr = null, companies = [], groups = [], activeCompany = null, criteria = null, indicators = null, cases = null, absher = null;

    // 1) Workspaces — Qiwa silently caps page_size at 100 even when asked for more,
    // so loop page_index until we have pulled all items (hard stop at 50 pages).
    msg('جلب قائمة المنشآت...');
    for (let page = 1; page <= 50; page++) {
      const ws = await qiwaGet(API_CORE + '/context/workspaces-v2/new?page_size=1000&page_index=' + page + '&sort_by=1');
      if (!ws.ok || !ws.data || !Array.isArray(ws.data.workspaces)) break;
      if (ws.jwt && !jwtStr) jwtStr = ws.jwt;
      const batch = ws.data.workspaces;
      companies.push(...batch);
      const total = Number(ws.data.total || 0);
      msg('منشآت ' + companies.length + (total ? '/' + total : ''));
      if (batch.length === 0 || (total && companies.length >= total)) break;
    }

    // 2) Groups (unified-number groupings) — same pagination pattern.
    for (let page = 1; page <= 50; page++) {
      const gr = await qiwaGet(API_CORE + '/context/workspaces-v2/groups?page_size=1000&page_index=' + page);
      if (!gr.ok || !gr.data || !Array.isArray(gr.data.establishment_groups)) break;
      if (gr.jwt && !jwtStr) jwtStr = gr.jwt;
      const batch = gr.data.establishment_groups;
      groups.push(...batch);
      const total = Number(gr.data.total || 0);
      if (batch.length === 0 || (total && groups.length >= total)) break;
    }

    // 3) Current company context (works on dashboard.qiwa.sa / visa.qiwa.sa when in a specific company).
    const cur = await qiwaGet(API_CORE + '/context/company');
    if (cur.ok && cur.data && cur.data.data) {
      activeCompany = cur.data;
      if (cur.jwt && !jwtStr) jwtStr = cur.jwt;
    }

    // Derive active-company shortcuts up front — work-permits + part-1
    // sections below both need labor_office_id / sequence_number / unified-no.
    const aData = activeCompany && activeCompany.data;
    const aAttr = aData && aData.attributes || {};
    const laborOfficeId = aAttr['company-labor-office-id'];
    const seqNo = aAttr['company-sequence-number'];
    const estId = (laborOfficeId && seqNo) ? (laborOfficeId + '-' + seqNo) : null;
    const unifiedNo = aAttr['company-unified-number-id'] || (companies.find(w => w.company_id == (aData && aData.id)) || {}).company_unified_number_id;

    // 4) Indicators / criteria / cases (establishment + employee) / absher.
    let visaStatuses = null, employeeCases = null;
    const [cr, ind, csRes, ecRes, abs] = await Promise.all([
      qiwaGet(API_INDICATORS + '/api/v1/criteria/primary'),
      qiwaGet(API_DASHBOARD + '/api/v1/indicators'),
      qiwaGet(API_DASHBOARD + '/api/v1/establishment-cases'),
      qiwaGet(API_DASHBOARD + '/api/v1/employee-cases'),
      qiwaGet(API_CORE + '/visa-proxy/v3/absher-balance'),
    ]);
    if (cr.ok) criteria = cr.data;
    if (ind.ok) indicators = ind.data;
    if (csRes.ok) cases = csRes.data;
    if (ecRes.ok) employeeCases = ecRes.data;
    if (abs.ok) absher = abs.data;

    // 5) Visa statuses — depends on current entity_number from criteria.
    // Format is e.g. "6-4019841-100" which the visa-proxy needs to scope to company.
    const entityNo = criteria && criteria.nitaqat && criteria.nitaqat.entity_number;
    if (entityNo) {
      const vs = await qiwaGet(API_CORE + '/visa-proxy/v3/visa-statuses/' + encodeURIComponent(entityNo) + '?visa_type_id=1');
      if (vs.ok) visaStatuses = vs.data;
    }

    // 5b) Part-2 visa endpoints — work/visit/seasonal quota + eligibility +
    // request history. All under api.qiwa.sa/visa-proxy/v3/* and same-origin
    // from dashboard/auth so no extra CORS issue beyond what we already swallow.
    let visaBalances = null, visaGenEligibility = null, visaWorkEligibility = null,
        visaOther = null, visaExpansion = null, visaRequestsList = null;
    const [vb, vge, vwe, vo, vex, vrl] = await Promise.all([
      qiwaGet(API_CORE + '/visa-proxy/v3/balances'),
      qiwaGet(API_CORE + '/visa-proxy/v3/general-eligibility'),
      qiwaGet(API_CORE + '/visa-proxy/v3/work-visa-eligibility'),
      qiwaGet(API_CORE + '/visa-proxy/v3/other-visas?q%5Btype_id%5D%5Beq%5D=3&page=1&per=1000'),
      qiwaGet(API_CORE + '/visa-proxy/v3/expansion-work-visa-balance'),
      qiwaGet(API_CORE + '/visa-proxy/v3/visa-requests?sort_by=desc&page=1&per=1000'),
    ]);
    if (vb.ok)  visaBalances        = vb.data;
    if (vge.ok) visaGenEligibility  = vge.data;
    if (vwe.ok) visaWorkEligibility = vwe.data;
    if (vo.ok)  visaOther           = vo.data;
    if (vex.ok) visaExpansion       = vex.data;
    if (vrl.ok) visaRequestsList    = vrl.data;

    // 5c) Part-3 work-permits — scoped by labor_office_id+sequence_number.
    // All under api.qiwa.sa/api/v1/work-permits/*. The list endpoints support
    // page_size=1000 so we get everything in one shot for typical accounts.
    let wpValidate = null, wpRequests = null, wpPremiums = null,
        wpDebts = null, wpDebtsFinalExit = null, wpLaborers = null, wpLaborersExpired = null;
    const wpClaimLO = aAttr['company-labor-office-id'];
    const wpClaimSeq = aAttr['company-sequence-number'];
    if (wpClaimLO && wpClaimSeq) {
      const q = '?labor_office_id=' + wpClaimLO + '&sequence_number=' + wpClaimSeq;
      const pq = q + '&page_index=1&page_size=1000';
      const [wv, wr, wpm, wd, wde, wl, wle] = await Promise.all([
        qiwaGet(API_CORE + '/api/v1/work-permits/establishments/validate' + q),
        qiwaGet(API_CORE + '/api/v1/work-permits/requests' + pq),
        qiwaGet(API_CORE + '/api/v1/work-permits/requests/premiums' + pq),
        qiwaGet(API_CORE + '/api/v1/work-permits/debts' + pq + '&laborer_id_no=&employee_name='),
        qiwaGet(API_CORE + '/api/v1/work-permits/debts/final-exit' + pq + '&is_paid='),
        qiwaGet(API_CORE + '/api/v1/work-permits/laborers' + pq + '&has_exceptional_balance=0&is_investment_establishment=0&is_in_red_ntiqat=0&is_establishing=0'),
        qiwaGet(API_CORE + '/api/v1/work-permits/laborers/expired' + pq + '&query='),
      ]);
      if (wv.ok)  wpValidate         = wv.data;
      if (wr.ok)  wpRequests         = wr.data;
      if (wpm.ok) wpPremiums         = wpm.data;
      if (wd.ok)  wpDebts            = wd.data;
      if (wde.ok) wpDebtsFinalExit   = wde.data;
      if (wl.ok)  wpLaborers         = wl.data;
      if (wle.ok) wpLaborersExpired  = wle.data;
    }

    // 5d) Part-4 employee-management — CORS only from employee-management.qiwa.sa.
    // Scoped via JWT (no labor_office/sequence params needed).
    let empCounts = null, empStats = null, empActions = null, empList = null,
        empContractAuth = null, empWpIndicator = null;
    const [ec, es, ea, el, eca, ewi] = await Promise.all([
      qiwaGet(API_EMP_MGT + '/api/employees-statistics/counts'),
      qiwaGet(API_EMP_MGT + '/api/employees-statistics'),
      qiwaGet(API_EMP_MGT + '/api/employees-statistics/actionFilters'),
      qiwaGet(API_EMP_MGT + '/api/employees?pageIndex=0&pageSize=1000&sort=newest%2Cdesc'),
      qiwaGet(API_EMP_MGT + '/api/indicator?type=contract_authentication'),
      qiwaGet(API_EMP_MGT + '/api/indicator?type=work_permit'),
    ]);
    if (ec.ok)  empCounts        = ec.data;
    if (es.ok)  empStats         = es.data;
    if (ea.ok)  empActions       = ea.data;
    if (el.ok)  empList          = el.data;
    if (eca.ok) empContractAuth  = eca.data;
    if (ewi.ok) empWpIndicator   = ewi.data;

    // 5e) Part-5 occupation management — change + correct occupation flows.
    let occIndicator = null, occChangeLaborers = null, occChangeRequests = null,
        occCorrectList = null, occCorrectLaborers = null;
    const [oi, ocl, ocr, ocoL, ocoLab] = await Promise.all([
      qiwaGet(API_CORE + '/correct-occupation-proxy/occupation-indicator'),
      qiwaGet(API_CHG_OCC + '/change-occupation/requests-laborers?per=1000&page=1'),
      qiwaGet(API_CHG_OCC + '/change-occupation/requests?per=1000&page=1'),
      qiwaGet(API_CORE + '/correct-occupation-proxy/correct-occupations?per=1000&page=1'),
      qiwaGet(API_CORE + '/correct-occupation-proxy/laborers?per=1000&page=1'),
    ]);
    if (oi.ok)      occIndicator       = oi.data;
    if (ocl.ok)     occChangeLaborers  = ocl.data;
    if (ocr.ok)     occChangeRequests  = ocr.data;
    if (ocoL.ok)    occCorrectList     = ocoL.data;
    if (ocoLab.ok)  occCorrectLaborers = ocoLab.data;

    // 5h) Part-8 monthly report — indicators-api.qiwa.sa, Origin report.qiwa.sa.
    // The report is published for the PREVIOUS month (current month - 1), so
    // we always fetch month-1. Also fetch /check-availability to record which
    // months Qiwa has data for (handy if we ever backfill history later).
    let reportAvailable = null, monthlyReport = null, reportYM = null;
    const reportNow = new Date();
    const reportPrev = new Date(reportNow.getFullYear(), reportNow.getMonth() - 1, 1);
    const rMonth = String(reportPrev.getMonth() + 1).padStart(2, '0');
    const rYear2 = String(reportPrev.getFullYear()).slice(2);
    reportYM = rMonth + rYear2;
    const [rA, rB] = await Promise.all([
      qiwaGet(API_INDICATORS + '/api/v1/report/check-availability'),
      qiwaGet(API_INDICATORS + '/api/v1/report?month=' + rMonth + '&year=' + rYear2),
    ]);
    if (rA.ok) reportAvailable = rA.data;
    if (rB.ok) monthlyReport = rB.data;

    // 5g) Part-7 certificates — CORS scoped to certificates.qiwa.sa.
    let saudCert = null, debtCert = null, certContext = null;
    const [scD, dcD, cCx] = await Promise.all([
      qiwaGet(API_CORE + '/saudization-certificate/details'),
      qiwaGet(API_CORE + '/debt-certificate/details'),
      qiwaGet(API_CORE + '/ott-service/shareable-certificates/context/company'),
    ]);
    if (scD.ok) saudCert    = scD.data;
    if (dcD.ok) debtCert    = dcD.data;
    if (cCx.ok) certContext = cCx.data;

    // 5f) Part-6 contracts — CORS scoped to contract-management.qiwa.sa.
    let caIndicator = null, contractsCounts = null, contractsList = null,
        gosiStatuses = null, contractsUnauth = null;
    const [cai, cct, cl, gs, cu] = await Promise.all([
      qiwaGet(API_CONTRACTS + '/api/v5/contract-authentication-indicator'),
      qiwaGet(API_CONTRACTS + '/api/v5/contracts/counts'),
      qiwaGet(API_CONTRACTS + '/api/v5/tc/requests?page=1&perPage=1000'),
      qiwaGet(API_CONTRACTS + '/api/v5/tc/gosi-statuses?page=1&perPage=1000'),
      qiwaGet(API_CONTRACTS + '/api/v5/contracts/unauthenticated?page=1&perPage=1000'),
    ]);
    if (cai.ok) caIndicator      = cai.data;
    if (cct.ok) contractsCounts  = cct.data;
    if (cl.ok)  contractsList    = cl.data;
    if (gs.ok)  gosiStatuses     = gs.data;
    if (cu.ok)  contractsUnauth  = cu.data;

    // 5i) Part-9 employee transfer — CORS scoped to employee-transfer.qiwa.sa.
    let transferBalance = null, transferEligibility = null,
        transferReceived = null, transferReceivedPending = null, transferSent = null;
    const [tb, te, trR, trP, trS] = await Promise.all([
      qiwaGet(API_TRANSFER + '/api/establishment-balance'),
      qiwaGet(API_TRANSFER + '/api/eligibility/transfer-establishments'),
      qiwaGet(API_TRANSFER + '/api/requests?perPage=1000&page=1&sortByReleaseDate=desc&excludeStatus=PENDING_FOR_CURRENT_EMPLOYER_APPROVAL&type=received'),
      qiwaGet(API_TRANSFER + '/api/requests?perPage=1000&page=1&sortByReleaseDate=desc&status=PENDING_FOR_CURRENT_EMPLOYER_APPROVAL&type=received'),
      qiwaGet(API_TRANSFER + '/api/requests?perPage=1000&page=1&sortByReleaseDate=desc&type=sent'),
    ]);
    if (tb.ok)  transferBalance         = tb.data;
    if (te.ok)  transferEligibility     = te.data;
    if (trR.ok) transferReceived        = trR.data;
    if (trP.ok) transferReceivedPending = trP.data;
    if (trS.ok) transferSent            = trS.data;

    // 6) Part-1 endpoints — best-effort. estId / unifiedNo were derived earlier.
    let addressData = null, wpsEligibility = null, wpsCompliance = null, violations = null,
        locations = null, employeesSummary = null, groupInfo = null,
        visaSeasonal = null, visaPermanent = null;

    const part1Promises = [
      // Auth + compliance (api.qiwa.sa — already same-origin if on dashboard.qiwa.sa)
      qiwaPost(API_CORE + '/wage-protection-system/check-eligibility'),
      qiwaGet(API_CORE + '/wage-protection-system/compliance-rate'),
      // Establishment-file-api (CORS: only from establishment-information.qiwa.sa)
      qiwaGet(API_FILE + '/api/entities/employees-summary'),
    ];
    if (estId) {
      part1Promises.push(qiwaGet(API_FILE + '/api/establishments/' + encodeURIComponent(estId) + '/'));
      part1Promises.push(qiwaGet(API_FILE + '/api/establishments/' + encodeURIComponent(estId) + '/violation-statistics'));
      part1Promises.push(qiwaGet(API_FILE + '/api/establishments/' + encodeURIComponent(estId) + '/visa-balance/seasonal-work-visas'));
      part1Promises.push(qiwaGet(API_FILE + '/api/establishments/' + encodeURIComponent(estId) + '/visa-balance/permanent-work-visas'));
    } else {
      part1Promises.push({ ok: false }, { ok: false }, { ok: false }, { ok: false });
    }
    if (unifiedNo) {
      part1Promises.push(qiwaGet(API_FILE + '/api/establishments/' + encodeURIComponent(unifiedNo) + '/group-information'));
    } else {
      part1Promises.push({ ok: false });
    }
    // Locations stats — no ID needed, scoped via JWT.
    part1Promises.push(qiwaGet(API_LOCATIONS + '/api/v3/establishments/locations/statistics'));

    const [wpsE, wpsC, empSum, addr, vio, vsea, vper, ginfo, locs] = await Promise.all(part1Promises);
    if (wpsE.ok) wpsEligibility = wpsE.data;
    if (wpsC.ok) wpsCompliance = wpsC.data;
    if (empSum.ok) employeesSummary = empSum.data;
    if (addr.ok) addressData = addr.data;
    if (vio.ok) violations = vio.data;
    if (vsea.ok) visaSeasonal = vsea.data;
    if (vper.ok) visaPermanent = vper.data;
    if (ginfo.ok) groupInfo = ginfo.data;
    if (locs.ok) locations = locs.data;

    // Capture and save session (JWT + claims) for future Netlify-based tooling.
    if (jwtStr) {
      const claims = decodeJwt(jwtStr) || {};
      await supaFetch('/rest/v1/qiwa_sessions?on_conflict=id', {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          id: 'default', access_token: jwtStr,
          personal_number: claims.personal_number || claims.user_personal_number || null,
          account_id: claims['account-id'] || null,
          login_time: claims['login-time'] || null,
          expires_at: claims.exp || null,
          updated_at: new Date().toISOString(),
        }),
      });
    }

    // Upsert the workspace list.
    let added = 0;
    if (companies.length) {
      msg('حفظ ' + companies.length + ' منشأة...');
      const rows = companies.map(w => ({
        company_id: w.company_id,
        company_main_branch: w.company_main_branch,
        company_labor_office_id: w.company_labor_office_id,
        company_sequence_number: w.company_sequence_number,
        company_name: w.company_name,
        company_unified_number_id: String(w.company_unified_number_id || ''),
        is_vip: w.is_vip,
        subscription_expiry_date: w.subscription_expiry_date || null,
        eligible_for_self_subscription: w.eligible_for_self_subscription,
        show_sadad_request: w.show_sadad_request,
        payment_id: w.payment_id,
        soon_expired: w.soon_expired,
        remaining_days: w.remaining_days,
        payment_status: w.payment_status,
        status: w.status,
        user_role: String(w.user_role || ''),
        is_favorite: w.is_favorite,
        panel_status: w.panel_status,
        synced_at: new Date().toISOString(),
        raw: w,
      }));
      const chunk = (arr, n) => { const out=[]; for (let i=0;i<arr.length;i+=n) out.push(arr.slice(i,i+n)); return out };
      for (const part of chunk(rows, 100)) {
        const up = await supaFetch('/rest/v1/qiwa_companies?on_conflict=company_id', {
          method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(part),
        });
        if (!up.ok) { msg('❌ upsert companies ' + up.status); return }
      }
      added = rows.length;
    }

    // Upsert groups.
    if (groups.length) {
      const rows = groups.map(g => ({
        unified_number_id: g.unified_number_id,
        labor_office_id: g.labor_office_id,
        sequence_number: g.sequence_number,
        number_of_companies: g.number_of_companies,
        synced_at: new Date().toISOString(),
        raw: g,
      }));
      await supaFetch('/rest/v1/qiwa_groups?on_conflict=unified_number_id', {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(rows),
      });
    }

    // If we're in a specific company's context, patch that company with detail data.
    if (activeCompany && activeCompany.data) {
      const a = activeCompany.data.attributes || {};
      const incl = (activeCompany.included || []);
      const nitaq = incl.find(i => i.type === 'nitaq-info')?.attributes || {};
      const addr = incl.find(i => i.type === 'establishment-address')?.attributes || {};
      const patch = {
        company_id: Number(activeCompany.data.id),
        establishment_id: a['establishment-id'] || null,
        establishment_name: a['establishment-name'] || null,
        establishment_status_ar: a['establishment-status'] || null,
        establishment_status_en: a['establishment-status-en'] || null,
        main_economic_activity: a['main-economic-activity'] || null,
        sub_economic_activity: a['sub-economic-activity'] || null,
        cr_number: a['cr-number'] || null,
        cr_release_date: a['cr-release-date'] || null,
        cr_end_date: a['cr-end-date'] || null,
        cr_national_number: a['cr-national-number'] || null,
        cr_status_ar: a['cr-name-ar'] || null,
        cr_status_en: a['cr-name-en'] || null,
        city_code: a['city-code'] || null,
        city_name_ar: a['city-name'] || null,
        city_name_en: a['city-name-en'] || null,
        district: a['district'] || addr['district-area-name-ar'] || null,
        street: a['street'] || addr['street-name-ar'] || null,
        postal_code: a['postal-code'] || null,
        zip_code: a['zip-code'] || addr['zip-code'] || null,
        building_no: addr['building-no'] || null,
        additional_number: addr['additional-number'] != null ? String(addr['additional-number']) : null,
        unit_no: addr['unit-no'] != null ? String(addr['unit-no']) : null,
        financial_year_gregorian: a['financial-year-gregorian'] || null,
        financial_year_hijri: a['financial-year-hijri'] || null,
        seven_hundred_number: a['seven-hundred-number'] || null,
        vat_number: a['vat-number'] || null,
        establishment_email: a['establishment-email'] || null,
        nic_account_number: a['nic-account-number'] || null,
        establishment_type_name: a['establishment-type-name'] || null,
        color_id: a['color-id'] ?? null,
        color_name: a['color-name'] || null,
        color_code: a['color-code'] || null,
        size_id: nitaq['size-id'] ?? null,
        size_name: nitaq['size-name'] || null,
        entity_number: a['number'] || null,
        entity_saudi_percentage: a['entity-saudi-percentage'] ?? null,
        nitaq_economic_activity_id: nitaq['economic-activity-id'] ?? null,
        nitaq_economic_activity_name: nitaq['economic-activity-name'] || null,
        nitaq_saudis: nitaq['saudis'] ?? null,
        nitaq_foreigners: nitaq['foreigners'] ?? null,
        nitaq_total_laborers: nitaq['total-laborer-count'] ?? null,
        detail_synced_at: new Date().toISOString(),
        context_company_raw: activeCompany,
      };
      if (criteria) {
        patch.criteria_raw = criteria;
        if (criteria.scores) {
          patch.score_compliance = criteria.scores.compliance ?? null;
          patch.score_nitaqat = criteria.scores.nitaqat ?? null;
          patch.score_work_permits = criteria.scores.work_permits ?? null;
          patch.score_notes_in_wps = criteria.scores.notes_in_wps ?? null;
          patch.score_contract_authentication = criteria.scores.contract_authentication ?? null;
          patch.score_laborer_location = criteria.scores.laborer_location ?? null;
        }
        if (criteria.nitaqat) {
          patch.nitaqat_color_ar = criteria.nitaqat.color?.ar || null;
          patch.nitaqat_next_color_ar = criteria.nitaqat.next_color?.ar || null;
          patch.nitaqat_saudis_to_be_hired = criteria.nitaqat.saudis_to_be_hired ?? null;
          patch.nitaqat_nationalization_rate = criteria.nitaqat.nationalization_rate ?? null;
          patch.nitaqat_calculation_method = criteria.nitaqat.calculation_method || null;
          patch.nitaqat_activity_name = criteria.nitaqat.activity || null;
          patch.nitaqat_entity_size_id = criteria.nitaqat.entity_size?.id ?? null;
          patch.nitaqat_entity_size_name = criteria.nitaqat.entity_size?.name_ar || null;
          patch.nitaqat_factorized_saudis = criteria.nitaqat.number_of_factorized_saudis ?? null;
          patch.nitaqat_factorized_expats = criteria.nitaqat.number_of_factorized_expats ?? null;
          patch.nitaqat_is_grace_period = criteria.nitaqat.is_grace_period ?? null;
          patch.nitaqat_grace_start = criteria.nitaqat.grace_period?.start_date || null;
          patch.nitaqat_grace_end = criteria.nitaqat.grace_period?.end_date || null;
        }
        if (criteria.work_permits) {
          patch.work_permits_total = criteria.work_permits.establishment?.total ?? null;
          patch.work_permits_valid = criteria.work_permits.establishment?.valid ?? null;
          patch.work_permits_expired = criteria.work_permits.establishment?.expired ?? null;
          patch.wp_establishment_pending = criteria.work_permits.establishment?.pending_payments ?? null;
          patch.wp_no_wp_over_90 = criteria.work_permits.establishment?.no_wp_greater_than_90_days ?? null;
          patch.wp_no_wp_under_90 = criteria.work_permits.establishment?.no_wp_less_than_90_days ?? null;
          patch.wp_unified_total = criteria.work_permits.unified?.total ?? null;
          patch.wp_unified_valid = criteria.work_permits.unified?.valid ?? null;
          patch.wp_unified_expired = criteria.work_permits.unified?.expired ?? null;
        }
        if (criteria.contract_authentication) {
          patch.contract_auth_percentage = criteria.contract_authentication.percentage ?? null;
          patch.contracts_authenticated = criteria.contract_authentication.total_authenticated_contracts ?? null;
          patch.contracts_unauthenticated = criteria.contract_authentication.total_unauthenticated_contracts ?? null;
        }
        if (criteria.laborer_location) {
          patch.laborer_assigned = criteria.laborer_location.assigned ?? null;
          patch.laborer_not_assigned = criteria.laborer_location.not_assigned ?? null;
        }
        if (criteria.est_phase_details) {
          patch.est_phase_status = criteria.est_phase_details.est_phase_status || null;
          patch.est_allowance_end_date = criteria.est_phase_details.est_allowance_end_date || null;
          patch.in_allowance_period = criteria.est_phase_details.in_allowance_period ?? null;
        }
      }
      if (indicators) {
        patch.indicators_raw = indicators;
        // Structured indicator fields — dashboard-api /api/v1/indicators returns
        // a nested shape (compliance score + nitaqat level + quota + unrelated occupations).
        const pcs = indicators.primary_compliance_score || {};
        patch.indicator_compliance_score = pcs.primary_compliance_score ?? null;
        const sr = pcs.saudization_rate;
        patch.indicator_saudization_rate = sr != null && sr !== '' ? Number(sr) : null;
        const nl = pcs.nitaqat_level || {};
        patch.indicator_nitaqat_level_id = nl.id || null;
        patch.indicator_nitaqat_level_ar = nl.ar || null;
        patch.indicator_nitaqat_level_en = nl.en || null;
        const q = indicators.quota || {};
        patch.indicator_quota_allowed = q.allowed_quota ?? null;
        patch.indicator_quota_error_ar = q.error?.message_ar || null;
        patch.indicator_quota_error_code = q.error?.error_code || null;
        const uo = indicators.unrelated_occupations || {};
        patch.indicator_unrelated_occupations = uo.unrelated_occupations ?? null;
        patch.indicator_unrelated_occupations_limit = uo.unrelated_occupations_limit ?? null;
        patch.indicator_compliance_status = indicators.compliance_status?.compliance ?? null;
      }
      if (cases) {
        patch.cases_total = cases.all_cases_count ?? null;
        patch.cases_notes = cases.notes?.value ?? null;
        patch.cases_violations = cases.violations?.value ?? null;
      }
      if (employeeCases) {
        patch.employee_cases_raw                  = employeeCases;
        patch.employee_cases_total                = employeeCases.all_cases_count ?? null;
        patch.employee_cases_waiting_approval     = employeeCases.waiting_for_approval ?? null;
        patch.employee_cases_work_permit          = employeeCases.work_permit_cases ?? null;
        patch.employee_cases_other                = employeeCases.other_employee_cases ?? null;
        patch.employee_cases_wp_expiring_30d      = employeeCases.work_permit_expiring_within_30_days ?? null;
        const wa = employeeCases.waiting_for_approval_items || {};
        patch.employee_cases_contract_pending     = wa.requests_in_contract_management?.value ?? null;
        patch.employee_cases_transfer_pending     = wa.requests_in_employee_transfer?.value ?? null;
        const wp = employeeCases.work_permit_items || {};
        patch.employee_cases_wp_to_issue          = wp.to_issue_renew_or_pay_for?.value ?? null;
        const ot = employeeCases.other_items || {};
        patch.employee_cases_expired_iqamas       = ot.expired_iqamas?.value ?? null;
        patch.employee_cases_unauth_contracts     = ot.unauthenticated_contracts?.value ?? null;
        patch.employee_cases_incorrect_occupations = ot.incorrect_occupations?.value ?? null;
        patch.employee_cases_unassigned_location  = ot.employees_unassigned_to_location?.value ?? null;
      }
      if (absher) {
        patch.absher_balance = absher.balance != null ? Number(absher.balance) : null;
        patch.absher_account_number = absher.account_number || null;
        patch.absher_amount_per_visa = absher.amount_per_visa != null ? Number(absher.amount_per_visa) : null;
      }
      if (wpsEligibility) {
        patch.wps_eligibility_raw = wpsEligibility;
        const a = wpsEligibility.data?.attributes || {};
        patch.wps_cert_number       = a['certificate-number'] || null;
        patch.wps_cert_status       = a['status'] || null;
        patch.wps_cert_issue_date   = a['certificate-issue-date'] || null;
        patch.wps_cert_expiry_date  = a['certificate-expiry-date'] || null;
        patch.wps_cert_eligible     = a['eligible'] ?? null;
      }
      if (wpsCompliance) {
        patch.wps_compliance_raw = wpsCompliance;
        const a = wpsCompliance.data?.attributes || {};
        patch.wps_compliance_rate     = a['unified-compliance-rate'] ?? null;
        patch.wps_compliance_eligible = a['is-eligible'] ?? null;
      }
      if (violations) {
        patch.violations_raw       = violations;
        patch.violations_open      = violations.open ?? null;
        patch.violations_not_paid  = violations.not_paid ?? null;
        patch.violations_objection = violations.objection ?? null;
        patch.violations_cancelled = violations.cancelled ?? null;
      }
      if (locations) {
        patch.locations_raw            = locations;
        patch.locations_total          = locations.total_locations ?? null;
        patch.locations_active         = locations.total_active_locations ?? null;
        patch.locations_inactive       = locations.total_inactive_locations ?? null;
        patch.locations_terminated     = locations.total_terminated_locations ?? null;
        patch.locations_total_laborers = locations.total_laborers ?? null;
        patch.locations_assigned       = locations.total_assigned_laborers ?? null;
        patch.locations_unassigned     = locations.total_unassigned_laborers ?? null;
        patch.locations_assigned_pct   = locations.assigned_percentage ?? null;
        patch.locations_stationary     = locations.total_stationary ?? null;
        patch.locations_rotary         = locations.total_rotary ?? null;
      }
      if (addressData) {
        patch.addr_raw           = addressData;
        const ad = addressData.address || {};
        patch.addr_city_ar       = ad.cityAr || null;
        patch.addr_city_en       = ad.cityEn || null;
        patch.addr_district_ar   = ad.districtAreaAr || null;
        patch.addr_district_en   = ad.districtAreaEn || null;
        patch.addr_street_ar     = ad.streetNameAr || null;
        patch.addr_street_en     = ad.streetNameEn || null;
        patch.addr_building_no   = ad.buildingNo != null ? String(ad.buildingNo) : null;
        patch.addr_additional_no = ad.additionalNo != null ? String(ad.additionalNo) : null;
        patch.addr_zip_code      = ad.zipCode || null;
        patch.addr_unit_no       = ad.unitNo != null ? String(ad.unitNo) : null;
        patch.addr_zatca_id      = addressData.zatcaId || null;
      }
      if (employeesSummary) {
        patch.employees_summary_raw = employeesSummary;
        const ent = employeesSummary.entity || {};
        const est = employeesSummary.establishment || {};
        patch.entity_employees_total      = ent.total ?? null;
        patch.entity_employees_saudis     = ent.entity_employees_count?.saudis ?? null;
        patch.entity_employees_non_saudis = ent.entity_employees_count?.non_saudis ?? null;
        patch.est_employees_total         = est.total ?? null;
        patch.est_employees_saudis        = est.entity_employees_count?.saudis ?? null;
        patch.est_employees_non_saudis    = est.entity_employees_count?.non_saudis ?? null;
      }
      if (groupInfo) {
        patch.group_info_raw             = groupInfo;
        patch.group_total_entities       = groupInfo.total_entities ?? null;
        patch.group_total_establishments = groupInfo.total_establishments ?? null;
      }
      if (visaSeasonal)  patch.visa_seasonal_raw  = visaSeasonal;
      if (visaPermanent) patch.visa_permanent_raw = visaPermanent;
      if (visaBalances) {
        patch.visa_balances_raw = visaBalances;
        const w = visaBalances.work_visa || {};
        const v = visaBalances.visit_visa || {};
        const s = visaBalances.seasonal_visa || {};
        patch.visa_work_quota       = w.allowed_quota ?? null;
        patch.visa_work_unused      = w.unused_visas ?? null;
        patch.visa_visit_quota      = v.allowed_quota ?? null;
        patch.visa_visit_unused     = v.unused_visas ?? null;
        patch.visa_visit_pkg_expiry = v.packages_expiration_date || null;
        patch.visa_seasonal_quota   = s.allowed_quota ?? null;
        patch.visa_seasonal_unused  = s.unused_visas ?? null;
      }
      if (visaGenEligibility) patch.visa_general_eligibility_raw = visaGenEligibility;
      if (visaWorkEligibility) {
        patch.visa_work_eligibility_raw = visaWorkEligibility;
        const err = visaWorkEligibility.request_error || {};
        patch.visa_work_eligibility_code   = err.code || null;
        patch.visa_work_eligibility_msg_ar = err.message_ar || null;
      }
      if (visaOther) {
        patch.visa_other_raw   = visaOther;
        patch.visa_other_count = visaOther.meta?.total_count ?? null;
      }
      if (visaExpansion) {
        patch.visa_expansion_raw     = visaExpansion;
        const bq = visaExpansion.balance_quantity;
        patch.visa_expansion_balance = bq != null && bq !== '' ? Number(bq) : null;
      }
      if (wpValidate) {
        patch.wp_validate_raw                = wpValidate;
        patch.wp_is_valid                    = wpValidate.is_valid ?? null;
        patch.wp_has_exceptional_balance     = wpValidate.has_exceptional_balance ?? null;
        patch.wp_is_investment_establishment = wpValidate.is_investment_establishment ?? null;
        patch.wp_is_in_red_ntiqat            = wpValidate.is_in_red_ntiqat ?? null;
        patch.wp_is_establishing             = wpValidate.is_establishing ?? null;
      }
      if (wpRequests)        patch.wp_requests_total         = wpRequests.total_results ?? null;
      if (wpPremiums)        patch.wp_premiums_total         = wpPremiums.total_results ?? null;
      if (wpDebts)           patch.wp_debts_total            = wpDebts.total_results ?? null;
      if (wpDebtsFinalExit)  patch.wp_debts_final_exit_total = wpDebtsFinalExit.total_results ?? null;
      if (wpLaborers)        patch.wp_laborers_total         = wpLaborers.total_results ?? null;
      if (wpLaborersExpired) patch.wp_laborers_expired_total = wpLaborersExpired.total_results ?? null;
      if (empCounts) {
        patch.emp_counts_raw                = empCounts;
        patch.emp_total                     = empCounts.totalLaborersCount ?? null;
        patch.emp_saudis                    = empCounts.saudisLaborersCount ?? null;
        patch.emp_foreigners                = empCounts.foreignersLaborersCount ?? null;
        patch.emp_with_border_no            = empCounts.totalLaborersWithBorderNumCount ?? null;
        patch.emp_special                   = empCounts.totalSpecialLaborersCount ?? null;
        patch.emp_gcc                       = empCounts.totalGccLaborersCount ?? null;
        patch.emp_contracts_authenticated   = empCounts.authenticatedContractsCount ?? null;
        patch.emp_contracts_unauthenticated = empCounts.unauthenticatedContractsCount ?? null;
      }
      if (empActions && Array.isArray(empActions)) {
        const byLabel = {};
        for (const a of empActions) byLabel[a.label] = a.count;
        patch.emp_action_pending_contracts    = byLabel['pendingContracts'] ?? null;
        patch.emp_action_pending_transfers    = byLabel['pendingTransfers'] ?? null;
        patch.emp_action_pending_terminations = byLabel['pendingTerminations'] ?? null;
        patch.emp_action_no_active_contracts  = byLabel['noActiveContracts'] ?? null;
        patch.emp_action_renew_wp             = byLabel['renewWorkPermit'] ?? null;
        patch.emp_action_issue_wp             = byLabel['issueWorkPermit'] ?? null;
        patch.emp_action_unpaid_wp            = byLabel['unpaidWorkPermit'] ?? null;
        patch.emp_action_correct_occupation   = byLabel['correctOccupation'] ?? null;
      }
      if (empContractAuth && Array.isArray(empContractAuth.data)) {
        patch.emp_contract_auth_raw = empContractAuth;
        const parsePct = (s) => { if (s == null) return null; const n = parseFloat(String(s).replace('%', '')); return Number.isFinite(n) ? n : null };
        const byCode = {};
        for (const d of empContractAuth.data) byCode[d.code] = d.count;
        patch.emp_contract_auth_saudi_pct   = parsePct(byCode['saudisAuthenticationPercentage']);
        patch.emp_contract_auth_foreign_pct = parsePct(byCode['foreignersAuthenticationPercentage']);
        patch.emp_contract_auth_total_pct   = parsePct(byCode['totalAuthenticationPercentage']);
      }
      if (empWpIndicator && Array.isArray(empWpIndicator.data)) {
        patch.emp_wp_indicator_raw = empWpIndicator;
        const byCode = {};
        for (const d of empWpIndicator.data) byCode[d.code] = d.count;
        patch.emp_wp_expired        = byCode['expired'] ?? null;
        patch.emp_wp_expiring_soon  = byCode['expiringSoon'] ?? null;
        patch.emp_wp_none           = byCode['noWorkPermit'] ?? null;
        patch.emp_wp_valid          = byCode['valid'] ?? null;
        patch.emp_wp_to_renew       = byCode['toRenew'] ?? null;
      }
      if (empStats) patch.emp_facets_raw = empStats;
      if (occIndicator && occIndicator.data) {
        patch.occ_indicator_raw = occIndicator;
        const a = occIndicator.data.attributes || {};
        patch.occ_total_laborers      = a['total-laborers-count'] ?? null;
        patch.occ_matched_count       = a['matched-occupations-count'] ?? null;
        patch.occ_not_matched_count   = a['not-matched-occupations-count'] ?? null;
        patch.occ_corrected_count     = a['corrected-occupation-count'] ?? null;
        patch.occ_not_corrected_count = a['not-corrected-occupation-count'] ?? null;
        patch.occ_matched_pct         = a['matched-occupations-percentage'] ?? null;
        patch.occ_corrected_pct       = a['corrected-occupations-percentage'] ?? null;
      }
      if (occChangeRequests) {
        patch.occ_change_requests_total = occChangeRequests.meta?.total_count
          ?? occChangeRequests.meta?.total_entities ?? null;
        // The errors come as data[] when the establishment isn't eligible.
        if (Array.isArray(occChangeRequests.data) && occChangeRequests.data.length &&
            occChangeRequests.data[0]?.type === 'multi-lang-error') {
          patch.occ_change_errors_raw = occChangeRequests.data;
        }
      }
      if (occChangeLaborers)  patch.occ_change_laborers_total  = occChangeLaborers.meta?.total_entities ?? occChangeLaborers.meta?.total_count ?? null;
      if (occCorrectList)     patch.occ_correct_requests_total = occCorrectList.meta?.total_entities ?? null;
      if (occCorrectLaborers) patch.occ_correct_laborers_total = occCorrectLaborers.meta?.total_entities ?? null;
      if (caIndicator) {
        patch.ca_indicator_raw = caIndicator;
        const parsePct = (s) => { if (s == null) return null; const n = parseFloat(String(s).replace('%', '')); return Number.isFinite(n) ? n : null };
        patch.ca_saudis_total                 = caIndicator.saudiInEstablishment ?? null;
        patch.ca_saudis_authenticated         = caIndicator.saudiWithAuthenticatedContracts ?? null;
        patch.ca_saudis_percentage            = parsePct(caIndicator.saudiPercentage);
        patch.ca_non_saudis_total             = caIndicator.nonSaudiInEstablishment ?? null;
        patch.ca_non_saudis_authenticated     = caIndicator.nonSaudiWithAuthenticatedContracts ?? null;
        patch.ca_non_saudis_percentage        = parsePct(caIndicator.nonSaudiPercentage);
        patch.ca_all_total                    = caIndicator.allInEstablishment ?? null;
        patch.ca_all_authenticated            = caIndicator.allWithAuthenticatedContracts ?? null;
        patch.ca_all_percentage               = parsePct(caIndicator.allPercentage);
        patch.ca_mhrsd_requirement_percentage = caIndicator.mhrsdRequirementPercentage ?? null;
        patch.ca_ksa_authenticated_count      = caIndicator.ksaAuthenticatedCount ?? null;
      }
      if (contractsCounts) {
        patch.contracts_counts_raw = contractsCounts;
        // The arrays use i18n keys like CONTRACT_COUNTS.ALL_SIGNED.NAME.ACTIVE
        // — pluck by suffix to keep extraction stable across locale changes.
        const findCount = (arr, suffix) => {
          if (!Array.isArray(arr)) return null;
          const m = arr.find(x => x?.status?.name && x.status.name.endsWith(suffix));
          return m ? m.count ?? null : null;
        };
        const sum = (arr) => Array.isArray(arr) ? arr.reduce((s, x) => s + (x.count || 0), 0) : null;
        patch.contracts_signed_active       = findCount(contractsCounts.signedContracts, '.ACTIVE');
        patch.contracts_signed_approved     = findCount(contractsCounts.signedContracts, '.APPROVED');
        patch.contracts_pending_total       = findCount(contractsCounts.pendingContracts, '.SUM_OF_ALL_PENDING') ?? sum(contractsCounts.pendingContracts);
        patch.contracts_termination_total   = sum(contractsCounts.terminationContracts);
        patch.contracts_cancelled_total     = sum(contractsCounts.cancelledContracts);
        patch.contracts_resend_eligible     = contractsCounts.resendEligibleContractsCount ?? null;
      }
      if (contractsList)  patch.contracts_signed_list_total   = contractsList.meta?.totalCount ?? null;
      if (contractsUnauth) patch.contracts_unauthenticated_total = contractsUnauth.meta?.totalCount ?? null;
      if (saudCert && saudCert.data && saudCert.data.type === 'saudization-certificate') {
        patch.sc_raw = saudCert;
        const a = saudCert.data.attributes || {};
        patch.sc_certificate_number           = a['certificate-number'] || null;
        patch.sc_status_id                    = a['status-id'] || null;
        patch.sc_status_ar                    = a['status-ar'] || null;
        patch.sc_status_en                    = a['status-en'] || null;
        patch.sc_issue_date                   = a['certificate-issue-date'] || null;
        patch.sc_expiry_date                  = a['certificate-expiry-date'] || null;
        patch.sc_renew_start_date             = a['renew-start-date'] || null;
        patch.sc_modified_date                = a['modified-date'] || null;
        patch.sc_saudi_rate                   = a['saudi-rate'] ?? null;
        patch.sc_nitaqat_color_code           = a['nitaqat-color-code'] || null;
        patch.sc_nitaqat_color_ar             = a['nitaqat-color-ar'] || null;
        patch.sc_nitaqat_color_en             = a['nitaqat-color-en'] || null;
        patch.sc_unified_establishment_number = a['unified-establishment-number'] || null;
        patch.sc_license_number               = a['license-number'] || null;
      }
      if (debtCert) {
        patch.dc_raw    = debtCert;
        patch.dc_status = debtCert.data?.type || null;
      }
      if (certContext) patch.cert_context_raw = certContext;
      if (reportAvailable) patch.report_available_months = reportAvailable.available_months || null;
      if (transferBalance) {
        patch.transfer_balance_raw         = transferBalance;
        patch.transfer_establishment_type  = transferBalance.establishmentType || null;
        patch.transfer_available_balance   = transferBalance.availableBalance ?? null;
        patch.transfer_tier_id             = transferBalance.tierId ?? null;
        patch.transfer_allowance_start     = transferBalance.allowanceStartDate || null;
        patch.transfer_allowance_end       = transferBalance.allowanceEndDate || null;
        patch.transfer_est_after_allowance = transferBalance.estimatedAllowedQuotaAfterAllowancePeriodEnds ?? null;
        patch.transfer_professional_skills = transferBalance.professionalSkills ?? null;
      }
      if (transferEligibility) {
        patch.transfer_eligibility_raw                       = transferEligibility;
        patch.transfer_show_wp_expiration_modal              = transferEligibility.showWorkPermitExpirationModal ?? null;
        patch.transfer_show_location_missing_modal           = transferEligibility.showEstablishmentLocationMissingInformationModal ?? null;
        patch.transfer_show_non_compliance_self_assess_modal = transferEligibility.showNonComplianceWithSelfAssessmentModal ?? null;
        patch.transfer_show_suspended_nic_portal_modal       = transferEligibility.showSuspendedInNICUnifiedPortalModal ?? null;
        patch.transfer_show_uncorrected_occupation_modal     = transferEligibility.showUncorrectedOccupationSuspensionModal ?? null;
        patch.transfer_show_occ_correction_check_failed_modal = transferEligibility.showFailedToCheckOccupationCorrectionPercentageModal ?? null;
      }
      if (transferReceived)        patch.transfer_received_total         = transferReceived.data?.meta?.totalCount ?? (transferReceived.data?.requests?.length ?? 0);
      if (transferReceivedPending) patch.transfer_received_pending_total = transferReceivedPending.data?.meta?.totalCount ?? (transferReceivedPending.data?.requests?.length ?? 0);
      if (transferSent)            patch.transfer_sent_total             = transferSent.data?.meta?.totalCount ?? (transferSent.data?.requests?.length ?? 0);
      if (visaStatuses) {
        patch.visa_statuses_raw = visaStatuses;
        patch.visa_approved = visaStatuses.approved_visas ?? null;
        const bucket = {};
        for (const v of (visaStatuses.visa_statuses || [])) bucket[v.id] = v.count;
        patch.visa_new = bucket[0] ?? null;
        patch.visa_not_used = bucket[1] ?? null;
        patch.visa_cancelled = bucket[2] ?? null;
        patch.visa_used = bucket[3] ?? null;
        patch.visa_pending_cancel = bucket[4] ?? null;
        patch.visa_authorized = bucket[5] ?? null;
        patch.visa_certified = bucket[6] ?? null;
        patch.visa_issued = bucket[7] ?? null;
        patch.visa_rejected = bucket[8] ?? null;
      }
      await supaFetch('/rest/v1/qiwa_companies?on_conflict=company_id', {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([patch]),
      });

      // Per-request history table — many rows per company. Upsert by qiwa's
      // numeric request id so re-runs merge instead of duplicating.
      if (visaRequestsList && Array.isArray(visaRequestsList.data) && visaRequestsList.data.length) {
        const companyId = Number(activeCompany.data.id);
        const reqRows = visaRequestsList.data.map(r => ({
          id: r.id,
          company_id: companyId,
          request_id: r.request_id || null,
          type_id: r.type_id || null,
          type_name: r.type_name || null,
          subtype: r.subtype || null,
          status: r.status || null,
          starting_date: r.starting_date || null,
          approval_date: r.approval_date || null,
          closing_date: r.closing_date || null,
          rejection_reason: r.rejection_reason || null,
          visa_number: r.visa_number || null,
          visa_number_sum: r.visa_number_sum ?? null,
          raw: r,
          synced_at: new Date().toISOString(),
        }));
        await supaFetch('/rest/v1/qiwa_visa_requests?on_conflict=id', {
          method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(reqRows),
        });
      }

      // Work-permit requests — upsert by request_reference_number.
      const companyIdForWp = Number(activeCompany.data.id);
      if (wpRequests && Array.isArray(wpRequests.items) && wpRequests.items.length) {
        const wpRows = wpRequests.items.map(r => ({
          request_reference_number: r.request_reference_number,
          company_id: companyIdForWp,
          request_submission_date: r.request_submission_date || null,
          number_of_employees: r.number_of_employees ?? null,
          sadad_number: r.sadad_number || null,
          wp_status_code: r.wp_status?.code ?? null,
          wp_status_ar: r.wp_status?.name_ar || null,
          wp_status_en: r.wp_status?.name_en || null,
          total_fees: r.total_fees ?? null,
          time_remaining: r.time_remaining ?? null,
          is_premium: r.is_premium ?? null,
          raw: r,
          synced_at: new Date().toISOString(),
        }));
        await supaFetch('/rest/v1/qiwa_wp_requests?on_conflict=request_reference_number', {
          method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(wpRows),
        });
      }

      // Laborers — upsert (company_id, employee_id). Merge the 'expired' list
      // by setting is_wp_expired=true on those rows. We process expired AFTER
      // the main list so the flag wins on duplicates.
      const allLaborers = new Map();
      const addLaborers = (list, isExpired) => {
        for (const l of (list || [])) {
          if (l.employee_id == null) continue;
          const key = String(l.employee_id);
          const existing = allLaborers.get(key) || {};
          allLaborers.set(key, {
            company_id: companyIdForWp,
            employee_id: l.employee_id,
            employee_name: l.employee_name || existing.employee_name || null,
            employee_id_exp_date: l.employee_id_exp_date || existing.employee_id_exp_date || null,
            work_permit_exp_date: l.work_permit_exp_date || existing.work_permit_exp_date || null,
            status: l.status ?? existing.status ?? null,
            is_wp_expired: isExpired || existing.is_wp_expired || false,
            raw: l,
            synced_at: new Date().toISOString(),
          });
        }
      };
      addLaborers(wpLaborers?.items, false);
      addLaborers(wpLaborersExpired?.items, true);
      // Merge rich employee-management /api/employees data. Key match: idNo == employee_id.
      if (empList && Array.isArray(empList.content)) {
        for (const e of empList.content) {
          if (!e.idNo) continue;
          const key = String(e.idNo);
          const existing = allLaborers.get(key) || { company_id: companyIdForWp, employee_id: e.idNo };
          allLaborers.set(key, {
            ...existing,
            employee_id: e.idNo,
            employee_name: [e.firstName, e.secondName, e.thirdName, e.fourthName].filter(Boolean).join(' ') || existing.employee_name || null,
            employee_id_exp_date: existing.employee_id_exp_date || e.iqamaExpiryDate || null,
            work_permit_exp_date: existing.work_permit_exp_date || e.workPermitExpiryDate || null,
            status: e.employmentContractStatus ?? existing.status ?? null,
            qiwa_employee_id: e.id ?? null,
            first_name: e.firstName || null,
            second_name: e.secondName || null,
            third_name: e.thirdName || null,
            fourth_name: e.fourthName || null,
            year_of_birth: e.yearOfBirth ?? null,
            date_of_birth: e.dateOfBirth || null,
            gender_id: e.genderId ?? null,
            nationality_id: e.nationalityId ?? null,
            nationality_name_ar: e.nationalityNameAR || null,
            nationality_name_en: e.nationalityNameEN || null,
            is_saudi: e.isSaudi ?? null,
            is_student: e.isStudent ?? null,
            is_part_timer: e.isPartTimer ?? null,
            is_remote_working: e.isRemoteWorking ?? null,
            is_disabled: e.isDisabled ?? null,
            border_no: e.borderNo || null,
            iqama_expiry_date: e.iqamaExpiryDate || null,
            iqama_expiry_time: e.iqamaExpiryTime ?? null,
            job_id: e.jobId ?? null,
            job_title_ar: e.jobTitleAR || e.jobName_ar || null,
            job_title_en: e.jobTitleEN || e.jobName_en || null,
            assigned_location_id: e.assignedLocationId ?? null,
            assigned_location_name: e.assignedLocation || null,
            gosi_registered: e.gosiRegistration ?? null,
            notice_period: e.noticePeriod ?? null,
            contract_type_id: e.contractTypeId ?? null,
            contract_type_ar: e.contractTypeAR || null,
            contract_type_en: e.contractTypeEN || null,
            contract_start_date: e.contractStartDate || null,
            contract_expiry_date: e.contractExpiryDate || null,
            contract_period: e.contractPeriod ?? null,
            contract_occupation_ar: e.contractOccupationAR || null,
            contract_occupation_en: e.contractOccupationEN || null,
            contract_number: e.contractNumber ?? null,
            contract_version: e.contractVersion ?? null,
            employment_status_code: e.employmentContractStatus ?? null,
            employment_status_ar: e.employmentContractStatusAR || null,
            employment_status_en: e.employmentContractStatusEN || null,
            wp_status_text: e.workPermitStatus || null,
            wp_start_date: e.workPermitStartDate || null,
            work_permit_exp_date: e.workPermitExpiryDate || existing.work_permit_exp_date || null,
            wp_expiry_time: e.workPermitExpiryTime ?? null,
            wp_number: e.workPermitNumber ?? null,
            wp_paid: e.workPermitPaid ?? null,
            wp_transaction_number: e.workPermitTransactionNumber || null,
            wp_transaction_fees: e.workPermitTransactionFees ?? null,
            wp_transaction_sadad_expiry: e.workPermitTransactionSadadExpiryDate || null,
            correct_occupation: e.correctOccupation ?? null,
            need_occupation_correction: e.needOccupationCorrection ?? null,
            transfer_request_number: e.transferRequestNumber || null,
            terminate_release_date: e.terminateContractReleaseDate || null,
            remaining_term_days: e.remainingTerminationDays ?? null,
            remaining_contract_days: e.remainingContractDays ?? null,
            lmh_classification: e.LMHClassification || null,
            is_wp_expired: (e.workPermitStatus === 'EXPIRED') || existing.is_wp_expired || false,
            rich_raw: e,
            synced_at: new Date().toISOString(),
          });
        }
      }
      if (allLaborers.size > 0) {
        await supaFetch('/rest/v1/qiwa_wp_laborers?on_conflict=company_id,employee_id', {
          method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify([...allLaborers.values()]),
        });
      }

      // Contracts — merge list + GOSI statuses by contractId, then upsert.
      if (contractsList && Array.isArray(contractsList.items) && contractsList.items.length) {
        const gosiByContract = new Map();
        for (const g of (gosiStatuses?.items || [])) {
          if (g.contractId != null) gosiByContract.set(g.contractId, g);
        }
        const cRows = contractsList.items.map(c => {
          const g = gosiByContract.get(c.contractId) || {};
          return {
            contract_id: c.contractId,
            company_id: companyIdForWp,
            establishment_name: c.establishmentName || null,
            requester_name: c.requesterName || null,
            personal_number: c.personalNumber || null,
            employee_id: g.employeeId ?? (c.personalNumber ? Number(c.personalNumber) : null) ?? null,
            laborer_name: c.laborerName || null,
            contract_type_id: c.contractType?.id || null,
            contract_type_ar: c.contractType?.name?.ar || null,
            contract_type_en: c.contractType?.name?.en || null,
            expiry_date_gregorian: c.expiryDate?.gregorian || null,
            expiry_date_hijri: c.expiryDate?.hijri || null,
            notice_period: c.noticePeriod ?? null,
            last_modified_gregorian: c.lastModifiedDate?.gregorian || null,
            last_modified_hijri: c.lastModifiedDate?.hijri || null,
            status_id: c.status?.id || null,
            status_ar: c.status?.name?.ar || null,
            status_en: c.status?.name?.en || null,
            related_to_id: c.relatedToId ?? null,
            is_unified: c.isUnified ?? null,
            gosi_status: g.gosiStatus?.status || null,
            gosi_description: g.gosiStatus?.description || null,
            raw: c,
            synced_at: new Date().toISOString(),
          };
        });
        await supaFetch('/rest/v1/qiwa_contracts?on_conflict=contract_id', {
          method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(cRows),
        });
      }

      // Monthly report — one row per (company_id, year_month). The companyId
      // comes from the JWT context; year_month is the PREVIOUS calendar month
      // because Qiwa publishes the report after the month ends.
      if (monthlyReport && monthlyReport.company) {
        const r = monthlyReport;
        const c = r.company || {};
        const wp = r.work_permits || {};
        const ph = r.establishment_phase || {};
        const ac = r.authenticated_contracts || {};
        const em = r.employees || {};
        const sc = r.scores?.primary || {};
        const rRow = {
          company_id: companyIdForWp,
          year_month: reportYM,
          report_year: 2000 + Number(rYear2),
          report_month: Number(rMonth),

          company_status_id: c.status?.id ?? null,
          company_status_name: c.status?.name || null,
          company_size_id: c.size?.id ?? null,
          company_size_ar: c.size?.name?.ar || null,
          company_size_en: c.size?.name?.en || null,
          company_type_id: c.type?.id ?? null,
          company_type_ar: c.type?.name?.ar || null,
          company_type_en: c.type?.name?.en || null,
          company_name: c.name || null,
          economic_activity: c.economic_activity || null,
          establishment_id: c.establishment_id || null,
          unified_number: c.unified_number || null,
          unified_national_number: c.unified_national_number || null,
          cr_number: c.cr_number || null,
          nitaqat_id: c.nitaqat?.id ?? null,
          nitaqat_ar: c.nitaqat?.ar || null,
          nitaqat_en: c.nitaqat?.en || null,

          wp_has_expats: wp.has_expats ?? null,
          wp_valid_est: wp.valid_est != null && wp.valid_est !== '' ? Number(wp.valid_est) : null,
          wp_expired_est: wp.expired_est != null && wp.expired_est !== '' ? Number(wp.expired_est) : null,
          wp_waiting_for_payment_est: wp.waiting_for_payment_est != null && wp.waiting_for_payment_est !== '' ? Number(wp.waiting_for_payment_est) : null,
          wp_not_issued_gt_90_est: wp.not_issued_greater_than_90_days_est != null && wp.not_issued_greater_than_90_days_est !== '' ? Number(wp.not_issued_greater_than_90_days_est) : null,
          wp_not_issued_lt_90_est: wp.not_issued_less_than_90_days_est != null && wp.not_issued_less_than_90_days_est !== '' ? Number(wp.not_issued_less_than_90_days_est) : null,

          phase_status: ph.phase_status || null,
          allowance_end_date: ph.allowance_end_date || null,

          total_authenticated_contracts: ac.total_authenticated_contracts ?? null,

          emp_saudis: em.saudis?.value ?? null,
          emp_saudis_diff: em.saudis?.diff_prev_month ?? null,
          emp_foreigners: em.foreigners?.value ?? null,
          emp_foreigners_diff: em.foreigners?.diff_prev_month ?? null,
          emp_total: em.total?.value ?? null,
          emp_total_diff: em.total?.diff_prev_month ?? null,

          score_primary: sc.score?.value ?? null,
          score_primary_diff: sc.score?.diff_prev_month ?? null,
          score_nitaqat: sc.nitaqat?.value ?? null,
          score_nitaqat_diff: sc.nitaqat?.diff_prev_month ?? null,
          score_work_permits: sc.work_permits?.value ?? null,
          score_work_permits_diff: sc.work_permits?.diff_prev_month ?? null,
          score_notes_in_wps: sc.notes_in_wps?.value ?? null,
          score_notes_in_wps_diff: sc.notes_in_wps?.diff_prev_month ?? null,
          score_contract_auth: sc.contract_authentication?.value ?? null,
          score_contract_auth_diff: sc.contract_authentication?.diff_prev_month ?? null,
          score_labourer_location: sc.labourer_location?.value ?? null,
          score_labourer_location_diff: sc.labourer_location?.diff_prev_month ?? null,

          created_time: r.created_time || null,
          raw: r,
          synced_at: new Date().toISOString(),
        };
        await supaFetch('/rest/v1/qiwa_monthly_reports?on_conflict=company_id,year_month', {
          method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify([rRow]),
        });
      }

      // Employee-transfer requests — flatten the 3 list endpoints into one
      // upsert. Direction tags the source (received vs sent). The request_id
      // hunts for whatever stable identifier Qiwa provided.
      const allTransferRequests = [];
      const pickReqId = (r) => String(
        r.id ?? r.requestId ?? r.referenceNumber ?? r.request_id ?? r.uuid ?? ''
      );
      const collectTransfers = (resp, direction) => {
        const items = resp?.data?.requests || resp?.requests || [];
        for (const r of items) {
          const id = pickReqId(r);
          if (!id) continue;
          allTransferRequests.push({
            company_id: companyIdForWp,
            request_id: id,
            direction,
            status: r.status?.label || r.statusLabel || r.status || null,
            status_id: r.status?.value ?? r.statusId ?? null,
            status_ar: r.status?.ar || r.statusAr || null,
            status_en: r.status?.en || r.statusEn || null,
            employee_id: String(r.employeeId ?? r.laborerId ?? r.employee?.id ?? r.laborer?.id ?? '') || null,
            employee_name: r.employeeName || r.laborerName || r.employee?.name || r.laborer?.name || null,
            current_employer_name: r.currentEmployerName || r.fromEstablishmentName || r.currentEstablishmentName || null,
            new_employer_name: r.newEmployerName || r.toEstablishmentName || r.requestingEstablishmentName || null,
            release_date: r.releaseDate || r.release_date || null,
            created_at_qiwa: r.createdAt || r.created_at || r.requestDate || null,
            expires_at: r.expiresAt || r.expirationDate || r.expiration_date || null,
            raw: r,
            synced_at: new Date().toISOString(),
          });
        }
      };
      collectTransfers(transferReceived, 'received');
      collectTransfers(transferReceivedPending, 'received');
      collectTransfers(transferSent, 'sent');
      if (allTransferRequests.length > 0) {
        await supaFetch('/rest/v1/qiwa_transfer_requests?on_conflict=company_id,request_id,direction', {
          method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(allTransferRequests),
        });
      }
    }

    // Per-company laborer sweep — fetches wp/laborers for ALL workspaces, not
    // just the active company. The /api/v1/work-permits/laborers endpoint
    // accepts labor_office_id + sequence_number as query params so no SPA
    // context-switch is needed. Without this sweep only the active-company's
    // workers ever land in qiwa_wp_laborers, so most facility detail pages
    // show no worker data even after a successful sync.
    if (companies.length > 0) {
      msg('جلب عمال كل المنشآت (' + companies.length + ')...');
      let companyIdx = 0; let workersSeen = 0; let companiesDone = 0;
      const CONCURRENCY = 3;
      const sweepWorker = async () => {
        while (companyIdx < companies.length) {
          const i = companyIdx++;
          const c = companies[i];
          if (!c.company_labor_office_id || !c.company_sequence_number) { companiesDone++; continue; }
          const cQ = '?labor_office_id=' + c.company_labor_office_id + '&sequence_number=' + c.company_sequence_number + '&page_index=1&page_size=1000';
          const [activeR, expiredR] = await Promise.all([
            qiwaGet(API_CORE + '/api/v1/work-permits/laborers' + cQ + '&has_exceptional_balance=0&is_investment_establishment=0&is_in_red_ntiqat=0&is_establishing=0'),
            qiwaGet(API_CORE + '/api/v1/work-permits/laborers/expired' + cQ + '&query='),
          ]);
          const rows = new Map();
          const collect = (resp, isExpired) => {
            if (!resp.ok || !resp.data || !Array.isArray(resp.data.items)) return;
            for (const l of resp.data.items) {
              if (l.employee_id == null) continue;
              const key = String(l.employee_id);
              const existing = rows.get(key) || {};
              rows.set(key, {
                company_id: c.company_id,
                employee_id: l.employee_id,
                employee_name: l.employee_name || existing.employee_name || null,
                employee_id_exp_date: l.employee_id_exp_date || existing.employee_id_exp_date || null,
                work_permit_exp_date: l.work_permit_exp_date || existing.work_permit_exp_date || null,
                status: l.status ?? existing.status ?? null,
                is_wp_expired: isExpired || existing.is_wp_expired || false,
                raw: l,
                synced_at: new Date().toISOString(),
              });
            }
          };
          collect(activeR, false);
          collect(expiredR, true);
          if (rows.size > 0) {
            await supaFetch('/rest/v1/qiwa_wp_laborers?on_conflict=company_id,employee_id', {
              method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
              body: JSON.stringify([...rows.values()]),
            });
            workersSeen += rows.size;
          }
          companiesDone++;
          if (companiesDone % 10 === 0 || companiesDone === companies.length) {
            msg('جلب عمال: ' + companiesDone + '/' + companies.length + ' منشأة · ' + workersSeen + ' عامل');
          }
        }
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, sweepWorker));
    }

    await supaFetch('/rest/v1/sync_runs?id=eq.' + runId, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'success', completed_at: new Date().toISOString(), records_fetched: added }),
    });

    const detailLabel = activeCompany ? ' + تفاصيل المنشأة الحالية' : '';
    msg('✅ ' + added + ' منشأة' + detailLabel);
    setTimeout(() => { document.getElementById('_jisr_qiwa_ui')?.remove(); }, 8000);
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

export function buildQiwaBookmarklet({ sourceId, personId }) {
  return 'javascript:' + encodeURIComponent(minify(body({ sourceId, personId })))
}
