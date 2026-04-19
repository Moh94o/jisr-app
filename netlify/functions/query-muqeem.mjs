const MUQEEM_API = 'https://muqeem.sa/api/enquiry/search-unsponsored-resident'
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

function decodeJwt(bearer) {
  try {
    const token = String(bearer).replace(/^Bearer\s+/i, '')
    const payload = token.split('.')[1]
    const j = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))
    return { exp: j.exp || null, moiNumber: j.moiNumber || j.sub || null }
  } catch { return { exp: null, moiNumber: null } }
}

// Parse a pasted cURL (or raw HTTP request) and extract the session pieces.
function parseCurl(input) {
  const out = { cookies: '', authBearer: '', xsrfToken: '', xDomain: '' }
  // cURL -H form
  const headerRe = /-H\s+(['"])([^'"]+)\1/g
  let m
  while ((m = headerRe.exec(input)) !== null) {
    const line = m[2]
    const i = line.indexOf(':')
    if (i < 0) continue
    const k = line.slice(0, i).trim().toLowerCase()
    const v = line.slice(i + 1).trim()
    if (k === 'cookie') out.cookies = v
    else if (k === 'authorization') out.authBearer = v.replace(/^Bearer\s+/i, '')
    else if (k === 'x-xsrf-token') out.xsrfToken = v
    else if (k === 'x-domain') out.xDomain = v
  }
  // Raw HTTP form (line-based, for users who paste request from DevTools' "Copy as fetch" or raw)
  for (const line of input.split(/\r?\n/)) {
    const i = line.indexOf(':')
    if (i < 0) continue
    const k = line.slice(0, i).trim().toLowerCase()
    const v = line.slice(i + 1).trim()
    if (k === 'cookie' && !out.cookies) out.cookies = v
    else if (k === 'authorization' && !out.authBearer) out.authBearer = v.replace(/^Bearer\s+/i, '')
    else if (k === 'x-xsrf-token' && !out.xsrfToken) out.xsrfToken = v
    else if (k === 'x-domain' && !out.xDomain) out.xDomain = v
  }
  return out
}

function applySetCookies(currentCookies, setCookieHeader) {
  if (!setCookieHeader) return currentCookies
  const list = Array.isArray(setCookieHeader) ? setCookieHeader : setCookieHeader.split(/,(?=\s*[^;=\s]+=)/)
  const map = new Map()
  for (const part of (currentCookies || '').split(/;\s*/)) {
    const eq = part.indexOf('=')
    if (eq > 0) map.set(part.slice(0, eq).trim(), part.slice(eq + 1))
  }
  for (const c of list) {
    const first = c.split(';')[0].trim()
    const eq = first.indexOf('=')
    if (eq > 0) map.set(first.slice(0, eq).trim(), first.slice(eq + 1))
  }
  return Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join('; ')
}

function formatHijri(packed) {
  if (!packed) return null
  const s = String(packed)
  if (s.length !== 8) return s
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' }
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body
  try { body = JSON.parse(event.body || '{}') }
  catch { return json({ error: 'Invalid JSON' }, 400) }

  try {
    if (body.action === 'parse-session') {
      const { curl } = body
      if (!curl || typeof curl !== 'string') return json({ error: 'Missing curl' }, 400)
      const p = parseCurl(curl)
      if (!p.authBearer || !p.cookies) {
        return json({ error: 'لم أتمكن من استخراج Authorization أو Cookie. تأكد من نسخ الطلب كـ cURL كامل.', parsed: p }, 400)
      }
      const { exp, moiNumber } = decodeJwt(p.authBearer)
      return json({
        ok: true,
        session: {
          cookies: p.cookies,
          authBearer: p.authBearer,
          xsrfToken: p.xsrfToken || null,
          xDomain: p.xDomain || null,
          jwtExp: exp,
          moiNumber,
        },
        jwtExpiresIn: exp ? Math.max(0, exp - Math.floor(Date.now() / 1000)) : null,
      })
    }

    if (body.action === 'query') {
      const { iqama, session } = body
      if (!/^[12]\d{9}$/.test(iqama || '')) return json({ error: 'رقم إقامة غير صحيح' }, 400)
      if (!session || !session.authBearer) return json({ error: 'لا توجد جلسة مقيم — الصق الـ cURL أولاً.', code: 'NO_SESSION' }, 401)

      const now = Math.floor(Date.now() / 1000)
      if (session.jwtExp && session.jwtExp <= now) {
        return json({ error: 'انتهت صلاحية جلسة مقيم. أعد لصق الـ cURL.', code: 'SESSION_EXPIRED' }, 401)
      }

      // Muqeem rotates XSRF on every response. The header MUST match the current
      // XSRF-TOKEN cookie value; the saved session.xsrfToken is only a fallback.
      const cookieXsrfMatch = (session.cookies || '').match(/XSRF-TOKEN=([^;]+)/)
      const xsrf = cookieXsrfMatch ? cookieXsrfMatch[1] : session.xsrfToken

      const headers = {
        'User-Agent': UA,
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'ar-ly',
        'Content-Type': 'application/json',
        'Origin': 'https://muqeem.sa',
        'Referer': 'https://muqeem.sa/',
        'Authorization': 'Bearer ' + session.authBearer,
        'Cookie': session.cookies || '',
      }
      if (xsrf) headers['X-Xsrf-Token'] = xsrf
      if (session.xDomain) headers['X-Domain'] = session.xDomain

      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 20_000)
      let res
      try {
        res = await fetch(MUQEEM_API, {
          method: 'POST',
          headers,
          body: JSON.stringify({ iqamaNumber: iqama }),
          signal: ctrl.signal,
        })
      } finally { clearTimeout(timer) }

      const text = await res.text()
      const setCookie = res.headers.raw ? res.headers.raw()['set-cookie'] : res.headers.get('set-cookie')
      const updatedSession = { ...session }
      if (setCookie) {
        updatedSession.cookies = applySetCookies(session.cookies || '', setCookie)
        const xMatch = (Array.isArray(setCookie) ? setCookie.join(',') : setCookie).match(/XSRF-TOKEN=([^;]+)/)
        if (xMatch) updatedSession.xsrfToken = xMatch[1]
      }

      if (!res.ok) {
        const code = (res.status === 401 || res.status === 403) ? 'SESSION_INVALID' : undefined
        return json({
          error: code ? 'منصة مقيم رفضت الطلب — الجلسة غير صالحة.' : `Muqeem HTTP ${res.status}`,
          code, status: res.status, body: text.slice(0, 400),
          updatedSession,
        }, code ? 401 : 502)
      }

      let payload
      try { payload = JSON.parse(text) } catch { payload = null }
      if (!payload || typeof payload !== 'object') {
        return json({ error: 'Unexpected response', body: text.slice(0, 400), updatedSession }, 502)
      }

      return json({
        ok: true,
        result: {
          iqama: String(payload.alienId ?? iqama),
          iqamaExpiryGregorian: payload.iqamaExpiryDateG || null,
          iqamaExpiryHijri: formatHijri(payload.iqamaExpiryDateH),
          iqamaExpired: !!payload.iqamaExpired,
          occupationAr: payload.occupationNameAr || null,
          occupationEn: payload.occupationNameEn || null,
          statusAr: payload.statusAr || null,
          statusEn: payload.statusEn || null,
          sponsorChanges: typeof payload.numberOfSponsorChanges === 'number' ? payload.numberOfSponsorChanges : null,
        },
        updatedSession,
      })
    }

    return json({ error: 'Unknown action. Use parse-session | query.' }, 400)
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500)
  }
}
