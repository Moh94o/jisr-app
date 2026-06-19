import React, { useEffect, useMemo, useState } from 'react'
import { Modal, TextField, Select, EmptyState, ConfirmDialog, GRID } from '../components/ui/FormKit.jsx'
import { StatStripSkeleton, SkeletonTable } from '../components/ui/Skeleton.jsx'

const F = "'Cairo','Tajawal',sans-serif"
const C = {
  gold: '#D4A017', blue: '#5dade2', purple: '#bb8fce', cyan: '#16a085',
  orange: '#f39c12', gray: '#95a5a6', ok: '#2ecc71', warn: '#eab308', red: '#e87265',
}
const num = (v) => Number(v || 0).toLocaleString('en-US')
const fmtAmt = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const today = () => new Date().toISOString().slice(0, 10)
const fmtDate = (s) => { if (!s) return '—'; const d = new Date(s + 'T12:00:00'); return isNaN(d) ? '—' : `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}` }

// نوع كل بند خارجي + لونه
const OBLIG_LABEL = { rent: 'إيجار', utility_electricity: 'كهرباء', utility_water: 'ماء', utility_internet: 'إنترنت', phone: 'جوال' }
const OBLIG_COLOR = { rent: C.gold, utility_electricity: C.warn, utility_water: C.blue, utility_internet: C.cyan, phone: C.purple }

const card = { background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)', borderRadius: 16 }
const inputS = { height: 42, padding: '0 12px', borderRadius: 10, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.06)', color: 'var(--tx)', fontFamily: F, fontSize: 13, fontWeight: 600, outline: 'none', boxSizing: 'border-box', width: '100%' }

export default function ExternalPaymentsPage({ sb, user, toast, lang = 'ar', branchId }) {
  const T = (ar, en) => (lang === 'ar' ? ar : en)
  const isAr = lang === 'ar'

  const [obligRows, setObligRows] = useState([])
  const [bankRows, setBankRows] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const [tab, setTab] = useState('all')          // all | pending | paid
  const [addOpen, setAddOpen] = useState(false)
  const [payRow, setPayRow] = useState(null)      // الصف بانتظار تأكيد السداد

  // ── جلب البيانات: التزامات الفروع + الحوالات البنكية ──
  useEffect(() => {
    let alive = true
    setLoading(true)
    ;(async () => {
      let oq = sb.from('branch_obligation_payments')
        .select('id,due_date,amount,status,paid_date,branch_id,obligation:obligation_id(obligation_type,vendor,title,account_no),branch:branch_id(branch_code)')
        .is('deleted_at', null).order('due_date', { ascending: false })
      let sq = sb.from('saudization_payments')
        .select('id,due_date,amount,status,paid_date,beneficiary_name,bank_name,iban,branch_id,branch:branch_id(branch_code)')
        .is('deleted_at', null).order('due_date', { ascending: false })
      if (branchId) { oq = oq.eq('branch_id', branchId); sq = sq.eq('branch_id', branchId) }
      const [{ data: od }, { data: sd }] = await Promise.all([oq, sq])
      if (!alive) return
      setObligRows((od || []).map(r => ({
        key: 'o_' + r.id, source: 'oblig', _raw: r,
        typeLabel: OBLIG_LABEL[r.obligation?.obligation_type] || 'التزام',
        color: OBLIG_COLOR[r.obligation?.obligation_type] || C.gray,
        party: r.obligation?.vendor || r.obligation?.title || '—',
        account: r.obligation?.account_no || '—',
        branchCode: r.branch?.branch_code || '', due_date: r.due_date,
        amount: Number(r.amount || 0), status: r.status, paid_date: r.paid_date,
      })))
      setBankRows((sd || []).map(r => ({
        key: 'b_' + r.id, source: 'bank', _raw: r,
        typeLabel: 'بنكية', color: C.blue,
        party: r.beneficiary_name || '—',
        account: r.iban || r.bank_name || '—',
        branchCode: r.branch?.branch_code || '', due_date: r.due_date,
        amount: Number(r.amount || 0), status: r.status, paid_date: r.paid_date,
      })))
      setLoading(false)
    })()
    return () => { alive = false }
  }, [sb, branchId, tick])

  useEffect(() => {
    sb.from('branches').select('id,branch_code,name_ar').then(({ data }) => setBranches(data || []))
  }, [sb])

  const rows = useMemo(() => {
    const all = [...obligRows, ...bankRows].sort((a, b) => (b.due_date || '').localeCompare(a.due_date || ''))
    if (tab === 'pending') return all.filter(r => r.status === 'pending')
    if (tab === 'paid') return all.filter(r => r.status === 'paid')
    return all
  }, [obligRows, bankRows, tab])

  // ── إحصاءات (بانتظار السداد) ──
  const stats = useMemo(() => {
    const sum = arr => arr.reduce((a, r) => a + r.amount, 0)
    const pend = [...obligRows, ...bankRows].filter(r => r.status === 'pending')
    const bankPend = bankRows.filter(r => r.status === 'pending')
    const obligPend = obligRows.filter(r => r.status === 'pending')
    const byType = {}
    pend.forEach(r => { byType[r.typeLabel] = byType[r.typeLabel] || { cnt: 0, sum: 0, c: r.color }; byType[r.typeLabel].cnt++; byType[r.typeLabel].sum += r.amount })
    const breakdown = Object.entries(byType).map(([label, v]) => ({ label, ...v })).sort((a, b) => b.sum - a.sum)
    return {
      pendSum: sum(pend), pendCnt: pend.length,
      bankSum: sum(bankPend), bankCnt: bankPend.length,
      obligSum: sum(obligPend), obligCnt: obligPend.length,
      breakdown,
    }
  }, [obligRows, bankRows])

  const markPaid = async (row) => {
    const table = row.source === 'bank' ? 'saudization_payments' : 'branch_obligation_payments'
    const { error } = await sb.from(table).update({
      status: 'paid', paid_date: today(), paid_amount: row.amount, updated_at: new Date().toISOString(), updated_by: user?.id || null,
    }).eq('id', row._raw.id)
    if (error) { toast?.((isAr ? 'تعذّر السداد: ' : 'Failed: ') + error.message.slice(0, 80), 'error'); return }
    toast?.(isAr ? 'تم تسجيل السداد' : 'Marked paid'); setTick(t => t + 1)
  }

  return (
    <div style={{ fontFamily: F, direction: 'rtl', paddingTop: 0 }}>
      {/* Header */}
      <div style={{ marginBottom: 22, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px', lineHeight: 1.2 }}>{T('سدادات خارجية', 'External Payments')}</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>{T('الحوالات المدفوعة لحسابات بنكية خارجية — التزامات الفروع (الإيجار والخدمات) والحوالات البنكية.', 'Transfers paid to external bank accounts — branch obligations (rent & utilities) and bank transfers.')}</div>
        </div>
        <button onClick={() => setAddOpen(true)} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.12)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          style={{ height: 42, padding: '0 18px', borderRadius: 11, background: 'transparent', border: '1px dashed rgba(212,160,23,.5)', color: C.gold, fontFamily: F, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', flexShrink: 0, transition: 'background .15s ease' }}>
          {T('إضافة حوالة بنكية', 'Add bank transfer')}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>

      {loading ? (<><StatStripSkeleton breakdownRows={4} /><SkeletonTable columns={['14%','11%','13%','20%','20%','12%','10%']} rows={8} /></>) : (<>

      {/* Stat cards — same 190px hero as the other finance pages */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 1.5fr', gap: 14, marginBottom: 24 }}>
        {/* بانتظار السداد */}
        <div style={{ ...card, position: 'relative', padding: '18px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden', minHeight: 190 }}>
          <div style={{ position: 'absolute', insetInlineStart: -60, top: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${C.warn}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.warn, boxShadow: `0 0 10px ${C.warn}aa` }} />
            <span style={{ fontSize: 24, color: '#fff', fontWeight: 600, letterSpacing: '.2px' }}>{T('بانتظار السداد', 'Pending')}</span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 7, justifyContent: 'flex-start', direction: 'ltr' }}>
            <span style={{ fontSize: 42, fontWeight: 800, color: C.warn, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{fmtAmt(stats.pendSum)}</span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)' }}>
            <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600 }}>{T('عدد البنود', 'Items')}</span>
            <span style={{ fontSize: 13, color: C.warn, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(stats.pendCnt)}</span>
          </div>
        </div>

        {/* بنكية + التزامات الفروع */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 190 }}>
          {[
            { label: T('حوالات بنكية', 'Bank transfers'), sum: stats.bankSum, cnt: stats.bankCnt, c: C.blue },
            { label: T('التزامات الفروع', 'Branch obligations'), sum: stats.obligSum, cnt: stats.obligCnt, c: C.gold },
          ].map((s, i) => (
            <div key={i} style={{ position: 'relative', padding: '12px 16px', flex: 1, borderTop: i > 0 ? '1px solid rgba(255,255,255,.06)' : 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 5 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.c }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{s.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>({num(s.cnt)})</span>
                </div>
              </div>
              <div style={{ direction: 'ltr', display: 'flex' }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: s.c, fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-.5px' }}>{fmtAmt(s.sum)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* تفصيل حسب النوع */}
        <div style={{ ...card, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 190 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>{T('بانتظار السداد — حسب النوع', 'Pending — by kind')}</span>
            <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}><span style={{ color: C.gold, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(stats.pendCnt)}</span> {T('بند', 'items')}</span>
          </div>
          {stats.pendSum > 0 && (
            <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,.04)' }}>
              {stats.breakdown.map(b => <div key={b.label} title={`${b.label}: ${b.cnt}`} style={{ width: (b.sum / Math.max(1, stats.pendSum)) * 100 + '%', background: b.c }} />)}
            </div>
          )}
          {stats.breakdown.length ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px 16px' }}>
              {stats.breakdown.map(b => (
                <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 600 }}>
                  <span style={{ color: b.c, fontVariantNumeric: 'tabular-nums', direction: 'ltr', minWidth: 14, textAlign: 'center', flexShrink: 0, fontWeight: 700 }}>{num(b.cnt)}</span>
                  <span style={{ color: 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.label}</span>
                </div>
              ))}
            </div>
          ) : <div style={{ fontSize: 11.5, color: 'var(--tx4)', marginTop: 4 }}>{T('لا توجد بنود بانتظار السداد', 'Nothing pending')}</div>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[['all', T('الكل', 'All')], ['pending', T('بانتظار السداد', 'Pending')], ['paid', T('مدفوعة', 'Paid')]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ height: 36, padding: '0 16px', borderRadius: 10, background: tab === k ? 'rgba(212,160,23,.12)' : 'rgba(0,0,0,.18)', border: '1px solid ' + (tab === k ? 'rgba(212,160,23,.3)' : 'rgba(255,255,255,.05)'), color: tab === k ? C.gold : 'var(--tx2)', fontFamily: F, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>{l}</button>
        ))}
      </div>

      {/* Table — same chrome as «سدادات الخدمات» (pay-tbl) */}
      {rows.length === 0 ? (
        <div style={{ ...card, padding: 20 }}><EmptyState title={T('لا توجد سدادات خارجية', 'No external payments')} desc={T('أضف حوالة بنكية، أو ستظهر التزامات الفروع المستحقة هنا تلقائياً.', 'Add a bank transfer, or due branch obligations will appear here automatically.')} /></div>
      ) : (
        <div style={{ borderRadius: 10, overflow: 'hidden' }}>
          <style>{`
.ext-tbl{width:100%;border-collapse:separate;border-spacing:0;font-family:${F};background:#161616;border-radius:10px;border:1px solid rgba(255,255,255,.06)}
.ext-tbl thead th{position:sticky;top:0;background:#161616;color:rgba(255,255,255,.92);font-size:12px;font-weight:700;text-align:center;padding:14px 10px 11px;box-shadow:inset 0 -2px 0 rgba(212,160,23,.55);white-space:nowrap;z-index:2;letter-spacing:.2px}
.ext-tbl tbody td{padding:11px 10px;font-size:11.5px;color:#fff;text-align:center;vertical-align:middle;border-bottom:1px solid rgba(255,255,255,.03)}
.ext-tbl tbody tr.payable{cursor:pointer;transition:background .12s}
.ext-tbl tbody tr:nth-child(even) td{background:rgba(255,255,255,.02)}
.ext-tbl tbody tr.payable:hover td{background:rgba(212,160,23,.06)}
.ext-tbl tbody tr:last-child td{border-bottom:none}
.ext-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:6px;font-size:10.5px;font-weight:700;white-space:nowrap;line-height:1.5}
.ext-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0}
          `}</style>
          <table className="ext-tbl">
            <thead>
              <tr>
                <th>{T('الاستحقاق', 'Due')}</th>
                <th>{T('الفرع', 'Branch')}</th>
                <th>{T('النوع', 'Kind')}</th>
                <th>{T('الجهة / المستفيد', 'Party / Beneficiary')}</th>
                <th>{T('الحساب / الآيبان', 'Account / IBAN')}</th>
                <th>{T('المبلغ', 'Amount')}</th>
                <th>{T('الحالة', 'Status')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const isPaid = r.status === 'paid'
                const overdue = !isPaid && r.due_date && r.due_date < today()
                const sc = isPaid ? C.ok : overdue ? C.red : C.warn
                return (
                  <tr key={r.key} className={isPaid ? '' : 'payable'} onClick={isPaid ? undefined : () => setPayRow(r)} title={isPaid ? undefined : T('تسجيل السداد', 'Record payment')}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <span style={{ direction: 'ltr', fontSize: 11.5, color: 'var(--tx2)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtDate(isPaid ? r.paid_date || r.due_date : r.due_date)}</span>
                        {overdue && <span style={{ fontSize: 9.5, fontWeight: 700, color: C.red }}>{T('متأخر', 'Overdue')}</span>}
                      </div>
                    </td>
                    <td><span style={{ direction: 'ltr', display: 'inline-block', fontFamily: 'monospace', fontWeight: 700, color: C.gold }}>{r.branchCode || '—'}</span></td>
                    <td style={{ fontWeight: 700, color: r.color }}><span className="ext-pill" style={{ color: r.color, background: r.color + '18', border: '1px solid ' + r.color + '38' }}><span className="ext-dot" style={{ background: r.color }} />{r.typeLabel}</span></td>
                    <td><span style={{ fontSize: 11.5, color: 'var(--tx2)', fontWeight: 600 }}>{r.party}</span></td>
                    <td>{r.account && r.account !== '—' ? <span style={{ direction: 'ltr', display: 'inline-block', fontFamily: 'monospace', fontWeight: 700 }}>{r.account}</span> : <span style={{ color: 'var(--tx5)' }}>—</span>}</td>
                    <td style={{ fontWeight: 900, direction: 'ltr', color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{fmtAmt(r.amount)}</td>
                    <td>
                      <span className="ext-pill" style={{ color: sc, background: sc + '18', border: '1px solid ' + sc + '38' }}>
                        <span className="ext-dot" style={{ background: sc }} />
                        {isPaid ? T('مدفوعة', 'Paid') : overdue ? T('متأخر', 'Overdue') : T('بانتظار السداد', 'Pending')}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      </>)}

      {addOpen && <AddBankTransferModal sb={sb} user={user} lang={lang} branches={branches} defaultBranch={branchId} onClose={() => setAddOpen(false)} onSaved={() => { setAddOpen(false); setTick(t => t + 1) }} toast={toast} />}

      <ConfirmDialog
        open={!!payRow}
        danger={false}
        title={T('تأكيد السداد', 'Confirm payment')}
        message={T('تسجيل هذا البند كمدفوع؟', 'Mark this item as paid?')}
        itemName={payRow ? `${payRow.typeLabel} — ${payRow.party} — ${fmtAmt(payRow.amount)}` : undefined}
        confirmText={T('تسجيل السداد', 'Mark paid')}
        cancelText={T('إلغاء', 'Cancel')}
        onConfirm={() => { const r = payRow; setPayRow(null); markPaid(r) }}
        onCancel={() => setPayRow(null)}
      />
    </div>
  )
}

// ── نافذة إضافة حوالة بنكية ──
function AddBankTransferModal({ sb, user, lang, branches, defaultBranch, onClose, onSaved, toast }) {
  const T = (ar, en) => (lang === 'ar' ? ar : en)
  const [f, setF] = useState({ branch_id: defaultBranch || branches[0]?.id || '', beneficiary_name: '', bank_name: '', iban: '', amount: '', due_date: today(), notes: '' })
  const [err, setErr] = useState({})
  const [saveErr, setSaveErr] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => { setSaveErr(null); setF(p => ({ ...p, [k]: v })) }
  useEffect(() => { if (!f.branch_id && branches[0]) set('branch_id', branches[0].id) }, [branches]) // eslint-disable-line

  const submit = async () => {
    const e = {}
    if (!f.branch_id) e.branch_id = true
    if (!f.beneficiary_name.trim()) e.beneficiary_name = true
    if (!(Number(f.amount) > 0)) e.amount = true
    if (!f.due_date) e.due_date = true
    setErr(e); if (Object.keys(e).length) return
    setSaveErr(null); setSaving(true)
    const { error } = await sb.from('saudization_payments').insert({
      branch_id: f.branch_id, beneficiary_name: f.beneficiary_name.trim(),
      bank_name: f.bank_name.trim() || null, iban: f.iban.trim() || null,
      amount: Number(f.amount), due_date: f.due_date,
      notes: f.notes.trim() || null, status: 'pending', created_by: user?.id || null,
    })
    setSaving(false)
    if (error) { setSaveErr((lang === 'ar' ? 'تعذّر الحفظ: ' : 'Save failed: ') + error.message.slice(0, 90)); return }
    toast?.(T('تمت إضافة الحوالة', 'Bank transfer added')); onSaved()
  }

  return (
    <Modal open onClose={() => { setSaveErr(null); onClose() }} title={T('إضافة حوالة بنكية', 'Add bank transfer')} subtitle={T('حوالة لحساب بنكي خارجي', 'Transfer to an external bank account')} width={640}
      onSubmit={submit} submitting={saving} submitLabel={T('حفظ', 'Save')} errorMsg={saveErr}>
      <div style={GRID}>
        <Select label={T('الفرع', 'Branch')} req error={err.branch_id} value={f.branch_id} onChange={(k) => set('branch_id', k)}
          options={branches} getKey={(o) => o.id} getLabel={(o) => o.branch_code || o.name_ar || o.id} placeholder={T('اختر الفرع', 'Select branch')} />
        <TextField label={T('المستفيد', 'Beneficiary')} req error={err.beneficiary_name} value={f.beneficiary_name} onChange={(v) => set('beneficiary_name', v)} placeholder={T('اسم المستفيد', 'Beneficiary name')} />
        <TextField label={T('البنك', 'Bank')} value={f.bank_name} onChange={(v) => set('bank_name', v)} />
        <TextField label={T('الآيبان', 'IBAN')} value={f.iban} onChange={(v) => set('iban', v)} dir="ltr" upper placeholder="SA…" />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx3)', marginBottom: 6 }}>{T('المبلغ', 'Amount')} *</div>
          <input type="number" min="0" step="0.01" value={f.amount} onChange={e => set('amount', e.target.value)} style={{ ...inputS, direction: 'ltr', textAlign: 'left', boxShadow: err.amount ? `0 0 0 1.5px ${C.red}80` : undefined }} />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx3)', marginBottom: 6 }}>{T('تاريخ الاستحقاق', 'Due date')} *</div>
          <input type="date" value={f.due_date} onChange={e => set('due_date', e.target.value)} style={{ ...inputS, direction: 'ltr', boxShadow: err.due_date ? `0 0 0 1.5px ${C.red}80` : undefined }} />
        </div>
        <TextField label={T('ملاحظات', 'Notes')} value={f.notes} onChange={(v) => set('notes', v)} full />
      </div>
    </Modal>
  )
}
