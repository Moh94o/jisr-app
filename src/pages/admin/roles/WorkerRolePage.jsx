import React, { useEffect, useState, useCallback } from 'react'
import { HardHat, CreditCard, Calendar, Edit2, Plus, AlertCircle } from 'lucide-react'
import RoleLayout from './RoleLayout.jsx'
import { KCard, KV, Lbl, sF, HeroStat, KpiBox, ModalShell, SaveBtn, PersonIdentityChip, C } from './RoleUI.jsx'
import * as rolesService from '../../../services/rolesService.js'

const F = "'Cairo','Tajawal',sans-serif"
const SILVER = '#c0c0c0'

export default function WorkerRolePage({ person, onBack, toast, countries, reload }) {
  const [row, setRow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setRow(await rolesService.getWorker(person.id)) }
    catch (e) { toast?.(rolesService.humanizeDbError(e)) }
    finally { setLoading(false) }
  }, [person.id, toast])

  useEffect(() => { load() }, [load])

  const nationality = (countries || []).find(c => c.id === person.nationality_id)
  const onSaved = () => { setShowModal(false); load(); reload?.() }

  const daysTo = (d) => {
    if (!d) return null
    const diff = Math.floor((new Date(d).getTime() - Date.now()) / 86400000)
    return diff
  }
  const iqamaDays = daysTo(row?.iqama_expiry_date)
  const passportDays = daysTo(row?.passport_expiry)

  return (
    <RoleLayout title="ملف العامل" subtitle={person?.name_ar} color={SILVER} onBack={onBack}
      actions={row ? (
        <button onClick={() => setShowModal(true)}
          style={{ height: 34, padding: '0 14px', borderRadius: 8,
            border: `1px solid ${SILVER}55`, background: SILVER + '15',
            color: SILVER, fontFamily: F, fontSize: 11, fontWeight: 800, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Edit2 size={12} /> تعديل
        </button>
      ) : null}>

      <PersonIdentityChip person={person} nationality={nationality} color={SILVER} />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2.6fr) minmax(0,1fr)', gap: 14, marginBottom: 22 }}>
        <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, padding: '10px 12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <KpiBox label="الإقامة" value={iqamaDays != null ? `${iqamaDays} يوم` : '—'}
              color={iqamaDays != null && iqamaDays < 30 ? C.red : C.ok} />
            <KpiBox label="الجواز" value={passportDays != null ? `${passportDays} يوم` : '—'}
              color={passportDays != null && passportDays < 30 ? C.red : C.ok} />
            <KpiBox label="التابعين" value={row?.dependents_count ?? 0} color={C.blue} />
          </div>
        </div>
        <HeroStat label="العامل" value={row ? '1' : '0'} unit="ملف" color={SILVER}
          footer={row?.iqama_number ? `إقامة: ${row.iqama_number}` : 'غير مُرتبط'} />
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx5)' }}>جاري التحميل...</div>
      ) : !row ? (
        <div style={{ padding: 60, textAlign: 'center',
          background: 'rgba(255,255,255,.02)', border: '1px dashed rgba(255,255,255,.06)', borderRadius: 12 }}>
          <HardHat size={40} color={SILVER} style={{ opacity: .6 }} />
          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: 'var(--tx2)' }}>لا يوجد ملف عامل لهذا الشخص</div>
          <button onClick={() => setShowModal(true)}
            style={{ marginTop: 16, height: 36, padding: '0 16px', borderRadius: 9,
              border: `1px solid ${SILVER}55`, background: SILVER + '15', color: SILVER,
              fontFamily: F, fontSize: 12, fontWeight: 800, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> ربط ملف عامل
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          <div className="prs-card">
            <div className="prs-card-title"><HardHat size={15} color={SILVER} /> هوية العامل</div>
            <KV icon={CreditCard} label="رقم الإقامة" value={row.iqama_number} dir="ltr" color={SILVER} />
            <KV icon={Calendar} label="انتهاء الإقامة" value={row.iqama_expiry_date} dir="ltr" color={iqamaDays != null && iqamaDays < 30 ? C.red : SILVER} />
            <KV icon={CreditCard} label="رقم الحدود" value={row.border_number} dir="ltr" color={SILVER} />
            <KV icon={CreditCard} label="رقم الجواز" value={row.passport_number} dir="ltr" color={SILVER} />
            <KV icon={Calendar} label="انتهاء الجواز" value={row.passport_expiry} dir="ltr"
              color={passportDays != null && passportDays < 30 ? C.red : SILVER} />
          </div>
          <div className="prs-card">
            <div className="prs-card-title"><HardHat size={15} color={SILVER} /> العمل</div>
            <KV icon={Calendar} label="تاريخ الدخول" value={row.entry_date} dir="ltr" color={SILVER} />
            <KV icon={CreditCard} label="رقم التأمينات" value={row.social_insurance_no} dir="ltr" color={SILVER} />
            <KV icon={Calendar} label="انضمام التأمينات" value={row.join_date_gosi} dir="ltr" color={SILVER} />
            <KV icon={HardHat} label="عدد التابعين" value={row.dependents_count ?? 0} color={SILVER} />
          </div>
        </div>
      )}

      {showModal && (
        <WorkerModal open={showModal} onClose={() => setShowModal(false)}
          personId={person.id} person={person} row={row} toast={toast} onSaved={onSaved} />
      )}
    </RoleLayout>
  )
}

function WorkerModal({ open, onClose, personId, person, row, toast, onSaved }) {
  const isEdit = !!row
  const [f, setF] = useState({
    name_ar: row?.name_ar || person?.name_ar || '',
    name_en: row?.name_en || person?.name_en || '',
    iqama_number: row?.iqama_number || '',
    iqama_expiry_date: row?.iqama_expiry_date || '',
    border_number: row?.border_number || '',
    passport_number: row?.passport_number || '',
    passport_expiry: row?.passport_expiry || '',
    entry_date: row?.entry_date || '',
    social_insurance_no: row?.social_insurance_no || '',
    join_date_gosi: row?.join_date_gosi || '',
    dependents_count: row?.dependents_count ?? 0,
    notes: row?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const save = async () => {
    setSaving(true)
    try {
      const clean = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v === '' ? null : v]))
      const payload = { ...clean, person_id: personId }
      if (isEdit) await rolesService.updateWorker(row.id, clean)
      else await rolesService.createWorker(payload)
      toast?.(isEdit ? 'تم التحديث' : 'تم الربط'); onSaved?.()
    } catch (e) { toast?.(rolesService.humanizeDbError(e)) }
    finally { setSaving(false) }
  }

  return (
    <ModalShell open={open} onClose={onClose} title={isEdit ? 'تعديل ملف العامل' : 'ربط ملف عامل'} Icon={HardHat}
      footer={<><div style={{ flex: 1 }} /><SaveBtn onClick={save} disabled={saving} label={saving ? 'جاري الحفظ...' : (isEdit ? 'حفظ' : 'ربط')} /></>}>
      <KCard Icon={HardHat} label="بيانات العامل">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div><Lbl req>الاسم بالعربي</Lbl>
            <input value={f.name_ar} onChange={e => set('name_ar', e.target.value)} style={sF} /></div>
          <div><Lbl>الاسم بالإنجليزي</Lbl>
            <input value={f.name_en} onChange={e => set('name_en', e.target.value.toUpperCase())} dir="ltr"
              style={{ ...sF, direction: 'ltr', textTransform: 'uppercase' }} /></div>
          <div><Lbl>رقم الإقامة</Lbl>
            <input value={f.iqama_number} onChange={e => set('iqama_number', e.target.value.replace(/\D/g,''))}
              dir="ltr" maxLength={10} style={{ ...sF, direction: 'ltr' }} /></div>
          <div><Lbl>انتهاء الإقامة</Lbl>
            <input type="date" value={f.iqama_expiry_date} onChange={e => set('iqama_expiry_date', e.target.value)}
              style={{ ...sF, direction: 'ltr', colorScheme: 'dark' }} /></div>
          <div><Lbl>رقم الحدود</Lbl>
            <input value={f.border_number} onChange={e => set('border_number', e.target.value)} dir="ltr"
              style={{ ...sF, direction: 'ltr' }} /></div>
          <div><Lbl>رقم الجواز</Lbl>
            <input value={f.passport_number} onChange={e => set('passport_number', e.target.value.toUpperCase())} dir="ltr"
              style={{ ...sF, direction: 'ltr', textTransform: 'uppercase' }} /></div>
          <div><Lbl>انتهاء الجواز</Lbl>
            <input type="date" value={f.passport_expiry} onChange={e => set('passport_expiry', e.target.value)}
              style={{ ...sF, direction: 'ltr', colorScheme: 'dark' }} /></div>
          <div><Lbl>تاريخ الدخول</Lbl>
            <input type="date" value={f.entry_date} onChange={e => set('entry_date', e.target.value)}
              style={{ ...sF, direction: 'ltr', colorScheme: 'dark' }} /></div>
          <div><Lbl>رقم التأمينات</Lbl>
            <input value={f.social_insurance_no} onChange={e => set('social_insurance_no', e.target.value)} dir="ltr"
              style={{ ...sF, direction: 'ltr' }} /></div>
          <div><Lbl>انضمام التأمينات</Lbl>
            <input type="date" value={f.join_date_gosi} onChange={e => set('join_date_gosi', e.target.value)}
              style={{ ...sF, direction: 'ltr', colorScheme: 'dark' }} /></div>
          <div><Lbl>عدد التابعين</Lbl>
            <input type="number" min="0" value={f.dependents_count ?? 0}
              onChange={e => set('dependents_count', Number(e.target.value))} style={{ ...sF, direction: 'ltr' }} /></div>
        </div>
      </KCard>
    </ModalShell>
  )
}
