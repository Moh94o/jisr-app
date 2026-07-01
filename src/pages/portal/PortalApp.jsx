import React, { useEffect, useState } from 'react'
import * as P from '../../services/portalService.js'
import { getSupabase } from '../../lib/supabase.js'
import { noDash } from '../../lib/utils.js'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#B07D00', goldSoft: '#e8c77a', red: '#c0392b', ok: '#27a046', warn: '#eab308', dk: '#0a0c10' }

const TABS = [
  { id: 'home', label: 'الرئيسية' },
  { id: 'transactions', label: 'المعاملات' },
  { id: 'invoices', label: 'الفواتير' },
  { id: 'documents', label: 'الوثائق' },
  { id: 'profile', label: 'حسابي' },
]

// Public entry point — full-screen portal with its own auth flow.
export default function PortalApp() {
  const [view, setView] = useState('loading')   // loading | login | app
  const [me, setMe] = useState(null)
  const [tab, setTab] = useState('home')
  const [toast, setToastMsg] = useState(null)
  const tt = (m) => { setToastMsg(m); setTimeout(() => setToastMsg(null), 2500) }

  useEffect(() => {
    document.title = 'بوابة العملاء - تأشيرة البناء والإنشاء'
    document.documentElement.dir = 'rtl'
    document.body.style.background = '#0a0c10'
    const sb = getSupabase()
    sb.auth.getSession().then(async ({ data }) => {
      if (data?.session) {
        try {
          const c = await P.getMyClient()
          if (c) { setMe(c); setView('app'); return }
        } catch {}
      }
      setView('login')
    }).catch(() => setView('login'))
  }, [])

  if (view === 'loading') return <Splash />
  if (view === 'login') return (
    <LoginPage tt={tt} onAuthed={async () => { try { const c = await P.getMyClient(); setMe(c) } catch {}; setView('app') }} toast={toast} />
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0c10', color: '#f0f0f0', fontFamily: F, direction: 'rtl' }}>
      <Header me={me} onLogout={async () => { await getSupabase().auth.signOut(); setView('login') }} />
      <div style={{ display: 'flex', gap: 8, padding: '0 24px', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,.05)', background: '#10141a' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '14px 18px', background: 'transparent', border: 'none',
            borderBottom: '2px solid ' + (tab === t.id ? C.gold : 'transparent'),
            color: tab === t.id ? C.gold : 'rgba(255,255,255,.55)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: F, whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
      </div>
      <main style={{ flex: 1, padding: 24, maxWidth: 1100, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {tab === 'home' && <HomeTab toast={tt} me={me} onJump={setTab} />}
        {tab === 'transactions' && <TransactionsTab toast={tt} />}
        {tab === 'invoices' && <InvoicesTab toast={tt} />}
        {tab === 'documents' && <DocumentsTab toast={tt} />}
        {tab === 'profile' && <ProfileTab toast={tt} me={me} />}
      </main>
      {toast && <Toast msg={toast} />}
    </div>
  )
}

function Splash() {
  return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0c10', color: C.gold, fontFamily: F }}>جاري التحميل...</div>
}

function Header({ me, onLogout }) {
  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid rgba(176,125,0,.15)', background: 'linear-gradient(180deg,#10141a 0%,#0a0c10 100%)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(176,125,0,.15)', border: '1px solid ' + C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold, fontWeight: 600 }}>ت</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.gold }}>بوابة العملاء</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)' }}>تأشيرة البناء والإنشاء</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)' }}>{me?.person?.name_ar || ''}</div>
        <button onClick={onLogout} style={{ height: 34, padding: '0 14px', borderRadius: 8, background: 'rgba(192,57,43,.14)', border: '1px solid rgba(192,57,43,.3)', color: '#ff8e7e', fontWeight: 600, fontFamily: F, fontSize: 12, cursor: 'pointer' }}>خروج</button>
      </div>
    </header>
  )
}

function LoginPage({ tt, onAuthed }) {
  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (seconds <= 0) return
    const t = setTimeout(() => setSeconds(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seconds])

  const requestOtp = async () => {
    if (!/^\d{9}$/.test(phone.replace(/^\+?9?6?6?/, ''))) { tt('أدخل رقم جوال سعودي صحيح (9 أرقام)'); return }
    setBusy(true)
    try {
      await P.requestOtp(phone)
      setStep('code'); setSeconds(60)
      tt('تم إرسال الرمز عبر واتساب')
    } catch (e) { tt('خطأ: ' + e.message) }
    setBusy(false)
  }

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) { tt('أدخل الرمز (6 أرقام)'); return }
    setBusy(true)
    try {
      await P.verifyOtp(phone, code)
      onAuthed()
    } catch (e) { tt('خطأ: ' + e.message) }
    setBusy(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse at top, rgba(176,125,0,.06), transparent 60%), #0a0c10', color: '#f0f0f0', fontFamily: F, direction: 'rtl', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#10141a', borderRadius: 18, padding: 28, border: '1px solid rgba(176,125,0,.16)', boxShadow: '0 8px 32px rgba(0,0,0,.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(176,125,0,.12)', border: '1px solid ' + C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold, fontWeight: 600, fontSize: 22 }}>ت</div>
        </div>
        <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 600, color: C.gold }}>بوابة العملاء</div>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,.55)', marginTop: 4, marginBottom: 22 }}>تأشيرة البناء والإنشاء</div>
        {step === 'phone' && (
          <>
            <Field label="رقم الجوال">
              <input style={inputBig} value={phone} onChange={e => setPhone(e.target.value)} placeholder="5XXXXXXXX" inputMode="tel" />
            </Field>
            <button style={primaryBtn} disabled={busy} onClick={requestOtp}>{busy ? '...' : 'إرسال الرمز'}</button>
          </>
        )}
        {step === 'code' && (
          <>
            <Field label="رمز التحقق (6 أرقام)">
              <input style={{ ...inputBig, fontFamily: 'monospace', textAlign: 'center', letterSpacing: 8, fontSize: 22 }} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} inputMode="numeric" />
            </Field>
            <button style={primaryBtn} disabled={busy || code.length !== 6} onClick={verify}>{busy ? '...' : 'تحقق'}</button>
            <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,.5)' }}>
              {seconds > 0 ? `إعادة الإرسال خلال ${seconds} ثانية` : <span onClick={requestOtp} style={{ color: C.gold, cursor: 'pointer', fontWeight: 600 }}>إعادة الإرسال</span>}
            </div>
            <div onClick={() => { setStep('phone'); setCode('') }} style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,.4)', cursor: 'pointer' }}>تغيير الرقم</div>
          </>
        )}
      </div>
    </div>
  )
}

function HomeTab({ toast, me, onJump }) {
  const [counts, setCounts] = useState(null)
  useEffect(() => { P.getDashboardCounts().then(setCounts).catch(e => toast?.('خطأ: ' + e.message)) }, [])
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>أهلاً، {me?.person?.name_ar}</div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', marginBottom: 18 }}>هذه نظرة سريعة على حسابك</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <KpiCard title="معاملات نشطة" value={counts?.active_transactions ?? '—'} accent={C.gold} onClick={() => onJump('transactions')} />
        <KpiCard title="فواتير غير مدفوعة" value={counts?.unpaid_invoices ?? '—'} accent={C.warn} onClick={() => onJump('invoices')} />
        <KpiCard title="المبلغ المستحق" value={Number(counts?.unpaid_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) + ' ر.س'} accent={C.red} onClick={() => onJump('invoices')} />
        <KpiCard title="وثائق منتهية قريباً" value={counts?.expiring_documents ?? '—'} accent={C.warn} onClick={() => onJump('documents')} />
      </div>
    </div>
  )
}

function KpiCard({ title, value, accent, onClick }) {
  return (
    <div onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', padding: 18, borderRadius: 14, background: '#10141a', border: '1px solid ' + (accent + '33') }}>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)' }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: accent, marginTop: 6 }}>{value}</div>
    </div>
  )
}

function TransactionsTab({ toast }) {
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(true)
  useEffect(() => { P.listMyTransactions().then(setRows).catch(e => toast?.('خطأ: ' + e.message)).finally(() => setBusy(false)) }, [])
  if (busy) return <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,.5)' }}>جاري التحميل...</div>
  return (
    <div style={{ background: '#10141a', borderRadius: 12, padding: 14, border: '1px solid rgba(255,255,255,.05)' }}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>معاملاتي</div>
      {rows.length === 0 ? <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,.5)' }}>لا معاملات بعد</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map(r => (
            <div key={r.id} style={{ padding: 12, borderRadius: 10, background: '#0a0c10', border: '1px solid rgba(255,255,255,.04)', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{r.transaction_number || r.id.slice(0, 8)}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', marginTop: 2 }}>{r.type || '—'} · {new Date(r.created_at).toLocaleDateString('ar')}</div>
              </div>
              <div style={{ alignSelf: 'center' }}><StatusPill s={r.status} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InvoicesTab({ toast }) {
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(true)
  useEffect(() => { P.listMyInvoices().then(setRows).catch(e => toast?.('خطأ: ' + e.message)).finally(() => setBusy(false)) }, [])
  if (busy) return <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,.5)' }}>جاري التحميل...</div>
  return (
    <div style={{ background: '#10141a', borderRadius: 12, padding: 14, border: '1px solid rgba(255,255,255,.05)' }}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>فواتيري</div>
      {rows.length === 0 ? <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,.5)' }}>لا فواتير بعد</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr><Th>الرقم</Th><Th>التاريخ</Th><Th>المبلغ</Th><Th>المتبقي</Th><Th>الحالة</Th></tr></thead>
          <tbody>
            {rows.map(r => {
              const remaining = Number(r.total_amount || 0) - Number(r.paid_amount || 0)
              return (
                <tr key={r.id}>
                  <Td>{noDash(r.invoice_number || r.invoice_no || r.id.slice(0,8))}</Td>
                  <Td>{r.issue_date || r.invoice_date}</Td>
                  <Td>{Number(r.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</Td>
                  <Td>{remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Td>
                  <Td>{remaining <= 0.01 ? <span style={{ color: C.ok, fontSize: 10, fontWeight: 600 }}>مسددة</span> : <span style={{ color: C.warn, fontSize: 10, fontWeight: 600 }}>غير مسددة</span>}</Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

function DocumentsTab({ toast }) {
  const [uploads, setUploads] = useState([])
  const [busy, setBusy] = useState(true)
  const [uploading, setUploading] = useState(false)
  const refresh = async () => { try { setUploads(await P.listMyUploads()) } catch (e) { toast?.('خطأ: ' + e.message) }; setBusy(false) }
  useEffect(() => { refresh() }, [])
  const onFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try { await P.uploadDocument({ file, documentType: 'other' }); toast?.('تم الرفع'); await refresh() }
    catch (err) { toast?.('خطأ: ' + err.message) }
    setUploading(false)
    e.target.value = ''
  }
  return (
    <div style={{ background: '#10141a', borderRadius: 12, padding: 14, border: '1px solid rgba(255,255,255,.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>وثائقي</div>
        <label style={{ ...primaryBtn, height: 36, padding: '0 16px', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
          <input type="file" style={{ display: 'none' }} onChange={onFile} disabled={uploading} />
          {uploading ? 'جاري الرفع...' : '+ رفع وثيقة'}
        </label>
      </div>
      {busy ? <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,.5)' }}>جاري التحميل...</div> :
        uploads.length === 0 ? <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,.5)' }}>لا وثائق بعد</div> :
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr><Th>اسم الملف</Th><Th>التاريخ</Th><Th>النوع</Th><Th>الحالة</Th></tr></thead>
          <tbody>
            {uploads.map(u => (
              <tr key={u.id}>
                <Td>{u.file_name}</Td>
                <Td>{new Date(u.created_at).toLocaleDateString('ar')}</Td>
                <Td>{u.document_type || '—'}</Td>
                <Td><StatusPill s={u.status} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    </div>
  )
}

function ProfileTab({ me }) {
  return (
    <div style={{ background: '#10141a', borderRadius: 12, padding: 22, border: '1px solid rgba(255,255,255,.05)' }}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>بياناتي</div>
      {!me ? <div>...</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <KV k="الاسم" v={me.person?.name_ar || '—'} />
          <KV k="رقم الهوية" v={me.person?.id_number || me.id_number || '—'} />
          <KV k="الجوال" v={me.person?.phone_primary || me.phone || '—'} />
          <KV k="رقم العميل" v={me.client_number || me.id?.slice(0, 8)} />
        </div>
      )}
    </div>
  )
}

function StatusPill({ s }) {
  const map = {
    pending: { c: '#888', t: 'قيد الانتظار' },
    in_progress: { c: C.warn, t: 'قيد التنفيذ' },
    completed: { c: C.ok, t: 'مكتملة' },
    cancelled: { c: C.red, t: 'ملغاة' },
    reviewed: { c: C.warn, t: 'تمت المراجعة' },
    approved: { c: C.ok, t: 'مقبولة' },
    rejected: { c: C.red, t: 'مرفوضة' },
  }
  const x = map[s] || { c: '#888', t: s || '—' }
  return <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 4, background: x.c + '22', color: x.c, fontWeight: 600 }}>{x.t}</span>
}

const inputBig = { width: '100%', height: 48, padding: '0 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.08)', background: '#0a0c10', color: '#f0f0f0', fontFamily: F, fontSize: 14, outline: 'none', boxSizing: 'border-box', textAlign: 'center' }
const primaryBtn = { width: '100%', height: 48, borderRadius: 10, background: C.gold, color: '#000', fontFamily: F, fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer', marginTop: 14 }
function Field({ label, children }) { return <div style={{ marginBottom: 12 }}><div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.6)', marginBottom: 6 }}>{label}</div>{children}</div> }
function Th({ children }) { return <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, fontSize: 11, color: 'rgba(255,255,255,.55)', background: 'rgba(0,0,0,.18)' }}>{children}</th> }
function Td({ children }) { return <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,.04)' }}>{children}</td> }
function KV({ k, v }) { return <div><div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)' }}>{k}</div><div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{v}</div></div> }
function Toast({ msg }) { return <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#10141a', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 600, padding: '10px 18px', borderRadius: 10, border: '1px solid ' + C.gold, zIndex: 9999 }}>{msg}</div> }
