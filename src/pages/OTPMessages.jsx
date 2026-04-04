import React, { useState, useEffect, useCallback } from 'react'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#c9a84c', ok: '#27a046', red: '#c0392b', blue: '#3483b4' }

export default function OTPMessages({ sb, toast, user, lang }) {
  const T = (a, e) => (lang || 'ar') !== 'en' ? a : e

  const [persons, setPersons] = useState([])
  const [messages, setMessages] = useState([])
  const [selPerson, setSelPerson] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', phone: '', group_name: '' })
  const [saving, setSaving] = useState(false)
  const [showSettings, setShowSettings] = useState(null) // person id

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

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      sb.from('otp_messages').select('*').order('received_at', { ascending: false }).limit(200).then(({ data }) => {
        if (data && data.length !== messages.length) {
          setMessages(data)
        }
      })
    }, 10000)
    return () => clearInterval(interval)
  }, [sb, messages.length])

  // Realtime subscription
  useEffect(() => {
    if (!sb) return
    const ch = sb.channel('otp-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'otp_messages' }, payload => {
        setMessages(prev => [payload.new, ...prev])
        toast && toast(T('رسالة تحقق جديدة', 'New OTP message'))
      })
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [sb])

  const filtered = selPerson === 'all' ? messages : messages.filter(m => m.person_id === selPerson)
  const groups = [...new Set(persons.map(p => p.group_name).filter(Boolean))]

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    toast && toast(T('تم نسخ الرمز', 'Code copied'))
  }

  const markRead = async (id) => {
    await sb.from('otp_messages').update({ is_read: true }).eq('id', id)
    setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m))
  }

  const addPerson = async () => {
    if (!addForm.name.trim()) return
    setSaving(true)
    const { error } = await sb.from('otp_persons').insert({
      name: addForm.name,
      phone: addForm.phone || null,
      group_name: addForm.group_name || null
    })
    if (error) toast && toast('خطأ: ' + error.message)
    else { toast && toast(T('تمت الإضافة', 'Added')); setShowAdd(false); setAddForm({ name: '', phone: '', group_name: '' }); load() }
    setSaving(false)
  }

  const toggleAccess = async (personId, userId) => {
    const person = persons.find(p => p.id === personId)
    if (!person) return
    const current = person.access_user_ids || []
    const updated = current.includes(userId) ? current.filter(id => id !== userId) : [...current, userId]
    await sb.from('otp_persons').update({ access_user_ids: updated }).eq('id', personId)
    load()
  }

  const toggleActive = async (personId) => {
    const person = persons.find(p => p.id === personId)
    if (!person) return
    await sb.from('otp_persons').update({ is_active: !person.is_active }).eq('id', personId)
    load()
  }

  const deletePerson = async (id) => {
    if (!confirm(T('حذف؟', 'Delete?'))) return
    await sb.from('otp_messages').delete().eq('person_id', id)
    await sb.from('otp_persons').delete().eq('id', id)
    toast && toast(T('تم الحذف', 'Deleted'))
    if (selPerson === id) setSelPerson('all')
    load()
  }

  const timeAgo = (dt) => {
    if (!dt) return ''
    const diff = Math.floor((Date.now() - new Date(dt).getTime()) / 1000)
    if (diff < 60) return T('الآن', 'now')
    if (diff < 3600) return Math.floor(diff / 60) + T(' د', 'm')
    if (diff < 86400) return Math.floor(diff / 3600) + T(' س', 'h')
    return Math.floor(diff / 86400) + T(' ي', 'd')
  }

  const sF = { width: '100%', height: 42, padding: '0 14px', border: '1.5px solid rgba(255,255,255,.1)', borderRadius: 10, fontFamily: F, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.85)', outline: 'none', background: 'rgba(255,255,255,.04)', boxSizing: 'border-box' }

  const unreadCount = (pid) => messages.filter(m => (pid === 'all' || m.person_id === pid) && !m.is_read).length

  return (
    <div style={{ fontFamily: F, direction: 'rtl' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--tx)' }}>{T('رسائل التحقق', 'OTP Messages')}</div>
          <div style={{ fontSize: 11, color: 'var(--tx5)', marginTop: 4 }}>{T('استقبال وعرض رموز التحقق من جميع الأجهزة', 'Receive and view OTP codes from all devices')}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={load} style={{ height: 38, padding: '0 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)', color: 'var(--tx4)', fontFamily: F, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{T('تحديث', 'Refresh')}</button>
          <button onClick={() => setShowAdd(true)} style={{ height: 38, padding: '0 18px', borderRadius: 10, border: '1px solid rgba(201,168,76,.2)', background: 'rgba(201,168,76,.12)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ {T('إضافة شخص', 'Add Person')}</button>
        </div>
      </div>

      {/* Person tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4 }}>
        <button onClick={() => setSelPerson('all')} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 11, fontWeight: selPerson === 'all' ? 700 : 500, color: selPerson === 'all' ? C.gold : 'rgba(255,255,255,.35)', background: selPerson === 'all' ? 'rgba(201,168,76,.1)' : 'rgba(255,255,255,.02)', border: selPerson === 'all' ? '1.5px solid rgba(201,168,76,.2)' : '1.5px solid rgba(255,255,255,.06)', cursor: 'pointer', fontFamily: F, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
          {T('الكل', 'All')}
          {unreadCount('all') > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8, background: C.red, color: '#fff', minWidth: 16, textAlign: 'center' }}>{unreadCount('all')}</span>}
        </button>
        {persons.map(p => (
          <button key={p.id} onClick={() => setSelPerson(p.id)} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 11, fontWeight: selPerson === p.id ? 700 : 500, color: selPerson === p.id ? C.gold : p.is_active ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.15)', background: selPerson === p.id ? 'rgba(201,168,76,.1)' : 'rgba(255,255,255,.02)', border: selPerson === p.id ? '1.5px solid rgba(201,168,76,.2)' : '1.5px solid rgba(255,255,255,.06)', cursor: 'pointer', fontFamily: F, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, opacity: p.is_active ? 1 : .5 }}>
            {p.name}
            {unreadCount(p.id) > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8, background: C.red, color: '#fff', minWidth: 16, textAlign: 'center' }}>{unreadCount(p.id)}</span>}
          </button>
        ))}
      </div>

      {/* Settings button for selected person */}
      {selPerson !== 'all' && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <button onClick={() => setShowSettings(showSettings === selPerson ? null : selPerson)} style={{ height: 30, padding: '0 12px', borderRadius: 7, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)', color: 'var(--tx5)', fontFamily: F, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>{T('إعدادات', 'Settings')}</button>
          <button onClick={() => toggleActive(selPerson)} style={{ height: 30, padding: '0 12px', borderRadius: 7, border: '1px solid ' + (persons.find(p => p.id === selPerson)?.is_active ? 'rgba(39,160,70,.15)' : 'rgba(192,57,43,.15)'), background: persons.find(p => p.id === selPerson)?.is_active ? 'rgba(39,160,70,.06)' : 'rgba(192,57,43,.06)', color: persons.find(p => p.id === selPerson)?.is_active ? C.ok : C.red, fontFamily: F, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>{persons.find(p => p.id === selPerson)?.is_active ? T('نشط', 'Active') : T('معطّل', 'Disabled')}</button>
          <button onClick={() => deletePerson(selPerson)} style={{ height: 30, padding: '0 12px', borderRadius: 7, border: '1px solid rgba(192,57,43,.12)', background: 'rgba(192,57,43,.04)', color: C.red, fontFamily: F, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>{T('حذف', 'Delete')}</button>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (() => {
        const person = persons.find(p => p.id === showSettings)
        if (!person) return null
        return (
          <div style={{ marginBottom: 14, padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, marginBottom: 8 }}>{T('إعدادات', 'Settings')} — {person.name}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 10 }}>
              <div><span style={{ color: 'var(--tx5)' }}>{T('مفتاح الجهاز:', 'Device Key:')}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <code style={{ fontSize: 9, color: C.gold, background: 'rgba(201,168,76,.06)', padding: '2px 6px', borderRadius: 4, direction: 'ltr', wordBreak: 'break-all' }}>{person.device_key}</code>
                  <button onClick={() => { navigator.clipboard.writeText(person.device_key); toast && toast(T('تم النسخ', 'Copied')) }} style={{ fontSize: 8, color: 'var(--tx5)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>{T('نسخ', 'Copy')}</button>
                </div>
              </div>
              <div><span style={{ color: 'var(--tx5)' }}>{T('الجوال:', 'Phone:')}</span><div style={{ color: 'var(--tx3)', marginTop: 2, direction: 'ltr' }}>{person.phone || '—'}</div></div>
              <div><span style={{ color: 'var(--tx5)' }}>{T('المجموعة:', 'Group:')}</span><div style={{ color: 'var(--tx3)', marginTop: 2 }}>{person.group_name || '—'}</div></div>
              <div><span style={{ color: 'var(--tx5)' }}>Webhook URL:</span>
                <div style={{ marginTop: 2 }}>
                  <code style={{ fontSize: 8, color: C.blue, direction: 'ltr', wordBreak: 'break-all' }}>https://gcvshzutdslmdkwqwteh.supabase.co/functions/v1/receive-otp</code>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Messages list */}
      {loading ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--tx5)' }}>...</div> :
        filtered.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--tx6)' }}>{T('لا توجد رسائل', 'No messages')}</div> :
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(m => {
              const person = persons.find(p => p.id === m.person_id)
              return (
                <div key={m.id} onClick={() => !m.is_read && markRead(m.id)} style={{ padding: '14px 18px', borderRadius: 12, background: m.is_read ? 'var(--bg)' : 'rgba(201,168,76,.03)', border: '1px solid ' + (m.is_read ? 'rgba(255,255,255,.04)' : 'rgba(201,168,76,.1)'), cursor: m.is_read ? 'default' : 'pointer', transition: '.15s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {/* Avatar */}
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: C.gold, flexShrink: 0 }}>{(m.person_name || '?')[0]}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{m.person_name || person?.name || '—'}</div>
                        <div style={{ fontSize: 9, color: 'var(--tx5)', direction: 'ltr', display: 'inline' }}>{m.phone_from || ''}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 9, color: 'var(--tx6)' }}>{timeAgo(m.received_at)}</span>
                      {!m.is_read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.gold }} />}
                    </div>
                  </div>

                  {/* Message body */}
                  <div style={{ fontSize: 12, color: 'var(--tx3)', lineHeight: 1.8, marginBottom: m.otp_code ? 10 : 0 }}>{m.message_body}</div>

                  {/* OTP Code */}
                  {m.otp_code && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ padding: '8px 20px', borderRadius: 10, background: 'rgba(39,160,70,.08)', border: '1.5px solid rgba(39,160,70,.15)', fontSize: 22, fontWeight: 900, color: C.ok, letterSpacing: 4, direction: 'ltr', fontFamily: 'monospace' }}>{m.otp_code}</div>
                      <button onClick={e => { e.stopPropagation(); copyCode(m.otp_code) }} style={{ height: 36, padding: '0 14px', borderRadius: 8, border: '1px solid rgba(39,160,70,.15)', background: 'rgba(39,160,70,.06)', color: C.ok, fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{T('نسخ', 'Copy')}</button>
                    </div>
                  )}
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
              <button onClick={() => setShowAdd(false)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', color: 'var(--tx4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>x</button>
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
