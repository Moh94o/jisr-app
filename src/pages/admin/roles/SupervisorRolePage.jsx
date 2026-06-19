import React, { useEffect, useState, useCallback } from 'react'
import { UserCheck, BadgeCheck, CheckCircle2, X } from 'lucide-react'
import RoleLayout from './RoleLayout.jsx'
import { HeroStat, KpiBox, ModalShell, FacilityCard, AddBtn, EmptyState, C } from './RoleUI.jsx'
import { ModalSection, GRID, ActionButton, Select, TextField, DateField, Segmented, TextArea, ConfirmDialog } from '../../../components/ui/FormKit.jsx'
import * as rolesService from '../../../services/rolesService.js'

const F = "'Cairo','Tajawal',sans-serif"
const MINT = '#5acbb0'

function AssignedPill({ text, onUnassign }) {
  const okColor = C.ok
  return (
    <div style={{ display: 'inline-flex', alignItems: 'stretch', height: 38,
      borderRadius: 10, overflow: 'hidden',
      border: `1px solid ${okColor}55`, background: `${okColor}14`,
      boxShadow: `inset 0 0 0 1px ${okColor}1a, 0 0 12px ${okColor}18` }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '0 14px', color: okColor, fontFamily: F, fontSize: 12, fontWeight: 800 }}>
        <CheckCircle2 size={14} strokeWidth={2.5} />
        {text}
      </div>
      <button onClick={onUnassign} title="إلغاء التعيين"
        style={{ width: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', borderInlineStart: `1px solid ${okColor}33`,
          background: 'transparent', padding: 0,
          color: okColor, cursor: 'pointer', transition: '.15s' }}
        onMouseEnter={e => { e.currentTarget.style.background = `${okColor}22` }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
        <X size={13} strokeWidth={2.5} />
      </button>
    </div>
  )
}

export default function SupervisorRolePage({ person, onBack, toast, countries, reload }) {
  const [rows, setRows] = useState([])
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(true)
  const [editRow, setEditRow] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [isMarked, setIsMarked] = useState(false)
  const [marking, setMarking] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, f, flag] = await Promise.all([
        rolesService.listSupervisors(person.id),
        rolesService.listFacilities(),
        rolesService.getPersonRoleFlag(person.id, 'supervisor'),
      ])
      setRows(r); setFacilities(f); setIsMarked(flag)
    } catch (e) { toast?.(rolesService.humanizeDbError(e)) }
    finally { setLoading(false) }
  }, [person.id, toast])

  useEffect(() => { load() }, [load])

  const nationality = (countries || []).find(c => c.id === person.nationality_id)
  const activeRows = rows.filter(r => r.is_active && !r.end_date)
  const endedRows = rows.filter(r => !r.is_active || r.end_date)

  const onSaved = () => { setShowModal(false); setEditRow(null); load(); reload?.() }
  const onAssign = async () => {
    if (isMarked || marking) return
    setMarking(true)
    try {
      await rolesService.setPersonRoleFlag(person.id, 'supervisor')
      setIsMarked(true)
      toast?.('تم تعيين الشخص كمشرف — الآن يظهر في قوائم المشرفين عند ربطه بمنشأة')
      reload?.()
    } catch (e) { toast?.(rolesService.humanizeDbError(e)) }
    finally { setMarking(false) }
  }
  const onUnassign = async () => {
    if (marking) return
    setMarking(true)
    try {
      await rolesService.removePersonRoleFlag(person.id, 'supervisor')
      setIsMarked(false)
      toast?.('تم إلغاء تعيين الشخص كمشرف')
      reload?.()
    } catch (e) { toast?.(rolesService.humanizeDbError(e)) }
    finally { setMarking(false) }
  }
  const openEdit = (r) => { setEditRow(r); setShowModal(true) }
  const onEnd = async (r) => {
    try { await rolesService.endSupervisor(r.id); toast?.('تم الإنهاء'); load(); reload?.() }
    catch (e) { toast?.(rolesService.humanizeDbError(e)) }
  }

  return (
    <RoleLayout title="ملف المشرف" subtitle={person?.name_ar} color={MINT} onBack={onBack}
      actions={isMarked
        ? <AssignedPill text="معيّن كمشرف" onUnassign={onUnassign} />
        : <AddBtn text="تعيين كمشرف" onClick={onAssign} color={MINT} Icon={BadgeCheck} iconAfter />}>

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
              onEdit={() => openEdit(r)} onEnd={() => setConfirmTarget(r)} />
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

      <ConfirmDialog open={!!confirmTarget} title="تأكيد الإنهاء"
        message="إنهاء صلاحية الإشراف على المنشأة؟" itemName={confirmTarget?.facility?.name_ar}
        confirmText="إنهاء"
        onConfirm={() => { const r = confirmTarget; setConfirmTarget(null); onEnd(r) }}
        onCancel={() => setConfirmTarget(null)} />
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
    <ModalShell open={open} onClose={onClose} variant={isEdit ? 'edit' : 'create'}
      title={isEdit ? 'تعديل صلاحية إشراف' : 'إضافة صلاحية إشراف'} Icon={UserCheck}
      footer={<ActionButton onClick={save} disabled={saving || !f.facility_id}>{saving ? 'جاري الحفظ...' : 'حفظ'}</ActionButton>}>
      <ModalSection Icon={UserCheck} label="صلاحية المشرف">
        <div style={GRID}>
          <Select label="المنشأة" req full value={f.facility_id} onChange={v => set('facility_id', v)}
            options={facilities} getKey={o => o.id} getLabel={o => o.name_ar}
            getSub={o => o.cr_number ? `CR: ${o.cr_number}` : ''}
            placeholder="اختر المنشأة..." disabled={isEdit} />
          <TextField label="اسم مستخدم التأمينات" dir="ltr"
            value={f.gosi_username} onChange={v => set('gosi_username', v)} />
          <Segmented label="مستوى الصلاحية" value={f.access_level} onChange={v => set('access_level', v)}
            options={[{ v: 'viewer', l: 'عرض فقط' }, { v: 'editor', l: 'تعديل' }, { v: 'admin', l: 'مدير' }]} />
          <DateField label="تاريخ البدء" value={f.start_date} onChange={v => set('start_date', v)} />
          <DateField label="تاريخ الانتهاء" value={f.end_date} onChange={v => set('end_date', v)} />
          <TextArea label="ملاحظات" value={f.notes} onChange={v => set('notes', v)} />
        </div>
      </ModalSection>
    </ModalShell>
  )
}
