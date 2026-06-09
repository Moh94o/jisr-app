/* ════════════════════════════════════════════════════════════════════════
   FormKitShowcase — معرض حيّ لكل أشكال الحقول والنوافذ في الفورمات الموحّد.
   افتحه من زر داخل الموقع لتشوف كل عنصر شغّال وتنسخ منه ما تبي.
   هذا الملف للعرض فقط — المرجع الفعلي هو FormKit.jsx.
   ════════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react'
import { LayoutGrid, User, Calendar, ToggleLeft, CheckSquare, Hash, Save, Trash2, Ruler, Paperclip, Table, Palette, Clock, Eye, Bell, Building2, Phone, IdCard } from 'lucide-react'
import {
  F, C, Modal, ModalSection, ScrollBox, ActionButton, GRID, FULL,
  TextField, NumberField, CurrencyField, PhoneField, IdField, TextArea, FileField,
  Select, MultiSelect, DateField, Switch, Segmented, YesNo, Checkbox,
  RadioGroup, Stepper, ColorField, TimeField, InfoRow, InfoGrid, Toast,
  SuccessScreen, SuccessView, ConfirmDialog, Flag, fmtDateLong, fmtTime12, countWords,
  TS, FW, IS, IST, H, R, SP, W,
} from './FormKit.jsx'

/* ── لوحة مرجع نظام التصميم: خطوط / أوزان / أيقونات / ألوان / أحجام ── */
const RefRow = ({ name, val, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,.18)' }}>
    <code style={{ fontSize: 11, fontWeight: 600, color: C.gold, fontFamily: 'monospace', minWidth: 90, textAlign: 'start', direction: 'ltr' }}>{name}</code>
    <span style={{ fontSize: 10, fontWeight: 600, color: C.tx5, minWidth: 36, direction: 'ltr', textAlign: 'start' }}>{val}</span>
    <div style={{ flex: 1, textAlign: 'start' }}>{children}</div>
  </div>
)

function DesignSystemPanel() {
  const sample = 'جسر Jisr 123'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* أحجام الخطوط */}
      <div style={{ fontSize: 11, fontWeight: 600, color: C.gold, marginBottom: 2 }}>أحجام الخطوط — TS</div>
      {Object.entries(TS).map(([k, v]) => (
        <RefRow key={k} name={`TS.${k}`} val={`${v}px`}>
          <span style={{ fontSize: v, fontWeight: FW.semibold, color: C.tx }}>{sample}</span>
        </RefRow>
      ))}
      {/* أوزان الخط */}
      <div style={{ fontSize: 11, fontWeight: 600, color: C.gold, margin: '8px 0 2px' }}>أوزان الخط — FW</div>
      {Object.entries(FW).map(([k, v]) => (
        <RefRow key={k} name={`FW.${k}`} val={v}>
          <span style={{ fontSize: TS.body, fontWeight: v, color: C.tx }}>{sample} — {k}</span>
        </RefRow>
      ))}
      {/* أحجام الأيقونات */}
      <div style={{ fontSize: 11, fontWeight: 600, color: C.gold, margin: '8px 0 2px' }}>أحجام الأيقونات — IS</div>
      {Object.entries(IS).map(([k, v]) => (
        <RefRow key={k} name={`IS.${k}`} val={`${v}px`}>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            <User size={v} strokeWidth={IST.bold} color={C.gold} />
          </span>
        </RefRow>
      ))}
      {/* الارتفاعات والحواف */}
      <div style={{ fontSize: 11, fontWeight: 600, color: C.gold, margin: '8px 0 2px' }}>الارتفاعات — H · الحواف — R</div>
      <RefRow name="H.field" val={`${H.field}px`}><div style={{ height: H.field, borderRadius: R.field, background: C.inputBg, boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)' }} /></RefRow>
      <RefRow name="H.actionBtn" val={`${H.actionBtn}px`}><div style={{ height: H.actionBtn, width: 120, borderRadius: R.btn, background: 'rgba(212,160,23,.12)', border: `1px solid ${C.gold}40` }} /></RefRow>
      <RefRow name="R.modal" val={`${R.modal}px`}><div style={{ height: 28, width: 60, borderRadius: R.modal, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }} /></RefRow>
      <RefRow name="R.section" val={`${R.section}px`}><div style={{ height: 28, width: 60, borderRadius: R.section, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }} /></RefRow>
      {/* الألوان */}
      <div style={{ fontSize: 11, fontWeight: 600, color: C.gold, margin: '8px 0 2px' }}>الألوان — C</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[['gold', C.gold], ['ok', C.ok], ['red', C.red], ['blue', C.blue], ['modal', C.modal], ['inputBg', '#2b2b2b'], ['tx', '#ededed'], ['tx3', '#8c8c8c']].map(([k, hex]) => (
          <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 52, height: 40, borderRadius: 8, background: hex, border: '1px solid rgba(255,255,255,.1)' }} />
            <code style={{ fontSize: 9, fontWeight: 600, color: C.tx3, fontFamily: 'monospace' }}>C.{k}</code>
          </div>
        ))}
      </div>
    </div>
  )
}

const COUNTRIES = [
  { id: 'sa', code: 'SA', label: 'السعودية' },
  { id: 'pk', code: 'PK', label: 'باكستان' },
  { id: 'in', code: 'IN', label: 'الهند' },
  { id: 'eg', code: 'EG', label: 'مصر' },
  { id: 'ye', code: 'YE', label: 'اليمن' },
  { id: 'bd', code: 'BD', label: 'بنغلاديش' },
]
const SERVICES = [
  { id: 'visa', label: 'تأشيرة' }, { id: 'iqama', label: 'إقامة' },
  { id: 'transfer', label: 'نقل كفالة' }, { id: 'permit', label: 'رخصة عمل' },
]

// القيم الابتدائية — تُستعاد عند إغلاق النافذة بزر X
const INITIAL = {
  text: '', ar: '', en: '', num: '', money: '', phone: '', idn: '',
  note: '', country: null, services: [], date: '', sw: true, seg: 'b',
  yn: true, chk: false, radio: 'r2', count: 2, file: null,
  color: '#D4A017', time: '09:30',
}

// جدول السداد (مثال للاستثناء: هذا القسم وحده يتمرّر داخلياً، النافذة لا)
const SCHEDULE = [
  { n: 1, date: '2026-07-01', amount: '2,500.00', status: 'مدفوع' },
  { n: 2, date: '2026-08-01', amount: '2,500.00', status: 'مدفوع' },
  { n: 3, date: '2026-09-01', amount: '2,500.00', status: 'مستحق' },
  { n: 4, date: '2026-10-01', amount: '2,500.00', status: 'قادم' },
  { n: 5, date: '2026-11-01', amount: '2,500.00', status: 'قادم' },
  { n: 6, date: '2026-12-01', amount: '2,500.00', status: 'قادم' },
  { n: 7, date: '2027-01-01', amount: '2,500.00', status: 'قادم' },
  { n: 8, date: '2027-02-01', amount: '2,500.00', status: 'قادم' },
]
const STATUS_CLR = { 'مدفوع': C.ok, 'مستحق': C.gold, 'قادم': C.tx4 }

export default function FormKitShowcase({ open, onClose }) {
  const [f, setF] = useState(INITIAL)
  const [touched, setTouched] = useState({})   // الحقول التي لمسها المستخدم — الخطأ لا يظهر إلا بعد اللمس
  const set = (k, v) => { setF(p => ({ ...p, [k]: v })); setTouched(t => (t[k] ? t : { ...t, [k]: true })) }
  const [success, setSuccess] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [toast, setToast] = useState(null)   // {type, message}
  const [variant, setVariant] = useState('create')   // لون النافذة الأساسي

  // الإغلاق: تفريغ كل الحقول للوضع الابتدائي ثم الإغلاق
  const handleClose = () => { setF(INITIAL); setTouched({}); setSuccess(false); setConfirm(false); onClose?.() }

  if (!open) return null

  // نجاح وهمي للعرض — يُعرض داخل النافذة عبر خاصية success (نفس ما تستخدمه كل النوافذ)
  if (success) {
    return <Modal open onClose={handleClose} variant={variant} width={560}
      success={<SuccessView title="تمت العملية بنجاح" subtitle="شاشة النجاح الموحّدة لكل النوافذ المنبثقة"
        code="DMM10" codeSub="المنطقة الشرقية · الدمام · حي الشاطئ الغربي" />} />
  }

  // صلاحية كل صفحة — "التالي/الحفظ" معطّل حتى تُملأ الحقول الإلزامية
  const page1Valid = countWords(f.ar) >= 2 && !!f.money && f.phone.length === 9 && f.idn.length === 10
  const page2Valid = !!f.country && /^\d{4}-\d{2}-\d{2}$/.test(f.date)
  // الخطأ في التذييل يظهر فقط بعد ما المستخدم يلمس حقلاً في الصفحة
  const page1Touched = ['ar', 'money', 'phone', 'idn'].some(k => touched[k])
  const page2Touched = ['country', 'date'].some(k => touched[k])

  const pages = [
    // ── صفحة 1: الحقول النصية والرقمية ──
    {
      title: 'البيانات الأساسية',
      valid: page1Valid,
      error: (page1Valid || !page1Touched) ? '' : 'أكمل الحقول الإلزامية (*) للمتابعة',
      content: (
        <>
          <ModalSection Icon={Palette} label="نمط النافذة" hint="اللون الأساسي حسب نوع العملية">
            <Segmented value={variant} onChange={setVariant} full
              options={[{ v: 'create', l: 'إنشاء', c: C.gold }, { v: 'edit', l: 'تعديل', c: '#36a8e6' }, { v: 'delete', l: 'حذف', c: C.red }, { v: 'add', l: 'إضافة', c: C.ok }]} />
          </ModalSection>
          <ModalSection Icon={User} label="حقول نصية" hint="نص / عربي / إنجليزي">
            <div style={GRID}>
              <TextField label="نص عام" value={f.text} onChange={v => set('text', v)} placeholder="اكتب أي شيء" />
              <TextField label="عربي فقط" req filter="ar" error={touched.ar && countWords(f.ar) < 2} value={f.ar} onChange={v => set('ar', v)} placeholder="محمد أحمد الغامدي" />
              <TextField label="إنجليزي فقط (Caps)" filter="en" upper dir="ltr" value={f.en} onChange={v => set('en', v)} placeholder="MOHAMMED AHMED" />
            </div>
          </ModalSection>
          <ModalSection Icon={Hash} label="حقول رقمية" hint="رقم / مبلغ / جوال / هوية / عدّاد">
            <div style={GRID}>
              <NumberField label="رقم (0–100)" value={f.num} onChange={v => set('num', v)} min={0} max={100} placeholder="50" />
              <CurrencyField label="مبلغ" req error={touched.money && !f.money} value={f.money} onChange={v => set('money', v)} />
              <PhoneField label="رقم الجوال" req error={touched.phone && f.phone.length !== 9} value={f.phone} onChange={v => set('phone', v)} />
              <IdField label="رقم الإقامة" req error={touched.idn && f.idn.length !== 10} prefix="2" value={f.idn} onChange={v => set('idn', v)} hint="يبدأ بـ 2" />
              <Stepper label="العدد" value={f.count} onChange={v => set('count', v)} min={0} max={10} />
            </div>
          </ModalSection>
        </>
      ),
    },
    // ── صفحة 2: قوائم وتاريخ وخيارات ──
    {
      title: 'القوائم والخيارات',
      valid: page2Valid,
      error: (page2Valid || !page2Touched) ? '' : 'اختر الجنسية والتاريخ للمتابعة',
      content: (
        <>
          <ModalSection Icon={Calendar} label="قوائم منسدلة وتاريخ" hint="اختيار واحد / متعدّد / تقويم">
            <div style={GRID}>
              <Select label="الجنسية (مع علم + بحث)" req error={touched.country && !f.country} placeholder="اختر الجنسية..."
                value={f.country} onChange={v => set('country', v)} options={COUNTRIES}
                getKey={o => o.id} getLabel={o => o.label}
                renderSelected={o => <>{o.label} <Flag code={o.code} size={16} /></>}
                renderCell={(o, sel) => (
                  <span style={{ fontSize: 14, fontWeight: 600, color: sel ? C.gold : 'rgba(255,255,255,.92)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {o.label} <Flag code={o.code} size={16} />
                  </span>
                )} />
              <MultiSelect label="الخدمات (اختيار متعدّد)" placeholder="اختر الخدمات..."
                value={f.services} onChange={v => set('services', v)} options={SERVICES}
                getKey={o => o.id} getLabel={o => o.label} searchable={false} />
              <DateField label="التاريخ" req error={touched.date && !/^\d{4}-\d{2}-\d{2}$/.test(f.date)} hint="yyyy-mm-dd" value={f.date} onChange={v => set('date', v)} />
              <div>
                <div style={{ fontSize: TS.label, fontWeight: 600, color: C.tx3, marginBottom: 6 }}>عرض التاريخ المختار</div>
                <div style={{ height: 42, borderRadius: 9, background: C.inputBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: f.date ? C.gold : C.tx5 }}>
                  {f.date ? fmtDateLong(f.date) : '— لم يُختر بعد —'}
                </div>
              </div>
            </div>
          </ModalSection>
          <ModalSection Icon={ToggleLeft} label="خيارات وتبديل" hint="مفتاح / مقسّم / نعم-لا">
            <div style={GRID}>
              <Switch label="تفعيل الإشعارات" hint="إيقاف/تشغيل" checked={f.sw} onChange={v => set('sw', v)} />
              <Segmented label="الحالة" value={f.seg} onChange={v => set('seg', v)}
                options={[{ v: 'a', l: 'جديد', c: C.blue }, { v: 'b', l: 'نشط', c: C.ok }, { v: 'c', l: 'موقوف', c: C.red }]} />
              <YesNo label="هل العامل سعودي؟" value={f.yn} onChange={v => set('yn', v)} />
            </div>
          </ModalSection>
        </>
      ),
    },
    // ── صفحة 3: مربعات الاختيار + إرفاق ملف ──
    {
      title: 'الاختيارات والمرفقات',
      valid: true,
      content: (
        <>
          <ModalSection Icon={CheckSquare} label="مربعات الاختيار" hint="checkbox / radio">
            <div style={GRID}>
              <RadioGroup label="نوع العقد" value={f.radio} onChange={v => set('radio', v)}
                options={[{ v: 'r1', l: 'سنوي' }, { v: 'r2', l: 'مؤقت' }, { v: 'r3', l: 'موسمي' }]} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
                <Checkbox label="أوافق على الشروط والأحكام" checked={f.chk} onChange={v => set('chk', v)} />
                <Checkbox label="إرسال نسخة بالبريد" checked={!f.chk} onChange={v => set('chk', !v)} />
              </div>
            </div>
          </ModalSection>
          <ModalSection Icon={Paperclip} label="إرفاق ملف" hint="سحب وإفلات أو اختيار">
            <FileField label="المرفق (اختياري)" value={f.file} onChange={v => set('file', v)} />
          </ModalSection>
        </>
      ),
    },
    // ── صفحة جديدة: لون / وقت / عرض للقراءة / إشعار ──
    {
      title: 'لون · وقت · عرض · إشعار',
      valid: true,
      content: (
        <>
          <ModalSection Icon={Palette} label="لون ووقت" hint="مُنتقي لون + مُنتقي وقت">
            <div style={GRID}>
              <ColorField label="لون الفرع" value={f.color} onChange={v => set('color', v)} hint="لوحة + مخصّص" />
              <TimeField label="وقت الدوام" value={f.time} onChange={v => set('time', v)} hint="HH:MM" />
              <div>
                <div style={{ fontSize: TS.label, fontWeight: 600, color: C.tx3, marginBottom: 6 }}>القيم المختارة</div>
                <div style={{ height: 42, borderRadius: 9, background: C.inputBg, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 13, fontWeight: 600 }}>
                  <span style={{ width: 16, height: 16, borderRadius: 5, background: f.color }} />
                  <span style={{ color: C.gold, direction: 'ltr' }}>{f.color}</span>
                  <span style={{ color: C.tx4 }}>·</span>
                  <span style={{ color: C.gold }}>{f.time ? fmtTime12(f.time) : '—'}</span>
                </div>
              </div>
            </div>
          </ModalSection>
          <ModalSection Icon={Eye} label="صفوف عرض (للقراءة فقط)" hint="InfoRow · InfoGrid — للوحات التفاصيل">
            <InfoGrid>
              <InfoRow label="الاسم" value="محمد أحمد الغامدي" Icon={User} />
              <InfoRow label="الجوال" value="+966 55 123 4567" Icon={Phone} mono copy />
              <InfoRow label="رقم الإقامة" value="2412345678" Icon={IdCard} mono copy />
              <InfoRow label="الفرع" value="الدمام — حي الشاطئ" Icon={Building2} color={C.ok} />
            </InfoGrid>
          </ModalSection>
          <ModalSection Icon={Bell} label="إشعار عائم (Toast)" hint="success / error / info / delete">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {[['success', 'نجاح', C.ok], ['error', 'خطأ', C.red], ['info', 'معلومة', C.blue], ['delete', 'حذف', C.red]].map(([t, l, c]) => (
                <button key={t} type="button" onClick={() => setToast({ type: t, message: `هذا إشعار من نوع ${l}` })}
                  style={{ height: 36, padding: '0 16px', borderRadius: 9, border: `1px solid ${c}40`, background: c + '14', color: c, fontFamily: F, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{l}</button>
              ))}
            </div>
          </ModalSection>
        </>
      ),
    },
    // ── صفحة 4: جدول السداد (استثناء التمرير الداخلي — القسم وحده يتمرّر) ──
    {
      title: 'جدول السداد',
      valid: true,
      content: (
        <ModalSection Icon={Table} label="جدول السداد" hint="هذا القسم وحده يتمرّر — النافذة ثابتة">
          <ScrollBox maxHeight={280} style={{ paddingLeft: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: F }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, background: C.modal }}>
                  {[['#', 'center'], ['تاريخ الاستحقاق', 'right'], ['المبلغ', 'right'], ['الحالة', 'left']].map(([h, al]) => (
                    <th key={h} style={{ padding: '8px 12px', fontSize: 12, fontWeight: 600, color: C.tx4, textAlign: al, borderBottom: `1px solid ${C.line}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SCHEDULE.map(r => (
                  <tr key={r.n}>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: C.tx4, textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,.03)' }}>{r.n}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: C.tx2, direction: 'ltr', textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,.03)' }}>{r.date}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: C.tx, borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                      <span style={{ display: 'flex', direction: 'ltr', alignItems: 'baseline', justifyContent: 'flex-end', gap: 4 }}>
                        <span style={{ fontSize: 11, color: C.gold }}>ريال</span>
                        <span>{r.amount}</span>
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: STATUS_CLR[r.status], background: STATUS_CLR[r.status] + '1a', padding: '3px 10px', borderRadius: 6 }}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollBox>
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
            <ActionButton variant="ghost" Icon={Trash2} dir="fwd" onClick={() => setConfirm(true)}>تجربة نافذة الحذف</ActionButton>
          </div>
        </ModalSection>
      ),
    },
    // ── صفحة 5: مرجع نظام التصميم (طويل → يتمرّر داخلياً كاستثناء) ──
    {
      title: 'نظام التصميم',
      valid: true,
      content: (
        <ModalSection Icon={Ruler} label="نظام التصميم" hint="خطوط / أوزان / أيقونات / ألوان / أحجام">
          <ScrollBox maxHeight={370} style={{ paddingLeft: 10 }}>
            <DesignSystemPanel />
          </ScrollBox>
        </ModalSection>
      ),
    },
  ]

  return (
    <>
      <Modal
        open
        onClose={handleClose}
        title="معرض الفورمات"
        Icon={LayoutGrid}
        width={760}
        variant={variant}
        pages={pages}
        onSubmit={() => { setSuccess(true); setTimeout(() => { handleClose() }, 1800) }}
      />

      <ConfirmDialog
        open={confirm}
        onCancel={() => setConfirm(false)}
        onConfirm={() => setConfirm(false)}
        title="تأكيد الحذف"
        message="هل أنت متأكد من حذف هذا العنصر؟"
        itemName="عنصر تجريبي"
      />

      <Toast open={!!toast} type={toast?.type} message={toast?.message} onClose={() => setToast(null)} />
    </>
  )
}
