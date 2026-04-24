import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Users, Plus, Search, Eye, Edit2, Archive, ArchiveRestore, ChevronLeft, ChevronRight,
  ArrowRight, ArrowLeft, Phone, Mail, MapPin, Building2, Briefcase, UserCheck, HardHat,
  Shield, CreditCard, Calendar, Flag, X, MoreHorizontal, AlertCircle
} from 'lucide-react'
import * as personsService from '../../services/personsService.js'
import PersonFormModal from '../../components/persons/PersonFormModal.jsx'

const F = "'Cairo','Tajawal',sans-serif"
const GOLD = '#D4A017'

const ROLE_STYLES = {
  'موظف مكتب': { bg: 'rgba(212,160,23,.15)', fg: '#d9bf5e', bd: 'rgba(212,160,23,.3)' },
  'عامل':       { bg: 'rgba(155,155,155,.12)', fg: '#c0c0c0', bd: 'rgba(155,155,155,.25)' },
  'وسيط':       { bg: 'rgba(168,114,40,.18)', fg: '#d9a15a', bd: 'rgba(168,114,40,.35)' },
  'عميل':       { bg: 'rgba(52,131,180,.18)', fg: '#5ca0e6', bd: 'rgba(52,131,180,.35)' },
  'مدير منشأة': { bg: 'rgba(155,89,182,.18)', fg: '#b58cf5', bd: 'rgba(155,89,182,.35)' },
  'مالك منشأة': { bg: 'rgba(192,57,43,.18)', fg: '#e5867a', bd: 'rgba(192,57,43,.35)' },
}

const RoleChip = ({ role }) => {
  const s = ROLE_STYLES[role] || { bg: 'rgba(255,255,255,.06)', fg: 'var(--tx3)', bd: 'rgba(255,255,255,.1)' }
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color: s.fg,
      background: s.bg, border: `1px solid ${s.bd}`,
      padding: '3px 9px', borderRadius: 6, whiteSpace: 'nowrap', lineHeight: 1.3
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

const FilterSelect = ({ value, onChange, options, icon: Icon, placeholder }) => {
  const [open, setOpen] = useState(false)
  const ref = React.useRef(null)
  useEffect(() => {
    if (!open) return
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    setTimeout(() => document.addEventListener('mousedown', onDoc), 0)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  const selected = options.find(o => o.v === value)
  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 140 }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 9,
          border: `1px solid ${open ? 'rgba(212,160,23,.3)' : 'rgba(255,255,255,.08)'}`,
          background: 'rgba(0,0,0,.22)', color: 'var(--tx2)',
          fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8, transition: '.15s' }}>
        {Icon && <Icon size={13} color={GOLD} opacity={.7} />}
        <span style={{ flex: 1, textAlign: 'right', color: selected?.v ? 'var(--tx2)' : 'var(--tx5)' }}>
          {selected?.l || placeholder || '...'}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.5"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '.2s' }}>
          <polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, left: 0, zIndex: 50,
          background: '#0f0f0f', border: '1px solid rgba(212,160,23,.2)', borderRadius: 10,
          boxShadow: '0 12px 36px rgba(0,0,0,.6)', overflow: 'hidden', maxHeight: 280, overflowY: 'auto' }}>
          {options.map(o => (
            <div key={String(o.v)} onClick={() => { onChange(o.v); setOpen(false) }}
              style={{ padding: '9px 12px', cursor: 'pointer',
                fontSize: 12, fontWeight: value === o.v ? 800 : 600,
                color: value === o.v ? GOLD : 'var(--tx2)',
                background: value === o.v ? 'rgba(212,160,23,.08)' : 'transparent',
                borderBottom: '1px solid rgba(255,255,255,.03)', textAlign: 'right', transition: '.1s' }}
              onMouseEnter={e => { if (value !== o.v) e.currentTarget.style.background = 'rgba(255,255,255,.03)' }}
              onMouseLeave={e => { if (value !== o.v) e.currentTarget.style.background = 'transparent' }}>
              {o.l}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PersonsList({ toast, countries, branches, onOpenDetail }) {
  const [rows, setRows] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [branch, setBranch] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editProfile, setEditProfile] = useState(null)

  const PAGE_SIZE = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { rows, count } = await personsService.listPersons({ search, role, status, branch, page })
      setRows(rows); setCount(count)
    } catch (e) {
      toast?.('خطأ في تحميل البيانات: ' + (e.message || ''))
      setRows([]); setCount(0)
    } finally {
      setLoading(false)
    }
  }, [search, role, status, branch, page, toast])

  useEffect(() => { load() }, [load])

  useEffect(() => { setPage(1) }, [search, role, status, branch])

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))
  const branchOpts = useMemo(() => [{ v: '', l: 'كل الفروع' }, ...(branches || []).map(b => ({ v: b.id, l: b.code || '—' }))], [branches])

  const onArchive = async (p) => {
    if (!confirm(`هل تريد أرشفة "${p.full_name_ar}"؟ (لن يتم حذف البيانات)`)) return
    try {
      await personsService.archivePerson(p.person_id)
      toast?.('تم أرشفة الشخص')
      load()
    } catch (e) { toast?.('خطأ: ' + (e.message || 'فشل العملية')) }
  }
  const onUnarchive = async (p) => {
    try {
      await personsService.unarchivePerson(p.person_id)
      toast?.('تمت إعادة التفعيل')
      load()
    } catch (e) { toast?.('خطأ: ' + (e.message || '')) }
  }

  const openEdit = (p) => { setEditId(p.person_id); setEditProfile(p); setShowForm(true) }
  const openAdd = () => { setEditId(null); setEditProfile(null); setShowForm(true) }

  return (
    <div style={{ fontFamily: F, direction: 'rtl', padding: '22px 24px 40px', color: 'var(--tx2)' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: translateY(0) } }
        .prs-row:hover { background: rgba(255,255,255,.025) }
        .prs-ibtn:hover { background: rgba(212,160,23,.12) !important; border-color: rgba(212,160,23,.3) !important }
        .prs-ibtn-red:hover { background: rgba(192,57,43,.12) !important; border-color: rgba(192,57,43,.3) !important }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(212,160,23,.18), rgba(212,160,23,.06))',
            border: '1px solid rgba(212,160,23,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={22} color={GOLD} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--tx)', letterSpacing: '-.3px' }}>الأشخاص</div>
            <div style={{ fontSize: 11, color: 'var(--tx4)', marginTop: 3 }}>
              إدارة هويات الأشخاص وأدوارهم
              {!loading && count > 0 && <> · <span style={{ color: GOLD, fontWeight: 700 }}>{count}</span> شخص</>}
            </div>
          </div>
        </div>

        <button onClick={openAdd} style={{
          height: 40, padding: '0 18px', borderRadius: 10, border: 'none',
          background: `linear-gradient(180deg, ${GOLD}, #b88914)`,
          color: '#0a0a0a', fontFamily: F, fontSize: 13, fontWeight: 900,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
          boxShadow: '0 6px 20px rgba(212,160,23,.22)', transition: '.15s' }}>
          <Plus size={16} strokeWidth={2.5} />
          إضافة شخص
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 280px', minWidth: 240, position: 'relative' }}>
          <Search size={14} color="var(--tx5)" style={{ position: 'absolute', right: 12, top: '50%',
            transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم، رقم الهوية، أو الجوال"
            style={{ width: '100%', height: 38, padding: '0 38px 0 12px',
              border: '1px solid rgba(255,255,255,.08)', borderRadius: 9,
              background: 'rgba(0,0,0,.22)', color: 'var(--tx)',
              fontFamily: F, fontSize: 12.5, fontWeight: 600, outline: 'none',
              textAlign: 'right', transition: '.15s' }}
            onFocus={e => e.target.style.borderColor = 'rgba(212,160,23,.3)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,.08)'}
          />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                width: 22, height: 22, borderRadius: 6, border: 'none',
                background: 'rgba(255,255,255,.06)', color: 'var(--tx4)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={12} />
            </button>
          )}
        </div>

        <FilterSelect value={role} onChange={setRole} icon={Briefcase} placeholder="الدور"
          options={[{ v: '', l: 'كل الأدوار' }, ...personsService.ROLE_LABELS.map(r => ({ v: r, l: r }))]} />
        <FilterSelect value={status} onChange={setStatus} icon={Shield} placeholder="الحالة"
          options={[{ v: '', l: 'كل الحالات' }, { v: 'active', l: 'نشط' }, { v: 'archived', l: 'مؤرشف' }]} />
        <FilterSelect value={branch} onChange={setBranch} icon={Building2} placeholder="الفرع"
          options={branchOpts} />
      </div>

      <div style={{ borderRadius: 14, background: 'var(--sf)', border: '1px solid rgba(255,255,255,.05)',
        overflow: 'hidden', boxShadow: '0 2px 20px rgba(0,0,0,.2)' }}>

        {loading ? (
          <div style={{ padding: 80, textAlign: 'center', color: 'var(--tx4)' }}>
            <div style={{ display: 'inline-block', width: 30, height: 30,
              border: '3px solid rgba(212,160,23,.15)', borderTopColor: GOLD, borderRadius: '50%',
              animation: 'spin 1s linear infinite' }} />
            <div style={{ marginTop: 14, fontSize: 12, fontWeight: 700 }}>جاري التحميل...</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '80px 20px', textAlign: 'center' }}>
            <div style={{ width: 78, height: 78, margin: '0 auto 18px', borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(212,160,23,.12), rgba(212,160,23,.03))',
              border: '1px solid rgba(212,160,23,.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={34} color={GOLD} strokeWidth={1.6} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)', marginBottom: 6 }}>
              {search || role || status || branch ? 'لا توجد نتائج' : 'لا يوجد أشخاص بعد'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--tx4)', marginBottom: 20 }}>
              {search || role || status || branch ? 'جرّب تعديل الفلاتر' : 'ابدأ بإضافة أول شخص في النظام'}
            </div>
            {!(search || role || status || branch) && (
              <button onClick={openAdd}
                style={{ height: 40, padding: '0 22px', borderRadius: 10, border: 'none',
                  background: `linear-gradient(180deg, ${GOLD}, #b88914)`, color: '#0a0a0a',
                  fontFamily: F, fontSize: 13, fontWeight: 900, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  boxShadow: '0 6px 20px rgba(212,160,23,.22)' }}>
                <Plus size={15} strokeWidth={2.5} /> إضافة أول شخص
              </button>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '25%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,.02)' }}>
                {['الاسم', 'رقم الهوية', 'الجوال', 'الأدوار', 'الفرع', 'الحالة', 'إجراءات'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: h === 'إجراءات' ? 'center' : 'right',
                    fontSize: 10, fontWeight: 800, color: 'var(--tx4)', letterSpacing: '.5px',
                    borderBottom: '1px solid rgba(255,255,255,.05)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(p => {
                const brCode = (branches || []).find(b => b.id === p.branch_id)?.code || '—'
                return (
                  <tr key={p.person_id} className="prs-row"
                    onClick={() => onOpenDetail(p.person_id)}
                    style={{ cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,.04)', transition: '.12s' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10,
                          background: 'linear-gradient(135deg, rgba(212,160,23,.18), rgba(212,160,23,.06))',
                          border: '1px solid rgba(212,160,23,.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 800, color: GOLD, flexShrink: 0 }}>
                          {(p.full_name_ar || '?')[0]}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tx)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.full_name_ar || '—'}
                          </div>
                          {p.full_name_en && (
                            <div style={{ fontSize: 10, color: 'var(--tx5)', direction: 'ltr',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'start', marginTop: 2 }}>
                              {p.full_name_en}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, fontWeight: 600,
                      color: 'var(--tx3)', direction: 'ltr', textAlign: 'right', letterSpacing: '.3px' }}>
                      {p.id_number || '—'}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 11.5, fontWeight: 600,
                      color: 'var(--tx3)', direction: 'ltr', textAlign: 'right' }}>
                      {p.phone || '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(p.roles_summary || []).length === 0
                          ? <span style={{ fontSize: 10, color: 'var(--tx5)' }}>—</span>
                          : (p.roles_summary || []).map(r => <RoleChip key={r} role={r} />)}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 11, fontWeight: 700,
                      color: 'var(--tx3)', textAlign: 'right' }}>{brCode}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <StatusBadge status={p.status} />
                    </td>
                    <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button className="prs-ibtn" title="عرض" onClick={() => onOpenDetail(p.person_id)}
                          style={iconBtnS}>
                          <Eye size={13} />
                        </button>
                        <button className="prs-ibtn" title="تعديل" onClick={() => openEdit(p)}
                          style={iconBtnS}>
                          <Edit2 size={13} />
                        </button>
                        {p.status === 'active' ? (
                          <button className="prs-ibtn-red" title="أرشفة" onClick={() => onArchive(p)}
                            style={{ ...iconBtnS, color: '#e68a80' }}>
                            <Archive size={13} />
                          </button>
                        ) : (
                          <button className="prs-ibtn" title="إعادة التفعيل" onClick={() => onUnarchive(p)}
                            style={{ ...iconBtnS, color: '#6dcc89' }}>
                            <ArchiveRestore size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {!loading && rows.length > 0 && totalPages > 1 && (
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderTop: '1px solid rgba(255,255,255,.04)', background: 'rgba(0,0,0,.1)' }}>
            <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>
              الصفحة {page} من {totalPages} · {count} شخص
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                style={pgBtnS(page <= 1)}>
                <ChevronRight size={14} /> السابق
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                style={pgBtnS(page >= totalPages)}>
                التالي <ChevronLeft size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <PersonFormModal open={showForm} onClose={() => setShowForm(false)}
        personId={editId} profile={editProfile}
        onSaved={() => load()}
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

const pgBtnS = (disabled) => ({
  height: 32, padding: '0 12px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,.08)', background: disabled ? 'rgba(255,255,255,.02)' : 'rgba(255,255,255,.04)',
  color: disabled ? 'var(--tx5)' : 'var(--tx2)',
  fontFamily: F, fontSize: 11, fontWeight: 700,
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'flex', alignItems: 'center', gap: 4, opacity: disabled ? 0.5 : 1, transition: '.15s'
})

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
    try {
      await personsService.archivePerson(personId)
      toast?.('تم أرشفة الشخص')
      load()
    } catch (e) { toast?.('خطأ: ' + (e.message || '')) }
  }
  const onUnarchive = async () => {
    try {
      await personsService.unarchivePerson(personId)
      toast?.('تمت إعادة التفعيل')
      load()
    } catch (e) { toast?.('خطأ: ' + (e.message || '')) }
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
      <div style={{ padding: 80, textAlign: 'center', color: 'var(--tx4)', fontFamily: F, direction: 'rtl' }}>
        <div style={{ display: 'inline-block', width: 30, height: 30,
          border: '3px solid rgba(212,160,23,.15)', borderTopColor: GOLD, borderRadius: '50%',
          animation: 'spin 1s linear infinite' }} />
        <div style={{ marginTop: 14, fontSize: 12, fontWeight: 700 }}>جاري التحميل...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ padding: 60, textAlign: 'center', fontFamily: F, direction: 'rtl' }}>
        <AlertCircle size={38} color={GOLD} style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>لم يتم العثور على الشخص</div>
        <button onClick={onBack} style={{ marginTop: 16, padding: '8px 18px', borderRadius: 8,
          background: GOLD, color: '#0a0a0a', border: 'none', fontWeight: 800, cursor: 'pointer' }}>رجوع</button>
      </div>
    )
  }

  const roles = profile.roles_summary || []
  const active = profile.status === 'active'

  return (
    <div style={{ fontFamily: F, direction: 'rtl', padding: '20px 24px 40px', color: 'var(--tx2)' }}>
      <style>{`
        .prs-card { background: var(--sf); border: 1px solid rgba(255,255,255,.05); border-radius: 14px;
          padding: 18px; box-shadow: 0 2px 12px rgba(0,0,0,.15); }
        .prs-card-title { font-size: 13px; font-weight: 800; color: var(--tx); margin-bottom: 14px;
          display: flex; align-items: center; gap: 8px; padding-bottom: 10px;
          border-bottom: 1px solid rgba(255,255,255,.05) }
        .prs-kv { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0 }
        .prs-kv-ico { width: 26px; height: 26px; border-radius: 7px; background: rgba(212,160,23,.08);
          border: 1px solid rgba(212,160,23,.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0 }
        .prs-kv-text { flex: 1; min-width: 0 }
        .prs-kv-l { font-size: 10px; color: var(--tx5); font-weight: 700; margin-bottom: 2px }
        .prs-kv-v { font-size: 12.5px; color: var(--tx); font-weight: 600; word-break: break-word }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: '1 1 auto', minWidth: 0 }}>
          <button onClick={onBack} title="رجوع"
            style={{ width: 40, height: 40, borderRadius: 10,
              border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)',
              color: 'var(--tx2)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: '.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.1)'; e.currentTarget.style.borderColor = 'rgba(212,160,23,.3)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)' }}>
            <ArrowRight size={16} />
          </button>

          <div style={{ width: 58, height: 58, borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(212,160,23,.22), rgba(212,160,23,.06))',
            border: '1.5px solid rgba(212,160,23,.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 900, color: GOLD, flexShrink: 0 }}>
            {(profile.full_name_ar || '?')[0]}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--tx)', letterSpacing: '-.3px',
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {profile.full_name_ar}
              <StatusBadge status={profile.status} />
            </div>
            {profile.full_name_en && (
              <div style={{ fontSize: 12, color: 'var(--tx4)', direction: 'ltr', textAlign: 'start', marginTop: 4 }}>
                {profile.full_name_en}
              </div>
            )}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
              {roles.length === 0
                ? <span style={{ fontSize: 10, color: 'var(--tx5)', fontWeight: 600 }}>لم يُعيَّن أي دور بعد</span>
                : roles.map(r => <RoleChip key={r} role={r} />)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={() => setShowForm(true)}
            style={{ height: 38, padding: '0 16px', borderRadius: 9,
              border: '1px solid rgba(212,160,23,.3)', background: 'rgba(212,160,23,.08)',
              color: GOLD, fontFamily: F, fontSize: 12, fontWeight: 800,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: '.15s' }}>
            <Edit2 size={13} /> تعديل
          </button>
          {active ? (
            <button onClick={onArchive}
              style={{ height: 38, padding: '0 16px', borderRadius: 9,
                border: '1px solid rgba(192,57,43,.3)', background: 'rgba(192,57,43,.08)',
                color: '#e68a80', fontFamily: F, fontSize: 12, fontWeight: 800,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: '.15s' }}>
              <Archive size={13} /> أرشفة
            </button>
          ) : (
            <button onClick={onUnarchive}
              style={{ height: 38, padding: '0 16px', borderRadius: 9,
                border: '1px solid rgba(39,160,70,.3)', background: 'rgba(39,160,70,.08)',
                color: '#6dcc89', fontFamily: F, fontSize: 12, fontWeight: 800,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: '.15s' }}>
              <ArchiveRestore size={13} /> إعادة التفعيل
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="prs-card">
            <div className="prs-card-title"><Shield size={15} color={GOLD} /> الهوية</div>
            <KV icon={CreditCard} label="رقم الهوية" value={person?.id_number || '—'} dir="ltr" />
            <KV icon={Flag} label="الجنسية" value={nationality
              ? `${nationality.flag_emoji || ''} ${nationality.nationality_ar || nationality.name_ar}`
              : '—'} />
            <KV icon={Calendar} label="تاريخ الميلاد" value={person?.date_of_birth || '—'} dir="ltr" />
          </div>

          <div className="prs-card">
            <div className="prs-card-title"><Phone size={15} color={GOLD} /> التواصل</div>
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
            {owned.length === 0 ? (
              <EmptyCard text="لا توجد منشآت مملوكة" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
            {managed.length === 0 ? (
              <EmptyCard text="لا توجد منشآت مُدارة" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
            <div className="prs-card-title"><UserCheck size={15} color={GOLD} /> الأدوار المُرتبطة</div>
            <ProfileRow Icon={UserCheck} label="ملف الموظف" linked={!!profile.user_id}
              color={GOLD} toast={toast} />
            <ProfileRow Icon={UserCheck} label="ملف العميل" linked={!!profile.client_id}
              color="#5ca0e6" toast={toast} />
            <ProfileRow Icon={UserCheck} label="ملف الوسيط" linked={!!profile.broker_id}
              color="#d9a15a" toast={toast} />
            <ProfileRow Icon={HardHat} label="ملف العامل" linked={!!profile.worker_id}
              color="#c0c0c0" toast={toast} />
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
        personId={personId} profile={profile}
        onSaved={() => load()}
        toast={toast} countries={countries} branches={branches} />
    </div>
  )
}

const KV = ({ icon: Icon, label, value, dir }) => (
  <div className="prs-kv">
    <div className="prs-kv-ico"><Icon size={13} color={GOLD} opacity={.85} /></div>
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
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0',
    borderBottom: '1px solid rgba(255,255,255,.03)' }}>
    <div style={{ width: 30, height: 30, borderRadius: 8, background: color + '15',
      border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={13} color={color} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx2)' }}>{label}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: linked ? color : 'var(--tx5)', marginTop: 2 }}>
        {linked ? '● مُرتبط' : 'غير مُرتبط'}
      </div>
    </div>
    <button type="button" onClick={() => toast?.(linked ? 'فتح الملف قريباً' : 'الربط قريباً')}
      style={{ height: 26, padding: '0 11px', borderRadius: 7,
        border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)',
        color: 'var(--tx3)', fontFamily: F, fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: '.15s' }}>
      {linked ? 'فتح' : 'ربط'}
    </button>
  </div>
)

export default function PersonsPage({ toast }) {
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
          onOpenDetail={openDetail} />
      )}
    </div>
  )
}
