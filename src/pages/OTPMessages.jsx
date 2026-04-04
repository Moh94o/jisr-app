import React, { useState, useEffect, useCallback } from 'react'
import { detectService } from './serviceConfig.js'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#c9a84c', ok: '#27a046', red: '#c0392b', blue: '#3483b4' }
const OTP_TTL = 60

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
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', name_en: '', phone: '', role: 'employee', default_senders: [] })
  const [saving, setSaving] = useState(false)
  const [permissions, setPermissions] = useState([])
  const [showPermEdit, setShowPermEdit] = useState(null)
  const [permEdit, setPermEdit] = useState({})
  const [now, setNow] = useState(Date.now())
  const [showSetupDrawer, setShowSetupDrawer] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null) // message id to delete

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

  // Stats
  const govMsgs = messages.filter(m => detectService(m.phone_from).cat === 'gov')
  const bankMsgs = messages.filter(m => detectService(m.phone_from).cat === 'bank')
  const nafathCount = messages.filter(m => (m.phone_from || '').toLowerCase().includes('nafath')).length
  const qiwaCount = messages.filter(m => (m.phone_from || '').toLowerCase().includes('qiwa')).length
  const absherCount = messages.filter(m => (m.phone_from || '').toLowerCase().includes('absher')).length
  const expCount = messages.filter(m => isExp(m)).length

  const copyCode = (code) => { navigator.clipboard.writeText(code); toast && toast(T('تم نسخ الرمز', 'Copied')) }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    await sb.from('otp_messages').delete().eq('id', deleteConfirm)
    setMessages(prev => prev.filter(m => m.id !== deleteConfirm))
    setDeleteConfirm(null)
    toast && toast(T('تم الحذف', 'Deleted'))
  }

  const clearExpired = async () => {
    const ids = messages.filter(m => isExp(m)).map(m => m.id)
    for (const id of ids) await sb.from('otp_messages').delete().eq('id', id)
    setMessages(prev => prev.filter(m => !ids.includes(m.id)))
    toast && toast(`تم مسح ${ids.length}`)
  }

  const addPerson = async () => {
    if (!addForm.name.trim()) return; setSaving(true)
    const gm = { admin: 'الإدارة', pro: 'الإدارة', employee: 'الموظفين' }
    const { error } = await sb.from('otp_persons').insert({ name: addForm.name, name_en: addForm.name_en || null, phone: addForm.phone || null, role: addForm.role, group_name: gm[addForm.role] || 'الموظفين', default_senders: addForm.default_senders })
    if (error) toast && toast('خطأ: ' + error.message)
    else { toast && toast('تمت الإضافة'); setShowAdd(false); setAddForm({ name: '', name_en: '', phone: '', role: 'employee', default_senders: [] }); load() }
    setSaving(false)
  }

  const toggleSender = (k) => setAddForm(p => ({ ...p, default_senders: p.default_senders.includes(k) ? p.default_senders.filter(s => s !== k) : [...p.default_senders, k] }))

  // Filter
  let filtered = selPerson === 'all' ? messages : messages.filter(m => m.person_id === selPerson)
  if (filter === 'gov') filtered = filtered.filter(m => detectService(m.phone_from).cat === 'gov')
  else if (filter === 'bank') filtered = filtered.filter(m => detectService(m.phone_from).cat === 'bank')
  else if (filter === 'expired') filtered = filtered.filter(m => isExp(m))

  const sF = { width: '100%', height: 42, padding: '0 14px', border: '1.5px solid rgba(255,255,255,.1)', borderRadius: 10, fontFamily: F, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.85)', outline: 'none', background: 'rgba(255,255,255,.04)', boxSizing: 'border-box' }
  const SENDERS = [{k:'*',l:'الكل'},{k:'qiwa',l:'قوى'},{k:'nafath',l:'نفاذ'},{k:'absher',l:'أبشر'},{k:'moi',l:'داخلية'},{k:'gosi',l:'GOSI'},{k:'muqeem',l:'مقيم'},{k:'chamber',l:'الغرفة التجارية'}]
  const ROLES = [{v:'admin',l:'مدير',desc:'صلاحيات كاملة',ic:'♛',c:C.gold},{v:'pro',l:'PRO',desc:'منصات حكومية',ic:'⚙',c:'#9b59b6'},{v:'employee',l:'موظف',desc:'عرض فقط',ic:'👤',c:C.blue}]

  return (
    <div style={{ fontFamily: F, direction: 'rtl' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--tx)' }}>رسائل التحقق</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setShowSetupDrawer(true)} style={{ height: 34, padding: '0 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)', color: 'var(--tx4)', fontFamily: F, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>⚙ إعداد الربط</button>
          <button onClick={() => setShowAdd(true)} style={{ height: 34, padding: '0 12px', borderRadius: 8, border: '1px solid rgba(201,168,76,.2)', background: 'rgba(201,168,76,.1)', color: C.gold, fontFamily: F, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>+ إضافة شخص</button>
        </div>
      </div>

      {/* Stats: gov breakdown | bank | facilities+workers | total */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
        <div style={{ padding: '10px', borderRadius: 10, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)' }}>
          <div style={{ fontSize: 9, color: '#1abc9c', marginBottom: 6 }}>حكومي</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#1abc9c', marginBottom: 4 }}>{govMsgs.length}</div>
          <div style={{ display: 'flex', gap: 6, fontSize: 8, color: 'var(--tx5)' }}>
            <span>نفاذ {nafathCount}</span><span>قوى {qiwaCount}</span><span>أبشر {absherCount}</span>
          </div>
        </div>
        <div style={{ padding: '10px', borderRadius: 10, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)' }}>
          <div style={{ fontSize: 9, color: '#e67e22', marginBottom: 6 }}>بنكي</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#e67e22' }}>{bankMsgs.length}</div>
        </div>
        <div style={{ padding: '10px', borderRadius: 10, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)' }}>
          <div style={{ fontSize: 9, color: C.blue, marginBottom: 6 }}>منشآت وعمال</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.blue }}>{messages.length - govMsgs.length - bankMsgs.length}</div>
        </div>
        <div style={{ padding: '10px', borderRadius: 10, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)' }}>
          <div style={{ fontSize: 9, color: 'var(--tx4)', marginBottom: 6 }}>الكل</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--tx3)' }}>{messages.length}</div>
        </div>
      </div>

      {/* Person tabs first */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        <button onClick={() => setSelPerson('all')} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 10, fontWeight: selPerson === 'all' ? 700 : 500, color: selPerson === 'all' ? C.gold : 'rgba(255,255,255,.3)', background: selPerson === 'all' ? 'rgba(201,168,76,.08)' : 'transparent', border: '1px solid ' + (selPerson === 'all' ? 'rgba(201,168,76,.15)' : 'rgba(255,255,255,.06)'), cursor: 'pointer', fontFamily: F }}>الكل</button>
        {persons.map(p => (
          <button key={p.id} onClick={() => setSelPerson(selPerson === p.id ? 'all' : p.id)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 10, fontWeight: selPerson === p.id ? 700 : 500, color: selPerson === p.id ? C.gold : 'rgba(255,255,255,.3)', background: selPerson === p.id ? 'rgba(201,168,76,.08)' : 'transparent', border: '1px solid ' + (selPerson === p.id ? 'rgba(201,168,76,.15)' : 'rgba(255,255,255,.06)'), cursor: 'pointer', fontFamily: F }}>{p.name}</button>
        ))}
      </div>

      {/* Category filters */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
        {[{v:'all',l:'الكل',c:C.gold},{v:'gov',l:'حكومي',c:'#1abc9c'},{v:'bank',l:'بنكي',c:'#e67e22'},{v:'expired',l:`منتهية (${expCount})`,c:C.red}].map(f2 => (
          <button key={f2.v} onClick={() => setFilter(f2.v)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 9, fontWeight: filter === f2.v ? 700 : 500, color: filter === f2.v ? f2.c : 'rgba(255,255,255,.25)', background: filter === f2.v ? f2.c + '10' : 'transparent', border: '1px solid ' + (filter === f2.v ? f2.c + '20' : 'rgba(255,255,255,.05)'), cursor: 'pointer', fontFamily: F }}>{f2.l}</button>
        ))}
        {expCount > 0 && <button onClick={clearExpired} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 9, fontWeight: 600, color: C.red, background: 'rgba(192,57,43,.04)', border: '1px solid rgba(192,57,43,.1)', cursor: 'pointer', fontFamily: F, marginRight: 'auto' }}>مسح المنتهية ({expCount})</button>}
      </div>

      {/* Messages */}
      {loading ? <div style={{ textAlign: 'center', padding: 50, color: 'var(--tx5)' }}>...</div> :
        filtered.length === 0 ? <div style={{ textAlign: 'center', padding: 50, color: 'var(--tx6)' }}>لا توجد رسائل</div> :
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
                <div key={m.id} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,.05)', opacity: exp ? .4 : 1, transition: '.3s' }}>
                  {/* Service + time */}
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

                  {/* OTP digits + actions */}
                  <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {m.otp_code ? <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {!exp && <button onClick={() => copyCode(m.otp_code)} style={{ height: 34, padding: '0 14px', borderRadius: 8, border: '1px solid rgba(39,160,70,.15)', background: 'rgba(39,160,70,.06)', color: C.ok, fontFamily: F, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>نسخ</button>}
                        <button onClick={() => setDeleteConfirm(m.id)} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.03)', color: 'var(--tx5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>×</button>
                      </div>
                      <div style={{ display: 'flex', gap: 4, direction: 'ltr' }}>
                        {m.otp_code.split('').map((d, i) => (
                          <div key={i} style={{ width: 34, height: 42, borderRadius: 8, background: exp ? 'rgba(255,255,255,.03)' : 'rgba(39,160,70,.08)', border: '1.5px solid ' + (exp ? 'rgba(255,255,255,.06)' : 'rgba(39,160,70,.15)'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: exp ? 'var(--tx6)' : C.ok, fontFamily: 'monospace' }}>{d}</div>
                        ))}
                      </div>
                    </> : <>
                      <button onClick={() => setDeleteConfirm(m.id)} style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.03)', color: 'var(--tx6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>×</button>
                      <div style={{ fontSize: 11, color: 'var(--tx4)', textAlign: 'left', direction: 'rtl' }}>{m.message_body?.substring(0, 70)}</div>
                    </>}
                  </div>

                  {/* Permissions */}
                  <div style={{ padding: '6px 14px', background: 'rgba(255,255,255,.01)', borderTop: '1px solid rgba(255,255,255,.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 8, color: 'var(--tx6)' }}>يشوف:</span>
                      {persons.filter(p => permPersonIds.includes(p.id)).map(p => (
                        <span key={p.id} style={{ fontSize: 8, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: 'rgba(39,160,70,.06)', color: C.ok, border: '1px solid rgba(39,160,70,.08)' }}>{p.name}</span>
                      ))}
                    </div>
                    <button onClick={() => { setShowPermEdit(showPermEdit === m.id ? null : m.id); setPermEdit(Object.fromEntries(persons.map(p => [p.id, permPersonIds.includes(p.id)]))) }} style={{ fontSize: 8, padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(201,168,76,.08)', background: 'rgba(201,168,76,.03)', color: C.gold, cursor: 'pointer', fontFamily: F, fontWeight: 600 }}>تعديل الصلاحيات</button>
                  </div>

                  {showPermEdit === m.id && <div style={{ padding: '8px 14px', background: 'rgba(201,168,76,.02)', borderTop: '1px solid rgba(201,168,76,.05)' }}>
                    {persons.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', marginBottom: 2 }}>
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
                    }} style={{ width: '100%', height: 28, borderRadius: 6, border: '1px solid rgba(201,168,76,.12)', background: 'rgba(201,168,76,.05)', color: C.gold, fontFamily: F, fontSize: 9, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>حفظ</button>
                  </div>}
                </div>
              )
            })}
          </div>
      }

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div onClick={() => setDeleteConfirm(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1e1e1e', borderRadius: 16, width: 'min(360px,90vw)', border: '1px solid rgba(192,57,43,.15)', direction: 'rtl', fontFamily: F, overflow: 'hidden' }}>
            <div style={{ height: 3, background: 'linear-gradient(90deg,transparent,' + C.red + ',' + C.red + ',transparent)' }} />
            <div style={{ padding: '24px 20px', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(192,57,43,.1)', border: '2px solid rgba(192,57,43,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 20, color: C.red }}>!</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)', marginBottom: 6 }}>حذف الرسالة؟</div>
              <div style={{ fontSize: 12, color: 'var(--tx5)' }}>سيتم حذف رسالة التحقق نهائياً ولا يمكن استرجاعها</div>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', gap: 8 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, height: 42, borderRadius: 10, border: '1.5px solid rgba(255,255,255,.1)', background: 'transparent', color: 'var(--tx4)', fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>إلغاء</button>
              <button onClick={confirmDelete} style={{ flex: 1, height: 42, borderRadius: 10, border: '1px solid rgba(192,57,43,.3)', background: 'rgba(192,57,43,.15)', color: C.red, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>حذف</button>
            </div>
          </div>
        </div>
      )}

      {/* Setup Drawer */}
      {showSetupDrawer && <div onClick={() => setShowSetupDrawer(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000 }}>
        <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', top: 0, left: 0, width: 'min(380px,85vw)', height: '100vh', background: '#1a1a1a', borderRight: '1px solid rgba(201,168,76,.1)', padding: '18px', overflowY: 'auto', direction: 'rtl', fontFamily: F }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)' }}>إعداد الربط</div>
            <button onClick={() => setShowSetupDrawer(false)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', color: 'var(--tx4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
          {persons.map(p => (
            <div key={p.id} style={{ padding: '10px', borderRadius: 8, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.04)', marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx)', marginBottom: 4 }}>{p.name}</div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <code style={{ fontSize: 8, color: C.gold, direction: 'ltr', flex: 1, wordBreak: 'break-all' }}>{p.device_key}</code>
                <button onClick={() => { navigator.clipboard.writeText(p.device_key); toast && toast('تم النسخ') }} style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.03)', color: 'var(--tx5)', cursor: 'pointer', fontFamily: F }}>نسخ</button>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 10, padding: '10px', borderRadius: 8, background: 'rgba(52,131,180,.04)', border: '1px solid rgba(52,131,180,.08)' }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: C.blue, marginBottom: 4 }}>Webhook URL</div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <code style={{ fontSize: 7, color: C.blue, direction: 'ltr', flex: 1, wordBreak: 'break-all' }}>https://gcvshzutdslmdkwqwteh.supabase.co/functions/v1/receive-otp</code>
              <button onClick={() => { navigator.clipboard.writeText('https://gcvshzutdslmdkwqwteh.supabase.co/functions/v1/receive-otp'); toast && toast('تم') }} style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(52,131,180,.1)', background: 'rgba(52,131,180,.04)', color: C.blue, cursor: 'pointer', fontFamily: F }}>نسخ</button>
            </div>
          </div>
          <div style={{ marginTop: 6, padding: '8px 10px', borderRadius: 6, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.04)' }}>
            <div style={{ fontSize: 9, color: 'var(--tx5)' }}>Text template: <code style={{ color: C.gold, fontWeight: 700 }}>%s|||%m|||%d</code></div>
          </div>
        </div>
      </div>}

      {/* Add Person Modal */}
      {showAdd && <div onClick={() => setShowAdd(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a1a', borderRadius: 16, width: 'min(480px,94vw)', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(201,168,76,.12)', direction: 'rtl', fontFamily: F }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>إضافة شخص جديد</div>
            <button onClick={() => setShowAdd(false)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', color: 'var(--tx4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><div style={{ fontSize: 9, color: 'var(--tx6)', marginBottom: 4 }}>بالعربي *</div><input value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} placeholder="محمد العمري" style={sF} /></div>
              <div><div style={{ fontSize: 9, color: 'var(--tx6)', marginBottom: 4, direction: 'ltr', textAlign: 'left' }}>English</div><input value={addForm.name_en} onChange={e => setAddForm(p => ({ ...p, name_en: e.target.value }))} placeholder="Mohammed" style={{ ...sF, direction: 'ltr', fontFamily: 'monospace', textAlign: 'left' }} /></div>
            </div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx4)', marginBottom: 4 }}>رقم الجوال <span style={{ fontSize: 8, color: 'var(--tx6)' }}>(اختياري)</span></div><input value={addForm.phone} onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))} placeholder="05XXXXXXXX" style={{ ...sF, direction: 'ltr' }} /></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx4)', marginBottom: 6 }}>يستقبل OTP من:</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{SENDERS.map(s => <button key={s.k} onClick={() => toggleSender(s.k)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 9, fontWeight: addForm.default_senders.includes(s.k) ? 700 : 500, color: addForm.default_senders.includes(s.k) ? C.ok : 'var(--tx5)', background: addForm.default_senders.includes(s.k) ? 'rgba(39,160,70,.06)' : 'transparent', border: '1px solid ' + (addForm.default_senders.includes(s.k) ? 'rgba(39,160,70,.12)' : 'rgba(255,255,255,.06)'), cursor: 'pointer', fontFamily: F }}>{s.l}</button>)}</div>
            </div>
          </div>
          <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => setShowAdd(false)} style={{ height: 40, padding: '0 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,.08)', background: 'transparent', color: 'var(--tx4)', fontFamily: F, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>إلغاء</button>
            <button onClick={addPerson} disabled={saving || !addForm.name.trim()} style={{ flex: 1, height: 40, borderRadius: 8, border: '1px solid rgba(201,168,76,.2)', background: 'rgba(201,168,76,.1)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving || !addForm.name.trim() ? .5 : 1 }}>{saving ? '...' : 'إضافة'}</button>
          </div>
        </div>
      </div>}
    </div>
  )
}
