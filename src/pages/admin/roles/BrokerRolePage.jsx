import React, { useEffect, useState, useCallback } from 'react'
import { UserCheck, CreditCard, Edit2, Plus, Building2 } from 'lucide-react'
import RoleLayout from './RoleLayout.jsx'
import { KCard, KV, Lbl, sF, HeroStat, KpiBox, ModalShell, SaveBtn, PersonIdentityChip, C } from './RoleUI.jsx'
import * as rolesService from '../../../services/rolesService.js'

const F = "'Cairo','Tajawal',sans-serif"
const BROWN = '#d9a15a'

export default function BrokerRolePage({ person, onBack, toast, countries, reload }) {
  const [row, setRow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setRow(await rolesService.getBroker(person.id)) }
    catch (e) { toast?.(rolesService.humanizeDbError(e)) }
    finally { setLoading(false) }
  }, [person.id, toast])

  useEffect(() => { load() }, [load])

  const nationality = (countries || []).find(c => c.id === person.nationality_id)
  const onSaved = () => { setShowModal(false); load(); reload?.() }

  return (
    <RoleLayout title="ملف الوسيط" subtitle={person?.name_ar} color={BROWN} onBack={onBack}
      actions={row ? (
        <button onClick={() => setShowModal(true)}
          style={{ height: 34, padding: '0 14px', borderRadius: 8,
            border: `1px solid ${BROWN}55`, background: BROWN + '15',
            color: BROWN, fontFamily: F, fontSize: 11, fontWeight: 800, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Edit2 size={12} /> تعديل
        </button>
      ) : null}>

      <PersonIdentityChip person={person} nationality={nationality} color={BROWN} />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2.6fr) minmax(0,1fr)', gap: 14, marginBottom: 22 }}>
        <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, padding: '10px 12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <KpiBox label="نوع العمولة" value={row?.default_commission_type || '—'} color={BROWN} />
            <KpiBox label="النسبة" value={row?.default_commission_rate != null ? `${row.default_commission_rate}%` : '—'} color={BROWN} />
            <KpiBox label="الحالة" value={row?.is_active ? 'نشط' : (row ? 'معطّل' : '—')} color={row?.is_active ? C.ok : '#999'} />
          </div>
        </div>
        <HeroStat label="الوسيط" value={row ? '1' : '0'} unit="ملف" color={BROWN}
          footer={row ? 'مُرتبط' : 'غير مُرتبط'} />
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx5)' }}>جاري التحميل...</div>
      ) : !row ? (
        <div style={{ padding: 60, textAlign: 'center',
          background: 'rgba(255,255,255,.02)', border: '1px dashed rgba(255,255,255,.06)', borderRadius: 12 }}>
          <UserCheck size={40} color={BROWN} style={{ opacity: .6 }} />
          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: 'var(--tx2)' }}>لا يوجد ملف وسيط لهذا الشخص</div>
          <button onClick={() => setShowModal(true)}
            style={{ marginTop: 16, height: 36, padding: '0 16px', borderRadius: 9,
              border: `1px solid ${BROWN}55`, background: BROWN + '15', color: BROWN,
              fontFamily: F, fontSize: 12, fontWeight: 800, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> ربط ملف وسيط
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          <div className="prs-card">
            <div className="prs-card-title"><UserCheck size={15} color={BROWN} /> بيانات الوسيط</div>
            <KV icon={UserCheck} label="الاسم بالعربي" value={row.name_ar} color={BROWN} />
            <KV icon={UserCheck} label="الاسم بالإنجليزي" value={row.name_en} dir="ltr" color={BROWN} />
            <KV icon={CreditCard} label="نوع العمولة" value={row.default_commission_type} color={BROWN} />
            <KV icon={CreditCard} label="النسبة الافتراضية" value={row.default_commission_rate != null ? `${row.default_commission_rate}%` : '—'} color={BROWN} />
          </div>
          <div className="prs-card">
            <div className="prs-card-title"><Building2 size={15} color={BROWN} /> البنك</div>
            <KV icon={Building2} label="البنك" value={row.bank_name} color={BROWN} />
            <KV icon={CreditCard} label="رقم الحساب" value={row.account_number} dir="ltr" color={BROWN} />
            <KV icon={CreditCard} label="الآيبان" value={row.iban} dir="ltr" color={BROWN} />
          </div>
        </div>
      )}

      {showModal && (
        <BrokerModal open={showModal} onClose={() => setShowModal(false)}
          personId={person.id} person={person} row={row} toast={toast} onSaved={onSaved} />
      )}
    </RoleLayout>
  )
}

function BrokerModal({ open, onClose, personId, person, row, toast, onSaved }) {
  const isEdit = !!row
  const [f, setF] = useState({
    name_ar: row?.name_ar || person?.name_ar || '',
    name_en: row?.name_en || person?.name_en || '',
    default_commission_type: row?.default_commission_type || 'percentage',
    default_commission_rate: row?.default_commission_rate ?? null,
    bank_name: row?.bank_name || '',
    account_number: row?.account_number || '',
    iban: row?.iban || '',
    is_active: row?.is_active ?? true,
    notes: row?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const save = async () => {
    setSaving(true)
    try {
      const payload = { ...f, person_id: personId }
      if (isEdit) await rolesService.updateBroker(row.id, f)
      else await rolesService.createBroker(payload)
      toast?.(isEdit ? 'تم التحديث' : 'تم الربط'); onSaved?.()
    } catch (e) { toast?.(rolesService.humanizeDbError(e)) }
    finally { setSaving(false) }
  }

  return (
    <ModalShell open={open} onClose={onClose} title={isEdit ? 'تعديل ملف الوسيط' : 'ربط ملف وسيط'} Icon={UserCheck}
      footer={<><div style={{ flex: 1 }} /><SaveBtn onClick={save} disabled={saving} label={saving ? 'جاري الحفظ...' : (isEdit ? 'حفظ' : 'ربط')} /></>}>
      <KCard Icon={UserCheck} label="بيانات الوسيط">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div><Lbl req>الاسم بالعربي</Lbl>
            <input value={f.name_ar} onChange={e => set('name_ar', e.target.value)} style={sF} /></div>
          <div><Lbl>الاسم بالإنجليزي</Lbl>
            <input value={f.name_en} onChange={e => set('name_en', e.target.value.toUpperCase())} dir="ltr"
              style={{ ...sF, direction: 'ltr', textTransform: 'uppercase' }} /></div>
          <div><Lbl>نوع العمولة</Lbl>
            <select value={f.default_commission_type} onChange={e => set('default_commission_type', e.target.value)}
              style={{ ...sF, cursor: 'pointer' }}>
              <option value="percentage">نسبة مئوية</option>
              <option value="fixed">مبلغ ثابت</option>
            </select></div>
          <div><Lbl>النسبة / المبلغ</Lbl>
            <input type="number" step="0.01" value={f.default_commission_rate ?? ''}
              onChange={e => set('default_commission_rate', e.target.value ? Number(e.target.value) : null)}
              style={{ ...sF, direction: 'ltr' }} /></div>
          <div><Lbl>البنك</Lbl>
            <input value={f.bank_name} onChange={e => set('bank_name', e.target.value)} style={sF} /></div>
          <div><Lbl>رقم الحساب</Lbl>
            <input value={f.account_number} onChange={e => set('account_number', e.target.value)} dir="ltr"
              style={{ ...sF, direction: 'ltr' }} /></div>
          <div style={{ gridColumn: '1 / -1' }}><Lbl>الآيبان</Lbl>
            <input value={f.iban} onChange={e => set('iban', e.target.value.toUpperCase())} dir="ltr"
              style={{ ...sF, direction: 'ltr', textTransform: 'uppercase' }} /></div>
        </div>
        <div style={{ marginTop: 14 }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--tx2)', cursor: 'pointer' }}>
            <input type="checkbox" checked={f.is_active} onChange={e => set('is_active', e.target.checked)} /> نشط
          </label>
        </div>
      </KCard>
    </ModalShell>
  )
}
