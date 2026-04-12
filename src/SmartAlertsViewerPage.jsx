import React, { useState, useEffect, useCallback, useMemo } from 'react'

const C = { dk:'#171717', gold:'#c9a84c', red:'#c0392b', blue:'#3483b4', ok:'#27a046' }
const F = "'Cairo','Tajawal',sans-serif"

export default function SmartAlertsViewerPage({ sb, toast, user, lang, branchId }) {
  const T = (ar, en) => lang === 'ar' ? ar : en
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('active')
  const [filterSeverity, setFilterSeverity] = useState('all')
  const [filterType, setFilterType] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    let q = sb.from('smart_alerts').select('*').order('created_at', { ascending: false }).limit(500)
    if (branchId) q = q.eq('branch_id', branchId)
    const { data: d } = await q
    setData(d || [])
    setLoading(false)
  }, [sb, branchId])

  useEffect(() => { load() }, [load])

  const resolve = async (id, notes) => {
    await sb.from('smart_alerts').update({
      status: 'resolved', resolved_at: new Date().toISOString(),
      resolved_by: user?.id, resolve_notes: notes || ''
    }).eq('id', id)
    toast(T('تم الحل', 'Resolved'))
    load()
  }

  const snooze = async (id, days = 7) => {
    const until = new Date()
    until.setDate(until.getDate() + days)
    await sb.from('smart_alerts').update({
      status: 'snoozed', snoozed_until: until.toISOString().slice(0, 10)
    }).eq('id', id)
    toast(T('تم التأجيل', 'Snoozed'))
    load()
  }

  const regenerate = async () => {
    try {
      await sb.rpc('generate_smart_alerts')
      toast(T('تم تحديث التنبيهات', 'Alerts regenerated'))
      load()
    } catch (e) {
      toast(T('خطأ في التحديث', 'Error regenerating'))
    }
  }

  const filtered = useMemo(() => {
    let d = data
    if (filterStatus !== 'all') d = d.filter(a => a.status === filterStatus)
    if (filterSeverity !== 'all') d = d.filter(a => a.severity === filterSeverity)
    if (filterType !== 'all') d = d.filter(a => a.entity_type === filterType)
    return d
  }, [data, filterStatus, filterSeverity, filterType])

  const severityColors = { info: C.blue, warning: C.gold, urgent: '#e67e22', critical: C.red }
  const severityLabels = { info: T('معلومة', 'Info'), warning: T('تحذير', 'Warning'), urgent: T('عاجل', 'Urgent'), critical: T('حرج', 'Critical') }
  const statusLabels = { active: T('نشط', 'Active'), snoozed: T('مؤجل', 'Snoozed'), resolved: T('محلول', 'Resolved'), expired: T('منتهي', 'Expired') }
  const entityLabels = { worker: T('عامل', 'Worker'), facility: T('منشأة', 'Facility'), client: T('عميل', 'Client'), invoice: T('فاتورة', 'Invoice'), insurance: T('تأمين', 'Insurance'), vehicle: T('مركبة', 'Vehicle'), document: T('مستند', 'Document') }
  const alertTypeLabels = {
    iqama_expiry: T('انتهاء إقامة', 'Iqama Expiry'), passport_expiry: T('انتهاء جواز', 'Passport Expiry'),
    insurance_expiry: T('انتهاء تأمين', 'Insurance Expiry'), cr_expiry: T('انتهاء سجل', 'CR Expiry'),
    license_expiry: T('انتهاء رخصة', 'License Expiry'), chamber_expiry: T('انتهاء غرفة', 'Chamber Expiry'),
    contract_expiry: T('انتهاء عقد', 'Contract Expiry'), visa_expiry: T('انتهاء تأشيرة', 'Visa Expiry'),
    gosi_issue: T('مشكلة تأمينات', 'GOSI Issue'), qiwa_issue: T('مشكلة قوى', 'Qiwa Issue'),
    invoice_overdue: T('فاتورة متأخرة', 'Overdue Invoice'), custom: T('مخصص', 'Custom')
  }

  const stats = useMemo(() => ({
    active: data.filter(a => a.status === 'active').length,
    critical: data.filter(a => a.severity === 'critical' && a.status === 'active').length,
    urgent: data.filter(a => a.severity === 'urgent' && a.status === 'active').length,
    resolved: data.filter(a => a.status === 'resolved').length,
  }), [data])

  const getDaysText = (expDate) => {
    if (!expDate) return ''
    const diff = Math.ceil((new Date(expDate) - new Date()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return T(`منتهي منذ ${Math.abs(diff)} يوم`, `Expired ${Math.abs(diff)}d ago`)
    if (diff === 0) return T('ينتهي اليوم', 'Expires today')
    return T(`متبقي ${diff} يوم`, `${diff} days left`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)' }}>{T('التنبيهات الذكية', 'Smart Alerts')}</div>
        <button onClick={regenerate} style={{ height: 36, padding: '0 18px', borderRadius: 10, border: '1px solid rgba(201,168,76,.2)', background: 'rgba(201,168,76,.1)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M23 4v6h-6M1 20v-6h6" stroke={C.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke={C.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {T('تحديث', 'Refresh')}
        </button>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 8 }}>
        {[
          { l: T('نشطة', 'Active'), v: stats.active, c: C.gold, bg: 'rgba(201,168,76,.06)' },
          { l: T('حرجة', 'Critical'), v: stats.critical, c: C.red, bg: 'rgba(192,57,43,.06)' },
          { l: T('عاجلة', 'Urgent'), v: stats.urgent, c: '#e67e22', bg: 'rgba(230,126,34,.06)' },
          { l: T('محلولة', 'Resolved'), v: stats.resolved, c: C.ok, bg: 'rgba(39,160,70,.06)' },
        ].map((s, i) => (
          <div key={i} style={{ padding: '12px 14px', borderRadius: 12, background: s.bg, border: `1px solid ${s.c}20` }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--tx5)' }}>{s.l}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.c, marginTop: 2 }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ height: 32, padding: '0 10px', borderRadius: 8, border: '1px solid var(--bd)', background: 'var(--bg)', color: 'var(--tx2)', fontFamily: F, fontSize: 11, fontWeight: 600 }}>
          <option value="all">{T('كل الحالات', 'All Statuses')}</option>
          {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} style={{ height: 32, padding: '0 10px', borderRadius: 8, border: '1px solid var(--bd)', background: 'var(--bg)', color: 'var(--tx2)', fontFamily: F, fontSize: 11, fontWeight: 600 }}>
          <option value="all">{T('كل الأهمية', 'All Severity')}</option>
          {Object.entries(severityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ height: 32, padding: '0 10px', borderRadius: 8, border: '1px solid var(--bd)', background: 'var(--bg)', color: 'var(--tx2)', fontFamily: F, fontSize: 11, fontWeight: 600 }}>
          <option value="all">{T('كل الأنواع', 'All Types')}</option>
          {Object.entries(entityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div style={{ marginRight: 'auto', fontSize: 10, color: 'var(--tx5)' }}>{filtered.length} {T('تنبيه', 'alerts')}</div>
      </div>

      {/* Alerts list */}
      {loading ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--tx5)' }}>...</div> :
        filtered.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--tx5)' }}>{T('لا توجد تنبيهات', 'No alerts')}</div> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(a => {
            const sc = severityColors[a.severity] || C.gold
            const daysText = getDaysText(a.expiry_date)
            return (
              <div key={a.id} style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--bg)', border: `1px solid ${a.severity === 'critical' ? C.red + '30' : 'var(--bd)'}`, display: 'flex', gap: 12, alignItems: 'center' }}>
                {/* Severity dot */}
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: sc, flexShrink: 0, boxShadow: a.severity === 'critical' ? `0 0 8px ${C.red}40` : 'none' }} />
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    {a.entity_name || '—'}
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: sc + '15', color: sc }}>{alertTypeLabels[a.alert_type] || a.alert_type}</span>
                    <span style={{ fontSize: 9, fontWeight: 500, padding: '1px 6px', borderRadius: 4, background: 'rgba(255,255,255,.04)', color: 'var(--tx4)' }}>{entityLabels[a.entity_type] || a.entity_type}</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--tx4)', marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {a.expiry_date && <span>{T('تاريخ الانتهاء:', 'Expires:')} {a.expiry_date}</span>}
                    {daysText && <span style={{ color: sc, fontWeight: 600 }}>{daysText}</span>}
                  </div>
                </div>
                {/* Status */}
                <span style={{ fontSize: 9, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: sc + '12', color: sc, flexShrink: 0 }}>{statusLabels[a.status]}</span>
                {/* Actions */}
                {a.status === 'active' && (
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => snooze(a.id)} title={T('تأجيل 7 أيام', 'Snooze 7 days')} style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: 'var(--tx4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>⏸</button>
                    <button onClick={() => resolve(a.id)} title={T('حل', 'Resolve')} style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(39,160,70,.08)', border: '1px solid rgba(39,160,70,.15)', color: C.ok, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✓</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      }
    </div>
  )
}
