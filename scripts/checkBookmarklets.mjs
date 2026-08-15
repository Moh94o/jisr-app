// Offline smoke-runner for the sync bookmarklets.
//
// Why this exists: a bookmarklet is shipped as a URL-encoded string, so nothing
// in the normal build ever parses it. Two whole classes of breakage reached the
// user before this:
//   • A trailing `//` comment swallowed the rest of the file at minify time and
//     the button silently did nothing (project_bookmarklet_minify_trap).
//   • `tok is not defined` — a helper was renamed and one caller was missed.
//     esbuild validates SYNTAX only, so an undefined reference passes it and
//     only shows up as a dead button after the user has logged in.
//
// So this doesn't just parse the code — it EXECUTES it against a stubbed
// browser, a stubbed Mudad and a stubbed bridge, and asserts the run reaches a
// success state. That catches ReferenceErrors, bad control flow, and wrong
// request shapes without spending a real 20-minute Mudad session.
//
// Run: node scripts/checkBookmarklets.mjs

import { transform } from 'esbuild'
import { buildMudadBookmarklet } from '../src/pages/mudadSyncBookmarklet.js'
import { buildMuqeemRenewBookmarklet } from '../src/pages/muqeemRenewBookmarklet.js'

let failed = 0
const fail = (m) => { console.log('  FAIL: ' + m); failed++ }
const ok = (m) => console.log('  ok: ' + m)

// A bundle stub carrying the two constants the bookmarklet must scrape out of
// Mudad's own compliance bundle.
const BUNDLE = 'x=1,systemType:"MUDAD_COMPLIANCE_APP",xAPIKey:"APIKEY32CHARS0000000000000000000",basicAuth:"Basic "+btoa("user:pass"),apiUrlEndPoint:"//api.mudad.sa/"'

const mkEst = (n) => ({
  mlsdUnifiedId: '1-' + (4507856 + n),
  nationalUnifiedId: 7050653695 + n,
  openViolations: false,
  pendingJustifications: false,
  complianceDetails: { wageperiod: '202607', complianceStatus: 'Compliant', compliancePercentage: '100' },
  authorizations: [{
    roles: [{ roleId: '42', roleName: 'Account Owner' }],
    organizationId: '1-' + (4507856 + n) + '-1-' + (4507856 + n),
    activeEmployment: true,
    organizationName: 'منشأة رقم ' + n,
  }],
})

async function runMudad({ estCount = 5, expiredAfter = Infinity, priorRows = null } = {}) {
  const href = buildMudadBookmarklet({ sourceId: 'mudad', personId: 'p1', proxyBaseUrl: 'https://jisr.test' })
  const code = decodeURIComponent(href.replace(/^javascript:/, ''))

  await transform(code, { loader: 'js' })

  const calls = []          // every Mudad request the bookmarklet made
  const writes = []         // every Supabase write it piped through the bridge
  const store = new Map([
    ['bearerToken', 'TOK-0'],
    ['refreshToken', 'RT-0'],
    ['bearerTokenExpiryAt', new Date(Date.now() + 1200000).toISOString()],
    ['session_id', '1089150369_abc'],
  ])
  let msgs = []
  let nCalls = 0
  const valid = new Set(['TOK-0'])

  const el = () => ({ id: '', style: { cssText: '' }, textContent: '', remove() {} })
  const uiEl = el()
  const listeners = []

  const jsonRes = (status, obj) => ({
    ok: status >= 200 && status < 300, status,
    headers: { get: () => 'application/json' },
    json: async () => obj, text: async () => JSON.stringify(obj),
  })

  const fetchStub = async (url, opts = {}) => {
    const u = String(url)
    if (/main\.[a-z0-9]+\.js/.test(u)) return { ok: true, status: 200, headers: { get: () => 'application/javascript' }, text: async () => BUNDLE, json: async () => null }
    if (/\/compliance\/$/.test(u)) return { ok: true, status: 200, headers: { get: () => 'text/html' }, text: async () => '<script src="/compliance/main.abc123.js"></script>', json: async () => null }

    const h = (opts && opts.headers) || {}
    calls.push({ url: u, headers: h })

    if (/refreshtoken/.test(u)) {
      if (!h.refresh_token) return jsonRes(400, { message: 'no refresh token' })
      if (!h.Authorization) return jsonRes(400, { message: 'no basic auth' })
      const n = Number(store.get('__refreshed') || 0) + 1
      store.set('__refreshed', String(n))
      // A refreshed token must actually WORK, otherwise the test asserts an
      // impossible world and can never show recovery.
      valid.add('TOK-R' + n)
      return jsonRes(200, { access_token: 'TOK-R' + n, expires_in: 1200, refresh_token: 'RT-R' + n })
    }

    // Mudad rejects a request with a missing/blank header the SAME way it
    // rejects an expired session, so the stub reproduces that trap exactly.
    if (!h['x-apikey']) return jsonRes(402, { message: 'Authorization Failed. Please contact administrator.' })
    if (!h.bearer_token) return jsonRes(401, { message: 'Authorization Failed. Please contact administrator.' })

    nCalls++
    if (nCalls > expiredAfter) {
      // Reproduce the real first-run failure: the live Angular app decides the
      // session lapsed, wipes sessionStorage and invalidates the token.
      valid.delete('TOK-0')
      store.delete('bearerToken')
      store.delete('bearerTokenExpiryAt')
    }
    if (!valid.has(h.bearer_token)) return jsonRes(401, { message: 'Authorization Failed. Please contact administrator.' })

    if (/landing-page-info/.test(u)) {
      const p = new URL('https://x/?' + u.split('?')[1])
      const page = Number(p.searchParams.get('pageNumber')), size = Number(p.searchParams.get('pageSize'))
      const all = Array.from({ length: estCount }, (_, i) => mkEst(i))
      const slice = all.slice((page - 1) * size, page * size)
      return jsonRes(200, { pageNumber: page, pageSize: size, totalNoOfUserEstablishments: estCount, userEstablishmentsInfoList: slice })
    }
    // Every per-establishment path below carries no id — Mudad reads the
    // establishment from the organizationId header, and answers 403 without it.
    if (!h.organizationId) return jsonRes(403, { code: '403', message: { arabic: 'لا يوجد صلاحية لاستخدام هذه الخدمة' } })

    if (/compliance-report\/mlsd-unified-id\/summary/.test(u)) {
      return jsonRes(200, {
        unifiedId: '18-4035762',
        complianceInfo: [
          { monthYearEn: 'June 2026', monthYearAr: 'يونيو 2026', compliancePercentage: '0', status: 'NonCompliant', totalLaborers: 4, paidLaborers: 0, expatLaborers: 0, violatedLaborers: 4, wagePeriodId: 202606, compliantLaborer: 0, mlsdStatus: 'Suspended', mlsdStatusStartDateAr: 'يونيو 2026', mlsdStatusStartDateEn: 'June 2026', includedLaborers: 4, excludedLaborers: 0 },
          { monthYearEn: 'April 2026', monthYearAr: 'أبريل 2026', compliancePercentage: '100', status: 'Compliant', totalLaborers: 4, paidLaborers: 4, expatLaborers: 0, violatedLaborers: 0, wagePeriodId: 202604, compliantLaborer: 4, mlsdStatus: 'Suspended', mlsdStatusStartDateAr: 'يونيو 2026', mlsdStatusStartDateEn: 'June 2026', includedLaborers: 4, excludedLaborers: 0 },
        ],
      })
    }
    if (/current-status/.test(u)) return jsonRes(200, { status: 'NonCompliant' })
    if (/compliance-report\/establishment\/mlsd-unified-id\/violations/.test(u)) return jsonRes(200, { violations: [] })
    if (/certificates\/establishments\/mlsd-unified-id\/compliance/.test(u)) return jsonRes(200, { certificates: [] })
    if (/wage-commitments/.test(u)) return jsonRes(200, { totalRecords: 0, estWageCommitmentSummary: [] })
    return jsonRes(404, { message: 'not found' })
  }

  const deliver = (data) => { for (const fn of listeners) setTimeout(() => fn({ data }), 0) }
  const bridgeWin = {
    closed: false,
    postMessage(d) {
      if (d && d.hello) return deliver({ ready: true })
      if (d && d.id && d.path) {
        writes.push({ path: d.path, method: d.method, body: d.body })
        // The delta-sweep pre-read: prior establishment rows with the snapshot
        // stamped by the last completed sweep.
        if (d.method === 'GET') {
          const body = priorRows && /mudad_establishments/.test(d.path) ? JSON.stringify(priorRows) : '[]'
          return deliver({ id: d.id, status: 200, body })
        }
        const rep = /return=representation/.test(JSON.stringify(d.headers || {}))
        return deliver({ id: d.id, status: 201, body: rep ? '[{"id":"run-1"}]' : '' })
      }
    },
  }

  const win = {
    fetch: fetchStub,
    open: () => bridgeWin,
    addEventListener: (t, fn) => { if (t === 'message') listeners.push(fn) },
    location: { hostname: 'mudad.com.sa', origin: 'https://mudad.com.sa' },
  }

  const sandbox = {
    window: win,
    fetch: fetchStub,
    document: {
      getElementById: (id) => (id === '_jisr_mudad_ui' ? (uiEl.__added ? uiEl : null) : null),
      createElement: () => { uiEl.__added = true; return uiEl },
      body: { appendChild: () => {} },
      querySelectorAll: () => [{ src: 'https://mudad.com.sa/compliance/main.abc123.js' }],
    },
    location: win.location,
    sessionStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
    setTimeout, clearTimeout, setInterval, clearInterval,
    AbortController, URLSearchParams, URL, JSON, Math, Date, Promise, Array, Object, String, Number, isNaN, parseFloat, console,
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  }
  // The UI writer is the only view we have of what the run concluded.
  Object.defineProperty(uiEl, 'textContent', {
    get() { return this.__t || '' },
    set(v) { this.__t = v; msgs.push(String(v)) },
  })

  const fn = new Function(...Object.keys(sandbox), 'return (async()=>{' + code + '})()')
  await fn(...Object.values(sandbox))
  // The bookmarklet is a self-invoking IIFE, so the call above returns as soon
  // as it STARTS. Poll for a terminal badge rather than sleeping a fixed
  // interval, which would report a still-running sweep as a failure.
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    if (/✅|❌|⚠️/.test(msgs[msgs.length - 1] || '')) break
    await new Promise((r) => setTimeout(r, 25))
  }
  return { msgs, calls, writes, store }
}

console.log('mudad — happy path (5 establishments)')
try {
  const { msgs, calls, writes } = await runMudad({ estCount: 5 })
  const last = msgs[msgs.length - 1] || ''
  if (!/✅/.test(last)) fail('run did not end in success: ' + JSON.stringify(msgs.slice(-2)))
  else ok('reached success: ' + last.split('\n')[0])

  if (msgs.some((m) => /is not defined|❌/.test(m))) fail('error surfaced: ' + msgs.find((m) => /is not defined|❌/.test(m)))
  else ok('no runtime errors')

  const est = writes.find((w) => /mudad_establishments/.test(w.path))
  if (!est) fail('never wrote mudad_establishments')
  else {
    const rows = JSON.parse(est.body)
    if (rows.length !== 5) fail('expected 5 establishment rows, got ' + rows.length)
    else if (!rows[0].name) fail('establishment name is null — organizationName not mapped')
    else if (!rows[0].organization_id) fail('organization_id is null')
    else ok('establishments written with name + organization_id')
  }

  const raw = writes.filter((w) => /mudad_raw/.test(w.path)).flatMap((w) => JSON.parse(w.body))
  if (!raw.length) fail('never wrote mudad_raw')
  else if (raw.some((r) => r.http_status !== 200 && !/^refresh:/.test(r.endpoint))) fail('non-200 raw on happy path: ' + JSON.stringify(raw.find((r) => r.http_status !== 200)))
  else ok('raw rows written (' + raw.length + ') all 200')

  // Every per-establishment call must carry the context header; without it
  // Mudad answers 403 and the sweep would quietly collect nothing.
  const perEst = calls.filter((c) => /compliance-report|certificates|wage-commitments/.test(c.url))
  if (!perEst.length) fail('no per-establishment calls made')
  else if (perEst.length !== 5) fail('expected 1 summary call × 5 establishments, got ' + perEst.length)
  else if (perEst.some((c) => !c.headers.organizationId)) fail('a per-establishment call omitted organizationId')
  else ok('all ' + perEst.length + ' per-establishment calls carried organizationId')

  // The sweep is one request per establishment — the compliance summary. The
  // other confirmed-200 paths (current-status, violations, certificates,
  // wage-commitments) were dropped because nothing displays them; each one
  // creeping back costs a request per establishment. wage-periods/all always
  // 403s on top of that.
  if (calls.some((c) => /current-status|establishment\/mlsd-unified-id\/violations|certificates|wage-commitments|wage-periods\/all|submitted-files|files\/summary/.test(c.url)))
    fail('fetched a per-establishment endpoint beyond the compliance summary')
  else ok('sweep limited to the compliance summary endpoint')

  // The compliance table is the reason this sync exists — assert it is both
  // fetched and decomposed, not just captured as raw.
  const months = writes.filter((w) => /mudad_compliance_months/.test(w.path)).flatMap((w) => JSON.parse(w.body))
  if (!months.length) fail('never wrote mudad_compliance_months')
  else if (months.length !== 10) fail('expected 2 months × 5 establishments = 10 rows, got ' + months.length)
  else if (months[0].wage_period_id !== 202606 || months[0].violated_laborers !== 4) fail('compliance month mapped wrong: ' + JSON.stringify(months[0]))
  else ok('compliance months decomposed (' + months.length + ' rows, mlsd_status=' + months[0].mlsd_status + ')')

  // Completion must stamp detail_snapshot alongside detail_synced_at — it is
  // what the next run's delta test compares against.
  const stamped = writes.filter((w) => /mudad_establishments/.test(w.path) && w.method === 'POST' && w.body).flatMap((w) => JSON.parse(w.body)).filter((r) => r.detail_snapshot)
  if (stamped.length !== 5) fail('expected 5 rows stamped with detail_snapshot, got ' + stamped.length)
  else if (stamped[0].detail_snapshot.pct !== 100 || stamped[0].detail_snapshot.period !== '202607') fail('detail_snapshot mapped wrong: ' + JSON.stringify(stamped[0].detail_snapshot))
  else ok('detail_snapshot stamped on completion')
} catch (e) { fail('threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)) }

// The snapshot rows the delta tests feed back — matching what mkEst's list rows
// carry (pct 100 / Compliant / 202607 / no flags). detail_synced_at is 5 days
// old on purpose: age must NOT matter, only whether the snapshot changed.
const mkPrior = (n) => ({
  mlsd_unified_id: '1-' + (4507856 + n),
  detail_synced_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  detail_snapshot: { pct: 100, status: 'Compliant', period: '202607', viol: false, just: false },
})

console.log('mudad — delta skip (nothing changed since last sweep)')
try {
  const priorRows = Array.from({ length: 5 }, (_, i) => mkPrior(i))
  const { msgs, calls } = await runMudad({ estCount: 5, priorRows })
  const last = msgs[msgs.length - 1] || ''
  if (!/✅ لا تغيير/.test(last)) fail('did not conclude as no-change: ' + last)
  else ok('concluded no-change: ' + last)
  const perEst = calls.filter((c) => /compliance-report\/mlsd-unified-id\/summary/.test(c.url))
  if (perEst.length) fail('made ' + perEst.length + ' per-establishment calls despite nothing changing')
  else ok('zero per-establishment requests')
} catch (e) { fail('threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)) }

console.log('mudad — delta sweep (one establishment changed)')
try {
  // Establishment #2's stored snapshot says 0% — the fresh list says 100%, so
  // it alone must be fetched while the other four are skipped.
  const priorRows = Array.from({ length: 5 }, (_, i) => mkPrior(i))
  priorRows[2].detail_snapshot = { pct: 0, status: 'NonCompliant', period: '202606', viol: true, just: false }
  const { msgs, calls } = await runMudad({ estCount: 5, priorRows })
  const last = msgs[msgs.length - 1] || ''
  // Cumulative counter: 4 unchanged (resumed) + 1 re-synced = 5/5 total.
  if (!/✅ تم 5\/5 منشأة/.test(last) || !/بلا تغيير 4/.test(last)) fail('expected cumulative 5/5 with 4 unchanged: ' + last)
  else ok('synced only the changed establishment: ' + last.split('\n')[0])
  const perEst = calls.filter((c) => /compliance-report\/mlsd-unified-id\/summary/.test(c.url))
  if (perEst.length !== 1) fail('expected exactly 1 summary call, got ' + perEst.length)
  else if (perEst[0].headers.organizationId !== '1-4507858-1-4507858') fail('fetched the wrong establishment: ' + perEst[0].headers.organizationId)
  else ok('the single call targeted the changed establishment')
} catch (e) { fail('threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)) }

console.log('mudad — session dies mid-sweep (the first run\'s real failure)')
try {
  const { msgs, store } = await runMudad({ estCount: 40, expiredAfter: 6 })
  const last = msgs[msgs.length - 1] || ''
  if (/is not defined/.test(msgs.join(' '))) fail('runtime error: ' + last)
  else ok('no runtime error')
  // The token keeper must refresh rather than let the sweep bleed 401s.
  if (!store.get('__refreshed')) fail('never attempted a token refresh after 401')
  else ok('refreshed token ' + store.get('__refreshed') + '× on 401')
  if (!/✅|⚠️/.test(last)) fail('did not conclude cleanly: ' + last)
  else ok('concluded: ' + last.split('\n')[0].slice(0, 80))
} catch (e) { fail('threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)) }

// ─────────────────────────────────────────────────────────────────────────────
// Muqeem renewal bookmarklet (per-worker renew/validate). Runs the button in a
// stubbed muqeem tab: a fake SPA request leaks the Bearer token, the button must
// then POST /api/alien/iqama/renew/validate with the exact body and pipe the
// reply into muqeem_renewal_checks through the bridge.
// ─────────────────────────────────────────────────────────────────────────────
// A realistically-shaped org session JWT (moiNumber + future exp) — the button
// now validates token shape, so the fake SPA request must leak a real JWT.
const b64url = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
const FAKE_JWT = 'eyJhbGciOiJIUzUxMiJ9.' + b64url({ sub: '7041873717', moiNumber: '7041873717', operatorId: '1089150369', exp: Math.floor(Date.now() / 1000) + 600 }) + '.sig'

async function runRenew({ duration = 6, validateStatus = 200, validateBody = { totalAmount: 645, canRenew: true }, targetMoi = '7041873717', tmpJwt = null, ssoUsers = null, ssoIdToken = null, subOverview = { expired: false } } = {}) {
  const href = buildMuqeemRenewBookmarklet({ iqama: '2442464695', duration, workerId: 'wk-1', personId: 'pr-1', targetMoi, proxyBaseUrl: 'https://jisr.test' })
  const code = decodeURIComponent(href.replace(/^javascript:/, ''))
  await transform(code, { loader: 'js' })

  const calls = []
  const writes = []
  const msgs = []
  const listeners = []

  const jsonRes = (status, obj) => ({
    ok: status >= 200 && status < 300, status,
    json: async () => obj, text: async () => (typeof obj === 'string' ? obj : JSON.stringify(obj)),
  })
  const fetchStub = async (url, opts = {}) => {
    const u = String(url)
    calls.push({ url: u, opts })
    if (/\/api\/sso\/absher\/get-users$/.test(u)) return jsonRes(200, ssoUsers || [])
    if (/\/api\/sso\/absher\/get-application-jwt$/.test(u)) return jsonRes(200, { id_token: ssoIdToken })
    if (/\/api\/subscriptions\/business\/overview$/.test(u)) return jsonRes(200, subOverview)
    if (/\/api\/alien\/iqama\/renew\/validate$/.test(u)) return jsonRes(validateStatus, validateBody)
    // Any other authenticated SPA call (used only to leak the token).
    return jsonRes(200, { ok: true })
  }

  const deliver = (data) => { for (const fn of listeners) setTimeout(() => fn({ data }), 0) }
  const bridgeWin = {
    closed: false,
    postMessage(d) {
      if (d && d.hello) return deliver({ ready: true })
      if (d && d.id && d.path) {
        writes.push({ path: d.path, method: d.method, body: d.body })
        return deliver({ id: d.id, status: 201, body: '' })
      }
    },
  }

  const uiEl = { id: '', style: { cssText: '' }, __t: '', remove() {} }
  Object.defineProperty(uiEl, 'textContent', { get() { return this.__t }, set(v) { this.__t = String(v); msgs.push(String(v)) } })

  const win = {
    fetch: fetchStub,
    open: () => bridgeWin,
    addEventListener: (t, fn) => { if (t === 'message') listeners.push(fn) },
    location: { hostname: 'muqeem.sa', origin: 'https://muqeem.sa', href: 'https://muqeem.sa/' },
  }
  const mkStore = (m) => ({ get length() { return m.size }, key: (i) => Array.from(m.keys())[i], getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) })
  const lsMap = new Map(); if (tmpJwt) lsMap.set('tmpJwt', tmpJwt)
  const sandbox = {
    window: win,
    fetch: fetchStub,
    document: {
      cookie: 'XSRF-TOKEN=xsrf-abc-123',
      getElementById: (id) => (id === '_jisr_renew_ui' ? (uiEl.__added ? uiEl : null) : null),
      createElement: () => { uiEl.__added = true; return uiEl },
      body: { appendChild: () => {} },
    },
    localStorage: mkStore(lsMap),
    sessionStorage: mkStore(new Map()),
    location: win.location,
    setTimeout, clearTimeout, URL, JSON, Math, Date, Promise, Array, Object, String, Number, RegExp, isNaN, parseFloat, decodeURIComponent, atob, console,
  }

  const fn = new Function(...Object.keys(sandbox), 'return (async()=>{' + code + '})()')
  fn(...Object.values(sandbox))
  // Leak a Bearer token the way muqeem's SPA would — the button installed a
  // fetch interceptor and is now polling for it.
  setTimeout(() => { try { win.fetch('https://muqeem.sa/api/residents', { headers: { Authorization: 'Bearer ' + FAKE_JWT, 'X-Domain': '1503520', 'X-Xsrf-Token': 'live-xsrf-77' } }) } catch (_) {} }, 60)

  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    if (/✅|❌|⚠️/.test(msgs[msgs.length - 1] || '')) break
    await new Promise((r) => setTimeout(r, 25))
  }
  return { msgs, calls, writes }
}

console.log('muqeem-renew — happy path (validate returns fees)')
try {
  const { msgs, calls, writes } = await runRenew({ duration: 6 })
  const last = msgs[msgs.length - 1] || ''
  if (msgs.some((m) => /is not defined/.test(m))) fail('runtime error: ' + msgs.find((m) => /is not defined/.test(m)))
  else ok('no runtime errors')
  if (!/✅/.test(last)) fail('did not conclude success: ' + JSON.stringify(msgs.slice(-2)))
  else ok('reached success: ' + last.split('\n')[0])

  const validate = calls.find((c) => /\/api\/alien\/iqama\/renew\/validate$/.test(c.url))
  if (!validate) fail('never POSTed renew/validate')
  else {
    const b = JSON.parse(validate.opts.body || '{}')
    if (b.iqamaNumber !== '2442464695') fail('wrong iqamaNumber: ' + b.iqamaNumber)
    else if (b.renewDuration !== '6') fail('wrong renewDuration (expected string "6"): ' + JSON.stringify(b.renewDuration))
    else if (b.isBulk !== false) fail('isBulk not false: ' + JSON.stringify(b.isBulk))
    else if (b.sendExpiryNotification !== false) fail('sendExpiryNotification not false: ' + JSON.stringify(b.sendExpiryNotification))
    else if (validate.opts.headers?.Authorization !== 'Bearer ' + FAKE_JWT) fail('Bearer not attached: ' + validate.opts.headers?.Authorization)
    else if (!validate.opts.headers?.['X-Xsrf-Token']) fail('X-Xsrf-Token missing')
    else if (validate.opts.headers?.['X-Domain'] !== '1503520') fail('X-Domain not attached from live capture: ' + validate.opts.headers?.['X-Domain'])
    else ok('renew/validate body + auth + X-Domain headers correct')
  }

  const write = writes.find((w) => /muqeem_renewal_checks/.test(w.path))
  if (!write) fail('never wrote muqeem_renewal_checks')
  else {
    const rows = JSON.parse(write.body)
    const row = Array.isArray(rows) ? rows[0] : rows
    if (row.worker_id !== 'wk-1') fail('worker_id not baked: ' + row.worker_id)
    else if (row.renew_duration !== 6) fail('renew_duration wrong: ' + row.renew_duration)
    else if (row.ok !== true) fail('ok not true on 200: ' + row.ok)
    else if (row.response?.totalAmount !== 645) fail('response not captured: ' + JSON.stringify(row.response))
    else ok('renewal check row written with response')
  }
} catch (e) { fail('threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)) }

console.log('muqeem-renew — rejection path (validate 400)')
try {
  const { msgs, writes } = await runRenew({ duration: 12, validateStatus: 400, validateBody: { errorMessage: 'الإقامة غير قابلة للتجديد' } })
  const last = msgs[msgs.length - 1] || ''
  if (msgs.some((m) => /is not defined/.test(m))) fail('runtime error: ' + msgs.find((m) => /is not defined/.test(m)))
  else if (!/⚠️/.test(last)) fail('did not surface rejection: ' + last)
  else ok('surfaced rejection: ' + last.split('\n')[0])
  const write = writes.find((w) => /muqeem_renewal_checks/.test(w.path))
  if (!write) fail('rejection not persisted')
  else {
    const row = JSON.parse(write.body)[0]
    if (row.ok !== false) fail('ok should be false on 400: ' + row.ok)
    else if (row.http_status !== 400) fail('http_status wrong: ' + row.http_status)
    else ok('rejection persisted (ok=false, http_status=400)')
  }
} catch (e) { fail('threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)) }

console.log('muqeem-renew — 403 with EXPIRED subscription (the real cause)')
try {
  const { msgs, writes, calls } = await runRenew({
    duration: 3,
    validateStatus: 403, validateBody: { type: 'https://www.elm.sa/problem/problem-with-message', title: 'Forbidden', status: 403, message: 'error.http.403' },
    subOverview: { expired: true, latestSubscription: { expiryDate: '2026-01-25', packageNameAr: 'باقة عمليات' } },
  })
  const last = msgs[msgs.length - 1] || ''
  if (msgs.some((m) => /is not defined/.test(m))) fail('runtime error: ' + msgs.find((m) => /is not defined/.test(m)))
  else if (!calls.some((c) => /subscriptions\/business\/overview$/.test(c.url))) fail('did not probe the subscription on 403')
  else if (!/اشتراك.*منته/.test(last)) fail('did not attribute the 403 to an expired subscription: ' + last)
  else ok('403 correctly diagnosed as expired subscription: ' + last.split('\n')[0])
  const row = JSON.parse(writes.find((w) => /muqeem_renewal_checks/.test(w.path)).body)[0]
  if (row.request?._subExpired !== true) fail('_subExpired not stamped: ' + JSON.stringify(row.request))
  else if (row.request?._subExpiry !== '2026-01-25') fail('_subExpiry not stamped: ' + row.request?._subExpiry)
  else ok('stamped _subExpired + _subExpiry for the card')
} catch (e) { fail('threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)) }

console.log('muqeem-renew — 403 with ACTIVE subscription (falls back to sponsor/authority hint)')
try {
  const { msgs } = await runRenew({
    duration: 3,
    validateStatus: 403, validateBody: { title: 'Forbidden', status: 403, message: 'error.http.403' },
    subOverview: { expired: false, latestSubscription: { expiryDate: '2026-11-14' } },
  })
  const last = msgs[msgs.length - 1] || ''
  if (!/رُفض|كفيل العامل|صلاحية التجديد/.test(last)) fail('no useful 403 guidance when sub is active: ' + last)
  else ok('403 with active sub gives sponsor/authority hint: ' + last.split('\n')[0])
} catch (e) { fail('threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)) }

console.log('muqeem-renew — auto-switch establishment via Absher SSO')
try {
  // Page session is establishment A; the worker's sponsor is B. With a valid
  // tmpJwt the button must mint B's token via SSO and renew with THAT token.
  const TMP = 'eyJhbGciOiJIUzUxMiJ9.' + b64url({ AUTH: 'ELM_ABSHER_SSO', absherReferenceNumber: 'x', exp: Math.floor(Date.now() / 1000) + 600 }) + '.sig'
  const ORG_B = 'eyJhbGciOiJIUzUxMiJ9.' + b64url({ sub: '7042064787', moiNumber: '7042064787', exp: Math.floor(Date.now() / 1000) + 600 }) + '.sig'
  const { msgs, calls } = await runRenew({ duration: 3, targetMoi: '7042064787', tmpJwt: TMP, ssoUsers: [{ username: '7041873717', userId: 'uA' }, { username: '7042064787', userId: 'uB' }], ssoIdToken: ORG_B })
  const last = msgs[msgs.length - 1] || ''
  if (msgs.some((m) => /is not defined/.test(m))) fail('runtime error: ' + msgs.find((m) => /is not defined/.test(m)))
  else ok('no runtime errors')
  const gu = calls.find((c) => /get-users$/.test(c.url))
  const gj = calls.find((c) => /get-application-jwt$/.test(c.url))
  if (!gu) fail('never called get-users')
  else if (!gj) fail('never called get-application-jwt')
  else if (JSON.parse(gj.opts.body).userId !== 'uB') fail('minted the wrong establishment userId: ' + JSON.parse(gj.opts.body).userId)
  else ok('minted the target establishment token (userId uB)')
  const validate = calls.find((c) => /renew\/validate$/.test(c.url))
  if (!validate) fail('never POSTed renew/validate after SSO mint')
  else if (validate.opts.headers?.Authorization !== 'Bearer ' + ORG_B) fail('renew did NOT use the SSO-minted token: ' + validate.opts.headers?.Authorization)
  else ok('renew used the SSO-minted target token — no manual switch needed')
} catch (e) { fail('threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)) }

console.log('muqeem-renew — mismatch guard (no tmpJwt, wrong active establishment)')
try {
  // Active page session is 7041873717 but the worker's sponsor is 7042064787 and
  // there is no tmpJwt to switch — the button must BLOCK before sending (no 403).
  const { msgs, calls } = await runRenew({ duration: 3, targetMoi: '7042064787', tmpJwt: null })
  const last = msgs[msgs.length - 1] || ''
  if (!/ليست كفيل هذا العامل/.test(last)) fail('did not block with a clear message: ' + last)
  else ok('blocked with guidance: ' + last.split('\n')[0])
  if (calls.some((c) => /renew\/validate$/.test(c.url))) fail('sent a doomed renew/validate despite establishment mismatch')
  else ok('did NOT send the doomed request')
} catch (e) { fail('threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)) }

console.log(failed ? '\n' + failed + ' check(s) FAILED' : '\nall checks passed')
process.exit(failed ? 1 : 0)
