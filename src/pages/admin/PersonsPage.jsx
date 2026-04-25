import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import ReactDOM from 'react-dom'
import {
  Users, Plus, Eye, Edit2, Archive, ArchiveRestore, ArrowRight,
  Phone, Mail, MapPin, Building2, Briefcase, UserCheck, HardHat,
  Shield, CreditCard, Calendar, Flag, AlertCircle, Info, Copy, Power,
  Trash2, X
} from 'lucide-react'
import * as personsService from '../../services/personsService.js'
import PersonFormModal from '../../components/persons/PersonFormModal.jsx'
import OfficialStampBadge from '../../components/ui/OfficialStampBadge.jsx'
import RolePageRouter from './roles/RolePageRouter.jsx'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#D4A017', ok: '#27a046', red: '#c0392b', blue: '#3483b4' }

const ROLE_STYLES = {
  'مستخدم':  { bg: 'rgba(212,160,23,.15)', fg: '#d9bf5e', bd: 'rgba(212,160,23,.3)', plain: C.gold },
  'عميل':    { bg: 'rgba(52,131,180,.18)', fg: '#5ca0e6', bd: 'rgba(52,131,180,.35)', plain: C.blue },
  'وسيط':    { bg: 'rgba(168,114,40,.18)', fg: '#d9a15a', bd: 'rgba(168,114,40,.35)', plain: '#d9a15a' },
  'عامل':    { bg: 'rgba(155,155,155,.12)', fg: '#c0c0c0', bd: 'rgba(155,155,155,.25)', plain: '#c0c0c0' },
  'مالك':    { bg: 'rgba(192,57,43,.18)', fg: '#e5867a', bd: 'rgba(192,57,43,.35)', plain: '#e5867a' },
  'مدير':    { bg: 'rgba(155,89,182,.18)', fg: '#b58cf5', bd: 'rgba(155,89,182,.35)', plain: '#b58cf5' },
  'مستفيد':  { bg: 'rgba(227,179,65,.15)', fg: '#e3b341', bd: 'rgba(227,179,65,.3)', plain: '#e3b341' },
  'مشرف':    { bg: 'rgba(90,203,176,.15)', fg: '#5acbb0', bd: 'rgba(90,203,176,.3)', plain: '#5acbb0' },
  'سعودة':   { bg: 'rgba(52,131,180,.15)', fg: '#6bb6e6', bd: 'rgba(52,131,180,.3)', plain: '#3483b4' },
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

function PersonsList({ toast, countries, branches, idTypes, genders, onOpenDetail, user }) {
  const isGM = !user?.roles || user?.roles?.name_ar === 'المدير العام' || user?.roles?.name_en === 'General Manager'

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQ, setSearchQ] = useState('')
  const [advOpen, setAdvOpen] = useState(false)
  const [advFilter, setAdvFilter] = useState({ from: '', to: '', role: '', nationality: '' })

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editProfile, setEditProfile] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

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

  const onDelete = (p) => {
    if (p.is_system) { toast?.('لا يمكن حذف هذا الشخص لأنه محمي'); return }
    setDeleteTarget(p)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await personsService.deletePerson(deleteTarget.person_id)
      toast?.('تم حذف الشخص')
      setDeleteTarget(null)
      load()
    } catch (e) {
      const code = e?.code
      if (code === '23503') toast?.('لا يمكن الحذف — مرتبط بسجلات أخرى')
      else if (code === '23514') toast?.('لا يمكن حذف هذا الشخص لأنه محمي')
      else toast?.('خطأ: ' + (e.message || ''))
    } finally {
      setDeleting(false)
    }
  }

  const openEdit = (p) => { setEditId(p.person_id); setEditProfile(p); setShowForm(true) }
  const openAdd = () => { setEditId(null); setEditProfile(null); setShowForm(true) }

  // ── Filters (client-side, matches Transfer Calc pattern) ───────────
  const matches = (r) => {
    if (searchQ) {
      const q = searchQ.toLowerCase().trim()
      const hay = [r.name_ar, r.name_en, r.id_number, r.phone_primary, r.email]
        .filter(Boolean).map(String).map(s => s.toLowerCase()).join(' ')
      if (!hay.includes(q)) return false
    }
    if (advFilter.role && !(r.roles_summary || []).includes(advFilter.role)) return false
    if (advFilter.nationality && r.nationality_id !== advFilter.nationality) return false
    if (advFilter.from && r.created_at && new Date(r.created_at) < new Date(advFilter.from)) return false
    if (advFilter.to && r.created_at && new Date(r.created_at) > new Date(advFilter.to + 'T23:59:59')) return false
    return true
  }

  const filteredData = useMemo(() => rows.filter(matches), [rows, searchQ, advFilter])

  // ── Role counts (for the 3 mini-stat boxes) ───────────────────────
  const roleCounts = useMemo(() => {
    const c = { 'مستخدم': 0, 'عميل': 0, 'وسيط': 0, 'عامل': 0, 'مدير': 0, 'مالك': 0, 'مستفيد': 0, 'مشرف': 0, 'سعودة': 0 }
    rows.forEach(r => (r.roles_summary || []).forEach(role => { if (role in c) c[role]++ }))
    return c
  }, [rows])

  const protectedCount = rows.filter(r => r.is_system).length
  const totalRoles = rows.reduce((s, r) => s + (r.roles_summary || []).length, 0)

  const sortedFiltered = [...filteredData].sort((a, b) =>
    new Date(b.created_at || 0) - new Date(a.created_at || 0))

  // ── Area chart: last 7 days of registrations, bucketed by role ──
  const now = new Date()
  const periodSeries = (() => {
    const buckets = 7
    const bucketMs = 86400000
    const result = Array.from({ length: buckets }, () => ({ employee: 0, broker: 0, client: 0, total: 0 }))
    rows.forEach(r => {
      if (!r.created_at) return
      const d = new Date(r.created_at)
      const age = Math.floor((now - d) / bucketMs)
      if (age < 0 || age >= buckets) return
      const idx = buckets - 1 - age
      result[idx].total += 1
      const roles = r.roles_summary || []
      if (roles.includes('مستخدم')) result[idx].employee += 1
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
          border-color:rgba(255,255,255,.08)!important; box-shadow:none!important;
        }
        /* Re-enable the app-wide gold search-box focus ring: this selector
           beats the .px-noring x4 specificity above. */
        input.px-noring.px-noring.px-noring.px-noring[placeholder^="ابحث"]:focus,
        input.px-noring.px-noring.px-noring.px-noring[placeholder^="ابحث"]:not(:placeholder-shown){
          border-color:rgba(212,160,23,.55)!important;
          box-shadow:0 0 0 1px rgba(212,160,23,.18), inset 0 1px 2px rgba(0,0,0,.2)!important;
        }
        input[type="date"].px-noring.px-noring.px-noring.px-noring::-webkit-calendar-picker-indicator{
          filter:invert(70%) sepia(60%) saturate(500%) hue-rotate(20deg)
        }
      `}</style>

      {/* ═══ Header ═══ */}
      <div style={{ marginBottom: 14, position: 'relative' }}>
        {/* Add button (top-left) — outlined gold, no fill */}
        <button onClick={openAdd}
          style={{ position: 'absolute', top: -2, left: 0, zIndex: 2,
            height: 34, padding: '0 14px', borderRadius: 8,
            background: 'transparent',
            border: `1px solid ${C.gold}`, color: C.gold,
            fontFamily: F, fontSize: 11, fontWeight: 800,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
            transition: '.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.08)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
          شخص <Plus size={13} strokeWidth={2.5} />
        </button>

        <div style={{ fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px' }}>الأشخاص</div>
        <div style={{ fontSize: 12, color: 'var(--tx4)', marginTop: 8 }}>
          إدارة هويات الأشخاص والأدوار المرتبطة بهم — موظفون، عملاء، وسطاء، ملاك ومدراء منشآت
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
              { l: 'مستخدمون', v: roleCounts['مستخدم'], c: C.gold },
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
            <div style={{ minWidth: 0, padding: '0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 600, whiteSpace: 'nowrap' }}>عمّال</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: '#c0c0c0', direction: 'ltr' }}>{roleCounts['عامل'] || 0}</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 600, whiteSpace: 'nowrap' }}>ملّاك</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: '#e5867a', direction: 'ltr' }}>{roleCounts['مالك'] || 0}</span>
            </div>
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
            {totalRoles} دور · {protectedCount} محمي
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
              <div><div style={lblS}>الجنسية</div>
                <select className="px-noring" value={advFilter.nationality}
                  onChange={e => setAdvFilter(f => ({ ...f, nationality: e.target.value }))} style={selS}>
                  <option value="">الكل</option>
                  {countries.slice(0, 60).map(c => (
                    <option key={c.id} value={c.id}>{c.nationality_ar || c.name_ar}</option>
                  ))}
                </select></div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={() => setAdvFilter({ from: '', to: '', role: '', nationality: '' })}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sortedFiltered.map(r => {
            const roles = r.roles_summary || []
            const primaryRole = roles[0]
            const primaryColor = (ROLE_STYLES[primaryRole] || {}).plain || C.gold
            const nationality = (countries || []).find(c => c.id === r.nationality_id)
            const relTime = (() => {
              if (!r.created_at) return null
              const diffMs = Date.now() - new Date(r.created_at).getTime()
              const h = Math.floor(diffMs / 3600000)
              if (h < 1) return 'الآن'
              if (h < 24) return h === 1 ? 'منذ ساعة' : 'منذ ' + h + ' ساعات'
              const d = Math.floor(h / 24)
              return d === 1 ? 'أمس' : 'منذ ' + d + ' يوم'
            })()
            const CopyBtn = ({ val }) => (
              <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(val); toast?.('تم النسخ') }}
                title="نسخ"
                style={{ width: 18, height: 18, background: 'transparent', border: 'none', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                  color: 'var(--tx6)', transition: 'color .15s', flexShrink: 0, opacity: .55 }}
                onMouseEnter={e => { e.currentTarget.style.color = C.gold; e.currentTarget.style.opacity = 1 }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--tx6)'; e.currentTarget.style.opacity = .55 }}>
                <Copy size={14} strokeWidth={2} />
              </button>
            )

            return (
              <div key={r.person_id} onClick={() => onOpenDetail(r.person_id)}
                style={{ background: 'linear-gradient(180deg,rgba(0,0,0,.3) 0%,rgba(0,0,0,.2) 100%)',
                  borderRadius: 16, overflow: 'visible',
                  transition: '.25s cubic-bezier(.4,0,.2,1)',
                  border: '1px solid rgba(255,255,255,.07)',
                  position: 'relative', cursor: 'pointer',
                  padding: '18px 22px',
                  display: 'grid', gridTemplateColumns: '1fr auto',
                  gap: 22, alignItems: 'center' }}
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

                {/* Quick actions (top-left) + protected shield */}
                <div onClick={e => e.stopPropagation()}
                  style={{ position: 'absolute', top: 10, left: 10, zIndex: 2, display: 'flex', gap: 4 }}>
                  {r.is_system ? (
                    <span title="شخص محمي"
                      style={{ width: 26, height: 26, borderRadius: '50%',
                        background: 'rgba(212,160,23,.08)', border: '1px solid rgba(212,160,23,.3)',
                        color: C.gold,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                      <Shield size={12} />
                    </span>
                  ) : (
                    <button title="حذف" onClick={() => onDelete(r)}
                      style={{ width: 26, height: 26, borderRadius: '50%',
                        background: 'rgba(192,57,43,.08)', border: '1px solid rgba(192,57,43,.25)',
                        color: '#e68a80', cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                      <Archive size={12} />
                    </button>
                  )}
                </div>

                {/* ═══ Section 1: Name + English name + Roles ═══ */}
                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Arabic name + flag (after name) + copy */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)', whiteSpace: 'nowrap', letterSpacing: '.15px' }}>
                      {r.name_ar}
                    </span>
                    {nationality?.code && (
                      <img
                        src={`https://flagcdn.com/w40/${nationality.code.toLowerCase()}.png`}
                        srcSet={`https://flagcdn.com/w80/${nationality.code.toLowerCase()}.png 2x`}
                        width={20}
                        height={15}
                        alt={nationality.nationality_ar || nationality.name_ar || ''}
                        title={nationality.nationality_ar || nationality.name_ar || ''}
                        style={{ borderRadius: 2, objectFit: 'cover', flexShrink: 0, verticalAlign: 'middle' }}
                      />
                    )}
                    <CopyBtn val={r.name_ar} />
                  </div>

                  {/* English name + copy */}
                  {r.name_en && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ direction: 'ltr', color: 'var(--tx2)', fontWeight: 600, fontSize: 13, letterSpacing: '.2px' }}>
                        {r.name_en}
                      </span>
                      <CopyBtn val={r.name_en} />
                    </div>
                  )}

                  {/* Role tags — plain text with dot separators */}
                  {roles.length > 0 && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
                      fontSize: 11, color: 'rgba(255,255,255,.8)', fontWeight: 600, letterSpacing: '.2px' }}>
                      {roles.map((role, i) => {
                        const rc = (ROLE_STYLES[role] || {}).plain || 'rgba(255,255,255,.8)'
                        return (
                          <React.Fragment key={role}>
                            {i > 0 && <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.3)' }} />}
                            <span style={{ color: rc }}>{role}</span>
                          </React.Fragment>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* ═══ Section 2 (far left): Contact info ═══ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start',
                  borderInlineStart: '1px dashed rgba(255,255,255,.12)', paddingInlineStart: 18, flexShrink: 0 }}>
                  {r.id_number && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, direction: 'ltr' }}>
                      <CreditCard size={12} color={C.gold} opacity={.7} />
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700,
                        color: C.gold, letterSpacing: '.4px' }}>{r.id_number}</span>
                      <CopyBtn val={r.id_number} />
                    </div>
                  )}
                  {r.phone_primary && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, direction: 'ltr' }}>
                      <Phone size={12} color="var(--tx5)" opacity={.7} />
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700,
                        color: 'var(--tx2)', letterSpacing: '.3px' }}>{r.phone_primary}</span>
                      <CopyBtn val={r.phone_primary} />
                    </div>
                  )}
                  {r.email && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, direction: 'ltr' }}>
                      <Mail size={12} color="var(--tx5)" opacity={.7} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)', letterSpacing: '.2px' }}>
                        {r.email}
                      </span>
                      <CopyBtn val={r.email} />
                    </div>
                  )}
                </div>

              </div>
            )
          })}
        </div>
      )}

      <PersonFormModal open={showForm} onClose={() => setShowForm(false)}
        personId={editId} profile={editProfile} onSaved={() => load()}
        toast={toast} countries={countries} branches={branches}
        idTypes={idTypes} genders={genders} />

      <DeleteConfirmModal target={deleteTarget} saving={deleting}
        onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
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
function PersonDetail({ personId, onBack, onOpenRole, toast, countries, branches, idTypes, genders }) {
  const openRole = (key) => onOpenRole?.(key)
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

  const nationality = useMemo(() => {
    if (!person?.nationality_id || !countries) return null
    return countries.find(c => c.id === person.nationality_id)
  }, [person, countries])

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
  const primaryRole = roles[0]
  const primaryColor = (ROLE_STYLES[primaryRole] || {}).plain || C.gold

  return (
    <div style={{ fontFamily: F, paddingTop: 0, color: 'var(--tx2)' }}>
      <style>{`
        .prs-card { background: #141414; border: 1px solid rgba(255,255,255,.06); border-radius: 14px;
          padding: 16px; transition: .2s; }
        .prs-card-title { font-size: 15px; font-weight: 800; color: var(--tx); margin-bottom: 12px;
          display: flex; align-items: center; gap: 8px; padding-bottom: 10px;
          border-bottom: 1px solid rgba(255,255,255,.05) }
        .prs-kv { display: flex; align-items: flex-start; gap: 10px; padding: 7px 0 }
        .prs-kv-ico { width: 26px; height: 26px; border-radius: 7px; background: rgba(212,160,23,.08);
          border: 1px solid rgba(212,160,23,.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0 }
        .prs-kv-text { flex: 1; min-width: 0 }
        .prs-kv-l { font-size: 10px; color: var(--tx2); font-weight: 700; margin-bottom: 3px; letter-spacing: .2px }
        .prs-kv-v { font-size: 12.5px; color: var(--tx); font-weight: 600; word-break: break-word }
      `}</style>

      {/* Header row — matches Transfer Calc spacing */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px' }}>
          {profile.name_ar}
        </div>
        <div style={{ fontSize: 15, color: 'var(--tx2)', fontWeight: 600, marginTop: 8, textAlign: 'right', letterSpacing: '.3px' }}>
          <span style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>{profile.name_en || '—'}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 14 }}>
          <button onClick={onBack} title="رجوع"
            style={{ height: 34, padding: '0 12px', borderRadius: 8,
              background: '#141414', border: '1px solid rgba(255,255,255,.06)',
              color: 'var(--tx2)', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: F, fontSize: 11, fontWeight: 700, transition: '.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.1)'; e.currentTarget.style.borderColor = 'rgba(212,160,23,.3)'; e.currentTarget.style.color = C.gold }}
            onMouseLeave={e => { e.currentTarget.style.background = '#141414'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = 'var(--tx2)' }}>
            <ArrowRight size={13} /> رجوع
          </button>
        </div>
      </div>

      {/* 3-column grid of cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="prs-card">
            <div className="prs-card-title">
              <Shield size={15} color={C.gold} />
              البيانات الشخصية
              <button onClick={() => setShowForm(true)} title="تعديل"
                style={{ marginInlineStart: 'auto', width: 26, height: 26, borderRadius: 7,
                  background: 'rgba(212,160,23,.08)', border: '1px solid rgba(212,160,23,.25)',
                  color: C.gold, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                  transition: '.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.16)'; e.currentTarget.style.borderColor = 'rgba(212,160,23,.5)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,160,23,.08)'; e.currentTarget.style.borderColor = 'rgba(212,160,23,.25)' }}>
                <Edit2 size={12} strokeWidth={2.2} />
              </button>
            </div>
            <KV icon={CreditCard} label="رقم الهوية" value={person?.id_number || '—'} dir="ltr" copy={person?.id_number} toast={toast} />
            <KV icon={Flag} label="الجنسية" dir="ltr" value={nationality ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, direction: 'rtl' }}>
                {nationality.code && (
                  <img
                    src={`https://flagcdn.com/w40/${nationality.code.toLowerCase()}.png`}
                    srcSet={`https://flagcdn.com/w80/${nationality.code.toLowerCase()}.png 2x`}
                    width={20}
                    height={15}
                    alt=""
                    style={{ borderRadius: 2, objectFit: 'cover', flexShrink: 0, verticalAlign: 'middle' }}
                  />
                )}
                <span>{nationality.nationality_ar || nationality.name_ar}</span>
              </span>
            ) : '—'} />
            <KV icon={Calendar} label="تاريخ الميلاد" value={person?.date_of_birth || '—'} dir="ltr" copy={person?.date_of_birth} toast={toast} />
            <KV icon={Phone} label="الجوال" value={person?.phone_primary || '—'} dir="ltr" copy={person?.phone_primary} toast={toast} />
            {person?.phone_secondary && <KV icon={Phone} label="جوال ثانوي" value={person.phone_secondary} dir="ltr" copy={person.phone_secondary} toast={toast} />}
            <KV icon={Mail} label="البريد الإلكتروني" value={person?.email || '—'} dir="ltr" copy={person?.email} toast={toast} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="prs-card">
            <div className="prs-card-title"><UserCheck size={15} color={C.gold} /> ملفات النظام والمكتب (داخلي)</div>
            <ProfileRow Icon={UserCheck} label="ملف المستخدم" linked={!!profile.user_id} color={C.gold} toast={toast}
              onOpen={() => openRole('user')} />
            <ProfileRow Icon={UserCheck} label="ملف العميل" linked={!!profile.client_id} color="#5ca0e6" toast={toast}
              onOpen={() => openRole('client')} />
            <ProfileRow Icon={UserCheck} label="ملف الوسيط" linked={!!profile.broker_id} color="#d9a15a" toast={toast}
              onOpen={() => openRole('broker')} />
            <ProfileRow Icon={UserCheck} label="ملف المعقب"
              assigned={(profile.role_flags || []).includes('tracker')} color="#06b6d4" toast={toast}
              onOpen={() => openRole('tracker')}
              linkLabel="تعيين" assignedLabel="معيّن" />
            <ProfileRow Icon={Phone} label="ملف SMS Forwarder" linked={!!profile.sms_forwarder_id} color="#f39c12" toast={toast}
              count={Number(profile.sms_messages_count || 0) || null} unit="رسالة"
              onOpen={() => openRole('sms_forwarder')} />
          </div>

          <div className="prs-card">
            <div className="prs-card-title"><Briefcase size={15} color="#e5867a" /> ملفات السجل التجاري</div>
            {(() => {
              const flags = profile.role_flags || []
              return (
                <>
                  <ProfileRow Icon={UserCheck} label="ملف المالك" linked={Number(profile.owned_facilities_count || 0) > 0}
                    assigned={flags.includes('owner')} color="#e5867a" toast={toast}
                    count={Number(profile.owned_facilities_count || 0)} onOpen={() => openRole('owner')}
                    linkLabel="تعيين" assignedLabel="معيّن" />
                  <ProfileRow Icon={UserCheck} label="ملف المستفيد" linked={Number(profile.beneficiary_facilities_count || 0) > 0}
                    assigned={flags.includes('beneficiary')} color="#e3b341" toast={toast}
                    count={Number(profile.beneficiary_facilities_count || 0)} onOpen={() => openRole('beneficiary')}
                    linkLabel="تعيين" assignedLabel="معيّن" />
                  <ProfileRow Icon={UserCheck} label="ملف المدير" linked={Number(profile.managed_facilities_count || 0) > 0}
                    assigned={flags.includes('manager')} color="#b58cf5" toast={toast}
                    count={Number(profile.managed_facilities_count || 0)} onOpen={() => openRole('manager')}
                    linkLabel="تعيين" assignedLabel="معيّن" />
                  <ProfileRow Icon={UserCheck} label="ملف المشرف" linked={Number(profile.supervisor_facilities_count || 0) > 0}
                    assigned={flags.includes('supervisor')} color="#5acbb0" toast={toast}
                    count={Number(profile.supervisor_facilities_count || 0)} onOpen={() => openRole('supervisor')}
                    linkLabel="تعيين" assignedLabel="معيّن" />
                </>
              )
            })()}
          </div>

          <div className="prs-card">
            <div className="prs-card-title"><HardHat size={15} color="#c0c0c0" /> ملفات القوى العاملة</div>
            <ProfileRow Icon={HardHat} label="ملف العامل" linked={!!profile.worker_id} color="#c0c0c0" toast={toast}
              onOpen={() => openRole('worker')} />
            <ProfileRow Icon={UserCheck} label="ملف السعودة" linked={Number(profile.saudization_weeks_count || 0) > 0} color="#3483b4" toast={toast}
              count={Number(profile.saudization_weeks_count || 0)} unit="أسبوع"
              onOpen={() => openRole('saudization')} />
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
        toast={toast} countries={countries} branches={branches}
        idTypes={idTypes} genders={genders} />
    </div>
  )
}

const DeleteConfirmModal = ({ target, saving, onCancel, onConfirm }) => {
  if (!target) return null
  return ReactDOM.createPortal(
    <div onClick={() => !saving && onCancel()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,.8)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} dir="rtl"
        style={{ background: '#1a1a1a', borderRadius: 16, width: 420, maxWidth: '95vw',
          padding: '28px 26px', border: '1px solid rgba(192,57,43,.2)',
          boxShadow: '0 24px 60px rgba(0,0,0,.5)', fontFamily: F }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12,
            background: 'rgba(192,57,43,.1)', border: '1px solid rgba(192,57,43,.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e68a80', flexShrink: 0 }}>
            <Trash2 size={20} strokeWidth={2} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'rgba(255,255,255,.95)', marginBottom: 2 }}>
              حذف الشخص
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx5)' }}>
              هذا الإجراء يرسل السجل إلى الأرشيف
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 16px', borderRadius: 10,
          background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)',
          fontSize: 13, color: 'var(--tx2)', lineHeight: 1.7, marginBottom: 20 }}>
          هل أنت متأكد من حذف <span style={{ color: C.gold, fontWeight: 800 }}>"{target.name_ar}"</span>؟
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-start' }}>
          <button onClick={onConfirm} disabled={saving}
            style={{ height: 38, padding: '0 18px', borderRadius: 9,
              background: '#c0392b', border: '1px solid #c0392b',
              color: '#fff', fontFamily: F, fontSize: 12, fontWeight: 800,
              cursor: saving ? 'wait' : 'pointer', opacity: saving ? .7 : 1,
              display: 'inline-flex', alignItems: 'center', gap: 6, transition: '.15s' }}>
            <Trash2 size={13} strokeWidth={2.5} />
            {saving ? 'جاري الحذف...' : 'حذف'}
          </button>
          <button onClick={onCancel} disabled={saving}
            style={{ height: 38, padding: '0 18px', borderRadius: 9,
              background: 'transparent', border: '1px solid rgba(255,255,255,.15)',
              color: 'var(--tx2)', fontFamily: F, fontSize: 12, fontWeight: 700,
              cursor: saving ? 'wait' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6, transition: '.15s' }}>
            إلغاء
          </button>
        </div>
      </div>
    </div>, document.body
  )
}

const KV = ({ icon: Icon, label, value, dir, copy, toast }) => (
  <div className="prs-kv">
    <div className="prs-kv-ico"><Icon size={13} color={C.gold} opacity={.85} /></div>
    <div className="prs-kv-text">
      <div className="prs-kv-l">{label}</div>
      <div className="prs-kv-v" style={{ direction: dir || 'rtl', textAlign: dir === 'ltr' ? 'start' : 'inherit',
        display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{value || '—'}</span>
        {copy && (
          <button type="button" title="نسخ"
            onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(copy); toast?.('تم النسخ') }}
            style={{ width: 20, height: 20, borderRadius: 5, background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0,
              color: 'var(--tx6)', opacity: .55, transition: '.15s', flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.color = C.gold; e.currentTarget.style.opacity = 1 }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--tx6)'; e.currentTarget.style.opacity = .55 }}>
            <Copy size={12} strokeWidth={2} />
          </button>
        )}
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

const RoleGroupLabel = ({ text }) => (
  <div style={{
    fontSize: 10, fontWeight: 800, color: C.gold, letterSpacing: '.4px',
    marginTop: 14, marginBottom: 4, paddingBottom: 6,
    borderBottom: '1px dashed rgba(212,160,23,.2)',
    textTransform: 'none'
  }}>
    {text}
  </div>
)

const ProfileRow = ({ Icon, label, linked, assigned, color, toast, count, unit, onOpen, linkLabel = 'تعيين', assignedLabel = 'معيّن' }) => {
  const isLinked = !!linked
  const isAssigned = !isLinked && !!assigned
  const active = isLinked || isAssigned
  const statusText = isLinked
    ? (count != null ? `● ${count} ${unit || 'منشأة'} · مرتبط` : '● مرتبط')
    : isAssigned ? '● معيّن — غير مرتبط بمنشأة بعد' : 'لم يُعيّن بعد'
  const btnLabel = isLinked ? 'فتح' : isAssigned ? assignedLabel : linkLabel
  // Three visual states for the button:
  // - Linked / Assigned (active): solid colored
  // - Not assigned: dashed border (hints "potential / opt-in" action)
  const btnBorderStyle = active ? 'solid' : 'dashed'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px', marginBottom: 6, borderRadius: 10,
      border: `1px dashed ${active ? color + '40' : 'rgba(255,255,255,.10)'}`,
      background: 'rgba(255,255,255,.015)' }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: color + '15',
        border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={12} color={color} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx2)' }}>{label}</div>
        <div style={{ fontSize: 10, fontWeight: 600, color: active ? color : 'var(--tx5)', marginTop: 2 }}>
          {statusText}
        </div>
      </div>
      <button type="button" onClick={onOpen || (() => toast?.(active ? 'فتح الملف قريباً' : 'الربط قريباً'))}
        style={{ height: 28, minWidth: 64, padding: '0 16px', borderRadius: 7,
          border: `1px ${btnBorderStyle} ${active ? color + '55' : 'rgba(255,255,255,.25)'}`,
          background: active ? color + '18' : 'transparent',
          color: active ? color : 'rgba(255,255,255,.6)', fontFamily: F, fontSize: 11, fontWeight: 800, cursor: 'pointer',
          transition: '.15s' }}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.color = '#fff'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,.6)'
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            e.currentTarget.style.color = 'rgba(255,255,255,.6)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,.25)'
          }
        }}>
        {btnLabel}
      </button>
    </div>
  )
}

export default function PersonsPage({ toast, user }) {
  const [view, setView] = useState('list')
  const [detailId, setDetailId] = useState(null)
  const [roleKey, setRoleKey] = useState(null)
  const [countries, setCountries] = useState([])
  const [branches, setBranches] = useState([])
  const [idTypes, setIdTypes] = useState([])
  const [genders, setGenders] = useState([])

  useEffect(() => {
    personsService.loadReferenceData().then(({ countries, branches, idTypes, genders }) => {
      setCountries(countries); setBranches(branches)
      setIdTypes(idTypes || []); setGenders(genders || [])
    })
  }, [])

  useEffect(() => {
    const parseHash = () => {
      const h = window.location.hash.replace(/^#/, '')
      const mRole = h.match(/^\/?admin\/persons\/([a-f0-9-]{36})\/role\/([a-z_]+)/i)
      if (mRole) { setDetailId(mRole[1]); setRoleKey(mRole[2]); setView('role'); return }
      const m = h.match(/^\/?admin\/persons\/([a-f0-9-]{36})/i)
      if (m) { setDetailId(m[1]); setRoleKey(null); setView('detail') }
      else if (/^\/?admin\/persons/i.test(h)) { setDetailId(null); setRoleKey(null); setView('list') }
    }
    parseHash()
    window.addEventListener('hashchange', parseHash)
    return () => window.removeEventListener('hashchange', parseHash)
  }, [])

  const openDetail = (id) => {
    setDetailId(id); setRoleKey(null); setView('detail')
    try { window.history.replaceState(null, '', '#/admin/persons/' + id) } catch {}
  }
  const openRole = (id, key) => {
    setDetailId(id); setRoleKey(key); setView('role')
    try { window.history.replaceState(null, '', `#/admin/persons/${id}/role/${key}`) } catch {}
  }
  const goBackToDetail = () => {
    setRoleKey(null); setView('detail')
    try { window.history.replaceState(null, '', '#/admin/persons/' + detailId) } catch {}
  }
  const goBack = () => {
    setView('list'); setDetailId(null); setRoleKey(null)
    try { window.history.replaceState(null, '', '#/admin/persons') } catch {}
  }

  return (
    <div style={{ width: '100%', minHeight: '100%' }}>
      {view === 'role' && detailId && roleKey ? (
        <RolePageRouter roleKey={roleKey} personId={detailId} onBack={goBackToDetail}
          toast={toast} countries={countries} branches={branches} idTypes={idTypes} genders={genders} user={user} />
      ) : view === 'detail' && detailId ? (
        <PersonDetail personId={detailId} onBack={goBack} onOpenRole={(key) => openRole(detailId, key)}
          toast={toast} countries={countries} branches={branches} idTypes={idTypes} genders={genders} />
      ) : (
        <PersonsList toast={toast} countries={countries} branches={branches}
          idTypes={idTypes} genders={genders}
          onOpenDetail={openDetail} user={user} />
      )}
    </div>
  )
}
