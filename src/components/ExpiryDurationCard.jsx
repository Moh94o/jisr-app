import React, { useState } from 'react'
import { CalendarClock, Edit3, Check, X } from 'lucide-react'
import { DateField } from './ui/FormKit.jsx'
import { EXPIRY_DURATIONS, EXPIRY_DAYS_DEFAULT, getExpiryDaysMap, computeRenewalExpiry, overdueQuarters } from '../lib/expiryDuration.js'

const F = `'Cairo','Tajawal',sans-serif`
const C = { gold: '#B07D00', red: '#c0392b', ok: '#27a046' }
const AR_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const DUR_LABEL = { 3: '٣ أشهر', 6: '٦ أشهر', 9: '٩ أشهر', 12: '١٢ شهر' }
const fmtDate = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
const todayYMD = () => { const d = new Date(); const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` }

// قسم «حاسبة تاريخ الانتهاء» — يظهر في تفاصيل حسبة نقل الكفالة وتجديد الإقامة.
// يعرض عدد أيام كل مدة + قاعدة تأخير المنتهية (قابلة للتعديل) + مُجرِّب حيّ.
export default function ExpiryDurationCard({ pricing, canEdit, onSave }) {
  const daysMap = getExpiryDaysMap(pricing)
  const overdueOn = pricing?.overdueEnabled !== false
  const quarterDays = Number(pricing?.overdueQuarterDays) > 0 ? Number(pricing.overdueQuarterDays) : 90

  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState(null)
  const [testDate, setTestDate] = useState('')
  const [asOf, setAsOf] = useState(todayYMD())

  const startEdit = () => { setDraft({ ...daysMap, overdueEnabled: overdueOn, overdueQuarterDays: quarterDays }); setEdit(true) }
  const cancel = () => { setEdit(false) }
  const save = () => {
    const patch = {}
    EXPIRY_DURATIONS.forEach(m => {
      const n = Number(draft[m])
      patch['expiryDays' + m] = Number.isFinite(n) && n > 0 ? n : EXPIRY_DAYS_DEFAULT[m]
    })
    patch.overdueEnabled = draft.overdueEnabled !== false
    const q = Number(draft.overdueQuarterDays)
    patch.overdueQuarterDays = Number.isFinite(q) && q > 0 ? q : 90
    onSave && onSave(patch)
    setEdit(false)
  }
  const setDraftVal = (m, raw) => {
    const v = String(raw).replace(/[^0-9]/g, '')
    setDraft(d => ({ ...d, [m]: v === '' ? '' : Number(v) }))
  }

  // الإعدادات الحيّة المستخدمة في المُجرِّب (المسودّة أثناء التعديل، وإلا المحفوظة)
  const liveCfg = edit
    ? { ...pricing, ...Object.fromEntries(EXPIRY_DURATIONS.map(x => ['expiryDays' + x, draft[x]])), overdueEnabled: draft.overdueEnabled !== false, overdueQuarterDays: draft.overdueQuarterDays }
    : pricing
  const M = testDate ? overdueQuarters(testDate, asOf, liveCfg) : 0

  const tab = { height: 30, padding: '0 12px', borderRadius: 9, fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: '.15s' }
  const divider = (t) => (<div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx3)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}><span style={{ width: 14, height: 2, background: `${C.gold}99`, borderRadius: 2 }} /> {t}</div>)

  return (
    <div className="svc-section">
      <div className="svc-section-head">
        <span className="svc-section-head-l">
          <CalendarClock size={16} color={C.gold} strokeWidth={1.9} /> حاسبة تاريخ الانتهاء
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {canEdit && !edit && (
            <button type="button" onClick={startEdit} style={{ ...tab, background: 'transparent', border: '1px dashed rgba(176,125,0,.5)', color: C.gold }}>
              تعديل <Edit3 size={13} />
            </button>
          )}
          {edit && <>
            <button type="button" onClick={save} style={{ ...tab, background: 'rgba(39,160,70,.12)', border: `1px solid ${C.ok}77`, color: C.ok }}>
              حفظ <Check size={14} strokeWidth={2.6} />
            </button>
            <button type="button" onClick={cancel} style={{ ...tab, background: 'transparent', border: '1px solid var(--bd)', color: 'var(--tx3)' }}>
              إلغاء <X size={13} strokeWidth={2.6} />
            </button>
          </>}
        </span>
      </div>

      <div className="svc-section-body" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '18px 22px' }}>
        {/* شرح القاعدة */}
        <div style={{ fontSize: 11.5, color: 'var(--tx3)', fontWeight: 600, lineHeight: 1.9, background: 'rgba(176,125,0,.05)', border: `1px solid ${C.gold}30`, borderRadius: 10, padding: '11px 14px' }}>
          القاعدة: <b style={{ color: C.gold }}>التاريخ الجديد = تاريخ الانتهاء + عدد أيام ثابت حسب المدة</b> (مطابقة قوى للإقامات السارية).
          وللإقامات المنتهية يُضاف <b style={{ color: C.gold }}>تعويض التأخير</b> = عدد الأرباع المنقضية × ٣ أشهر هجرية قبل المدة.
        </div>

        {/* عدد أيام كل مدة */}
        <div>
          {divider('عدد الأيام المضافة لكل مدة')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {EXPIRY_DURATIONS.map(m => (
              <div key={m} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '13px 8px 11px', borderRadius: 12, background: 'var(--card-bg)', border: '1px solid var(--bd)', textAlign: 'center', minWidth: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx3)' }}>{DUR_LABEL[m]}</span>
                {edit
                  ? <input type="text" inputMode="numeric" value={draft[m] ?? ''} onChange={e => setDraftVal(m, e.target.value)}
                      style={{ width: '100%', height: 38, borderRadius: 9, border: `1px solid ${C.gold}66`, background: 'var(--inputBg)', color: C.gold, fontFamily: F, fontSize: 18, fontWeight: 600, textAlign: 'center', direction: 'ltr', outline: 'none', boxSizing: 'border-box' }} />
                  : <span style={{ fontSize: 22, fontWeight: 600, color: C.gold, direction: 'ltr', letterSpacing: '-.5px', lineHeight: 1 }}>{daysMap[m]}</span>}
                <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--tx5)' }}>يوم</span>
              </div>
            ))}
          </div>
        </div>

        {/* قاعدة تأخير المنتهية */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '13px 15px', borderRadius: 11, background: (edit ? draft.overdueEnabled !== false : overdueOn) ? 'rgba(176,125,0,.05)' : 'rgba(255,255,255,.02)', border: `1px solid ${(edit ? draft.overdueEnabled !== false : overdueOn) ? C.gold + '33' : 'var(--bd)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)' }}>تعويض تأخير الإقامات المنتهية</span>
              <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600 }}>لكل فترة تعويض منقضية تُضاف ٣ أشهر هجرية على الأساس</span>
            </div>
            {edit
              ? <button type="button" onClick={() => setDraft(d => ({ ...d, overdueEnabled: d.overdueEnabled === false }))}
                  style={{ width: 46, height: 24, borderRadius: 999, border: 'none', background: draft.overdueEnabled !== false ? C.ok : 'rgba(192,57,43,.7)', cursor: 'pointer', position: 'relative', flexShrink: 0, padding: 0 }}>
                  <span style={{ position: 'absolute', width: 18, height: 18, borderRadius: '50%', background: '#fff', top: 3, right: draft.overdueEnabled !== false ? 3 : 25, transition: '.2s' }} />
                </button>
              : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: overdueOn ? 'rgba(39,160,70,.12)' : 'rgba(192,57,43,.1)', color: overdueOn ? C.ok : C.red }}>{overdueOn ? 'مفعّل' : 'معطّل'}</span>}
          </div>
          {(edit ? draft.overdueEnabled !== false : overdueOn) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600 }}>طول فترة التعويض</span>
              {edit
                ? <input type="text" inputMode="numeric" value={draft.overdueQuarterDays ?? ''} onChange={e => setDraft(d => ({ ...d, overdueQuarterDays: e.target.value.replace(/[^0-9]/g, '') === '' ? '' : Number(e.target.value.replace(/[^0-9]/g, '')) }))}
                    style={{ width: 80, height: 34, borderRadius: 9, border: `1px solid ${C.gold}66`, background: 'var(--inputBg)', color: C.gold, fontFamily: F, fontSize: 14, fontWeight: 600, textAlign: 'center', direction: 'ltr', outline: 'none' }} />
                : <span style={{ fontSize: 14, fontWeight: 600, color: C.gold, direction: 'ltr' }}>{quarterDays}</span>}
              <span style={{ fontSize: 10.5, color: 'var(--tx5)', fontWeight: 600 }}>يوم (÷ أيام التأخير = عدد الأرباع)</span>
            </div>
          )}
        </div>

        {/* المُجرِّب الحيّ */}
        <div style={{ borderTop: '1px solid var(--bd)', paddingTop: 14 }}>
          {divider('جرِّب: أدخل التواريخ لتظهر النتائج المتوقعة')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 520 }}>
            <DateField label="تاريخ انتهاء الإقامة / كرت العمل" value={testDate} onChange={setTestDate} full />
            <DateField label="تاريخ التجديد (اليوم)" value={asOf} onChange={setAsOf} full />
          </div>
          {testDate && M > 0 && (
            <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 13px', borderRadius: 10, background: 'rgba(192,57,43,.08)', border: `1px solid ${C.red}44`, fontSize: 11.5, fontWeight: 600, color: C.red }}>
              <CalendarClock size={13} /> إقامة منتهية — تعويض {M} فترة (+{M * 3} أشهر هجرية على الأساس)
            </div>
          )}
          {testDate && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 14 }}>
              {EXPIRY_DURATIONS.map(m => {
                const d = computeRenewalExpiry(testDate, m, liveCfg, { asOf })
                return (
                  <div key={m} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '13px 8px', borderRadius: 12, background: 'rgba(176,125,0,.06)', border: `1px solid ${C.gold}40`, textAlign: 'center', minWidth: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx3)' }}>{DUR_LABEL[m]}</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: C.gold, direction: 'ltr', letterSpacing: '-.3px', whiteSpace: 'nowrap' }}>{d ? fmtDate(d) : '—'}</span>
                    {d && <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--tx5)' }}>{AR_DAYS[d.getDay()]}</span>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
