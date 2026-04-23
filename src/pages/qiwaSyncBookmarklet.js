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
      const ws = await qiwaGet(API_CORE + '/context/workspaces-v2/new?page_size=100&page_index=' + page + '&sort_by=1');
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
      const gr = await qiwaGet(API_CORE + '/context/workspaces-v2/groups?page_size=100&page_index=' + page);
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

    // 4) Indicators / criteria / cases / absher (dashboard + visa origins).
    let visaStatuses = null;
    const [cr, ind, csRes, abs] = await Promise.all([
      qiwaGet(API_INDICATORS + '/api/v1/criteria/primary'),
      qiwaGet(API_DASHBOARD + '/api/v1/indicators'),
      qiwaGet(API_DASHBOARD + '/api/v1/establishment-cases'),
      qiwaGet(API_CORE + '/visa-proxy/v3/absher-balance'),
    ]);
    if (cr.ok) criteria = cr.data;
    if (ind.ok) indicators = ind.data;
    if (csRes.ok) cases = csRes.data;
    if (abs.ok) absher = abs.data;

    // 5) Visa statuses — depends on current entity_number from criteria.
    // Format is e.g. "6-4019841-100" which the visa-proxy needs to scope to company.
    const entityNo = criteria && criteria.nitaqat && criteria.nitaqat.entity_number;
    if (entityNo) {
      const vs = await qiwaGet(API_CORE + '/visa-proxy/v3/visa-statuses/' + encodeURIComponent(entityNo) + '?visa_type_id=1');
      if (vs.ok) visaStatuses = vs.data;
    }

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
      if (indicators) patch.indicators_raw = indicators;
      if (cases) {
        patch.cases_total = cases.all_cases_count ?? null;
        patch.cases_notes = cases.notes?.value ?? null;
        patch.cases_violations = cases.violations?.value ?? null;
      }
      if (absher) {
        patch.absher_balance = absher.balance != null ? Number(absher.balance) : null;
        patch.absher_account_number = absher.account_number || null;
        patch.absher_amount_per_visa = absher.amount_per_visa != null ? Number(absher.amount_per_visa) : null;
      }
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
