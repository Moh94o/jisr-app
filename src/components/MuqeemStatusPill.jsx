import React, { useState, useEffect, useRef, useCallback } from 'react'

/* مؤشّر اتصال مقيم في الشريط العلوي.
   الحالة تُقرأ من `get_muqeem_status()` على مشروع الإنتاج مباشرةً (نفس نمط query-muqeem في
   KafalaCalculator — البوت يدفع جلسته للإنتاج وحده، فيعمل المؤشّر من أي بيئة):
   متصل = جلسة البوت موجودة والـJWT لم ينتهِ. النقر وهو غير متصل يطلب من البوت دخولاً فورياً
   (`request_muqeem_reconnect`) ثم يستطلع كل 10ث حتى يعود الاتصال أو تمضي ~3 دقائق. */
const PROD = 'https://gcvshzutdslmdkwqwteh.supabase.co/rest/v1/rpc/'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdnNoenV0ZHNsbWRrd3F3dGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTkwNjgsImV4cCI6MjA5MDQ3NTA2OH0.5R0I5VvB7lp3wpSrtay3DMcXKsT9l1uK0Ukd1F4_ImM'
const rpc = (fn) => fetch(PROD + fn, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}` }, body: '{}' })
const POLL_MS = 60_000, FAST_MS = 10_000, FAST_MAX = 18

export default function MuqeemStatusPill({ lang }) {
  const T = (a, e) => lang === 'ar' ? a : e
  const [st, setSt] = useState(null) // null = لم يُحمَّل بعد
  const [busy, setBusy] = useState(false)
  const fastLeft = useRef(0)

  const load = useCallback(async () => {
    try {
      const r = await rpc('get_muqeem_status')
      if (!r.ok) throw new Error(r.status)
      const j = await r.json()
      setSt(j)
      if (j?.connected) { fastLeft.current = 0; setBusy(false) }
    } catch { setSt(s => s || { connected: false, error: true }) }
  }, [])

  useEffect(() => {
    load()
    let t
    const loop = () => {
      const fast = fastLeft.current > 0
      t = setTimeout(async () => {
        if (fast) { fastLeft.current--; if (!fastLeft.current) setBusy(false) }
        if (document.visibilityState === 'visible' || fast) await load()
        loop()
      }, fast ? FAST_MS : POLL_MS)
    }
    loop()
    const onVis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearTimeout(t); document.removeEventListener('visibilitychange', onVis) }
  }, [load])

  const reconnect = async () => {
    if (busy || st?.connected) return
    setBusy(true); fastLeft.current = FAST_MAX
    try { await rpc('request_muqeem_reconnect') } catch { /* أفضل جهد */ }
    load()
  }

  const on = !!st?.connected
  const loading = st === null
  const clr = loading ? 'var(--hdtx2)' : on ? '#27a046' : busy ? '#c98a00' : '#c0392b'
  const label = loading ? '…' : on ? T('متصل', 'Connected') : busy ? T('جاري الاتصال…', 'Connecting…') : T('غير متصل', 'Offline')
  const upd = st?.updated_at ? new Date(st.updated_at) : null
  const pad = n => String(n).padStart(2, '0')
  const updTxt = upd ? `${upd.getFullYear()}-${pad(upd.getMonth() + 1)}-${pad(upd.getDate())} ${pad(upd.getHours())}:${pad(upd.getMinutes())}` : ''
  const title = [
    T('خدمة مقيم', 'Muqeem service') + ': ' + label,
    updTxt && T('آخر جلسة: ', 'Last session: ') + updTxt,
    !on && !busy && !loading && T('انقر لإعادة الاتصال', 'Click to reconnect'),
  ].filter(Boolean).join('\n')

  /* زرّ أيقونة بطاقة داخل كبسولة (مثل اللغة/الخروج)، والنقطة الملوّنة على زاويتها = الحالة؛ النص في التلميح */
  return <div onClick={reconnect} title={title} style={{ display: 'inline-flex', alignItems: 'center', padding: 3, borderRadius: 10, background: 'var(--hoverBg)', border: '1px solid var(--bd)', flexShrink: 0, cursor: on || busy || loading ? 'default' : 'pointer', transition: '.18s' }}
    onMouseEnter={e => { e.currentTarget.firstChild.style.background = 'var(--hd-ico-hv-bg)' }} onMouseLeave={e => { e.currentTarget.firstChild.style.background = 'transparent' }}>
    <span style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: '.18s' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(176,125,0,.72)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="5" width="18" height="14" rx="2.5" /><circle cx="9" cy="11" r="2.2" /><path d="M5.8 16c.6-1.6 1.8-2.4 3.2-2.4s2.6.8 3.2 2.4M14.5 10h4M14.5 13.5h3" /></svg>
      <span style={{ position: 'absolute', top: 5, insetInlineEnd: 4, width: 8, height: 8, borderRadius: '50%', background: clr, border: '1.5px solid var(--sb)', animation: busy ? 'breathe 1.2s ease-in-out infinite' : 'none' }} />
    </span>
  </div>
}
