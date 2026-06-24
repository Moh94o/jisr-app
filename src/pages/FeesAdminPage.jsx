import React, { useState, useEffect } from 'react'
import { Edit3, Power, PowerOff, Plus, Wallet, ShieldAlert, ShieldCheck, X, Landmark, Briefcase, IdCard, Fingerprint, Scale, FolderOpen } from 'lucide-react'
import { getSupabase } from '../lib/supabase.js'
import { can, cardVisible } from '../lib/permissions.js'
import { Shimmer } from '../components/ui/Skeleton.jsx'

// الإدارة ← الرسوم — admin catalog for payment-request fees, grouped into one card per
// platform category (المركز السعودي / قوى / مقيم / أبشر أعمال / الغرفة التجارية / أخرى).
// Mirrors the Services tab's visual structure (glass card + gold-spine rows + giant-number
// tiles). Fixed fees carry a set amount the transaction pages use as-is (no input);
// variable fees carry a max cap with a configurable over-cap policy: 'reject' blocks the
// entry, 'review' lets it through flagged red in Payments (needs review).
const F = `'Cairo','Tajawal',sans-serif`
const C = { gold: '#D4A017', red: '#c0392b', ok: '#27a046', blue: '#3483b4', warn: '#eab308' }
const GLASS_CARD = { background: 'linear-gradient(160deg,#333 0%,#2A2A2A 50%,#232323 100%)', backdropFilter: 'blur(20px) saturate(160%)', WebkitBackdropFilter: 'blur(20px) saturate(160%)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, boxShadow: '0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)' }
const fmtNum = v => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })

// Platform categories — one card each, in this order.
const CATS = [
  { code: 'sbc',     ar: 'المركز السعودي',   en: 'Saudi Business Center', c: '#D4A017', Icon: Landmark },
  { code: 'qiwa',    ar: 'قوى',              en: 'Qiwa',                  c: '#bb8fce', Icon: Briefcase },
  { code: 'muqeem',  ar: 'مقيم',             en: 'Muqeem',                c: '#2ecc71', Icon: IdCard },
  { code: 'absher',  ar: 'أبشر أعمال',       en: 'Absher Business',       c: '#5dade2', Icon: Fingerprint },
  { code: 'chamber', ar: 'الغرفة التجارية',  en: 'Chamber of Commerce',   c: '#f39c12', Icon: Scale },
  { code: 'other',   ar: 'أخرى',             en: 'Other',                 c: '#95a5a6', Icon: FolderOpen },
]

const feeRowStyle = { position: 'relative', display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 16px 16px 14px', borderRadius: '7px 14px 14px 7px', background: 'linear-gradient(180deg,#242424 0%,#191919 100%)', border: '1px solid rgba(255,255,255,.05)', borderInlineEnd: '5px solid #D4A017', boxShadow: '0 6px 18px rgba(0,0,0,.3)', transition: '.18s' }
const tileStyle = { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '16px 6px 11px', borderRadius: 11, background: '#1e1e1e', border: '1px solid rgba(255,255,255,.06)', textAlign: 'center' }
const inpS = { width: '100%', minWidth: 0, borderRadius: 8, color: C.gold, fontFamily: F, fontSize: 20, fontWeight: 900, textAlign: 'center', outline: 'none', padding: '3px 2px', marginTop: 1, letterSpacing: '-.5px', fontVariantNumeric: 'tabular-nums', direction: 'ltr', lineHeight: 1, whiteSpace: 'nowrap', boxSizing: 'border-box' }
const textInp = { width: '100%', height: 38, padding: '0 12px', border: '1px solid rgba(255,255,255,.07)', borderRadius: 9, fontFamily: F, fontSize: 12.5, fontWeight: 600, color: 'var(--tx)', outline: 'none', background: 'linear-gradient(180deg,#323232 0%,#262626 100%)', boxSizing: 'border-box', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)' }

// Edit / Save / Cancel "tabs" sitting on the row's top border — same pattern as the Services tab.
const EditTab = ({ onClick }) => (
  <button type="button" onClick={onClick} title="تعديل" style={{ position: 'absolute', top: -11, insetInlineEnd: 14, height: 22, padding: '0 10px', borderRadius: 6, border: `1px dashed ${C.gold}`, background: '#1a1a1a', color: C.gold, fontFamily: F, fontSize: 10, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, transition: '.15s', zIndex: 2 }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 0 2px #1a1a1a' }} onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}>
    <Edit3 size={10} strokeWidth={2.4} />
    <span>تعديل</span>
  </button>
)
const EditActionTabs = ({ onSave, onCancel, saving }) => (
  <div style={{ position: 'absolute', top: -11, insetInlineEnd: 14, display: 'inline-flex', alignItems: 'center', gap: 6, zIndex: 2 }}>
    <button type="button" onClick={onCancel} style={{ height: 22, padding: '0 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,.2)', background: '#1a1a1a', color: 'rgba(255,255,255,.75)', fontFamily: F, fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span>إلغاء</span>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
    </button>
    <button type="button" onClick={onSave} disabled={saving} style={{ height: 22, padding: '0 12px', borderRadius: 6, border: `1px solid ${C.ok}`, background: '#1a1a1a', color: C.ok, fontFamily: F, fontSize: 10, fontWeight: 800, cursor: saving ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span>{saving ? 'جارٍ الحفظ…' : 'حفظ'}</span>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
    </button>
  </div>
)

const Toggle = ({ on, onChange }) => (
  <button type="button" onClick={() => onChange(!on)} title={on ? 'مفعّل' : 'موقوف'}
    style={{ width: 44, height: 22, borderRadius: 999, border: 'none', background: on ? C.ok : 'rgba(255,255,255,.18)', cursor: 'pointer', position: 'relative', transition: '.2s', padding: 0, flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.12)' }}>
    <span style={{ position: 'absolute', width: 16, height: 16, borderRadius: '50%', background: '#fff', top: 3, insetInlineStart: on ? 25 : 3, transition: '.2s', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: on ? C.ok : '#777' }}>
      {on ? <Power size={9} strokeWidth={3} /> : <PowerOff size={9} strokeWidth={3} />}
    </span>
  </button>
)

// Pill selector (نوع الرسم / سياسة التجاوز / التصنيف)
const Seg = ({ value, onChange, options, disabled }) => (
  <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 5, padding: 4, borderRadius: 10, background: 'rgba(0,0,0,.25)', border: '1px solid rgba(255,255,255,.06)', opacity: disabled ? .55 : 1 }}>
    {options.map(o => {
      const sel = value === o.v
      return (
        <button key={o.v} type="button" disabled={disabled} onClick={() => onChange(o.v)}
          style={{ height: 28, padding: '0 12px', borderRadius: 7, border: '1px solid ' + (sel ? (o.c || C.gold) + '66' : 'transparent'), background: sel ? (o.c || C.gold) + '1f' : 'transparent', color: sel ? (o.c || C.gold) : 'var(--tx3)', fontFamily: F, fontSize: 11, fontWeight: 800, cursor: disabled ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, transition: '.15s' }}>
          {o.icon}
          {o.l}
        </button>
      )
    })}
  </div>
)

export default function FeesAdminPage({ toast, lang, user }) {
  const isAr = lang !== 'en'
  const T = (a, e) => isAr ? a : e
  const sb = getSupabase()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null) // fee id being edited | 'new'
  const [draft, setDraft] = useState({})
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const { data, error } = await sb.from('fee_settings').select('*').order('sort_order').order('created_at')
    if (error) { toast?.(T('تعذر تحميل الرسوم', 'Failed to load fees'), 'error'); setLoading(false); return }
    setRows(data || []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const startEdit = (r) => { setEditingId(r.id); setDraft({ ...r, fixed_amount: r.fixed_amount ?? '', max_amount: r.max_amount ?? '' }) }
  const startNew = (cat) => { setEditingId('new'); setDraft({ label_ar: '', label_en: '', category: cat, amount_type: 'fixed', fixed_amount: '', max_amount: '', over_max_action: 'reject', is_active: true }) }
  const cancelEdit = () => { setEditingId(null); setDraft({}) }

  const numOrNull = v => (v === '' || v == null) ? null : Number(v)
  const saveDraft = async () => {
    if (saving) return
    if (!String(draft.label_ar || '').trim()) { toast?.(T('أدخل اسم الرسم', 'Enter the fee name'), 'error'); return }
    if (draft.amount_type === 'fixed' && !(Number(draft.fixed_amount) > 0)) { toast?.(T('أدخل المبلغ الثابت', 'Enter the fixed amount'), 'error'); return }
    setSaving(true)
    try {
      const payload = {
        label_ar: String(draft.label_ar).trim(),
        label_en: String(draft.label_en || '').trim() || null,
        category: draft.category || 'other',
        amount_type: draft.amount_type,
        fixed_amount: draft.amount_type === 'fixed' ? numOrNull(draft.fixed_amount) : null,
        max_amount: draft.amount_type === 'variable' ? numOrNull(draft.max_amount) : null,
        over_max_action: draft.over_max_action || 'reject',
        is_active: draft.is_active !== false,
        updated_at: new Date().toISOString(),
      }
      if (editingId === 'new') {
        const code = 'fee_' + Math.random().toString(36).slice(2, 8)
        const { error } = await sb.from('fee_settings').insert({ ...payload, code, sort_order: rows.length + 1 })
        if (error) throw error
      } else {
        const { error } = await sb.from('fee_settings').update(payload).eq('id', editingId)
        if (error) throw error
      }
      toast?.(T('تم حفظ الرسم', 'Fee saved'))
      cancelEdit(); await load()
    } catch (e) {
      toast?.(T('تعذر الحفظ', 'Save failed') + (e?.message ? `: ${e.message}` : ''), 'error')
    } finally { setSaving(false) }
  }
  const toggleActive = async (r) => {
    const next = !r.is_active
    setRows(p => p.map(x => x.id === r.id ? { ...x, is_active: next } : x))
    const { error } = await sb.from('fee_settings').update({ is_active: next, updated_at: new Date().toISOString() }).eq('id', r.id)
    if (error) { toast?.(T('تعذر الحفظ', 'Save failed'), 'error'); setRows(p => p.map(x => x.id === r.id ? { ...x, is_active: !next } : x)); return }
    toast?.(T(next ? 'تم تفعيل الرسم' : 'تم إيقاف الرسم', next ? 'Fee enabled' : 'Fee disabled'))
  }

  const renderEditor = (isNew) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx3)', marginBottom: 6, display: 'block' }}>{T('اسم الرسم (عربي)', 'Fee name (Arabic)')}</label>
          <input type="text" value={draft.label_ar || ''} onChange={e => setDraft(p => ({ ...p, label_ar: e.target.value }))} placeholder={T('مثال: رسوم إصدار رخصة عمل', 'e.g. Work permit fee')} style={textInp} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx3)', marginBottom: 6, display: 'block' }}>{T('الاسم (إنجليزي) — اختياري', 'Name (English) — optional')}</label>
          <input type="text" value={draft.label_en || ''} onChange={e => setDraft(p => ({ ...p, label_en: e.target.value }))} placeholder="—" style={{ ...textInp, direction: 'ltr' }} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)' }}>{T('التصنيف', 'Category')}</span>
        <Seg value={draft.category || 'other'} onChange={v => setDraft(p => ({ ...p, category: v }))}
          options={CATS.map(c => ({ v: c.code, l: T(c.ar, c.en), c: c.c }))} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)' }}>{T('نوع الرسم', 'Fee type')}</span>
        <Seg value={draft.amount_type} onChange={v => setDraft(p => ({ ...p, amount_type: v }))}
          options={[
            { v: 'fixed', l: T('ثابت — بدون إدخال', 'Fixed — no input'), icon: <ShieldCheck size={11} strokeWidth={2.6} /> },
            { v: 'variable', l: T('متغير — بإدخال يدوي', 'Variable — manual input'), c: C.blue, icon: <Edit3 size={11} strokeWidth={2.6} /> },
          ]} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: draft.amount_type === 'fixed' ? '1fr' : '1fr 1fr', gap: 10 }}>
        {draft.amount_type === 'fixed' ? (
          <div style={tileStyle}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: 'rgba(255,255,255,.82)' }}>{T('المبلغ الثابت', 'Fixed amount')}</span>
            <input type="text" inputMode="decimal" value={draft.fixed_amount ?? ''} placeholder="2,000"
              onChange={e => { let v = e.target.value.replace(/[^0-9.]/g, ''); const i = v.indexOf('.'); if (i !== -1) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, ''); setDraft(p => ({ ...p, fixed_amount: v })) }}
              style={{ ...inpS, border: `1px solid ${C.gold}66`, background: 'rgba(0,0,0,.3)' }} />
            <span style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--tx5)' }}>{T('ريال', 'SAR')}</span>
          </div>
        ) : (
          <>
            <div style={tileStyle}>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: 'rgba(255,255,255,.82)' }}>{T('الحد الأعلى للإدخال', 'Max input')}</span>
              <input type="text" inputMode="decimal" value={draft.max_amount ?? ''} placeholder={T('بدون حد', 'no cap')}
                onChange={e => { let v = e.target.value.replace(/[^0-9.]/g, ''); const i = v.indexOf('.'); if (i !== -1) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, ''); setDraft(p => ({ ...p, max_amount: v })) }}
                style={{ ...inpS, border: `1px solid ${C.gold}66`, background: 'rgba(0,0,0,.3)' }} />
              <span style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--tx5)' }}>{T('ريال — اتركه فارغاً بلا حد', 'SAR — empty = no cap')}</span>
            </div>
            <div style={{ ...tileStyle, justifyContent: 'center', gap: 8 }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: 'rgba(255,255,255,.82)' }}>{T('عند تجاوز الحد', 'When over the cap')}</span>
              <Seg value={draft.over_max_action || 'reject'} onChange={v => setDraft(p => ({ ...p, over_max_action: v }))} disabled={!(Number(draft.max_amount) > 0)}
                options={[
                  { v: 'reject', l: T('رفض الإدخال', 'Reject'), c: C.red, icon: <X size={11} strokeWidth={2.8} /> },
                  { v: 'review', l: T('قبول مع مراجعة (أحمر بسدادات الخدمات)', 'Accept flagged for review'), c: C.warn, icon: <ShieldAlert size={11} strokeWidth={2.6} /> },
                ]} />
            </div>
          </>
        )}
      </div>
      {isNew && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={cancelEdit} style={{ height: 34, padding: '0 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,.12)', background: 'transparent', color: 'var(--tx3)', fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{T('إلغاء', 'Cancel')}</button>
          <button type="button" onClick={saveDraft} disabled={saving} style={{ height: 34, padding: '0 18px', borderRadius: 9, border: `1px solid ${C.gold}88`, background: 'rgba(212,160,23,.1)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 800, cursor: saving ? 'wait' : 'pointer' }}>{saving ? T('جارٍ الحفظ…', 'Saving…') : T('إضافة الرسم', 'Add fee')}</button>
        </div>
      )}
    </div>
  )

  const renderFeeRow = (r, accent) => {
    const isEdit = editingId === r.id
    const variable = r.amount_type === 'variable'
    return (
      <div key={r.id} style={{ ...feeRowStyle, borderInlineEnd: `5px solid ${accent}`, opacity: r.is_active ? 1 : .55 }}>
        {!isEdit && can(user, 'admin_fees.edit') && <EditTab onClick={() => startEdit(r)} />}
        {isEdit && <EditActionTabs onSave={saveDraft} onCancel={cancelEdit} saving={saving} />}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)', letterSpacing: '-.2px' }}>{isAr ? r.label_ar : (r.label_en || r.label_ar)}</span>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--tx5)', fontFamily: 'monospace', direction: 'ltr', padding: '2px 8px', borderRadius: 5, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>{r.code}</span>
          <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 999, color: variable ? C.blue : C.gold, background: (variable ? 'rgba(52,131,180,.12)' : 'rgba(212,160,23,.1)'), border: '1px solid ' + (variable ? 'rgba(52,131,180,.35)' : 'rgba(212,160,23,.3)') }}>
            {variable ? T('متغير', 'Variable') : T('ثابت', 'Fixed')}
          </span>
          <span style={{ flex: 1 }} />
          {can(user, 'admin_fees.edit') && <Toggle on={r.is_active} onChange={() => toggleActive(r)} />}
        </div>
        {isEdit ? renderEditor(false) : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {!variable && (
              <div style={{ ...tileStyle, minWidth: 170, flex: '0 1 220px' }}>
                <span style={{ fontSize: 10.5, fontWeight: 800, color: 'rgba(255,255,255,.82)' }}>{T('المبلغ الثابت', 'Fixed amount')}</span>
                <span style={{ ...inpS, border: 'none', padding: 0 }}>{fmtNum(r.fixed_amount)}</span>
                <span style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--tx5)' }}>{T('ريال — يُرسل مباشرة بدون إدخال', 'SAR — sent directly, no input')}</span>
              </div>
            )}
            {variable && (
              <>
                <div style={{ ...tileStyle, minWidth: 170, flex: '0 1 220px' }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: 'rgba(255,255,255,.82)' }}>{T('الحد الأعلى للإدخال', 'Max input')}</span>
                  <span style={{ ...inpS, border: 'none', padding: 0 }}>{r.max_amount != null ? fmtNum(r.max_amount) : '∞'}</span>
                  <span style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--tx5)' }}>{r.max_amount != null ? T('ريال', 'SAR') : T('بلا حد', 'no cap')}</span>
                </div>
                {r.max_amount != null && (
                  <div style={{ ...tileStyle, minWidth: 200, flex: '0 1 260px', gap: 6 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: 'rgba(255,255,255,.82)' }}>{T('عند تجاوز الحد', 'Over the cap')}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: r.over_max_action === 'review' ? C.warn : C.red }}>
                      {r.over_max_action === 'review' ? <ShieldAlert size={13} strokeWidth={2.4} /> : <X size={13} strokeWidth={2.8} />}
                      {r.over_max_action === 'review' ? T('قبول مع مراجعة — أحمر بسدادات الخدمات', 'Accept flagged for review') : T('رفض الإدخال', 'Reject the entry')}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ fontFamily: F, paddingBottom: 60, color: 'var(--tx2)' }}>
      {/* Header — same tone as the Services tab */}
      <div style={{ marginBottom: 18, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Wallet size={26} strokeWidth={1.8} style={{ color: C.gold, flexShrink: 0 }} />
          <div style={{ fontSize: 22, fontWeight: 600, color: C.gold, letterSpacing: '-.2px', lineHeight: 1 }}>{T('الرسوم', 'Fees')}</div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 10, lineHeight: 1.6 }}>
          {T('إدارة الرسوم المستخدمة في طلبات السداد مقسمة حسب المنصة: الرسوم الثابتة تُرسل بمبلغها مباشرة بدون إدخال، والمتغيرة لها حد أعلى — عند تجاوزه يُرفض الإدخال أو يُقبل معلَّماً بالأحمر في سدادات الخدمات للمراجعة.', 'Manage payment-request fees grouped by platform: fixed fees send their amount directly with no input; variable fees carry a max cap — exceeding it either rejects the entry or accepts it flagged red in Service Payments for review.')}
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <style>{`@keyframes sk-shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}`}</style>
          {CATS.map((cat, ci) => (
            <div key={cat.code} style={{ ...GLASS_CARD, padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Category header — icon chip + title + count pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                <Shimmer w={34} h={34} r={9} />
                <Shimmer w={120} h={16} />
                <Shimmer w={64} h={20} r={999} />
              </div>
              {/* Gold-spine fee rows */}
              {Array.from({ length: ci % 2 === 0 ? 2 : 1 }).map((_, ri) => (
                <div key={ri} style={{ ...feeRowStyle, borderInlineEnd: '5px solid rgba(255,255,255,.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <Shimmer w={150} h={14} />
                    <Shimmer w={70} h={16} r={5} />
                    <Shimmer w={54} h={18} r={999} />
                    <span style={{ flex: 1 }} />
                    <Shimmer w={44} h={22} r={999} />
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ ...tileStyle, minWidth: 170, flex: '0 1 220px', gap: 8 }}>
                      <Shimmer w="55%" h={10} />
                      <Shimmer w="70%" h={22} />
                      <Shimmer w="80%" h={8} />
                    </div>
                  </div>
                </div>
              ))}
              {/* Add-fee dashed button placeholder */}
              <Shimmer w="100%" h={40} r={10} />
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {CATS.map(cat => {
            const catRows = rows.filter(r => (CATS.some(c => c.code === r.category) ? r.category : 'other') === cat.code)
            const adding = editingId === 'new' && (draft.category || 'other') === cat.code
            const Icon = cat.Icon
            return (
              <div key={cat.code} style={{ ...GLASS_CARD, padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Category header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                  <div style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 9, background: cat.c + '1f', border: '1px solid ' + cat.c + '55', color: cat.c, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={16} strokeWidth={2} />
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 800, color: cat.c, letterSpacing: '-.2px' }}>{T(cat.ar, cat.en)}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 10px', borderRadius: 999, color: catRows.length ? cat.c : 'var(--tx5)', background: catRows.length ? cat.c + '14' : 'rgba(255,255,255,.04)', border: '1px solid ' + (catRows.length ? cat.c + '40' : 'rgba(255,255,255,.08)'), fontVariantNumeric: 'tabular-nums' }}>
                    {catRows.length} {T('رسوم', 'fees')}
                  </span>
                </div>

                {catRows.length === 0 && !adding && (
                  <div style={{ padding: '6px 4px', fontSize: 11.5, color: 'var(--tx5)', fontWeight: 600 }}>{T('لا توجد رسوم في هذا التصنيف بعد.', 'No fees in this category yet.')}</div>
                )}
                {catRows.map(r => renderFeeRow(r, cat.c))}

                {/* Add fee inside this category */}
                {can(user, 'admin_fees.create') && (adding ? (
                  <div style={{ ...feeRowStyle, borderInlineEnd: `5px solid ${cat.c}` }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: cat.c, display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Plus size={14} strokeWidth={2.6} />
                      {T('رسم جديد — ', 'New fee — ')}{T(cat.ar, cat.en)}
                    </div>
                    {renderEditor(true)}
                  </div>
                ) : (
                  <button type="button" onClick={() => startNew(cat.code)}
                    style={{ height: 40, borderRadius: 10, background: 'transparent', border: '1px dashed ' + cat.c + '55', color: cat.c, cursor: 'pointer', fontFamily: F, fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: '.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = cat.c + '0d' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                    <Plus size={13} strokeWidth={2.6} />
                    <span>{T('إضافة رسم في ', 'Add a fee to ')}{T(cat.ar, cat.en)}</span>
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
