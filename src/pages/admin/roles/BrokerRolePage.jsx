import React, { useEffect, useState, useCallback } from 'react'
import { UserCheck, CreditCard, Edit2, Plus, Building2 } from 'lucide-react'
import RoleLayout from './RoleLayout.jsx'
import { KV, HeroStat, KpiBox, ModalShell, PersonIdentityChip, C } from './RoleUI.jsx'
import { ModalSection, GRID, ActionButton, TextField, CurrencyField, Segmented, Switch } from '../../../components/ui/FormKit.jsx'
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
            color: BROWN, fontFamily: F, fontSize: 11, fontWeight: 600, cursor: 'pointer',
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
          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: 'var(--tx2)' }}>لا يوجد ملف وسيط لهذا الشخص</div>
          <button onClick={() => setShowModal(true)}
            style={{ marginTop: 16, height: 36, padding: '0 16px', borderRadius: 9,
              border: `1px solid ${BROWN}55`, background: BROWN + '15', color: BROWN,
              fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer',
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
    default_commission_rate: row?.default_commission_rate ?? '',
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
      const data = { ...f, default_commission_rate: f.default_commission_rate === '' || f.default_commission_rate == null ? null : Number(f.default_commission_rate) }
      const payload = { ...data, person_id: personId }
      if (isEdit) await rolesService.updateBroker(row.id, data)
      else await rolesService.createBroker(payload)
      toast?.(isEdit ? 'تم التحديث' : 'تم الربط'); onSaved?.()
    } catch (e) { toast?.(rolesService.humanizeDbError(e)) }
    finally { setSaving(false) }
  }

  return (
    <ModalShell open={open} onClose={onClose} variant={isEdit ? 'edit' : 'create'}
      title={isEdit ? 'تعديل ملف الوسيط' : 'ربط ملف وسيط'} Icon={UserCheck}
      footer={<ActionButton onClick={save} disabled={saving || !f.name_ar}>{saving ? 'جاري الحفظ...' : (isEdit ? 'حفظ' : 'ربط')}</ActionButton>}>
      <ModalSection Icon={UserCheck} label="بيانات الوسيط">
        <div style={GRID}>
          <TextField label="الاسم بالعربي" req value={f.name_ar} onChange={v => set('name_ar', v)} />
          <TextField label="الاسم بالإنجليزي" dir="ltr" upper value={f.name_en} onChange={v => set('name_en', v)} />
          <Segmented label="نوع العمولة" value={f.default_commission_type} onChange={v => set('default_commission_type', v)}
            options={[{ v: 'percentage', l: 'نسبة مئوية' }, { v: 'fixed', l: 'مبلغ ثابت' }]} />
          <CurrencyField label="النسبة / المبلغ" unit={f.default_commission_type === 'percentage' ? '%' : 'ريال'}
            value={f.default_commission_rate} onChange={v => set('default_commission_rate', v)} />
          <TextField label="البنك" value={f.bank_name} onChange={v => set('bank_name', v)} />
          <TextField label="رقم الحساب" dir="ltr" value={f.account_number} onChange={v => set('account_number', v)} />
          <TextField label="الآيبان" dir="ltr" upper full value={f.iban} onChange={v => set('iban', v)} />
          <Switch label="نشط" checked={f.is_active} onChange={v => set('is_active', v)} />
        </div>
      </ModalSection>
    </ModalShell>
  )
}
