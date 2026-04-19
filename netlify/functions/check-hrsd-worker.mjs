// Public HRSD (Ministry of Labor) "Non-Saudi Employee Inquiry" lookup.
// Same pattern as check-chi-insurance: stateless, two-phase (init → verify),
// session bundle is round-tripped via the client.

const HRSD_URL = 'https://es.hrsd.gov.sa/Services/Inquiry/NonSaudiEmpInquiry.aspx'
const HRSD_BASE = 'https://es.hrsd.gov.sa'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b, s = 200) => ({ statusCode: s, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify(b) })

const decodeEntities = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')

function extractHidden(html) {
  const out = {}
  const re = /<input\b[^>]*\btype="hidden"[^>]*>/gi
  for (const m of html.matchAll(re)) {
    const tag = m[0]
    const nameM = tag.match(/\bname="([^"]+)"/)
    const valueM = tag.match(/\bvalue="([^"]*)"/)
    if (nameM) out[nameM[1]] = valueM ? decodeEntities(valueM[1]) : ''
  }
  return out
}

function extractCaptchaUrl(html) {
  const m = html.match(/<img[^>]*\bid="[^"]*ucCaptcha_imgCaptchaCode"[^>]*\bsrc="([^"]+)"/i)
  if (!m) return null
  return new URL(m[1], HRSD_URL).toString()
}

function parseCookies(setCookie) {
  if (!setCookie) return ''
  const list = Array.isArray(setCookie) ? setCookie : setCookie.split(/,(?=\s*[^;=\s]+=)/)
  return list.map(c => c.split(';')[0].trim()).filter(Boolean).join('; ')
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
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
}

const stripTags = s => decodeEntities(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

function cleanBody(html) {
  return html
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<link[^>]*>/gi, '')
}

// Find a labelled value in the HRSD result table.
function findValueByLabel(html, labelTexts) {
  const cleaned = cleanBody(html)
  for (const label of labelTexts) {
    const lbl = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*')
    // Pattern 1: label inside one cell, value in the NEXT cell
    const re1 = new RegExp(`>\\s*${lbl}\\s*[:：]?\\s*<\\/(?:td|th|span|div|label)>[\\s\\S]{0,200}?<(?:td|span|div|b|strong)[^>]*>([^<]+)<`, 'i')
    const m1 = cleaned.match(re1)
    if (m1 && m1[1].trim()) return stripTags(m1[1])
    // Pattern 2: same row "<tr>...label...value...</tr>"
    const re2 = new RegExp(`<tr\\b[^>]*>([\\s\\S]*?${lbl}[\\s\\S]*?)<\\/tr>`, 'i')
    const m2 = cleaned.match(re2)
    if (m2) {
      const cells = [...m2[1].matchAll(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map(x => stripTags(x[1]))
      const idx = cells.findIndex(c => new RegExp(lbl, 'i').test(c))
      if (idx >= 0 && cells[idx + 1]) return cells[idx + 1]
      if (idx >= 0 && cells[idx - 1]) return cells[idx - 1]
    }
  }
  return null
}

function parseResult(html) {
  const text = stripTags(cleanBody(html))

  if (/(?:رمز\s*التحقق|الكابتشا|captcha)[^\n]{0,80}(?:غير\s*صحيح|خاطئ|خطأ|invalid|incorrect)/i.test(text)) {
    return { status: 'invalid_captcha' }
  }
  if (/(?:لا\s*يوجد|غير\s*موجود|not\s*found|لم\s*يتم\s*العثور|no\s*records)/i.test(text)) {
    return { status: 'not_found' }
  }

  const workerNumber = findValueByLabel(html, ['رقم العامل', 'worker number'])
  const name         = findValueByLabel(html, ['الاسم', 'اسم العامل', 'employee name', 'name'])
  const workerStatus = findValueByLabel(html, ['حالة العامل', 'الحالة', 'employee status', 'status'])
  const licenses     = findValueByLabel(html, ['تراخيص المنشأة', 'establishment licenses'])
  const rating       = findValueByLabel(html, ['تقييم المنشأة', 'establishment rating'])
  const occupation   = findValueByLabel(html, ['المهنة', 'occupation', 'job title'])

  if (name || workerStatus || workerNumber) {
    return { status: 'found', workerNumber, name, workerStatus, licenses, rating, occupation }
  }

  return {
    status: 'unknown',
    debug: { textSnippet: text.slice(0, 1500) },
  }
}

function packSession(s) { return Buffer.from(JSON.stringify(s), 'utf8').toString('base64') }
function unpackSession(p) { return JSON.parse(Buffer.from(p, 'base64').toString('utf8')) }

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' }
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body
  try { body = JSON.parse(event.body || '{}') }
  catch { return json({ error: 'Invalid JSON' }, 400) }

  const { action } = body

  try {
    if (action === 'init') {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 20_000)
      let res
      try {
        res = await fetch(HRSD_URL, {
          headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'ar,en;q=0.8' },
          signal: ctrl.signal,
        })
      } finally { clearTimeout(t) }

      if (!res.ok) return json({ error: 'HRSD page fetch failed', status: res.status }, 502)
      const html = await res.text()
      const cookies = parseCookies(res.headers.raw ? res.headers.raw()['set-cookie'] : res.headers.get('set-cookie'))
      const hidden = extractHidden(html)
      const captchaUrl = extractCaptchaUrl(html)

      if (!captchaUrl || !hidden['__VIEWSTATE']) {
        return json({ error: 'Failed to parse HRSD page', hasCaptcha: !!captchaUrl, hasViewState: !!hidden['__VIEWSTATE'] }, 502)
      }

      // Fetch the captcha image bytes
      const imgRes = await fetch(captchaUrl, {
        headers: { 'User-Agent': UA, 'Cookie': cookies, 'Referer': HRSD_URL },
      })
      if (!imgRes.ok) return json({ error: 'Failed to fetch CAPTCHA image', status: imgRes.status }, 502)
      const imgBuf = Buffer.from(await imgRes.arrayBuffer())
      // HRSD returns Content-Type: text/html (a server quirk) — sniff magic bytes instead
      const mime = imgBuf[0] === 0x89 && imgBuf[1] === 0x50 ? 'image/png'
                 : imgBuf[0] === 0xFF && imgBuf[1] === 0xD8 ? 'image/jpeg'
                 : imgBuf[0] === 0x47 && imgBuf[1] === 0x49 ? 'image/gif'
                 : 'image/png'
      const captchaImage = `data:${mime};base64,${imgBuf.toString('base64')}`
      const finalCookies = applySetCookies(cookies, imgRes.headers.raw ? imgRes.headers.raw()['set-cookie'] : imgRes.headers.get('set-cookie'))

      return json({
        session: packSession({ cookies: finalCookies, hidden, exp: Date.now() + 5 * 60_000 }),
        captchaImage,
      })
    }

    if (action === 'verify') {
      const { iqama, captcha, session } = body
      if (!iqama || !captcha || !session) return json({ error: 'Missing iqama, captcha, or session' }, 400)
      let sess
      try { sess = unpackSession(session) } catch { return json({ error: 'Invalid session' }, 400) }
      if (!sess?.exp || sess.exp < Date.now()) return json({ error: 'Session expired', code: 'SESSION_EXPIRED' }, 400)

      const FIELD = 'ctl00$MainContent$NonSaudiEmpSearch1'
      const form = new URLSearchParams()
      for (const [k, v] of Object.entries(sess.hidden)) form.append(k, v ?? '')
      form.set('__EVENTTARGET', `${FIELD}$btnSearch`)
      form.set('__EVENTARGUMENT', '')
      form.set(`${FIELD}$txtLimitsNum`, '')
      form.set(`${FIELD}$txtResidenceNum`, iqama)
      form.set(`${FIELD}$txtPassportNum`, '')
      form.set(`${FIELD}$ucCaptcha$txtCaptchaCode`, captcha)

      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 25_000)
      let res
      try {
        res = await fetch(HRSD_URL, {
          method: 'POST',
          headers: {
            'User-Agent': UA,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': sess.cookies || '',
            'Referer': HRSD_URL,
            'Origin': HRSD_BASE,
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'ar,en;q=0.8',
          },
          body: form.toString(),
          redirect: 'follow',
          signal: ctrl.signal,
        })
      } finally { clearTimeout(t) }

      const html = await res.text()
      return json(parseResult(html))
    }

    return json({ error: 'Unknown action. Use init | verify.' }, 400)
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500)
  }
}
