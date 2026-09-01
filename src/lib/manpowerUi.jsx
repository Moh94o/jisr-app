import React from 'react'
import { C, F } from '../components/ui/FormKit.jsx'

/* ═══════════════════════════════════════════════════════════════════════════
   عناصر واجهة قسم «توريد العمالة» المشتركة — بنفس لغة تصميم صفحة الفواتير
   الرئيسية (كروت إحصاء بظلّ وشريط لونيّ ونقطة متوهّجة، شارة حالة كحبّة دواء،
   وحقل بحث بنمط شريط بحث الفواتير). وحدةٌ واحدة كي لا تنجرف الصفحات الثماني
   عن بعضها مع الزمن.
   ═══════════════════════════════════════════════════════════════════════════ */

/* كروت الإحصاء — نمط StatCard في صفحة الفواتير: شريط لوني علوي، نقطة متوهّجة
   بجوار العنوان، قيمة كبيرة بلون البطاقة، وظل الثيم. */
export function MpStats({ stats, dir = 'rtl' }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
      {stats.map((s, i) => (
        <div key={i} style={{ position: 'relative', overflow: 'hidden', background: 'var(--card-grad2)', border: '1px solid var(--bd)', borderRadius: 16, boxShadow: 'var(--shadow-md)', padding: '16px 18px 14px', minHeight: 96, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ position: 'absolute', top: 0, insetInlineStart: 0, insetInlineEnd: 0, height: 2, background: `linear-gradient(90deg, ${s.c}, transparent)` }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.c, boxShadow: `0 0 8px ${s.c}88`, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600 }}>{s.l}</span>
          </div>
          <span style={{ fontSize: 26, fontWeight: 600, color: s.c, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, direction: 'ltr', textAlign: dir === 'rtl' ? 'right' : 'left' }}>{s.v}</span>
        </div>
      ))}
    </div>
  )
}

/* شارة الحالة — حبّة دواء (radius 999) كما في تفاصيل الفاتورة، بحجم واحد
   في القوائم والتفاصيل معاً. `st` = {ar, en, c}. */
export function MpBadge({ st, lang = 'ar', children }) {
  if (!st) return null
  return (
    <span style={{ padding: '4px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, background: st.c + '16', color: st.c, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {children || (lang === 'en' ? st.en : st.ar)}
    </span>
  )
}

/* حقل البحث — نمط شريط بحث الفواتير: 44px بخلفية `--search-bg` وأيقونة
   تتذهّب حين يُكتب فيه. تصفية محلية على الصفوف المحمَّلة. */
export function MpSearch({ value, onChange, placeholder }) {
  const active = !!String(value || '').trim()
  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 420 }}>
      <span style={{ position: 'absolute', insetInlineStart: 14, top: '50%', transform: 'translateY(-50%)', display: 'inline-flex', pointerEvents: 'none' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? C.gold : 'var(--tx4)'} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      </span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', height: 44, padding: '0 40px', borderRadius: 12, border: '1px solid ' + (active ? C.gold + '66' : 'transparent'), background: 'var(--search-bg)', color: 'var(--tx)', fontFamily: F, fontSize: 13, fontWeight: 500, outline: 'none', transition: 'border-color .15s ease' }} />
    </div>
  )
}

/* مرشّح صفوف عام للبحث المحلي: يطابق النص على أي من الحقول المُرجَعة */
export const mpMatch = (q, fields) => {
  const s = String(q || '').trim().toLowerCase()
  if (!s) return true
  return fields.some(f => String(f ?? '').toLowerCase().includes(s))
}

/* صفّا تمرير الجدول — hover موحّد يعيد القيمة الحرفية نفسها */
export const mpRowHover = {
  onMouseEnter: e => { e.currentTarget.style.background = 'var(--hoverBg)' },
  onMouseLeave: e => { e.currentTarget.style.background = 'transparent' },
}
