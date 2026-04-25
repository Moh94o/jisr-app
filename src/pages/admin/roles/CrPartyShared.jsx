import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Edit2, Plus, Activity, CheckCircle2, X } from 'lucide-react'
import RoleLayout from './RoleLayout.jsx'
import { KCard, Lbl, sF, HeroStat, KpiBox, ModalShell, SaveBtn, FacilityCard, AddBtn, EmptyState, FacilityPicker, C } from './RoleUI.jsx'
import * as rolesService from '../../../services/rolesService.js'

const F = "'Cairo','Tajawal',sans-serif"

/**
 * Shared component for the 3 CR-party roles (owner / beneficiary / manager).
 * Differs per role in: title, color, icon, displayed fields on facility cards,
 * modal fields (ownership % for owner, position_title for manager), etc.
 *
 * config prop: { title, color, Icon, roleType, showOwnership, showPosition }
 */
export default function CrPartyPage({ person, onBack, toast, countries, reload, config }) {
  const [rows, setRows] = useState([])
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(true)
  const [editRow, setEditRow] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [isMarked, setIsMarked] = useState(false)
  const [marking, setMarking] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, f, flag] = await Promise.all([
        rolesService.listCrParties(person.id, config.roleType),
        rolesService.listFacilities(),
        rolesService.getPersonRoleFlag(person.id, config.roleType),
      ])
      setRows(r); setFacilities(f); setIsMarked(flag)
    } catch (e) { toast?.(rolesService.humanizeDbError(e)) }
    finally { setLoading(false) }
  }, [person.id, config.roleType, toast])

  useEffect(() => { load() }, [load])

  const nationality = (countries || []).find(c => c.id === person.nationality_id)
  const activeRows = rows.filter(r => r.is_active && !r.end_date)
  const endedRows = rows.filter(r => !r.is_active || r.end_date)

  const onSaved = () => { setShowModal(false); setEditRow(null); load(); reload?.() }

  const openAdd = async () => {
    if (config.simpleAdd) {
      if (isMarked || marking) return
      setMarking(true)
      try {
        await rolesService.setPersonRoleFlag(person.id, config.roleType)
        setIsMarked(true)
        toast?.(config.simpleAddToast || 'تم التعيين')
        reload?.()
      } catch (e) { toast?.(rolesService.humanizeDbError(e)) }
      finally { setMarking(false) }
      return
    }
    setEditRow(null); setShowModal(true)
  }
  const onUnassign = async () => {
    if (marking) return
    setMarking(true)
    try {
      await rolesService.removePersonRoleFlag(person.id, config.roleType)
      setIsMarked(false)
      toast?.(config.simpleUnassignToast || 'تم إلغاء التعيين')
      reload?.()
    } catch (e) { toast?.(rolesService.humanizeDbError(e)) }
    finally { setMarking(false) }
  }
  const openEdit = (r) => { setEditRow(r); setShowModal(true) }
  const onEnd = async (r) => {
    if (!confirm(`إنهاء علاقة "${r.facility?.name_ar}"؟`)) return
    try { await rolesService.endCrParty(r.id); toast?.('تم الإنهاء'); load(); reload?.() }
    catch (e) { toast?.(rolesService.humanizeDbError(e)) }
  }

  return (
    <RoleLayout title={config.title} subtitle={person?.name_ar} color={config.color} onBack={onBack}
      actions={config.simpleAdd && isMarked ? (
        <AssignedPill text={config.assignedText || `معيّن كـ${config.title.replace('ملف ', '')}`}
          onUnassign={onUnassign} />
      ) : (
        <AddBtn text={config.addText || 'إضافة'} onClick={openAdd} color={config.color}
          Icon={config.addIcon} iconAfter={!!config.addIconAfter} />
      )}>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2.6fr) minmax(0,1fr)', gap: 14, marginBottom: 22 }}>
        <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,.06)',
          borderRadius: 14, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <KpiBox label="النشطة" value={activeRows.length} color={C.ok} />
            <KpiBox label="المنتهية" value={endedRows.length} color="#999" />
            <KpiBox label="المجموع" value={rows.length} color={config.color} />
          </div>
          <OwnershipActivityChart rows={rows} color={config.color} title={config.title} />
        </div>
        <HeroStat label={config.title} value={activeRows.length} unit="منشأة" color={config.color}
          footer={activeRows.length ? 'سارية حالياً' : 'لا توجد حالياً'} />
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx5)' }}>جاري التحميل...</div>
      ) : rows.length === 0 ? (
        <EmptyState text={config.emptyText || `لا توجد سجلات`} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activeRows.map(r => (
            <FacilityCard key={r.id} facility={r.facility} color={config.color} isActive
              badges={[
                ...(r.is_primary ? [{ text: 'أساسي', color: config.color }] : []),
                ...(config.showOwnership && r.ownership_percentage != null ? [{ text: `${r.ownership_percentage}%`, color: C.gold }] : []),
              ]}
              fields={[
                { label: 'من', value: r.start_date || '—', dir: 'ltr' },
                { label: 'إلى', value: r.end_date || 'ساري', dir: 'ltr' },
                ...(config.showPosition ? [{ label: 'المنصب', value: r.position_title || '—' }] : []),
              ]}
              onEdit={() => openEdit(r)} onEnd={() => onEnd(r)} />
          ))}
          {endedRows.length > 0 && (
            <>
              <div style={{ marginTop: 18, fontSize: 11, fontWeight: 800, color: 'var(--tx5)', letterSpacing: '.5px' }}>السجلات المنتهية</div>
              {endedRows.map(r => (
                <FacilityCard key={r.id} facility={r.facility} color="#777" isActive={false}
                  badges={[
                    ...(config.showOwnership && r.ownership_percentage != null ? [{ text: `${r.ownership_percentage}%`, color: '#888' }] : []),
                  ]}
                  fields={[
                    { label: 'من', value: r.start_date || '—', dir: 'ltr' },
                    { label: 'إلى', value: r.end_date || '—', dir: 'ltr' },
                    ...(config.showPosition ? [{ label: 'المنصب', value: r.position_title || '—' }] : []),
                  ]} />
              ))}
            </>
          )}
        </div>
      )}

      {showModal && !config.simpleAdd && (
        <CrPartyModal open={showModal} onClose={() => { setShowModal(false); setEditRow(null) }}
          personId={person.id} row={editRow} facilities={facilities} toast={toast} onSaved={onSaved} config={config} />
      )}
    </RoleLayout>
  )
}

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

function OwnershipActivityChart({ rows, color, title }) {
  const months = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - (11 - i), 1)
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
      const count = rows.filter(r => {
        const start = r.start_date ? new Date(r.start_date) : null
        const end = r.end_date ? new Date(r.end_date) : null
        if (start && start > monthEnd) return false
        if (end && end < d) return false
        return true
      }).length
      return { date: d, count }
    })
  }, [rows])

  const max = Math.max(1, ...months.map(m => m.count))
  const total = rows.length

  return (
    <div style={{ padding: '0 4px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, padding: '0 4px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 11.5, fontWeight: 800, color: 'var(--tx)' }}>
          <Activity size={13} color={color} /> نشاط {title} (آخر 12 شهر)
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--tx4)' }}>
          الإجمالي: <span style={{ color, fontWeight: 800 }}>{total}</span> سجل
        </span>
      </div>
      <div style={{ position: 'relative', height: 130, padding: '4px 2px 10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${months.length}, 1fr)`,
          gap: 5, alignItems: 'end', height: '100%', direction: 'ltr' }}>
          {months.map((m, i) => {
            const h = (m.count / max) * 100
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: '100%' }}>
                <div title={`${m.date.toLocaleDateString('ar-SA', { month: 'short', year: 'numeric' })} — ${m.count}`}
                  style={{ width: '70%', minHeight: m.count > 0 ? 3 : 0,
                    height: `${h}%`,
                    background: m.count > 0
                      ? `linear-gradient(180deg, ${color} 0%, ${color}88 100%)`
                      : 'rgba(255,255,255,.04)',
                    borderRadius: '4px 4px 2px 2px',
                    border: m.count > 0 ? `1px solid ${color}55` : '1px solid rgba(255,255,255,.04)',
                    boxShadow: m.count > 0 ? `0 0 8px ${color}33` : 'none',
                    transition: '.2s' }} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function CrPartyModal({ open, onClose, personId, row, facilities, toast, onSaved, config }) {
  const isEdit = !!row
  const [f, setF] = useState({
    facility_id: row?.facility_id || '',
    ownership_percentage: row?.ownership_percentage ?? '',
    position_title: row?.position_title || '',
    is_primary: row?.is_primary || false,
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
        role_type: config.roleType,
        is_primary: f.is_primary,
        start_date: f.start_date || null,
        end_date: f.end_date || null,
        notes: f.notes || null,
        is_active: !f.end_date,
      }
      if (config.showOwnership) payload.ownership_percentage = f.ownership_percentage === '' ? null : Number(f.ownership_percentage)
      if (config.showPosition) payload.position_title = f.position_title || null
      if (isEdit) await rolesService.updateCrParty(row.id, payload)
      else await rolesService.createCrParty(payload)
      toast?.(isEdit ? 'تم التحديث' : 'تمت الإضافة'); onSaved?.()
    } catch (e) { toast?.(rolesService.humanizeDbError(e)) }
    finally { setSaving(false) }
  }

  return (
    <ModalShell open={open} onClose={onClose}
      title={isEdit ? `تعديل ${config.title}` : `إضافة ${config.title}`} Icon={config.Icon}
      footer={<><div style={{ flex: 1 }} /><SaveBtn onClick={save} disabled={saving} label={saving ? 'جاري الحفظ...' : 'حفظ'} /></>}>
      <KCard Icon={config.Icon} label={config.title}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}><Lbl req>المنشأة</Lbl>
            <FacilityPicker value={f.facility_id} onChange={v => set('facility_id', v)} options={facilities}
              disabled={isEdit} /></div>
          {config.showOwnership && (
            <div><Lbl>نسبة الملكية (%)</Lbl>
              <input type="number" min="0" max="100" step="0.01" value={f.ownership_percentage}
                onChange={e => set('ownership_percentage', e.target.value)} style={{ ...sF, direction: 'ltr' }} /></div>
          )}
          {config.showPosition && (
            <div><Lbl>المنصب</Lbl>
              <input value={f.position_title} onChange={e => set('position_title', e.target.value)}
                placeholder="المدير العام" style={sF} /></div>
          )}
          <div><Lbl>تاريخ البدء</Lbl>
            <input type="date" value={f.start_date} onChange={e => set('start_date', e.target.value)}
              style={{ ...sF, direction: 'ltr', colorScheme: 'dark' }} /></div>
          <div><Lbl>تاريخ الانتهاء</Lbl>
            <input type="date" value={f.end_date} onChange={e => set('end_date', e.target.value)}
              style={{ ...sF, direction: 'ltr', colorScheme: 'dark' }} /></div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--tx2)', cursor: 'pointer' }}>
              <input type="checkbox" checked={f.is_primary} onChange={e => set('is_primary', e.target.checked)} />
              أساسي
            </label>
          </div>
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
