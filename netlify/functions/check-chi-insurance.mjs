const CHI_URL = 'https://www.chi.gov.sa/ServicesDirectory/pages/eservices-checkinsurance.aspx'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

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

const decodeEntities = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')

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

function extractCaptchaBase64(html) {
  const m = html.match(/<img[^>]*\bid="[^"]*myImageControl"[^>]*\bsrc="(data:image\/[^"]+)"/i)
    || html.match(/<img[^>]*\bsrc="(data:image\/[^"]+)"[^>]*\bid="[^"]*myImageControl"/i)
  return m ? m[1] : null
}

function extractFieldPrefix(html) {
  const m = html.match(/name="(ctl00\$[^"]+?)\$txtIdentity"/)
  return m ? m[1] : null
}

function parseCookies(setCookie) {
  if (!setCookie) return ''
  return setCookie.split(/,(?=\s*[^;=\s]+=)/).map(c => c.split(';')[0].trim()).filter(Boolean).join('; ')
}

const stripTags = (s) => decodeEntities(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

// Strip noisy SharePoint/ASP.NET boilerplate so the meaningful result text isn't drowned out.
function cleanBody(html) {
  return html
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<link[^>]*>/gi, '')
}

function firstMatch(html, patterns) {
  for (const p of patterns) {
    const m = html.match(p)
    if (m && m[1]) return stripTags(m[1])
  }
  return null
}

// CHI uses ASP.NET WebForms: result usually rendered into a panel with id ending in PnlResult / lblMessage / etc.
function findResultPanel(html) {
  const panelMatchers = [
    /<div[^>]*\bid="[^"]*(?:PnlResult|pnlResult|ResultPanel|InsuranceResult|PolicyDetails|divResult|divPolicy)"[^>]*>([\s\S]*?)<\/div>/i,
    /<span[^>]*\bid="[^"]*(?:lblMessage|lblResult|lblError|lblStatus)"[^>]*>([\s\S]*?)<\/span>/i,
    /<div[^>]*\bclass="[^"]*(?:result|policy-details|insurance-info|alert|message)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ]
  for (const re of panelMatchers) {
    const m = html.match(re)
    if (m && m[1] && stripTags(m[1]).length > 10) return m[1]
  }
  return null
}

function parseResult(html) {
  const cleaned = cleanBody(html)
  const text = stripTags(cleaned)
  const panel = findResultPanel(cleaned)
  const panelText = panel ? stripTags(panel) : ''
  const haystack = panelText || text

  // Captcha rejection — look near the captcha label
  if (/(?:رمز\s*التحقق|الكابتشا|captcha)[^\n]{0,80}(?:غير\s*صحيح|خاطئ|خطأ|invalid|incorrect|wrong|الرجاء\s*المحاولة)/i.test(haystack)
      || /invalid\s*captcha|captcha\s*(is\s*)?(incorrect|invalid|wrong)|verification\s*code\s*(is\s*)?(invalid|incorrect|wrong)/i.test(haystack)) {
    return { status: 'invalid_captcha' }
  }

  // Not insured / no record / invalid id (CHI lumps these together)
  if (/ليس\s*لديك\s*تأمين|لا\s*يوجد\s*(?:سجل|وثيقة|تأمين|اشتراك)|غير\s*مؤمن|لا\s*توجد\s*وثيقة|بدون\s*تأمين|تم\s*ادخال\s*رقم\s*(?:هوية|اقامة)\s*خاط|اقامة\s*خاطئ|هوية\s*خاطئ|not\s*insured|no\s*active\s*policy|no\s*records?\s*found|لم\s*يتم\s*العثور|التأمين\s*منتهي|insurance\s*(has\s*)?expired/i.test(haystack)) {
    return { status: 'not_insured', detail: panelText.slice(0, 200) || null }
  }

  // ID validation error
  if (/(?:رقم\s*(?:الهوية|الإقامة|الاحوال).{0,40}(?:غير\s*صحيح|خاطئ|غير\s*مسجل))|(?:identity|identification|id\s*number).{0,40}(?:invalid|incorrect|not\s*found)/i.test(haystack)) {
    return { status: 'invalid_id', detail: panelText.slice(0, 200) || null }
  }

  // ── Helper: find a value near a label, constrained to a single row/block ──
  // CHI renders as table rows: <tr><td>VALUE</td><td>LABEL</td></tr>  (DOM-order, RTL displayed)
  // So we extract the row containing the label, then pull a value from inside it.
  const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  function valueInRow(labelTexts, valuePattern) {
    for (const label of labelTexts) {
      const labelRe = new RegExp(escape(label).replace(/\s+/g, '\\s*'), 'i')
      // Try <tr> row first
      const trMatches = cleaned.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)
      for (const tr of trMatches) {
        if (labelRe.test(tr[1])) {
          const v = tr[1].match(valuePattern)
          if (v && v[1]) return stripTags(v[1])
        }
      }
      // Fallback to small window around label (~300 chars each direction)
      const labelM = cleaned.match(new RegExp(`([\\s\\S]{0,300})${escape(label).replace(/\s+/g, '\\s*')}([\\s\\S]{0,300})`, 'i'))
      if (labelM) {
        const before = labelM[1].match(valuePattern)
        if (before && before[1]) return stripTags(before[1])
        const after = labelM[2].match(valuePattern)
        if (after && after[1]) return stripTags(after[1])
      }
    }
    return null
  }

  const datePattern = /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/
  const textInCell = /<(?:td|span|div|b|strong|p)[^>]*>\s*([^<]{2,80}?)\s*<\/(?:td|span|div|b|strong|p)>/i

  const expiry = valueInRow(
    ['تاريخ انتهاء التأمين', 'تاريخ انتهاء الوثيقة', 'تاريخ الإنتهاء', 'تاريخ الانتهاء', 'expiry date', 'policy end'],
    datePattern,
  )
  const uploadDate = valueInRow(['تاريخ الرفع', 'upload date'], datePattern)
  const company = valueInRow(
    ['اسم شركة التأمين', 'شركة التأمين', 'insurance company', 'company name'],
    textInCell,
  )
  const policy = valueInRow(
    ['رقم الوثيقة', 'policy number', 'رقم وثيقة'],
    textInCell,
  )
  const planClass = valueInRow(['الفئة', 'فئة الوثيقة', 'class'], textInCell)
  const coverage = valueInRow(['حدود التغطية', 'coverage limit'], /(\d{1,3}(?:,\d{3})*|\d+)/)
  const deductible = valueInRow(['نسبة التحمل', 'deductible'], /(\d+\s*%?)/)

  if (expiry || company || policy) {
    return {
      status: 'insured',
      company,
      expiryDate: expiry,
      policyNumber: policy,
      class: planClass,
      coverageLimit: coverage,
      deductible,
      uploadDate,
    }
  }

  return {
    status: 'unknown',
    debug: {
      panelText: panelText ? panelText.slice(0, 800) : null,
      bodyText: text.slice(0, 4000),
    },
  }
}

function packSession(sess) {
  return Buffer.from(JSON.stringify(sess), 'utf8').toString('base64')
}

function unpackSession(packed) {
  return JSON.parse(Buffer.from(packed, 'base64').toString('utf8'))
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' }
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body
  try { body = JSON.parse(event.body || '{}') }
  catch { return json({ error: 'Invalid JSON' }, 400) }

  const { action } = body

  try {
    if (action === 'init') {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 20_000)
      let res
      try {
        res = await fetch(CHI_URL, {
          headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'ar,en;q=0.8' },
          signal: controller.signal,
        })
      } finally { clearTimeout(timer) }

      if (!res.ok) return json({ error: 'CHI fetch failed', status: res.status }, 502)
      const html = await res.text()
      const cookies = parseCookies(res.headers.get('set-cookie'))
      const hidden = extractHidden(html)
      const captcha = extractCaptchaBase64(html)
      const prefix = extractFieldPrefix(html)

      if (!captcha || !prefix || !hidden['__VIEWSTATE']) {
        return json({ error: 'Failed to parse CHI page', hasCaptcha: !!captcha, hasPrefix: !!prefix, hasViewState: !!hidden['__VIEWSTATE'] }, 502)
      }

      return json({
        session: packSession({ cookies, hidden, prefix, exp: Date.now() + 5 * 60_000 }),
        captchaImage: captcha,
      })
    }

    if (action === 'verify') {
      const { iqama, captcha, session } = body
      if (!iqama || !captcha || !session) return json({ error: 'Missing iqama, captcha, or session' }, 400)

      let sess
      try { sess = unpackSession(session) }
      catch { return json({ error: 'Invalid session' }, 400) }
      if (!sess?.exp || sess.exp < Date.now()) return json({ error: 'Session expired', code: 'SESSION_EXPIRED' }, 400)

      const P = sess.prefix
      const form = new URLSearchParams()
      for (const [k, v] of Object.entries(sess.hidden)) form.append(k, v ?? '')
      form.set('__EVENTTARGET', '')
      form.set('__EVENTARGUMENT', '')
      form.set(`${P}$txtIdentity`, iqama)
      form.set(`${P}$captchatxt`, captcha)
      form.append('consent', 'Consented')
      form.append(`${P}$Button`, 'إرسال')

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 25_000)
      let res
      try {
        res = await fetch(CHI_URL, {
          method: 'POST',
          headers: {
            'User-Agent': UA,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': sess.cookies || '',
            'Referer': CHI_URL,
            'Origin': 'https://www.chi.gov.sa',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'ar,en;q=0.8',
          },
          body: form.toString(),
          redirect: 'follow',
          signal: controller.signal,
        })
      } finally { clearTimeout(timer) }

      const html = await res.text()
      return json(parseResult(html))
    }

    return json({ error: 'Unknown action. Use "init" or "verify".' }, 400)
  } catch (e) {
    return json({ error: String(e?.message || e), stack: String(e?.stack || '').split('\n').slice(0, 3) }, 500)
  }
}
