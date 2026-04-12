import React, { useState, useEffect, useCallback, useMemo } from 'react'

const C = { dk:'#171717', gold:'#c9a84c', red:'#c0392b', blue:'#3483b4', ok:'#27a046' }
const F = "'Cairo','Tajawal',sans-serif"
const fS = { width:'100%', height:42, padding:'0 14px', border:'1.5px solid rgba(255,255,255,.12)', borderRadius:10, fontFamily:F, fontSize:13, fontWeight:600, color:'var(--tx)', outline:'none', background:'rgba(255,255,255,.06)', textAlign:'right' }
const bS = { height:36, padding:'0 16px', borderRadius:8, border:'1px solid rgba(201,168,76,.2)', background:'rgba(201,168,76,.12)', color:C.gold, fontFamily:F, fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }

export default function CommissionsPage({ sb, toast, user, lang, branchId }) {
  const T = (ar, en) => lang === 'ar' ? ar : en
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [pop, setPop] = useState(null)
  const [brokers, setBrokers] = useState([])
  const [filter, setFilter] = useState('all')
  const [f, setF] = useState({
    broker_id: '', provider_id: '', invoice_id: '', worker_id: '',
    commission_type: 'fixed', percentage: '', amount: '',
    status: 'pending', payment_method: '', payment_reference: '', notes: ''
  })

  const load = useCallback(async () => {
    setLoading(true)
    const [commR, brokR] = await Promise.all([
      sb.from('commissions').select('*,brokers:broker_id(name_ar),workers:worker_id(name_ar),invoices:invoice_id(invoice_number)').is('deleted_at', null).order('created_at', { ascending: false }),
      sb.from('brokers').select('id,name_ar').is('deleted_at', null).order('name_ar')
    ])
    setData(commR.data || [])
    setBrokers(brokR.data || [])
    setLoading(false)
  }, [sb])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    if (filter === 'all') return data
    return data.filter(c => c.status === filter)
  }, [data, filter])

  const totals = useMemo(() => ({
    total: data.reduce((s, c) => s + Number(c.amount || 0), 0),
    pending: data.filter(c => c.status === 'pending').reduce((s, c) => s + Number(c.amount || 0), 0),
    approved: data.filter(c => c.status === 'approved').reduce((s, c) => s + Number(c.amount || 0), 0),
    paid: data.filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.amount || 0), 0),
  }), [data])

  const save = async () => {
    if (!f.broker_id && !f.provider_id) { toast(T('يرجى اختيار الوسيط', 'Select broker')); return }
    if (!f.amount || Number(f.amount) <= 0) { toast(T('يرجى إدخال المبلغ', 'Enter amount')); return }
    const row = { ...f, amount: Number(f.amount), percentage: f.percentage ? Number(f.percentage) : null, branch_id: branchId || null, created_by: user?.id }
    delete row.brokers; delete row.workers; delete row.invoices
    if (pop === 'new') {
      const { error } = await sb.from('commissions').insert(row)
      if (error) { toast(T('خطأ: ', 'Error: ') + error.message); return }
    } else {
      const { error } = await sb.from('commissions').update(row).eq('id', pop)
      if (error) { toast(T('خطأ: ', 'Error: ') + error.message); return }
    }
    toast(T('تم الحفظ', 'Saved')); setPop(null); load()
  }

  const approve = async (id) => {
    await sb.from('commissions').update({ status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() }).eq('id', id)
    toast(T('تمت الموافقة', 'Approved')); load()
  }

  const markPaid = async (id) => {
    await sb.from('commissions').update({ status: 'paid', paid_by: user?.id, paid_date: new Date().toISOString().slice(0, 10) }).eq('id', id)
    toast(T('تم الدفع', 'Marked as paid')); load()
  }

  const statusColors = { pending: C.gold, approved: C.blue, paid: C.ok, cancelled: C.red }
  const statusLabels = { pending: T('معلقة', 'Pending'), approved: T('معتمدة', 'Approved'), paid: T('مدفوعة', 'Paid'), cancelled: T('ملغاة', 'Cancelled') }
  const num = v => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)' }}>{T('العمولات', 'Commissions')}</div>
        <button onClick={() => { setF({ broker_id: '', provider_id: '', invoice_id: '', worker_id: '', commission_type: 'fixed', percentage: '', amount: '', status: 'pending', payment_method: '', payment_reference: '', notes: '' }); setPop('new') }} style={bS}>+ {T('عمولة جديدة', 'New Commission')}</button>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 8 }}>
        {[
          { l: T('الإجمالي', 'Total'), v: num(totals.total), c: 'var(--tx2)' },
          { l: T('معلقة', 'Pending'), v: num(totals.pending), c: C.gold },
          { l: T('معتمدة', 'Approved'), v: num(totals.approved), c: C.blue },
          { l: T('مدفوعة', 'Paid'), v: num(totals.paid), c: C.ok },
        ].map((s, i) => (
          <div key={i} style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--bd)' }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--tx5)' }}>{s.l}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.c, marginTop: 2 }}>{s.v} <span style={{ fontSize: 9, fontWeight: 500 }}>{T('ر.س', 'SAR')}</span></div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--bd)', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {[['all', T('الكل', 'All')], ['pending', T('معلقة', 'Pending')], ['approved', T('معتمدة', 'Approved')], ['paid', T('مدفوعة', 'Paid')], ['cancelled', T('ملغاة', 'Cancelled')]].map(([k, l]) => (
          <div key={k} onClick={() => setFilter(k)} style={{ padding: '8px 14px', fontSize: 11, fontWeight: filter === k ? 700 : 500, color: filter === k ? C.gold : 'rgba(255,255,255,.35)', borderBottom: filter === k ? `2px solid ${C.gold}` : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>{l} ({k === 'all' ? data.length : data.filter(c => c.status === k).length})</div>
        ))}
      </div>

      {/* Data list */}
      {loading ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--tx5)' }}>...</div> :
        filtered.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--tx5)' }}>{T('لا توجد عمولات', 'No commissions')}</div> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(c => (
            <div key={c.id} onClick={() => { setF({ ...c, amount: c.amount || '', percentage: c.percentage || '' }); setPop(c.id) }} style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--bd)', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center', transition: '.15s' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: (statusColors[c.status] || '#999') + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={statusColors[c.status] || '#999'} strokeWidth="1.5" opacity=".6" /><path d="M12 8v4l2 2" stroke={statusColors[c.status] || '#999'} strokeWidth="1.5" strokeLinecap="round" /></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{c.brokers?.name_ar || T('بدون وسيط', 'No broker')}</div>
                <div style={{ fontSize: 10, color: 'var(--tx4)', display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                  {c.invoices?.invoice_number && <span>{T('فاتورة', 'Inv')} {c.invoices.invoice_number}</span>}
                  {c.workers?.name_ar && <span>{c.workers.name_ar}</span>}
                  <span>{c.commission_type === 'percentage' ? `${c.percentage}%` : T('ثابت', 'Fixed')}</span>
                </div>
              </div>
              <div style={{ textAlign: 'left', flexShrink: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: statusColors[c.status] || 'var(--tx2)' }}>{num(c.amount)}</div>
                <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: (statusColors[c.status] || '#999') + '15', color: statusColors[c.status] || '#999' }}>{statusLabels[c.status]}</span>
              </div>
              {c.status === 'pending' && <button onClick={e => { e.stopPropagation(); approve(c.id) }} style={{ ...bS, height: 28, padding: '0 10px', fontSize: 10, background: 'rgba(52,131,180,.1)', border: '1px solid rgba(52,131,180,.2)', color: C.blue }}>✓</button>}
              {c.status === 'approved' && <button onClick={e => { e.stopPropagation(); markPaid(c.id) }} style={{ ...bS, height: 28, padding: '0 10px', fontSize: 10, background: 'rgba(39,160,70,.1)', border: '1px solid rgba(39,160,70,.2)', color: C.ok }}>$</button>}
            </div>
          ))}
        </div>
      }

      {/* Popup form */}
      {pop && (
        <div onClick={() => setPop(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(14,14,14,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--sf)', borderRadius: 16, width: 'min(520px,96vw)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid var(--bd)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)' }}>{pop === 'new' ? T('عمولة جديدة', 'New Commission') : T('تعديل العمولة', 'Edit Commission')}</div>
              <button onClick={() => setPop(null)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', color: 'var(--tx3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('الوسيط', 'Broker')} *</div>
                  <select value={f.broker_id || ''} onChange={e => setF(p => ({ ...p, broker_id: e.target.value }))} style={fS}>
                    <option value="">{T('اختر...', 'Select...')}</option>
                    {brokers.map(b => <option key={b.id} value={b.id}>{b.name_ar}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('النوع', 'Type')}</div>
                  <select value={f.commission_type} onChange={e => setF(p => ({ ...p, commission_type: e.target.value }))} style={fS}>
                    <option value="fixed">{T('مبلغ ثابت', 'Fixed')}</option>
                    <option value="percentage">{T('نسبة %', 'Percentage')}</option>
                  </select>
                </div>
                {f.commission_type === 'percentage' && <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('النسبة %', 'Percentage')}</div>
                  <input type="number" value={f.percentage} onChange={e => setF(p => ({ ...p, percentage: e.target.value }))} style={{ ...fS, direction: 'ltr', textAlign: 'center' }} />
                </div>}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('المبلغ', 'Amount')} *</div>
                  <input type="number" value={f.amount} onChange={e => setF(p => ({ ...p, amount: e.target.value }))} style={{ ...fS, direction: 'ltr', textAlign: 'center' }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('الحالة', 'Status')}</div>
                  <select value={f.status} onChange={e => setF(p => ({ ...p, status: e.target.value }))} style={fS}>
                    <option value="pending">{T('معلقة', 'Pending')}</option>
                    <option value="approved">{T('معتمدة', 'Approved')}</option>
                    <option value="paid">{T('مدفوعة', 'Paid')}</option>
                    <option value="cancelled">{T('ملغاة', 'Cancelled')}</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('طريقة الدفع', 'Payment Method')}</div>
                  <select value={f.payment_method || ''} onChange={e => setF(p => ({ ...p, payment_method: e.target.value }))} style={fS}>
                    <option value="">{T('—', '—')}</option>
                    <option value="cash">{T('نقدي', 'Cash')}</option>
                    <option value="bank_transfer">{T('تحويل بنكي', 'Bank Transfer')}</option>
                    <option value="check">{T('شيك', 'Check')}</option>
                  </select>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('مرجع الدفع', 'Payment Reference')}</div>
                <input value={f.payment_reference || ''} onChange={e => setF(p => ({ ...p, payment_reference: e.target.value }))} style={fS} />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('ملاحظات', 'Notes')}</div>
                <textarea value={f.notes || ''} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} style={{ ...fS, height: 60, padding: '8px 12px', resize: 'none' }} />
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--bd)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={save} style={{ height: 38, padding: '0 24px', borderRadius: 10, background: C.gold, border: 'none', color: C.dk, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{T('حفظ', 'Save')}</button>
              {pop !== 'new' && <button onClick={async () => { await sb.from('commissions').update({ deleted_at: new Date().toISOString(), deleted_by: user?.id }).eq('id', pop); toast(T('تم الحذف', 'Deleted')); setPop(null); load() }} style={{ height: 38, padding: '0 18px', borderRadius: 10, background: 'rgba(192,57,43,.1)', border: '1px solid rgba(192,57,43,.15)', color: C.red, fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{T('حذف', 'Delete')}</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
