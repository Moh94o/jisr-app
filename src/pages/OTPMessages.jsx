import React, { useState, useEffect, useCallback } from 'react'
import { detectService } from './serviceConfig.js'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#c9a84c', ok: '#27a046', red: '#c0392b', blue: '#3483b4' }
const OTP_TTL = 300

// SVG logo renderer
const SvcLogo = ({ sender, size = 40 }) => {
  const svc = detectService(sender)
  return <div style={{ width: size, height: size, flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: svc.logo ? svc.logo(size) : `<svg width="${size}" height="${size}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="${svc.color}18"/><text x="20" y="26" text-anchor="middle" font-size="18" font-weight="900" fill="${svc.color}" font-family="Arial">${(svc.name||'?')[0]}</text></svg>` }} />
}

export default function OTPMessages({ sb, toast, user, lang }) {
  const T = (a, e) => (lang || 'ar') !== 'en' ? a : e
  const [persons, setPersons] = useState([])
  const [messages, setMessages] = useState([])
  const [selPerson, setSelPerson] = useState('all')
  const [filter, setFilter] = useState('all') // all | gov | bank | expired
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', name_en: '', phone: '', role: 'employee', default_senders: [] })
  const [saving, setSaving] = useState(false)
  const [showSettings, setShowSettings] = useState(null)
  const [addStep, setAddStep] = useState(0)
  const [createdPerson, setCreatedPerson] = useState(null)
  const [permissions, setPermissions] = useState([])
  const [showPermEdit, setShowPermEdit] = useState(null) // message id
  const [permEdit, setPermEdit] = useState({}) // { personId: bool }
  const [now, setNow] = useState(Date.now())

  // Tick every second for countdown
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const [p, m, perm] = await Promise.all([
      sb.from('otp_persons').select('*').order('created_at'),
      sb.from('otp_messages').select('*').order('received_at', { ascending: false }).limit(200),
      sb.from('otp_permissions').select('*')
    ])
    setPersons(p.data || [])
    setMessages(m.data || [])
    setPermissions(perm.data || [])
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
    const groupMap = { admin: 'الإدارة', pro: 'الإدارة', employee: 'الموظفين' }
    const { data: created, error } = await sb.from('otp_persons').insert({
      name: addForm.name, name_en: addForm.name_en || null, phone: addForm.phone || null,
      role: addForm.role, group_name: groupMap[addForm.role] || 'الموظفين',
      default_senders: addForm.default_senders
    }).select('*').single()
    if (error) toast && toast('خطأ: ' + error.message)
    else {
      // Create default permission with selected senders
      await sb.from('otp_permissions').insert({ person_id: created.id, allowed_senders: addForm.default_senders.length > 0 ? addForm.default_senders : ['*'] })
      setCreatedPerson(created); setAddStep(1); load()
    }
    setSaving(false)
  }
  const closeAdd = () => { setShowAdd(false); setAddStep(0); setCreatedPerson(null); setAddForm({ name: '', name_en: '', phone: '', role: 'employee', default_senders: [] }); setSetupStep(0) }
  const [setupStep, setSetupStep] = useState(0)
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
                      <SvcLogo sender={m.phone_from} size={34} />
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

                  {/* Permissions bar */}
                  {m.otp_code && (()=>{
                    const msgPerms = permissions.filter(p => {
                      if (!p.is_active) return false
                      const senders = p.allowed_senders || []
                      return senders.includes('*') || senders.some(s => (m.phone_from||'').toLowerCase().includes(s.toLowerCase()))
                    })
                    const permPersonIds = msgPerms.map(p => p.person_id)
                    return <div style={{ padding: '8px 16px', background: 'rgba(255,255,255,.015)', borderTop: '1px solid rgba(255,255,255,.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 9, color: 'var(--tx6)', marginLeft: 4 }}>{T('يرى الرمز:', 'Sees code:')}</span>
                        {persons.filter(p => permPersonIds.includes(p.id)).map(p => (
                          <span key={p.id} style={{ fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'rgba(39,160,70,.08)', color: C.ok, border: '1px solid rgba(39,160,70,.1)' }}>{p.name}{p.group_name === 'الإدارة' ? ' (أدمن)' : ''}</span>
                        ))}
                        {permPersonIds.length === 0 && <span style={{ fontSize: 9, color: 'var(--tx6)' }}>{T('لا أحد', 'None')}</span>}
                      </div>
                      <button onClick={e => { e.stopPropagation(); setShowPermEdit(showPermEdit === m.id ? null : m.id); setPermEdit(Object.fromEntries(persons.map(p => [p.id, permPersonIds.includes(p.id)]))) }} style={{ height: 26, padding: '0 10px', borderRadius: 6, border: '1px solid rgba(201,168,76,.1)', background: 'rgba(201,168,76,.04)', color: C.gold, fontFamily: F, fontSize: 9, fontWeight: 600, cursor: 'pointer' }}>{T('تعديل', 'Edit')}</button>
                    </div>
                  })()}

                  {/* Inline permissions editor */}
                  {showPermEdit === m.id && <div style={{ padding: '10px 16px', background: 'rgba(201,168,76,.02)', borderTop: '1px solid rgba(201,168,76,.06)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                      {persons.map(p => (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 8, background: permEdit[p.id] ? 'rgba(39,160,70,.04)' : 'rgba(255,255,255,.02)', border: '1px solid ' + (permEdit[p.id] ? 'rgba(39,160,70,.08)' : 'rgba(255,255,255,.03)') }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: permEdit[p.id] ? 'var(--tx)' : 'var(--tx5)' }}>{p.name}</span>
                          <button onClick={() => setPermEdit(prev => ({ ...prev, [p.id]: !prev[p.id] }))} style={{ width: 38, height: 22, borderRadius: 11, border: 'none', background: permEdit[p.id] ? C.ok : 'rgba(255,255,255,.1)', cursor: 'pointer', position: 'relative', transition: '.2s' }}>
                            <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, transition: '.2s', ...(permEdit[p.id] ? { right: 3 } : { left: 3 }) }} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button onClick={async () => {
                      const sender = (m.phone_from || '').toLowerCase()
                      for (const p of persons) {
                        const existing = permissions.find(pm => pm.person_id === p.id)
                        if (permEdit[p.id]) {
                          if (existing) {
                            const senders = existing.allowed_senders || []
                            if (!senders.includes('*') && !senders.includes(sender)) {
                              await sb.from('otp_permissions').update({ allowed_senders: [...senders, sender], updated_at: new Date().toISOString() }).eq('id', existing.id)
                            }
                          } else {
                            await sb.from('otp_permissions').insert({ person_id: p.id, allowed_senders: [sender] })
                          }
                        }
                      }
                      setShowPermEdit(null); load(); toast && toast(T('تم حفظ الصلاحيات', 'Permissions saved'))
                    }} style={{ width: '100%', height: 34, borderRadius: 8, border: '1px solid rgba(201,168,76,.2)', background: 'rgba(201,168,76,.1)', color: C.gold, fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{T('حفظ الصلاحيات', 'Save Permissions')}</button>
                  </div>}
                </div>
              )
            })}
          </div>
      }

      {/* Add Person Modal */}
      {showAdd && (()=>{
        const SENDERS = [{k:'qiwa',l:'قوى'},{k:'nafath',l:'نفاذ'},{k:'absher',l:'أبشر'},{k:'moi',l:'داخلية'},{k:'mol',l:'وزارة العمل'},{k:'gosi',l:'GOSI'},{k:'muqeem',l:'مقيم'},{k:'tawakkalna',l:'توكلنا'}]
        const ROLES = [{v:'admin',l:'مدير',desc:'صلاحيات كاملة',ic:'♛',c:C.gold},{v:'pro',l:'PRO',desc:'منصات حكومية',ic:'⚙',c:'#9b59b6'},{v:'employee',l:'موظف',desc:'عرض فقط',ic:'👤',c:C.blue}]
        const setupSteps = [
          {t:'حمّل التطبيق',d:'SMS Forwarder من Google Play'},
          {t:'أضف قاعدة جديدة',d:'افتح + → اختر URL → NEXT → NEXT'},
          {t:'الصق الرابط',d:'في حقل URL الصق الرابط التالي'},
          {t:'إعداد القالب',d:'Subject + Text templates'},
          {t:'فعّل التحويل',d:'Auto-forward → Save'},
          {t:'اختبر',d:'أرسل رسالة تجريبية'}
        ]
        const toggleSender = (k) => setAddForm(p => ({ ...p, default_senders: p.default_senders.includes(k) ? p.default_senders.filter(s => s !== k) : [...p.default_senders, k] }))

        return <div onClick={closeAdd} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a1a', borderRadius: 16, width: addStep === 0 ? 'min(480px,94vw)' : 'min(780px,96vw)', height: addStep === 0 ? 'auto' : 'min(600px,88vh)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(201,168,76,.12)', direction: 'rtl', fontFamily: F }}>
            {/* Header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>{addStep === 0 ? T('إضافة شخص جديد', 'Add New Person') : T('إعداد جهاز ' + (createdPerson?.name || ''), 'Device Setup')}</div>
              <button onClick={closeAdd} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', color: 'var(--tx4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>

            {addStep === 0 ? <>
              {/* Step 1: Form */}
              <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1, overflowY: 'auto' }}>
                {/* Name fields: AR + EN */}
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx4)' }}>الاسم *</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: -8 }}>
                  <div>
                    <div style={{ fontSize: 9, color: 'var(--tx6)', marginBottom: 4 }}>بالعربي</div>
                    <input value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} placeholder="محمد العمري" style={sF} />
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: 'var(--tx6)', marginBottom: 4, direction: 'ltr', textAlign: 'left' }}>English — للأنظمة والمنصات</div>
                    <input value={addForm.name_en} onChange={e => setAddForm(p => ({ ...p, name_en: e.target.value }))} placeholder="Mohammed Al-Omari" style={{ ...sF, direction: 'ltr', fontFamily: 'monospace', textAlign: 'left' }} />
                  </div>
                </div>

                {/* Role selector */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx4)', marginBottom: 8 }}>الدور</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {ROLES.map(r => (
                      <button key={r.v} onClick={() => setAddForm(p => ({ ...p, role: r.v }))} style={{ padding: '14px 10px', borderRadius: 10, border: '1.5px solid ' + (addForm.role === r.v ? (r.c || C.gold) + '40' : 'rgba(255,255,255,.06)'), background: addForm.role === r.v ? (r.c || C.gold) + '08' : 'rgba(255,255,255,.02)', cursor: 'pointer', textAlign: 'center', fontFamily: F, transition: '.15s' }}>
                        <div style={{ fontSize: 22, marginBottom: 6 }}>{r.ic}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: addForm.role === r.v ? (r.c || C.gold) : 'var(--tx3)' }}>{r.l}</div>
                        <div style={{ fontSize: 9, color: addForm.role === r.v ? (r.c || C.gold) : 'var(--tx6)', marginTop: 2 }}>{r.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx4)', marginBottom: 6 }}>رقم الجوال <span style={{ fontSize: 9, color: 'var(--tx6)' }}>(اختياري)</span></div>
                  <input value={addForm.phone} onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))} placeholder="05XXXXXXXX" style={{ ...sF, direction: 'ltr' }} />
                </div>

                {/* Default senders */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx4)', marginBottom: 8 }}>يستقبل OTP من:</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {SENDERS.map(s => (
                      <button key={s.k} onClick={() => toggleSender(s.k)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 10, fontWeight: addForm.default_senders.includes(s.k) ? 700 : 500, color: addForm.default_senders.includes(s.k) ? C.ok : 'var(--tx5)', background: addForm.default_senders.includes(s.k) ? 'rgba(39,160,70,.08)' : 'rgba(255,255,255,.02)', border: '1px solid ' + (addForm.default_senders.includes(s.k) ? 'rgba(39,160,70,.15)' : 'rgba(255,255,255,.06)'), cursor: 'pointer', fontFamily: F }}>{s.l}</button>
                    ))}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--tx6)', marginTop: 6 }}>يمكن تعديلها لاحقاً من إعدادات الشخص</div>
                </div>
              </div>
              <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={closeAdd} style={{ height: 44, padding: '0 18px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,.08)', background: 'transparent', color: 'var(--tx4)', fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>إلغاء</button>
                <button onClick={addPerson} disabled={saving || !addForm.name.trim()} style={{ flex: 1, height: 44, borderRadius: 10, border: '1px solid rgba(201,168,76,.2)', background: 'rgba(201,168,76,.12)', color: C.gold, fontFamily: F, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving || !addForm.name.trim() ? .5 : 1 }}>{saving ? '...' : 'التالي — إعداد الجهاز'}</button>
              </div>

            </> : <>
              {/* Step 2: Setup — grid layout */}
              <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Main content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Success banner */}
                  <div style={{ padding: '12px', borderRadius: 10, background: 'rgba(39,160,70,.06)', border: '1px solid rgba(39,160,70,.12)', textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.ok }}>تمت إضافة {createdPerson?.name} بنجاح</div>
                    <div style={{ fontSize: 10, color: 'var(--tx5)', marginTop: 2 }}>اتبع الخطوات الجانبية — الخطوات 1-2 مكتملة</div>
                  </div>

                  {/* Active step content */}
                  {setupStep <= 1 && <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(201,168,76,.03)', border: '1px solid rgba(201,168,76,.08)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, marginBottom: 8 }}>الصق الرابط</div>
                    <div style={{ fontSize: 10, color: 'var(--tx5)', marginBottom: 8 }}>في حقل URL الصق الرابط التالي:</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <code style={{ fontSize: 9, color: C.blue, background: 'rgba(52,131,180,.06)', padding: '8px 12px', borderRadius: 8, direction: 'ltr', wordBreak: 'break-all', flex: 1, border: '1px solid rgba(52,131,180,.1)' }}>https://gcvshzutdslmdkwqwteh.supabase.co/functions/v1/receive-otp</code>
                      <button onClick={() => { navigator.clipboard.writeText('https://gcvshzutdslmdkwqwteh.supabase.co/functions/v1/receive-otp'); toast && toast('تم النسخ'); setSetupStep(Math.max(setupStep, 2)) }} style={{ height: 34, padding: '0 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', color: 'var(--tx3)', fontFamily: F, fontSize: 10, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>نسخ</button>
                    </div>
                  </div>}

                  <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx3)', marginBottom: 10 }}>إعداد القالب</div>
                    {[{ label: 'Subject', value: createdPerson?.device_key || '' }, { label: 'Text', value: '%s|||%m|||%d' }].map((f2, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.04)' }}>
                        <span style={{ fontSize: 10, color: 'var(--tx5)', width: 50, flexShrink: 0 }}>{f2.label}</span>
                        <code style={{ fontSize: 10, color: C.gold, direction: 'ltr', flex: 1, wordBreak: 'break-all', fontWeight: 600 }}>{f2.value}</code>
                        <button onClick={() => { navigator.clipboard.writeText(f2.value); toast && toast('تم النسخ'); setSetupStep(Math.max(setupStep, 3)) }} style={{ height: 30, padding: '0 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', color: 'var(--tx4)', fontFamily: F, fontSize: 9, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>نسخ</button>
                      </div>
                    ))}
                  </div>

                  <div style={{ padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,.015)', border: '1px solid rgba(255,255,255,.04)', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--tx5)', marginBottom: 6 }}>بعد الإعداد اضغط للتحقق</div>
                    <button onClick={() => { setSetupStep(5); toast && toast('اختبر بإرسال رسالة للجوال') }} style={{ height: 36, padding: '0 20px', borderRadius: 8, border: '1px solid rgba(39,160,70,.2)', background: 'rgba(39,160,70,.08)', color: C.ok, fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>اختبر الاتصال</button>
                  </div>
                </div>

                {/* Side panel — steps */}
                <div style={{ width: 220, background: 'rgba(255,255,255,.015)', borderRight: '1px solid rgba(255,255,255,.04)', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 0, flexShrink: 0, overflowY: 'auto' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', marginBottom: 12 }}>خطوات الإعداد</div>
                  {setupSteps.map((s, i) => {
                    const done = i < 2 || i <= setupStep
                    const active = i === Math.min(setupStep, 5)
                    return <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: done ? 'rgba(39,160,70,.12)' : active ? 'rgba(201,168,76,.1)' : 'rgba(255,255,255,.04)', border: '1.5px solid ' + (done ? C.ok : active ? C.gold : 'rgba(255,255,255,.08)'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: done ? C.ok : active ? C.gold : 'var(--tx6)', flexShrink: 0 }}>{done ? '✓' : i + 1}</div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: done || active ? 700 : 500, color: done ? C.ok : active ? C.gold : 'var(--tx5)' }}>{s.t}</div>
                        <div style={{ fontSize: 8, color: 'var(--tx6)' }}>{s.d}</div>
                      </div>
                    </div>
                  })}
                  {/* Progress bar */}
                  <div style={{ marginTop: 'auto', paddingTop: 12 }}>
                    <div style={{ fontSize: 9, color: 'var(--tx6)', marginBottom: 4 }}>الخطوة {Math.min(setupStep + 1, 6)} من 6</div>
                    <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,.06)' }}>
                      <div style={{ width: Math.min((setupStep + 1) / 6 * 100, 100) + '%', height: '100%', borderRadius: 2, background: C.ok, transition: '.3s' }} />
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
                <button onClick={closeAdd} style={{ width: '100%', height: 42, borderRadius: 10, border: '1px solid rgba(39,160,70,.2)', background: 'rgba(39,160,70,.08)', color: C.ok, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>تم — إغلاق</button>
              </div>
            </>}
          </div>
        </div>
      })()}
    </div>
  )
}
