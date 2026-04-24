import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Users, Plus, Eye, Edit2, Archive, ArchiveRestore, ArrowRight,
  Phone, Mail, MapPin, Building2, Briefcase, UserCheck, HardHat,
  Shield, CreditCard, Calendar, Flag, AlertCircle
} from 'lucide-react'
import * as personsService from '../../services/personsService.js'
import PersonFormModal from '../../components/persons/PersonFormModal.jsx'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#D4A017', ok: '#27a046', red: '#c0392b', blue: '#3483b4' }

const ROLE_STYLES = {
  'موظف مكتب': { bg: 'rgba(212,160,23,.15)', fg: '#d9bf5e', bd: 'rgba(212,160,23,.3)', plain: C.gold },
  'عامل':       { bg: 'rgba(155,155,155,.12)', fg: '#c0c0c0', bd: 'rgba(155,155,155,.25)', plain: '#c0c0c0' },
  'وسيط':       { bg: 'rgba(168,114,40,.18)', fg: '#d9a15a', bd: 'rgba(168,114,40,.35)', plain: '#d9a15a' },
  'عميل':       { bg: 'rgba(52,131,180,.18)', fg: '#5ca0e6', bd: 'rgba(52,131,180,.35)', plain: C.blue },
  'مدير منشأة': { bg: 'rgba(155,89,182,.18)', fg: '#b58cf5', bd: 'rgba(155,89,182,.35)', plain: '#b58cf5' },
  'مالك منشأة': { bg: 'rgba(192,57,43,.18)', fg: '#e5867a', bd: 'rgba(192,57,43,.35)', plain: '#e5867a' },
}

const RoleChip = ({ role, small }) => {
  const s = ROLE_STYLES[role] || { bg: 'rgba(255,255,255,.06)', fg: 'var(--tx3)', bd: 'rgba(255,255,255,.1)' }
  return (
    <span style={{
      fontSize: small ? 9 : 10, fontWeight: 700, color: s.fg,
      background: s.bg, border: `1px solid ${s.bd}`,
      padding: small ? '2px 7px' : '3px 9px', borderRadius: 6, whiteSpace: 'nowrap', lineHeight: 1.3
    }}>{role}</span>
  )
}

const StatusBadge = ({ status }) => {
  const active = status === 'active'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 10, fontWeight: 800,
      color: active ? '#6dcc89' : 'var(--tx4)',
      background: active ? 'rgba(39,160,70,.12)' : 'rgba(255,255,255,.05)',
      border: `1px solid ${active ? 'rgba(39,160,70,.3)' : 'rgba(255,255,255,.1)'}`,
      padding: '3px 10px', borderRadius: 6
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: active ? '#6dcc89' : 'var(--tx4)' }} />
      {active ? 'نشط' : 'مؤرشف'}
    </span>
  )
}

function PersonsList({ toast, countries, branches, onOpenDetail, user }) {
  const isGM = !user?.roles || user?.roles?.name_ar === 'المدير العام' || user?.roles?.name_en === 'General Manager'

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQ, setSearchQ] = useState('')
  const [advOpen, setAdvOpen] = useState(false)
  const [advFilter, setAdvFilter] = useState({ from: '', to: '', role: '', status: '', nationality: '' })
  const [officeFilter, setOfficeFilter] = useState(() => isGM ? '' : (user?.branch_id || ''))
  const [officeDropOpen, setOfficeDropOpen] = useState(false)
  const [periodOffset, setPeriodOffset] = useState(0)
  const [statsPeriod, setStatsPeriod] = useState('daily')

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editProfile, setEditProfile] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { rows } = await personsService.listAllPersons()
      setRows(rows)
    } catch (e) {
      toast?.('خطأ في تحميل البيانات: ' + (e.message || ''))
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const onArchive = async (p) => {
    if (!confirm(`هل تريد أرشفة "${p.full_name_ar}"؟ (لن يتم حذف البيانات)`)) return
    try { await personsService.archivePerson(p.person_id); toast?.('تم أرشفة الشخص'); load() }
    catch (e) { toast?.('خطأ: ' + (e.message || '')) }
  }
  const onUnarchive = async (p) => {
    try { await personsService.unarchivePerson(p.person_id); toast?.('تمت إعادة التفعيل'); load() }
    catch (e) { toast?.('خطأ: ' + (e.message || '')) }
  }

  const openEdit = (p) => { setEditId(p.person_id); setEditProfile(p); setShowForm(true) }
  const openAdd = () => { setEditId(null); setEditProfile(null); setShowForm(true) }

  // ── Filters (client-side, matches Transfer Calc pattern) ───────────
  const matches = (r) => {
    if (!isGM && user?.branch_id && r.branch_id && r.branch_id !== user.branch_id) return false
    if (isGM && officeFilter && r.branch_id !== officeFilter) return false
    if (searchQ) {
      const q = searchQ.toLowerCase().trim()
      const hay = [r.full_name_ar, r.full_name_en, r.id_number, r.phone, r.email]
        .filter(Boolean).map(String).map(s => s.toLowerCase()).join(' ')
      if (!hay.includes(q)) return false
    }
    if (advFilter.role && !(r.roles_summary || []).includes(advFilter.role)) return false
    if (advFilter.status && r.status !== advFilter.status) return false
    if (advFilter.nationality && r.nationality_id !== advFilter.nationality) return false
    if (advFilter.from && r.created_at && new Date(r.created_at) < new Date(advFilter.from)) return false
    if (advFilter.to && r.created_at && new Date(r.created_at) > new Date(advFilter.to + 'T23:59:59')) return false
    return true
  }

  const filteredData = useMemo(() => rows.filter(matches), [rows, searchQ, advFilter, officeFilter, isGM, user])

  // ── Role counts (for the 3 mini-stat boxes) ───────────────────────
  const roleCounts = useMemo(() => {
    const c = { 'موظف مكتب': 0, 'عميل': 0, 'وسيط': 0, 'عامل': 0, 'مدير منشأة': 0, 'مالك منشأة': 0 }
    rows.forEach(r => (r.roles_summary || []).forEach(role => { if (role in c) c[role]++ }))
    return c
  }, [rows])

  const activeCount = rows.filter(r => r.status === 'active').length
  const archivedCount = rows.filter(r => r.status === 'archived').length
  const totalRoles = rows.reduce((s, r) => s + (r.roles_summary || []).length, 0)
  const avgPerBranch = branches.length ? Math.round(rows.length / branches.length) : 0

  // ── Date grouping (like Transfer Calc) ────────────────────────────
  const todayStr = new Date().toISOString().slice(0, 10)
  const dayKey = (r) => (r.created_at || '').slice(0, 10) || 'بدون تاريخ'
  const groups = {}, groupOrder = []
  const sortedFiltered = [...filteredData].sort((a, b) =>
    new Date(b.created_at || 0) - new Date(a.created_at || 0))
  sortedFiltered.forEach(r => {
    const k = dayKey(r)
    if (!groups[k]) { groups[k] = []; groupOrder.push(k) }
    groups[k].push(r)
  })

  const dayNames = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
  const monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
  const dayLabel = (k) => {
    if (k === todayStr) return 'اليوم'
    try { const d = new Date(k + 'T12:00:00'); return dayNames[d.getDay()] } catch { return k }
  }
  const dayFull = (k) => {
    try {
      const d = new Date(k + 'T12:00:00')
      return d.getDate() + ' ' + monthNames[d.getMonth()] + ' ' + d.getFullYear()
    } catch { return k }
  }

  // ── Period area-chart series (last N periods of registrations grouped by role bucket) ──
  const now = new Date()
  const periodSeries = (() => {
    const buckets = 7
    const bucketMs = statsPeriod === 'daily' ? 86400000 : statsPeriod === 'weekly' ? 7 * 86400000 : 30 * 86400000
    const offsetShift = periodOffset * buckets * bucketMs
    const result = Array.from({ length: buckets }, () => ({ employee: 0, broker: 0, client: 0, total: 0 }))
    rows.filter(r => {
      if (!isGM && user?.branch_id && r.branch_id && r.branch_id !== user.branch_id) return false
      if (isGM && officeFilter && r.branch_id !== officeFilter) return false
      return true
    }).forEach(r => {
      if (!r.created_at) return
      const d = new Date(r.created_at)
      const age = Math.floor((now - d - offsetShift) / bucketMs)
      if (age < 0 || age >= buckets) return
      const idx = buckets - 1 - age
      result[idx].total += 1
      const roles = r.roles_summary || []
      if (roles.includes('موظف مكتب')) result[idx].employee += 1
      if (roles.includes('وسيط')) result[idx].broker += 1
      if (roles.includes('عميل')) result[idx].client += 1
    })
    return result
  })()

  const hasAdvFilters = Object.values(advFilter).some(Boolean)
  const glassCard = { background: '#141414', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, padding: '10px 12px', position: 'relative', overflow: 'hidden', transition: '.2s' }
  const innerBox = { background: '#1a1a1a', border: '1px solid rgba(255,255,255,.04)' }

  return (
    <div style={{ fontFamily: F, paddingTop: 0 }}>
      <style>{`
        input.px-noring.px-noring.px-noring.px-noring,
        input.px-noring.px-noring.px-noring.px-noring:not(:placeholder-shown),
        select.px-noring.px-noring.px-noring.px-noring,
        textarea.px-noring.px-noring.px-noring.px-noring{
          border-color:rgba(255,255,255,.08)!important; box-shadow:none!important;
        }
        select.px-noring.px-noring.px-noring.px-noring{
          background-color:#141414!important; border-color:rgba(255,255,255,.06)!important;
        }
        input.px-noring.px-noring.px-noring.px-noring:focus,
        select.px-noring.px-noring.px-noring.px-noring:focus,
        textarea.px-noring.px-noring.px-noring.px-noring:focus{
          border-color:rgba(255,255,255,.2)!important; box-shadow:none!important;
        }
        input[type="date"].px-noring.px-noring.px-noring.px-noring::-webkit-calendar-picker-indicator{
          filter:invert(70%) sepia(60%) saturate(500%) hue-rotate(20deg)
        }
      `}</style>

      {/* ═══ Header ═══ */}
      <div style={{ marginBottom: 8, position: 'relative' }}>
        {/* Office dropdown (top-left) — GM only */}
        {isGM && branches.length > 0 && (() => {
          const sel = branches.find(b => b.id === officeFilter)
          const items = [{ id: '', label: 'كل المكاتب' }, ...branches.map(b => ({ id: b.id, label: b.code || b.id.slice(0,6) }))]
          return (
            <div style={{ position: 'absolute', top: -2, left: 0, display: 'inline-flex', zIndex: 2 }}>
              <div style={{ position: 'relative' }}>
                <button onClick={() => setOfficeDropOpen(o => !o)}
                  style={{ height: 34, padding: '0 12px', borderRadius: 8,
                    background: '#141414',
                    border: `1px solid ${officeDropOpen ? 'rgba(212,160,23,.35)' : 'rgba(255,255,255,.06)'}`,
                    color: sel ? C.gold : 'var(--tx2)',
                    fontFamily: F, fontSize: 10, fontWeight: 700,
                    outline: 'none', cursor: 'pointer', display: 'inline-flex',
                    alignItems: 'center', justifyContent: 'space-between', gap: 7,
                    minWidth: 105, transition: '.15s' }}>
                  <span style={{ flex: 1, textAlign: 'center' }}>
                    {sel ? (sel.code || sel.id.slice(0,6)) : 'كل المكاتب'}
                  </span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transition: '.2s', transform: officeDropOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {officeDropOpen && <>
                  <div onClick={() => setOfficeDropOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 98 }} />
                  <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, minWidth: '100%', width: 'max-content',
                    maxWidth: 'min(220px, calc(100vw - 24px))', background: '#141414',
                    border: '1px solid rgba(255,255,255,.08)', borderRadius: 10,
                    boxShadow: '0 12px 32px rgba(0,0,0,.5)', zIndex: 99, padding: 5,
                    display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {items.map(it => {
                      const active = officeFilter === it.id
                      return (
                        <div key={it.id || '__all__'}
                          onClick={() => { setOfficeFilter(it.id); setOfficeDropOpen(false) }}
                          style={{ padding: '9px 14px', fontSize: 11, fontWeight: 700,
                            color: active ? C.gold : 'var(--tx2)',
                            background: active ? 'rgba(212,160,23,.1)' : 'transparent',
                            borderRadius: 7, cursor: 'pointer', textAlign: 'center',
                            transition: '.12s', whiteSpace: 'nowrap' }}
                          onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,.04)' }}
                          onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
                          {it.label}
                        </div>
                      )
                    })}
                  </div>
                </>}
              </div>
            </div>
          )
        })()}

        {/* Add button (top-right) */}
        <button onClick={openAdd}
          style={{ position: 'absolute', top: -2, right: 0, zIndex: 2,
            height: 34, padding: '0 14px', borderRadius: 8,
            background: `linear-gradient(180deg, ${C.gold}, #b88914)`,
            border: 'none', color: '#0a0a0a',
            fontFamily: F, fontSize: 11, fontWeight: 900,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
            boxShadow: '0 4px 14px rgba(212,160,23,.22)' }}>
          <Plus size={13} strokeWidth={2.8} /> إضافة شخص
        </button>

        <div style={{ fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px' }}>الأشخاص</div>
        <div style={{ fontSize: 12, color: 'var(--tx4)', marginTop: 8 }}>
          إدارة هويات الأشخاص والأدوار المرتبطة بهم — موظفون، عملاء، وسطاء، ملاك ومدراء منشآت
        </div>

        {/* Period row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.58)' }}>الفترة</span>
          </div>
          <div style={{ flex: 1 }} />
          {(() => {
            const order = [['monthly', 'شهري'], ['weekly', 'أسبوعي'], ['daily', 'يومي']]
            const idx = order.findIndex(([k]) => k === statsPeriod)
            const cycle = (dir) => {
              const next = idx + dir
              if (next < 0 || next >= order.length) return
              setStatsPeriod(order[next][0]); setPeriodOffset(0)
            }
            const atStart = idx === 0, atEnd = idx === order.length - 1
            const btnStyle = (dis) => ({
              width: 26, height: 26, borderRadius: 7,
              border: '1px solid rgba(255,255,255,.04)', background: '#1a1a1a',
              color: 'var(--tx3)', cursor: dis ? 'not-allowed' : 'pointer',
              opacity: dis ? .35 : 1,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0
            })
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button disabled={atEnd} onClick={() => cycle(1)} title="التالي" style={btnStyle(atEnd)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: C.gold, minWidth: 64, textAlign: 'center' }}>
                  {order[idx][1]}
                </span>
                <button disabled={atStart} onClick={() => cycle(-1)} title="السابق" style={btnStyle(atStart)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"/></svg>
                </button>
              </div>
            )
          })()}
        </div>
      </div>

      {/* ═══ KPI Cards ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2.6fr) minmax(0,1fr)', gap: 14, marginBottom: 22 }}>

        {/* Wide: role counts + active ratio + trend chart */}
        <div style={glassCard}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            {[
              { l: 'موظفون', v: roleCounts['موظف مكتب'], c: C.gold },
              { l: 'عملاء', v: roleCounts['عميل'], c: C.blue },
              { l: 'وسطاء', v: roleCounts['وسيط'], c: '#d9a15a' }
            ].map(s => (
              <div key={s.l} style={{ padding: '7px 12px', borderRadius: 10, ...innerBox,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.c, boxShadow: `0 0 5px ${s.c}` }} />
                  <div style={{ fontSize: 18, fontWeight: 900, color: s.c, letterSpacing: '-.3px', direction: 'ltr', lineHeight: 1 }}>{s.v}</div>
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--tx2)', fontWeight: 700 }}>{s.l}</div>
              </div>
            ))}
            {(() => {
              const pct = rows.length ? Math.round((activeCount / rows.length) * 100) : 0
              return (
                <div style={{ minWidth: 0, padding: '0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 600, whiteSpace: 'nowrap' }}>نسبة النشط</span>
                  <div style={{ flex: 1, height: 7, borderRadius: 5, background: 'rgba(255,255,255,.06)', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ width: pct + '%', height: '100%',
                      background: `linear-gradient(90deg, ${C.ok}cc, ${C.ok})`,
                      borderRadius: 5, transition: '.4s', boxShadow: `0 0 8px ${C.ok}66` }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 900, color: C.ok, direction: 'ltr' }}>{pct}%</span>
                </div>
              )
            })()}
          </div>

          {/* Area chart */}
          {(() => {
            const n = periodSeries.length
            if (n < 2) return null
            const W = 560, H = 88, padL = 22, padR = 12, padT = 12, padB = 12
            const cw = W - padL - padR, ch = H - padT - padB
            const mx = Math.max(1, ...periodSeries.flatMap(p => [p.employee, p.broker, p.client]))
            const niceMx = Math.max(2, Math.ceil(mx / 2) * 2)
            const xAt = i => (padL + (i / (n - 1)) * cw).toFixed(1)
            const yAt = v => (padT + ch - (v / niceMx) * ch).toFixed(1)
            const smooth = (pts) => {
              if (pts.length < 2) return ''
              let d = 'M' + pts[0][0] + ',' + pts[0][1]
              for (let i = 0; i < pts.length - 1; i++) {
                const [x0, y0] = pts[Math.max(0, i - 1)], [x1, y1] = pts[i]
                const [x2, y2] = pts[i + 1], [x3, y3] = pts[Math.min(pts.length - 1, i + 2)]
                const t = .22
                const c1x = x1 + (x2 - x0) * t, c1y = y1 + (y2 - y0) * t
                const c2x = x2 - (x3 - x1) * t, c2y = y2 - (y3 - y1) * t
                d += ' C' + c1x.toFixed(1) + ',' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ',' + c2y.toFixed(1) + ' ' + x2 + ',' + y2
              }
              return d
            }
            const ptsOf = (k) => periodSeries.map((p, i) => [Number(xAt(i)), Number(yAt(p[k]))])
            const lineP = (k) => smooth(ptsOf(k))
            const areaP = (k) => {
              const p = ptsOf(k); if (p.length < 2) return ''
              return smooth(p) + ' L' + p[p.length - 1][0] + ',' + (padT + ch) + ' L' + p[0][0] + ',' + (padT + ch) + ' Z'
            }
            const yTicks = [0, niceMx / 2, niceMx]
            return (
              <div style={{ padding: '6px 10px' }}>
                <svg width="100%" viewBox={`0 0 ${W} ${H - padB + 14}`} preserveAspectRatio="none" style={{ display: 'block', height: 90 }}>
                  <defs>
                    <linearGradient id="pxa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.gold} stopOpacity=".4" />
                      <stop offset="100%" stopColor={C.gold} stopOpacity="0" /></linearGradient>
                    <linearGradient id="pxb" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d9a15a" stopOpacity=".35" />
                      <stop offset="100%" stopColor="#d9a15a" stopOpacity="0" /></linearGradient>
                    <linearGradient id="pxc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.blue} stopOpacity=".35" />
                      <stop offset="100%" stopColor={C.blue} stopOpacity="0" /></linearGradient>
                  </defs>
                  {yTicks.map((t, i) => (
                    <g key={i}>
                      <line x1={padL} x2={W - padR} y1={yAt(t)} y2={yAt(t)} stroke="rgba(255,255,255,.05)" strokeWidth="1" />
                      <text x={padL - 6} y={Number(yAt(t)) + 3} fontSize="9" fill="rgba(255,255,255,.3)" textAnchor="end" fontFamily={F}>{t}</text>
                    </g>
                  ))}
                  <path d={areaP('employee')} fill="url(#pxa)" />
                  <path d={lineP('employee')} fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d={areaP('broker')} fill="url(#pxb)" />
                  <path d={lineP('broker')} fill="none" stroke="#d9a15a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d={areaP('client')} fill="url(#pxc)" />
                  <path d={lineP('client')} fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  {['employee', 'broker', 'client'].map(k => {
                    const c = k === 'employee' ? C.gold : k === 'broker' ? '#d9a15a' : C.blue
                    const last = ptsOf(k)[n - 1]
                    return <circle key={k} cx={last[0]} cy={last[1]} r="4" fill="#1a1a1a" stroke={c} strokeWidth="2" />
                  })}
                </svg>
              </div>
            )
          })()}
        </div>

        {/* Narrow: total persons hero number */}
        <div style={{ ...glassCard, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tx2)', letterSpacing: '.1px' }}>إجمالي الأشخاص</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
            <span style={{ fontSize: 56, fontWeight: 900, color: C.gold, letterSpacing: '-1.4px', lineHeight: 1,
              textShadow: `0 0 22px ${C.gold}33`, direction: 'ltr' }}>{rows.length}</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: C.gold, opacity: .75 }}>شخص</span>
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--tx4)', letterSpacing: '.3px' }}>
            {activeCount} نشط · {archivedCount} مؤرشف
          </div>
        </div>
      </div>

      {/* ═══ Search + Advanced ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.4)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input className="px-noring" value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="ابحث باسم الشخص أو رقم الهوية أو رقم الجوال..."
            style={{ width: '100%', height: 38, padding: '0 36px 0 14px',
              background: '#141414', border: '1px solid rgba(255,255,255,.06)',
              borderRadius: 10, fontFamily: F, fontSize: 12, fontWeight: 600,
              color: 'var(--tx)', outline: 'none', direction: 'rtl', boxSizing: 'border-box' }} />
        </div>
        <button onClick={() => setAdvOpen(o => !o)}
          style={{ height: 38, padding: '0 14px', borderRadius: 10,
            border: `1px solid ${advOpen || hasAdvFilters ? 'rgba(212,160,23,.45)' : 'rgba(255,255,255,.06)'}`,
            background: advOpen || hasAdvFilters ? 'rgba(212,160,23,.1)' : '#141414',
            color: advOpen || hasAdvFilters ? C.gold : 'rgba(255,255,255,.7)',
            fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
            <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
            <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/>
            <line x1="17" y1="16" x2="23" y2="16"/></svg>
          بحث متقدم
          {Object.values(advFilter).filter(Boolean).length > 0 && (
            <span style={{ background: C.gold, color: '#000', fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 999 }}>
              {Object.values(advFilter).filter(Boolean).length}
            </span>
          )}
        </button>
        {searchQ && (
          <button onClick={() => setSearchQ('')}
            style={{ height: 38, padding: '0 12px', borderRadius: 10,
              border: '1px solid rgba(192,57,43,.3)', background: 'rgba(192,57,43,.08)',
              color: C.red, cursor: 'pointer', fontFamily: F, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
            مسح
          </button>
        )}
      </div>

      {advOpen && (() => {
        const inS = { width: '100%', height: 36, padding: '0 10px',
          border: '1px solid rgba(255,255,255,.08)', borderRadius: 8,
          background: 'rgba(0,0,0,.2)', color: 'var(--tx)',
          fontFamily: F, fontSize: 12, outline: 'none' }
        const dateS = { ...inS, colorScheme: 'dark', direction: 'ltr', textAlign: 'center' }
        const selS = { ...inS, colorScheme: 'dark', cursor: 'pointer' }
        const lblS = { fontSize: 10.5, color: 'var(--tx5)', fontWeight: 700, marginBottom: 4 }
        return (
          <div style={{ marginBottom: 14, padding: '14px 16px', background: 'var(--bg)',
            border: '1px solid rgba(212,160,23,.18)', borderRadius: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
              <div><div style={lblS}>من تاريخ</div>
                <input className="px-noring" type="date" value={advFilter.from}
                  onChange={e => setAdvFilter(f => ({ ...f, from: e.target.value }))} style={dateS} /></div>
              <div><div style={lblS}>إلى تاريخ</div>
                <input className="px-noring" type="date" value={advFilter.to}
                  onChange={e => setAdvFilter(f => ({ ...f, to: e.target.value }))} style={dateS} /></div>
              <div><div style={lblS}>الدور</div>
                <select className="px-noring" value={advFilter.role}
                  onChange={e => setAdvFilter(f => ({ ...f, role: e.target.value }))} style={selS}>
                  <option value="">الكل</option>
                  {personsService.ROLE_LABELS.map(r => <option key={r} value={r}>{r}</option>)}
                </select></div>
              <div><div style={lblS}>الحالة</div>
                <select className="px-noring" value={advFilter.status}
                  onChange={e => setAdvFilter(f => ({ ...f, status: e.target.value }))} style={selS}>
                  <option value="">الكل</option>
                  <option value="active">نشط</option>
                  <option value="archived">مؤرشف</option>
                </select></div>
              <div><div style={lblS}>الجنسية</div>
                <select className="px-noring" value={advFilter.nationality}
                  onChange={e => setAdvFilter(f => ({ ...f, nationality: e.target.value }))} style={selS}>
                  <option value="">الكل</option>
                  {countries.slice(0, 60).map(c => (
                    <option key={c.id} value={c.id}>{c.nationality_ar || c.name_ar}</option>
                  ))}
                </select></div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={() => setAdvFilter({ from: '', to: '', role: '', status: '', nationality: '' })}
                  style={{ width: '100%', height: 36, borderRadius: 8,
                    border: '1px solid rgba(192,57,43,.25)', background: 'rgba(192,57,43,.06)',
                    color: C.red, fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  مسح الفلاتر
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ═══ List ═══ */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--tx6)' }}>
          <div style={{ display: 'inline-block', width: 30, height: 30,
            border: '3px solid rgba(212,160,23,.15)', borderTopColor: C.gold,
            borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ marginTop: 14, fontSize: 12, fontWeight: 700 }}>جاري التحميل...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : filteredData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--tx6)' }}>
          {rows.length === 0 ? 'لا يوجد أشخاص بعد' : 'لا توجد نتائج مطابقة'}
        </div>
      ) : (
        <div>
          {groupOrder.map(dateKey => {
            const items = groups[dateKey]
            const isToday = dateKey === todayStr
            const dayRoleCounts = {
              employee: items.filter(r => (r.roles_summary || []).includes('موظف مكتب')).length,
              broker: items.filter(r => (r.roles_summary || []).includes('وسيط')).length,
              client: items.filter(r => (r.roles_summary || []).includes('عميل')).length,
            }
            return (
              <div key={dateKey} style={{ marginBottom: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%',
                    background: isToday ? C.gold : 'rgba(255,255,255,.18)',
                    border: isToday ? '2px solid rgba(212,160,23,.25)' : 'none',
                    flexShrink: 0 }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: isToday ? C.gold : 'rgba(255,255,255,.65)' }}>
                    {dayLabel(dateKey)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--tx5)' }}>{dayFull(dateKey)}</div>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.07)' }} />
                  <div style={{ display: 'flex', gap: 6, fontSize: 9, fontWeight: 600 }}>
                    <span style={{ color: 'var(--tx5)' }}>{items.length} شخص</span>
                    {dayRoleCounts.employee > 0 && <span style={{ color: C.gold }}>{dayRoleCounts.employee} موظف</span>}
                    {dayRoleCounts.broker > 0 && <span style={{ color: '#d9a15a' }}>{dayRoleCounts.broker} وسيط</span>}
                    {dayRoleCounts.client > 0 && <span style={{ color: C.blue }}>{dayRoleCounts.client} عميل</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingInlineStart: 20,
                  borderInlineStart: `2px solid ${isToday ? 'rgba(212,160,23,.15)' : 'rgba(255,255,255,.07)'}` }}>
                  {items.map(r => {
                    const roles = r.roles_summary || []
                    const primaryRole = roles[0]
                    const primaryColor = (ROLE_STYLES[primaryRole] || {}).plain || 'var(--tx5)'
                    const initials = (r.full_name_ar || '').split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('') || '—'
                    const relTime = (() => {
                      if (!r.created_at) return '—'
                      const diffMs = Date.now() - new Date(r.created_at).getTime()
                      const h = Math.floor(diffMs / 3600000)
                      if (h < 1) return 'الآن'
                      if (h < 24) return h === 1 ? 'منذ ساعة' : 'منذ ' + h + ' ساعات'
                      const d = Math.floor(h / 24)
                      return d === 1 ? 'أمس' : 'منذ ' + d + ' يوم'
                    })()
                    const brCode = (branches || []).find(b => b.id === r.branch_id)?.code || '—'

                    return (
                      <div key={r.person_id} onClick={() => onOpenDetail(r.person_id)}
                        style={{ background: 'linear-gradient(180deg,rgba(0,0,0,.3) 0%,rgba(0,0,0,.2) 100%)',
                          borderRadius: 16, overflow: 'visible',
                          transition: '.25s cubic-bezier(.4,0,.2,1)',
                          border: '1px solid rgba(255,255,255,.07)',
                          position: 'relative', cursor: 'pointer',
                          padding: '16px 20px 16px 20px',
                          display: 'grid', gridTemplateColumns: 'auto 1fr auto auto',
                          gap: 18, alignItems: 'center' }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = primaryColor + '55'
                          e.currentTarget.style.transform = 'translateY(-2px)'
                          e.currentTarget.style.boxShadow = `0 10px 30px rgba(0,0,0,.3), 0 0 0 1px ${primaryColor}25`
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)'
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = 'none'
                        }}>

                        {/* Avatar */}
                        <div style={{ width: 42, height: 42, borderRadius: 12,
                          background: `linear-gradient(135deg, ${primaryColor}22, ${primaryColor}08)`,
                          border: `1.5px solid ${primaryColor}44`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 900, color: primaryColor, flexShrink: 0,
                          direction: 'ltr' }}>
                          {initials}
                        </div>

                        {/* Name + meta */}
                        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)', whiteSpace: 'nowrap', letterSpacing: '.15px' }}>
                              {r.full_name_ar}
                            </span>
                            {r.full_name_en && (
                              <span style={{ fontSize: 10, color: 'var(--tx5)', direction: 'ltr', fontWeight: 500 }}>
                                · {r.full_name_en}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 11, color: 'var(--tx5)' }}>
                            {r.id_number && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, direction: 'ltr' }}>
                                <CreditCard size={11} opacity={.6} />
                                <span style={{ fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.3px' }}>{r.id_number}</span>
                              </span>
                            )}
                            {r.phone && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, direction: 'ltr' }}>
                                <Phone size={11} opacity={.6} />
                                <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{r.phone}</span>
                              </span>
                            )}
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Building2 size={11} opacity={.6} />
                              {brCode}
                            </span>
                            <span style={{ color: 'var(--tx6)' }}>· {relTime}</span>
                          </div>
                          {roles.length > 0 && (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                              {roles.map(role => <RoleChip key={role} role={role} small />)}
                            </div>
                          )}
                        </div>

                        {/* Status */}
                        <div style={{ flexShrink: 0 }}>
                          <StatusBadge status={r.status} />
                        </div>

                        {/* Actions */}
                        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button title="عرض" onClick={() => onOpenDetail(r.person_id)} style={iconBtnS}>
                            <Eye size={13} /></button>
                          <button title="تعديل" onClick={() => openEdit(r)} style={iconBtnS}>
                            <Edit2 size={13} /></button>
                          {r.status === 'active' ? (
                            <button title="أرشفة" onClick={() => onArchive(r)}
                              style={{ ...iconBtnS, color: '#e68a80' }}><Archive size={13} /></button>
                          ) : (
                            <button title="إعادة التفعيل" onClick={() => onUnarchive(r)}
                              style={{ ...iconBtnS, color: '#6dcc89' }}><ArchiveRestore size={13} /></button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <PersonFormModal open={showForm} onClose={() => setShowForm(false)}
        personId={editId} profile={editProfile} onSaved={() => load()}
        toast={toast} countries={countries} branches={branches} />
    </div>
  )
}

const iconBtnS = {
  width: 30, height: 30, borderRadius: 7,
  border: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.03)',
  color: 'var(--tx3)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '.15s'
}

// ═══════════════════════════════════════════════════════════════════
// Detail page (kept from previous version, slight header tweak)
// ═══════════════════════════════════════════════════════════════════
function PersonDetail({ personId, onBack, toast, countries, branches }) {
  const [profile, setProfile] = useState(null)
  const [person, setPerson] = useState(null)
  const [owned, setOwned] = useState([])
  const [managed, setManaged] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pg, o, m] = await Promise.all([
        personsService.getPerson(personId),
        personsService.listOwnedFacilities(personId),
        personsService.listManagedFacilities(personId),
      ])
      setProfile(pg.profile); setPerson(pg.person)
      setOwned(o); setManaged(m)
    } catch (e) {
      toast?.('خطأ: ' + (e.message || ''))
    } finally {
      setLoading(false)
    }
  }, [personId, toast])

  useEffect(() => { load() }, [load])

  const onArchive = async () => {
    if (!confirm(`هل تريد أرشفة "${profile?.full_name_ar}"؟`)) return
    try { await personsService.archivePerson(personId); toast?.('تم أرشفة الشخص'); load() }
    catch (e) { toast?.('خطأ: ' + (e.message || '')) }
  }
  const onUnarchive = async () => {
    try { await personsService.unarchivePerson(personId); toast?.('تمت إعادة التفعيل'); load() }
    catch (e) { toast?.('خطأ: ' + (e.message || '')) }
  }

  const nationality = useMemo(() => {
    if (!person?.nationality_id || !countries) return null
    return countries.find(c => c.id === person.nationality_id)
  }, [person, countries])

  const branch = useMemo(() => {
    if (!person?.branch_id || !branches) return null
    return branches.find(b => b.id === person.branch_id)
  }, [person, branches])

  if (loading) {
    return (
      <div style={{ padding: 80, textAlign: 'center', color: 'var(--tx4)', fontFamily: F }}>
        <div style={{ display: 'inline-block', width: 30, height: 30,
          border: `3px solid rgba(212,160,23,.15)`, borderTopColor: C.gold,
          borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ marginTop: 14, fontSize: 12, fontWeight: 700 }}>جاري التحميل...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ padding: 60, textAlign: 'center', fontFamily: F }}>
        <AlertCircle size={38} color={C.gold} style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>لم يتم العثور على الشخص</div>
        <button onClick={onBack} style={{ marginTop: 16, padding: '8px 18px', borderRadius: 8,
          background: C.gold, color: '#0a0a0a', border: 'none', fontWeight: 800, cursor: 'pointer' }}>رجوع</button>
      </div>
    )
  }

  const roles = profile.roles_summary || []
  const active = profile.status === 'active'
  const primaryRole = roles[0]
  const primaryColor = (ROLE_STYLES[primaryRole] || {}).plain || C.gold

  return (
    <div style={{ fontFamily: F, paddingTop: 0, color: 'var(--tx2)' }}>
      <style>{`
        .prs-card { background: #141414; border: 1px solid rgba(255,255,255,.06); border-radius: 14px;
          padding: 16px; transition: .2s; }
        .prs-card-title { font-size: 13px; font-weight: 800; color: var(--tx); margin-bottom: 12px;
          display: flex; align-items: center; gap: 8px; padding-bottom: 10px;
          border-bottom: 1px solid rgba(255,255,255,.05) }
        .prs-kv { display: flex; align-items: flex-start; gap: 10px; padding: 7px 0 }
        .prs-kv-ico { width: 26px; height: 26px; border-radius: 7px; background: rgba(212,160,23,.08);
          border: 1px solid rgba(212,160,23,.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0 }
        .prs-kv-text { flex: 1; min-width: 0 }
        .prs-kv-l { font-size: 10px; color: var(--tx5); font-weight: 700; margin-bottom: 2px }
        .prs-kv-v { font-size: 12.5px; color: var(--tx); font-weight: 600; word-break: break-word }
      `}</style>

      {/* Header row — matches Transfer Calc spacing */}
      <div style={{ marginBottom: 20, position: 'relative' }}>
        <button onClick={onBack} title="رجوع"
          style={{ position: 'absolute', top: -2, left: 0, zIndex: 2,
            height: 34, padding: '0 12px', borderRadius: 8,
            background: '#141414', border: '1px solid rgba(255,255,255,.06)',
            color: 'var(--tx2)', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: F, fontSize: 11, fontWeight: 700, transition: '.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.1)'; e.currentTarget.style.borderColor = 'rgba(212,160,23,.3)'; e.currentTarget.style.color = C.gold }}
          onMouseLeave={e => { e.currentTarget.style.background = '#141414'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = 'var(--tx2)' }}>
          <ArrowRight size={13} /> رجوع
        </button>

        <div style={{ position: 'absolute', top: -2, right: 0, zIndex: 2, display: 'flex', gap: 8 }}>
          <button onClick={() => setShowForm(true)}
            style={{ height: 34, padding: '0 14px', borderRadius: 8,
              border: '1px solid rgba(212,160,23,.3)', background: 'rgba(212,160,23,.08)',
              color: C.gold, fontFamily: F, fontSize: 11, fontWeight: 800,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Edit2 size={12} /> تعديل
          </button>
          {active ? (
            <button onClick={onArchive}
              style={{ height: 34, padding: '0 14px', borderRadius: 8,
                border: '1px solid rgba(192,57,43,.3)', background: 'rgba(192,57,43,.08)',
                color: '#e68a80', fontFamily: F, fontSize: 11, fontWeight: 800,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Archive size={12} /> أرشفة
            </button>
          ) : (
            <button onClick={onUnarchive}
              style={{ height: 34, padding: '0 14px', borderRadius: 8,
                border: '1px solid rgba(39,160,70,.3)', background: 'rgba(39,160,70,.08)',
                color: '#6dcc89', fontFamily: F, fontSize: 11, fontWeight: 800,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ArchiveRestore size={12} /> إعادة التفعيل
            </button>
          )}
        </div>

        <div style={{ fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px' }}>
          {profile.full_name_ar}
        </div>
        <div style={{ fontSize: 12, color: 'var(--tx4)', marginTop: 8, direction: 'ltr', textAlign: 'start' }}>
          {profile.full_name_en || '—'}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <StatusBadge status={profile.status} />
          {roles.length === 0
            ? <span style={{ fontSize: 10, color: 'var(--tx5)', fontWeight: 600 }}>لم يُعيَّن أي دور بعد</span>
            : roles.map(r => <RoleChip key={r} role={r} />)}
        </div>
      </div>

      {/* 3-column grid of cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="prs-card">
            <div className="prs-card-title"><Shield size={15} color={C.gold} /> الهوية</div>
            <KV icon={CreditCard} label="رقم الهوية" value={person?.id_number || '—'} dir="ltr" />
            <KV icon={Flag} label="الجنسية" value={nationality ? `${nationality.flag_emoji || ''} ${nationality.nationality_ar || nationality.name_ar}` : '—'} />
            <KV icon={Calendar} label="تاريخ الميلاد" value={person?.date_of_birth || '—'} dir="ltr" />
          </div>

          <div className="prs-card">
            <div className="prs-card-title"><Phone size={15} color={C.gold} /> التواصل</div>
            <KV icon={Phone} label="الجوال" value={person?.phone || '—'} dir="ltr" />
            {person?.secondary_phone && <KV icon={Phone} label="جوال ثانوي" value={person.secondary_phone} dir="ltr" />}
            <KV icon={Mail} label="البريد الإلكتروني" value={person?.email || '—'} dir="ltr" />
            <KV icon={MapPin} label="العنوان" value={person?.address || '—'} />
            <KV icon={Building2} label="الفرع" value={branch?.code || '—'} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="prs-card">
            <div className="prs-card-title">
              <Building2 size={15} color="#e5867a" />
              المنشآت المملوكة
              <span style={{ marginInlineStart: 'auto', fontSize: 10, fontWeight: 700,
                padding: '2px 9px', borderRadius: 6, background: 'rgba(255,255,255,.04)', color: 'var(--tx4)' }}>
                {owned.length}
              </span>
            </div>
            {owned.length === 0 ? <EmptyCard text="لا توجد منشآت مملوكة" /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {owned.map(o => (
                  <FacilityTile key={o.assignment_id || o.facility_id}
                    title={o.facility_name_ar}
                    subtitle={`نسبة الملكية ${o.ownership_percentage || 0}%`}
                    badge={o.is_primary ? 'أساسي' : null} color="#e5867a" />
                ))}
              </div>
            )}
          </div>

          <div className="prs-card">
            <div className="prs-card-title">
              <Briefcase size={15} color="#b58cf5" />
              المنشآت المُدارة
              <span style={{ marginInlineStart: 'auto', fontSize: 10, fontWeight: 700,
                padding: '2px 9px', borderRadius: 6, background: 'rgba(255,255,255,.04)', color: 'var(--tx4)' }}>
                {managed.length}
              </span>
            </div>
            {managed.length === 0 ? <EmptyCard text="لا توجد منشآت مُدارة" /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {managed.map(m => (
                  <FacilityTile key={m.assignment_id || m.facility_id}
                    title={m.facility_name_ar}
                    subtitle={m.manager_type || 'مدير'}
                    badge={m.is_primary ? 'أساسي' : null} color="#b58cf5" />
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="prs-card">
            <div className="prs-card-title"><UserCheck size={15} color={C.gold} /> الأدوار المُرتبطة</div>
            <ProfileRow Icon={UserCheck} label="ملف الموظف" linked={!!profile.user_id} color={C.gold} toast={toast} />
            <ProfileRow Icon={UserCheck} label="ملف العميل" linked={!!profile.client_id} color="#5ca0e6" toast={toast} />
            <ProfileRow Icon={UserCheck} label="ملف الوسيط" linked={!!profile.broker_id} color="#d9a15a" toast={toast} />
            <ProfileRow Icon={HardHat} label="ملف العامل" linked={!!profile.worker_id} color="#c0c0c0" toast={toast} />
          </div>

          {person?.notes && (
            <div className="prs-card">
              <div className="prs-card-title">ملاحظات</div>
              <div style={{ fontSize: 12, color: 'var(--tx2)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {person.notes}
              </div>
            </div>
          )}
        </div>
      </div>

      <PersonFormModal open={showForm} onClose={() => setShowForm(false)}
        personId={personId} profile={profile} onSaved={() => load()}
        toast={toast} countries={countries} branches={branches} />
    </div>
  )
}

const KV = ({ icon: Icon, label, value, dir }) => (
  <div className="prs-kv">
    <div className="prs-kv-ico"><Icon size={13} color={C.gold} opacity={.85} /></div>
    <div className="prs-kv-text">
      <div className="prs-kv-l">{label}</div>
      <div className="prs-kv-v" style={{ direction: dir || 'rtl', textAlign: dir === 'ltr' ? 'start' : 'inherit' }}>
        {value || '—'}
      </div>
    </div>
  </div>
)

const FacilityTile = ({ title, subtitle, badge, color }) => (
  <div style={{ padding: '10px 12px', borderRadius: 9,
    background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.04)',
    display: 'flex', alignItems: 'center', gap: 10 }}>
    <div style={{ width: 30, height: 30, borderRadius: 8, background: color + '1a',
      border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Building2 size={14} color={color} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {title || '—'}
      </div>
      <div style={{ fontSize: 10, color: 'var(--tx5)', marginTop: 2 }}>{subtitle}</div>
    </div>
    {badge && (
      <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 5,
        background: color + '22', color: color, border: `1px solid ${color}44`, flexShrink: 0 }}>
        {badge}
      </span>
    )}
  </div>
)

const EmptyCard = ({ text }) => (
  <div style={{ padding: '18px 12px', textAlign: 'center', fontSize: 11, color: 'var(--tx5)',
    background: 'rgba(255,255,255,.02)', borderRadius: 9, border: '1px dashed rgba(255,255,255,.06)' }}>
    {text}
  </div>
)

const ProfileRow = ({ Icon, label, linked, color, toast }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,.03)' }}>
    <div style={{ width: 28, height: 28, borderRadius: 8, background: color + '15',
      border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={12} color={color} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx2)' }}>{label}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: linked ? color : 'var(--tx5)', marginTop: 2 }}>
        {linked ? '● مُرتبط' : 'غير مُرتبط'}
      </div>
    </div>
    <button type="button" onClick={() => toast?.(linked ? 'فتح الملف قريباً' : 'الربط قريباً')}
      style={{ height: 24, padding: '0 10px', borderRadius: 7,
        border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)',
        color: 'var(--tx3)', fontFamily: F, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
      {linked ? 'فتح' : 'ربط'}
    </button>
  </div>
)

export default function PersonsPage({ toast, user }) {
  const [view, setView] = useState('list')
  const [detailId, setDetailId] = useState(null)
  const [countries, setCountries] = useState([])
  const [branches, setBranches] = useState([])

  useEffect(() => {
    personsService.loadReferenceData().then(({ countries, branches }) => {
      setCountries(countries); setBranches(branches)
    })
  }, [])

  useEffect(() => {
    const parseHash = () => {
      const h = window.location.hash.replace(/^#/, '')
      const m = h.match(/^\/?admin\/persons\/([a-f0-9-]{36})/i)
      if (m) { setDetailId(m[1]); setView('detail') }
      else if (/^\/?admin\/persons/i.test(h)) { setDetailId(null); setView('list') }
    }
    parseHash()
    window.addEventListener('hashchange', parseHash)
    return () => window.removeEventListener('hashchange', parseHash)
  }, [])

  const openDetail = (id) => {
    setDetailId(id); setView('detail')
    try { window.history.replaceState(null, '', '#/admin/persons/' + id) } catch {}
  }
  const goBack = () => {
    setView('list'); setDetailId(null)
    try { window.history.replaceState(null, '', '#/admin/persons') } catch {}
  }

  return (
    <div style={{ width: '100%', minHeight: '100%' }}>
      {view === 'detail' && detailId ? (
        <PersonDetail personId={detailId} onBack={goBack} toast={toast}
          countries={countries} branches={branches} />
      ) : (
        <PersonsList toast={toast} countries={countries} branches={branches}
          onOpenDetail={openDetail} user={user} />
      )}
    </div>
  )
}
