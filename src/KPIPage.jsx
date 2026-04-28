import React, { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const F = "'Cairo','Tajawal',sans-serif"
const C = { dk: '#171717', md: '#222222', fm: '#1e1e1e', gold: '#D4A017', gl: '#dcc06e', red: '#c0392b', blue: '#3483b4', ok: '#27a046' }
const num = v => Number(v || 0).toLocaleString('en-US')

const GLASS = {
  background: 'linear-gradient(160deg,#333 0%,#2A2A2A 50%,#232323 100%)',
  backdropFilter: 'blur(20px) saturate(160%)',
  WebkitBackdropFilter: 'blur(20px) saturate(160%)',
  border: '1px solid rgba(255,255,255,.08)',
  borderRadius: 16,
  boxShadow: '0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)',
}

export default function KPIPage({ sb, toast, user, lang }) {
  const isAr = lang !== 'en'
  const T = (a, e) => isAr ? a : e

  const [targets, setTargets] = useState([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [branches, setBranches] = useState([])
  const [branchFilter, setBranchFilter] = useState(null)
  const [editPop, setEditPop] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState([])

  const METRICS = [
    { key: 'revenue', l: T('الإيرادات', 'Revenue'), unit: 'currency', icon: '◎', color: C.gold },
    { key: 'collection', l: T('التحصيل', 'Collection'), unit: 'currency', icon: '◉', color: C.ok },
    { key: 'transactions_completed', l: T('المعاملات المكتملة', 'Transactions'), unit: 'number', icon: '▣', color: C.blue },
    { key: 'new_clients', l: T('عملاء جدد', 'New Clients'), unit: 'number', icon: '◈', color: '#9b59b6' },
    { key: 'expenses_limit', l: T('سقف المصاريف', 'Expenses Limit'), unit: 'currency', icon: '▤', color: C.red, invert: true },
    { key: 'invoices_issued', l: T('فواتير مُصدرة', 'Invoices Issued'), unit: 'number', icon: '▥', color: '#e67e22' },
  ]

  const load = useCallback(async () => {
    setLoading(true)
    const monthDate = month + '-01'
    const q = sb.from('monthly_targets').select('*').eq('target_month', monthDate)
    if (branchFilter) q.eq('branch_id', branchFilter)
    else q.is('branch_id', null)
    const { data } = await q.order('metric_key')
    setTargets(data || [])

    // تحميل الفروع
    const { data: br } = await sb.from('branches').select('id,name_ar').is('deleted_at', null).order('name_ar')
    setBranches(br || [])

    // تحميل بيانات آخر 6 أشهر للرسم البياني
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const { data: hist } = await sb.from('monthly_targets')
      .select('target_month,metric_key,target_value,actual_value')
      .gte('target_month', sixMonthsAgo.toISOString().slice(0, 10))
      .is('branch_id', branchFilter || null)
      .order('target_month')
    setHistory(hist || [])

    setLoading(false)
  }, [sb, month, branchFilter])

  useEffect(() => { load() }, [load])

  // تحديث القيم الفعلية
  const refreshActuals = async () => {
    try {
      await sb.rpc('update_kpi_actuals', { p_month: month + '-01' })
      toast(T('تم تحديث البيانات', 'Data updated'))
      load()
    } catch (e) { toast(T('خطأ في التحديث', 'Update error')) }
  }

  // إنشاء/تعديل الأهداف
  const openEditor = () => {
    const form = {}
    METRICS.forEach(m => {
      const existing = targets.find(t => t.metric_key === m.key)
      form[m.key] = existing?.target_value || ''
    })
    setEditForm(form)
    setEditPop(true)
  }

  const saveTargets = async () => {
    setSaving(true)
    const monthDate = month + '-01'
    try {
      for (const m of METRICS) {
        if (!editForm[m.key] && editForm[m.key] !== 0) continue
        const val = Number(editForm[m.key])
        if (isNaN(val)) continue
        const existing = targets.find(t => t.metric_key === m.key)
        if (existing) {
          await sb.from('monthly_targets').update({
            target_value: val, updated_at: new Date().toISOString()
          }).eq('id', existing.id)
        } else {
          await sb.from('monthly_targets').insert({
            target_month: monthDate,
            branch_id: branchFilter || null,
            metric_key: m.key,
            target_value: val,
            unit: m.unit,
            created_by: user?.id
          })
        }
      }
      toast(T('تم حفظ الأهداف', 'Targets saved'))
      setEditPop(false)
      load()
    } catch (e) { toast(T('خطأ: ', 'Error: ') + (e.message || '')) }
    setSaving(false)
  }

  // حساب النسبة
  const pct = (actual, target) => {
    if (!target || target === 0) return 0
    return Math.min(100, Math.round((actual / target) * 100))
  }

  const pctColor = (p, invert) => {
    if (invert) return p > 100 ? C.red : p > 80 ? '#e67e22' : C.ok
    return p >= 80 ? C.ok : p >= 50 ? '#e67e22' : C.red
  }

  // بيانات الرسم البياني
  const chartData = (() => {
    const map = {}
    history.forEach(h => {
      const m = h.target_month?.slice(0, 7)
      if (!map[m]) map[m] = { month: m }
      if (h.metric_key === 'revenue') {
        map[m].target = Number(h.target_value) || 0
        map[m].actual = Number(h.actual_value) || 0
      }
    })
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month))
  })()

  const fS = {
    width: '100%', height: 40, padding: '0 14px',
    background: 'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',
    border: '1px solid rgba(255,255,255,.06)', borderRadius: 11,
    fontFamily: F, fontSize: 14, fontWeight: 500,
    color: 'var(--tx)', outline: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',
    transition: '.2s', textAlign: 'right', direction: 'ltr'
  }

  const monthLabel = (() => {
    const d = new Date(month + '-01')
    return d.toLocaleDateString(isAr ? 'ar-SA' : 'en', { month: 'long', year: 'numeric' })
  })()

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--tx5)', fontFamily: F }}>...</div>

  return <div>
    {/* Header */}
    <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px', lineHeight: 1.2 }}>{T('لوحة الأهداف', 'KPI Dashboard')}</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>{T('متابعة الأداء مقابل الأهداف الشهرية', 'Track performance against monthly targets')}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          style={{ height: 40, padding: '0 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,.06)', background: 'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)', color: 'rgba(255,255,255,.78)', fontFamily: F, fontSize: 12, fontWeight: 500, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)', transition: '.2s', direction: 'ltr' }} />
        <select value={branchFilter || ''} onChange={e => setBranchFilter(e.target.value || null)}
          style={{ height: 40, padding: '0 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,.06)', background: 'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)', color: 'rgba(255,255,255,.78)', fontFamily: F, fontSize: 12, fontWeight: 500, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)', transition: '.2s' }}>
          <option value="">{T('كل المكاتب', 'All Branches')}</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name_ar}</option>)}
        </select>
        <button onClick={refreshActuals}
          style={{ height: 40, padding: '0 14px', borderRadius: 11, border: '1px solid rgba(39,160,70,.35)', background: 'linear-gradient(180deg,rgba(39,160,70,.18) 0%,rgba(39,160,70,.08) 100%)', color: C.ok, fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(39,160,70,.15), inset 0 1px 0 rgba(39,160,70,.18)', transition: '.2s' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>
          {T('تحديث', 'Refresh')}
        </button>
        <button onClick={openEditor}
          style={{ height: 40, padding: '0 18px', borderRadius: 11, border: '1px solid rgba(212,160,23,.45)', background: 'linear-gradient(180deg,rgba(212,160,23,.22) 0%,rgba(212,160,23,.10) 100%)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 8px rgba(212,160,23,.18), inset 0 1px 0 rgba(212,160,23,.18)', transition: '.2s' }}>
          + {T('تحديد الأهداف', 'Set Targets')}
        </button>
      </div>
    </div>

    {/* شهر الأهداف */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.gold, border: '2px solid rgba(212,160,23,.25)', flexShrink: 0 }} />
      <div style={{ fontSize: 13, fontWeight: 600, color: C.gold }}>{monthLabel}</div>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.07)' }} />
    </div>

    {/* KPI Cards */}
    {targets.length === 0 ? (
      <div style={{ ...GLASS, textAlign: 'center', padding: '60px 20px', color: 'var(--tx5)', fontFamily: F }}>
        <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>◎</div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--tx2)' }}>{T('لم يتم تحديد أهداف لهذا الشهر', 'No targets set for this month')}</div>
        <div style={{ fontSize: 12, color: 'var(--tx5)' }}>{T('اضغط "تحديد الأهداف" لإضافة أهدافك', 'Click "Set Targets" to add your goals')}</div>
      </div>
    ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px,100%), 1fr))', gap: 14, marginBottom: 24 }}>
        {METRICS.map(m => {
          const t = targets.find(x => x.metric_key === m.key)
          if (!t) return null
          const p = pct(t.actual_value, t.target_value)
          const clr = pctColor(p, m.invert)
          const prev = Number(t.previous_value || 0)
          const change = prev > 0 ? Math.round(((Number(t.actual_value) - prev) / prev) * 100) : null

          return <div key={m.key}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 16px 36px rgba(0,0,0,.42), 0 4px 10px rgba(0,0,0,.22), 0 0 0 1px ' + m.color + '33, inset 0 1px 0 rgba(255,255,255,.08)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)' }}
            style={{
              ...GLASS,
              padding: '16px 18px',
              position: 'relative', overflow: 'hidden',
              fontFamily: F,
              transition: '.25s'
            }}>
            {/* Glow bar at top */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${m.color}40, ${m.color}, ${m.color}40, transparent)` }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, boxShadow: '0 0 5px ' + m.color }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx2)' }}>{m.l}</span>
              </div>
              {change !== null && (
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
                  color: change >= 0 ? C.ok : C.red,
                  background: (change >= 0 ? C.ok : C.red) + '15',
                  display: 'inline-flex', alignItems: 'center', gap: 5
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: change >= 0 ? C.ok : C.red }} />
                  {change > 0 ? '↑' : change < 0 ? '↓' : '='}{Math.abs(change)}%
                </span>
              )}
            </div>

            {/* الأرقام - inner stat pill */}
            <div style={{ padding: '7px 12px', borderRadius: 10, background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.06)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: clr, letterSpacing: '-.3px', direction: 'ltr', lineHeight: 1 }}>
                  {m.unit === 'currency' ? num(t.actual_value) : Number(t.actual_value || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: 'var(--tx5)', direction: 'ltr' }}>
                  / {m.unit === 'currency' ? num(t.target_value) : Number(t.target_value || 0).toLocaleString()}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600 }}>{m.unit === 'currency' ? T('ر.س', 'SAR') : ''}</div>
            </div>

            {/* Progress bar */}
            <div style={{ position: 'relative', height: 8, borderRadius: 4, background: 'rgba(0,0,0,.32)', overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.4)' }}>
              <div style={{
                position: 'absolute', top: 0, left: isAr ? 'auto' : 0, right: isAr ? 0 : 'auto',
                height: '100%', width: Math.min(100, p) + '%', borderRadius: 4,
                background: `linear-gradient(90deg, ${clr}60, ${clr})`,
                boxShadow: '0 0 8px ' + clr + '55',
                transition: 'width .6s ease'
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: clr, direction: 'ltr' }}>{p}%</span>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--tx5)' }}>
                {m.invert
                  ? (p <= 100 ? T('ضمن الحد', 'Within limit') : T('تجاوز الحد', 'Over limit'))
                  : (p >= 100 ? T('تم الهدف ✓', 'Target met ✓') : T('متبقي ', 'Remaining ') + (m.unit === 'currency' ? num(t.target_value - t.actual_value) + T(' ر.س', ' SAR') : (t.target_value - t.actual_value)))}
              </span>
            </div>
          </div>
        })}
      </div>
    )}

    {/* الرسم البياني — الإيرادات مقابل الهدف */}
    {chartData.length > 1 && (
      <div style={{ ...GLASS, padding: '16px 18px', marginBottom: 14, fontFamily: F }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx2)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold, boxShadow: '0 0 5px ' + C.gold }} />
          {T('اتجاه الإيرادات مقابل الأهداف', 'Revenue vs Targets Trend')}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'rgba(255,255,255,.4)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,.4)' }} tickFormatter={v => (v / 1000) + 'K'} />
            <Tooltip
              contentStyle={{ background: '#1e1e1e', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, fontFamily: F, fontSize: 11 }}
              labelStyle={{ color: 'rgba(255,255,255,.5)', fontSize: 10 }}
              formatter={(v) => [num(v) + T(' ر.س', ' SAR')]}
            />
            <Bar dataKey="target" name={T('الهدف', 'Target')} fill="rgba(212,160,23,.2)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="actual" name={T('الفعلي', 'Actual')} fill={C.gold} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )}

    {/* ملخص سريع */}
    {targets.length > 0 && (() => {
      const achieved = targets.filter(t => {
        const m = METRICS.find(x => x.key === t.metric_key)
        return pct(t.actual_value, t.target_value) >= 100 && !m?.invert
      }).length
      const total = targets.length
      const overallPct = Math.round(targets.reduce((s, t) => s + pct(t.actual_value, t.target_value), 0) / total)
      const oc = pctColor(overallPct, false)

      return <div style={{ ...GLASS, padding: '18px 22px', fontFamily: F }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: oc, boxShadow: '0 0 5px ' + oc }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx2)' }}>
                {T('الأداء العام', 'Overall Performance')}
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx4)', marginTop: 4 }}>
                {achieved} {T('من', 'of')} {total} {T('أهداف محققة', 'targets achieved')}
              </div>
            </div>
          </div>
          <div style={{ padding: '7px 14px', borderRadius: 10, background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.06)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: oc, boxShadow: '0 0 5px ' + oc }} />
            <div style={{ fontSize: 20, fontWeight: 700, color: oc, letterSpacing: '-.3px', direction: 'ltr', lineHeight: 1 }}>
              {overallPct}%
            </div>
          </div>
        </div>
      </div>
    })()}

    {/* Edit Modal */}
    {editPop && <div onClick={() => setEditPop(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(14,14,14,.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ ...GLASS, width: 'min(520px,96vw)', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: F }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${C.gold} 30%, ${C.gl} 50%, ${C.gold} 70%, transparent)` }} />
        <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px' }}>{T('تحديد الأهداف', 'Set Targets')}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx4)', marginTop: 4 }}>{monthLabel}</div>
          </div>
          <button onClick={() => setEditPop(false)} style={{ width: 30, height: 30, borderRadius: 10, background: 'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)', border: '1px solid rgba(255,255,255,.06)', color: 'var(--tx3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)', transition: '.2s' }}>✕</button>
        </div>
        <div style={{ padding: '18px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {METRICS.map(m => (
            <div key={m.key}>
              <div style={{ fontSize: 12, fontWeight: 600, color: m.color, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, boxShadow: '0 0 5px ' + m.color }} />
                {m.l}
                {m.unit === 'currency' && <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--tx5)' }}>(ر.س)</span>}
              </div>
              <input
                type="number" value={editForm[m.key] || ''}
                onChange={e => setEditForm(p => ({ ...p, [m.key]: e.target.value }))}
                placeholder={m.unit === 'currency' ? '0.00' : '0'}
                style={fS}
              />
            </div>
          ))}
        </div>
        <div style={{ padding: '14px 22px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', justifyContent: 'space-between', flexDirection: 'row-reverse', gap: 10 }}>
          <button onClick={saveTargets} disabled={saving}
            style={{ height: 40, padding: '0 24px', borderRadius: 11, border: '1px solid rgba(212,160,23,.45)', background: 'linear-gradient(180deg,rgba(212,160,23,.22) 0%,rgba(212,160,23,.10) 100%)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 8px rgba(212,160,23,.18), inset 0 1px 0 rgba(212,160,23,.18)', transition: '.2s', opacity: saving ? .6 : 1 }}>
            {saving ? '...' : T('حفظ الأهداف', 'Save Targets')}
          </button>
          <button onClick={() => setEditPop(false)}
            style={{ height: 40, padding: '0 14px', borderRadius: 11, border: '1px solid rgba(255,255,255,.06)', background: 'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)', color: 'rgba(255,255,255,.78)', fontFamily: F, fontSize: 12, fontWeight: 500, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)', transition: '.2s' }}>
            {T('إلغاء', 'Cancel')}
          </button>
        </div>
      </div>
    </div>}
  </div>
}
