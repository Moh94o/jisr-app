import React, { useState, useEffect, useCallback } from 'react'
import { detectService } from './serviceConfig.js'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#c9a84c', ok: '#27a046', red: '#c0392b', blue: '#3483b4' }
const OTP_TTL = 60 // 60 seconds

const SvcLogo = ({ sender, size = 36 }) => {
  const svc = detectService(sender)
  return <div style={{ width: size, height: size, flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: svc.logo ? svc.logo(size) : `<svg width="${size}" height="${size}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="${svc.color}18"/><text x="20" y="26" text-anchor="middle" font-size="18" font-weight="900" fill="${svc.color}">${(svc.name||'?')[0]}</text></svg>` }} />
}

export default function OTPMessages({ sb, toast, user, lang }) {
  const T = (a, e) => (lang || 'ar') !== 'en' ? a : e
  const [persons, setPersons] = useState([])
  const [messages, setMessages] = useState([])
  const [selPerson, setSelPerson] = useState('all')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', name_en: '', phone: '', role: 'employee', default_senders: [] })
  const [saving, setSaving] = useState(false)
  const [addStep, setAddStep] = useState(0)
  const [createdPerson, setCreatedPerson] = useState(null)
  const [setupStep, setSetupStep] = useState(0)
  const [permissions, setPermissions] = useState([])
  const [showPermEdit, setShowPermEdit] = useState(null)
  const [permEdit, setPermEdit] = useState({})
  const [now, setNow] = useState(Date.now())
  const [showSetupDrawer, setShowSetupDrawer] = useState(false)

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const [p, m, perm] = await Promise.all([
      sb.from('otp_persons').select('*').order('created_at'),
      sb.from('otp_messages').select('*').order('received_at', { ascending: false }).limit(200),
      sb.from('otp_permissions').select('*')
    ])
    setPersons(p.data || []); setMessages(m.data || []); setPermissions(perm.data || []); setLoading(false)
  }, [sb])

  useEffect(() => { load() }, [load])
  useEffect(() => { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission() }, [])

  // Auto-refresh
  useEffect(() => {
    const prevIds = new Set(messages.map(m => m.id))
    const interval = setInterval(() => {
      sb.from('otp_messages').select('*').order('received_at', { ascending: false }).limit(200).then(({ data }) => {
        if (data && data.length > messages.length) {
          data.forEach(m => { if (!prevIds.has(m.id)) toast && toast(`${m.person_name}: ${m.otp_code || 'جديد'}`) })
          setMessages(data)
        }
      })
    }, 10000)
    return () => clearInterval(interval)
  }, [sb, messages.length])

  // Helpers
  const getTimeLeft = (r) => { if (!r) return -1; return OTP_TTL - Math.floor((now - new Date(r).getTime()) / 1000) }
  const fmtTime = (s) => { if (s <= 0) return ''; return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
  const isExp = (m) => m.otp_code && getTimeLeft(m.received_at) <= 0
  const expCount = messages.filter(m => isExp(m)).length
  const activeCount = messages.filter(m => m.otp_code && !isExp(m)).length
  const todayCount = messages.filter(m => m.received_at && new Date(m.received_at).toDateString() === new Date().toDateString()).length
  const expiringCount = messages.filter(m => { const tl = getTimeLeft(m.received_at); return m.otp_code && tl > 0 && tl < 20 }).length

  const copyCode = (code) => { navigator.clipboard.writeText(code); toast && toast(T('تم نسخ الرمز', 'Copied')) }
  const deleteMsg = async (id) => { await sb.from('otp_messages').delete().eq('id', id); setMessages(prev => prev.filter(m => m.id !== id)) }
  const clearExpired = async () => { const ids = messages.filter(m => isExp(m)).map(m => m.id); for (const id of ids) await sb.from('otp_messages').delete().eq('id', id); setMessages(prev => prev.filter(m => !ids.includes(m.id))); toast && toast(`تم مسح ${ids.length}`) }

  const addPerson = async () => {
    if (!addForm.name.trim()) return; setSaving(true)
    const gm = { admin: 'الإدارة', pro: 'الإدارة', employee: 'الموظفين' }
    const { data: created, error } = await sb.from('otp_persons').insert({ name: addForm.name, name_en: addForm.name_en || null, phone: addForm.phone || null, role: addForm.role, group_name: gm[addForm.role] || 'الموظفين', default_senders: addForm.default_senders }).select('*').single()
    if (error) toast && toast('خطأ: ' + error.message)
    else { await sb.from('otp_permissions').insert({ person_id: created.id, allowed_senders: addForm.default_senders.length > 0 ? addForm.default_senders : ['*'] }); setCreatedPerson(created); setAddStep(1); load() }
    setSaving(false)
  }
  const closeAdd = () => { setShowAdd(false); setAddStep(0); setCreatedPerson(null); setAddForm({ name: '', name_en: '', phone: '', role: 'employee', default_senders: [] }); setSetupStep(0) }
  const toggleSender = (k) => setAddForm(p => ({ ...p, default_senders: p.default_senders.includes(k) ? p.default_senders.filter(s => s !== k) : [...p.default_senders, k] }))

  // Filter
  let filtered = selPerson === 'all' ? messages : messages.filter(m => m.person_id === selPerson)
  if (filter === 'gov') filtered = filtered.filter(m => detectService(m.phone_from).cat === 'gov')
  else if (filter === 'bank') filtered = filtered.filter(m => detectService(m.phone_from).cat === 'bank')
  else if (filter === 'expired') filtered = filtered.filter(m => isExp(m))
  if (search) filtered = filtered.filter(m => JSON.stringify(m).includes(search))

  const sF = { width: '100%', height: 42, padding: '0 14px', border: '1.5px solid rgba(255,255,255,.1)', borderRadius: 10, fontFamily: F, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.85)', outline: 'none', background: 'rgba(255,255,255,.04)', boxSizing: 'border-box' }
  const SENDERS = [{k:'qiwa',l:'قوى'},{k:'nafath',l:'نفاذ'},{k:'absher',l:'أبشر'},{k:'moi',l:'داخلية'},{k:'mol',l:'وزارة العمل'},{k:'gosi',l:'GOSI'},{k:'muqeem',l:'مقيم'},{k:'tawakkalna',l:'توكلنا'}]
  const ROLES = [{v:'admin',l:'مدير',desc:'صلاحيات كاملة',ic:'♛',c:C.gold},{v:'pro',l:'PRO',desc:'منصات حكومية',ic:'⚙',c:'#9b59b6'},{v:'employee',l:'موظف',desc:'عرض فقط',ic:'👤',c:C.blue}]

  return (
    <div style={{ fontFamily: F, direction: 'rtl' }}>
      {/* ═══ Header ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--tx)' }}>{T('رسائل التحقق', 'OTP Messages')}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setShowSetupDrawer(true)} style={{ height: 36, padding: '0 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)', color: 'var(--tx4)', fontFamily: F, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>⚙ {T('إعداد الربط', 'Setup')}</button>
          <button onClick={() => setShowAdd(true)} style={{ height: 36, padding: '0 14px', borderRadius: 8, border: '1px solid rgba(201,168,76,.2)', background: 'rgba(201,168,76,.1)', color: C.gold, fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ {T('إضافة شخص', 'Add')}</button>
        </div>
      </div>

      {/* ═══ Stats Row ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
        {[[activeCount, T('رسائل نشطة', 'Active'), C.ok], [expiringCount, T('تنتهي قريباً', 'Expiring'), '#e67e22'], [persons.length, T('أجهزة مربوطة', 'Devices'), 'var(--tx3)'], [todayCount, T('رسالة اليوم', 'Today'), 'var(--tx3)']].map(([v, l, c], i) => (
          <div key={i} style={{ padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: c }}>{v}</div>
            <div style={{ fontSize: 9, color: 'var(--tx5)', marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* ═══ Filters + Person tabs + Search ═══ */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        {[{ v: 'all', l: T(`الكل (${messages.length})`, 'All') }, { v: 'gov', l: T('حكومي', 'Gov') }, { v: 'bank', l: T('بنكي', 'Bank') }, { v: 'expired', l: T(`منتهية (${expCount})`, 'Expired') }].map(f2 => (
          <button key={f2.v} onClick={() => setFilter(f2.v)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 10, fontWeight: filter === f2.v ? 700 : 500, color: filter === f2.v ? C.gold : 'rgba(255,255,255,.3)', background: filter === f2.v ? 'rgba(201,168,76,.08)' : 'transparent', border: '1px solid ' + (filter === f2.v ? 'rgba(201,168,76,.15)' : 'rgba(255,255,255,.06)'), cursor: 'pointer', fontFamily: F }}>{f2.l}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {persons.map(p => (
          <button key={p.id} onClick={() => setSelPerson(selPerson === p.id ? 'all' : p.id)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 10, fontWeight: selPerson === p.id ? 700 : 500, color: selPerson === p.id ? C.gold : 'rgba(255,255,255,.3)', background: selPerson === p.id ? 'rgba(201,168,76,.08)' : 'transparent', border: '1px solid ' + (selPerson === p.id ? 'rgba(201,168,76,.15)' : 'rgba(255,255,255,.06)'), cursor: 'pointer', fontFamily: F }}>{p.name}</button>
        ))}
        <div style={{ flex: 1, minWidth: 120 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={T('بحث في الرسائل...', 'Search...')} style={{ ...sF, height: 32, fontSize: 10, padding: '0 10px' }} />
        </div>
      </div>

      {/* ═══ Messages ═══ */}
      {loading ? <div style={{ textAlign: 'center', padding: 50, color: 'var(--tx5)' }}>...</div> :
        filtered.length === 0 ? <div style={{ textAlign: 'center', padding: 50, color: 'var(--tx6)' }}>{T('لا توجد رسائل', 'No messages')}</div> :
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(m => {
              const svc = detectService(m.phone_from)
              const tl = m.otp_code ? getTimeLeft(m.received_at) : -1
              const exp = tl <= 0 && m.otp_code
              const expClr = tl > 30 ? C.ok : tl > 15 ? '#e67e22' : C.red
              const person = persons.find(p => p.id === m.person_id)
              const msgPerms = permissions.filter(p => p.is_active && (p.allowed_senders || []).some(s => s === '*' || (m.phone_from || '').toLowerCase().includes(s.toLowerCase())))
              const permPersonIds = msgPerms.map(p => p.person_id)

              return (
                <div key={m.id} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,.05)', opacity: exp ? .45 : 1, transition: '.3s' }}>
                  {/* Layer 1: Service + time + countdown */}
                  <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,.025)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <SvcLogo sender={m.phone_from} size={32} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)' }}>{svc.name}</div>
                        <div style={{ fontSize: 8, color: 'var(--tx6)', direction: 'ltr' }}>{svc.domain}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 9, color: 'var(--tx6)' }}>{m.received_at ? new Date(m.received_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : ''}{person ? ' · ' + person.name : ''}</span>
                      {m.otp_code && tl > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: expClr + '12', color: expClr, border: '1px solid ' + expClr + '20' }}>ينتهي خلال {fmtTime(tl)}</span>}
                      {exp && <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'rgba(192,57,43,.08)', color: C.red }}>انتهت الصلاحية</span>}
                    </div>
                  </div>

                  {/* Layer 2: OTP digits + copy + delete */}
                  <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {m.otp_code ? <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {!exp && <button onClick={() => copyCode(m.otp_code)} style={{ height: 34, padding: '0 14px', borderRadius: 8, border: '1px solid rgba(39,160,70,.15)', background: 'rgba(39,160,70,.06)', color: C.ok, fontFamily: F, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>{T('نسخ', 'Copy')}</button>}
                        <button onClick={() => deleteMsg(m.id)} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.03)', color: 'var(--tx5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>×</button>
                      </div>
                      <div style={{ display: 'flex', gap: 4, direction: 'ltr' }}>
                        {m.otp_code.split('').map((d, i) => (
                          <div key={i} style={{ width: 34, height: 42, borderRadius: 8, background: exp ? 'rgba(255,255,255,.03)' : 'rgba(39,160,70,.08)', border: '1.5px solid ' + (exp ? 'rgba(255,255,255,.06)' : 'rgba(39,160,70,.15)'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: exp ? 'var(--tx6)' : C.ok, fontFamily: 'monospace' }}>{d}</div>
                        ))}
                      </div>
                    </> : <>
                      <button onClick={() => deleteMsg(m.id)} style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.03)', color: 'var(--tx6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>×</button>
                      <div style={{ fontSize: 11, color: 'var(--tx4)', textAlign: 'left', direction: 'rtl' }}>{m.message_body?.substring(0, 70)}</div>
                    </>}
                  </div>

                  {/* Layer 3: Permissions bar */}
                  <div style={{ padding: '6px 14px', background: 'rgba(255,255,255,.01)', borderTop: '1px solid rgba(255,255,255,.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 8, color: 'var(--tx6)' }}>{T('يشوف:', 'Sees:')}</span>
                      {persons.filter(p => permPersonIds.includes(p.id)).map(p => (
                        <span key={p.id} style={{ fontSize: 8, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: 'rgba(39,160,70,.06)', color: C.ok, border: '1px solid rgba(39,160,70,.08)' }}>{p.name}</span>
                      ))}
                    </div>
                    <button onClick={() => { setShowPermEdit(showPermEdit === m.id ? null : m.id); setPermEdit(Object.fromEntries(persons.map(p => [p.id, permPersonIds.includes(p.id)]))) }} style={{ fontSize: 9, padding: '3px 8px', borderRadius: 5, border: '1px solid rgba(201,168,76,.08)', background: 'rgba(201,168,76,.03)', color: C.gold, cursor: 'pointer', fontFamily: F, fontWeight: 600 }}>تعديل الصلاحيات</button>
                  </div>

                  {/* Inline perm editor */}
                  {showPermEdit === m.id && <div style={{ padding: '8px 14px', background: 'rgba(201,168,76,.02)', borderTop: '1px solid rgba(201,168,76,.05)' }}>
                    {persons.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderRadius: 6, marginBottom: 3, background: permEdit[p.id] ? 'rgba(39,160,70,.03)' : 'transparent' }}>
                        <span style={{ fontSize: 10, color: permEdit[p.id] ? 'var(--tx)' : 'var(--tx5)' }}>{p.name}</span>
                        <button onClick={() => setPermEdit(prev => ({ ...prev, [p.id]: !prev[p.id] }))} style={{ width: 34, height: 18, borderRadius: 9, border: 'none', background: permEdit[p.id] ? C.ok : 'rgba(255,255,255,.1)', cursor: 'pointer', position: 'relative' }}>
                          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, transition: '.2s', ...(permEdit[p.id] ? { right: 2 } : { left: 2 }) }} />
                        </button>
                      </div>
                    ))}
                    <button onClick={async () => {
                      const sender = (m.phone_from || '').toLowerCase()
                      for (const p of persons) { const ex = permissions.find(pm => pm.person_id === p.id); if (permEdit[p.id]) { if (ex) { const s = ex.allowed_senders || []; if (!s.includes('*') && !s.includes(sender)) await sb.from('otp_permissions').update({ allowed_senders: [...s, sender] }).eq('id', ex.id) } else { await sb.from('otp_permissions').insert({ person_id: p.id, allowed_senders: [sender] }) } } }
                      setShowPermEdit(null); load(); toast && toast('تم حفظ الصلاحيات')
                    }} style={{ width: '100%', height: 30, borderRadius: 6, border: '1px solid rgba(201,168,76,.15)', background: 'rgba(201,168,76,.06)', color: C.gold, fontFamily: F, fontSize: 10, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>حفظ</button>
                  </div>}
                </div>
              )
            })}
          </div>
      }

      {/* Clear expired */}
      {expCount > 0 && <div style={{ textAlign: 'center', marginTop: 12 }}>
        <button onClick={clearExpired} style={{ height: 34, padding: '0 16px', borderRadius: 8, border: '1px solid rgba(192,57,43,.12)', background: 'rgba(192,57,43,.04)', color: C.red, fontFamily: F, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>{T(`مسح المنتهية (${expCount})`, `Clear (${expCount})`)}</button>
      </div>}

      {/* ═══ Setup Drawer ═══ */}
      {showSetupDrawer && <div onClick={() => setShowSetupDrawer(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000 }}>
        <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', top: 0, left: 0, width: 'min(400px,85vw)', height: '100vh', background: '#1a1a1a', borderRight: '1px solid rgba(201,168,76,.1)', padding: '20px', overflowY: 'auto', direction: 'rtl', fontFamily: F }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)' }}>إعداد الربط</div>
            <button onClick={() => setShowSetupDrawer(false)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', color: 'var(--tx4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--tx5)', marginBottom: 16, lineHeight: 1.8 }}>كل شخص يحتاج جوال مع تطبيق SMS Forwarder. اضغط على اسم الشخص لعرض مفتاح الجهاز الخاص.</div>
          {persons.map(p => (
            <div key={p.id} style={{ padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)', marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', marginBottom: 6 }}>{p.name}{p.name_en && <span style={{ fontSize: 9, color: 'var(--tx5)', marginRight: 6 }}>{p.name_en}</span>}</div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 9, color: 'var(--tx6)' }}>Key:</span>
                <code style={{ fontSize: 8, color: C.gold, direction: 'ltr', flex: 1, wordBreak: 'break-all' }}>{p.device_key}</code>
                <button onClick={() => { navigator.clipboard.writeText(p.device_key); toast && toast('تم النسخ') }} style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.03)', color: 'var(--tx5)', cursor: 'pointer', fontFamily: F }}>نسخ</button>
              </div>
              <div style={{ fontSize: 8, color: 'var(--tx6)' }}>{p.is_active ? '● نشط' : '○ معطّل'}{p.role ? ' · ' + p.role : ''}</div>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: '12px', borderRadius: 10, background: 'rgba(52,131,180,.04)', border: '1px solid rgba(52,131,180,.08)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, marginBottom: 6 }}>Webhook URL:</div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <code style={{ fontSize: 8, color: C.blue, direction: 'ltr', flex: 1, wordBreak: 'break-all' }}>https://gcvshzutdslmdkwqwteh.supabase.co/functions/v1/receive-otp</code>
              <button onClick={() => { navigator.clipboard.writeText('https://gcvshzutdslmdkwqwteh.supabase.co/functions/v1/receive-otp'); toast && toast('تم النسخ') }} style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(52,131,180,.1)', background: 'rgba(52,131,180,.04)', color: C.blue, cursor: 'pointer', fontFamily: F }}>نسخ</button>
            </div>
          </div>
          <div style={{ marginTop: 8, padding: '10px', borderRadius: 8, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.04)' }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--tx5)', marginBottom: 4 }}>Text template:</div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <code style={{ fontSize: 10, color: C.gold, direction: 'ltr', fontWeight: 700 }}>%s|||%m|||%d</code>
              <button onClick={() => { navigator.clipboard.writeText('%s|||%m|||%d'); toast && toast('تم النسخ') }} style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(201,168,76,.1)', background: 'rgba(201,168,76,.04)', color: C.gold, cursor: 'pointer', fontFamily: F }}>نسخ</button>
            </div>
          </div>
        </div>
      </div>}

      {/* ═══ Add Person Modal ═══ */}
      {showAdd && (()=>{
        return <div onClick={closeAdd} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a1a', borderRadius: 16, width: addStep === 0 ? 'min(480px,94vw)' : 'min(780px,96vw)', height: addStep === 0 ? 'auto' : 'min(560px,85vh)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(201,168,76,.12)', direction: 'rtl', fontFamily: F }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>{addStep === 0 ? 'إضافة شخص جديد' : 'إعداد جهاز ' + (createdPerson?.name || '')}</div>
              <button onClick={closeAdd} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', color: 'var(--tx4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>

            {addStep === 0 ? <>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1, overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><div style={{ fontSize: 9, color: 'var(--tx6)', marginBottom: 4 }}>بالعربي *</div><input value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} placeholder="محمد العمري" style={sF} /></div>
                  <div><div style={{ fontSize: 9, color: 'var(--tx6)', marginBottom: 4, direction: 'ltr', textAlign: 'left' }}>English</div><input value={addForm.name_en} onChange={e => setAddForm(p => ({ ...p, name_en: e.target.value }))} placeholder="Mohammed Al-Omari" style={{ ...sF, direction: 'ltr', fontFamily: 'monospace', textAlign: 'left' }} /></div>
                </div>
                <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx4)', marginBottom: 6 }}>الدور</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                    {ROLES.map(r => <button key={r.v} onClick={() => setAddForm(p => ({ ...p, role: r.v }))} style={{ padding: '12px 8px', borderRadius: 10, border: '1.5px solid ' + (addForm.role === r.v ? r.c + '40' : 'rgba(255,255,255,.06)'), background: addForm.role === r.v ? r.c + '08' : 'rgba(255,255,255,.02)', cursor: 'pointer', textAlign: 'center', fontFamily: F }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{r.ic}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: addForm.role === r.v ? r.c : 'var(--tx3)' }}>{r.l}</div>
                      <div style={{ fontSize: 8, color: addForm.role === r.v ? r.c : 'var(--tx6)', marginTop: 2 }}>{r.desc}</div>
                    </button>)}
                  </div>
                </div>
                <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx4)', marginBottom: 4 }}>رقم الجوال <span style={{ fontSize: 8, color: 'var(--tx6)' }}>(اختياري)</span></div><input value={addForm.phone} onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))} placeholder="05XXXXXXXX" style={{ ...sF, direction: 'ltr' }} /></div>
                <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx4)', marginBottom: 6 }}>يستقبل OTP من:</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{SENDERS.map(s => <button key={s.k} onClick={() => toggleSender(s.k)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 9, fontWeight: addForm.default_senders.includes(s.k) ? 700 : 500, color: addForm.default_senders.includes(s.k) ? C.ok : 'var(--tx5)', background: addForm.default_senders.includes(s.k) ? 'rgba(39,160,70,.06)' : 'transparent', border: '1px solid ' + (addForm.default_senders.includes(s.k) ? 'rgba(39,160,70,.12)' : 'rgba(255,255,255,.06)'), cursor: 'pointer', fontFamily: F }}>{s.l}</button>)}</div>
                  <div style={{ fontSize: 8, color: 'var(--tx6)', marginTop: 4 }}>يمكن تعديلها لاحقاً من إعدادات الشخص</div>
                </div>
              </div>
              <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={closeAdd} style={{ height: 40, padding: '0 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,.08)', background: 'transparent', color: 'var(--tx4)', fontFamily: F, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>إلغاء</button>
                <button onClick={addPerson} disabled={saving || !addForm.name.trim()} style={{ flex: 1, height: 40, borderRadius: 8, border: '1px solid rgba(201,168,76,.2)', background: 'rgba(201,168,76,.1)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving || !addForm.name.trim() ? .5 : 1 }}>{saving ? '...' : 'التالي — إعداد الجهاز'}</button>
              </div>
            </> : <>
              <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ padding: '10px', borderRadius: 8, background: 'rgba(39,160,70,.06)', border: '1px solid rgba(39,160,70,.1)', textAlign: 'center', fontSize: 12, fontWeight: 700, color: C.ok }}>تمت إضافة {createdPerson?.name}</div>
                  <div style={{ padding: '12px', borderRadius: 10, background: 'rgba(201,168,76,.03)', border: '1px solid rgba(201,168,76,.08)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, marginBottom: 6 }}>الصق الرابط</div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <code style={{ fontSize: 8, color: C.blue, background: 'rgba(52,131,180,.06)', padding: '6px 8px', borderRadius: 6, direction: 'ltr', wordBreak: 'break-all', flex: 1, border: '1px solid rgba(52,131,180,.1)' }}>https://gcvshzutdslmdkwqwteh.supabase.co/functions/v1/receive-otp</code>
                      <button onClick={() => { navigator.clipboard.writeText('https://gcvshzutdslmdkwqwteh.supabase.co/functions/v1/receive-otp'); toast && toast('تم') }} style={{ height: 28, padding: '0 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)', color: 'var(--tx4)', fontFamily: F, fontSize: 9, cursor: 'pointer' }}>نسخ</button>
                    </div>
                  </div>
                  <div style={{ padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.04)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', marginBottom: 8 }}>إعداد القالب</div>
                    {[['Subject', createdPerson?.device_key || ''], ['Text', '%s|||%m|||%d']].map(([l, v], i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.03)' }}>
                        <span style={{ fontSize: 9, color: 'var(--tx5)', width: 45 }}>{l}</span>
                        <code style={{ fontSize: 9, color: C.gold, direction: 'ltr', flex: 1, wordBreak: 'break-all', fontWeight: 600 }}>{v}</code>
                        <button onClick={() => { navigator.clipboard.writeText(v); toast && toast('تم') }} style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.03)', color: 'var(--tx5)', cursor: 'pointer', fontFamily: F }}>نسخ</button>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ width: 200, background: 'rgba(255,255,255,.015)', borderRight: '1px solid rgba(255,255,255,.04)', padding: '14px 12px', flexShrink: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx3)', marginBottom: 10 }}>خطوات الإعداد</div>
                  {['حمّل التطبيق', 'أضف قاعدة URL', 'الصق الرابط', 'إعداد القالب', 'فعّل التحويل', 'اختبر'].map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: i < 2 ? 'rgba(39,160,70,.1)' : 'rgba(255,255,255,.04)', border: '1px solid ' + (i < 2 ? C.ok : 'rgba(255,255,255,.08)'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: i < 2 ? C.ok : 'var(--tx6)', flexShrink: 0 }}>{i < 2 ? '✓' : i + 1}</div>
                      <span style={{ fontSize: 9, color: i < 2 ? C.ok : 'var(--tx5)' }}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding: '10px 18px', borderTop: '1px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
                <button onClick={closeAdd} style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid rgba(39,160,70,.15)', background: 'rgba(39,160,70,.06)', color: C.ok, fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>تم — إغلاق</button>
              </div>
            </>}
          </div>
        </div>
      })()}
    </div>
  )
}
