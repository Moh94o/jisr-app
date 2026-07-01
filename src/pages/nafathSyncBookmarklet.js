// Nafath identity capture bookmarklet.
//
// Designed to run on https://www.iam.gov.sa/sso/ after the user has signed in
// with their National ID + password. It calls the IAM auth API directly using
// the user's session cookies and pulls:
//
//   POST /auth/trans      → full identity (Arabic/English names, DOB, ID,
//                           nationality, gender, mobile, email, passport,
//                           ID expiry/issue, Nafath username, titles…)
//   POST /auth/authLogs   → recent login history at government services
//                           (Nafath, GOSI, SBC, …) with timestamps
//
// Both endpoints respond with rich JSON that we PATCH straight into the
// operator's `persons` row (nafath_raw + nafath_auth_logs).
//
// Falls back to the previous JWT-from-localStorage approach if the bookmark
// is clicked on another portal (Tayseer, Qiwa…), so existing portal sessions
// still work.

const SUPABASE_URL = 'https://gcvshzutdslmdkwqwteh.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdnNoenV0ZHNsbWRrd3F3dGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTkwNjgsImV4cCI6MjA5MDQ3NTA2OH0.5R0I5VvB7lp3wpSrtay3DMcXKsT9l1uK0Ukd1F4_ImM'

function body({ personId, syncPersonId }) {
  return `
(async () => {
  const U='${SUPABASE_URL}', K='${SUPABASE_ANON}';
  const PERSON='${personId}', SYNC_PERSON='${syncPersonId}';

  const msg = (m, color) => {
    let d = document.getElementById('_jisr_nafath_ui');
    if (!d) {
      d = document.createElement('div'); d.id = '_jisr_nafath_ui';
      d.style.cssText = 'position:fixed;top:16px;left:16px;background:#111;color:#B07D00;padding:14px 20px;border-radius:10px;z-index:2147483647;font:700 13px/1.5 sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.5);max-width:420px;direction:rtl;text-align:right;border:1px solid rgba(176,125,0,.35)';
      document.body.appendChild(d);
    }
    if (color) d.style.color = color;
    d.textContent = 'جسر/نفاذ: ' + m;
    return d;
  };

  const host = location.hostname;

  // ── Path A: Running on iam.gov.sa — call the IAM auth API directly using
  // the user's session cookies. Gives us identity + auth history in one go.
  if (/(^|\\.)iam\\.gov\\.sa$/i.test(host)) {
    msg('قراءة الهوية من بوابة نفاذ...');

    const post = async (path, payload) => {
      const r = await fetch('https://www.iam.gov.sa' + path, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Accept': '*/*' },
        body: JSON.stringify(payload || {}),
      });
      if (!r.ok) throw new Error(path + ' → ' + r.status);
      return r.json();
    };

    let trans, logs;
    try { trans = await post('/auth/trans', { spTransId: '' }); }
    catch (e) { return msg('تعذّر قراءة الهوية: ' + e.message + ' — تأكد أنك مسجّل دخول في نفاذ.', '#ef4444'); }
    try { logs  = await post('/auth/authLogs', {}); }
    catch (e) { logs = null; /* non-fatal */ }

    if (trans.code !== 'ok' || !trans.id) {
      return msg('الجلسة في نفاذ غير صالحة — سجّل دخول من جديد ثم اضغط الإشارة.', '#ef4444');
    }

    // Save via SECURITY DEFINER RPC — direct REST PATCH on persons is blocked
    // by RLS for the anon role, which silently returned 204 without writing.
    const authLogs = (logs && Array.isArray(logs.authLogs)) ? logs.authLogs : [];
    const r = await fetch(U + '/rest/v1/rpc/nafath_capture_identity', {
      method: 'POST',
      headers: { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_person_id: PERSON, p_identity: trans, p_auth_logs: authLogs }),
    });
    const rText = await r.text().catch(() => '');
    let rJson = null; try { rJson = rText ? JSON.parse(rText) : null; } catch (_) {}
    if (!r.ok || !rJson || rJson.ok !== true) {
      const errMsg = rJson?.error || (r.status + (rText ? ' · ' + rText.slice(0,80) : ''));
      return msg('❌ تعذّر الحفظ: ' + errMsg, '#ef4444');
    }

    const fields = ['الاسم','الهوية','الميلاد','الجنس','الجنسية'];
    if (trans.passportNumber) fields.push('جواز السفر');
    if (trans.username)       fields.push('اسم المستخدم');
    if (authLogs.length)      fields.push(authLogs.length + ' سجل دخول');
    msg('✅ تمت مزامنة نفاذ · ' + fields.join(' · '), '#22c55e');
    setTimeout(() => { const d = document.getElementById('_jisr_nafath_ui'); if (d) d.remove(); }, 10000);
    return;
  }

  // ── Path B: Fallback — running on another portal (Tayseer/Qiwa/Muqeem…).
  // Read the freshest OIDC id_token from localStorage and decode its claims.
  const candidates = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith('oidc.user:')) continue;
    try {
      const v = JSON.parse(localStorage.getItem(k));
      if (v && v.id_token) candidates.push({ k, v });
    } catch (_) {}
  }
  if (!candidates.length) return msg('لم يتم العثور على جلسة نفاذ. افتح iam.gov.sa أو بوابة حكومية مسجَّل فيها أولاً.', '#ef4444');

  candidates.sort((a, b) => (b.v.expires_at || 0) - (a.v.expires_at || 0));
  const session = candidates[0];

  let claims = null;
  try {
    const payload = session.v.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
    claims = JSON.parse(decodeURIComponent(escape(atob(padded))));
  } catch (e) { return msg('تعذّر قراءة id_token: ' + (e.message || ''), '#ef4444'); }

  msg('تم استخراج الهوية، جارٍ الحفظ...');

  const pick = (...keys) => { for (const k of keys) if (claims[k] != null && claims[k] !== '') return claims[k]; return null; };
  const nameAr   = pick('FullNameAr', 'fullNameAr', 'name_ar', 'arabicName', 'name');
  const nameEn   = pick('FullNameEn', 'fullNameEn', 'name_en', 'englishName', 'preferred_username');
  const idNumber = pick('NationalId', 'nationalId', 'IdentityNo', 'IdNumber', 'sub', 'personal_id');
  const birthDate = pick('BirthDateGregorian', 'birthdate', 'birth_date', 'DateOfBirth');
  const gender = pick('Gender', 'gender');

  // Same SECURITY DEFINER RPC used by Path A — RLS would silently block the
  // anon role from PATCHing persons directly.
  const r = await fetch(U + '/rest/v1/rpc/nafath_capture_identity', {
    method: 'POST',
    headers: { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_person_id: PERSON, p_identity: claims, p_auth_logs: [] }),
  });
  const rText = await r.text().catch(() => '');
  let rJson = null; try { rJson = rText ? JSON.parse(rText) : null; } catch (_) {}
  if (!r.ok || !rJson || rJson.ok !== true) {
    const errMsg = rJson?.error || (r.status + (rText ? ' · ' + rText.slice(0, 80) : ''));
    return msg('❌ تعذّر الحفظ: ' + errMsg, '#ef4444');
  }

  const fields = [];
  if (nameAr) fields.push('الاسم AR');
  if (nameEn) fields.push('الاسم EN');
  if (idNumber) fields.push('الهوية');
  if (birthDate) fields.push('الميلاد');
  if (gender) fields.push('الجنس');
  msg('✅ تمت مزامنة نفاذ · ' + (fields.length ? fields.join(' · ') : 'تم تحديث الـ raw claims'), '#22c55e');
  setTimeout(() => { const d = document.getElementById('_jisr_nafath_ui'); if (d) d.remove(); }, 10000);
})();`
}

function minify(src) {
  return src
    .replace(/^[ \t]*\/\/.*$/gm, '')
    .replace(/\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function buildNafathBookmarklet({ personId, syncPersonId }) {
  return 'javascript:' + encodeURIComponent(minify(body({ personId: personId || '', syncPersonId: syncPersonId || '' })))
}
