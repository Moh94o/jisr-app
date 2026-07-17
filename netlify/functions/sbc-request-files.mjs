// sbc-request-files — server-side fetcher for the طلباتي document set:
// السجل التجاري (ar/en) + عقد التأسيس.
//
// Why server-side, and not from the bookmarklet like the تيسير flow does:
//
//  1. The PDFs themselves are never in the API response — crFile returns
//     `encodedFileBase64: null` and the contract returns `content: null`.
//     Both only hand back a short-lived printcr.mc.gov.sa URL, and that host
//     refuses cross-origin browser fetches. So a server hop is unavoidable.
//  2. The bookmarklet can't make that hop itself: it runs on
//     companies.saudibusiness.gov.sa, and Chrome stalls every request from
//     that origin to http://localhost (the same call from e2.business.sa
//     answers instantly — verified, as does curl). So the browser cannot
//     hand the URL to the local proxy at all.
//
// Instead the bookmarklet parks its portal token in sbc_sessions(id='companies')
// and this function does the whole chain server-side, where neither CORS nor
// the localhost block applies:
//
//   crFile/{الرقم الموحد}   (Accept-Language picks ar/en)  ─┐
//   request/contract/{guid}                                ─┴─► printcr URL
//                                                              ─► fetch bytes
//                                                              ─► Storage
//
// Request:  POST { session: {accessToken, tokenType, clientId}, cr, requestId }
// Response: { ok, files: { ar: {...}, en: {...}, contract: {...} } }

const CP_API = 'https://api.saudibusiness.gov.sa/sbc/externalgw/companiesprocessingapi-nl/api/app'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'
const PORTAL = 'https://companies.saudibusiness.gov.sa'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gcvshzutdslmdkwqwteh.supabase.co'
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdnNoenV0ZHNsbWRrd3F3dGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTkwNjgsImV4cCI6MjA5MDQ3NTA2OH0.5R0I5VvB7lp3wpSrtay3DMcXKsT9l1uK0Ukd1F4_ImM'
const STORAGE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Private-Network': 'true',
}

// أرشفة النسخة الحالية للملف قبل استبدالها — حتى يقدر المستخدم يرجع
// لإصدارات الماضي من كرت «سجل التغييرات». نسخة واحدة كحد أقصى في اليوم
// (النسخ لوجهة موجودة يفشل فيتجاهَل). فشل الأرشفة لا يوقف الرفع أبداً.
async function archiveExisting(path, entityKey) {
  try {
    const d = new Date()
    const day = `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`
    const base = path.replace(/\.pdf$/i, '')
    const versionKey = `sbc-cr-certificates/_versions/${base.split('/').pop()}/${day}.pdf`
    const cp = await fetch(`${SUPABASE_URL}/storage/v1/object/copy`, {
      method: 'POST',
      headers: { apikey: STORAGE_KEY, Authorization: `Bearer ${STORAGE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucketId: 'documents', sourceKey: path, destinationKey: versionKey }),
    })
    if (!cp.ok) return
    await fetch(`${SUPABASE_URL}/rest/v1/sync_file_versions`, {
      method: 'POST',
      headers: { apikey: STORAGE_KEY, Authorization: `Bearer ${STORAGE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        bucket: 'documents', object_path: path, version_path: versionKey,
        entity_key: entityKey, source_id: 'sbc', label: path.split('/').pop(),
      }),
    }).catch(() => {})
  } catch { /* best-effort */ }
}

const json = (body, statusCode = 200) => ({
  statusCode,
  headers: { ...cors, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

const apiHeaders = (session, lang) => {
  const h = {
    'User-Agent': UA,
    Accept: 'application/json, text/plain, */*',
    // The crFile endpoint takes no culture param — this header alone decides
    // whether the certificate comes back Arabic or English.
    'Accept-Language': lang === 'en' ? 'en' : 'ar',
    Origin: PORTAL,
    Referer: PORTAL + '/',
    Authorization: `${session.tokenType || 'Bearer'} ${session.accessToken}`,
  }
  if (session.clientId) h.clientId = session.clientId
  return h
}

const withTimeout = async (fn, ms) => {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try { return await fn(ctrl.signal) } finally { clearTimeout(timer) }
}

// Resolve one printcr URL, download it, push it into Storage under the name
// the «ملفات المنشأة» card already looks for.
async function grab(session, { url, lang, cr }) {
  let meta
  try {
    meta = await withTimeout((signal) => fetch(url, { headers: apiHeaders(session, lang), signal }), 30_000)
  } catch (e) {
    return { ok: false, step: 'meta', error: String(e?.message || e) }
  }
  if (!meta.ok) {
    const code = (meta.status === 401 || meta.status === 403) ? 'SESSION_INVALID' : undefined
    // 404 here means the document simply doesn't exist for this facility —
    // a normal state, not a failure worth retrying.
    return { ok: false, step: 'meta', status: meta.status, code, notFound: meta.status === 404 }
  }

  let fileUrl
  try { fileUrl = (await meta.json())?.fileUrl } catch { return { ok: false, step: 'meta', error: 'bad json' } }
  if (!fileUrl) return { ok: false, step: 'meta', error: 'no fileUrl' }

  let bytes
  try {
    const pdf = await withTimeout((signal) => fetch(fileUrl, {
      headers: {
        'User-Agent': UA,
        Accept: 'application/pdf,application/octet-stream,*/*',
        'Accept-Language': 'ar-SA,ar;q=0.9,en;q=0.8',
        Referer: PORTAL + '/',
      },
      signal,
    }), 60_000)
    if (!pdf.ok) return { ok: false, step: 'pdf', status: pdf.status }
    bytes = Buffer.from(await pdf.arrayBuffer())
  } catch (e) {
    return { ok: false, step: 'pdf', error: String(e?.message || e) }
  }

  // A PDF that isn't a PDF means the portal handed us an error page with a
  // 200 — store it and the files card would show a broken document.
  if (bytes.length < 1000 || bytes.subarray(0, 4).toString('latin1') !== '%PDF') {
    return { ok: false, step: 'pdf', error: 'not a pdf', sizeBytes: bytes.length }
  }

  const path = `sbc-cr-certificates/${cr}-${lang}.pdf`
  await archiveExisting(path, cr)
  try {
    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/documents/${encodeURI(path)}`, {
      method: 'POST',
      headers: {
        apikey: STORAGE_KEY,
        Authorization: `Bearer ${STORAGE_KEY}`,
        'Content-Type': 'application/pdf',
        'x-upsert': 'true',
      },
      body: bytes,
    })
    if (!up.ok) {
      const t = await up.text().catch(() => '')
      return { ok: false, step: 'upload', status: up.status, error: t.slice(0, 160) }
    }
  } catch (e) {
    return { ok: false, step: 'upload', error: String(e?.message || e) }
  }

  return { ok: true, path, sizeBytes: bytes.length }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' }
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body
  try { body = JSON.parse(event.body || '{}') }
  catch { return json({ error: 'Invalid JSON' }, 400) }

  const { session, cr, requestId } = body
  if (!session?.accessToken) return json({ error: 'لا توجد جلسة لبوابة الشركات.', code: 'NO_SESSION' }, 401)
  if (!cr) return json({ error: 'missing cr' }, 400)

  const now = Math.floor(Date.now() / 1000)
  if (session.expiresAt && session.expiresAt <= now) {
    return json({ error: 'انتهت صلاحية جلسة بوابة الشركات — اضغط زر المزامنة داخل البوابة مرة أخرى.', code: 'SESSION_EXPIRED' }, 401)
  }

  const files = {}
  for (const lang of ['ar', 'en']) {
    files[lang] = await grab(session, { url: `${CP_API}/smartFlow/crFile/${encodeURIComponent(cr)}`, lang, cr })
  }
  if (requestId) {
    files.contract = await grab(session, { url: `${CP_API}/request/contract/${requestId}`, lang: 'contract', cr })
  }

  const sessionDead = Object.values(files).some(f => f?.code === 'SESSION_INVALID')
  if (sessionDead) return json({ error: 'جلسة بوابة الشركات غير صالحة.', code: 'SESSION_INVALID', files }, 401)

  return json({ ok: Object.values(files).some(f => f?.ok), cr, files })
}
