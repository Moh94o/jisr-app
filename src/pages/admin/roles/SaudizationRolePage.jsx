import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { UserCheck, Calendar } from 'lucide-react'
import RoleLayout from './RoleLayout.jsx'
import { KCard, Lbl, sF, HeroStat, KpiBox, ModalShell, SaveBtn, PersonIdentityChip, FacilityCard, AddBtn, EmptyState, FacilityPicker, C } from './RoleUI.jsx'
import * as rolesService from '../../../services/rolesService.js'

const F = "'Cairo','Tajawal',sans-serif"
const TEAL = '#3483b4'

// Next week Sun-Thu (Saudi business week).
function nextWeekRange() {
  const d = new Date()
  const day = d.getDay()
  const daysUntilSunday = (7 - day) % 7 || 7
  const sun = new Date(d.getTime() + daysUntilSunday * 86400000)
  const thu = new Date(sun.getTime() + 4 * 86400000)
  const fmt = (x) => x.toISOString().slice(0, 10)
  return { start: fmt(sun), end: fmt(thu) }
}

export default function SaudizationRolePage({ person, onBack, toast, countries, reload }) {
  const [rows, setRows] = useState([])
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(true)
  const [editRow, setEditRow] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [filterYear, setFilterYear] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, f] = await Promise.all([
        rolesService.listSaudization(person.id),
        rolesService.listFacilities(),
      ])
      setRows(r); setFacilities(f)
    } catch (e) { toast?.(rolesService.humanizeDbError(e)) }
    finally { setLoading(false) }
  }, [person.id, toast])

  useEffect(() => { load() }, [load])

  const nationality = (countries || []).find(c => c.id === person.nationality_id)

  const years = useMemo(() => {
    const s = new Set(rows.map(r => r.week_start?.slice(0, 4)).filter(Boolean))
    return [...s].sort().reverse()
  }, [rows])

  const filtered = useMemo(() => filterYear ? rows.filter(r => r.week_start?.startsWith(filterYear)) : rows, [rows, filterYear])

  const totalSalary = filtered.reduce((s, r) => s + Number(r.monthly_salary || 0), 0)
  const nm = n => Number(n).toLocaleString('ar-SA')

  const onSaved = () => { setShowModal(false); setEditRow(null); load(); reload?.() }
  const openAdd = () => { setEditRow(null); setShowModal(true) }
  const openEdit = (r) => { setEditRow(r); setShowModal(true) }
  const onDelete = async (r) => {
    if (!confirm(`حذف سعودة أسبوع ${r.week_start}؟`)) return
    try { await rolesService.deleteSaudization(r.id); toast?.('تم الحذف'); load(); reload?.() }
    catch (e) { toast?.(rolesService.humanizeDbError(e)) }
  }

  return (
    <RoleLayout title="ملف السعودة" subtitle={person?.name_ar} color={TEAL} onBack={onBack}
      actions={<AddBtn text="إضافة سعودة" onClick={openAdd} color={TEAL} />}>

      <PersonIdentityChip person={person} nationality={nationality} color={TEAL} />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2.6fr) minmax(0,1fr)', gap: 14, marginBottom: 22 }}>
        <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, padding: '10px 12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <KpiBox label="الأسابيع" value={filtered.length} color={TEAL} />
            <KpiBox label="إجمالي الراتب" value={nm(totalSalary)} color={C.gold} />
            <KpiBox label="السنوات" value={years.length} color={C.blue} />
          </div>
        </div>
        <HeroStat label="السعودة" value={filtered.length} unit="أسبوع" color={TEAL}
          footer={`${nm(totalSalary)} ريال إجمالي`} />
      </div>

      {years.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <button onClick={() => setFilterYear('')}
            style={pillBtnStyle(!filterYear)}>الكل</button>
          {years.map(y => (
            <button key={y} onClick={() => setFilterYear(y)} style={pillBtnStyle(filterYear === y)}>{y}</button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx5)' }}>جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <EmptyState text="لا توجد سجلات سعودة" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(r => (
            <FacilityCard key={r.id} facility={r.facility} color={TEAL} isActive
              badges={r.placement_type ? [{ text: r.placement_type, color: TEAL }] : []}
              fields={[
                { label: 'من', value: r.week_start, dir: 'ltr' },
                { label: 'إلى', value: r.week_end, dir: 'ltr' },
                { label: 'الراتب الشهري', value: r.monthly_salary != null ? `${nm(r.monthly_salary)} ر.س` : '—' },
              ]}
              onEdit={() => openEdit(r)} onEnd={() => onDelete(r)} />
          ))}
        </div>
      )}

      {showModal && (
        <SaudizationModal open={showModal} onClose={() => { setShowModal(false); setEditRow(null) }}
          personId={person.id} row={editRow} facilities={facilities} toast={toast} onSaved={onSaved} />
      )}
    </RoleLayout>
  )
}

const pillBtnStyle = (active) => ({
  height: 30, padding: '0 14px', borderRadius: 7,
  border: active ? '1px solid rgba(52,131,180,.55)' : '1px solid rgba(255,255,255,.08)',
  background: active ? 'rgba(52,131,180,.18)' : 'rgba(255,255,255,.03)',
  color: active ? '#6bb6e6' : 'var(--tx3)',
  fontFamily: F, fontSize: 11, fontWeight: 800, cursor: 'pointer'
})

function SaudizationModal({ open, onClose, personId, row, facilities, toast, onSaved }) {
  const isEdit = !!row
  const dflt = nextWeekRange()
  const [f, setF] = useState({
    facility_id: row?.facility_id || '',
    week_start: row?.week_start || dflt.start,
    week_end: row?.week_end || dflt.end,
    placement_type: row?.placement_type || 'primary',
    monthly_salary: row?.monthly_salary ?? '',
    notes: row?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const save = async () => {
    if (!f.facility_id) { toast?.('اختر المنشأة'); return }
    if (!f.week_start || !f.week_end) { toast?.('حدد نطاق الأسبوع'); return }
    setSaving(true)
    try {
      const payload = {
        person_id: personId,
        facility_id: f.facility_id,
        week_start: f.week_start,
        week_end: f.week_end,
        placement_type: f.placement_type || null,
        monthly_salary: f.monthly_salary === '' ? null : Number(f.monthly_salary),
        notes: f.notes || null,
      }
      if (isEdit) await rolesService.updateSaudization(row.id, payload)
      else await rolesService.createSaudization(payload)
      toast?.(isEdit ? 'تم التحديث' : 'تمت الإضافة'); onSaved?.()
    } catch (e) { toast?.(rolesService.humanizeDbError(e)) }
    finally { setSaving(false) }
  }

  return (
    <ModalShell open={open} onClose={onClose} title={isEdit ? 'تعديل سعودة' : 'إضافة سعودة'} Icon={Calendar}
      footer={<><div style={{ flex: 1 }} /><SaveBtn onClick={save} disabled={saving} label={saving ? 'جاري الحفظ...' : 'حفظ'} /></>}>
      <KCard Icon={Calendar} label="سجل سعودة أسبوعي">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}><Lbl req>المنشأة</Lbl>
            <FacilityPicker value={f.facility_id} onChange={v => set('facility_id', v)} options={facilities}
              disabled={isEdit} /></div>
          <div><Lbl req>بداية الأسبوع</Lbl>
            <input type="date" value={f.week_start} onChange={e => set('week_start', e.target.value)}
              style={{ ...sF, direction: 'ltr', colorScheme: 'dark' }} /></div>
          <div><Lbl req>نهاية الأسبوع</Lbl>
            <input type="date" value={f.week_end} onChange={e => set('week_end', e.target.value)}
              style={{ ...sF, direction: 'ltr', colorScheme: 'dark' }} /></div>
          <div><Lbl>نوع السعودة</Lbl>
            <select value={f.placement_type} onChange={e => set('placement_type', e.target.value)}
              style={{ ...sF, cursor: 'pointer' }}>
              <option value="primary">أساسي</option>
              <option value="backup">احتياطي</option>
              <option value="temporary">مؤقت</option>
            </select></div>
          <div><Lbl>الراتب الشهري</Lbl>
            <input type="number" step="1" value={f.monthly_salary}
              onChange={e => set('monthly_salary', e.target.value)} style={{ ...sF, direction: 'ltr' }} /></div>
        </div>
        <div style={{ marginTop: 14 }}>
          <Lbl>ملاحظات</Lbl>
          <textarea value={f.notes} onChange={e => set('notes', e.target.value)} rows={3}
            style={{ ...sF, height: 'auto', padding: 14, textAlign: 'start' }} />
        </div>
      </KCard>
    </ModalShell>
  )
}
