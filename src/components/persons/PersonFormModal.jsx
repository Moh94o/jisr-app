import React, { useState, useEffect } from 'react'
import { User, Save, Building2, Briefcase, Users as UsersIcon, HardHat } from 'lucide-react'
import * as personsService from '../../services/personsService.js'
import {
  Modal, ModalSection, ActionButton, SuccessScreen, GRID,
  TextField, Select, DateField, PhoneField, IdField, Flag, C, countWords,
} from '../ui/FormKit.jsx'

// إعادة تصدير للمستوردين الحاليين (SbcCenterPage / UserRolePage) — كلها الآن من FormKit
export { Dropdown, DateField, sF, Lbl } from '../ui/FormKit.jsx'

// الجوال المخزّن قد يكون "+966501122334" أو "0501122334"؛ النافذة تعرض 9 أرقام.
export function normalizePhoneFor9Digit(raw) {
  if (!raw) return ''
  let v = String(raw).replace(/\s+/g, '').replace(/^\+/, '')
  if (v.startsWith('966')) v = v.slice(3)
  if (v.startsWith('0')) v = v.slice(1)
  return v.slice(0, 9)
}

export default function PersonFormModal({ open, onClose, personId, onSaved, toast, countries, branches, idTypes, genders, profile }) {
  const isEdit = !!personId

  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [err, setErr] = useState({})

  const [f, setF] = useState({
    name_ar: '', name_en: '',
    id_type_id: null, id_number: '',
    nationality_id: null, gender_id: null, date_of_birth: '',
    phone: '', secondary_phone: ''
  })
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  // قواعد الجنسية لنوع الهوية: سعودي → هوية وطنية مقفلة · غير سعودي → إقامة/حدود فقط
  const selectedNationality = (countries || []).find(c => c.id === f.nationality_id)
  const isSaudi = selectedNationality && (selectedNationality.code || '').toUpperCase() === 'SA'
  const nationalIdItem = (idTypes || []).find(t => t.code === 'national_id')
  const filteredIdTypes = (idTypes || []).filter(t => isSaudi ? t.code === 'national_id' : t.code !== 'national_id')

  useEffect(() => {
    if (!f.nationality_id) return
    if (isSaudi) {
      if (nationalIdItem && f.id_type_id !== nationalIdItem.id) setF(p => ({ ...p, id_type_id: nationalIdItem.id }))
    } else {
      if (nationalIdItem && f.id_type_id === nationalIdItem.id) setF(p => ({ ...p, id_type_id: null }))
    }
  }, [f.nationality_id, isSaudi, nationalIdItem?.id])

  useEffect(() => {
    if (!open) return
    setErr({}); setSaving(false); setSuccess(false)
    if (!isEdit) {
      setF({ name_ar: '', name_en: '', id_type_id: null, id_number: '', nationality_id: null, gender_id: null, date_of_birth: '', phone: '', secondary_phone: '' })
      return
    }
    ;(async () => {
      const { person } = await personsService.getPerson(personId)
      if (person) {
        setF({
          name_ar: person.name_ar || '',
          name_en: person.name_en || '',
          id_type_id: person.id_type_id || null,
          id_number: person.id_number || '',
          nationality_id: person.nationality_id || null,
          gender_id: person.gender_id || null,
          date_of_birth: person.date_of_birth || '',
          phone: normalizePhoneFor9Digit(person.phone_primary),
          secondary_phone: normalizePhoneFor9Digit(person.phone_secondary)
        })
      }
    })()
  }, [open, personId, isEdit])

  const selectedIdType = (idTypes || []).find(t => t.id === f.id_type_id)
  const idTypeCode = selectedIdType?.code
  const idFieldLabel = idTypeCode === 'iqama' ? 'رقم الإقامة' : idTypeCode === 'border_number' ? 'رقم الحدود' : 'رقم الهوية'
  const idPrefix = idTypeCode === 'national_id' ? '1' : idTypeCode === 'iqama' ? '2' : undefined

  // يُبرز خطأ واحد فقط (الأول حسب الترتيب البصري) ورسالته في التذييل.
  const errFieldOrder = ['name_ar', 'name_en', 'gender_id', 'date_of_birth', 'nationality_id', 'id_type_id', 'id_number', 'phone']
  const firstErrKey = errFieldOrder.find(k => err[k])
  const firstErrMsg = firstErrKey ? err[firstErrKey] : ''

  const validate = async () => {
    const e = {}
    const ar = f.name_ar.trim()
    if (!ar) e.name_ar = 'الاسم بالعربي مطلوب'
    else if (countWords(ar) < 2) e.name_ar = 'يجب أن يتكون من كلمتين أو أكثر'
    else if (!/^[؀-ۿ\s]+$/.test(ar)) e.name_ar = 'يجب أن يحتوي على أحرف عربية فقط'

    const en = f.name_en?.trim() || ''
    if (!en) e.name_en = 'الاسم بالإنجليزي مطلوب'
    else if (countWords(en) < 2) e.name_en = 'يجب أن يتكون من كلمتين أو أكثر'
    else if (!/^[a-zA-Z\s]+$/.test(en)) e.name_en = 'يجب أن يحتوي على أحرف إنجليزية فقط'

    if (!f.gender_id) e.gender_id = 'الجنس مطلوب'
    if (!f.nationality_id) e.nationality_id = 'الجنسية مطلوبة'
    if (!f.date_of_birth) e.date_of_birth = 'تاريخ الميلاد مطلوب'
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date_of_birth)) e.date_of_birth = 'صيغة غير صحيحة'
    if (!f.id_type_id) e.id_type_id = 'نوع الهوية مطلوب'

    const p = (f.phone || '').replace(/\s+/g, '')
    if (!p) e.phone = 'رقم الجوال مطلوب'
    else if (!/^5\d{8}$/.test(p)) e.phone = 'يبدأ بـ 5 ويتكون من 9 أرقام'
    else {
      const phoneTaken = await personsService.isPhoneTaken('+966' + p, isEdit ? personId : null)
      if (phoneTaken) e.phone = 'رقم الجوال مستخدم لشخص آخر'
    }

    if (!f.id_number) e.id_number = 'الرقم مطلوب'
    else if (f.id_number.length !== 10) e.id_number = 'الرقم يجب أن يكون 10 خانات'
    else if (idTypeCode === 'national_id' && !f.id_number.startsWith('1')) e.id_number = 'رقم الهوية الوطنية يبدأ بـ 1'
    else if (idTypeCode === 'iqama' && !f.id_number.startsWith('2')) e.id_number = 'رقم الإقامة يبدأ بـ 2'
    else {
      const taken = await personsService.isIdNumberTaken(f.id_number, isEdit ? personId : null)
      if (taken) e.id_number = 'الرقم مستخدم لشخص آخر'
    }
    setErr(e)
    return Object.keys(e).length === 0
  }

  const save = async () => {
    const ok = await validate()
    if (!ok) return
    setSaving(true)
    try {
      const payload = {
        name_ar: f.name_ar.trim(),
        name_en: f.name_en?.trim() || null,
        id_type_id: f.id_type_id || null,
        id_number: f.id_number?.trim() || null,
        nationality_id: f.nationality_id || null,
        gender_id: f.gender_id || null,
        date_of_birth: f.date_of_birth || null,
        phone_primary: f.phone ? '+966' + f.phone : null,
        phone_secondary: f.secondary_phone ? '+966' + f.secondary_phone : null,
      }
      const saved = isEdit ? await personsService.updatePerson(personId, payload) : await personsService.createPerson(payload)
      onSaved?.(saved)
      setSuccess(true)
      setTimeout(() => { onClose?.() }, 1600)
    } catch (e) {
      toast?.('خطأ: ' + (e.message || 'فشل الحفظ'))
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null
  if (success) return <SuccessScreen open title={isEdit ? 'تم تحديث الشخص' : 'تمت الإضافة'} subtitle={f.name_ar} />

  return (
    <Modal open={open} onClose={onClose} width={720} scroll
      title={isEdit ? 'تعديل الشخص' : 'شخص جديد'} Icon={User}
      variant={isEdit ? 'edit' : 'create'}
      errorMsg={firstErrMsg}
      footer={
        <ActionButton Icon={Save} disabled={saving} onClick={save}>
          {saving ? 'جاري الحفظ...' : (isEdit ? 'حفظ التعديلات' : 'إضافة')}
        </ActionButton>
      }>
      <ModalSection Icon={User} label="معلومات أساسية">
        <div style={GRID}>
          <TextField full label="الاسم الكامل بالعربي" req filter="ar" value={f.name_ar} onChange={v => set('name_ar', v)}
            error={firstErrKey === 'name_ar'} placeholder="مثال: محمد أحمد الغامدي" />

          <TextField label="الاسم الكامل بالإنجليزي" req filter="en" upper dir="ltr" value={f.name_en} onChange={v => set('name_en', v)}
            error={firstErrKey === 'name_en'} placeholder="MOHAMMED AHMED" />

          <Select label="الجنس" req searchable={false} placeholder="اختر..."
            options={genders || []} getKey={o => o.id} getLabel={o => o.value_ar}
            value={f.gender_id} onChange={v => set('gender_id', v)} error={firstErrKey === 'gender_id'} />

          <DateField label="تاريخ الميلاد" req value={f.date_of_birth} onChange={v => set('date_of_birth', v)}
            error={firstErrKey === 'date_of_birth'} />

          <Select label="الجنسية" req placeholder="اختر الجنسية..."
            options={countries || []} getKey={o => o.id} getLabel={o => o.nationality_ar || o.name_ar}
            value={f.nationality_id} onChange={v => set('nationality_id', v)} error={firstErrKey === 'nationality_id'}
            renderSelected={o => <>{o.nationality_ar || o.name_ar} <Flag code={o.code} size={16} /></>}
            renderCell={(o, isSel) => (
              <span style={{ fontSize: 14, fontWeight: 600, color: isSel ? C.gold : 'rgba(255,255,255,.92)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span>{o.nationality_ar || o.name_ar}</span>
                {o.nationality_en && <span style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', fontWeight: 500 }}>· {o.nationality_en}</span>}
                <Flag code={o.code} size={16} />
              </span>
            )} />

          <Select label="نوع الهوية" req searchable={false} placeholder="اختر..."
            options={filteredIdTypes} getKey={o => o.id} getLabel={o => o.value_ar}
            value={f.id_type_id} onChange={v => set('id_type_id', v)} error={firstErrKey === 'id_type_id'} />

          <IdField label={idFieldLabel} req prefix={idPrefix} value={f.id_number} onChange={v => set('id_number', v)}
            error={firstErrKey === 'id_number'} />

          <PhoneField label="رقم الجوال" req value={f.phone} onChange={v => set('phone', v)} error={firstErrKey === 'phone'} />

          <PhoneField label="رقم ثانوي" value={f.secondary_phone} onChange={v => set('secondary_phone', v)} />
        </div>
      </ModalSection>

      {isEdit && <RolesTab personId={personId} profile={profile} toast={toast} />}
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Roles tab (edit mode only) — 3 sections
// ═══════════════════════════════════════════════════════════════════
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
    <>
      <ModalSection Icon={Building2} label="المنشآت المملوكة">
        {loading ? <Skel /> : owned.length === 0 ? <EmptyRow text="لا توجد منشآت مملوكة" /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {owned.map(o => (
              <FacilityRow key={o.assignment_id || o.facility_id} title={o.facility_name_ar}
                sub={`ملكية ${o.ownership_percentage || 0}%${o.is_primary ? ' · أساسي' : ''}`} />
            ))}
          </div>
        )}
        <AddRowBtn text="إضافة ملكية" onClick={() => toast?.('ميزة الربط قيد التطوير')} />
      </ModalSection>

      <ModalSection Icon={Briefcase} label="المنشآت المُدارة">
        {loading ? <Skel /> : managed.length === 0 ? <EmptyRow text="لا توجد منشآت مُدارة" /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {managed.map(m => (
              <FacilityRow key={m.assignment_id || m.facility_id} title={m.facility_name_ar}
                sub={`${m.manager_type || 'مدير'}${m.is_primary ? ' · أساسي' : ''}`} />
            ))}
          </div>
        )}
        <AddRowBtn text="إضافة إدارة" onClick={() => toast?.('ميزة الربط قيد التطوير')} />
      </ModalSection>

      <ModalSection Icon={UsersIcon} label="أدوار أخرى">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          <RoleMiniCard label="ملف الموظف" linked={!!profile?.user_id} Icon={UsersIcon} color={C.gold}
            onClick={() => toast?.(profile?.user_id ? 'الفتح قريباً' : 'الربط قريباً')} />
          <RoleMiniCard label="ملف العميل" linked={!!profile?.client_id} Icon={UsersIcon} color="#5ca0e6"
            onClick={() => toast?.(profile?.client_id ? 'الفتح قريباً' : 'الربط قريباً')} />
          <RoleMiniCard label="ملف الوسيط" linked={!!profile?.broker_id} Icon={UsersIcon} color="#d9a15a"
            onClick={() => toast?.(profile?.broker_id ? 'الفتح قريباً' : 'الربط قريباً')} />
          <RoleMiniCard label="ملف العامل" linked={!!profile?.worker_id} Icon={HardHat} color="#c0c0c0"
            onClick={() => toast?.(profile?.worker_id ? 'الفتح قريباً' : 'الربط قريباً')} />
        </div>
      </ModalSection>
    </>
  )
}

const FacilityRow = ({ title, sub }) => (
  <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', gap: 10 }}>
    <Building2 size={14} color={C.gold} opacity={.7} />
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.9)' }}>{title || '—'}</div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{sub}</div>
    </div>
  </div>
)

const EmptyRow = ({ text }) => (
  <div style={{ padding: '14px', textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,.45)', background: 'rgba(0,0,0,.15)', borderRadius: 8, border: '1px dashed rgba(255,255,255,.06)' }}>{text}</div>
)

const Skel = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    {[0, 1].map(i => <div key={i} style={{ height: 38, borderRadius: 8, background: 'rgba(255,255,255,.03)' }} />)}
  </div>
)

const AddRowBtn = ({ text, onClick }) => (
  <button type="button" onClick={onClick}
    style={{ marginTop: 8, width: '100%', height: 36, borderRadius: 8, border: '1px dashed rgba(212,160,23,.3)', background: 'rgba(212,160,23,.04)', color: C.gold, fontFamily: "'Cairo','Tajawal',sans-serif", fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: '.15s' }}
    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.1)' }}
    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,160,23,.04)' }}>
    <span style={{ fontSize: 14, fontWeight: 600 }}>+</span> {text}
  </button>
)

const RoleMiniCard = ({ label, linked, onClick, Icon, color }) => (
  <div style={{ borderRadius: 10, padding: '10px 12px', border: `1px solid ${linked ? color + '55' : 'rgba(255,255,255,.06)'}`, background: linked ? color + '0d' : 'rgba(0,0,0,.18)', display: 'flex', alignItems: 'center', gap: 10 }}>
    <div style={{ width: 32, height: 32, borderRadius: 8, background: color + '1a', border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={15} color={color} strokeWidth={2} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.92)' }}>{label}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: linked ? color : 'rgba(255,255,255,.4)', marginTop: 2 }}>{linked ? '● مُرتبط' : 'غير مُرتبط'}</div>
    </div>
    <button type="button" onClick={onClick}
      style={{ height: 26, padding: '0 10px', borderRadius: 7, border: `1px solid ${linked ? 'rgba(192,57,43,.3)' : C.gold + '40'}`, background: linked ? 'rgba(192,57,43,.08)' : 'rgba(212,160,23,.08)', color: linked ? '#e68a80' : C.gold, fontFamily: "'Cairo','Tajawal',sans-serif", fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
      {linked ? 'فتح' : 'ربط'}
    </button>
  </div>
)
