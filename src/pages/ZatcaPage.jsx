import React, { useEffect, useState } from 'react'
import * as Z from '../services/zatcaService.js'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#D4A017', red: '#c0392b', ok: '#27a046', warn: '#eab308', blue: '#3483b4' }
const fmtAmt = v => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const tabs = [
  { id: 'dash', label: 'لوحة الامتثال' },
  { id: 'invoices', label: 'الفواتير' },
  { id: 'settings', label: 'الإعدادات والاتصال' },
]

export default function ZatcaPage({ toast }) {
  const [tab, setTab] = useState('dash')
  return (
    <div style={{ fontFamily: F, direction: 'rtl' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={tabBtn(tab === t.id)}>{t.label}</button>
        ))}
      </div>
      {tab === 'dash' && <Dash toast={toast} />}
      {tab === 'invoices' && <Invoices toast={toast} />}
      {tab === 'settings' && <Settings toast={toast} />}
    </div>
  )
}

const tabBtn = (active) => ({
  height: 38, padding: '0 16px', borderRadius: 10,
  background: active ? 'rgba(212,160,23,.14)' : 'rgba(0,0,0,.18)',
  border: '1px solid ' + (active ? 'rgba(212,160,23,.42)' : 'rgba(255,255,255,.06)'),
  color: active ? C.gold : 'var(--tx2, rgba(255,255,255,.62))',
  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F,
})

function Dash({ toast }) {
  const [creds, setCreds] = useState(null)
  const [list, setList] = useState([])
  const [busy, setBusy] = useState(true)
  useEffect(() => {
    (async () => {
      try { setCreds(await Z.getCredentials()); setList(await Z.listZatcaInvoices({})) } catch (e) { toast?.('خطأ: ' + e.message) }
      setBusy(false)
    })()
  }, [])
  if (busy) return <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,.5)' }}>جاري التحميل...</div>
  const sent = list.length
  const cleared = list.filter(z => z.status === 'cleared' || z.status === 'reported').length
  const failed = list.filter(z => z.status === 'failed' || z.status === 'rejected').length
  const pending = list.filter(z => z.status === 'pending' || z.status === 'submitted').length
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
        <Kpi title="فواتير مرسلة" value={sent} accent={C.blue} />
        <Kpi title="مقبولة" value={cleared} accent={C.ok} />
        <Kpi title="فاشلة" value={failed} accent={C.red} />
        <Kpi title="قيد الانتظار" value={pending} accent={C.warn} />
        <Kpi title="حالة الاتصال" value={creds?.is_active ? 'مفعّل' : 'غير مفعّل'} accent={creds?.is_active ? C.ok : C.red} />
      </div>
      <h3 style={{ fontSize: 14, fontWeight: 800, color: C.gold, marginBottom: 8 }}>الفواتير الفاشلة</h3>
      <table style={tblS}>
        <thead><tr><Th>UUID</Th><Th>ICV</Th><Th>الحالة</Th><Th>الخطأ</Th><Th>إعادة المحاولة</Th></tr></thead>
        <tbody>
          {list.filter(z => z.status === 'failed').length === 0 && <tr><td colSpan={5} style={emptyTd}>لا توجد فواتير فاشلة 🎉</td></tr>}
          {list.filter(z => z.status === 'failed').map(z => (
            <tr key={z.id}>
              <Td style={{ fontFamily: 'monospace', fontSize: 11 }}>{z.invoice_uuid?.slice(0, 8)}…</Td>
              <Td>{z.icv}</Td>
              <Td><StatusPill s={z.status} /></Td>
              <Td style={{ fontSize: 11, color: 'rgba(255,150,150,.8)' }}>{(z.last_error || '').slice(0, 80)}</Td>
              <Td>
                <button style={btnS()} onClick={async () => { try { await Z.retryFailed(z.id); toast?.('تم'); window.location.reload() } catch (e) { toast?.('خطأ: ' + e.message) } }}>إعادة</button>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Invoices({ toast }) {
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(true)
  const [active, setActive] = useState(null)
  const refresh = async () => { setBusy(true); try { setRows(await Z.listZatcaInvoices({})) } catch (e) { toast?.('خطأ: ' + e.message) } setBusy(false) }
  useEffect(() => { refresh() }, [])
  return (
    <div>
      <button style={btnS()} onClick={refresh}>تحديث</button>
      {busy ? <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,.5)' }}>جاري التحميل...</div> : (
        <table style={tblS}>
          <thead><tr><Th>UUID</Th><Th>ICV</Th><Th>النوع</Th><Th>الحالة</Th><Th>الإرسال</Th><Th>QR</Th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} style={emptyTd}>لا فواتير</td></tr>}
            {rows.map(z => (
              <tr key={z.id} onClick={() => setActive(z)} style={{ cursor: 'pointer' }}>
                <Td style={{ fontFamily: 'monospace', fontSize: 11 }}>{z.invoice_uuid?.slice(0, 8)}…</Td>
                <Td>{z.icv}</Td>
                <Td>{z.is_simplified ? 'B2C' : 'B2B'}</Td>
                <Td><StatusPill s={z.status} /></Td>
                <Td>{z.submitted_at ? new Date(z.submitted_at).toLocaleString('ar') : '—'}</Td>
                <Td><span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>{z.qr_base64 ? 'موجود' : '—'}</span></Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {active && <ZInvoiceModal z={active} onClose={() => setActive(null)} toast={toast} />}
    </div>
  )
}

function ZInvoiceModal({ z, onClose, toast }) {
  return (
    <Modal onClose={onClose} title="فاتورة ZATCA" wide>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 14 }}>
        <KV k="UUID" v={z.invoice_uuid} />
        <KV k="ICV" v={z.icv} />
        <KV k="النوع" v={z.is_simplified ? 'مبسطة (B2C)' : 'ضريبية (B2B)'} />
        <KV k="الحالة" v={<StatusPill s={z.status} />} />
        <KV k="هاش الفاتورة" v={(z.invoice_hash || '').slice(0, 16) + '…'} />
        <KV k="هاش السابقة (PIH)" v={(z.pih || '').slice(0, 16) + '…'} />
      </div>
      {z.qr_base64 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', marginBottom: 4 }}>QR Code (Base64)</div>
          <div style={{ fontFamily: 'monospace', fontSize: 10, padding: 10, background: 'rgba(0,0,0,.3)', borderRadius: 8, wordBreak: 'break-all' }}>{z.qr_base64.slice(0, 200)}…</div>
        </div>
      )}
      {z.last_error && (
        <div style={{ marginBottom: 14, padding: 12, borderRadius: 8, background: 'rgba(192,57,43,.1)', border: '1px solid rgba(192,57,43,.3)' }}>
          <div style={{ fontSize: 11, color: '#ff9b8e', fontWeight: 700, marginBottom: 4 }}>خطأ من ZATCA</div>
          <div style={{ fontSize: 11, color: 'rgba(255,180,180,.8)' }}>{z.last_error}</div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {z.status === 'failed' && <button style={btnS('gold')} onClick={async () => { try { await Z.retryFailed(z.id); toast?.('تمت إعادة المحاولة'); onClose() } catch (e) { toast?.('خطأ: ' + e.message) } }}>إعادة المحاولة</button>}
        <button style={btnS()} onClick={onClose}>إغلاق</button>
      </div>
    </Modal>
  )
}

function Settings({ toast }) {
  const [creds, setCreds] = useState(null)
  const [busy, setBusy] = useState(true)
  const [otp, setOtp] = useState('')
  const [onboarding, setOnboarding] = useState(false)
  useEffect(() => { Z.getCredentials().then(setCreds).finally(() => setBusy(false)) }, [])
  const setField = (k, v) => setCreds({ ...(creds || {}), [k]: v })
  const save = async () => {
    try {
      await Z.upsertCredentials({
        environment: creds?.environment || 'sandbox',
        vat_number: creds?.vat_number,
        cr_number: creds?.cr_number,
        registration_name_ar: creds?.registration_name_ar,
        registration_name_en: creds?.registration_name_en,
        street: creds?.street, building_number: creds?.building_number, district: creds?.district,
        city: creds?.city, postal_code: creds?.postal_code, additional_number: creds?.additional_number,
      })
      toast?.('تم الحفظ')
    } catch (e) { toast?.('خطأ: ' + e.message) }
  }
  const onboard = async () => {
    if (!/^\d{6,}$/.test(otp)) { toast?.('أدخل OTP من بوابة فاتورة'); return }
    setOnboarding(true)
    try { const r = await Z.startOnboarding({ otp }); toast?.(r?.data?.has_pcsid ? 'تم الإكمال' : 'تم الجزء الأول — يلزم اتمام production'); setCreds(await Z.getCredentials()) }
    catch (e) { toast?.('خطأ: ' + e.message) }
    setOnboarding(false)
  }
  if (busy) return <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,.5)' }}>جاري التحميل...</div>
  return (
    <div>
      <h3 style={{ fontSize: 14, fontWeight: 800, color: C.gold, marginBottom: 12 }}>1) بيانات المنشأة</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 18 }}>
        <Field label="البيئة">
          <select style={inputS} value={creds?.environment || 'sandbox'} onChange={e => setField('environment', e.target.value)}>
            <option value="sandbox">Sandbox (تجريبي)</option>
            <option value="simulation">Simulation</option>
            <option value="production">Production (إنتاج)</option>
          </select>
        </Field>
        <Field label="الرقم الضريبي (15 رقم)"><input style={inputS} value={creds?.vat_number || ''} onChange={e => setField('vat_number', e.target.value)} /></Field>
        <Field label="رقم السجل التجاري"><input style={inputS} value={creds?.cr_number || ''} onChange={e => setField('cr_number', e.target.value)} /></Field>
        <Field label="الاسم بالعربي"><input style={inputS} value={creds?.registration_name_ar || ''} onChange={e => setField('registration_name_ar', e.target.value)} /></Field>
        <Field label="الاسم بالإنجليزي"><input style={inputS} value={creds?.registration_name_en || ''} onChange={e => setField('registration_name_en', e.target.value)} /></Field>
        <Field label="الشارع"><input style={inputS} value={creds?.street || ''} onChange={e => setField('street', e.target.value)} /></Field>
        <Field label="رقم المبنى"><input style={inputS} value={creds?.building_number || ''} onChange={e => setField('building_number', e.target.value)} /></Field>
        <Field label="الحي"><input style={inputS} value={creds?.district || ''} onChange={e => setField('district', e.target.value)} /></Field>
        <Field label="المدينة"><input style={inputS} value={creds?.city || ''} onChange={e => setField('city', e.target.value)} /></Field>
        <Field label="الرمز البريدي"><input style={inputS} value={creds?.postal_code || ''} onChange={e => setField('postal_code', e.target.value)} /></Field>
        <Field label="الرقم الإضافي"><input style={inputS} value={creds?.additional_number || ''} onChange={e => setField('additional_number', e.target.value)} /></Field>
      </div>
      <button style={btnS()} onClick={save}>حفظ البيانات</button>

      <h3 style={{ fontSize: 14, fontWeight: 800, color: C.gold, margin: '24px 0 12px' }}>2) Onboarding (اعتماد ZATCA)</h3>
      <div style={{ padding: 14, borderRadius: 10, background: 'rgba(212,160,23,.07)', border: '1px solid rgba(212,160,23,.2)', marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', lineHeight: 1.7 }}>
          1. سجّل دخول بوابة <b>فاتورة</b> (fatoora.zatca.gov.sa) وأنشئ OTP لمدة 60 دقيقة.<br />
          2. الصق الرمز في الحقل أدناه واضغط "بدء التسجيل" — سيتم توليد CSR وإرساله لـ ZATCA لاستلام الشهادة.<br />
          3. عند نجاح الجزء الأول (Compliance)، يجري النظام اختبارات الامتثال تلقائياً.<br />
          4. عند النجاح، يطلب Production CSID ويحفظ شهادة الإنتاج.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <Field label="رمز OTP"><input style={inputS} value={otp} onChange={e => setOtp(e.target.value)} placeholder="123456" /></Field>
        <button style={btnS('gold')} onClick={onboard} disabled={onboarding || !creds?.vat_number}>{onboarding ? '...' : 'بدء التسجيل'}</button>
      </div>
      {creds?.onboarded_at && <div style={{ marginTop: 10, fontSize: 12, color: C.ok }}>✓ تم التسجيل بتاريخ {new Date(creds.onboarded_at).toLocaleString('ar')}</div>}
      {creds?.is_active && <div style={{ fontSize: 12, color: C.ok }}>✓ مفعّل في وضع {creds.environment}</div>}
    </div>
  )
}

function StatusPill({ s }) {
  const map = {
    pending: { c: '#888', t: 'قيد الانتظار' },
    submitted: { c: C.warn, t: 'مُرسل' },
    cleared: { c: C.ok, t: 'مُعتمد' },
    reported: { c: C.ok, t: 'مُبلَّغ' },
    rejected: { c: C.red, t: 'مرفوض' },
    failed: { c: C.red, t: 'فشل' },
  }
  const x = map[s] || { c: '#888', t: s }
  return <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 4, background: x.c + '22', color: x.c, fontWeight: 700 }}>{x.t}</span>
}

const inputS = { width: '100%', height: 38, padding: '0 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,.06)', background: 'var(--modal-input-bg, #2a2a2a)', color: 'var(--tx, #f0f0f0)', fontFamily: F, fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const btnS = (variant) => ({
  height: 38, padding: '0 16px', borderRadius: 9, fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer',
  border: '1px solid ' + (variant === 'gold' ? C.gold : 'rgba(255,255,255,.08)'),
  background: variant === 'gold' ? 'rgba(212,160,23,.16)' : 'rgba(0,0,0,.18)',
  color: variant === 'gold' ? C.gold : 'var(--tx, #f0f0f0)',
})
const tblS = { width: '100%', borderCollapse: 'collapse', background: '#1f1f1f', borderRadius: 12, overflow: 'hidden', fontSize: 13, marginTop: 8 }
const emptyTd = { textAlign: 'center', padding: 24, color: 'rgba(255,255,255,.5)' }
function Th({ children }) { return <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, fontSize: 12, color: 'rgba(255,255,255,.55)', background: 'rgba(0,0,0,.18)', borderBottom: '1px solid rgba(255,255,255,.05)' }}>{children}</th> }
function Td({ children, style }) { return <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,.04)', ...(style || {}) }}>{children}</td> }
function KV({ k, v }) { return <div><div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)' }}>{k}</div><div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{v}</div></div> }
function Field({ label, children }) { return <div><div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.55)', marginBottom: 4 }}>{label}</div>{children}</div> }
function Kpi({ title, value, accent }) { return <div style={{ padding: 16, borderRadius: 12, background: 'linear-gradient(160deg,#2A2A2A 0%,#1F1F1F 100%)', border: '1px solid ' + accent + '33' }}><div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', fontWeight: 600 }}>{title}</div><div style={{ fontSize: 20, fontWeight: 800, color: accent, marginTop: 6 }}>{value}</div></div> }
function Modal({ onClose, title, children, wide }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,.78)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--modal-bg, #1f1f1f)', borderRadius: 14, width: wide ? 800 : 540, maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto', border: '1px solid rgba(212,160,23,.18)', padding: 20, fontFamily: F, direction: 'rtl' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.gold, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,.06)' }}>{title}</div>
        {children}
      </div>
    </div>
  )
}
