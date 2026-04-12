import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const C = { dk:'#171717', gold:'#c9a84c', red:'#c0392b', blue:'#3483b4', ok:'#27a046' }
const F = "'Cairo','Tajawal',sans-serif"
const fS = { width:'100%', height:42, padding:'0 14px', border:'1.5px solid rgba(255,255,255,.12)', borderRadius:10, fontFamily:F, fontSize:13, fontWeight:600, color:'var(--tx)', outline:'none', background:'rgba(255,255,255,.06)', textAlign:'right' }
const num = v => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export default function OperationalExpensesPage({ sb, toast, user, lang, branchId }) {
  const T = (ar, en) => lang === 'ar' ? ar : en
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [pop, setPop] = useState(null)
  const [filterCat, setFilterCat] = useState('all')
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7))
  const [f, setF] = useState({
    expense_number: '', amount: '', category: 'other', description: '',
    date: new Date().toISOString().slice(0, 10), payment_method: 'cash',
    payment_reference: '', vendor_name: '', is_recurring: false, recurring_period: ''
  })

  const load = useCallback(async () => {
    setLoading(true)
    let q = sb.from('operational_expenses').select('*').is('deleted_at', null).order('date', { ascending: false })
    if (branchId) q = q.eq('branch_id', branchId)
    const { data: d } = await q
    setData(d || [])
    setLoading(false)
  }, [sb, branchId])

  useEffect(() => { load() }, [load])

  const catLabels = {
    rent: T('إيجار', 'Rent'), salary: T('رواتب', 'Salary'), gov_fee: T('رسوم حكومية', 'Gov Fee'),
    transport: T('نقل', 'Transport'), utilities: T('خدمات', 'Utilities'),
    office_supplies: T('مستلزمات', 'Supplies'), maintenance: T('صيانة', 'Maintenance'),
    marketing: T('تسويق', 'Marketing'), insurance: T('تأمين', 'Insurance'),
    telecom: T('اتصالات', 'Telecom'), legal: T('قانوني', 'Legal'), other: T('أخرى', 'Other')
  }
  const catColors = { rent: '#e74c3c', salary: '#3498db', gov_fee: '#c9a84c', transport: '#2ecc71', utilities: '#e67e22', office_supplies: '#9b59b6', maintenance: '#1abc9c', marketing: '#f39c12', insurance: '#2980b9', telecom: '#8e44ad', legal: '#c0392b', other: '#95a5a6' }
  const paymentLabels = { cash: T('نقدي', 'Cash'), bank_transfer: T('تحويل', 'Transfer'), check: T('شيك', 'Check'), pos: T('شبكة', 'POS'), auto_debit: T('خصم تلقائي', 'Auto Debit') }

  const filtered = useMemo(() => {
    let d = data
    if (filterCat !== 'all') d = d.filter(e => e.category === filterCat)
    if (filterMonth) d = d.filter(e => (e.date || '').startsWith(filterMonth))
    return d
  }, [data, filterCat, filterMonth])

  const totals = useMemo(() => {
    const monthData = data.filter(e => (e.date || '').startsWith(filterMonth))
    return {
      total: monthData.reduce((s, e) => s + Number(e.amount || 0), 0),
      recurring: monthData.filter(e => e.is_recurring).reduce((s, e) => s + Number(e.amount || 0), 0),
      count: monthData.length,
    }
  }, [data, filterMonth])

  const chartData = useMemo(() => {
    const monthData = data.filter(e => (e.date || '').startsWith(filterMonth))
    const byCat = {}
    monthData.forEach(e => {
      const cat = e.category || 'other'
      byCat[cat] = (byCat[cat] || 0) + Number(e.amount || 0)
    })
    return Object.entries(byCat).map(([cat, amount]) => ({ cat: catLabels[cat] || cat, amount })).sort((a, b) => b.amount - a.amount)
  }, [data, filterMonth])

  const save = async () => {
    if (!f.amount || Number(f.amount) <= 0) { toast(T('يرجى إدخال المبلغ', 'Enter amount')); return }
    if (!f.date) { toast(T('يرجى إدخال التاريخ', 'Enter date')); return }
    const row = {
      ...f, amount: Number(f.amount),
      branch_id: branchId || null, created_by: user?.id,
      is_recurring: f.is_recurring || false,
      recurring_period: f.is_recurring ? f.recurring_period : null
    }
    if (pop === 'new') {
      const { error } = await sb.from('operational_expenses').insert(row)
      if (error) { toast(T('خطأ: ', 'Error: ') + error.message); return }
    } else {
      const { error } = await sb.from('operational_expenses').update(row).eq('id', pop)
      if (error) { toast(T('خطأ: ', 'Error: ') + error.message); return }
    }
    toast(T('تم الحفظ', 'Saved')); setPop(null); load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)' }}>{T('المصاريف التشغيلية', 'Operational Expenses')}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ height: 36, padding: '0 10px', borderRadius: 8, border: '1px solid var(--bd)', background: 'var(--bg)', color: 'var(--tx2)', fontFamily: F, fontSize: 11, direction: 'ltr' }} />
          <button onClick={() => { setF({ expense_number: '', amount: '', category: 'other', description: '', date: new Date().toISOString().slice(0, 10), payment_method: 'cash', payment_reference: '', vendor_name: '', is_recurring: false, recurring_period: '' }); setPop('new') }} style={{ height: 36, padding: '0 18px', borderRadius: 10, border: '1px solid rgba(201,168,76,.2)', background: 'rgba(201,168,76,.1)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ {T('مصروف جديد', 'New Expense')}</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 8 }}>
        <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(192,57,43,.06)', border: '1px solid rgba(192,57,43,.15)' }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--tx5)' }}>{T('إجمالي الشهر', 'Monthly Total')}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.red, marginTop: 2 }}>{num(totals.total)} <span style={{ fontSize: 9 }}>{T('ر.س', 'SAR')}</span></div>
        </div>
        <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--bd)' }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--tx5)' }}>{T('مصاريف متكررة', 'Recurring')}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.gold, marginTop: 2 }}>{num(totals.recurring)} <span style={{ fontSize: 9 }}>{T('ر.س', 'SAR')}</span></div>
        </div>
        <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--bd)' }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--tx5)' }}>{T('عدد المصاريف', 'Count')}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--tx2)', marginTop: 2 }}>{totals.count}</div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--bd)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', marginBottom: 8 }}>{T('التوزيع حسب الفئة', 'Distribution by Category')}</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
              <XAxis type="number" tick={{ fill: 'var(--tx5)', fontSize: 10 }} tickFormatter={v => num(v)} />
              <YAxis dataKey="cat" type="category" tick={{ fill: 'var(--tx3)', fontSize: 10, fontFamily: F }} width={80} />
              <Tooltip formatter={v => num(v) + ' ' + T('ر.س', 'SAR')} contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, fontFamily: F, fontSize: 11 }} />
              <Bar dataKey="amount" fill={C.red} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--bd)', overflowX: 'auto', scrollbarWidth: 'none' }}>
        <div onClick={() => setFilterCat('all')} style={{ padding: '6px 12px', fontSize: 10, fontWeight: filterCat === 'all' ? 700 : 500, color: filterCat === 'all' ? C.gold : 'rgba(255,255,255,.35)', borderBottom: filterCat === 'all' ? `2px solid ${C.gold}` : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>{T('الكل', 'All')}</div>
        {Object.entries(catLabels).map(([k, v]) => (
          <div key={k} onClick={() => setFilterCat(k)} style={{ padding: '6px 12px', fontSize: 10, fontWeight: filterCat === k ? 700 : 500, color: filterCat === k ? C.gold : 'rgba(255,255,255,.35)', borderBottom: filterCat === k ? `2px solid ${C.gold}` : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>{v}</div>
        ))}
      </div>

      {/* List */}
      {loading ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--tx5)' }}>...</div> :
        filtered.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--tx5)' }}>{T('لا توجد مصاريف', 'No expenses')}</div> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.map(e => (
            <div key={e.id} onClick={() => { setF({ ...e, amount: e.amount || '' }); setPop(e.id) }} style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--bd)', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ width: 6, height: 32, borderRadius: 3, background: catColors[e.category] || '#95a5a6', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', display: 'flex', gap: 6, alignItems: 'center' }}>
                  {e.description || catLabels[e.category] || e.category}
                  {e.is_recurring && <span style={{ fontSize: 8, fontWeight: 600, padding: '1px 5px', borderRadius: 4, background: 'rgba(201,168,76,.1)', color: C.gold }}>⟳</span>}
                </div>
                <div style={{ fontSize: 10, color: 'var(--tx4)', marginTop: 2, display: 'flex', gap: 8 }}>
                  <span>{e.date}</span>
                  {e.vendor_name && <span>{e.vendor_name}</span>}
                  {e.payment_method && <span>{paymentLabels[e.payment_method] || e.payment_method}</span>}
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.red, flexShrink: 0 }}>{num(e.amount)}</div>
            </div>
          ))}
        </div>
      }

      {/* Popup */}
      {pop && (
        <div onClick={() => setPop(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(14,14,14,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--sf)', borderRadius: 16, width: 'min(520px,96vw)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid var(--bd)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)' }}>{pop === 'new' ? T('مصروف جديد', 'New Expense') : T('تعديل المصروف', 'Edit Expense')}</div>
              <button onClick={() => setPop(null)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', color: 'var(--tx3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('المبلغ', 'Amount')} *</div>
                  <input type="number" value={f.amount} onChange={e => setF(p => ({ ...p, amount: e.target.value }))} style={{ ...fS, direction: 'ltr', textAlign: 'center' }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('الفئة', 'Category')} *</div>
                  <select value={f.category} onChange={e => setF(p => ({ ...p, category: e.target.value }))} style={fS}>
                    {Object.entries(catLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('التاريخ', 'Date')} *</div>
                  <input type="date" value={f.date || ''} onChange={e => setF(p => ({ ...p, date: e.target.value }))} style={{ ...fS, direction: 'ltr', textAlign: 'center' }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('طريقة الدفع', 'Payment Method')}</div>
                  <select value={f.payment_method || ''} onChange={e => setF(p => ({ ...p, payment_method: e.target.value }))} style={fS}>
                    {Object.entries(paymentLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('المورد', 'Vendor')}</div>
                  <input value={f.vendor_name || ''} onChange={e => setF(p => ({ ...p, vendor_name: e.target.value }))} style={fS} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('رقم المصروف', 'Expense No.')}</div>
                  <input value={f.expense_number || ''} onChange={e => setF(p => ({ ...p, expense_number: e.target.value }))} style={fS} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('مرجع الدفع', 'Payment Ref')}</div>
                <input value={f.payment_reference || ''} onChange={e => setF(p => ({ ...p, payment_reference: e.target.value }))} style={fS} />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('الوصف', 'Description')}</div>
                <textarea value={f.description || ''} onChange={e => setF(p => ({ ...p, description: e.target.value }))} style={{ ...fS, height: 60, padding: '8px 12px', resize: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--tx3)' }}>
                  <input type="checkbox" checked={f.is_recurring || false} onChange={e => setF(p => ({ ...p, is_recurring: e.target.checked }))} />
                  {T('مصروف متكرر', 'Recurring')}
                </label>
                {f.is_recurring && (
                  <select value={f.recurring_period || ''} onChange={e => setF(p => ({ ...p, recurring_period: e.target.value }))} style={{ height: 32, padding: '0 10px', borderRadius: 8, border: '1px solid var(--bd)', background: 'var(--bg)', color: 'var(--tx2)', fontFamily: F, fontSize: 11 }}>
                    <option value="monthly">{T('شهري', 'Monthly')}</option>
                    <option value="quarterly">{T('ربع سنوي', 'Quarterly')}</option>
                    <option value="yearly">{T('سنوي', 'Yearly')}</option>
                  </select>
                )}
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--bd)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={save} style={{ height: 38, padding: '0 24px', borderRadius: 10, background: C.gold, border: 'none', color: C.dk, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{T('حفظ', 'Save')}</button>
              {pop !== 'new' && <button onClick={async () => { await sb.from('operational_expenses').update({ deleted_at: new Date().toISOString(), deleted_by: user?.id }).eq('id', pop); toast(T('تم الحذف', 'Deleted')); setPop(null); load() }} style={{ height: 38, padding: '0 18px', borderRadius: 10, background: 'rgba(192,57,43,.1)', border: '1px solid rgba(192,57,43,.15)', color: C.red, fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{T('حذف', 'Delete')}</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
