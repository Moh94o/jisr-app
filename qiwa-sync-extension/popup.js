const runBtn = document.getElementById('run')
const logEl = document.getElementById('log')

function line(text) {
  // Keep only the most recent lines so the popup stays readable during a long sweep.
  const prev = logEl.textContent ? logEl.textContent.split('\n') : []
  prev.push(text)
  logEl.textContent = prev.slice(-40).join('\n')
  logEl.scrollTop = logEl.scrollHeight
}

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg) return
  if (msg.type === 'qiwa-progress') line(msg.text)
  if (msg.type === 'qiwa-done') {
    runBtn.disabled = false
    runBtn.textContent = 'مزامنة كل المنشآت'
    line(msg.ok === false ? '— توقفت المزامنة —' : '✅ انتهت المزامنة')
  }
})

runBtn.addEventListener('click', () => {
  runBtn.disabled = true
  runBtn.textContent = 'جارٍ المزامنة…'
  logEl.textContent = ''
  line('بدء المزامنة…')
  chrome.runtime.sendMessage({ type: 'qiwa-start' }, (resp) => {
    if (chrome.runtime.lastError) {
      line('❌ ' + chrome.runtime.lastError.message)
      runBtn.disabled = false
      runBtn.textContent = 'مزامنة كل المنشآت'
      return
    }
    if (resp && resp.ok === false) {
      line('⚠️ ' + (resp.error || 'تعذّر البدء'))
      runBtn.disabled = false
      runBtn.textContent = 'مزامنة كل المنشآت'
    }
  })
})
