import React, { useCallback, useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { Building2, FileText, Wallet, CreditCard, Plus, ChevronDown, Trash2 } from 'lucide-react'
import { can as canPerm } from '../../lib/permissions.js'
import { ObModal, Field, SaveBtn, fText, fMono, fDate } from './ObligationModalUI.jsx'
import { Modal as FKModal, ModalSection as FKSection, TextField, CurrencyField, DateField, Select as FKSelect, FileField, SuccessView, sF } from '../../components/ui/FormKit.jsx'

const F = "'Cairo','Tajawal',sans-serif"
const GOLD = '#D4A017'
const C = { gold: GOLD, ok: '#2ecc71', warn: '#eab308', red: '#e87265', blue: '#5dade2', gray: '#95a5a6' }
const MONO = "'JetBrains Mono','Cairo',sans-serif"

const fmtAmt = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
// Live thousands-separator helpers for amount inputs: display grouped, store raw.
const grpNum = (v) => { const s = String(v ?? '').replace(/[^\d.]/g, ''); if (s === '') return ''; const [i, d] = s.split('.'); return (i ? Number(i).toLocaleString('en-US') : '0') + (d !== undefined ? '.' + d : '') }
const rawNum = (v) => String(v ?? '').replace(/[^\d.]/g, '')
const todayIso = () => new Date().toISOString().slice(0, 10)
const FREQ = [
  { k: 'monthly', l: 'شهري', step: 1 },
  { k: 'quarterly', l: 'ربع سنوي', step: 3 },
  { k: 'semiannual', l: 'نصف سنوي', step: 6 },
  { k: 'annual', l: 'سنوي', step: 12 },
  { k: 'once', l: 'دفعة واحدة', step: 0 },
]
const freqLabel = (k) => FREQ.find(f => f.k === k)?.l || k
const addMonths = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10) }

// Build a payment schedule from a contract period + frequency + per-period amount.
function genSchedule(start, end, freq, amount) {
  if (!start || !amount) return []
  const step = FREQ.find(f => f.k === freq)?.step
  if (!step) return [{ due_date: start, amount }] // once
  const out = []
  let cur = start
  const limit = end || addMonths(start, 12) // default 1 year if no end
  let guard = 0
  while (cur <= limit && guard < 120) { out.push({ due_date: cur, amount }); cur = addMonths(cur, step); guard++ }
  return out
}

// Status of a scheduled payment relative to today.
function payState(p) {
  if (p.status === 'paid') return { k: 'paid', l: 'مدفوع', c: C.ok }
  const t = todayIso()
  if (p.due_date < t) return { k: 'overdue', l: 'متأخر', c: C.red }
  const soon = new Date(); soon.setDate(soon.getDate() + 7)
  if (p.due_date <= soon.toISOString().slice(0, 10)) return { k: 'soon', l: 'مستحق قريباً', c: C.gold }
  return { k: 'upcoming', l: 'قادم', c: C.gray }
}

const inp = { width: '100%', height: 42, padding: '0 14px', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, fontFamily: F, fontSize: 14, fontWeight: 500, color: 'var(--tx)', outline: 'none', background: 'var(--modal-input-bg, rgba(0,0,0,.18))', boxSizing: 'border-box' }
const lbl = { fontSize: 12, fontWeight: 600, color: 'var(--tx3)', marginBottom: 6, display: 'block' }

export default function BranchRentCard({ sb, branch, user, toast, lang }) {
  const isAr = lang !== 'en'
  const canEdit = canPerm(user, 'admin_offices.edit') || canPerm(user, 'admin_offices.create')
  const canDelete = canPerm(user, 'admin_offices.delete')

  const [obligation, setObligation] = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [payModal, setPayModal] = useState(null) // { id?, due_date, amount } for add/mark

  const load = useCallback(async () => {
    if (!sb || !branch?.id) return
    setLoading(true)
    const { data: obs } = await sb.from('branch_obligations').select('*')
      .eq('branch_id', branch.id).eq('obligation_type', 'rent').is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(1)
    const ob = (obs || [])[0] || null
    setObligation(ob)
    if (ob) {
      const { data: pays } = await sb.from('branch_obligation_payments').select('*')
        .eq('obligation_id', ob.id).is('deleted_at', null).order('due_date')
      setPayments(pays || [])
    } else setPayments([])
    setLoading(false)
  }, [sb, branch?.id])
  useEffect(() => { load() }, [load])

  const markPaid = async (p) => {
    const { error } = await sb.from('branch_obligation_payments').update({
      status: 'paid', paid_date: todayIso(), paid_amount: p.amount,
    }).eq('id', p.id)
    if (error) { toast?.('تعذّر التحديث: ' + error.message.slice(0, 80), 'error'); return }
    toast?.('تم تسجيل السداد'); load()
  }
  const unpay = async (p) => {
    const { error } = await sb.from('branch_obligation_payments').update({ status: 'pending', paid_date: null, paid_amount: null }).eq('id', p.id)
    if (error) { toast?.('خطأ: ' + error.message.slice(0, 80), 'error'); return }
    load()
  }
  const delPayment = async (p) => {
    if (!confirm('حذف هذه الدفعة؟')) return
    const { error } = await sb.from('branch_obligation_payments').update({ deleted_at: new Date().toISOString() }).eq('id', p.id)
    if (error) { toast?.('خطأ: ' + error.message.slice(0, 80), 'error'); return }
    toast?.('تم الحذف', 'delete'); load()
  }

  const pendingTotal = payments.filter(p => p.status !== 'paid').reduce((s, p) => s + Number(p.amount || 0), 0)
  const nextDue = payments.filter(p => p.status !== 'paid').sort((a, b) => a.due_date.localeCompare(b.due_date))[0]

  return (
    <div className="brd-section">
      <div className="brd-section-head">
        <span className="brd-section-head-l">
          <span className="brd-section-dot" style={{ background: GOLD }} />
          الإيجار
        </span>
        {canEdit && (
          <button onClick={() => setModal(true)}
            onMouseEnter={e => { e.currentTarget.style.borderStyle = 'solid'; e.currentTarget.style.background = 'rgba(212,160,23,.12)' }}
            onMouseLeave={e => { e.currentTarget.style.borderStyle = 'dashed'; e.currentTarget.style.background = 'transparent' }}
            style={{ height: 32, padding: '0 14px', borderRadius: 9, background: 'transparent', border: '1px dashed rgba(212,160,23,.5)', color: GOLD, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            {obligation ? 'تعديل' : 'عقد إيجار جديد'}
            {obligation
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>}
          </button>
        )}
      </div>

      <div className="brd-section-body">
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--tx4)', fontSize: 12 }}>جارٍ التحميل…</div>
        ) : !obligation ? (
          <div style={{ padding: 28, textAlign: 'center', color: 'var(--tx4)', fontSize: 12, border: '1px dashed rgba(255,255,255,.08)', borderRadius: 10 }}>
            لا يوجد عقد إيجار لهذا المكتب — اضغط «إضافة عقد».
          </div>
        ) : (
          <>
            {/* Contract summary tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[
                { l: 'المؤجِّر', v: obligation.vendor },
                { l: 'رقم العقد', v: obligation.account_no, mono: true },
                { l: 'قيمة العقد', v: obligation.amount ? fmtAmt(obligation.amount) : null, gold: true, mono: true },
                { l: 'الدورية', v: freqLabel(obligation.frequency) },
                { l: 'بداية العقد', v: obligation.start_date, mono: true },
                { l: 'نهاية العقد', v: obligation.end_date, mono: true },
              ].map((t, i) => (
                <div key={i} style={{ padding: '12px 14px', borderRadius: 11, background: t.gold ? 'rgba(212,160,23,.07)' : 'rgba(255,255,255,.03)', border: `1px solid ${t.gold ? 'rgba(212,160,23,.2)' : 'rgba(255,255,255,.07)'}` }}>
                  <div style={{ fontSize: 12, color: t.gold ? 'rgba(212,160,23,.8)' : 'var(--tx4)', fontWeight: 600, letterSpacing: '.2px', marginBottom: 5 }}>{t.l}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: t.gold ? GOLD : (t.v ? 'rgba(255,255,255,.88)' : 'var(--tx5)'), direction: t.mono ? 'ltr' : 'rtl', textAlign: 'right', fontFamily: t.mono ? MONO : F }}>{t.v || '—'}</div>
                </div>
              ))}
            </div>

            {/* Contract document + summary line */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
              {obligation.document_url ? (
                <a href={obligation.document_url} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 34, padding: '0 14px', borderRadius: 9, background: 'rgba(93,173,226,.1)', border: '1px solid rgba(93,173,226,.3)', color: C.blue, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                  عرض عقد الإيجار
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                </a>
              ) : <span style={{ fontSize: 11.5, color: 'var(--tx5)' }}>لم يُرفع ملف العقد</span>}
              <span style={{ marginInlineStart: 'auto', fontSize: 12, color: 'var(--tx3)', fontWeight: 600 }}>
                المتبقي غير المسدد: <span style={{ color: GOLD, fontWeight: 800, fontFamily: MONO, direction: 'ltr' }}>{fmtAmt(pendingTotal)}</span>
              </span>
            </div>

            {/* Payment schedule */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tx2)' }}>جدول السداد ({payments.length})</span>
              {canEdit && (
                <button onClick={() => setPayModal({ due_date: todayIso(), amount: '' })}
                  style={{ fontSize: 11, fontWeight: 700, color: GOLD, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: F }}>+ دفعة</button>
              )}
            </div>
            {payments.length === 0 ? (
              <div style={{ padding: 18, textAlign: 'center', color: 'var(--tx5)', fontSize: 11.5 }}>لا توجد دفعات مجدولة.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {payments.map(p => {
                  const st = payState(p)
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.c, flexShrink: 0 }} />
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tx2)', fontFamily: MONO, direction: 'ltr' }}>{p.due_date}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: GOLD, fontFamily: MONO, direction: 'ltr' }}>{fmtAmt(p.amount)}</span>
                      <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: `${st.c}1a`, color: st.c, border: `1px solid ${st.c}33` }}>{st.l}</span>
                      <span style={{ marginInlineStart: 'auto', display: 'inline-flex', gap: 6 }}>
                        {canEdit && p.status !== 'paid' && (
                          <button onClick={() => markPaid(p)} title="تسجيل سداد" style={{ fontSize: 11, fontWeight: 700, color: C.ok, background: 'rgba(46,204,113,.1)', border: '1px solid rgba(46,204,113,.3)', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontFamily: F }}>سداد</button>
                        )}
                        {canEdit && p.status === 'paid' && (
                          <button onClick={() => unpay(p)} title="تراجع" style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx4)', background: 'transparent', border: '1px solid rgba(255,255,255,.12)', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontFamily: F }}>تراجع</button>
                        )}
                        {canDelete && (
                          <button onClick={() => delPayment(p)} title="حذف" style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid rgba(192,57,43,.25)', background: 'rgba(192,57,43,.1)', color: C.red, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                          </button>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
            <div style={{ marginTop: 10, fontSize: 10.5, color: 'var(--tx5)', lineHeight: 1.6 }}>
              الدفعات المستحقة خلال 14 يوماً تظهر تلقائياً في صفحة «المدفوعات».
            </div>
          </>
        )}
      </div>

      {modal && (
        <ContractModal sb={sb} branch={branch} user={user} toast={toast}
          obligation={obligation} payments={payments}
          onClose={() => setModal(false)} onSaved={() => { setModal(false); load() }} />
      )}
      {payModal && (
        <PaymentModal sb={sb} obligation={obligation} branch={branch} toast={toast}
          init={payModal} onClose={() => setPayModal(null)} onSaved={() => { setPayModal(null); load() }} />
      )}
    </div>
  )
}

// ── Contract add/edit modal (with file upload + auto-schedule generation) ──
function ContractModal({ sb, branch, user, toast, obligation, payments, onClose, onSaved }) {
  const [f, setF] = useState(() => ({
    vendor: obligation?.vendor || '', account_no: obligation?.account_no || '',
    amount: obligation?.amount || '', frequency: obligation?.frequency || 'monthly',
    start_date: obligation?.start_date || todayIso(), end_date: obligation?.end_date || '',
    notes: obligation?.notes || '', _file: null,
    _autogen: !obligation, // generate schedule for brand-new contracts
  }))
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)   // success screen after a save
  const [err, setErr] = useState('')        // inline footer error (no toast)
  // Editable payment schedule (new contracts only) — generated from the period +
  // frequency, then freely adjustable before saving.
  const [sched, setSched] = useState([])
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  // Build a schedule from the current period + a given frequency. The contract
  // total is split evenly across the implied due dates.
  const buildSched = (freq) => {
    const total = Number(f.amount) || 0
    const rows = genSchedule(f.start_date, f.end_date, freq, total)
    const per = rows.length ? Math.round((total / rows.length) * 100) / 100 : 0
    return rows.map(r => ({ due_date: r.due_date, amount: per }))
  }
  const setRow = (i, k, v) => setSched(s => s.map((r, j) => j === i ? { ...r, [k]: v } : r))
  const delRow = (i) => setSched(s => s.filter((_, j) => j !== i))
  const addRow = () => setSched(s => [...s, { due_date: f.start_date || todayIso(), amount: Number(f.amount) ? Math.round((Number(f.amount) / Math.max(1, s.length + 1)) * 100) / 100 : '' }])

  // New contracts: (re)build the payment schedule whenever the period, amount, or
  // frequency changes. Rows stay editable afterwards via the row controls.
  useEffect(() => { if (!obligation) setSched(buildSched(f.frequency)) }, [f.amount, f.start_date, f.end_date, f.frequency])

  const save = async () => {
    if (!f.amount || !f.start_date) { setErr('أكمل جميع الحقول المطلوبة'); return }
    if (!f._file && !obligation?.document_url) { setErr('أرفق ملف العقد'); return }
    if (!obligation && sched.length === 0) { setErr('جدول السداد مطلوب'); return }
    setErr(''); setSaving(true)
    try {
      let document_url = obligation?.document_url || null, document_path = obligation?.document_path || null
      if (f._file) {
        const safe = (f._file.name || 'file').replace(/[^\w.\-]+/g, '_')
        const path = `branch_obligations/${branch.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safe}`
        const { error: upErr } = await sb.storage.from('attachments').upload(path, f._file, { cacheControl: '3600', upsert: false })
        if (upErr) throw upErr
        document_url = sb.storage.from('attachments').getPublicUrl(path).data?.publicUrl || path
        document_path = path
      }
      const payload = {
        branch_id: branch.id, obligation_type: 'rent', title: 'عقد إيجار المكتب',
        vendor: f.vendor || null, account_no: f.account_no || null,
        amount: Number(f.amount) || 0, frequency: f.frequency,
        start_date: f.start_date || null, end_date: f.end_date || null,
        document_url, document_path,
      }
      let obId = obligation?.id
      if (obId) {
        const { error } = await sb.from('branch_obligations').update(payload).eq('id', obId)
        if (error) throw error
      } else {
        const { data, error } = await sb.from('branch_obligations').insert(payload).select('id').single()
        if (error) throw error
        obId = data.id
      }
      // New contracts: insert the (possibly hand-edited) schedule rows shown in
      // step 2. Only when no payments exist yet.
      if (!obligation && obId && sched.length && (payments?.length || 0) === 0) {
        const rows = sched.filter(r => r.due_date).map(r => ({ obligation_id: obId, branch_id: branch.id, due_date: r.due_date, amount: Number(r.amount) || 0, status: 'pending' }))
        if (rows.length) {
          const { error: e2 } = await sb.from('branch_obligation_payments').insert(rows)
          if (e2) throw e2
        }
      }
      setDone(true)
    } catch (e) {
      setErr('تعذّر الحفظ: ' + (e.message || '').slice(0, 90))
    } finally { setSaving(false) }
  }

  // Outside-click no longer closes — only the X. After a save, the X reloads the parent.
  const handleClose = () => done ? onSaved() : onClose()
  const accent = obligation ? '#36a8e6' : GOLD   // matches the FormKit edit/create variant tint
  // Gate the wizard's Next/Save button until each step's required fields are complete.
  const step1Ok = !!(f.vendor && f.account_no && f.amount && f.start_date && f.end_date)
  const schedTotal = sched.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  // The payment schedule total must not exceed the contract's total value (new contracts only).
  const overTotal = !obligation && (Number(f.amount) || 0) > 0 && schedTotal > (Number(f.amount) || 0) + 0.5
  // When editing, the save button stays disabled until at least one field (or the
  // uploaded file) actually differs from the stored contract.
  const dirty = !obligation || !!f._file ||
    (f.vendor || '') !== (obligation.vendor || '') ||
    (f.account_no || '') !== (obligation.account_no || '') ||
    (Number(f.amount) || 0) !== (Number(obligation.amount) || 0) ||
    f.frequency !== (obligation.frequency || 'monthly') ||
    (f.start_date || '') !== (obligation.start_date || '') ||
    (f.end_date || '') !== (obligation.end_date || '')
  const step2Ok = (!!f._file || !!obligation?.document_url) && (obligation ? true : sched.length > 0) && !overTotal && dirty

  // ── Step 1 — contract data ──
  const page1 = (
    <FKSection Icon={FileText} label="بيانات العقد">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 16, rowGap: 14 }}>
        <TextField full label="المؤجِّر" req value={f.vendor} onChange={v => set('vendor', v)} placeholder="اسم المالك/الجهة" />
        <TextField label="رقم العقد" req dir="ltr" value={f.account_no} onChange={v => set('account_no', v)} />
        <CurrencyField label="قيمة العقد الكلية" req value={f.amount} onChange={v => set('amount', v)} />
        <DateField label="تاريخ البداية" req value={f.start_date} onChange={v => set('start_date', v)} />
        <DateField label="تاريخ النهاية" req value={f.end_date} onChange={v => set('end_date', v)} min={f.start_date} />
        <FKSelect label="الدورية" req searchable={false} value={f.frequency} onChange={v => set('frequency', v)}
          options={FREQ} getKey={o => o.k} getLabel={o => o.l} />
      </div>
    </FKSection>
  )

  // ── Step 2 — documents + payment schedule ──
  const page2 = (
    <FKSection Icon={Wallet} label="المستندات والجدولة">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FileField label="عقد الإيجار (ملف)" req value={f._file} onChange={fl => set('_file', fl)}
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          hint={obligation?.document_url && !f._file ? 'يوجد ملف مرفوع — ارفع ملفاً جديداً لاستبداله' : undefined} />

        {!obligation && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.tx3 || 'var(--tx3)', textAlign: 'start' }}>
                جدول السداد <span style={{ color: C.red }}>*</span>
                {sched.length > 0 && <span style={{ color: accent }}> ({sched.length})</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <button type="button" onClick={() => setSched(buildSched(f.frequency))}
                  style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx3)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                  إعادة توليد
                </button>
                <button type="button" onClick={addRow} style={{ fontSize: 12.5, fontWeight: 700, color: accent, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: F }}>+ دفعة</button>
              </div>
            </div>
            {sched.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--tx5)', fontSize: 11.5, border: '1px dashed rgba(255,255,255,.1)', borderRadius: 10 }}>أدخل القيمة والفترة لتوليد جدول السداد.</div>
            ) : (
              <div className="crc-sched" style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 150, overflowY: 'auto', paddingInlineStart: 2 }}>
                <style>{`.crc-sched::-webkit-scrollbar{width:0;display:none}.crc-sched{scrollbar-width:none;-ms-overflow-style:none}`}</style>
                {sched.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 24, textAlign: 'center', fontSize: 14, fontWeight: 800, color: 'var(--tx2)', fontFamily: MONO, flexShrink: 0 }}>{i + 1}</span>
                    <div style={{ flex: 1 }}><DateField value={r.due_date} onChange={v => setRow(i, 'due_date', v)} /></div>
                    <input type="text" inputMode="decimal" value={grpNum(r.amount)} onChange={e => setRow(i, 'amount', rawNum(e.target.value))}
                      style={{ ...sF, width: 120, direction: 'ltr', fontSize: 13 }} />
                    <button type="button" onClick={() => delRow(i)} title="حذف"
                      style={{ width: 42, height: 42, borderRadius: 9, border: '1px solid rgba(192,57,43,.2)', background: 'rgba(192,57,43,.08)', color: C.red, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Trash2 size={15} strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {sched.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--tx4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>إجمالي الجدول</span>
                <span style={{ fontFamily: MONO, direction: 'ltr', fontWeight: 800, fontSize: 18, color: overTotal ? C.red : (Math.abs(schedTotal - (Number(f.amount) || 0)) > 0.5 ? C.warn : C.ok) }}>{Math.round(schedTotal).toLocaleString('en-US')}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </FKSection>
  )

  return (
    <FKModal
      open onClose={handleClose} width={600}
      title={obligation ? 'تعديل عقد الإيجار' : 'عقد إيجار جديد'} Icon={Building2}
      variant={obligation ? 'edit' : 'create'}
      success={done ? <SuccessView title={obligation ? 'عُدّل عقد الإيجار بنجاح' : 'أُضيف عقد الإيجار بنجاح'} /> : undefined}
      onSubmit={save} submitting={saving}
      submitLabel={obligation ? 'تعديل' : 'إضافة'} submitIcon={obligation ? undefined : Plus}
      nextLabel="التالي" backLabel="السابق"
      pages={[
        { title: 'بيانات العقد', valid: step1Ok, content: page1 },
        { title: 'المستندات والجدولة', valid: step2Ok, error: overTotal ? 'إجمالي الجدول يتجاوز قيمة العقد' : err, content: page2 },
      ]}
    />
  )
}

// ── Single payment add modal ──
function PaymentModal({ sb, obligation, branch, toast, init, onClose, onSaved }) {
  const [f, setF] = useState({ due_date: init.due_date || todayIso(), amount: init.amount || '', notes: '' })
  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (!f.due_date || !f.amount) { toast?.('أدخل التاريخ والمبلغ', 'error'); return }
    setSaving(true)
    const { error } = await sb.from('branch_obligation_payments').insert({
      obligation_id: obligation.id, branch_id: branch.id, due_date: f.due_date, amount: Number(f.amount) || 0, status: 'pending', notes: f.notes || null,
    })
    setSaving(false)
    if (error) { toast?.('خطأ: ' + error.message.slice(0, 80), 'error'); return }
    toast?.('تمت إضافة الدفعة'); onSaved()
  }
  return (
    <ObModal title="إضافة دفعة" Icon={Wallet} sectionLabel="بيانات الدفعة" SectionIcon={CreditCard}
      width={440} onClose={onClose}
      footer={<SaveBtn onClick={save} disabled={saving} label={saving ? '…' : 'إضافة الدفعة'} />}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="تاريخ الاستحقاق" req><input type="date" style={fDate} value={f.due_date} onChange={e => setF(p => ({ ...p, due_date: e.target.value }))} /></Field>
        <Field label="المبلغ (ر.س)" req><input type="number" style={fMono} value={f.amount} onChange={e => setF(p => ({ ...p, amount: e.target.value }))} /></Field>
        <Field label="ملاحظات"><input style={fText} value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} /></Field>
      </div>
    </ObModal>
  )
}
