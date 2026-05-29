import React, { useEffect, useMemo, useState } from 'react'
import { Tag } from 'lucide-react'
import { Sel } from './KafalaCalculator'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#D4A017', ok: '#2ecc71', blue: '#5dade2', red: '#e87265', gray: '#95a5a6' }
const PAGE = 50
const fmtAmt = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtInt = (v) => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
const fmtDate = (d) => { if (!d) return '—'; const dt = new Date(d); if (isNaN(dt)) return '—'; return dt.toLocaleDateString('en-GB') }
const fmtTime = (d) => { if (!d) return ''; const dt = new Date(d); if (isNaN(dt)) return ''; return dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }

// Money the office RECEIVES from clients against invoices (cash or bank transfer).
// Distinct from المدفوعات, which is what the office pays out to execute requests.
export default function DepositsPage({ sb, lang, user, branchId, toast }) {
  const isAr = lang !== 'en'
  const T = (a, e) => (isAr ? a : e)
  const isGM = user?.role?.name_ar === 'المدير العام' || user?.role?.name_en === 'General Manager'
  const scopeBranchId = isGM ? (branchId || null) : (user?.primary_branch_id || user?.branch_id || null)

  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [tick, setTick] = useState(0) // bump to refetch after a deposit/verify action
  const [banks, setBanks] = useState([])
  const [cashModal, setCashModal] = useState(false) // add-cash-deposit modal open
  const [verifyTarget, setVerifyTarget] = useState(null) // { mode:'bank'|'cash', row }

  const [method, setMethod] = useState('') // '' | cash | bank
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)
  // Daily summary cards show today's deposits, independent of the table filters below.
  const dayKey = (dt) => { const d = new Date(dt); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
  const day = dayKey(new Date())

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true); setErr(null)
      let query = sb.from('payments').select(`
        id, amount, payment_date, created_at, bank_reference, receipt_no, is_valid,
        method:payment_method_id(code,value_ar,value_en),
        bank:bank_account_id(bank_name,account_name),
        invoice:invoice_id(invoice_no,status:status_id(code)),
        request:service_request_id(client:client_id(name_ar,name_en)),
        deposit_payments(deposit:deposit_id(id,status,kind,deposited_by,verified_by,verified_at,deposited_at))
      `).is('deleted_at', null).order('payment_date', { ascending: false, nullsFirst: false }).limit(2000)
      if (scopeBranchId) query = query.eq('branch_id', scopeBranchId)
      const { data, error } = await query
      if (!alive) return
      if (error) { setErr(error.message); setAll([]) } else { setAll(data || []) }
      setLoading(false)
    })()
    return () => { alive = false }
  }, [sb, scopeBranchId, tick])

  // Office bank accounts for the cash-deposit + verify modals.
  useEffect(() => {
    let alive = true
    ;(async () => {
      let bq = sb.from('bank_accounts').select('id,bank_name,account_name,account_number,iban,branch_id').is('deleted_at', null).eq('is_active', true)
      const { data } = await bq
      if (alive) setBanks(data || [])
    })()
    return () => { alive = false }
  }, [sb])

  const reload = () => setTick(t => t + 1)

  // Normalize each row into a flat shape, classifying method into cash | bank.
  const norm = useMemo(() => all.map(r => {
    const code = (r.method?.code || '').toLowerCase()
    const kind = code.includes('bank') || code.includes('transfer') || code.includes('حوال') ? 'bank' : 'cash'
    const amount = Number(r.amount || 0)
    const isRefund = amount < 0
    const dep = r.deposit_payments?.[0]?.deposit || null
    // Status is derived: a payment not linked to any deposit shows the default for its
    // method; once linked (cash) or verified, it advances. Refunds aren't deposits.
    let status
    if (isRefund) status = 'refund'
    else if (kind === 'bank') status = dep?.status === 'verified' ? 'verified' : 'transfer_done'
    else status = !dep ? 'not_deposited' : (dep.status === 'verified' ? 'verified' : 'deposited')
    return {
      id: r.id,
      amount,
      isRefund,
      date: r.payment_date || r.created_at,
      ref: r.bank_reference || '',
      receiptNo: r.receipt_no || '',
      kind,
      status,
      depositId: dep?.id || null,
      depositedBy: dep?.deposited_by || null,
      methodLabel: r.method?.value_ar || (kind === 'bank' ? 'حوالة بنكية' : 'نقداً'),
      bankName: r.bank?.bank_name || '',
      bankAccount: r.bank?.account_name || '',
      invoiceNo: r.invoice?.invoice_no || '',
      invoiceCancelled: r.invoice?.status?.code === 'cancelled',
      client: r.request?.client?.name_ar || r.request?.client?.name_en || '—',
      valid: r.is_valid !== false,
    }
  }), [all])

  // Status label + color per derived key.
  const STATUS = {
    transfer_done: { label: T('تمت الحوالة', 'Transfer done'), color: C.blue },
    not_deposited: { label: T('لم يتم الإيداع بعد', 'Not deposited'), color: C.gray },
    deposited:     { label: T('تم الإيداع', 'Deposited'), color: C.gold },
    verified:      { label: T('تم التحقق', 'Verified'), color: C.ok },
    refund:        { label: T('استرجاع', 'Refund'), color: C.red },
  }

  // Cash payments still awaiting a deposit — the pool the cash-deposit modal draws from.
  const outstandingCash = useMemo(
    () => norm.filter(r => r.kind === 'cash' && r.status === 'not_deposited' && r.amount > 0 && r.valid && !r.invoiceCancelled),
    [norm]
  )

  // Upload a proof file to the shared `attachments` bucket + register it in the attachments table.
  const uploadAttachment = async (file, depositId, kindNote) => {
    const safe = (file.name || 'file').replace(/[^\w.\-]+/g, '_')
    const path = `deposits/${depositId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safe}`
    const { error: upErr } = await sb.storage.from('attachments').upload(path, file, { cacheControl: '3600', upsert: false })
    if (upErr) throw upErr
    const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
    const { error: insErr } = await sb.from('attachments').insert({
      entity_type: 'deposit', entity_id: depositId,
      file_name: file.name, file_url: pub?.publicUrl || path, storage_path: path,
      mime_type: file.type || null, size_bytes: file.size || null,
      notes: kindNote, uploaded_by: user?.id || null,
    })
    if (insErr) throw insErr
  }

  // Create a cash deposit batch from selected outstanding payments + attach the deposit slip.
  // The deposited amount may differ from the payments' sum (e.g. fees/shortfall); the reason is stored in notes.
  const submitCashDeposit = async ({ paymentIds, bankAccountId, depositDate, depositedAmount, reason, files }) => {
    const expected = outstandingCash.filter(r => paymentIds.includes(r.id)).reduce((s, r) => s + r.amount, 0)
    const total = (depositedAmount != null && !isNaN(Number(depositedAmount))) ? Number(depositedAmount) : expected
    const { data: dep, error } = await sb.from('deposits').insert({
      branch_id: scopeBranchId || null, kind: 'cash', status: 'deposited', total_amount: total,
      bank_account_id: bankAccountId || null,
      deposit_date: depositDate ? new Date(depositDate).toISOString() : new Date().toISOString(),
      deposited_at: new Date().toISOString(), deposited_by: user?.id || null,
      notes: reason ? reason.trim() : null, created_by: user?.id || null,
    }).select('id').single()
    if (error) throw error
    const { error: le } = await sb.from('deposit_payments').insert(paymentIds.map(pid => ({ deposit_id: dep.id, payment_id: pid })))
    if (le) throw le
    for (const f of (files || [])) await uploadAttachment(f, dep.id, 'cash_slip')
  }

  // Confirm a bank transfer arrived: create a verified bank deposit for the single payment.
  const submitBankVerify = async ({ row, bankAccountId, file, notes }) => {
    const { data: dep, error } = await sb.from('deposits').insert({
      branch_id: scopeBranchId || null, kind: 'bank', status: 'verified', total_amount: row.amount,
      bank_account_id: bankAccountId || null,
      deposited_at: new Date().toISOString(),
      verified_at: new Date().toISOString(), verified_by: user?.id || null,
      notes: notes || null, created_by: user?.id || null,
    }).select('id').single()
    if (error) throw error
    const { error: le } = await sb.from('deposit_payments').insert({ deposit_id: dep.id, payment_id: row.id })
    if (le) throw le
    if (file) await uploadAttachment(file, dep.id, 'bank_statement')
  }

  // Verify a cash deposit against the office bank statement — must be a different user than the depositor.
  const submitCashVerify = async ({ row, file, notes }) => {
    if (row.depositedBy && user?.id && row.depositedBy === user.id) {
      toast?.(T('لا يمكنك التحقق من إيداع أنشأته بنفسك — يلزم مستخدم آخر', 'You cannot verify a deposit you created — a different user is required'), 'error')
      return false
    }
    if (file) await uploadAttachment(file, row.depositId, 'bank_statement')
    const { error } = await sb.from('deposits').update({
      status: 'verified', verified_by: user?.id || null, verified_at: new Date().toISOString(),
      notes: notes || null,
    }).eq('id', row.depositId)
    if (error) throw error
    return true
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    const fromT = from ? new Date(from).getTime() : null
    const toT = to ? new Date(to + 'T23:59:59').getTime() : null
    return norm.filter(r => {
      // This page tracks money coming into the office only — drop refunds, voided, and cancelled-invoice payments.
      if (r.isRefund || !r.valid || r.invoiceCancelled) return false
      if (method && r.kind !== method) return false
      if (fromT || toT) { const t = r.date ? new Date(r.date).getTime() : 0; if (fromT && t < fromT) return false; if (toT && t > toT) return false }
      if (term) {
        const hay = `${r.client} ${r.invoiceNo} ${r.ref} ${r.receiptNo} ${r.bankName}`.toLowerCase()
        if (!hay.includes(term)) return false
      }
      return true
    })
  }, [norm, method, q, from, to])

  // Daily totals for the selected day — drives the summary cards.
  const daily = useMemo(() => {
    let total = 0, cash = 0, bank = 0, cashCnt = 0, bankCnt = 0
    for (const r of norm) {
      if (r.isRefund || !r.valid || r.invoiceCancelled) continue
      if (!r.date || dayKey(r.date) !== day) continue
      total += r.amount
      if (r.kind === 'bank') { bank += r.amount; bankCnt++ } else { cash += r.amount; cashCnt++ }
    }
    return { total, cash, bank, cashCnt, bankCnt, cnt: cashCnt + bankCnt }
  }, [norm, day])

  useEffect(() => { setPage(0) }, [method, q, from, to])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE))
  const pageRows = filtered.slice(page * PAGE, page * PAGE + PAGE)

  const methodBtn = (val, label) => {
    const active = method === val
    return (
      <button onClick={() => setMethod(val)} style={{ height: 40, padding: '0 16px', borderRadius: 10, background: active ? 'rgba(212,160,23,.12)' : 'rgba(0,0,0,.18)', border: '1px solid ' + (active ? 'rgba(212,160,23,.35)' : 'rgba(255,255,255,.06)'), color: active ? C.gold : 'var(--tx2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F, whiteSpace: 'nowrap' }}>{label}</button>
    )
  }

  // Stat card styled to match the Invoices page cards: gradient surface, colored dot + title, big figure, footer sub-stat.
  const dCard = (label, value, count, color) => (
    <div style={{ position: 'relative', flex: 1, minWidth: 200, padding: '18px 22px', borderRadius: 16, background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden', minHeight: 150 }}>
      <div style={{ position: 'absolute', insetInlineStart: -60, top: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}aa` }} />
        <span style={{ fontSize: 20, color: '#fff', fontWeight: 600, letterSpacing: '.2px', fontFamily: F }}>{label}</span>
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', justifyContent: 'flex-start', direction: 'ltr' }}>
        <span style={{ fontSize: 40, fontWeight: 800, color, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{fmtInt(value)}</span>
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)' }}>
        <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600, fontFamily: F }}>{T('عدد الدفعات', 'Payments')}</span>
        <span style={{ fontSize: 13, color, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
      </div>
    </div>
  )

  const inputS = { height: 40, padding: '0 12px', borderRadius: 10, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.06)', color: 'var(--tx)', fontFamily: F, fontSize: 13, fontWeight: 600, outline: 'none', boxSizing: 'border-box' }
  const actBtn = (clr) => ({ height: 28, padding: '0 12px', borderRadius: 8, background: clr + '14', border: '1px solid ' + clr + '4d', color: clr, fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' })

  return (
    <div style={{ fontFamily: F, direction: 'rtl', paddingTop: 0 }}>
      {/* Header — matches the Invoices page sizing */}
      <div style={{ marginBottom: 22, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px', lineHeight: 1.2 }}>{T('الإيداعات', 'Deposits')}</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>{T('الأموال المستلمة من العملاء مقابل الفواتير — نقداً أو حوالة بنكية', 'Funds received from clients against invoices — cash or bank transfer')}</div>
        </div>
        <button onClick={() => setCashModal(true)} onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(180deg,rgba(212,160,23,.18) 0%,rgba(212,160,23,.06) 100%)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }} style={{ height: 42, padding: '0 18px', borderRadius: 11, background: 'transparent', border: '1px solid rgba(212,160,23,.4)', color: C.gold, fontFamily: F, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', flexShrink: 0, transition: 'background .15s ease' }}>
          {T('توثيق الإيداع النقدي', 'Record cash deposit')}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>

      {/* Daily summary — today's deposits */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        {dCard(T('إجمالي الإيداعات', 'Total deposits'), daily.total, daily.cnt, C.gold)}
        {dCard(T('نقداً', 'Cash'), daily.cash, daily.cashCnt, C.ok)}
        {dCard(T('تحويلات بنكية', 'Bank transfers'), daily.bank, daily.bankCnt, C.blue)}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        {methodBtn('', T('الكل', 'All'))}
        {methodBtn('cash', T('نقداً', 'Cash'))}
        {methodBtn('bank', T('حوالة بنكية', 'Bank transfer'))}
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--tx4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={T('ابحث بالعميل أو رقم الفاتورة أو المرجع…', 'Search client, invoice no, reference…')} style={{ ...inputS, width: '100%', padding: '0 36px 0 12px', textAlign: 'right' }} />
        </div>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} title={T('من تاريخ', 'From')} style={{ ...inputS, width: 150 }} />
        <input type="date" value={to} onChange={e => setTo(e.target.value)} title={T('إلى تاريخ', 'To')} style={{ ...inputS, width: 150 }} />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--tx4)', fontSize: 13, fontWeight: 600 }}>{T('جارِ التحميل…', 'Loading…')}</div>
      ) : err ? (
        <div style={{ padding: 24, textAlign: 'center', color: C.red, fontSize: 13, fontWeight: 600, border: '1px dashed rgba(232,114,101,.3)', borderRadius: 12 }}>{T('تعذّر تحميل الإيداعات', 'Failed to load deposits')}: {err}</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--tx4)', fontSize: 13, fontWeight: 600, border: '1px dashed rgba(255,255,255,.1)', borderRadius: 12, background: 'rgba(0,0,0,.12)' }}>{T('لا توجد إيداعات مطابقة', 'No matching deposits')}</div>
      ) : (
        <div style={{ borderRadius: 10, overflow: 'hidden' }}>
          <style>{`
.dep-tbl{width:100%;border-collapse:separate;border-spacing:0;font-family:${F};background:#161616;border-radius:10px;border:1px solid rgba(255,255,255,.06)}
.dep-tbl thead th{position:sticky;top:0;background:#161616;color:rgba(255,255,255,.92);font-size:12px;font-weight:700;text-align:center;padding:14px 10px 11px;box-shadow:inset 0 -2px 0 rgba(212,160,23,.55);white-space:nowrap;z-index:2;letter-spacing:.2px}
.dep-tbl tbody td{padding:11px 10px;font-size:11.5px;color:#fff;text-align:center;vertical-align:middle;border-bottom:1px solid rgba(255,255,255,.03)}
.dep-tbl tbody tr{transition:background .12s}
.dep-tbl tbody tr:nth-child(even) td{background:rgba(255,255,255,.02)}
.dep-tbl tbody tr:hover td{background:rgba(212,160,23,.06)}
.dep-tbl tbody tr:last-child td{border-bottom:none}
.dep-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:6px;font-size:10.5px;font-weight:700;white-space:nowrap;line-height:1.5}
.dep-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0}
          `}</style>
          <table className="dep-tbl">
            <thead>
              <tr>
                <th>{T('التاريخ', 'Date')}</th>
                <th>{T('العميل', 'Client')}</th>
                <th>{T('الفاتورة', 'Invoice')}</th>
                <th>{T('الطريقة', 'Method')}</th>
                <th>{T('البنك / المرجع', 'Bank / Reference')}</th>
                <th>{T('المبلغ', 'Amount')}</th>
                <th>{T('الحالة', 'Status')}</th>
                <th>{T('إجراء', 'Action')}</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(r => {
                const isBank = r.kind === 'bank'
                const st = STATUS[r.status] || STATUS.not_deposited
                return (
                  <tr key={r.id} style={{ opacity: r.valid ? 1 : 0.5 }}>
                    <td><div style={{ direction: 'ltr' }}>{fmtDate(r.date)}</div><div style={{ fontSize: 10, color: 'var(--tx5)', direction: 'ltr' }}>{fmtTime(r.date)}</div></td>
                    <td style={{ fontWeight: 700 }}>{r.client}</td>
                    <td><span style={{ direction: 'ltr', display: 'inline-block', fontSize: 11, color: 'var(--tx4)' }}>{r.invoiceNo || '—'}</span></td>
                    <td>
                      <span className="dep-pill" style={{ color: isBank ? C.blue : C.ok, background: (isBank ? 'rgba(93,173,226,' : 'rgba(46,204,113,') + '.12)', border: '1px solid ' + (isBank ? 'rgba(93,173,226,.3)' : 'rgba(46,204,113,.28)') }}>
                        {isBank
                          ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M4 21V10M20 21V10M12 21V10M3 10l9-6 9 6" /></svg>
                          : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></svg>}
                        {isBank ? T('حوالة بنكية', 'Bank') : T('نقداً', 'Cash')}
                      </span>
                    </td>
                    <td>
                      {isBank
                        ? <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 11.5, color: 'var(--tx2)', fontWeight: 700 }}>{r.bankName || '—'}</span>
                            {r.ref && <span style={{ fontSize: 10.5, color: 'var(--tx5)', direction: 'ltr', fontFamily: 'monospace' }}>{r.ref}</span>}
                          </div>
                        : <span style={{ color: 'var(--tx5)' }}>—</span>}
                    </td>
                    <td style={{ fontWeight: 900, direction: 'ltr', color: r.isRefund ? C.red : '#fff' }}>{r.isRefund ? '− ' : ''}{fmtAmt(Math.abs(r.amount))}</td>
                    <td>
                      <span className="dep-pill" style={{ color: st.color, background: st.color + '18', border: '1px solid ' + st.color + '38' }}>
                        <span className="dep-dot" style={{ background: st.color }} />
                        {st.label}
                      </span>
                    </td>
                    <td>
                      {r.status === 'transfer_done' && (
                        <button onClick={() => setVerifyTarget({ mode: 'bank', row: r })} style={actBtn(C.blue)}>{T('تأكيد الوصول', 'Confirm arrival')}</button>
                      )}
                      {r.status === 'deposited' && (() => {
                        const sameUser = r.depositedBy && user?.id && r.depositedBy === user.id
                        return (
                          <button onClick={() => !sameUser && setVerifyTarget({ mode: 'cash', row: r })} disabled={sameUser}
                            title={sameUser ? T('لا يمكنك التحقق من إيداع أنشأته بنفسك', 'You cannot verify your own deposit') : ''}
                            style={{ ...actBtn(C.ok), opacity: sameUser ? 0.4 : 1, cursor: sameUser ? 'not-allowed' : 'pointer' }}>{T('تحقّق', 'Verify')}</button>
                        )
                      })()}
                      {r.status === 'verified' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: C.ok, fontSize: 11, fontWeight: 700 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          {T('موثّق', 'Verified')}
                        </span>
                      )}
                      {(r.status === 'not_deposited' || r.status === 'refund') && <span style={{ color: 'var(--tx6)' }}>—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && filtered.length > PAGE && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 16 }}>
          <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))} style={{ height: 34, padding: '0 14px', borderRadius: 9, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.06)', color: page === 0 ? 'var(--tx6)' : 'var(--tx2)', fontFamily: F, fontSize: 12, fontWeight: 700, cursor: page === 0 ? 'not-allowed' : 'pointer' }}>{T('السابق', 'Prev')}</button>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx4)' }}>{page + 1} / {pageCount}</span>
          <button disabled={page >= pageCount - 1} onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} style={{ height: 34, padding: '0 14px', borderRadius: 9, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.06)', color: page >= pageCount - 1 ? 'var(--tx6)' : 'var(--tx2)', fontFamily: F, fontSize: 12, fontWeight: 700, cursor: page >= pageCount - 1 ? 'not-allowed' : 'pointer' }}>{T('التالي', 'Next')}</button>
        </div>
      )}

      {cashModal && (
        <CashDepositModal
          T={T} lang={lang} banks={banks} outstanding={outstandingCash}
          onClose={() => setCashModal(false)}
          onSubmit={submitCashDeposit}
          onDone={() => { setCashModal(false); reload(); toast?.(T('تم إنشاء الإيداع النقدي', 'Cash deposit created')) }}
          toast={toast}
        />
      )}
      {verifyTarget && (
        <VerifyModal
          T={T} banks={banks} inputS={inputS} target={verifyTarget} fmtAmt={fmtAmt}
          onClose={() => setVerifyTarget(null)}
          onSubmit={async (payload) => {
            if (verifyTarget.mode === 'bank') { await submitBankVerify({ row: verifyTarget.row, ...payload }); return true }
            return await submitCashVerify({ row: verifyTarget.row, ...payload })
          }}
          onDone={() => { setVerifyTarget(null); reload(); toast?.(T('تم التحقق بنجاح', 'Verified successfully')) }}
          toast={toast}
        />
      )}
    </div>
  )
}

const overlayS = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(6px)', zIndex: 998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, direction: 'rtl' }
const modalS = { background: 'var(--modal-bg, #1c1c1c)', borderRadius: 16, width: 620, maxWidth: '96vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,.55)', border: '1px solid rgba(255,255,255,.07)', fontFamily: F }
const FileField = ({ T, file, setFile }) => (
  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 10, border: `1px dashed ${file ? C.ok : 'rgba(212,160,23,.4)'}`, background: file ? 'rgba(46,204,113,.08)' : 'rgba(212,160,23,.05)', color: file ? C.ok : C.gold, cursor: 'pointer', fontFamily: F, fontSize: 12.5, fontWeight: 700, padding: '0 14px' }}>
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file ? file.name : T('إرفاق ملف (صورة أو PDF)', 'Attach file (image or PDF)')}</span>
    <input type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
  </label>
)

// Multiple deposit-slip images/PDFs for a single deposit operation.
const MultiFileField = ({ T, files, setFiles }) => {
  const addFiles = (list) => {
    const incoming = Array.from(list || [])
    if (incoming.length === 0) return
    setFiles(prev => {
      const key = f => `${f.name}_${f.size}`
      const seen = new Set(prev.map(key))
      return [...prev, ...incoming.filter(f => !seen.has(key(f)))]
    })
  }
  const removeAt = (i) => setFiles(prev => prev.filter((_, idx) => idx !== i))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 10, border: '1px dashed rgba(212,160,23,.4)', background: 'rgba(212,160,23,.05)', color: C.gold, cursor: 'pointer', fontFamily: F, fontSize: 12.5, fontWeight: 700, padding: '0 14px', flexShrink: 0 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
        <span>{files.length > 0 ? T('إضافة صور أخرى', 'Add more images') : T('إرفاق صور الإيداع (يمكن اختيار أكثر من صورة)', 'Attach deposit images (you can select more than one)')}</span>
        <input type="file" accept="image/*,application/pdf" multiple onChange={e => { addFiles(e.target.files); e.target.value = '' }} style={{ display: 'none' }} />
      </label>
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {files.map((f, i) => (
            <div key={`${f.name}_${f.size}_${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 9, border: `1px solid ${C.ok}40`, background: 'rgba(46,204,113,.08)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.ok} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, color: 'var(--tx2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'ltr', textAlign: 'right' }}>{f.name}</span>
              <button type="button" onClick={() => removeAt(i)} aria-label={T('إزالة', 'Remove')} style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 7, border: 'none', background: 'rgba(255,255,255,.06)', color: 'var(--tx3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(192,57,43,.18)'; e.currentTarget.style.color = '#e5867a' }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = 'var(--tx3)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const kLbl = ({ children }) => <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,.6)', marginBottom: 8, textAlign: 'start', fontFamily: F }}>{children}</div>

function CashDepositModal({ T, lang, banks, outstanding, onClose, onSubmit, onDone, toast }) {
  const [step, setStep] = useState(1)
  const [sel, setSel] = useState(() => new Set())
  const [bankAccountId, setBankAccountId] = useState('')
  const [depositDate, setDepositDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [depositedAmount, setDepositedAmount] = useState('')
  const [reason, setReason] = useState('')
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const total = useMemo(() => outstanding.filter(r => sel.has(r.id)).reduce((s, r) => s + r.amount, 0), [outstanding, sel])
  const toggle = (id) => setSel(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allSelected = outstanding.length > 0 && sel.size === outstanding.length
  const toggleAll = () => setSel(allSelected ? new Set() : new Set(outstanding.map(r => r.id)))
  const bankOpts = useMemo(() => banks.map(b => ({ v: b.id, l: b.account_name ? `${b.bank_name} · ${b.account_name}` : b.bank_name, sub: [b.account_number, b.iban].filter(Boolean).join('\n') })), [banks])
  const depNum = parseFloat(depositedAmount)
  const depValid = depositedAmount !== '' && !isNaN(depNum)
  const differs = depValid && Math.abs(depNum - total) > 0.009
  const diffAmount = depValid ? depNum - total : 0
  const goNext = () => {
    if (sel.size === 0) { toast?.(T('اختر دفعة واحدة على الأقل', 'Select at least one payment'), 'error'); return }
    setDepositedAmount(prev => prev === '' ? String(Number(total.toFixed(2))) : prev)
    setStep(2)
  }
  const submit = async () => {
    if (!depValid || depNum <= 0) { toast?.(T('أدخل إجمالي المبلغ المودع', 'Enter the total deposited amount'), 'error'); return }
    if (differs && !reason.trim()) { toast?.(T('وضّح سبب اختلاف المبلغ المودع عن الإجمالي', 'Explain why the deposited amount differs from the total'), 'error'); return }
    if (files.length === 0) { toast?.(T('أرفق صورة واحدة على الأقل لسند الإيداع', 'Attach at least one deposit slip image'), 'error'); return }
    setBusy(true)
    try { await onSubmit({ paymentIds: [...sel], bankAccountId, depositDate, depositedAmount: depNum, reason: differs ? reason.trim() : '', files }); onDone() }
    catch (e) { toast?.(T('تعذّر إنشاء الإيداع: ', 'Failed to create deposit: ') + (e?.message || e), 'error'); setBusy(false) }
  }
  const Lbl = kLbl
  const fieldS = { width: '100%', height: 42, padding: '0 14px', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, fontFamily: F, fontSize: 14, fontWeight: 500, color: 'var(--tx)', outline: 'none', background: 'linear-gradient(180deg,#323232 0%,#262626 100%)', boxSizing: 'border-box', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)' }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, direction: 'rtl' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--modal-bg)', borderRadius: 16, width: 640, maxWidth: '95vw', height: 'min(680px, 92vh)', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.06)', fontFamily: F, position: 'relative', zIndex: 60 }}>
        {/* Header — matches Kafala "تسعيرة تنازل" modal */}
        <div style={{ padding: '20px 24px 16px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <Tag size={22} strokeWidth={1.8} color={C.gold} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--tx)', lineHeight: 1.2 }}>{T('توثيق الإيداع النقدي', 'Record cash deposit')}</div>
            </div>
            <button onClick={onClose} onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(180deg,rgba(192,57,43,.18) 0%,rgba(192,57,43,.08) 100%)'; e.currentTarget.style.borderColor = 'rgba(192,57,43,.4)'; e.currentTarget.style.color = '#e5867a' }} onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(180deg,#323232 0%,#262626 100%)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)'; e.currentTarget.style.color = 'var(--tx3)' }} style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(180deg,#323232 0%,#262626 100%)', border: '1px solid rgba(255,255,255,.07)', color: 'var(--tx3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)', transition: '.2s' }} aria-label={T('إغلاق', 'Close')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
          {/* Two-step progress bar */}
          <div style={{ display: 'flex', gap: 4 }}>
            {[0, 1].map(i => <div key={i} style={{ flex: 1, height: 3, borderRadius: 4, background: i <= step - 1 ? 'linear-gradient(90deg, #D4A017, #F0C040)' : 'rgba(255,255,255,0.06)', transition: '.35s' }} />)}
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {step === 1 ? (<>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.6)', fontWeight: 500, flexShrink: 0 }}>{T('اختر الدفعات النقدية غير المودعة لتجميعها في إيداع واحد:', 'Select undeposited cash payments to batch into one deposit:')}</div>
            {outstanding.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--tx4)', fontSize: 13, border: '1px dashed rgba(255,255,255,.1)', borderRadius: 10 }}>{T('لا توجد دفعات نقدية بانتظار الإيداع', 'No cash payments awaiting deposit')}</div>
            ) : (
              <div style={{ border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, overflow: 'hidden', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <div onClick={toggleAll} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,.03)', borderBottom: '1px solid rgba(255,255,255,.06)', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--tx3)', flexShrink: 0 }}>
                  <input type="checkbox" checked={allSelected} readOnly style={{ accentColor: C.gold, width: 15, height: 15 }} />
                  <span>{T('تحديد الكل', 'Select all')} ({outstanding.length})</span>
                </div>
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  {outstanding.map(r => {
                    const on = sel.has(r.id)
                    return (
                      <div key={r.id} onClick={() => toggle(r.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,.03)', cursor: 'pointer', background: on ? 'rgba(212,160,23,.07)' : 'transparent' }}>
                        <input type="checkbox" checked={on} readOnly style={{ accentColor: C.gold, width: 15, height: 15 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{r.client}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--tx5)', direction: 'ltr', textAlign: 'right' }}>{r.invoiceNo || '—'} · {fmtDate(r.date)}</div>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 800, color: C.ok, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{fmtAmt(r.amount)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>) : (<>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', flexShrink: 0 }}>
              <div style={{ flex: '1 1 240px' }}>
                <Lbl>{T('الحساب البنكي المُودَع فيه', 'Deposited-into bank account')}</Lbl>
                <Sel value={bankAccountId} onChange={setBankAccountId} options={bankOpts} placeholder={T('— اختر —', '— select —')} searchable searchPlaceholder={T('ابحث عن بنك…', 'Search bank…')} maxVisible={5} />
              </div>
              <div style={{ flex: '1 1 240px' }}>
                <Lbl>{T('إجمالي المبلغ المودع', 'Total deposited amount')}</Lbl>
                <input value={depositedAmount} onChange={e => setDepositedAmount(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="0.00" style={{ ...fieldS, direction: 'ltr', fontWeight: 800, fontSize: 16, color: differs ? C.gold : 'var(--tx)' }} />
                <div style={{ fontSize: 11.5, color: 'var(--tx5)', marginTop: 6, textAlign: 'start' }}>{T('إجمالي الدفعات المختارة', 'Selected payments total')}: <span style={{ direction: 'ltr', fontWeight: 700, color: 'var(--tx3)' }}>{fmtAmt(total)}</span></div>
              </div>
            </div>
            {differs && (
              <div style={{ borderRadius: 12, border: `1px solid ${C.gold}59`, background: 'rgba(212,160,23,.05)', padding: '14px 16px', flexShrink: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.gold, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                  {T('المبلغ المودع يختلف عن الإجمالي بمقدار', 'Deposited amount differs from total by')} <span style={{ direction: 'ltr' }}>{diffAmount > 0 ? '+' : '−'}{fmtAmt(Math.abs(diffAmount))}</span>
                </div>
                <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder={T('وضّح سبب الاختلاف…', 'Explain the reason for the difference…')} rows={3} style={{ ...fieldS, height: 'auto', minHeight: 70, padding: '10px 14px', textAlign: 'right', fontWeight: 500, resize: 'vertical', lineHeight: 1.6 }} />
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <Lbl>{T('صور الإيداع النقدي', 'Cash deposit slip images')}</Lbl>
              <MultiFileField T={T} files={files} setFiles={setFiles} />
            </div>
          </>)}
        </div>
        <style>{`.dep-nav-btn{height:40px;padding:0 6px;background:transparent;border:none;color:#D4A017;font-family:${F};font-size:16px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:.2s}.dep-nav-btn .nav-ico{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);display:flex;align-items:center;justify-content:center;transition:.2s;color:#D4A017}.dep-nav-btn:hover:not(:disabled) .nav-ico{background:#D4A017;color:#000}.dep-nav-btn.dir-fwd:hover:not(:disabled) .nav-ico{transform:translateX(4px)}.dep-nav-btn.dir-back:hover:not(:disabled) .nav-ico{transform:translateX(-4px)}.dep-nav-btn.dir-fwd{color:var(--tx3)}.dep-nav-btn.dir-fwd .nav-ico{background:rgba(255,255,255,.06);color:var(--tx3)}.dep-nav-btn.dir-fwd:hover:not(:disabled){color:var(--tx)}.dep-nav-btn.dir-fwd:hover:not(:disabled) .nav-ico{background:rgba(255,255,255,.14);color:var(--tx)}.dep-nav-btn:disabled{opacity:.4;cursor:not-allowed}@keyframes dep-spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, padding: '4px 24px 16px', flexShrink: 0 }}>
          <div style={{ justifySelf: 'start' }}>
            {step === 2 && (
              <button onClick={() => setStep(1)} disabled={busy} className="dep-nav-btn dir-fwd">
                <span className="nav-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg></span>
                <span>{T('السابق', 'Previous')}</span>
              </button>
            )}
          </div>
          <div style={{ justifySelf: 'center' }} />
          <div style={{ justifySelf: 'end' }}>
            {step === 1 ? (
              <button onClick={goNext} disabled={sel.size === 0} className="dep-nav-btn dir-back">
                <span>{T('التالي', 'Next')}</span>
                <span className="nav-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg></span>
              </button>
            ) : (
              <button onClick={submit} disabled={busy} className="dep-nav-btn dir-back">
                <span>{busy ? T('جارٍ الحفظ…', 'Saving…') : T('توثيق الإيداع', 'Create deposit')}</span>
                <span className="nav-ico">{busy ? <span style={{ width: 14, height: 14, border: '2px solid currentColor', borderRightColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'dep-spin .7s linear infinite' }} /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function VerifyModal({ T, banks, inputS, target, fmtAmt, onClose, onSubmit, onDone, toast }) {
  const isBank = target.mode === 'bank'
  const row = target.row
  const [bankAccountId, setBankAccountId] = useState('')
  const [file, setFile] = useState(null)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    if (!file) { toast?.(T('أرفق كشف الحساب البنكي لإثبات الوصول', 'Attach the bank statement as proof'), 'error'); return }
    setBusy(true)
    try { const ok = await onSubmit({ bankAccountId, file, notes }); if (ok) onDone(); else setBusy(false) }
    catch (e) { toast?.(T('تعذّر التحقق: ', 'Verification failed: ') + (e?.message || e), 'error'); setBusy(false) }
  }
  return (
    <div style={overlayS} onClick={onClose}>
      <div style={{ ...modalS, width: 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{isBank ? T('تأكيد وصول الحوالة', 'Confirm transfer arrival') : T('التحقق من الإيداع', 'Verify deposit')}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--tx4)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'rgba(255,255,255,.03)', borderRadius: 10, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{row.client}</div>
              <div style={{ fontSize: 10.5, color: 'var(--tx5)', direction: 'ltr', textAlign: 'right' }}>{row.invoiceNo || '—'}</div>
            </div>
            <span style={{ fontSize: 16, fontWeight: 900, color: C.gold, direction: 'ltr' }}>{fmtAmt(Math.abs(row.amount))}</span>
          </div>
          {!isBank && <div style={{ fontSize: 11.5, color: 'var(--tx4)', lineHeight: 1.6 }}>{T('سيتم توثيق الإيداع بالكامل بعد التحقق من وصول المبلغ إلى حساب المكتب.', 'The whole deposit will be marked verified once arrival in the office account is confirmed.')}</div>}
          <div>
            <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 700, marginBottom: 6 }}>{T('الحساب البنكي للمكتب', 'Office bank account')}</div>
            <select value={bankAccountId} onChange={e => setBankAccountId(e.target.value)} style={{ ...inputS, width: '100%' }}>
              <option value="">{T('— اختر —', '— select —')}</option>
              {banks.map(b => <option key={b.id} value={b.id}>{b.bank_name} — {b.account_name || b.account_number}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 700, marginBottom: 6 }}>{T('كشف الحساب البنكي (إثبات الوصول)', 'Bank statement (proof of arrival)')}</div>
            <FileField T={T} file={file} setFile={setFile} />
          </div>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder={T('ملاحظات (اختياري)', 'Notes (optional)')} style={{ ...inputS, width: '100%', textAlign: 'right' }} />
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,.07)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={submit} disabled={busy} style={{ height: 42, padding: '0 24px', borderRadius: 11, background: C.ok, border: 'none', color: '#0d1f14', fontFamily: F, fontSize: 13.5, fontWeight: 800, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}>{busy ? T('جارٍ الحفظ…', 'Saving…') : T('تأكيد التحقق', 'Confirm verification')}</button>
        </div>
      </div>
    </div>
  )
}
