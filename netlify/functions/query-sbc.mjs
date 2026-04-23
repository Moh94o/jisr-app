const SBC_API_BASE = 'https://api.saudibusiness.gov.sa/sbc/externalgw/ipapi-nl/api/app'
const SBC_LIST_API = `${SBC_API_BASE}/mcV2/get-crs-by-personal-identifier-number`
const SBC_GOSI_API = `${SBC_API_BASE}/gosi/establishments-main-info-by-cr-national-number/`
const SBC_HRSD_API = `${SBC_API_BASE}/hrsd/get-establishment-statistics/`
const SBC_TOKEN_URL = 'https://www.saudibusiness.gov.sa/connect/token'
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

function decodeJwtMaybe(token) {
  try {
    const parts = String(token).split('.')
    if (parts.length !== 3) return null
    return JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))
  } catch { return null }
}

function parseSessionBlob(input) {
  let obj
  try { obj = typeof input === 'string' ? JSON.parse(input) : input }
  catch { return null }
  if (!obj || typeof obj !== 'object') return null
  const { access_token, refresh_token, id_token, token_type, scope, expires_at, profile } = obj
  if (!access_token) return null
  return {
    accessToken: access_token,
    refreshToken: refresh_token || null,
    idToken: id_token || null,
    tokenType: token_type || 'Bearer',
    scope: scope || null,
    expiresAt: typeof expires_at === 'number' ? expires_at : null,
    personalIdentifier: profile?.national_id || profile?.nationalId || profile?.sub || null,
  }
}

function baseHeaders(session, extra = {}) {
  const h = {
    'User-Agent': UA,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'ar-SA,ar;q=0.9,en;q=0.8',
    'Origin': 'https://e2.business.sa',
    'Referer': 'https://e2.business.sa/',
    'Authorization': `${session.tokenType || 'Bearer'} ${session.accessToken}`,
    ...extra,
  }
  // SBC's gosi/hrsd endpoints 401 without this header (captured from live session).
  if (session.clientId) h['Clientid'] = session.clientId
  return h
}

async function listFacilities(session, { pageNumber = 1, pageSize = 50 } = {}) {
  const params = new URLSearchParams()
  params.set('PageNumber', String(pageNumber))
  params.set('PageSize', String(pageSize))
  const url = `${SBC_LIST_API}?${params.toString()}`

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 30_000)
  let res
  try {
    res = await fetch(url, { headers: baseHeaders(session), signal: ctrl.signal })
  } finally { clearTimeout(timer) }

  const text = await res.text()
  if (!res.ok) {
    const code = (res.status === 401 || res.status === 403) ? 'SESSION_INVALID' : undefined
    return { ok: false, status: res.status, code, error: code ? 'انتهت الجلسة — أعد لصق بيانات OIDC.' : `SBC HTTP ${res.status}`, body: text.slice(0, 500) }
  }
  let payload
  try { payload = JSON.parse(text) } catch { return { ok: false, status: 502, error: 'Unexpected response', body: text.slice(0, 500) } }
  return { ok: true, payload }
}

function slim(item) {
  const c = item?.crInformation || {}
  return {
    crNationalNumber: c.crNationalNumber || null,
    crNumber: c.crNumber || null,
    entityFullNameAr: c.entityFullNameAr || null,
    entityFullNameEn: c.entityFullNameEn || null,
    capital: c.capital ?? null,
    capitalCurrency: c.capitalCurrency || null,
    entityType: c.entityType || null,
    companyForm: c.companyForm || null,
    headquarterCity: c.headquarterCity || null,
    crStatus: c.crStatus || null,
    crIssueDate: c.crIssueDate || null,
    crConfirmDate: c.crConfirmDate || null,
    isMain: !!c.isMain,
    isManager: !!c.isManager,
    isPartner: !!c.isPartner,
    isInConfirmationPeriod: !!c.isInConfirmationPeriod,
    inLiquidationProcess: !!c.inLiquidationProcess,
    hasEcommerce: !!c.hasEcommerce,
    encryptedCrNumber: c.encryptedCrNumber || null,
    encryptedCrNationalNumber: c.encryptedCrNationalNumber || null,
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' }
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body
  try { body = JSON.parse(event.body || '{}') }
  catch { return json({ error: 'Invalid JSON' }, 400) }

  try {
    if (body.action === 'parse-session') {
      const parsed = parseSessionBlob(body.oidc)
      if (!parsed) return json({ error: 'تعذّر قراءة بيانات OIDC. الصق كامل JSON من localStorage.' }, 400)
      const idClaims = decodeJwtMaybe(parsed.idToken) || {}
      return json({
        ok: true,
        session: parsed,
        profile: {
          name: idClaims.given_name || idClaims.name || null,
          nationalId: idClaims.national_id || parsed.personalIdentifier || null,
        },
        expiresIn: parsed.expiresAt ? Math.max(0, parsed.expiresAt - Math.floor(Date.now() / 1000)) : null,
      })
    }

    if (body.action === 'list-facilities') {
      const { session, pageNumber = 1, pageSize = 50, raw = false } = body
      if (!session || !session.accessToken) return json({ error: 'لا توجد جلسة — الصق بيانات OIDC أولاً.', code: 'NO_SESSION' }, 401)

      const now = Math.floor(Date.now() / 1000)
      if (session.expiresAt && session.expiresAt <= now) {
        return json({ error: 'انتهت صلاحية الوصول. أعد لصق بيانات OIDC.', code: 'SESSION_EXPIRED' }, 401)
      }

      const r = await listFacilities(session, { pageNumber, pageSize })
      if (!r.ok) return json({ error: r.error, code: r.code, body: r.body }, r.status === 401 ? 401 : 502)

      const p = r.payload
      const items = Array.isArray(p.items) ? p.items : []
      return json({
        ok: true,
        pageNumber: p.pageNumber ?? pageNumber,
        totalPages: p.totalPages ?? null,
        totalCount: p.totalCount ?? items.length,
        hasNextPage: !!p.hasNextPage,
        hasPreviousPage: !!p.hasPreviousPage,
        items: raw ? items : items.map(slim),
      })
    }

    // Per-facility lookups keyed by encryptedCrNationalNumber.
    if (body.action === 'gosi-info' || body.action === 'hrsd-info') {
      const { session, encryptedCrNatNo } = body
      if (!session?.accessToken) return json({ error: 'لا توجد جلسة SBC. شغّل المزامنة أولاً.', code: 'NO_SESSION' }, 401)
      if (!encryptedCrNatNo) return json({ error: 'encryptedCrNatNo required' }, 400)
      const now = Math.floor(Date.now() / 1000)
      if (session.expiresAt && session.expiresAt <= now) return json({ error: 'انتهت صلاحية جلسة SBC.', code: 'SESSION_EXPIRED' }, 401)
      const url = (body.action === 'gosi-info' ? SBC_GOSI_API : SBC_HRSD_API) + encodeURIComponent(encryptedCrNatNo)
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 25_000)
      let res
      try { res = await fetch(url, { headers: baseHeaders(session, { 'X-Correlation-Id': crypto.randomUUID() }), signal: ctrl.signal }) }
      finally { clearTimeout(timer) }
      const text = await res.text()
      if (!res.ok) {
        const code = (res.status === 401 || res.status === 403) ? 'SESSION_INVALID' : undefined
        return json({ error: code ? 'انتهت الجلسة.' : `HTTP ${res.status}`, code, body: text.slice(0, 300) }, res.status === 401 ? 401 : 502)
      }
      let data; try { data = JSON.parse(text) } catch { return json({ error: 'Unexpected response', body: text.slice(0, 300) }, 502) }
      return json({ ok: true, data })
    }

    if (body.action === 'refresh-token') {
      const { session, clientId = 'InvestorPortal' } = body
      if (!session?.refreshToken) return json({ error: 'لا يوجد refresh_token.', code: 'NO_REFRESH' }, 400)
      const form = new URLSearchParams()
      form.set('grant_type', 'refresh_token')
      form.set('refresh_token', session.refreshToken)
      form.set('client_id', clientId)
      const res = await fetch(SBC_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json', 'User-Agent': UA },
        body: form.toString(),
      })
      const text = await res.text()
      if (!res.ok) return json({ error: 'Refresh failed', status: res.status, body: text.slice(0, 500) }, 401)
      let p; try { p = JSON.parse(text) } catch { return json({ error: 'Invalid refresh response' }, 502) }
      const expiresAt = Math.floor(Date.now() / 1000) + (p.expires_in || 0)
      return json({
        ok: true,
        session: {
          ...session,
          accessToken: p.access_token || session.accessToken,
          refreshToken: p.refresh_token || session.refreshToken,
          idToken: p.id_token || session.idToken,
          tokenType: p.token_type || session.tokenType,
          scope: p.scope || session.scope,
          expiresAt,
        },
      })
    }

    return json({ error: 'Unknown action. Use parse-session | list-facilities | refresh-token.' }, 400)
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500)
  }
}
