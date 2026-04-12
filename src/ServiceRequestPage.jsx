import React, { useState, useEffect, useCallback } from 'react'

const C = { dk:'#171717', gold:'#c9a84c', gl:'#dcc06e', red:'#c0392b', blue:'#3483b4', ok:'#27a046' }
const F = "'Cairo','Tajawal',sans-serif"
const fS = { width:'100%', height:42, padding:'0 14px', border:'1.5px solid rgba(255,255,255,.12)', borderRadius:10, fontFamily:F, fontSize:13, fontWeight:600, color:'var(--tx)', outline:'none', background:'rgba(255,255,255,.06)', textAlign:'right' }

export default function ServiceRequestPage({ sb, toast, user, lang, branchId, onClose }) {
  const T = (ar, en) => lang === 'ar' ? ar : en
  const [step, setStep] = useState(1)
  const [serviceTypes, setServiceTypes] = useState([])
  const [clients, setClients] = useState([])
  const [workers, setWorkers] = useState([])
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(false)
  const [f, setF] = useState({
    service_type: '', client_id: '', worker_id: '', facility_id: '',
    priority: 'normal', notes: '', contact_phone: '', expected_date: ''
  })

  useEffect(() => {
    Promise.all([
      sb.from('transaction_types').select('id,code,name_ar,name_en,category').eq('is_active', true).order('sort_order'),
      sb.from('clients').select('id,name_ar,phone').is('deleted_at', null).order('name_ar'),
      sb.from('workers').select('id,name_ar,iqama_number').is('deleted_at', null).eq('worker_status', 'active').order('name_ar'),
      sb.from('facilities').select('id,name_ar,unified_national_number').is('deleted_at', null).eq('facility_status', 'active').order('name_ar')
    ]).then(([types, cli, wrk, fac]) => {
      setServiceTypes(types.data || [])
      setClients(cli.data || [])
      setWorkers(wrk.data || [])
      setFacilities(fac.data || [])
    })
  }, [sb])

  const categories = [...new Set((serviceTypes).map(s => s.category || 'عام'))]

  const submit = async () => {
    if (!f.service_type) { toast(T('يرجى اختيار نوع الخدمة', 'Please select a service type')); return }
    if (!f.client_id) { toast(T('يرجى اختيار العميل', 'Please select a client')); return }
    setLoading(true)
    try {
      const typeObj = serviceTypes.find(s => s.id === f.service_type)
      const { error } = await sb.from('transactions').insert({
        transaction_type_id: f.service_type,
        client_id: f.client_id || null,
        worker_id: f.worker_id || null,
        facility_id: f.facility_id || null,
        priority: f.priority,
        notes: f.notes,
        status: 'new',
        source: 'service_request',
        branch_id: branchId || user?.branch_id || null,
        created_by: user?.id,
        assigned_to: user?.id
      })
      if (error) throw error
      toast(T('تم رفع الطلب بنجاح', 'Request submitted successfully'))
      if (onClose) onClose()
    } catch (e) {
      toast(T('خطأ: ', 'Error: ') + e.message)
    }
    setLoading(false)
  }

  const sectionStyle = { display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 24px' }
  const labelStyle = { fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }
  const catColors = { workers: C.blue, finance: C.gold, facilities: C.ok, general: '#9b59b6' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Step indicator */}
      <div style={{ padding: '16px 24px', display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
        {[1, 2, 3].map(s => (
          <React.Fragment key={s}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: step >= s ? 'rgba(201,168,76,.15)' : 'rgba(255,255,255,.04)', border: `1.5px solid ${step >= s ? 'rgba(201,168,76,.3)' : 'rgba(255,255,255,.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: step >= s ? C.gold : 'var(--tx5)', transition: '.2s' }}>
              {step > s ? '✓' : s}
            </div>
            {s < 3 && <div style={{ flex: 1, height: 2, borderRadius: 1, background: step > s ? 'rgba(201,168,76,.2)' : 'rgba(255,255,255,.04)', transition: '.2s' }} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Choose service type */}
      {step === 1 && (
        <div style={sectionStyle}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)', marginBottom: 4 }}>{T('اختر نوع الخدمة', 'Choose Service Type')}</div>
          {categories.map(cat => (
            <div key={cat}>
              <div style={{ fontSize: 10, fontWeight: 700, color: catColors[cat] || 'var(--tx4)', marginBottom: 6, textTransform: 'uppercase' }}>{cat}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 6 }}>
                {serviceTypes.filter(s => (s.category || 'عام') === cat).map(s => (
                  <div key={s.id} onClick={() => { setF(p => ({ ...p, service_type: s.id })); setStep(2) }}
                    style={{ padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${f.service_type === s.id ? 'rgba(201,168,76,.3)' : 'rgba(255,255,255,.06)'}`, background: f.service_type === s.id ? 'rgba(201,168,76,.06)' : 'rgba(255,255,255,.02)', cursor: 'pointer', transition: '.15s' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: f.service_type === s.id ? C.gold : 'var(--tx2)' }}>{s.name_ar}</div>
                    {s.name_en && <div style={{ fontSize: 9, color: 'var(--tx5)', marginTop: 2 }}>{s.name_en}</div>}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {serviceTypes.length === 0 && <div style={{ textAlign: 'center', padding: 30, color: 'var(--tx5)', fontSize: 12 }}>{T('لا توجد أنواع خدمات', 'No service types found')}</div>}
        </div>
      )}

      {/* Step 2: Fill details */}
      {step === 2 && (
        <div style={sectionStyle}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)', marginBottom: 4 }}>{T('بيانات الطلب', 'Request Details')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={labelStyle}>{T('العميل', 'Client')} *</div>
              <select value={f.client_id} onChange={e => setF(p => ({ ...p, client_id: e.target.value }))} style={fS}>
                <option value="">{T('اختر العميل...', 'Select client...')}</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
              </select>
            </div>
            <div>
              <div style={labelStyle}>{T('المنشأة', 'Facility')}</div>
              <select value={f.facility_id} onChange={e => setF(p => ({ ...p, facility_id: e.target.value }))} style={fS}>
                <option value="">{T('اختياري...', 'Optional...')}</option>
                {facilities.map(fac => <option key={fac.id} value={fac.id}>{fac.name_ar}</option>)}
              </select>
            </div>
            <div>
              <div style={labelStyle}>{T('العامل', 'Worker')}</div>
              <select value={f.worker_id} onChange={e => setF(p => ({ ...p, worker_id: e.target.value }))} style={fS}>
                <option value="">{T('اختياري...', 'Optional...')}</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.name_ar} — {w.iqama_number}</option>)}
              </select>
            </div>
            <div>
              <div style={labelStyle}>{T('الأولوية', 'Priority')}</div>
              <select value={f.priority} onChange={e => setF(p => ({ ...p, priority: e.target.value }))} style={fS}>
                <option value="low">{T('منخفضة', 'Low')}</option>
                <option value="normal">{T('عادية', 'Normal')}</option>
                <option value="high">{T('عالية', 'High')}</option>
                <option value="urgent">{T('عاجلة', 'Urgent')}</option>
              </select>
            </div>
            <div>
              <div style={labelStyle}>{T('جوال التواصل', 'Contact Phone')}</div>
              <input value={f.contact_phone} onChange={e => setF(p => ({ ...p, contact_phone: e.target.value }))} style={{ ...fS, direction: 'ltr', textAlign: 'center' }} placeholder="05xxxxxxxx" />
            </div>
            <div>
              <div style={labelStyle}>{T('التاريخ المتوقع', 'Expected Date')}</div>
              <input type="date" value={f.expected_date} onChange={e => setF(p => ({ ...p, expected_date: e.target.value }))} style={{ ...fS, direction: 'ltr', textAlign: 'center' }} />
            </div>
          </div>
          <div>
            <div style={labelStyle}>{T('ملاحظات', 'Notes')}</div>
            <textarea value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} style={{ ...fS, height: 70, padding: '10px 14px', resize: 'none' }} placeholder={T('تفاصيل إضافية...', 'Additional details...')} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={() => setStep(1)} style={{ height: 38, padding: '0 18px', borderRadius: 10, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: 'var(--tx3)', fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{T('رجوع', 'Back')}</button>
            <button onClick={() => { if (!f.client_id) { toast(T('يرجى اختيار العميل', 'Select a client')); return } setStep(3) }} style={{ height: 38, padding: '0 24px', borderRadius: 10, background: 'rgba(201,168,76,.12)', border: '1px solid rgba(201,168,76,.2)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{T('التالي', 'Next')}</button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && (
        <div style={sectionStyle}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)', marginBottom: 4 }}>{T('مراجعة وتأكيد', 'Review & Confirm')}</div>
          <div style={{ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              [T('الخدمة', 'Service'), serviceTypes.find(s => s.id === f.service_type)?.name_ar || '—'],
              [T('العميل', 'Client'), clients.find(c => c.id === f.client_id)?.name_ar || '—'],
              [T('المنشأة', 'Facility'), f.facility_id ? facilities.find(fac => fac.id === f.facility_id)?.name_ar : '—'],
              [T('العامل', 'Worker'), f.worker_id ? workers.find(w => w.id === f.worker_id)?.name_ar : '—'],
              [T('الأولوية', 'Priority'), { low: T('منخفضة', 'Low'), normal: T('عادية', 'Normal'), high: T('عالية', 'High'), urgent: T('عاجلة', 'Urgent') }[f.priority]],
              [T('ملاحظات', 'Notes'), f.notes || '—'],
            ].map(([label, val], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < 5 ? '1px solid rgba(255,255,255,.03)' : 'none' }}>
                <span style={{ fontSize: 11, color: 'var(--tx4)' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)' }}>{val}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={() => setStep(2)} style={{ height: 38, padding: '0 18px', borderRadius: 10, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: 'var(--tx3)', fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{T('رجوع', 'Back')}</button>
            <button onClick={submit} disabled={loading} style={{ height: 38, padding: '0 28px', borderRadius: 10, background: C.gold, border: 'none', color: C.dk, fontFamily: F, fontSize: 12, fontWeight: 800, cursor: loading ? 'wait' : 'pointer', opacity: loading ? .6 : 1 }}>{loading ? '...' : T('تأكيد ورفع الطلب', 'Submit Request')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
