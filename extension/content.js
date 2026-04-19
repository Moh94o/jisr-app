// Runs on every muqeem.sa page. When auto-login is enabled, watches for the
// login form and OTP input, fills them, and lets background.js capture the JWT
// from the API requests Muqeem fires once we land on the dashboard.

(function () {
  // Visible heartbeat dot
  if (!window.__jisrSyncDot) {
    const dot = document.createElement('div')
    dot.style.cssText = 'position:fixed;bottom:12px;left:12px;z-index:999999;width:10px;height:10px;border-radius:50%;background:#27a046;box-shadow:0 0 6px rgba(39,160,70,.8);pointer-events:none;opacity:.85;'
    dot.title = 'Jisr Muqeem Sync نشط'
    document.documentElement.appendChild(dot)
    window.__jisrSyncDot = dot
  }

  const SUPABASE_URL = 'https://gcvshzutdslmdkwqwteh.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdnNoenV0ZHNsbWRrd3F3dGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTkwNjgsImV4cCI6MjA5MDQ3NTA2OH0.5R0I5VvB7lp3wpSrtay3DMcXKsT9l1uK0Ukd1F4_ImM'

  let phase = 'idle'  // idle | filled-creds | otp | done
  let loginAttemptedAt = 0

  function setNativeValue(el, value) {
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set
    setter.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }

  async function fetchLatestOtp() {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_latest_muqeem_otp`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ since_seconds: 120 }),
      })
      if (!r.ok) return null
      const v = await r.json()
      return typeof v === 'string' ? v : null
    } catch { return null }
  }

  function findUsernameInput() {
    const all = [...document.querySelectorAll('input')].filter(i => i.offsetParent && i.type !== 'hidden')
    return all.find(i => /username|userid|user-name|user_id|nationalid|loginid/i.test(`${i.id} ${i.name} ${i.formControlName||''}`))
        || all.find(i => /اسم|مستخدم|هوية/.test(i.placeholder || ''))
        || all.find(i => i.type === 'text' || i.type === 'tel' || i.type === 'number')
        || null
  }
  function findPasswordInput() { return document.querySelector('input[type="password"]') }
  function findOtpInput() {
    const all = [...document.querySelectorAll('input')].filter(i => i.offsetParent && i.type !== 'hidden' && i.type !== 'password')
    return all.find(i => /otp|verify|verification|code|2fa/i.test(`${i.id} ${i.name} ${i.formControlName||''} ${i.placeholder||''}`))
        || all.find(i => /رمز|التحقق|otp|كود/i.test(i.placeholder || ''))
        || all.find(i => i.maxLength >= 4 && i.maxLength <= 8 && /\d/.test(i.value || ''))
        || null
  }
  function findSubmitButton(matchTexts) {
    const re = new RegExp(matchTexts.join('|'), 'i')
    const buttons = [...document.querySelectorAll('button, input[type="submit"]')].filter(b => b.offsetParent && !b.disabled)
    return buttons.find(b => re.test(b.textContent || b.value || ''))
        || buttons.find(b => b.type === 'submit')
        || null
  }

  async function tryLogin() {
    if (phase !== 'idle') return
    const cfg = await chrome.storage.local.get(['autoLogin', 'username', 'password'])
    if (!cfg.autoLogin || !cfg.username || !cfg.password) return
    const pwd = findPasswordInput()
    if (!pwd) return
    const usr = findUsernameInput()
    if (!usr || usr === pwd) return
    if (Date.now() - loginAttemptedAt < 10_000) return
    loginAttemptedAt = Date.now()
    console.log('[Jisr] Filling login form')
    setNativeValue(usr, cfg.username)
    setNativeValue(pwd, cfg.password)
    phase = 'filled-creds'
    await new Promise(r => setTimeout(r, 700))
    const btn = findSubmitButton(['دخول', 'login', 'تسجيل الدخول', 'sign in'])
    if (btn) { console.log('[Jisr] Clicking login button'); btn.click() }
    else console.warn('[Jisr] No login button found')
  }

  async function tryOtp() {
    if (phase === 'otp' || phase === 'done') return
    const otpInput = findOtpInput()
    if (!otpInput) return
    if (findPasswordInput()) return  // still on creds page
    phase = 'otp'
    console.log('[Jisr] OTP page detected, polling for code...')
    let code = null
    const start = Date.now()
    while (Date.now() - start < 90_000) {
      code = await fetchLatestOtp()
      if (code && code.length >= 4) break
      await new Promise(r => setTimeout(r, 3000))
    }
    if (!code) { console.warn('[Jisr] OTP not received within 90s'); phase = 'idle'; return }
    console.log('[Jisr] Got OTP, filling')
    setNativeValue(otpInput, code)
    await new Promise(r => setTimeout(r, 600))
    const btn = findSubmitButton(['تحقق', 'تأكيد', 'verify', 'confirm', 'continue', 'متابعة', 'دخول', 'submit'])
    if (btn) { console.log('[Jisr] Clicking OTP submit'); btn.click() }
    else { console.log('[Jisr] No OTP submit button — pressing Enter'); otpInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true })) }
    phase = 'done'
    // Trigger an API call so background captures the JWT
    setTimeout(() => {
      try { location.hash = '#/enquiry-services/search-unsponsored-resident' } catch {}
    }, 4000)
  }

  function tick() {
    try {
      tryLogin()
      tryOtp()
    } catch (e) { console.warn('[Jisr] tick error', e) }
  }

  setInterval(tick, 1500)
  setTimeout(tick, 800)
  console.log('[Jisr] Auto-login monitor active')
})()
