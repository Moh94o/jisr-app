import React, { useEffect, useState } from 'react'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#D4A017', blue: '#5dade2', ok: '#2ecc71', warn: '#eab308', red: '#e87265' }
const num = (v) => Number(v || 0).toLocaleString('en-US')
const fmtGreg = (iso, ar = true) => { if (!iso) return '—'; try { return new Date(iso).toLocaleDateString(ar ? 'ar-SA-u-ca-gregory' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' }) } catch { return '—' } }

const initial = (name) => {
  if (!name) return '?'
  const w = name.trim().split(/\s+/)
  return (w[0]?.[0] || '') + (w.length > 1 ? (w[w.length - 1][0] || '') : '')
}
const colorFor = (s) => { let h = 0; for (let i = 0; i < (s||'').length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; const palette = ['#5dade2','#bb8fce','#16a085','#f39c12','#e8c77a','#2ecc71','#3498db','#e74c3c']; return palette[h % palette.length] }

export default function AgentsPage({ sb, lang }) {
  const isAr = lang !== 'en'
  const T = (a, e) => isAr ? a : e

  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [detail, setDetail] = useState(null)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    Promise.all([
      sb.from('agents').select('id,name_ar,name_en,id_number,phone,default_commission_amount,nationality:nationality_id(name_ar,name_en),branch:branch_id(branch_code)').is('deleted_at', null).order('name_ar'),
      // Aggregate commissions per agent
      sb.from('service_request_agents').select('agent_id,commission_amount'),
    ]).then(([a, c]) => {
      const byAgent = {}
      ;(c.data || []).forEach(x => {
        if (!byAgent[x.agent_id]) byAgent[x.agent_id] = { count: 0, sum: 0 }
        byAgent[x.agent_id].count += 1
        byAgent[x.agent_id].sum += Number(x.commission_amount || 0)
      })
      const enriched = (a.data || []).map(ag => ({ ...ag, _stats: byAgent[ag.id] || { count: 0, sum: 0 } }))
      setAgents(enriched); setLoading(false)
      const grandTotal = Object.values(byAgent).reduce((s, x) => s + x.sum, 0)
      const grandCount = Object.values(byAgent).reduce((s, x) => s + x.count, 0)
      setStats({ total: enriched.length, grandTotal, grandCount })
    })
  }, [sb])

  const filtered = agents.filter(a => {
    if (!q.trim()) return true
    const s = q.trim().toLowerCase()
    return (a.name_ar || '').toLowerCase().includes(s) ||
           (a.name_en || '').toLowerCase().includes(s) ||
           (a.id_number || '').includes(s) ||
           (a.phone || '').includes(s)
  })

  return (
    <div style={{ fontFamily: F }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.93)' }}>{T('الوسطاء','Agents')}</div>
        <div style={{ fontSize: 13, color: 'var(--tx4)', marginTop: 12 }}>{T('الوسطاء الذين يجلبون العملاء وعمولاتهم على الطلبات','Agents who refer clients — with commissions per request')}</div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 22 }}>
        <StatCard label={T('إجمالي الوسطاء','Total Agents')} value={num(stats?.total || 0)} color={C.gold} />
        <StatCard label={T('عدد الطلبات بوسيط','Linked Requests')} value={num(stats?.grandCount || 0)} color={C.blue} />
        <StatCard label={T('إجمالي العمولات','Total Commissions')} value={num(stats?.grandTotal || 0)} color={C.ok} sup={T('ر.س','SAR')} />
      </div>

      {/* Search */}
      <div style={{ marginBottom: 18, position: 'relative' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', top: '50%', right: 14, transform: 'translateY(-50%)', color: 'var(--tx4)' }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        <input placeholder={T('ابحث بالاسم أو رقم الهوية أو الجوال…','Search by name, ID or phone…')} value={q} onChange={e => setQ(e.target.value)} style={{ width: '100%', padding: '11px 38px 11px 14px', borderRadius: 12, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: 'var(--tx1)', fontSize: 13, fontFamily: F, boxSizing: 'border-box' }} />
      </div>

      {/* List as cards */}
      {loading && <div style={{ padding: 40, textAlign: 'center', color: 'var(--tx4)' }}>…</div>}
      {!loading && filtered.length === 0 && <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx4)', border: '1px dashed rgba(255,255,255,.08)', borderRadius: 14, fontSize: 13 }}>{T('لا يوجد وسطاء','No agents')}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 12 }}>
        {filtered.map(a => (
          <div key={a.id} onClick={() => setDetail(a)} style={cardS}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: colorFor(a.id) + '22', border: `2px solid ${colorFor(a.id)}66`, color: colorFor(a.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700, flexShrink: 0 }}>{initial(a.name_ar || a.name_en)}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx1)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name_ar || a.name_en}</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', fontSize: 11, color: 'var(--tx3)' }}>
                {a.phone && <span style={{ direction: 'ltr', fontFamily: 'monospace', color: C.ok }}>{a.phone}</span>}
                {a.nationality?.name_ar && <span>{a.nationality.name_ar}</span>}
                {a.branch?.branch_code && <span style={{ padding: '1px 6px', borderRadius: 5, border: '1px solid rgba(255,255,255,.08)', direction: 'ltr', fontWeight: 700 }}>{a.branch.branch_code}</span>}
              </div>
            </div>
            <div style={{ textAlign: 'left', flexShrink: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.gold, direction: 'ltr', fontVariantNumeric: 'tabular-nums', letterSpacing: '-.5px' }}>{num(a._stats.sum)}</div>
              <div style={{ fontSize: 9, color: 'var(--tx4)', marginTop: 2 }}>{a._stats.count} {T('طلب','requests')}</div>
            </div>
          </div>
        ))}
      </div>

      {detail && <AgentDrawer sb={sb} agent={detail} onClose={() => setDetail(null)} isAr={isAr} T={T} />}
    </div>
  )
}

function AgentDrawer({ sb, agent, onClose, isAr, T }) {
  const [requests, setRequests] = useState(null)
  useEffect(() => {
    sb.from('service_request_agents').select(`
      commission_amount, commission_paid_at,
      service_request:service_request_id(
        id, request_ref_no, request_date,
        client:client_id(name_ar,name_en),
        service_type:service_type_id(value_ar,value_en),
        status:status_id(code,value_ar,value_en),
        branch:branch_id(branch_code)
      )
    `).eq('agent_id', agent.id).then(({ data }) => setRequests(data || []))
  }, [sb, agent.id])

  const totalCom = requests?.reduce((s, r) => s + Number(r.commission_amount || 0), 0) || 0

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', justifyContent: 'flex-start' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(680px, 100vw)', height: '100vh', overflow: 'auto', background: 'linear-gradient(180deg,#1f1f1f,#181818)', borderRight: '1px solid rgba(255,255,255,.08)', boxShadow: '6px 0 30px rgba(0,0,0,.5)', fontFamily: F }}>
        <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', gap: 18, alignItems: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: colorFor(agent.id) + '22', border: `2.5px solid ${colorFor(agent.id)}`, color: colorFor(agent.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, flexShrink: 0 }}>{initial(agent.name_ar || agent.name_en)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--tx1)', marginBottom: 6 }}>{agent.name_ar || agent.name_en}</div>
            {agent.name_en && agent.name_ar && <div style={{ fontSize: 11, color: 'var(--tx3)', direction: 'ltr', marginBottom: 6 }}>{agent.name_en}</div>}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: 'var(--tx3)' }}>
              {agent.id_number && <span style={{ direction: 'ltr', fontFamily: 'monospace' }}>{agent.id_number}</span>}
              {agent.phone && <span style={{ direction: 'ltr', fontFamily: 'monospace', color: C.ok }}>{agent.phone}</span>}
              {agent.nationality?.name_ar && <span>{agent.nationality.name_ar}</span>}
              {agent.branch?.branch_code && <span style={{ padding: '1px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,.08)', direction: 'ltr', fontWeight: 700 }}>{agent.branch.branch_code}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ padding: 8, borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', cursor: 'pointer', color: 'var(--tx2)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, padding: 1, background: 'rgba(255,255,255,.04)' }}>
          <div style={{ padding: '14px 18px', background: 'rgba(0,0,0,.18)', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600, marginBottom: 6, letterSpacing: 1 }}>{T('عدد الطلبات','Requests')}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.gold, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{requests === null ? '…' : num(requests.length)}</div>
          </div>
          <div style={{ padding: '14px 18px', background: 'rgba(0,0,0,.18)', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600, marginBottom: 6, letterSpacing: 1 }}>{T('إجمالي العمولات','Total Commission')}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.ok, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(totalCom)}</div>
          </div>
        </div>

        <div style={{ padding: '20px 28px' }}>
          <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 700, marginBottom: 14, letterSpacing: 1, textTransform: 'uppercase' }}>{T('سجل الطلبات','Requests Brought')}</div>
          {requests === null && <div style={{ color: 'var(--tx4)', fontSize: 12 }}>…</div>}
          {requests?.length === 0 && <div style={{ color: 'var(--tx4)', fontSize: 12 }}>{T('لا توجد طلبات','No requests yet')}</div>}
          {requests?.map((r, i) => {
            const sr = r.service_request
            if (!sr) return null
            return (
              <div key={i} style={{ padding: '12px 14px', marginBottom: 8, borderRadius: 10, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx1)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sr.client?.name_ar || sr.client?.name_en || '—'}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: C.gold, fontFamily: 'monospace', fontWeight: 700, direction: 'ltr' }}>{sr.request_ref_no}</span>
                    <span style={{ fontSize: 10, color: 'var(--tx3)' }}>· {isAr ? sr.service_type?.value_ar : (sr.service_type?.value_en || sr.service_type?.value_ar)}</span>
                    <span style={{ fontSize: 10, color: 'var(--tx4)', direction: 'ltr' }}>· {fmtGreg(sr.request_date, isAr)}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'left', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, color: C.ok, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(r.commission_amount)}</div>
                  {r.commission_paid_at && <div style={{ fontSize: 9, color: 'var(--tx4)', marginTop: 2 }}>{T('مدفوعة','paid')}</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const StatCard = ({ label, value, color, sup }) => (
  <div style={{ padding: '20px 22px', borderRadius: 16, background: 'linear-gradient(180deg,#2A2A2A,#222)', border: '1px solid rgba(255,255,255,.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
      <div style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600 }}>{label}</div>
      {sup && <div style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600 }}>{sup}</div>}
    </div>
    <div style={{ fontSize: 32, fontWeight: 700, color: color || C.gold, letterSpacing: '-1px', direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
  </div>
)

const cardS = { padding: '14px 16px', borderRadius: 12, background: 'linear-gradient(180deg,rgba(42,42,42,.95),rgba(34,34,34,.95))', border: '1px solid rgba(255,255,255,.05)', display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', transition: 'all .15s' }
