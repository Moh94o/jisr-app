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
  const [addMode, setAddMode] = useState(null) // null | 'new' | 'existing'
  const [addForm, setAddForm] = useState({ name: '', name_en: '', phone: '', default_senders: [] })
  const [saving, setSaving] = useState(false)
  const [addSearch, setAddSearch] = useState('')
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [allUsers, setAllUsers] = useState([])
  const [permissions, setPermissions] = useState([])
  const [showPermEdit, setShowPermEdit] = useState(null)
  const [permEdit, setPermEdit] = useState({})
  const [sysUsers, setSysUsers] = useState([])
  const [now, setNow] = useState(Date.now())
  const [showSetupDrawer, setShowSetupDrawer] = useState(false)
  const [fmtType, setFmtType] = useState('text') // 'text' | 'json' | 'url'
  const [drawerPerson, setDrawerPerson] = useState(null)
  const [drawerSenders, setDrawerSenders] = useState([])
  const [copyLog, setCopyLog] = useState([])
  const [showCopyLog, setShowCopyLog] = useState(false)
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
    sb.from('owners').select('id,name_ar,name_en,id_number,mobile_work,mobile_personal').is('deleted_at',null).order('name_ar').then(({data})=>setAllUsers(data||[]))
    sb.from('users').select('id,name_ar').is('deleted_at',null).eq('is_active',true).order('name_ar').then(({data})=>setSysUsers(data||[]))
  }, [sb])

  useEffect(() => { load() }, [load])

  // Auto-refresh
  useEffect(() => {
    const prevIds = new Set(messages.map(m => m.id))
    const interval = setInterval(() => {
      sb.from('otp_messages').select('*').order('received_at', { ascending: false }).limit(200).then(({ data }) => {
        if (data && data.length > messages.length) {
          data.forEach(m => { if (!prevIds.has(m.id)) { /* new message — no toast */ } })
          setMessages(data)
        }
      })
    }, 10000)
    return () => clearInterval(interval)
  }, [sb, messages.length])

  // Helpers
  const getTimeLeft = (r) => {
    if (!r) return -1
    // Use created_at as fallback (always set by Supabase with correct timezone)
    const t = new Date(r).getTime()
    if (isNaN(t)) return -1
    return OTP_TTL - Math.floor((now - t) / 1000)
  }
  const fmtTime = (s) => { if (s <= 0) return ''; return `0:${String(Math.min(s, 59)).padStart(2, '0')}` }
  const isExp = (m) => m.otp_code && getTimeLeft(m.created_at || m.received_at) <= 0

  // Message category detection
  const detectMsgCat = (m) => {
    const svc = detectService(m.phone_from)
    if (svc.cat === 'bank') return 'bank'
    if (svc.cat === 'gov') {
      const body = (m.message_body || '').toLowerCase()
      // Facility patterns: unified number (7xx), establishment, منشأة, سجل تجاري
      if (/\b7\d{9}\b/.test(body) || body.includes('منشأة') || body.includes('سجل') || body.includes('establishment') || body.includes('رقم موحد') || body.includes('ملف قوى') || body.includes('ملف التأمينات') || body.includes('غرفة'))
        return 'facility'
      // Worker patterns: iqama (2xxx), border number, إقامة, عامل, كفالة
      if (/\b2\d{9}\b/.test(body) || /\b\d{4}\b/.test(body) && (body.includes('إقامة') || body.includes('عامل') || body.includes('كفالة') || body.includes('حدود') || body.includes('iqama') || body.includes('border')))
        return 'worker'
      return 'gov'
    }
    return 'other'
  }

  // Stats
  const govMsgs = messages.filter(m => detectMsgCat(m) === 'gov')
  const bankMsgs = messages.filter(m => detectMsgCat(m) === 'bank')
  const facMsgs = messages.filter(m => detectMsgCat(m) === 'facility')
  const workerMsgs = messages.filter(m => detectMsgCat(m) === 'worker')
  const otherMsgs = messages.filter(m => detectMsgCat(m) === 'other')
  const nafathCount = messages.filter(m => (m.phone_from || '').toLowerCase().includes('nafath')).length
  const qiwaCount = messages.filter(m => (m.phone_from || '').toLowerCase().includes('qiwa')).length
  const absherCount = messages.filter(m => (m.phone_from || '').toLowerCase().includes('absher')).length
  const expCount = messages.filter(m => isExp(m)).length

  const copyCode = async (code, msg) => {
    navigator.clipboard.writeText(code); toast && toast(T('تم نسخ الرمز', 'Copied'))
    const copyName = user?.name_ar || 'مستخدم'
    // Count copies for this message
    const currentCount = parseInt(msg?.copy_count || 0) + 1
    const copyInfo = copyName + (currentCount > 1 ? ` (${currentCount})` : '')
    if (msg?.id) await sb.from('otp_messages').update({ copied_by: copyInfo, copy_count: currentCount }).eq('id', msg.id)
    setMessages(prev => prev.map(x => x.id === msg?.id ? { ...x, copied_by: copyInfo, copy_count: currentCount } : x))
    sb.from('otp_copy_log').insert({ message_id: msg?.id || null, user_id: user?.id || null, user_name: copyName, otp_code: code, person_name: msg?.person_name || null, sender: msg?.phone_from || null })
  }

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
    const name = addMode === 'existing' && selectedPerson ? selectedPerson.name_ar : addForm.name
    if (!name?.trim()) return; setSaving(true)
    const senders = addForm.default_senders.length > 0 ? addForm.default_senders : ['*']
    const { data: created, error } = await sb.from('otp_persons').insert({
      name: name,
      name_en: addMode === 'existing' && selectedPerson ? selectedPerson.name_en : addForm.name_en || null,
      phone: addMode === 'existing' && selectedPerson ? (selectedPerson.mobile_work || selectedPerson.mobile_personal) : addForm.phone || null,
      default_senders: senders
    }).select('*').single()
    if (error) toast && toast('خطأ: ' + error.message)
    else { await sb.from('otp_permissions').insert({ person_id: created.id, allowed_senders: senders }); toast && toast('تمت الإضافة'); closeAdd(); load() }
    setSaving(false)
  }
  const closeAdd = () => { setShowAdd(false); setAddMode(null); setSelectedPerson(null); setAddSearch(''); setAddForm({ name: '', name_en: '', phone: '', default_senders: [] }) }

  const toggleSender = (k) => {
    if (k === '*') {
      // Toggle all
      const allKeys = SENDERS.filter(s => s.k !== '*').map(s => s.k)
      const allSelected = allKeys.every(s => addForm.default_senders.includes(s))
      setAddForm(p => ({ ...p, default_senders: allSelected ? [] : ['*', ...allKeys] }))
    } else {
      setAddForm(p => {
        let next = p.default_senders.includes(k) ? p.default_senders.filter(s => s !== k) : [...p.default_senders, k]
        // Remove '*' if not all selected, add '*' if all selected
        const allKeys = SENDERS.filter(s => s.k !== '*').map(s => s.k)
        const allOn = allKeys.every(s => next.includes(s))
        next = allOn ? ['*', ...allKeys] : next.filter(s => s !== '*')
        return { ...p, default_senders: next }
      })
    }
  }

  // Filter
  let filtered = selPerson === 'all' ? messages : messages.filter(m => m.person_id === selPerson)
  if (filter !== 'all') filtered = filtered.filter(m => detectMsgCat(m) === filter)

  const sF = { width: '100%', height: 42, padding: '0 14px', border: '1.5px solid rgba(255,255,255,.1)', borderRadius: 10, fontFamily: F, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.85)', outline: 'none', background: 'rgba(255,255,255,.04)', boxSizing: 'border-box' }
  const SENDERS = [{k:'*',l:'الكل'},{k:'qiwa',l:'قوى'},{k:'nafath',l:'نفاذ'},{k:'absher',l:'أبشر'},{k:'moi',l:'داخلية'},{k:'gosi',l:'GOSI'},{k:'muqeem',l:'مقيم'},{k:'chamber',l:'الغرفة التجارية'}]
  const ROLES = [{v:'admin',l:'مدير',desc:'صلاحيات كاملة',ic:'♛',c:C.gold},{v:'pro',l:'PRO',desc:'منصات حكومية',ic:'⚙',c:'#9b59b6'},{v:'employee',l:'موظف',desc:'عرض فقط',ic:'👤',c:C.blue}]

  return (
    <div style={{ fontFamily: F, direction: 'rtl' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--tx)' }}>رسائل التحقق</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setShowSetupDrawer(true)} style={{ height: 34, padding: '0 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)', color: 'var(--tx4)', fontFamily: F, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>⚙ الإعدادات</button>
          <button onClick={() => setShowAdd(true)} style={{ height: 34, padding: '0 12px', borderRadius: 8, border: '1px solid rgba(201,168,76,.2)', background: 'rgba(201,168,76,.1)', color: C.gold, fontFamily: F, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>+ إضافة شخص</button>
        </div>
      </div>

      {/* Stats: gov breakdown | bank | facilities+workers | total */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
        <div onClick={() => setFilter('gov')} style={{ padding: '10px', borderRadius: 10, background: filter === 'gov' ? 'rgba(26,188,156,.06)' : 'rgba(255,255,255,.02)', border: '1px solid ' + (filter === 'gov' ? 'rgba(26,188,156,.15)' : 'rgba(255,255,255,.05)'), cursor: 'pointer' }}>
          <div style={{ fontSize: 9, color: '#1abc9c', marginBottom: 6 }}>الحكومية</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#1abc9c', marginBottom: 4 }}>{govMsgs.length + facMsgs.length + workerMsgs.length}</div>
          <div style={{ display: 'flex', gap: 6, fontSize: 8, color: 'var(--tx5)' }}>
            <span>نفاذ {nafathCount}</span><span>قوى {qiwaCount}</span><span>أبشر {absherCount}</span>
          </div>
        </div>
        <div onClick={() => setFilter('bank')} style={{ padding: '10px', borderRadius: 10, background: filter === 'bank' ? 'rgba(230,126,34,.06)' : 'rgba(255,255,255,.02)', border: '1px solid ' + (filter === 'bank' ? 'rgba(230,126,34,.15)' : 'rgba(255,255,255,.05)'), cursor: 'pointer' }}>
          <div style={{ fontSize: 9, color: '#e67e22', marginBottom: 6 }}>البنكية</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#e67e22' }}>{bankMsgs.length}</div>
        </div>
        <div onClick={() => setFilter('facility')} style={{ padding: '10px', borderRadius: 10, background: filter === 'facility' ? 'rgba(52,131,180,.06)' : 'rgba(255,255,255,.02)', border: '1px solid ' + (filter === 'facility' ? 'rgba(52,131,180,.15)' : 'rgba(255,255,255,.05)'), cursor: 'pointer' }}>
          <div style={{ fontSize: 9, color: C.blue, marginBottom: 6 }}>المنشآت</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.blue }}>{facMsgs.length}</div>
          <div style={{ fontSize: 7, color: 'var(--tx6)' }}>رقم موحد · قوى · تأمينات</div>
        </div>
        <div onClick={() => setFilter('worker')} style={{ padding: '10px', borderRadius: 10, background: filter === 'worker' ? 'rgba(155,89,182,.06)' : 'rgba(255,255,255,.02)', border: '1px solid ' + (filter === 'worker' ? 'rgba(155,89,182,.15)' : 'rgba(255,255,255,.05)'), cursor: 'pointer' }}>
          <div style={{ fontSize: 9, color: '#9b59b6', marginBottom: 6 }}>العمال</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#9b59b6' }}>{workerMsgs.length}</div>
          <div style={{ fontSize: 7, color: 'var(--tx6)' }}>إقامة · حدود · كفالة</div>
        </div>
      </div>

      {/* Status warnings */}
      {(()=>{
        const disabledPersons = persons.filter(p => !p.is_active)
        const partialPersons = persons.filter(p => p.is_active && (p.disabled_senders || []).length > 0)
        if (disabledPersons.length === 0 && partialPersons.length === 0) return null
        return <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {disabledPersons.length > 0 && <span style={{ fontSize: 9, padding: '3px 10px', borderRadius: 6, background: 'rgba(230,126,34,.06)', border: '1px solid rgba(230,126,34,.1)', color: '#e67e22' }}>⏸ معطّل كلياً: {disabledPersons.map(p => p.name).join('، ')}</span>}
          {partialPersons.map(p => <span key={p.id} style={{ fontSize: 9, padding: '3px 10px', borderRadius: 6, background: 'rgba(230,126,34,.04)', border: '1px solid rgba(230,126,34,.08)', color: '#e67e22' }}>{p.name}: {(p.disabled_senders||[]).length} جهة معطّلة</span>)}
        </div>
      })()}

      {/* Person tabs first */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        <button onClick={() => setSelPerson('all')} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 10, fontWeight: selPerson === 'all' ? 700 : 500, color: selPerson === 'all' ? C.gold : 'rgba(255,255,255,.3)', background: selPerson === 'all' ? 'rgba(201,168,76,.08)' : 'transparent', border: '1px solid ' + (selPerson === 'all' ? 'rgba(201,168,76,.15)' : 'rgba(255,255,255,.06)'), cursor: 'pointer', fontFamily: F }}>الكل</button>
        {persons.map(p => (
          <button key={p.id} onClick={() => setSelPerson(selPerson === p.id ? 'all' : p.id)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 10, fontWeight: selPerson === p.id ? 700 : 500, color: !p.is_active ? '#e67e22' : selPerson === p.id ? C.gold : 'rgba(255,255,255,.3)', background: !p.is_active ? 'rgba(230,126,34,.06)' : selPerson === p.id ? 'rgba(201,168,76,.08)' : 'transparent', border: '1px solid ' + (!p.is_active ? 'rgba(230,126,34,.15)' : selPerson === p.id ? 'rgba(201,168,76,.15)' : 'rgba(255,255,255,.06)'), cursor: 'pointer', fontFamily: F }}>{p.name}{!p.is_active ? ' ⏸' : ''}</button>
        ))}
      </div>

      {/* Category filters */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
        {[{v:'all',l:'الكل',c:C.gold},{v:'gov',l:'الحكومية',c:'#1abc9c'},{v:'bank',l:'البنكية',c:'#e67e22'},{v:'facility',l:'المنشآت',c:C.blue},{v:'worker',l:'العمال',c:'#9b59b6'},{v:'other',l:'أخرى',c:'#999'}].map(f2 => (
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
              const tl = m.otp_code ? getTimeLeft(m.created_at || m.received_at) : -1
              const exp = tl <= 0 && m.otp_code
              const expClr = tl > 30 ? C.ok : tl > 15 ? '#e67e22' : C.red
              const person = persons.find(p => p.id === m.person_id)
              const senderKey = (m.phone_from || '').toLowerCase()
              const msgPerms = permissions.filter(pm => pm.is_active && pm.person_id === m.person_id && (pm.can_view_all || (pm.allowed_senders || []).some(s => senderKey.includes(s.toLowerCase()))))
              const permUserIds = msgPerms.map(pm => pm.user_id)

              return (
                <div key={m.id} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,.05)', opacity: exp ? .4 : 1, transition: '.3s' }}>
                  {/* Layer 1: Service RIGHT | Person | Time LEFT */}
                  <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,.025)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Service — RIGHT */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <SvcLogo sender={m.phone_from} size={36} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{svc.name}</div>
                        <div style={{ fontSize: 9, color: 'var(--tx6)', marginTop: 2 }}>{svc.domain}</div>
                      </div>
                    </div>
                    {/* Person name — after service */}
                    {person && <div style={{ padding: '4px 12px', borderRadius: 8, background: 'rgba(201,168,76,.06)', border: '1px solid rgba(201,168,76,.1)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.gold }}>{person.name}</div>
                    </div>}
                    <div style={{ flex: 1 }} />
                    {/* Time + countdown — LEFT */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, color: 'var(--tx6)' }}>{(m.created_at || m.received_at) ? new Date(m.created_at || m.received_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}</span>
                      {m.otp_code && tl > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: expClr + '12', color: expClr, border: '1px solid ' + expClr + '20' }}>ينتهي خلال {fmtTime(tl)}</span>}
                      {exp && <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'rgba(192,57,43,.08)', color: C.red }}>انتهت الصلاحية</span>}
                    </div>
                  </div>

                  {/* Layer 2: OTP code RIGHT + actions LEFT */}
                  <div style={{ padding: '10px 16px', background: 'rgba(0,0,0,.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {m.otp_code ? <>
                      {/* Code RIGHT */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 4, direction: 'ltr' }}>
                          {m.otp_code.split('').map((d, i, arr) => {
                            const hidden = i >= arr.length - 2
                            return <div key={i} style={{ width: 36, height: 44, borderRadius: 8, background: hidden ? 'rgba(201,168,76,.08)' : exp ? 'rgba(255,255,255,.04)' : 'rgba(39,160,70,.08)', border: '1.5px solid ' + (hidden ? 'rgba(201,168,76,.15)' : exp ? 'rgba(255,255,255,.08)' : 'rgba(39,160,70,.15)'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: hidden ? C.gold : exp ? 'var(--tx5)' : C.ok, fontFamily: 'monospace' }}>{hidden ? '?' : d}</div>
                          })}
                        </div>
                        {m.copied_by && <span style={{ fontSize: 9, color: '#9b59b6', fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: 'rgba(155,89,182,.06)', border: '1px solid rgba(155,89,182,.08)' }}>نسخ: {m.copied_by}</span>}
                      </div>
                      {/* Actions LEFT */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button onClick={() => copyCode(m.otp_code, m)} style={{ height: 36, padding: '0 16px', borderRadius: 8, border: '1px solid ' + (exp ? 'rgba(255,255,255,.08)' : 'rgba(39,160,70,.15)'), background: exp ? 'rgba(255,255,255,.03)' : 'rgba(39,160,70,.06)', color: exp ? 'var(--tx4)' : C.ok, fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>نسخ</button>
                        <button onClick={() => setDeleteConfirm(m.id)} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.03)', color: 'var(--tx5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>×</button>
                      </div>
                    </> : <>
                      <div style={{ flex: 1, textAlign: 'right' }}>
                        {(()=>{
                          const body = m.message_body || ''
                          const isTransfer = /حوالة|transfer|تحويل/i.test(body)
                          if (!isTransfer) return <div style={{ fontSize: 11, color: 'var(--tx4)' }}>{body.substring(0, 80)}</div>
                          const amountMatch = body.match(/(?:مبلغ|Amount)[:\s]*([0-9,.]+)/i)
                          const fromMatch = body.match(/(?:من|From)[:\s]*([^\n]+)/i)
                          const toMatch = body.match(/(?:إلى|To)[:\s]*([^\n]+)/i)
                          const accountMatch = body.match(/(?:Account|حساب)[:\s]*\**(\d+)/i) || body.match(/من[:\s]*(\d+)\*/i)
                          const isIncoming = /واردة|incoming|إيداع/i.test(body)
                          const clr = isIncoming ? C.ok : '#e67e22'
                          return <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {accountMatch && <span style={{ fontSize: 10, color: 'var(--tx5)', direction: 'ltr' }}>حساب **{accountMatch[1]}</span>}
                            <span style={{ fontSize: 10, color: 'var(--tx4)' }}>{isIncoming ? (fromMatch?.[1]?.substring(0, 25) || '') : (toMatch?.[1]?.substring(0, 25) || '')}</span>
                            {amountMatch && <span style={{ fontSize: 15, fontWeight: 900, color: clr, direction: 'ltr' }}>{amountMatch[1]} SAR</span>}
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: clr + '10', color: clr, border: '1px solid ' + clr + '15' }}>{isIncoming ? 'واردة' : 'صادرة'}</span>
                          </div>
                        })()}
                      </div>
                      <button onClick={() => setDeleteConfirm(m.id)} style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.03)', color: 'var(--tx6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>×</button>
                    </>}
                  </div>

                  {/* Permissions */}
                  <div style={{ padding: '6px 14px', background: 'rgba(255,255,255,.01)', borderTop: '1px solid rgba(255,255,255,.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 8, color: 'var(--tx6)' }}>يشوف:</span>
                      {sysUsers.filter(u => permUserIds.includes(u.id)).map(u => (
                        <span key={u.id} style={{ fontSize: 8, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: 'rgba(39,160,70,.06)', color: C.ok, border: '1px solid rgba(39,160,70,.08)' }}>{u.name_ar}</span>
                      ))}
                    </div>
                    <button onClick={() => { setShowPermEdit(showPermEdit === m.id ? null : m.id); setPermEdit(Object.fromEntries(sysUsers.map(u => [u.id, permUserIds.includes(u.id)]))) }} style={{ fontSize: 8, padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(201,168,76,.08)', background: 'rgba(201,168,76,.03)', color: C.gold, cursor: 'pointer', fontFamily: F, fontWeight: 600 }}>تعديل الصلاحيات</button>
                  </div>

                  {showPermEdit === m.id && <div style={{ padding: '8px 14px', background: 'rgba(201,168,76,.02)', borderTop: '1px solid rgba(201,168,76,.05)' }}>
                    <div style={{ fontSize: 9, color: 'var(--tx5)', marginBottom: 6 }}>من يشوف هذه الرسالة:</div>
                    {sysUsers.map(u => (
                      <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', marginBottom: 2 }}>
                        <span style={{ fontSize: 10, color: permEdit[u.id] ? 'var(--tx)' : 'var(--tx5)' }}>{u.name_ar}</span>
                        <button onClick={() => setPermEdit(prev => ({ ...prev, [u.id]: !prev[u.id] }))} style={{ width: 34, height: 18, borderRadius: 9, border: 'none', background: permEdit[u.id] ? C.ok : 'rgba(255,255,255,.1)', cursor: 'pointer', position: 'relative' }}>
                          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, transition: '.2s', ...(permEdit[u.id] ? { right: 2 } : { left: 2 }) }} />
                        </button>
                      </div>
                    ))}
                    <button onClick={async () => {
                      for (const u of sysUsers) {
                        const ex = permissions.find(pm => pm.user_id === u.id && pm.person_id === m.person_id)
                        if (permEdit[u.id]) {
                          if (!ex) await sb.from('otp_permissions').insert({ user_id: u.id, person_id: m.person_id, can_view_all: true, is_active: true })
                          else if (!ex.is_active) await sb.from('otp_permissions').update({ is_active: true }).eq('id', ex.id)
                        } else if (ex) { await sb.from('otp_permissions').delete().eq('id', ex.id) }
                      }
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

      {/* Settings Drawer */}
      {showSetupDrawer && <div onClick={() => { setShowSetupDrawer(false); setDrawerPerson(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(4px)', zIndex: 1000 }}>
        <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', top: 0, left: 0, width: 'min(400px,88vw)', height: '100vh', background: '#141414', borderRight: '1px solid rgba(201,168,76,.08)', display: 'flex', flexDirection: 'column', direction: 'rtl', fontFamily: F }}>
          {/* Drawer header */}
          <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)' }}>الإعدادات</div>
            <button onClick={() => { setShowSetupDrawer(false); setDrawerPerson(null) }} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: 'var(--tx5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>×</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
            {/* Connection info — TOP */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, marginBottom: 8 }}>بيانات الاتصال</div>
              <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(52,131,180,.04)', border: '1px solid rgba(52,131,180,.08)', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.blue }}>Webhook URL</span>
                  <button onClick={() => { navigator.clipboard.writeText('https://gcvshzutdslmdkwqwteh.supabase.co/functions/v1/receive-otp'); toast && toast('تم') }} style={{ fontSize: 10, padding: '5px 14px', borderRadius: 6, border: '1px solid rgba(52,131,180,.15)', background: 'rgba(52,131,180,.08)', color: C.blue, cursor: 'pointer', fontFamily: F, fontWeight: 700 }}>نسخ</button>
                </div>
                <code style={{ fontSize: 11, color: 'rgba(91,155,213,.8)', direction: 'ltr', display: 'block', textAlign: 'left', wordBreak: 'break-all', lineHeight: 1.6 }}>https://gcvshzutdslmdkwqwteh.supabase.co/functions/v1/receive-otp</code>
              </div>
              {/* Format switcher + code box */}
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 0, borderRadius: '8px 8px 0 0', overflow: 'hidden', border: '1px solid rgba(255,255,255,.06)', borderBottom: 'none' }}>
                  {[{v:'text',l:'Text'},{v:'json',l:'JSON'},{v:'url',l:'URL Params'}].map(f2 => (
                    <button key={f2.v} onClick={() => setFmtType(f2.v)} style={{ flex: 1, height: 28, border: 'none', fontFamily: F, fontSize: 9, fontWeight: fmtType === f2.v ? 700 : 500, color: fmtType === f2.v ? C.gold : 'var(--tx6)', background: fmtType === f2.v ? 'rgba(201,168,76,.08)' : 'rgba(255,255,255,.02)', cursor: 'pointer', borderBottom: fmtType === f2.v ? '2px solid ' + C.gold : '2px solid transparent' }}>{f2.l}</button>
                  ))}
                </div>
                <div style={{ padding: '8px 10px', borderRadius: '0 0 8px 8px', background: 'rgba(0,0,0,.2)', border: '1px solid rgba(255,255,255,.06)', borderTop: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <code style={{ flex: 1, fontSize: 9, color: fmtType === 'json' ? C.ok : fmtType === 'url' ? C.blue : C.gold, direction: 'ltr', wordBreak: 'break-all', fontFamily: 'monospace', lineHeight: 1.5 }}>
                    {fmtType === 'text' && '%s|||%m|||%d'}
                    {fmtType === 'json' && '{"device_key":"[KEY]","message":"%m","sender":"%s","timestamp":"%d"}'}
                    {fmtType === 'url' && '?key=[KEY]&sender=%s&message=%m&time=%d'}
                  </code>
                  <button onClick={() => {
                    const v = fmtType === 'text' ? '%s|||%m|||%d' : fmtType === 'json' ? '{"device_key":"[KEY]","message":"%m","sender":"%s","timestamp":"%d"}' : '?key=[KEY]&sender=%s&message=%m&time=%d'
                    navigator.clipboard.writeText(v); toast && toast('تم النسخ')
                  }} style={{ fontSize: 9, padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(201,168,76,.1)', background: 'rgba(201,168,76,.04)', color: C.gold, cursor: 'pointer', fontFamily: F, fontWeight: 600, flexShrink: 0 }}>نسخ</button>
                </div>
              </div>
            </div>

            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 8 }}>الأشخاص ({persons.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {persons.map(p => {
                const isOpen = drawerPerson === p.id
                const perm = permissions.find(pm => pm.person_id === p.id)
                const pMsgs = messages.filter(m => m.person_id === p.id)

                return <div key={p.id} style={{ borderRadius: 12, border: '1px solid ' + (isOpen ? 'rgba(201,168,76,.15)' : 'rgba(255,255,255,.04)'), background: isOpen ? 'rgba(201,168,76,.02)' : 'rgba(255,255,255,.015)', overflow: 'hidden', transition: '.2s' }}>
                  {/* Person row — clickable */}
                  <div onClick={() => setDrawerPerson(isOpen ? null : p.id)} style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,rgba(201,168,76,.12),rgba(201,168,76,.04))', border: '1.5px solid rgba(201,168,76,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: C.gold, flexShrink: 0 }}>{(p.name || '?')[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)', marginBottom: 2 }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--tx5)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span>{pMsgs.length} رسالة</span>
                        <span style={{ color: p.is_active ? C.ok : '#e67e22' }}>{p.is_active ? '● نشط' : '● معطّل'}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--tx6)', transition: '.2s', transform: isOpen ? 'rotate(90deg)' : 'none' }}>▸</span>
                  </div>

                  {/* Expanded details */}
                  {isOpen && <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,.04)' }}>
                    {/* Info cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 12, marginBottom: 10 }}>
                      <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.04)' }}>
                        <div style={{ fontSize: 9, color: 'var(--tx6)', marginBottom: 3 }}>رقم الجوال</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx3)', direction: 'ltr' }}>{p.phone || '—'}</div>
                      </div>
                      <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.04)' }}>
                        <div style={{ fontSize: 9, color: 'var(--tx6)', marginBottom: 3 }}>رقم الهوية</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx3)', direction: 'ltr' }}>{p.id_number || '—'}</div>
                      </div>
                    </div>

                    {/* Device key */}
                    <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(201,168,76,.03)', border: '1px solid rgba(201,168,76,.06)', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--tx5)' }}>Subject (مفتاح الجهاز)</span>
                        <button onClick={() => { navigator.clipboard.writeText(p.device_key); toast && toast('تم النسخ') }} style={{ fontSize: 10, padding: '4px 14px', borderRadius: 6, border: '1px solid rgba(201,168,76,.12)', background: 'rgba(201,168,76,.06)', color: C.gold, cursor: 'pointer', fontFamily: F, fontWeight: 700 }}>نسخ</button>
                      </div>
                      <code style={{ fontSize: 11, color: C.gold, direction: 'ltr', display: 'block', textAlign: 'left', wordBreak: 'break-all', fontWeight: 700, marginBottom: 6 }}>{p.device_key}</code>
                      <div style={{ marginTop: 4, display: 'flex', gap: 4 }}>
                        {[{v:'text',l:'Text',val:p.device_key},{v:'json',l:'JSON',val:`{"device_key":"${p.device_key}","message":"%m","sender":"%s","timestamp":"%d"}`},{v:'url',l:'URL',val:`?key=${p.device_key}&sender=%s&message=%m`}].map(f2 => (
                          <button key={f2.v} onClick={() => { navigator.clipboard.writeText(f2.val); toast && toast('تم نسخ ' + f2.l) }} style={{ flex: 1, height: 24, borderRadius: 4, border: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.02)', color: 'var(--tx5)', fontFamily: F, fontSize: 8, fontWeight: 600, cursor: 'pointer' }}>{f2.l}</button>
                        ))}
                      </div>
                    </div>

                    {/* Person sender controls: enable/disable senders */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--tx4)', marginBottom: 6 }}>الجهات (تنشيط/تعطيل):</div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {SENDERS.filter(s=>s.k!=='*').map(s => {
                          const disabled = (p.disabled_senders || []).includes(s.k)
                          return <button key={s.k} onClick={async () => {
                            const current = p.disabled_senders || []
                            const next = disabled ? current.filter(x => x !== s.k) : [...current, s.k]
                            await sb.from('otp_persons').update({ disabled_senders: next }).eq('id', p.id)
                            load()
                          }} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, color: disabled ? '#e67e22' : C.ok, background: disabled ? 'rgba(230,126,34,.06)' : 'rgba(39,160,70,.06)', border: '1px solid ' + (disabled ? 'rgba(230,126,34,.1)' : 'rgba(39,160,70,.1)'), cursor: 'pointer', fontFamily: F, textDecoration: disabled ? 'line-through' : 'none' }}>{s.l}</button>
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                        <button onClick={async () => { await sb.from('otp_persons').update({ disabled_senders: [] }).eq('id', p.id); load() }} style={{ fontSize: 9, padding: '3px 10px', borderRadius: 5, border: '1px solid rgba(39,160,70,.1)', background: 'rgba(39,160,70,.04)', color: C.ok, cursor: 'pointer', fontFamily: F, fontWeight: 600 }}>تنشيط الكل</button>
                        <button onClick={async () => { await sb.from('otp_persons').update({ disabled_senders: SENDERS.filter(s=>s.k!=='*').map(s=>s.k) }).eq('id', p.id); load() }} style={{ fontSize: 9, padding: '3px 10px', borderRadius: 5, border: '1px solid rgba(230,126,34,.1)', background: 'rgba(230,126,34,.04)', color: '#e67e22', cursor: 'pointer', fontFamily: F, fontWeight: 600 }}>تعطيل الكل</button>
                      </div>
                    </div>

                    {/* Employee access permissions */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--tx4)', marginBottom: 6 }}>صلاحيات الموظفين:</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {sysUsers.map(u => {
                          const userPerm = permissions.find(pm => pm.user_id === u.id && pm.person_id === p.id)
                          const hasAccess = userPerm?.is_active && (userPerm?.can_view_all || (userPerm?.allowed_senders || []).length > 0)
                          return <div key={u.id} style={{ padding: '6px 10px', borderRadius: 8, background: hasAccess ? 'rgba(39,160,70,.03)' : 'rgba(255,255,255,.015)', border: '1px solid ' + (hasAccess ? 'rgba(39,160,70,.06)' : 'rgba(255,255,255,.03)') }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: hasAccess ? 4 : 0 }}>
                              <span style={{ fontSize: 10, fontWeight: 600, color: hasAccess ? 'var(--tx)' : 'var(--tx5)' }}>{u.name_ar}</span>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button onClick={async () => {
                                  if (userPerm) { await sb.from('otp_permissions').update({ can_view_all: !userPerm.can_view_all, is_active: true, allowed_senders: [] }).eq('id', userPerm.id) }
                                  else { await sb.from('otp_permissions').insert({ user_id: u.id, person_id: p.id, can_view_all: true, is_active: true }) }
                                  load()
                                }} style={{ fontSize: 8, padding: '2px 8px', borderRadius: 4, border: '1px solid ' + (userPerm?.can_view_all ? 'rgba(39,160,70,.15)' : 'rgba(255,255,255,.06)'), background: userPerm?.can_view_all ? 'rgba(39,160,70,.06)' : 'transparent', color: userPerm?.can_view_all ? C.ok : 'var(--tx6)', cursor: 'pointer', fontFamily: F, fontWeight: 600 }}>الكل</button>
                                <button onClick={async () => {
                                  if (userPerm) { await sb.from('otp_permissions').delete().eq('id', userPerm.id) }
                                  load()
                                }} style={{ fontSize: 8, padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(192,57,43,.08)', background: !hasAccess ? 'rgba(192,57,43,.04)' : 'transparent', color: !hasAccess ? C.red : 'var(--tx6)', cursor: 'pointer', fontFamily: F, fontWeight: 600 }}>منع</button>
                              </div>
                            </div>
                            {hasAccess && !userPerm?.can_view_all && <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 2 }}>
                              {SENDERS.filter(s => s.k !== '*').map(s => {
                                const on = (userPerm?.allowed_senders || []).includes(s.k)
                                return <button key={s.k} onClick={async () => {
                                  if (!userPerm) return
                                  const next = on ? (userPerm.allowed_senders || []).filter(x => x !== s.k) : [...(userPerm.allowed_senders || []), s.k]
                                  await sb.from('otp_permissions').update({ allowed_senders: next }).eq('id', userPerm.id); load()
                                }} style={{ fontSize: 7, padding: '1px 6px', borderRadius: 3, border: '1px solid ' + (on ? 'rgba(39,160,70,.1)' : 'rgba(255,255,255,.04)'), background: on ? 'rgba(39,160,70,.04)' : 'transparent', color: on ? C.ok : 'var(--tx6)', cursor: 'pointer', fontFamily: F }}>{s.l}</button>
                              })}
                            </div>}
                            {hasAccess && userPerm?.can_view_all && <div style={{ fontSize: 8, color: C.ok, marginTop: 2 }}>يشوف جميع الجهات</div>}
                          </div>
                        })}
                      </div>
                    </div>

                    {/* Recent messages */}
                    {pMsgs.length > 0 && <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 9, color: 'var(--tx5)', marginBottom: 4 }}>آخر الرسائل:</div>
                      {pMsgs.slice(0, 3).map(m => (
                        <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,.02)', marginBottom: 3, fontSize: 9 }}>
                          <span style={{ color: 'var(--tx4)' }}>{detectService(m.phone_from).name}</span>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            {m.otp_code && <code style={{ color: C.ok, fontWeight: 700, fontSize: 10, direction: 'ltr' }}>{m.otp_code}</code>}
                            <span style={{ color: 'var(--tx6)', fontSize: 8 }}>{m.received_at ? new Date(m.received_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                          </div>
                        </div>
                      ))}
                    </div>}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <button onClick={async () => { await sb.from('otp_persons').update({ is_active: !p.is_active }).eq('id', p.id); load() }} style={{ flex: 1, height: 36, borderRadius: 8, border: '1px solid ' + (p.is_active ? 'rgba(230,126,34,.15)' : 'rgba(39,160,70,.15)'), background: p.is_active ? 'rgba(230,126,34,.06)' : 'rgba(39,160,70,.06)', color: p.is_active ? '#e67e22' : C.ok, fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{p.is_active ? 'تعطيل' : 'تفعيل'}</button>
                      <button onClick={async () => { if (!confirm('حذف ' + p.name + '؟')) return; await sb.from('otp_messages').delete().eq('person_id', p.id); await sb.from('otp_permissions').delete().eq('person_id', p.id); await sb.from('otp_persons').delete().eq('id', p.id); setDrawerPerson(null); load(); toast && toast('تم الحذف') }} style={{ height: 36, padding: '0 16px', borderRadius: 8, border: '1px solid rgba(192,57,43,.15)', background: 'rgba(192,57,43,.06)', color: C.red, fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>حذف</button>
                    </div>
                  </div>}
                </div>
              })}
            </div>
          </div>
        </div>
      </div>}

      {/* Add Person Modal */}
      {showAdd && <div onClick={closeAdd} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: '#141414', borderRadius: 18, width: 'min(460px,94vw)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(201,168,76,.1)', direction: 'rtl', fontFamily: F, boxShadow: '0 24px 60px rgba(0,0,0,.5)' }}>
          {/* Gold accent bar */}
          <div style={{ height: 3, background: 'linear-gradient(90deg,transparent,' + C.gold + '50,' + C.gold + ',' + C.gold + '50,transparent)', flexShrink: 0 }} />
          <div style={{ padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)' }}>إضافة شخص</div>
              <div style={{ fontSize: 9, color: 'var(--tx6)', marginTop: 2 }}>{!addMode ? 'اختر نوع الإضافة' : addMode === 'existing' ? (selectedPerson ? 'تم اختيار: ' + selectedPerson.name_ar : 'ابحث عن مالك') : 'تسجيل بيانات جديدة'}</div>
            </div>
            <button onClick={closeAdd} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: 'var(--tx5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Mode selector */}
            {!addMode && <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              {[{v:'existing',l:'مالك موجود',d:'اختر من الملّاك المسجلين',ic:'👤'},{v:'new',l:'شخص جديد',d:'تسجيل بيانات جديدة',ic:'+'}].map(o => (
                <button key={o.v} onClick={() => setAddMode(o.v)} style={{ flex: 1, padding: '28px 14px', borderRadius: 14, border: '1.5px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.015)', cursor: 'pointer', textAlign: 'center', fontFamily: F, transition: '.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,.25)'; e.currentTarget.style.background = 'rgba(201,168,76,.03)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)'; e.currentTarget.style.background = 'rgba(255,255,255,.015)' }}>
                  <div style={{ fontSize: 24, marginBottom: 8, opacity: .6 }}>{o.ic}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 4 }}>{o.l}</div>
                  <div style={{ fontSize: 9, color: 'var(--tx5)', lineHeight: 1.5 }}>{o.d}</div>
                </button>
              ))}
            </div>}

            {/* Existing: search owners */}
            {addMode === 'existing' && !selectedPerson && <>
              <div style={{ position: 'relative' }}>
                <input value={addSearch} onChange={e => setAddSearch(e.target.value)} placeholder="ابحث بالاسم..." style={{ ...sF, paddingRight: 36 }} autoFocus />
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--tx6)' }}>🔍</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {allUsers.filter(u => !addSearch || u.name_ar?.includes(addSearch) || u.name_en?.toLowerCase().includes(addSearch.toLowerCase())).map(u => (
                  <div key={u.id} onClick={() => setSelectedPerson(u)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,.02)', border: '1.5px solid rgba(255,255,255,.04)', cursor: 'pointer', transition: '.15s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,.2)'; e.currentTarget.style.background = 'rgba(201,168,76,.03)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.04)'; e.currentTarget.style.background = 'rgba(255,255,255,.02)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,rgba(201,168,76,.12),rgba(201,168,76,.04))', border: '1.5px solid rgba(201,168,76,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: C.gold, flexShrink: 0 }}>{(u.name_ar || '?')[0]}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{u.name_ar}</span>
                        {u.name_en && <span style={{ fontSize: 10, color: 'var(--tx5)', fontFamily: 'monospace', direction: 'ltr' }}>{u.name_en}</span>}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--tx6)', direction: 'ltr', display: 'flex', gap: 10 }}>
                        {u.id_number && <span>🪪 {u.id_number}</span>}
                        {(u.mobile_work || u.mobile_personal) && <span>📱 {u.mobile_work || u.mobile_personal}</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {allUsers.filter(u => !addSearch || u.name_ar?.includes(addSearch) || u.name_en?.toLowerCase().includes(addSearch.toLowerCase())).length === 0 && <div style={{ textAlign: 'center', padding: 24, color: 'var(--tx6)', fontSize: 11 }}>لا توجد نتائج</div>}
              </div>
            </>}

            {/* Selected person preview */}
            {addMode === 'existing' && selectedPerson && <div>
              <div style={{ padding: '16px 18px', borderRadius: 14, background: 'linear-gradient(135deg,rgba(201,168,76,.05),rgba(201,168,76,.02))', border: '1.5px solid rgba(201,168,76,.12)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(201,168,76,.1)', border: '1.5px solid rgba(201,168,76,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: C.gold }}>{selectedPerson.name_ar[0]}</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)' }}>{selectedPerson.name_ar}</div>
                      {selectedPerson.name_en && <div style={{ fontSize: 10, color: 'var(--tx5)', fontFamily: 'monospace', direction: 'ltr', marginTop: 1 }}>{selectedPerson.name_en}</div>}
                    </div>
                  </div>
                  <button onClick={() => setSelectedPerson(null)} style={{ fontSize: 9, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: 'var(--tx4)', cursor: 'pointer', fontFamily: F, fontWeight: 600 }}>تغيير</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {selectedPerson.id_number && <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.04)' }}><div style={{ fontSize: 8, color: 'var(--tx6)', marginBottom: 3 }}>رقم الهوية</div><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx3)', direction: 'ltr' }}>{selectedPerson.id_number}</div></div>}
                  {(selectedPerson.mobile_work || selectedPerson.mobile_personal) && <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.04)' }}><div style={{ fontSize: 8, color: 'var(--tx6)', marginBottom: 3 }}>رقم الجوال</div><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx3)', direction: 'ltr' }}>{selectedPerson.mobile_work || selectedPerson.mobile_personal}</div></div>}
                </div>
              </div>
            </div>}

            {/* New person form */}
            {addMode === 'new' && <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div><div style={{ fontSize: 9, color: 'var(--tx6)', marginBottom: 4 }}>بالعربي *</div><input value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} placeholder="محمد العمري" style={sF} /></div>
                <div><div style={{ fontSize: 9, color: 'var(--tx6)', marginBottom: 4, direction: 'ltr', textAlign: 'left' }}>English</div><input value={addForm.name_en} onChange={e => setAddForm(p => ({ ...p, name_en: e.target.value }))} placeholder="Mohammed" style={{ ...sF, direction: 'ltr', fontFamily: 'monospace', textAlign: 'left' }} /></div>
              </div>
              <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx4)', marginBottom: 4 }}>رقم الجوال</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, direction: 'ltr' }}>
                  <div style={{ height: 42, padding: '0 10px', borderRadius: '10px 0 0 10px', border: '1.5px solid rgba(255,255,255,.1)', borderRight: 'none', background: 'rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 700, color: 'var(--tx4)', fontFamily: F, flexShrink: 0 }}>+966</div>
                  <input value={addForm.phone} onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 9); setAddForm(p => ({ ...p, phone: v })) }} placeholder="5XXXXXXXX" maxLength={9} style={{ ...sF, borderRadius: '0 10px 10px 0', direction: 'ltr', textAlign: 'left', flex: 1 }} />
                </div>
              </div>
            </>}

            {/* OTP services — shows for both modes after selection */}
            {(addMode === 'new' || (addMode === 'existing' && selectedPerson)) && <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx4)', marginBottom: 6 }}>الجهات:</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {SENDERS.map(s => <button key={s.k} onClick={() => toggleSender(s.k)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 9, fontWeight: addForm.default_senders.includes(s.k) || (s.k === '*' && addForm.default_senders.includes('*')) ? 700 : 500, color: addForm.default_senders.includes(s.k) || (s.k === '*' && addForm.default_senders.includes('*')) ? C.ok : 'var(--tx5)', background: addForm.default_senders.includes(s.k) || (s.k === '*' && addForm.default_senders.includes('*')) ? 'rgba(39,160,70,.06)' : 'transparent', border: '1px solid ' + (addForm.default_senders.includes(s.k) || (s.k === '*' && addForm.default_senders.includes('*')) ? 'rgba(39,160,70,.12)' : 'rgba(255,255,255,.06)'), cursor: 'pointer', fontFamily: F }}>{s.l}</button>)}
              </div>
            </div>}
          </div>

          {/* Footer */}
          {addMode && <div style={{ padding: '14px 22px', borderTop: '1px solid rgba(255,255,255,.05)', display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={closeAdd} style={{ height: 42, padding: '0 18px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,.08)', background: 'transparent', color: 'var(--tx4)', fontFamily: F, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>إلغاء</button>
            <button onClick={addPerson} disabled={saving || (addMode === 'new' && !addForm.name.trim()) || (addMode === 'existing' && !selectedPerson)} style={{ flex: 1, height: 42, borderRadius: 10, border: '1px solid rgba(201,168,76,.25)', background: 'linear-gradient(135deg,rgba(201,168,76,.15),rgba(201,168,76,.08))', color: C.gold, fontFamily: F, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving || (addMode === 'new' && !addForm.name.trim()) || (addMode === 'existing' && !selectedPerson) ? .4 : 1, transition: '.2s' }}>{saving ? '...' : 'إضافة'}</button>
          </div>}
        </div>
      </div>}
    </div>
  )
}
