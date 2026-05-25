// proxy-supabase — generic server-side Supabase REST/Storage proxy.
//
// Muqeem.sa has a strict CSP that blocks browser fetches to supabase.co
// from inside the muqeem tab. This function lets the bookmarklet forward
// Supabase calls through Netlify (same-origin from our SPA, or at least
// a domain Muqeem CSP allows).
//
// Request:  POST { path, method?, headers?, body? }
//   - path:   e.g. "/rest/v1/sync_runs?select=id" (must start with "/")
//   - method: HTTP method, default "POST"
//   - headers: extra headers to forward (e.g. { Prefer: 'return=representation' })
//   - body:   already-serialized string or any JSON-serializable value
//
// Response: { status, headers, body }
//   - status: upstream HTTP status code
//   - body:   response text (caller can JSON.parse if needed)
//
// Uses the anon key by default (so the same RLS policies as the browser
// apply). If SUPABASE_SERVICE_ROLE_KEY is set in Netlify env, that's used
// instead to bypass RLS for trusted server-side writes.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gcvshzutdslmdkwqwteh.supabase.co'
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdnNoenV0ZHNsbWRrd3F3dGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTkwNjgsImV4cCI6MjA5MDQ3NTA2OH0.5R0I5VvB7lp3wpSrtay3DMcXKsT9l1uK0Ukd1F4_ImM'
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const KEY = SUPABASE_SERVICE_ROLE || SUPABASE_ANON

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (obj, statusCode = 200) => ({
  statusCode,
  headers: { ...cors, 'Content-Type': 'application/json' },
  body: JSON.stringify(obj),
})

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' }
  if (event.httpMethod !== 'POST') return json({ error: 'method not allowed' }, 405)

  let req
  try { req = JSON.parse(event.body || '{}') }
  catch { return json({ error: 'invalid json body' }, 400) }

  const { path, method = 'POST', headers = {}, body = null } = req
  if (!path || typeof path !== 'string' || !path.startsWith('/')) {
    return json({ error: 'missing or invalid path (must start with "/")' }, 400)
  }

  // Build the actual request to Supabase. We always include apikey + Bearer
  // because they're required for every endpoint regardless of method.
  const fwdHeaders = {
    apikey: KEY,
    Authorization: 'Bearer ' + KEY,
    'Content-Type': 'application/json',
    ...headers,
  }
  let fwdBody = body
  if (fwdBody != null && typeof fwdBody !== 'string') {
    try { fwdBody = JSON.stringify(fwdBody) }
    catch (e) { return json({ error: 'body could not be serialized: ' + (e?.message || e) }, 400) }
  }

  let upstream
  try {
    upstream = await fetch(SUPABASE_URL + path, {
      method,
      headers: fwdHeaders,
      body: ['GET', 'HEAD'].includes(method.toUpperCase()) ? undefined : fwdBody,
    })
  } catch (e) {
    return json({ error: 'upstream fetch threw: ' + (e?.message || String(e)) }, 502)
  }

  const text = await upstream.text().catch(() => '')
  // Mirror just the response status and text — callers JSON.parse if they
  // need structured data. Avoids edge cases where upstream returns html or
  // an empty body for 204 No Content.
  return {
    statusCode: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: upstream.status, body: text }),
  }
}
