// SBC sync bookmarklet — built step-by-step.
//
// Step 1: Capture ipapi-nl session, fetch MoC operator-level violations:
//   - mcV2/GetViolationsQuery      → "مخالفات عدم إيداع القوائم المالية"
//   - mcV2/GetCaseViolationsQuery  → "مخالفات اللجان"
//   Persisted into sbc_dashboard_stats (keyed by person_id).
//
// Step 2: Fetch the operator's full CR list (POST get-crs-by-personal-identifier-number).
//   Maps each item to sbc_facilities + 5 child tables:
//   sbc_facility_managers, sbc_facility_partners, sbc_facility_activities,
//   sbc_facility_procedures, sbc_facility_licenses.

const SUPABASE_URL = 'https://gcvshzutdslmdkwqwteh.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdnNoenV0ZHNsbWRrd3F3dGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTkwNjgsImV4cCI6MjA5MDQ3NTA2OH0.5R0I5VvB7lp3wpSrtay3DMcXKsT9l1uK0Ukd1F4_ImM'

function body({ sourceId, personId }) {
  return `
(async () => {
  const U='${SUPABASE_URL}', K='${SUPABASE_ANON}';
  const API_BASE='https://api.saudibusiness.gov.sa/sbc/externalgw';
  const IP = API_BASE + '/ipapi-nl/api/app';
  const SOURCE='${sourceId}', PERSON='${personId}';
  const NOW = () => new Date().toISOString();

  const msg = (m) => {
    let d = document.getElementById('_jisr_sync_ui');
    if (!d) {
      d = document.createElement('div');
      d.id = '_jisr_sync_ui';
      d.style.cssText = 'position:fixed;top:16px;left:16px;background:#111;color:#D4A017;padding:12px 18px;border-radius:10px;z-index:2147483647;font:700 13px/1.5 sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.5);max-width:380px;direction:rtl;text-align:right;border:1px solid rgba(212,160,23,.35)';
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

  const headersFor = (backend, opts) => {
    opts = opts || {};
    const base = captured[backend] || Object.values(captured).find(h => h && (h.authorization || h.Authorization)) || {};
    const out = { ...base, 'X-Correlation-Id': crypto.randomUUID() };
    if (opts.noContentType) { delete out['content-type']; delete out['Content-Type']; }
    delete out['content-length']; delete out['Content-Length'];
    return out;
  };

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

  // ── Helpers for value normalization ──
  // SBC returns "غير محدد" (literally "unspecified") as a string instead of null
  // for some contact fields. Strip those so downstream code can treat as null.
  const clean = (v) => {
    if (v == null) return null;
    if (typeof v === 'string') {
      const t = v.trim();
      if (!t || t === 'غير محدد' || t === '-' || t === 'N/A' || t === 'null') return null;
      return t;
    }
    return v;
  };
  const intOrNull = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; };
  const numOrNull = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
  const boolish = (v) => v === true || v === 'true' || v === 1;

  // ── CR list → sbc_facilities row mapper ──
  // Per the field reference doc. Lookup objects are flattened into id/ar/en triples.
  const mapFacility = (it) => {
    const c = it.crInformation || {};
    const act = it.crActivities || {};
    const ct = it.contactInformation || {};
    const mg = it.mangmentInformation || {};
    return {
      person_id: PERSON || null,
      sync_run_id: runId,
      cr_national_number: c.crNationalNumber || null,
      cr_number: c.crNumber || null,
      version_no: intOrNull(c.versionNo),
      entity_full_name_ar: clean(c.entityFullNameAr),
      entity_full_name_en: clean(c.entityFullNameEn),
      capital: numOrNull(c.capital),
      capital_currency_id: intOrNull(c.capitalCurrency && c.capitalCurrency.capitalCurrencyID),
      capital_currency_ar: clean(c.capitalCurrency && c.capitalCurrency.capitalCurrencyDescAr),
      capital_currency_en: clean(c.capitalCurrency && c.capitalCurrency.capitalCurrencyDescEn),
      company_duration: intOrNull(c.companyDuration),
      delete_date: c.deleteDate || null,
      is_main: !!c.isMain,
      main_cr_national_number: c.mainCRNationalNumber || null,
      main_cr_number: c.mainCRNumber || null,
      encrypted_cr_national_number: c.encryptedCrNationalNumber || null,
      encrypted_cr_number: c.encryptedCrNumber || null,
      encrypted_main_cr_national_number: c.encryptedMainCrNationalNumber || null,
      encrypted_main_cr_number: c.encryptedMainCrNumber || null,
      is_license_based: !!c.isLicenseBased,
      is_survey_required: !!c.isSurveyRequired,
      has_ecommerce: !!c.hasEcommerce,
      in_liquidation_process: !!c.inLiquidationProcess,
      is_in_confirmation_period: !!c.isInConfirmationPeriod,
      is_manager: !!c.isManager,
      is_partner: !!c.isPartner,
      last_cr_suspension_date: c.lastCrSuspensionDate || null,
      last_cr_reactivation_date: c.lastCrReactivationDate || null,
      license_issuer: c.licenseIssuer ? (typeof c.licenseIssuer === 'string' ? c.licenseIssuer : JSON.stringify(c.licenseIssuer)) : null,
      company_contract_from_date: c.companyContractFromDate || null,
      entity_name_lang_id: intOrNull(c.entityNameLang && c.entityNameLang.entityNameLangID),
      entity_name_lang_ar: clean(c.entityNameLang && c.entityNameLang.entityNameLangDescAr),
      entity_name_lang_en: clean(c.entityNameLang && c.entityNameLang.entityNameLangDescEn),
      entity_type_id: intOrNull(c.entityType && c.entityType.entityTypeID),
      entity_type_ar: clean(c.entityType && c.entityType.entityTypeDescAr),
      entity_type_en: clean(c.entityType && c.entityType.entityTypeDescEn),
      headquarter_city_id: intOrNull(c.headquarterCity && c.headquarterCity.headquarterCityID),
      headquarter_city_ar: clean(c.headquarterCity && c.headquarterCity.headquarterCityNameAr),
      headquarter_city_en: clean(c.headquarterCity && c.headquarterCity.headquarterCityNameEn),
      company_form_id: intOrNull(c.companyForm && c.companyForm.companyFormID),
      company_form_ar: clean(c.companyForm && c.companyForm.companyFormDescriptionAr),
      company_form_en: clean(c.companyForm && c.companyForm.companyFormDescriptionEn),
      partners_nationality_id: intOrNull(c.partnersNationality && c.partnersNationality.partnersNationalityID),
      partners_nationality_ar: clean(c.partnersNationality && c.partnersNationality.partnersNationalityDescAr),
      partners_nationality_en: clean(c.partnersNationality && c.partnersNationality.partnersNationalityDescEn),
      cr_status_id: intOrNull(c.crStatus && c.crStatus.crStatusID),
      cr_status_ar: clean(c.crStatus && c.crStatus.crStatusDescAr),
      cr_status_en: clean(c.crStatus && c.crStatus.crStatusDescEn),
      cr_issue_date_gregorian: (c.crIssueDate && c.crIssueDate.crIssueDateGregorian) || null,
      cr_issue_date_hijri: (c.crIssueDate && c.crIssueDate.crIssueDateHijri) || null,
      cr_confirm_date_gregorian: (c.crConfirmDate && c.crConfirmDate.crConfirmDateGregorian) || null,
      cr_confirm_date_hijri: (c.crConfirmDate && c.crConfirmDate.crConfirmDateHijri) || null,
      partnership_types: c.partnershipTypes || null,
      company_characters: c.companyCharacterList || null,
      // Activities (header-level only — list goes to sbc_facility_activities)
      activities_type_id: act.activitiesType && act.activitiesType.activitiesTypeID || null,
      activities_type_ar: clean(act.activitiesType && act.activitiesType.activitiesTypeDescriptionAr),
      activities_type_en: clean(act.activitiesType && act.activitiesType.activitiesTypeDescriptionEn),
      full_activities_text: clean(act.fullActivitiesText),
      // Contact
      phone_no: clean(ct.phoneNo),
      mobile_no: clean(ct.mobileNo),
      email: clean(ct.email),
      website_url: clean(ct.websiteURL),
      // Management
      management_structure_id: intOrNull(mg.managementStructure && mg.managementStructure.managementStructureID),
      management_structure_ar: clean(mg.managementStructure && mg.managementStructure.managementStructureDescriptionAr),
      management_structure_en: clean(mg.managementStructure && mg.managementStructure.managementStructureDescriptionEn),
      last_synced_at: NOW(),
      raw_cr_data: it,
    };
  };

  const mapManagers = (it, fid) => {
    const list = (it.mangmentInformation && it.mangmentInformation.managerList) || [];
    return list.map(m => {
      const pi = m.personInfo || {};
      const it_ = pi.identifierType || {};
      const nt = pi.nationality || {};
      const mt = m.managerType || {};
      return {
        facility_id: fid,
        is_licensed: !!m.isLicensed,
        manager_type_id: intOrNull(mt.managerTypeID),
        manager_type_ar: clean(mt.managerTypeDescriptionAr),
        manager_type_en: clean(mt.managerTypeDescriptionEn),
        identifier_type_id: intOrNull(it_.identifierTypeID),
        identifier_type_ar: clean(it_.identifierTypeDescAr),
        identifier_type_en: clean(it_.identifierTypeDescEn),
        identifier_no: pi.identifierNo || null,
        title_ar: clean(pi.titleAr),
        title_en: clean(pi.titleEn),
        first_name_ar: clean(pi.firstNameAr),
        first_name_en: clean(pi.firstNameEn),
        father_name_ar: clean(pi.fatherNameAr),
        father_name_en: clean(pi.fatherNameEn),
        grand_father_name_ar: clean(pi.grandFatherNameAr),
        grand_father_name_en: clean(pi.grandFatherNameEn),
        family_name_ar: clean(pi.familyNameAr),
        family_name_en: clean(pi.familyNameEn),
        nationality_id: intOrNull(nt.nationalityID),
        nationality_ar: clean(nt.nationalityDescriptionAr),
        nationality_en: clean(nt.nationalityDescriptionEn),
        manager_positions: m.managerPositionList || null,
      };
    });
  };

  // Polymorphic partner — read whichever entity slot is filled. The DB enforces
  // a CHECK constraint on partner_kind with a fixed snake_case vocabulary, so
  // we map from the API's camelCase keys to the DB-accepted values.
  const ENTITY_KIND_MAP = {
    governmentalEntity: 'governmental_entity',
    endowment: 'endowment',
    civilAssociation: 'civil_association',
    saudiCompany: 'saudi_company',
    establishment: 'establishment',
    gccCompany: 'gcc_company',
    foreignCompany: 'foreign_company',
    pressInstitution: 'press_institution',
    specialPurposeEntity: 'special_purpose_entity',
    cooperativeSociety: 'cooperative_society',
    institute: 'institute',
    gccGovernmentalEntity: 'gcc_governmental_entity',
    country: 'country',
    foreignGovernmentalEntity: 'foreign_governmental_entity',
    organization: 'organization',
  };
  const ENTITY_KEYS = Object.keys(ENTITY_KIND_MAP);
  const pickEntity = (p) => {
    for (const k of ENTITY_KEYS) {
      const v = p[k];
      if (v && typeof v === 'object') {
        const idType = v.identifierType || {};
        return {
          kind: ENTITY_KIND_MAP[k],
          name_ar: clean(v.nameAr || v.entityFullNameAr || v.entityNameAr),
          name_en: clean(v.nameEn || v.entityFullNameEn || v.entityNameEn),
          identifier_type_id: intOrNull(idType.identifierTypeID),
          identifier_type_ar: clean(idType.identifierTypeDescAr),
          identifier_type_en: clean(idType.identifierTypeDescEn),
          cr_national_number: v.crNationalNumber || null,
          cr_number: v.crNumber || null,
        };
      }
    }
    return null;
  };

  const mapPartners = (it, fid) => {
    const list = it.parityList || [];
    return list.map(p => {
      const pi = p.personInfo || null;
      const piId = (pi && pi.identifierType) || {};
      const piNt = (pi && pi.nationality) || {};
      const pt = p.parityType || {};
      const sh = p.partnerShare || {};
      const ent = pickEntity(p);
      return {
        facility_id: fid,
        parity_type_id: intOrNull(pt.parityTypeID),
        parity_type_ar: clean(pt.parityTypeDescriptionAr),
        parity_type_en: clean(pt.parityTypeDescriptionEn),
        partnership_types: p.partnershipTypeList || null,
        partner_kind: ent ? ent.kind : (pi ? 'person' : 'unknown'),
        // Person side (only when partner is an individual)
        person_identifier_type_id: pi ? intOrNull(piId.identifierTypeID) : null,
        person_identifier_type_ar: pi ? clean(piId.identifierTypeDescAr) : null,
        person_identifier_type_en: pi ? clean(piId.identifierTypeDescEn) : null,
        person_identifier_no: pi ? (pi.identifierNo || null) : null,
        person_first_name_ar: pi ? clean(pi.firstNameAr) : null,
        person_first_name_en: pi ? clean(pi.firstNameEn) : null,
        person_father_name_ar: pi ? clean(pi.fatherNameAr) : null,
        person_father_name_en: pi ? clean(pi.fatherNameEn) : null,
        person_grand_father_name_ar: pi ? clean(pi.grandFatherNameAr) : null,
        person_grand_father_name_en: pi ? clean(pi.grandFatherNameEn) : null,
        person_family_name_ar: pi ? clean(pi.familyNameAr) : null,
        person_family_name_en: pi ? clean(pi.familyNameEn) : null,
        person_nationality_id: pi ? intOrNull(piNt.nationalityID) : null,
        person_nationality_ar: pi ? clean(piNt.nationalityDescriptionAr) : null,
        person_nationality_en: pi ? clean(piNt.nationalityDescriptionEn) : null,
        // Entity side (when partner is a company, govt, etc.)
        entity_identifier_type_id: ent ? ent.identifier_type_id : null,
        entity_identifier_type_ar: ent ? ent.identifier_type_ar : null,
        entity_identifier_type_en: ent ? ent.identifier_type_en : null,
        entity_cr_national_number: ent ? ent.cr_national_number : null,
        entity_cr_number: ent ? ent.cr_number : null,
        entity_name_ar: ent ? ent.name_ar : null,
        entity_name_en: ent ? ent.name_en : null,
        cash_contribution_count: numOrNull(sh.cashContributionCount),
        inkind_contribution_count: numOrNull(sh.inkindContributionCount),
        total_contribution_count: numOrNull(sh.totalContributionCount),
        raw_data: p,
      };
    });
  };

  const mapActivities = (it, fid) => {
    const list = (it.crActivities && it.crActivities.activityList) || [];
    return list.map(a => ({
      facility_id: fid,
      activity_id: a.activityID || null,
      activity_description_ar: clean(a.activityDescriptionAr),
      activity_description_en: clean(a.activityDescriptionEn),
      is_pre_license_issued: !!a.isPreLicenseIssued,
      is_post_license_issued: !!a.isPostLicenseIssued,
    }));
  };

  const mapProcedures = (it, fid) => {
    const list = (it.crInformation && it.crInformation.procedures) || [];
    return list.map(p => ({
      facility_id: fid,
      service_catalog_id: p.serviceCatalogId || null,
      name_ar: clean(p.nameAr),
      name_en: clean(p.nameEn),
      quick_action: !!p.quickAction,
    }));
  };

  const mapLicenses = (it, fid) => {
    const list = (it.crInformation && it.crInformation.licenses) || [];
    return list.map(p => ({
      facility_id: fid,
      service_catalog_id: p.serviceCatalogId || null,
      name_ar: clean(p.nameAr),
      name_en: clean(p.nameEn),
      quick_action: !!p.quickAction,
    }));
  };

  const chunk = (arr, n) => { const out=[]; for (let i=0;i<arr.length;i+=n) out.push(arr.slice(i,i+n)); return out; };

  // mapLimit: like Promise.all but caps concurrency. Used to avoid hammering
  // the SBC gateway with 200+ parallel calls when fetching per-facility data.
  const mapLimit = async (items, limit, fn) => {
    const out = new Array(items.length);
    let idx = 0;
    const workers = Array.from({ length: limit }, async () => {
      while (true) {
        const i = idx++;
        if (i >= items.length) return;
        try { out[i] = await fn(items[i], i); } catch (e) { out[i] = null; }
      }
    });
    await Promise.all(workers);
    return out;
  };

  // ── HRSD (labor office) → sbc_facilities columns ──
  // Always returns the same shape (all keys present, null where unknown) so
  // PostgREST bulk upsert can validate that every row in a chunk has the same
  // keys — otherwise it errors with PGRST102 "All object keys must match".
  const HRSD_EMPTY = {
    hrsd_labor_office_id: null,
    hrsd_sequence_number: null,
    hrsd_labor_office_name: null,
    hrsd_nitaq_code: null,
    hrsd_nitaq_name: null,
    hrsd_nitaqat_activity_code: null,
    hrsd_nitaqat_activity_name: null,
    hrsd_saudi_laborers: null,
    hrsd_foreign_laborers: null,
    hrsd_total_laborers: null,
    hrsd_total_issued_permits: null,
    hrsd_total_expired_permits: null,
    hrsd_total_expiring_permits: null,
    hrsd_saudi_percentage: null,
    hrsd_unified_number_office: null,
    hrsd_unified_number_sequence: null,
    hrsd_synced_at: null,
    hrsd_raw: null,
  };
  const mapHrsd = (h) => {
    if (!h || typeof h !== 'object') return null;
    const eFile = h.establishmentFileNumber || {};
    const uFile = h.unifiedNumber || {};
    const nq = h.nitaq || {};
    const ne = h.nitaqatEconomicActivity || {};
    return {
      hrsd_labor_office_id: intOrNull(eFile.laborOfficeIdField),
      hrsd_sequence_number: eFile.sequenceNumberField != null ? String(eFile.sequenceNumberField) : null,
      hrsd_labor_office_name: clean(h.laboerOfficeName),
      hrsd_nitaq_code: clean(nq.code),
      hrsd_nitaq_name: clean(nq.nameLocal),
      hrsd_nitaqat_activity_code: clean(ne.code),
      hrsd_nitaqat_activity_name: clean(ne.nameLocal),
      hrsd_saudi_laborers: intOrNull(h.saudiLaborers),
      hrsd_foreign_laborers: intOrNull(h.foreignLaborers),
      hrsd_total_laborers: intOrNull(h.totalLaborers),
      hrsd_total_issued_permits: intOrNull(h.totalIssuedWorkPermits),
      hrsd_total_expired_permits: intOrNull(h.totalExpiredWorkPermits),
      hrsd_total_expiring_permits: intOrNull(h.totalAboutToExpireWorkPermits),
      hrsd_saudi_percentage: numOrNull(h.entity_Saudi_Percentage),
      hrsd_unified_number_office: intOrNull(uFile.laborOfficeIdField),
      hrsd_unified_number_sequence: uFile.sequenceNumberField != null ? String(uFile.sequenceNumberField) : null,
      hrsd_synced_at: NOW(),
      hrsd_raw: h,
    };
  };

  // ── GOSI main info → sbc_facilities columns ──
  const GOSI_EMPTY = {
    gosi_registration_number: null,
    gosi_number_of_contributors: null,
    gosi_number_of_saudi_contributors: null,
    gosi_number_of_non_saudi_contributors: null,
    gosi_number_of_registration_numbers: null,
    gosi_total_contribution: null,
    gosi_total_debit: null,
    gosi_total_penalties: null,
    raw_gosi_main: null,
  };
  const mapGosi = (g) => {
    if (!g || typeof g !== 'object') return null;
    const first = (g.establishmentList && g.establishmentList[0]) || {};
    return {
      gosi_registration_number: first.registrationNumber || null,
      gosi_number_of_contributors: numOrNull(g.numberOfContributors),
      gosi_number_of_saudi_contributors: numOrNull(g.numberOfSaudiContributors),
      gosi_number_of_non_saudi_contributors: numOrNull(g.numberOfNonSaudiContributors),
      gosi_number_of_registration_numbers: numOrNull(g.numberOfRegistrationNumbers),
      gosi_total_contribution: numOrNull(g.totalContribution),
      gosi_total_debit: numOrNull(g.totalDebit),
      gosi_total_penalties: numOrNull(g.totalPenalties),
      raw_gosi_main: g,
    };
  };

  // ─────────────────────────────────────────────
  let runId = null;
  try {
    if (!location.hostname.includes('saudibusiness') && !location.hostname.endsWith('business.sa'))
      return msg('افتح بوابة تيسير أولاً (e2.business.sa)');

    const raw = localStorage.getItem('oidc.user:https://www.saudibusiness.gov.sa:InvestorPortal');
    if (!raw) return msg('لم يتم تسجيل الدخول بنفاذ. سجّل الدخول ثم اضغط هذا الإشارة مرة أخرى.');
    const o = JSON.parse(raw);
    if (!o.access_token) return msg('الجلسة غير صالحة. أعد تسجيل الدخول.');

    msg('جارٍ التقاط الجلسات...');
    try { await visit('/commercial-records'); } catch (_) {}
    await new Promise(r => setTimeout(r, 1500));
    try { await visit('/requests'); } catch (_) {}
    await new Promise(r => setTimeout(r, 1500));
    if (!captured['ipapi-nl']) {
      for (let i = 0; i < 30 && !captured['ipapi-nl']; i++) await new Promise(r => setTimeout(r, 200));
    }
    if (!captured['ipapi-nl']) return msg('تعذّر التقاط الجلسة. افتح صفحة «سجلاتي» ثم جرّب مرة أخرى.');

    msg('إنشاء سجل مزامنة...');
    const runRes = await supaFetch('/rest/v1/sync_runs?select=id', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ source_id: SOURCE, person_id: PERSON, status: 'running' }),
    });
    const runArr = await runRes.json();
    runId = Array.isArray(runArr) ? (runArr[0] && runArr[0].id) : runArr.id;
    if (!runId) return msg('❌ فشل إنشاء سجل المزامنة');

    const okJson = async (r) => (r && r.ok) ? await r.json().catch(() => null) : null;
    const failRun = async (reason) => {
      await supaFetch('/rest/v1/sync_runs?id=eq.' + runId, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'failed', error_message: String(reason).slice(0, 400), completed_at: NOW() }),
      });
    };

    // ─────────── Step 1: MoC violations ───────────
    msg('جلب مخالفات وزارة التجارة...');
    const [finRes, comRes] = await Promise.all([
      fetch(IP + '/mcV2/GetViolationsQuery?pageNumber=1&pageSize=1000', { headers: headersFor('ipapi-nl', { noContentType: true }) }).catch(() => null),
      fetch(IP + '/mcV2/GetCaseViolationsQuery?pageNumber=1&pageSize=1000', { headers: headersFor('ipapi-nl', { noContentType: true }) }).catch(() => null),
    ]);
    const fin = await okJson(finRes);
    const com = await okJson(comRes);

    const dashRow = {
      person_id: PERSON,
      sync_run_id: runId,
      mc_financial_violations_count: (fin && fin.totalViolationCount) != null ? fin.totalViolationCount : null,
      mc_financial_violations_raw: fin,
      mc_committee_violations_count: (com && com.totalViolationCount) != null ? com.totalViolationCount : null,
      mc_committee_violations_raw: com,
      mc_violations_synced_at: NOW(),
      last_synced_at: NOW(),
    };
    const up1 = await supaFetch('/rest/v1/sbc_dashboard_stats?on_conflict=person_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(dashRow),
    });
    if (!up1.ok) {
      const txt = await up1.text().catch(() => '');
      await failRun('upsert dashboard ' + up1.status + ': ' + txt.slice(0, 120));
      return msg('❌ upsert dashboard ' + up1.status);
    }

    // ─────────── Step 2: CR list ───────────
    msg('جلب السجلات التجارية...');
    // Important: this is a POST with a JSON body — Content-Type must be set
    // explicitly because the captured headers (from GET requests) don't include
    // it, and without it the SBC gateway rejects the request.
    let crErr = null;
    const crRes = await fetch(IP + '/mcV2/get-crs-by-personal-identifier-number', {
      method: 'POST',
      headers: { ...headersFor('ipapi-nl'), 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ pageNumber: 1, pageSize: 1000 }),
    }).catch(e => { crErr = (e && e.message) ? e.message : String(e); return null; });
    if (!crRes || !crRes.ok) {
      const reason = crRes ? ('status ' + crRes.status) : ('network: ' + (crErr || 'unknown'));
      let body = '';
      if (crRes) try { body = (await crRes.text()).slice(0, 80); } catch (_) {}
      await failRun('CR list ' + reason + (body ? ' — ' + body : ''));
      return msg('❌ CR list ' + reason + (body ? ' — ' + body : ''));
    }
    const crData = await crRes.json().catch(() => ({}));
    const items = (crData && crData.items) || [];
    msg('استلمنا ' + items.length + ' سجل، جاري الحفظ...');

    // Filter out items without a CR national number (defensive)
    const validItems = items.filter(it => it && it.crInformation && it.crInformation.crNationalNumber);
    const facilities = validItems.map(mapFacility);

    // Upsert facilities in chunks; collect IDs back via return=representation
    const idByCrNational = {};
    for (const part of chunk(facilities, 50)) {
      const upF = await supaFetch('/rest/v1/sbc_facilities?on_conflict=cr_national_number', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(part),
      });
      if (!upF.ok) {
        const txt = await upF.text().catch(() => '');
        await failRun('upsert facilities ' + upF.status + ': ' + txt.slice(0, 120));
        return msg('❌ upsert منشآت ' + upF.status);
      }
      const rows = await upF.json().catch(() => []);
      for (const r of rows) if (r.cr_national_number) idByCrNational[r.cr_national_number] = r.id;
    }

    msg('بناء بيانات المدراء والشركاء...');
    const allManagers = [], allPartners = [], allActivities = [], allProcedures = [], allLicenses = [];
    const allFacilityIds = [];
    for (const it of validItems) {
      const fid = idByCrNational[it.crInformation.crNationalNumber];
      if (!fid) continue;
      allFacilityIds.push(fid);
      for (const r of mapManagers(it, fid)) allManagers.push(r);
      for (const r of mapPartners(it, fid)) allPartners.push(r);
      for (const r of mapActivities(it, fid)) allActivities.push(r);
      for (const r of mapProcedures(it, fid)) allProcedures.push(r);
      for (const r of mapLicenses(it, fid)) allLicenses.push(r);
    }

    // Replace child rows (delete-then-insert per child table).
    // PostgREST 'in.(...)' filter supports comma-separated UUIDs.
    const replaceChildren = async (table, rows) => {
      if (allFacilityIds.length === 0) return true;
      // Delete in chunks of 200 IDs to avoid super-long URLs
      for (const idChunk of chunk(allFacilityIds, 200)) {
        const inList = '(' + idChunk.join(',') + ')';
        const del = await supaFetch('/rest/v1/' + table + '?facility_id=in.' + inList, {
          method: 'DELETE',
          headers: { Prefer: 'return=minimal' },
        });
        if (!del.ok) {
          const txt = await del.text().catch(() => '');
          await failRun('delete ' + table + ' ' + del.status + ': ' + txt.slice(0, 100));
          msg('❌ حذف ' + table + ' ' + del.status);
          return false;
        }
      }
      if (rows.length === 0) return true;
      for (const part of chunk(rows, 100)) {
        const ins = await supaFetch('/rest/v1/' + table, {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify(part),
        });
        if (!ins.ok) {
          const txt = await ins.text().catch(() => '');
          await failRun('insert ' + table + ' ' + ins.status + ': ' + txt.slice(0, 300));
          msg('❌ ' + table + ' ' + ins.status + ' — ' + txt.slice(0, 180));
          return false;
        }
      }
      return true;
    };

    msg('حفظ المدراء...');
    if (!await replaceChildren('sbc_facility_managers', allManagers)) return;
    msg('حفظ الشركاء...');
    if (!await replaceChildren('sbc_facility_partners', allPartners)) return;
    msg('حفظ الأنشطة...');
    if (!await replaceChildren('sbc_facility_activities', allActivities)) return;
    msg('حفظ الإجراءات...');
    if (!await replaceChildren('sbc_facility_procedures', allProcedures)) return;
    msg('حفظ الرخص...');
    if (!await replaceChildren('sbc_facility_licenses', allLicenses)) return;

    // ─────────── Step 3: per-facility HRSD + GOSI ───────────
    // Two endpoints per facility (~432 calls for 216 facilities), capped at 5 concurrent.
    msg('جلب بيانات العمل والتأمينات...');
    let enrichDone = 0;
    const enriched = await mapLimit(validItems, 5, async (it) => {
      enrichDone++;
      if (enrichDone % 10 === 0 || enrichDone === validItems.length) {
        msg('عمل/تأمينات ' + enrichDone + '/' + validItems.length);
      }
      const enc = it.crInformation && it.crInformation.encryptedCrNationalNumber;
      if (!enc) return null;
      const encEnc = encodeURIComponent(enc);
      const [hRes, gRes] = await Promise.all([
        fetch(IP + '/hrsd/get-establishment-statistics/' + encEnc, { headers: headersFor('ipapi-nl', { noContentType: true }) }).catch(() => null),
        fetch(IP + '/gosi/establishments-main-info-by-cr-national-number/' + encEnc, { headers: headersFor('ipapi-nl', { noContentType: true }) }).catch(() => null),
      ]);
      const h = (hRes && hRes.ok) ? await hRes.json().catch(() => null) : null;
      const g = (gRes && gRes.ok) ? await gRes.json().catch(() => null) : null;
      return { cr: it.crInformation.crNationalNumber, hrsd: h, gosi: g };
    });

    msg('دمج بيانات العمل والتأمينات...');
    const patchRows = [];
    for (const e of enriched) {
      if (!e || !e.cr) continue;
      const fid = idByCrNational[e.cr];
      if (!fid) continue;
      const hMap = mapHrsd(e.hrsd);
      const gMap = mapGosi(e.gosi);
      // Only emit a row if we actually got data — otherwise skip the upsert
      if (!hMap && !gMap) continue;
      // Build with all HRSD/GOSI keys present (nulls where missing) so every
      // row in the bulk upsert has matching keys — PostgREST requirement.
      const row = {
        cr_national_number: e.cr,
        person_id: PERSON || null,
        sync_run_id: runId,
        last_synced_at: NOW(),
        ...HRSD_EMPTY,
        ...GOSI_EMPTY,
      };
      if (hMap) Object.assign(row, hMap);
      if (gMap) Object.assign(row, gMap);
      patchRows.push(row);
    }
    if (patchRows.length) {
      for (const part of chunk(patchRows, 50)) {
        const upE = await supaFetch('/rest/v1/sbc_facilities?on_conflict=cr_national_number', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(part),
        });
        if (!upE.ok) {
          const txt = await upE.text().catch(() => '');
          await failRun('upsert hrsd/gosi ' + upE.status + ': ' + txt.slice(0, 300));
          return msg('❌ hrsd/gosi ' + upE.status + ' — ' + txt.slice(0, 200));
        }
      }
    }

    await supaFetch('/rest/v1/sync_runs?id=eq.' + runId, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'success', completed_at: NOW(), records_fetched: validItems.length }),
    });

    const finN = dashRow.mc_financial_violations_count || 0;
    const comN = dashRow.mc_committee_violations_count || 0;
    msg('✅ ' + validItems.length + ' منشأة (عمل/تأمين: ' + patchRows.length + ') · مخالفات: قوائم ' + finN + ' لجان ' + comN);
    setTimeout(() => { const el = document.getElementById('_jisr_sync_ui'); if (el) el.remove(); }, 12000);
  } catch (e) {
    if (runId) {
      try { await supaFetch('/rest/v1/sync_runs?id=eq.' + runId, { method: 'PATCH', body: JSON.stringify({ status: 'failed', error_message: String(e).slice(0, 400), completed_at: NOW() }) }); } catch (_) {}
    }
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

export function buildBookmarklet({ sourceId, personId }) {
  return 'javascript:' + encodeURIComponent(minify(body({ sourceId, personId })))
}

export const SBC_SYNC_BOOKMARKLET = buildBookmarklet({ sourceId: 'sbc', personId: '' })
