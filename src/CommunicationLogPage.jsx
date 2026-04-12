import React, { useState, useEffect, useCallback, useMemo } from 'react'

const C = { dk:'#171717', gold:'#c9a84c', red:'#c0392b', blue:'#3483b4', ok:'#27a046' }
const F = "'Cairo','Tajawal',sans-serif"
const fS = { width:'100%', height:42, padding:'0 14px', border:'1.5px solid rgba(255,255,255,.12)', borderRadius:10, fontFamily:F, fontSize:13, fontWeight:600, color:'var(--tx)', outline:'none', background:'rgba(255,255,255,.06)', textAlign:'right' }

export default function CommunicationLogPage({ sb, toast, user, lang, branchId }) {
  const T = (ar, en) => lang === 'ar' ? ar : en
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [pop, setPop] = useState(null)
  const [clients, setClients] = useState([])
  const [workers, setWorkers] = useState([])
  const [brokers, setBrokers] = useState([])
  const [filterType, setFilterType] = useState('all')
  const [searchQ, setSearchQ] = useState('')
  const [f, setF] = useState({
    client_id: '', worker_id: '', broker_id: '', type: 'call', direction: 'out',
    summary: '', duration_minutes: '', template_id: '', invoice_id: '', transaction_id: ''
  })

  const load = useCallback(async () => {
    setLoading(true)
    const [logR, cliR, wrkR, brkR] = await Promise.all([
      sb.from('communication_log').select('*,clients:client_id(name_ar,phone),workers:worker_id(name_ar),brokers:broker_id(name_ar),users:created_by(name_ar)').is('deleted_at', null).order('created_at', { ascending: false }).limit(200),
      sb.from('clients').select('id,name_ar,phone').is('deleted_at', null).order('name_ar'),
      sb.from('workers').select('id,name_ar').is('deleted_at', null).order('name_ar'),
      sb.from('brokers').select('id,name_ar').is('deleted_at', null).order('name_ar')
    ])
    setData(logR.data || [])
    setClients(cliR.data || [])
    setWorkers(wrkR.data || [])
    setBrokers(brkR.data || [])
    setLoading(false)
  }, [sb])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    let d = data
    if (filterType !== 'all') d = d.filter(r => r.type === filterType)
    if (searchQ) {
      const q = searchQ.toLowerCase()
      d = d.filter(r =>
        (r.clients?.name_ar || '').toLowerCase().includes(q) ||
        (r.workers?.name_ar || '').toLowerCase().includes(q) ||
        (r.brokers?.name_ar || '').toLowerCase().includes(q) ||
        (r.summary || '').toLowerCase().includes(q)
      )
    }
    return d
  }, [data, filterType, searchQ])

  const save = async () => {
    if (!f.client_id && !f.worker_id && !f.broker_id) { toast(T('يرجى اختيار جهة التواصل', 'Select a contact')); return }
    const row = {
      client_id: f.client_id || null, worker_id: f.worker_id || null, broker_id: f.broker_id || null,
      type: f.type, direction: f.direction, summary: f.summary,
      duration_minutes: f.duration_minutes ? Number(f.duration_minutes) : null,
      branch_id: branchId || null, created_by: user?.id
    }
    if (pop === 'new') {
      const { error } = await sb.from('communication_log').insert(row)
      if (error) { toast(T('خطأ: ', 'Error: ') + error.message); return }
    } else {
      const { error } = await sb.from('communication_log').update(row).eq('id', pop)
      if (error) { toast(T('خطأ: ', 'Error: ') + error.message); return }
    }
    toast(T('تم الحفظ', 'Saved')); setPop(null); load()
  }

  const typeIcons = {
    call: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.12.96.35 1.9.66 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.31 1.85.54 2.81.66A2 2 0 0122 16.92z" stroke={C.ok} strokeWidth="1.5"/></svg>,
    whatsapp: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.77.46 3.44 1.27 4.89L2 22l5.22-1.24A9.94 9.94 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" stroke="#25D366" strokeWidth="1.5"/></svg>,
    sms: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke={C.blue} strokeWidth="1.5"/></svg>,
    email: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="3" stroke="#e67e22" strokeWidth="1.5"/><path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7" stroke="#e67e22" strokeWidth="1.5"/></svg>,
    visit: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#9b59b6" strokeWidth="1.5"/><circle cx="12" cy="9" r="2.5" stroke="#9b59b6" strokeWidth="1.5"/></svg>,
    other: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="var(--tx4)" strokeWidth="1.5"/><path d="M8 12h8" stroke="var(--tx4)" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  }
  const typeLabels = { call: T('مكالمة', 'Call'), whatsapp: T('واتساب', 'WhatsApp'), sms: T('رسالة نصية', 'SMS'), email: T('بريد', 'Email'), visit: T('زيارة', 'Visit'), other: T('أخرى', 'Other') }
  const dirLabels = { in: T('وارد', 'Incoming'), out: T('صادر', 'Outgoing') }

  const stats = useMemo(() => ({
    total: data.length,
    calls: data.filter(r => r.type === 'call').length,
    whatsapp: data.filter(r => r.type === 'whatsapp').length,
    today: data.filter(r => r.created_at?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
  }), [data])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)' }}>{T('سجل التواصل', 'Communication Log')}</div>
        <button onClick={() => { setF({ client_id: '', worker_id: '', broker_id: '', type: 'call', direction: 'out', summary: '', duration_minutes: '' }); setPop('new') }} style={{ height: 36, padding: '0 18px', borderRadius: 10, border: '1px solid rgba(201,168,76,.2)', background: 'rgba(201,168,76,.1)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>+ {T('تسجيل تواصل', 'Log Contact')}</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 8 }}>
        {[
          { l: T('الإجمالي', 'Total'), v: stats.total, c: 'var(--tx2)' },
          { l: T('مكالمات', 'Calls'), v: stats.calls, c: C.ok },
          { l: T('واتساب', 'WhatsApp'), v: stats.whatsapp, c: '#25D366' },
          { l: T('اليوم', 'Today'), v: stats.today, c: C.gold },
        ].map((s, i) => (
          <div key={i} style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--bd)' }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--tx5)' }}>{s.l}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: s.c, marginTop: 2 }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder={T('بحث...', 'Search...')} style={{ ...fS, width: 200, height: 34, fontSize: 11 }} />
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--bd)', flex: 1 }}>
          {[['all', T('الكل', 'All')], ...Object.entries(typeLabels)].map(([k, l]) => (
            <div key={k} onClick={() => setFilterType(k)} style={{ padding: '6px 10px', fontSize: 10, fontWeight: filterType === k ? 700 : 500, color: filterType === k ? C.gold : 'rgba(255,255,255,.35)', borderBottom: filterType === k ? `2px solid ${C.gold}` : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>{l}</div>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--tx5)' }}>...</div> :
        filtered.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--tx5)' }}>{T('لا يوجد سجلات', 'No records')}</div> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.map(r => {
            const contact = r.clients?.name_ar || r.workers?.name_ar || r.brokers?.name_ar || T('غير محدد', 'Unknown')
            const time = r.created_at ? new Date(r.created_at).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''
            return (
              <div key={r.id} onClick={() => { setF({ ...r }); setPop(r.id) }} style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--bd)', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{typeIcons[r.type] || typeIcons.other}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', display: 'flex', gap: 6, alignItems: 'center' }}>
                    {contact}
                    <span style={{ fontSize: 9, fontWeight: 500, padding: '1px 6px', borderRadius: 4, background: r.direction === 'in' ? 'rgba(52,131,180,.1)' : 'rgba(201,168,76,.1)', color: r.direction === 'in' ? C.blue : C.gold }}>{dirLabels[r.direction]}</span>
                  </div>
                  {r.summary && <div style={{ fontSize: 10, color: 'var(--tx4)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.summary}</div>}
                </div>
                <div style={{ textAlign: 'left', flexShrink: 0 }}>
                  <div style={{ fontSize: 9, color: 'var(--tx5)' }}>{time}</div>
                  {r.duration_minutes && <div style={{ fontSize: 9, color: 'var(--tx4)', marginTop: 2 }}>{r.duration_minutes} {T('د', 'min')}</div>}
                </div>
                {r.users?.name_ar && <div style={{ fontSize: 9, color: 'var(--tx5)', flexShrink: 0 }}>{r.users.name_ar}</div>}
              </div>
            )
          })}
        </div>
      }

      {/* Popup */}
      {pop && (
        <div onClick={() => setPop(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(14,14,14,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--sf)', borderRadius: 16, width: 'min(520px,96vw)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid var(--bd)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)' }}>{pop === 'new' ? T('تسجيل تواصل جديد', 'New Communication') : T('تعديل', 'Edit')}</div>
              <button onClick={() => setPop(null)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', color: 'var(--tx3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('النوع', 'Type')}</div>
                  <select value={f.type} onChange={e => setF(p => ({ ...p, type: e.target.value }))} style={fS}>
                    {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('الاتجاه', 'Direction')}</div>
                  <select value={f.direction} onChange={e => setF(p => ({ ...p, direction: e.target.value }))} style={fS}>
                    <option value="out">{T('صادر', 'Outgoing')}</option>
                    <option value="in">{T('وارد', 'Incoming')}</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('العميل', 'Client')}</div>
                  <select value={f.client_id || ''} onChange={e => setF(p => ({ ...p, client_id: e.target.value }))} style={fS}>
                    <option value="">{T('—', '—')}</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('العامل', 'Worker')}</div>
                  <select value={f.worker_id || ''} onChange={e => setF(p => ({ ...p, worker_id: e.target.value }))} style={fS}>
                    <option value="">{T('—', '—')}</option>
                    {workers.map(w => <option key={w.id} value={w.id}>{w.name_ar}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('الوسيط', 'Broker')}</div>
                  <select value={f.broker_id || ''} onChange={e => setF(p => ({ ...p, broker_id: e.target.value }))} style={fS}>
                    <option value="">{T('—', '—')}</option>
                    {brokers.map(b => <option key={b.id} value={b.id}>{b.name_ar}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('المدة (دقائق)', 'Duration (min)')}</div>
                  <input type="number" value={f.duration_minutes || ''} onChange={e => setF(p => ({ ...p, duration_minutes: e.target.value }))} style={{ ...fS, direction: 'ltr', textAlign: 'center' }} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('الملخص', 'Summary')}</div>
                <textarea value={f.summary || ''} onChange={e => setF(p => ({ ...p, summary: e.target.value }))} style={{ ...fS, height: 70, padding: '8px 12px', resize: 'none' }} placeholder={T('ملخص التواصل...', 'Communication summary...')} />
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--bd)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={save} style={{ height: 38, padding: '0 24px', borderRadius: 10, background: C.gold, border: 'none', color: C.dk, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{T('حفظ', 'Save')}</button>
              {pop !== 'new' && <button onClick={async () => { await sb.from('communication_log').update({ deleted_at: new Date().toISOString(), deleted_by: user?.id }).eq('id', pop); toast(T('تم الحذف', 'Deleted')); setPop(null); load() }} style={{ height: 38, padding: '0 18px', borderRadius: 10, background: 'rgba(192,57,43,.1)', border: '1px solid rgba(192,57,43,.15)', color: C.red, fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{T('حذف', 'Delete')}</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
