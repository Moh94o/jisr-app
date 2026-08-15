import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { Modal, ActionButton, Dropdown } from './ui/FormKit.jsx'
import { Save } from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════════
   محادثة «اكسلات العمليات»

   لكل عرض (view) محادثة واحدة. المستخدم يقدر يسأل عن **صف وقيمة محدَّدة**:
   من كليك يمين على الخلية ← «اسأل عن هذه الخلية»، فتُرفق بالسؤال بطاقة مرجع
   تحمل لقطة (اسم الصف · اسم العمود · القيمة وقت السؤال) فيبقى السؤال واضحاً
   حتى لو تغيّرت البيانات لاحقاً. النقر على البطاقة يقفز للخلية في الجدول.

   «المسؤولون» عن العرض يُختارون من قائمة المستخدمين ويُخزَّنون في
   ops_sheet_config.layout.owners — لا جدول جديد، ويظهرون بشارة في المحادثة.

   الترجمة: كل واحد يكتب بلغته. زر «ترجمة» يترجم رسالة واحدة، واختيار «اعرض
   الكل بـ…» يترجم كل الرسائل تلقائياً للغتك. الترجمة عبر الدالة الطرفية
   ops-chat-translate وتُحفظ في ops_chat_translations فلا تتكرّر الكلفة.
   ═══════════════════════════════════════════════════════════════════════════ */

const F = "'Cairo','Tajawal',sans-serif"
const MONO = 'ui-monospace,SFMono-Regular,Menlo,monospace'
const C = { gold: '#B07D00', gold2: '#D4A017', blue: '#5dade2', red: '#e87265', green: '#2ecc71' }

// لغات الترجمة المتاحة — إضافة لغة = سطر واحد هنا + إضافتها في LANG_NAMES بالدالة الطرفية
export const CHAT_LANGS = [
  { key: 'ar', ar: 'العربية', en: 'Arabic', native: 'العربية' },
  { key: 'en', ar: 'الإنجليزية', en: 'English', native: 'English' },
  { key: 'ur', ar: 'الأردية', en: 'Urdu', native: 'اردو' },
  { key: 'hi', ar: 'الهندية', en: 'Hindi', native: 'हिन्दी' },
  { key: 'bn', ar: 'البنغالية', en: 'Bengali', native: 'বাংলা' },
  { key: 'ne', ar: 'النيبالية', en: 'Nepali', native: 'नेपाली' },
  { key: 'tl', ar: 'الفلبينية', en: 'Filipino', native: 'Filipino' },
  { key: 'id', ar: 'الإندونيسية', en: 'Indonesian', native: 'Bahasa Indonesia' },
]
const LANG_LABEL = (k, isAr) => { const l = CHAT_LANGS.find((x) => x.key === k); return l ? (isAr ? l.ar : l.en) : k }

const LS_LANG = 'jisr_ops_chat_lang'
const personName = (u, isAr) => {
  const p = u?.person
  if (!p) return u?.email || '—'
  return (isAr ? (p.name_ar || p.name_en) : (p.name_en || p.name_ar)) || u?.email || '—'
}
const initial = (s) => String(s || '؟').trim().charAt(0)
const pad2 = (n) => String(n).padStart(2, '0')
const fmtWhen = (iso, isAr) => {
  if (!iso) return ''
  const d = new Date(iso); if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const same = d.toDateString() === now.toDateString()
  const hm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  if (same) return `${isAr ? 'اليوم' : 'Today'} ${hm}`
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${hm}`
}
export const cellMarkKey = (rowKey, colKey) => `${rowKey || ''}||${colKey || ''}`

/* ── قائمة اختيار لغة (بورتال) ─────────────────────────────────────────── */
function LangMenu({ anchorRect, value, onPick, onClose, isAr, allowNone }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    const onDoc = () => onClose()
    const t = setTimeout(() => document.addEventListener('mousedown', onDoc), 0)
    window.addEventListener('keydown', onKey)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', onDoc); window.removeEventListener('keydown', onKey) }
  }, [onClose])
  if (!anchorRect) return null
  const w = 210
  const left = Math.max(8, Math.min(window.innerWidth - w - 8, anchorRect.left))
  const below = window.innerHeight - anchorRect.bottom
  const top = below > 300 ? anchorRect.bottom + 4 : Math.max(8, anchorRect.top - 300)
  return ReactDOM.createPortal(
    <div onMouseDown={(e) => e.stopPropagation()}
      style={{ position: 'fixed', top, left, width: w, zIndex: 3200, background: 'var(--card-grad2,var(--card))',
        border: '1px solid var(--bd)', borderRadius: 11, boxShadow: '0 14px 40px rgba(0,0,0,.36)', padding: 5,
        fontFamily: F, maxHeight: 300, overflowY: 'auto' }}>
      {allowNone && (
        <button onClick={() => { onPick(null); onClose() }} className="oc-mi"
          style={{ color: !value ? C.gold2 : 'var(--tx3)' }}>{isAr ? 'بدون ترجمة (الأصل)' : 'No translation'}</button>
      )}
      {CHAT_LANGS.map((l) => (
        <button key={l.key} onClick={() => { onPick(l.key); onClose() }} className="oc-mi"
          style={{ color: value === l.key ? C.gold2 : 'var(--tx2)', fontWeight: 600 }}>
          <span style={{ flex: 1 }}>{isAr ? l.ar : l.en}</span>
          <span style={{ fontSize: 11, color: 'var(--tx4)' }}>{l.native}</span>
        </button>
      ))}
    </div>, document.body)
}

/* ── بطاقة مرجع (خلية/صف/عمود) ────────────────────────────────────────── */
const REF_ICON = { cell: '⌗', row: '⇥', col: '⬍' }
export const refTitle = (r, isAr) => {
  if (!r) return ''
  if (r.type === 'col') return `${isAr ? 'عمود' : 'Column'}: ${r.col_label || r.col_key}`
  if (r.type === 'row') return `${isAr ? 'صف' : 'Row'}: ${r.row_label || r.row_key}`
  return `${r.col_label || r.col_key} — ${r.row_label || r.row_key}`
}
function RefCard({ r, isAr, onClick, onRemove, compact }) {
  const hasVal = r.type !== 'col' && r.value !== null && r.value !== undefined && r.value !== ''
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: compact ? '4px 8px' : '7px 10px', borderRadius: 9,
      background: 'var(--accent-soft)', border: '1px solid var(--accent-bd)', maxWidth: '100%', minWidth: 0 }}>
      <span style={{ fontSize: 12, color: C.gold2, flexShrink: 0, fontWeight: 600 }}>{REF_ICON[r.type] || '⌗'}</span>
      <button onClick={onClick} disabled={!onClick} title={refTitle(r, isAr)}
        style={{ flex: 1, minWidth: 0, textAlign: 'start', background: 'transparent', border: 'none', padding: 0,
          cursor: onClick ? 'pointer' : 'default', fontFamily: F }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--tx4)' }}>
          {r.type === 'col' ? (isAr ? 'عمود' : 'Column') : r.type === 'row' ? (isAr ? 'صف' : 'Row') : (isAr ? 'خلية' : 'Cell')}
          {r.type !== 'row' && r.col_label ? ` · ${r.col_label}` : ''}
        </div>
        {r.type !== 'col' && (
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--tx2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.row_label || r.row_key}
          </div>
        )}
        {hasVal && (
          <div style={{ fontSize: 11.5, marginTop: 1, color: C.gold2, fontFamily: MONO, direction: 'ltr',
            textAlign: isAr ? 'right' : 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            = {r.value}
          </div>
        )}
      </button>
      {onRemove && <button className="oc-tiny" onClick={onRemove} title={isAr ? 'إزالة' : 'Remove'} style={{ flexShrink: 0 }}>✕</button>}
    </div>
  )
}

/* ── إبراز المنشن داخل نص الرسالة ─────────────────────────────────────── */
function Body({ text, names, meName }) {
  if (!names?.length) return <>{text}</>
  const sorted = [...names].sort((a, b) => b.length - a.length)
  const parts = []
  let rest = String(text ?? ''), guard = 0
  while (rest && guard++ < 400) {
    let best = -1, bestName = null
    for (const n of sorted) { const i = rest.indexOf('@' + n); if (i >= 0 && (best < 0 || i < best)) { best = i; bestName = n } }
    if (best < 0) break
    if (best > 0) parts.push(rest.slice(0, best))
    const isMe = meName && bestName === meName
    parts.push(
      <span key={parts.length} style={{ fontWeight: 600, color: isMe ? '#000' : C.blue,
        background: isMe ? C.gold2 : 'rgba(93,173,226,.14)', borderRadius: 5, padding: '1px 5px' }}>@{bestName}</span>)
    rest = rest.slice(best + bestName.length + 1)
  }
  if (rest) parts.push(rest)
  return <>{parts}</>
}

/* ── الحالة المشتركة: تُستدعى من الصفحة كي تعمل الشارات وعلامات الخلايا
      حتى واللوحة مغلقة ────────────────────────────────────────────────── */
export function useOpsChat(sb, user, viewKey) {
  const [msgs, setMsgs] = useState([])
  const [people, setPeople] = useState({})     // user_id → { person, avatar_url }
  const [lastRead, setLastRead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  const load = useCallback(async () => {
    if (!sb || !viewKey) return
    setLoading(true); setErr(null)
    try {
      const { data, error } = await sb.from('ops_chat_messages')
        .select('*').eq('view_key', viewKey).is('deleted_at', null).order('created_at', { ascending: true })
      if (error) throw error
      const rows = data || []
      setMsgs(rows)
      const ids = Array.from(new Set(rows.map((m) => m.user_id).filter(Boolean)))
      if (ids.length) {
        const { data: us } = await sb.from('users').select('id,avatar_url,email,person:persons(name_ar,name_en)').in('id', ids)
        const map = {}; for (const u of (us || [])) map[u.id] = u
        setPeople((p) => ({ ...p, ...map }))
      }
      if (user?.id) {
        const { data: rd } = await sb.from('ops_chat_reads').select('last_read_at')
          .eq('user_id', user.id).eq('view_key', viewKey).maybeSingle()
        setLastRead(rd?.last_read_at || null)
      }
    } catch (e) { setErr(e.message || String(e)); setMsgs([]) }
    finally { setLoading(false) }
  }, [sb, viewKey, user?.id])

  useEffect(() => { load() }, [load])

  // بثّ فوري: أي رسالة جديدة/تعديل في هذا العرض تظهر بلا تحديث
  useEffect(() => {
    if (!sb || !viewKey) return
    const ch = sb.channel(`ops_chat_${viewKey}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ops_chat_messages', filter: `view_key=eq.${viewKey}` },
        () => { load() })
      .subscribe()
    return () => { try { sb.removeChannel(ch) } catch { /* noop */ } }
  }, [sb, viewKey, load])

  const newSince = useCallback((m) => {
    const t = lastRead ? new Date(lastRead).getTime() : 0
    return m.user_id !== user?.id && new Date(m.created_at).getTime() > t
  }, [lastRead, user?.id])

  const unread = useMemo(() => (user?.id ? msgs.filter(newSince).length : 0), [msgs, newSince, user?.id])
  // كم رسالة جديدة تذكرني بالاسم — تُبرز بالأحمر ولها تنبيه
  const unreadMentions = useMemo(
    () => (user?.id ? msgs.filter((m) => newSince(m) && (m.mentions || []).includes(user.id)).length : 0),
    [msgs, newSince, user?.id])

  // علامات على الشبكة: خلية / صف / عمود عليه سؤال (مفتوح أو مُجاب)
  const marks = useMemo(() => {
    const cells = new Map(), rows = new Map(), cols = new Map()
    const bump = (map, k, open) => {
      if (!k) return
      const cur = map.get(k) || { total: 0, open: 0 }
      cur.total++; if (open) cur.open++
      map.set(k, cur)
    }
    for (const x of msgs) {
      const open = !x.resolved
      for (const r of (Array.isArray(x.refs) ? x.refs : [])) {
        if (r?.type === 'cell') bump(cells, cellMarkKey(r.row_key, r.col_key), open)
        else if (r?.type === 'row') bump(rows, r.row_key, open)
        else if (r?.type === 'col') bump(cols, r.col_key, open)
      }
    }
    return { cells, rows, cols }
  }, [msgs])
  const cellMarks = marks.cells

  const markRead = useCallback(async () => {
    if (!sb || !user?.id || !viewKey) return
    const now = new Date().toISOString()
    setLastRead(now)
    await sb.from('ops_chat_reads').upsert({ user_id: user.id, view_key: viewKey, last_read_at: now }, { onConflict: 'user_id,view_key' })
  }, [sb, user?.id, viewKey])

  const send = useCallback(async ({ body, refs, mentions, replyTo }) => {
    if (!sb || !user?.id) throw new Error('no_session')
    const list = Array.isArray(refs) ? refs.filter(Boolean) : []
    const first = list[0] || null
    const row = {
      view_key: viewKey, body: String(body || '').trim(), user_id: user.id, reply_to: replyTo || null,
      refs: list, mentions: Array.from(new Set(mentions || [])),
      // نُبقي أعمدة المرجع الأول كما هي (فهارس وتوافق مع أي استعلام قديم)
      row_key: first?.row_key || null, col_key: first?.col_key || null,
      row_label: first?.row_label || null, col_label: first?.col_label || null, cell_value: first?.value ?? null,
    }
    if (!row.body) return
    const { data, error } = await sb.from('ops_chat_messages').insert(row).select('*').single()
    if (error) throw error
    setMsgs((p) => (p.some((x) => x.id === data.id) ? p : [...p, data]))
    setPeople((p) => (p[user.id] ? p : { ...p, [user.id]: { id: user.id, avatar_url: user.avatar_url, email: user.email, person: user.person } }))
    return data
  }, [sb, user, viewKey])

  const setResolved = useCallback(async (id, val) => {
    if (!sb) return
    setMsgs((p) => p.map((m) => (m.id === id ? { ...m, resolved: val } : m)))
    const { error } = await sb.rpc('ops_chat_set_resolved', { p_id: id, p_resolved: val })
    if (error) { load(); throw error }
  }, [sb, load])

  const remove = useCallback(async (id) => {
    if (!sb) return
    const { error } = await sb.from('ops_chat_messages').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (error) throw error
    setMsgs((p) => p.filter((m) => m.id !== id))
  }, [sb])

  // دمج أسماء مستخدمين لم يكتبوا بعد (المسؤولون مثلاً) كي تظهر بشاراتهم
  const mergePeople = useCallback((list) => {
    if (!list?.length) return
    setPeople((p) => { const n = { ...p }; for (const u of list) n[u.id] = u; return n })
  }, [])

  return { msgs, people, loading, err, unread, unreadMentions, marks, cellMarks, load, markRead, send, setResolved, remove, mergePeople }
}

/* ── اللوحة الجانبية ──────────────────────────────────────────────────── */
export default function OpsChatPanel({
  sb, user, lang, open, onClose, chat, viewName, viewKey,
  owners = [], canManageOwners = false, onSaveOwners,
  pendingRefs = [], onSetRefs, buildRef, selectionInfo, onJump, toast,
}) {
  const isAr = lang !== 'en'
  const T = (a, e) => (isAr ? a : e)
  const { msgs, people, loading, err, markRead, send, setResolved, remove, mergePeople } = chat

  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState(null)
  const [mentions, setMentions] = useState([])     // [{id,name}] مرفقة بالرسالة الجاري كتابتها
  const [mentionMenu, setMentionMenu] = useState(null) // { rect, q, at } قائمة @
  const [onlyMine, setOnlyMine] = useState(false)  // فلتر «ما يذكرني»
  const [hdrOpen, setHdrOpen] = useState(false)    // تفاصيل الرأس (مطويّة كي يتّسع سرد الرسائل)
  const [taH, setTaH] = useState(36)               // ارتفاع حقل الكتابة — ينمو مع النص
  const [viewLang, setViewLang] = useState(() => { try { return localStorage.getItem(LS_LANG) || null } catch { return null } })
  const [tr, setTr] = useState({})              // `${id}:${lang}` → { text, loading, err }
  const [showOrig, setShowOrig] = useState({})  // id → true (اعرض الأصل مؤقتاً)
  const [langMenu, setLangMenu] = useState(null) // { rect, msgId|null }
  const [ownersModal, setOwnersModal] = useState(false)
  const [ownerDraft, setOwnerDraft] = useState([])
  const [userList, setUserList] = useState([])
  const [savingOwners, setSavingOwners] = useState(false)
  const bodyRef = useRef(null)
  const inputRef = useRef(null)

  const ownerSet = useMemo(() => new Set(owners || []), [owners])
  const iAmOwner = ownerSet.has(user?.id)
  const myName = useMemo(() => personName(user, isAr), [user, isAr])

  useEffect(() => { if (open) { markRead(); setTimeout(() => inputRef.current?.focus(), 120) } }, [open, markRead])
  useEffect(() => { if (open && msgs.length) markRead() }, [open, msgs.length, markRead])
  useEffect(() => { if (open && bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight }, [open, msgs.length, tr])
  // حقل الكتابة يبدأ بسطر واحد وينمو مع النص حتى سقف — كي لا يأكل مساحة الرسائل
  useEffect(() => {
    const el = inputRef.current; if (!el || !open) return
    el.style.height = '0px'
    const h = Math.min(132, Math.max(36, el.scrollHeight + 2))
    el.style.height = h + 'px'
    setTaH(h)
  }, [text, open])
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape' && !langMenu && !ownersModal) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, langMenu, ownersModal])

  /* ── الترجمة ── */
  const doTranslate = useCallback(async (m, target) => {
    const k = `${m.id}:${target}`
    setTr((p) => (p[k]?.text ? p : { ...p, [k]: { loading: true } }))
    try {
      const { data, error } = await sb.functions.invoke('ops-chat-translate', {
        body: { text: m.body, target, message_id: m.id },
      })
      if (error) throw error
      if (data && data.ok === false) throw new Error(data?.error?.message || 'translate_failed')
      const out = data?.data?.text ?? data?.text
      if (!out) throw new Error('empty')
      setTr((p) => ({ ...p, [k]: { text: out } }))
    } catch (e) {
      setTr((p) => ({ ...p, [k]: { err: e?.message || String(e) } }))
    }
  }, [sb])

  // «اعرض الكل بـ…»: يترجم ما لم يُترجَم بعد، واحدة تلو الأخرى كي لا تُغرق الدالة
  useEffect(() => {
    if (!open || !viewLang) return
    let cancelled = false
    ;(async () => {
      for (const m of msgs) {
        if (cancelled) return
        const k = `${m.id}:${viewLang}`
        if (tr[k]) continue
        await doTranslate(m, viewLang)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, viewLang, msgs.length])

  const pickViewLang = (k) => {
    setViewLang(k)
    try { k ? localStorage.setItem(LS_LANG, k) : localStorage.removeItem(LS_LANG) } catch { /* noop */ }
  }

  /* ── المسؤولون ── */
  const loadUsers = useCallback(async () => {
    if (userList.length || !sb) return userList
    const { data } = await sb.from('users').select('id,email,avatar_url,person:persons(name_ar,name_en)')
      .is('deleted_at', null).eq('is_active', true)
    const list = (data || []).map((u) => ({ ...u, _name: personName(u, isAr) }))
      .sort((a, b) => a._name.localeCompare(b._name, 'ar'))
    setUserList(list); mergePeople(list)
    return list
  }, [sb, userList, isAr, mergePeople])

  // نحمّل المستخدمين فور فتح اللوحة: تلزم للمنشن ولإظهار أسماء المسؤولين
  // ولو لم يكتبوا في المحادثة بعد.
  useEffect(() => { if (open) loadUsers() }, [open, loadUsers])

  const openOwners = async () => {
    setOwnerDraft(owners || []); setOwnersModal(true)
    loadUsers()
  }
  const saveOwners = async () => {
    if (!onSaveOwners) return
    setSavingOwners(true)
    try { await onSaveOwners(ownerDraft); setOwnersModal(false); toast && toast(T('تم حفظ المسؤولين', 'Owners saved')) }
    catch (e) { toast && toast(T('تعذّر الحفظ: ', 'Save failed: ') + (e.message || e)) }
    finally { setSavingOwners(false) }
  }

  const doSend = async () => {
    const b = text.trim(); if (!b || sending) return
    setSending(true)
    try {
      // لا نرسل إلا المنشن الذي بقي اسمه فعلاً في النص
      const kept = mentions.filter((m) => b.includes('@' + m.name))
      await send({ body: b, refs: pendingRefs, mentions: kept.map((m) => m.id), replyTo: replyTo?.id })
      setText(''); setReplyTo(null); setMentions([]); onSetRefs && onSetRefs([])
    } catch (e) { toast && toast(T('تعذّر الإرسال: ', 'Send failed: ') + (e.message || e)) }
    finally { setSending(false) }
  }

  /* ── المنشن: كتابة @ تفتح قائمة المستخدمين ─────────────────────────── */
  const onComposerChange = (e) => {
    const v = e.target.value
    setText(v)
    const caret = e.target.selectionStart ?? v.length
    const upto = v.slice(0, caret)
    const at = upto.lastIndexOf('@')
    // القائمة تظهر ما دام المؤشّر بعد @ مباشرةً بلا مسافة فاصلة طويلة
    if (at >= 0 && (at === 0 || /[\s(]/.test(upto[at - 1] || ' '))) {
      const q = upto.slice(at + 1)
      if (!/\s{2,}|\n/.test(q) && q.length <= 24) {
        const r = e.target.getBoundingClientRect()
        setMentionMenu({ rect: { left: r.left, top: r.top, bottom: r.top }, q, at })
        return
      }
    }
    setMentionMenu(null)
  }
  const pickMention = (u) => {
    const name = personName(u, isAr)
    const at = mentionMenu?.at ?? -1
    if (at < 0) return
    const caret = inputRef.current?.selectionStart ?? text.length
    const next = text.slice(0, at) + '@' + name + ' ' + text.slice(caret)
    setText(next)
    setMentions((p) => (p.some((x) => x.id === u.id) ? p : [...p, { id: u.id, name }]))
    setMentionMenu(null)
    setTimeout(() => {
      inputRef.current?.focus()
      const pos = at + name.length + 2
      try { inputRef.current?.setSelectionRange(pos, pos) } catch { /* noop */ }
    }, 0)
  }
  const mentionOptions = useMemo(() => {
    if (!mentionMenu) return []
    const q = (mentionMenu.q || '').toLowerCase()
    return userList.filter((u) => u.id !== user?.id && (!q || u._name.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))).slice(0, 8)
  }, [mentionMenu, userList, user?.id])

  /* ── المراجع (خلية/صف/عمود) ───────────────────────────────────────── */
  const addRef = (kind) => {
    if (!buildRef) return
    const r = buildRef(kind)
    if (!r) { toast && toast(T('حدّد خلية في الجدول أولاً', 'Select a cell in the grid first')); return }
    const dup = pendingRefs.some((x) => x.type === r.type && x.row_key === r.row_key && x.col_key === r.col_key)
    if (dup) return
    onSetRefs && onSetRefs([...pendingRefs, r])
  }
  const dropRef = (i) => onSetRefs && onSetRefs(pendingRefs.filter((_, j) => j !== i))

  // الرسائل المعروضة (فلتر «ما يذكرني»)
  const shownMsgs = useMemo(
    () => (onlyMine ? msgs.filter((m) => (m.mentions || []).includes(user?.id)) : msgs),
    [msgs, onlyMine, user?.id])

  const ownerNames = useMemo(() => (owners || []).map((id) => {
    const u = people[id] || userList.find((x) => x.id === id)
    return u ? personName(u, isAr) : null
  }).filter(Boolean), [owners, people, userList, isAr])

  if (!open) return null

  const W = 'min(430px, 100vw)'

  return ReactDOM.createPortal(
    <>
      <style>{`
        .oc-mi{width:100%;text-align:start;background:transparent;border:none;cursor:pointer;font-family:${F};
          font-size:12.5px;font-weight:600;padding:8px 10px;border-radius:7px;display:flex;align-items:center;gap:8px}
        .oc-mi:hover{background:var(--accent-soft)}
        .oc-scroll::-webkit-scrollbar{width:9px}
        .oc-scroll::-webkit-scrollbar-thumb{background:rgba(176,125,0,.45);border-radius:5px}
        .oc-scroll::-webkit-scrollbar-track{background:transparent}
        .oc-scroll{scrollbar-width:thin;scrollbar-color:rgba(176,125,0,.45) transparent}
        .oc-btn{height:30px;padding:0 10px;border-radius:8px;border:1px solid transparent;cursor:pointer;
          font-family:${F};font-size:11.5px;font-weight:600;display:inline-flex;align-items:center;gap:5px;
          background:var(--search-bg);color:var(--tx3);transition:.15s;white-space:nowrap}
        .oc-btn:hover:not(:disabled){background:var(--accent-soft);color:var(--accent)}
        .oc-btn:disabled{opacity:.45;cursor:not-allowed}
        .oc-tiny{background:transparent;border:none;cursor:pointer;font-family:${F};font-size:11px;font-weight:600;
          color:var(--tx4);padding:2px 5px;border-radius:6px}
        .oc-tiny:hover{color:var(--accent);background:var(--accent-soft)}
        .oc-panel{animation:oc-in .22s cubic-bezier(.32,.72,0,1)}
        @keyframes oc-in{from{transform:translateX(var(--oc-from,40px));opacity:.4}to{transform:none;opacity:1}}
        @media(max-width:640px){.oc-panel{--oc-from:0;animation:oc-up .26s cubic-bezier(.32,.72,0,1)}}
        @keyframes oc-up{from{transform:translateY(40px);opacity:.4}to{transform:none;opacity:1}}
      `}</style>

      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 54, background: 'rgba(0,0,0,.28)' }} />

      <div className="oc-panel" dir={isAr ? 'rtl' : 'ltr'}
        style={{ '--oc-from': isAr ? '-40px' : '40px',
          position: 'fixed', top: 0, bottom: 0, insetInlineEnd: 0, width: W, zIndex: 55,
          background: 'var(--card-grad2,var(--card))', borderInlineStart: '1px solid var(--bd)',
          boxShadow: '0 0 44px rgba(0,0,0,.34)', display: 'flex', flexDirection: 'column', fontFamily: F }}>

        {/* ── الرأس: سطر واحد مضغوط · التفاصيل خلف زر ⋯ ── */}
        <div style={{ padding: '7px 10px', borderBottom: '1px solid var(--bd)', background: 'var(--hd)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span title={`${T('محادثة', 'Chat')} · ${viewName}`}
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              💬 <span style={{ color: C.gold2 }}>{viewName}</span>
              {ownerNames.length > 0 && (
                <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--tx4)', marginInlineStart: 6 }}>
                  · {T('المسؤول: ', 'Owner: ')}{ownerNames[0]}{ownerNames.length > 1 ? ` +${ownerNames.length - 1}` : ''}
                </span>
              )}
            </span>
            <button className="oc-tiny" onClick={() => setOnlyMine((v) => !v)}
              title={T('اعرض الرسائل التي تذكرني فقط', 'Show only messages that mention me')}
              style={{ flexShrink: 0, ...(onlyMine ? { color: 'var(--accent)', background: 'var(--accent-soft)' } : {}) }}>
              @{chat.unreadMentions > 0 && <span style={{ minWidth: 14, height: 14, padding: '0 3px', borderRadius: 7, background: C.red, color: '#fff', fontSize: 9, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginInlineStart: 3 }}>{chat.unreadMentions}</span>}
            </button>
            <button className="oc-tiny"
              title={viewLang
                ? T(`الرسائل معروضة بـ${LANG_LABEL(viewLang, isAr)} — اضغط للتغيير أو الإيقاف`, `Showing all messages in ${LANG_LABEL(viewLang, isAr)} — click to change or turn off`)
                : T('اعرض كل الرسائل بلغة واحدة', 'Show all messages in one language')}
              style={{ flexShrink: 0, ...(viewLang ? { color: 'var(--accent)', background: 'var(--accent-soft)' } : {}) }}
              onClick={(e) => setLangMenu({ rect: e.currentTarget.getBoundingClientRect(), msgId: null })}>
              🌐{viewLang ? ` ${viewLang.toUpperCase()}` : ''}
            </button>
            <button className="oc-tiny" onClick={() => setHdrOpen((v) => !v)} title={T('خيارات', 'Options')}
              style={{ flexShrink: 0, ...(hdrOpen ? { color: 'var(--accent)', background: 'var(--accent-soft)' } : {}) }}>⋯</button>
            <button className="oc-tiny" onClick={onClose} title={T('إغلاق (Esc)', 'Close (Esc)')} style={{ fontSize: 14, flexShrink: 0 }}>✕</button>
          </div>

          {hdrOpen && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--tx4)' }}>{T('المسؤولون:', 'Owners:')}</span>
              {ownerNames.length === 0
                ? <span style={{ fontSize: 11, color: 'var(--tx4)' }}>{T('لم يُحدَّد', 'Not set')}</span>
                : ownerNames.map((n) => (
                  <span key={n} style={{ fontSize: 10.5, fontWeight: 600, color: C.gold2, background: 'var(--accent-soft)',
                    border: '1px solid var(--accent-bd)', padding: '2px 8px', borderRadius: 20 }}>{n}</span>
                ))}
              {iAmOwner && <span style={{ fontSize: 10, fontWeight: 600, color: '#000', background: C.gold2, padding: '2px 7px', borderRadius: 20 }}>{T('أنت', 'you')}</span>}
              {canManageOwners && <button className="oc-tiny" onClick={openOwners} title={T('تعيين المسؤولين عن هذا العرض', 'Assign owners for this view')}>⚙ {T('تعيين', 'Assign')}</button>}
            </div>
          )}
        </div>

        {/* ── الرسائل ── */}
        <div ref={bodyRef} className="oc-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 10px 4px' }}>
          {loading && <div style={{ textAlign: 'center', color: 'var(--tx4)', fontSize: 12.5, padding: 24 }}>{T('جارٍ التحميل…', 'Loading…')}</div>}
          {err && <div style={{ padding: 12, borderRadius: 9, background: 'rgba(232,114,101,.08)', border: '1px solid rgba(232,114,101,.28)', color: C.red, fontSize: 12 }}>{err}</div>}
          {!loading && !err && shownMsgs.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--tx4)', fontSize: 12.5, padding: '34px 16px', lineHeight: 1.9 }}>
              {onlyMine ? T('لا رسائل تذكرك.', 'No messages mention you.') : (<>
                {T('لا رسائل بعد.', 'No messages yet.')}<br />
                {T('اسأل عن أي صف أو قيمة: كليك يمين على الخلية ← «اسأل عن هذه الخلية»، أو حدّد خلية واستعمل أزرار «＋ الخلية/الصف/العمود» تحت.',
                  'Ask about any row or value: right-click a cell → “Ask about this cell”, or select a cell and use the ＋ Cell/Row/Column buttons below.')}
              </>)}
            </div>
          )}

          {shownMsgs.map((m) => {
            const u = people[m.user_id]
            const mine = m.user_id === user?.id
            const owner = ownerSet.has(m.user_id)
            const key = viewLang ? `${m.id}:${viewLang}` : null
            const t = key ? tr[key] : null
            const showingTr = !!(t?.text && !showOrig[m.id])
            const parent = m.reply_to ? msgs.find((x) => x.id === m.reply_to) : null
            const msgRefs = Array.isArray(m.refs) ? m.refs : []
            const msgMentionNames = (m.mentions || []).map((id) => {
              const mu = people[id] || userList.find((x) => x.id === id)
              return mu ? personName(mu, isAr) : null
            }).filter(Boolean)
            const mentionsMe = (m.mentions || []).includes(user?.id)
            return (
              <div key={m.id} style={{ display: 'flex', gap: 8, marginBottom: 11, alignItems: 'flex-start',
                ...(mentionsMe ? { background: 'rgba(176,125,0,.07)', borderInlineStart: `3px solid ${C.gold}`, borderRadius: 9, padding: '8px 8px 8px 6px', marginInlineStart: -6 } : {}) }}>
                {/* الصورة/الحرف */}
                {u?.avatar_url
                  ? <img src={u.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `1.5px solid ${owner ? C.gold : 'var(--bd)'}` }} />
                  : <span style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      background: owner ? C.gold : 'var(--bd2)', color: owner ? '#000' : 'var(--tx3)', fontWeight: 600, fontSize: 12 }}>{initial(personName(u, isAr))}</span>}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: mine ? C.gold2 : 'var(--tx2)' }}>{personName(u, isAr)}</span>
                    {owner && <span style={{ fontSize: 9.5, fontWeight: 600, color: C.gold2, border: `1px solid ${C.gold}`, padding: '1px 6px', borderRadius: 20 }}>{T('مسؤول', 'owner')}</span>}
                    <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontFamily: MONO, direction: 'ltr' }}>{fmtWhen(m.created_at, isAr)}</span>
                    {mentionsMe && <span style={{ fontSize: 9.5, fontWeight: 600, color: '#000', background: C.gold2, padding: '1px 6px', borderRadius: 20 }}>@ {T('ذكرك', 'mentions you')}</span>}
                    {m.resolved && <span style={{ fontSize: 9.5, fontWeight: 600, color: C.green, border: `1px solid ${C.green}`, padding: '1px 6px', borderRadius: 20 }}>✓ {T('تمّت الإجابة', 'answered')}</span>}
                  </div>

                  {parent && (
                    <div style={{ marginTop: 4, padding: '4px 8px', borderInlineStart: `2px solid ${C.blue}`, background: 'rgba(93,173,226,.07)',
                      borderRadius: 6, fontSize: 11, color: 'var(--tx4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      ↪ {personName(people[parent.user_id], isAr)}: {parent.body}
                    </div>
                  )}

                  {/* بطاقات المراجع — خلية/صف/عمود، والنقر يقفز إليها في الجدول */}
                  {msgRefs.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                      {msgRefs.map((r, i) => (
                        <RefCard key={i} r={r} isAr={isAr}
                          onClick={onJump ? () => onJump(r) : null} />
                      ))}
                    </div>
                  )}

                  {/* النص */}
                  <div style={{ marginTop: 5, fontSize: 13.5, lineHeight: 1.75, color: 'var(--tx)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    <Body text={showingTr ? t.text : m.body} names={msgMentionNames} meName={myName} />
                  </div>
                  {showingTr && (
                    <div style={{ marginTop: 3, fontSize: 10.5, color: 'var(--tx4)' }}>
                      {T('مترجَمة إلى ', 'Translated to ')}{LANG_LABEL(viewLang, isAr)} ·
                      <button className="oc-tiny" onClick={() => setShowOrig((p) => ({ ...p, [m.id]: true }))}>{T('اعرض الأصل', 'Show original')}</button>
                    </div>
                  )}
                  {t?.text && showOrig[m.id] && (
                    <button className="oc-tiny" onClick={() => setShowOrig((p) => { const n = { ...p }; delete n[m.id]; return n })}>{T('اعرض الترجمة', 'Show translation')}</button>
                  )}
                  {t?.loading && <div style={{ fontSize: 10.5, color: 'var(--tx4)', marginTop: 3 }}>{T('جارٍ الترجمة…', 'Translating…')}</div>}
                  {t?.err && <div style={{ fontSize: 10.5, color: C.red, marginTop: 3 }}>{T('تعذّرت الترجمة: ', 'Translation failed: ')}{t.err}</div>}

                  {/* أزرار الرسالة */}
                  <div style={{ display: 'flex', gap: 2, marginTop: 4, flexWrap: 'wrap' }}>
                    <button className="oc-tiny" onClick={(e) => setLangMenu({ rect: e.currentTarget.getBoundingClientRect(), msgId: m.id })}>🌐 {T('ترجمة', 'Translate')}</button>
                    <button className="oc-tiny" onClick={() => { setReplyTo(m); inputRef.current?.focus() }}>↩ {T('رد', 'Reply')}</button>
                    {msgRefs.length > 0 && (
                      <button className="oc-tiny" onClick={() => setResolved(m.id, !m.resolved).catch((x) => toast && toast(x.message))}
                        style={m.resolved ? { color: C.green } : undefined}>
                        {m.resolved ? T('↺ إعادة فتح', '↺ Reopen') : T('✓ تمّت الإجابة', '✓ Mark answered')}
                      </button>
                    )}
                    {mine && <button className="oc-tiny" onClick={() => { if (window.confirm(T('حذف رسالتك؟', 'Delete your message?'))) remove(m.id).catch((x) => toast && toast(x.message)) }} style={{ color: C.red }}>🗑</button>}
                  </div>

                  {/* ترجمة فردية (لغة غير لغة العرض) */}
                  {CHAT_LANGS.map((l) => {
                    const kk = `${m.id}:${l.key}`
                    if (l.key === viewLang || !tr[kk] || tr[kk].loading) return null
                    if (!tr[kk].text && !tr[kk].err) return null
                    return (
                      <div key={l.key} style={{ marginTop: 5, padding: '6px 9px', borderRadius: 8, background: 'var(--search-bg)', borderInlineStart: `2px solid ${C.blue}` }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--tx4)', marginBottom: 2 }}>{LANG_LABEL(l.key, isAr)}</div>
                        <div style={{ fontSize: 12.5, lineHeight: 1.7, color: tr[kk].err ? C.red : 'var(--tx2)', whiteSpace: 'pre-wrap' }}>{tr[kk].text || tr[kk].err}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── المُنشئ ── */}
        <div style={{ borderTop: '1px solid var(--bd)', padding: '7px 10px 9px', background: 'var(--hd)', flexShrink: 0 }}>
          {replyTo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, padding: '5px 9px', borderRadius: 8,
              background: 'rgba(93,173,226,.09)', border: '1px solid rgba(93,173,226,.3)' }}>
              <span style={{ fontSize: 11, color: C.blue, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                ↩ {T('رد على ', 'Replying to ')}{personName(people[replyTo.user_id], isAr)}: {replyTo.body}
              </span>
              <button className="oc-tiny" onClick={() => setReplyTo(null)}>✕</button>
            </div>
          )}
          {pendingRefs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 5 }}>
              {pendingRefs.map((r, i) => <RefCard key={i} r={r} isAr={isAr} compact onRemove={() => dropRef(i)} />)}
            </div>
          )}

          {/* أشِر إلى التحديد الحالي في الجدول — سطر واحد نحيف */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 5, alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--tx4)', flexShrink: 0 }}>＋</span>
            <button className="oc-btn" onClick={() => addRef('cell')} disabled={!selectionInfo?.cell}
              title={selectionInfo?.cell ? `${T('الخلية المحدَّدة: ', 'Selected cell: ')}${selectionInfo.cell}` : T('حدّد خلية في الجدول أولاً', 'Select a cell in the grid first')}
              style={{ height: 24, fontSize: 10.5, padding: '0 8px' }}>{T('الخلية', 'Cell')}</button>
            <button className="oc-btn" onClick={() => addRef('row')} disabled={!selectionInfo?.row}
              title={selectionInfo?.row || ''} style={{ height: 24, fontSize: 10.5, padding: '0 8px' }}>{T('الصف', 'Row')}</button>
            <button className="oc-btn" onClick={() => addRef('col')} disabled={!selectionInfo?.col}
              title={selectionInfo?.col || ''} style={{ height: 24, fontSize: 10.5, padding: '0 8px' }}>{T('العمود', 'Column')}</button>
            {selectionInfo?.cell && (
              <span title={selectionInfo.cell} style={{ fontSize: 10, color: 'var(--tx4)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'end' }}>
                {selectionInfo.cell}
              </span>
            )}
          </div>

          {/* قائمة المنشن — تظهر فوق حقل الكتابة مباشرةً */}
          {mentionMenu && mentionOptions.length > 0 && (
            <div className="oc-scroll" style={{ marginBottom: 5, maxHeight: 156, overflowY: 'auto', borderRadius: 10,
              background: 'var(--card-grad2,var(--card))', border: '1px solid var(--accent-bd)', padding: 5, boxShadow: '0 -8px 26px rgba(0,0,0,.22)' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--tx4)', padding: '3px 8px 5px' }}>
                {T('نادِ شخصاً — Enter لاختيار الأول', 'Mention someone — Enter picks the first')}
              </div>
              {mentionOptions.map((u, i) => (
                <button key={u.id} className="oc-mi" onMouseDown={(e) => { e.preventDefault(); pickMention(u) }}
                  style={i === 0 ? { background: 'var(--accent-soft)' } : undefined}>
                  {u.avatar_url
                    ? <img src={u.avatar_url} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    : <span style={{ width: 22, height: 22, borderRadius: '50%', background: ownerSet.has(u.id) ? C.gold : 'var(--bd2)', color: ownerSet.has(u.id) ? '#000' : 'var(--tx3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 10, flexShrink: 0 }}>{initial(u._name)}</span>}
                  <span style={{ flex: 1, color: 'var(--tx2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u._name}</span>
                  {ownerSet.has(u.id) && <span style={{ fontSize: 9.5, fontWeight: 600, color: C.gold2, flexShrink: 0 }}>{T('مسؤول', 'owner')}</span>}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea ref={inputRef} value={text} onChange={onComposerChange}
              onKeyDown={(e) => {
                if (mentionMenu && mentionOptions.length && (e.key === 'Enter' || e.key === 'Tab')) { e.preventDefault(); pickMention(mentionOptions[0]); return }
                if (e.key === 'Escape' && mentionMenu) { e.preventDefault(); setMentionMenu(null); return }
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend() }
              }}
              rows={1} placeholder={T('اكتب بأي لغة… @ لمناداة شخص', 'Write in any language… @ to mention')}
              style={{ flex: 1, resize: 'none', height: taH, maxHeight: 132, borderRadius: 9, padding: '8px 11px', boxSizing: 'border-box',
                background: 'var(--inputBg)', border: '1px solid var(--bd)', color: 'var(--tx)', fontSize: 13, fontFamily: F, outline: 'none', lineHeight: 1.5, overflowY: 'auto' }} />
            <button onClick={doSend} disabled={!text.trim() || sending}
              style={{ height: 36, padding: '0 14px', borderRadius: 9, border: 'none', cursor: text.trim() && !sending ? 'pointer' : 'not-allowed',
                background: text.trim() && !sending ? C.gold : 'var(--search-bg)', color: text.trim() && !sending ? '#000' : 'var(--tx4)',
                fontFamily: F, fontSize: 12.5, fontWeight: 600, flexShrink: 0 }}>
              {sending ? '…' : T('إرسال', 'Send')}
            </button>
          </div>
        </div>
      </div>

      {langMenu && (
        <LangMenu anchorRect={langMenu.rect} isAr={isAr} allowNone={langMenu.msgId == null}
          value={langMenu.msgId == null ? viewLang : null}
          onClose={() => setLangMenu(null)}
          onPick={(k) => {
            if (langMenu.msgId == null) { pickViewLang(k); return }
            const m = msgs.find((x) => x.id === langMenu.msgId)
            if (m && k) doTranslate(m, k)
          }} />
      )}

      {ownersModal && (
        <Modal open onClose={() => setOwnersModal(false)} closeOnOverlay lang={lang} accent={C.gold} width={440}
          title={T('المسؤولون عن هذا العرض', 'Owners of this view')}
          subtitle={T('حسب التخصص — تظهر أسماؤهم في المحادثة ويُسألون عن هذا الجدول', 'By specialty — shown in the chat as the people to ask about this sheet')}
          footer={<ActionButton Icon={Save} disabled={savingOwners} onClick={saveOwners}>{T('حفظ', 'Save')}</ActionButton>}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--tx2)', marginBottom: 6 }}>{T('المستخدمون', 'Users')}</label>
          <Dropdown multi selectedKeys={ownerDraft} onChange={(keys) => setOwnerDraft(keys)}
            options={userList} getKey={(o) => o.id} getLabel={(o) => o._name} getSub={(o) => o.email}
            placeholder={T('اختر المسؤولين…', 'Pick owners…')} searchable />
          <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--tx4)', lineHeight: 1.8 }}>
            {T('يقدر أي مستخدم يدخل المحادثة ويسأل — المسؤول هو من يجيب.',
              'Anyone can join the chat and ask — the owner is the one who answers.')}
          </div>
        </Modal>
      )}
    </>, document.body)
}
