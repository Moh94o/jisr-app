import React, { useState, useEffect, useMemo, useRef } from 'react'
import ReactDOM from 'react-dom'
import { X, User, Link2, Save, AlertCircle, Check, Briefcase, Users as UsersIcon, Building2, HardHat } from 'lucide-react'
import * as personsService from '../../services/personsService.js'

const F = "'Cairo','Tajawal',sans-serif"
const GOLD = '#D4A017'
const OK = '#27a046'
const RED = '#c0392b'

const inputS = {
  width: '100%', height: 42, padding: '0 14px',
  border: '1px solid rgba(255,255,255,.08)', borderRadius: 9,
  fontFamily: F, fontSize: 13, fontWeight: 600,
  color: 'var(--tx)', outline: 'none',
  background: 'rgba(0,0,0,.18)', boxSizing: 'border-box',
  boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)',
  textAlign: 'center', transition: '.2s'
}

const Lbl = ({ children, req }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.58)', marginBottom: 5, textAlign: 'start' }}>
    {children}{req && <span style={{ color: RED }}> *</span>}
  </div>
)

// Stored phones may be "+966501122334" (international) or "0501122334" (domestic).
// Show as 10-digit domestic "05xxxxxxxx" in the input.
function normalizePhoneForInput(raw) {
  if (!raw) return ''
  let v = String(raw).replace(/\s+/g, '').replace(/^\+/, '')
  if (v.startsWith('966')) v = v.slice(3)
  if (!v.startsWith('0')) v = '0' + v
  return v.slice(0, 10)
}

const Dropdown = ({ value, onChange, options, placeholder, getKey, getLabel, getSub, searchable = true }) => {
  const btnRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxH: 320 })
  const getK = getKey || (o => o)
  const getL = getLabel || (o => String(o))
  const filtered = q ? options.filter(o => getL(o).toLowerCase().includes(q.toLowerCase()) || (getSub?.(o) || '').toLowerCase().includes(q.toLowerCase())) : options
  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const below = window.innerHeight - r.bottom - 16
      const above = r.top - 16
      const flipUp = below < 180 && above > below
      const maxH = Math.max(150, Math.min(260, flipUp ? above : below))
      setPos({ top: flipUp ? r.top - maxH - 4 : r.bottom + 4, left: r.left, width: r.width, maxH })
    }
    setQ('')
    setOpen(o => !o)
  }
  useEffect(() => {
    if (!open) return
    const onDoc = e => { if (btnRef.current && !btnRef.current.contains(e.target)) setOpen(false) }
    setTimeout(() => document.addEventListener('mousedown', onDoc), 0)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  const selected = options.find(o => getK(o) === value)
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button ref={btnRef} type="button" onClick={toggle}
        style={{ ...inputS, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, color: selected ? 'var(--tx)' : 'var(--tx5)',
          border: `1px solid ${open ? 'rgba(212,160,23,.3)' : 'rgba(255,255,255,.08)'}`, padding: '0 32px', position: 'relative' }}>
        <span style={{ flex: 1, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selected ? getL(selected) : (placeholder || '...')}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.5"
          style={{ position: 'absolute', left: 12, top: '50%', transform: `translateY(-50%) ${open ? 'rotate(180deg)' : ''}`, transition: '.2s' }}>
          <polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && ReactDOM.createPortal(
        <div style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width,
          background: '#0f0f0f', border: '1px solid rgba(212,160,23,.25)', borderRadius: 10,
          maxHeight: pos.maxH, display: 'flex', flexDirection: 'column',
          zIndex: 3000, boxShadow: '0 16px 48px rgba(0,0,0,.7)', overflow: 'hidden', direction: 'rtl', fontFamily: F }}>
          {searchable && options.length > 5 && (
            <div style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="بحث..." autoFocus
                style={{ width: '100%', height: 32, padding: '0 10px', border: '1px solid rgba(255,255,255,.05)',
                  borderRadius: 7, background: 'rgba(0,0,0,.2)', fontFamily: F, fontSize: 12, fontWeight: 600,
                  color: 'var(--tx)', outline: 'none', boxSizing: 'border-box', textAlign: 'center' }} />
            </div>
          )}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: 'var(--tx5)' }}>لا توجد نتائج</div>
            )}
            {filtered.slice(0, 200).map(o => {
              const k = getK(o)
              const isSel = value === k
              return (
                <div key={k} onClick={() => { onChange(k, o); setOpen(false); setQ('') }}
                  style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,.03)',
                    background: isSel ? 'rgba(212,160,23,.1)' : 'transparent', transition: '.12s',
                    display: 'flex', flexDirection: 'column', gap: 2 }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,.035)' }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}>
                  <span style={{ fontSize: 12, fontWeight: isSel ? 800 : 600, color: isSel ? GOLD : 'var(--tx2)', textAlign: 'right' }}>{getL(o)}</span>
                  {getSub && getSub(o) && (
                    <span style={{ fontSize: 10, color: 'var(--tx5)', textAlign: 'right' }}>{getSub(o)}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>, document.body)}
    </div>
  )
}

const TabBtn = ({ active, onClick, icon: Icon, label }) => (
  <button type="button" onClick={onClick} style={{
    flex: 1, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    background: active ? 'rgba(212,160,23,.08)' : 'transparent',
    border: 'none',
    borderBottom: `2px solid ${active ? GOLD : 'transparent'}`,
    color: active ? GOLD : 'var(--tx4)',
    fontFamily: F, fontSize: 13, fontWeight: active ? 800 : 600,
    cursor: 'pointer', transition: '.2s',
  }}>
    {Icon && <Icon size={15} />}
    {label}
  </button>
)

const ID_TYPES = [
  { code: 'iqama', label: 'إقامة' },
  { code: 'national_id', label: 'هوية وطنية' },
  { code: 'gcc_id', label: 'هوية خليجية' },
  { code: 'passport', label: 'جواز سفر' },
  { code: 'border_id', label: 'رقم حدود' },
  { code: 'visa', label: 'تأشيرة' },
]
const GENDERS = [ { code: 'male', label: 'ذكر' }, { code: 'female', label: 'أنثى' } ]

const RoleMiniCard = ({ label, linked, onClick, Icon, color }) => (
  <div style={{
    borderRadius: 10, padding: '12px 14px',
    border: `1px solid ${linked ? color + '55' : 'rgba(255,255,255,.06)'}`,
    background: linked ? color + '0d' : 'rgba(0,0,0,.18)',
    display: 'flex', alignItems: 'center', gap: 10
  }}>
    <div style={{ width: 34, height: 34, borderRadius: 9, background: color + '1a',
      border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={17} color={color} strokeWidth={2} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--tx2)' }}>{label}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: linked ? color : 'var(--tx5)', marginTop: 2 }}>
        {linked ? '● مُرتبط' : 'غير مُرتبط'}
      </div>
    </div>
    <button type="button" onClick={onClick}
      style={{ height: 28, padding: '0 12px', borderRadius: 7,
        border: `1px solid ${linked ? 'rgba(192,57,43,.3)' : GOLD + '40'}`,
        background: linked ? 'rgba(192,57,43,.08)' : 'rgba(212,160,23,.08)',
        color: linked ? '#e68a80' : GOLD, fontFamily: F, fontSize: 10, fontWeight: 800,
        cursor: 'pointer', transition: '.15s' }}>
      {linked ? 'فتح الملف' : 'إضافة'}
    </button>
  </div>
)

export default function PersonFormModal({ open, onClose, personId, onSaved, toast, countries, branches, profile }) {
  const isEdit = !!personId

  const [tab, setTab] = useState(0)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState({})
  const [touched, setTouched] = useState(false)

  const [f, setF] = useState({
    full_name_ar: '', full_name_en: '',
    id_type_code: '', id_number: '',
    nationality_id: null, gender_code: '', date_of_birth: '',
    phone: '', secondary_phone: '', email: '',
    branch_id: null, address: '', notes: '', status: 'active'
  })
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (!open) return
    setTab(0); setErr({}); setTouched(false); setSaving(false)
    if (!isEdit) {
      setF({
        full_name_ar: '', full_name_en: '',
        id_type_code: '', id_number: '',
        nationality_id: null, gender_code: '', date_of_birth: '',
        phone: '', secondary_phone: '', email: '',
        branch_id: null, address: '', notes: '', status: 'active'
      })
      return
    }
    ;(async () => {
      const { person } = await personsService.getPerson(personId)
      if (person) {
        setF({
          full_name_ar: person.full_name_ar || '',
          full_name_en: person.full_name_en || '',
          id_type_code: '',
          id_number: person.id_number || '',
          nationality_id: person.nationality_id || null,
          gender_code: '',
          date_of_birth: person.date_of_birth || '',
          phone: normalizePhoneForInput(person.phone),
          secondary_phone: normalizePhoneForInput(person.secondary_phone),
          email: person.email || '',
          branch_id: person.branch_id || null,
          address: person.address || '',
          notes: person.notes || '',
          status: person.status || 'active'
        })
      }
    })()
  }, [open, personId, isEdit])

  const validate = async () => {
    const e = {}
    if (!f.full_name_ar.trim()) e.full_name_ar = 'الاسم بالعربي مطلوب'
    const cleanedPhone = (f.phone || '').replace(/\s+/g, '')
    if (!cleanedPhone) e.phone = 'رقم الجوال مطلوب'
    else if (!/^05\d{8}$/.test(cleanedPhone)) e.phone = 'يبدأ بـ 05 ويتكون من 10 أرقام'
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'بريد إلكتروني غير صحيح'
    if (f.id_number) {
      const taken = await personsService.isIdNumberTaken(f.id_number, isEdit ? personId : null)
      if (taken) e.id_number = 'رقم الهوية مستخدم لشخص آخر'
    }
    setErr(e)
    return Object.keys(e).length === 0
  }

  const save = async () => {
    setTouched(true)
    const ok = await validate()
    if (!ok) {
      toast?.('يرجى تصحيح الأخطاء')
      setTab(0)
      return
    }
    setSaving(true)
    try {
      const payload = {
        full_name_ar: f.full_name_ar.trim(),
        full_name_en: f.full_name_en?.trim() || null,
        id_number: f.id_number?.trim() || null,
        nationality_id: f.nationality_id || null,
        date_of_birth: f.date_of_birth || null,
        phone: (f.phone || '').replace(/\s+/g, '') || null,
        secondary_phone: f.secondary_phone || null,
        email: f.email?.trim() || null,
        branch_id: f.branch_id || null,
        address: f.address?.trim() || null,
        notes: f.notes?.trim() || null,
        status: f.status || 'active',
      }
      const saved = isEdit
        ? await personsService.updatePerson(personId, payload)
        : await personsService.createPerson(payload)
      toast?.(isEdit ? 'تم تحديث الشخص' : 'تم إضافة الشخص')
      onSaved?.(saved)
      onClose?.()
    } catch (e) {
      toast?.('خطأ: ' + (e.message || 'فشل الحفظ'))
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return ReactDOM.createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,.78)',
      backdropFilter: 'blur(6px)', zIndex: 998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: F, direction: 'rtl' }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--sf)', borderRadius: 18, width: 720, maxWidth: '96vw',
        maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,.5)', border: '1px solid rgba(212,160,23,.12)' }}>

        <div style={{ padding: '18px 22px 0 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 14 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(212,160,23,.1)',
              border: '1px solid rgba(212,160,23,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={17} color={GOLD} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--tx)' }}>
                {isEdit ? 'تعديل الشخص' : 'إضافة شخص جديد'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--tx5)', marginTop: 2 }}>
                {isEdit ? 'تحديث بيانات الشخص المحدد' : 'إنشاء ملف هوية جديد'}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(255,255,255,.05)',
            border: '1px solid rgba(255,255,255,.08)', color: 'var(--tx3)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,.05)', flexShrink: 0 }}>
          <TabBtn active={tab === 0} onClick={() => setTab(0)} icon={User} label="معلومات أساسية" />
          {isEdit && <TabBtn active={tab === 1} onClick={() => setTab(1)} icon={Link2} label="الأدوار والعلاقات" />}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
          {tab === 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / span 2' }}>
                <Lbl req>الاسم الكامل بالعربي</Lbl>
                <input value={f.full_name_ar} onChange={e => set('full_name_ar', e.target.value)}
                  placeholder="مثال: محمد أحمد الغامدي" dir="rtl"
                  style={{ ...inputS, borderColor: err.full_name_ar ? RED + '80' : 'rgba(255,255,255,.08)' }} />
                {err.full_name_ar && <div style={{ fontSize: 10, color: RED, marginTop: 4 }}>{err.full_name_ar}</div>}
              </div>

              <div>
                <Lbl>الاسم الكامل بالإنجليزي</Lbl>
                <input value={f.full_name_en} onChange={e => set('full_name_en', e.target.value)}
                  placeholder="Mohammed Ahmed" dir="ltr" style={{ ...inputS, direction: 'ltr' }} />
              </div>
              <div>
                <Lbl>نوع الهوية</Lbl>
                <Dropdown value={f.id_type_code} onChange={v => set('id_type_code', v)}
                  options={ID_TYPES} getKey={o => o.code} getLabel={o => o.label} placeholder="اختر..." searchable={false} />
              </div>

              <div>
                <Lbl>رقم الهوية</Lbl>
                <input value={f.id_number} onChange={e => set('id_number', e.target.value.replace(/\D/g, ''))}
                  placeholder="1xxxxxxxxx" dir="ltr" maxLength={15}
                  style={{ ...inputS, direction: 'ltr', letterSpacing: '.5px',
                    borderColor: err.id_number ? RED + '80' : 'rgba(255,255,255,.08)' }} />
                {err.id_number && <div style={{ fontSize: 10, color: RED, marginTop: 4 }}>{err.id_number}</div>}
              </div>
              <div>
                <Lbl>الجنسية</Lbl>
                <Dropdown value={f.nationality_id} onChange={v => set('nationality_id', v)}
                  options={countries || []} getKey={o => o.id}
                  getLabel={o => `${o.flag_emoji || ''} ${o.nationality_ar || o.name_ar}`}
                  getSub={o => o.nationality_en} placeholder="اختر الجنسية..." />
              </div>

              <div>
                <Lbl>الجنس</Lbl>
                <Dropdown value={f.gender_code} onChange={v => set('gender_code', v)}
                  options={GENDERS} getKey={o => o.code} getLabel={o => o.label} placeholder="اختر..." searchable={false} />
              </div>
              <div>
                <Lbl>تاريخ الميلاد</Lbl>
                <input type="date" value={f.date_of_birth} onChange={e => set('date_of_birth', e.target.value)}
                  style={{ ...inputS, direction: 'ltr', colorScheme: 'dark' }} />
              </div>

              <div>
                <Lbl req>رقم الجوال</Lbl>
                <input value={f.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="05xxxxxxxx" dir="ltr" maxLength={10}
                  style={{ ...inputS, direction: 'ltr',
                    borderColor: err.phone ? RED + '80' : 'rgba(255,255,255,.08)' }} />
                {err.phone && <div style={{ fontSize: 10, color: RED, marginTop: 4 }}>{err.phone}</div>}
              </div>
              <div>
                <Lbl>رقم ثانوي</Lbl>
                <input value={f.secondary_phone} onChange={e => set('secondary_phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="05xxxxxxxx" dir="ltr" maxLength={10}
                  style={{ ...inputS, direction: 'ltr' }} />
              </div>

              <div style={{ gridColumn: '1 / span 2' }}>
                <Lbl>البريد الإلكتروني</Lbl>
                <input value={f.email} onChange={e => set('email', e.target.value)} placeholder="name@example.com"
                  dir="ltr" style={{ ...inputS, direction: 'ltr',
                    borderColor: err.email ? RED + '80' : 'rgba(255,255,255,.08)' }} />
                {err.email && <div style={{ fontSize: 10, color: RED, marginTop: 4 }}>{err.email}</div>}
              </div>

              <div>
                <Lbl>الفرع</Lbl>
                <Dropdown value={f.branch_id} onChange={v => set('branch_id', v)}
                  options={branches || []} getKey={o => o.id} getLabel={o => o.code || '—'}
                  placeholder="اختر الفرع..." />
              </div>
              <div>
                <Lbl>الحالة</Lbl>
                <Dropdown value={f.status} onChange={v => set('status', v)}
                  options={[{ v: 'active', l: 'نشط' }, { v: 'archived', l: 'مؤرشف' }]}
                  getKey={o => o.v} getLabel={o => o.l} searchable={false} />
              </div>

              <div style={{ gridColumn: '1 / span 2' }}>
                <Lbl>العنوان</Lbl>
                <textarea value={f.address} onChange={e => set('address', e.target.value)} rows={2}
                  placeholder="العنوان التفصيلي..."
                  style={{ ...inputS, height: 'auto', padding: '10px 14px', resize: 'vertical',
                    textAlign: 'right', minHeight: 60 }} />
              </div>
              <div style={{ gridColumn: '1 / span 2' }}>
                <Lbl>ملاحظات</Lbl>
                <textarea value={f.notes} onChange={e => set('notes', e.target.value)} rows={2}
                  placeholder="أي ملاحظات إضافية..."
                  style={{ ...inputS, height: 'auto', padding: '10px 14px', resize: 'vertical',
                    textAlign: 'right', minHeight: 60 }} />
              </div>
            </div>
          )}

          {tab === 1 && isEdit && (
            <RolesTab personId={personId} profile={profile} toast={toast} />
          )}
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid rgba(255,255,255,.05)',
          display: 'flex', gap: 10, justifyContent: 'flex-start', flexShrink: 0, background: 'rgba(0,0,0,.15)' }}>
          <button onClick={save} disabled={saving}
            style={{ height: 42, padding: '0 22px', borderRadius: 10, border: 'none',
              background: saving ? 'rgba(212,160,23,.3)' : `linear-gradient(180deg, ${GOLD}, #b88914)`,
              color: '#0a0a0a', fontFamily: F, fontSize: 13, fontWeight: 900,
              cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: saving ? 'none' : '0 6px 20px rgba(212,160,23,.25)', transition: '.15s' }}>
            <Save size={15} />
            {saving ? 'جاري الحفظ...' : (isEdit ? 'حفظ التعديلات' : 'إضافة الشخص')}
          </button>
          <button onClick={onClose}
            style={{ height: 42, padding: '0 18px', borderRadius: 10,
              border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)',
              color: 'var(--tx2)', fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            إلغاء
          </button>
        </div>

      </div>
    </div>, document.body)
}

function RolesTab({ personId, profile, toast }) {
  const [owned, setOwned] = useState([])
  const [managed, setManaged] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [o, m] = await Promise.all([
        personsService.listOwnedFacilities(personId),
        personsService.listManagedFacilities(personId),
      ])
      if (cancelled) return
      setOwned(o); setManaged(m); setLoading(false)
    })()
    return () => { cancelled = true }
  }, [personId])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Section title="المنشآت المملوكة" Icon={Building2} color="#e5867a" count={owned.length}>
        {loading ? <Skel /> : owned.length === 0 ? <EmptyRow text="لا توجد منشآت مملوكة" /> : owned.map(o => (
          <FacilityRow key={o.assignment_id || o.facility_id} title={o.facility_name_ar}
            sub={`ملكية ${o.ownership_percentage || 0}%${o.is_primary ? ' · أساسي' : ''}`} />
        ))}
        <AddRowBtn text="إضافة ملكية" onClick={() => toast?.('ميزة ربط المنشآت قيد التطوير')} />
      </Section>

      <Section title="المنشآت المُدارة" Icon={Briefcase} color="#b58cf5" count={managed.length}>
        {loading ? <Skel /> : managed.length === 0 ? <EmptyRow text="لا توجد منشآت مُدارة" /> : managed.map(m => (
          <FacilityRow key={m.assignment_id || m.facility_id} title={m.facility_name_ar}
            sub={`${m.manager_type || 'مدير'}${m.is_primary ? ' · أساسي' : ''}`} />
        ))}
        <AddRowBtn text="إضافة إدارة" onClick={() => toast?.('ميزة ربط المنشآت قيد التطوير')} />
      </Section>

      <div>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--tx3)', marginBottom: 10 }}>أدوار أخرى</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <RoleMiniCard label="ملف موظف" linked={!!profile?.user_id} Icon={UsersIcon} color={GOLD}
            onClick={() => toast?.(profile?.user_id ? 'الفتح قادم قريباً' : 'الربط قادم قريباً')} />
          <RoleMiniCard label="ملف عميل" linked={!!profile?.client_id} Icon={UsersIcon} color="#5ca0e6"
            onClick={() => toast?.(profile?.client_id ? 'الفتح قادم قريباً' : 'الربط قادم قريباً')} />
          <RoleMiniCard label="ملف وسيط" linked={!!profile?.broker_id} Icon={UsersIcon} color="#d9a15a"
            onClick={() => toast?.(profile?.broker_id ? 'الفتح قادم قريباً' : 'الربط قادم قريباً')} />
          <RoleMiniCard label="ملف عامل" linked={!!profile?.worker_id} Icon={HardHat} color="#9a9a9a"
            onClick={() => toast?.(profile?.worker_id ? 'الفتح قادم قريباً' : 'الربط قادم قريباً')} />
        </div>
      </div>
    </div>
  )
}

const Section = ({ title, Icon, color, count, children }) => (
  <div style={{ border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: 14, background: 'rgba(0,0,0,.14)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <div style={{ width: 26, height: 26, borderRadius: 8, background: color + '1a',
        border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={14} color={color} strokeWidth={2.2} />
      </div>
      <div style={{ flex: 1, fontSize: 12.5, fontWeight: 800, color: 'var(--tx2)' }}>{title}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx5)',
        padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,.04)' }}>{count}</div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
  </div>
)

const FacilityRow = ({ title, sub }) => (
  <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,.03)',
    border: '1px solid rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', gap: 10 }}>
    <Building2 size={14} color={GOLD} opacity={.7} />
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx2)' }}>{title || '—'}</div>
      <div style={{ fontSize: 10, color: 'var(--tx5)', marginTop: 2 }}>{sub}</div>
    </div>
  </div>
)

const EmptyRow = ({ text }) => (
  <div style={{ padding: '14px', textAlign: 'center', fontSize: 11, color: 'var(--tx5)',
    background: 'rgba(255,255,255,.02)', borderRadius: 8, border: '1px dashed rgba(255,255,255,.05)' }}>{text}</div>
)

const Skel = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    {[0, 1].map(i => (
      <div key={i} style={{ height: 38, borderRadius: 8, background: 'rgba(255,255,255,.03)' }} />
    ))}
  </div>
)

const AddRowBtn = ({ text, onClick }) => (
  <button type="button" onClick={onClick}
    style={{ height: 36, borderRadius: 8, border: '1px dashed rgba(212,160,23,.3)',
      background: 'rgba(212,160,23,.04)', color: GOLD, fontFamily: F, fontSize: 11,
      fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: 6, transition: '.15s' }}>
    <span style={{ fontSize: 14, fontWeight: 900 }}>+</span> {text}
  </button>
)
