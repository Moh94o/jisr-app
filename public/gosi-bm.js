/* eslint-disable */
// Jisr GOSI sync bookmarklet body — loaded dynamically by a tiny loader saved
// in the user's bookmarks bar. The loader injects <script src=this-file>.
// Source of truth lives here; the loader stays unchanged forever.
//
// Version is shown in the on-screen toast so we can tell at a glance which
// build is running ("جسر · تأمينات [v5]").
;(async () => {
  const VERSION = 'v17';
  const U = 'https://gcvshzutdslmdkwqwteh.supabase.co';
  const K = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdnNoenV0ZHNsbWRrd3F3dGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTkwNjgsImV4cCI6MjA5MDQ3NTA2OH0.5R0I5VvB7lp3wpSrtay3DMcXKsT9l1uK0Ukd1F4_ImM';
  const API = 'https://api.gosi.gov.sa';
  const PERSON = window._jr_person_id || '';
  const FALLBACK_APIKEY = 'SXeyWwv5xp2ooRqAn6eFfIikZifz8h9Z';

  const msg = (m) => {
    let d = document.getElementById('_jisr_gosi_ui');
    if (!d) {
      d = document.createElement('div');
      d.id = '_jisr_gosi_ui';
      d.style.cssText = 'position:fixed;top:16px;left:16px;background:#111;color:#22c55e;padding:12px 18px;border-radius:10px;z-index:2147483647;font:700 13px/1.5 sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.5);max-width:380px;direction:rtl;text-align:right;border:1px solid rgba(34,197,94,.4)';
      document.body.appendChild(d);
    }
    d.textContent = 'جسر · تأمينات [' + VERSION + ']: ' + m;
    return d;
  };

  const supaFetch = (path, opts) => fetch(U + path, {
    ...(opts || {}),
    headers: { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json', ...((opts && opts.headers) || {}) },
  });

  let captured = null;
  const recordHeaders = (h) => {
    const auth = h['authorization'];
    const ak = h['x-apikey'];
    if (auth) captured = { auth, apikey: ak || (captured && captured.apikey) || FALLBACK_APIKEY };
    else if (ak && captured) captured.apikey = ak;
  };

  // fetch hook
  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    try {
      const u = typeof input === 'string' ? input : (input && input.url);
      if (u && u.indexOf('api.gosi.gov.sa') !== -1) {
        const src = (init && init.headers) || (input instanceof Request ? input.headers : null);
        const h = {};
        if (src instanceof Headers) src.forEach((v, k) => { h[k.toLowerCase()] = v; });
        else if (src && typeof src === 'object') for (const k of Object.keys(src)) h[k.toLowerCase()] = src[k];
        recordHeaders(h);
      }
    } catch (_) {}
    return origFetch.apply(this, arguments);
  };

  // XHR hook — catches Axios and older portal code paths.
  const origXhrOpen = XMLHttpRequest.prototype.open;
  const origXhrSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.open = function (method, url) {
    try { this._jr_url = url; this._jr_headers = {}; } catch (_) {}
    return origXhrOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
    try {
      if (this._jr_url && String(this._jr_url).indexOf('api.gosi.gov.sa') !== -1) {
        this._jr_headers[String(name).toLowerCase()] = value;
        recordHeaders(this._jr_headers);
      }
    } catch (_) {}
    return origXhrSetHeader.apply(this, arguments);
  };

  // Storage/cookie scan helpers.
  const pad64 = (s) => s + '='.repeat((4 - s.length % 4) % 4);
  const decodeJwt = (jwt) => {
    try {
      const parts = jwt.split('.');
      if (parts.length < 2) return null;
      return JSON.parse(atob(pad64(parts[1].replace(/-/g, '+').replace(/_/g, '/'))));
    } catch (_) { return null; }
  };
  const JWT_RE = /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
  const findGosiJwt = (haystack) => {
    if (haystack == null) return null;
    if (typeof haystack !== 'string') {
      try { haystack = JSON.stringify(haystack); } catch (_) { return null; }
    }
    const matches = haystack.match(JWT_RE);
    if (!matches) return null;
    for (const m of matches) {
      const claims = decodeJwt(m);
      if (claims && (claims.iss || '').indexOf('gosi') !== -1) return m;
    }
    return null;
  };
  const probeStorage = () => {
    const stores = [];
    try { stores.push(sessionStorage); } catch (_) {}
    try { stores.push(localStorage); } catch (_) {}
    for (const s of stores) {
      try {
        for (let i = 0; i < s.length; i++) {
          const v = s.getItem(s.key(i));
          const jwt = findGosiJwt(v);
          if (jwt) return 'Bearer ' + jwt;
        }
      } catch (_) {}
    }
    try {
      const jwt = findGosiJwt(document.cookie);
      if (jwt) return 'Bearer ' + jwt;
    } catch (_) {}
    return null;
  };

  try {
    if (!location.hostname.endsWith('gosi.gov.sa'))
      return msg('افتح بوابة التأمينات أولاً (ameen.gosi.gov.sa)');

    const stored = probeStorage();
    if (stored) captured = { auth: stored, apikey: FALLBACK_APIKEY };

    if (!captured) {
      msg('جاهز للالتقاط. افتح أي قائمة من اليمين (الفواتير / الموظفين)...');
      // Wait up to 5 minutes. Re-probe storage every 5s.
      for (let i = 0; i < 1500 && !captured; i++) {
        await new Promise(r => setTimeout(r, 200));
        if (i > 0 && i % 25 === 0) {
          const late = probeStorage();
          if (late) { captured = { auth: late, apikey: FALLBACK_APIKEY }; break; }
        }
      }
    }

    if (!captured || !captured.auth) {
      return msg('انتهى الوقت بدون التقاط. اضغط البوكماركليت مجدداً، ثم خلال الانتظار افتح "الفواتير" أو "الموظفين" من القائمة.');
    }

    // Decode JWT and extract gosiscp[].e
    const parts = captured.auth.replace(/^Bearer\s+/i, '').split('.');
    if (parts.length < 2) return msg('التوكن غير صالح.');
    let claims = null;
    try { claims = JSON.parse(atob(pad64(parts[1].replace(/-/g, '+').replace(/_/g, '/')))); }
    catch (_) { return msg('فشل فك التوكن.'); }
    let scp = [];
    try { scp = typeof claims.gosiscp === 'string' ? JSON.parse(claims.gosiscp) : (claims.gosiscp || []); }
    catch (_) { scp = []; }
    const regNos = Array.from(new Set((scp || []).map(x => x && x.e).filter(Boolean)));
    if (!regNos.length) return msg('لا توجد منشآت في التوكن.');

    msg('جلب بيانات ' + regNos.length + ' منشأة من التأمينات...');

    const CONC = 4;
    let ok = 0, fail = 0;
    // Contributor-save outcome counters. The batch insert used to swallow all
    // errors (.catch(()=>{})), which hid a PGRST102 failure that silently
    // dropped every contributor for mixed-status establishments. Track and
    // surface these so a save failure is never invisible again.
    let contribRowsOk = 0, contribRowsFail = 0;
    let idx = 0;
    const headers = { Authorization: captured.auth, Accept: 'application/json, text/plain, */*' };
    if (captured.apikey) headers['X-Apikey'] = captured.apikey;

    const pickDate = (d) => {
      if (!d || typeof d !== 'object') return null;
      const g = d.gregorian;
      return g ? String(g).slice(0, 10) : null;
    };
    const trimAr = (s) => (s == null ? null : String(s).trim() || null);
    const asStr = (v) => (v == null ? null : String(v));
    const num = (v) => (v == null || v === '') ? null : (typeof v === 'number' ? v : (isNaN(Number(v)) ? null : Number(v)));

    const callApi = async (path, endpoint, extraReq, extraHeaders) => {
      const t0 = Date.now();
      let res = null, payload = null, rawText = '', netErr = null;
      try {
        res = await fetch(API + path, { headers: extraHeaders ? { ...headers, ...extraHeaders } : headers });
        rawText = await res.text().catch(() => '');
        try { payload = rawText ? JSON.parse(rawText) : null; } catch (_) { payload = { _parseError: true, raw: rawText.slice(0, 2000) }; }
      } catch (e) { netErr = (e && e.message) ? e.message : String(e); }
      supaFetch('/rest/v1/gosi_sync_debug', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          sync_person_id: PERSON || null,
          endpoint,
          request_method: 'GET',
          request_body: Object.assign({ registrationNo: extraReq && extraReq._reg }, extraReq || {}),
          response_status: res ? res.status : 0,
          response_body: payload,
          notes: netErr ? ('network: ' + netErr) : ('elapsed_ms=' + (Date.now() - t0)),
        }),
      }).catch(() => {});
      return { res, payload, netErr };
    };
    const okPayload = (r) => r && r.res && r.res.ok && r.payload && !r.payload._parseError;

    const worker = async () => {
      while (true) {
        const i = idx++;
        if (i >= regNos.length) return;
        const reg = String(regNos[i]);
        const nowIso = new Date().toISOString();
        const row = { registration_no: reg, sync_person_id: PERSON || null, synced_at: nowIso };
        let hadAny = false;

        // (a) Profile
        const r1 = await callApi('/v1/establishment/' + encodeURIComponent(reg) + '/profile?onlyActiveEst=true', 'v1/establishment/profile', { _reg: reg, onlyActiveEst: true });
        if (okPayload(r1)) {
          const p = r1.payload;
          const name = p.name || {}, status = p.status || {}, city = p.city || {}, estType = p.establishmentType || {};
          const legal = p.legalEntity || {}, nat = p.nationalityCode || {}, startD = p.startDate || {};
          Object.assign(row, {
            registration_no: asStr(p.registrationNo) || reg,
            name_ar: name.arabic || null,
            name_en: name.english || null,
            recruitment_no: asStr(p.recruitmentNo),
            main_est_reg_no: asStr(p.mainEstablishmentRegNo),
            status_ar: status.arabic || null,
            status_en: status.english || null,
            start_date: pickDate(startD),
            start_date_hijri: startD.hijiri || null,
            city_ar: trimAr(city.arabic),
            city_en: city.english || null,
            establishment_type_ar: estType.arabic || null,
            establishment_type_en: estType.english || null,
            no_of_branches: typeof p.noOfBranches === 'number' ? p.noOfBranches : null,
            closing_date: pickDate(p.closingDate),
            legal_entity_ar: legal.arabic || null,
            legal_entity_en: legal.english || null,
            nationality_code_ar: trimAr(nat.arabic),
            nationality_code_en: nat.english || null,
            gcc_establishment: typeof p.gccEstablishment === 'boolean' ? p.gccEstablishment : null,
            raw_profile: p,
            profile_synced_at: nowIso,
          });
          hadAny = true;
        }

        // (b) Main info
        const r2 = await callApi('/v1/establishment/' + encodeURIComponent(reg) + '?includeMainInfo=true', 'v1/establishment/main', { _reg: reg, includeMainInfo: true });
        if (okPayload(r2)) {
          const p = r2.payload;
          const crn = p.crn || {}, crStatus = p.crStatus || {};
          const act = p.activityType || {}, fo = p.fieldOfficeName || {};
          const mfs = p.molFileStatus || {}, lt = p.lawType || {};
          const cls = p.classification || {}, cd = p.contactDetails || {};
          const addr = (cd.addresses && cd.addresses[0]) || {};
          const addrCity = addr.city || {}, cityDistrict = addr.cityDistrict || {};
          const mol = p.molEstablishmentIds || {};
          const actMatch = act.arabic && String(act.arabic).match(/\((\d+)\)/);
          Object.assign(row, {
            cr_number: crn.number != null ? String(crn.number) : (row.cr_number || null),
            cr_issue_date: pickDate(crn.issueDate),
            cr_issue_date_hijri: (crn.issueDate || {}).hijiri || null,
            cr_expiry_date: pickDate(crn.expiryDate),
            cr_expiry_date_hijri: (crn.expiryDate || {}).hijiri || null,
            cr_mci_verified: typeof crn.mciVerified === 'boolean' ? crn.mciVerified : null,
            cr_status_ar: crStatus.arabic || null,
            cr_status_en: crStatus.english || null,
            primary_activity_code: actMatch ? actMatch[1] : null,
            primary_activity_ar: act.arabic || null,
            primary_activity_en: act.english || null,
            unified_national_number: asStr(p.unifiedNationalNumber),
            mol_establishment_id: asStr(mol.molEstablishmentId),
            mol_office_id: asStr(mol.molOfficeId),
            mol_un_id: asStr(mol.molunId),
            field_office_ar: fo.arabic || null,
            field_office_en: fo.english || null,
            gosi_registration_date: (p.gosiRegistrationDate && p.gosiRegistrationDate.gregorian) || null,
            mol_file_status_ar: mfs.arabic || null,
            mol_file_status_en: mfs.english || null,
            law_type_ar: lt.arabic || null,
            law_type_en: lt.english || null,
            classification_sector: cls.sector || null,
            classification_size: cls.size || null,
            classification_code: cls.code || null,
            proactive: typeof p.proactive === 'boolean' ? p.proactive : null,
            proactive_status: typeof p.proactiveStatus === 'number' ? p.proactiveStatus : null,
            certificate_status: typeof p.certificateStatus === 'boolean' ? p.certificateStatus : null,
            current_oh_rate: typeof p.currentOHRate === 'number' ? p.currentOHRate : null,
            email_primary: (cd.emailId || {}).primary || null,
            mobile_primary: (cd.mobileNo || {}).primary || null,
            address_city_ar: addrCity.arabic || null,
            address_city_en: addrCity.english || null,
            address_building_no: addr.buildingNo || null,
            address_postal_code: addr.postalCode || null,
            address_district_ar: cityDistrict.arabic || null,
            address_additional_no: addr.additionalNo || null,
            address_unit_no: addr.unitNo || null,
            annuity_start_date: pickDate(p.annuityStartDate),
            oh_start_date: pickDate(p.ohStartDate),
            ui_start_date: pickDate(p.uiStartDate),
            allowed_extended_insurance: typeof p.allowedForExtendedInsurance === 'boolean' ? p.allowedForExtendedInsurance : null,
            ppa_establishment: typeof p.ppaEstablishment === 'boolean' ? p.ppaEstablishment : null,
            sports_club: typeof p.sportsClub === 'boolean' ? p.sportsClub : null,
            admin_registered: typeof p.adminRegistered === 'boolean' ? p.adminRegistered : null,
            registration_completed: typeof p.registrationCompleted === 'boolean' ? p.registrationCompleted : null,
            gcc_country: typeof p.gccCountry === 'boolean' ? p.gccCountry : null,
            mci_verified_date: pickDate(p.mciVerifiedDate),
            close_date: pickDate(p.closeDate),
            raw_main: p,
            raw_main_synced_at: nowIso,
          });
          hadAny = true;
        }

        // (c) Violation count
        const r3 = await callApi('/v1/establishment/' + encodeURIComponent(reg) + '/violation-count', 'v1/establishment/violation-count', { _reg: reg });
        if (okPayload(r3)) {
          const v = r3.payload;
          Object.assign(row, {
            violations_paid: typeof v.paidCount === 'number' ? v.paidCount : null,
            violations_unpaid: typeof v.unPaidCount === 'number' ? v.unPaidCount : null,
            violations_exempt: typeof v.donotImposePenaltyCount === 'number' ? v.donotImposePenaltyCount : null,
            violations_total: typeof v.total === 'number' ? v.total : null,
            violations_synced_at: nowIso,
          });
          hadAny = true;
        }

        // (c2) Unpaid violation details + amounts. GOSI route (captured from
        // the Ameen violations page): /unpaid-violation, needs the
        // "View Historical Data For Violations" service name. Response shape is
        // stored raw so the UI can read amounts/types without a re-sync. One
        // page of 100 covers realistic counts (max seen is single digits).
        const rViol = await callApi(
          '/v1/establishment/' + encodeURIComponent(reg) + '/unpaid-violation?pageNo=0&pageSize=100&sortOrder=DESC',
          'v1/establishment/unpaid-violation',
          { _reg: reg },
          { 'X-Service-Name': 'View Historical Data For Violations' },
        );
        if (okPayload(rViol)) {
          const vpayload = rViol.payload;
          // For each violation, fetch its full detail (/violation/{id}) which
          // carries the offending contributor's name + national id + the
          // engagement reason. This endpoint does NOT need X-Service-Name.
          const vlist = Array.isArray(vpayload && vpayload.violationSummaryDtoList) ? vpayload.violationSummaryDtoList : [];
          const details = [];
          for (const vsum of vlist) {
            if (!vsum || vsum.violationId == null) continue;
            const rDet = await callApi('/v1/establishment/' + encodeURIComponent(reg) + '/violation/' + encodeURIComponent(vsum.violationId), 'v1/establishment/violation-detail', { _reg: reg, violationId: vsum.violationId });
            if (okPayload(rDet)) details.push(rDet.payload);
          }
          Object.assign(row, { unpaid_violations: vpayload, violation_details: details.length ? details : null, unpaid_violations_synced_at: nowIso });
          hadAny = true;
        }

        if (hadAny) {
          const save = await supaFetch('/rest/v1/gosi_establishments?on_conflict=registration_no', {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify(row),
          }).catch(() => null);
          if (save && save.ok) ok++; else fail++;
        } else {
          fail++;
        }

        // (d) Owners
        const r4 = await callApi('/v1/establishment/' + encodeURIComponent(reg) + '/owner?includeEstablishments=true', 'v1/establishment/owner', { _reg: reg, includeEstablishments: true });
        if (okPayload(r4) && Array.isArray(r4.payload.owners) && r4.payload.owners.length) {
          const rows = r4.payload.owners.map((o) => {
            const person = o.person || {};
            const id0 = (person.identity && person.identity[0]) || {};
            const nameA = ((person.name || {}).arabic) || {};
            const nameE = ((person.name || {}).english) || {};
            return {
              registration_no: reg,
              owner_id: asStr(o.ownerId),
              person_id: asStr(person.personId),
              national_id: asStr(id0.newNin),
              national_id_old: id0.oldNin || null,
              national_id_issue_date: pickDate(id0.oldNinDateOfIssue),
              national_id_issue_date_hijri: (id0.oldNinDateOfIssue || {}).hijiri || null,
              first_name_ar: nameA.firstName || null,
              second_name_ar: nameA.secondName || null,
              third_name_ar: nameA.thirdName || null,
              family_name_ar: nameA.familyName || null,
              full_name_en: nameE.name || null,
              nationality_ar: trimAr((person.nationality || {}).arabic),
              nationality_en: (person.nationality || {}).english || null,
              sex_ar: (person.sex || {}).arabic || null,
              sex_en: (person.sex || {}).english || null,
              birth_date: pickDate(person.birthDate),
              birth_date_hijri: (person.birthDate || {}).hijiri || null,
              start_date: pickDate(o.startDate),
              end_date: pickDate(o.endDate),
              partnership_type: o.partnershipType || null,
              partner_type: o.partnerType || null,
              individual: typeof o.individual === 'boolean' ? o.individual : null,
              raw: o,
              synced_at: nowIso,
            };
          });
          await supaFetch('/rest/v1/gosi_establishment_owners?on_conflict=registration_no,owner_id', {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify(rows),
          }).catch(() => {});
        }

        // (e) Admins
        const r5 = await callApi('/v1/establishment/' + encodeURIComponent(reg) + '/admin', 'v1/establishment/admin', { _reg: reg });
        if (okPayload(r5) && Array.isArray(r5.payload.admins) && r5.payload.admins.length) {
          const rows = r5.payload.admins.map((a) => {
            const id0 = (a.identity && a.identity[0]) || {};
            const nameA = ((a.name || {}).arabic) || {};
            const nameE = ((a.name || {}).english) || {};
            const estName = (a.establishmentName || {}).arabic || null;
            return {
              registration_no: reg,
              person_id: asStr(a.personId),
              national_id: asStr(id0.newNin),
              national_id_old: id0.oldNin || null,
              national_id_issue_date: pickDate(id0.oldNinDateOfIssue),
              national_id_issue_date_hijri: (id0.oldNinDateOfIssue || {}).hijiri || null,
              first_name_ar: nameA.firstName || null,
              second_name_ar: nameA.secondName || null,
              third_name_ar: nameA.thirdName || null,
              family_name_ar: nameA.familyName || null,
              full_name_en: nameE.name || null,
              nationality_ar: trimAr((a.nationality || {}).arabic),
              nationality_en: (a.nationality || {}).english || null,
              sex_ar: (a.sex || {}).arabic || null,
              sex_en: (a.sex || {}).english || null,
              birth_date: pickDate(a.birthDate),
              birth_date_hijri: (a.birthDate || {}).hijiri || null,
              roles: Array.isArray(a.roles) ? a.roles : null,
              reference_no: a.referenceNo || null,
              social_insurance_number: a.socialInsuranceNumber || null,
              retain_admin: typeof a.retainAdmin === 'boolean' ? a.retainAdmin : null,
              establishment_name_ar: estName,
              raw: a,
              synced_at: nowIso,
            };
          });
          await supaFetch('/rest/v1/gosi_establishment_admins?on_conflict=registration_no,person_id', {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify(rows),
          }).catch(() => {});
        }

        // (f) Contributors — three calls per establishment, then merge.
        const PAGE = 100;
        const fetchPaged = async (path, label, extraHeaders) => {
          const all = [];
          let lastMeta = null;
          for (let p = 0; p < 100; p++) {
            const sep = path.indexOf('?') === -1 ? '?' : '&';
            const r = await callApi(path + sep + 'pageNo=' + p + '&pageSize=' + PAGE, label, { _reg: reg, pageNo: p }, extraHeaders);
            if (!okPayload(r) || !Array.isArray(r.payload.contributors)) break;
            all.push(...r.payload.contributors);
            lastMeta = r.payload;
            const total = typeof r.payload.numberOfContributors === 'number' ? r.payload.numberOfContributors : all.length;
            if (all.length >= total || r.payload.contributors.length < PAGE) break;
          }
          return { contributors: all, meta: lastMeta };
        };

        // Fetch order (per user spec):
        //   1. ALL         — broad sweep, gives total + nationality aggregates
        //   2. ACTIVE      — paginated list (and provides the active count meta)
        //   3. INACTIVE    — paginated list
        //   4. SUSPENDED   — paginated list
        //   5. wages       — ACTIVE only, paginated, includeWageInfo=true
        // The four list fetches are merged + deduped by socialInsuranceNo so we
        // store one row per contributor regardless of which status surfaced it.
        // GOSI's gateway rejects every /contributor call (504) unless this
        // service-name header is present — the Ameen portal sends it on all
        // contributor requests. Captured from the real portal flow.
        const CONTRIB_HDR = { 'X-Service-Name': 'Display Contributors Data' };
        const SORT = 'sortBy=LATEST_ENGAGEMENT_WITH_CONTRIBUTOR_NAME&sortOrder=ASC';
        // queryForCount=false on ALL/ACTIVE: GOSI returns count-ONLY (empty
        // contributors[]) when queryForCount=true, so active contributors —
        // and therefore all wage data — were never saved. queryForCount=false
        // returns both the rows AND the count meta we need for aggregates.
        const fAll = await fetchPaged('/v1/establishment/' + encodeURIComponent(reg) + '/contributor/fetch?includeWageInfo=false&queryForCount=false&status=ALL&' + SORT, 'v1/establishment/contributor/fetch-all', CONTRIB_HDR);
        const fActive = await fetchPaged('/v1/establishment/' + encodeURIComponent(reg) + '/contributor/fetch?includeWageInfo=false&queryForCount=false&status=ACTIVE&' + SORT, 'v1/establishment/contributor/fetch-active', CONTRIB_HDR);
        const fInactive = await fetchPaged('/v1/establishment/' + encodeURIComponent(reg) + '/contributor/fetch?includeWageInfo=false&queryForCount=false&status=INACTIVE&' + SORT, 'v1/establishment/contributor/fetch-inactive', CONTRIB_HDR);
        const fSus = await fetchPaged('/v1/establishment/' + encodeURIComponent(reg) + '/contributor/fetch?includeWageInfo=false&queryForCount=false&status=SUSPENDED&' + SORT, 'v1/establishment/contributor/fetch-suspended', CONTRIB_HDR);
        // Wage fetch. The unified call (no status filter) is preferred because
        // GOSI returns wageDetails for ALL contributors in one paginated sweep.
        // But for SUSPENDED establishments it returns HTTP 500 — so we retry
        // per-status and merge whatever we get. Each fallback is best-effort:
        // if any individual status call still fails, the others' rows survive.
        let f3 = await fetchPaged('/v1/establishment/' + encodeURIComponent(reg) + '/contributor?includeWageInfo=true', 'v1/establishment/contributor-wage', CONTRIB_HDR);
        if (!f3 || !f3.contributors || !f3.contributors.length) {
          const merged = [];
          for (const st of ['ACTIVE', 'SUSPENDED', 'INACTIVE']) {
            const r = await fetchPaged('/v1/establishment/' + encodeURIComponent(reg) + '/contributor?includeWageInfo=true&status=' + st, 'v1/establishment/contributor-wage-' + st.toLowerCase(), CONTRIB_HDR);
            if (r && Array.isArray(r.contributors)) merged.push(...r.contributors);
          }
          if (merged.length) f3 = { contributors: merged, meta: null };
        }

        const seen = new Set();
        const mergedContributors = [];
        for (const c of [...(fAll.contributors || []), ...(fActive.contributors || []), ...(fInactive.contributors || []), ...(fSus.contributors || [])]) {
          const key = c && c.socialInsuranceNo != null ? String(c.socialInsuranceNo)
            : (c && c.person && c.person.personId != null ? 'pid:' + String(c.person.personId) : null);
          if (!key || seen.has(key)) continue;
          seen.add(key);
          mergedContributors.push(c);
        }
        const f1 = { contributors: mergedContributors, meta: fAll.meta };

        const wageMap = {};
        for (const w of f3.contributors) {
          if (w && w.socialInsuranceNo != null) wageMap[String(w.socialInsuranceNo)] = w;
        }

        if (f1.contributors.length) {
          const rows = f1.contributors.map((c) => {
            const p = c.person || {};
            const ids = Array.isArray(p.identity) ? p.identity : [];
            const idIqama = ids.find(x => x && x.idType === 'IQAMA') || {};
            const idBorder = ids.find(x => x && x.idType === 'BORDERNO') || {};
            const idPass = ids.find(x => x && x.idType === 'PASSPORT') || {};
            // NIN (Saudi national ID) is only present for Saudi contributors; mirrors owners/admins.
            const idNin = ids.find(x => x && x.idType === 'NIN') || {};
            const nameA = ((p.name || {}).arabic) || {};
            const nameE = ((p.name || {}).english) || {};
            const cd = p.contactDetail || {};
            const addr = (cd.addresses && cd.addresses[0]) || {};
            const sinKey = c.socialInsuranceNo != null ? String(c.socialInsuranceNo) : null;
            const w = sinKey ? wageMap[sinKey] : null;
            const wd = (w && w.wageDetails) || null;
            const wage = wd ? (wd.wage || {}) : {};
            const occ = c.occupation || (wd && wd.occupation) || {};
            return {
              registration_no: reg,
              social_insurance_no: sinKey,
              person_id: asStr(p.personId),
              engagement_id: w && w.engagementId != null ? String(w.engagementId) : null,
              status_type: c.statusType || null,
              contributor_type: c.contributorType || null,
              approval_status: c.approvalStatus || null,
              nationality_ar: trimAr((p.nationality || {}).arabic),
              nationality_en: (p.nationality || {}).english || null,
              iqama_no: asStr(idIqama.iqamaNo),
              iqama_expiry_date: pickDate(idIqama.expiryDate),
              border_no: asStr(idBorder.id),
              passport_no: idPass.passportNo || null,
              passport_issue_date: pickDate(idPass.issueDate),
              national_id: asStr(idNin.newNin),
              first_name_ar: nameA.firstName || null,
              second_name_ar: nameA.secondName || null,
              third_name_ar: nameA.thirdName || null,
              family_name_ar: nameA.familyName || null,
              full_name_en: nameE.name || null,
              sex_ar: (p.sex || {}).arabic || null,
              sex_en: (p.sex || {}).english || null,
              birth_date: pickDate(p.birthDate),
              birth_date_hijri: (p.birthDate || {}).hijiri || null,
              age_in_hijri: typeof p.ageInHijiri === 'number' ? p.ageInHijiri : null,
              marital_status_ar: (p.maritalStatus || {}).arabic || null,
              marital_status_en: (p.maritalStatus || {}).english || null,
              person_type: p.personType || null,
              occupation_ar: occ.arabic || null,
              occupation_en: occ.english || null,
              joining_date: pickDate(w && w.joiningDate),
              joining_date_hijri: ((w && w.joiningDate) || {}).hijiri || null,
              latest_joining_date: pickDate(c.latestJoiningdatewithEst),
              latest_period_update: pickDate(c.latestPeriodUpdateWithEst),
              suspended_date: pickDate(c.suspendedDate),
              suspended_terminated_date: pickDate(c.suspendedTerminatedDate),
              latest_live_engagement_id: asStr(c.latestLiveEngagementIdInEstablishment),
              wage_basic: typeof wage.basicWage === 'number' ? wage.basicWage : null,
              wage_housing: typeof wage.housingBenefit === 'number' ? wage.housingBenefit : null,
              wage_commission: typeof wage.commission === 'number' ? wage.commission : null,
              wage_other_allowance: typeof wage.otherAllowance === 'number' ? wage.otherAllowance : null,
              // GOSI returns totalWage=0 on the basic contributor fetch when
              // wage data isn't loaded — treat 0 from the basic call as "unknown"
              // (null) so the UI doesn't render a misleading "0.00 SAR" chip.
              // A real wage of 0 from wageDetails is kept as 0 (status-filtered).
              wage_total: typeof wage.totalWage === 'number' ? wage.totalWage : (typeof c.totalWage === 'number' && c.totalWage > 0 ? c.totalWage : null),
              wage_contributory: typeof wage.contributoryWage === 'number' ? wage.contributoryWage : null,
              wage_status: typeof wage.status === 'number' ? wage.status : null,
              wage_type: typeof wage.wageType === 'number' ? wage.wageType : null,
              wage_start_date: pickDate(wd && wd.startDate),
              wage_last_updated: ((wd && wd.lastUpdatedDate) || {}).gregorian || null,
              has_live_engagement: typeof c.hasLiveEngagement === 'boolean' ? c.hasLiveEngagement : null,
              has_live_engagement_in_establishment: typeof c.hasLiveEngagementInEstablishment === 'boolean' ? c.hasLiveEngagementInEstablishment : null,
              has_active_workflow: typeof c.hasActiveWorkFlow === 'boolean' ? c.hasActiveWorkFlow : null,
              has_vic_engagement: typeof c.hasVICEngagement === 'boolean' ? c.hasVICEngagement : null,
              has_non_vic_engagement: typeof c.hasNonVICEngagement === 'boolean' ? c.hasNonVICEngagement : null,
              is_beneficiary: typeof c.isBeneficiary === 'boolean' ? c.isBeneficiary : null,
              is_pr_eligible: typeof c.isPrEligible === 'boolean' ? c.isPrEligible : null,
              is_privatized: typeof c.isPrivatized === 'boolean' ? c.isPrivatized : null,
              prisoner: typeof p.prisoner === 'boolean' ? p.prisoner : null,
              student: typeof p.student === 'boolean' ? p.student : null,
              govt_emp: typeof p.govtEmp === 'boolean' ? p.govtEmp : null,
              proactive: wd && typeof (w && w.proactive) === 'boolean' ? w.proactive : null,
              reactivation_status_ar: (c.reactivationStatus || {}).arabic || null,
              reactivation_status_en: (c.reactivationStatus || {}).english || null,
              reactivation_eligible_ar: (c.reactivationEligible || {}).arabic || null,
              reactivation_eligible_en: (c.reactivationEligible || {}).english || null,
              absher_verification_status: p.absherVerificationStatus || null,
              street_name: addr.streetName || null,
              raw: c,
              raw_wage: w || null,
              synced_at: nowIso,
              // Engagement dates are enriched below for non-active rows only.
              // They MUST be present (as null) on every row here: PostgREST
              // bulk insert rejects the whole batch with PGRST102 "All object
              // keys must match" if rows have differing key sets. Omitting
              // these and adding them conditionally meant any establishment
              // mixing live-active + inactive/suspended contributors failed to
              // save ALL its contributors silently.
              engagement_start_date: null,
              engagement_start_date_hijri: null,
              engagement_end_date: null,
              engagement_end_date_hijri: null,
            };
          });
          // (f2) Engagement dates for non-active contributors. GOSI only returns
          // joiningDate via the wage call (active only), so inactive/suspended
          // rows lack join/termination dates. Fetch them per contributor from
          // the engagement endpoint (scoped to this establishment). Stored raw +
          // parsed start/end so the UI can show تاريخ الالتحاق / تاريخ الفصل.
          for (const row of rows) {
            const st = String(row.status_type || '').toUpperCase();
            if (st === 'ACTIVE' && row.has_live_engagement_in_establishment === true) continue;
            if (!row.social_insurance_no) continue;
            const rEng = await callApi(
              '/v1/establishment/' + encodeURIComponent(reg) + '/contributor/' + encodeURIComponent(row.social_insurance_no) + '/engagement?searchType=ACTIVE_AND_TERMINATED&includeFutureEngagement=true',
              'v1/establishment/contributor-engagement',
              { _reg: reg, socialInsuranceNo: row.social_insurance_no },
              { 'X-Service-Name': 'Display Contributors Data' },
            );
            if (!okPayload(rEng)) continue;
            const ep = rEng.payload;
            // Do NOT store the full response (~11KB each — it bloats the batch
            // insert and silently breaks it). Extract only join/termination.
            const engList = Array.isArray(ep) ? ep : (ep && ep.engagements) || [];
            // Pick the latest engagement (by joiningDate) = the most recent stint.
            let best = null;
            for (const en of engList) {
              const jg = en && en.joiningDate && en.joiningDate.gregorian;
              if (jg && (!best || jg > best._jg)) best = { en, _jg: jg };
            }
            const en = best && best.en;
            if (en) {
              row.engagement_start_date = pickDate(en.joiningDate);
              row.engagement_start_date_hijri = (en.joiningDate || {}).hijiri || null;
              // Termination = latest endDate across the engagement's periods.
              let endG = null, endH = null;
              for (const pr of (Array.isArray(en.engagementPeriod) ? en.engagementPeriod : [])) {
                const ed = pr && pr.endDate;
                if (ed && ed.gregorian && (!endG || ed.gregorian > endG)) { endG = ed.gregorian; endH = ed.hijiri || null; }
              }
              row.engagement_end_date = endG ? String(endG).slice(0, 10) : null;
              row.engagement_end_date_hijri = endH;
            }
          }
          for (let s = 0; s < rows.length; s += 100) {
            const batch = rows.slice(s, s + 100);
            const saveRes = await supaFetch('/rest/v1/gosi_establishment_contributors?on_conflict=registration_no,social_insurance_no', {
              method: 'POST',
              headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
              body: JSON.stringify(batch),
            }).catch(() => null);
            if (saveRes && saveRes.ok) {
              contribRowsOk += batch.length;
            } else {
              contribRowsFail += batch.length;
              // Surface the failure into gosi_sync_debug instead of swallowing
              // it, so a broken save is diagnosable from the data alone.
              const errTxt = saveRes ? await saveRes.text().catch(() => '') : 'network error';
              supaFetch('/rest/v1/gosi_sync_debug', {
                method: 'POST',
                headers: { Prefer: 'return=minimal' },
                body: JSON.stringify({
                  sync_person_id: PERSON || null,
                  endpoint: 'save/gosi_establishment_contributors',
                  request_method: 'POST',
                  request_body: { _reg: reg, rowCount: batch.length },
                  response_status: saveRes ? saveRes.status : 0,
                  response_body: { error: errTxt.slice(0, 2000) },
                  notes: 'contributor save failed · cr=' + reg,
                }),
              }).catch(() => {});
            }
          }
        }

        // Aggregates: f1.meta (status=ALL) drives nationality + grand totals;
        // fActive.meta drives the active count. FUTURE is no longer fetched
        // separately per user spec — that column stays null going forward.
        const meta = f1.meta || {};
        const activeMeta = fActive.meta || {};
        if (meta.numberOfContributors != null || activeMeta.numberOfContributors != null) {
          await supaFetch('/rest/v1/gosi_establishments?on_conflict=registration_no', {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify({
              registration_no: reg,
              contributors_active_count: typeof activeMeta.numberOfContributors === 'number' ? activeMeta.numberOfContributors : null,
              contributors_saudi_count: typeof meta.numberOfSaudiContributors === 'number' ? meta.numberOfSaudiContributors : null,
              contributors_non_saudi_count: typeof meta.numberOfNonSaudiContributors === 'number' ? meta.numberOfNonSaudiContributors : null,
              contributors_reactivation_eligible_count: typeof meta.numberOfReactivationEligibleContributors === 'number' ? meta.numberOfReactivationEligibleContributors : null,
              contributors_retiring_soon_count: typeof meta.numberOfRetiringSoonCount === 'number' ? meta.numberOfRetiringSoonCount : null,
              contributors_synced_at: nowIso,
              synced_at: nowIso,
            }),
          }).catch(() => {});
        }

        // (g) Bills + account
        const startDate = nowIso.slice(0, 7) + '-01';

        const rAcc = await callApi('/v1/establishment/' + encodeURIComponent(reg) + '/account', 'v1/establishment/account', { _reg: reg });
        const rBill = await callApi('/v1/establishment/' + encodeURIComponent(reg) + '/bill?includeBreakUp=false&startDate=' + startDate + '&pageLoad=true', 'v1/establishment/bill', { _reg: reg, startDate });

        const acctPatch = { registration_no: reg, synced_at: nowIso };
        let acctTouched = false;
        if (okPayload(rAcc)) {
          const a = rAcc.payload, db = a.debitBreakUp || {};
          Object.assign(acctPatch, {
            account_number: a.accountNumber == null ? null : String(a.accountNumber),
            account_total_credit_balance: num(a.totalCreditBalance),
            account_retained_balance: num(a.retainedBalance),
            account_transferable_balance: num(a.transferableBalance),
            account_total_debit_balance: num(a.totalDebitBalance),
            account_eligible_for_refund: typeof a.eligibleForRefund === 'boolean' ? a.eligibleForRefund : null,
            account_last_payment_date: pickDate(a.lastPaymentDate),
            account_last_payment_amount: num(a.lastPaymentAmount),
            account_debit_total_contribution: num(db.totalContribution),
            account_debit_total_penalty: num(db.totalPenalty),
            account_synced_at: nowIso,
          });
          acctTouched = true;
        }

        let billsList = [];
        if (okPayload(rBill)) {
          const b = rBill.payload;
          billsList = Array.isArray(b.bills) ? b.bills : [];
          Object.assign(acctPatch, {
            outstanding_amount: num(b.outstandingAmount),
            bill_payment_status_ar: (b.billPaymentStatus || {}).arabic || null,
            bill_payment_status_en: (b.billPaymentStatus || {}).english || null,
            months_since_last_paid: typeof b.noOfMonthsSinceLastPaid === 'number' ? b.noOfMonthsSinceLastPaid : null,
            debt_start_date: pickDate(b.debtStartDate),
            first_bill_issue_date: pickDate(b.firstBillIssueDate),
            last_bill_issue_date: pickDate(b.lastBillIssueDate),
            bills_synced_at: nowIso,
          });
          acctTouched = true;
        }

        if (acctTouched) {
          await supaFetch('/rest/v1/gosi_establishments?on_conflict=registration_no', {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify(acctPatch),
          }).catch(() => {});
        }

        const billRows = [];
        for (const bill of billsList) {
          if (!bill || bill.billNumber == null) continue;
          const billNum = String(bill.billNumber);
          const rSum = await callApi('/v1/establishment/' + encodeURIComponent(reg) + '/bill/' + encodeURIComponent(billNum) + '/bill-summary?startDate=' + startDate + '&entityType=ESTABLISHMENT', 'v1/establishment/bill-summary', { _reg: reg, billNumber: billNum, startDate });
          const s = okPayload(rSum) ? rSum.payload : null;
          const status = bill.billPaymentStatus || {};
          const issueD = bill.issueDate || (s && s.issueDate) || {};
          const dueD = (s && s.dueDate) || {};
          billRows.push({
            registration_no: reg,
            bill_number: billNum,
            issue_date: pickDate(issueD),
            issue_date_hijri: issueD.hijiri || null,
            due_date: pickDate(dueD),
            due_date_hijri: dueD.hijiri || null,
            bill_period: bill.billPeriod || null,
            bill_start_date: pickDate(s && s.billStartDate),
            bill_start_month: s && s.billStartMonth || null,
            bill_issue_month: s && s.billIssueMonth || null,
            bill_due_month: s && s.billDueMonth || null,
            initial_bill_start_date: pickDate(s && s.initialBillStartDate),
            latest_bill_start_date: pickDate(s && s.latestBillStartDate),
            total_amount: num(bill.totalAmount),
            balance_due: num(s && s.balanceDue),
            paid_amount: num(s && s.paidAmount),
            outstanding_amount: num(bill.outstandingAmount),
            total_due_amount: num(s && s.totalDueAmount),
            previous_bill: num(s && s.previousBill),
            current_bill: num(s && s.currentBill),
            total_contribution: num(s && s.totalContribution),
            total_debit_adjustment: num(s && s.totalDebitAdjustment),
            total_credit_adjustment: num(s && s.totalCreditAdjustment),
            total_receipts_and_credits: num(s && s.totalReceiptsAndCredits),
            total_late_fee: num(s && s.totalLateFee),
            late_fee: num(s && s.lateFee),
            required_min_payment: num(bill.requiredMinPayment),
            minimum_payment_required: num(s && s.minimumPaymentRequired),
            installment_amount: num(s && s.installmentAmount),
            bill_payment_status_ar: status.arabic || null,
            bill_payment_status_en: status.english || null,
            allocation_ind: typeof bill.allocationInd === 'boolean' ? bill.allocationInd : null,
            dropped_month: typeof bill.droppedMonth === 'boolean' ? bill.droppedMonth : null,
            migrated_bill: typeof bill.migratedBill === 'boolean' ? bill.migratedBill : (s && typeof s.migratedBill === 'boolean' ? s.migratedBill : null),
            violation_ind: typeof bill.violationInd === 'boolean' ? bill.violationInd : null,
            late_fees_ind: typeof bill.lateFeesInd === 'boolean' ? bill.lateFeesInd : null,
            adjustment_ind: typeof bill.adjustmentInd === 'boolean' ? bill.adjustmentInd : null,
            rejected_oh_ind: typeof bill.rejectedOhInd === 'boolean' ? bill.rejectedOhInd : null,
            installment_compliance_ind: typeof bill.installmentComplianceInd === 'boolean' ? bill.installmentComplianceInd : null,
            payment_enable: s && typeof s.paymentEnable === 'boolean' ? s.paymentEnable : null,
            pay_button_flag: s && typeof s.payButtonFlag === 'boolean' ? s.payButtonFlag : null,
            specific_pay_flag: s && typeof s.specificPayFlag === 'boolean' ? s.specificPayFlag : null,
            no_of_establishment: typeof bill.noOfEstablishment === 'number' ? bill.noOfEstablishment : null,
            no_of_saudi: typeof bill.noOfSaudi === 'number' ? bill.noOfSaudi : null,
            no_of_non_saudi: typeof bill.noOfNonSaudi === 'number' ? bill.noOfNonSaudi : null,
            contributor_count: s && typeof s.contributorCount === 'number' ? s.contributorCount : null,
            oh_enable_date: pickDate(s && s.ohEnableDate),
            pension_reform_effective_date: pickDate(s && s.pensionReformEffectiveDate),
            raw: bill,
            raw_summary: s,
            synced_at: nowIso,
            summary_synced_at: s ? nowIso : null,
          });
        }
        if (billRows.length) {
          await supaFetch('/rest/v1/gosi_establishment_bills?on_conflict=registration_no,bill_number', {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify(billRows),
          }).catch(() => {});
        }

        // (h) Certificates — POST /download-certificate with the report id for
        // each of the three certs the user actually opens by hand in Ameen:
        //   17_02_0011 — شهادة الالتزام (compliance), no date range
        //   17_02_0050 — شهادة الزكاة (zakat), 1st→last of current Gregorian month
        //   22_07_0007 — شهادة السلامة (OH), last 3 months window
        // GOSI returns JSON with fileData = base64-encoded PDF. We decode it,
        // upload it to the public `gosi-certificates` bucket under a stable
        // path so re-syncs overwrite, and upsert metadata into
        // gosi_establishment_certificates. POST requests need the same auth
        // headers as GET plus a service name + the right X-Apikey, so we send
        // them via a tiny helper.
        const certHeadersBase = {
          Authorization: captured.auth,
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
        };
        if (captured.apikey) certHeadersBase['X-Apikey'] = captured.apikey;

        const monthStart = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
        const monthEnd   = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
        const todayUtc = new Date(nowIso);
        const curMonStart = monthStart(todayUtc);
        const curMonEnd   = monthEnd(todayUtc);
        const threeMoStart = monthStart(new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth() - 2, 1)));
        const isoFull = (d) => d.toISOString().slice(0, 10) + 'T00:00:00.000Z';

        const certDefs = [
          {
            type: '17_02_0011',
            serviceName: 'Generate Establishment Certificate',
            body: { type: '17_02_0011', isGroupCertificate: false, commPreference: 'ar' },
            from: null, to: null,
          },
          {
            type: '17_02_0050',
            serviceName: 'Generate Zakat Certificate',
            body: {
              uuid: (crypto && crypto.randomUUID) ? crypto.randomUUID() : ('jisr-' + Date.now()),
              type: '17_02_0050',
              isGroupCertificate: false,
              fromDate: { gregorian: isoFull(curMonStart) },
              toDate:   { gregorian: isoFull(curMonEnd) },
              commPreference: 'ar',
            },
            from: curMonStart.toISOString().slice(0, 10),
            to:   curMonEnd.toISOString().slice(0, 10),
          },
          {
            type: '22_07_0007',
            serviceName: 'Generate OH Certificate',
            body: {
              uuid: (crypto && crypto.randomUUID) ? crypto.randomUUID() : ('jisr-' + Date.now()),
              type: '22_07_0007',
              isGroupCertificate: false,
              fromDate: { gregorian: isoFull(threeMoStart) },
              toDate:   { gregorian: isoFull(curMonEnd) },
              commPreference: 'ar',
            },
            from: threeMoStart.toISOString().slice(0, 10),
            to:   curMonEnd.toISOString().slice(0, 10),
          },
        ];

        // Base64 → Uint8Array. atob is fine for binary PDF bytes when we read
        // each char as a byte (GOSI's fileData is already standard base64).
        const b64ToBytes = (b64) => {
          const bin = atob(b64);
          const out = new Uint8Array(bin.length);
          for (let k = 0; k < bin.length; k++) out[k] = bin.charCodeAt(k);
          return out;
        };

        for (const def of certDefs) {
          const t0 = Date.now();
          let res = null, payload = null, rawText = '', netErr = null;
          try {
            res = await fetch(API + '/v1/establishment/' + encodeURIComponent(reg) + '/download-certificate', {
              method: 'POST',
              headers: { ...certHeadersBase, 'X-Service-Name': def.serviceName },
              body: JSON.stringify(def.body),
            });
            rawText = await res.text().catch(() => '');
            try { payload = rawText ? JSON.parse(rawText) : null; } catch (_) { payload = { _parseError: true, raw: rawText.slice(0, 2000) }; }
          } catch (e) { netErr = (e && e.message) ? e.message : String(e); }
          // Always log the call to gosi_sync_debug (same as the other endpoints),
          // but never persist the multi-MB base64 fileData — strip it before
          // saving so the debug table doesn't bloat.
          const debugPayload = payload && payload.fileData ? { ...payload, fileData: '[stripped ' + payload.fileData.length + ' chars]' } : payload;
          supaFetch('/rest/v1/gosi_sync_debug', {
            method: 'POST',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({
              sync_person_id: PERSON || null,
              endpoint: 'v1/establishment/download-certificate/' + def.type,
              request_method: 'POST',
              request_body: { _reg: reg, ...def.body },
              response_status: res ? res.status : 0,
              response_body: debugPayload,
              notes: netErr ? ('network: ' + netErr) : ('elapsed_ms=' + (Date.now() - t0)),
            }),
          }).catch(() => {});

          if (!res || !res.ok || !payload || !payload.fileData) continue;

          const bytes = b64ToBytes(payload.fileData);
          const storagePath = 'gosi/' + reg + '/' + def.type + '.pdf';
          const up = await fetch(U + '/storage/v1/object/' + encodeURIComponent('gosi-certificates') + '/' + storagePath, {
            method: 'POST',
            headers: {
              apikey: K,
              Authorization: 'Bearer ' + K,
              'Content-Type': 'application/pdf',
              // x-upsert lets us overwrite the previous month's file on re-sync.
              'x-upsert': 'true',
            },
            body: bytes,
          }).catch(() => null);
          if (!up || !up.ok) continue;

          await supaFetch('/rest/v1/gosi_establishment_certificates?on_conflict=registration_no,cert_type', {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify({
              registration_no: reg,
              cert_type: def.type,
              certificate_no: payload.certificateNo != null ? String(payload.certificateNo) : null,
              from_date: def.from,
              to_date: def.to,
              storage_path: storagePath,
              pdf_size_bytes: bytes.length,
              raw: { reportId: payload.reportId, regNo: payload.regNo, message: payload.message, certificateNo: payload.certificateNo },
              synced_at: nowIso,
            }),
          }).catch(() => {});
        }

        if (i % 5 === 0) msg('جارٍ... ' + (ok + fail) + '/' + regNos.length + ' (نجاح ' + ok + ')');
      }
    };
    await Promise.all(Array.from({ length: CONC }, worker));

    msg('✅ تمت مزامنة ' + ok + '/' + regNos.length + ' منشأة' + (fail ? ' (فشل ' + fail + ')' : '')
      + ' · مشتركون ' + contribRowsOk + (contribRowsFail ? (' (فشل حفظ ' + contribRowsFail + ')') : ''));
    setTimeout(() => { const el = document.getElementById('_jisr_gosi_ui'); if (el) el.remove(); }, 20000);
  } catch (e) {
    msg('❌ ' + (e && e.message ? e.message : String(e)));
  }
})();
