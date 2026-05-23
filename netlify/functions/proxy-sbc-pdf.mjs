// proxy-sbc-pdf — server-side PDF fetcher + Supabase Storage uploader.
//
// The SBC print endpoints return a `downloadUrl` on printcr.mc.gov.sa.
// That host blocks cross-origin browser fetches (CORS) and refused our
// previous Supabase Edge Function attempt (network-level geo-block from
// Supabase's hosting region). Routing through this Netlify function gets
// us a server-side fetch from Netlify's Lambda runtime, with our anon
// session writing to Supabase Storage via the existing RLS policy on
// `documents/sbc-cr-certificates/`.
//
// Request:  POST { downloadUrl: string, bucket: string, path: string }
// Response: { ok: boolean, sizeBytes?: number, contentType?: string, error?: string }

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gcvshzutdslmdkwqwteh.supabase.co'
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdnNoenV0ZHNsbWRrd3F3dGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTkwNjgsImV4cCI6MjA5MDQ3NTA2OH0.5R0I5VvB7lp3wpSrtay3DMcXKsT9l1uK0Ukd1F4_ImM'
// Service role bypasses RLS. Set this in Netlify env vars as SUPABASE_SERVICE_ROLE_KEY.
// Server-side only — never expose to the browser. Falls back to anon key, which
// works only if the target storage path is covered by an anon-insert RLS policy.
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const STORAGE_KEY = SUPABASE_SERVICE_ROLE || SUPABASE_ANON

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body, statusCode = 200) => ({
  statusCode,
  headers: { ...cors, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return json({ error: 'method not allowed' }, 405)
  }

  let body
  try { body = JSON.parse(event.body || '{}') }
  catch { return json({ error: 'invalid json body' }, 400) }

  const { downloadUrl, bucket, path } = body
  if (!downloadUrl || !bucket || !path) {
    return json({ error: 'missing downloadUrl/bucket/path' }, 400)
  }

  // Server-side PDF fetch. We mimic the browser headers the SBC portal uses
  // so the upstream service treats us like a normal click-to-download.
  let pdfBytes, contentType = 'application/pdf'
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 60_000)
    let res
    try {
      res = await fetch(downloadUrl, {
        headers: {
          'User-Agent': UA,
          'Accept': 'application/pdf,application/octet-stream,*/*',
          'Accept-Language': 'ar-SA,ar;q=0.9,en;q=0.8',
          'Referer': 'https://e2.business.sa/',
        },
        signal: ctrl.signal,
      })
    } finally { clearTimeout(timer) }

    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      return json({ error: 'pdf fetch failed', status: res.status, body: txt.slice(0, 200) }, 502)
    }
    contentType = res.headers.get('content-type') || 'application/pdf'
    pdfBytes = Buffer.from(await res.arrayBuffer())
  } catch (e) {
    return json({ error: 'pdf fetch threw: ' + (e?.message || String(e)) }, 502)
  }

  // Upload via Supabase Storage REST API. Uses the service role key when
  // available — that bypasses RLS so we don't depend on the anon-insert
  // policy matching exactly. Force application/pdf as the content type
  // because the upstream sometimes responds with octet-stream / no type,
  // and the documents bucket's allowed_mime_types whitelist would reject
  // anything other than the listed entries.
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURI(path)}`
  let upRes
  try {
    upRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        apikey: STORAGE_KEY,
        Authorization: `Bearer ${STORAGE_KEY}`,
        'Content-Type': 'application/pdf',
        'x-upsert': 'true',
      },
      body: pdfBytes,
    })
  } catch (e) {
    return json({ error: 'storage upload threw: ' + (e?.message || String(e)) }, 500)
  }

  if (!upRes.ok) {
    const txt = await upRes.text().catch(() => '')
    return json({
      error: 'storage upload failed',
      status: upRes.status,
      body: txt.slice(0, 200),
      usingServiceRole: !!SUPABASE_SERVICE_ROLE,
    }, 500)
  }

  return json({
    ok: true,
    sizeBytes: pdfBytes.length,
    contentType,
    path,
    usingServiceRole: !!SUPABASE_SERVICE_ROLE,
  })
}
