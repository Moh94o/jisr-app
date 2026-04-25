import React, { useEffect, useState, useCallback } from 'react'
import { UserCheck, CreditCard, Star, Shield, Edit2, Plus } from 'lucide-react'
import RoleLayout from './RoleLayout.jsx'
import { KCard, KV, Lbl, sF, HeroStat, KpiBox, ModalShell, SaveBtn, PersonIdentityChip, C } from './RoleUI.jsx'
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
    <ModalShell open={open} onClose={onClose} title={isEdit ? 'تعديل ملف العميل' : 'ربط ملف عميل'} Icon={UserCheck}
      footer={<><div style={{ flex: 1 }} /><SaveBtn onClick={save} disabled={saving} label={saving ? 'جاري الحفظ...' : (isEdit ? 'حفظ' : 'ربط')} /></>}>
      <KCard Icon={UserCheck} label="بيانات العميل">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div><Lbl>رقم العميل</Lbl>
            <input value={f.client_number} onChange={e => set('client_number', e.target.value)} dir="ltr"
              style={{ ...sF, direction: 'ltr' }} /></div>
          <div><Lbl req>الاسم بالعربي</Lbl>
            <input value={f.name_ar} onChange={e => set('name_ar', e.target.value)} style={sF} /></div>
          <div><Lbl>الاسم بالإنجليزي</Lbl>
            <input value={f.name_en} onChange={e => set('name_en', e.target.value.toUpperCase())} dir="ltr"
              style={{ ...sF, direction: 'ltr', textTransform: 'uppercase' }} /></div>
          <div><Lbl>التقييم (1-5)</Lbl>
            <input type="number" min="1" max="5" value={f.rating ?? ''}
              onChange={e => set('rating', e.target.value ? Number(e.target.value) : null)}
              style={{ ...sF, direction: 'ltr' }} /></div>
        </div>
        <div style={{ display: 'flex', gap: 18, marginTop: 14, flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--tx2)', cursor: 'pointer' }}>
            <input type="checkbox" checked={f.is_vip} onChange={e => set('is_vip', e.target.checked)} /> عميل VIP
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--tx2)', cursor: 'pointer' }}>
            <input type="checkbox" checked={f.is_blacklisted} onChange={e => set('is_blacklisted', e.target.checked)} /> قائمة حظر
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--tx2)', cursor: 'pointer' }}>
            <input type="checkbox" checked={f.is_active} onChange={e => set('is_active', e.target.checked)} /> نشط
          </label>
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
