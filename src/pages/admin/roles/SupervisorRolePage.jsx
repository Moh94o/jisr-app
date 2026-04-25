import React, { useEffect, useState, useCallback } from 'react'
import { UserCheck } from 'lucide-react'
import RoleLayout from './RoleLayout.jsx'
import { KCard, Lbl, sF, HeroStat, KpiBox, ModalShell, SaveBtn, PersonIdentityChip, FacilityCard, AddBtn, EmptyState, FacilityPicker, C } from './RoleUI.jsx'
import * as rolesService from '../../../services/rolesService.js'

const F = "'Cairo','Tajawal',sans-serif"
const MINT = '#5acbb0'

export default function SupervisorRolePage({ person, onBack, toast, countries, reload }) {
  const [rows, setRows] = useState([])
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(true)
  const [editRow, setEditRow] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, f] = await Promise.all([
        rolesService.listSupervisors(person.id),
        rolesService.listFacilities(),
      ])
      setRows(r); setFacilities(f)
    } catch (e) { toast?.(rolesService.humanizeDbError(e)) }
    finally { setLoading(false) }
  }, [person.id, toast])

  useEffect(() => { load() }, [load])

  const nationality = (countries || []).find(c => c.id === person.nationality_id)
  const activeRows = rows.filter(r => r.is_active && !r.end_date)
  const endedRows = rows.filter(r => !r.is_active || r.end_date)

  const onSaved = () => { setShowModal(false); setEditRow(null); load(); reload?.() }
  const openAdd = () => { setEditRow(null); setShowModal(true) }
  const openEdit = (r) => { setEditRow(r); setShowModal(true) }
  const onEnd = async (r) => {
    if (!confirm(`إنهاء صلاحية الإشراف على "${r.facility?.name_ar}"؟`)) return
    try { await rolesService.endSupervisor(r.id); toast?.('تم الإنهاء'); load(); reload?.() }
    catch (e) { toast?.(rolesService.humanizeDbError(e)) }
  }

  return (
    <RoleLayout title="ملف المشرف" subtitle={person?.name_ar} color={MINT} onBack={onBack}
      actions={<AddBtn text="إضافة صلاحية إشراف" onClick={openAdd} color={MINT} />}>

      <PersonIdentityChip person={person} nationality={nationality} color={MINT} />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2.6fr) minmax(0,1fr)', gap: 14, marginBottom: 22 }}>
        <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, padding: '10px 12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <KpiBox label="النشطة" value={activeRows.length} color={C.ok} />
            <KpiBox label="المنتهية" value={endedRows.length} color="#999" />
            <KpiBox label="المجموع" value={rows.length} color={MINT} />
          </div>
        </div>
        <HeroStat label="المشرف" value={activeRows.length} unit="منشأة" color={MINT}
          footer={activeRows.length ? 'صلاحيات سارية' : 'لا توجد صلاحيات'} />
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx5)' }}>جاري التحميل...</div>
      ) : rows.length === 0 ? (
        <EmptyState text="لا توجد صلاحيات إشراف" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activeRows.map(r => (
            <FacilityCard key={r.id} facility={r.facility} color={MINT} isActive
              badges={r.access_level ? [{ text: r.access_level, color: MINT }] : []}
              fields={[
                { label: 'مستخدم التأمينات', value: r.gosi_username || '—', dir: 'ltr' },
                { label: 'من', value: r.start_date || '—', dir: 'ltr' },
                { label: 'إلى', value: r.end_date || 'ساري', dir: 'ltr' },
              ]}
              onEdit={() => openEdit(r)} onEnd={() => onEnd(r)} />
          ))}
          {endedRows.length > 0 && (
            <>
              <div style={{ marginTop: 18, fontSize: 11, fontWeight: 800, color: 'var(--tx5)' }}>السجلات المنتهية</div>
              {endedRows.map(r => (
                <FacilityCard key={r.id} facility={r.facility} color="#777" isActive={false}
                  fields={[
                    { label: 'مستخدم التأمينات', value: r.gosi_username || '—', dir: 'ltr' },
                    { label: 'من', value: r.start_date || '—', dir: 'ltr' },
                    { label: 'إلى', value: r.end_date || '—', dir: 'ltr' },
                  ]} />
              ))}
            </>
          )}
        </div>
      )}

      {showModal && (
        <SupervisorModal open={showModal} onClose={() => { setShowModal(false); setEditRow(null) }}
          personId={person.id} row={editRow} facilities={facilities} toast={toast} onSaved={onSaved} />
      )}
    </RoleLayout>
  )
}

function SupervisorModal({ open, onClose, personId, row, facilities, toast, onSaved }) {
  const isEdit = !!row
  const [f, setF] = useState({
    facility_id: row?.facility_id || '',
    gosi_username: row?.gosi_username || '',
    access_level: row?.access_level || 'viewer',
    start_date: row?.start_date || new Date().toISOString().slice(0, 10),
    end_date: row?.end_date || '',
    notes: row?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const save = async () => {
    if (!f.facility_id) { toast?.('اختر المنشأة'); return }
    setSaving(true)
    try {
      const payload = {
        person_id: personId,
        facility_id: f.facility_id,
        gosi_username: f.gosi_username || null,
        access_level: f.access_level || null,
        start_date: f.start_date || null,
        end_date: f.end_date || null,
        notes: f.notes || null,
        is_active: !f.end_date,
      }
      if (isEdit) await rolesService.updateSupervisor(row.id, payload)
      else await rolesService.createSupervisor(payload)
      toast?.(isEdit ? 'تم التحديث' : 'تمت الإضافة'); onSaved?.()
    } catch (e) { toast?.(rolesService.humanizeDbError(e)) }
    finally { setSaving(false) }
  }

  return (
    <ModalShell open={open} onClose={onClose} title={isEdit ? 'تعديل صلاحية إشراف' : 'إضافة صلاحية إشراف'} Icon={UserCheck}
      footer={<><div style={{ flex: 1 }} /><SaveBtn onClick={save} disabled={saving} label={saving ? 'جاري الحفظ...' : 'حفظ'} /></>}>
      <KCard Icon={UserCheck} label="صلاحية المشرف">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}><Lbl req>المنشأة</Lbl>
            <FacilityPicker value={f.facility_id} onChange={v => set('facility_id', v)}
              options={facilities} disabled={isEdit} /></div>
          <div><Lbl>اسم مستخدم التأمينات</Lbl>
            <input value={f.gosi_username} onChange={e => set('gosi_username', e.target.value)} dir="ltr"
              style={{ ...sF, direction: 'ltr' }} /></div>
          <div><Lbl>مستوى الصلاحية</Lbl>
            <select value={f.access_level} onChange={e => set('access_level', e.target.value)}
              style={{ ...sF, cursor: 'pointer' }}>
              <option value="viewer">عرض فقط</option>
              <option value="editor">تعديل</option>
              <option value="admin">مدير</option>
            </select></div>
          <div><Lbl>تاريخ البدء</Lbl>
            <input type="date" value={f.start_date} onChange={e => set('start_date', e.target.value)}
              style={{ ...sF, direction: 'ltr', colorScheme: 'dark' }} /></div>
          <div><Lbl>تاريخ الانتهاء</Lbl>
            <input type="date" value={f.end_date} onChange={e => set('end_date', e.target.value)}
              style={{ ...sF, direction: 'ltr', colorScheme: 'dark' }} /></div>
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
