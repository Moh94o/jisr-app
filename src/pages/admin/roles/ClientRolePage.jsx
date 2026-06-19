import React, { useEffect, useState, useCallback } from 'react'
import { UserCheck, CreditCard, Star, Shield, Edit2, Plus } from 'lucide-react'
import RoleLayout from './RoleLayout.jsx'
import { KV, HeroStat, KpiBox, ModalShell, PersonIdentityChip, C } from './RoleUI.jsx'
import { ModalSection, GRID, ActionButton, TextField, NumberField, Switch, TextArea } from '../../../components/ui/FormKit.jsx'
import * as rolesService from '../../../services/rolesService.js'

const F = "'Cairo','Tajawal',sans-serif"
const BLUE = '#5ca0e6'

export default function ClientRolePage({ person, onBack, toast, countries, reload }) {
  const [row, setRow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setRow(await rolesService.getClient(person.id)) }
    catch (e) { toast?.(rolesService.humanizeDbError(e)) }
    finally { setLoading(false) }
  }, [person.id, toast])

  useEffect(() => { load() }, [load])

  const nationality = (countries || []).find(c => c.id === person.nationality_id)
  const onSaved = () => { setShowModal(false); load(); reload?.() }

  const nm = n => (n == null ? '—' : Number(n).toLocaleString('ar-SA'))

  return (
    <RoleLayout title="ملف العميل" subtitle={person?.name_ar} color={BLUE} onBack={onBack}
      actions={row ? (
        <button onClick={() => setShowModal(true)}
          style={{ height: 34, padding: '0 14px', borderRadius: 8,
            border: `1px solid ${BLUE}55`, background: BLUE + '15',
            color: BLUE, fontFamily: F, fontSize: 11, fontWeight: 800, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Edit2 size={12} /> تعديل
        </button>
      ) : null}>

      <PersonIdentityChip person={person} nationality={nationality} color={BLUE} />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2.6fr) minmax(0,1fr)', gap: 14, marginBottom: 22 }}>
        <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, padding: '10px 12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <KpiBox label="التقييم" value={row?.rating ?? '—'} color="#e3b341" />
            <KpiBox label="المعاملات" value={row?.total_transactions ?? 0} color={BLUE} />
            <KpiBox label="الفواتير" value={row?.total_invoices ?? 0} color={C.gold} />
          </div>
        </div>
        <HeroStat label="الإجمالي المتبقّي" value={nm(row?.remaining_amount || 0)} unit="ريال" color={BLUE}
          footer={row ? `${nm(row.paid_amount || 0)} مدفوع` : 'غير مُرتبط'} />
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx5)' }}>جاري التحميل...</div>
      ) : !row ? (
        <div style={{ padding: 60, textAlign: 'center',
          background: 'rgba(255,255,255,.02)', border: '1px dashed rgba(255,255,255,.06)', borderRadius: 12 }}>
          <UserCheck size={40} color={BLUE} style={{ opacity: .6 }} />
          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: 'var(--tx2)' }}>لا يوجد ملف عميل لهذا الشخص</div>
          <button onClick={() => setShowModal(true)}
            style={{ marginTop: 16, height: 36, padding: '0 16px', borderRadius: 9,
              border: `1px solid ${BLUE}55`, background: BLUE + '15', color: BLUE,
              fontFamily: F, fontSize: 12, fontWeight: 800, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> ربط ملف عميل
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          <div className="prs-card">
            <div className="prs-card-title"><UserCheck size={15} color={BLUE} /> بيانات تجارية</div>
            <KV icon={CreditCard} label="رقم العميل" value={row.client_number || '—'} dir="ltr" color={BLUE} />
            <KV icon={Star} label="التقييم" value={row.rating != null ? `${row.rating}/5` : '—'} color={BLUE} />
            <KV icon={Shield} label="VIP" value={row.is_vip ? 'نعم' : 'لا'} color={BLUE} />
            <KV icon={Shield} label="محظور" value={row.is_blacklisted ? 'نعم' : 'لا'} color={BLUE} />
          </div>
          <div className="prs-card">
            <div className="prs-card-title"><CreditCard size={15} color={BLUE} /> الأرصدة</div>
            <KV icon={CreditCard} label="إجمالي الفواتير" value={nm(row.total_invoices_amount)} color={BLUE} />
            <KV icon={CreditCard} label="المدفوع" value={nm(row.paid_amount)} color={C.ok} />
            <KV icon={CreditCard} label="المتبقّي" value={nm(row.remaining_amount)} color={C.red} />
            <KV icon={CreditCard} label="نسبة الالتزام" value={row.commitment_rate != null ? `${row.commitment_rate}%` : '—'} color={BLUE} />
          </div>
        </div>
      )}

      {showModal && (
        <ClientModal open={showModal} onClose={() => setShowModal(false)}
          personId={person.id} person={person} row={row} toast={toast} onSaved={onSaved} />
      )}
    </RoleLayout>
  )
}

function ClientModal({ open, onClose, personId, person, row, toast, onSaved }) {
  const isEdit = !!row
  const [f, setF] = useState({
    client_number: row?.client_number || '',
    name_ar: row?.name_ar || person?.name_ar || '',
    name_en: row?.name_en || person?.name_en || '',
    rating: row?.rating ?? null,
    is_vip: row?.is_vip || false,
    is_blacklisted: row?.is_blacklisted || false,
    is_active: row?.is_active ?? true,
    notes: row?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const save = async () => {
    setSaving(true)
    try {
      const payload = { ...f, person_id: personId }
      if (isEdit) await rolesService.updateClient(row.id, f)
      else await rolesService.createClient(payload)
      toast?.(isEdit ? 'تم التحديث' : 'تم الربط')
      onSaved?.()
    } catch (e) { toast?.(rolesService.humanizeDbError(e)) }
    finally { setSaving(false) }
  }

  return (
    <ModalShell open={open} onClose={onClose} variant={isEdit ? 'edit' : 'create'}
      title={isEdit ? 'تعديل ملف العميل' : 'ربط ملف عميل'} Icon={UserCheck}
      footer={<ActionButton onClick={save} disabled={saving || !f.name_ar}>{saving ? 'جاري الحفظ...' : (isEdit ? 'حفظ' : 'ربط')}</ActionButton>}>
      <ModalSection Icon={UserCheck} label="بيانات العميل">
        <div style={GRID}>
          <TextField label="رقم العميل" dir="ltr" value={f.client_number} onChange={v => set('client_number', v)} />
          <TextField label="الاسم بالعربي" req value={f.name_ar} onChange={v => set('name_ar', v)} />
          <TextField label="الاسم بالإنجليزي" dir="ltr" upper value={f.name_en} onChange={v => set('name_en', v)} />
          <NumberField label="التقييم (1-5)" min={1} max={5} value={f.rating ?? ''}
            onChange={v => set('rating', v === '' ? null : Number(v))} />
          <Switch label="عميل VIP" checked={f.is_vip} onChange={v => set('is_vip', v)} />
          <Switch label="قائمة حظر" color={C.red} checked={f.is_blacklisted} onChange={v => set('is_blacklisted', v)} />
          <Switch label="نشط" checked={f.is_active} onChange={v => set('is_active', v)} />
          <TextArea label="ملاحظات" value={f.notes} onChange={v => set('notes', v)} />
        </div>
      </ModalSection>
    </ModalShell>
  )
}
