import React, { useEffect, useState, useCallback, useMemo } from 'react'
import BackButton from './components/BackButton'
import { can as canPerm } from './lib/permissions.js'
import { UserPlus, Building2, Search, X, Hash, FileText, ShieldCheck, Users, MapPin, Check, Plus, Pencil, Trash2 } from 'lucide-react'
import { Modal as FKModal, ModalSection, ActionButton, SuccessView, GRID, TextField, IdField, DateField, Select, FileField, EmptyState } from './components/ui/FormKit.jsx'

const F = "'Cairo','Tajawal',sans-serif"
const C = {
  gold: '#D4A017',
  blue: '#5dade2', purple: '#bb8fce', cyan: '#16a085', orange: '#f39c12', gray: '#95a5a6',
  ok: '#2ecc71', warn: '#eab308', red: '#e87265',
}
const PAGE = 24

const num = (v) => Number(v || 0).toLocaleString('en-US')
// صيغة العدد العربية: 3–10 تأخذ الجمع، وغيرها المفرد (نفس منطق صفحة المنشآت).
const arCount = (n, one, few) => (Number(n) >= 3 && Number(n) <= 10) ? few : one
const fmtDate = (s) => { if (!s) return '—'; try { return new Date(s).toISOString().slice(0,10) } catch { return '—' } }
// تاريخ + وقت لسجل التعديلات (نفس صيغة صفحة المنشآت/الفواتير).
const fmtDateTime = (iso) => {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const p = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} · ${p(d.getHours())}:${p(d.getMinutes())}`
  } catch { return '—' }
}
// تسميات حقول العامل لعرضها في سجل التعديلات.
const WORKER_LBL = {
  name: ['اسم العامل', 'Worker name'],
  nationality_id: ['الجنسية', 'Nationality'],
  occupation_id: ['المهنة', 'Occupation'],
  birth_date: ['تاريخ الميلاد', 'Date of birth'],
  iqama_number: ['رقم الإقامة', 'Iqama no.'],
  iqama_expiry_date: ['تاريخ انتهاء الإقامة', 'Iqama expiry'],
  work_permit_expiry: ['تاريخ انتهاء كرت العمل', 'Work permit expiry'],
  border_number: ['رقم الحدود', 'Border no.'],
  passport_number: ['رقم الجواز', 'Passport no.'],
  passport_expiry: ['تاريخ انتهاء الجواز', 'Passport expiry'],
  muqeem_file: ['ملف مقيم', 'Muqeem file'],
}
const fmtAgo = (iso, isAr) => {
  if (!iso) return '—'
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60) return isAr ? 'الآن' : 'now'
  if (d < 3600) return isAr ? `قبل ${Math.floor(d/60)}د` : `${Math.floor(d/60)}m`
  if (d < 86400) return isAr ? `قبل ${Math.floor(d/3600)}س` : `${Math.floor(d/3600)}h`
  return isAr ? `قبل ${Math.floor(d/86400)}ي` : `${Math.floor(d/86400)}d`
}
const daysUntil = (iso) => {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

// العمر بالسنوات الكاملة من تاريخ الميلاد — يُحسب آلياً (لا يُخزَّن).
const calcAge = (iso) => {
  if (!iso) return null
  const b = new Date(iso); if (isNaN(b.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age >= 0 && age < 150 ? age : null
}

const cardChrome = {
  borderRadius: 14,
  background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
  border: '1px solid rgba(255,255,255,.05)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
  overflow: 'hidden',
}
const cardHeader = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '12px 22px',
  borderBottom: '1px solid rgba(255,255,255,.06)',
}
const cardTitle = { fontSize: 12, color: 'var(--tx2)', fontWeight: 700, letterSpacing: '.2px' }

const STATUS_THEME = {
  active:    { c: C.ok,     label_ar: 'نشط',     label_en: 'Active' },
  suspended: { c: C.orange, label_ar: 'معلّق',   label_en: 'Suspended' },
}
const themeForStatus = (s) => STATUS_THEME[s] || { c: C.gray, label_ar: s || '—', label_en: s || '—' }

const NAT_CODES = {
  'أردني':'JO','أفغاني':'AF','افغانستان':'AF','أوغندي':'UG','إثيوبي':'ET','إندونيسي':'ID','باكستاني':'PK','باكستان':'PK','بنغلاديشي':'BD','بنغلادش':'BD',
  'تركي':'TR','تونسي':'TN','سريلانكي':'LK','سعودي':'SA','السعودية':'SA','سوداني':'SD','السودان':'SD','سوري':'SY',
  'فلبيني':'PH','كيني':'KE','مصري':'EG','مصر':'EG','مغربي':'MA','ميانمار':'MM','نيبالي':'NP','نيبال':'NP','هندي':'IN','الهند':'IN','يمني':'YE','اليمن':'YE','بريطانيا':'GB',
}
const NatFlag = ({ nationality, size = 18 }) => {
  const cc = NAT_CODES[(nationality || '').trim()]
  if (!cc) return null
  return <img src={`https://flagcdn.com/w40/${cc.toLowerCase()}.png`} alt={nationality} title={nationality}
    style={{ width: size, height: Math.round(size * .72), objectFit: 'cover', borderRadius: 3, flexShrink: 0 }}
    onError={e => { e.target.style.display = 'none' }} />
}

// زر النسخ — نفس تصميم الفواتير/المنشآت (NumberRow): بلا توستر، يتحوّل إلى
// علامة صح خضراء لمدة 1.5ث، وتمرير الفأرة يحوّل اللون إلى الذهبي.
const CopyBtn = ({ value, T }) => {
  const [copied, setCopied] = useState(false)
  const onCopy = async (e) => {
    e.stopPropagation()
    if (value == null || value === '') return
    try {
      await navigator.clipboard?.writeText(String(value))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard غير متاح — تجاهل بصمت */ }
  }
  return (
    <button type="button" onClick={onCopy} title={T ? T('نسخ', 'Copy') : 'Copy'}
      style={{ width: 16, height: 16, padding: 0, border: 'none', background: 'transparent', color: copied ? C.ok : 'rgba(255,255,255,.3)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, transition: 'color .15s', flexShrink: 0 }}
      onMouseEnter={e => { if (!copied) e.currentTarget.style.color = C.gold }}
      onMouseLeave={e => { if (!copied) e.currentTarget.style.color = 'rgba(255,255,255,.3)' }}>
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      )}
    </button>
  )
}

const Badge = ({ theme, T }) => theme ? (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 6, background: theme.c + '18', border: '1px solid ' + theme.c + '38', color: theme.c, fontSize: 10.5, fontWeight: 700 }}>
    <span style={{ width: 5, height: 5, borderRadius: '50%', background: theme.c, boxShadow: '0 0 5px ' + theme.c }} />
    {T(theme.label_ar, theme.label_en)}
  </span>
) : null

// Iqama remaining-days cell. Renders the expiry date (14px) on top and a plain
// coloured text line below — `N يوم متبقي` if still valid, `N يوم مضى` if expired.
// No chip/background — same plain-text style as the facilities date cell.
//
// Color thresholds:
//   green  → more than 30 days remaining
//   gold   → 1–30 days remaining (renewal window)
//   red    → expired (today or past) — counter shows days since expiry
const IqamaCell = ({ iso, T }) => {
  const d = daysUntil(iso)
  if (d == null) return <span style={{ color: 'var(--tx5)', fontSize: 14 }}>—</span>
  let c = C.ok
  if (d <= 0) c = C.red
  else if (d <= 30) c = C.gold
  const isExpired = d <= 0
  const value = Math.abs(d)
  const wordAr = isExpired ? 'يوم مضى' : 'يوم متبقي'
  const wordEn = isExpired ? 'd ago' : 'd left'
  const tooltip = T(`${value} ${wordAr}`, `${value} ${wordEn}`)
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{ fontSize: 14, color: c, fontWeight: 700, direction: 'ltr', fontFamily: 'ui-monospace, monospace', fontVariantNumeric: 'tabular-nums' }}>{fmtDate(iso)}</span>
      <span title={tooltip} style={{
        display: 'inline-flex', alignItems: 'baseline', gap: 4,
        color: c, fontWeight: 600, fontSize: 10,
        direction: 'ltr', fontVariantNumeric: 'tabular-nums',
      }}>
        <span style={{ fontSize: 9.5, opacity: .85 }}>{T(wordAr, wordEn)}</span>
        <span style={{ fontFamily: 'ui-monospace, monospace' }}>{value}</span>
      </span>
    </div>
  )
}

// Filter button style — matches SbcFacilities btnFilter
const btnFilter = (active) => ({
  height: 44, padding: '0 16px', borderRadius: 12,
  background: active ? 'rgba(212,160,23,.12)' : 'rgba(0,0,0,.18)',
  border: '1px solid ' + (active ? 'rgba(212,160,23,.3)' : 'rgba(255,255,255,.05)'),
  color: active ? C.gold : 'var(--tx2)',
  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F,
  display: 'flex', alignItems: 'center', gap: 8, boxSizing: 'border-box',
})

/* ═══ منتقي منشأة العامل — بحث + كروت زجاجية بنفس تصميم اختيار العميل في الفاتورة ═══ */
// خلية معلومة داخل الكرت (الرقم الموحّد / التأمينات / الموارد …) — أيقونة + تسمية + قيمة LTR.
const FacInfoBox = ({ Icon, label, value }) => value ? (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 9, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', minWidth: 0 }}>
    <Icon size={13} color={C.gold} strokeWidth={1.8} style={{ flexShrink: 0 }} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <span style={{ fontSize: 9, color: 'var(--tx5)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--tx1)', fontWeight: 600, direction: 'ltr', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'ui-monospace, monospace', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  </div>
) : null
// أفاتار المنشأة — أيقونة مبنى داخل مربّع، يتلوّن ذهبياً عند الاختيار.
const FacAvatar = ({ size, sel }) => (
  <div style={{ width: size, height: size, borderRadius: 12, background: 'rgba(0,0,0,.25)', border: sel ? '1.5px solid rgba(212,160,23,.4)' : '1px solid rgba(255,255,255,.08)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: sel ? '0 2px 8px rgba(212,160,23,.15)' : 'none' }}>
    <Building2 size={Math.round(size * 0.5)} strokeWidth={1.7} color={sel ? C.gold : 'rgba(255,255,255,.5)'} />
  </div>
)
// تسمية الفرع: «كود الفرع — المدينة» إن وُجدت.
const facBranchLabel = (f, T) => f?.branch ? [f.branch.branch_code, f.branch.city ? T(f.branch.city.name_ar, f.branch.city.name_en || f.branch.city.name_ar) : null].filter(Boolean).join(' — ') : null

// المنتقي: حقل بحث ثم كروت نتائج؛ وعند الاختيار يُستبدل بكرت المنشأة كاملاً + زر إلغاء.
function FacilityPicker({ facilities, value, onChange, T }) {
  const [q, setQ] = useState('')
  const selected = facilities.find(f => f.id === value) || null
  const ql = q.trim().toLowerCase()
  const results = ql
    ? facilities.filter(f =>
        (f.name_ar || '').toLowerCase().includes(ql) ||
        (f.name_en || '').toLowerCase().includes(ql) ||
        [f.unified_number, f.gosi_number, f.hrsd_number, f.cr_number].filter(Boolean).some(n => String(n).includes(ql)))
    : facilities
  const shown = results.slice(0, ql ? 6 : 3)

  // ── كرت المنشأة المختارة — كامل البيانات (موحّد / سجل تجاري / تأمينات / موارد / فرع) ──
  if (selected) {
    const both = selected.name_ar && selected.name_en
    return (
      <div style={{ position: 'relative', border: '1px solid rgba(212,160,23,.4)', background: 'linear-gradient(135deg,rgba(212,160,23,.12),rgba(255,255,255,.02))', boxShadow: '0 4px 16px rgba(0,0,0,.28)', padding: 16, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <button onClick={() => { onChange(null); setQ('') }} title={T('تغيير المنشأة', 'Change facility')}
          style={{ position: 'absolute', top: 8, left: 8, width: 28, height: 28, borderRadius: 8, background: 'rgba(232,114,101,.12)', border: '1px solid rgba(232,114,101,.35)', color: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2, transition: '.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(232,114,101,.22)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(232,114,101,.12)' }}>
          <X size={14} strokeWidth={2.4} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <FacAvatar size={52} sel />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: C.gold, letterSpacing: '-.2px' }}>{selected.name_ar || selected.name_en || '—'}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 600, color: C.gold, background: 'rgba(212,160,23,.12)', border: '1px solid rgba(212,160,23,.3)', borderRadius: 20, padding: '2px 8px' }}>
                <Check size={10} strokeWidth={3.5} />{T('محددة', 'Selected')}
              </span>
            </div>
            {both && <span style={{ fontSize: 11.5, color: 'var(--tx5)', fontWeight: 600, direction: 'ltr', opacity: .75 }}>{selected.name_en}</span>}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <FacInfoBox Icon={Hash} label={T('الرقم الموحّد', 'Unified No.')} value={selected.unified_number} />
          <FacInfoBox Icon={FileText} label={T('السجل التجاري', 'CR No.')} value={selected.cr_number} />
          <FacInfoBox Icon={ShieldCheck} label={T('رقم التأمينات', 'GOSI No.')} value={selected.gosi_number} />
          <FacInfoBox Icon={Users} label={T('الموارد البشرية', 'HRSD No.')} value={selected.hrsd_number} />
          <FacInfoBox Icon={MapPin} label={T('الفرع', 'Branch')} value={facBranchLabel(selected, T)} />
        </div>
      </div>
    )
  }

  // ── وضع البحث: حقل + كروت نتائج مختصرة قابلة للضغط للاختيار ──
  const G = { base: 'linear-gradient(135deg,rgba(255,255,255,.05),rgba(255,255,255,.012))', baseB: 'rgba(255,255,255,.08)', hover: 'linear-gradient(135deg,rgba(212,160,23,.08),rgba(255,255,255,.02))', hoverB: 'rgba(212,160,23,.25)' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <style>{`.fac-results::-webkit-scrollbar{width:0;height:0;display:none}`}</style>
      <div style={{ position: 'relative' }}>
        <Search size={18} color="rgba(255,255,255,.35)" strokeWidth={2} style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input value={q} onChange={e => setQ(e.target.value)} autoFocus
          placeholder={T('ابحث بالاسم أو الرقم الموحّد أو التأمينات أو الموارد البشرية…', 'Search by name, unified, GOSI or HRSD number…')}
          style={{ width: '100%', height: 46, padding: '0 14px 0 44px', borderRadius: 11, background: 'rgba(0,0,0,.2)', border: '1px solid rgba(255,255,255,.06)', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: F, outline: 'none', textAlign: 'right', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', boxSizing: 'border-box' }} />
      </div>
      {shown.length > 0 ? (
        <div className="fac-results" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {shown.map(f => {
            const both = f.name_ar && f.name_en
            return (
              <div key={f.id} onClick={() => { onChange(f.id); setQ('') }}
                onMouseEnter={e => { e.currentTarget.style.background = G.hover; e.currentTarget.style.borderColor = G.hoverB }}
                onMouseLeave={e => { e.currentTarget.style.background = G.base; e.currentTarget.style.borderColor = G.baseB }}
                style={{ cursor: 'pointer', border: `1px solid ${G.baseB}`, background: G.base, boxShadow: '0 4px 16px rgba(0,0,0,.28)', transition: 'all .22s ease', padding: 13, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 11 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <FacAvatar size={42} />
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: 'rgba(255,255,255,.95)', letterSpacing: '-.2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name_ar || f.name_en || '—'}</span>
                    {both && <span style={{ fontSize: 11, color: 'var(--tx5)', fontWeight: 600, direction: 'ltr', opacity: .7 }}>{f.name_en}</span>}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <FacInfoBox Icon={Hash} label={T('الرقم الموحّد', 'Unified No.')} value={f.unified_number} />
                  <FacInfoBox Icon={ShieldCheck} label={T('رقم التأمينات', 'GOSI No.')} value={f.gosi_number} />
                </div>
              </div>
            )
          })}
          {results.length > shown.length && (
            <div style={{ fontSize: 10.5, color: 'var(--tx5)', fontWeight: 600, textAlign: 'center', padding: '4px 0' }}>
              {T(`+${results.length - shown.length} منشأة أخرى — حدّد بحثك أكثر`, `+${results.length - shown.length} more — refine your search`)}
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '24px 20px', borderRadius: 12, border: '1px dashed rgba(255,255,255,.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(212,160,23,.08)', border: '1px dashed rgba(212,160,23,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={18} strokeWidth={1.7} color="rgba(212,160,23,.65)" />
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--tx2)', fontWeight: 600 }}>{T('لا توجد منشأة بهذا البحث', 'No facility matches this search')}</div>
        </div>
      )}
    </div>
  )
}

// هيكل تحميل — يظهر عند أول جلب للبيانات (مثل صفحة المنشآت تماماً) فلا تظهر
// بطاقات بأصفار. لمعان متحرّك لبطاقات المؤشرات ولصفوف الجدول حتى تجهز البيانات.
function WorkforceSkeleton() {
  const shimmer = {
    display: 'inline-block', borderRadius: 6,
    background: 'linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.11) 37%, rgba(255,255,255,.04) 63%)',
    backgroundSize: '400% 100%', animation: 'wf-shimmer 1.4s ease infinite',
  }
  const bar = (w, h = 11) => <span style={{ ...shimmer, width: w, height: h }} />
  const cols = ['22%', '16%', '13%', '18%', '18%', '13%']
  return (
    <div>
      <style>{`@keyframes wf-shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}@keyframes wf-spin{to{transform:rotate(360deg)}}`}</style>
      {/* بطاقات المؤشرات — ٣ بطاقات بنفس تخطيط الصفحة الحقيقي */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.7fr 1.6fr', gap: 14, marginBottom: 24 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ padding: '18px 22px', borderRadius: 16, background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.05)', minHeight: 150, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}>
            {bar('45%', 16)}{bar('55%', 34)}{bar('70%', 11)}
          </div>
        ))}
      </div>
      {/* هيكل الجدول — ٨ صفوف */}
      <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,.06)', background: '#161616' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: cols.join(' '), alignItems: 'center', gap: 8, padding: '13px 12px', borderBottom: i < 7 ? '1px solid rgba(255,255,255,.03)' : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>{bar('72%')}{bar('45%', 8)}</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>{bar('70%')}</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>{bar('55%')}</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>{bar('65%')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>{bar('60%')}{bar('40%', 8)}</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>{bar('45%')}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════ */
export default function TempWorkforcePage({ sb, toast, lang, user, onTabChange }) {
  const isAr = lang !== 'en'
  const T = (a, e) => isAr ? a : e

  const [workers, setWorkers] = useState([])
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(true)  // يبدأ محمّلاً ليظهر هيكل التحميل فوراً عند فتح الصفحة
  const [search, setSearch] = useState('')
  const [advOpen, setAdvOpen] = useState(false)
  const [adv, setAdv] = useState({ status: '', iqama: '', nationality: '', facility: '', occupation: '' })
  const [page, setPage] = useState(0)
  const [detail, setDetail] = useState(null)
  // View lens — like SbcFacilities tableView (SBC | GOSI). For workers it's
  // "all" vs "active" vs "suspended".
  const [viewLens, setViewLens] = useState('all')
  // Manual "إضافة عامل مؤقت" modal — inserts straight into the `temproryworkers` table.
  const [showAdd, setShowAdd] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addErr, setAddErr] = useState(null)   // شريط الخطأ الأحمر في نافذة الإضافة (بدل التوستر)
  const [addDone, setAddDone] = useState(null)     // نجاح الإضافة يُعرض داخل النافذة (SuccessView) لا توستر
  const [addPage, setAddPage] = useState(0)        // ويزارد متحكَّم — للتحقق من تكرار الإقامة عند «التالي»
  const [checkingDup, setCheckingDup] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', iqama_number: '', iqama_expiry_date: '', birth_date: '', nationality_id: null, nationality_ar: '', occupation_id: null, occupation_ar: '', facility_id: null })
  const setAdd = (k, v) => { setAddErr(null); setAddForm(p => ({ ...p, [k]: v })) }
  const [nationalities, setNationalities] = useState([])
  const [occupations, setOccupations] = useState([])
  // تعديل العامل — نفس نمط صفحة المنشآت: editRow + editForm + editSection ('data' | 'docs').
  const [editRow, setEditRow] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [editSection, setEditSection] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editErr, setEditErr] = useState(null)   // شريط الخطأ الأحمر في نافذة التعديل (بدل التوستر)
  const [muqeemFile, setMuqeemFile] = useState(null)   // ملف مقيم المُرفق في نافذة التعديل
  const [attKey, setAttKey] = useState(0)              // يُحدّث عند رفع مرفق لإعادة جلبه في صفحة التفاصيل
  useEffect(() => {
    if (!sb) return
    sb.from('nationalities').select('id,name_ar,name_en,code').eq('is_active', true).order('sort_order', { nullsFirst: false }).order('name_ar').then(({ data }) => { if (data) setNationalities(data) })
    sb.from('occupations').select('id,name_ar,name_en,code').eq('is_active', true).order('sort_order', { nullsFirst: false }).order('name_ar').limit(5000).then(({ data }) => { if (data) setOccupations(data) })
  }, [sb])
  const saveManualWorker = useCallback(async () => {
    if (!sb || adding) return
    const name = (addForm.name || '').trim()
    setAddErr(null)
    if (!name) { setAddErr(T('أدخل اسم العامل', 'Enter worker name')); return }
    setAdding(true)
    try {
      const isArabicName = /[؀-ۿ]/.test(name)
      const payload = {
        name_ar: isArabicName ? name : null,
        name_en: !isArabicName ? name : null,
        iqama_number: (addForm.iqama_number || '').trim() || null,
        iqama_expiry_date: addForm.iqama_expiry_date || null,
        birth_date: addForm.birth_date || null,
        nationality_id: addForm.nationality_id || null,
        nationality_ar: addForm.nationality_ar || null,
        current_occupation_id: addForm.occupation_id || null,
        occupation_ar: addForm.occupation_ar || null,
        current_facility_id: addForm.facility_id || null,
        created_by: user?.id || null,
      }
      const { error } = await sb.from('temproryworkers').insert(payload)
      if (error) throw new Error(error.message)
      // النجاح يُعرض داخل النافذة (SuccessView)، لا توستر؛ وإغلاق النافذة يُفرغ النموذج ويعيدنا للقائمة.
      setAddDone({ title: T('تمت إضافة العامل بنجاح', 'Worker added successfully') })
      load()
    } catch (e) {
      const m = String(e.message || e)
      // حارس قاعدة البيانات (سباق إدخالين بنفس اللحظة) — رسالة ودّية بدل خطأ Postgres الخام.
      if (/temproryworkers_iqama_number_unique|workers_iqama_number_unique|duplicate key/i.test(m)) {
        setAddErr(T('رقم الإقامة مسجّل مسبقاً لعامل آخر', 'This Iqama number is already registered to another worker'))
      } else {
        setAddErr(T('فشل الحفظ: ' + m, 'Save failed: ' + m))
      }
    } finally {
      setAdding(false)
    }
  }, [sb, addForm, adding, user, toast, T])

  // الانتقال للصفحة الثانية — يتحقق أولاً من عدم تكرار رقم الإقامة (فريد بين العمال المؤقتين).
  // عند وجود عامل بنفس الرقم يظهر إشعار في الشريط السفلي ولا ننتقل (مثل العمالة الدائمة).
  const handleAddNext = useCallback(async () => {
    if (checkingDup) return
    setAddErr(null)
    const iqama = (addForm.iqama_number || '').trim()
    if (iqama && sb) {
      setCheckingDup(true)
      try {
        const { data, error } = await sb.from('temproryworkers').select('id, name_ar, name_en')
          .eq('iqama_number', iqama).is('deleted_at', null).limit(1)
        if (error) throw error
        if (data && data.length) {
          const w = data[0]
          const who = w.name_ar || w.name_en
          setAddErr(who
            ? T(`رقم الإقامة مسجّل مسبقاً للعامل «${who}»`, `This Iqama number is already registered to “${who}”`)
            : T('رقم الإقامة مسجّل مسبقاً لعامل آخر', 'This Iqama number is already registered to another worker'))
          return
        }
      } catch (e) {
        setAddErr(T('تعذّر التحقق من رقم الإقامة: ' + (e.message || e), 'Could not verify Iqama number: ' + (e.message || e)))
        return
      } finally {
        setCheckingDup(false)
      }
    }
    setAddPage(p => p + 1)
  }, [sb, addForm.iqama_number, checkingDup, T])

  useEffect(() => { onTabChange && onTabChange({ tab: 'temp_workers' }) }, [])

  const load = useCallback(async () => {
    if (!sb) return
    setLoading(true)
    const [w, f] = await Promise.all([
      sb.from('temproryworkers').select('*').is('deleted_at', null).order('name_ar', { ascending: true }),
      sb.from('facilities').select('id,name_ar,name_en,unified_number,cr_number,gosi_number,hrsd_number,branch_id,branch:branches!facilities_branch_id_fkey(branch_code,city:cities(name_ar,name_en))').is('deleted_at', null),
    ])
    setWorkers(w.data || []); setFacilities(f.data || [])
    setLoading(false)
  }, [sb])
  useEffect(() => { load() }, [load])

  // حذف ناعم للعامل المؤقت — تعيين deleted_at فيختفي من القائمة، ثم إغلاق التفاصيل.
  const deleteWorker = useCallback(async (r) => {
    if (!sb || !r) return false
    const { error } = await sb.from('temproryworkers')
      .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id || null }).eq('id', r.id)
    if (error) { toast?.(T('فشل الحذف: ' + error.message, 'Delete failed: ' + error.message)); return false }
    // النجاح يُعرض داخل النافذة (SuccessView)، لا توستر؛ وإغلاق النافذة يعيدنا للقائمة.
    await load()
    return true
  }, [sb, user, toast, T, load])

  // نقل العامل إلى العمالة الدائمة — ننسخ صفّه كما هو إلى جدول workers مع الإبقاء على
  // نفس المعرّف (فتبقى الفواتير والمرفقات المرتبطة به سارية)، ثم نحذفه حذفاً ناعماً من
  // جدول العمالة المؤقتة. upsert يسمح بالنقل ذهاباً وإياباً دون تعارض في المفتاح الأساسي.
  const transferToPermanent = useCallback(async (r) => {
    if (!sb || !r) return false
    const now = new Date().toISOString()
    // نسجّل حدث النقل في سجل العامل (مَن نقله ومتى ومن أين) ليظهر في «سجل الإضافات والتعديلات».
    const prevLog = Array.isArray(r.edit_log) ? r.edit_log : []
    const transferEntry = { at: now, by: user?.id || null, by_name: user?.person?.name_ar || user?.person?.name_en || null, kind: 'transfer', from: 'temporary' }
    const payload = { ...r, edit_log: [...prevLog, transferEntry], deleted_at: null, deleted_by: null, updated_at: now, updated_by: user?.id || null }
    const { error: upErr } = await sb.from('workers').upsert(payload, { onConflict: 'id' })
    if (upErr) { toast?.(T('فشل النقل: ' + upErr.message, 'Transfer failed: ' + upErr.message)); return false }
    const { error: delErr } = await sb.from('temproryworkers')
      .update({ deleted_at: now, deleted_by: user?.id || null }).eq('id', r.id)
    if (delErr) { toast?.(T('فشل النقل: ' + delErr.message, 'Transfer failed: ' + delErr.message)); return false }
    // النجاح يُعرض داخل النافذة (SuccessView)، لا توستر؛ وإغلاق النافذة يعيدنا للقائمة.
    await load()
    return true
  }, [sb, user, toast, T, load])

  // فتح نافذة التعديل — مُعبّأة من صف العامل. `section` يحدّد كرت الحقول المعروض.
  const openWorkerEdit = useCallback((r, section = null) => {
    if (!r) return
    setEditErr(null)
    setMuqeemFile(null)
    setEditRow(r)
    setEditSection(section)
    setEditForm({
      name: r.name_ar || r.name_en || '',
      nationality_id: r.nationality_id || '',
      nationality_ar: r.nationality_ar || '',
      occupation_id: r.current_occupation_id || '',
      occupation_ar: r.occupation_ar || '',
      birth_date: r.birth_date ? String(r.birth_date).slice(0, 10) : '',
      iqama_number: r.iqama_number || '',
      iqama_expiry_date: r.iqama_expiry_date ? String(r.iqama_expiry_date).slice(0, 10) : '',
      work_permit_expiry: r.work_permit_expiry ? String(r.work_permit_expiry).slice(0, 10) : '',
      border_number: r.border_number || '',
      passport_number: r.passport_number || '',
      passport_expiry: r.passport_expiry ? String(r.passport_expiry).slice(0, 10) : '',
    })
  }, [])

  const saveWorkerEdit = useCallback(async () => {
    if (!sb || !editRow || savingEdit) return
    const name = (editForm?.name || '').trim()
    setEditErr(null)
    if (!name) { setEditErr(T('أدخل اسم العامل', 'Enter the worker name')); return }
    setSavingEdit(true)
    try {
      const isArabicName = /[؀-ۿ]/.test(name)
      const patch = {
        name_ar: isArabicName ? name : null,
        name_en: !isArabicName ? name : null,
        nationality_id: editForm.nationality_id || null,
        nationality_ar: editForm.nationality_ar || null,
        current_occupation_id: editForm.occupation_id || null,
        occupation_ar: editForm.occupation_ar || null,
        birth_date: editForm.birth_date || null,
        iqama_number: (editForm.iqama_number || '').trim() || null,
        iqama_expiry_date: editForm.iqama_expiry_date || null,
        work_permit_expiry: editForm.work_permit_expiry || null,
        border_number: (editForm.border_number || '').trim() || null,
        passport_number: (editForm.passport_number || '').trim() || null,
        passport_expiry: editForm.passport_expiry || null,
        updated_by: user?.id || null,
      }
      // فرق القيم (قديم/جديد) لسجل التعديلات — بقيم مقروءة (لا معرّفات).
      const oldName = editRow.name_ar || editRow.name_en || null
      const oldBirth = editRow.birth_date ? String(editRow.birth_date).slice(0, 10) : null
      const oldIqExp = editRow.iqama_expiry_date ? String(editRow.iqama_expiry_date).slice(0, 10) : null
      const oldWpExp = editRow.work_permit_expiry ? String(editRow.work_permit_expiry).slice(0, 10) : null
      const oldPpExp = editRow.passport_expiry ? String(editRow.passport_expiry).slice(0, 10) : null
      const changes = [
        ['name', oldName, name],
        ['nationality_id', editRow.nationality_ar || null, patch.nationality_ar],
        ['occupation_id', editRow.occupation_ar || null, patch.occupation_ar],
        ['birth_date', oldBirth, patch.birth_date],
        ['iqama_number', editRow.iqama_number || null, patch.iqama_number],
        ['iqama_expiry_date', oldIqExp, patch.iqama_expiry_date],
        ['work_permit_expiry', oldWpExp, patch.work_permit_expiry],
        ['border_number', editRow.border_number || null, patch.border_number],
        ['passport_number', editRow.passport_number || null, patch.passport_number],
        ['passport_expiry', oldPpExp, patch.passport_expiry],
      ].filter(([, from, to]) => String(from ?? '') !== String(to ?? ''))
       .map(([field, from, to]) => ({ field, from: from ?? null, to: to ?? null }))
      // إرفاق ملف مقيم — يُسجَّل في سجل التعديلات أيضاً.
      const muqeem = (muqeemFile && (!muqeemFile.type || /pdf/i.test(muqeemFile.type))) ? muqeemFile : null
      if (muqeem) changes.push({ field: 'muqeem_file', from: null, to: muqeem.name || T('ملف مقيم', 'Muqeem file') })
      if (changes.length) {
        const prevLog = Array.isArray(editRow.edit_log) ? editRow.edit_log : []
        patch.edit_log = [...prevLog, { at: new Date().toISOString(), by: user?.id || null, by_name: user?.person?.name_ar || user?.person?.name_en || null, changes }]
      }
      const { error } = await sb.from('temproryworkers').update(patch).eq('id', editRow.id)
      if (error) throw new Error(error.message)
      // رفع ملف مقيم (PDF) إلى bucket «attachments» وربطه بالعامل (entity_type='temp_worker', notes='muqeem_file').
      if (muqeem) {
        const safe = (muqeem.name || 'muqeem.pdf').replace(/[^\w.\-]+/g, '_')
        const path = `temp_workers/${editRow.id}/muqeem/${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${safe}`
        const { error: upErr } = await sb.storage.from('attachments').upload(path, muqeem, { cacheControl: '3600', upsert: false })
        if (upErr) { toast?.(T('تعذّر رفع ملف مقيم: ' + (upErr.message || ''), 'Muqeem upload failed: ' + (upErr.message || ''))) }
        else {
          const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
          await sb.from('attachments').insert({
            entity_type: 'temp_worker', entity_id: editRow.id,
            file_name: muqeem.name, file_url: pub?.publicUrl || path, storage_path: path,
            mime_type: muqeem.type || null, size_bytes: muqeem.size || null, notes: 'muqeem_file', uploaded_by: user?.id || null,
          })
        }
      }
      toast?.(T('تم حفظ التعديلات', 'Changes saved'))
      setEditRow(null); setEditForm(null); setEditSection(null); setMuqeemFile(null)
      setAttKey(k => k + 1)
      // إعادة جلب العامل لتحديث صفحة التفاصيل + إعادة تحميل القائمة.
      const { data: fresh } = await sb.from('temproryworkers').select('*').eq('id', editRow.id).is('deleted_at', null).maybeSingle()
      if (fresh) setDetail(fresh)
      load()
    } catch (e) {
      setEditErr(T('فشل الحفظ: ' + (e.message || e), 'Save failed: ' + (e.message || e)))
    } finally {
      setSavingEdit(false)
    }
  }, [sb, editRow, editForm, savingEdit, user, toast, T, load, muqeemFile])

  // Deep-link: فتح تفاصيل عامل معيّن عند الانتقال من صفحة أخرى (مثل صفحة المنشأة).
  useEffect(() => {
    const handler = async (e) => {
      const id = e?.detail?.id
      if (!id || !sb) return
      const { data } = await sb.from('temproryworkers').select('*').eq('id', id).is('deleted_at', null).maybeSingle()
      if (data) setDetail(data)
    }
    window.addEventListener('temp-worker-open', handler)
    return () => window.removeEventListener('temp-worker-open', handler)
  }, [sb])

  const facById = useMemo(() => {
    const m = {}; facilities.forEach(f => { m[f.id] = f }); return m
  }, [facilities])

  // Lens-scoped rows (mirrors SbcFacilities scopedRows pattern).
  const scopedRows = useMemo(() => {
    if (viewLens === 'all') return workers
    return workers.filter(w => w.worker_status === viewLens)
  }, [workers, viewLens])

  const stats = useMemo(() => {
    const total = scopedRows.length
    const active = scopedRows.filter(w => w.worker_status === 'active').length
    const suspended = scopedRows.filter(w => w.worker_status === 'suspended').length
    // Iqama buckets — same thresholds as IqamaCell:
    //   expired ≤0 / renewal 1–30 / valid >30. Rows without an expiry date
    //   are excluded from all three so the donut percentages add up cleanly.
    const expired = scopedRows.filter(w => { const d = daysUntil(w.iqama_expiry_date); return d != null && d <= 0 }).length
    const exp30 = scopedRows.filter(w => { const d = daysUntil(w.iqama_expiry_date); return d != null && d > 0 && d <= 30 }).length
    const valid = scopedRows.filter(w => { const d = daysUntil(w.iqama_expiry_date); return d != null && d > 30 }).length
    const noIqama = scopedRows.filter(w => !w.iqama_expiry_date).length
    return { total, active, suspended, expired, exp30, valid, noIqama }
  }, [scopedRows])

  // Nationality leaderboard for the third stats card.
  const natTop = useMemo(() => {
    const counts = {}
    for (const w of scopedRows) {
      const n = (w.nationality_ar || '').trim()
      if (!n) continue
      counts[n] = (counts[n] || 0) + 1
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [scopedRows])

  const advCount = useMemo(() => Object.values(adv).filter(v => v).length, [adv])

  // Search + advanced filter
  const filtered = useMemo(() => {
    return scopedRows.filter(w => {
      if (adv.status && w.worker_status !== adv.status) return false
      if (adv.nationality && (w.nationality_ar || '') !== adv.nationality) return false
      if (adv.facility && w.current_facility_id !== adv.facility) return false
      if (adv.occupation && !(w.occupation_ar || '').includes(adv.occupation)) return false
      if (adv.iqama) {
        const d = daysUntil(w.iqama_expiry_date)
        if (adv.iqama === 'expired' && !(d != null && d <= 0)) return false
        if (adv.iqama === '30d' && !(d != null && d > 0 && d <= 30)) return false
        if (adv.iqama === 'valid' && !(d != null && d > 30)) return false
      }
      if (search.trim()) {
        const s = search.toLowerCase()
        if (!((w.name_ar || '').includes(s) || (w.name_en || '').toLowerCase().includes(s) ||
              (w.iqama_number || '').includes(s) || (w.border_number || '').includes(s) ||
              (w.passport_number || '').toLowerCase().includes(s) || (w.occupation_ar || '').includes(s) ||
              (w.gosi_registration_no || '').includes(s))) return false
      }
      return true
    })
  }, [scopedRows, adv, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const paged = filtered.slice(page * PAGE, page * PAGE + PAGE)

  if (detail) {
    return (<>
      <WorkerDetail
        worker={detail}
        facility={facById[detail.current_facility_id]}
        sb={sb} toast={toast} T={T} isAr={isAr}
        onBack={() => setDetail(null)}
        onEdit={(section) => openWorkerEdit(detail, section)}
        onDelete={() => deleteWorker(detail)}
        onTransfer={() => transferToPermanent(detail)}
        canEdit={canPerm(user, 'workers.create')}
        attKey={attKey}
      />
      {editRow && editForm && (
        <FKModal open onClose={() => { if (!savingEdit) { setEditErr(null); setEditRow(null); setEditForm(null); setEditSection(null); setMuqeemFile(null) } }} width={640}
          title={editSection === 'docs' ? T('تعديل الإقامة والوثائق', 'Edit Iqama & Documents') : editSection === 'data' ? T('تعديل بيانات العامل', 'Edit Worker Data') : T('تعديل العامل', 'Edit Worker')} Icon={Pencil}
          errorMsg={editErr}
          footer={
            <ActionButton Icon={Pencil} disabled={savingEdit || !(editForm.name || '').trim()} onClick={saveWorkerEdit}>
              {savingEdit ? T('جاري الحفظ…', 'Saving…') : T('تعديل', 'Save changes')}
            </ActionButton>
          }>
          {editSection !== 'docs' && (
            <ModalSection Icon={UserPlus} label={T('بيانات العامل', 'Worker Data')}>
              <div style={GRID}>
                <TextField full req label={T('اسم العامل (عربي أو إنجليزي)', 'Worker Name (Arabic or English)')}
                  value={editForm.name} onChange={v => { setEditErr(null); setEditForm(p => ({ ...p, name: v })) }} placeholder={T('الاسم الكامل', 'Full Name')} />
                <Select label={T('الجنسية', 'Nationality')} placeholder={T('اختر الجنسية…', 'Select nationality…')}
                  options={nationalities} getKey={o => o.id} getLabel={o => o.name_ar || o.name_en || ''} getSub={o => o.name_en || ''}
                  value={editForm.nationality_id}
                  onChange={(id, item) => setEditForm(p => ({ ...p, nationality_id: id, nationality_ar: item?.name_ar || '' }))} />
                <Select label={T('المهنة', 'Occupation')} placeholder={T('اختر المهنة…', 'Select occupation…')}
                  options={occupations} getKey={o => o.id} getLabel={o => o.name_ar || o.name_en || ''} getSub={o => o.name_en || ''}
                  value={editForm.occupation_id}
                  onChange={(id, item) => setEditForm(p => ({ ...p, occupation_id: id, occupation_ar: item?.name_ar || '' }))} />
                <DateField label={T('تاريخ الميلاد', 'Date of Birth')}
                  value={editForm.birth_date} onChange={v => setEditForm(p => ({ ...p, birth_date: v }))} />
              </div>
            </ModalSection>
          )}
          {editSection !== 'data' && (
            <ModalSection Icon={ShieldCheck} label={T('الإقامة والوثائق', 'Iqama & Documents')}>
              <div style={{ ...GRID, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <IdField label={T('رقم الإقامة', 'Iqama Number')} placeholder="2XXXXXXXXX"
                  value={editForm.iqama_number} onChange={v => setEditForm(p => ({ ...p, iqama_number: v }))} />
                <DateField label={T('تاريخ انتهاء الإقامة', 'Iqama Expiry')}
                  value={editForm.iqama_expiry_date} onChange={v => setEditForm(p => ({ ...p, iqama_expiry_date: v }))} />
                <DateField label={T('تاريخ انتهاء كرت العمل', 'Work Permit Expiry')}
                  value={editForm.work_permit_expiry} onChange={v => setEditForm(p => ({ ...p, work_permit_expiry: v }))} />
                <IdField label={T('رقم الحدود', 'Border Number')} placeholder="3XXXXXXXXX"
                  value={editForm.border_number} onChange={v => setEditForm(p => ({ ...p, border_number: v }))} />
                <TextField dir="ltr" label={T('رقم الجواز', 'Passport Number')} placeholder={T('اختياري', 'Optional')}
                  value={editForm.passport_number} onChange={v => setEditForm(p => ({ ...p, passport_number: v }))} />
                <DateField label={T('تاريخ انتهاء الجواز', 'Passport Expiry')}
                  value={editForm.passport_expiry} onChange={v => setEditForm(p => ({ ...p, passport_expiry: v }))} />
                <FileField full accept="application/pdf" label={T('ملف مقيم (PDF)', 'Muqeem file (PDF)')}
                  hint={T('ارفق ملف مقيم بصيغة PDF', 'Attach the Muqeem report as a PDF')}
                  value={muqeemFile} onChange={setMuqeemFile} />
              </div>
            </ModalSection>
          )}
        </FKModal>
      )}
    </>)
  }

  // Iqama donut math — 3 buckets matching IqamaCell thresholds.
  const safe = (n) => Number.isFinite(n) ? n : 0
  const iqamaTot = Math.max(1, safe(stats.expired) + safe(stats.exp30) + safe(stats.valid))
  const iqamaSegs = [
    { k: 'valid',   l: T('سارية','Valid'),       v: safe(stats.valid),   c: C.ok },
    { k: '30d',     l: T('≤ 30 يوم','≤ 30 days'), v: safe(stats.exp30),   c: C.gold },
    { k: 'expired', l: T('منتهية','Expired'),    v: safe(stats.expired), c: C.red },
  ]
  const R = 42, CIRC = 2 * Math.PI * R
  let acc = 0
  const iqamaArcs = iqamaSegs.map(s => {
    const len = safe((s.v / iqamaTot) * CIRC)
    const arc = { ...s, dash: `${len} ${CIRC - len}`, offset: safe(-acc), len }
    acc += len
    return arc
  })
  const validPct = Math.round(safe(stats.valid) / iqamaTot * 100)
  // أول جلب (لا توجد بيانات بعد) — نعرض هيكل التحميل كاملاً بدل البطاقات الصفرية،
  // تماماً كصفحة المنشآت.
  const initialLoading = loading && workers.length === 0

  return (
    <div style={{ fontFamily: F, paddingTop: 0 }}>
      {/* Hero — title + description column with the add button beside it,
          mirroring the Facilities page header exactly (font, size, weight, gap,
          dashed button, hover behaviour). */}
      <div style={{ position: 'relative', marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px', lineHeight: 1.2 }}>
              {T('العمالة المؤقتة','Temporary Workforce')}
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>
            {T('سجلّ مستقل للعمالة المؤقتة وبياناتهم الشخصية والمهنية والمنشآت التابعين لها',
               'A separate registry of temporary workers, their personal and professional data and the facilities they belong to')}
          </div>
        </div>
        {canPerm(user, 'workers.create') && (
        <button
          onClick={() => { setAddErr(null); setAddPage(0); setShowAdd(true) }}
          title={T('إضافة عامل مؤقت', 'Add Temporary Worker')}
          style={{
            height: 42, padding: '0 18px', borderRadius: 11,
            background: 'transparent',
            border: '1px dashed rgba(212,160,23,.5)',
            color: '#D4A017',
            cursor: 'pointer',
            fontFamily: F, fontSize: 13, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 8,
            whiteSpace: 'nowrap', flexShrink: 0,
            transition: 'background .15s ease, border-color .15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.12)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
          <span>{T('إضافة عامل مؤقت', 'Add Temporary Worker')}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        )}
      </div>

      {initialLoading ? <WorkforceSkeleton /> : (<>
      {/* KPI Row — 3 cards (2.2fr 1.7fr 1.6fr) mirroring SbcFacilities */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.7fr 1.6fr', gap: 14, marginBottom: 24 }}>
        {/* Hero — Total workers */}
        <div style={{
          position: 'relative', padding: '18px 22px', borderRadius: 16,
          background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
          border: '1px solid rgba(255,255,255,.05)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          overflow: 'hidden', minHeight: 150,
        }}>
          <div style={{ position: 'absolute', insetInlineStart: -60, top: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${C.blue}26 0%, transparent 70%)`, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.blue, boxShadow: `0 0 10px ${C.blue}aa` }} />
            <span style={{ fontSize: 24, color: '#fff', fontWeight: 600, letterSpacing: '.2px' }}>{T(arCount(stats.total, 'عامل', 'عمال'),'Workers')}</span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 7, justifyContent: 'flex-start', direction: 'ltr' }}>
            <span style={{ fontSize: 42, fontWeight: 800, color: C.blue, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{num(stats.total)}</span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)', gap: 8 }}>
            <span style={{ fontSize: 12, color: C.ok, fontWeight: 600, direction: 'rtl', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.ok }} /> {num(stats.valid + stats.exp30)} {T('ساري','valid')}
            </span>
            <span style={{ fontSize: 12, color: C.red, fontWeight: 600, direction: 'rtl', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.red }} /> {num(stats.expired)} {T('منتهي','expired')}
            </span>
          </div>
        </div>

        {/* Iqama status donut — mirror of CR-status donut */}
        <div style={{
          borderRadius: 16,
          background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
          border: '1px solid rgba(255,255,255,.05)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
          padding: '14px 16px',
          display: 'flex', flexDirection: 'column', gap: 12, minHeight: 150,
        }}>
          <div style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>{T('انتهاء الإقامات','Iqama Status')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
            <div style={{ position: 'relative', width: 112, height: 112, flexShrink: 0 }}>
              <svg width="112" height="112" viewBox="0 0 112 112" style={{ filter: 'drop-shadow(0 6px 18px rgba(0,0,0,.4))' }}>
                <defs>
                  <radialGradient id="iq-donut-core" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(255,255,255,.06)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                  </radialGradient>
                  {iqamaArcs.filter(a => a.v > 0).map(a => (
                    <linearGradient key={'g-' + a.k} id={`iq-seg-${a.k}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={a.c} stopOpacity="1" />
                      <stop offset="100%" stopColor={a.c} stopOpacity=".72" />
                    </linearGradient>
                  ))}
                </defs>
                <circle cx="56" cy="56" r="34" fill="url(#iq-donut-core)" />
                <g style={{ transform: 'rotate(-90deg)', transformOrigin: '56px 56px' }}>
                  <circle cx="56" cy="56" r={R} fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="12" />
                  {iqamaArcs.filter(a => a.v > 0).map(a => (
                    <circle key={a.k} cx="56" cy="56" r={R} fill="none"
                      stroke={`url(#iq-seg-${a.k})`} strokeWidth="12" strokeLinecap="butt"
                      strokeDasharray={a.dash} strokeDashoffset={a.offset}
                      style={{ transition: 'stroke-dasharray .4s, stroke-dashoffset .4s' }} />
                  ))}
                  <circle cx="56" cy="56" r={R + 6} fill="none" stroke="rgba(255,255,255,.03)" strokeWidth="1" />
                  <circle cx="56" cy="56" r={R - 6} fill="none" stroke="rgba(0,0,0,.25)" strokeWidth="1" />
                </g>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <span style={{ fontSize: 24, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums', direction: 'ltr', color: 'var(--tx)' }}>{validPct}%</span>
                <span style={{ fontSize: 9.5, fontWeight: 800, marginTop: 4, letterSpacing: '.2px', color: 'var(--tx2)' }}>{T('سارية','valid')}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
              {iqamaSegs.map(s => (
                <button key={s.k}
                  onClick={() => { setAdv(a => ({ ...a, iqama: a.iqama === s.k ? '' : s.k })); setPage(0) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, opacity: s.v === 0 ? 0.4 : 1, background: adv.iqama === s.k ? 'rgba(212,160,23,.08)' : 'transparent', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, fontFamily: F, textAlign: 'right' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: s.c, flexShrink: 0 }} />
                  <span style={{ color: 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'start' }}>{s.l}</span>
                  <span style={{ color: s.v === 0 ? 'var(--tx4)' : s.c, fontVariantNumeric: 'tabular-nums', direction: 'ltr', fontWeight: 800, flexShrink: 0 }}>{num(s.v)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Nationalities — top N tile breakdown (mirror of MoC violations card) */}
        <div style={{
          borderRadius: 16,
          background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
          border: '1px solid rgba(255,255,255,.05)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
          padding: '14px 16px',
          display: 'flex', flexDirection: 'column', gap: 12, minHeight: 150,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>{T('الجنسيات','Nationalities')}</span>
            <span style={{ fontSize: 10.5, color: C.purple, fontWeight: 700 }}>{num(natTop.length)} {T('جنسية','total')}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, flex: 1 }}>
            {natTop.slice(0, 4).map(([n, count]) => (
              <button key={n} onClick={() => { setAdv(a => ({ ...a, nationality: a.nationality === n ? '' : n })); setPage(0) }}
                style={{
                  borderRadius: 12, padding: '8px 10px',
                  background: adv.nationality === n ? 'rgba(212,160,23,.12)' : 'rgba(255,255,255,.025)',
                  border: '1px solid ' + (adv.nationality === n ? 'rgba(212,160,23,.4)' : 'rgba(255,255,255,.04)'),
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 4,
                  cursor: 'pointer', textAlign: 'start', fontFamily: F,
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <NatFlag nationality={n} size={16} />
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)', fontVariantNumeric: 'tabular-nums', direction: 'ltr', lineHeight: 1 }}>{num(count)}</span>
                </div>
                <span style={{ fontSize: 10.5, color: 'var(--tx3)', fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search + filter button (mirror SbcFacilities) */}
      <div style={{ display: 'flex', gap: 10, marginBottom: advOpen ? 10 : 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', color: 'var(--tx4)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder={T('ابحث بالاسم، رقم الإقامة، الحدود، الجواز، المهنة، رقم التسجيل…','Search by name, iqama, border, passport, occupation, registration…')}
            style={{ width: '100%', height: 44, padding: '0 14px 0 38px', borderRadius: 12, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', color: '#fff', fontSize: 13, fontFamily: F, boxSizing: 'border-box', outline: 'none' }}/>
        </div>
        <button type="button" onClick={() => setAdvOpen(v => !v)} style={btnFilter(advOpen || advCount > 0)}>
          {T('تصفية', 'Filter')}
          {advCount > 0 ? (
            <span
              role="button" tabIndex={0}
              title={T('مسح الفلاتر', 'Clear filters')}
              onClick={e => { e.stopPropagation(); setAdv({ status: '', iqama: '', nationality: '', facility: '', occupation: '' }) }}
              onMouseEnter={e => { e.currentTarget.style.background = C.red; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = C.gold; e.currentTarget.style.color = '#000' }}
              style={{ background: C.gold, color: '#000', width: 18, height: 18, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '.18s' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </span>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="14" y2="6"/><line x1="18" y1="6" x2="20" y2="6"/><circle cx="16" cy="6" r="2"/><line x1="4" y1="12" x2="8" y2="12"/><line x1="12" y1="12" x2="20" y2="12"/><circle cx="10" cy="12" r="2"/><line x1="4" y1="18" x2="16" y2="18"/><line x1="20" y1="18" x2="20" y2="18"/><circle cx="18" cy="18" r="2"/></svg>
          )}
        </button>
      </div>

      {/* Advanced filter panel */}
      {advOpen && (
        <div style={{ marginBottom: 22, padding: '16px 18px', background: 'var(--modal-bg)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.04)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <FilterField label={T('الحالة','Status')}>
              <select value={adv.status} onChange={e => { setAdv(a => ({ ...a, status: e.target.value })); setPage(0) }} style={selStyle}>
                <option value="">{T('الكل','All')}</option>
                <option value="active">{T('نشط','Active')}</option>
                <option value="suspended">{T('معلّق','Suspended')}</option>
              </select>
            </FilterField>
            <FilterField label={T('انتهاء الإقامة','Iqama Expiry')}>
              <select value={adv.iqama} onChange={e => { setAdv(a => ({ ...a, iqama: e.target.value })); setPage(0) }} style={selStyle}>
                <option value="">{T('الكل','All')}</option>
                <option value="expired">{T('منتهية','Expired')}</option>
                <option value="30d">{T('≤ 30 يوم','≤ 30 days')}</option>
                <option value="valid">{T('سارية','Valid')}</option>
              </select>
            </FilterField>
            <FilterField label={T('الجنسية','Nationality')}>
              <select value={adv.nationality} onChange={e => { setAdv(a => ({ ...a, nationality: e.target.value })); setPage(0) }} style={selStyle}>
                <option value="">{T('الكل','All')}</option>
                {natTop.map(([n, c]) => <option key={n} value={n}>{n} ({c})</option>)}
              </select>
            </FilterField>
            <FilterField label={T('المنشأة','Facility')}>
              <select value={adv.facility} onChange={e => { setAdv(a => ({ ...a, facility: e.target.value })); setPage(0) }} style={selStyle}>
                <option value="">{T('الكل','All')}</option>
                {facilities.map(f => <option key={f.id} value={f.id}>{f.name_ar || f.cr_number}</option>)}
              </select>
            </FilterField>
            <FilterField label={T('المهنة','Occupation')}>
              <input value={adv.occupation} onChange={e => { setAdv(a => ({ ...a, occupation: e.target.value })); setPage(0) }} placeholder={T('سائق، بناء…','Driver, builder…')} style={selStyle}/>
            </FilterField>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--tx4)', fontSize: 13 }}>{T('جاري التحميل...','Loading...')}</div>
      ) : filtered.length === 0 ? (
        <Empty T={T} hasData={workers.length > 0} />
      ) : (
        <>
          <style>{`
            .wf-tbl{width:100%;table-layout:fixed;border-collapse:separate;border-spacing:0;font-family:${F};background:#161616;border-radius:10px;border:1px solid rgba(255,255,255,.06)}
            .wf-tbl thead th{position:sticky;top:0;background:#161616;color:rgba(255,255,255,.92);font-size:14px;font-weight:600;text-align:center;padding:14px 4px 11px;box-shadow:inset 0 -2px 0 rgba(212,160,23,.55);white-space:nowrap;z-index:2;letter-spacing:.2px}
            .wf-tbl thead .hd-icon{color:${C.gold};display:inline-flex;align-items:center;justify-content:center;margin-inline-end:6px;vertical-align:middle}
            .wf-tbl thead .hd-icon svg{width:14px;height:14px;display:block}
            .wf-tbl tbody td{padding:10px 4px;font-size:11.5px;color:#fff;text-align:center;vertical-align:middle;overflow:hidden;border-bottom:1px solid rgba(255,255,255,.02)}
            .wf-tbl tbody tr{cursor:pointer;transition:background .12s}
            .wf-tbl tbody tr:nth-child(even) td{background:rgba(255,255,255,.02)}
            .wf-tbl tbody tr:hover td{background:rgba(212,160,23,.06)}
            .wf-tbl tbody tr:last-child td:first-child{border-bottom-right-radius:9px}
            .wf-tbl tbody tr:last-child td:last-child{border-bottom-left-radius:9px}
            .wf-tbl tbody tr:last-child td{border-bottom:none}
            .wf-tbl thead tr:first-child th:first-child{border-top-right-radius:9px}
            .wf-tbl thead tr:first-child th:last-child{border-top-left-radius:9px}
            .wf-tbl .num{direction:ltr;font-family:ui-monospace,monospace;font-variant-numeric:tabular-nums;font-weight:700}
            .wf-tbl .muted{color:var(--tx5)}
            .wf-tbl .name-cell{overflow:hidden;padding-inline:14px}
            /* Marquee — long text ellipsis by default, scrolls horizontally on row hover */
            .wf-tbl .name-marquee{display:block;max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
            .wf-tbl .name-marquee .marquee-inner{display:inline-block;will-change:transform}
            .wf-tbl tbody tr:hover .name-marquee{text-overflow:clip}
            .wf-tbl tbody tr:hover .name-marquee .marquee-inner{animation:wf-name-bounce 9s ease-in-out infinite}
            @keyframes wf-name-bounce{0%,12%{transform:translateX(0)}50%{transform:translateX(40%)}88%,100%{transform:translateX(0)}}
          `}</style>

          <div style={{ borderRadius: 10 }}>
            <table className="wf-tbl">
              <colgroup>
                <col style={{ width: '22%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '13%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>{T('الاسم','Name')}</th>
                  <th>{T('رقم الإقامة','Iqama')}</th>
                  <th>{T('الجنسية','Nationality')}</th>
                  <th>{T('المهنة','Occupation')}</th>
                  <th>{T('انتهاء الإقامة','Iqama Expiry')}</th>
                  <th>{T('الفرع','Branch')}</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(w => {
                  const f = facById[w.current_facility_id]
                  return (
                    <tr key={w.id} onClick={() => setDetail(w)}>
                      <td className="name-cell" title={w.name_ar || w.name_en || ''}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                          <div className="name-marquee" style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)' }}>
                            <span className="marquee-inner">{w.name_ar || w.name_en || '—'}</span>
                          </div>
                          {w.name_en && w.name_ar && (
                            <div className="name-marquee" style={{ fontSize: 9.5, fontWeight: 500, color: 'rgba(255,255,255,.4)' }}>
                              <span className="marquee-inner">{w.name_en}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {w.iqama_number ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, direction: 'ltr' }}>
                            <CopyBtn value={w.iqama_number} toast={toast} T={T} />
                            <span className="num" style={{ fontSize: 14, color: C.gold }}>{w.iqama_number}</span>
                          </span>
                        ) : <span className="muted">—</span>}
                      </td>
                      <td title={w.nationality_ar || ''} style={{ paddingInline: 8 }}>
                        {w.nationality_ar ? (
                          <div className="name-marquee" style={{ fontSize: 11.5, color: 'var(--tx2)', fontWeight: 600 }}>
                            <span className="marquee-inner">{w.nationality_ar}</span>
                          </div>
                        ) : <span className="muted">—</span>}
                      </td>
                      <td title={w.occupation_ar || ''} style={{ paddingInline: 8 }}>
                        {w.occupation_ar ? (
                          <div className="name-marquee" style={{ fontSize: 11.5, color: 'var(--tx2)', fontWeight: 600 }}>
                            <span className="marquee-inner">{w.occupation_ar}</span>
                          </div>
                        ) : <span className="muted">—</span>}
                      </td>
                      <td><IqamaCell iso={w.iqama_expiry_date} T={T} /></td>
                      <td title={f?.branch?.branch_code || ''}>
                        {(() => {
                          const asg = f?.branch
                          if (!asg) return <span className="muted">—</span>
                          const city = asg.city ? T(asg.city.name_ar, asg.city.name_en || asg.city.name_ar) : null
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 0, width: '100%' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{asg.branch_code || '—'}</span>
                              {city && <span style={{ fontSize: 9.5, fontWeight: 500, color: 'rgba(255,255,255,.45)', whiteSpace: 'nowrap' }}>{city}</span>}
                            </div>
                          )
                        })()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filtered.length > PAGE && (() => {
            const goPrev = () => setPage(p => Math.max(0, p - 1))
            const goNext = () => setPage(p => p + 1)
            const goTo = nn => setPage(Math.max(0, Math.min(totalPages - 1, nn)))
            const fromN = page * PAGE + 1
            const toN = Math.min(filtered.length, (page + 1) * PAGE)
            return (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 12px 4px', borderTop: '1px solid rgba(255,255,255,.06)', marginTop: 18 }}>
                <style>{`
                  .wf-pg-btn{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);border:none;color:${C.gold};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:.2s;font-family:${F}}
                  .wf-pg-btn:hover:not(:disabled){background:${C.gold};color:#000}
                  .wf-pg-btn:disabled{cursor:not-allowed;color:var(--tx4);background:rgba(255,255,255,.06)}
                  .wf-pg-input{width:42px;height:32px;background:transparent;border:none;outline:none;color:${C.gold};font-family:${F};font-size:14px;font-weight:700;text-align:center;direction:ltr;-moz-appearance:textfield;font-variant-numeric:tabular-nums}
                  .wf-pg-input::-webkit-outer-spin-button,.wf-pg-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
                `}</style>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}><span style={{ color: C.gold }}>{fromN}–{toN}</span> {T('من','of')} {num(filtered.length)}</span>
                  <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 500 }}>{T('صفحة','Page')} {page + 1} {T('من','of')} {totalPages}</span>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <button className="wf-pg-btn" disabled={page === 0} onClick={goPrev} aria-label={T('السابق','Prev')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                  <input className="wf-pg-input" type="number" min={1} max={totalPages} value={page + 1} onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) goTo(v - 1) }} />
                  <button className="wf-pg-btn" disabled={page + 1 >= totalPages} onClick={goNext} aria-label={T('التالي','Next')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                </div>
              </div>
            )
          })()}
        </>
      )}
      </>)}

      {/* ═══ Add Worker Modal — FormKit wizard: ١ بيانات العامل · ٢ منشأة العامل ═══ */}
      {showAdd && (
        <FKModal open onClose={() => {
            if (adding) return
            setAddErr(null); setAddPage(0); setShowAdd(false)
            if (addDone) { setAddDone(null); setAddForm({ name: '', iqama_number: '', iqama_expiry_date: '', birth_date: '', nationality_id: null, nationality_ar: '', occupation_id: null, occupation_ar: '', facility_id: null }) }
          }} variant="create" width={640}
          title={T('إضافة عامل مؤقت', 'Add Temporary Worker')} Icon={UserPlus}
          success={addDone ? <SuccessView title={addDone.title} /> : undefined}
          onSubmit={saveManualWorker} submitting={adding}
          submitLabel={T('إضافة', 'Add')} submitIcon={Plus}
          nextLabel={T('التالي', 'Next')} backLabel={T('السابق', 'Back')}
          page={addPage}
          onNext={handleAddNext}
          onBack={() => { setAddErr(null); setAddPage(p => Math.max(0, p - 1)) }}
          pages={[
            {
              valid: !checkingDup && !!(
                (addForm.name || '').trim() &&
                (addForm.iqama_number || '').trim() &&
                addForm.iqama_expiry_date &&
                addForm.nationality_id &&
                addForm.birth_date &&
                addForm.occupation_id
              ),
              error: addPage === 0 ? addErr : null,
              content: (
                <ModalSection Icon={UserPlus} label={T('بيانات العامل', 'Worker Data')}>
                  <div style={GRID}>
                    <TextField full req dir="rtl" align="right" label={T('اسم العامل (عربي أو إنجليزي)', 'Worker Name (Arabic or English)')}
                      value={addForm.name} onChange={v => setAdd('name', v)} placeholder={T('الاسم الكامل', 'Full Name')} />
                    <IdField req label={T('رقم الإقامة', 'Iqama Number')} placeholder="2XXXXXXXXX"
                      value={addForm.iqama_number} onChange={v => setAdd('iqama_number', v)} />
                    <DateField req label={T('تاريخ انتهاء الإقامة', 'Iqama Expiry Date')}
                      value={addForm.iqama_expiry_date} onChange={v => setAdd('iqama_expiry_date', v)} />
                    <Select req label={T('الجنسية', 'Nationality')} placeholder={T('اختر الجنسية…', 'Select nationality…')}
                      options={nationalities} getKey={o => o.id} getLabel={o => o.name_ar || o.name_en || ''} getSub={o => o.name_en || ''}
                      value={addForm.nationality_id}
                      onChange={(id, item) => setAddForm(p => ({ ...p, nationality_id: id, nationality_ar: item?.name_ar || '' }))} />
                    <DateField req label={T('تاريخ الميلاد', 'Date of Birth')}
                      value={addForm.birth_date} onChange={v => setAdd('birth_date', v)} />
                    <Select req full label={T('المهنة', 'Occupation')} placeholder={T('اختر المهنة…', 'Select occupation…')}
                      options={occupations} getKey={o => o.id} getLabel={o => o.name_ar || o.name_en || ''} getSub={o => o.name_en || ''}
                      value={addForm.occupation_id}
                      onChange={(id, item) => setAddForm(p => ({ ...p, occupation_id: id, occupation_ar: item?.name_ar || '' }))} />
                  </div>
                </ModalSection>
              ),
            },
            {
              valid: !!addForm.facility_id,   // زر «إضافة» معطّل حتى تُحدَّد منشأة
              error: addPage === 1 ? addErr : null,
              content: (
                <ModalSection Icon={Building2} label={T('منشأة العامل', "Worker's Facility")}
                  style={{ marginTop: 14, padding: '14px 12px 10px' }}>
                  <FacilityPicker facilities={facilities} value={addForm.facility_id}
                    onChange={(id) => setAdd('facility_id', id)} T={T} />
                </ModalSection>
              ),
            },
          ]} />
      )}

    </div>
  )
}

const selStyle = { width: '100%', height: 40, padding: '0 12px', borderRadius: 10, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.06)', color: '#fff', fontSize: 12.5, fontFamily: F, outline: 'none', cursor: 'pointer' }
const FilterField = ({ label, children }) => (
  <div>
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', marginBottom: 6 }}>{label}</div>
    {children}
  </div>
)
function PageBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: disabled ? 'var(--tx5)' : 'var(--tx2)', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 16, fontWeight: 700, opacity: disabled ? .4 : 1, fontFamily: F }}>{children}</button>
  )
}

function Empty({ T, hasData }) {
  return (
    <EmptyState
      icon={hasData
        ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>}
      title={hasData ? T('لا توجد نتائج للبحث', 'No results match the search') : T('لا يوجد عمال مؤقتون بعد', 'No temporary workers yet')}
      desc={hasData ? T('جرّب تعديل كلمة البحث', 'Try adjusting your search') : T('استخدم زر «إضافة عامل مؤقت» في الأعلى', 'Use the “Add Temporary Worker” button above')} />
  )
}

// سجل إضافات وتعديلات العامل المؤقت — يطابق FacEditLog في صفحة المنشآت: حدث الإضافة
// (مَن أضاف العامل ومتى) ثم كل تعديل لاحق. `created` = { at, by_name, label }.
function WorkerEditLog({ entries, created, T }) {
  const logEntries = Array.isArray(entries) ? entries.filter(e => e && (e.kind === 'transfer' || (Array.isArray(e.changes) && e.changes.length))) : []
  const createdEntry = created?.at ? { at: created.at, by_name: created.by_name, label: created.label, kind: 'created' } : null
  const chrono = [...(createdEntry ? [createdEntry] : []), ...logEntries]
  if (!chrono.length) return null
  return (
    <div style={{ background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 16, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
        <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '.2px', color: C.gold }}>{T('سجل الإضافات والتعديلات', 'Activity log')}</span>
      </div>
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[...chrono].reverse().map((c, i) => {
          const isCreate = c.kind === 'created'
          const isTransfer = c.kind === 'transfer'
          const accent = isCreate ? C.ok : isTransfer ? C.blue : C.gold
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '9px 11px', borderRadius: 10, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)' }}>
              <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 7, background: accent + '1a', border: '1px solid ' + accent + '47', color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                {isCreate
                  ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  : isTransfer
                    ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                    : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>}
              </span>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', minWidth: 0 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--tx2)', fontWeight: 700 }}>{isCreate ? T('تمت الإضافة', 'Added') : isTransfer ? T('تم النقل', 'Transferred') : T('تم التعديل', 'Edited')}</span>
                    {c.by_name && <span style={{ fontSize: 11, color: accent, fontWeight: 700 }}>{T('بواسطة', 'by')} {c.by_name}</span>}
                  </div>
                  <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, direction: 'ltr', flexShrink: 0 }}>{fmtDateTime(c.at)}</span>
                </div>
                {isCreate ? (
                  <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    <span>{T('تمت إضافة العامل', 'Worker added')}</span>
                    {c.label && <span style={{ color: 'var(--tx2)', fontWeight: 700 }}>{c.label}</span>}
                  </div>
                ) : isTransfer ? (
                  <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--tx2)', fontWeight: 700 }}>{c.from === 'permanent' ? T('نُقل من العمالة الدائمة', 'Moved from permanent workforce') : T('نُقل من العمالة المؤقتة', 'Moved from temporary workforce')}</span>
                  </div>
                ) : c.changes.map((ch, j) => (
                  <div key={j} style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    <span>{T(WORKER_LBL[ch.field]?.[0] || ch.field, WORKER_LBL[ch.field]?.[1] || ch.field)}:</span>
                    <span style={{ color: 'var(--tx2)', fontWeight: 700 }}>{(ch.to == null || ch.to === '') ? '—' : ch.to}</span>
                    {(ch.from == null || ch.from === '')
                      ? <span style={{ color: 'var(--tx5)' }}>({T('جديد', 'new')})</span>
                      : <span style={{ color: 'var(--tx5)' }}>({T('كان', 'was')}: <span style={{ textDecoration: 'line-through' }}>{ch.from}</span>)</span>}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════ Worker Detail (mirrors Facility detail) ═══════════════════════ */
function WorkerDetail({ worker: w, facility: f, sb, toast, T, isAr, onBack, onEdit, onDelete, onTransfer, canEdit, attKey }) {
  const t = themeForStatus(w.worker_status)
  const iqamaDays = daysUntil(w.iqama_expiry_date)

  const branchLabel = f?.branch ? ((f.branch.branch_code || '—') + (f.branch.city ? ' — ' + T(f.branch.city.name_ar, f.branch.city.name_en || f.branch.city.name_ar) : '')) : null
  const goFacility = (id) => { try { window.dispatchEvent(new CustomEvent('app-navigate-facility', { detail: { id } })) } catch { /* ignore */ } }
  const goInvoice = (id) => { try { window.dispatchEvent(new CustomEvent('app-navigate-invoice', { detail: { id } })) } catch { /* ignore */ } }

  // حذف العامل / نقله للعمالة الدائمة — تأكيد قبل التنفيذ. confirm: null | 'delete' | 'transfer'
  // عند النجاح نعرض شاشة نجاح داخل النافذة (done) بدل التوستر، وإغلاقها يعيدنا للقائمة.
  const wName = w.name_ar || w.name_en || '—'
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  const doDelete = async () => { setBusy(true); const ok = await onDelete?.(); setBusy(false); if (ok !== false) setDone({ title: T('تم حذف العامل', 'Worker deleted') }) }
  const doTransfer = async () => { setBusy(true); const ok = await onTransfer?.(); setBusy(false); if (ok !== false) setDone({ title: T('تم نقل العامل إلى العمالة الدائمة', 'Moved to permanent workforce') }) }
  // إغلاق نافذة التأكيد: بعد النجاح نعود للقائمة (onBack)، وإلا نكتفي بإلغاء التأكيد.
  const closeConfirm = () => { if (busy) return; const wasDone = !!done; setDone(null); setConfirm(null); if (wasDone) onBack?.() }

  // فواتير وخدمات العامل (تُحمّل عند فتح الصفحة) — نفس كرت صفحة المنشأة.
  const [facRows, setFacRows] = useState(null)
  useEffect(() => {
    if (!sb || !w?.id) { setFacRows([]); return }
    let cancelled = false
    ;(async () => {
      const { data } = await sb.from('v_worker_invoices').select('*').eq('worker_id', w.id)
      if (!cancelled) setFacRows(data || [])
    })()
    return () => { cancelled = true }
  }, [sb, w?.id])
  // اسم مُنشئ العامل — يُحلّ من created_by عبر users→persons (لا FK مضمَّن).
  const [creatorName, setCreatorName] = useState(null)
  useEffect(() => {
    if (!sb || !w?.created_by) { setCreatorName(null); return }
    let cancelled = false
    ;(async () => {
      const { data } = await sb.from('users').select('person:persons!users_person_id_fkey(name_ar,name_en)').eq('id', w.created_by).maybeSingle()
      if (!cancelled) setCreatorName(data?.person?.name_ar || data?.person?.name_en || null)
    })()
    return () => { cancelled = true }
  }, [sb, w?.created_by])
  // إجماليات الفواتير (دون الملغاة) + قائمة الخدمات/الفواتير.
  const invById = {}
  for (const r of (facRows || [])) if (r.invoice_id) invById[r.invoice_id] = r
  const invoices = Object.values(invById)
  const totals = invoices.reduce((a, r) => {
    if (r.invoice_status === 'cancelled') return a
    a.tot += Number(r.total_amount) || 0; a.paid += Number(r.paid_amount) || 0; a.rem += Number(r.remaining_amount) || 0
    return a
  }, { tot: 0, paid: 0, rem: 0 })
  const facListRows = [...(facRows || [])].sort((a, b) => (b.invoice_no ? 1 : 0) - (a.invoice_no ? 1 : 0))

  // ملف مقيم المرفق بالعامل (entity_type='temp_worker', notes='muqeem_file') — أحدث نسخة.
  const [muqeemAtt, setMuqeemAtt] = useState(null)
  useEffect(() => {
    if (!sb || !w?.id) { setMuqeemAtt(null); return }
    let cancelled = false
    ;(async () => {
      const { data } = await sb.from('attachments')
        .select('id,file_name,file_url,created_at')
        .eq('entity_type', 'temp_worker').eq('entity_id', w.id).eq('notes', 'muqeem_file').is('deleted_at', null)
        .order('created_at', { ascending: false }).limit(1)
      if (!cancelled) setMuqeemAtt((data && data[0]) || null)
    })()
    return () => { cancelled = true }
  }, [sb, w?.id, attKey])
  // حقل بنفس تصميم صفحة تفاصيل المنشأة (صندوق داكن، التسمية أعلى، القيمة أسفل + نسخ).
  const Field = ({ k, v, mono, color, link, full }) => {
    const empty = v == null || v === ''
    return (
      <div onClick={link && !empty ? () => goFacility(link) : undefined}
        style={{ gridColumn: full ? '1 / -1' : undefined, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5, cursor: link && !empty ? 'pointer' : 'default', transition: 'border-color .15s' }}
        onMouseEnter={link && !empty ? (e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.5)' }) : undefined}
        onMouseLeave={link && !empty ? (e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.05)' }) : undefined}>
        <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600, whiteSpace: 'nowrap' }}>{k}</span>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, direction: 'ltr' }}>
          {!empty && !link && <CopyBtn value={v} toast={toast} T={T} />}
          {!empty && link && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>}
          <span style={{ fontSize: 13, color: empty ? 'var(--tx4)' : (link ? C.gold : (color || 'var(--tx1)')), fontWeight: 600, lineHeight: 1.4, direction: mono ? 'ltr' : 'rtl', fontFamily: mono ? 'ui-monospace, monospace' : F, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{empty ? '—' : v}</span>
        </span>
      </div>
    )
  }
  const EditBtn = ({ onClick }) => canEdit && onClick ? (
    <button onClick={onClick} title={T('تعديل', 'Edit')}
      style={{ height: 32, padding: '0 14px', borderRadius: 9, background: 'transparent', border: '1px dashed rgba(212,160,23,.5)', color: C.gold, cursor: 'pointer', fontFamily: F, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'background .15s' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.12)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
      {T('تعديل', 'Edit')}
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
    </button>
  ) : null
  const CardHead = ({ children, onEdit: onEditCard }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
      <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '.2px', color: C.gold, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />{children}
      </span>
      <EditBtn onClick={onEditCard} />
    </div>
  )
  // زر إجراء في الترويسة — نفس تصميم زر صفحة العمالة الدائمة (إطار متقطّع بلون قابل للتمرير).
  const HeaderBtn = ({ onClick, color, label, children }) => (
    <button onClick={onClick} title={label}
      style={{ height: 42, padding: '0 18px', borderRadius: 11, background: 'transparent', border: `1px dashed ${color}80`, color, cursor: 'pointer', fontFamily: F, fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', flexShrink: 0, transition: 'background .15s' }}
      onMouseEnter={e => { e.currentTarget.style.background = `${color}1f` }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
      <span>{label}</span>
      {children}
    </button>
  )

  // حالة الإقامة: أخضر >30، ذهبي 1–30، أحمر ≤0 (نفس عتبات IqamaCell).
  const iqColor = iqamaDays == null ? C.gray : iqamaDays <= 0 ? C.red : iqamaDays <= 30 ? C.gold : C.ok
  const iqShort = iqamaDays == null ? T('غير محدد', '—') : iqamaDays <= 0 ? T('منتهية', 'Expired') : iqamaDays <= 30 ? T('قريبة الانتهاء', 'Expiring') : T('سارية', 'Valid')

  return (
    <div style={{ fontFamily: F, paddingTop: 0, paddingBottom: 80, color: 'var(--tx2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <BackButton onBack={onBack} label={T('رجوع','Back')} />
      </div>
      {/* Header — أيقونة + عنوان عام + وصف + أزرار النقل/الحذف (نفس تصميم تفاصيل المنشأة) */}
      <div style={{ marginBottom: 18, marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <div style={{ fontSize: 22, fontWeight: 600, color: C.gold, letterSpacing: '-.2px' }}>{T('تفاصيل العامل المؤقت','Temporary Worker Details')}</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>
            {T('البيانات الشخصية والوثائق وحالة الإقامة والمنشأة والفرع التابع له.',
               'Personal data, documents, iqama status and the facility & branch he belongs to.')}
          </div>
        </div>
        {canEdit && (onDelete || onTransfer) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
            {onTransfer && (
              <HeaderBtn onClick={() => setConfirm('transfer')} color={C.blue} label={T('نقل إلى العمالة الدائمة', 'Move to Permanent')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m17 3 4 4-4 4"/><path d="M21 7H7"/><path d="m7 13-4 4 4 4"/><path d="M3 17h14"/></svg>
              </HeaderBtn>
            )}
            {onDelete && (
              <HeaderBtn onClick={() => setConfirm('delete')} color={C.red} label={T('حذف العامل', 'Delete')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
              </HeaderBtn>
            )}
          </div>
        )}
      </div>

      {/* عمودان: كروت البيانات (يمين) + هيرو الحالة (يسار) — مثل تفاصيل المنشأة */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(280px, 340px)', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          {/* بيانات العامل */}
          <div style={cardChrome}>
            <CardHead onEdit={onEdit ? () => onEdit('data') : undefined}>{T('بيانات العامل','Worker Data')}</CardHead>
            <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field full k={T('اسم العامل','Worker Name')} v={w.name_ar || w.name_en} />
              <Field k={T('الجنسية','Nationality')} v={w.nationality_ar} />
              <Field k={T('المهنة','Occupation')} v={w.occupation_ar} />
              <Field k={T('تاريخ الميلاد','Date of Birth')} v={w.birth_date ? fmtDate(w.birth_date) : null} mono />
              <Field k={T('العمر','Age')} v={calcAge(w.birth_date) != null ? T(`${calcAge(w.birth_date)} سنة`, `${calcAge(w.birth_date)} yrs`) : null} />
            </div>
          </div>
          {/* الإقامة والوثائق */}
          <div style={cardChrome}>
            <CardHead onEdit={onEdit ? () => onEdit('docs') : undefined}>{T('الإقامة والوثائق','Iqama & Documents')}</CardHead>
            <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field k={T('رقم الإقامة','Iqama No.')} v={w.iqama_number} mono color={C.gold} />
              <Field k={T('تاريخ انتهاء الإقامة','Iqama Expiry')} v={w.iqama_expiry_date ? fmtDate(w.iqama_expiry_date) : null} mono color={iqColor} />
              <Field k={T('تاريخ انتهاء كرت العمل','Work Permit Expiry')} v={w.work_permit_expiry ? fmtDate(w.work_permit_expiry) : null} mono />
              <Field k={T('رقم الحدود','Border No.')} v={w.border_number} mono color={C.blue} />
              <Field k={T('رقم الجواز','Passport No.')} v={w.passport_number} mono color={C.purple} />
              <Field k={T('تاريخ انتهاء الجواز','Passport Expiry')} v={w.passport_expiry ? fmtDate(w.passport_expiry) : null} mono />
              {/* ملف مقيم — يفتح ملف PDF المرفق إن وُجد، وإلا «لا يوجد». */}
              <div style={{ gridColumn: '1 / -1', background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600, whiteSpace: 'nowrap' }}>{T('ملف مقيم','Muqeem file')}</span>
                {muqeemAtt ? (
                  <a href={muqeemAtt.file_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: C.gold, textDecoration: 'none', direction: 'ltr' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
                    {T('عرض الملف','View file')}
                  </a>
                ) : (
                  <span style={{ fontSize: 12.5, color: 'var(--tx4)', fontWeight: 600 }}>{T('لا يوجد','None')}</span>
                )}
              </div>
            </div>
          </div>
          {/* المنشأة والفرع */}
          <div style={cardChrome}>
            <CardHead>{T('المنشأة والفرع','Facility & Branch')}</CardHead>
            <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field k={T('المنشأة','Facility')} v={f?.name_ar || f?.name_en} link={f?.id} />
              <Field k={T('الفرع التابع','Branch')} v={branchLabel} />
            </div>
          </div>

          {/* كرت الفواتير والخدمات — إجماليات + قائمة (نقرة على الفاتورة → تفاصيل الفاتورة). نفس صفحة المنشأة. */}
          <div style={cardChrome}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
              <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '.2px', color: C.gold }}>{T('الفواتير والخدمات', 'Invoices & Services')}</span>
              <span style={{ marginInlineStart: 'auto', fontSize: 11.5, fontWeight: 600, color: 'var(--tx4)' }}>{facRows ? `${num(facListRows.length)} ${T('طلب', 'requests')}` : '—'}</span>
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                {[
                  { l: T('الإجمالي', 'Total'), v: totals.tot, c: C.gold },
                  { l: T('المدفوع', 'Paid'), v: totals.paid, c: C.ok },
                  { l: T('المتبقي', 'Remaining'), v: totals.rem, c: C.red },
                ].map((s, i) => (
                  <div key={i} style={{ background: 'rgba(0,0,0,.22)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 500 }}>{s.l}</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: s.c, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(Math.round(s.v))}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {facRows === null ? (
                  <div style={{ fontSize: 12, color: 'var(--tx4)', textAlign: 'center', padding: '8px 0' }}>{T('جارٍ التحميل…', 'Loading…')}</div>
                ) : facListRows.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--tx4)', textAlign: 'center', padding: '8px 0' }}>{T('لا توجد فواتير أو خدمات مرتبطة', 'No invoices or services linked')}</div>
                ) : facListRows.map((r, i) => {
                  const cancelled = r.invoice_status === 'cancelled'
                  const paidUp = r.invoice_id && Number(r.remaining_amount) <= 0 && !cancelled
                  const stt = cancelled ? { t: T('ملغاة', 'Cancelled'), c: C.red } : paidUp ? { t: T('مدفوعة', 'Paid'), c: C.ok } : r.invoice_id ? { t: `${T('متبقٍ', 'Due')} ${num(Math.round(Number(r.remaining_amount) || 0))}`, c: C.gold } : null
                  return (
                    <div key={i} onClick={r.invoice_id ? () => goInvoice(r.invoice_id) : undefined} title={r.invoice_id ? T('عرض تفاصيل الفاتورة', 'View invoice') : ''}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, cursor: r.invoice_id ? 'pointer' : 'default', opacity: cancelled ? .65 : 1, transition: 'border-color .15s' }}
                      onMouseEnter={e => { if (r.invoice_id) e.currentTarget.style.borderColor = 'rgba(212,160,23,.5)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.05)' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.service_ar || T('خدمة', 'Service')}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--tx4)', fontFamily: 'ui-monospace, monospace', direction: 'ltr', marginTop: 2 }}>{T('مرجع', 'Ref')}: {r.request_ref_no || '—'}</div>
                      </div>
                      <div style={{ textAlign: 'end', flexShrink: 0 }}>
                        {r.invoice_no ? (
                          <div style={{ fontSize: 11.5, fontWeight: 600, color: C.gold, direction: 'ltr', display: 'inline-flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
                            {r.invoice_no}
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>
                          </div>
                        ) : <span style={{ fontSize: 11, color: 'var(--tx5)' }}>{T('بدون فاتورة', 'No invoice')}</span>}
                        {stt && <div style={{ fontSize: 10.5, fontWeight: 600, color: stt.c, marginTop: 2, direction: 'rtl' }}>{stt.t}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* سجل التعديلات — يظهر فقط عند وجود تعديلات (نفس صفحة المنشأة). */}
          <WorkerEditLog entries={w.edit_log} created={w.created_at ? { at: w.created_at, by_name: creatorName, label: wName } : null} T={T} />
        </div>

        {/* هيرو الحالة — حالة الإقامة (تصميم «حالة كبيرة») */}
        <div style={cardChrome}>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--tx4)', letterSpacing: '.5px' }}>{T('حالة الإقامة','Iqama Status')}</span>
            <div style={{ margin: '10px 0 2px', fontSize: 28, fontWeight: 600, color: iqColor, lineHeight: 1.1 }}>{iqShort}</div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'stretch', gap: 20, marginTop: 18 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--tx4)' }}>{T('تاريخ الانتهاء','Expiry')}</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4, color: w.iqama_expiry_date ? iqColor : 'var(--tx4)', direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontFamily: 'ui-monospace, monospace' }}>{w.iqama_expiry_date ? fmtDate(w.iqama_expiry_date) : '—'}</div>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,.1)' }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--tx4)' }}>{iqamaDays != null && iqamaDays < 0 ? T('منذ','Since') : T('متبقٍ','Remaining')}</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4, color: iqamaDays == null ? 'var(--tx4)' : iqColor, direction: 'rtl' }}>{iqamaDays != null ? `${Math.abs(iqamaDays)} ${T('يوم','days')}` : '—'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* تأكيد حذف العامل المؤقت (حذف ناعم — deleted_at). */}
      {confirm === 'delete' && (
        <FKModal open variant="delete" width={460} Icon={Trash2}
          onClose={closeConfirm}
          title={T('حذف العامل', 'Delete worker')}
          success={done ? <SuccessView title={done.title} /> : undefined}
          footer={
            <ActionButton Icon={Trash2} color={C.red} disabled={busy} onClick={doDelete}>
              {busy ? T('جارٍ الحذف…', 'Deleting…') : T('تأكيد الحذف', 'Confirm delete')}
            </ActionButton>
          }>
          <div style={{ fontSize: 14, color: 'var(--tx2)', lineHeight: 1.8, padding: '2px 2px 6px' }}>
            {T(`سيتم حذف العامل «${wName}» وإخفاؤه من قائمة العمالة المؤقتة. لن يظهر بعد الحذف في الواجهة.`,
               `The worker “${wName}” will be deleted and hidden from the temporary workers list.`)}
          </div>
        </FKModal>
      )}

      {/* تأكيد نقل العامل إلى العمالة الدائمة — نسخ إلى workers + حذف ناعم هنا. */}
      {confirm === 'transfer' && (
        <FKModal open variant="delete" width={460} accent={C.blue} Icon={Users}
          onClose={closeConfirm}
          title={T('نقل إلى العمالة الدائمة', 'Move to permanent workforce')}
          success={done ? <SuccessView title={done.title} /> : undefined}
          footer={
            <ActionButton Icon={Users} color={C.blue} disabled={busy} onClick={doTransfer}>
              {busy ? T('جارٍ النقل…', 'Moving…') : T('تأكيد النقل', 'Confirm move')}
            </ActionButton>
          }>
          <div style={{ fontSize: 14, color: 'var(--tx2)', lineHeight: 1.8, padding: '2px 2px 6px' }}>
            {T(`سيتم نقل العامل «${wName}» إلى قائمة العمالة الدائمة وإزالته من قائمة العمالة المؤقتة.`,
               `The worker “${wName}” will be moved to the permanent workforce and removed from the temporary list.`)}
          </div>
        </FKModal>
      )}
    </div>
  )
}

function FacChip({ label, value, toast, T }) {
  return (
    <div style={{ background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12.5, color: value ? 'var(--tx)' : 'var(--tx5)', fontWeight: 700, direction: 'ltr', fontFamily: 'ui-monospace, monospace', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {value || '—'}
        {value && <CopyBtn value={value} toast={toast} T={T} />}
      </div>
    </div>
  )
}
