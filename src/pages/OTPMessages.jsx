import React, { useState, useEffect, useCallback } from 'react'
import SERVICES, { detectService } from './serviceConfig.js'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#D4A017', ok: '#27a046', red: '#c0392b', blue: '#3483b4' }
const OTP_TTL = 60

const SvcLogo = ({ sender, body, size = 44, customAvatars }) => {
  const svc = detectService(sender, body)
  const custom = customAvatars?.[svc.name]
  if (custom) return <img src={custom} alt={svc.name} style={{ width: size, height: size, borderRadius: 11, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,.12)' }} />
  return <div style={{ width: size, height: size, flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: svc.logo ? svc.logo(size) : `<svg width="${size}" height="${size}" viewBox="0 0 40 40"><rect width="40" height="40" rx="11" fill="${svc.color}22"/><rect x=".5" y=".5" width="39" height="39" rx="10.5" fill="none" stroke="${svc.color}" stroke-opacity=".32"/><text x="20" y="26" text-anchor="middle" font-size="18" font-weight="900" fill="${svc.color}">${(svc.name||'?')[0]}</text></svg>` }} />
}

const CountRing = ({ tl, ttl = 60 }) => {
  const expired = tl <= 0
  const sec = expired ? 0 : tl
  const R = 15
  const C_ = 2 * Math.PI * R
  const prog = Math.max(0, Math.min(1, sec / ttl))
  const off = C_ * (1 - prog)
  const color = expired ? '#c0392b' : sec > 30 ? '#27a046' : sec > 15 ? '#e67e22' : '#c0392b'
  return (
    <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
      {expired && <style>{`@keyframes ring-pulse{0%,100%{opacity:.4}50%{opacity:.9}}@keyframes ring-expand{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.35);opacity:0}}`}</style>}
      <svg width="36" height="36" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
        <circle cx="18" cy="18" r={R} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="2.5" />
        {!expired ? (
          <circle cx="18" cy="18" r={R} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={C_} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset 1s linear, stroke .3s' }} />
        ) : <>
          <circle cx="18" cy="18" r={R} fill="none" stroke={color} strokeWidth="2.5" strokeOpacity=".55" strokeDasharray="3 3" style={{ animation: 'ring-pulse 1.6s ease-in-out infinite', transformOrigin: 'center' }} />
          <circle cx="18" cy="18" r={R} fill="none" stroke={color} strokeWidth="1.5" style={{ animation: 'ring-expand 1.6s ease-out infinite', transformOrigin: 'center' }} />
        </>}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: expired ? 10 : 12, fontWeight: 900, color, fontFamily: 'monospace', lineHeight: 1 }}>
        {expired ? '٠' : sec}
      </div>
    </div>
  )
}

export default function OTPMessages({ sb, toast, user, lang }) {
  const T = (a, e) => (lang || 'ar') !== 'en' ? a : e
  const [persons, setPersons] = useState([])
  const [messages, setMessages] = useState([])
  const [selPerson, setSelPerson] = useState('all')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ full_name_ar: '', name: '', name_en: '', phone: '' })
  const [addErr, setAddErr] = useState({})
  const [addDone, setAddDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [permissions, setPermissions] = useState([])
  const [showPermEdit, setShowPermEdit] = useState(null)
  const [permEdit, setPermEdit] = useState({})
  const [sysUsers, setSysUsers] = useState([])
  const [now, setNow] = useState(Date.now())
  const [showSetupDrawer, setShowSetupDrawer] = useState(false)
  const [personSettingsId, setPersonSettingsId] = useState(null)
  const [personSettingsType, setPersonSettingsType] = useState('connection')
  const [editingInfo, setEditingInfo] = useState(false)
  const [editInfo, setEditInfo] = useState({})
  const [deletePersonConfirm, setDeletePersonConfirm] = useState(null)
  const [showStepsAccordion, setShowStepsAccordion] = useState(false)
  const [fmtType, setFmtType] = useState('text') // 'text' | 'json' | 'url'
  const [drawerPerson, setDrawerPerson] = useState(null)
  const [drawerSenders, setDrawerSenders] = useState([])
  const [copyLog, setCopyLog] = useState([])
  const [showCopyLog, setShowCopyLog] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [showRawMsg, setShowRawMsg] = useState(null) // message id // message id to delete
  const [showAvatarSettings, setShowAvatarSettings] = useState(false)
  const [customAvatars, setCustomAvatars] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jisr_custom_avatars') || '{}') } catch { return {} }
  })
  const [avatarSources, setAvatarSources] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jisr_avatar_sources') || '{}') } catch { return {} }
  })
  const updateAvatar = (name, dataUrl) => {
    const next = dataUrl === null ? Object.fromEntries(Object.entries(customAvatars).filter(([k])=>k!==name)) : { ...customAvatars, [name]: dataUrl }
    setCustomAvatars(next); localStorage.setItem('jisr_custom_avatars', JSON.stringify(next))
    if (dataUrl === null) {
      const nextSrc = Object.fromEntries(Object.entries(avatarSources).filter(([k])=>k!==name))
      setAvatarSources(nextSrc); localStorage.setItem('jisr_avatar_sources', JSON.stringify(nextSrc))
    }
  }
  const storeAvatarSource = (name, srcState) => {
    const next = { ...avatarSources, [name]: srcState }
    setAvatarSources(next); localStorage.setItem('jisr_avatar_sources', JSON.stringify(next))
  }
  const [customNames, setCustomNames] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jisr_custom_svc_names') || '{}') } catch { return {} }
  })
  const [customColors, setCustomColors] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jisr_custom_svc_colors') || '{}') } catch { return {} }
  })
  const [customCats, setCustomCats] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('jisr_custom_svc_cats') || '{}')
      // Migrate: old format stored single string → convert to array
      return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v : (v ? [v] : [])]))
    } catch { return {} }
  })
  const [customCategories, setCustomCategories] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jisr_custom_categories') || '[]') } catch { return [] }
  })
  const [editingSvcName, setEditingSvcName] = useState(null)
  const [editSnapshot, setEditSnapshot] = useState(null)
  const startEditingSvc = (svcName) => {
    setEditSnapshot({
      name: svcName,
      customName: customNames[svcName],
      customColor: customColors[svcName],
      customCat: customCats[svcName],
      customAvatar: customAvatars[svcName],
      avatarSource: avatarSources[svcName],
    })
    setEditingSvcName(svcName)
  }
  const saveEditingSvc = () => { setEditSnapshot(null); setEditingSvcName(null) }
  const cancelEditingSvc = () => {
    const s = editSnapshot
    if (!s) { setEditingSvcName(null); return }
    const restore = (setter, storageKey, prev, origVal) => {
      const next = { ...prev }
      if (origVal === undefined) delete next[s.name]
      else next[s.name] = origVal
      localStorage.setItem(storageKey, JSON.stringify(next))
      setter(next)
    }
    restore(setCustomNames, 'jisr_custom_svc_names', customNames, s.customName)
    restore(setCustomColors, 'jisr_custom_svc_colors', customColors, s.customColor)
    restore(setCustomCats, 'jisr_custom_svc_cats', customCats, s.customCat)
    restore(setCustomAvatars, 'jisr_custom_avatars', customAvatars, s.customAvatar)
    restore(setAvatarSources, 'jisr_avatar_sources', avatarSources, s.avatarSource)
    setEditSnapshot(null)
    setEditingSvcName(null)
  }
  const [catAddModal, setCatAddModal] = useState(null) // { ar, en } or null
  const [catDeleteConfirm, setCatDeleteConfirm] = useState(null) // { k, l, isDefault? } or null
  const [msgClassifyPicker, setMsgClassifyPicker] = useState(null) // msg id when picker open
  const [msgCatAddModal, setMsgCatAddModal] = useState(null) // { ar, en, msgId } or null
  const [msgCatDeleteConfirm, setMsgCatDeleteConfirm] = useState(null) // { k, l } or null
  const [msgCategories, setMsgCategories] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('jisr_msg_categories') || 'null')
      if (saved && Array.isArray(saved)) return saved
    } catch {}
    return [
      { k: 'otp',         l: 'رمز تحقق',       l_en: 'OTP' },
      { k: 'notification',l: 'إشعار',          l_en: 'Notification' },
      { k: 'transfer_in', l: 'حوالة واردة',     l_en: 'Incoming Transfer' },
      { k: 'transfer_out',l: 'حوالة صادرة',     l_en: 'Outgoing Transfer' },
      { k: 'purchase',    l: 'شراء',           l_en: 'Purchase' },
      { k: 'bill',        l: 'فاتورة',          l_en: 'Bill' },
      { k: 'service',     l: 'نقل خدمات',       l_en: 'Service Transfer' },
      { k: 'ad',          l: 'إعلان',          l_en: 'Advertisement' },
      { k: 'violation',   l: 'مخالفة',         l_en: 'Violation' },
      { k: 'other',       l: 'أخرى',            l_en: 'Other' },
    ]
  })
  const addMsgCategory = (ar, en) => {
    const key = 'mc_' + Date.now()
    const next = [...msgCategories, { k: key, l: ar, l_en: en }]
    setMsgCategories(next); localStorage.setItem('jisr_msg_categories', JSON.stringify(next))
    return key
  }
  const removeMsgCategory = (key) => {
    const next = msgCategories.filter(c => c.k !== key)
    setMsgCategories(next); localStorage.setItem('jisr_msg_categories', JSON.stringify(next))
  }
  const updateMsgClassifications = async (msgId, cats) => {
    await sb.from('otp_messages').update({ user_classifications: cats }).eq('id', msgId)
    setMessages(prev => prev.map(x => x.id === msgId ? { ...x, user_classifications: cats } : x))
  }
  const [hiddenDefaultCats, setHiddenDefaultCats] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jisr_hidden_default_cats') || '[]') } catch { return [] }
  })
  const hideDefaultCat = (key) => {
    const next = [...new Set([...hiddenDefaultCats, key])]
    setHiddenDefaultCats(next); localStorage.setItem('jisr_hidden_default_cats', JSON.stringify(next))
    // Remove the deleted key from every service's selected cats
    const resetAssigned = Object.fromEntries(
      Object.entries(customCats)
        .map(([k, arr]) => [k, (Array.isArray(arr) ? arr : [arr]).filter(c => c !== key)])
        .filter(([, arr]) => arr.length > 0)
    )
    setCustomCats(resetAssigned); localStorage.setItem('jisr_custom_svc_cats', JSON.stringify(resetAssigned))
  }
  const submitAddCategory = () => {
    const ar = (catAddModal?.ar || '').trim()
    const en = (catAddModal?.en || '').trim()
    if (!ar) return
    const key = 'c_' + Date.now()
    const next = [...customCategories, { k: key, l: ar, l_en: en }]
    setCustomCategories(next); localStorage.setItem('jisr_custom_categories', JSON.stringify(next))
    setCatAddModal(null)
  }
  const removeCustomCategory = (key) => {
    const next = customCategories.filter(c => c.k !== key)
    setCustomCategories(next); localStorage.setItem('jisr_custom_categories', JSON.stringify(next))
    // Remove the deleted key from every service's selected cats
    const resetAssigned = Object.fromEntries(
      Object.entries(customCats)
        .map(([k, arr]) => [k, (Array.isArray(arr) ? arr : [arr]).filter(c => c !== key)])
        .filter(([, arr]) => arr.length > 0)
    )
    setCustomCats(resetAssigned); localStorage.setItem('jisr_custom_svc_cats', JSON.stringify(resetAssigned))
  }
  const updateSvcName = (defaultName, newName) => {
    const next = newName && newName.trim() ? { ...customNames, [defaultName]: newName.trim() } : Object.fromEntries(Object.entries(customNames).filter(([k]) => k !== defaultName))
    setCustomNames(next); localStorage.setItem('jisr_custom_svc_names', JSON.stringify(next))
  }
  const updateSvcColor = (defaultName, color) => {
    const next = color ? { ...customColors, [defaultName]: color } : Object.fromEntries(Object.entries(customColors).filter(([k]) => k !== defaultName))
    setCustomColors(next); localStorage.setItem('jisr_custom_svc_colors', JSON.stringify(next))
  }
  const toggleSvcCat = (defaultName, cat, baseDefaults) => {
    const current = customCats[defaultName] ?? baseDefaults
    const hasIt = current.includes(cat)
    const nextArr = hasIt ? current.filter(c => c !== cat) : [...current, cat]
    // If the array matches the default exactly, remove the override
    const isDefault = baseDefaults.length === nextArr.length && baseDefaults.every(c => nextArr.includes(c))
    const next = isDefault ? Object.fromEntries(Object.entries(customCats).filter(([k]) => k !== defaultName)) : { ...customCats, [defaultName]: nextArr }
    setCustomCats(next); localStorage.setItem('jisr_custom_svc_cats', JSON.stringify(next))
  }
  const clearSvcCats = (defaultName) => {
    const next = Object.fromEntries(Object.entries(customCats).filter(([k]) => k !== defaultName))
    setCustomCats(next); localStorage.setItem('jisr_custom_svc_cats', JSON.stringify(next))
  }
  // Apply per-service overrides (renamed label + recolored accent + re-categorized) without mutating defaults
  const applySvcOverrides = (svc) => {
    const cats = customCats[svc.name] ?? (svc.cat ? [svc.cat] : [])
    return { ...svc, name: customNames[svc.name] || svc.name, color: customColors[svc.name] || svc.color, cat: cats[0] || svc.cat, cats, _defaultName: svc.name }
  }
  const [cropEditor, setCropEditor] = useState(null) // { name, src, scale, x, y, rotate, flipX, flipY, natW, natH }
  const [cropDrag, setCropDrag] = useState(null)
  const [cropSaved, setCropSaved] = useState(null) // { name, dataUrl } — shows success screen
  const [cropDropHover, setCropDropHover] = useState(false)
  const [cropMode, setCropMode] = useState(false) // when true: draw selection rect on image
  const [cropSel, setCropSel] = useState(null) // { sx, sy, ex, ey } in container px
  const [cropSelDragging, setCropSelDragging] = useState(false)
  const CROP_BOX = 220 // container size in px
  const applySelectionCrop = () => {
    if (!cropSel || !cropEditor) { setCropMode(false); return }
    const minX = Math.min(cropSel.sx, cropSel.ex), maxX = Math.max(cropSel.sx, cropSel.ex)
    const minY = Math.min(cropSel.sy, cropSel.ey), maxY = Math.max(cropSel.sy, cropSel.ey)
    if (maxX - minX < 10 || maxY - minY < 10) { setCropSel(null); setCropMode(false); return }
    const { natW, natH } = cropEditor
    if (!natW || !natH) { setCropSel(null); setCropMode(false); return }
    const ar = natW / natH
    let dW, dH, oX, oY
    if (ar > 1) { dW = CROP_BOX; dH = CROP_BOX / ar; oX = 0; oY = (CROP_BOX - dH) / 2 }
    else { dH = CROP_BOX; dW = CROP_BOX * ar; oY = 0; oX = (CROP_BOX - dW) / 2 }
    const toImgX = px => Math.max(0, Math.min(natW, ((px - oX) / dW) * natW))
    const toImgY = px => Math.max(0, Math.min(natH, ((px - oY) / dH) * natH))
    const srcX = toImgX(minX), srcY = toImgY(minY)
    const srcW = toImgX(maxX) - srcX, srcH = toImgY(maxY) - srcY
    if (srcW < 4 || srcH < 4) { setCropSel(null); setCropMode(false); return }
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(srcW); canvas.height = Math.round(srcH)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height)
      const newSrc = canvas.toDataURL('image/png')
      setCropEditor(prev => prev && ({ ...prev, src: newSrc, natW: canvas.width, natH: canvas.height, scale: 1, x: 0, y: 0, rotate: 0, flipX: false, flipY: false }))
      setCropSel(null); setCropMode(false)
    }
    img.src = cropEditor.src
  }
  const handleCropFile = (file) => {
    if (!file || !file.type?.startsWith('image/')) { toast && toast('الملف ليس صورة'); return }
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => setCropEditor(prev => prev && ({ ...prev, src: reader.result, scale: 1, x: 0, y: 0, rotate: 0, flipX: false, flipY: false, natW: img.width, natH: img.height }))
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  }
  const saveCrop = () => {
    const c = cropEditor; if (!c) return
    const img = new Image()
    img.onload = () => {
      const SZ = 128
      const canvas = document.createElement('canvas'); canvas.width = SZ; canvas.height = SZ
      const ctx = canvas.getContext('2d')
      const cover = Math.max(SZ / img.width, SZ / img.height)
      const bw = img.width * cover, bh = img.height * cover
      const fw = bw * c.scale, fh = bh * c.scale
      ctx.save()
      ctx.translate(SZ / 2 + c.x, SZ / 2 + c.y)
      if (c.rotate) ctx.rotate((c.rotate * Math.PI) / 180)
      ctx.scale(c.flipX ? -1 : 1, c.flipY ? -1 : 1)
      ctx.drawImage(img, -fw / 2, -fh / 2, fw, fh)
      ctx.restore()
      const dataUrl = canvas.toDataURL('image/png')
      updateAvatar(c.name, dataUrl)
      storeAvatarSource(c.name, { src: c.src, scale: c.scale, x: c.x, y: c.y, rotate: c.rotate || 0, flipX: !!c.flipX, flipY: !!c.flipY, natW: c.natW, natH: c.natH })
      setCropEditor(null)
    }
    img.src = c.src
  }

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const [p, m, perm] = await Promise.all([
      sb.from('otp_persons').select('*').order('created_at'),
      sb.from('otp_messages').select('*').order('created_at', { ascending: false }).limit(200),
      sb.from('otp_permissions').select('*')
    ])
    setPersons(p.data || []); setMessages(m.data || []); setPermissions(perm.data || []); setLoading(false)
    sb.from('users').select('id,name_ar').is('deleted_at',null).eq('is_active',true).order('name_ar').then(({data})=>setSysUsers(data||[]))
  }, [sb])

  useEffect(() => { load() }, [load])

  // Auto-refresh
  useEffect(() => {
    const prevIds = new Set(messages.map(m => m.id))
    const interval = setInterval(() => {
      sb.from('otp_messages').select('*').order('created_at', { ascending: false }).limit(200).then(({ data }) => {
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
  // No Hindi numerals - ensure all numbers use Western Arabic (0-9)
  const isExp = (m) => m.otp_code && getTimeLeft(m.created_at || m.received_at) <= 0

  // Message category detection
  const detectMsgCat = (m) => {
    const svc = detectService(m.phone_from, m.message_body)
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

  const toggleRawMsg = async (msg) => {
    const opening = showRawMsg !== msg.id
    setShowRawMsg(opening ? msg.id : null)
    if (!opening || !msg?.id) return
    const viewerName = user?.name_ar || 'مستخدم'
    const existing = (msg.viewed_by || '').split(/[,،]+/).map(s => s.trim()).filter(Boolean)
    if (existing.includes(viewerName)) return
    const nextList = [...existing, viewerName]
    const nextViewedBy = nextList.join('، ')
    const nextCount = parseInt(msg?.view_count || 0) + 1
    await sb.from('otp_messages').update({ viewed_by: nextViewedBy, view_count: nextCount }).eq('id', msg.id)
    setMessages(prev => prev.map(x => x.id === msg.id ? { ...x, viewed_by: nextViewedBy, view_count: nextCount } : x))
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
    const err = {}
    const fullAr = (addForm.full_name_ar || '').trim()
    const shortAr = (addForm.name || '').trim()
    const shortEn = (addForm.name_en || '').trim()
    const phone = (addForm.phone || '').replace(/\D/g, '').slice(0, 9)
    if (!fullAr) err.full_name_ar = 'الرجاء إدخال الاسم الرسمي'
    else if (!/^[\u0600-\u06FF\s]+$/.test(fullAr)) err.full_name_ar = 'يجب أن يحتوي على حروف عربية فقط'
    if (!shortAr) err.name = 'الرجاء إدخال الاسم المختصر بالعربي'
    else if (!/^[\u0600-\u06FF\s]+$/.test(shortAr)) err.name = 'يجب أن يحتوي على حروف عربية فقط'
    if (!shortEn) err.name_en = 'الرجاء إدخال الاسم المختصر بالإنجليزي'
    else if (!/^[a-zA-Z\s]+$/.test(shortEn)) err.name_en = 'يجب أن يحتوي على حروف إنجليزية فقط'
    if (!phone) err.phone = 'الرجاء إدخال رقم الجوال'
    else if (!/^5\d{8}$/.test(phone)) err.phone = 'رقم الجوال يجب أن يبدأ بـ 5 ويتكون من 9 أرقام'
    setAddErr(err); if (Object.keys(err).length > 0) return
    setSaving(true)
    const senders = ['*']
    const { data: created, error } = await sb.from('otp_persons').insert({
      full_name_ar: fullAr,
      name: shortAr,
      name_en: shortEn,
      phone: phone,
      default_senders: senders
    }).select('*').single()
    if (error) toast && toast('خطأ: ' + error.message)
    else { await sb.from('otp_permissions').insert({ person_id: created.id, allowed_senders: senders }); setAddDone(true); load() }
    setSaving(false)
  }
  const closeAdd = () => { setShowAdd(false); setAddErr({}); setAddDone(false); setAddForm({ full_name_ar: '', name: '', name_en: '', phone: '' }) }

  // Filter
  let filtered = selPerson === 'all' ? messages : messages.filter(m => m.person_id === selPerson)
  if (filter === 'otp') filtered = filtered.filter(m => m.otp_code)
  else if (filter === 'transfer') filtered = filtered.filter(m => /حوالة|transfer|تحويل/i.test(m.message_body || ''))
  else if (filter === 'purchase') filtered = filtered.filter(m => /purchase|مشتريات|mada|شراء/i.test(m.message_body || ''))
  else if (filter === 'violation') filtered = filtered.filter(m => /مخالفة|violation/i.test(m.message_body || ''))
  else if (filter !== 'all' && filter !== 'overview') filtered = filtered.filter(m => detectMsgCat(m) === filter)

  const sF = { width: '100%', height: 42, padding: '0 14px', border: '1.5px solid rgba(255,255,255,.1)', borderRadius: 10, fontFamily: F, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.85)', outline: 'none', background: 'rgba(255,255,255,.04)', boxSizing: 'border-box' }
  const SENDERS = [{k:'*',l:'الكل'},{k:'qiwa',l:'قوى'},{k:'nafath',l:'نفاذ'},{k:'absher',l:'أبشر'},{k:'moi',l:'داخلية'},{k:'gosi',l:'GOSI'},{k:'muqeem',l:'مقيم'},{k:'chamber',l:'الغرفة التجارية'},{k:'bank',l:'البنوك'},{k:'other',l:'أخرى'}]
  const ROLES = [{v:'admin',l:'مدير',desc:'صلاحيات كاملة',ic:'♛',c:C.gold},{v:'pro',l:'PRO',desc:'منصات حكومية',ic:'⚙',c:'#9b59b6'},{v:'employee',l:'موظف',desc:'عرض فقط',ic:'👤',c:C.blue}]

  const sideTabs = [
    {v:'overview',l:'نظرة عامة'},
    {v:'all',l:'الكل',n:messages.length},
    {v:'gov',l:'حكومية',n:govMsgs.length+facMsgs.length+workerMsgs.length},
    {v:'bank',l:'بنكية',n:bankMsgs.length},
    {v:'otp',l:'رموز تحقق',n:messages.filter(m=>m.otp_code).length},
    {v:'transfer',l:'حوالات',n:messages.filter(m=>/حوالة|transfer|تحويل/i.test(m.message_body||'')).length},
    {v:'purchase',l:'مشتريات',n:messages.filter(m=>/purchase|mada|شراء/i.test(m.message_body||'')).length},
    {v:'facility',l:'منشآت',n:facMsgs.length},
    {v:'worker',l:'عمال',n:workerMsgs.length},
    {v:'violation',l:'مخالفات',n:messages.filter(m=>/مخالفة/i.test(m.message_body||'')).length},
    {v:'other',l:'أخرى',n:otherMsgs.length}
  ]

  return (
    <div style={{ fontFamily: F, direction: 'rtl', paddingTop: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--tx)' }}>الرسائل النصية</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', marginTop: 6 }}>استقبال وعرض رموز التحقق والإشعارات من المنصات المختلفة</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowAdd(true)} style={{ height: 42, padding: '0 20px', borderRadius: 11, border: '1px solid rgba(212,160,23,.3)', background: 'rgba(212,160,23,.1)', color: C.gold, fontFamily: F, fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'border-color .15s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.55)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.3)' }}>
            إضافة
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          </button>
        </div>
      </div>

      {/* ═══ Content ═══ */}
      <div>
        <div style={{ flex: 1 }}>

          {/* Horizontal Tabs */}
          {(()=>{
            const tabs = [{ id: 'all', name: 'الكل' }, ...persons.map(p => ({ id: p.id, name: p.name, inactive: !p.is_active }))]
            return <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,.15)', marginBottom: 18, justifyContent: 'space-between', alignItems: 'stretch', gap: 8 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
                {tabs.map(t => {
                  const active = selPerson === t.id
                  return <div key={t.id} onClick={() => setSelPerson(t.id)} style={{ padding: '10px 22px 9px', cursor: 'pointer', color: active ? C.gold : (t.inactive ? '#e67e22' : 'rgba(255,255,255,.5)'), fontSize: 14, fontWeight: active ? 800 : 600, borderBottom: active ? '2px solid ' + C.gold : '2px solid transparent', marginBottom: -1, transition: '.15s' }}>{t.name}{t.inactive ? ' ⏸' : ''}</div>
                })}
              </div>
              <button onClick={() => setShowAvatarSettings(true)} title="إعدادات شعارات الجهات" style={{ alignSelf: 'center', width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(212,160,23,.3)', background: 'rgba(212,160,23,.06)', color: C.gold, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
              </button>
            </div>
          })()}

          {/* Stat cards */}
          {(()=>{
            const tabMsgs = selPerson === 'all' ? messages : messages.filter(m => m.person_id === selPerson)
            const copiedMsgs = tabMsgs.filter(m => m.copied_by).sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
            const lastCopy = copiedMsgs[0]
            const lastCopySvc = lastCopy ? detectService(lastCopy.phone_from).name : null
            const lastMsg = tabMsgs.length > 0 ? [...tabMsgs].sort((a, b) => new Date(b.created_at || b.received_at).getTime() - new Date(a.created_at || a.received_at).getTime())[0] : null
            const fmtDateTime = (d) => {
              if (!d) return '—'
              const dt = new Date(d)
              const pad = n => String(n).padStart(2, '0')
              return `${dt.getFullYear()}/${pad(dt.getMonth()+1)}/${pad(dt.getDate())} · ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`
            }
            const cardS = { padding: '18px 20px', borderRadius: 14, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)' }
            const lblS = { fontSize: 12, color: 'rgba(255,255,255,.55)', marginBottom: 8, fontWeight: 600 }
            const selectedPerson = selPerson !== 'all' ? persons.find(p => p.id === selPerson) : null
            return <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', fontWeight: 600 }}>عدد الرسائل:</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: C.gold }}>{tabMsgs.length}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', fontWeight: 600 }}>آخر تحديث:</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)', direction: 'ltr' }}>{fmtDateTime(lastMsg?.created_at || lastMsg?.received_at)}</span>
                  </div>
                </div>
                {selectedPerson ? <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <button onClick={() => { setPersonSettingsType('account'); setPersonSettingsId(selectedPerson.id) }} title={'إعدادات حساب ' + selectedPerson.name} style={{ width: 28, height: 28, border: 'none', background: 'transparent', color: C.gold, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0, transition: '.2s' }} onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)' }} onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </button>
                  <button onClick={() => { setPersonSettingsType('connection'); setPersonSettingsId(selectedPerson.id) }} title={'إعدادات اتصال ' + selectedPerson.name} style={{ width: 28, height: 28, border: 'none', background: 'transparent', color: C.gold, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0, transition: '.2s' }} onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)' }} onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                  </button>
                </div>
                : null}
              </div>
            </>
          })()}

          {/* Messages list (when not overview) */}
          {filter !== 'overview' && <>

      {/* Messages */}
      {loading ? <div style={{ textAlign: 'center', padding: 50, color: 'var(--tx5)' }}>...</div> :
        filtered.length === 0 ? <div style={{ textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(212,160,23,.05)', border: '1.5px solid rgba(212,160,23,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: .55 }}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,.6)' }}>لا توجد رسائل</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', maxWidth: 280, lineHeight: 1.7 }}>ستظهر رموز التحقق والإشعارات الواردة هنا فور استلامها</div>
        </div> :
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filtered.map(m => {
              const svc = applySvcOverrides(detectService(m.phone_from, m.message_body))
              const tl = m.otp_code ? getTimeLeft(m.created_at || m.received_at) : -1
              const exp = tl <= 0 && m.otp_code
              const expClr = tl > 30 ? C.ok : tl > 15 ? '#e67e22' : C.red
              const person = persons.find(p => p.id === m.person_id)
              const senderKey = (m.phone_from || '').toLowerCase()
              const msgPerms = permissions.filter(pm => pm.is_active && pm.person_id === m.person_id && (pm.can_view_all || (pm.allowed_senders || []).some(s => senderKey.includes(s.toLowerCase()))))
              const permUserIds = msgPerms.map(pm => pm.user_id)

              return (
                <div key={m.id} style={{ position: 'relative' }}>
                  <button onClick={() => setDeleteConfirm(m.id)} style={{ position: 'absolute', top: -10, left: 14, background: 'var(--bg)', padding: '2px 10px', fontSize: 10, fontWeight: 700, color: 'rgba(192,57,43,.75)', cursor: 'pointer', border: '1px dashed rgba(192,57,43,.45)', borderRadius: 6, fontFamily: F, transition: '.15s', zIndex: 2 }} onMouseEnter={e => { e.currentTarget.style.color = C.red; e.currentTarget.style.borderColor = C.red }} onMouseLeave={e => { e.currentTarget.style.color = 'rgba(192,57,43,.75)'; e.currentTarget.style.borderColor = 'rgba(192,57,43,.45)' }}>حذف</button>
                  <div style={{ borderRadius: 14, background: 'rgba(0,0,0,.35)', border: '1px solid rgba(212,160,23,.3)', transition: '.2s', overflow: 'hidden' }}>
                    {/* Part 1 — Unified header: Avatar + Service + Owner + (CountRing if OTP) + Date */}
                    <div style={{ padding: '10px 14px 18px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,.14)' }}>
                      <SvcLogo sender={m.phone_from} body={m.message_body} size={48} customAvatars={customAvatars} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: svc.color, lineHeight: 1.1 }}>{svc.name}</div>
                          {(() => {
                            const catLabel = { gov: 'حكومي', bank: 'بنوك', other: 'أخرى' }
                            const svcCats = (svc.cats && svc.cats.length ? svc.cats : (svc.cat ? [svc.cat] : []))
                            const labelOf = k => catLabel[k] || customCategories.find(c => c.k === k)?.l || k
                            return svcCats.map(k => (
                              <span key={k} style={{ fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 4, background: svc.color + '20', color: svc.color, border: '1px solid ' + svc.color + '40' }}>{labelOf(k)}</span>
                            ))
                          })()}
                        </div>
                        {person && <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, fontSize: 10.5 }}>
                          <span style={{ color: 'rgba(255,255,255,.62)', fontWeight: 600 }}>صاحب الحساب:</span>
                          <span style={{ color: C.gold, fontWeight: 800 }}>{person.name}</span>
                        </div>}
                      </div>
                      {m.otp_code && <CountRing tl={tl} ttl={OTP_TTL} />}
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', textAlign: 'left', flexShrink: 0 }}>
                        <div style={{ direction: 'ltr' }}>{(m.created_at || m.received_at) ? new Date(m.created_at || m.received_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}</div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,.3)', marginTop: 2, direction: 'ltr' }}>{(()=>{const d=m.created_at||m.received_at; if(!d)return''; const dt=new Date(d); const pad=n=>String(n).padStart(2,'0'); return `${dt.getFullYear()}/${pad(dt.getMonth()+1)}/${pad(dt.getDate())}`})()}</div>
                      </div>
                    </div>

                  {m.otp_code ? <>
                    {/* Part 2 — OTP code + actions + copied by */}
                    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      {/* OTP digits (right in RTL) — last 2 always masked */}
                      <div style={{ display: 'flex', gap: 5, direction: 'ltr', flexShrink: 0 }}>
                        {m.otp_code.split('').map((d, i, arr) => {
                          const hidden = i >= arr.length - 2
                          const visColor = exp ? 'rgba(255,255,255,.35)' : C.ok
                          return <div key={i} style={{
                            width: 34, height: 44,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: hidden ? 14 : 22, fontWeight: 900,
                            color: hidden ? C.gold : visColor,
                            fontFamily: 'monospace',
                            borderRadius: 9, lineHeight: 1,
                            background: hidden ? 'rgba(212,160,23,.1)' : (exp ? 'rgba(255,255,255,.03)' : 'rgba(39,160,70,.1)'),
                            border: '1.5px solid ' + (hidden ? 'rgba(212,160,23,.4)' : (exp ? 'rgba(255,255,255,.1)' : 'rgba(39,160,70,.32)')),
                            textShadow: hidden ? '0 0 10px rgba(212,160,23,.55)' : 'none',
                            transition: '.2s',
                          }}>{hidden ? '●' : d}</div>
                        })}
                      </div>
                      {/* Copied by — plain text, names separated by · */}
                      {m.copied_by && <div style={{ fontSize: 10.5, display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: 'rgba(255,255,255,.55)' }}>نسخ:</span>
                        <span style={{ fontWeight: 700, color: '#b18de0' }}>{String(m.copied_by).split(/[,،/\\|]+/).map(n => n.trim()).filter(Boolean).join(' · ')}</span>
                      </div>}
                      {/* Status + actions (left in RTL) */}
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                        <button onClick={() => copyCode(m.otp_code, m)} style={{ height: 32, padding: '0 14px', borderRadius: 8, border: '1px solid rgba(39,160,70,.38)', background: 'rgba(39,160,70,.12)', color: C.ok, fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                          نسخ
                        </button>
                        <button onClick={() => toggleRawMsg(m)} title="فتح الرسالة" style={{ height: 32, padding: '0 12px', borderRadius: 8, border: '1px solid ' + (showRawMsg === m.id ? 'rgba(212,160,23,.4)' : 'rgba(255,255,255,.22)'), background: showRawMsg === m.id ? 'rgba(212,160,23,.08)' : 'transparent', color: showRawMsg === m.id ? C.gold : 'rgba(255,255,255,.75)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: F, fontSize: 11, fontWeight: 700 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                          الرسالة
                        </button>
                      </div>
                    </div>
                  </> : <>
                  {/* Part 2 — Non-OTP parsed body + action */}
                  <div style={{ position: 'relative', padding: '18px 14px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      {(() => {
                        const active = msgClassifyPicker === m.id
                        const idleColor = 'rgba(255,255,255,.55)', idleBorder = 'rgba(255,255,255,.22)'
                        return <button onClick={() => setMsgClassifyPicker(active ? null : m.id)} title="تعديل فئة الرسالة" style={{ position: 'absolute', top: -11, right: 14, background: 'var(--bg)', padding: '2px 10px', fontSize: 10, fontWeight: 700, color: active ? C.blue : idleColor, cursor: 'pointer', border: '1px dashed ' + (active ? C.blue : idleBorder), borderRadius: 6, fontFamily: F, transition: '.15s', zIndex: 2, display: 'inline-flex', alignItems: 'center', gap: 4 }} onMouseEnter={e => { if (!active) { e.currentTarget.style.color = C.blue; e.currentTarget.style.borderColor = C.blue } }} onMouseLeave={e => { if (!active) { e.currentTarget.style.color = idleColor; e.currentTarget.style.borderColor = idleBorder } }}>
                          <span>تعديل الفئة</span>
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        </button>
                      })()}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {(()=>{
                          const body = m.message_body || ''
                          const isTransfer = /حوالة|transfer|تحويل/i.test(body)
                          // Bill payment / Recharge
                          const isBill = /bill payment|سداد|فاتورة|recharge|شحن/i.test(body)
                          if (isBill) {
                            const amtM = body.match(/Amount[:\s]*([0-9,.]+)/i) || body.match(/مبلغ[:\s]*([0-9,.]+)/i)
                            const billerM = body.match(/Biller[:\s]*([^\s]+(?:\s+[^\s]+)?)/i) || body.match(/الجهة[:\s]*([^\n]+)/i)
                            const acctM = body.match(/Account[:\s]*(\d+)/i) || body.match(/حساب[:\s]*(\d+)/i) || body.match(/From Account[:\s]*(\d+)/i)
                            const isRecharge = /recharge|شحن/i.test(body)
                            const billerName = (billerM?.[1] || '')
                              .replace(/Mobily/gi, 'موبايلي').replace(/STC/gi, 'اس تي سي').replace(/Zain/gi, 'زين')
                              .replace(/Service/gi, 'خدمة').replace(/Recharge/gi, 'شحن').replace(/From/gi, 'من')
                              .replace(/Bill Payment/gi, 'سداد فاتورة').replace(/Account/gi, 'حساب')
                              .replace(/Amount/gi, 'مبلغ').replace(/No/gi, 'رقم').replace(/On/gi, 'في')
                              .trim() || ''
                            return <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-start', direction: 'rtl' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}><span style={{ color: 'rgba(255,255,255,.55)', fontWeight: 600 }}>الفئة:</span><span style={{ color: '#9b59b6', fontWeight: 800 }}>{isRecharge ? 'شحن رصيد' : 'سداد فاتورة'}</span></div>
                              {amtM && <span style={{ fontSize: 15, fontWeight: 900, color: '#9b59b6' }}>{amtM[1]} ر.س</span>}
                              {billerName && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx3)' }}>{billerName}</span>}
                              {acctM && <span style={{ fontSize: 9, color: 'var(--tx5)' }}>من حساب: {acctM[1]}</span>}
                            </div>
                          }
                          if (!isTransfer) {
                            // Smart display for other messages
                            const isPaymentConfirm = /payment.*received|تم.*سداد|تم.*استلام/i.test(body)
                            const isPromo = /سحب|فرصة|عرض|خصم|مجان|اشترك|offer|free|discount/i.test(body)
                            const amtM2 = body.match(/SAR\s*([0-9,.]+)|([0-9,.]+)\s*SAR|([0-9,.]+)\s*ريال/i)
                            const amt2 = amtM2 ? (amtM2[1] || amtM2[2] || amtM2[3]) : null
                            if (isPaymentConfirm && amt2) {
                              return <div style={{ display: 'flex', alignItems: 'center', gap: 8, direction: 'rtl' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}><span style={{ color: 'rgba(255,255,255,.55)', fontWeight: 600 }}>الحالة:</span><span style={{ color: C.ok, fontWeight: 800 }}>تم السداد</span></div>
                                <span style={{ fontSize: 14, fontWeight: 900, color: C.ok }}>{amt2} ر.س</span>
                              </div>
                            }
                            if (isPromo) {
                              return <div style={{ display: 'flex', alignItems: 'center', gap: 8, direction: 'rtl' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}><span style={{ color: 'rgba(255,255,255,.55)', fontWeight: 600 }}>الفئة:</span><span style={{ color: 'var(--tx3)', fontWeight: 800 }}>إعلان</span></div>
                                <span style={{ fontSize: 10, color: 'var(--tx5)' }}>{body.length > 80 ? body.substring(0, 80) + '...' : body}</span>
                              </div>
                            }
                            // GOSI: تسجيل مشترك
                            const isGosi = /تم تسجيل|اشتراك|المشترك/i.test(body)
                            if (isGosi) {
                              const nameM = body.match(/المشترك\s+(.+?)\s+رقم/i) || body.match(/تسجيل\s+(.+?)\s+بنجاح/i)
                              const idM = body.match(/المنتهية ب(\d+)/i)
                              const subM = body.match(/اشتراك\s*\(?(\d+)/i)
                              return <div style={{ display: 'flex', flexDirection: 'column', gap: 4, direction: 'rtl' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}><span style={{ color: 'rgba(255,255,255,.55)', fontWeight: 600 }}>الفئة:</span><span style={{ color: C.ok, fontWeight: 800 }}>تسجيل مشترك</span></div>
                                  {nameM && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)' }}>{nameM[1]}</span>}
                                </div>
                                <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--tx4)' }}>
                                  {idM && <span>هوية: ***{idM[1]}</span>}
                                  {subM && <span>رقم الاشتراك: {subM[1]}</span>}
                                </div>
                              </div>
                            }
                            // Jawazat: نقل كفالة
                            const isJawazat = /تم نقل|هوية إقامته|صاحب العمل/i.test(body)
                            if (isJawazat) {
                              const nameM2 = body.match(/تم نقل\s+(.+?)\s+رقم/i)
                              const iqM = body.match(/إقامته\s+(\d+\*+)/i)
                              const empM = body.match(/صاحب العمل.*?رقم\s*(\d+\*+)/i) || body.match(/صاحب العمل.*?(\d+\*+)/i)
                              return <div style={{ display: 'flex', flexDirection: 'column', gap: 6, direction: 'rtl' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}><span style={{ color: 'rgba(255,255,255,.55)', fontWeight: 600 }}>الفئة:</span><span style={{ color: C.blue, fontWeight: 800 }}>نقل خدمات</span></div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11 }}>
                                  {nameM2 && <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <span style={{ color: 'var(--tx6)', fontSize: 10 }}>العامل:</span>
                                    <span style={{ fontWeight: 700, color: 'var(--tx)' }}>{nameM2[1]}</span>
                                  </div>}
                                  {iqM && <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <span style={{ color: 'var(--tx6)', fontSize: 10 }}>رقم الإقامة:</span>
                                    <span style={{ fontWeight: 600, color: 'var(--tx3)' }}>{iqM[1]}</span>
                                  </div>}
                                  {empM && <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <span style={{ color: 'var(--tx6)', fontSize: 10 }}>نُقل إلى صاحب العمل:</span>
                                    <span style={{ fontWeight: 600, color: C.ok }}>{empM[1]}</span>
                                  </div>}
                                </div>
                              </div>
                            }
                            // Efaa: مخالفة
                            const isViolation = /مخالفة|قيد مخالفة|ريال.*الصادرة/i.test(body)
                            if (isViolation) {
                              const vNumM = body.match(/مخالفة رقم\s*(\d+)/i)
                              const vAmtM = body.match(/وقيمة\s*(\d+)/i) || body.match(/(\d+)\s*ريال/i)
                              const vDateM = body.match(/بتاريخ\s*([\d\/]+)/i)
                              return <div style={{ display: 'flex', flexDirection: 'column', gap: 4, direction: 'rtl' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}><span style={{ color: 'rgba(255,255,255,.55)', fontWeight: 600 }}>الفئة:</span><span style={{ color: C.red, fontWeight: 800 }}>مخالفة</span></div>
                                  {vAmtM && <span style={{ fontSize: 15, fontWeight: 900, color: C.red }}>{vAmtM[1]} ر.س</span>}
                                </div>
                                <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--tx4)' }}>
                                  {vNumM && <span>رقم: {vNumM[1]}</span>}
                                  {vDateM && <span>تاريخ: {vDateM[1]}</span>}
                                </div>
                              </div>
                            }
                            // Purchase: مشتريات مدى
                            const isPurchase = /purchase|مشتريات|mada/i.test(body)
                            if (isPurchase) {
                              const pAmtM = body.match(/Amount[:\s]*SAR\s*([0-9,.]+)/i) || body.match(/SAR\s*([0-9,.]+)/i)
                              const pAtM = body.match(/At[:\s]*([^\n]+)/i)
                              const pCardM = body.match(/card[:\s]*(\d+\*)/i)
                              const isOnline = /online/i.test(body)
                              return <div style={{ display: 'flex', flexDirection: 'column', gap: 4, direction: 'rtl' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}><span style={{ color: 'rgba(255,255,255,.55)', fontWeight: 600 }}>الفئة:</span><span style={{ color: '#e67e22', fontWeight: 800 }}>{isOnline ? 'شراء أونلاين' : 'شراء مدى'}</span></div>
                                  {pAmtM && <span style={{ fontSize: 15, fontWeight: 900, color: '#e67e22' }}>{pAmtM[1]} ر.س</span>}
                                </div>
                                <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--tx4)' }}>
                                  {pAtM && <span>{pAtM[1].trim()}</span>}
                                  {pCardM && <span>بطاقة: *{pCardM[1]}</span>}
                                </div>
                              </div>
                            }
                            // Mobily bill
                            const isMobilyBill = /فاتورتك|bill.*issued|المستحق/i.test(body)
                            if (isMobilyBill) {
                              const bAmtM = body.match(/بمبلغ\s*([0-9,.]+)/i) || body.match(/amount.*?SAR\s*([0-9,.]+)/i)
                              return <div style={{ display: 'flex', alignItems: 'center', gap: 8, direction: 'rtl' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}><span style={{ color: 'rgba(255,255,255,.55)', fontWeight: 600 }}>الفئة:</span><span style={{ color: '#9b59b6', fontWeight: 800 }}>فاتورة</span></div>
                                {bAmtM && <span style={{ fontSize: 14, fontWeight: 900, color: '#9b59b6' }}>{bAmtM[1]} ر.س</span>}
                              </div>
                            }
                            // Default: show category "غير محددة" — or user classifications if set
                            const userCats = (m.user_classifications || []).map(k => msgCategories.find(c => c.k === k)).filter(Boolean)
                            return <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, flexWrap: 'wrap' }}>
                              <span style={{ color: 'rgba(255,255,255,.55)', fontWeight: 600 }}>الفئة:</span>
                              {userCats.length === 0
                                ? <span style={{ color: 'var(--tx5)', fontWeight: 800 }}>غير محددة</span>
                                : userCats.map(c => <span key={c.k} style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 5, background: 'rgba(52,131,180,.14)', color: C.blue, border: '1px solid rgba(52,131,180,.35)' }}>{c.l}</span>)
                              }
                            </div>
                          }
                          // Parse all fields from the message
                          const amountMatch = body.match(/(?:مبلغ|Amount)[:\s]*([0-9,.]+)/i)
                          const fromMatch = body.match(/(?:من|From|Debit from)[:\s]*([^\n]+)/i)
                          const toMatch = body.match(/(?:إلى|To|Credit to)[:\s]*([^\n]+)/i)
                          const accountMatch = body.match(/Account[:\s]*\**(\d+)/i)
                          const ibanMatch = body.match(/(?:آيبان|IBAN)[:\s]*\*?(\d+)/i)
                          const viaMatch = body.match(/(?:عبر|Via)[:\s]*([^\n]+)/i)
                          const timeMatch = body.match(/(?:في|At)[:\s]*([^\n]+)/i)
                          const isBetween = /between your|بين حساباتك|بين حساباتي/i.test(body)
                          const isIncoming = /واردة|incoming/i.test(body)
                          const typeLabel = isBetween ? 'تحويل بين حساباتي' : isIncoming ? 'حوالة واردة' : 'حوالة صادرة'
                          const clr = isBetween ? C.blue : isIncoming ? C.ok : '#e67e22'
                          return <div style={{ direction: 'rtl' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}><span style={{ color: 'rgba(255,255,255,.55)', fontWeight: 600 }}>الفئة:</span><span style={{ color: clr, fontWeight: 800 }}>{typeLabel}</span></div>
                              {amountMatch && <span style={{ fontSize: 16, fontWeight: 900, color: clr }}>{amountMatch[1]} ر.س</span>}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 10 }}>
                              {fromMatch && <div style={{ color: 'var(--tx3)' }}><span style={{ color: 'var(--tx6)' }}>من: </span>{fromMatch[1].trim().replace(/Debit from/i,'').replace(/\*/g,'').trim()}</div>}
                              {toMatch && <div style={{ color: 'var(--tx3)' }}><span style={{ color: 'var(--tx6)' }}>إلى: </span>{toMatch[1].trim().replace(/Credit to/i,'').replace(/\*/g,'').trim()}</div>}
                              {accountMatch && <div style={{ color: 'var(--tx5)' }}><span style={{ color: 'var(--tx6)' }}>حساب: </span>**{accountMatch[1]}</div>}
                              {ibanMatch && <div style={{ color: 'var(--tx5)' }}><span style={{ color: 'var(--tx6)' }}>آيبان: </span>*{ibanMatch[1]}</div>}
                              {viaMatch && <div style={{ color: 'var(--tx5)' }}><span style={{ color: 'var(--tx6)' }}>عبر: </span>{viaMatch[1].trim().replace(/AL INMA BANK/gi,'بنك الإنماء').replace(/AL RAJHI/gi,'الراجحي').replace(/SNB/gi,'الأهلي').replace(/RIYAD BANK/gi,'بنك الرياض')}</div>}
                              {timeMatch && <div style={{ color: 'var(--tx6)', fontSize: 9 }}>{timeMatch[1].trim()}</div>}
                            </div>
                          </div>
                        })()}
                      </div>
                      <button onClick={() => toggleRawMsg(m)} title="فتح الرسالة" style={{ height: 32, padding: '0 12px', borderRadius: 8, border: '1px solid ' + (showRawMsg === m.id ? 'rgba(212,160,23,.4)' : 'rgba(255,255,255,.22)'), background: showRawMsg === m.id ? 'rgba(212,160,23,.08)' : 'transparent', color: showRawMsg === m.id ? C.gold : 'rgba(255,255,255,.75)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: F, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                        الرسالة
                      </button>
                  </div>
                  </>}

                  {/* Raw message toggle */}
                  {showRawMsg === m.id && <div style={{ padding: '10px 16px', background: 'rgba(0,0,0,.3)', borderTop: '1px solid rgba(255,255,255,.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.6)', letterSpacing: '.2px' }}>الرسالة الأصلية:</div>
                      {(() => {
                        const viewers = (m.viewed_by || '').split(/[,،]+/).map(s => s.trim()).filter(Boolean)
                        if (!viewers.length) return null
                        return (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 9, color: 'var(--tx6)', fontWeight: 600 }}>فتح الرسالة:</span>
                            {viewers.map((n, i) => (
                              <span key={i} style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(212,160,23,.1)', color: C.gold, border: '1px solid rgba(212,160,23,.28)' }}>{n}</span>
                            ))}
                          </div>
                        )
                      })()}
                    </div>
                    <pre style={{ fontSize: 10, color: 'var(--tx3)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.8, fontFamily: F, unicodeBidi: 'plaintext', background: 'rgba(255,255,255,.02)', padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,.04)' }}>{(m.message_body||'').split(/\n/).map((line, i) => <div key={i} dir="auto" style={{ minHeight: '1.8em' }}>{line}</div>)}</pre>
                  </div>}

                  {msgClassifyPicker === m.id && (() => {
                    const selKeys = m.user_classifications || []
                    return <div style={{ padding: '8px 14px 10px', borderTop: '1px solid rgba(255,255,255,.06)', background: 'rgba(0,0,0,.18)' }}>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,.5)', marginBottom: 6, fontWeight: 600 }}>اضغط الفئة لإضافتها أو إزالتها — تُستخدم لتحسين تصنيف Claude تلقائياً</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                        {msgCategories.map(c => {
                          const isSel = selKeys.includes(c.k)
                          return (
                            <div key={c.k} style={{ display: 'inline-flex', alignItems: 'stretch', height: 22, borderRadius: 4, overflow: 'hidden', border: '1px solid ' + (isSel ? 'rgba(52,131,180,.5)' : 'rgba(255,255,255,.1)'), background: isSel ? 'rgba(52,131,180,.14)' : 'transparent' }}>
                              <button onClick={() => {
                                const next = isSel ? selKeys.filter(x => x !== c.k) : [...selKeys, c.k]
                                updateMsgClassifications(m.id, next)
                              }} style={{ fontSize: 9, fontWeight: 700, padding: '0 9px', cursor: 'pointer', fontFamily: F, border: 'none', background: 'transparent', color: isSel ? C.blue : 'rgba(255,255,255,.6)' }}>{c.l}</button>
                              <button onClick={e => { e.stopPropagation(); setMsgCatDeleteConfirm({ k: c.k, l: c.l }) }} title="حذف هذه الفئة" style={{ padding: '0 4px', border: 'none', borderRight: '1px solid rgba(255,255,255,.06)', background: 'transparent', color: 'rgba(192,57,43,.7)', cursor: 'pointer', fontSize: 10, lineHeight: 1 }}>×</button>
                            </div>
                          )
                        })}
                        <button onClick={() => setMsgCatAddModal({ ar: '', en: '', msgId: m.id })} title="إضافة فئة رسالة جديدة" style={{ height: 22, padding: '0 10px', borderRadius: 4, border: '1px dashed rgba(52,131,180,.4)', background: 'rgba(52,131,180,.06)', color: C.blue, cursor: 'pointer', fontFamily: F, fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>+</button>
                      </div>
                    </div>
                  })()}

                  {/* Permissions */}
                  <div style={{ padding: '8px 14px', background: 'rgba(255,255,255,.02)', borderTop: '1px solid rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', fontWeight: 600 }}>مصرّح لهم بالاطلاع:</span>
                      {sysUsers.filter(u => permUserIds.includes(u.id)).map(u => (
                        <span key={u.id} style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: 'rgba(39,160,70,.12)', color: C.ok, border: '1px solid rgba(39,160,70,.3)' }}>{u.name_ar}</span>
                      ))}
                    </div>
                    <button onClick={() => { setShowPermEdit(showPermEdit === m.id ? null : m.id); setPermEdit(Object.fromEntries(sysUsers.map(u => [u.id, permUserIds.includes(u.id)]))) }} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 5, border: '1px solid rgba(212,160,23,.3)', background: 'rgba(212,160,23,.08)', color: C.gold, cursor: 'pointer', fontFamily: F, fontWeight: 700, flexShrink: 0 }}>تعديل الصلاحيات</button>
                  </div>

                  {showPermEdit === m.id && <div style={{ padding: '8px 14px 10px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', marginBottom: 6, fontWeight: 600 }}>اضغط على الاسم للسماح أو المنع:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {sysUsers.map(u => {
                        const allowed = !!permEdit[u.id]
                        return (
                          <button key={u.id} onClick={async () => {
                            const next = !allowed
                            setPermEdit(prev => ({ ...prev, [u.id]: next }))
                            const ex = permissions.find(pm => pm.user_id === u.id && pm.person_id === m.person_id)
                            if (next) {
                              if (!ex) {
                                const { data } = await sb.from('otp_permissions').insert({ user_id: u.id, person_id: m.person_id, can_view_all: true, is_active: true }).select().single()
                                if (data) setPermissions(prev => [...prev, data])
                              } else if (!ex.is_active) {
                                await sb.from('otp_permissions').update({ is_active: true }).eq('id', ex.id)
                                setPermissions(prev => prev.map(p => p.id === ex.id ? { ...p, is_active: true } : p))
                              }
                            } else if (ex) {
                              await sb.from('otp_permissions').delete().eq('id', ex.id)
                              setPermissions(prev => prev.filter(p => p.id !== ex.id))
                            }
                          }} style={{ fontSize: 9.5, fontWeight: 700, padding: '3px 9px', borderRadius: 5, cursor: 'pointer', fontFamily: F, transition: '.15s', border: '1px solid ' + (allowed ? 'rgba(39,160,70,.4)' : 'rgba(192,57,43,.35)'), background: allowed ? 'rgba(39,160,70,.1)' : 'rgba(192,57,43,.08)', color: allowed ? C.ok : C.red }}>{u.name_ar}</button>
                        )
                      })}
                    </div>
                  </div>}
                  </div>{/* end gold-bordered card */}
                </div>
              )
            })}
          </div>
      }

      </>}

      </div>{/* end main content */}
      </div>{/* end flex layout */}

      {/* Avatar Settings Modal */}
      {showAvatarSettings && (
        <div onClick={() => setShowAvatarSettings(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16, fontFamily: F, direction: 'rtl' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1e1e1e', borderRadius: 16, width: 'min(560px,95vw)', maxHeight: '85vh', display: 'flex', flexDirection: 'column', border: '1px solid rgba(212,160,23,.3)', overflow: 'hidden' }}>
            <div style={{ height: 3, background: 'linear-gradient(90deg,transparent,' + C.gold + ',' + C.gold + ',transparent)' }} />
            <div style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.gold }}>تخصيص الجهات</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', marginTop: 3 }}>عدّل الاسم واللون والفئات والصورة لكل جهة حسب احتياجك</div>
              </div>
              <button onClick={() => setShowAvatarSettings(false)} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <style>{`.svc-list-body::-webkit-scrollbar{width:0;height:0;display:none}.svc-list-body{scrollbar-width:none;-ms-overflow-style:none}
              .svc-list-body input:not(:focus):not([type=checkbox]):not([type=radio]):not([type=color]){border-color:rgba(255,255,255,.08)!important;box-shadow:none!important}
              .svc-list-body input[type=color]{border:none!important;box-shadow:none!important;padding:0!important;background:transparent!important}
              .svc-list-body input[type=color]::-webkit-color-swatch-wrapper{padding:0!important;border:none!important}
              .svc-list-body input[type=color]::-webkit-color-swatch{border:none!important;border-radius:6px}
              .svc-list-body input[type=color]::-moz-color-swatch{border:none!important;border-radius:6px}
              .svc-list-body input:focus{border-color:rgba(212,160,23,.55)!important}
              .svc-edit-btn{border-color:rgba(212,160,23,.45);color:rgba(212,160,23,.75);background:var(--bg);transition:.15s}
              .svc-edit-btn:hover{border-color:${C.gold};color:${C.gold}}
              .svc-save-btn{border-color:rgba(39,160,70,.5);color:rgba(39,160,70,.85);background:var(--bg);transition:.15s}
              .svc-save-btn:hover{border-color:${C.ok};color:${C.ok}}
              .svc-cancel-btn{border-color:rgba(192,57,43,.45);color:rgba(192,57,43,.8);background:var(--bg);transition:.15s}
              .svc-cancel-btn:hover{border-color:${C.red};color:${C.red}}`}</style>
            <div className="svc-list-body" style={{ padding: '20px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
              {(() => {
                // Merge predefined SERVICES with any extra services detected from actual messages
                const entries = Object.entries(SERVICES).filter(([k]) => k !== '_default')
                const seenNames = new Set(entries.map(([, s]) => s.name))
                const seenSenders = new Set()
                messages.forEach(m => {
                  const sender = (m.phone_from || '').trim()
                  if (!sender || seenSenders.has(sender.toLowerCase())) return
                  seenSenders.add(sender.toLowerCase())
                  const detected = detectService(m.phone_from, m.message_body)
                  if (detected && detected.name && !seenNames.has(detected.name)) {
                    seenNames.add(detected.name)
                    entries.push([`detected_${detected.name}`, detected])
                  }
                })
                return entries
              })().map(([k, svc]) => {
                const custom = customAvatars[svc.name]
                const savedSrc = avatarSources[svc.name]
                const effName = customNames[svc.name] || svc.name
                const effColor = customColors[svc.name] || svc.color
                const defaultCats = svc.cat ? [svc.cat] : []
                const effCats = customCats[svc.name] ?? defaultCats
                const effCat = effCats[0] || svc.cat
                const catsChanged = effCats.length !== defaultCats.length || !defaultCats.every(c => effCats.includes(c))
                const isEdited = effName !== svc.name || effColor !== svc.color || catsChanged
                const catLabel = { gov: 'حكومي', bank: 'بنوك', other: 'أخرى' }
                return (
                  <div key={k} data-editing={editingSvcName === svc.name ? 'true' : 'false'} style={{ position: 'relative', padding: 10, borderRadius: 12, background: 'rgba(255,255,255,.02)', border: '1px solid ' + (editingSvcName === svc.name ? 'rgba(212,160,23,.35)' : 'rgba(255,255,255,.1)'), display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {editingSvcName === svc.name
                      ? <div style={{ position: 'absolute', top: -12, left: 12, zIndex: 2, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <button onClick={saveEditingSvc} title="حفظ التعديلات" className="svc-save-btn" style={{ height: 24, padding: '0 12px', border: '1px solid', borderRadius: 6, fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <span>حفظ</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          </button>
                          <button onClick={cancelEditingSvc} title="إلغاء التعديل بدون حفظ" className="svc-cancel-btn" style={{ height: 24, padding: '0 12px', border: '1px solid', borderRadius: 6, fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <span>إلغاء التعديل</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                          </button>
                        </div>
                      : <button onClick={() => startEditingSvc(svc.name)} title="تعديل الجهة" className="svc-edit-btn" style={{ position: 'absolute', top: -12, left: 12, height: 24, padding: '0 12px', border: '1px dashed', borderRadius: 6, fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer', zIndex: 2, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <span>تعديل</span>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        </button>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: editingSvcName === svc.name ? 'auto' : 'none', opacity: editingSvcName === svc.name || !editingSvcName ? 1 : .5, filter: editingSvcName === svc.name ? 'none' : 'saturate(.75)' }}>
                    {/* Section 1: Avatar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 12, borderRadius: 8, background: 'rgba(0,0,0,.2)', border: '1px solid rgba(255,255,255,.04)' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.55)', minWidth: 48 }}>الصورة</div>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        {custom
                          ? <img src={custom} alt={effName} style={{ width: 72, height: 72, borderRadius: 16, objectFit: 'cover', border: '1px solid rgba(255,255,255,.12)', display: 'block' }} />
                          : <div style={{ width: 72, height: 72 }} dangerouslySetInnerHTML={{ __html: svc.logo(72) }} />}
                        {editingSvcName === svc.name && (custom && savedSrc?.src
                          ? <button onClick={() => setCropEditor({ name: svc.name, src: savedSrc.src, scale: savedSrc.scale ?? 1, x: savedSrc.x ?? 0, y: savedSrc.y ?? 0, rotate: savedSrc.rotate ?? 0, flipX: !!savedSrc.flipX, flipY: !!savedSrc.flipY, natW: savedSrc.natW ?? 0, natH: savedSrc.natH ?? 0 })} title="تعديل الصورة" style={{ position: 'absolute', bottom: -4, left: -4, width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--bg)', background: C.gold, color: '#141414', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,.4)' }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                            </button>
                          : <button onClick={() => setCropEditor({ name: svc.name, src: '', scale: 1, x: 0, y: 0, rotate: 0, flipX: false, flipY: false, natW: 0, natH: 0 })} title="رفع صورة" style={{ position: 'absolute', bottom: -4, left: -4, width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--bg)', background: C.gold, color: '#141414', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,.4)' }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            </button>
                        )}
                      </div>
                      <div style={{ flex: 1, fontSize: 10, color: 'rgba(255,255,255,.45)', direction: 'ltr', fontFamily: 'monospace', letterSpacing: '.5px', textAlign: 'left' }}>{svc.domain}</div>
                    </div>
                    {/* Section 2: Name + Color */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,.2)', border: '1px solid rgba(255,255,255,.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.55)', minWidth: 48 }}>الاسم</span>
                        {editingSvcName === svc.name
                          ? <input
                              value={effName}
                              onChange={e => updateSvcName(svc.name, e.target.value === svc.name ? '' : e.target.value)}
                              placeholder="اسم الجهة"
                              style={{ flex: 1, height: 30, fontSize: 13, fontWeight: 800, color: 'var(--tx)', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 6, padding: '0 10px', fontFamily: F, outline: 'none', direction: 'rtl', boxSizing: 'border-box' }}
                              onFocus={e => e.currentTarget.style.borderColor = 'rgba(212,160,23,.45)'}
                              onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)'}
                            />
                          : <span style={{ flex: 1, fontSize: 13, fontWeight: 800, color: 'var(--tx)', padding: '0 2px', direction: 'rtl', textAlign: 'right' }}>{effName}</span>
                        }
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.55)', minWidth: 48 }}>اللون</span>
                        {editingSvcName !== svc.name && <div style={{ width: 26, height: 26, borderRadius: 6, background: effColor, flexShrink: 0 }} title={effColor} />}
                        {editingSvcName === svc.name && <>
                          <input type="color" value={effColor} onChange={e => updateSvcColor(svc.name, e.target.value.toUpperCase() === svc.color.toUpperCase() ? null : e.target.value.toUpperCase())} title="منتقي الألوان" style={{ width: 30, height: 26, padding: 0, border: '1px solid rgba(255,255,255,.15)', borderRadius: 6, background: 'transparent', cursor: 'pointer', flexShrink: 0 }} />
                          <button
                            onClick={async () => {
                              if (!('EyeDropper' in window)) { toast && toast('المتصفح لا يدعم قطّارة الألوان'); return }
                              try {
                                const ed = new window.EyeDropper()
                                const r = await ed.open()
                                if (r && r.sRGBHex) updateSvcColor(svc.name, r.sRGBHex.toUpperCase() === svc.color.toUpperCase() ? null : r.sRGBHex.toUpperCase())
                              } catch {}
                            }}
                            title="قطّارة — اختر لوناً من أي مكان (مثل الصورة)"
                            style={{ width: 30, height: 26, padding: 0, border: '1px solid rgba(212,160,23,.35)', borderRadius: 6, background: 'rgba(212,160,23,.08)', color: C.gold, cursor: 'pointer', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4l9 9-2 2-9-9M13 6L4 15v5h5l9-9"/></svg>
                          </button>
                          <input
                            value={effColor}
                            onChange={e => {
                              const v = e.target.value.trim()
                              if (/^#[0-9A-Fa-f]{6}$/.test(v)) updateSvcColor(svc.name, v.toUpperCase() === svc.color.toUpperCase() ? null : v.toUpperCase())
                              else if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setCustomColors(prev => ({ ...prev, [svc.name]: v }))
                            }}
                            placeholder="#RRGGBB"
                            maxLength={7}
                            style={{ height: 26, fontSize: 11, fontFamily: 'monospace', color: effColor, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 5, padding: '0 8px', width: 86, direction: 'ltr', textAlign: 'center', outline: 'none', fontWeight: 700, boxSizing: 'border-box' }}
                          />
                          <div style={{ display: 'flex', gap: 4, flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            {['#2563EB','#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6','#1E4D7A','#00796B'].map(p => (
                              <button key={p} onClick={() => updateSvcColor(svc.name, p === svc.color.toUpperCase() ? null : p)} title={p} style={{ width: 20, height: 20, borderRadius: 5, background: p, border: effColor.toUpperCase() === p ? '2px solid #fff' : '1px solid rgba(255,255,255,.12)', cursor: 'pointer', padding: 0, flexShrink: 0 }} />
                            ))}
                          </div>
                        </>}
                        {editingSvcName !== svc.name && <span style={{ fontSize: 10.5, fontFamily: 'monospace', color: 'rgba(255,255,255,.5)', direction: 'ltr' }}>{effColor}</span>}
                      </div>
                    </div>
                    {/* Section 3: Category */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,.2)', border: '1px solid rgba(255,255,255,.04)', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.55)', minWidth: 48 }}>التصنيف</span>
                      {editingSvcName === svc.name
                        ? <>
                            {[...['gov','bank','other'].filter(c => !hiddenDefaultCats.includes(c)).map(c => ({ k: c, l: catLabel[c], isDefault: true })), ...customCategories.map(c => ({ k: c.k, l: c.l, isDefault: false }))].map(c => {
                              const isSel = effCats.includes(c.k)
                              return (
                                <div key={c.k} style={{ display: 'inline-flex', alignItems: 'stretch', height: 24, borderRadius: 5, overflow: 'hidden', border: '1px solid ' + (isSel ? 'rgba(212,160,23,.45)' : 'rgba(255,255,255,.1)'), background: isSel ? 'rgba(212,160,23,.12)' : 'rgba(255,255,255,.02)' }}>
                                  <button onClick={() => toggleSvcCat(svc.name, c.k, defaultCats)} style={{ fontSize: 10, fontWeight: 700, padding: '0 10px', border: 'none', background: 'transparent', color: isSel ? C.gold : 'rgba(255,255,255,.6)', cursor: 'pointer', fontFamily: F }}>{c.l}</button>
                                  <button onClick={e => { e.stopPropagation(); setCatDeleteConfirm({ k: c.k, l: c.l, isDefault: c.isDefault }) }} title="حذف هذا التصنيف" style={{ padding: '0 5px', border: 'none', borderRight: '1px solid rgba(255,255,255,.06)', background: 'transparent', color: 'rgba(192,57,43,.7)', cursor: 'pointer', fontSize: 11, lineHeight: 1 }}>×</button>
                                </div>
                              )
                            })}
                            <button onClick={() => setCatAddModal({ ar: '', en: '' })} title="إضافة تصنيف جديد" style={{ height: 24, padding: '0 12px', borderRadius: 5, border: '1px dashed rgba(212,160,23,.4)', background: 'rgba(212,160,23,.05)', color: C.gold, cursor: 'pointer', fontFamily: F, fontSize: 13, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>+</button>
                            <div style={{ flex: 1 }} />
                            {isEdited && <button onClick={() => { updateSvcName(svc.name, ''); updateSvcColor(svc.name, null); clearSvcCats(svc.name) }} title="استعادة الافتراضي" style={{ fontSize: 9, fontWeight: 700, padding: '4px 8px', borderRadius: 5, border: '1px solid rgba(255,255,255,.12)', background: 'transparent', color: 'rgba(255,255,255,.55)', cursor: 'pointer', fontFamily: F }}>افتراضي</button>}
                          </>
                        : (() => {
                            const allCats = [...['gov','bank','other'].filter(c => !hiddenDefaultCats.includes(c)).map(c => ({ k: c, l: catLabel[c] })), ...customCategories.map(c => ({ k: c.k, l: c.l }))]
                            const sels = effCats.map(k => allCats.find(c => c.k === k)).filter(Boolean)
                            if (sels.length === 0) return <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', fontFamily: F }}>—</span>
                            return sels.map(s => <span key={s.k} style={{ fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 5, border: '1px solid rgba(212,160,23,.3)', background: 'rgba(212,160,23,.08)', color: C.gold, fontFamily: F }}>{s.l}</span>)
                          })()
                      }
                    </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Image Crop Editor */}
      {cropEditor && (
        <div onClick={() => setCropEditor(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: 16, fontFamily: F, direction: 'rtl' }}>
          <div
            onClick={e => e.stopPropagation()}
            onDragOver={e => { e.preventDefault(); if (!cropDropHover) setCropDropHover(true) }}
            onDragLeave={e => { if (e.currentTarget.contains(e.relatedTarget)) return; setCropDropHover(false) }}
            onDrop={e => { e.preventDefault(); setCropDropHover(false); const file = e.dataTransfer?.files?.[0]; if (file) handleCropFile(file) }}
            style={{ background: '#1a1a1a', borderRadius: 18, width: 'min(560px,92vw)', height: 'min(420px,92vh)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,.5)', border: '1px solid ' + (cropDropHover ? 'rgba(212,160,23,.55)' : 'rgba(212,160,23,.08)'), position: 'relative', transition: 'border-color .15s' }}
          >
            {cropDropHover && <div style={{ position: 'absolute', inset: 8, borderRadius: 12, border: '2px dashed rgba(212,160,23,.6)', background: 'rgba(212,160,23,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, pointerEvents: 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: C.gold }}>
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <div style={{ fontSize: 14, fontWeight: 800 }}>أفلت الصورة هنا</div>
              </div>
            </div>}
            <div style={{ padding: '16px 22px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.gold }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" fill="rgba(212,160,23,.12)"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>
                <span style={{ fontSize: 16, fontWeight: 800 }}>محرر الصورة</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.4)' }}>— {cropEditor.name}</span>
              </div>
              <button onClick={() => setCropEditor(null)} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{ padding: '8px 22px 8px', flex: 1, overflowY: 'auto', display: 'flex', gap: 18, alignItems: 'center' }}>
              <div
                onMouseDown={e => {
                  if (!cropEditor.src) return
                  const rect = e.currentTarget.getBoundingClientRect()
                  const px = e.clientX - rect.left, py = e.clientY - rect.top
                  if (cropMode) { setCropSel({ sx: px, sy: py, ex: px, ey: py }); setCropSelDragging(true) }
                  else setCropDrag({ sx: e.clientX, sy: e.clientY, x0: cropEditor.x, y0: cropEditor.y })
                }}
                onMouseMove={e => {
                  if (cropMode && cropSelDragging) {
                    const rect = e.currentTarget.getBoundingClientRect()
                    setCropSel(prev => prev && ({ ...prev, ex: Math.max(0, Math.min(CROP_BOX, e.clientX - rect.left)), ey: Math.max(0, Math.min(CROP_BOX, e.clientY - rect.top)) }))
                  } else if (cropDrag) {
                    setCropEditor(prev => prev && ({ ...prev, x: cropDrag.x0 + (e.clientX - cropDrag.sx), y: cropDrag.y0 + (e.clientY - cropDrag.sy) }))
                  }
                }}
                onMouseUp={() => { setCropDrag(null); setCropSelDragging(false) }}
                onMouseLeave={() => { setCropDrag(null); setCropSelDragging(false) }}
                onWheel={e => { if (!cropEditor.src || cropMode) return; e.preventDefault(); const delta = e.deltaY < 0 ? 0.05 : -0.05; setCropEditor(prev => prev && ({ ...prev, scale: Math.min(4, Math.max(0.3, prev.scale + delta)) })) }}
                style={{ width: CROP_BOX, height: CROP_BOX, borderRadius: 20, overflow: 'hidden', border: '2px dashed ' + (cropMode ? 'rgba(39,160,70,.65)' : 'rgba(212,160,23,.4)'), background: '#000', position: 'relative', cursor: cropEditor.src ? (cropMode ? 'crosshair' : (cropDrag ? 'grabbing' : 'grab')) : 'default', userSelect: 'none', flexShrink: 0 }}
              >
                {cropEditor.src
                  ? <>
                      <img src={cropEditor.src} draggable={false} alt="" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: cropMode ? 'contain' : 'cover', transform: cropMode ? 'none' : `translate(${cropEditor.x}px, ${cropEditor.y}px) rotate(${cropEditor.rotate || 0}deg) scale(${(cropEditor.flipX ? -1 : 1) * cropEditor.scale}, ${(cropEditor.flipY ? -1 : 1) * cropEditor.scale})`, transformOrigin: 'center', pointerEvents: 'none', background: cropMode ? '#000' : 'transparent' }} />
                      {cropMode && cropSel && (() => {
                        const l = Math.min(cropSel.sx, cropSel.ex), t = Math.min(cropSel.sy, cropSel.ey)
                        const w = Math.abs(cropSel.ex - cropSel.sx), h = Math.abs(cropSel.ey - cropSel.sy)
                        return <>
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 ${t}px, ${l}px ${t}px, ${l}px ${t+h}px, ${l+w}px ${t+h}px, ${l+w}px ${t}px, 0 ${t}px)`, pointerEvents: 'none' }} />
                          <div style={{ position: 'absolute', left: l, top: t, width: w, height: h, border: '2px solid rgba(39,160,70,.95)', boxShadow: '0 0 0 9999px rgba(0,0,0,0)', pointerEvents: 'none' }} />
                        </>
                      })()}
                    </>
                  : <label style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', color: 'rgba(212,160,23,.75)', textAlign: 'center', padding: 16 }}>
                      <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>اضغط هنا للرفع</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)' }}>أو اسحب الصورة وأفلتها</div>
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { handleCropFile(e.target.files?.[0]); e.target.value = '' }} />
                    </label>
                }
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'rgba(255,255,255,.7)', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700 }}>التكبير</span>
                    <span style={{ color: C.gold, fontWeight: 700, direction: 'ltr' }}>{cropEditor.scale.toFixed(2)}x</span>
                  </div>
                  <input type="range" min="0.3" max="4" step="0.01" value={cropEditor.scale} onChange={e => setCropEditor(prev => ({ ...prev, scale: parseFloat(e.target.value) }))} style={{ width: '100%', accentColor: C.gold }} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'rgba(255,255,255,.7)', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700 }}>الدوران</span>
                    <span style={{ color: C.gold, fontWeight: 700, direction: 'ltr' }}>{cropEditor.rotate || 0}°</span>
                  </div>
                  <input type="range" min="-180" max="180" step="1" value={cropEditor.rotate || 0} onChange={e => setCropEditor(prev => ({ ...prev, rotate: parseInt(e.target.value, 10) }))} style={{ width: '100%', accentColor: C.gold }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
                  <button onClick={() => setCropEditor(prev => ({ ...prev, rotate: ((prev.rotate || 0) - 90 + 540) % 360 - 180 }))} title="تدوير يساراً" style={{ height: 32, borderRadius: 7, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.03)', color: 'rgba(255,255,255,.85)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-15-6.7L3 13"/></svg>
                  </button>
                  <button onClick={() => setCropEditor(prev => ({ ...prev, rotate: ((prev.rotate || 0) + 90 + 540) % 360 - 180 }))} title="تدوير يميناً" style={{ height: 32, borderRadius: 7, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.03)', color: 'rgba(255,255,255,.85)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0115-6.7L21 13"/></svg>
                  </button>
                  <button onClick={() => setCropEditor(prev => ({ ...prev, flipX: !prev.flipX }))} title="قلب أفقي" style={{ height: 32, borderRadius: 7, border: '1px solid ' + (cropEditor.flipX ? 'rgba(212,160,23,.4)' : 'rgba(255,255,255,.1)'), background: cropEditor.flipX ? 'rgba(212,160,23,.1)' : 'rgba(255,255,255,.03)', color: cropEditor.flipX ? C.gold : 'rgba(255,255,255,.85)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18"/><path d="M7 8l-4 4 4 4"/><path d="M17 8l4 4-4 4"/></svg>
                  </button>
                  <button onClick={() => setCropEditor(prev => ({ ...prev, flipY: !prev.flipY }))} title="قلب عمودي" style={{ height: 32, borderRadius: 7, border: '1px solid ' + (cropEditor.flipY ? 'rgba(212,160,23,.4)' : 'rgba(255,255,255,.1)'), background: cropEditor.flipY ? 'rgba(212,160,23,.1)' : 'rgba(255,255,255,.03)', color: cropEditor.flipY ? C.gold : 'rgba(255,255,255,.85)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18"/><path d="M8 7l4-4 4 4"/><path d="M8 17l4 4 4-4"/></svg>
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
                  <button onClick={() => setCropEditor(prev => ({ ...prev, y: prev.y - 10 }))} title="تحريك لأعلى" style={{ height: 28, borderRadius: 6, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: 13 }}>↑</button>
                  <button onClick={() => setCropEditor(prev => ({ ...prev, y: prev.y + 10 }))} title="تحريك لأسفل" style={{ height: 28, borderRadius: 6, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: 13 }}>↓</button>
                  <button onClick={() => setCropEditor(prev => ({ ...prev, x: prev.x - 10 }))} title="تحريك لليسار" style={{ height: 28, borderRadius: 6, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: 13 }}>←</button>
                  <button onClick={() => setCropEditor(prev => ({ ...prev, x: prev.x + 10 }))} title="تحريك لليمين" style={{ height: 28, borderRadius: 6, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: 13 }}>→</button>
                </div>
                {cropMode
                  ? <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <button onClick={() => { setCropMode(false); setCropSel(null); setCropSelDragging(false) }} style={{ height: 32, borderRadius: 7, border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.03)', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontFamily: F, fontSize: 11, fontWeight: 700 }}>إلغاء الاقتصاص</button>
                      <button onClick={applySelectionCrop} disabled={!cropSel || Math.abs((cropSel?.ex||0) - (cropSel?.sx||0)) < 10} style={{ height: 32, borderRadius: 7, border: '1px solid rgba(39,160,70,.5)', background: 'rgba(39,160,70,.12)', color: C.ok, cursor: cropSel ? 'pointer' : 'not-allowed', opacity: cropSel ? 1 : .5, fontFamily: F, fontSize: 11, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        تأكيد الاقتصاص
                      </button>
                    </div>
                  : <button onClick={() => { if (!cropEditor.src) return; setCropEditor(prev => prev && ({ ...prev, scale: 1, x: 0, y: 0, rotate: 0, flipX: false, flipY: false })); setCropMode(true); setCropSel(null) }} disabled={!cropEditor.src} style={{ height: 32, borderRadius: 7, border: '1px dashed rgba(39,160,70,.45)', background: 'rgba(39,160,70,.05)', color: cropEditor.src ? C.ok : 'rgba(255,255,255,.3)', cursor: cropEditor.src ? 'pointer' : 'not-allowed', fontFamily: F, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2v14a2 2 0 002 2h14"/><path d="M18 22V8a2 2 0 00-2-2H2"/></svg>
                      اقتصاص جزء من الصورة
                    </button>
                }
                <button onClick={() => setCropEditor(prev => ({ ...prev, scale: 1, x: 0, y: 0, rotate: 0, flipX: false, flipY: false }))} style={{ height: 28, borderRadius: 6, border: '1px solid rgba(255,255,255,.08)', background: 'transparent', color: 'rgba(255,255,255,.55)', cursor: 'pointer', fontFamily: F, fontSize: 10.5, fontWeight: 600 }}>إعادة ضبط كل التعديلات</button>
              </div>
            </div>
            <div style={{ flexShrink: 0, padding: '12px 22px 16px', display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid rgba(255,255,255,.05)' }}>
              <label title="رفع صورة جديدة (أو اسحبها وأفلتها داخل النافذة)" style={{ cursor: 'pointer', height: 38, padding: '0 14px', borderRadius: 9, border: '1px solid rgba(212,160,23,.3)', background: 'rgba(212,160,23,.05)', color: C.gold, display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: F, fontSize: 11, fontWeight: 700 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                رفع صورة
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { handleCropFile(e.target.files?.[0]); e.target.value = '' }} />
              </label>
              <button onClick={() => { const n = cropEditor.name; setCropEditor(null); updateAvatar(n, null) }} title="استخدام الصورة الافتراضية وإزالة الصورة المرفوعة" style={{ height: 38, padding: '0 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.03)', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontFamily: F, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                الصورة الافتراضية
              </button>
              <div style={{ flex: 1 }} />
              <button onClick={saveCrop} disabled={!cropEditor.src} className="add-nav-btn" style={{ height: 40, padding: '0 6px', background: 'transparent', border: 'none', color: C.gold, fontFamily: F, fontSize: 14, fontWeight: 700, cursor: cropEditor.src ? 'pointer' : 'not-allowed', opacity: cropEditor.src ? 1 : .4, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <span>تطبيق</span>
                <span className="nav-ico" style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(212,160,23,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {catAddModal && (
        <div onClick={() => setCatAddModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1250, padding: 16, fontFamily: F, direction: 'rtl' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a1a', borderRadius: 18, width: 'min(440px,92vw)', boxShadow: '0 24px 60px rgba(0,0,0,.5)', border: '1px solid rgba(212,160,23,.08)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.gold }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" fill="rgba(212,160,23,.12)"/><path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                <span style={{ fontSize: 16, fontWeight: 800 }}>إضافة تصنيف جديد</span>
              </div>
              <button onClick={() => setCatAddModal(null)} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.58)', marginBottom: 6 }}>الاسم بالعربي <span style={{ color: '#e74c3c' }}>*</span></div>
                <input autoFocus value={catAddModal.ar} onChange={e => setCatAddModal(p => ({ ...p, ar: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') submitAddCategory() }} placeholder="مثال: اتصالات" style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid rgba(255,255,255,.1)', borderRadius: 9, fontFamily: F, fontSize: 13, fontWeight: 600, color: 'var(--tx)', background: 'rgba(0,0,0,.2)', outline: 'none', direction: 'rtl', textAlign: 'center', boxSizing: 'border-box' }} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.58)', marginBottom: 6 }}>الاسم بالإنجليزي <span style={{ color: '#e74c3c' }}>*</span></div>
                <input value={catAddModal.en} onChange={e => setCatAddModal(p => ({ ...p, en: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') submitAddCategory() }} placeholder="Example: Telecom" style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid rgba(255,255,255,.1)', borderRadius: 9, fontFamily: F, fontSize: 13, fontWeight: 600, color: 'var(--tx)', background: 'rgba(0,0,0,.2)', outline: 'none', direction: 'ltr', textAlign: 'center', boxSizing: 'border-box' }} />
              </div>
            </div>
            <style>{`.cat-add-nav-btn{height:40px;padding:0 6px;background:transparent;border:none;color:${C.gold};font-family:${F};font-size:14px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:.2s}.cat-add-nav-btn .nav-ico{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);display:flex;align-items:center;justify-content:center;transition:.2s;color:${C.gold}}.cat-add-nav-btn:hover:not(:disabled) .nav-ico{background:${C.gold};color:#000}.cat-add-nav-btn:disabled{opacity:.5;cursor:not-allowed}`}</style>
            <div style={{ padding: '12px 22px 16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={submitAddCategory} disabled={!catAddModal.ar.trim() || !catAddModal.en.trim()} className="cat-add-nav-btn">
                <span>إضافة</span>
                <span className="nav-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg></span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {catDeleteConfirm && (
        <div onClick={() => setCatDeleteConfirm(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1250, padding: 16, fontFamily: F, direction: 'rtl' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a1a', borderRadius: 18, width: 'min(380px,92vw)', boxShadow: '0 24px 60px rgba(0,0,0,.5)', border: '1px solid rgba(192,57,43,.15)', overflow: 'hidden' }}>
            <div style={{ padding: '24px 20px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(192,57,43,.1)', border: '2px solid rgba(192,57,43,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>حذف التصنيف "{catDeleteConfirm.l}"؟</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', lineHeight: 1.7 }}>سيتم إزالة هذا التصنيف وإلغاء تعيينه من أي جهة مرتبطة به</div>
            </div>
            <div style={{ padding: '12px 20px 16px', display: 'flex', gap: 8, borderTop: '1px solid rgba(255,255,255,.05)' }}>
              <button onClick={() => setCatDeleteConfirm(null)} style={{ flex: 1, height: 40, borderRadius: 9, border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontFamily: F, fontSize: 12, fontWeight: 700 }}>إلغاء</button>
              <button onClick={() => { if (catDeleteConfirm.isDefault) hideDefaultCat(catDeleteConfirm.k); else removeCustomCategory(catDeleteConfirm.k); setCatDeleteConfirm(null) }} style={{ flex: 1, height: 40, borderRadius: 9, border: '1px solid rgba(192,57,43,.3)', background: 'rgba(192,57,43,.15)', color: C.red, cursor: 'pointer', fontFamily: F, fontSize: 12, fontWeight: 800 }}>حذف</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Message Category Confirmation */}
      {msgCatDeleteConfirm && (
        <div onClick={() => setMsgCatDeleteConfirm(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1260, padding: 16, fontFamily: F, direction: 'rtl' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a1a', borderRadius: 18, width: 'min(380px,92vw)', boxShadow: '0 24px 60px rgba(0,0,0,.5)', border: '1px solid rgba(192,57,43,.15)', overflow: 'hidden' }}>
            <div style={{ padding: '24px 20px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(192,57,43,.1)', border: '2px solid rgba(192,57,43,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>حذف الفئة "{msgCatDeleteConfirm.l}"؟</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', lineHeight: 1.7 }}>سيتم إزالة هذه الفئة من القائمة ومن أي رسالة مسنّدة إليها</div>
            </div>
            <div style={{ padding: '12px 20px 16px', display: 'flex', gap: 8, borderTop: '1px solid rgba(255,255,255,.05)' }}>
              <button onClick={() => setMsgCatDeleteConfirm(null)} style={{ flex: 1, height: 40, borderRadius: 9, border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontFamily: F, fontSize: 12, fontWeight: 700 }}>إلغاء</button>
              <button onClick={() => {
                const key = msgCatDeleteConfirm.k
                removeMsgCategory(key)
                // Also clean up any messages that had this classification
                setMessages(prev => prev.map(x => (x.user_classifications || []).includes(key) ? { ...x, user_classifications: x.user_classifications.filter(c => c !== key) } : x))
                sb.from('otp_messages').select('id,user_classifications').contains('user_classifications', [key]).then(({ data }) => {
                  if (data && data.length) data.forEach(row => {
                    const cleaned = (row.user_classifications || []).filter(c => c !== key)
                    sb.from('otp_messages').update({ user_classifications: cleaned }).eq('id', row.id)
                  })
                })
                setMsgCatDeleteConfirm(null)
              }} style={{ flex: 1, height: 40, borderRadius: 9, border: '1px solid rgba(192,57,43,.3)', background: 'rgba(192,57,43,.15)', color: C.red, cursor: 'pointer', fontFamily: F, fontSize: 12, fontWeight: 800 }}>حذف</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Message Category Modal */}
      {msgCatAddModal && (
        <div onClick={() => setMsgCatAddModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1250, padding: 16, fontFamily: F, direction: 'rtl' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a1a', borderRadius: 18, width: 'min(440px,92vw)', boxShadow: '0 24px 60px rgba(0,0,0,.5)', border: '1px solid rgba(52,131,180,.15)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.blue }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" fill="rgba(52,131,180,.15)"/><path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                <span style={{ fontSize: 16, fontWeight: 800 }}>إضافة فئة رسالة جديدة</span>
              </div>
              <button onClick={() => setMsgCatAddModal(null)} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.58)', marginBottom: 6 }}>الاسم بالعربي <span style={{ color: '#e74c3c' }}>*</span></div>
                <input autoFocus value={msgCatAddModal.ar} onChange={e => setMsgCatAddModal(p => ({ ...p, ar: e.target.value }))} placeholder="مثال: رمز تحقق" style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid rgba(255,255,255,.1)', borderRadius: 9, fontFamily: F, fontSize: 13, fontWeight: 600, color: 'var(--tx)', background: 'rgba(0,0,0,.2)', outline: 'none', direction: 'rtl', textAlign: 'center', boxSizing: 'border-box' }} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.58)', marginBottom: 6 }}>الاسم بالإنجليزي <span style={{ color: '#e74c3c' }}>*</span></div>
                <input value={msgCatAddModal.en} onChange={e => setMsgCatAddModal(p => ({ ...p, en: e.target.value }))} placeholder="Example: OTP" style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid rgba(255,255,255,.1)', borderRadius: 9, fontFamily: F, fontSize: 13, fontWeight: 600, color: 'var(--tx)', background: 'rgba(0,0,0,.2)', outline: 'none', direction: 'ltr', textAlign: 'center', boxSizing: 'border-box' }} />
              </div>
            </div>
            <style>{`.msg-cat-add-btn{height:40px;padding:0 6px;background:transparent;border:none;color:${C.blue};font-family:${F};font-size:14px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:.2s}.msg-cat-add-btn .nav-ico{width:32px;height:32px;border-radius:50%;background:rgba(52,131,180,.12);display:flex;align-items:center;justify-content:center;color:${C.blue}}.msg-cat-add-btn:hover:not(:disabled) .nav-ico{background:${C.blue};color:#fff}.msg-cat-add-btn:disabled{opacity:.5;cursor:not-allowed}`}</style>
            <div style={{ padding: '12px 22px 16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => {
                const ar = msgCatAddModal.ar.trim(), en = msgCatAddModal.en.trim(), msgId = msgCatAddModal.msgId
                if (!ar || !en) return
                const key = addMsgCategory(ar, en)
                // Auto-select the new category on the message that triggered add
                const current = messages.find(x => x.id === msgId)?.user_classifications || []
                updateMsgClassifications(msgId, [...current, key])
                setMsgCatAddModal(null)
              }} disabled={!msgCatAddModal.ar.trim() || !msgCatAddModal.en.trim()} className="msg-cat-add-btn">
                <span>إضافة</span>
                <span className="nav-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg></span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Crop Success Modal */}
      {cropSaved && (
        <div onClick={() => setCropSaved(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: 16, fontFamily: F, direction: 'rtl' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a1a', borderRadius: 18, width: 'min(420px,92vw)', padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 24px 60px rgba(0,0,0,.5)', border: '1px solid rgba(212,160,23,.08)', textAlign: 'center' }}>
            <div style={{ marginBottom: 18 }}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-11" stroke="rgba(39,160,70,.95)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--tx)', marginBottom: 8 }}>تم الحفظ</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', lineHeight: 1.8, marginBottom: 20 }}>تم تحديث صورة جهة <span style={{ color: C.gold, fontWeight: 800 }}>{cropSaved.name}</span> بنجاح</div>
            <button onClick={() => setCropSaved(null)} style={{ height: 42, padding: '0 32px', background: C.gold, border: 'none', borderRadius: 10, fontFamily: F, fontSize: 13, fontWeight: 800, color: '#141414', cursor: 'pointer' }}>تم</button>
          </div>
        </div>
      )}

      {/* Delete Person Confirmation Modal */}
      {deletePersonConfirm && (
        <div onClick={() => setDeletePersonConfirm(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1e1e1e', borderRadius: 16, width: 'min(380px,90vw)', border: '1px solid rgba(192,57,43,.15)', direction: 'rtl', fontFamily: F, overflow: 'hidden' }}>
            <div style={{ height: 3, background: 'linear-gradient(90deg,transparent,' + C.red + ',' + C.red + ',transparent)' }} />
            <div style={{ padding: '24px 20px', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(192,57,43,.1)', border: '2px solid rgba(192,57,43,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>حذف اتصال {deletePersonConfirm.name}؟</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', lineHeight: 1.7 }}>سيتم حذف جميع الرسائل والصلاحيات المرتبطة بهذا الاتصال نهائياً ولا يمكن استرجاعها</div>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', gap: 8 }}>
              <button onClick={() => setDeletePersonConfirm(null)} style={{ flex: 1, height: 42, borderRadius: 10, border: '1.5px solid rgba(255,255,255,.1)', background: 'transparent', color: 'var(--tx4)', fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>إلغاء</button>
              <button onClick={async () => {
                const id = deletePersonConfirm.id
                await sb.from('otp_messages').delete().eq('person_id', id)
                await sb.from('otp_permissions').delete().eq('person_id', id)
                await sb.from('otp_persons').delete().eq('id', id)
                setDeletePersonConfirm(null); setPersonSettingsId(null); setSelPerson('all'); load(); toast && toast('تم الحذف')
              }} style={{ flex: 1, height: 42, borderRadius: 10, border: '1px solid rgba(192,57,43,.3)', background: 'rgba(192,57,43,.15)', color: C.red, fontFamily: F, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>حذف</button>
            </div>
          </div>
        </div>
      )}

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

      {/* Person Settings Modal */}
      {personSettingsId && (() => {
        const p = persons.find(x => x.id === personSettingsId)
        if (!p) return null
        const pMsgs = messages.filter(m => m.person_id === p.id)
        return <div onClick={() => setPersonSettingsId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a1a', borderRadius: 18, width: 'min(640px,94vw)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,.5)', border: '1px solid rgba(212,160,23,.08)', direction: 'rtl', fontFamily: F }}>
            <style>{`input.person-info-input:not(:focus):not(:placeholder-shown):not([type=checkbox]):not([type=radio]){border-color:rgba(255,255,255,.08)!important}input.person-info-input:focus{border-color:rgba(212,160,23,.45)!important}.person-phone-wrap{border:1px solid rgba(255,255,255,.08)!important;transition:border-color .15s}.person-phone-wrap:focus-within{border-color:rgba(212,160,23,.45)!important}.person-phone-inner,.person-phone-inner:focus,.person-phone-inner:not(:placeholder-shown):not([type=checkbox]):not([type=radio]){border:none!important;box-shadow:none!important}`}</style>
            <div style={{ padding: '12px 18px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,rgba(212,160,23,.15),rgba(212,160,23,.05))', border: '1.5px solid rgba(212,160,23,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: C.gold }}>{(p.name || '?')[0]}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.gold }}>{personSettingsType === 'account' ? 'إعدادات حساب ' : 'إعدادات اتصال '}{p.name}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', marginTop: 1 }}>{pMsgs.length} رسالة · {p.is_active ? 'نشط' : 'معطّل'}</div>
                </div>
              </div>
              <button onClick={() => setPersonSettingsId(null)} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
            <div style={{ padding: '6px 18px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Personal info — account tab only */}
              {personSettingsType === 'account' && <div style={{ border: '1.5px solid rgba(212,160,23,.35)', borderRadius: 10, padding: '12px 12px 10px', position: 'relative' }}>
                <div style={{ position: 'absolute', top: -8, right: 12, background: '#1a1a1a', padding: '0 6px', fontSize: 10, fontWeight: 800, color: C.gold }}>البيانات الشخصية</div>
                <span onClick={async () => {
                  if (editingInfo) {
                    const payload = { full_name_ar: (editInfo.full_name_ar || '').trim() || null, name: (editInfo.name || '').trim() || p.name, name_en: (editInfo.name_en || '').trim() || null, phone: (editInfo.phone || '').replace(/\D/g, '').slice(0, 9) || null }
                    const { error } = await sb.from('otp_persons').update(payload).eq('id', p.id)
                    if (error) { toast && toast('خطأ: ' + error.message); return }
                    toast && toast('تم الحفظ'); setEditingInfo(false); load()
                  } else {
                    setEditInfo({ full_name_ar: p.full_name_ar || '', name: p.name || '', name_en: p.name_en || '', phone: p.phone || '' })
                    setEditingInfo(true)
                  }
                }} style={{ position: 'absolute', top: -8, left: 12, background: '#1a1a1a', padding: '0 6px', fontSize: 10, fontWeight: 700, color: editingInfo ? C.ok : 'rgba(255,255,255,.5)', cursor: 'pointer', fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 4, transition: '.15s' }} onMouseEnter={e => e.currentTarget.style.color = editingInfo ? C.ok : C.gold} onMouseLeave={e => e.currentTarget.style.color = editingInfo ? C.ok : 'rgba(255,255,255,.5)'}>
                  {editingInfo ? <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>حفظ</> : <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>تعديل</>}
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 2 }}>
                  {[
                    { k: 'full_name_ar', l: 'الاسم الرسمي', ltr: false },
                    { k: 'name', l: 'الاسم المختصر', ltr: false },
                    { k: 'name_en', l: 'الاسم بالإنجليزي', ltr: true },
                    { k: 'phone', l: 'رقم الجوال', ltr: true, prefix: '+966 ' }
                  ].map(f => <div key={f.k} style={{ padding: '6px 10px', borderRadius: 7, background: 'rgba(0,0,0,.18)', border: '1px solid ' + (editingInfo ? 'rgba(212,160,23,.15)' : 'rgba(255,255,255,.05)'), transition: '.15s' }}>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,.5)', marginBottom: 3, textAlign: 'center' }}>{f.l}</div>
                    {editingInfo ? (f.k === 'phone' ? <div className="person-phone-wrap" style={{ display: 'flex', direction: 'ltr', alignItems: 'center', background: 'rgba(255,255,255,.04)', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{ padding: '0 8px', fontSize: 10, fontWeight: 700, color: C.gold, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,.06)', height: 24, display: 'flex', alignItems: 'center', background: 'rgba(212,160,23,.06)' }}>+966</div>
                      <input className="person-phone-inner" value={editInfo.phone || ''} onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 9); setEditInfo(s => ({ ...s, phone: v })) }} placeholder="5XXXXXXXX" style={{ flex: 1, height: 24, padding: '0 8px', background: 'transparent', outline: 'none', fontFamily: F, fontSize: 11, fontWeight: 700, color: 'var(--tx)', textAlign: 'left' }}/>
                    </div>
                    : <input className="person-info-input" value={editInfo[f.k] || ''} onChange={e => {
                      let v = e.target.value
                      if (f.k === 'name_en') v = v.replace(/[^a-zA-Z\s]/g, '')
                      else v = v.replace(/[^\u0600-\u06FF\s]/g, '')
                      setEditInfo(s => ({ ...s, [f.k]: v }))
                    }} style={{ width: '100%', height: 24, padding: '0 8px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 5, outline: 'none', fontFamily: F, fontSize: 11, fontWeight: 700, color: 'var(--tx)', direction: f.ltr ? 'ltr' : 'rtl', textAlign: 'center', boxSizing: 'border-box', transition: 'border-color .15s' }}/>)
                    : <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx)', direction: f.ltr ? 'ltr' : 'rtl', textAlign: 'center' }}>{(f.prefix && p[f.k]) ? f.prefix + p[f.k] : (p[f.k] || '—')}</div>}
                  </div>)}
                </div>
              </div>}
              {/* Webhook URL — connection only */}
              {personSettingsType === 'connection' && <div style={{ border: '1.5px solid rgba(212,160,23,.35)', borderRadius: 10, padding: '12px 12px 10px', position: 'relative' }}>
                <div style={{ position: 'absolute', top: -8, right: 12, background: '#1a1a1a', padding: '0 6px', fontSize: 10, fontWeight: 800, color: C.gold }}>بيانات الاتصال</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <button onClick={() => { navigator.clipboard.writeText('https://gcvshzutdslmdkwqwteh.supabase.co/functions/v1/receive-otp'); toast && toast('تم النسخ') }} style={{ fontSize: 10, padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(52,131,180,.2)', background: 'rgba(52,131,180,.1)', color: C.blue, cursor: 'pointer', fontFamily: F, fontWeight: 700 }}>نسخ</button>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.blue }}>Webhook URL</span>
                </div>
                <code style={{ fontSize: 10, color: 'rgba(91,155,213,.9)', direction: 'ltr', display: 'block', textAlign: 'left', wordBreak: 'break-all', padding: '6px 10px', borderRadius: 7, background: 'rgba(52,131,180,.04)', border: '1px solid rgba(52,131,180,.08)', lineHeight: 1.5 }}>https://gcvshzutdslmdkwqwteh.supabase.co/functions/v1/receive-otp</code>
              </div>}
              {/* SMS Forwarder templates (ready to paste) — connection only */}
              {personSettingsType === 'connection' && (() => {
                const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
                const body = `{\n  "device_key": "${p.device_key || ''}",\n  "message": "%m",\n  "sender": "%s",\n  "timestamp": "%d"\n}`
                const headers = `{\n  "Authorization": "Bearer ${ANON}"\n}`
                const blockS = { padding: 10, borderRadius: 7, background: 'rgba(0,0,0,.22)', border: '1px solid rgba(255,255,255,.05)', fontSize: 10, direction: 'ltr', textAlign: 'left', fontFamily: 'monospace', lineHeight: 1.65, whiteSpace: 'pre', overflowX: 'auto', margin: 0 }
                return <div style={{ border: '1.5px solid rgba(212,160,23,.35)', borderRadius: 10, padding: '12px 12px 10px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: -8, right: 12, background: '#1a1a1a', padding: '0 6px', fontSize: 10, fontWeight: 800, color: C.gold }}>إعدادات SMS Forwarder</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                        <button onClick={() => { navigator.clipboard.writeText(body); toast && toast('تم النسخ') }} style={{ fontSize: 10, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(212,160,23,.2)', background: 'rgba(212,160,23,.08)', color: C.gold, cursor: 'pointer', fontFamily: F, fontWeight: 700 }}>نسخ</button>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.58)' }}>Request body</span>
                      </div>
                      <pre style={{ ...blockS, color: C.ok }}>{body}</pre>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                        <button onClick={() => { navigator.clipboard.writeText(headers); toast && toast('تم النسخ') }} style={{ fontSize: 10, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(212,160,23,.2)', background: 'rgba(212,160,23,.08)', color: C.gold, cursor: 'pointer', fontFamily: F, fontWeight: 700 }}>نسخ</button>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.58)' }}>Request Headers</span>
                      </div>
                      <pre style={{ ...blockS, color: C.gold }}>{headers}</pre>
                    </div>
                  </div>
                </div>
              })()}
              {/* Senders — account only */}
              {personSettingsType === 'account' && <div style={{ border: '1.5px solid rgba(212,160,23,.35)', borderRadius: 10, padding: '12px 12px 10px', position: 'relative' }}>
                <div style={{ position: 'absolute', top: -8, right: 12, background: '#1a1a1a', padding: '0 6px', fontSize: 10, fontWeight: 800, color: C.gold }}>الجهات</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {SENDERS.filter(s => s.k !== '*').map(s => {
                    const disabled = (p.disabled_senders || []).includes(s.k)
                    return <button key={s.k} onClick={async () => {
                      const current = p.disabled_senders || []
                      const next = disabled ? current.filter(x => x !== s.k) : [...current, s.k]
                      await sb.from('otp_persons').update({ disabled_senders: next }).eq('id', p.id)
                      load()
                    }} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, color: disabled ? '#e67e22' : C.ok, background: disabled ? 'rgba(230,126,34,.08)' : 'rgba(39,160,70,.08)', border: '1px solid ' + (disabled ? 'rgba(230,126,34,.15)' : 'rgba(39,160,70,.15)'), cursor: 'pointer', fontFamily: F, textDecoration: disabled ? 'line-through' : 'none' }}>{s.l}</button>
                  })}
                </div>
              </div>}
              {/* Employee permissions — account only */}
              {personSettingsType === 'account' && <div style={{ border: '1.5px solid rgba(212,160,23,.35)', borderRadius: 10, padding: '12px 12px 10px', position: 'relative' }}>
                <div style={{ position: 'absolute', top: -8, right: 12, background: '#1a1a1a', padding: '0 6px', fontSize: 10, fontWeight: 800, color: C.gold }}>صلاحيات الموظفين</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {sysUsers.length === 0 && <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', textAlign: 'center', padding: 8 }}>لا يوجد موظفون</div>}
                  {sysUsers.map(u => {
                    const userPerm = permissions.find(pm => pm.user_id === u.id && pm.person_id === p.id)
                    const hasAccess = userPerm?.is_active && (userPerm?.can_view_all || (userPerm?.allowed_senders || []).length > 0)
                    return <div key={u.id} style={{ padding: '6px 10px', borderRadius: 7, background: hasAccess ? 'rgba(39,160,70,.04)' : 'rgba(0,0,0,.12)', border: '1px solid ' + (hasAccess ? 'rgba(39,160,70,.1)' : 'rgba(255,255,255,.05)'), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: hasAccess ? 'var(--tx)' : 'rgba(255,255,255,.5)' }}>{u.name_ar}</span>
                      <div style={{ display: 'flex', gap: 3 }}>
                        <button onClick={async () => {
                          if (userPerm) { await sb.from('otp_permissions').update({ can_view_all: !userPerm.can_view_all, is_active: true, allowed_senders: [] }).eq('id', userPerm.id) }
                          else { await sb.from('otp_permissions').insert({ user_id: u.id, person_id: p.id, can_view_all: true, is_active: true }) }
                          load()
                        }} style={{ fontSize: 9, padding: '3px 9px', borderRadius: 5, border: '1px solid ' + (userPerm?.can_view_all ? 'rgba(39,160,70,.2)' : 'rgba(255,255,255,.08)'), background: userPerm?.can_view_all ? 'rgba(39,160,70,.08)' : 'transparent', color: userPerm?.can_view_all ? C.ok : 'rgba(255,255,255,.5)', cursor: 'pointer', fontFamily: F, fontWeight: 700 }}>الكل</button>
                        <button onClick={async () => {
                          if (userPerm) { await sb.from('otp_permissions').delete().eq('id', userPerm.id) }
                          load()
                        }} style={{ fontSize: 9, padding: '3px 9px', borderRadius: 5, border: '1px solid rgba(192,57,43,.12)', background: !hasAccess ? 'rgba(192,57,43,.06)' : 'transparent', color: !hasAccess ? C.red : 'rgba(255,255,255,.5)', cursor: 'pointer', fontFamily: F, fontWeight: 700 }}>منع</button>
                      </div>
                    </div>
                  })}
                </div>
              </div>}
            </div>
            {personSettingsType === 'account' && <div style={{ flexShrink: 0, padding: '8px 18px 12px', display: 'flex', gap: 8 }}>
              <button onClick={() => setDeletePersonConfirm({ id: p.id, name: p.name })} style={{ height: 36, padding: '0 16px', borderRadius: 8, border: '1px solid rgba(192,57,43,.25)', background: 'rgba(192,57,43,.08)', color: C.red, fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>حذف الحساب</button>
              <button onClick={async () => { await sb.from('otp_persons').update({ is_active: !p.is_active }).eq('id', p.id); load() }} style={{ flex: 1, height: 36, borderRadius: 8, border: '1px solid ' + (p.is_active ? 'rgba(230,126,34,.25)' : 'rgba(39,160,70,.25)'), background: p.is_active ? 'rgba(230,126,34,.08)' : 'rgba(39,160,70,.08)', color: p.is_active ? '#e67e22' : C.ok, fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{p.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}</button>
            </div>}
          </div>
        </div>
      })()}


      {/* Add Person Modal — Register-style design */}
      {showAdd && (() => {
        const inpS = { width: '100%', height: 42, padding: '0 14px', border: '1px solid rgba(255,255,255,.1)', borderRadius: 9, fontFamily: F, fontSize: 13, fontWeight: 600, color: 'var(--tx)', background: 'rgba(0,0,0,.18)', outline: 'none', textAlign: 'center', boxSizing: 'border-box', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)' }
        const lblS = { fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.58)', marginBottom: 5 }
        const errClr = 'rgba(192,57,43,.5)'
        return <div onClick={closeAdd} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a1a', borderRadius: 18, width: 'min(560px,92vw)', height: 'min(420px,92vh)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,.5)', border: '1px solid rgba(212,160,23,.08)', direction: 'rtl', fontFamily: F }}>
            <style>{`input.add-person-input:not(:focus):not(:placeholder-shown):not([type=checkbox]):not([type=radio]){border-color:rgba(255,255,255,.1)!important}input.add-person-input.add-person-input-err:not(:focus):not(:placeholder-shown):not([type=checkbox]):not([type=radio]){border-color:rgba(192,57,43,.5)!important}.add-person-phone-inner,.add-person-phone-inner:focus,.add-person-phone-inner:not(:placeholder-shown):not([type=checkbox]):not([type=radio]){border:none!important;box-shadow:none!important}.add-person-phone-wrap:focus-within{border-color:rgba(212,160,23,.55)!important}.add-nav-btn{height:40px;padding:0 6px;background:transparent;border:none;color:${C.gold};font-family:${F};font-size:14px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:.2s}.add-nav-btn .nav-ico{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);display:flex;align-items:center;justify-content:center;transition:.2s;color:${C.gold}}.add-nav-btn:hover:not(:disabled) .nav-ico{background:${C.gold};color:#000}.add-nav-btn:disabled{opacity:.5;cursor:not-allowed}.add-nav-btn:disabled:hover .nav-ico{background:rgba(212,160,23,.1);color:${C.gold}}`}</style>
            {addDone && <div style={{ padding: '20px 22px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(39,160,70,.08)', border: '2px solid rgba(39,160,70,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(39,160,70,.5)" strokeWidth="1.5"/><path d="M8 12l3 3 5-6" stroke="rgba(39,160,70,.9)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--tx)', marginBottom: 10 }}>تم إضافة الشخص بنجاح</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', lineHeight: 1.8, marginBottom: 22, maxWidth: 380 }}>الرجاء الذهاب إلى الإعدادات لربط الرقم بالبرنامج</div>
              <button onClick={closeAdd} style={{ height: 44, padding: '0 28px', background: C.gold, border: 'none', borderRadius: 11, fontFamily: F, fontSize: 13, fontWeight: 800, color: '#141414', cursor: 'pointer' }}>تم</button>
            </div>}
            {!addDone && <div style={{ padding: '16px 22px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.gold }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" fill="rgba(212,160,23,.12)"/><path d="M4 21v-1a6 6 0 0116 0v1" stroke="currentColor" strokeWidth="1.5"/><path d="M20 8v3m0 0v3m0-3h3m-3 0h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                <span style={{ fontSize: 16, fontWeight: 800 }}>إضافة شخص</span>
              </div>
              <button onClick={closeAdd} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>}
            {!addDone && <div style={{ padding: '16px 22px', flex: 1, overflowY: 'auto', scrollbarWidth: 'none', display: 'flex', flexDirection: 'column' }}>
              <div style={{ border: '1.5px solid rgba(212,160,23,.35)', borderRadius: 12, padding: '18px 16px 16px', position: 'relative' }}>
                <div style={{ position: 'absolute', top: -9, right: 14, background: '#1a1a1a', padding: '0 8px', fontSize: 12, fontWeight: 800, color: C.gold }}>بيانات الشخص</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
                  <div>
                    <div style={lblS}>اسم الشخص الرسمي بالعربي <span style={{ color: '#e74c3c' }}>*</span></div>
                    <input className={'add-person-input' + (addErr.full_name_ar ? ' add-person-input-err' : '')} value={addForm.full_name_ar} onChange={e => { const v = e.target.value.replace(/[^\u0600-\u06FF\s]/g, ''); setAddForm(p => ({ ...p, full_name_ar: v })) }} style={inpS} placeholder="محمد عبدالله العمري" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <div style={lblS}>الإسم المختصر بالعربي <span style={{ color: '#e74c3c' }}>*</span></div>
                      <input className={'add-person-input' + (addErr.name ? ' add-person-input-err' : '')} value={addForm.name} onChange={e => { const v = e.target.value.replace(/[^\u0600-\u06FF\s]/g, ''); setAddForm(p => ({ ...p, name: v })) }} style={inpS} placeholder="محمد" />
                    </div>
                    <div>
                      <div style={lblS}>الاسم المختصر بالإنجليزي <span style={{ color: '#e74c3c' }}>*</span></div>
                      <input className={'add-person-input' + (addErr.name_en ? ' add-person-input-err' : '')} value={addForm.name_en} onChange={e => { const v = e.target.value.replace(/[^a-zA-Z\s]/g, ''); setAddForm(p => ({ ...p, name_en: v })) }} style={{ ...inpS, direction: 'ltr' }} placeholder="Mohammed" />
                    </div>
                  </div>
                  <div>
                    <div style={lblS}>رقم الجوال <span style={{ color: '#e74c3c' }}>*</span></div>
                    <div className="add-person-phone-wrap" style={{ display: 'flex', direction: 'ltr', border: addErr.phone ? '1px solid ' + errClr : '1px solid rgba(255,255,255,.1)', borderRadius: 9, overflow: 'hidden', background: 'rgba(0,0,0,.18)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', transition: 'border-color .18s' }}>
                      <div style={{ height: 42, padding: '0 10px', background: 'rgba(255,255,255,.04)', borderRight: '1px solid rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 700, color: C.gold, flexShrink: 0 }}>+966</div>
                      <input className="add-person-phone-inner" value={addForm.phone} onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 9); setAddForm(p => ({ ...p, phone: v })) }} style={{ width: '100%', height: 42, padding: '0 12px', background: 'transparent', fontFamily: F, fontSize: 13, fontWeight: 600, color: 'var(--tx)', outline: 'none', textAlign: 'left' }} placeholder="5X XXX XXXX" />
                    </div>
                  </div>
                </div>
              </div>
            </div>}
            {!addDone && <div style={{ flexShrink: 0, padding: '12px 22px 16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', position: 'relative' }}>
              {(() => { const firstErr = Object.values(addErr)[0]; return firstErr ? <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(192,57,43,.85)', fontWeight: 600, maxWidth: '60%', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{firstErr}</span>
              </div> : null })()}
              <button onClick={addPerson} disabled={saving} className="add-nav-btn">
                <span>{saving ? '...' : 'إضافة'}</span>
                <span className="nav-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg></span>
              </button>
            </div>}
          </div>
        </div>
      })()}
    </div>
  )
}
