import React, { useEffect, useMemo, useState } from 'react'
import { DateField, Sel } from './KafalaCalculator.jsx'

const F = "'Cairo','Tajawal',sans-serif"
const C = {
  gold: '#D4A017', goldSoft: '#e8c77a',
  blue: '#5dade2', purple: '#bb8fce', cyan: '#16a085', orange: '#f39c12', gray: '#95a5a6',
  ok: '#2ecc71', warn: '#eab308', red: '#e87265',
}
const PAGE = 60
const num = (v) => Number(v || 0).toLocaleString('en-US')
const fmtAmt = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const flagEmoji = (code) => { if (!code || code.length !== 2) return ''; try { return String.fromCodePoint(...[...code.toUpperCase()].map(c => c.charCodeAt(0) + 127397)) } catch { return '' } }

const SVC_THEME = {
  work_visa:      { c: C.blue,    bg: 'rgba(93,173,226,.12)',  bd: 'rgba(93,173,226,.32)',  label_ar: 'تأشيرة عمل',     label_en: 'Work Visa' },
  iqama_issuance: { c: '#27ae60', bg: 'rgba(39,174,96,.12)',   bd: 'rgba(39,174,96,.32)',   label_ar: 'إصدار إقامة',    label_en: 'Iqama Issuance' },
  transfer:       { c: C.orange,  bg: 'rgba(243,156,18,.12)',  bd: 'rgba(243,156,18,.32)',  label_ar: 'نقل كفالة',      label_en: 'Transfer' },
  iqama_renewal:  { c: C.cyan,    bg: 'rgba(22,160,133,.12)',  bd: 'rgba(22,160,133,.32)',   label_ar: 'تجديد الإقامة',  label_en: 'Iqama Renewal' },
  ajeer:          { c: C.purple,  bg: 'rgba(187,143,206,.12)', bd: 'rgba(187,143,206,.32)', label_ar: 'عقد أجير',       label_en: 'Ajeer' },
  other:          { c: C.gold,    bg: 'rgba(212,160,23,.12)',  bd: 'rgba(212,160,23,.32)',  label_ar: 'الغرفة التجارية', label_en: 'Chamber' },
  general:        { c: C.gray,    bg: 'rgba(149,165,166,.12)', bd: 'rgba(149,165,166,.32)', label_ar: 'خدمات أخرى',     label_en: 'Other' },
}
const STATUS_THEME = {
  pending: { c: C.warn, stamp_ar: 'بانتظار السداد', stamp_en: 'PENDING' },
  paid:    { c: C.ok,   stamp_ar: 'تم السداد',      stamp_en: 'PAID' },
  partial: { c: C.gold, stamp_ar: 'جزئي',           stamp_en: 'PARTIAL' },
  skipped: { c: C.gray, stamp_ar: 'متخطى',          stamp_en: 'SKIPPED' },
}

const btnFilter = (active) => ({ height: 44, padding: '0 16px', borderRadius: 12, background: active ? 'rgba(212,160,23,.12)' : 'rgba(0,0,0,.18)', border: '1px solid ' + (active ? 'rgba(212,160,23,.3)' : 'rgba(255,255,255,.05)'), color: active ? C.gold : 'var(--tx2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F, display: 'flex', alignItems: 'center', gap: 8, boxSizing: 'border-box' })

/* ═════════════════════════════════════════════════════════════════════ */
export default function PaymentsPage({ sb, lang, user, branchId, toast }) {
  const isAr = lang !== 'en'
  const T = (a, e) => (isAr ? a : e)

  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [page, setPage] = useState(0)
  const [stats, setStats] = useState({ pending_count: 0, pending_amount: 0, paid_count: 0, paid_amount: 0, today_paid_count: 0, today_paid_amount: 0, week_paid_count: 0, week_paid_amount: 0 })
  const [payMethods, setPayMethods] = useState([])

  // filters
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('pending')
  const [serviceType, setServiceType] = useState('')
  const [feeKind, setFeeKind] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [advOpen, setAdvOpen] = useState(false)
  const [services, setServices] = useState([])
  const [feeKinds, setFeeKinds] = useState([])
  const [feeKindsBreakdown, setFeeKindsBreakdown] = useState([]) // [{code, ar, en, cnt, sum}]

  const [modal, setModal] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)

  /* Lookups */
  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data } = await sb.from('lookup_items')
        .select('id,code,value_ar,value_en,sort_order,category:lookup_categories!inner(category_key)')
        .in('category.category_key', ['service_type', 'transaction_fee_kind', 'payment_method'])
        .order('sort_order')
      if (!alive) return
      const items = data || []
      setServices(items.filter(i => i.category?.category_key === 'service_type'))
      setFeeKinds(items.filter(i => i.category?.category_key === 'transaction_fee_kind'))
      setPayMethods(items.filter(i => i.category?.category_key === 'payment_method'))
    })()
    return () => { alive = false }
  }, [sb])

  /* Stats */
  useEffect(() => {
    let alive = true
    ;(async () => {
      const todayIso = new Date().toISOString().slice(0, 10)
      const weekStart = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)
      const [pendingHead, pendingSum, paidHead, paidSum, todayPaid, weekPaid, breakdown] = await Promise.all([
        sb.from('transaction_fees').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'pending'),
        sb.from('transaction_fees').select('amount').is('deleted_at', null).eq('status', 'pending'),
        sb.from('transaction_fees').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'paid'),
        sb.from('transaction_fees').select('paid_amount').is('deleted_at', null).eq('status', 'paid'),
        sb.from('transaction_fees').select('paid_amount,payment_date').is('deleted_at', null).eq('status', 'paid').gte('payment_date', todayIso + 'T00:00:00').lte('payment_date', todayIso + 'T23:59:59'),
        sb.from('transaction_fees').select('paid_amount,payment_date').is('deleted_at', null).eq('status', 'paid').gte('payment_date', weekStart + 'T00:00:00'),
        sb.from('transaction_fees').select('amount,paid_amount,status,fee_kind:fee_kind_id(code,value_ar,value_en)').is('deleted_at', null).eq('status', 'pending'),
      ])
      if (!alive) return
      setStats({
        pending_count: pendingHead.count || 0,
        pending_amount: (pendingSum.data || []).reduce((s, r) => s + Number(r.amount || 0), 0),
        paid_count: paidHead.count || 0,
        paid_amount: (paidSum.data || []).reduce((s, r) => s + Number(r.paid_amount || 0), 0),
        today_paid_count: (todayPaid.data || []).length,
        today_paid_amount: (todayPaid.data || []).reduce((s, r) => s + Number(r.paid_amount || 0), 0),
        week_paid_count: (weekPaid.data || []).length,
        week_paid_amount: (weekPaid.data || []).reduce((s, r) => s + Number(r.paid_amount || 0), 0),
      })
      // Aggregate pending fees by kind
      const map = {}
      ;(breakdown.data || []).forEach(r => {
        const code = r.fee_kind?.code || 'other'
        if (!map[code]) map[code] = { code, ar: r.fee_kind?.value_ar || 'أخرى', en: r.fee_kind?.value_en || 'Other', cnt: 0, sum: 0 }
        map[code].cnt += 1
        map[code].sum += Number(r.amount || 0)
      })
      setFeeKindsBreakdown(Object.values(map).sort((a, b) => b.cnt - a.cnt).slice(0, 6))
    })()
    return () => { alive = false }
  }, [sb, refreshTick])

  /* List */
  useEffect(() => {
    let alive = true
    setLoading(true); setErr(null)
    ;(async () => {
      let qb = sb.from('transaction_fees').select(`
        id, fee_label_ar, fee_label_en, amount, paid_amount, status,
        sadad_no, payment_date, expiry_date, reference_no, bank_reference, notes, sort_order, created_at,
        fee_kind:fee_kind_id(code,value_ar,value_en),
        payment_method:payment_method_id(code,value_ar,value_en),
        service_request:service_request_id(
          id, request_ref_no, request_date,
          service_type:service_type_id(code,value_ar,value_en),
          status:status_id(code,value_ar,value_en),
          client:client_id(name_ar,name_en,phone,id_number,nationality:nationality_id(code,name_ar,name_en,flag_url)),
          branch:branch_id(id,branch_code)
        )
      `, { count: 'exact' }).is('deleted_at', null)
      if (status) qb = qb.eq('status', status)
      if (feeKind) qb = qb.eq('fee_kind_id', feeKind)
      if (from) qb = qb.gte('created_at', from)
      if (to) qb = qb.lte('created_at', to + 'T23:59:59')
      if (q && q.trim()) qb = qb.or(`sadad_no.ilike.%${q.trim()}%,reference_no.ilike.%${q.trim()}%,bank_reference.ilike.%${q.trim()}%`)
      qb = qb.order('created_at', { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1)

      const { data, count, error } = await qb
      if (!alive) return
      if (error) { setErr(error.message); setLoading(false); return }

      let list = data || []
      if (serviceType) list = list.filter(r => r.service_request?.service_type?.code === serviceType)
      setRows(list); setTotal(count || 0); setLoading(false)
    })()
    return () => { alive = false }
  }, [sb, page, status, feeKind, q, serviceType, from, to, refreshTick])

  /* Group by day */
  const grouped = useMemo(() => {
    const days = {}; const order = []
    for (const r of rows) {
      const iso = (r.status === 'paid' && r.payment_date) ? r.payment_date : r.created_at
      const d = (iso || '').slice(0, 10) || '—'
      if (!days[d]) { days[d] = []; order.push(d) }
      days[d].push(r)
    }
    return { days, order }
  }, [rows])

  const todayStr = new Date().toISOString().slice(0, 10)
  const dayNames = [T('الأحد','Sun'), T('الاثنين','Mon'), T('الثلاثاء','Tue'), T('الأربعاء','Wed'), T('الخميس','Thu'), T('الجمعة','Fri'), T('السبت','Sat')]
  const dayLabel = (k) => k === todayStr ? T('اليوم','Today') : (() => { try { const d = new Date(k + 'T12:00:00'); return dayNames[d.getDay()] } catch { return k } })()
  const dayFull = (k) => { try { const d = new Date(k + 'T12:00:00'); return d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0') } catch { return k } }

  const totalPages = Math.max(1, Math.ceil(total / PAGE))

  return (
    <div style={{ fontFamily: F, paddingTop: 0 }}>
      {/* Hero */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px', lineHeight: 1.2 }}>{T('المدفوعات','Payments')}</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>{T('سداد رسوم المعاملات (تأمينات / قوى / مقيم / سداد)','Office fee payments per transaction stage')}</div>
      </div>

      {/* Stats — Hero + Sidebar + Fee kinds */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 1.5fr', gap: 14, marginBottom: 24 }}>
        {/* Hero — Today's Paid */}
        <div style={{
          position: 'relative', padding: '18px 22px', borderRadius: 16,
          background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
          border: '1px solid rgba(255,255,255,.05)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          overflow: 'hidden', minHeight: 150,
        }}>
          <div style={{ position: 'absolute', insetInlineStart: -60, top: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${C.ok}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.ok, boxShadow: `0 0 10px ${C.ok}aa` }} />
            <span style={{ fontSize: 24, color: '#fff', fontWeight: 600, letterSpacing: '.2px' }}>{T('مدفوع اليوم','Paid Today')}</span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 7, justifyContent: 'flex-start', direction: 'ltr' }}>
            <span style={{ fontSize: 42, fontWeight: 800, color: C.ok, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{fmtAmt(stats.today_paid_amount)}</span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)' }}>
            <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600 }}>{T('عدد المدفوعات','Payments')}</span>
            <span style={{ fontSize: 13, color: C.ok, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(stats.today_paid_count)}</span>
          </div>
        </div>

        {/* Sidebar — Pending + Week paid */}
        <div style={{
          borderRadius: 16,
          background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
          border: '1px solid rgba(255,255,255,.05)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 150,
        }}>
          {[
            { label: T('بانتظار السداد','Pending'), val: stats.pending_amount, cnt: stats.pending_count, c: C.warn },
            { label: T('مدفوع آخر 7 أيام','Last 7d Paid'), val: stats.week_paid_amount, cnt: stats.week_paid_count, c: C.blue },
          ].map((s, i) => (
            <div key={i} style={{
              position: 'relative', padding: '12px 16px', flex: 1,
              borderTop: i > 0 ? '1px solid rgba(255,255,255,.06)' : 'none',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 6,
              overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', insetInlineStart: -25, top: '50%', transform: 'translateY(-50%)', width: 70, height: 70, borderRadius: '50%', background: `radial-gradient(circle, ${s.c}10 0%, transparent 70%)`, pointerEvents: 'none' }} />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 5 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.c }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>{s.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>({num(s.cnt)})</span>
                </div>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', direction: 'ltr' }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: s.c, fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-.5px' }}>{fmtAmt(s.val)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Fee kinds breakdown — pending */}
        {(() => {
          const totCnt = feeKindsBreakdown.reduce((s, k) => s + k.cnt, 0)
          const max = Math.max(...feeKindsBreakdown.map(k => k.cnt), 1)
          return (
            <div style={{
              borderRadius: 16,
              background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
              border: '1px solid rgba(255,255,255,.05)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
              padding: '12px 16px',
              display: 'flex', flexDirection: 'column', gap: 10, minHeight: 150,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>{T('أنواع الرسوم — بانتظار السداد','Fee Kinds — Pending')}</span>
                <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>
                  <span style={{ color: C.warn, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(totCnt)}</span> {T('رسم','fee')}
                </span>
              </div>
              {totCnt > 0 ? (
                <>
                  <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,.04)' }}>
                    {feeKindsBreakdown.map((k, i) => {
                      const palette = [C.gold, C.blue, C.cyan, C.purple, C.orange, C.gray]
                      const c = palette[i % palette.length]
                      return <div key={k.code} title={`${k.ar}: ${k.cnt}`} style={{ width: (k.cnt / Math.max(1, totCnt)) * 100 + '%', background: c, transition: 'width .3s' }} />
                    })}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px 16px' }}>
                    {feeKindsBreakdown.map((k, i) => {
                      const palette = [C.gold, C.blue, C.cyan, C.purple, C.orange, C.gray]
                      const c = palette[i % palette.length]
                      return (
                        <div key={k.code} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 600 }}>
                          <span style={{ color: c, fontVariantNumeric: 'tabular-nums', direction: 'ltr', minWidth: 20, textAlign: 'center', flexShrink: 0, fontWeight: 700 }}>{num(k.cnt)}</span>
                          <span style={{ color: 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isAr ? k.ar : k.en}</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx5)', fontSize: 12, fontWeight: 600 }}>{T('لا توجد رسوم بانتظار السداد','No pending fees')}</div>
              )}
            </div>
          )
        })()}
      </div>

      {/* Filter row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', color: 'var(--tx4)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            placeholder={T('ابحث برقم سداد / مرجع بنكي…','Search by SADAD / bank reference…')}
            value={q}
            onChange={e => { setQ(e.target.value); setPage(0) }}
            style={{ width: '100%', height: 44, padding: '0 14px 0 38px', borderRadius: 12, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', color: '#fff', fontSize: 13, fontFamily: F, boxSizing: 'border-box' }}
          />
        </div>
        {(() => {
          const hasFilters = !!(status !== 'pending' || serviceType || feeKind || from || to)
          const clearAll = () => { setStatus('pending'); setServiceType(''); setFeeKind(''); setFrom(''); setTo(''); setPage(0) }
          return (
            <button onClick={() => setAdvOpen(o => !o)} style={btnFilter(advOpen || hasFilters)}>
              {T('تصفية','Filter')}
              {hasFilters ? (
                <span
                  role="button" tabIndex={0}
                  title={T('مسح الفلاتر','Clear filters')}
                  onClick={e => { e.stopPropagation(); clearAll() }}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); clearAll() } }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.red; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.gold; e.currentTarget.style.color = '#000' }}
                  style={{ background: C.gold, color: '#000', width: 18, height: 18, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '.18s' }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </span>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="14" y2="6"/><line x1="18" y1="6" x2="20" y2="6"/><circle cx="16" cy="6" r="2"/><line x1="4" y1="12" x2="8" y2="12"/><line x1="12" y1="12" x2="20" y2="12"/><circle cx="10" cy="12" r="2"/><line x1="4" y1="18" x2="16" y2="18"/><line x1="20" y1="18" x2="20" y2="18"/><circle cx="18" cy="18" r="2"/></svg>
              )}
            </button>
          )
        })()}
      </div>

      {/* Advanced filter panel */}
      {advOpen && (() => {
        const fLbl = { fontSize: 12, fontWeight: 500, color: 'var(--tx3)', paddingInlineStart: 2, marginBottom: 7 }
        return (
          <div style={{ marginBottom: 22, padding: '16px 18px', background: 'var(--modal-bg)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.04)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
              <div>
                <div style={fLbl}>{T('الحالة','Status')}</div>
                <Sel value={status} onChange={v => { setStatus(v); setPage(0) }} placeholder={T('الكل','All')} options={[
                  { v: '', l: T('الكل','All') },
                  { v: 'pending', l: T('بانتظار السداد','Pending') },
                  { v: 'paid', l: T('تم السداد','Paid') },
                  { v: 'partial', l: T('جزئي','Partial') },
                  { v: 'skipped', l: T('متخطى','Skipped') },
                ]} />
              </div>
              <div>
                <div style={fLbl}>{T('نوع المعاملة','Service Type')}</div>
                <Sel value={serviceType} onChange={v => { setServiceType(v); setPage(0) }} placeholder={T('الكل','All')} options={[{ v: '', l: T('الكل','All') }, ...services.map(s => ({ v: s.code, l: isAr ? s.value_ar : (s.value_en || s.value_ar) }))]} />
              </div>
              <div>
                <div style={fLbl}>{T('نوع الرسم','Fee Kind')}</div>
                <Sel value={feeKind} onChange={v => { setFeeKind(v); setPage(0) }} placeholder={T('الكل','All')} options={[{ v: '', l: T('الكل','All') }, ...feeKinds.map(k => ({ v: k.id, l: isAr ? k.value_ar : (k.value_en || k.value_ar) }))]} />
              </div>
              <div>
                <div style={fLbl}>{T('تاريخ من','Date From')}</div>
                <DateField value={from} onChange={v => { setFrom(v); setPage(0) }} lang={lang} />
              </div>
              <div>
                <div style={fLbl}>{T('تاريخ إلى','Date To')}</div>
                <DateField value={to} onChange={v => { setTo(v); setPage(0) }} lang={lang} />
              </div>
            </div>
          </div>
        )
      })()}

      {/* List */}
      {loading && <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx4)', fontSize: 13 }}>…</div>}
      {!loading && err && <div style={{ padding: 60, textAlign: 'center', color: C.red, fontSize: 13 }}>{err}</div>}
      {!loading && !err && rows.length === 0 && (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx4)', fontSize: 13, border: '1px dashed rgba(255,255,255,.08)', borderRadius: 14 }}>
          {T('لا توجد سجلات مطابقة','No matching records')}
        </div>
      )}

      {!loading && !err && grouped.order.map(dayKey => {
        const dayRows = grouped.days[dayKey]
        const dayTotal = dayRows.reduce((s, r) => s + Number(r.amount || 0), 0)
        const dayPaid = dayRows.reduce((s, r) => s + Number(r.paid_amount || 0), 0)
        return (
          <div key={dayKey} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: dayKey === todayStr ? C.gold : 'var(--tx2)' }}>{dayLabel(dayKey)}</span>
                <span style={{ fontSize: 12, color: 'var(--tx4)', fontVariantNumeric: 'tabular-nums', direction: 'ltr' }}>{dayFull(dayKey)}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--tx3)', display: 'flex', gap: 16, fontWeight: 600 }}>
                <span>{num(dayRows.length)} {T('رسم','fees')}</span>
                <span style={{ color: C.gold, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{fmtAmt(dayTotal)}</span>
                {dayPaid > 0 && <span style={{ color: C.ok, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>+ {fmtAmt(dayPaid)}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dayRows.map(fee => <FeeCard key={fee.id} fee={fee} isAr={isAr} T={T} onPay={() => setModal({ fee, action: 'pay' })} onEdit={() => setModal({ fee, action: 'edit' })} />)}
            </div>
          </div>
        )
      })}

      {/* Pagination */}
      {!loading && total > PAGE && (() => {
        const goPrev = () => { setPage(p => Math.max(0, p - 1)); document.querySelector('.dash-content')?.scrollTo({ top: 0, behavior: 'smooth' }) }
        const goNext = () => { setPage(p => p + 1); document.querySelector('.dash-content')?.scrollTo({ top: 0, behavior: 'smooth' }) }
        const goTo = n => { setPage(Math.max(0, Math.min(totalPages - 1, n))); document.querySelector('.dash-content')?.scrollTo({ top: 0, behavior: 'smooth' }) }
        const fromN = (page * PAGE) + 1
        const toN = Math.min(total, (page + 1) * PAGE)
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,.06)', margin: '4px 4px 14px' }}>
            <style>{`
              .pay-pg-btn{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);border:none;color:${C.gold};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:.2s;font-family:${F}}
              .pay-pg-btn:hover:not(:disabled){background:${C.gold};color:#000}
              .pay-pg-btn:disabled{cursor:not-allowed;color:var(--tx4);background:rgba(255,255,255,.06)}
              .pay-pg-input{width:42px;height:32px;background:transparent;border:none;outline:none;color:${C.gold};font-family:${F};font-size:14px;font-weight:700;text-align:center;direction:ltr;-moz-appearance:textfield;font-variant-numeric:tabular-nums}
              .pay-pg-input::-webkit-outer-spin-button,.pay-pg-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
            `}</style>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 13, color: '#fff', fontWeight: 700, fontFamily: F }}><span style={{ color: C.gold }}>{fromN}–{toN}</span> {T('من','of')} {num(total)}</span>
              <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 500, fontFamily: F }}>{T('صفحة','Page')} {page + 1} {T('من','of')} {totalPages}</span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <button className="pay-pg-btn" disabled={page === 0} onClick={goPrev} aria-label={T('السابق','Prev')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              <input className="pay-pg-input" type="number" min={1} max={totalPages} value={page + 1} onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) goTo(v - 1) }} />
              <button className="pay-pg-btn" disabled={page + 1 >= totalPages} onClick={goNext} aria-label={T('التالي','Next')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
            </div>
          </div>
        )
      })()}

      {/* Pay modal */}
      {modal && <PayModal sb={sb} fee={modal.fee} action={modal.action} payMethods={payMethods} isAr={isAr} T={T} toast={toast} userId={user?.id}
                          onClose={() => setModal(null)} onSaved={() => { setModal(null); setRefreshTick(t => t + 1) }} />}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
function FeeCard({ fee, isAr, T, onPay, onEdit }) {
  const sr = fee.service_request
  const svc = SVC_THEME[sr?.service_type?.code || 'general'] || SVC_THEME.general
  const stT = STATUS_THEME[fee.status] || STATUS_THEME.pending
  const total = Number(fee.amount || 0)
  const paid = Number(fee.paid_amount || 0)
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : (fee.status === 'paid' ? 100 : 0)
  const feeLabel = isAr ? (fee.fee_label_ar || fee.fee_kind?.value_ar) : (fee.fee_label_en || fee.fee_kind?.value_en)
  const phone = sr?.client?.phone
  const nat = sr?.client?.nationality
  const fl = nat?.flag_url
  const em = flagEmoji(nat?.code)

  return (
    <div className="pay-card" style={{
      position: 'relative',
      borderRadius: 14,
      background: 'radial-gradient(ellipse at top, rgba(212,160,23,.06) 0%, #222 60%)',
      border: '1px solid rgba(255,255,255,.05)',
      boxShadow: '0 4px 14px rgba(0,0,0,.22)',
      overflow: 'hidden', transition: 'all .15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = stT.c + '55' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.05)' }}
    >
      <div style={{ padding: '16px 22px 14px 18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 200px', gap: 18, alignItems: 'center' }}>
          {/* Right: client + service + fee info */}
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
            {/* Name row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {fl ? <img src={fl} alt={nat?.name_ar || ''} title={nat?.name_ar || ''} style={{ width: 30, height: 21, objectFit: 'cover', flexShrink: 0, borderRadius: 3 }} /> : (em ? <span title={nat?.name_ar || ''} style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{em}</span> : null)}
              <span style={{ fontSize: 17, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, letterSpacing: '-.2px' }}>
                {sr?.client?.name_ar || sr?.client?.name_en || T('— بدون عميل —','— no client —')}
              </span>
            </div>

            {/* Sub line: service + ref + branch + phone */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 6, background: svc.bg, border: '1px solid ' + svc.bd, color: svc.c, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {isAr ? svc.label_ar : svc.label_en}
              </span>
              {sr?.request_ref_no && (
                <span title={T('رقم المعاملة','Transaction ref')} style={{ fontSize: 11, color: 'var(--tx3)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
                  <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>{sr.request_ref_no}</span>
                </span>
              )}
              {phone && (
                <a href={`tel:${phone}`} onClick={e => e.stopPropagation()} title={phone} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--tx3)', direction: 'ltr', textDecoration: 'none', padding: '2px 6px', borderRadius: 5, fontWeight: 600 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  {String(phone).replace(/^966/, '0')}
                </a>
              )}
              {sr?.branch?.branch_code && (
                <span title={T('المكتب','Branch')} style={{ marginInlineStart: 'auto', fontSize: 11, color: 'var(--tx3)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
                  {sr.branch.branch_code}
                </span>
              )}
            </div>

            {/* Fee label + paid info */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: stT.c, fontWeight: 700 }}>{feeLabel || T('رسم غير محدد','Unspecified fee')}</span>
              {fee.status === 'paid' && fee.sadad_no && (
                <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, direction: 'ltr', fontFamily: 'monospace' }}>SADAD: {fee.sadad_no}</span>
              )}
              {fee.status === 'paid' && fee.payment_date && (
                <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
                  {(() => { try { const d = new Date(fee.payment_date); return d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0') } catch { return '' } })()}
                </span>
              )}
              {fee.status === 'paid' && fee.payment_method && (
                <span style={{ fontSize: 11, color: C.ok, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: 'rgba(46,204,113,.1)', border: '1px solid rgba(46,204,113,.28)' }}>
                  {isAr ? fee.payment_method.value_ar : fee.payment_method.value_en}
                </span>
              )}
            </div>
          </div>

          {/* Vertical divider */}
          <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,.06)', minHeight: 60 }} />

          {/* Left: amount block */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600, letterSpacing: '.3px', textTransform: 'uppercase' }}>{T('المبلغ','Amount')}</span>
              <span style={{ fontSize: 10, color: stT.c, fontWeight: 800, letterSpacing: '.3px', textTransform: 'uppercase' }}>{isAr ? stT.stamp_ar : stT.stamp_en}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums', direction: 'ltr', letterSpacing: '-.5px', lineHeight: 1 }}>
              {total > 0 ? fmtAmt(total) : <span style={{ fontSize: 13, color: 'var(--tx5)' }}>{T('أدخل المبلغ','Set amount')}</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,.06)' }}>
              {fee.status === 'paid' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                    <span style={{ color: 'var(--tx4)', fontWeight: 600 }}>{T('المسدّد','Paid')}</span>
                    <span style={{ color: C.ok, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>+ {fmtAmt(paid)}</span>
                  </div>
                  <button onClick={onEdit} style={{ marginTop: 4, height: 28, borderRadius: 7, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)', color: 'var(--tx3)', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: F }}>{T('تعديل','Edit')}</button>
                </>
              ) : (
                <button onClick={onPay} style={{ height: 32, padding: '0 12px', borderRadius: 8, border: '1px solid rgba(46,204,113,.5)', background: 'linear-gradient(180deg,rgba(46,204,113,.22) 0%,rgba(46,204,113,.10) 100%)', color: C.ok, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: F, fontSize: 12, fontWeight: 700 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {T('تم السداد','Mark Paid')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Progress strip */}
      <div style={{ height: 5, background: 'rgba(255,255,255,.05)' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: stT.c, transition: 'width .3s' }} />
      </div>
    </div>
  )
}

/* ═════════════ Pay modal (preserved with Invoice-style chrome) ═════════════ */
function PayModal({ sb, fee, action, payMethods, isAr, T, toast, userId, onClose, onSaved }) {
  const init = {
    amount: fee.amount || '',
    sadad_no: fee.sadad_no || '',
    payment_method_code: fee.payment_method?.code || 'cash',
    bank_reference: fee.bank_reference || '',
    payment_date: fee.payment_date ? fee.payment_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    expiry_date: fee.expiry_date || '',
    reference_no: fee.reference_no || '',
    notes: fee.notes || '',
  }
  const [v, setV] = useState(init)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, val) => setV(p => ({ ...p, [k]: val }))

  const submit = async () => {
    setSaving(true); setErr('')
    try {
      const amt = Number(v.amount) || 0
      if (amt <= 0) { setErr(T('أدخل المبلغ','Enter the amount')); setSaving(false); return }
      const pm = payMethods.find(p => p.code === v.payment_method_code) || null
      const upd = {
        amount: amt, paid_amount: amt, status: 'paid',
        sadad_no: v.sadad_no || null, bank_reference: v.bank_reference || null,
        payment_method_id: pm?.id || null,
        payment_date: v.payment_date ? new Date(v.payment_date).toISOString() : new Date().toISOString(),
        expiry_date: v.expiry_date || null, reference_no: v.reference_no || null, notes: v.notes || null,
      }
      const { error } = await sb.from('transaction_fees').update(upd).eq('id', fee.id)
      if (error) throw error
      toast?.(T('تم تسجيل السداد','Payment recorded'))
      onSaved()
    } catch (e) {
      setErr(e.message || T('حدث خطأ','Error'))
      setSaving(false)
    }
  }

  const sr = fee.service_request
  const svc = SVC_THEME[sr?.service_type?.code || 'general'] || SVC_THEME.general
  const feeLabel = isAr ? (fee.fee_label_ar || fee.fee_kind?.value_ar) : (fee.fee_label_en || fee.fee_kind?.value_en)
  const fS = { width: '100%', height: 42, padding: '0 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.07)', background: 'linear-gradient(180deg,#323232 0%,#262626 100%)', color: 'var(--tx)', fontFamily: F, fontSize: 13, fontWeight: 500, outline: 'none', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)', boxSizing: 'border-box' }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(14,14,14,.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, fontFamily: F, direction: 'rtl' }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 560, maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        borderRadius: 16, background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
        border: '1px solid rgba(255,255,255,.06)', boxShadow: '0 24px 80px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.06)',
      }}>
        <div style={{ height: 3, background: `linear-gradient(90deg,transparent,${C.gold} 30%,${C.goldSoft} 50%,${C.gold} 70%,transparent)` }} />
        <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,.93)' }}>{action === 'edit' ? T('تعديل السداد','Edit Payment') : T('تسجيل السداد','Record Payment')}</div>
            <div style={{ fontSize: 11, color: 'var(--tx4)', marginTop: 4 }}>
              <span style={{ color: svc.c, fontWeight: 700 }}>{isAr ? svc.label_ar : svc.label_en}</span>
              {' · '}<span style={{ color: 'var(--tx2)', fontWeight: 600 }}>{feeLabel}</span>
              {sr?.client?.name_ar && <> {' · '} {sr.client.name_ar}</>}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)', border: '1px solid rgba(255,255,255,.06)', color: 'var(--tx3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx3)', marginBottom: 6 }}>{T('المبلغ (ريال)','Amount (SAR)')}<span style={{ color: C.red }}> *</span></div>
              <input style={{ ...fS, direction: 'ltr', textAlign: 'center' }} type="number" step="0.01" min="0" value={v.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx3)', marginBottom: 6 }}>{T('طريقة الدفع','Payment Method')}</div>
              <Sel value={v.payment_method_code} onChange={val => set('payment_method_code', val)} placeholder={T('اختر','Select')} options={payMethods.length ? payMethods.map(p => ({ v: p.code, l: isAr ? p.value_ar : (p.value_en || p.value_ar) })) : [{ v: 'cash', l: T('نقدي','Cash') }]} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx3)', marginBottom: 6 }}>{T('رقم سداد','SADAD No')}</div>
              <input style={{ ...fS, direction: 'ltr', fontFamily: 'monospace' }} value={v.sadad_no} onChange={e => set('sadad_no', e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx3)', marginBottom: 6 }}>{T('مرجع بنكي','Bank Reference')}</div>
              <input style={{ ...fS, direction: 'ltr', fontFamily: 'monospace' }} value={v.bank_reference} onChange={e => set('bank_reference', e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx3)', marginBottom: 6 }}>{T('تاريخ الدفع','Payment Date')}</div>
              <DateField value={v.payment_date} onChange={val => set('payment_date', val)} lang={isAr ? 'ar' : 'en'} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx3)', marginBottom: 6 }}>{T('تاريخ الانتهاء','Expiry')}</div>
              <DateField value={v.expiry_date} onChange={val => set('expiry_date', val)} lang={isAr ? 'ar' : 'en'} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx3)', marginBottom: 6 }}>{T('رقم مرجعي (إقامة/كرت)','Reference No (Iqama/WP)')}</div>
              <input style={{ ...fS, direction: 'ltr', fontFamily: 'monospace' }} value={v.reference_no} onChange={e => set('reference_no', e.target.value)} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx3)', marginBottom: 6 }}>{T('ملاحظات','Notes')}</div>
              <textarea rows={3} style={{ ...fS, height: 'auto', padding: 12, resize: 'vertical' }} value={v.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>
        </div>

        {err && <div style={{ padding: '10px 22px', color: C.red, fontSize: 12, fontWeight: 600 }}>{err}</div>}

        <div style={{ padding: '14px 22px', borderTop: '1px solid rgba(255,255,255,.07)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ height: 42, padding: '0 18px', borderRadius: 11, border: '1px solid rgba(255,255,255,.06)', background: 'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)', color: 'rgba(255,255,255,.78)', fontFamily: F, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>{T('إلغاء','Cancel')}</button>
          <button onClick={submit} disabled={saving} style={{ height: 42, padding: '0 22px', borderRadius: 11, border: '1px solid rgba(46,204,113,.5)', background: 'linear-gradient(180deg,rgba(46,204,113,.22) 0%,rgba(46,204,113,.10) 100%)', color: C.ok, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: F, fontSize: 12, fontWeight: 700, opacity: saving ? .6 : 1 }}>
            {saving ? '...' : T('حفظ السداد','Save Payment')}
          </button>
        </div>
      </div>
    </div>
  )
}
