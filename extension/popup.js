const PASSWORD_PLACEHOLDER = '••••••••'

async function render() {
  const data = await chrome.storage.local.get(['lastSync', 'sessionExp', 'moiNumber', 'lastError', 'autoLogin'])
  const status = document.getElementById('status')
  const info = document.getElementById('info')

  const now = Math.floor(Date.now() / 1000)
  const valid = data.sessionExp && data.sessionExp > now
  const remainingMin = valid ? Math.floor((data.sessionExp - now) / 60) : 0
  const remainingSec = valid ? (data.sessionExp - now) % 60 : 0

  if (data.lastError && (!valid || (Date.now() - (data.lastSync || 0)) > 60_000)) {
    status.className = 'status err'
    status.textContent = '✗ ' + data.lastError
  } else if (valid) {
    status.className = 'status ok'
    status.textContent = `✓ الجلسة نشطة — ${remainingMin}:${String(remainingSec).padStart(2,'0')} متبقية`
  } else if (data.lastSync) {
    status.className = 'status warn'
    status.textContent = data.autoLogin ? '⚠ الجلسة منتهية — جاري إعادة الدخول تلقائياً' : '⚠ انتهت الجلسة — افتح مقيم وسجّل دخول'
  } else {
    status.className = 'status warn'
    status.textContent = data.autoLogin ? '⚠ في انتظار أول دخول تلقائي' : '⚠ في انتظار أول مزامنة — افتح مقيم وسجّل دخول'
  }

  const rows = []
  if (data.moiNumber) rows.push(`<div class="row"><span>اسم المستخدم</span><span dir="ltr">${data.moiNumber}</span></div>`)
  if (data.lastSync) {
    const ago = Math.floor((Date.now() - data.lastSync) / 1000)
    const agoTxt = ago < 60 ? `${ago}ث` : ago < 3600 ? `${Math.floor(ago/60)}د` : `${Math.floor(ago/3600)}س`
    rows.push(`<div class="row"><span>آخر مزامنة</span><span>منذ ${agoTxt}</span></div>`)
  }
  if (valid) {
    const expDate = new Date(data.sessionExp * 1000)
    rows.push(`<div class="row"><span>انتهاء الصلاحية</span><span dir="ltr">${expDate.toLocaleTimeString('ar-SA')}</span></div>`)
  }
  rows.push(`<div class="row"><span>الدخول التلقائي</span><span>${data.autoLogin ? '✓ مفعّل' : '— معطّل'}</span></div>`)
  info.innerHTML = rows.join('')
}

async function loadCreds() {
  const c = await chrome.storage.local.get(['username', 'password', 'autoLogin'])
  if (c.username) document.getElementById('username').value = c.username
  if (c.password) document.getElementById('password').value = PASSWORD_PLACEHOLDER
  document.getElementById('autoLogin').checked = !!c.autoLogin
}

async function saveCreds() {
  const u = document.getElementById('username').value.trim()
  const p = document.getElementById('password').value
  const a = document.getElementById('autoLogin').checked
  const updates = { autoLogin: a }
  if (u) updates.username = u
  if (p && p !== PASSWORD_PLACEHOLDER) updates.password = p
  await chrome.storage.local.set(updates)
  const sv = document.getElementById('saveStatus')
  sv.textContent = '✓ تم الحفظ'
  setTimeout(() => { sv.textContent = '' }, 2500)
  render()
}

document.getElementById('openMuqeem').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://muqeem.sa/' })
  window.close()
})
document.getElementById('loginNow').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'TRIGGER_LOGIN' })
  setTimeout(render, 600)
})
document.getElementById('saveCreds').addEventListener('click', saveCreds)

loadCreds()
render()
setInterval(render, 1000)
