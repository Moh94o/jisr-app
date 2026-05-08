import React, { useEffect, useState } from 'react'
import * as W from '../services/whatsappService.js'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#D4A017', red: '#c0392b', ok: '#27a046', warn: '#eab308', blue: '#3483b4' }

const tabs = [
  { id: 'inbox', label: 'المحادثات' },
  { id: 'templates', label: 'القوالب' },
  { id: 'settings', label: 'الإعدادات' },
]

export default function WhatsappInbox({ toast }) {
  const [tab, setTab] = useState('inbox')
  return (
    <div style={{ fontFamily: F, direction: 'rtl' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={tabBtn(tab === t.id)}>{t.label}</button>)}
      </div>
      {tab === 'inbox' && <Inbox toast={toast} />}
      {tab === 'templates' && <Templates toast={toast} />}
      {tab === 'settings' && <Settings toast={toast} />}
    </div>
  )
}

function Inbox({ toast }) {
  const [convs, setConvs] = useState([])
  const [active, setActive] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(true)
  useEffect(() => { W.listConversations({}).then(setConvs).finally(() => setBusy(false)) }, [])
  useEffect(() => {
    if (!active) return
    W.listMessages(active.id).then(setMessages)
    W.markRead(active.id).catch(() => {})
  }, [active?.id])
  const send = async () => {
    if (!draft.trim() || !active) return
    try {
      await W.sendFreeText({ conversationId: active.id, body: draft.trim() })
      setDraft('')
      setMessages(await W.listMessages(active.id))
      toast?.('تم الإرسال')
    } catch (e) { toast?.('خطأ: ' + e.message) }
  }
  if (busy) return <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,.5)' }}>جاري التحميل...</div>
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 12, height: '70vh' }}>
      <div style={{ background: '#1f1f1f', borderRadius: 12, overflow: 'auto', border: '1px solid rgba(255,255,255,.05)' }}>
        {convs.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,.5)' }}>لا محادثات</div>}
        {convs.map(c => (
          <div key={c.id} onClick={() => setActive(c)} style={{ padding: 12, cursor: 'pointer', background: active?.id === c.id ? 'rgba(212,160,23,.08)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx, #f0f0f0)' }}>
              {c.client?.person?.name_ar || c.contact_name || c.contact_phone}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{c.contact_phone}</div>
            {c.unread_count > 0 && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: C.gold, color: '#000', fontWeight: 800 }}>{c.unread_count}</span>}
          </div>
        ))}
      </div>
      <div style={{ background: '#1f1f1f', borderRadius: 12, display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,.05)' }}>
        {!active ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.4)' }}>اختر محادثة</div> : (
          <>
            <div style={{ padding: 14, borderBottom: '1px solid rgba(255,255,255,.05)', fontWeight: 700 }}>
              {active.client?.person?.name_ar || active.contact_name || active.contact_phone}
            </div>
            <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {messages.length === 0 && <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.4)' }}>لا رسائل</div>}
              {messages.map(m => (
                <div key={m.id} style={{ alignSelf: m.direction === 'outbound' ? 'flex-end' : 'flex-start', maxWidth: '75%', padding: '8px 12px', borderRadius: 12, background: m.direction === 'outbound' ? 'rgba(212,160,23,.16)' : 'rgba(255,255,255,.05)', fontSize: 13, whiteSpace: 'pre-wrap' }}>
                  {m.text_body || m.media_filename || (m.template_id ? '📄 قالب' : '—')}
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>{m.sent_at ? new Date(m.sent_at).toLocaleTimeString('ar') : ''} · {m.status}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,.05)', display: 'flex', gap: 8 }}>
              <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="اكتب رسالة..." style={inputS} />
              <button style={btnS('gold')} onClick={send}>إرسال</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Templates({ toast }) {
  const [list, setList] = useState([])
  const [busy, setBusy] = useState(true)
  const refresh = async () => { setBusy(true); try { setList(await W.listTemplates()) } catch (e) { toast?.('خطأ: ' + e.message) } setBusy(false) }
  useEffect(() => { refresh() }, [])
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button style={btnS()} onClick={refresh}>تحديث</button>
        <button style={btnS('gold')} onClick={async () => { try { await W.syncTemplatesFromMeta(); await refresh(); toast?.('تمت المزامنة') } catch (e) { toast?.('خطأ: ' + e.message) } }}>مزامنة من Meta</button>
      </div>
      {busy ? <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,.5)' }}>جاري التحميل...</div> : (
        <table style={tblS}>
          <thead><tr><Th>الاسم</Th><Th>الفئة</Th><Th>اللغة</Th><Th>الحالة</Th><Th>المتغيرات</Th><Th>الاستخدام</Th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={6} style={emptyTd}>لا قوالب</td></tr>}
            {list.map(t => (
              <tr key={t.id}>
                <Td>{t.name}</Td>
                <Td>{t.category}</Td>
                <Td>{t.language}</Td>
                <Td><StatusPill s={t.status} /></Td>
                <Td>{t.variables_count}</Td>
                <Td>{t.use_case || '—'}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function Settings({ toast }) {
  const [creds, setCreds] = useState(null)
  const [busy, setBusy] = useState(true)
  useEffect(() => { W.getCredentials().then(setCreds).finally(() => setBusy(false)) }, [])
  const setF = (k, v) => setCreds({ ...(creds || {}), [k]: v })
  const save = async () => {
    try {
      await W.upsertCredentials({
        phone_number_id: creds?.phone_number_id, business_account_id: creds?.business_account_id,
        access_token_secret: creds?.access_token_secret, display_phone_number: creds?.display_phone_number,
        webhook_verify_token: creds?.webhook_verify_token, app_secret: creds?.app_secret,
        is_active: !!creds?.is_active,
      })
      toast?.('تم الحفظ')
    } catch (e) { toast?.('خطأ: ' + e.message) }
  }
  if (busy) return <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,.5)' }}>جاري التحميل...</div>
  return (
    <div>
      <div style={{ padding: 14, borderRadius: 10, background: 'rgba(212,160,23,.07)', border: '1px solid rgba(212,160,23,.2)', marginBottom: 14, fontSize: 12, color: 'rgba(255,255,255,.7)', lineHeight: 1.7 }}>
        احصل على Phone Number ID و Business Account ID من Meta Business Suite. الـ Access Token يُولَّد كـ "System User Token" دائم. Webhook URL: <code style={{ background: 'rgba(0,0,0,.3)', padding: '2px 6px', borderRadius: 4 }}>{`${(typeof window !== 'undefined' && window.location.origin) || ''}/functions/v1/whatsapp-webhook`}</code>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 18 }}>
        <Field label="Phone Number ID"><input style={inputS} value={creds?.phone_number_id || ''} onChange={e => setF('phone_number_id', e.target.value)} /></Field>
        <Field label="Business Account ID"><input style={inputS} value={creds?.business_account_id || ''} onChange={e => setF('business_account_id', e.target.value)} /></Field>
        <Field label="Access Token"><input style={inputS} type="password" value={creds?.access_token_secret || ''} onChange={e => setF('access_token_secret', e.target.value)} /></Field>
        <Field label="رقم العرض (E.164)"><input style={inputS} value={creds?.display_phone_number || ''} onChange={e => setF('display_phone_number', e.target.value)} placeholder="+966500000000" /></Field>
        <Field label="Webhook Verify Token"><input style={inputS} value={creds?.webhook_verify_token || ''} onChange={e => setF('webhook_verify_token', e.target.value)} /></Field>
        <Field label="App Secret"><input style={inputS} type="password" value={creds?.app_secret || ''} onChange={e => setF('app_secret', e.target.value)} /></Field>
        <Field label="مفعّل">
          <select style={inputS} value={creds?.is_active ? '1' : '0'} onChange={e => setF('is_active', e.target.value === '1')}>
            <option value="0">لا</option>
            <option value="1">نعم</option>
          </select>
        </Field>
      </div>
      <button style={btnS('gold')} onClick={save}>حفظ</button>
    </div>
  )
}

function StatusPill({ s }) {
  const map = { APPROVED: { c: C.ok, t: 'معتمد' }, PENDING: { c: C.warn, t: 'قيد المراجعة' }, REJECTED: { c: C.red, t: 'مرفوض' }, PAUSED: { c: '#888', t: 'موقوف' }, DISABLED: { c: '#888', t: 'معطل' } }
  const x = map[s] || { c: '#888', t: s }
  return <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 4, background: x.c + '22', color: x.c, fontWeight: 700 }}>{x.t}</span>
}

const tabBtn = (active) => ({ height: 38, padding: '0 16px', borderRadius: 10, background: active ? 'rgba(212,160,23,.14)' : 'rgba(0,0,0,.18)', border: '1px solid ' + (active ? 'rgba(212,160,23,.42)' : 'rgba(255,255,255,.06)'), color: active ? C.gold : 'var(--tx2, rgba(255,255,255,.62))', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F })
const inputS = { width: '100%', height: 38, padding: '0 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,.06)', background: 'var(--modal-input-bg, #2a2a2a)', color: 'var(--tx, #f0f0f0)', fontFamily: F, fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const btnS = (variant) => ({ height: 38, padding: '0 16px', borderRadius: 9, fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer', border: '1px solid ' + (variant === 'gold' ? C.gold : 'rgba(255,255,255,.08)'), background: variant === 'gold' ? 'rgba(212,160,23,.16)' : 'rgba(0,0,0,.18)', color: variant === 'gold' ? C.gold : 'var(--tx, #f0f0f0)' })
const tblS = { width: '100%', borderCollapse: 'collapse', background: '#1f1f1f', borderRadius: 12, overflow: 'hidden', fontSize: 13 }
const emptyTd = { textAlign: 'center', padding: 24, color: 'rgba(255,255,255,.5)' }
function Th({ children }) { return <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, fontSize: 12, color: 'rgba(255,255,255,.55)', background: 'rgba(0,0,0,.18)', borderBottom: '1px solid rgba(255,255,255,.05)' }}>{children}</th> }
function Td({ children }) { return <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,.04)' }}>{children}</td> }
function Field({ label, children }) { return <div><div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.55)', marginBottom: 4 }}>{label}</div>{children}</div> }
