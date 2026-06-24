import React, { useCallback, useEffect, useState } from 'react'
import { can as canPerm, canCardBtn } from '../../lib/permissions.js'
import { Modal as FKModal, ModalSection as FKSection, TextField, DateField, SuccessView } from '../../components/ui/FormKit.jsx'
import { FileText, Plus } from 'lucide-react'

// Branch license/certificate card (رخصة بلدي, شهادة السلامة). One record per branch +
// license_type, stored in branch_licenses. Shows number / issue / expiry / file + an
// expiry badge, with an add/edit popup built from the canonical FormKit components.
const F = "'Cairo','Tajawal',sans-serif"
const GOLD = '#D4A017'
const MONO = "'JetBrains Mono','Cairo',sans-serif"
const C = { ok: '#2ecc71', warn: '#eab308', red: '#e87265', blue: '#5dade2' }

const fmtD = (s) => { if (!s) return '—'; const d = new Date(s); if (isNaN(d)) return s; const p2 = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}` }
function expiryState(exp) {
  if (!exp) return null
  const today = new Date().toISOString().slice(0, 10)
  if (exp < today) return { l: 'منتهية', c: C.red }
  const soon = new Date(); soon.setDate(soon.getDate() + 30)
  if (exp <= soon.toISOString().slice(0, 10)) return { l: 'قريبة الانتهاء', c: C.warn }
  return { l: 'سارية', c: C.ok }
}

export default function BranchLicenseCard({ sb, branch, user, cardKey = 'municipal_license', toast, title, licenseType, accent = GOLD, addLabel = 'إضافة' }) {
  const [lic, setLic] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const canEdit = canPerm(user, 'admin_offices.edit') || canPerm(user, 'admin_offices.create')
  // Per-card action gates (catalog: license cards → edit/create).
  const canCardEdit = canCardBtn(user, 'admin_offices', cardKey, 'edit')
  const canCardCreate = canCardBtn(user, 'admin_offices', cardKey, 'create')

  const load = useCallback(async () => {
    if (!sb || !branch?.id) return
    setLoading(true)
    const { data } = await sb.from('branch_licenses').select('*')
      .eq('branch_id', branch.id).eq('license_type', licenseType).is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(1)
    setLic((data || [])[0] || null); setLoading(false)
  }, [sb, branch?.id, licenseType])
  useEffect(() => { load() }, [load])

  const st = expiryState(lic?.expiry_date)
  return (
    <div className="brd-section">
      <div className="brd-section-head">
        <span className="brd-section-head-l">
          <span className="brd-section-dot" style={{ background: accent }} />
          {title}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          {st && <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: `${st.c}1a`, color: st.c, border: `1px solid ${st.c}33` }}>{st.l}</span>}
          {canEdit && (lic ? canCardEdit : canCardCreate) && (
            <button onClick={() => setModal(true)}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.12)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              style={{ height: 32, padding: '0 14px', borderRadius: 9, background: 'transparent', border: '1px dashed rgba(212,160,23,.5)', color: GOLD, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              {lic ? 'تعديل' : addLabel}
              {lic
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>}
            </button>
          )}
        </span>
      </div>
      <div className="brd-section-body" style={{ padding: '14px 18px' }}>
        {loading ? (
          <div style={{ padding: 18, textAlign: 'center', color: 'var(--tx4)', fontSize: 12 }}>جارٍ التحميل…</div>
        ) : !lic ? (
          <div style={{ padding: 22, textAlign: 'center', color: 'var(--tx4)', fontSize: 12, border: '1px dashed rgba(255,255,255,.08)', borderRadius: 10 }}>لا توجد بيانات.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { l: 'رقم الرخصة', v: lic.license_number, mono: true },
                { l: 'تاريخ الإصدار', v: fmtD(lic.issue_date), mono: true },
                { l: 'تاريخ الانتهاء', v: fmtD(lic.expiry_date), mono: true, c: st?.c },
              ].map((x, i) => (
                <div key={i} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)' }}>
                  <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, marginBottom: 4 }}>{x.l}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: x.c || 'var(--tx2)', direction: x.mono ? 'ltr' : 'rtl', textAlign: x.mono ? 'left' : 'right', fontFamily: x.mono ? MONO : F }}>{x.v || '—'}</div>
                </div>
              ))}
            </div>
            {lic.document_url && (
              <a href={lic.document_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: C.blue, textDecoration: 'none' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                عرض الملف
              </a>
            )}
          </div>
        )}
      </div>

      {modal && (
        <LicenseModal sb={sb} branch={branch} licenseType={licenseType} title={title} accent={accent} existing={lic}
          onClose={() => setModal(false)} onSaved={() => { setModal(false); load(); toast?.(lic ? 'تم حفظ التعديل' : 'تمت الإضافة') }} />
      )}
    </div>
  )
}

// ── Add/edit popup (FormKit «معرض الفورمات» design) ──
function LicenseModal({ sb, branch, licenseType, title, accent, existing, onClose, onSaved }) {
  const [f, setF] = useState({
    license_number: existing?.license_number || '',
    issue_date: existing?.issue_date || '',
    expiry_date: existing?.expiry_date || '',
    _file: null,
  })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const [drag, setDrag] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const dirty = !existing ||
    (f.license_number || '') !== (existing.license_number || '') ||
    (f.issue_date || '') !== (existing.issue_date || '') ||
    (f.expiry_date || '') !== (existing.expiry_date || '') ||
    !!f._file
  const valid = !!(f.license_number || '').trim() && !!f.expiry_date && dirty

  const save = async () => {
    if (!valid) { setErr('أكمل رقم الرخصة وتاريخ الانتهاء'); return }
    setErr(''); setSaving(true)
    try {
      let document_url = existing?.document_url || null, document_path = existing?.document_path || null
      if (f._file) {
        const safe = (f._file.name || 'file').replace(/[^\w.\-]+/g, '_')
        const path = `branch_licenses/${branch.id}/${licenseType}/${Date.now()}_${safe}`
        const { error: ue } = await sb.storage.from('attachments').upload(path, f._file, { cacheControl: '3600', upsert: false })
        if (ue) throw ue
        document_url = sb.storage.from('attachments').getPublicUrl(path).data?.publicUrl || path
        document_path = path
      }
      const payload = {
        branch_id: branch.id, license_type: licenseType,
        license_number: f.license_number.trim() || null,
        issue_date: f.issue_date || null, expiry_date: f.expiry_date || null,
        document_url, document_path,
      }
      if (existing?.id) { const { error } = await sb.from('branch_licenses').update(payload).eq('id', existing.id); if (error) throw error }
      else { const { error } = await sb.from('branch_licenses').insert(payload); if (error) throw error }
      setDone(true)
    } catch (e) { setErr('تعذّر الحفظ: ' + (e.message || '').slice(0, 90)) } finally { setSaving(false) }
  }

  const ac = existing ? '#36a8e6' : GOLD
  const handleClose = () => done ? onSaved() : onClose()
  const page = (
    <FKSection Icon={FileText} label="بيانات الرخصة">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 16, rowGap: 14 }}>
        <TextField full label="رقم الرخصة" req dir="ltr" value={f.license_number} onChange={v => set('license_number', v)} />
        <DateField label="تاريخ الإصدار" value={f.issue_date} onChange={v => set('issue_date', v)} />
        <DateField label="تاريخ الانتهاء" req value={f.expiry_date} onChange={v => set('expiry_date', v)} min={f.issue_date} />
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,.55)', marginBottom: 8, textAlign: 'start' }}>ملف الرخصة</div>
          <label
            onDragOver={e => { e.preventDefault(); if (!drag) setDrag(true) }}
            onDragLeave={e => { e.preventDefault(); setDrag(false) }}
            onDrop={e => { e.preventDefault(); setDrag(false); const fl = e.dataTransfer?.files?.[0]; if (fl) set('_file', fl) }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, height: 46, padding: '0 14px', borderRadius: 9, cursor: 'pointer', fontFamily: F, fontSize: 12.5, fontWeight: 700, color: f._file ? C.ok : ac, border: `1px dashed ${drag ? ac : (f._file ? 'rgba(46,160,67,.4)' : ac + '66')}`, background: drag ? ac + '1f' : (f._file ? 'rgba(46,160,67,.06)' : ac + '0d'), transition: '.18s' }}>
            <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => set('_file', e.target.files?.[0] || null)} />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
            <span style={{ maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f._file ? f._file.name : (drag ? 'أفلت الملف هنا…' : (existing?.document_url ? 'استبدال الملف (اختياري)' : 'إرفاق ملف (صورة أو PDF)'))}</span>
            {f._file && <span onClick={e => { e.preventDefault(); set('_file', null) }} style={{ color: C.red, cursor: 'pointer', fontSize: 11.5, fontWeight: 700 }}>إزالة</span>}
          </label>
        </div>
      </div>
    </FKSection>
  )

  return (
    <FKModal
      open onClose={handleClose} width={560} height="auto"
      title={existing ? `تعديل ${title}` : (addLabelTitle(title))} Icon={FileText}
      variant={existing ? 'edit' : 'create'} accent={ac}
      success={done ? <SuccessView title={existing ? 'تم حفظ التعديل بنجاح' : 'تمت الإضافة بنجاح'} /> : undefined}
      onSubmit={save} submitting={saving}
      submitLabel={existing ? 'تعديل' : 'إضافة'} submitIcon={existing ? undefined : Plus}
      pages={[{ title: 'بيانات الرخصة', valid, error: err, content: page }]}
    />
  )
}
const addLabelTitle = (title) => `${title} جديدة`
