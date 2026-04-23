// Builds the SBC sync bookmarklet as a `javascript:` URL. Three APIs per sync:
//   1) POST mcV2/get-crs-by-personal-identifier-number  → facility list
//   2) GET  gosi/establishments-main-info-by-cr-national-number/{encryptedCrNatNo}  → GOSI
//   3) GET  hrsd/get-establishment-statistics/{encryptedCrNatNo}                    → labor office
// All data merged into sbc_facilities per facility, diffed against last run.

const SUPABASE_URL = 'https://gcvshzutdslmdkwqwteh.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdnNoenV0ZHNsbWRrd3F3dGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTkwNjgsImV4cCI6MjA5MDQ3NTA2OH0.5R0I5VvB7lp3wpSrtay3DMcXKsT9l1uK0Ukd1F4_ImM'

// Fields we diff between runs. Keep stable — adding is safe; removing breaks
// historical diff references.
const DIFF_FIELDS = [
  ['entityFullNameAr', 'اسم المنشأة'],
  ['capital', 'رأس المال'],
  ['crStatus', 'حالة السجل'],
  ['headquarterCity', 'المدينة'],
  ['companyForm', 'الشكل القانوني'],
  ['isMain', 'سجل رئيسي'],
  ['isManager', 'مدير'],
  ['isPartner', 'شريك'],
  ['isInConfirmationPeriod', 'فترة التأكيد'],
  ['inLiquidationProcess', 'تحت التصفية'],
  ['hasEcommerce', 'تجارة إلكترونية'],
  ['crConfirmDate', 'تاريخ التأكيد'],
]

const NORMALIZE = `
const normalize = (v) => {
  if (v == null) return null;
  if (typeof v === 'object') {
    if (v.crIssueDateGregorian) return v.crIssueDateGregorian;
    if (v.crConfirmDateGregorian) return v.crConfirmDateGregorian;
    for (const k of Object.keys(v)) if (/DescAr$|NameAr$|DescriptionAr$/.test(k)) return v[k];
    for (const k of Object.keys(v)) if (/ID$|Id$/.test(k)) return v[k];
    try { return JSON.stringify(v).slice(0, 120) } catch { return String(v) }
  }
  return v;
};
`

function body({ sourceId, personId }) {
  return `
(async () => {
  const U='${SUPABASE_URL}', K='${SUPABASE_ANON}';
  const API_BASE='https://api.saudibusiness.gov.sa/sbc/externalgw/ipapi-nl/api/app';
  const API_CRS = API_BASE + '/mcV2/get-crs-by-personal-identifier-number';
  const API_GOSI = API_BASE + '/gosi/establishments-main-info-by-cr-national-number/';
  const API_HRSD = API_BASE + '/hrsd/get-establishment-statistics/';
  const SOURCE='${sourceId}', PERSON='${personId}';
  const DIFF_FIELDS = ${JSON.stringify(DIFF_FIELDS)};
  ${NORMALIZE}
  const msg = (m) => {
    let d = document.getElementById('_jisr_sync_ui');
    if (!d) {
      d = document.createElement('div'); d.id = '_jisr_sync_ui';
      d.style.cssText = 'position:fixed;top:16px;left:16px;background:#111;color:#D4A017;padding:12px 18px;border-radius:10px;z-index:2147483647;font:700 13px/1.5 sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.5);max-width:380px;direction:rtl;text-align:right;border:1px solid rgba(212,160,23,.35)';
      document.body.appendChild(d);
    }
    d.textContent = 'جسر: ' + m; return d;
  };
  const supaFetch = (path, opts={}) => fetch(U + path, { ...opts, headers: { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json', ...(opts.headers || {}) } });

  // Parallel with bounded concurrency; ignores individual failures.
  const mapLimit = async (items, limit, fn) => {
    const out = new Array(items.length);
    let idx = 0;
    const workers = Array.from({ length: limit }, async () => {
      while (true) {
        const i = idx++;
        if (i >= items.length) return;
        try { out[i] = await fn(items[i], i) } catch (e) { out[i] = null }
      }
    });
    await Promise.all(workers);
    return out;
  };

  try {
    if (!location.hostname.includes('saudibusiness') && !location.hostname.endsWith('business.sa')) return msg('افتح بوابة تيسير أولاً (e2.business.sa)');
    const raw = localStorage.getItem('oidc.user:https://www.saudibusiness.gov.sa:InvestorPortal');
    if (!raw) return msg('لم يتم تسجيل الدخول بنفاذ. سجّل الدخول ثم اضغط هذا الإشارة مرة أخرى.');
    const o = JSON.parse(raw);
    if (!o.access_token) return msg('الجلسة غير صالحة. أعد تسجيل الدخول.');
    msg('جارٍ التقاط الجلسة...');
    let capturedHeaders = null;
    const origFetch = window.fetch;
    window.fetch = function(input, init) {
      try {
        const u = typeof input === 'string' ? input : (input && input.url);
        if (u && u.includes('get-crs-by-personal-identifier-number') && !capturedHeaders) {
          const src = (init && init.headers) || (input instanceof Request ? input.headers : null);
          const h = {};
          if (src instanceof Headers) src.forEach((v, k) => { h[k] = v; });
          else if (src && typeof src === 'object') for (const k of Object.keys(src)) h[k] = src[k];
          capturedHeaders = h;
        }
      } catch(_) {}
      return origFetch.apply(this, arguments);
    };
    if (location.pathname === '/commercial-records') {
      history.pushState({}, '', '/'); dispatchEvent(new PopStateEvent('popstate'));
      await new Promise(r => setTimeout(r, 800));
      history.pushState({}, '', '/commercial-records'); dispatchEvent(new PopStateEvent('popstate'));
    } else {
      history.pushState({}, '', '/commercial-records'); dispatchEvent(new PopStateEvent('popstate'));
    }
    for (let i = 0; i < 120 && !capturedHeaders; i++) await new Promise(r => setTimeout(r, 100));
    if (!capturedHeaders) return msg('تعذّر التقاط بيانات الجلسة. أعد تحميل الصفحة وجرّب ثانية.');

    // Clean captured headers for GET requests (no content-type needed).
    const authHeaders = { ...capturedHeaders };
    delete authHeaders['content-length'];
    delete authHeaders['Content-Length'];

    msg('إنشاء سجل مزامنة...');
    const runRes = await supaFetch('/rest/v1/sync_runs?select=id', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ source_id: SOURCE, person_id: PERSON, status: 'running' }),
    });
    const runArr = await runRes.json();
    const runId = Array.isArray(runArr) ? runArr[0]?.id : runArr.id;
    if (!runId) return msg('❌ فشل إنشاء سجل المزامنة');

    const prevSnapRes = await supaFetch('/rest/v1/sync_snapshots?select=record_key,payload,run_id,created_at&source_id=eq.' + SOURCE + '&person_id=eq.' + PERSON + '&order=created_at.desc&limit=500');
    const prevSnap = await prevSnapRes.json();
    const latestRunId = prevSnap[0]?.run_id;
    const prevByKey = {};
    if (latestRunId) for (const s of prevSnap) if (s.run_id === latestRunId) prevByKey[s.record_key] = s.payload;

    let page = 1, got = 0, total = 0;
    const collectedKeys = new Set();
    const allChanges = [];
    const allSnapshots = [];
    const items = [];

    while (true) {
      msg('جلب الصفحة ' + page + '...');
      const headers = { ...capturedHeaders, 'X-Correlation-Id': crypto.randomUUID() };
      const r = await fetch(API_CRS, { method: 'POST', headers, body: JSON.stringify({ pageNumber: page, pageSize: 50 }) });
      if (!r.ok) {
        await supaFetch('/rest/v1/sync_runs?id=eq.' + runId, { method: 'PATCH', body: JSON.stringify({ status: 'failed', error: 'API ' + r.status, completed_at: new Date().toISOString() }) });
        return msg('❌ API ' + r.status);
      }
      const j = await r.json();
      total = j.totalCount || 0;
      for (const it of (j.items || [])) items.push(it);
      got += (j.items || []).length;
      if (!j.hasNextPage || got >= total) break;
      page++; if (page > 30) break;
    }

    // Fetch GOSI + HRSD per facility (5 concurrent, ignore individual errors).
    msg('جلب بيانات التأمينات ومكتب العمل...');
    let done = 0;
    const extras = await mapLimit(items, 5, async (it) => {
      const enc = it?.crInformation?.encryptedCrNationalNumber;
      done++;
      if (done % 5 === 0 || done === items.length) msg('تفاصيل ' + done + '/' + items.length);
      if (!enc) return { gosi: null, hrsd: null };
      const headersG = { ...authHeaders, 'X-Correlation-Id': crypto.randomUUID() };
      const headersH = { ...authHeaders, 'X-Correlation-Id': crypto.randomUUID() };
      const [gRes, hRes] = await Promise.all([
        fetch(API_GOSI + encodeURIComponent(enc), { method: 'GET', headers: headersG }).catch(() => null),
        fetch(API_HRSD + encodeURIComponent(enc), { method: 'GET', headers: headersH }).catch(() => null),
      ]);
      const gosi = (gRes && gRes.ok) ? await gRes.json().catch(() => null) : null;
      const hrsd = (hRes && hRes.ok) ? await hRes.json().catch(() => null) : null;
      return { gosi, hrsd };
    });

    // Build facility payloads from items + extras
    const allFacilities = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const c = it.crInformation || {};
      const key = c.crNationalNumber;
      if (!key) continue;
      collectedKeys.add(key);
      const gosi = extras[i]?.gosi;
      const hrsd = extras[i]?.hrsd;
      const gosiFirst = gosi?.establishmentList?.[0] || null;
      const payload = {
        cr_national_number: key, cr_number: c.crNumber,
        entity_full_name_ar: c.entityFullNameAr, entity_full_name_en: c.entityFullNameEn,
        capital: c.capital, capital_currency: c.capitalCurrency,
        entity_type: c.entityType, company_form: c.companyForm,
        headquarter_city: c.headquarterCity, cr_status: c.crStatus,
        cr_issue_date: (c.crIssueDate && c.crIssueDate.crIssueDateGregorian) || null,
        cr_confirm_date: (c.crConfirmDate && c.crConfirmDate.crConfirmDateGregorian) || null,
        is_main: !!c.isMain, is_manager: !!c.isManager, is_partner: !!c.isPartner,
        is_in_confirmation_period: !!c.isInConfirmationPeriod,
        in_liquidation_process: !!c.inLiquidationProcess,
        has_ecommerce: !!c.hasEcommerce,
        encrypted_cr_number: c.encryptedCrNumber,
        encrypted_cr_national_number: c.encryptedCrNationalNumber,
        main_cr_national_number: c.mainCRNationalNumber || null,
        partnership_types: c.partnershipTypes || null,
        company_character: c.companyCharacterList || null,
        activities: it.crActivities || null,
        management_structure: it.mangmentInformation?.managementStructure || null,
        managers: it.mangmentInformation?.managerList || null,
        partners: it.parityList || null,
        synced_at: new Date().toISOString(),
        raw: it,
      };
      if (gosi) {
        payload.gosi_registration_number = gosiFirst?.registrationNumber || null;
        payload.gosi_establishment_name = gosiFirst?.establishmentNameArb || null;
        payload.gosi_contributors_total = gosi.numberOfContributors != null ? Number(gosi.numberOfContributors) : null;
        payload.gosi_contributors_saudi = gosi.numberOfSaudiContributors != null ? Number(gosi.numberOfSaudiContributors) : null;
        payload.gosi_contributors_non_saudi = gosi.numberOfNonSaudiContributors != null ? Number(gosi.numberOfNonSaudiContributors) : null;
        payload.gosi_total_contribution = gosi.totalContribution != null ? Number(gosi.totalContribution) : null;
        payload.gosi_total_debit = gosi.totalDebit != null ? Number(gosi.totalDebit) : null;
        payload.gosi_total_penalties = gosi.totalPenalties != null ? Number(gosi.totalPenalties) : null;
        payload.gosi_synced_at = new Date().toISOString();
        payload.gosi_raw = gosi;
      }
      if (hrsd) {
        payload.hrsd_labor_office_id = hrsd.establishmentFileNumber?.laborOfficeIdField ?? null;
        payload.hrsd_sequence_number = hrsd.establishmentFileNumber?.sequenceNumberField ?? null;
        payload.hrsd_labor_office_name = hrsd.laboerOfficeName || null;
        payload.hrsd_nitaq_code = hrsd.nitaq?.code || null;
        payload.hrsd_nitaq_name = hrsd.nitaq?.nameLocal || null;
        payload.hrsd_nitaqat_activity_code = hrsd.nitaqatEconomicActivity?.code || null;
        payload.hrsd_nitaqat_activity_name = hrsd.nitaqatEconomicActivity?.nameLocal || null;
        payload.hrsd_saudi_laborers = hrsd.saudiLaborers ?? null;
        payload.hrsd_foreign_laborers = hrsd.foreignLaborers ?? null;
        payload.hrsd_total_laborers = hrsd.totalLaborers ?? null;
        payload.hrsd_total_issued_permits = hrsd.totalIssuedWorkPermits ?? null;
        payload.hrsd_total_expired_permits = hrsd.totalExpiredWorkPermits ?? null;
        payload.hrsd_total_expiring_permits = hrsd.totalAboutToExpireWorkPermits ?? null;
        payload.hrsd_saudi_percentage = hrsd.entity_Saudi_Percentage ?? null;
        payload.hrsd_synced_at = new Date().toISOString();
        payload.hrsd_raw = hrsd;
      }
      allFacilities.push(payload);
      allSnapshots.push({ run_id: runId, source_id: SOURCE, person_id: PERSON, record_key: key, payload: it });

      const prev = prevByKey[key];
      const label = c.entityFullNameAr || key;
      if (!prev) {
        if (latestRunId) allChanges.push({ run_id: runId, source_id: SOURCE, person_id: PERSON, record_key: key, record_label: label, change_type: 'added' });
      } else {
        const prevCr = prev.crInformation || prev;
        for (const [field, labelAr] of DIFF_FIELDS) {
          const oldV = normalize(prevCr[field]);
          const newV = normalize(c[field]);
          if (oldV !== newV) {
            allChanges.push({ run_id: runId, source_id: SOURCE, person_id: PERSON, record_key: key, record_label: label, change_type: 'modified', field_path: field, field_label_ar: labelAr, old_value: oldV, new_value: newV });
          }
        }
      }
    }

    if (latestRunId) {
      for (const prevKey of Object.keys(prevByKey)) {
        if (!collectedKeys.has(prevKey)) {
          const label = (prevByKey[prevKey].crInformation || prevByKey[prevKey]).entityFullNameAr || prevKey;
          allChanges.push({ run_id: runId, source_id: SOURCE, person_id: PERSON, record_key: prevKey, record_label: label, change_type: 'removed' });
        }
      }
    }

    msg('حفظ ' + allFacilities.length + ' سجل...');
    const chunk = (arr, n) => { const out=[]; for (let i=0;i<arr.length;i+=n) out.push(arr.slice(i,i+n)); return out };
    for (const part of chunk(allFacilities, 50)) {
      const up = await supaFetch('/rest/v1/sbc_facilities?on_conflict=cr_national_number', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(part),
      });
      if (!up.ok) return msg('❌ upsert sbc_facilities ' + up.status);
    }
    for (const part of chunk(allSnapshots, 50)) {
      const up = await supaFetch('/rest/v1/sync_snapshots', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(part) });
      if (!up.ok) return msg('❌ snapshots ' + up.status);
    }
    let added = 0, removed = 0, modified = 0;
    for (const c of allChanges) { if (c.change_type === 'added') added++; else if (c.change_type === 'removed') removed++; else modified++; }
    if (allChanges.length) {
      for (const part of chunk(allChanges, 100)) {
        const up = await supaFetch('/rest/v1/sync_changes', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(part) });
        if (!up.ok) return msg('❌ changes ' + up.status);
      }
    }
    await supaFetch('/rest/v1/sync_runs?id=eq.' + runId, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'success', completed_at: new Date().toISOString(), records_fetched: allFacilities.length, records_added: added, records_removed: removed, records_modified: modified, is_baseline: !latestRunId }),
    });
    // Extract clientId from the headers we captured during the live API call.
    // SBC's gosi/hrsd endpoints require this header; saving it lets backend re-use the session.
    const capturedClientId = (capturedHeaders && (capturedHeaders.clientId || capturedHeaders.Clientid || capturedHeaders.clientid)) || null;
    await supaFetch('/rest/v1/sbc_sessions?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ id: 'default', access_token: o.access_token, refresh_token: o.refresh_token, id_token: o.id_token, token_type: o.token_type || 'Bearer', expires_at: o.expires_at, scope: o.scope, client_id: capturedClientId, updated_at: new Date().toISOString() }),
    });
    const summary = latestRunId
      ? ('✅ ' + allFacilities.length + ' سجل · ' + added + '+ ' + modified + '✎ ' + removed + '-')
      : ('✅ baseline: ' + allFacilities.length + ' سجل');
    msg(summary);
    setTimeout(() => { document.getElementById('_jisr_sync_ui')?.remove(); }, 8000);
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

// Build a bookmarklet URL tagged with (sourceId, personId).
export function buildBookmarklet({ sourceId, personId }) {
  return 'javascript:' + encodeURIComponent(minify(body({ sourceId, personId })))
}

// Legacy untagged export kept so older install cards still build.
export const SBC_SYNC_BOOKMARKLET = buildBookmarklet({ sourceId: 'sbc', personId: '' })
