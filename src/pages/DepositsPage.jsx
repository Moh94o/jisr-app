import React, { useEffect, useMemo, useState } from 'react'
import { Tag, Banknote, CreditCard, Paperclip, Upload, Plus, X, Check, FileText } from 'lucide-react'
import { Sel, DateField } from './KafalaCalculator'
import { Modal as FKModal, ModalSection, SuccessView, ScrollBox, GRID, CurrencyField, TextArea, Select as FKSelect, DateField as FKDateField, TimeField as FKTimeField, EmptyState, C as FK } from '../components/ui/FormKit.jsx'
import BackButton from '../components/BackButton'
import { SkeletonTable, StatStripSkeleton } from '../components/ui/Skeleton.jsx'
import { can as canPerm, cardVisible, canCardBtn } from '../lib/permissions.js'
import { noDash } from '../lib/utils.js'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#D4A017', ok: '#2ecc71', blue: '#5dade2', red: '#e87265', gray: '#95a5a6' }
const PAGE = 50
const fmtAmt = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const fmtInt = (v) => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
// International ISO format YYYY-MM-DD (e.g. 2026-06-03). Read right-to-left in Arabic it is day → month → year, with the day on the right.
// Business "today" boundary — matches the Invoices stats: the day starts at 05:00 Riyadh time.
const riyadhDayStart = () => {
  const now = new Date()
  const ry = new Date(now.getTime() + 3 * 3600 * 1000)
  const Y = ry.getUTCFullYear(), M = ry.getUTCMonth(), D = ry.getUTCDate(), H = ry.getUTCHours()
  const offset = H < 5 ? -1 : 0
  return new Date(Date.UTC(Y, M, D + offset, 2, 0, 0))
}
const fmtDate = (d) => { if (!d) return '—'; const dt = new Date(d); if (isNaN(dt)) return '—'; return dt.toLocaleDateString('en-CA') }
const fmtTime = (d) => { if (!d) return ''; const dt = new Date(d); if (isNaN(dt)) return ''; return dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }
// Precise duration (ms) → compound "days + hours + minutes", floored to the minute. e.g. "2 ساعة و15 دقيقة".
const humanDuration = (ms, T) => {
  if (!(ms >= 0)) return ''
  let totalMin = Math.floor(ms / 60000)
  if (totalMin < 1) return T('أقل من دقيقة', 'less than a minute')
  const days = Math.floor(totalMin / 1440); totalMin -= days * 1440
  const hours = Math.floor(totalMin / 60); const mins = totalMin % 60
  const parts = []
  if (days) parts.push(T(`${days} يوم`, `${days}d`))
  if (hours) parts.push(T(`${hours} ساعة`, `${hours}h`))
  if (mins) parts.push(T(`${mins} دقيقة`, `${mins}m`))
  return parts.join(T(' و ', ' '))
}

// Money the office RECEIVES from clients against invoices (cash or bank transfer).
// Distinct from المدفوعات, which is what the office pays out to execute requests.
export default function DepositsPage({ sb, lang, user, branchId, toast, emptyIcon }) {
  const isAr = lang !== 'en'
  const T = (a, e) => (isAr ? a : e)
  const isGM = user?.role?.name_ar === 'المدير العام' || user?.role?.name_en === 'General Manager'
  const scopeBranchId = isGM ? (branchId || null) : (user?.primary_branch_id || user?.branch_id || null)

  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [tick, setTick] = useState(0) // bump to refetch after a deposit/verify action
  const [banks, setBanks] = useState([])
  const [cards, setCards] = useState([]) // bank cards (linked to accounts) for the deposit selector
  const [cashDeps, setCashDeps] = useState([]) // standalone cash deposits (drawer draws), not payment-linked
  const [cashModal, setCashModal] = useState(false) // add-cash-deposit modal open
  const [detail, setDetail] = useState(null) // row opened in the full detail/verification page

  const [method, setMethod] = useState('') // '' | cash | bank
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('') // '' | new | verified
  const [page, setPage] = useState(0)
  const [advOpen, setAdvOpen] = useState(false)
  // Daily summary cards show today's deposits (business day = 05:00 Riyadh → next 05:00), same as the Invoices stats.
  const todayStart = riyadhDayStart().getTime()
  const todayEnd = todayStart + 24 * 3600 * 1000
  const isTodayDate = (dt) => { const t = dt ? new Date(dt).getTime() : 0; return t >= todayStart && t < todayEnd }

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true); setErr(null)
      let query = sb.from('payments').select(`
        id, amount, payment_date, created_at, bank_reference, receipt_no, is_valid, bank_account_id,
        method:payment_method_id(code,value_ar,value_en),
        bank:bank_account_id(bank_name,account_name,account_number,iban),
        invoice:invoice_id(invoice_no,status:status_id(code)),
        request:service_request_id(client:client_id(name_ar,name_en)),
        deposit_payments(deposit:deposit_id(id,status,kind,deposited_by,verified_by,verified_at,deposited_at,depositor:deposited_by(person:persons!users_person_id_fkey(name_ar,name_en))))
      `).is('deleted_at', null).order('payment_date', { ascending: false, nullsFirst: false }).limit(2000)
      if (scopeBranchId) query = query.eq('branch_id', scopeBranchId)
      const { data, error } = await query
      if (!alive) return
      if (error) { setErr(error.message); setAll([]) } else { setAll(data || []) }
      setLoading(false)
    })()
    return () => { alive = false }
  }, [sb, scopeBranchId, tick])

  // Office bank accounts + their cards for the cash-deposit + verify modals.
  useEffect(() => {
    let alive = true
    ;(async () => {
      let bq = sb.from('bank_accounts').select('id,bank_name,account_name,account_number,iban,branch_id').is('deleted_at', null).eq('is_active', true)
      const { data } = await bq
      if (alive) setBanks(data || [])
      const { data: cardData } = await sb.from('bank_cards').select('id, card_number, holder_name, bank_account_id').is('deleted_at', null).order('created_at', { ascending: true })
      if (alive) setCards(cardData || [])
    })()
    return () => { alive = false }
  }, [sb])

  // Cash deposits are now a CASH-DRAWER model: each deposit is a standalone draw from the
  // office cash pool, NOT tied to specific client payments (cash is fungible). The drawer
  // balance = total cash received − total cash deposited; the remainder simply carries over
  // to the next day. Bank transfers stay per-payment (handled via the payments query above).
  useEffect(() => {
    let alive = true
    ;(async () => {
      let dq = sb.from('deposits').select(`
        id, total_amount, status, deposit_date, deposited_at, deposited_by, verified_at, verified_by, notes,
        depositor:deposited_by(person:persons!users_person_id_fkey(name_ar,name_en)),
        bank:bank_account_id(bank_name,account_name,account_number,iban)
      `).eq('kind', 'cash').is('deleted_at', null).order('deposit_date', { ascending: false, nullsFirst: false }).limit(2000)
      if (scopeBranchId) dq = dq.eq('branch_id', scopeBranchId)
      const { data } = await dq
      if (alive) setCashDeps(data || [])
    })()
    return () => { alive = false }
  }, [sb, scopeBranchId, tick])

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
      depositorName: dep?.depositor?.person ? (isAr ? dep.depositor.person.name_ar : (dep.depositor.person.name_en || dep.depositor.person.name_ar)) : '',
      startAt: dep?.deposited_at || null,
      verifiedAt: dep?.verified_at || null,
      methodLabel: r.method?.value_ar || (kind === 'bank' ? 'حوالة بنكية' : 'نقداً'),
      bankName: r.bank?.bank_name || '',
      bankAccount: r.bank?.account_name || '',
      bankIban: r.bank?.iban || '',
      bankAccountNumber: r.bank?.account_number || '',
      bankAccountId: r.bank_account_id || null,
      invoiceNo: r.invoice?.invoice_no || '',
      invoiceCancelled: r.invoice?.status?.code === 'cancelled',
      client: r.request?.client?.name_ar || r.request?.client?.name_en || '—',
      valid: r.is_valid !== false,
    }
  }), [all])

  // Status label + color per derived key. Deposits surface only two states to the user:
  // "جديد" (anything not yet verified) or "تم التحقق". Internal codes stay distinct for logic/stats.
  const STATUS = {
    transfer_done: { label: T('جديد', 'New'), color: C.blue },
    not_deposited: { label: T('جديد', 'New'), color: C.blue },
    deposited:     { label: T('جديد', 'New'), color: C.blue },
    verified:      { label: T('تم التحقق', 'Verified'), color: C.ok },
    refund:        { label: T('استرجاع', 'Refund'), color: C.red },
  }

  // All valid cash RECEIVED into the office (the pool that feeds the drawer).
  // Net cash into the office drawer: receipts (+) AND refunds (−) both count, so a cash refund reduces the balance.
  const cashReceived = useMemo(
    () => norm.filter(r => r.kind === 'cash' && r.valid && !r.invoiceCancelled),
    [norm]
  )
  // Bank transfers — still tracked per payment.
  const bankRows = useMemo(() => norm
    .filter(r => r.kind === 'bank' && r.amount > 0 && r.valid && !r.invoiceCancelled && !r.isRefund)
    .map(r => ({
      key: 'p_' + r.id, rowType: 'bank', kind: 'bank',
      date: r.date, client: r.client, invoiceNo: r.invoiceNo,
      bankName: r.bankName, bankAccount: r.bankAccount, bankIban: r.bankIban, bankAccountNumber: r.bankAccountNumber, ref: r.ref, amount: r.amount,
      startAt: r.startAt, verifiedAt: r.verifiedAt,
      status: r.status, paymentRow: r,
    })), [norm])
  // Cash deposits — standalone drawer draws, shown as their own rows.
  const cashRows = useMemo(() => cashDeps.map(d => ({
    key: 'd_' + d.id, rowType: 'cash', kind: 'cash',
    date: d.deposit_date || d.deposited_at || d.created_at,
    client: T('إيداع نقدي', 'Cash deposit'), invoiceNo: '',
    bankName: d.bank?.bank_name || '', bankAccount: d.bank?.account_name || '', bankIban: d.bank?.iban || '', bankAccountNumber: d.bank?.account_number || '', ref: '', amount: Number(d.total_amount || 0),
    status: d.status === 'verified' ? 'verified' : 'deposited',
    depositId: d.id, depositedBy: d.deposited_by, depositorName: d.depositor?.person ? (isAr ? d.depositor.person.name_ar : (d.depositor.person.name_en || d.depositor.person.name_ar)) : '', notes: d.notes || '',
    startAt: d.deposited_at || d.deposit_date || d.created_at || null, verifiedAt: d.verified_at || null,
  })), [cashDeps])

  // Cash-drawer summary: received − deposited = balance carried over.
  const drawer = useMemo(() => {
    const isToday = (r) => isTodayDate(r.date)
    const received = cashReceived.reduce((s, r) => s + r.amount, 0)
    const deposited = cashRows.reduce((s, r) => s + r.amount, 0)
    const todayDep = cashRows.filter(isToday)
    const todayVerified = todayDep.filter(r => r.status === 'verified')
    // Carried over = the drawer balance at the start of today (everything before today).
    const receivedBefore = cashReceived.filter(r => !isToday(r)).reduce((s, r) => s + r.amount, 0)
    const depositedBefore = cashRows.filter(r => !isToday(r)).reduce((s, r) => s + r.amount, 0)
    return {
      received, receivedCnt: cashReceived.length,
      deposited, balance: received - deposited,
      carriedOver: receivedBefore - depositedBefore,
      todayDeposited: todayDep.reduce((s, r) => s + r.amount, 0), todayDepCnt: todayDep.length,
      todayVerified: todayVerified.reduce((s, r) => s + r.amount, 0), todayVerifiedCnt: todayVerified.length,
    }
  }, [cashReceived, cashRows, todayStart])

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

  // Record a cash deposit as a standalone draw from the office cash drawer.
  // The amount is whatever was physically deposited; the remainder stays in the drawer
  // (received − deposited) and is available to deposit the next day. Not tied to payments.
  const submitCashDeposit = async ({ bankAccountId, depositDate, depositedAmount, notes, files }) => {
    const total = Number(depositedAmount)
    const { data: dep, error } = await sb.from('deposits').insert({
      branch_id: scopeBranchId || null, kind: 'cash', status: 'deposited', total_amount: total,
      bank_account_id: bankAccountId || null,
      deposit_date: depositDate ? new Date(depositDate).toISOString() : new Date().toISOString(),
      deposited_at: new Date().toISOString(), deposited_by: user?.id || null,
      notes: notes ? notes.trim() : null, created_by: user?.id || null,
    }).select('id').single()
    if (error) throw error
    // Roll back the deposit if a slip upload fails, so a failed attachment never leaves a phantom deposit.
    try {
      for (const f of (files || [])) await uploadAttachment(f, dep.id, 'cash_slip')
    } catch (e) {
      await sb.from('deposits').delete().eq('id', dep.id)
      throw e
    }
  }

  // Insert one or more reference numbers (with per-operation amounts) for a deposit.
  const insertReferences = async (depositId, references) => {
    const rows = (references || [])
      .map(r => ({ reference_number: (r.reference_number || '').trim(), amount: r.amount == null || r.amount === '' ? null : Number(r.amount) }))
      .filter(r => r.reference_number)
      .map(r => ({ deposit_id: depositId, reference_number: r.reference_number, amount: r.amount, created_by: user?.id || null }))
    if (rows.length === 0) return
    const { error } = await sb.from('deposit_references').insert(rows)
    if (error) throw error
  }

  // Confirm a bank transfer arrived: create a verified bank deposit for the single payment,
  // recording the office-statement reference number that proves the transfer landed.
  const submitBankVerify = async ({ row, bankAccountId, files, notes, references }) => {
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
    await insertReferences(dep.id, references)
    for (const f of (files || [])) await uploadAttachment(f, dep.id, 'bank_statement')
  }

  // Verify a cash deposit against the office bank statement — must be a different user than the depositor (GM is exempt).
  // A single cash deposit may have been split into several physical deposit operations, each with its own reference.
  const submitCashVerify = async ({ row, files, notes, references }) => {
    if (!isGM && row.depositedBy && user?.id && row.depositedBy === user.id) {
      toast?.(T('لا يمكنك التحقق من إيداع أنشأته بنفسك — يلزم مستخدم آخر', 'You cannot verify a deposit you created — a different user is required'), 'error')
      return false
    }
    await insertReferences(row.depositId, references)
    for (const f of (files || [])) await uploadAttachment(f, row.depositId, 'bank_statement')
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
    const base = method === 'cash' ? cashRows : method === 'bank' ? bankRows : [...bankRows, ...cashRows]
    return base.filter(r => {
      if (statusFilter === 'verified' && r.status !== 'verified') return false
      if (statusFilter === 'new' && r.status === 'verified') return false
      if (fromT || toT) { const t = r.date ? new Date(r.date).getTime() : 0; if (fromT && t < fromT) return false; if (toT && t > toT) return false }
      if (term) {
        const hay = `${r.client} ${r.invoiceNo} ${r.ref} ${r.bankName} ${r.notes || ''}`.toLowerCase()
        if (!hay.includes(term)) return false
      }
      return true
    }).sort((a, b) => (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0))
  }, [bankRows, cashRows, method, q, from, to, statusFilter])

  // Daily totals for the selected day — drives the summary cards.
  const daily = useMemo(() => {
    let total = 0, cash = 0, bank = 0, cashCnt = 0, bankCnt = 0
    for (const r of norm) {
      if (!r.valid || r.invoiceCancelled) continue // refunds (negative) count too, so they net out
      if (!isTodayDate(r.date)) continue
      total += r.amount
      if (r.kind === 'bank') { bank += r.amount; bankCnt++ } else { cash += r.amount; cashCnt++ }
    }
    return { total, cash, bank, cashCnt, bankCnt, cnt: cashCnt + bankCnt }
  }, [norm, todayStart])

  // Today's bank transfers, split into received-from-invoices vs verified (arrived in the office account).
  const bankStats = useMemo(() => {
    let received = 0, receivedCnt = 0, verified = 0, verifiedCnt = 0
    for (const r of norm) {
      if (r.kind !== 'bank' || !r.valid || r.invoiceCancelled) continue // refunds (negative) count too
      if (!isTodayDate(r.date)) continue
      received += r.amount; receivedCnt++
      if (r.status === 'verified') { verified += r.amount; verifiedCnt++ }
    }
    return { received, receivedCnt, verified, verifiedCnt }
  }, [norm, todayStart])

  useEffect(() => { setPage(0) }, [method, q, from, to])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE))
  const pageRows = filtered.slice(page * PAGE, page * PAGE + PAGE)

  const methodBtn = (val, label) => {
    const active = method === val
    return (
      <button onClick={() => setMethod(val)} style={{ height: 44, padding: '0 16px', borderRadius: 12, background: active ? 'rgba(212,160,23,.12)' : 'rgba(0,0,0,.18)', border: '1px solid ' + (active ? 'rgba(212,160,23,.3)' : 'rgba(255,255,255,.05)'), color: active ? C.gold : 'var(--tx2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F, whiteSpace: 'nowrap', boxSizing: 'border-box' }}>{label}</button>
    )
  }

  // Stat card styled to match the Invoices page cards: gradient surface, colored dot + title, big figure, footer sub-stat.
  const dCard = (label, value, count, color, footLabel, grow = 1) => (
    <div style={{ position: 'relative', flex: `${grow} 1 0%`, minWidth: 200, padding: '18px 22px', borderRadius: 16, background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden', minHeight: 190 }}>
      <div style={{ position: 'absolute', insetInlineStart: -60, top: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}aa` }} />
        <span style={{ fontSize: 24, color: '#fff', fontWeight: 600, letterSpacing: '.2px', fontFamily: F }}>{label}</span>
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 7, justifyContent: 'flex-start', direction: 'ltr' }}>
        <span style={{ fontSize: 42, fontWeight: 800, color, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{fmtInt(value)}</span>
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)' }}>
        <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600, fontFamily: F }}>{footLabel || T('عدد الدفعات', 'Payments')}</span>
        <span style={{ fontSize: 13, color, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
      </div>
    </div>
  )

  // Card split into two stacked stat sections — matches the Invoices page sidebar KPI card design.
  const splitCard = (parts) => {
    // Keep the card at the same 150px height even with 3 rows by compacting padding/fonts.
    const compact = parts.length >= 3
    return (
    <div style={{ position: 'relative', flex: 1, minWidth: 200, minHeight: 190, borderRadius: 16, background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {parts.map((s, i) => (
        <div key={i} style={{ position: 'relative', padding: compact ? '7px 16px' : '12px 16px', flex: 1, minHeight: 0, borderTop: i > 0 ? '1px solid rgba(255,255,255,.06)' : 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: compact ? 3 : 6, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', insetInlineStart: -25, top: '50%', transform: 'translateY(-50%)', width: 70, height: 70, borderRadius: '50%', background: `radial-gradient(circle, ${s.color}10 0%, transparent 70%)`, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 5 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: compact ? 12 : 13, color: '#fff', fontWeight: 600 }}>{s.label}</span>
              <span style={{ fontSize: compact ? 11 : 12, color: 'var(--tx4)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>({s.count})</span>
            </div>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', direction: 'ltr' }}>
            <span style={{ fontSize: compact ? 17 : 20, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-.5px' }}>{fmtInt(s.value)}</span>
          </div>
        </div>
      ))}
    </div>
    )
  }

  const inputS = { height: 40, padding: '0 12px', borderRadius: 10, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.06)', color: 'var(--tx)', fontFamily: F, fontSize: 13, fontWeight: 600, outline: 'none', boxSizing: 'border-box' }
  const actBtn = (clr) => ({ height: 28, padding: '0 12px', borderRadius: 8, background: clr + '14', border: '1px solid ' + clr + '4d', color: clr, fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' })

  // Clicking a row opens the full deposit/transfer verification detail page (mirrors InvoiceDetailPage).
  const initialLoading = loading && filtered.length === 0
  if (detail) return (
    <DepositDetailPage
      sb={sb} lang={lang} T={T} user={user} isGM={isGM} row={detail} banks={banks} cards={cards}
      STATUS={STATUS} fmtAmt={fmtAmt} fmtInt={fmtInt} fmtDate={fmtDate} fmtTime={fmtTime} inputS={inputS} toast={toast}
      onBack={() => { setDetail(null); reload() }}
      onVerify={async (payload) => {
        if (detail.kind === 'bank') { await submitBankVerify({ row: detail.paymentRow, ...payload }); return true }
        return await submitCashVerify({ row: detail, ...payload })
      }}
    />
  )

  return (
    <div style={{ fontFamily: F, direction: 'rtl', paddingTop: 0 }}>
      {/* Header — matches the Invoices page sizing */}
      <div style={{ marginBottom: 22, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px', lineHeight: 1.2 }}>{T('الإيداعات', 'Deposits')}</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>{T('الأموال المستلمة من العملاء مقابل الفواتير — نقداً أو حوالة بنكية', 'Funds received from clients against invoices — cash or bank transfer')}</div>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx4)', marginTop: 6, lineHeight: 1.6, opacity: .8 }}>{T('كرت «الخزنة» رصيد تراكمي دائم، وبقية الكروت يومية تبدأ من الساعة 5:00 فجراً بتوقيت الرياض', '“Cash drawer” is a running all-time balance; the other cards are daily, starting at 5:00 AM Riyadh time')}</div>
        </div>
        {canPerm(user, 'deposits.create') && (
        <button onClick={() => setCashModal(true)} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.12)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }} style={{ height: 42, padding: '0 18px', borderRadius: 11, background: 'transparent', border: '1px dashed rgba(212,160,23,.5)', color: C.gold, fontFamily: F, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', flexShrink: 0, transition: 'background .15s ease, border-color .15s ease' }}>
          {T('إيداع نقدي جديد', 'New cash deposit')}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        )}
      </div>

      {initialLoading ? (<><StatStripSkeleton cols="2.2fr 1.25fr 1.25fr" breakdownRows={4} /><SkeletonTable columns={['16%','16%','20%','20%','14%','14%']} rows={8} /></>) : (<>

      {/* Daily summary — today's deposits. Grid matches the Invoices stats so الخزنة = نقدًا width. */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.25fr 1.25fr', gap: 14, marginBottom: 24, alignItems: 'stretch' }}>
        {dCard(T('الخزنة', 'Cash drawer'), drawer.balance, fmtInt(drawer.carriedOver), C.gold, T('المرحّل من الأيام السابقة', 'Carried over from previous days'), 2)}
        {splitCard([
          { label: T('نقداً - الفواتير', 'Cash - invoices'), value: daily.cash, count: daily.cashCnt, color: C.blue },
          { label: T('نقداً - المودع', 'Cash - deposited'), value: drawer.todayDeposited, count: drawer.todayDepCnt, color: C.gold },
          { label: T('نقداً - مصدّقة', 'Cash - verified'), value: drawer.todayVerified, count: drawer.todayVerifiedCnt, color: C.ok },
        ])}
        {splitCard([
          { label: T('تحويلات بنكية - الفواتير', 'Bank - invoices'), value: bankStats.received, count: bankStats.receivedCnt, color: C.blue },
          { label: T('تحويلات بنكية - مصدّقة', 'Bank - verified'), value: bankStats.verified, count: bankStats.verifiedCnt, color: C.ok },
        ])}
      </div>

      {/* Filter row — matches the Invoices page */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', color: 'var(--tx4)' }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            placeholder={T('ابحث بالعميل أو رقم الفاتورة أو المرجع…', 'Search client, invoice no, reference…')}
            value={q}
            onChange={e => { setQ(e.target.value); setPage(0) }}
            style={{ width: '100%', height: 44, padding: '0 14px 0 38px', borderRadius: 12, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', color: '#fff', fontSize: 13, fontFamily: F, boxSizing: 'border-box' }}
          />
        </div>
        {(() => {
          const hasFilters = !!(from || to || statusFilter)
          const clearAll = () => { setFrom(''); setTo(''); setStatusFilter(''); setPage(0) }
          const active = advOpen || hasFilters
          return (
            <button
              onClick={() => setAdvOpen(o => !o)}
              style={{ height: 44, padding: '0 16px', borderRadius: 12, background: active ? 'rgba(212,160,23,.12)' : 'rgba(0,0,0,.18)', border: '1px solid ' + (active ? 'rgba(212,160,23,.3)' : 'rgba(255,255,255,.05)'), color: active ? C.gold : 'var(--tx2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F, display: 'flex', alignItems: 'center', gap: 8, boxSizing: 'border-box' }}
            >
              {T('تصفية', 'Filter')}
              {hasFilters ? (
                <span
                  role="button"
                  tabIndex={0}
                  title={T('مسح الفلاتر', 'Clear filters')}
                  onClick={e => { e.stopPropagation(); clearAll() }}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); clearAll() } }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.red; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.gold; e.currentTarget.style.color = '#000' }}
                  style={{ background: C.gold, color: '#000', width: 18, height: 18, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '.18s' }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </span>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="14" y2="6" /><line x1="18" y1="6" x2="20" y2="6" /><circle cx="16" cy="6" r="2" /><line x1="4" y1="12" x2="8" y2="12" /><line x1="12" y1="12" x2="20" y2="12" /><circle cx="10" cy="12" r="2" /><line x1="4" y1="18" x2="16" y2="18" /><line x1="20" y1="18" x2="20" y2="18" /><circle cx="18" cy="18" r="2" /></svg>
              )}
            </button>
          )
        })()}
      </div>

      {/* Advanced filter panel — matches Invoices design */}
      {advOpen && (() => {
        const fLbl = { fontSize: 12, fontWeight: 500, color: 'var(--tx3)', paddingInlineStart: 2, marginBottom: 7 }
        return (
          <div style={{ marginBottom: 22, padding: '16px 18px', background: 'var(--modal-bg)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.04)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
              <div>
                <div style={fLbl}>{T('الحالة', 'Status')}</div>
                <Sel value={statusFilter} onChange={v => { setStatusFilter(v); setPage(0) }} placeholder={T('الكل', 'All')} options={[{ v: '', l: T('الكل', 'All') }, { v: 'new', l: T('جديد', 'New') }, { v: 'verified', l: T('تم التحقق', 'Verified') }]} />
              </div>
              <div>
                <div style={fLbl}>{T('تاريخ من', 'Date From')}</div>
                <DateField value={from} onChange={v => { setFrom(v); setPage(0) }} lang={lang} />
              </div>
              <div>
                <div style={fLbl}>{T('تاريخ إلى', 'Date To')}</div>
                <DateField value={to} onChange={v => { setTo(v); setPage(0) }} lang={lang} />
              </div>
            </div>
          </div>
        )
      })()}

      {/* Table */}
      {err ? (
        <div style={{ padding: 24, textAlign: 'center', color: C.red, fontSize: 13, fontWeight: 600, border: '1px dashed rgba(232,114,101,.3)', borderRadius: 12 }}>{T('تعذّر تحميل الإيداعات', 'Failed to load deposits')}: {err}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={T('لا توجد إيداعات مطابقة', 'No matching deposits')}
          desc={T('جرّب تعديل الفلاتر أو البحث', 'Try adjusting the filters or search')}
        />
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
                <th>{T('الطريقة', 'Method')}</th>
                <th>{T('التاريخ', 'Date')}</th>
                <th>{T('الفاتورة', 'Invoice')}</th>
                <th>{T('البنك', 'Bank')}</th>
                <th>{T('المبلغ', 'Amount')}</th>
                <th>{T('الحالة', 'Status')}</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(r => {
                const isBank = r.kind === 'bank'
                const st = STATUS[r.status] || STATUS.deposited
                return (
                  <tr key={r.key} onClick={() => setDetail(r)} style={{ cursor: 'pointer' }}>
                    <td>
                      <span style={{ color: C.gold, fontWeight: 700, fontSize: 12.5 }}>{isBank ? T('حوالة بنكية', 'Bank') : T('نقداً', 'Cash')}</span>
                    </td>
                    <td><div style={{ direction: 'ltr' }}>{fmtDate(r.date)}</div><div style={{ fontSize: 10, color: 'var(--tx5)', direction: 'ltr' }}>{fmtTime(r.date)}</div></td>
                    <td>
                      {r.invoiceNo
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, direction: 'ltr' }}>
                            <span style={{ fontSize: 11.5, color: 'var(--tx2)', fontWeight: 700, fontFamily: 'monospace' }}>{noDash(r.invoiceNo)}</span>
                            <CopyBtn text={noDash(r.invoiceNo)} />
                          </span>
                        : <span style={{ color: 'var(--tx5)' }}>—</span>}
                    </td>
                    <td>
                      {r.bankName
                        ? <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={{ fontSize: 11.5, color: 'var(--tx2)', fontWeight: 700 }}>{r.bankName}</span>
                            {r.bankIban && <span style={{ fontSize: 10.5, color: 'var(--tx5)', direction: 'ltr', fontFamily: 'monospace' }}>{r.bankIban}</span>}
                          </div>
                        : <span style={{ color: 'var(--tx5)' }}>—</span>}
                    </td>
                    <td style={{ fontWeight: 900, direction: 'ltr', color: '#fff' }}>{fmtAmt(Math.abs(r.amount))}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <span className="dep-pill" style={{ color: st.color, background: st.color + '18', border: '1px solid ' + st.color + '38' }}>
                          <span className="dep-dot" style={{ background: st.color }} />
                          {st.label}
                        </span>
                        {(() => {
                          const ms = r.status === 'verified'
                            ? ((r.startAt && r.verifiedAt) ? new Date(r.verifiedAt) - new Date(r.startAt) : null)
                            : ((r.startAt || r.date) ? Date.now() - new Date(r.startAt || r.date) : null)
                          if (ms == null) return null
                          const d = humanDuration(ms, T)
                          return d ? <span style={{ fontSize: 10, color: 'var(--tx5)' }}>{d}</span> : null
                        })()}
                      </div>
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

      </>)}

      {cashModal && (
        <CashDepositModal
          T={T} lang={lang} banks={banks} cards={cards} balance={drawer.balance} fmtAmt={fmtAmt}
          onClose={() => setCashModal(false)}
          onSubmit={submitCashDeposit}
          onDone={() => { setCashModal(false); reload() }}
          toast={toast}
        />
      )}
    </div>
  )
}

// Multiple deposit-slip images/PDFs for a single deposit operation. FormKit's FileField is
// single-file, so this stays — but styled to mirror FileField exactly: dashed gold drop area
// with drag & drop, C tokens, and green 42px file chips with a remove button.
const MultiFileField = ({ T, files, setFiles, label, addLabel, listMaxHeight = 120, fill = false }) => {
  const [drag, setDrag] = useState(false)
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
  const fmtSize = b => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB'
  const empty = files.length === 0
  const dragProps = {
    onDragEnter: e => { e.preventDefault(); e.stopPropagation(); setDrag(true) },
    onDragOver: e => { e.preventDefault(); e.stopPropagation(); if (!drag) setDrag(true) },
    onDragLeave: e => { e.preventDefault(); e.stopPropagation(); if (e.currentTarget.contains(e.relatedTarget)) return; setDrag(false) },
    onDrop: e => { e.preventDefault(); e.stopPropagation(); setDrag(false); addFiles(e.dataTransfer.files) },
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...(fill ? { flex: 1, minHeight: 0 } : {}) }}>
      <label {...dragProps}
        style={{ display: 'flex', flexDirection: empty ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: empty ? 96 : 42, ...(fill && empty ? { flex: 1, minHeight: 0 } : {}), padding: empty ? 16 : '0 14px', borderRadius: 10, border: `1.5px dashed ${drag ? FK.gold : FK.gold + '59'}`, background: drag ? FK.gold + '1a' : FK.inputBg, cursor: 'pointer', transition: '.18s', fontFamily: F, boxSizing: 'border-box', transform: drag ? 'scale(1.01)' : 'scale(1)' }}>
        {empty ? (<>
          <Upload size={22} color={FK.gold} strokeWidth={2} />
          <div style={{ fontSize: 13, fontWeight: 600, color: FK.tx2 }}>{drag ? T('أفلت الملفات هنا', 'Drop the files here') : (label || T('اسحب الصور هنا أو اضغط للإرفاق', 'Drag images here or click to attach'))}</div>
          <div style={{ fontSize: 11, fontWeight: 500, color: FK.tx4 }}>{T('صور أو PDF — يمكن اختيار أكثر من ملف', 'Images or PDF — multiple files allowed')}</div>
        </>) : (<>
          <span style={{ fontSize: 13, fontWeight: 600, color: FK.gold }}>{addLabel || T('إضافة صور أخرى', 'Add more images')}</span>
          <Plus size={15} color={FK.gold} strokeWidth={2.2} />
        </>)}
        <input type="file" accept="image/*,application/pdf" multiple onChange={e => { addFiles(e.target.files); e.target.value = '' }} style={{ display: 'none' }} />
      </label>
      {!empty && (
        <ScrollBox fill={fill} maxHeight={listMaxHeight} style={{ paddingInlineEnd: 12, marginTop: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
            {files.map((f, i) => (
              <div key={`${f.name}_${f.size}_${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', height: 42, borderRadius: 9, border: `1px solid ${FK.ok}40`, background: `${FK.ok}0d`, minWidth: 0, boxSizing: 'border-box' }}>
                <Paperclip size={14} color={FK.ok} strokeWidth={2} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: FK.tx, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'ltr', textAlign: 'right' }}>{f.name}</div>
                  <div style={{ fontSize: 10, fontWeight: 500, color: FK.tx4 }}>{fmtSize(f.size)}</div>
                </div>
                <button type="button" onClick={() => removeAt(i)} aria-label={T('إزالة', 'Remove')} style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 7, border: 'none', background: 'rgba(192,57,43,.15)', color: FK.red, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                  <X size={12} strokeWidth={2.4} />
                </button>
              </div>
            ))}
          </div>
        </ScrollBox>
      )}
    </div>
  )
}

function CashDepositModal({ T, lang, banks, cards = [], balance, fmtAmt, onClose, onSubmit, onDone, toast }) {
  const safeBalance = Math.max(0, Number(balance) || 0)
  const [cardId, setCardId] = useState('')
  const [depositDate, setDepositDate] = useState('')
  const [depositTime, setDepositTime] = useState('')
  const [depositedAmount, setDepositedAmount] = useState('')
  const [notes] = useState('')
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)
  const [addErr, setAddErr] = useState(null)
  // The deposit destination is chosen by CARD; each option stacks bank name / holder / prominent full card number.
  const cardOpts = useMemo(() => cards.map(cd => {
    const acc = banks.find(b => b.id === cd.bank_account_id)
    return { id: cd.id, bank: acc?.bank_name || T('بطاقة', 'Card'), holder: cd.holder_name || '—', number: cd.card_number || '—' }
  }), [cards, banks])
  const depNum = parseFloat(depositedAmount)
  const depValid = depositedAmount !== '' && !isNaN(depNum) && depNum > 0
  const exceeds = depValid && depNum - safeBalance > 0.009
  const remaining = depValid ? Math.max(0, safeBalance - depNum) : safeBalance
  // All fields are mandatory.
  const step1Valid = depValid && !exceeds && !!depositDate && !!depositTime
  const step2Valid = !!cardId && files.length > 0
  const submit = async () => {
    setAddErr(null)
    if (!step1Valid) { setAddErr(T('أكمل بيانات المبلغ والتاريخ والوقت', 'Complete the amount, date and time')); return }
    if (!cardId) { setAddErr(T('اختر البطاقة البنكية المُودَع بها', 'Select the deposited-with bank card')); return }
    if (files.length === 0) { setAddErr(T('أرفق صورة واحدة على الأقل لسند الإيداع', 'Attach at least one deposit slip image')); return }
    setBusy(true)
    const bankAccountId = cards.find(cd => cd.id === cardId)?.bank_account_id || null
    try { await onSubmit({ bankAccountId, depositDate: `${depositDate}T${depositTime || '00:00'}`, depositedAmount: depNum, notes: notes.trim(), files }); setSuccess(true); setTimeout(() => onDone(), 1400) }
    catch (e) { setAddErr(T('تعذّر إنشاء الإيداع: ', 'Failed to create deposit: ') + (e?.message || e)); setBusy(false) }
  }
  return (
    <FKModal open onClose={success ? onDone : () => { setAddErr(null); onClose() }} variant="create" width={560}
      title={T('توثيق الإيداع النقدي', 'Record cash deposit')} Icon={Tag}
      onSubmit={submit} submitting={busy} submitLabel={T('إضافة', 'Add')} submitIcon={Plus}
      nextLabel={T('التالي', 'Next')} backLabel={T('السابق', 'Previous')}
      success={success ? <SuccessView title={T('تم توثيق الإيداع', 'Deposit recorded')} /> : null}
      pages={[
        { valid: step1Valid, content: (<>
          <div style={{ textAlign: 'center', padding: '14px 14px 12px', borderBottom: `2px solid ${FK.gold}`, marginTop: 12, background: 'rgba(255,255,255,.02)', borderRadius: '10px 10px 0 0' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.5px', marginBottom: 6 }}>{T('المتوفر بالخزنة (غير مودع)', 'Cash on hand (undeposited)')}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8, direction: 'ltr' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(212,160,23,.6)' }}>{T('ريال', 'SAR')}</span>
              <span style={{ fontSize: 32, fontWeight: 600, color: FK.gold }}>{fmtInt(safeBalance)}</span>
            </div>
          </div>
          <ModalSection Icon={Banknote} label={T('بيانات الإيداع', 'Deposit details')}>
            <div style={GRID}>
              <CurrencyField full req label={T('المبلغ المودع', 'Amount deposited')}
                value={depositedAmount} onChange={setDepositedAmount}
                error={exceeds ? T('المبلغ أكبر من المتوفر بالخزنة', 'Amount exceeds cash on hand') : undefined}
                hint={exceeds ? undefined : `${T('سيتبقى بالخزنة', 'Will remain in the drawer')}: ${fmtAmt(remaining)}`} />
              <FKDateField req label={T('تاريخ الإيداع', 'Deposit date')} value={depositDate} onChange={setDepositDate} />
              <FKTimeField req minuteStep={1} label={T('وقت الإيداع', 'Deposit time')} value={depositTime} onChange={setDepositTime} />
            </div>
          </ModalSection>
          </>) },
        { valid: step2Valid, error: addErr, content: (<>
          <ModalSection Icon={CreditCard} label={T('البطاقة البنكية', 'Bank card')}>
            <FKSelect full req label={T('البطاقة البنكية المُودَع بها', 'Deposited-with bank card')}
              value={cardId} onChange={v => { setAddErr(null); setCardId(v) }} options={cardOpts}
              getKey={o => o.id} getLabel={o => o.bank} getSub={o => `${o.holder} ${o.number}`}
              placeholder={cardOpts.length ? T('— اختر البطاقة —', '— select card —') : T('لا توجد بطاقات', 'No cards')}
              renderSelected={o => <span style={{ direction: 'ltr', letterSpacing: '.5px' }}>{o.number}</span>}
              renderCell={(o, sel) => (
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: sel ? FK.gold : FK.tx }}>{o.bank}</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: FK.tx3 }}>{o.holder}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: sel ? FK.gold : '#fff', letterSpacing: '.5px', direction: 'ltr' }}>{o.number}</span>
                </span>
              )} />
          </ModalSection>
          <ModalSection flex Icon={Paperclip} label={T('صور الإيداع النقدي', 'Cash deposit slip images')} hint={T('صورة واحدة على الأقل', 'at least one image')}>
            <MultiFileField T={T} files={files} setFiles={(...a) => { setAddErr(null); setFiles(...a) }} fill />
          </ModalSection>
          </>) },
      ]}
    />
  )
}

// ── Deposit / bank-transfer verification detail page ──────────────────────────
// Opened by clicking a row. Mirrors the Invoice detail page: a two-column layout
// with transaction info on the left and a verification card on the right. The
// employee picks the office bank account and enters the reference number(s) that
// prove the operation actually landed — one for a bank transfer, possibly several
// (each with its own amount) for a cash deposit that was split into multiple draws.
const depCardChrome = { background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, overflow: 'hidden' }
const depCardHeader = { padding: '14px 22px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 10 }
const depCardTitle = { fontSize: 16, fontWeight: 600, color: '#fff', letterSpacing: '.2px' }

const CopyBtn = ({ text }) => {
  const [done, setDone] = useState(false)
  if (text == null || text === '') return null
  return (
    <button
      title="نسخ"
      onClick={e => { e.stopPropagation(); try { navigator.clipboard?.writeText(String(text)); setDone(true); setTimeout(() => setDone(false), 1200) } catch {} }}
      style={{ width: 18, height: 18, padding: 0, borderRadius: 4, background: 'transparent', border: 'none', color: done ? C.ok : 'var(--tx4)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: '.18s', flexShrink: 0 }}
      onMouseEnter={e => { if (!done) e.currentTarget.style.color = C.gold }}
      onMouseLeave={e => { if (!done) e.currentTarget.style.color = 'var(--tx4)' }}
    >
      {done
        ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
    </button>
  )
}

// Matches the invoice Client card row: label (12, tx3) on one side, value (13, tx2) — with optional copy + monospace for IDs/numbers.
const InfoRow = ({ label, value, children, mono, color, copy }) => {
  const val = value != null ? value : children
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '6px 0', minHeight: 28 }}>
      <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600 }}>{label}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, direction: mono ? 'ltr' : undefined }}>
        <span style={{ fontSize: 13, color: color || 'var(--tx2)', fontVariantNumeric: mono ? 'tabular-nums' : undefined, fontFamily: mono ? 'monospace' : F, fontWeight: 600, wordBreak: 'break-word' }}>{val || '—'}</span>
        {copy && val ? <CopyBtn text={val} /> : null}
      </span>
    </div>
  )
}

// "Operation details" card — hero amount on top, status under it, compact rows below.
const OperationCard = ({ T, isBank, st, verifyDuration, depositorName, row, total, fmtAmt, fmtDate, fmtTime }) => {
  // Bank/account fields — grouped inside the same highlighted box as the depositor.
  const bankFields = [
    row.bankName ? { label: T('اسم البنك', 'Bank name'), value: row.bankName } : null,
    row.bankAccount ? { label: T('اسم الحساب', 'Account name'), value: row.bankAccount } : null,
    row.bankIban ? { label: T('رقم الآيبان', 'IBAN'), value: row.bankIban, mono: true, copy: true } : null,
    row.bankAccountNumber ? { label: T('رقم الحساب', 'Account number'), value: row.bankAccountNumber, mono: true, copy: true } : null,
  ].filter(Boolean)
  const fields = [
    (!isBank && row.notes) ? { label: T('ملاحظات', 'Notes'), value: row.notes } : null,
  ].filter(Boolean)
  const depositorVal = depositorName || T('غير معروف', 'Unknown')
  // Highlighted block: a bank transfer shows the invoice number + client reference (no depositor); a cash deposit shows who deposited it.
  const hiField = (label, value) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontSize: 10.5, color: 'var(--tx2)', fontWeight: 600 }}>{label}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, direction: 'ltr', alignSelf: 'flex-end' }}>
        <span style={{ fontSize: 13.5, color: value ? '#fff' : 'var(--tx4)', fontWeight: 700, fontFamily: 'monospace' }}>{value || '—'}</span>
        {value ? <CopyBtn text={value} /> : null}
      </span>
    </div>
  )
  return (
    <div style={depCardChrome}>
      <div style={{ ...depCardHeader, justifyContent: 'space-between' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: isBank ? C.blue : C.ok }} /><span style={depCardTitle}>{isBank ? T('الحوالة البنكية', 'Bank transfer') : T('الإيداع النقدي', 'Cash deposit')}</span></span>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--tx4)', direction: 'ltr', fontFamily: 'monospace' }}>{fmtDate(row.date)} · {fmtTime(row.date)}</span>
      </div>
      <div style={{ padding: '8px 22px 14px' }}>
        {/* Hero amount + status */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 0 16px', borderBottom: '1px solid rgba(255,255,255,.06)', marginBottom: 8 }}>
          <span style={{ fontSize: 34, fontWeight: 900, color: C.gold, direction: 'ltr', lineHeight: 1 }}>{fmtAmt(total)}</span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: st.color + '1f', border: '1px solid ' + st.color + '55' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.color }} />
              <span style={{ fontSize: 12.5, color: st.color, fontWeight: 700 }}>{st.label}</span>
            </span>
          </div>
        </div>
        {/* Highlighted block — bank: invoice + client ref; cash: depositor name. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: isBank ? 9 : 1, padding: '10px 12px', background: 'rgba(255,255,255,.04)', borderRadius: 10, marginBottom: 2 }}>
          {isBank ? (
            hiField(T('رقم الفاتورة', 'Invoice number'), noDash(row.invoiceNo))
          ) : (
            <>
              <span style={{ fontSize: 10.5, color: 'var(--tx2)', fontWeight: 600 }}>{T('اسم المودع', 'Deposited by')}</span>
              <span style={{ fontSize: 13.5, color: depositorName ? '#fff' : 'var(--tx4)', fontWeight: 700, textAlign: 'left' }}>{depositorVal}</span>
            </>
          )}
        </div>
        {/* Bank/account details — same highlighted card style as the depositor block. */}
        {bankFields.length > 0 && (
          <div style={{ padding: '4px 12px', background: 'rgba(255,255,255,.04)', borderRadius: 10, marginTop: 8 }}>
            {bankFields.map((f, i) => <InfoRow key={i} label={f.label} value={f.value} mono={f.mono} copy={f.copy} />)}
          </div>
        )}
        {fields.map((f, i) => <InfoRow key={i} label={f.label} value={f.value} mono={f.mono} copy={f.copy} />)}
      </div>
    </div>
  )
}

function DepositDetailPage({ sb, lang, T, user, isGM, row, banks, STATUS, fmtAmt, fmtInt, fmtDate, fmtTime, inputS, toast, onBack, onVerify }) {
  const isBank = row.kind === 'bank'
  const depositId = isBank ? (row.paymentRow?.depositId || null) : (row.depositId || null)
  // Bank transfers carry their proof on the payment itself (entity_type='payment'), since a
  // deposit record only exists once verified. Cash slips live on the deposit.
  const paymentId = isBank ? (row.paymentRow?.id || null) : null
  const depositedBy = isBank ? (row.paymentRow?.depositedBy || null) : (row.depositedBy || null)
  // Match the invoice "Created by" format: first two names only.
  const depositorRaw = isBank ? (row.paymentRow?.depositorName || '') : (row.depositorName || '')
  const depositorName = depositorRaw.trim().split(/\s+/).filter(Boolean).slice(0, 2).join(' ')
  const isVerified = row.status === 'verified'
  const total = Math.abs(Number(row.amount || 0))
  const st = STATUS[row.status] || STATUS.deposited
  const sameUser = !isGM && depositedBy && user?.id && depositedBy === user.id

  // Time from when the operation was created (status "جديد") until it was verified — shown in minutes + seconds.
  const startAt = isBank ? (row.paymentRow?.startAt || null) : (row.startAt || null)
  const verifiedAt = isBank ? (row.paymentRow?.verifiedAt || null) : (row.verifiedAt || null)
  const verifyDuration = (isVerified && startAt && verifiedAt) ? humanDuration(new Date(verifiedAt) - new Date(startAt), T) : null

  // Existing references + attachments (for already-verified deposits, shown read-only).
  const [refs, setRefs] = useState([])
  const [atts, setAtts] = useState([])
  // Free-form notes attached to the deposit — multiple allowed, each authored + timestamped.
  const [dnotes, setDnotes] = useState([])
  const reloadNotes = async () => {
    if (!depositId) { setDnotes([]); return }
    const { data } = await sb.from('deposit_notes')
      .select('id,note,created_at,created_by,author:created_by(person:persons!users_person_id_fkey(name_ar,name_en))')
      .eq('deposit_id', depositId).is('deleted_at', null).order('created_at', { ascending: true })
    setDnotes(data || [])
  }
  useEffect(() => {
    if (!depositId && !paymentId) { setRefs([]); setAtts([]); setDnotes([]); return }
    let alive = true
    ;(async () => {
      const [rRes, adRes, paRes, ndRes] = await Promise.all([
        depositId ? sb.from('deposit_references').select('id,reference_number,amount,created_at').eq('deposit_id', depositId).order('created_at', { ascending: true }) : Promise.resolve({ data: [] }),
        depositId ? sb.from('attachments').select('id,file_name,file_url,notes').eq('entity_type', 'deposit').eq('entity_id', depositId).is('deleted_at', null) : Promise.resolve({ data: [] }),
        paymentId ? sb.from('attachments').select('id,file_name,file_url,notes').eq('entity_type', 'payment').eq('entity_id', paymentId).is('deleted_at', null) : Promise.resolve({ data: [] }),
        depositId ? sb.from('deposit_notes').select('id,note,created_at,created_by,author:created_by(person:persons!users_person_id_fkey(name_ar,name_en))').eq('deposit_id', depositId).is('deleted_at', null).order('created_at', { ascending: true }) : Promise.resolve({ data: [] }),
      ])
      if (!alive) return
      setRefs(rRes.data || []); setAtts([...(adRes.data || []), ...(paRes.data || [])]); setDnotes(ndRes.data || [])
    })()
    return () => { alive = false }
  }, [sb, depositId, paymentId])

  // The office bank account is known from the operation itself — shown as data, not entered.
  const bankAccountId = isBank ? (row.paymentRow?.bankAccountId || null) : null
  // Verification form state.
  const [vFiles, setVFiles] = useState([])
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  // Cash: dynamic reference lines (reference_number + amount). Bank: a single reference number.
  const [lines, setLines] = useState(isBank ? [{ reference_number: '' }] : [{ reference_number: '', amount: String(Number(total.toFixed(2))) }])

  const setLine = (i, key, val) => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [key]: val } : l))
  // Amount entry — clamp each line so the running total never exceeds the deposit amount.
  const setAmount = (i, raw) => {
    const cleaned = raw.replace(/[^\d.]/g, '')
    setLines(prev => {
      const num = parseFloat(cleaned)
      if (cleaned === '' || isNaN(num)) return prev.map((l, idx) => idx === i ? { ...l, amount: cleaned } : l)
      const others = prev.reduce((s, l, idx) => idx === i ? s : s + (parseFloat(l.amount) || 0), 0)
      const max = Math.max(0, total - others)
      const val = num > max ? String(Number(max.toFixed(2))) : cleaned
      return prev.map((l, idx) => idx === i ? { ...l, amount: val } : l)
    })
  }
  const addLine = () => setLines(prev => [...prev, { reference_number: '', amount: '' }])
  const removeLine = (i) => setLines(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev)

  const sumAmounts = lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0)
  const remaining = total - sumAmounts
  const amountsMatch = isBank ? true : Math.abs(remaining) < 0.01
  const allRefsFilled = lines.every(l => (l.reference_number || '').trim())
  const canSubmit = !busy && !sameUser && allRefsFilled && vFiles.length > 0 && (isBank || amountsMatch)

  const submit = async () => {
    setConfirmErr(null)
    if (sameUser) { setConfirmErr(T('لا يمكنك التحقق من إيداع أنشأته بنفسك — يلزم مستخدم آخر', 'You cannot verify a deposit you created — a different user is required')); return false }
    if (!allRefsFilled) { setConfirmErr(T('أدخل الرقم المرجعي', 'Enter the reference number')); return false }
    if (vFiles.length === 0) { setConfirmErr(T('أرفق ملفات عمليات الإيداع من البنك', 'Attach the bank deposit files')); return false }
    if (!isBank && !amountsMatch) { setConfirmErr(T('مجموع مبالغ العمليات يجب أن يساوي إجمالي الإيداع', 'Sum of operation amounts must equal the deposit total')); return false }
    const references = isBank
      ? [{ reference_number: lines[0].reference_number, amount: total }]
      : lines.map(l => ({ reference_number: l.reference_number, amount: l.amount }))
    setBusy(true)
    try {
      const ok = await onVerify({ bankAccountId: bankAccountId || null, files: vFiles, notes, references })
      if (ok) { toast?.(T('تم التحقق بنجاح', 'Verified successfully')); onBack(); return true } else { setBusy(false); return false }
    } catch (e) { setConfirmErr(T('تعذّر التحقق: ', 'Verification failed: ') + (e?.message || e)); setBusy(false); return false }
  }

  // Notes card: add / remove free-form notes against this deposit.
  const [noteText, setNoteText] = useState('')
  const [noteBusy, setNoteBusy] = useState(false)
  const addNote = async () => {
    const text = noteText.trim()
    if (!text || !depositId) return false
    setNoteErr(null)
    setNoteBusy(true)
    try {
      const { error } = await sb.from('deposit_notes').insert({ deposit_id: depositId, note: text, created_by: user?.id || null })
      if (error) throw error
      setNoteText(''); await reloadNotes(); return true
    } catch (e) { setNoteErr(T('تعذّر إضافة الملاحظة: ', 'Failed to add note: ') + (e?.message || e)); return false }
    finally { setNoteBusy(false) }
  }
  const deleteNote = async (id) => {
    try {
      const { error } = await sb.from('deposit_notes').update({ deleted_at: new Date().toISOString(), deleted_by: user?.id || null }).eq('id', id)
      if (error) throw error
      await reloadNotes()
    } catch (e) { toast?.(T('تعذّر حذف الملاحظة: ', 'Failed to delete note: ') + (e?.message || e), 'error') }
  }

  const lineInput = { ...inputS, width: '100%' }

  // نمط رواتب سبلاير: أزرار الإجراء كأقراص في ترويسة كرت «الإجراء»، والإضافات عبر نوافذ منبثقة.
  const [noteModal, setNoteModal] = useState(false)
  const [confirmModal, setConfirmModal] = useState(false)
  const [dataModal, setDataModal] = useState(false)
  const [confirmErr, setConfirmErr] = useState(null)
  const [noteErr, setNoteErr] = useState(null)
  // معاينة بطاقة «بيانات التحقق» — تُعرض ملخّصاً للمدخل، والإدخال يتم داخل النافذة المنبثقة.
  const filledRefs = lines.filter(l => (l.reference_number || '').trim())
  const hasVData = filledRefs.length > 0 || vFiles.length > 0
  const pill = (clr, disabled) => ({ flexShrink: 0, height: 34, padding: '0 14px', borderRadius: 9, background: 'transparent', border: '1px dashed ' + clr + '80', color: clr, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: 7, transition: '.15s' })

  return (
    <div style={{ fontFamily: F, direction: 'rtl', paddingTop: 0, paddingBottom: 60, color: 'var(--tx2)' }}>
      {/* Back */}
      <div style={{ display: 'flex', marginBottom: 16 }}>
        <BackButton onBack={onBack} label={T('رجوع', 'Back')} />
      </div>

      {/* Title + status — matches the Clients detail header */}
      <div style={{ marginBottom: 18, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            {isBank ? <><path d="M3 21h18M4 21V10M20 21V10M12 21V10M3 10l9-6 9 6" /></> : <><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></>}
          </svg>
          <div style={{ fontSize: 22, fontWeight: 600, color: C.gold, letterSpacing: '-.2px' }}>{isBank ? T('توثيق التحويل البنكي', 'Bank transfer verification') : T('توثيق الإيداع النقدي', 'Cash deposit verification')}</div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 10, lineHeight: 1.6 }}>{isBank ? T('مراجعة التحويل البنكي والتحقق من المبالغ والمرفقات', 'Review the bank transfer and verify amounts and attachments') : T('مراجعة الإيداع النقدي والتحقق من المبالغ والمرفقات', 'Review the cash deposit and verify amounts and attachments')}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, alignItems: 'flex-start' }}>
        {/* Left column (order 2): transaction info + attachments — 340px, matches invoice financial summary */}
        <div style={{ order: 2, position: 'sticky', top: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {cardVisible(user, 'deposits', 'operation_details') && (
          <OperationCard T={T} isBank={isBank} st={st} verifyDuration={verifyDuration} depositorName={depositorName} row={row} total={total} fmtAmt={fmtAmt} fmtDate={fmtDate} fmtTime={fmtTime} />
          )}

          {cardVisible(user, 'deposits', 'attachments') && atts.length > 0 && (() => {
            // Verification files are tagged 'bank_statement'; everything else (cash_slip / legacy) belongs to the deposit operation.
            const verifyAtts = atts.filter(a => a.notes === 'bank_statement')
            const depositAtts = atts.filter(a => a.notes !== 'bank_statement')
            const renderLink = a => (
              <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: C.blue, textDecoration: 'none', wordBreak: 'break-all' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                {a.file_name || T('مرفق', 'Attachment')}
              </a>
            )
            const group = (label, items) => items.length === 0 ? null : (
              <div>
                <div style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 600, marginBottom: 8 }}>{label}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{items.map(renderLink)}</div>
              </div>
            )
            return (
              <div style={depCardChrome}>
                <div style={depCardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} /><span style={depCardTitle}>{T('المرفقات', 'Attachments')}</span></div>
                <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {group(isBank ? T('مرفقات الحوالة البنكية', 'Bank transfer attachments') : T('مرفقات الإيداع', 'Deposit attachments'), depositAtts)}
                  {depositAtts.length > 0 && verifyAtts.length > 0 && <div style={{ height: 1, background: 'rgba(255,255,255,.06)' }} />}
                  {group(T('مرفقات التحقق', 'Verification attachments'), verifyAtts)}
                </div>
              </div>
            )
          })()}
        </div>

        {/* Right column (order 1): verification card — wide (1fr) */}
        <div style={{ order: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Card 1 — بيانات التحقق: الأرقام المرجعية + مرفقات الإيداع */}
          {cardVisible(user, 'deposits', 'verification_details') && (
          <div style={depCardChrome}>
            <div style={{ ...depCardHeader, gap: 10, flexWrap: 'wrap' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: isVerified ? C.ok : C.gold }} />
              <span style={depCardTitle}>{T('بيانات التحقق', 'Verification details')}</span>
              {!isVerified && canCardBtn(user, 'deposits', 'verification_details', 'edit') && (
                <button onClick={() => setDataModal(true)} style={{ ...pill(C.gold), marginInlineStart: 'auto' }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.gold + '1f' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                  <span>{hasVData ? T('تعديل البيانات', 'Edit data') : T('تعبئة البيانات', 'Fill data')}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                </button>
              )}
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {isVerified ? (
                <>
                  <div style={{ fontSize: 12, color: 'var(--tx4)', lineHeight: 1.6 }}>{isBank ? T('الأرقام المرجعية المسجّلة لعملية التحويل البنكي:', 'Reference numbers recorded for the bank transfer:') : T('الأرقام المرجعية المسجّلة لعملية الإيداع النقدي:', 'Reference numbers recorded for the cash deposit:')}</div>
                  {refs.length === 0 ? (
                    <div style={{ fontSize: 12.5, color: 'var(--tx5)' }}>{T('لا توجد أرقام مرجعية مسجّلة', 'No reference numbers recorded')}</div>
                  ) : refs.map(r => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,.03)', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 7 }}>
                        <span style={{ fontSize: 10.5, color: 'var(--tx2)', fontWeight: 700 }}>{T('الرقم المرجعي', 'Reference number')}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, direction: 'ltr' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>{r.reference_number}</span>
                          <CopyBtn text={r.reference_number} />
                        </span>
                      </div>
                      {r.amount != null && <span style={{ fontSize: 13, fontWeight: 800, color: C.gold, direction: 'ltr' }}>{fmtAmt(r.amount)}</span>}
                    </div>
                  ))}
                </>
              ) : !hasVData ? (
                <div style={{ fontSize: 12.5, color: 'var(--tx5)', textAlign: 'center', lineHeight: 1.9, padding: '10px 0' }}>
                  {T('لم تُعبّأ بيانات التحقق بعد', 'Verification data not filled yet')}<br />
                  <span style={{ fontSize: 11.5 }}>{T('اضغط «تعبئة البيانات» لإدخال الأرقام المرجعية والمرفقات', 'Tap “Fill data” to enter reference numbers and attachments')}</span>
                </div>
              ) : (
                <>
                  {filledRefs.map((l, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,.03)', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 7 }}>
                        <span style={{ fontSize: 10.5, color: 'var(--tx2)', fontWeight: 700 }}>{T('الرقم المرجعي', 'Reference number')}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'monospace', direction: 'ltr' }}>{l.reference_number}</span>
                      </div>
                      {!isBank && l.amount !== '' && <span style={{ fontSize: 13, fontWeight: 800, color: C.gold, direction: 'ltr' }}>{fmtAmt(parseFloat(l.amount) || 0)}</span>}
                    </div>
                  ))}
                  {!isBank && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                      <span style={{ color: 'var(--tx3)' }}>{T('المتبقي', 'Remaining')}</span>
                      <span style={{ direction: 'ltr', fontWeight: 800, color: amountsMatch ? '#fff' : C.red }}>{fmtAmt(remaining)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,.03)', borderRadius: 10, padding: '10px 12px' }}>
                    <span style={{ fontSize: 12.5, color: 'var(--tx2)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Paperclip size={13} strokeWidth={2} />{T('مرفقات عمليات الإيداع من البنك', 'Bank deposit attachments')}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: vFiles.length ? '#fff' : C.red, direction: 'ltr' }}>{vFiles.length}</span>
                  </div>
                </>
              )}
            </div>
          </div>
          )}

          {/* Card 2 — الإجراء: الملاحظات + أزرار الإجراء (نمط رواتب سبلاير) */}
          {cardVisible(user, 'deposits', 'action') && (
          <div style={depCardChrome}>
            <div style={{ ...depCardHeader, gap: 10, flexWrap: 'wrap' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} />
              <span style={{ ...depCardTitle, color: C.blue }}>{T('الإجراء', 'Action')}</span>
              {!isVerified && (
                <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {depositId && canCardBtn(user, 'deposits', 'action', 'add_note') && (
                    <button onClick={() => { setNoteErr(null); setNoteModal(true) }} style={pill(C.gold)}
                      onMouseEnter={e => { e.currentTarget.style.background = C.gold + '1f' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                      <span>{T('إضافة ملاحظة', 'Add note')}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                    </button>
                  )}
                  {canCardBtn(user, 'deposits', 'action', 'edit') && (
                  <button onClick={() => { if (canSubmit) { setConfirmErr(null); setConfirmModal(true) } }} disabled={!canSubmit} style={pill(C.ok, !canSubmit)}
                    onMouseEnter={e => { if (canSubmit) e.currentTarget.style.background = C.ok + '1f' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                    <span>{T('تأكيد التحقق', 'Confirm verification')}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  </button>
                  )}
                </div>
              )}
            </div>
            <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600, marginBottom: 10 }}>{T('الملاحظات', 'Notes')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dnotes.map(n => {
                    const p = n.author?.person
                    const name = ((lang !== 'en' ? (p?.name_ar || p?.name_en) : (p?.name_en || p?.name_ar)) || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join(' ')
                    return (
                      <div key={n.id} style={{ background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                          <span style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 600, lineHeight: 1.6, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{n.note}</span>
                          {!isVerified && (
                            <button onClick={() => deleteNote(n.id)} aria-label={T('حذف', 'Remove')} style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--tx4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '.18s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(192,57,43,.18)'; e.currentTarget.style.color = '#e5867a' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tx4)' }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                          )}
                        </div>
                        <div style={{ display: 'flex', direction: 'rtl', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 10.5, color: 'var(--tx5)' }}>
                          {name ? <span style={{ fontWeight: 600, color: C.gold }}>{name}</span> : <span />}
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{fmtDate(n.created_at)} {fmtTime(n.created_at)}</span>
                        </div>
                      </div>
                    )
                  })}
                  {isVerified && (
                    <div style={{ background: `${C.ok}14`, border: `1px solid ${C.ok}3a`, borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.ok, fontWeight: 700 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        {T('تم التحقق بنجاح', 'Verified successfully')}
                      </span>
                      {verifyDuration && <span style={{ fontSize: 11.5, color: 'var(--tx3)', fontWeight: 600 }}>{T('مدة التحقق', 'Verification time')}: {verifyDuration}</span>}
                      {verifiedAt && <span style={{ fontSize: 10.5, color: 'var(--tx5)', direction: 'ltr', alignSelf: 'flex-start', fontVariantNumeric: 'tabular-nums' }}>{fmtDate(verifiedAt)} {fmtTime(verifiedAt)}</span>}
                    </div>
                  )}
                  {dnotes.length === 0 && !isVerified && (
                    <span style={{ fontSize: 11.5, color: 'var(--tx5)', textAlign: 'center', padding: '6px 0' }}>{T('لا توجد ملاحظات', 'No notes')}</span>
                  )}
                </div>
              </div>
              {!isVerified && sameUser && (
                <div style={{ fontSize: 11.5, color: C.red, lineHeight: 1.6, fontWeight: 700 }}>{T('لا يمكنك التحقق من إيداع أنشأته بنفسك — يلزم مستخدم آخر', 'You cannot verify a deposit you created — a different user is required')}</div>
              )}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* نافذة بيانات التحقق — الأرقام المرجعية + المرفقات (الإدخال داخل نافذة منبثقة) */}
      {dataModal && (
        <FKModal open onClose={() => setDataModal(false)} variant="create" width={560}
          title={T('بيانات التحقق', 'Verification details')} Icon={Banknote}
          onSubmit={() => setDataModal(false)} submitLabel={T('حفظ', 'Save')} submitIcon={Check}
          pages={[{ valid: allRefsFilled && vFiles.length > 0 && (isBank || amountsMatch), content: (
            <>
              <ModalSection Icon={Banknote} label={T('الأرقام المرجعية', 'Reference numbers')}>
                {isBank ? (
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 600, marginBottom: 6 }}>{T('الرقم المرجعي للحوالة البنكية', 'Bank transfer reference number')}<span style={{ color: C.red }}> *</span></div>
                    <input value={lines[0].reference_number} onChange={e => setLine(0, 'reference_number', e.target.value)} placeholder={T('الرقم المرجعي', 'Reference number')} style={{ ...lineInput, direction: 'ltr', textAlign: 'center' }} />
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 600 }}>{T('الأرقام المرجعية لعمليات الإيداع', 'Deposit operation references')}<span style={{ color: C.red }}> *</span></span>
                      <button onClick={addLine}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.12)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                        style={{ height: 26, padding: '0 12px', borderRadius: 9, background: 'transparent', border: '1px dashed ' + C.gold + '80', color: C.gold, fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'background .15s ease, border-color .15s ease' }}>
                        {T('إضافة', 'Add')}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {lines.map((l, i) => (
                        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input value={l.reference_number} onChange={e => setLine(i, 'reference_number', e.target.value)} placeholder={T('الرقم المرجعي', 'Reference')} style={{ ...lineInput, flex: '1 1 0', direction: 'ltr', textAlign: 'center' }} />
                          <input value={l.amount} onChange={e => setAmount(i, e.target.value)} inputMode="decimal" placeholder={T('المبلغ', 'Amount')} style={{ ...lineInput, width: 100, direction: 'ltr', textAlign: 'center', fontWeight: 700 }} />
                          {lines.length > 1 && (
                            <button onClick={() => removeLine(i)} aria-label={T('حذف', 'Remove')} style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,.06)', color: 'var(--tx3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(192,57,43,.18)'; e.currentTarget.style.color = '#e5867a' }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = 'var(--tx3)' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 12 }}>
                      <span style={{ color: 'var(--tx3)' }}>{T('المتبقي', 'Remaining')}</span>
                      <span style={{ direction: 'ltr', fontWeight: 800, color: amountsMatch ? '#fff' : C.red }}>{fmtAmt(remaining)}</span>
                    </div>
                  </div>
                )}
              </ModalSection>
              <ModalSection flex Icon={Paperclip} label={T('مرفقات عمليات الإيداع من البنك', 'Bank deposit attachments')} hint={T('ملف واحد على الأقل', 'at least one file')}>
                <MultiFileField T={T} files={vFiles} setFiles={setVFiles} fill label={T('إرفاق الملفات', 'Attach files')} addLabel={T('إرفاق ملفات أخرى', 'Attach more files')} />
              </ModalSection>
            </>
          ) }]} />
      )}

      {/* نافذة إضافة ملاحظة — نمط رواتب سبلاير (نص الإجراء) */}
      {noteModal && (
        <FKModal open onClose={() => { setNoteErr(null); setNoteModal(false) }} variant="create" width={500} height="auto"
          title={T('إضافة ملاحظة', 'Add note')} Icon={FileText}
          onSubmit={async () => { if (await addNote()) setNoteModal(false) }} submitting={noteBusy}
          submitLabel={T('إضافة', 'Add')} submitIcon={Plus}
          pages={[{ valid: !!noteText.trim(), error: noteErr, content: (
            <ModalSection Icon={FileText} label={T('تفاصيل الملاحظة', 'Note details')}>
              <div style={GRID}>
                <TextArea req full label={T('نص الملاحظة', 'Note text')} value={noteText} onChange={v => { setNoteErr(null); setNoteText(v) }}
                  placeholder={T('اكتب ملاحظة…', 'Write a note…')} rows={4} />
              </div>
            </ModalSection>
          ) }]} />
      )}

      {/* نافذة تأكيد التحقق — مراجعة قبل الاعتماد */}
      {confirmModal && (
        <FKModal open onClose={() => { setConfirmErr(null); setConfirmModal(false) }} variant="add" width={500} height="auto"
          title={T('تأكيد التحقق', 'Confirm verification')} Icon={Check}
          onSubmit={async () => { if (await submit()) setConfirmModal(false) }} submitting={busy}
          submitLabel={T('تأكيد التحقق', 'Confirm verification')} submitIcon={Check}
          pages={[{ valid: canSubmit, error: confirmErr, content: (
            <ModalSection Icon={Check} label={T('مراجعة قبل الاعتماد', 'Review before confirming')}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: 'var(--tx3)', fontWeight: 600 }}>{T('المبلغ الإجمالي', 'Total amount')}</span><span style={{ color: C.gold, fontWeight: 800, direction: 'ltr' }}>{fmtAmt(total)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: 'var(--tx3)', fontWeight: 600 }}>{T('عدد الأرقام المرجعية', 'Reference numbers')}</span><span style={{ color: 'var(--tx2)', fontWeight: 700, direction: 'ltr' }}>{lines.length}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: 'var(--tx3)', fontWeight: 600 }}>{T('عدد المرفقات', 'Attachments')}</span><span style={{ color: 'var(--tx2)', fontWeight: 700, direction: 'ltr' }}>{vFiles.length}</span></div>
              </div>
            </ModalSection>
          ) }]} />
      )}
    </div>
  )
}
