import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Users, Printer, Plus, Trash2, Pencil, FileText, Building2, ClipboardList, Calculator, BadgeCheck, ArrowRight, ArrowLeft } from 'lucide-react'
import {
  C, F, EmptyState, Modal as FKModal, ModalSection, TextField, TextArea, CurrencyField, NumberField, PhoneField,
  YesNo, Segmented, Select as FKSelect, DateField as FKDateField, GRID, SuccessView, ConfirmDialog,
} from '../components/ui/FormKit.jsx'
import { canTab, cardVisible, isGM, tabOffices } from '../lib/permissions.js'
import PageSkeleton from '../components/ui/Skeleton.jsx'
import BackButton from '../components/BackButton.jsx'
import { MpStats, MpBadge, MpSearch, mpMatch, mpRowHover } from '../lib/manpowerUi.jsx'
import { printManpowerQuotation, quoteEconomics } from '../lib/manpowerQuotationPrint.js'

const n = v => { const x = parseFloat(String(v ?? '').replace(/,/g, '')); return isNaN(x) ? 0 : x }
const nm = v => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })
const fmtD = d => { if (!d) return '—'; const dt = new Date(d); if (isNaN(dt)) return '—'; return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0') }
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
// خطاب عرض السعر إنجليزي بالكامل — أي نصّ يحوي حروفاً عربية يُستبعد منه بدل حقنه وسط جملة إنجليزية
const hasArabic = v => /[\u0600-\u06FF]/.test(String(v ?? ''))
// دمج قائمة في جملة إنجليزية سليمة: «a, b and c»
const andList = a => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]

// طرق التسعير — نفس خيارات نموذج الإكسل
const METHODS = [
  { v: 'hour', ar: 'بالساعة', en: 'Per Hour' },
  { v: 'day', ar: 'باليوم', en: 'Per Day' },
  { v: 'month', ar: 'بالشهر', en: 'Per Month' },
  { v: 'meter', ar: 'بالمتر', en: 'Per Meter' },
  { v: 'lump', ar: 'مقطوعية', en: 'Lump Sum' },
]
const methodLabel = (v, lang) => { const m = METHODS.find(x => x.v === v); return m ? (lang === 'en' ? m.en : m.ar) : '—' }

// شروط الدفع الجاهزة — `en` هي الجملة التي تُطبع في عرض السعر، و`s` تسمية مختصرة للقوائم والكروت
const PAYMENT_TERMS = [
  { v: 'net15', ar: 'شهرياً مقابل كشوف دوام معتمدة — تُستحق خلال 15 يوماً', s: 'Monthly against approved timesheets — NET 15', en: 'Payment shall be made on a monthly basis against approved timesheets. Invoices are due NET 15 days from the date of submission.' },
  { v: 'net30', ar: 'شهرياً مقابل كشوف دوام معتمدة — تُستحق خلال 30 يوماً', s: 'Monthly against approved timesheets — NET 30', en: 'Payment shall be made on a monthly basis against approved timesheets. Invoices are due NET 30 days from the date of submission.' },
  { v: 'early_disc', ar: 'صافي 15 يوماً مع خصم 1٪ للسداد خلال 7 أيام', s: 'NET 15 with 1% discount if settled within 7 days', en: 'Payment shall be made on a monthly basis against approved timesheets. Invoices are due NET 15 days from the date of submission. A 1% early payment discount is available for settlement within 7 days.' },
  { v: 'advance_25', ar: 'دفعة مقدمة 25٪ والباقي شهرياً', s: '25% advance, balance invoiced monthly', en: 'A 25% advance payment shall be made upon contract signing, with the balance invoiced monthly against approved timesheets.' },
  { v: 'on_delivery', ar: 'عند التسليم', s: 'On delivery', en: 'Payment shall be made upon delivery and acceptance of the works.' },
]
const paymentTermsLabel = (v, lang) => { const p = PAYMENT_TERMS.find(x => x.v === v); return p ? (lang === 'en' ? p.s : p.ar) : '—' }

/* بنود عرض السعر تُبنى من المهن مباشرة: كل مهنة بند بسعر وحدتها وطريقة التسعير المختارة.
   لا جدول تكلفة ولا حسبة ربح — النافذة تُصدر عرض سعر للعميل فقط. */
const METHOD_UX = {
  hour: { labour: true, itemAr: 'المهنة', itemEn: 'Trade', qtyAr: 'عدد العمال', qtyEn: 'Workers', priceAr: 'سعر الساعة', priceEn: 'Rate / hr' },
  day: { labour: true, itemAr: 'المهنة', itemEn: 'Trade', qtyAr: 'عدد العمال', qtyEn: 'Workers', priceAr: 'سعر اليوم', priceEn: 'Rate / day' },
  month: { labour: true, itemAr: 'المهنة', itemEn: 'Trade', qtyAr: 'عدد العمال', qtyEn: 'Workers', priceAr: 'السعر الشهري', priceEn: 'Rate / month' },
  meter: { labour: false, itemAr: 'المهنة', itemEn: 'Trade', qtyAr: 'عدد الأمتار', qtyEn: 'Meters', priceAr: 'سعر المتر', priceEn: 'Rate / m' },
  lump: { labour: false, itemAr: 'المهنة', itemEn: 'Trade', qtyAr: '', qtyEn: '', priceAr: 'المبلغ المقطوع', priceEn: 'Lump sum' },
}
const methodUx = (v) => METHOD_UX[v] || METHOD_UX.hour

/* بطاقة الأسعار تحمل سعر **الساعة** وحده. فالتحويل صريح: اليوم = الساعة × ساعات
   اليوم، والشهر = ذلك × أيام الشهر. وما لا زمن له (متر/مقطوعية) لا يُشتقّ من
   البطاقة أصلاً — يكتبه الموظف، فاقتراحُ سعر ساعةٍ لمترٍ رقمٌ لا معنى له. */
export const rateForMethod = (hourly, method, hpd, dpm) => {
  const h = n(hourly)
  if (!h) return ''
  if (method === 'hour') return String(Math.round(h * 100) / 100)
  if (method === 'day') return String(Math.round(h * (n(hpd) || 10) * 100) / 100)
  if (method === 'month') return String(Math.round(h * (n(hpd) || 10) * (n(dpm) || 26)))
  return ''
}

/* حالة التسعيرة — الاعتماد يفتح الطباعة: عرضٌ يذهب للعميل باسم الشركة
   لا يخرج بمسودّة، ولا يُعدَّل بعد اعتماده إلا بردّه مسودّةً. */
export const QUOTE_STATUS = {
  draft: { ar: 'مسودّة', en: 'Draft', c: 'var(--tx3)' },
  approved: { ar: 'معتمدة', en: 'Approved', c: '#27a046' },
  cancelled: { ar: 'ملغاة', en: 'Cancelled', c: '#e5534b' },
}

export const manpowerLines = (f) => (f.professions || [])
  .filter(pr => pr.name && n(pr.unit_price) > 0)
  .map(pr => ({ item: pr.name, item_en: pr.name_en || '', method: f.pricing_method || 'hour', unit_price: n(pr.unit_price), units: n(pr.qty), note: '' }))

/* ═══════════════ نافذة إنشاء / تعديل تسعيرة توريد عمالة ═══════════════ */
function ManpowerQuoteModal({ sb, T, lang, user, branches, cities, rateCard, editRow, onClose, onSaved, onOpen }) {
  const dir = lang === 'en' ? 'ltr' : 'rtl'
  const [f, setF] = useState(() => editRow ? {
    branch_id: editRow.branch_id, client_name: editRow.client_name || '', client_name_en: editRow.client_name_en || '',
    // الجوال يُخزَّن محلياً بتسع خانات (5XXXXXXXX) مثل الفاتورة — نجرّد أي بادئة قديمة عند التعديل
    client_location: editRow.client_location || '', attn_name: editRow.attn_name || '', client_phone: String(editRow.client_phone || '').replace(/\D/g, '').replace(/^966/, '').replace(/^0/, '').slice(-9),
    start_date: editRow.start_date || null, work_description: editRow.work_description || '', daily_required: editRow.daily_required || '',
    // سعر الوحدة يُستعاد من بند الإيراد المقابل للمهنة (الصفوف القديمة تحفظه هناك)
    professions: (Array.isArray(editRow.professions) && editRow.professions.length
      ? editRow.professions.map(p => {
        const o = typeof p === 'string' ? { name: p, name_en: '', qty: '' } : { ...p, qty: String(p.qty ?? '') }
        const rl = (editRow.revenue_lines || []).find(l => l.item === o.name)
        return { ...o, unit_price: String(o.unit_price ?? rl?.unit_price ?? '') }
      })
      : [{ name: '', name_en: '', qty: '', unit_price: '' }]),
    pricing_method: editRow.pricing_method || 'hour',
    chamber: editRow.chamber, ajeer: editRow.ajeer, single_sponsor: editRow.single_sponsor,
    hours_per_day: String(editRow.hours_per_day ?? 10), days_per_month: String(editRow.days_per_month ?? 26),
    housing_by: editRow.housing_by || 'client', transport_by: editRow.transport_by || 'client', food_by: editRow.food_by || 'client', tools_by: editRow.tools_by || 'client', safety_by: editRow.safety_by || 'client',
    invoice_terms: editRow.invoice_terms || '', invoice_terms_en: editRow.invoice_terms_en || '', validity_days: String(editRow.validity_days ?? 5),
    payment_terms_key: editRow.payment_terms_key || 'net15',
  } : {
    branch_id: user?.primary_branch_id || null, client_name: '', client_name_en: '', client_location: '', attn_name: '', client_phone: '',
    start_date: null, work_description: '', daily_required: '',
    professions: [{ name: '', name_en: '', qty: '', unit_price: '' }], pricing_method: 'hour',
    chamber: null, ajeer: true, single_sponsor: null,
    hours_per_day: '10', days_per_month: '26', housing_by: 'client', transport_by: 'client', food_by: 'client', tools_by: 'client', safety_by: 'client',
    invoice_terms: '', invoice_terms_en: '', validity_days: '5', payment_terms_key: 'net15',
  })
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState(null)
  const [savedRow, setSavedRow] = useState(null)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  // تعديل صفّ بند — المهنة تجلب اسمها الإنجليزي وسعرها المُشتقّ لطريقة التسعير
  const setProf = (i, k, v) => setF(p => {
    const a = p.professions.slice()
    if (k === 'name') {
      const rc = (rateCard || []).find(o => o.position_ar === v)
      const sug = rateForMethod(rc?.billing_rate, p.pricing_method, p.hours_per_day, p.days_per_month)
      // السعر يُقترح من البطاقة ولا يُفرض: الموظف يكتب فوقه لعرضٍ بعينه
      a[i] = { ...a[i], name: v, name_en: rc?.position_en || '', unit_price: sug || a[i].unit_price || '' }
    } else a[i] = { ...a[i], [k]: v }
    return { ...p, professions: a }
  })
  /* تغيير طريقة التسعير يعيد اشتقاق أسعار المهن من البطاقة — وإلا بقي سعر ساعةٍ
     في عمود «السعر الشهري» يبدو صحيحاً وهو أربعون ضعفاً دونه. */
  const remapRates = (method, hpd, dpm) => setF(p => ({
    ...p, pricing_method: method,
    professions: p.professions.map(pr => {
      const rc = (rateCard || []).find(o => o.position_ar === pr.name)
      if (!rc) return pr
      const sug = rateForMethod(rc.billing_rate, method, hpd ?? p.hours_per_day, dpm ?? p.days_per_month)
      return sug ? { ...pr, unit_price: sug } : pr
    }),
  }))
  const lines = useMemo(() => manpowerLines(f), [f])
  const workersTotal = f.professions.reduce((t, pr) => t + n(pr.qty), 0)
  const canSave = f.client_name.trim().length > 0 && lines.length > 0

  const save = async () => {
    if (!canSave || submitting) return
    setSubmitting(true); setErr(null)
    const payload = {
      branch_id: f.branch_id || null,
      client_name: f.client_name.trim(), client_name_en: f.client_name_en.trim() || null,
      client_location: f.client_location.trim() || null, attn_name: f.attn_name.trim() || null, client_phone: f.client_phone.trim() || null,
      start_date: f.start_date || null, work_description: f.work_description.trim() || null, daily_required: f.daily_required.trim() || null,
      professions: (f.professions || []).filter(p => p.name).map(p => ({ name: p.name, name_en: p.name_en || '', qty: n(p.qty), unit_price: n(p.unit_price) })),
      pricing_method: f.pricing_method || 'hour',
      chamber: f.chamber, ajeer: f.ajeer, single_sponsor: f.single_sponsor,
      hours_per_day: n(f.hours_per_day) || 10, days_per_month: n(f.days_per_month) || 26,
      housing_by: f.housing_by, transport_by: f.transport_by, food_by: f.food_by, tools_by: f.tools_by, safety_by: f.safety_by,
      invoice_terms: f.invoice_terms.trim() || null, invoice_terms_en: f.invoice_terms_en.trim() || null, payment_terms_key: f.payment_terms_key || 'net15',
      validity_days: Math.max(1, Math.round(n(f.validity_days) || 5)),
      // بنود عرض السعر — مشتقّة من المهن، وهي ما يُطبع في جدول الأسعار
      revenue_lines: lines,
      workers_total: workersTotal,
    }
    try {
      if (editRow?.id) {
        const { data, error } = await sb.from('manpower_quotes').update(payload).eq('id', editRow.id).select('*').single()
        if (error) throw error
        await onSaved?.(); setSavedRow(data)
      } else {
        const { data, error } = await sb.from('manpower_quotes').insert({ ...payload, created_by: user?.id || null }).select('*').single()
        if (error) throw error
        await onSaved?.(); setSavedRow(data)
      }
      setSubmitting(false)
    } catch (e) { setSubmitting(false); setErr(T('تعذّر الحفظ: ', 'Save failed: ') + (e?.message || e)) }
  }


  // صفّ من حقلين متساويين (ينهار لعمود على الجوال)
  const row2 = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }
  // إطار الخطوة — نفس شكل نافذة الفاتورة: بطاقة بحدّ ذهبي وشارة عنوان عائمة تملأ ارتفاع النافذة
  const frame = (Icon, label, hint, children, bodyStyle) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <ModalSection flex Icon={Icon} label={label} hint={hint} style={{ marginTop: 0 }} bodyStyle={bodyStyle}>
        {children}
      </ModalSection>
    </div>
  )
  // منطقة تمرير داخلية للقوائم الطويلة (أسطر التكلفة/الإيراد) — الإطار نفسه يبقى ثابتاً

  /* ── الخطوة 1: بيانات العميل والطلب ── */
  const pgClient = frame(Building2, T('بيانات العميل والطلب', 'Client & Request'), null,
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* صف: اسم العميل بالعربي والإنجليزي */}
      <div style={row2}>
        <TextField label={T('اسم العميل / المنشأة', 'Client / Company')} req value={f.client_name} onChange={v => set('client_name', v)} placeholder={T('بالعربي', 'In Arabic')} />
        <TextField label={T('اسم العميل / المنشأة', 'Client / Company')} value={f.client_name_en} onChange={v => set('client_name_en', v)} dir="ltr" placeholder={T('بالإنجليزي', 'In English')} />
      </div>
      {/* صف: المسؤول وجواله */}
      <div style={row2}>
        <TextField label={T('اسم المسؤول', 'Contact person')} value={f.attn_name} onChange={v => set('attn_name', v)} />
        <PhoneField label={T('جوال المسؤول', 'Contact mobile')} value={f.client_phone} onChange={v => set('client_phone', v)} />
      </div>
      {/* صف: وصف العمل */}
      <TextArea label={T('وصف العمل', 'Work description')} value={f.work_description} onChange={v => set('work_description', v)} rows={2} full />
      {/* صف: المدينة وتاريخ المباشرة */}
      <div style={row2}>
        <FKSelect label={T('المدينة', 'City')} value={f.client_location} onChange={v => set('client_location', v)}
          options={(cities || []).map(c => ({ v: lang === 'en' ? (c.name_en || c.name_ar) : c.name_ar, l: lang === 'en' ? (c.name_en || c.name_ar) : c.name_ar }))}
          getKey={o => o.v} getLabel={o => o.l} placeholder={T('اختر المدينة', 'Pick a city')} />
        <FKDateField label={T('تاريخ مباشرة العمل', 'Work start date')} value={f.start_date} onChange={v => set('start_date', v)} />
      </div>
      {/* صف: المكتب — التسعيرة تُنسب لفرعها لا لفرع منشئها وحده */}
      <FKSelect label={T('المكتب', 'Branch')} value={f.branch_id} onChange={v => set('branch_id', v)}
        options={(branches || []).map(b => ({ v: b.id, l: (b.name_ar || '') + (b.branch_code ? ' (' + b.branch_code + ')' : '') }))}
        getKey={o => o.v} getLabel={o => o.l} placeholder={T('اختر المكتب', 'Pick a branch')} full />
    </div>
  )

  /* ── خطوة البنود — البند مهنةٌ دائماً، والمتغيّر مسمّى الكمية والسعر ──
     كلُّ عملٍ عندنا يؤدّيه صاحبُ مهنة، حتى المسعَّر بالمتر أو مقطوعية. فمصدر
     البند واحدٌ لا يتبدّل (بطاقة الأسعار)، والذي يتبع الطريقة هو ما نعدّه:
     عمالاً أم أمتاراً، وما نسعّره: ساعةً أم متراً أم مبلغاً مقطوعاً. */
  const ux = methodUx(f.pricing_method)
  /* كل عنوانٍ فوق حقله حرفياً: العناوين والحقول شبكةٌ واحدة بنفس الأعمدة،
     فلا ينزلق عنوانٌ فوق حقلٍ ليس له عند تغيّر عدد الحقول. */
  const cols = [
    { k: 'item', label: T(ux.itemAr, ux.itemEn), flex: 3, min: 0 },
    ...(ux.qtyAr ? [{ k: 'qty', label: T(ux.qtyAr, ux.qtyEn), flex: 1, min: 84 }] : []),
    { k: 'price', label: T(ux.priceAr, ux.priceEn), flex: 1.4, min: 120 },
  ]
  const canDrop = f.professions.length > 1
  const pgWork = frame(ClipboardList, T('المهن المطلوبة وأسعارها', 'Required trades & rates'),
    ux.labour ? null : T('السعر لا يُشتقّ من بطاقة الأسعار في هذه الطريقة — اكتبه بنفسك',
      'The rate card does not derive a price for this basis — type it yourself'),
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {cols.map(c => (
          <div key={c.k} style={{ flex: c.flex, minWidth: c.min, fontSize: 11, fontWeight: 600, color: 'var(--tx4)', textAlign: 'center' }}>{c.label}</div>
        ))}
        {canDrop && <div style={{ width: 30, flexShrink: 0 }} />}
      </div>
      {f.professions.map((pr, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 3, minWidth: 0 }}>
            <FKSelect value={pr.name} onChange={v => setProf(i, 'name', v)}
              options={(rateCard || []).filter(o => o.position_ar).map(o => ({ v: o.position_ar, l: lang === 'en' ? (o.position_en || o.position_ar) : o.position_ar }))}
              getKey={o => o.v} getLabel={o => o.l} placeholder={T('اختر المهنة', 'Pick a trade')} />
          </div>
          {ux.qtyAr && (
            <div style={{ flex: 1, minWidth: 84 }}>
              <NumberField value={pr.qty} onChange={v => setProf(i, 'qty', v)} min={0} />
            </div>
          )}
          <div style={{ flex: 1.4, minWidth: 120 }}>
            <CurrencyField value={pr.unit_price} onChange={v => setProf(i, 'unit_price', v)} />
          </div>
          {canDrop && <button onClick={() => setF(x => ({ ...x, professions: x.professions.filter((_, j) => j !== i) }))} title={T('حذف', 'Remove')}
            style={{ width: 30, height: 42, borderRadius: 9, border: '1px solid var(--bd)', background: 'transparent', color: '#e5534b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Trash2 size={14} /></button>}
        </div>
      ))}
      {f.professions.length < 8 && <button onClick={() => setF(x => ({ ...x, professions: [...x.professions, { name: '', name_en: '', qty: '', unit_price: '' }] }))}
        style={{ alignSelf: 'flex-start', height: 32, padding: '0 12px', borderRadius: 9, border: '1px dashed ' + C.gold + '80', background: 'transparent', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Plus size={13} strokeWidth={2.4} />{T('إضافة مهنة', 'Add trade')}</button>}
    </div>
  )

  /* ── الخطوة 2: طريقة التسعير — تسبق البنود لأنها تحدّد شكلها ── */
  const pgOps = frame(Calculator, T('طريقة التسعير', 'Pricing Method'), null,
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Segmented label={T('طريقة التسعير', 'Pricing method')} value={f.pricing_method}
        onChange={v => remapRates(v)} full
        options={METHODS.map(m => ({ v: m.v, l: lang === 'en' ? m.en : m.ar }))} />
      {/* ساعات اليوم وأيام الشهر ليستا زينة: منهما يُشتقّ سعرُ اليوم والشهر من
          سعر الساعة في بطاقة الأسعار، وعليهما يقوم بند ساعات العمل في العرض.
          فتظهران لكل تسعيرةٍ زمنية، وتغييرهما يعيد اشتقاق الأسعار. */}
      {methodUx(f.pricing_method).labour && (
        <div style={row2}>
          <NumberField label={T('عدد الساعات باليوم', 'Hours per day')} value={f.hours_per_day}
            onChange={v => { set('hours_per_day', v); remapRates(f.pricing_method, v, undefined) }} min={1} max={24} />
          <NumberField label={T('أيام العمل بالشهر', 'Working days / month')} value={f.days_per_month}
            onChange={v => { set('days_per_month', v); remapRates(f.pricing_method, undefined, v) }} min={1} max={31} />
        </div>
      )}
      <div style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 12, padding: '12px 16px', fontSize: 12, color: 'var(--tx3)', lineHeight: 1.9 }}>
        {methodUx(f.pricing_method).labour
          ? T('تسعير عمالة بالزمن — البنود مهنٌ من بطاقة الأسعار، وسعرها يُشتقّ تلقائياً لهذه الطريقة.',
              'Time-based labour pricing — items are trades from the rate card, and the price is derived automatically for this basis.')
          : T('تسعير أعمال لا عمالة — اكتب بنود العمل وأسعارها بنفسك؛ بطاقة الأسعار للعمالة وحدها.',
              'Works pricing, not labour — type the work items and prices yourself; the rate card covers labour only.')}
      </div>
    </div>
  )

  /* ── الخطوة 4: الالتزامات والشروط ──
     مجموعتان تملآن الإطار: الاشتراكات أعلى (نعم/لا)، ثم بنود التحمّل كقائمة صفوف
     (المسمّى ثم الخيار) موزّعة على ما تبقّى من الارتفاع بدل شبكة تنتهي بفراغ. */
  const subTitle = { fontSize: 11.5, fontWeight: 600, color: C.gold, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }
  const subLine = <span style={{ flex: 1, height: 1, background: 'var(--bd)' }} />
  const byOptions = [{ v: 'client', l: T('على العميل', 'By the Client'), c: C.blue }, { v: 'mcc', l: T('على المكتب', 'By MCC'), c: C.gold }]
  const pgTerms = frame(ClipboardList, T('الالتزامات والشروط', 'Obligations & Terms'), null,
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 16 }}>
      <div>
        <div style={subTitle}><span>{T('الاشتراكات والتصاريح', 'Subscriptions & permits')}</span>{subLine}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <YesNo label={T('الغرفة التجارية', 'Chamber of Commerce')} value={f.chamber} onChange={v => set('chamber', v)} />
          <YesNo label={T('أجير', 'Ajeer')} value={f.ajeer} onChange={v => set('ajeer', v)} />
          <YesNo label={T('على كفالة واحدة', 'Single sponsorship')} value={f.single_sponsor} onChange={v => set('single_sponsor', v)} />
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={subTitle}><span>{T('على من تقع الالتزامات', 'Who covers what')}</span>{subLine}</div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', gap: 8 }}>
          {[['housing_by', T('السكن', 'Accommodation')], ['transport_by', T('المواصلات', 'Transportation')], ['food_by', T('الأكل', 'Food')], ['safety_by', T('أدوات السلامة', 'Safety equipment (PPE)')], ['tools_by', T('أدوات العمل', 'Work tools')]].map(([k, l]) => (
            <div key={k} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 170px) 1fr', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--tx)' }}>{l}</span>
              <Segmented value={f[k]} onChange={v => set(k, v)} height={38} options={byOptions} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  /* أربع خطوات: العميل ← طريقة التسعير ← البنود ← الالتزامات.
     «شروط الدفع» سقطت بقرار المستخدم — لا إدخال لها: العرض يُطبع بالشرط
     الافتراضي (net15) وصلاحية 5 أيام، وشروط الفوترة تُترك فارغة. */
  const pages = [
    { valid: f.client_name.trim().length > 0, content: pgClient },
    { content: pgOps },
    { valid: lines.length > 0, content: pgWork },
    { valid: canSave, error: err, content: pgTerms },
  ]

  return (
    <FKModal open onClose={onClose} title={editRow ? T('تعديل تسعيرة توريد عمالة', 'Edit Manpower Quote') : T('تسعيرة توريد عمالة جديدة', 'New Manpower Quote')}
      Icon={Users} width={940} height="min(720px, 92vh)" accent={C.gold} lang={lang}
      pages={pages} onSubmit={save} submitting={submitting}
      submitLabel={editRow ? T('حفظ التعديلات', 'Save changes') : T('حفظ التسعيرة', 'Save quote')} submitIcon={BadgeCheck}
      success={savedRow ? (
        <SuccessView title={T('تم حفظ التسعيرة بنجاح', 'Quote saved successfully')} code={savedRow.quote_no}
          action={<div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            <button className="btn-primary-modal" onClick={() => { onOpen?.(savedRow) }} style={{ height: 38, padding: '0 18px', borderRadius: 10, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <FileText size={14} strokeWidth={2.2} />{T('فتح التسعيرة', 'Open quotation')}</button>
          </div>} />
      ) : null} />
  )
}

/* ═══════════ الشريك في الربح ═══════════
   شريكٌ في صفقةٍ بعينها لا في المكتب كلّه: اسمه ونسبته تُحفظان على التسعيرة،
   وحصّته تُقتطع من صافي ربحها وحده. */
function PartnerModal({ sb, T, lang, row, onClose, onSaved, toast }) {
  const [name, setName] = useState(row.partner_name || '')
  const [pct, setPct] = useState(String(row.partner_share_pct ?? ''))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const share = n(pct)
  const valid = (!name.trim() && !share) || (name.trim().length > 1 && share > 0 && share <= 100)

  const save = async () => {
    if (!valid || busy) return
    setBusy(true); setErr(null)
    const { error } = await sb.from('manpower_quotes')
      .update({ partner_name: name.trim() || null, partner_share_pct: name.trim() ? share : null })
      .eq('id', row.id)
    setBusy(false)
    if (error) { setErr(T('تعذّر الحفظ: ', 'Save failed: ') + error.message); return }
    toast?.(T('تم حفظ الشريك', 'Partner saved')); await onSaved?.(); onClose?.()
  }

  return (
    <FKModal open onClose={onClose} title={T('الشريك في الربح', 'Profit Partner')} Icon={Users}
      width={560} accent={C.gold} lang={lang} onSubmit={save} submitting={busy}
      submitLabel={T('حفظ', 'Save')} submitIcon={BadgeCheck}
      pages={[{ valid, error: err, content: (
        <ModalSection Icon={Users} label={T('الشريك', 'Partner')} style={{ marginTop: 0 }}
          hint={T('اتركه فارغاً إذا لا شريك في هذه التسعيرة', 'Leave empty if this quote has no partner')}>
          <div style={GRID}>
            <TextField label={T('اسم الشريك', 'Partner name')} value={name} onChange={setName} />
            <NumberField label={T('حصته من صافي الربح %', 'Share of net profit %')} value={pct} onChange={setPct} min={0} max={100} />
          </div>
        </ModalSection>
      ) }]} />
  )
}

/* ═══════════════════════ صفحة «توريد العمالة» ═══════════════════════ */
export default function ManpowerQuotesPage({ sb, toast, user, lang = 'ar', emptyIcon }) {
  const T = (ar, en) => lang === 'en' ? en : ar
  const dir = lang === 'en' ? 'ltr' : 'rtl'
  const [rows, setRows] = useState(null)
  const [branches, setBranches] = useState([])
  const [cities, setCities] = useState([])
  // المهن المسعَّرة — من بطاقة الأسعار مباشرة، فلا تُسعَّر مهنةٌ لا سعر لها
  const [rateCard, setRateCard] = useState([])
  const [usersById, setUsersById] = useState({})
  const [detailsRow, setDetailsRow] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [delRow, setDelRow] = useState(null)
  const [partnerRow, setPartnerRow] = useState(null)
  const [q, setQ] = useState('')

  const canCreate = canTab(user, 'manpower_calc', 'create')
  const canEdit = r => canTab(user, 'manpower_calc', 'edit') || (r?.created_by && r.created_by === user?.id)
  const canDelete = canTab(user, 'manpower_calc', 'delete')
  const canPrint = canTab(user, 'manpower_calc', 'print')
  const canApprove = canTab(user, 'manpower_calc', 'approve')
  // الربح والتكلفة أرقامٌ داخلية — من لا يملكها يرى العرض بلا اقتصادياته
  const canProfit = canTab(user, 'manpower_calc', 'view_profit')

  // نطاق المكاتب — غير المدير العام يرى تسعيرات مكاتبه وحدها
  const officeScope = tabOffices(user, 'manpower_calc')
  const load = useCallback(async () => {
    let qQ = sb.from('manpower_quotes').select('*').order('created_at', { ascending: false }).limit(500)
    if (officeScope) qQ = qQ.in('branch_id', officeScope)
    const [q, b, u, c, o] = await Promise.all([
      qQ,
      sb.from('branches').select('id,name_ar,branch_code').is('deleted_at', null).eq('is_active', true).order('name_ar'),
      sb.from('users').select('id,person:persons(name_ar,name_en)'),
      sb.from('cities').select('id,name_ar,name_en,sort_order').not('is_active', 'is', false).order('sort_order').order('name_ar'),
      // تكلفة الساعة وأسعار الإضافي والأجور تدخل حسبة الجدوى — RLS يحجبها عمّن لا يراها
      sb.from('manpower_rate_card').select('position_ar,position_en,billing_rate,ot_billing_rate,avg_cost,wage_rate,ot_wage_rate,category_ar')
        .not('is_active', 'is', false).order('sort_order', { nullsFirst: false }).order('position_en'),
    ])
    setRows(q.data || [])
    setBranches((b.data || []).filter(x => !officeScope || officeScope.includes(x.id)))
    setCities(c.data || [])
    setRateCard(o.data || [])
    const map = {}; (u.data || []).forEach(x => { map[x.id] = x.person?.name_ar || x.person?.name_en || '' }); setUsersById(map)
    // إبقاء صف التفاصيل المفتوح محدّثاً بعد أي حفظ
    setDetailsRow(prev => prev ? (q.data || []).find(r => r.id === prev.id) || prev : prev)
  }, [sb])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!sb) return
    const ch = sb.channel('manpower-quotes-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'manpower_quotes' }, () => load()).subscribe()
    return () => { sb.removeChannel(ch) }
  }, [sb, load])

  const branchOf = id => branches.find(b => b.id === id)
  const branchLabel = id => { const b = branchOf(id); return b ? (b.name_ar || '') + (b.branch_code ? ' (' + b.branch_code + ')' : '') : '—' }
  /* الطباعة بعد الاعتماد فقط: الوثيقة تحمل ترويسة الشركة وختمها، فخروجها
     بمسودّة يعني وصول سعرٍ غير مُقرّ إلى العميل. */
  const doPrint = (r, lg) => {
    if (!canPrint) { toast?.(T('لا تملك صلاحية الطباعة', 'No print permission')); return }
    if (r.status !== 'approved') { toast?.(T('اعتمد التسعيرة أولاً', 'Approve the quote first')); return }
    printManpowerQuotation(r, branches, cities, lg)
  }
  /* الاعتماد يُجمّد لقطة الربح المتوقَّع: بطاقة الأسعار قد تتغيّر غداً، ولا يصحّ
     أن تتحرّك أرقامُ عرضٍ صدر واعتُمد. */
  const setStatus = async (r, status) => {
    const patch = { status }
    if (status === 'approved') {
      const e = quoteEconomics(r, rateCard)
      patch.approved_at = new Date().toISOString()
      patch.approved_by = user?.id || null
      patch.snap_monthly_revenue = Math.round(e.revenue * 100) / 100
      patch.snap_monthly_cost = Math.round(e.cost * 100) / 100
      patch.snap_monthly_profit = Math.round(e.profit * 100) / 100
    }
    const { error } = await sb.from('manpower_quotes').update(patch).eq('id', r.id)
    if (error) toast?.(T('تعذّر التحديث: ', 'Update failed: ') + error.message)
    else { toast?.(status === 'approved' ? T('تم اعتماد التسعيرة', 'Quote approved') : T('أُعيدت مسودّةً', 'Reverted to draft')); load() }
  }
  /* بعد الحفظ تُفتح التسعيرة نفسها لا الطابعة — يراها صاحبها كاملة ثم يطبعها
     من زرّها في الترويسة، كما تُفتح الفاتورة بعد إصدارها. */
  const openSaved = r => { setShowModal(false); setEditRow(null); if (r) setDetailsRow(r) }

  const header = (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--tx)', letterSpacing: '-.3px', lineHeight: 1.2 }}>{T('توريد العمالة', 'Manpower Supply')}</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx2)', marginTop: 12, lineHeight: 1.6 }}>{T('تسعير عقود توريد العمالة وإصدار عرض سعر PDF للعميل', 'Manpower supply contract pricing and a client-ready PDF quotation')}</div>
        </div>
        {canCreate && <div className="page-cta-row" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button onClick={() => { setEditRow(null); setShowModal(true) }} className="btn-primary-modal"
            style={{ height: 42, padding: '0 18px', borderRadius: 11, fontFamily: F, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', transition: 'background .15s ease, border-color .15s ease, box-shadow .15s ease' }}>
            {T('تسعيرة توريد عمالة', 'New Manpower Quote')}
            <Plus size={16} strokeWidth={2.2} />
          </button>
        </div>}
      </div>
    </div>
  )

  if (rows === null) return <div style={{ fontFamily: F, paddingBottom: 80, direction: dir }}>{header}<PageSkeleton variant="table" cards={4} columns={7} rows={6} /></div>

  /* ═══════════════ شاشة التفاصيل ═══════════════ */
  if (detailsRow) {
    const r = detailsRow
    const cardChrome = { background: 'var(--card-grad2)', border: '1px solid var(--bd)', borderRadius: 16, overflow: 'hidden' }
    const cardHeader = { padding: '14px 22px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: 10 }
    const cardTitle = { fontSize: 16, fontWeight: 600, color: C.gold, letterSpacing: '.2px' }
    const cell = (label, value, opts = {}) => (
      <div style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5, ...(opts.full ? { gridColumn: '1 / -1' } : {}) }}>
        <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 13.5, color: opts.color || 'var(--tx1)', fontWeight: 600, lineHeight: 1.5, wordBreak: 'break-word', fontVariantNumeric: 'tabular-nums' }}>{value ?? '—'}</span>
      </div>
    )
    const yesNo = v => v === true ? T('نعم', 'Yes') : v === false ? T('لا', 'No') : '—'
    // المهن تُخزَّن كائنات {name, name_en, qty} — والصفوف القديمة نصوصاً مجرّدة
    const profList = a => (Array.isArray(a) ? a : []).map(x => {
      if (typeof x === 'string') return x
      const nmAr = lang === 'en' ? (x?.name_en || x?.name) : x?.name
      return nmAr ? nmAr + (n(x?.qty) ? ' × ' + nm(x.qty) : '') : ''
    }).filter(Boolean).join(' · ') || '—'
    const byLabel = v => v === 'mcc' ? T('على المكتب', 'By MCC') : T('على العميل', 'By the Client')
    const tblTh = { padding: '9px 12px', fontSize: 11, fontWeight: 600, color: 'var(--tx3)', textAlign: 'center', borderBottom: '1px solid var(--bd)', whiteSpace: 'nowrap' }
    const tblTd = { padding: '9px 12px', fontSize: 12.5, fontWeight: 500, color: 'var(--tx1)', textAlign: 'center', borderBottom: '1px solid var(--bd)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }
    const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft
    const qs = QUOTE_STATUS[r.status] || QUOTE_STATUS.draft
    /* الأرقام حيّة قبل الاعتماد (تتبع بطاقة الأسعار)، ومجمَّدة بعده (لقطة الاعتماد)
       — فلا يتغيّر ربحُ عرضٍ اعتُمد لأن سعر البطاقة تحرّك بعده. */
    const ec = quoteEconomics(r, rateCard)
    const frozen = r.status === 'approved' && r.snap_monthly_profit != null
    const eco = frozen
      ? { ...ec, revenue: n(r.snap_monthly_revenue), cost: n(r.snap_monthly_cost), profit: n(r.snap_monthly_profit),
          margin: n(r.snap_monthly_revenue) ? n(r.snap_monthly_profit) / n(r.snap_monthly_revenue) : 0,
          partnerCut: n(r.snap_monthly_profit) > 0 ? n(r.snap_monthly_profit) * (n(r.partner_share_pct) / 100) : 0 }
      : ec
    eco.netOwn = eco.profit - eco.partnerCut

    return (
      <div style={{ fontFamily: F, paddingBottom: 80, direction: dir }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <BackButton onClick={() => setDetailsRow(null)} label={T('رجوع', 'Back')} isAr={dir === 'rtl'} />
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--tx)' }}>{r.client_name}</div>
          <span style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 600, color: C.gold, direction: 'ltr' }}>{r.quote_no}</span>
          {/* شارة القرار سقطت مع حاسبة الجدوى — محلّها طريقة التسعير، وهي ما
              يُقرأ به الجدول كلّه (سعر ساعة أم متر أم مقطوعية). */}
          <MpBadge st={{ ar: methodLabel(r.pricing_method, 'ar'), en: methodLabel(r.pricing_method, 'en'), c: C.gold }} lang={lang} />
          <MpBadge st={qs} lang={lang} />
          <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* الاعتماد أوّلاً — وهو الشرط الذي يُظهر الطباعة */}
            {canApprove && r.status !== 'approved' && <button onClick={() => setStatus(r, 'approved')} className="btn-primary-modal"
              style={{ height: 36, padding: '0 14px', borderRadius: 10, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <BadgeCheck size={14} strokeWidth={2.2} />{T('اعتماد التسعيرة', 'Approve quote')}</button>}
            {canPrint && r.status === 'approved' && <>
              <button onClick={() => doPrint(r, 'ar')} className="btn-primary-modal"
                style={{ height: 36, padding: '0 14px', borderRadius: 10, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <Printer size={14} strokeWidth={2.2} />{T('طباعة — عربي', 'Print — Arabic')}</button>
              <button onClick={() => doPrint(r, 'en')}
                style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid ' + C.gold + '80', background: 'transparent', color: C.gold, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <Printer size={14} strokeWidth={2.2} />{T('طباعة — إنجليزي', 'Print — English')}</button>
            </>}
            {canApprove && r.status === 'approved' && <button onClick={() => setStatus(r, 'draft')}
              style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid var(--bd)', background: 'transparent', color: 'var(--tx3)', fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
              {T('إرجاع لمسودّة', 'Revert to draft')}</button>}
            {canEdit(r) && r.status !== 'approved' && <button onClick={() => { setEditRow(r); setShowModal(true) }} style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px dashed ' + C.gold + '80', background: 'transparent', color: C.gold, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Pencil size={13} />{T('تعديل', 'Edit')}</button>}
            {canDelete && r.status !== 'approved' && <button onClick={() => setDelRow(r)} style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid var(--bd)', background: 'transparent', color: '#e5534b', fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Trash2 size={13} />{T('حذف', 'Delete')}</button>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
          {cardVisible(user, 'manpower_calc', 'client') && <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} /><span style={cardTitle}>{T('العميل والطلب', 'Client & Request')}</span></div>
            <div style={{ padding: '16px 22px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {cell(T('اسم العميل / المنشأة', 'Client'), r.client_name)}
              {cell(T('بالإنجليزي', 'English name'), r.client_name_en)}
              {cell(T('الموقع / المدينة', 'Location'), r.client_location)}
              {cell(T('المسؤول', 'Attn'), r.attn_name)}
              {cell(T('الجوال', 'Mobile'), r.client_phone)}
              {cell(T('تاريخ المباشرة', 'Start date'), fmtD(r.start_date))}
              {cell(T('المكتب', 'Branch'), branchLabel(r.branch_id))}
              {cell(T('صلاحية العرض', 'Validity'), (r.validity_days || 5) + ' ' + T('يوم', 'days'))}
            </div>
          </div>}

          {cardVisible(user, 'manpower_calc', 'work') && <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} /><span style={cardTitle}>{T('تفاصيل العمل', 'Work Details')}</span></div>
            <div style={{ padding: '16px 22px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {cell(T('وصف العمل', 'Description'), r.work_description, { full: true })}
              {cell(T('المهن المطلوبة', 'Required trades'), profList(r.professions), { full: true })}
              {cell(T('طريقة التسعير', 'Pricing method'), methodLabel(r.pricing_method, lang))}
              {r.pricing_method === 'hour' && cell(T('ساعات اليوم', 'Hours/day'), nm(r.hours_per_day))}
              {(r.pricing_method === 'hour' || r.pricing_method === 'day') && cell(T('أيام الشهر', 'Days/month'), nm(r.days_per_month))}
              {cell(T('الغرفة التجارية', 'Chamber'), yesNo(r.chamber))}
              {cell(T('أجير', 'Ajeer'), yesNo(r.ajeer))}
              {cell(T('على كفالة واحدة', 'Single sponsor'), yesNo(r.single_sponsor))}
              {cell(T('السكن', 'Accommodation'), byLabel(r.housing_by))}
              {cell(T('المواصلات', 'Transport'), byLabel(r.transport_by))}
              {cell(T('الأكل', 'Food'), byLabel(r.food_by))}
              {cell(T('أدوات السلامة', 'Safety equipment'), byLabel(r.safety_by))}
              {cell(T('أدوات العمل', 'Work tools'), byLabel(r.tools_by))}
              {cell(T('شروط الدفع', 'Payment terms'), paymentTermsLabel(r.payment_terms_key, lang), { full: true })}
            </div>
          </div>}

          {cardVisible(user, 'manpower_calc', 'revenue') && <div style={{ ...cardChrome, gridColumn: '1 / -1' }}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#27a046' }} /><span style={cardTitle}>{T('بنود عرض السعر', 'Quoted Items')}</span></div>
            <div style={{ padding: '10px 22px 16px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={tblTh}>{T('البند', 'Item')}</th><th style={tblTh}>{T('بالإنجليزي', 'English')}</th>
                  <th style={tblTh}>{T('طريقة التسعير', 'Basis')}</th><th style={tblTh}>{T('سعر الوحدة', 'Rate')}</th>
                </tr></thead>
                <tbody>
                  {(r.revenue_lines || []).map((l, i) => <tr key={i}>
                    <td style={{ ...tblTd, textAlign: 'start' }}>{l.item || '—'}</td>
                    <td style={{ ...tblTd, textAlign: 'start', direction: 'ltr' }}>{l.item_en || '—'}</td>
                    <td style={tblTd}>{methodLabel(l.method, lang)}</td>
                    <td style={{ ...tblTd, color: C.gold, fontWeight: 600 }}>{nm(l.unit_price)}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '0 22px 16px', display: 'flex', gap: 14, fontSize: 11, color: 'var(--tx4)', flexWrap: 'wrap' }}>
              <span>{T('أنشأها', 'Created by')}: <b style={{ color: 'var(--tx2)' }}>{usersById[r.created_by] || '—'}</b></span>
              <span>{T('بتاريخ', 'On')}: <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtD(r.created_at)}</span></span>
            </div>
          </div>}

          {/* ── الربح والخسارة ───────────────────────────────────────────────
              التكلفة لا تُدخَل يدوياً: تُقرأ من بطاقة الأسعار (تكلفة الساعة)
              مقابل السعر المعروض هنا. فكلّ تسعيرةٍ تعرف ربحها لحظة كتابتها،
              بلا جدول تكلفةٍ يملؤه الموظف ويُخطئ فيه. */}
          {canProfit && cardVisible(user, 'manpower_calc', 'pnl') && <div style={{ ...cardChrome, gridColumn: '1 / -1' }}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: eco.profit >= 0 ? '#27a046' : '#e5534b' }} />
              <span style={cardTitle}>{T('الربح والخسارة — المتوقَّع', 'Profit & Loss — Expected')}</span>
              <span style={{ marginInlineStart: 'auto', fontSize: 10.5, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
                background: frozen ? '#27a04616' : 'var(--bd2)', color: frozen ? '#27a046' : 'var(--tx4)' }}>
                {frozen ? T('مجمَّد عند الاعتماد', 'Frozen at approval') : T('حيّ — يتبع بطاقة الأسعار', 'Live — follows the rate card')}
              </span>
            </div>

            <div style={{ padding: '16px 22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
              {cell(T('الإيراد الشهري المتوقَّع', 'Expected monthly revenue'), nm(eco.revenue), { color: '#27a046' })}
              {cell(T('التكلفة الشهرية المتوقَّعة', 'Expected monthly cost'), nm(eco.cost), { color: '#e5867a' })}
              {cell(T('صافي الربح الشهري', 'Monthly net profit'), nm(eco.profit), { color: eco.profit >= 0 ? '#27a046' : '#e5534b' })}
              {cell(T('هامش الربح', 'Margin'), (eco.margin * 100).toFixed(1) + '%', { color: eco.margin >= .25 ? '#27a046' : eco.margin >= .15 ? '#d99f2b' : '#e5534b' })}
              {cell(T('الربح السنوي المتوقَّع', 'Expected annual profit'), nm(eco.profit * 12), { color: C.gold })}
              {cell(T('الربح لكل عامل / شهر', 'Profit per worker / month'), nm(n(r.workers_total) ? eco.profit / n(r.workers_total) : 0))}
            </div>

            {/* الشريك: حصّته تُقتطع من صافي الربح، والباقي للمكتب */}
            <div style={{ padding: '0 22px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.gold }}>{T('الشريك', 'Partner')}</span>
                <span style={{ flex: 1, height: 1, background: 'var(--bd)' }} />
                {canEdit(r) && <button onClick={() => setPartnerRow(r)}
                  style={{ height: 28, padding: '0 12px', borderRadius: 8, border: '1px dashed ' + C.gold + '80', background: 'transparent', color: C.gold, fontFamily: F, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
                  {r.partner_name ? T('تعديل الشريك', 'Edit partner') : T('إضافة شريك', 'Add partner')}</button>}
              </div>
              {r.partner_name ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
                  {cell(T('اسم الشريك', 'Partner'), r.partner_name)}
                  {cell(T('حصته من الربح', 'Profit share'), nm(r.partner_share_pct) + '%')}
                  {cell(T('نصيب الشريك / شهر', 'Partner share / month'), nm(eco.partnerCut), { color: C.blue })}
                  {cell(T('صافي المكتب / شهر', 'Office net / month'), nm(eco.netOwn), { color: eco.netOwn >= 0 ? '#27a046' : '#e5534b' })}
                  {cell(T('نصيب الشريك / سنة', 'Partner share / year'), nm(eco.partnerCut * 12), { color: C.blue })}
                  {cell(T('صافي المكتب / سنة', 'Office net / year'), nm(eco.netOwn * 12), { color: C.gold })}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--tx4)' }}>{T('لا شريك في هذه التسعيرة — كامل الربح للمكتب.', 'No partner on this quote — the office keeps the full profit.')}</div>
              )}
            </div>

            {/* تفصيل البند: أين يُصنع الربح وأين يُفقد */}
            <div style={{ padding: '0 22px 16px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={tblTh}>{T('المهنة', 'Trade')}</th><th style={tblTh}>{T('العدد', 'Qty')}</th>
                  <th style={tblTh}>{T('تكلفة الوحدة', 'Unit cost')}</th><th style={tblTh}>{T('سعر البيع', 'Sell price')}</th>
                  <th style={tblTh}>{T('الإيراد الشهري', 'Monthly revenue')}</th><th style={tblTh}>{T('التكلفة الشهرية', 'Monthly cost')}</th>
                  <th style={tblTh}>{T('الربح', 'Profit')}</th><th style={tblTh}>{T('الهامش', 'Margin')}</th>
                </tr></thead>
                <tbody>
                  {ec.lines.map((l, i) => {
                    const mg = l.revenue && l.profit != null ? l.profit / l.revenue : null
                    return (
                      <tr key={i}>
                        <td style={{ ...tblTd, textAlign: 'start' }}>{l.item || l.item_en || '—'}</td>
                        <td style={tblTd}>{nm(l.qty)}</td>
                        <td style={{ ...tblTd, color: '#e5867a' }}>{l.unitCost == null ? '—' : nm(l.unitCost)}</td>
                        <td style={{ ...tblTd, color: C.gold }}>{nm(l.unit_price)}</td>
                        <td style={{ ...tblTd, color: '#27a046' }}>{nm(l.revenue)}</td>
                        <td style={{ ...tblTd, color: '#e5867a' }}>{l.cost == null ? '—' : nm(l.cost)}</td>
                        <td style={{ ...tblTd, fontWeight: 600, color: l.profit == null ? 'var(--tx4)' : l.profit >= 0 ? '#27a046' : '#e5534b' }}>{l.profit == null ? '—' : nm(l.profit)}</td>
                        <td style={{ ...tblTd, color: mg == null ? 'var(--tx4)' : mg >= .25 ? '#27a046' : mg >= .15 ? '#d99f2b' : '#e5534b' }}>{mg == null ? '—' : (mg * 100).toFixed(1) + '%'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {ec.unknownRevenue > 0 && (
                <div style={{ marginTop: 10, fontSize: 11.5, color: '#d99f2b', lineHeight: 1.7 }}>
                  {T('⚠ بنودٌ بقيمة ' + nm(ec.unknownRevenue) + ' ريال لا تُعرف تكلفتها من بطاقة الأسعار (تسعير بالمتر أو مقطوعية) — فربحها غير محسوب، والأرقام أعلاه تخصّ ما عداها.',
                    '⚠ Items worth SAR ' + nm(ec.unknownRevenue) + ' have no cost in the rate card (per-meter or lump sum) — their profit is not computed, and the figures above cover the rest.')}
                </div>
              )}
            </div>

            {/* ── الجدوى والمخاطر ─────────────────────────────────────────────
                إنذاراتٌ تُقرأ قبل الاعتماد: هامشٌ ضعيف، التزاماتٌ غير مسعَّرة،
                فجوة تحصيل (الرواتب شهرية والتحصيل آجل)، وسعر إضافيٍّ يبيع
                الساعة بأقل من أجرها. ثم سيناريوهات الدوام: الربح إن غاب 5٪
                أو 10٪ من ساعات العمل المفترضة. */}
            {(() => {
              const PAY_DAYS = { net15: 15, net30: 30, early_disc: 15, advance_25: 0, on_delivery: 0 }
              const days = PAY_DAYS[r.payment_terms_key] ?? 30
              const flags = []
              if (eco.revenue > 0 && eco.margin < 0) flags.push({ c: '#e5534b', t: T('التسعيرة خاسرة — التكلفة أعلى من الإيراد. لا تعتمدها قبل رفع الأسعار.', 'This quote loses money — cost exceeds revenue. Do not approve before raising the rates.') })
              else if (eco.revenue > 0 && eco.margin < .15) flags.push({ c: '#d99f2b', t: T('هامش الربح أدنى من 15٪ — راجع الأسعار أو التكاليف قبل الاعتماد.', 'Margin is below 15% — review rates or costs before approval.') })
              const oblig = [[T('السكن', 'accommodation'), r.housing_by], [T('المواصلات', 'transport'), r.transport_by], [T('الأكل', 'food'), r.food_by], [T('أدوات السلامة', 'PPE'), r.safety_by], [T('أدوات العمل', 'tools'), r.tools_by]].filter(([, v]) => v === 'mcc').map(([k]) => k)
              if (oblig.length) flags.push({ c: '#d99f2b', t: T('التزاماتٌ على المكتب (' + oblig.join('، ') + ') — تأكد أن تكلفتها محمَّلة في تكلفة الساعة وإلا أكلت الهامش.', 'Obligations on MCC (' + oblig.join(', ') + ') — make sure their cost is loaded into the hourly cost, or they will eat the margin.') })
              if (eco.cost > 0) flags.push({ c: days >= 30 ? '#d99f2b' : 'var(--tx3)', t: T('فجوة تحصيل: الرواتب تُدفع شهرياً والتحصيل بعد ' + days + ' يوماً من الفوترة — رأس مالٍ عامل مطلوب ≈ ' + nm(eco.cost * (days + 30) / 30) + ' ريال.', 'Cash gap: salaries are paid monthly while collection lands ' + days + ' days after invoicing — working capital needed ≈ SAR ' + nm(eco.cost * (days + 30) / 30) + '.') })
              const badOt = (Array.isArray(r.professions) ? r.professions : []).map(p => rateCard.find(c => c.position_ar === (typeof p === 'string' ? p : p?.name))).filter(c => c && n(c.ot_billing_rate) > 0 && n(c.ot_wage_rate) > 0 && n(c.ot_billing_rate) < n(c.ot_wage_rate))
              if (badOt.length) flags.push({ c: '#e5534b', t: T('سعر الساعة الإضافية في البطاقة أدنى من أجرها للمهن: ' + badOt.map(c => c.position_ar).join('، ') + ' — كل ساعة إضافية خسارة مباشرة.', 'The card OT billing rate is below the OT wage for: ' + badOt.map(c => c.position_en || c.position_ar).join(', ') + ' — every OT hour is a direct loss.') })
              const scen = [[T('دوام كامل', 'Full attendance'), 1], [T('غياب 5٪', '5% absence'), .95], [T('غياب 10٪', '10% absence'), .90]]
              return (
                <div style={{ padding: '0 22px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.gold }}>{T('الجدوى والمخاطر', 'Feasibility & Risks')}</span>
                    <span style={{ flex: 1, height: 1, background: 'var(--bd)' }} />
                  </div>
                  {flags.length ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                      {flags.map((x, i) => (
                        <div key={i} style={{ fontSize: 12, lineHeight: 1.8, color: x.c, display: 'flex', gap: 8, alignItems: 'baseline' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: x.c, flexShrink: 0, transform: 'translateY(-2px)' }} />
                          <span>{x.t}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#27a046', marginBottom: 12 }}>{T('لا مخاطر بارزة في هذه التسعيرة وفق بطاقة الأسعار وشروطها.', 'No notable risks in this quote per the rate card and its terms.')}</div>
                  )}
                  {eco.revenue > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
                      {scen.map(([l, k], i) => (
                        <div key={i} style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                          <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{T('صافي الربح — ', 'Net profit — ') + l}</span>
                          <span style={{ fontSize: 13.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: eco.profit * k >= 0 ? '#27a046' : '#e5534b' }}>{nm(eco.profit * k)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: 8, fontSize: 10.5, color: 'var(--tx4)', lineHeight: 1.7 }}>
                    {T('سيناريوهات الغياب تفترض أن الإيراد والأجور يتحركان معاً مع ساعات العمل الفعلية.', 'Absence scenarios assume revenue and wages both scale with actual worked hours.')}
                  </div>
                </div>
              )
            })()}
          </div>}
        </div>

        {showModal && <ManpowerQuoteModal sb={sb} T={T} lang={lang} user={user} branches={branches} cities={cities} rateCard={rateCard} editRow={editRow}
          onClose={() => { setShowModal(false); setEditRow(null) }} onSaved={load} onOpen={openSaved} />}
        {partnerRow && <PartnerModal sb={sb} T={T} lang={lang} row={partnerRow}
          onClose={() => setPartnerRow(null)} onSaved={load} toast={toast} />}
        <ConfirmDialog open={!!delRow} danger lang={lang}
          title={T('حذف التسعيرة', 'Delete quote')} itemName={delRow?.quote_no}
          message={T('سيتم حذف التسعيرة نهائياً. هل أنت متأكد؟', 'The quote will be permanently deleted. Are you sure?')}
          onCancel={() => setDelRow(null)}
          onConfirm={async () => { const { error } = await sb.from('manpower_quotes').delete().eq('id', delRow.id); setDelRow(null); if (error) toast?.(T('تعذّر الحذف: ', 'Delete failed: ') + error.message); else { toast?.(T('تم حذف التسعيرة', 'Quote deleted')); setDetailsRow(null); load() } }} />
      </div>
    )
  }

  /* ═══════════════ القائمة ═══════════════ */
  const thisMonth = new Date().toISOString().slice(0, 7)
  const stats = [
    { l: T('إجمالي التسعيرات', 'Total quotes'), v: rows.length, c: C.gold },
    { l: T('هذا الشهر', 'This month'), v: rows.filter(r => String(r.created_at || '').slice(0, 7) === thisMonth).length, c: '#27a046' },
    { l: T('معتمدة', 'Approved'), v: rows.filter(r => r.status === 'approved').length, c: '#27a046' },
    { l: T('إجمالي العمال المطلوبين', 'Workers requested'), v: rows.reduce((t, r) => t + n(r.workers_total), 0), c: C.blue },
  ]
  const shown = rows.filter(r => mpMatch(q, [r.quote_no, r.client_name, r.client_name_en, r.client_location, branchLabel(r.branch_id)]))
  const th = { padding: '11px 14px', fontSize: 11.5, fontWeight: 600, color: 'var(--tx3)', textAlign: 'start', borderBottom: '1px solid var(--bd)', whiteSpace: 'nowrap' }
  const td = { padding: '12px 14px', fontSize: 13, fontWeight: 500, color: 'var(--tx1)', borderBottom: '1px solid var(--bd)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }

  return (
    <div style={{ fontFamily: F, paddingBottom: 80, direction: dir }}>
      {header}
      <MpStats stats={stats} dir={dir} />
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <MpSearch value={q} onChange={setQ} placeholder={T('ابحث برقم التسعيرة أو العميل أو المدينة…', 'Search by quote no., client or city…')} />
      </div>

      {!shown.length ? (
        <EmptyState icon={emptyIcon || <Users size={22} color={C.gold} />} title={T('لا توجد تسعيرات بعد', 'No quotes yet')}
          desc={canCreate ? T('ابدأ بإنشاء أول تسعيرة توريد عمالة من الزر أعلاه', 'Create your first manpower quote from the button above') : T('لم تُنشأ أي تسعيرة توريد عمالة بعد', 'No manpower quotes have been created yet')} />
      ) : (
        <div style={{ background: 'var(--card-grad2)', border: '1px solid var(--bd)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={th}>{T('رقم التسعيرة', 'Quote no.')}</th>
                <th style={th}>{T('العميل', 'Client')}</th>
                <th style={th}>{T('المدينة', 'City')}</th>
                <th style={th}>{T('المكتب', 'Branch')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('العمال', 'Workers')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('طريقة التسعير', 'Basis')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('البنود', 'Items')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('الحالة', 'Status')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('التاريخ', 'Date')}</th>
                <th style={{ ...th, textAlign: 'center' }}></th>
              </tr></thead>
              <tbody>
                {shown.map(r => {
                  return (
                    <tr key={r.id} onClick={() => setDetailsRow(r)} style={{ cursor: 'pointer', transition: 'background .12s' }} {...mpRowHover}>
                      <td style={{ ...td, fontFamily: 'monospace', color: C.gold, direction: 'ltr', textAlign: dir === 'rtl' ? 'right' : 'left' }}>{r.quote_no}</td>
                      <td style={{ ...td, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.client_name}</td>
                      <td style={td}>{r.client_location || '—'}</td>
                      <td style={td}>{branchLabel(r.branch_id)}</td>
                      <td style={{ ...td, textAlign: 'center' }}>{nm(r.workers_total)}</td>
                      <td style={{ ...td, textAlign: 'center' }}>{methodLabel(r.pricing_method, lang)}</td>
                      <td style={{ ...td, textAlign: 'center' }}>{nm((r.revenue_lines || []).length)}</td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <MpBadge st={QUOTE_STATUS[r.status] || QUOTE_STATUS.draft} lang={lang} />
                      </td>
                      <td style={{ ...td, textAlign: 'center', color: 'var(--tx3)' }}>{fmtD(r.created_at)}</td>
                      <td style={{ ...td, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        {canPrint && r.status === 'approved' && <button onClick={() => doPrint(r, lang === 'en' ? 'en' : 'ar')} title={T('طباعة عرض السعر', 'Print quotation')}
                          style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--bd)', background: 'transparent', color: C.gold, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Printer size={14} /></button>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && <ManpowerQuoteModal sb={sb} T={T} lang={lang} user={user} branches={branches} cities={cities} rateCard={rateCard} editRow={editRow}
        onClose={() => { setShowModal(false); setEditRow(null) }} onSaved={load} onOpen={openSaved} />}
    </div>
  )
}
