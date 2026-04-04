import React, { useState, useEffect, useCallback } from 'react'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#c9a84c', ok: '#27a046', red: '#c0392b', blue: '#3483b4' }
const OTP_TTL = 300 // 5 minutes

// Service detection from sender
function detectService(sender) {
  const s = (sender || '').toLowerCase()
  if (s.includes('moi') || s.includes('absher') || s.includes('gov') || s.includes('nafath') || s.includes('tawakkalna') || s.includes('qiwa') || s.includes('muqeem') || s.includes('gosi') || s.includes('mol'))
    return { name: s.includes('absher') ? 'أبشر' : s.includes('nafath') ? 'نفاذ' : s.includes('qiwa') ? 'قوى' : s.includes('muqeem') ? 'مقيم' : s.includes('gosi') ? 'التأمينات' : s.includes('mol') ? 'وزارة العمل' : 'وزارة الداخلية', domain: 'MOI.GOV.SA', cat: 'gov', color: '#1abc9c' }
  if (s.includes('bank') || s.includes('rajhi') || s.includes('ahli') || s.includes('sab') || s.includes('riyad') || s.includes('bilad') || s.includes('jazira') || s.includes('inma') || s.includes('stc pay') || s.includes('pay') || s.includes('mada'))
    return { name: s.includes('rajhi') ? 'الراجحي' : s.includes('ahli') ? 'الأهلي' : s.includes('riyad') ? 'بنك الرياض' : s.includes('bilad') ? 'بنك البلاد' : s.includes('stc') ? 'STC Pay' : 'بنك', domain: 'BANK', cat: 'bank', color: '#e67e22' }
  return { name: sender || 'غير معروف', domain: sender || '', cat: 'other', color: '#9b59b6' }
}

export default function OTPMessages({ sb, toast, user, lang }) {
  const T = (a, e) => (lang || 'ar') !== 'en' ? a : e
  const [persons, setPersons] = useState([])
  const [messages, setMessages] = useState([])
  const [selPerson, setSelPerson] = useState('all')
  const [filter, setFilter] = useState('all') // all | gov | bank | expired
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', phone: '', group_name: '' })
  const [saving, setSaving] = useState(false)
  const [showSettings, setShowSettings] = useState(null)
  const [now, setNow] = useState(Date.now())

  // Tick every second for countdown
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const [p, m] = await Promise.all([
      sb.from('otp_persons').select('*').order('created_at'),
      sb.from('otp_messages').select('*').order('received_at', { ascending: false }).limit(200)
    ])
    setPersons(p.data || [])
    setMessages(m.data || [])
    setLoading(false)
  }, [sb])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission()
  }, [])

  const sendBrowserNotif = (msg) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const svc = detectService(msg.phone_from)
      new Notification(msg.otp_code ? `رمز تحقق: ${msg.otp_code}` : 'رسالة جديدة', {
        body: `${msg.person_name || ''} — ${svc.name}\n${msg.message_body?.substring(0, 80) || ''}`,
        icon: '/icons/icon-192.png', tag: msg.id, requireInteraction: true
      })
    }
  }

  // Auto-refresh
  useEffect(() => {
    const prevIds = new Set(messages.map(m => m.id))
    const interval = setInterval(() => {
      sb.from('otp_messages').select('*').order('received_at', { ascending: false }).limit(200).then(({ data }) => {
        if (data && data.length > messages.length) {
          data.forEach(m => { if (!prevIds.has(m.id)) { sendBrowserNotif(m); toast && toast(`${m.person_name}: ${m.otp_code || 'جديد'} — ${detectService(m.phone_from).name}`) } })
          setMessages(data)
        }
      })
    }, 10000)
    return () => clearInterval(interval)
  }, [sb, messages.length])

  useEffect(() => {
    if (!sb) return
    const ch = sb.channel('otp-realtime').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'otp_messages' }, payload => {
      setMessages(prev => [payload.new, ...prev]); sendBrowserNotif(payload.new)
    }).subscribe()
    return () => { sb.removeChannel(ch) }
  }, [sb])

  // Helpers
  const getTimeLeft = (receivedAt) => {
    if (!receivedAt) return -1
    return OTP_TTL - Math.floor((now - new Date(receivedAt).getTime()) / 1000)
  }
  const formatCountdown = (s) => { if (s <= 0) return ''; const m = Math.floor(s / 60); const sec = s % 60; return `${m}:${String(sec).padStart(2, '0')}` }
  const isExpired = (m) => m.otp_code && getTimeLeft(m.received_at) <= 0
  const expiredCount = messages.filter(m => isExpired(m)).length

  const copyCode = (code) => { navigator.clipboard.writeText(code); toast && toast(T('تم نسخ الرمز', 'Copied')) }
  const markRead = async (id) => { await sb.from('otp_messages').update({ is_read: true }).eq('id', id); setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m)) }
  const deleteMsg = async (id) => { await sb.from('otp_messages').delete().eq('id', id); setMessages(prev => prev.filter(m => m.id !== id)); toast && toast(T('تم الحذف', 'Deleted')) }
  const clearExpired = async () => {
    const expiredIds = messages.filter(m => isExpired(m)).map(m => m.id)
    if (expiredIds.length === 0) return
    for (const id of expiredIds) await sb.from('otp_messages').delete().eq('id', id)
    setMessages(prev => prev.filter(m => !expiredIds.includes(m.id)))
    toast && toast(T(`تم مسح ${expiredIds.length} رسالة منتهية`, `Cleared ${expiredIds.length} expired`))
  }

  const addPerson = async () => {
    if (!addForm.name.trim()) return
    setSaving(true)
    const { error } = await sb.from('otp_persons').insert({ name: addForm.name, phone: addForm.phone || null, group_name: addForm.group_name || null })
    if (error) toast && toast('خطأ: ' + error.message)
    else { toast && toast(T('تمت الإضافة', 'Added')); setShowAdd(false); setAddForm({ name: '', phone: '', group_name: '' }); load() }
    setSaving(false)
  }
  const toggleActive = async (pid) => { const p = persons.find(x => x.id === pid); if (p) { await sb.from('otp_persons').update({ is_active: !p.is_active }).eq('id', pid); load() } }
  const deletePerson = async (id) => { if (!confirm(T('حذف؟', 'Delete?'))) return; await sb.from('otp_messages').delete().eq('person_id', id); await sb.from('otp_persons').delete().eq('id', id); if (selPerson === id) setSelPerson('all'); load() }

  // Filter
  let filtered = selPerson === 'all' ? messages : messages.filter(m => m.person_id === selPerson)
  if (filter === 'gov') filtered = filtered.filter(m => detectService(m.phone_from).cat === 'gov')
  else if (filter === 'bank') filtered = filtered.filter(m => detectService(m.phone_from).cat === 'bank')
  else if (filter === 'expired') filtered = filtered.filter(m => isExpired(m))

  const unreadCount = (pid) => messages.filter(m => (pid === 'all' || m.person_id === pid) && !m.is_read).length
  const sF = { width: '100%', height: 42, padding: '0 14px', border: '1.5px solid rgba(255,255,255,.1)', borderRadius: 10, fontFamily: F, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.85)', outline: 'none', background: 'rgba(255,255,255,.04)', boxSizing: 'border-box' }

  return (
    <div style={{ fontFamily: F, direction: 'rtl' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--tx)' }}>{T('رسائل التحقق', 'OTP Messages')}</div>
          <div style={{ fontSize: 11, color: 'var(--tx5)', marginTop: 4 }}>{T('استقبال وعرض رموز التحقق من جميع الأجهزة', 'Receive and view OTP codes')}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {expiredCount > 0 && <button onClick={clearExpired} style={{ height: 38, padding: '0 14px', borderRadius: 10, border: '1px solid rgba(192,57,43,.15)', background: 'rgba(192,57,43,.06)', color: C.red, fontFamily: F, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{T(`مسح المنتهية (${expiredCount})`, `Clear expired (${expiredCount})`)}</button>}
          <button onClick={load} style={{ height: 38, padding: '0 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)', color: 'var(--tx4)', fontFamily: F, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{T('تحديث', 'Refresh')}</button>
          <button onClick={() => setShowAdd(true)} style={{ height: 38, padding: '0 18px', borderRadius: 10, border: '1px solid rgba(201,168,76,.2)', background: 'rgba(201,168,76,.12)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ {T('إضافة شخص', 'Add Person')}</button>
        </div>
      </div>

      {/* Person tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4 }}>
        <button onClick={() => setSelPerson('all')} style={{ padding: '7px 14px', borderRadius: 10, fontSize: 11, fontWeight: selPerson === 'all' ? 700 : 500, color: selPerson === 'all' ? C.gold : 'rgba(255,255,255,.35)', background: selPerson === 'all' ? 'rgba(201,168,76,.1)' : 'rgba(255,255,255,.02)', border: selPerson === 'all' ? '1.5px solid rgba(201,168,76,.2)' : '1.5px solid rgba(255,255,255,.06)', cursor: 'pointer', fontFamily: F, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
          {T('الكل', 'All')} ({messages.length})
        </button>
        {persons.map(p => (
          <button key={p.id} onClick={() => setSelPerson(p.id)} style={{ padding: '7px 14px', borderRadius: 10, fontSize: 11, fontWeight: selPerson === p.id ? 700 : 500, color: selPerson === p.id ? C.gold : 'rgba(255,255,255,.35)', background: selPerson === p.id ? 'rgba(201,168,76,.1)' : 'rgba(255,255,255,.02)', border: selPerson === p.id ? '1.5px solid rgba(201,168,76,.2)' : '1.5px solid rgba(255,255,255,.06)', cursor: 'pointer', fontFamily: F, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, opacity: p.is_active ? 1 : .5 }}>
            {p.name}
            {unreadCount(p.id) > 0 && <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 6, background: C.red, color: '#fff' }}>{unreadCount(p.id)}</span>}
          </button>
        ))}
      </div>

      {/* Category filters */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {[{ v: 'all', l: T('الكل', 'All'), c: C.gold }, { v: 'gov', l: T('حكومي', 'Gov'), c: '#1abc9c' }, { v: 'bank', l: T('بنكي', 'Bank'), c: '#e67e22' }, { v: 'expired', l: T(`منتهية (${expiredCount})`, `Expired (${expiredCount})`), c: C.red }].map(f2 => (
          <button key={f2.v} onClick={() => setFilter(f2.v)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 10, fontWeight: filter === f2.v ? 700 : 500, color: filter === f2.v ? f2.c : 'rgba(255,255,255,.3)', background: filter === f2.v ? f2.c + '12' : 'transparent', border: '1px solid ' + (filter === f2.v ? f2.c + '25' : 'rgba(255,255,255,.06)'), cursor: 'pointer', fontFamily: F }}>{f2.l}</button>
        ))}
      </div>

      {/* Settings */}
      {selPerson !== 'all' && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <button onClick={() => setShowSettings(showSettings === selPerson ? null : selPerson)} style={{ height: 28, padding: '0 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)', color: 'var(--tx5)', fontFamily: F, fontSize: 9, fontWeight: 600, cursor: 'pointer' }}>{T('إعدادات', 'Settings')}</button>
          <button onClick={() => toggleActive(selPerson)} style={{ height: 28, padding: '0 10px', borderRadius: 6, border: '1px solid ' + (persons.find(p => p.id === selPerson)?.is_active ? 'rgba(39,160,70,.15)' : 'rgba(192,57,43,.15)'), background: persons.find(p => p.id === selPerson)?.is_active ? 'rgba(39,160,70,.06)' : 'rgba(192,57,43,.06)', color: persons.find(p => p.id === selPerson)?.is_active ? C.ok : C.red, fontFamily: F, fontSize: 9, fontWeight: 600, cursor: 'pointer' }}>{persons.find(p => p.id === selPerson)?.is_active ? T('نشط', 'Active') : T('معطّل', 'Off')}</button>
          <button onClick={() => deletePerson(selPerson)} style={{ height: 28, padding: '0 10px', borderRadius: 6, border: '1px solid rgba(192,57,43,.12)', background: 'rgba(192,57,43,.04)', color: C.red, fontFamily: F, fontSize: 9, fontWeight: 600, cursor: 'pointer' }}>{T('حذف', 'Delete')}</button>
        </div>
      )}
      {showSettings && (() => {
        const person = persons.find(p => p.id === showSettings)
        if (!person) return null
        return <div style={{ marginBottom: 12, padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)', fontSize: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, marginBottom: 6 }}>{person.name}</div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}><span style={{ color: 'var(--tx5)' }}>Key:</span><code style={{ fontSize: 8, color: C.gold, direction: 'ltr' }}>{person.device_key}</code><button onClick={() => { navigator.clipboard.writeText(person.device_key); toast && toast(T('تم النسخ', 'Copied')) }} style={{ fontSize: 8, color: 'var(--tx5)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>{T('نسخ', 'Copy')}</button></div>
          <div style={{ color: 'var(--tx6)', fontSize: 8, direction: 'ltr' }}>POST https://gcvshzutdslmdkwqwteh.supabase.co/functions/v1/receive-otp</div>
        </div>
      })()}

      {/* Messages */}
      {loading ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--tx5)' }}>...</div> :
        filtered.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--tx6)' }}>{T('لا توجد رسائل', 'No messages')}</div> :
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(m => {
              const svc = detectService(m.phone_from)
              const tl = m.otp_code ? getTimeLeft(m.received_at) : -1
              const exp = tl <= 0 && m.otp_code
              const expColor = tl > 120 ? C.ok : tl > 60 ? '#e67e22' : C.red

              return (
                <div key={m.id} onClick={() => !m.is_read && markRead(m.id)} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid ' + (exp ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)'), opacity: exp ? .5 : 1, transition: '.2s' }}>
                  {/* Top section: service info */}
                  <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,.025)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: svc.color + '15', border: '1px solid ' + svc.color + '25', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: svc.color }}>{svc.name[0]}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{svc.name}</div>
                        <div style={{ fontSize: 9, color: 'var(--tx5)', direction: 'ltr' }}>{svc.domain}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 9, color: 'var(--tx6)' }}>{m.received_at ? new Date(m.received_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      {m.otp_code && tl > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: expColor + '12', color: expColor, border: '1px solid ' + expColor + '20' }}>{T('ينتهي خلال', 'Expires')} {formatCountdown(tl)}</span>}
                      {exp && <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'rgba(192,57,43,.08)', color: C.red }}>{T('انتهت الصلاحية', 'Expired')}</span>}
                      {!m.is_read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.gold }} />}
                    </div>
                  </div>

                  {/* Bottom section: OTP code + actions */}
                  <div style={{ padding: '12px 16px', background: 'rgba(0,0,0,.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {/* Person badge */}
                      <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: 'rgba(201,168,76,.08)', color: C.gold, border: '1px solid rgba(201,168,76,.1)' }}>{m.person_name}</span>
                      {!m.otp_code && <span style={{ fontSize: 11, color: 'var(--tx4)' }}>{m.message_body?.substring(0, 60)}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {m.otp_code && (
                        <>
                          {/* OTP digits */}
                          <div style={{ display: 'flex', gap: 4, direction: 'ltr' }}>
                            {m.otp_code.split('').map((d, i) => (
                              <div key={i} style={{ width: 34, height: 42, borderRadius: 8, background: exp ? 'rgba(255,255,255,.03)' : 'rgba(39,160,70,.08)', border: '1.5px solid ' + (exp ? 'rgba(255,255,255,.06)' : 'rgba(39,160,70,.15)'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: exp ? 'var(--tx6)' : C.ok, fontFamily: 'monospace' }}>{d}</div>
                            ))}
                          </div>
                          {!exp && <button onClick={e => { e.stopPropagation(); copyCode(m.otp_code) }} style={{ height: 36, padding: '0 12px', borderRadius: 8, border: '1px solid rgba(39,160,70,.15)', background: 'rgba(39,160,70,.06)', color: C.ok, fontFamily: F, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>{T('نسخ', 'Copy')}</button>}
                        </>
                      )}
                      <button onClick={e => { e.stopPropagation(); deleteMsg(m.id) }} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.03)', color: 'var(--tx5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>×</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
      }

      {/* Add Person Modal */}
      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a1a', borderRadius: 16, width: 'min(440px,92vw)', overflow: 'hidden', border: '1px solid rgba(201,168,76,.12)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>{T('إضافة شخص', 'Add Person')}</div>
              <button onClick={() => setShowAdd(false)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', color: 'var(--tx4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12, direction: 'rtl' }}>
              <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx4)', marginBottom: 6 }}>{T('الاسم', 'Name')} *</div><input value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} style={sF} /></div>
              <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx4)', marginBottom: 6 }}>{T('رقم الجوال', 'Phone')}</div><input value={addForm.phone} onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))} style={{ ...sF, direction: 'ltr' }} /></div>
              <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx4)', marginBottom: 6 }}>{T('المجموعة', 'Group')}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['الإدارة', 'الموظفين'].map(g => <button key={g} onClick={() => setAddForm(p => ({ ...p, group_name: g }))} style={{ flex: 1, height: 40, borderRadius: 8, border: '1.5px solid ' + (addForm.group_name === g ? 'rgba(201,168,76,.3)' : 'rgba(255,255,255,.06)'), background: addForm.group_name === g ? 'rgba(201,168,76,.1)' : 'transparent', color: addForm.group_name === g ? C.gold : 'var(--tx5)', fontFamily: F, fontSize: 12, fontWeight: addForm.group_name === g ? 700 : 500, cursor: 'pointer' }}>{g}</button>)}
                </div>
              </div>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', justifyContent: 'flex-start' }}>
              <button onClick={addPerson} disabled={saving} style={{ height: 40, padding: '0 24px', borderRadius: 10, border: '1px solid rgba(201,168,76,.2)', background: 'rgba(201,168,76,.12)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? .6 : 1 }}>{saving ? '...' : T('إضافة', 'Add')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
