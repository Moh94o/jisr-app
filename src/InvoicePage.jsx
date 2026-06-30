import React, { useEffect, useMemo, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import BackButton from './components/BackButton'
import { can as canPerm, isGM, cardVisible, canCardBtn, tabOffices, tabServiceTypes, statsMode, fieldVisible, fieldEditable, modalAllowed, canTabBranch } from './lib/permissions.js'
import { ALL_SERVICES, SVC_CODE_MAP } from './ServiceRequestPage.jsx'
import { noDash, clientEditChanges } from './lib/utils.js'
import { OFFICE_LOGO_SVG } from './lib/officeBrand.js'
import { Modal, SuccessView, EmptyState, ModalSection, InfoRow, InfoGrid, GRID, FULL, CurrencyField, Segmented, TextField, TextArea, IdField, PhoneField, DateField, Select as FKSelect, Dropdown as FKDropdown, FileField, Checkbox, C as FKC, useFKLang } from './components/ui/FormKit.jsx'
import { Plus, RotateCcw, Ban, Printer, Info, Wallet, FileText, Landmark, Building2, User, Search, CheckCircle2, Circle, CreditCard, Briefcase, Calendar, CalendarRange, BadgeCheck, Hash, Phone, Globe, Link2, MessageSquare, Paperclip } from 'lucide-react'
import { Stepper as FKStepper } from './components/ui/FormKit.jsx'
import { Shimmer } from './components/ui/Skeleton.jsx'
import { TXN_SERVICES } from './pages/txnServices.js'
import { buildInvoiceDoc } from './lib/invoicePrint.js'
import { buildInvoiceWaMessage, fetchInvoicePrintData } from './lib/invoiceWa.js'
import { DONE_INPUTS, SALARY_RETURN_INPUTS, SELF_PARTY_DONE_SVCS, DONE_FILE_NOTES, doneInputsFor } from './lib/doneInputs.js'

const F = "'Cairo','Tajawal',sans-serif"
const C = {
  gold: '#D4A017', goldSoft: '#e8c77a',
  blue: '#5dade2', purple: '#bb8fce', cyan: '#16a085', orange: '#f39c12', gray: '#95a5a6',
  ok: '#2ecc71', warn: '#eab308', red: '#e87265',
}
const PAGE = 60

const num = (v) => Number(v || 0).toLocaleString('en-US')
// تعدّد كلمة «تأشيرة» عربياً: الأعداد 3–10 جمعٌ «تأشيرات»، وما عداها مفرد «تأشيرة». (الإنجليزية: 1 مفرد، غير ذلك جمع)
const visaWord = (n, T) => T((n >= 3 && n <= 10) ? 'تأشيرات' : 'تأشيرة', n === 1 ? 'visa' : 'visas')
const flagEmoji = (code) => { if (!code || code.length !== 2) return ''; try { return String.fromCodePoint(...[...code.toUpperCase()].map(c => c.charCodeAt(0) + 127397)) } catch { return '' } }
const fmtGreg = (iso, ar = true) => {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${yyyy}-${mm}-${dd}`
  } catch { return '—' }
}
const fmtPhone = (phone) => {
  if (!phone) return phone
  const s = String(phone).replace(/[^\d]/g, '')
  if (s.startsWith('966') && s.length === 12) return '0' + s.slice(3)
  return s
}
const fmtDateTime = (iso, ar = true) => {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    const hh = String(d.getHours()).padStart(2, '0')
    const mn = String(d.getMinutes()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd} · ${hh}:${mn}`
  } catch { return '—' }
}
const fmtShort = (iso) => {
  if (!iso) return '—'
  try { const d = new Date(iso); const y = d.getFullYear() % 100; return String(d.getDate()).padStart(2,'0') + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(y).padStart(2,'0') } catch { return '—' }
}

// Business "day" boundary = 05:00 AM Riyadh (UTC+3) = 02:00 UTC.
// Times before 05:00 Riyadh count as the previous business day.
const riyadhDayStart = () => {
  const now = new Date()
  const ry = new Date(now.getTime() + 3 * 3600 * 1000)
  const Y = ry.getUTCFullYear(), M = ry.getUTCMonth(), D = ry.getUTCDate(), H = ry.getUTCHours()
  const offset = H < 5 ? -1 : 0
  return new Date(Date.UTC(Y, M, D + offset, 2, 0, 0))
}

const SVC_THEME = {
  work_visa:           { c: C.blue,   bg: 'rgba(93,173,226,.12)',  bd: 'rgba(93,173,226,.32)',  label_ar: 'تأشيرة عمل',     label_en: 'Work Visa' },
  work_visa_permanent: { c: C.blue,   bg: 'rgba(93,173,226,.12)',  bd: 'rgba(93,173,226,.32)',  label_ar: 'تأشيرة وإقامة دائمة',   label_en: 'Permanent Visa & Iqama', label_ar_full: 'تأشيرة وإقامة دائمة', label_en_full: 'Permanent Visa & Iqama' },
  work_visa_temporary: { c: '#85c1e9',bg: 'rgba(133,193,233,.12)', bd: 'rgba(133,193,233,.32)', label_ar: 'تأشيرة وإقامة مؤقتة',   label_en: 'Temporary Visa & Iqama', label_ar_full: 'تأشيرة وإقامة مؤقتة', label_en_full: 'Temporary Visa & Iqama' },
  iqama_issuance: { c: '#27ae60',bg: 'rgba(39,174,96,.12)',   bd: 'rgba(39,174,96,.32)',   label_ar: 'إصدار إقامة',    label_en: 'Iqama Issuance' },
  exit_reentry_visa: { c: '#5dade2',bg: 'rgba(93,173,226,.12)', bd: 'rgba(93,173,226,.32)', label_ar: 'خروج وعودة', label_en: 'Exit / Re-entry Visa' },
  transfer:       { c: C.orange, bg: 'rgba(243,156,18,.12)',  bd: 'rgba(243,156,18,.32)',  label_ar: 'نقل كفالة',      label_en: 'Transfer' },
  iqama_renewal:  { c: C.cyan,   bg: 'rgba(22,160,133,.12)',  bd: 'rgba(22,160,133,.32)',  label_ar: 'تجديد الإقامة',  label_en: 'Iqama Renewal' },
  ajeer:          { c: C.purple, bg: 'rgba(187,143,206,.12)', bd: 'rgba(187,143,206,.32)', label_ar: 'عقد أجير',       label_en: 'Ajeer Contract' },
  other:          { c: C.gold,   bg: 'rgba(212,160,23,.12)',  bd: 'rgba(212,160,23,.32)',  label_ar: 'الغرفة التجارية', label_en: 'Chamber' },
  general:        { c: C.gray,   bg: 'rgba(149,165,166,.12)', bd: 'rgba(149,165,166,.32)', label_ar: 'خدمة عامة',     label_en: 'General Service' },
}
// Resolve a service's display theme. Codes with an explicit entry above keep their short label/color;
// every other service (تأمين طبي، تغيير المهنة، خروج وعودة…) shows its REAL name from the lookup —
// never a generic "خدمات أخرى" bucket, which is only a navigation grouping in the new-invoice wizard.
const svcThemeFor = (st) => {
  const t = st?.code && SVC_THEME[st.code]
  if (t) return t
  return { ...SVC_THEME.general, label_ar: st?.value_ar || 'خدمة', label_en: st?.value_en || st?.value_ar || 'Service' }
}
// Permanent/temporary work-visa share the same application table, detail fields and icon as the legacy work_visa.
const VISA_SVC_CODES = new Set(['work_visa', 'work_visa_permanent', 'work_visa_temporary'])
const baseSvcCode = (code) => (VISA_SVC_CODES.has(code) ? 'work_visa' : code)
// خدمات «الفاتورة الصفرية» المبسّطة — طلب بلا تسعير/دفع، تأخذ نفس معاملة صفحة التفاصيل والكرت والطباعة
// (رواتب سبلاير، المستندات). تُخفى الكروت المالية/التسعير/الدفع وزر الإلغاء، وتظهر كتلة حالة المعاملة.
const ZERO_INVOICE_SVCS = new Set(['supplier_payroll', 'documents', 'external_transfer_approval'])
const isZeroSvc = (code) => ZERO_INVOICE_SVCS.has(baseSvcCode(code))
// خدمات تمرّ على بوّابة «موافقة المحاسب» قبل الإنجاز (النقل الخارجي · خروج وعودة · خروج نهائي) — من سجل الخدمات.
const needsAcctApproval = (code) => !!TXN_SERVICES[baseSvcCode(code)]?.needs_accountant_approval

const INV_STATUS_THEME = {
  new:        { c: C.blue,   stamp_ar: 'جديدة',           stamp_en: 'NEW' },
  active:     { c: C.gold,   stamp_ar: 'نشطة',            stamp_en: 'ACTIVE' },
  fully_paid: { c: C.ok,     stamp_ar: 'مدفوعة بالكامل',  stamp_en: 'PAID' },
  cancelled:  { c: C.red,    stamp_ar: 'ملغية',           stamp_en: 'CANCELLED' },
}
// Compute synthetic status from amounts when status_id is missing or generic
const inferPayState = (inv) => {
  const total = Number(inv.total_amount || 0)
  const paid  = Number(inv.paid_amount || 0)
  if (total <= 0)              return 'unpaid'
  if (paid <= 0)               return 'unpaid'
  if (paid >= total)           return 'paid'
  return 'partial'
}
const PAY_THEME = {
  paid:    { c: C.ok,   stamp_ar: 'مسدّدة',     stamp_en: 'PAID' },
  partial: { c: C.gold, stamp_ar: 'جزئي',        stamp_en: 'PARTIAL' },
  unpaid:  { c: C.red,  stamp_ar: 'غير مسدّدة',  stamp_en: 'UNPAID' },
}

const SVC_ICON = {
  work_visa:     <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h4M14 14h4"/></svg>,
  transfer:      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>,
  ajeer:         <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  iqama_renewal: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>,
  other:         <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01"/></svg>,
  // تأمين طبي — قلب نبض
  medical_insurance: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/></svg>,
  // تغيير المهنة — حقيبة عمل
  profession_change: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  // تعديل الراتب — عملات
  name_translation: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/></svg>,
  // خروج وعودة — طائرة
  exit_reentry_visa: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>,
  // خروج نهائي — باب وسهم خروج
  final_exit_visa: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4h-4v16h4"/><polyline points="18 8 22 12 18 16"/><line x1="22" y1="12" x2="10" y2="12"/></svg>,
  // طباعة الإقامة — طابعة
  iqama_print: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  // إصدار إقامة — بطاقة هوية
  iqama_issuance: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M15 9h3M15 13h3M7 15h4"/></svg>,
  // تجديد جواز — جواز سفر
  passport_update: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="10" r="2.5"/><path d="M9 16h6"/></svg>,
  // مستندات — ملف
  documents: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  // رواتب سبلاير — أوراق نقدية
  supplier_payroll: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>,
  // النقل الخارجي — سهم خروج
  external_transfer_approval: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  // التوطين — علم
  saudization: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  // ناجز/وكالة — ميزان
  najiz_wakala: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 16 3-8 3 8c-2 1.5-4 1.5-6 0"/><path d="m2 16 3-8 3 8c-2 1.5-4 1.5-6 0"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>,
  // تحديث رواتب التأمينات — أوراق نقدية
  gosi_salary_update: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M5 12h.01M19 12h.01"/></svg>,
  // مدد/حماية الأجور — تحويل أموال
  wps_mudad: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4Z"/></svg>,
  // فاتورة زاتكا — إيصال
  zatca: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>,
  // رسوم مخالفة — تنبيه
  violation_fee: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  // كشف حساب — رسم بياني
  financial_statement: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>,
  // تجديد اشتراك — تقويم
  subscription_renewal: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  general:       <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>,
}

/* ═════════════ Invoice card ═════════════
   Classic frame (amount block + divider + progress strip) on the left, and a
   right-side client column: name + flag, then the invoice no above the phone,
   in a labelled 2-column grid (ID, phone, branch, service).
   `S` is the compact spacing / type-scale preset chosen for this card. */
const CARD_S = { pad: '18px 34px', colGap: 16, amountW: 168, stack: 9, name: 14.5, inv: 12, flag: 24, gCol: 16, gRow: 10, cell: 4, lblSize: 10.5, lblColor: 'var(--tx4)', lblSpace: '.2px', lblUpper: 'none', valSize: 12.5, valColor: 'var(--tx2)', valWeight: 600, total: 30, totalLbl: 16, pay: 11.5, date: 11 }
// ── Loading skeleton — mirrors the stat cards + invoice card layout exactly so
//    the page loads without any shift when the real data arrives. ──
function InvoiceSkeleton({ listRows = 8 }) {
  const shimmer = {
    display: 'inline-block', borderRadius: 6,
    background: 'linear-gradient(90deg, var(--sk-base) 25%, var(--sk-hi) 37%, var(--sk-base) 63%)',
    backgroundSize: '400% 100%', animation: 'inv-shimmer 1.4s ease infinite',
  }
  const bar = (w, h = 11, r = 6) => <span style={{ ...shimmer, width: w, height: h, borderRadius: r }} />
  const card = { borderRadius: 16, background: 'var(--card-grad2)', border: '1px solid var(--bd)', boxShadow: 'var(--shadow-md)', minHeight: 190 }
  return (
    <div className="inv-sk">
      <style>{`@keyframes inv-shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
.inv-sk{--sk-base:rgba(140,115,70,.17);--sk-hi:rgba(140,115,70,.05)}
html[data-theme=dark] .inv-sk{--sk-base:rgba(255,255,255,.05);--sk-hi:rgba(255,255,255,.12)}`}</style>
      {/* بطاقات الإحصاء — نفس تخطيط الصفحة (نقدًا · جانبية · الخدمات) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 1.5fr', gap: 14, marginBottom: 24 }}>
        {/* نقدًا */}
        <div style={{ ...card, padding: '18px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>{bar(10, 10, 999)}{bar('30%', 22)}</div>
          {bar('55%', 40)}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--bd)' }}>{bar('30%', 10)}{bar('12%', 12)}</div>
        </div>
        {/* جانبية — مؤشّران */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
          {[0, 1].map(i => (
            <div key={i} style={{ flex: 1, padding: '12px 16px', borderTop: i ? '1px solid var(--bd)' : 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
              {bar('60%', 11)}{bar('35%', 18)}
            </div>
          ))}
        </div>
        {/* الخدمات */}
        <div style={{ ...card, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>{bar('40%', 11)}{bar('20%', 11)}</div>
          {bar('100%', 8, 999)}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px 16px', marginTop: 2 }}>
            {Array.from({ length: 6 }).map((_, i) => <span key={i} style={{ display: 'flex', gap: 7, alignItems: 'center' }}>{bar(14, 10)}{bar('70%', 10)}</span>)}
          </div>
        </div>
      </div>
      {/* صفوف الفواتير — بنفس حجم وتخطيط كرت الفاتورة الحقيقي */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Array.from({ length: listRows }).map((_, i) => (
          <div key={i} style={{ borderRadius: 18, background: 'var(--card-grad2)', border: '1px solid var(--bd)', boxShadow: 'var(--shadow-lg)', padding: '12px 18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `1fr 1px ${CARD_S.amountW}px`, gap: 16, alignItems: 'center' }}>
              {/* العمود اليمين — اسم + شبكة الحقول */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{bar('34%', 14)}{bar(24, 16, 3)}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '9px 16px' }}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>{bar('45%', 8)}{bar('72%', 11)}</div>
                  ))}
                </div>
              </div>
              {/* فاصل */}
              <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--bd)', minHeight: 60 }} />
              {/* كتلة المبلغ */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>{bar('40%', 11)}{bar('30%', 20)}</div>
                {bar('100%', 6, 999)}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>{bar('35%', 9)}{bar('35%', 9)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// بطاقة الخط الزمني لمراحل المعاملة — تظهر عند المرور على تاق الحالة في كرت الفاتورة.
// stages: [{ label, state: 'done'|'awaiting'|'cancelled'|'skipped' }]
const STAGE_TIP_META = {
  done:      { c: C.ok,   ico: <polyline points="20 6 9 17 4 12" /> },
  awaiting:  { c: C.blue, ico: <><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></> },
  cancelled: { c: C.red,  ico: <><circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" /></> },
  skipped:   { c: C.gold, ico: <><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></> },
}
const stageTipText = (T, st) => st === 'done' ? T('تم الإصدار', 'Issued') : st === 'cancelled' ? T('ملغاة', 'Cancelled') : st === 'skipped' ? T('لا يحتاج', 'Not needed') : T('بانتظار الإصدار', 'Awaiting issuance')
const StageTimelineTip = ({ title, stages, T }) => { const { dir } = useFKLang(); return (
  <div style={{ width: 196, background: 'linear-gradient(#2a2a2a,#222)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '9px 11px', boxShadow: '0 8px 24px rgba(0,0,0,.5)', fontFamily: F, direction: dir }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: C.gold }}>{title}</span>
      <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.06)' }} />
    </div>
    <div style={{ position: 'relative', paddingInlineStart: 5 }}>
      <div style={{ position: 'absolute', insetInlineStart: 7, top: 7, bottom: 7, width: 1.5, background: 'rgba(255,255,255,.08)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {(stages || []).map((s, i) => {
          const m = STAGE_TIP_META[s.state] || STAGE_TIP_META.awaiting
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
              <span style={{ width: 16, height: 16, borderRadius: '50%', background: m.c, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10240f" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">{m.ico}</svg>
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,.9)', flex: 1 }}>{s.label}</span>
              <span style={{ fontSize: 9.5, fontWeight: 600, color: m.c }}>{stageTipText(T, s.state)}</span>
            </div>
          )
        })}
      </div>
    </div>
  </div>
) }

function InvCard({ d, row, sb, T, isAr, toast, onClick }) {
  const S = CARD_S
  // ── إجراءات الكرت: نسخ رسالة الواتساب (نفس صيغة القروب) + طباعة الفاتورة ──
  const [waCopied, setWaCopied] = useState(false)
  const [printing, setPrinting] = useState(false)
  const copyWa = e => {
    e.stopPropagation()
    try {
      navigator.clipboard?.writeText(buildInvoiceWaMessage(row, d.dayMoney))
      setWaCopied(true); setTimeout(() => setWaCopied(false), 1500)
      toast?.(T('تم نسخ رسالة الواتساب', 'WhatsApp message copied'))
    } catch { toast?.(T('تعذّر النسخ', 'Copy failed')) }
  }
  const doPrint = async e => {
    e.stopPropagation()
    if (printing || !sb || !row) return
    setPrinting(true)
    try { const data = await fetchInvoicePrintData(sb, row); printInvoice(row, data, 'ar') }
    catch { toast?.(T('تعذّرت الطباعة', 'Print failed')) }
    finally { setPrinting(false) }
  }
  // أيقونتان صغيرتان: واتساب (أخضر) + طباعة (ذهبي). تُحقن في الفراغ القائم دون تغيير ارتفاع الكرت إطلاقاً.
  const ActBtn = ({ title, onClick: oc, color, busy, children }) => (
    <button title={title} onClick={oc} disabled={busy}
      style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid var(--bd)', background: 'var(--inputBg)', color, cursor: busy ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: '.15s', flexShrink: 0, opacity: busy ? .5 : 1, padding: 0 }}
      onMouseEnter={ev => { if (busy) return; ev.currentTarget.style.background = color + '1f'; ev.currentTarget.style.borderColor = color + '66' }}
      onMouseLeave={ev => { ev.currentTarget.style.background = 'var(--inputBg)'; ev.currentTarget.style.borderColor = 'var(--bd)' }}>
      {children}
    </button>
  )
  const WaIco = <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.358.101 11.892c0 2.096.549 4.142 1.595 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.582 0 11.943-5.358 11.945-11.893a11.821 11.821 0 00-3.418-8.45"/></svg>
  const PrintIco = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
  const cardActions = (vertical) => (
    <div style={{ display: 'inline-flex', flexDirection: vertical ? 'column' : 'row', gap: 7, flexShrink: 0 }}>
      <ActBtn title={T('نسخ رسالة الواتساب', 'Copy WhatsApp message')} onClick={copyWa} color={waCopied ? C.ok : '#25D366'}>
        {waCopied ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : WaIco}
      </ActBtn>
      <ActBtn title={T('طباعة الفاتورة', 'Print invoice')} onClick={doPrint} color={C.gold} busy={printing}>{PrintIco}</ActBtn>
    </div>
  )
  // ── حالة المعاملة الموحَّدة — مصدر واحد يقود تاق الكرت + لون الحدود عند المرور + البوتوم بار ──
  // (تشمل الحالات الوسطى للموافقة على النقل الخارجي: انتظار/موافقة/رفض المحاسب)
  const reqCode = d.reqStatusCode
  // تأشيرة العمل الدائمة: إصدار الإقامة لكل التأشيرات = منجزة، حتى لو لم تُحدَّث حالة الطلب لـ«done».
  const reqDone = reqCode === 'done' || d.permIqamaDone
  const _isExtCard = needsAcctApproval(d.svcCode)
  // ثلاث حالات لتأشيرة وإقامة دائمة: «جديد» (سماوي) → «قيد التنفيذ» بعد رقم الحدود (كهرماني) → «منجز» بعد رقم الإقامة (أخضر).
  // خدمات موافقة المحاسب (النقل الخارجي · خروج وعودة · خروج نهائي): حالات وسطى من موافقة المحاسب قبل الإنجاز/الإلغاء.
  const reqStage = reqCode === 'cancelled' ? 'cancelled'
    : reqDone ? 'done'
    : _isExtCard ? (d.acctStatus === 'rejected' ? 'acct_rejected' : d.acctStatus === 'approved' ? 'acct_approved' : 'awaiting_acct')
    : (d.permVisaIssued ? 'progress' : 'new')
  // لون كل حالة — مصدر اللون الموحَّد (تستهلكه STAGE_META أدناه أيضاً).
  const STAGE_C = { done: C.ok, progress: C.gold, new: C.blue, cancelled: C.red, acct_rejected: C.red, acct_approved: C.gold, awaiting_acct: C.blue }
  const isSP = isZeroSvc(d.svcCode)
  // الخدمات الصفرية (بلا عمود مالي): لون الكرت = لون حالة المعاملة، فيُطابق التاق في الـ hover والبوتوم بار.
  // غيرها: لون حالة السداد (أو أحمر إن ملغاة).
  const statusColor = isSP ? STAGE_C[reqStage] : (d.cancelled ? C.red : d.payT.c)
  const stopClick = e => e.stopPropagation()

  // ── Cancelled / refund corner ribbons — distinct colors so a glance tells them apart: cancelled = red, refund = orange ──
  const REFUND_COLOR = C.orange
  const isCancelled = d.cancelled
  const isRefund = d.refundedAmt > 0
  // مسدّدة تظهر لأي فاتورة سُدِّدت بالكامل (المتبقي = 0) وليست ملغاة — حتى لو جرى عليها استرجاع
  // (عندها يظهر لسانا «مسترد» + «مسدّدة» معًا)، لأن السداد الكامل حالة مستقلة عن الاسترجاع.
  const isPaid = !isCancelled && d.total > 0 && d.remaining <= 0
  // ── شارة الحالة — لسان عمودي على حافة الكرت يحمل الحالة (ملغاة/مسترد/مسدّدة) والمبلغ ──
  const statusList = []
  if (isCancelled) statusList.push({ color: C.red, label: T('ملغاة', 'VOID'), amount: d.paid })
  if (isRefund) statusList.push({ color: REFUND_COLOR, label: T('مسترد', 'REFUND'), amount: d.refundedAmt })
  if (isPaid) statusList.push({ color: C.ok, label: T('مدفوعة بالكامل', 'PAID IN FULL'), amount: d.paid })
  const statusTab = (st, i) => (
    <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, insetInlineEnd: i * 32, width: 30, background: st.color + '1f', borderInlineStart: '1px solid ' + st.color + '59', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3, pointerEvents: 'none' }}>
      <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', color: st.color, fontSize: 10.5, fontWeight: 800, letterSpacing: '.5px', display: 'inline-flex', alignItems: 'center', gap: 9, whiteSpace: 'nowrap' }}>
        <span>{st.label}</span>
        <span style={{ fontWeight: 900 }}>{num(st.amount)}</span>
      </span>
    </div>
  )

  const Flag = ({ s = S.flag }) => d.flagUrl
    ? <img src={d.flagUrl} alt={d.flagAlt} title={d.flagAlt} style={{ width: s, height: Math.round(s * 0.7), objectFit: 'cover', flexShrink: 0, borderRadius: 3 }} />
    : (d.flagEmojiChar ? <span title={d.flagAlt} style={{ fontSize: Math.round(s * 0.6), lineHeight: 1, flexShrink: 0 }}>{d.flagEmojiChar}</span> : null)

  const InvNo = ({ color = C.gold, size = S.inv }) => (
    <span style={{ fontSize: size, color, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {/* number on the right, copy icon on the left — matches the invoice-details copy (hover gold / click green, no toast). */}
      <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace', fontWeight: 700 }}>{noDash(d.invoiceNo)}</span>
      <CopyBtn text={noDash(d.invoiceNo)} />
    </span>
  )

  const Name = ({ size = S.name }) => (
    <span style={{ fontSize: size, fontWeight: 600, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, letterSpacing: '-.2px' }}>{d.name}</span>
  )

  const wrap = (extra) => ({
    position: 'relative', cursor: 'pointer', borderRadius: 18, overflow: 'hidden',
    opacity: d.cancelled ? .72 : 1, transition: 'all .15s',
    ...extra,
  })
  // Hover border follows the status color, except a still-unpaid card would glow red — swap that for the gold accent.
  const hoverColor = (!isSP && !d.cancelled && statusColor === C.red) ? C.gold : statusColor
  const hoverOn = e => { e.currentTarget.style.borderColor = hoverColor + '66' }
  const hoverOff = (col) => e => { e.currentTarget.style.borderColor = col }

  const baseBorder = d.cancelled ? 'rgba(232,114,101,.28)' : 'var(--bd)'

  // ── Field-label icons — sit next to the label, not the value ──
  const ICON = {
    id: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M15 8h2M15 12h2M7 16h10"/></svg>,
    phone: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    branch: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>,
    invoice: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/></svg>,
    date: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  }

  // ── Right-side client column — name + invoice on top, then labelled fields ──
  const valStyle = { fontSize: S.valSize, color: S.valColor, fontWeight: S.valWeight }
  const gcell = (icon, label, value) => value ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: S.cell, minWidth: 0, alignItems: 'flex-start' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: S.lblSize, color: S.lblColor, fontWeight: 600, letterSpacing: S.lblSpace, textTransform: S.lblUpper }}>{icon}{label}</span>
      <span style={{ display: 'inline-flex', minWidth: 0, maxWidth: '100%' }}>{value}</span>
    </div>
  ) : null
  // ── أيقونة إنجاز المعاملة بجانب الاسم — أخضر «منجز» / أزرق «قيد التنفيذ» ──
  // (لا تظهر للمعاملات الملغاة لأن لسان «ملغاة» يكفي، ولا للفواتير بدون معاملة مرتبطة)
  // تظهر لأي فاتورة لها معاملة مرتبطة — حتى الملغاة. (reqStage/STAGE_C محسوبة أعلى الكرت.)
  const showReqIcon = !!reqCode || d.permIqamaDone || d.permVisaIssued
  // ألوان الحالات من STAGE_C الموحَّد؛ هنا نضيف النص/العنوان فقط (مصدر واحد للون).
  const STAGE_META = {
    done: { c: STAGE_C.done, label: d.reqDoneLabel || T('منجز', 'Completed'), title: T('المعاملة منجزة', 'Completed'), done: true },
    progress: { c: STAGE_C.progress, label: T('قيد التنفيذ', 'In progress'), title: T('قيد التنفيذ', 'In progress'), done: true },
    new: { c: STAGE_C.new, label: T('جديد', 'New'), title: T('المعاملة لم تُنجز بعد', 'Not completed'), done: false },
    skipped: { c: C.gold, label: T('لا يحتاج', 'Not needed'), title: T('المرحلة غير مطلوبة', 'Stage not needed'), done: true },
    cancelled: { c: STAGE_C.cancelled, label: T('ملغاة', 'Cancelled'), title: T('المعاملة ملغاة', 'Cancelled'), done: false },
    acct_rejected: { c: STAGE_C.acct_rejected, label: T('مرفوض', 'Rejected'), title: T('تم الإلغاء من المحاسب', 'Rejected by accountant'), done: false },
    acct_approved: { c: STAGE_C.acct_approved, label: T('موافَق', 'Approved'), title: T('تمت الموافقة من المحاسب', 'Approved by accountant'), done: true },
    awaiting_acct: { c: STAGE_C.awaiting_acct, label: T('بانتظار المحاسب', 'Awaiting'), title: T('في انتظار موافقة المحاسب', 'Awaiting accountant approval'), done: false },
  }
  // أيقونة لكل حالة: «منجز» = صح، «قيد التنفيذ» = دائرة تحميل، «جديد» = ساعة.
  const stageIcon = (stage, c, sz) => (stage === 'done' || stage === 'acct_approved')
    ? <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
    : (stage === 'cancelled' || stage === 'acct_rejected')
    ? <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" /></svg>
    : stage === 'progress'
      ? <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a9 9 0 1 0 9 9" /><polyline points="12 7 12 12 15 14" /></svg>
      : stage === 'skipped'
        ? <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></svg>
      : <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></svg>
  // شارة حالة — بنفس تصميم صف المراحل المنجزة (StageRow): إطار جانبي ملوّن + خلفية خفيفة.
  // المتعددة (compact): رقم التأشيرة + أيقونة الحالة فقط (بلا اسم). المفردة: نقطة + اسم + أيقونة.
  // tip = { title, stages:[{label,state}] } → بطاقة خط زمني تظهر عند المرور (بدل التولتيب الافتراضي).
  const StatusTag = ({ stage, n, compact, tip }) => {
    const m = STAGE_META[stage] || STAGE_META.new
    const [pos, setPos] = useState(null)
    const onEnter = e => { if (!tip) return; const r = e.currentTarget.getBoundingClientRect(); const W = 196; setPos({ top: Math.round(r.bottom + 6), left: Math.round(Math.max(8, Math.min(r.right - W, window.innerWidth - W - 8))) }) }
    const onLeave = () => setPos(null)
    const fallbackTitle = tip ? undefined : (n != null ? `${T('تأشيرة', 'Visa')} ${n} — ${m.title}` : m.title)
    const inner = compact
      ? <>{n != null && <span style={{ fontWeight: 600, opacity: .8, fontSize: 10.5, fontVariantNumeric: 'tabular-nums' }}>{n}</span>}{stageIcon(stage, m.c, 11)}</>
      : stageIcon(stage, m.c, 15)
    const baseStyle = compact
      ? { display: 'inline-flex', alignItems: 'center', gap: 3, borderInlineStart: '3px solid ' + m.c, background: m.c + '10', padding: '3px 6px', color: m.c, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }
      : { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderInlineStart: '3px solid ' + m.c, background: m.c + '10', padding: '5px 11px', color: m.c, flexShrink: 0 }
    return (
      <span title={fallbackTitle} onMouseEnter={onEnter} onMouseLeave={onLeave} style={baseStyle}>
        {inner}
        {pos && tip && createPortal(
          <div style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 99999, pointerEvents: 'none' }}>
            <StageTimelineTip title={tip.title} stages={tip.stages} T={T} />
          </div>, document.body)}
      </span>
    )
  }
  // تعديل الراتب: تاقان منفصلان — (١) تعديل الراتب للراتب الجديد، (٢) إرجاع الراتب الأساسي.
  const isSalaryCard = baseSvcCode(d.svcCode) === 'name_translation'
  const salTag = (label, stage, color, title) => (
    <span title={title} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderInlineStart: '3px solid ' + color, background: color + '10', padding: '5px 11px', color, flexShrink: 0 }}>
      {stageIcon(stage, color, 15)}
    </span>
  )
  // تأشيرات متعددة → تاق لكل تأشيرة (مرقّم)؛ تعديل الراتب → تاقان للمرحلتين؛ وإلا تاق واحد للحالة المجمّعة.
  const reqTag = (Array.isArray(d.visaStages) && d.visaStages.length > 1) ? (
    <span style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
      {d.visaStages.map((s, i) => <StatusTag key={i} stage={s} n={i + 1} compact tip={d.visaStageTips?.[i]} />)}
    </span>
  ) : isSalaryCard ? (() => {
    const cancelled = reqCode === 'cancelled'
    const mod1Done = reqDone || d.salaryPhase === 'awaiting_return' || d.salaryPhase === 'returned'
    const returned = d.salaryPhase === 'returned'
    return (
      <span style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {salTag(T('تعديل الراتب', 'Salary edit'),
          cancelled ? 'cancelled' : mod1Done ? 'done' : 'new',
          cancelled ? C.red : mod1Done ? C.gold : C.blue,
          T('تعديل الراتب للراتب الجديد', 'Changed to new salary'))}
        {mod1Done && !cancelled && salTag(T('إرجاع الراتب', 'Salary return'),
          returned ? 'done' : 'new',
          returned ? C.ok : C.blue,
          returned ? T('تم إرجاع الراتب الأساسي', 'Base salary returned') : T('بانتظار إرجاع الراتب الأساسي', 'Awaiting base-salary return'))}
      </span>
    )
  })() : (Array.isArray(d.stageTags) && d.stageTags.length && reqCode !== 'cancelled') ? (() => {
    // نقل الكفالة وتجديد الإقامة: معاملة واحدة بعدّة مراحل → تاق واحد، وعند المرور يسرد كل المراحل وحالة كلٍّ.
    const sts = d.stageTags
    const overall = sts.every(s => s.stage === 'done' || s.stage === 'skipped') ? 'done'
      : sts.some(s => s.stage === 'done' || s.stage === 'skipped') ? 'progress'
      : 'new'
    const toState = st => st === 'done' ? 'done' : st === 'cancelled' ? 'cancelled' : st === 'skipped' ? 'skipped' : 'awaiting'
    const tip = { title: d.fullLabel, stages: sts.map(s => ({ label: s.full, state: toState(s.stage) })) }
    return <span style={{ marginInlineStart: 'auto', display: 'inline-flex' }}><StatusTag stage={overall} tip={tip} /></span>
  })() : showReqIcon ? (
    <span style={{ marginInlineStart: 'auto', display: 'inline-flex' }}><StatusTag stage={reqStage} tip={(d.isVisaCard && Array.isArray(d.visaStageTips) && d.visaStageTips.length === 1) ? d.visaStageTips[0] : { title: d.fullLabel, stages: [{ label: T('المعاملة', 'Transaction'), state: reqStage === 'done' || reqStage === 'acct_approved' ? 'done' : (reqStage === 'cancelled' || reqStage === 'acct_rejected') ? 'cancelled' : 'awaiting' }] }} /></span>
  ) : null

  const rightCol = (
    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: S.stack }}>
      {/* name + flag on top (flag after the name). تاق الحالة ينتقل لأعلى كتلة المبلغ للفواتير ذات العمود المالي؛
          أما الفواتير الصفرية (بلا عمود مالي) فيبقى التاق هنا بجانب الاسم. */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingInlineEnd: isSP ? 0 : 62 }}>
        <Name /><Flag />{isSP ? reqTag : null}
        {/* أزرار الإجراء (واتساب/طباعة) في صدر الكرت أعلى عمود «المكتب» — خارج التدفّق (absolute) فلا يتغيّر ارتفاع الكرت إطلاقاً. */}
        {!isSP && d.isToday && <div style={{ position: 'absolute', insetInlineEnd: 0, top: '50%', transform: 'translateY(-50%)' }}>{cardActions(false)}</div>}
      </div>
      {/* row 1: ID · phone · branch  ·  row 2: service · invoice no */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: `${S.gRow}px ${S.gCol}px` }}>
        {gcell(ICON.id, d.partyIdLabel, d.partyId && <span style={{ ...valStyle, direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>{d.partyId}</span>)}
        {gcell(ICON.phone, T('الجوال', 'Phone'), d.phone && <a href={`tel:${d.phone}`} onClick={stopClick} title={d.phone} style={{ ...valStyle, direction: 'ltr', textDecoration: 'none' }}>{d.phoneDisplay}</a>)}
        {gcell(ICON.branch, T('المكتب', 'Branch'), d.branchCode && <span style={valStyle}>{d.branchCode}</span>)}
        {/* «الإصدار» (تاريخ الفاتورة) قبل الخدمة — لكل الخدمات. */}
        {gcell(ICON.date, T('الإصدار', 'Issued'), <span style={{ ...valStyle, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{d.shortDate}</span>)}
        {gcell(d.svcIcon, T('الخدمة', 'Service'), <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: C.gold, fontSize: S.valSize, fontWeight: 600 }}>{d.showQty && <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>×{d.qty}</span>}<span>{d.fullLabel}</span></span>)}
        {gcell(ICON.invoice, T('رقم الفاتورة', 'Invoice no'), <InvNo />)}
      </div>
    </div>
  )

  // ── Fixed classic frame: right column · divider · amount block · progress strip ──
  return (
    <div onClick={onClick} className="inv-card" onMouseEnter={hoverOn} onMouseLeave={hoverOff(baseBorder)} style={wrap({
      background: 'var(--card-grad2)',
      border: '1px solid ' + baseBorder, boxShadow: 'var(--shadow-md)',
    })}>

      {/* شارة الحالة — لسان عمودي بحالة الفاتورة ومبلغها */}
      {statusList.map((st, i) => statusTab(st, i))}

      <div style={{ padding: S.pad, ...(statusList.length ? { paddingInlineEnd: 28 + statusList.length * 32 } : {}) }}>
        <div style={{ display: 'grid', gridTemplateColumns: isSP ? '1fr' : `1fr 1px ${S.amountW}px`, gap: S.colGap, alignItems: 'center' }}>
          {rightCol}
          {/* الخدمات الصفرية (رواتب سبلاير/المستندات): فاتورة صفرية — نُخفي العمود المالي (الإجمالي/المسدّد/المتبقي). */}
          {!isSP && (<>
          <div style={{ width: 1.5, alignSelf: 'stretch', background: 'linear-gradient(to bottom, transparent, rgba(212,160,23,.45), transparent)', minHeight: 60 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* تاقات حالة المعاملة أعلى كتلة المبلغ. */}
            {reqTag && <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: 24, alignItems: 'center' }}>{reqTag}</div>}
            {/* «الإجمالي» والمبلغ في صفّ واحد. */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: S.total, fontWeight: 700, color: C.gold, fontVariantNumeric: 'tabular-nums', direction: 'ltr', letterSpacing: '-.5px', lineHeight: 1 }}>{num(d.total)}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 6, borderTop: '1px solid var(--bd)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: S.pay }}>
                <span style={{ color: 'var(--tx2)', fontWeight: 600 }}>{T('المسدّد', 'Paid')}</span>
                <span style={{ color: d.paid > 0 ? C.ok : 'var(--tx)', fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{d.paid > 0 ? '+ ' + num(d.paid) : num(0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: S.pay }}>
                <span style={{ color: 'var(--tx2)', fontWeight: 600 }}>{T('المتبقي', 'Remaining')}</span>
                <span style={{ color: d.remaining > 0 ? C.red : 'var(--tx)', fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{d.remaining > 0 ? '− ' + num(d.remaining) : num(0)}</span>
              </div>
            </div>
          </div>
          </>)}
        </div>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,.05)' }}>
        <div style={{ height: '100%', width: (d.cancelled || isSP) ? '100%' : `${d.pct}%`, background: statusColor, transition: 'width .3s' }} />
      </div>
    </div>
  )
}

/* ─── Tiny bits ─── */
const Pill = ({ count, label, color, money }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 14px', borderRadius: 999,
    background: 'var(--inputBg)', border: '1px solid var(--bd)',
  }}>
    <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: '0 0 6px ' + color }} />
    <span style={{ fontSize: money ? 14 : 18, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', direction: 'ltr', lineHeight: 1 }}>{count}</span>
    <span style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 600 }}>{label}</span>
  </div>
)

const StatCard = ({ label, value, sub, color, sup }) => {
  const c = color || C.gold
  return (
    <div style={{
      minWidth: 0, minHeight: 130,
      padding: '14px 18px', borderRadius: 16,
      background: 'var(--card-grad2)',
      border: '1px solid var(--bd)',
      boxShadow: 'var(--shadow-md)',
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    }}>
      {/* Subtle top color accent */}
      <div style={{ position: 'absolute', top: 0, insetInlineStart: 0, insetInlineEnd: 0, height: 2, background: `linear-gradient(90deg, ${c}55, transparent 70%)` }} />
      {/* Faded watermark glow */}
      <div style={{ position: 'absolute', insetInlineStart: -40, top: -40, width: 110, height: 110, borderRadius: '50%', background: `radial-gradient(circle, ${c}12 0%, transparent 70%)`, pointerEvents: 'none' }} />

      {/* Top: label + glowing dot */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.1px' }}>{label}</div>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, boxShadow: `0 0 8px ${c}aa` }} />
      </div>

      {/* Big value — centered vertically in available space, right-aligned in RTL */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', justifyContent: 'flex-start', gap: 5, padding: '6px 0' }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: c, letterSpacing: '-1px', lineHeight: 1, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        {sup && <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>{sup}</span>}
      </div>

      {/* Bottom: divider + sub aligned right */}
      {sub && (
        <div style={{ position: 'relative', paddingTop: 8, borderTop: '1px solid var(--bd)', fontSize: 11, color: 'var(--tx3)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{sub}</span>
        </div>
      )}
    </div>
  )
}

function Sparkline({ points, width = 360, height = 90 }) {
  if (!points?.length) return null
  const max = Math.max(1, ...points)
  const W = width, H = height
  const px = i => (i / Math.max(1, points.length - 1)) * W
  const py = v => H - (v / max) * (H - 8) - 4
  const linePath = points.map((v, i) => (i === 0 ? 'M' : 'L') + px(i).toFixed(1) + ',' + py(v).toFixed(1)).join(' ')
  const areaPath = linePath + ` L${W},${H} L0,${H} Z`
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="inv-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.gold} stopOpacity="0.42" />
          <stop offset="100%" stopColor={C.gold} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#inv-spark-fill)" />
      <path d={linePath} stroke={C.gold} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={px(0)} cy={py(points[0])} r="3.5" fill={C.ok} stroke="#1a1a1a" strokeWidth="2" />
      <circle cx={px(points.length - 1)} cy={py(points[points.length - 1])} r="3.5" fill={C.gold} stroke="#1a1a1a" strokeWidth="2" />
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════════ */
// Full invoice row shape used by the list and by deep-link open-by-id.
const INVOICE_SELECT = `
        id, invoice_no, total_amount, paid_amount, remaining_amount, payment_plan, installments_count, pricing_breakdown, created_at, last_activity_at,
        note_public, note_log, pricing_log, payment_log, cancel_log, service_log,
        creator:created_by(person:person_id(name_ar,name_en)),
        payments(amount,is_valid,deleted_at,payment_date,payment_method:payment_method_id(value_ar,value_en)),
        service_type:service_type_id(code,value_ar,value_en),
        status:status_id(code,value_ar,value_en),
        branch:branch_id(id,branch_code,phone,city:city_id(name_ar)),
        agent:agent_id(id,name_ar,name_en,id_number,phone,nationality_id,edit_log,nationality:nationality_id(code,name_ar,flag_url)),
        transfer_calculation(transfer_only,stage_data,deleted_at),
        iqama_renewal_calculation(stage_data,deleted_at),
        service_request:service_request_id(
          id, request_ref_no, request_date, quantity, cancelled_reason, completion_note, completed_at, cancelled_at,
          accountant_status, accountant_note, accountant_at,
          completer:completed_by(person:person_id(name_ar,name_en)),
          canceller:cancelled_by(person:person_id(name_ar,name_en)),
          accountant:accountant_by(person:person_id(name_ar,name_en)),
          status:status_id(code,value_ar,value_en),
          client:client_id(id,name_ar,name_en,phone,id_number,nationality_id,edit_log,nationality:nationality_id(code,name_ar,flag_url)),
          visa_applications(id,border_number,visa_type:visa_type_id(code,value_ar,value_en),iqama_issuance_applications(id,deleted_at,iqama_number,stage_data)),
          transfer_applications(worker:worker_id(id,name_ar,name_en,phone,iqama_number,nationality:nationality_id(code,name_ar,flag_url)),facility:main_facility_id(id,name_ar,unified_number,hrsd_number,gosi_number)),
          ajeer_applications(worker:worker_id(id,name_ar,name_en,phone,iqama_number,nationality:nationality_id(code,name_ar,flag_url)),facility:main_facility_id(id,name_ar,unified_number,hrsd_number,gosi_number)),
          iqama_renewal_applications(worker:worker_id(id,name_ar,name_en,phone,iqama_number,nationality:nationality_id(code,name_ar,flag_url)),facility:worker_facility_id(id,name_ar,unified_number,hrsd_number,gosi_number)),
          other_applications(worker_phone,details,worker:worker_id(id,name_ar,name_en,phone,iqama_number,birth_date,nationality:nationality_id(code,name_ar,flag_url)),facility:worker_facility_id(id,name_ar,unified_number,hrsd_number,gosi_number)),
          supplier_payroll_applications(worker_phone,worker:worker_id(id,name_ar,name_en,phone,iqama_number,nationality:nationality_id(code,name_ar,flag_url)),facility:worker_facility_id(id,name_ar,unified_number,hrsd_number,gosi_number)),
          service_request_agents(agent:agent_id(id,name_ar,name_en,id_number,phone,nationality_id,edit_log,nationality:nationality_id(code,name_ar,flag_url)))
        )
      `
// ════════════════════════════════════════════════════════════════════
// StatsCards — لوحة الإحصاء أعلى صفحة الفواتير:
// بطل «نقدًا» + كرت جانبي (تحويلات/مرتجعة) + كرت الخدمات اليوم.
// النص يمين والأيقونة (بادج ملوّن) يسار، والتوهج في الجهة اليسرى.
// ════════════════════════════════════════════════════════════════════
const STATS_MAIN_SVC = ['work_visa_permanent', 'work_visa_temporary', 'transfer', 'iqama_renewal', 'ajeer', 'other']
const STATS_OTHER = '__other__'
const buildTodaySvcs = (svcToday) => {
  const map = Object.fromEntries((svcToday || []).map(s => [s.code, s]))
  const listed = STATS_MAIN_SVC.map(code => map[code] || { code, cnt: 0, sum: 0 })
  // كل خدمة غير مُدرجة أعلاه تتجمّع في دلو واحد «خدمات أخرى».
  const rest = (svcToday || []).filter(s => !STATS_MAIN_SVC.includes(s.code))
  return [...listed, {
    code: STATS_OTHER,
    cnt: rest.reduce((a, b) => a + (b.cnt || 0), 0),
    sum: rest.reduce((a, b) => a + (b.sum || 0), 0),
  }]
}
const statsSvcTheme = (code) => code === STATS_OTHER
  ? { c: C.gray, label_ar: 'أخرى', label_en: 'Other' }
  : (SVC_THEME[code] || SVC_THEME.general)

const SC_CARD = {
  borderRadius: 16,
  background: 'var(--card-grad2)',
  border: '1px solid var(--bd)',
  boxShadow: 'var(--shadow-sm)',
}

function StatsCards({ T, periodStats, svcToday, mode = 'real' }) {
  if (mode === 'hidden') return null   // GM hid the stat strip for this user
  const z = mode === 'zero'            // show the cards but always zeroed
  const ps = periodStats
  const cashSum = z ? 0 : ps.cash.sum, cashCnt = z ? 0 : ps.cash.cnt
  const bankSum = z ? 0 : ps.bank.sum, bankCnt = z ? 0 : ps.bank.cnt
  const refSum = z ? 0 : (ps.voided.sum + ps.cancelled.sum)
  const refCnt = z ? 0 : (ps.voided.cnt + ps.cancelled.cnt)
  const svcs = z ? [] : buildTodaySvcs(svcToday)
  const svcTotal = svcs.reduce((a, b) => a + b.cnt, 0)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1.7fr', gap: 14, marginBottom: 24 }}>
      {/* بطل «نقدًا» — شريط جانبي: لوحة أيقونة على اليسار + المحتوى على اليمين */}
      <div style={{ ...SC_CARD, position: 'relative', overflow: 'hidden', minHeight: 190, display: 'flex' }}>
        <div style={{ position: 'absolute', insetInlineEnd: -50, top: -50, width: 150, height: 150, borderRadius: '50%', background: `radial-gradient(circle, ${C.gold}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', flex: 1, padding: '16px 34px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'right' }}>
          <span style={{ fontSize: 24, color: 'var(--tx)', fontWeight: 600, letterSpacing: '.2px' }}>{T('نقدًا', 'Cash')}</span>
          <div style={{ direction: 'ltr', textAlign: 'right' }}>
            <span style={{ fontSize: 46, fontWeight: 800, color: C.gold, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{num(cashSum)}</span>
          </div>
          <span style={{ fontSize: 12.5, color: 'var(--tx3)', fontWeight: 600 }}>{T('عدد العمليات', 'Receipts')} <span style={{ color: C.gold, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(cashCnt)}</span></span>
        </div>
        <div style={{ position: 'relative', width: 72, background: `linear-gradient(180deg, ${C.gold}1a, ${C.gold}08)`, borderInlineStart: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Wallet size={30} color={C.gold} />
        </div>
      </div>

      {/* كرت جانبي — تحويلات / مرتجعة (شريط أيقونة على اليسار لكل صف) */}
      <div style={{ ...SC_CARD, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 190 }}>
        {[{ label: T('تحويلات بنكية', 'Bank Transfers'), val: bankSum, cnt: bankCnt, c: C.blue, railIcon: <Landmark size={22} /> },
          { label: T('مرتجعة أو ملغاة', 'Refunded / Cancelled'), val: refSum, cnt: refCnt, c: C.red, railIcon: <RotateCcw size={22} /> }].map((s, i) => (
          <div key={i} style={{ position: 'relative', flex: 1, borderTop: i ? '1px solid var(--bd)' : 'none', display: 'flex', overflow: 'hidden' }}>
            <div style={{ position: 'relative', flex: 1, padding: '16px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 600 }}>{s.label}</span>
                <span style={{ fontSize: 12, color: s.cnt > 0 ? C.gold : 'var(--tx4)', fontWeight: 600 }}>({num(s.cnt)})</span>
              </div>
              <div style={{ direction: 'ltr', textAlign: 'right' }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: s.c, fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-.5px' }}>{num(s.val)}</span>
              </div>
            </div>
            <div style={{ width: 52, background: `linear-gradient(180deg, ${s.c}1a, ${s.c}08)`, borderInlineStart: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: s.c }}>
              {s.railIcon}
            </div>
          </div>
        ))}
      </div>

      {/* كرت الخدمات — اليوم (شريط أيقونة على اليسار + المحتوى على اليمين) */}
      <div style={{ ...SC_CARD, display: 'flex', overflow: 'hidden', minHeight: 190 }}>
        <div style={{ flex: 1, padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>{T('الخدمات', 'Services')}</span>
            <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>
              <span style={{ color: C.gold, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(svcTotal)}</span> {T(svcTotal >= 3 && svcTotal <= 10 ? 'خدمات' : 'خدمة', 'services')}
            </span>
          </div>
          {svcTotal > 0 && (
            <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,.04)' }}>
              {svcs.filter(s => s.cnt > 0).map(s => { const th = statsSvcTheme(s.code); return <div key={s.code} title={`${T(th.label_ar, th.label_en).replace('وإقامة ', '')}: ${s.cnt}`} style={{ width: (s.cnt / svcTotal * 100) + '%', background: th.c }} /> })}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 16px', alignContent: 'center' }}>
            {svcs.map(s => { const th = statsSvcTheme(s.code); const z = s.cnt === 0; return (
              <div key={s.code} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 600, opacity: z ? .45 : 1 }}>
                <span style={{ color: z ? 'var(--tx4)' : th.c, fontVariantNumeric: 'tabular-nums', direction: 'ltr', minWidth: 14, textAlign: 'center', flexShrink: 0, fontWeight: 700 }}>{num(s.cnt)}</span>
                <span style={{ color: 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{T(th.label_ar, th.label_en).replace('وإقامة ', '')}</span>
              </div>
            )})}
          </div>
        </div>
        <div style={{ width: 60, background: `linear-gradient(180deg, ${C.gold}1a, ${C.gold}08)`, borderInlineStart: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: C.gold }}>
          <Briefcase size={26} />
        </div>
      </div>
    </div>
  )
}

export default function InvoicePage({ sb, lang, user, branchId, toast, onNewInvoice, emptyIcon, onOpenService }) {
  const isAr = lang !== 'en'
  const T = (a, e) => (isAr ? a : e)

  // مكاتب المستخدم لتبويب الفواتير: null = بلا قيد (المدير العام / صلاحية «كل المكاتب»)؛
  // غير ذلك = قائمة معرّفات الفروع المسموح للمستخدم رؤية فواتيرها فقط.
  const officeScope = useMemo(() => tabOffices(user, 'invoices'), [user])

  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [page, setPage] = useState(0)

  // Stats
  const [statsAgg, setStatsAgg] = useState({ services: [], statuses: [] })
  const [statsDaily, setStatsDaily] = useState([])
  const [statsTotalCount, setStatsTotalCount] = useState(0)
  const [aging, setAging] = useState([])
  const [dailyCash, setDailyCash] = useState(0)
  const [periodStats, setPeriodStats] = useState({
    cash: { cnt: 0, sum: 0 },
    bank: { cnt: 0, sum: 0 },
    cancelled: { cnt: 0, sum: 0 },
    voided: { cnt: 0, sum: 0 },
  })
  const [weekStats, setWeekStats] = useState({
    cash: { cnt: 0, sum: 0 },
    bank: { cnt: 0, sum: 0 },
    voided: { cnt: 0, sum: 0 },
  })
  const [svcToday, setSvcToday] = useState([])
  const [svcWeek, setSvcWeek] = useState([])

  // Filters
  const [q, setQ] = useState('')
  const [dq, setDq] = useState('')                 // البحث بعد التهدئة (debounce) — يقود الاستعلام
  const [serviceType, setServiceType] = useState([]) // اختيار متعدد لأنواع الخدمة
  const [payFilter, setPayFilter] = useState([])     // اختيار متعدد لحالات السداد
  const [branchSel, setBranchSel] = useState([])   // اختيار متعدد للمكاتب
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [paymentPlan, setPaymentPlan] = useState('') // cash | installment
  const [reqStage, setReqStage] = useState([])       // حالة المعاملة المحسوبة (مثل الكرت) — اختيار متعدد
  const [accStatus, setAccStatus] = useState('')     // pending | approved | rejected
  const [agentFilter, setAgentFilter] = useState('')
  const [natFilter, setNatFilter] = useState('')
  const [overdue, setOverdue] = useState('')         // '' | '1' (عليها أقساط متأخرة)
  const [advOpen, setAdvOpen] = useState(false)

  // تهدئة البحث: لا نُطلق الاستعلام مع كل ضغطة، بل بعد توقف الكتابة ~300ms.
  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t) }, [q])

  // Lookups
  const [branches, setBranches] = useState([])
  const [services, setServices] = useState([])
  const [agents, setAgents] = useState([])
  const [nationalities, setNationalities] = useState([])

  const [detail, setDetail] = useState(null)
  const [cancelledStatusId, setCancelledStatusId] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    let alive = true
    Promise.all([
      sb.from('branches').select('id,branch_code').order('branch_code'),
      sb.from('lookup_items').select('id,code,value_ar,value_en,category:lookup_categories!inner(category_key)').eq('category.category_key', 'service_type'),
      sb.from('lookup_items').select('id,code,category:lookup_categories!inner(category_key)').eq('category.category_key', 'invoice_status').eq('code', 'cancelled').limit(1),
      sb.from('agents').select('id,name_ar,name_en').order('name_ar'),
      sb.from('nationalities').select('id,name_ar,name_en').eq('is_active', true).order('name_ar'),
    ]).then(([b, s, st, ag, nat]) => {
      if (!alive) return
      // المستخدم المقيّد بمكاتب/أنواع خدمات لا يرى في قائمة التصفية إلا المسموح له.
      const allBranches = b.data || []
      setBranches(officeScope ? allBranches.filter(x => officeScope.includes(x.id)) : allBranches)
      const svcAllow = tabServiceTypes(user, 'invoices')
      setServices(svcAllow ? (s.data || []).filter(x => svcAllow.includes(x.id)) : (s.data || []))
      setCancelledStatusId(st.data?.[0]?.id || null)
      setAgents(ag.data || [])
      setNationalities(nat.data || [])
    })
    return () => { alive = false }
  }, [sb, officeScope])

  // Deep-link: open a specific invoice's detail when navigated here from elsewhere.
  useEffect(() => {
    const handler = async (e) => {
      const id = e?.detail?.id
      if (!id || !sb) return
      const { data } = await sb.from('invoices').select(INVOICE_SELECT).eq('id', id).is('deleted_at', null).maybeSingle()
      if (data) setDetail(data)
    }
    window.addEventListener('invoice-open', handler)
    return () => window.removeEventListener('invoice-open', handler)
  }, [sb])

  // After a new invoice is issued (ServiceRequestPage success closes), refresh
  // the list + stat cards in place so it appears without a manual page reload.
  useEffect(() => {
    const handler = () => setRefreshTick(t => t + 1)
    window.addEventListener('invoice-created', handler)
    return () => window.removeEventListener('invoice-created', handler)
  }, [])

  // ملاحظة: الإلغاء والاسترجاع يتمّان عبر ActionModal الموحّد (FormKit) أدناه —
  // أُزيلت الدوال القديمة المعتمدة على window.confirm لأنها كانت كوداً ميتاً.

  // Aggregations
  useEffect(() => {
    let alive = true
    const dayStart = riyadhDayStart()
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000)
    Promise.all([
      sb.from('v_invoice_stats').select('*'),
      sb.from('v_invoice_daily').select('*'),
      sb.from('v_invoice_aging').select('*'),
      (officeScope ? sb.from('invoices').select('id', { count: 'exact', head: true }).is('deleted_at', null).or(`branch_id.in.(${officeScope.join(',')}),branch_id.is.null`)
                   : sb.from('invoices').select('id', { count: 'exact', head: true }).is('deleted_at', null)),
      sb.from('payments').select('amount,payment_method:payment_method_id!inner(code)')
        .eq('payment_method.code', 'cash')
        .eq('is_valid', true)
        .is('deleted_at', null)
        .gte('payment_date', dayStart.toISOString())
        .lt('payment_date', dayEnd.toISOString()),
    ]).then(([s, d, a, c, pc]) => {
      if (!alive) return
      const items = s.data || []
      setStatsAgg({
        services: items.filter(i => i.dim === 'service_type'),
        statuses: items.filter(i => i.dim === 'status'),
      })
      setStatsDaily(d.data || [])
      setAging(a.data || [])
      setStatsTotalCount(c.count || 0)
      setDailyCash((pc.data || []).reduce((s, p) => s + (Number(p.amount) || 0), 0))
    })
    return () => { alive = false }
  }, [sb, officeScope, refreshTick])

  // كروت الإحصاء تعكس التصفية: بلا تصفية تعمل بمنطق «اليوم» (p_start = بداية اليوم)؛
  // ومع أي تصفية نمرّر p_start=null + بقية الفلاتر فتُحسب على الفواتير المطابقة.
  // p_branch_ids يبقى دائماً قيد المكتب (null للمدير العام)؛ branchSel (مصفوفة) يصير قيداً صارماً للمكاتب المختارة.
  const statFilters = useMemo(() => ({
    active: !!(branchSel.length || serviceType.length || payFilter.length || from || to || dq.trim() || amountMin !== '' || amountMax !== '' || paymentPlan || reqStage.length || accStatus || agentFilter || natFilter || overdue),
    p_branch_ids: officeScope,
    p_branch_exact_ids: branchSel.length ? branchSel : null,
    p_service_type_ids: serviceType.length ? serviceType : null,
    p_pay_statuses: payFilter.length ? payFilter : null,
    p_from: from || null,
    p_to: to || null,
    p_amount_min: amountMin !== '' ? Number(amountMin) : null,
    p_amount_max: amountMax !== '' ? Number(amountMax) : null,
    p_payment_plan: paymentPlan || null,
    p_search: dq.trim() || null,
    p_req_stages: reqStage.length ? reqStage : null,
    p_accountant_status: accStatus || null,
    p_agent_id: agentFilter || null,
    p_nationality_id: natFilter || null,
    p_overdue: overdue === '1' ? true : null,
  }), [officeScope, branchSel, serviceType, payFilter, from, to, amountMin, amountMax, paymentPlan, dq, reqStage, accStatus, agentFilter, natFilter, overdue])
  // ملاحظة: serviceType/payFilter مصفوفتان — المرجع يتغيّر عند كل تعديل فيُعاد الحساب

  // خيارات «نوع الخدمة» في التصفية — نفس قائمة معالج إنشاء الفاتورة (ALL_SERVICES): نفس الأسماء ونفس الترتيب.
  // كل خدمة تُربط بمعرّف lookup_items عبر SVC_CODE_MAP؛ نعرض فقط الأنواع الموجودة فعلاً في قاعدة البيانات.
  const serviceTypeOptions = useMemo(() => {
    const byCode = {}
    services.forEach(s => { if (!byCode[s.code]) byCode[s.code] = s })
    const out = []
    const seen = new Set()
    ALL_SERVICES.forEach(w => {
      const li = byCode[SVC_CODE_MAP[w.id] || 'general']
      if (li && !seen.has(li.id)) { seen.add(li.id); out.push({ v: li.id, l: w.name_ar, code: li.code }) }
    })
    return out
  }, [services])

  // ── خيارات «حالة المعاملة» — الحالة المحسوبة نفسها التي تظهر على الكرت، وتتكيّف مع نوع الخدمة المختار ──
  // أكواد المراحل تطابق دالة invoice_txn_stage في القاعدة. كل نوع خدمة يُظهر فقط الحالات الممكنة فيه:
  //   • خدمات موافقة المحاسب (نقل خارجي/خروج وعودة/خروج نهائي): بانتظار المحاسب · موافَق · مرفوض · منجز · ملغاة
  //   • الخدمات متعددة المراحل (تأشيرة دائمة/مؤقتة · نقل الكفالة · تجديد الإقامة): جديد · قيد التنفيذ · منجز · ملغاة
  //   • بقية الخدمات: جديد · منجز · ملغاة
  const STAGE_LABELS = {
    new: T('جديد','New'), in_progress: T('قيد التنفيذ','In progress'),
    awaiting_acct: T('بانتظار المحاسب','Awaiting accountant'), acct_approved: T('موافَق','Approved'), acct_rejected: T('مرفوض','Rejected'),
    done: T('منجز','Completed'), cancelled: T('ملغاة','Cancelled'),
  }
  const STAGE_ORDER = ['new','in_progress','awaiting_acct','acct_approved','acct_rejected','done','cancelled']
  const ACCT_SVCS = useMemo(() => new Set(['external_transfer_approval','exit_reentry_visa','final_exit_visa']), [])
  const MULTI_STAGE_SVCS = useMemo(() => new Set(['work_visa_permanent','work_visa_temporary','transfer','iqama_renewal']), [])
  const stagesForCode = (code) => ACCT_SVCS.has(code)
    ? ['awaiting_acct','acct_approved','acct_rejected','done','cancelled']
    : MULTI_STAGE_SVCS.has(code)
      ? ['new','in_progress','done','cancelled']
      : ['new','done','cancelled']
  const stageOptions = useMemo(() => {
    const codes = serviceType.length
      ? serviceTypeOptions.filter(o => serviceType.includes(o.v)).map(o => o.code)
      : serviceTypeOptions.map(o => o.code)
    const set = new Set()
    codes.forEach(c => stagesForCode(c).forEach(s => set.add(s)))
    if (!set.size) STAGE_ORDER.forEach(s => set.add(s))   // لا خدمات محمّلة بعد → أظهر الكل
    return STAGE_ORDER.filter(s => set.has(s)).map(s => ({ v: s, l: STAGE_LABELS[s] }))
  }, [serviceType, serviceTypeOptions, isAr])
  // تقليم الحالات المختارة عند تغيّر نوع الخدمة بحيث تبقى ضمن المتاح فقط
  useEffect(() => {
    setReqStage(prev => {
      const next = prev.filter(s => stageOptions.some(o => o.v === s))
      return next.length === prev.length ? prev : next
    })
  }, [stageOptions])

  // KPI breakdown (cash / bank+pos / cancelled / voided) + service distribution — today AND last 7 days.
  // مدمج في تأثير واحد: استدعاءان فقط لـ invoice_period_stats (اليوم + الأسبوع) — كل استجابة تحمل
  // cash/bank/cancelled/voided + services معًا، فلا داعي لتكرار الاستعلام أربع مرات (نصف حِمل البحث).
  useEffect(() => {
    let alive = true
    const todayStart = riyadhDayStart()
    const weekStart = new Date(todayStart.getTime() - 6 * 24 * 3600 * 1000)
    const normKpi = (x) => ({ cnt: Number(x?.cnt) || 0, sum: Number(x?.sum) || 0 })
    const normSvc = (rows) => (rows || []).map(s => ({ code: s.code, cnt: Number(s.cnt) || 0, sum: Number(s.sum) || 0 }))
    const { active, ...f } = statFilters
    Promise.all([
      sb.rpc('invoice_period_stats', { p_start: active ? null : todayStart.toISOString(), ...f }),
      sb.rpc('invoice_period_stats', { p_start: active ? null : weekStart.toISOString(), ...f }),
    ]).then(([t, w]) => {
      if (!alive) return
      if (t.data) {
        setPeriodStats({ cash: normKpi(t.data.cash), bank: normKpi(t.data.bank), cancelled: normKpi(t.data.cancelled), voided: normKpi(t.data.voided) })
        setSvcToday(normSvc(t.data.services))
      }
      if (w.data) {
        setWeekStats({ cash: normKpi(w.data.cash), bank: normKpi(w.data.bank), voided: normKpi(w.data.voided) })
        setSvcWeek(normSvc(w.data.services))
      }
    })
    return () => { alive = false }
  }, [sb, statFilters, refreshTick])

  // Paged invoice list — البحث والتصفية الشاملة عبر RPC واحد (search_invoice_ids):
  // الدالة تطبّق كل الفلاتر + البحث الذكي عبر كل حقول الفاتورة والمعاملة وتُرجع صفحة المعرّفات + العدد الكلي،
  // ثم نجلب البيانات الكاملة (INVOICE_SELECT) لتلك المعرّفات ونعيد ترتيبها بنفس ترتيب الـ RPC.
  useEffect(() => {
    let alive = true
    setLoading(true); setErr(null)
    ;(async () => {
      const { active, ...f } = statFilters
      const { data: idRows, error: e1 } = await sb.rpc('search_invoice_ids', { ...f, p_limit: PAGE, p_offset: page * PAGE })
      if (!alive) return
      if (e1) { setErr(e1.message); setLoading(false); return }
      const ids = (idRows || []).map(r => r.id)
      const totalCount = (idRows && idRows.length) ? Number(idRows[0].total) : 0
      if (!ids.length) { setRows([]); setTotal(0); setLoading(false); return }
      const { data, error: e2 } = await sb.from('invoices').select(INVOICE_SELECT).in('id', ids).is('deleted_at', null)
      if (!alive) return
      if (e2) { setErr(e2.message); setLoading(false); return }
      const pos = new Map(ids.map((id, idx) => [id, idx]))
      const sorted = (data || []).slice().sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0))
      setRows(sorted); setTotal(totalCount); setLoading(false)
    })()
    return () => { alive = false }
  }, [sb, page, statFilters, refreshTick])

  const stats = useMemo(() => {
    const total = statsTotalCount
    const byService = Object.fromEntries(statsAgg.services.map(s => [s.code || 'general', { cnt: Number(s.cnt) || 0, total: Number(s.total) || 0, paid: Number(s.paid) || 0 }]))
    const totalAmt = Object.values(byService).reduce((s, v) => s + v.total, 0)
    const totalPaid = Object.values(byService).reduce((s, v) => s + v.paid, 0)
    const totalRemaining = Math.max(0, totalAmt - totalPaid)

    const days = 14, today = new Date(); today.setHours(0,0,0,0)
    const buckets = new Array(days).fill(0)
    statsDaily.forEach(d => {
      const dt = new Date(d.day); dt.setHours(0,0,0,0)
      const age = Math.round((today - dt) / 86400000)
      if (age >= 0 && age < days) buckets[days - 1 - age] = Number(d.cnt) || 0
    })

    // Pay state buckets — derived from invoices select payload below
    return { total, byService, totalAmt, totalPaid, totalRemaining, sparkline: buckets, aging }
  }, [statsAgg, statsDaily, statsTotalCount, aging])

  // Day grouping — uses 05:00 AM Riyadh business-day boundary
  const businessDayKey = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    return new Date(d.getTime() - 2 * 3600 * 1000).toISOString().slice(0, 10)
  }
  const grouped = useMemo(() => {
    const days = {}; const order = []
    rows.forEach(r => {
      const k = businessDayKey(r.last_activity_at || r.created_at) || T('بدون', 'No date')
      if (!days[k]) { days[k] = []; order.push(k) }
      days[k].push(r)
    })
    return { days, order }
  }, [rows])
  const todayStr = riyadhDayStart().toISOString().slice(0, 10)
  const dayNames = [T('الأحد','Sun'), T('الاثنين','Mon'), T('الثلاثاء','Tue'), T('الأربعاء','Wed'), T('الخميس','Thu'), T('الجمعة','Fri'), T('السبت','Sat')]
  const monthNames = [T('يناير','Jan'),T('فبراير','Feb'),T('مارس','Mar'),T('أبريل','Apr'),T('مايو','May'),T('يونيو','Jun'),T('يوليو','Jul'),T('أغسطس','Aug'),T('سبتمبر','Sep'),T('أكتوبر','Oct'),T('نوفمبر','Nov'),T('ديسمبر','Dec')]
  const dayLabel = (k) => k === todayStr ? T('اليوم','Today') : (() => { try { const d = new Date(k + 'T12:00:00'); return dayNames[d.getDay()] } catch { return k } })()
  const dayFull  = (k) => { try { const d = new Date(k + 'T12:00:00'); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') } catch { return k } }
  const totalPages = Math.max(1, Math.ceil(total / PAGE))
  const initialLoading = loading && rows.length === 0

  if (detail) return <InvoiceDetailPage sb={sb} inv={detail} onBack={() => { setDetail(null); setRefreshTick(t => t + 1) }} isAr={isAr} T={T} toast={toast} user={user} onOpenService={onOpenService} />

  return (
    <div style={{ fontFamily: F, paddingTop: 0 }}>
      {/* Hero */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--tx)', letterSpacing: '-.3px', lineHeight: 1.2 }}>{T('الفواتير والمعاملات','Invoices')}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx2)', marginTop: 12, lineHeight: 1.6 }}>{T('إدارة الفواتير والطلبات والمعاملات وحالات السداد ومتابعة المدفوعات','Manage invoices, requests, transactions, payment status and payments')}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: statFilters.active ? C.gold : 'var(--tx3)', marginTop: 6, lineHeight: 1.6, opacity: .8 }}>{statFilters.active ? T('كروت الإحصاء تعكس التصفية الحالية', 'The stat cards reflect the active filter') : T('كروت الإحصاء والفواتير والطلبات تعرض حركة اليوم وتبدأ من الساعة 5:00 فجراً بتوقيت الرياض', 'The stats, invoices and requests cards show today’s activity, starting at 5:00 AM Riyadh time')}</div>
          </div>
          {onNewInvoice && canPerm(user, 'invoices.create') && (
            <button onClick={onNewInvoice} className="btn-primary-modal"
              style={{ height: 42, padding: '0 18px', borderRadius: 11, fontFamily: F, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', flexShrink: 0, transition: 'background .15s ease, border-color .15s ease, box-shadow .15s ease' }}>
              {T('فاتورة جديدة','New Invoice')}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          )}
        </div>
      </div>

      {initialLoading ? <InvoiceSkeleton listRows={8} /> : (<>

      {/* Stats + Services — مبدّل تخطيطات حيّ (5 توزيعات؛ اختر الأنسب) */}
      <StatsCards T={T} periodStats={periodStats} svcToday={svcToday} mode={statsMode(user, 'invoices')} />

      {/* Filter row — بحث ذكي شامل + اختيار حقل محدد */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', color: 'var(--tx4)' }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            placeholder={T('ابحث برقم الفاتورة، رقم الطلب، الاسم، الإقامة، الهوية، أو الجوال…', 'Search by invoice no, request no, name, iqama, ID, or phone…')}
            value={q}
            onChange={e => { setQ(e.target.value); setPage(0) }}
            style={{ width: '100%', height: 44, padding: '0 14px 0 38px', borderRadius: 12, background: 'var(--search-bg)', border: '1px solid transparent', color: 'var(--tx)', fontSize: 13, fontFamily: F, boxSizing: 'border-box' }}
          />
        </div>
        {(() => {
          const hasFilters = !!(branchSel.length || serviceType.length || payFilter.length || from || to || amountMin !== '' || amountMax !== '' || paymentPlan || reqStage.length || accStatus || agentFilter || natFilter || overdue)
          const clearAll = () => { setBranchSel([]); setFrom(''); setTo(''); setServiceType([]); setPayFilter([]); setAmountMin(''); setAmountMax(''); setPaymentPlan(''); setReqStage([]); setAccStatus(''); setAgentFilter(''); setNatFilter(''); setOverdue(''); setPage(0) }
          return (
        <button onClick={() => setAdvOpen(o => !o)} style={btnFilter(advOpen || hasFilters)}>
          {T('تصفية','Filter')}
          {hasFilters ? (
            <span
              role="button"
              tabIndex={0}
              title={T('مسح الفلاتر','Clear filters')}
              onClick={e => { e.stopPropagation(); clearAll() }}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); clearAll() } }}
              onMouseEnter={e => { e.currentTarget.style.background = C.red; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = C.gold; e.currentTarget.style.color = '#000' }}
              style={{ background: C.gold, color: '#000', width: 18, height: 18, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '.18s' }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </span>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="14" y2="6"/><line x1="18" y1="6" x2="20" y2="6"/><circle cx="16" cy="6" r="2"/><line x1="4" y1="12" x2="8" y2="12"/><line x1="12" y1="12" x2="20" y2="12"/><circle cx="10" cy="12" r="2"/><line x1="4" y1="18" x2="16" y2="18"/><line x1="20" y1="18" x2="20" y2="18"/><circle cx="18" cy="18" r="2"/></svg>
          )}
        </button>
          )
        })()}
      </div>

      {/* Advanced filter panel — matches Transfer Calc design */}
      {advOpen && (() => {
        const fLbl = { fontSize: 12, fontWeight: 500, color: 'var(--tx3)', paddingInlineStart: 2, marginBottom: 7 }
        const fInp = { height: 42, padding: '0 14px', borderRadius: 9, border: '1px solid transparent', background: 'var(--inputBg)', color: 'var(--tx)', fontFamily: F, fontSize: 14, fontWeight: 600, outline: 'none', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', transition: '.2s', width: '100%', boxSizing: 'border-box' }
        // اختصارات الفترة — تعتمد بداية اليوم 5 صباحًا (todayStr = يوم العمل الحالي)
        const dShift = (key, n) => { const d = new Date(key + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
        const datePresets = [
          { l: T('اليوم','Today'),         f: todayStr,                    t: todayStr },
          { l: T('أمس','Yesterday'),       f: dShift(todayStr, -1),        t: dShift(todayStr, -1) },
          { l: T('هذا الأسبوع','This week'), f: dShift(todayStr, -new Date(todayStr + 'T12:00:00Z').getUTCDay()), t: todayStr }, // من الأحد (بداية الأسبوع) إلى اليوم
          { l: T('هذا الشهر','This month'), f: todayStr.slice(0, 8) + '01', t: todayStr },
        ]
        const chip = (active) => ({ height: 30, padding: '0 14px', borderRadius: 8, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: '.15s', border: `1px solid ${active ? 'var(--accent)' : 'var(--bd)'}`, background: active ? 'var(--accent-bg)' : 'var(--inputBg)', color: active ? 'var(--accent)' : 'var(--tx2)' })
        return (
          <div style={{ marginBottom: 22, padding: '16px 18px', background: 'var(--card-grad2)', border: '1px solid var(--bd)', borderRadius: 14, boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid var(--bd)', paddingBottom: 2, marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx3)', marginInlineEnd: 8, paddingBottom: 8 }}>{T('فترة سريعة','Quick period')}</span>
              {datePresets.map(p => {
                const a = from === p.f && to === p.t
                return <button key={p.l} type="button" onClick={() => { setFrom(p.f); setTo(p.t); setPage(0) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: F, fontSize: 13, fontWeight: a ? 800 : 600, color: a ? C.gold : 'var(--tx2)', padding: '4px 12px 8px', position: 'relative', transition: '.18s', borderBottom: `2px solid ${a ? C.gold : 'transparent'}`, marginBottom: -1 }}>{p.l}</button>
              })}
              {(from || to) && (
                <button type="button" onClick={() => { setFrom(''); setTo(''); setPage(0) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: F, fontSize: 12.5, fontWeight: 700, color: C.red, padding: '4px 10px 8px', marginInlineStart: 'auto' }}>{T('مسح التاريخ','Clear dates')}</button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
              <div>
                <div style={fLbl}>{T('المكتب','Branch')}</div>
                <FKDropdown multi selectedKeys={branchSel} onChange={arr => { setBranchSel(arr); setPage(0) }} placeholder={T('كل المكاتب','All branches')} getKey={o => o.v} getLabel={o => o.l} options={branches.map(b => ({ v: b.id, l: b.branch_code }))} />
              </div>
              <div>
                <div style={fLbl}>{T('تاريخ من','Date From')}</div>
                <DateField value={from} onChange={v => { setFrom(v); setPage(0) }} lang={lang} />
              </div>
              <div>
                <div style={fLbl}>{T('تاريخ إلى','Date To')}</div>
                <DateField value={to} onChange={v => { setTo(v); setPage(0) }} lang={lang} />
              </div>
              <div>
                <div style={fLbl}>{T('نوع الخدمة','Service Type')}</div>
                <FKDropdown multi selectedKeys={serviceType} onChange={arr => { setServiceType(arr); setPage(0) }} placeholder={T('الكل','All')} getKey={o => o.v} getLabel={o => o.l} options={serviceTypeOptions} />
              </div>
              <div>
                <div style={fLbl}>{T('حالة المعاملة','Transaction Status')}</div>
                <FKDropdown multi selectedKeys={reqStage} onChange={arr => { setReqStage(arr); setPage(0) }} placeholder={T('الكل','All')} getKey={o => o.v} getLabel={o => o.l} options={stageOptions} />
              </div>
              <div>
                <div style={fLbl}>{T('حالة السداد','Pay Status')}</div>
                <FKDropdown multi selectedKeys={payFilter} onChange={arr => { setPayFilter(arr); setPage(0) }} placeholder={T('الكل','All')} getKey={o => o.v} getLabel={o => o.l} options={[{ v: 'paid', l: T('مدفوعة بالكامل','Fully Paid') }, { v: 'partial', l: T('مدفوعة جزئياً','Partially Paid') }, { v: 'refunded', l: T('مستردة','Refunded') }, { v: 'cancelled', l: T('ملغاة','Cancelled') }]} />
              </div>
              <div>
                <div style={fLbl}>{T('الوسيط','Agent')}</div>
                <FKDropdown value={agentFilter} onChange={v => { setAgentFilter(v); setPage(0) }} placeholder={T('الكل','All')} getKey={o => o.v} getLabel={o => o.l} options={[{ v: '', l: T('الكل','All') }, ...agents.map(a => ({ v: a.id, l: isAr ? (a.name_ar || a.name_en) : (a.name_en || a.name_ar) }))]} />
              </div>
            </div>
          </div>
        )
      })()}


      {/* List */}
      {!loading && err && <div style={{ padding: 60, textAlign: 'center', color: C.red, fontSize: 13 }}>{err}</div>}
      {!loading && !err && rows.length === 0 && (
        <EmptyState icon={emptyIcon} title={T('لا توجد فواتير', 'No invoices')} desc={T('أنشئ أول فاتورة من زر «فاتورة جديدة»', 'Create your first invoice using “New Invoice”')} />
      )}

      {!loading && !err && grouped.order.map(dayKey => {
        const dayRows = grouped.days[dayKey]
        // Payments collected on this day (across both new and reactivated invoices)
        const dayPaymentsOf = (r) => (r.payments || []).filter(p => p.deleted_at == null && p.is_valid && businessDayKey(p.payment_date) === dayKey)
        // An invoice "belongs" to the day as a new invoice only if it was created that day.
        const createdThisDay = (r) => businessDayKey(r.created_at) === dayKey
        const newRows = dayRows.filter(createdThisDay)
        const dayTotal = newRows.reduce((s, r) => s + Number(r.total_amount || 0), 0)
        // المُحصّل = الدفعات الموجبة الصحيحة في هذا اليوم فقط (لا تُخصم منها المستردات — تظهر مستقلة بالأحمر).
        const dayPaid  = dayRows.reduce((s, r) => s + dayPaymentsOf(r).filter(p => Number(p.amount) > 0).reduce((a, p) => a + Number(p.amount || 0), 0), 0)
        const dayPmtCount = dayRows.reduce((s, r) => s + (createdThisDay(r) ? 0 : dayPaymentsOf(r).length), 0)
        // الملغى + المسترد لهذا اليوم (يُعرض بالأحمر):
        // • المسترد = مبالغ المستردات (دفعات سالبة أو مُبطَلة) بتاريخ هذا اليوم على فواتير غير ملغاة.
        // • الملغى  = المبلغ المسدّد على الفواتير الملغاة التي وقع آخر نشاط لها في هذا اليوم.
        const dayRefunded = dayRows.reduce((s, r) => r.status?.code === 'cancelled' ? s
          : s + (r.payments || []).filter(p => p.deleted_at == null && businessDayKey(p.payment_date) === dayKey)
              .reduce((a, p) => a + (!p.is_valid ? Math.abs(Number(p.amount) || 0) : (Number(p.amount) < 0 ? -Number(p.amount) : 0)), 0), 0)
        const dayCancelled = dayRows.reduce((s, r) => s + (r.status?.code === 'cancelled' ? Number(r.paid_amount || 0) : 0), 0)
        const dayVoid = dayRefunded + dayCancelled
        return (
          <div key={dayKey} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--bd)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: dayKey === todayStr ? C.gold : 'var(--tx2)' }}>{dayLabel(dayKey)}</span>
                <span style={{ fontSize: 12, color: 'var(--tx4)', fontVariantNumeric: 'tabular-nums', direction: 'ltr' }}>{dayFull(dayKey)}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--tx3)', display: 'flex', gap: 16, fontWeight: 600 }}>
                <span>{num(newRows.length)} {T('فاتورة','invoices')}</span>
                {dayPmtCount > 0 && <span style={{ color: C.blue, fontVariantNumeric: 'tabular-nums' }}>{num(dayPmtCount)} {dayPmtCount === 1 ? T('دفعة','pmt') : T('مدفوعات','pmts')}</span>}
                <span style={{ color: C.gold, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(dayTotal)}</span>
                <span style={{ color: C.ok, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>+ {num(dayPaid)}</span>
                {dayVoid > 0 && <span style={{ color: C.red, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }} title={T('الملغى والمسترد','Cancelled & refunded')}>− {num(dayVoid)}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dayRows.map((r, idx) => {
                const svc = svcThemeFor(r.service_type)
                const pay = inferPayState(r)
                const payT = PAY_THEME[pay]
                const remaining = Number(r.remaining_amount || 0)
                const total = Number(r.total_amount || 0)
                const paid = Number(r.paid_amount || 0)
                const pct = total ? Math.min(100, Math.round((paid / total) * 100)) : 0
                const cancelled = r.status?.code === 'cancelled'
                const refundedAmt = (r.payments || []).reduce((s, p) => (p.deleted_at == null && p.is_valid && Number(p.amount) < 0) ? s + Math.abs(Number(p.amount)) : s, 0)
                // حركة هذا اليوم فقط (يبدأ 5 فجراً) — تغذّي رسالة الواتساب: المبلغ المستلم + طريقة الدفع، والاسترجاع/الإلغاء إن وقعا اليوم.
                const isToday = dayKey === todayStr
                const dayMoney = (() => {
                  const tp = (r.payments || []).filter(p => p.deleted_at == null && businessDayKey(p.payment_date) === dayKey)
                  const recv = tp.filter(p => p.is_valid && Number(p.amount) > 0)
                  const refs = tp.filter(p => !p.is_valid || Number(p.amount) < 0)
                  const mLabel = p => (isAr ? p.payment_method?.value_ar : (p.payment_method?.value_en || p.payment_method?.value_ar)) || p.payment_method?.value_ar
                  const cancelledToday = r.status?.code === 'cancelled' && businessDayKey(r.last_activity_at || r.created_at) === dayKey
                  return {
                    received: recv.reduce((a, p) => a + Number(p.amount || 0), 0),
                    recvMethods: [...new Set(recv.map(mLabel).filter(Boolean))],
                    refunded: refs.reduce((a, p) => a + (!p.is_valid ? Math.abs(Number(p.amount) || 0) : (Number(p.amount) < 0 ? -Number(p.amount) : 0)), 0),
                    refundMethods: [...new Set(refs.map(mLabel).filter(Boolean))],
                    cancelledToday,
                    cancelledAmt: cancelledToday ? Number(r.paid_amount || 0) : 0,
                    createdToday: businessDayKey(r.created_at) === dayKey,
                  }
                })()
                // When workerIsClient was checked at request time, client_id stays null but
                // a worker exists on the application table — use the worker as the displayed party.
                // PostgREST returns 1:1 embeds as object (or array depending on schema) — handle both.
                const sr = r.service_request
                const pickWorker = (rel) => Array.isArray(rel) ? rel[0]?.worker : rel?.worker
                const workerFromApp = pickWorker(sr?.transfer_applications)
                                   || pickWorker(sr?.ajeer_applications)
                                   || pickWorker(sr?.iqama_renewal_applications)
                                   || pickWorker(sr?.supplier_payroll_applications)
                                   || pickWorker(sr?.other_applications)
                                   || null
                const party = sr?.client || workerFromApp
                const partyIsWorker = !sr?.client && !!workerFromApp
                const partyId = party?.id_number || party?.iqama_number
                // جوال العرض: جوال الطرف، وإلا رقم جوال العامل المُدخل في الفاتورة (other_applications.worker_phone)
                // — لخدمات الغرفة التجارية/العامة حيث العميل بلا جوال مسجّل. يُطبَّع لصيغة 966… كبقية الأرقام.
                const otherWP = Array.isArray(sr?.other_applications) ? sr.other_applications[0]?.worker_phone : sr?.other_applications?.worker_phone
                const spWP = Array.isArray(sr?.supplier_payroll_applications) ? sr.supplier_payroll_applications[0]?.worker_phone : sr?.supplier_payroll_applications?.worker_phone
                const phone = (() => { const dg = String(party?.phone || otherWP || spWP || '').replace(/\D/g, ''); return dg ? (dg.startsWith('966') ? dg : '966' + dg.slice(-9)) : '' })()
                const overdueDays = pay === 'unpaid' ? Math.max(0, Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000)) : 0
                const shortDate = (() => { try { const d = new Date(r.created_at); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') } catch { return '' } })()
                const svcCode = r.service_type?.code || 'general'
                const svcIcon = SVC_ICON[baseSvcCode(svcCode)] || SVC_ICON.general
                const nat = party?.nationality
                const isVisa = VISA_SVC_CODES.has(r.service_type?.code)
                const visaApps = Array.isArray(r.service_request?.visa_applications) ? r.service_request.visa_applications : []
                const qty = isVisa ? (visaApps.length || Number(r.service_request?.quantity || 0)) : Number(r.service_request?.quantity || 0)
                const va = visaApps[0] || null
                // المعاملة لتأشيرة العمل الدائمة تُعتبر «منجزة» عند إصدار إقامة لكل تأشيراتها — نفس منطق صفحة التفاصيل
                // (حالة service_request قد تبقى غير «done» رغم اكتمال إصدار الإقامة)، فنشتقّها من وجود سجل إصدار إقامة لكل تأشيرة.
                const isPermVisaCard = r.service_type?.code === 'work_visa_permanent' || r.service_type?.code === 'work_visa_temporary'
                // «إصدار الإقامة» = إدخال بيانات الإقامة فعلاً (رقم إقامة)، لا مجرد وجود صف (يُنشأ عند سداد دفعة الإصدار بلا بيانات).
                const iqamaNumFilled = v => {
                  const iq = v?.iqama_issuance_applications
                  const arr = Array.isArray(iq) ? iq : (iq ? [iq] : [])
                  return arr.some(x => x && x.deleted_at == null && String(x.iqama_number || '').trim())
                }
                const permIqamaDone = isPermVisaCard && visaApps.length > 0 && visaApps.every(iqamaNumFilled)
                // مرحلة وسطى «قيد التنفيذ»: أُدخلت أرقام الحدود لكل التأشيرات (صدرت التأشيرات) ولم تكتمل الإقامات بعد.
                const permVisaIssued = isPermVisaCard && !permIqamaDone && visaApps.length > 0 && visaApps.every(v => !!v.border_number)
                // حالة كل تأشيرة على حدة (للتأشيرات المتعددة): إقامة صادرة→منجز، رقم حدود→قيد التنفيذ, وإلا جديد.
                const visaStages = isPermVisaCard ? visaApps.map(v => iqamaNumFilled(v) ? 'done' : (v.border_number ? 'progress' : 'new')) : []
                // عنوان (tooltip) لكل تأشيرة عند المرور — يسرد مراحلها وحالة كلٍّ (تم الإصدار / بانتظار الإصدار).
                // المؤقتة: تأشيرة ← إقامة. الدائمة: تأشيرة ← تأمين ← رخصة عمل ← إقامة (التأمين/الرخصة بلا ترتيب).
                const isPermanentCard = r.service_type?.code === 'work_visa_permanent'
                const stageDataOfVisa = v => { const iq = v?.iqama_issuance_applications; const arr = Array.isArray(iq) ? iq : (iq ? [iq] : []); const row = arr.find(x => x && x.deleted_at == null) || null; return (row?.stage_data && typeof row.stage_data === 'object') ? row.stage_data : {} }
                const visaStageTips = isPermVisaCard ? visaApps.map((v, i) => {
                  const sd = stageDataOfVisa(v)
                  const st = done => done ? 'done' : 'awaiting'
                  const stages = [{ label: T('التأشيرة', 'Visa'), state: st(!!v.border_number) }]
                  if (isPermanentCard) { stages.push({ label: T('التأمين', 'Insurance'), state: st(!!sd.insurance) }); stages.push({ label: T('رخصة العمل', 'Work Permit'), state: st(!!sd.work_permit) }) }
                  stages.push({ label: T('الإقامة', 'Iqama'), state: st(iqamaNumFilled(v)) })
                  return { title: `${T('التأشيرة', 'Visa')} ${i + 1}`, stages }
                }) : []
                // الكودان الجديدان (دائمة/مؤقتة) يحملان النوع في اسم الخدمة نفسه، فلا نُلحق نوع التأشيرة ثانيةً.
                const isSplitVisa = svcCode === 'work_visa_permanent' || svcCode === 'work_visa_temporary'
                const subLabel = (!isSplitVisa && va?.visa_type) ? (isAr ? va.visa_type.value_ar : (va.visa_type.value_en || va.visa_type.value_ar)) : null
                const fullLabel = [isAr ? (svc.label_ar_full || svc.label_ar) : (svc.label_en_full || svc.label_en), subLabel].filter(Boolean).join(' ')
                // نقل الكفالة: مراحل المعاملة (التأمين · رخصة العمل · الإقامة) من حسبة التنازل المرتبطة — تاق لكل مرحلة في الكرت.
                const isTransferCard = baseSvcCode(svcCode) === 'transfer'
                const transferStages = (() => {
                  if (!isTransferCard) return []
                  const tcArr = Array.isArray(r.transfer_calculation) ? r.transfer_calculation : (r.transfer_calculation ? [r.transfer_calculation] : [])
                  const tcRow = tcArr.find(x => x && x.deleted_at == null) || tcArr[0] || null
                  if (!tcRow) return []
                  const sd = (tcRow.stage_data && typeof tcRow.stage_data === 'object') ? tcRow.stage_data : {}
                  const stOf = o => !o ? 'new' : o.status === 'cancelled' ? 'cancelled' : 'done'
                  const stTitle = (full, st) => `${full} — ${st === 'done' ? T('منجز', 'Completed') : st === 'cancelled' ? T('ملغاة', 'Cancelled') : T('بالانتظار', 'Pending')}`
                  const arr = [{ key: 'transfer', short: T('نقل', 'Tr'), stage: stOf(sd.transfer), full: T('النقل', 'Transfer') }]
                  arr.push({ key: 'insurance', short: T('تأمين', 'Ins'), stage: stOf(sd.insurance), full: T('التأمين', 'Insurance') })
                  if (!tcRow.transfer_only) arr.push({ key: 'workpermit', short: T('رخصة', 'WP'), stage: stOf(sd.work_permit), full: T('رخصة العمل', 'Work Permit') })
                  arr.push({ key: 'muqeem', short: T('إقامة', 'Iqama'), stage: stOf(sd.muqeem), full: T('الإقامة', 'Iqama') })
                  return arr.map(s => ({ ...s, title: stTitle(s.full, s.stage) }))
                })()
                // تجديد الإقامة: مرحلتان (التأمين · الإقامة) — تاق لكل مرحلة في كرت القائمة، مثل نقل الكفالة.
                const isRenewalCard = baseSvcCode(svcCode) === 'iqama_renewal'
                const renewalStages = (() => {
                  if (!isRenewalCard) return []
                  const rcArr = Array.isArray(r.iqama_renewal_calculation) ? r.iqama_renewal_calculation : (r.iqama_renewal_calculation ? [r.iqama_renewal_calculation] : [])
                  const rcRow = rcArr.find(x => x && x.deleted_at == null) || rcArr[0] || null
                  if (!rcRow) return []
                  const sd = (rcRow.stage_data && typeof rcRow.stage_data === 'object') ? rcRow.stage_data : {}
                  const stOf = o => !o ? 'new' : o.status === 'cancelled' ? 'cancelled' : o.status === 'skipped' ? 'skipped' : 'done'
                  const stTitle = (full, st) => `${full} — ${st === 'done' ? T('منجز', 'Completed') : st === 'cancelled' ? T('ملغاة', 'Cancelled') : st === 'skipped' ? T('لا يحتاج', 'Not needed') : T('بالانتظار', 'Pending')}`
                  const arr = [
                    { key: 'insurance', short: T('تأمين', 'Ins'), stage: stOf(sd.insurance), full: T('التأمين', 'Insurance') },
                    { key: 'iqama', short: T('إقامة', 'Iqama'), stage: stOf(sd.iqama), full: T('الإقامة', 'Iqama') },
                  ]
                  return arr.map(s => ({ ...s, title: stTitle(s.full, s.stage) }))
                })()
                const d = {
                  name: party?.name_ar || party?.name_en || T('— بدون عميل —', '— no client —'),
                  partyIsWorker,
                  partyId,
                  partyIdLabel: partyIsWorker ? T('رقم الإقامة', 'Iqama number') : T('رقم الهوية', 'ID number'),
                  phone, phoneDisplay: phone ? phone.replace(/^966/, '0') : '',
                  branchCode: r.branch?.branch_code || '',
                  agentName: (r.agent?.name_ar || r.agent?.name_en) ? (isAr ? (r.agent.name_ar || r.agent.name_en) : (r.agent.name_en || r.agent.name_ar)) : '',
                  flagUrl: nat?.flag_url || '', flagAlt: nat?.name_ar || '', flagEmojiChar: flagEmoji(nat?.code),
                  svc, svcCode, svcIcon, fullLabel, qty, showQty: isVisa && qty > 0,
                  total, paid, remaining, pct,
                  pay, payT, cancelled, overdueDays, refundedAmt, isToday, dayMoney,
                  shortDate, invoiceNo: r.invoice_no,
                  reqStatusCode: r.service_request?.status?.code || null,
                  acctStatus: r.service_request?.accountant_status || null,
                  permIqamaDone, permVisaIssued, visaStages, visaStageTips, isVisaCard: isPermVisaCard, stageTags: isTransferCard ? transferStages : renewalStages,
                  reqDoneLabel: permIqamaDone ? T('منجز', 'Completed') : null,
                  // تعديل الراتب: مرحلة إرجاع الراتب (لعرض تاقين منفصلين في كرت القائمة).
                  salaryPhase: baseSvcCode(svcCode) === 'name_translation'
                    ? ((Array.isArray(sr?.other_applications) ? sr.other_applications[0] : sr?.other_applications)?.details?.salary_phase || null)
                    : null,
                }
                return <InvCard key={r.id} d={d} row={r} sb={sb} T={T} isAr={isAr} toast={toast} onClick={() => setDetail(r)} />
              })}
            </div>
          </div>
        )
      })}

      {/* Pagination — Slim split with divider lines */}
      {!loading && total > PAGE && (() => {
        const goPrev = () => { setPage(p => Math.max(0, p - 1)); document.querySelector('.dash-content')?.scrollTo({ top: 0, behavior: 'smooth' }) }
        const goNext = () => { setPage(p => p + 1); document.querySelector('.dash-content')?.scrollTo({ top: 0, behavior: 'smooth' }) }
        const goTo = n => { setPage(Math.max(0, Math.min(totalPages - 1, n))); document.querySelector('.dash-content')?.scrollTo({ top: 0, behavior: 'smooth' }) }
        const PrevIco = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        const NextIco = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        const prevDisabled = page === 0
        const nextDisabled = page + 1 >= totalPages
        const fromN = (page*PAGE)+1
        const toN = Math.min(total,(page+1)*PAGE)
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderTop: '1px solid var(--bd)', margin: '4px 4px 14px' }}>
          <style>{`
            .inv-pg-btn{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);border:none;color:${C.gold};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:.2s;font-family:${F}}
            .inv-pg-btn:hover:not(:disabled){background:${C.gold};color:#000}
            .inv-pg-btn:disabled{cursor:not-allowed;color:var(--tx4);background:rgba(255,255,255,.06)}
            .inv-pg-input{width:42px;height:32px;background:transparent;border:none;outline:none;color:${C.gold};font-family:${F};font-size:14px;font-weight:700;text-align:center;direction:ltr;-moz-appearance:textfield;font-variant-numeric:tabular-nums}
            .inv-pg-input::-webkit-outer-spin-button,.inv-pg-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
          `}</style>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 13, color: 'var(--tx)', fontWeight: 700, fontFamily: F }}><span style={{ color: C.gold }}>{fromN}–{toN}</span> {T('من','of')} {num(total)}</span>
            <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 500, fontFamily: F }}>{T('صفحة','Page')} {page+1} {T('من','of')} {totalPages}</span>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <button className="inv-pg-btn" disabled={prevDisabled} onClick={goPrev} aria-label={T('السابق','Prev')}><PrevIco/></button>
            <input className="inv-pg-input" type="number" min={1} max={totalPages} value={page+1} onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) goTo(v-1) }}/>
            <button className="inv-pg-btn" disabled={nextDisabled} onClick={goNext} aria-label={T('التالي','Next')}><NextIco/></button>
          </div>
        </div>
      })()}

      </>)}

    </div>
  )
}

/* ═════════════ Full-page detail ═════════════ */
function InvoiceDetailPage({ sb, inv: invProp, onBack, isAr, T, toast, user, onOpenService }) {
  // Keep a local copy of the invoice so we can re-fetch its totals after a
  // payment/refund/cancel without leaving the detail page. invProp is the
  // original row from the list; once we re-fetch, `inv` becomes the fresh one.
  const [inv, setInv] = useState(invProp)
  // نُعيد ضبط النسخة المحلية فقط عند تغيّر الفاتورة نفسها (الانتقال لفاتورة أخرى) — لا على كل إعادة تصيير
  // للأب (كتحديث ساعة الهيدر كل ثانية)، وإلا يُستبدل صفّ الفاتورة المُحدَّث (remaining=0) بصفّ القائمة القديم
  // (remaining>0) فيومض زر «تسجيل دفعة» ظهوراً واختفاءً رغم أن الفاتورة مدفوعة بالكامل.
  useEffect(() => { setInv(invProp) }, [invProp.id])   // eslint-disable-line react-hooks/exhaustive-deps
  const [data, setData] = useState({ loading: true })
  const [actionModal, setActionModal] = useState(null)
  // نقل الكفالة: مرحلة «حالة المعاملة» الحالية (insurance · workpermit · muqeem). null لبقية الخدمات.
  const [doneStage, setDoneStage] = useState(null)
  const [workerModal, setWorkerModal] = useState(false)
  const [svcModal, setSvcModal] = useState(false)
  // تعديل المكتب فقط — للخدمات ذات الجداول المخصّصة (نقل/أجير/تجديد/إصدار إقامة) التي لا تستخدم نافذة «تعديل تفاصيل الخدمة».
  const [officeModal, setOfficeModal] = useState(false)
  const [clientModal, setClientModal] = useState(false)
  const [agentModal, setAgentModal] = useState(false)
  const [noteModal, setNoteModal] = useState(false)
  const [pricingModal, setPricingModal] = useState(false)
  const [visaEditModal, setVisaEditModal] = useState(false)
  const [borderModal, setBorderModal] = useState(false)
  const [iqamaModal, setIqamaModal] = useState(false)
  // تأشيرة وإقامة دائمة — مرحلتان إضافيتان (التأمين · رخصة العمل) تُدخلان في أي وقت بعد إصدار التأشيرة.
  const [insuranceModal, setInsuranceModal] = useState(false)
  const [workPermitModal, setWorkPermitModal] = useState(false)
  const [payEdit, setPayEdit] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)

  // Re-fetch the FULL invoice row on open and after each action and merge it into inv.
  // We pull INVOICE_SELECT (not just totals) so that the joined party/pricing/note fields
  // — client, agent, pricing_breakdown, note_public, cancel_log, branch, request status —
  // also reflect the DB on open and after every payment/refund/cancel/edit, not only the
  // totals/status. This guarantees the summary AND the من/إلى + pricing cards match the DB
  // even when the list row that opened the page was stale (e.g. a concurrent edit).
  useEffect(() => {
    if (!sb) return
    let alive = true
    ;(async () => {
      const { data: row } = await sb.from('invoices')
        .select(INVOICE_SELECT)
        .eq('id', invProp.id).maybeSingle()
      if (alive && row) setInv(prev => ({ ...prev, ...row }))
    })()
    return () => { alive = false }
  }, [refreshTick, sb, invProp.id])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const code = inv.service_type?.code
      const srId = inv.service_request?.id

      const SELECTS = {
        work_visa: `id,visa_number,visa_cost,border_number,unified_number,worker_name,wakalah_number,wakalah_date,wakalah_office,visa_used,visa_used_date_check,gender,file_number,visa_issue_date,created_at,updated_at,
          main_facility:main_facility_id(name_ar,unified_number,gosi_number,qiwa_prefix,qiwa_number),
          nationality:nationality_id(name_ar,name_en),
          occupation:occupation_id(name_ar,name_en),
          embassy:embassy_id(name_ar,name_en),
          visa_type:visa_type_id(value_ar,value_en),
          visa_order_kind:visa_order_kind_id(value_ar,value_en),
          wakalah_status:wakalah_status_id(value_ar,value_en),
          editor:updated_by(person:person_id(name_ar,name_en))`,
        transfer: `id,reference_number,total_price_initial,total_price_final,discount,office_cost,iqama_expiry_date,transfer_qiwa_status,transfer_muqeem_status,
          worker:worker_id(name_ar,name_en,iqama_number,phone),
          main_facility:main_facility_id(name_ar,unified_number,gosi_number,qiwa_prefix,qiwa_number),
          new_occupation:new_occupation_id(name_ar,name_en),
          status:status_id(value_ar,value_en),
          worker_status:worker_status_id(value_ar,value_en)`,
        iqama_renewal: `id,duration_months,current_expire_date,new_expire_date,
          worker:worker_id(name_ar,name_en,iqama_number),
          worker_facility:worker_facility_id(name_ar,unified_number)`,
        ajeer: `id,duration_months,start_date,end_date,notes,
          worker:worker_id(name_ar,name_en,iqama_number),
          ajeer_facility:ajeer_facility_id(name_ar,unified_number),
          main_facility:main_facility_id(name_ar,unified_number)`,
        iqama_issuance: `id,is_temporary,entry_date,check_date,worker_name_at_entry,
          iqama_status,iqama_number,iqama_expiry,iqama_amount,
          medical_status,medical_amount,
          work_permit_status,work_permit_expiry,work_permit_amount,
          insurance_status,insurance_amount,
          iqama_print_status,iqama_print_amount,iqama_delivery_status,
          contract_authentication_status,all_payment_status,
          worker:worker_id(name_ar,name_en,iqama_number),
          main_facility:main_facility_id(name_ar,unified_number,gosi_number,qiwa_prefix,qiwa_number)`,
        other: `id,description,details,
          worker:worker_id(id,name_ar,name_en,iqama_number,current_occupation:current_occupation_id(name_ar,name_en)),
          worker_facility:worker_facility_id(name_ar,unified_number)`,
        supplier_payroll: `id,description,unpaid_salaries_count,total_amount,worker_phone,
          worker:worker_id(id,name_ar,name_en,iqama_number),
          worker_facility:worker_facility_id(name_ar,unified_number)`,
      }
      const TABLES = { work_visa: 'visa_applications', transfer: 'transfer_applications', iqama_renewal: 'iqama_renewal_applications', ajeer: 'ajeer_applications', iqama_issuance: 'iqama_issuance_applications', supplier_payroll: 'supplier_payroll_applications', other: 'other_applications' }
      // Every service without a dedicated table (general, medical_insurance, exit_reentry_visa, the registry
      // tabs…) stores its detail row in other_applications, so unknown codes fall back to it.
      const tbl = TABLES[baseSvcCode(code)] || 'other_applications'
      const sel = SELECTS[baseSvcCode(code)] || SELECTS.other

      const isTransfer = baseSvcCode(code) === 'transfer'
      const branchId = inv.branch?.id
      const [insts, pays, det, quote, banks] = await Promise.all([
        sb.from('installments').select('id,installment_order,total_amount,paid_amount,expected_date,paid_date,receipt_no,bank_reference,notes,visa_application_id,visa_application:visa_application_id(border_number,file_number,gender,nationality:nationality_id(name_ar,name_en),occupation:occupation_id(name_ar,name_en),embassy:embassy_id(name_ar,name_en),iqama_issuance_applications(iqama_number,deleted_at)),payment_method:payment_method_id(value_ar,value_en),payment_milestone:payment_milestone_id(value_ar,value_en)').eq('invoice_id', inv.id).is('deleted_at', null).order('installment_order'),
        sb.from('payments').select('id,amount,payment_date,is_valid,receipt_no,bank_reference,notes,payment_method:payment_method_id(value_ar,value_en,code),installment_id,creator:created_by(person:person_id(name_ar,name_en))').eq('invoice_id', inv.id).is('deleted_at', null).order('payment_date', { ascending: false }),
        // ترتيب ثابت لصفوف التأشيرة (created_at ثم id) — حتى لا يتبدّل ترتيب/ترقيم التأشيرات بعد تحديث رقم الحدود.
        (tbl && srId)
          ? (tbl === 'visa_applications'
              ? sb.from(tbl).select(sel).eq('service_request_id', srId).order('created_at', { ascending: true }).order('id', { ascending: true })
              : sb.from(tbl).select(sel).eq('service_request_id', srId))
          : Promise.resolve({ data: [] }),
        // Transfer/renewal invoices link back to their pricing quote via <calc>.invoice_id.
        isTransfer ? sb.from('transfer_calculation').select('*').eq('invoice_id', inv.id).is('deleted_at', null).maybeSingle()
          : baseSvcCode(code) === 'iqama_renewal' ? sb.from('iqama_renewal_calculation').select('*').eq('invoice_id', inv.id).is('deleted_at', null).maybeSingle()
          : Promise.resolve({ data: null }),
        // حسابات بنك الفرع — تُطبع في الصفحة الثانية من الفاتورة (للتحويلات الواردة من العميل).
        branchId ? sb.from('bank_account_branches').select('account_purpose,bank_accounts!inner(bank_name,bank_name_en,account_name,account_name_en,account_number,iban,swift_code,is_active,deleted_at)').eq('branch_id', branchId).is('bank_accounts.deleted_at', null) : Promise.resolve({ data: [] }),
      ])
      // أبقِ فقط حسابات «التحويلات الواردة» (حيث يحوّل العميل مدفوعاته) بعد إزالة المكرر.
      const officeAccounts = (() => {
        const seen = new Set(), out = []
        for (const r of (banks?.data || [])) {
          const a = r.bank_accounts
          if (!a || a.is_active === false) continue
          if (!String(r.account_purpose || '').includes('التحويلات الواردة')) continue
          const key = (a.account_number || '') + '|' + (a.iban || '')
          if (seen.has(key)) continue
          seen.add(key); out.push(a)
        }
        return out
      })()
      // إيصالات الحوالات البنكية المرفقة بكل دفعة — تُعرض كرابط في صف الدفعة (نفس نمط صفحة الإيداعات).
      const payIds = (pays.data || []).map(p => p.id).filter(Boolean)
      const receiptsByPay = {}
      if (payIds.length) {
        const { data: atts } = await sb.from('attachments')
          .select('id,entity_id,file_name,file_url')
          .eq('entity_type', 'payment').eq('notes', 'bank_transfer_receipt')
          .in('entity_id', payIds).is('deleted_at', null)
        for (const a of (atts || [])) (receiptsByPay[a.entity_id] = receiptsByPay[a.entity_id] || []).push(a)
      }
      const paysWithReceipts = (pays.data || []).map(p => ({ ...p, receipts: receiptsByPay[p.id] || [] }))
      // صور جوازات العمال المرفقة بتأشيرات هذه الفاتورة (entity_type=visa_application, notes=passport) —
      // تُرفع عند سداد دفعة «إصدار الإقامة» وتُعرض في قسم «إصدار الإقامة» ببطاقة المعاملة.
      const passportByVisa = {}
      if (baseSvcCode(code) === 'work_visa') {
        const visaIds = (det.data || []).map(v => v.id).filter(Boolean)
        if (visaIds.length) {
          const { data: pAtts } = await sb.from('attachments')
            .select('id,entity_id,file_name,file_url,created_at')
            .eq('entity_type', 'visa_application').eq('notes', 'passport')
            .in('entity_id', visaIds).is('deleted_at', null).order('created_at', { ascending: false })
          for (const a of (pAtts || [])) (passportByVisa[a.entity_id] = passportByVisa[a.entity_id] || []).push(a)
        }
      }
      // الإقامات الصادرة لكل تأشيرة — لتحديد مرحلة كل تأشيرة (تأشيرة صادرة → إقامة صادرة) في أزرار الإنجاز المرحلية.
      let iqamaVisaIds = []
      const iqamaByVisa = {}   // visa_id → { iqama_number, iqama_expiry }
      const muqeemByVisa = {}  // visa_id → مرفق «ملف مقيم» الأحدث
      const visaFileByVisa = {} // visa_id → مرفق «ملف التأشيرة» الأحدث (يُرفق مع رقم الحدود)
      const visaInsFileByVisa = {} // visa_id → مرفق «ملف التأمين» (تأشيرة دائمة)
      const visaWpFileByVisa = {}  // visa_id → مرفق «ملف رخصة العمل» (تأشيرة دائمة)
      if (baseSvcCode(code) === 'work_visa') {
        const visaIds = (det.data || []).map(v => v.id).filter(Boolean)
        if (visaIds.length) {
          const { data: iqRows } = await sb.from('iqama_issuance_applications')
            .select('visa_application_id,iqama_number,iqama_expiry,stage_data,created_at,creator:created_by(person:person_id(name_ar,name_en))').in('visa_application_id', visaIds).is('deleted_at', null)
          iqamaVisaIds = (iqRows || []).map(r => r.visa_application_id).filter(Boolean)
          for (const r of (iqRows || [])) if (r.visa_application_id) iqamaByVisa[r.visa_application_id] = r
          const { data: mAtts } = await sb.from('attachments')
            .select('entity_id,file_name,file_url,notes,created_at')
            .eq('entity_type', 'visa_application').in('notes', ['muqeem', 'visa_file', 'visa_ins_file', 'visa_wp_file'])
            .in('entity_id', visaIds).is('deleted_at', null).order('created_at', { ascending: false })
          for (const a of (mAtts || [])) {
            if (a.notes === 'visa_file') { if (!visaFileByVisa[a.entity_id]) visaFileByVisa[a.entity_id] = a }
            else if (a.notes === 'visa_ins_file') { if (!visaInsFileByVisa[a.entity_id]) visaInsFileByVisa[a.entity_id] = a }
            else if (a.notes === 'visa_wp_file') { if (!visaWpFileByVisa[a.entity_id]) visaWpFileByVisa[a.entity_id] = a }
            else if (a.notes === 'muqeem') { if (!muqeemByVisa[a.entity_id]) muqeemByVisa[a.entity_id] = a }
          }
        }
      }
      // تغيير المهنة: المهنة تُخزَّن كاسم عربي نصّي في details — نجلب خريطة (عربي→إنجليزي) لترجمتها في الطباعة.
      let occMap = null
      if (code === 'profession_change') {
        const { data: occs } = await sb.from('occupations').select('name_ar,name_en').is('is_active', true).limit(5000)
        occMap = {}
        for (const o of (occs || [])) if (o.name_ar) occMap[o.name_ar] = o.name_en || o.name_ar
      }
      // نقل الكفالة: مرفق «ملف مقيم» المُدخل في نافذة بيانات التجديد (entity_type=service_request, notes=muqeem_file).
      let muqeemFile = null
      // مرفقات مراحل نقل الكفالة (tr_ins_file/tr_wp_file/muqeem_file) وتجديد الإقامة (ren_ins_file/ren_muqeem_file) — الأحدث لكلٍّ.
      let insFileAtt = null, wpFileAtt = null
      const isRenewalSvc = baseSvcCode(code) === 'iqama_renewal'
      if ((isTransfer || isRenewalSvc) && srId) {
        const { data: trAtts } = await sb.from('attachments')
          .select('file_name,file_url,notes,created_at')
          .eq('entity_type', 'service_request').in('notes', ['muqeem_file', 'tr_ins_file', 'tr_wp_file', 'ren_ins_file', 'ren_muqeem_file'])
          .eq('entity_id', srId).is('deleted_at', null).order('created_at', { ascending: false })
        for (const a of (trAtts || [])) {
          if (a.notes === 'muqeem_file' || a.notes === 'ren_muqeem_file') { if (!muqeemFile) muqeemFile = a }
          else if (a.notes === 'tr_ins_file' || a.notes === 'ren_ins_file') { if (!insFileAtt) insFileAtt = a }
          else if (a.notes === 'tr_wp_file') { if (!wpFileAtt) wpFileAtt = a }
        }
      }
      // المستندات: مرفق ملف المستند المُدخل عند الإنجاز (entity_type=service_request, notes=document_file).
      let documentFile = null
      if (baseSvcCode(code) === 'documents' && srId) {
        const { data: doc } = await sb.from('attachments')
          .select('file_name,file_url,created_at')
          .eq('entity_type', 'service_request').eq('notes', 'document_file')
          .eq('entity_id', srId).is('deleted_at', null).order('created_at', { ascending: false }).limit(1).maybeSingle()
        documentFile = doc || null
      }
      // مرفقات إنجاز الخدمات المُدارة بالسجل (طباعة الإقامة · التأمين · تغيير المهنة · تعديل الراتب):
      // نحمّلها دفعة كخريطة { notes: {file_name,file_url} } — الأحدث لكل مفتاح.
      let doneFilesMap = {}
      if (srId && SELF_PARTY_DONE_SVCS.includes(baseSvcCode(code))) {
        const { data: atts } = await sb.from('attachments')
          .select('file_name,file_url,notes,created_at')
          .eq('entity_type', 'service_request').eq('entity_id', srId)
          .in('notes', DONE_FILE_NOTES).is('deleted_at', null).order('created_at', { ascending: false })
        for (const a of (atts || [])) if (!doneFilesMap[a.notes]) doneFilesMap[a.notes] = a
      }
      // علم جنسية العامل في حسبة التنازل (تُخزَّن الجنسية كاسم/معرّف فقط) — نجلب flag_url لعرضه في الطباعة.
      const tc = quote?.data || null
      if (tc && (tc.nationality_id || tc.nationality)) {
        const natQ = tc.nationality_id
          ? sb.from('nationalities').select('flag_url').eq('id', tc.nationality_id).maybeSingle()
          : sb.from('nationalities').select('flag_url').eq('name_ar', tc.nationality).maybeSingle()
        const { data: natRow } = await natQ
        if (natRow?.flag_url) tc.nationality_flag = natRow.flag_url
      }
      if (alive) setData({ loading: false, insts: insts.data || [], pays: paysWithReceipts, det: det.data || [], code, quote: quote?.data?.quote_no || null, absherDiscount: Number(quote?.data?.absher_discount || 0), tc, officeAccounts, passports: passportByVisa, occMap, iqamaVisaIds, iqamaByVisa, muqeemByVisa, visaFileByVisa, visaInsFileByVisa, visaWpFileByVisa, muqeemFile, insFileAtt, wpFileAtt, documentFile, doneFilesMap })
    })()
    return () => { alive = false }
    // refreshTick forces a re-fetch after a payment/refund/cancel so installments+payments stay in sync.
  }, [sb, inv.id, inv.service_type?.code, inv.service_request?.id, refreshTick])

  const svc = svcThemeFor(inv.service_type)
  const pay = inferPayState(inv)
  const payT = PAY_THEME[pay]
  const total = Number(inv.total_amount || 0)
  const paid = Number(inv.paid_amount || 0)
  const remaining = Number(inv.remaining_amount || 0)
  const pct = total ? Math.min(100, Math.round((paid / total) * 100)) : 0
  const todayStr = new Date().toISOString().slice(0, 10)
  // فاتورة ملغاة لا التزامات عليها — لا نُظهر شارة «دفعة متأخرة» فوق ختم «ملغاة».
  const overdueCount = inv.status?.code === 'cancelled' ? 0 : (data.insts || []).filter(i => {
    const insTotal = Number(i.total_amount || 0)
    const insPaid = Number(i.paid_amount || 0)
    return insTotal > insPaid && i.expected_date && i.expected_date < todayStr
  }).length

  const onRecordPayment = () => setActionModal('payment')
  const onRefund        = () => setActionModal('refund')
  const onCancelInv     = () => setActionModal('cancel')
  const onPrint         = () => setActionModal('print')
  const onMarkDone      = () => { setDoneStage(null); setActionModal('done') }
  const onReturnSalary  = () => setActionModal('salary_return')
  // نقل الكفالة: فتح مرحلة محددة من «حالة المعاملة» (التأمين → رخصة العمل → بيانات مقيم).
  const openTransferStage = (s) => { setDoneStage(s); setActionModal('done') }

  // After any edit (worker/service/client/agent/note/pricing/visa), bump the tick: the
  // mount effect above now re-pulls the FULL INVOICE_SELECT (joined worker/facility live on
  // service_request) and the data effect re-pulls insts/pays/det — so a single tick refreshes
  // every card. (Kept as a named handler so all edit modals share one onSaved.)
  const reloadInvoiceFull = async () => {
    setRefreshTick(t => t + 1)
  }

  // فاتورة ملغاة = للقراءة فقط: نُخفي كل أزرار التعديل في كل البطاقات
  // بتمرير معالجات onEdit* كـ undefined (البطاقات تُظهر زر التعديل فقط عند وجود المعالج).
  const cancelledRO = inv.status?.code === 'cancelled'

  // إذا كانت المعاملة منجزة، إلغاء/استرجاع الفاتورة يقتصر على المدير العام فقط.
  // (gmLock صحيح فقط لغير المدير العام عندما تكون المعاملة منجزة.)
  const reqDone = inv.service_request?.status?.code === 'done'
  const gmLock = reqDone && !isGM(user)

  // ─── تأشيرة وإقامة دائمة: إنجاز مرحلي لكل تأشيرة (إصدار التأشيرات → إصدار الإقامات) ───
  // الحالة تُشتقّ من البيانات بلا أعمدة جديدة: رقم الحدود = «تأشيرة صادرة»، ووجود صف إقامة = «إقامة صادرة».
  // الدفع محترم: إدخال أرقام الحدود يتطلب سداد دفعة «إصدار التأشيرة»؛ وإنشاء إقامة تأشيرةٍ يتطلب سداد دفعة إقامتها.
  // المؤقتة تعرض نفس مراحل الدائمة بالكامل (إصدار التأشيرة → إصدار الإقامة)؛ الفرق الوحيد أن الدفعة
  // المشروطة برقم الحدود هي «التوكيل» لكل تأشيرة في المؤقتة و«إصدار الإقامة» لكل تأشيرة في الدائمة.
  const isPermVisa = inv.service_type?.code === 'work_visa_permanent' || inv.service_type?.code === 'work_visa_temporary'
  const stageVisas = isPermVisa ? (data.det || []).filter(v => v && v.id) : []
  const stageInsts = data.insts || []
  const iqamaSet = new Set(data.iqamaVisaIds || [])
  // مصدر فوري لحالة المراحل أثناء التحميل: تأشيرات الطلب المُحمّلة مع الفاتورة (border_number + iqama_issuance).
  const reqVisas = isPermVisa && Array.isArray(inv.service_request?.visa_applications) ? inv.service_request.visa_applications.filter(v => v && v.id) : []
  const stageVisaSrc = stageVisas.length ? stageVisas : reqVisas
  // «تم إصدار الإقامة» = بيانات الإقامة مُدخلة فعلاً (رقم إقامة)، لا مجرد وجود صف إصدار (يُنشأ عند سداد دفعة
  // الإصدار بلا بيانات). هكذا يبقى زر «بيانات الإقامة» ظاهراً والحالة «تم إصدار التأشيرة» حتى تُدخل البيانات.
  const iqamaNumOf = vid => String((data.iqamaByVisa || {})[vid]?.iqama_number || '').trim()
  const visaIqamaDone = v => !!iqamaNumOf(v.id) || (Array.isArray(v.iqama_issuance_applications) ? v.iqama_issuance_applications : (v.iqama_issuance_applications ? [v.iqama_issuance_applications] : [])).some(x => x && x.deleted_at == null && String(x.iqama_number || '').trim())
  const instMilestone = it => (it.payment_milestone ? (isAr ? it.payment_milestone.value_ar : (it.payment_milestone.value_en || it.payment_milestone.value_ar)) : '') || it.notes || ''
  const isResidenceInst = it => !!it.visa_application_id || /إقامة|اقامة|iqama|residence/i.test(instMilestone(it))
  const isAuthInst = it => !it.visa_application_id && /توكيل|تفويض|authoriz|wakal/i.test(instMilestone(it))
  const instSettled = it => (Number(it.total_amount || 0) - Number(it.paid_amount || 0)) <= 0.005
  // دفعة «إصدار التأشيرة» المشتركة = المرحلة الأولى (بلا ربط تأشيرة، وليست توكيلاً ولا إقامة).
  const issuanceInsts = stageInsts.filter(it => !isResidenceInst(it) && !isAuthInst(it))
  const issuancePaid = issuanceInsts.length ? issuanceInsts.every(instSettled) : true
  // دفعة الإقامة الخاصة بتأشيرة (المرتبطة بـ visa_application_id) مسدّدة بالكامل.
  const residencePaidOf = vid => { const it = stageInsts.find(x => x.visa_application_id === vid); return it ? instSettled(it) : false }
  const visaStageOf = v => iqamaSet.has(v.id) ? 'iqama' : (v.border_number ? 'visa' : 'pending')
  const visasAllIssued = stageVisaSrc.length > 0 && stageVisaSrc.every(v => !!v.border_number)
  const iqamasAllIssued = stageVisaSrc.length > 0 && stageVisaSrc.every(visaIqamaDone)
  // Branch gate: the user's role must grant invoices in THIS invoice's branch.
  const invBranchCan = canTabBranch(user, 'invoices', inv.branch_id || inv.branch?.id || null)
  const canStageEdit = !cancelledRO && invBranchCan && canPerm(user, 'invoices.edit')

  // المراحل تنقسم لقسمين بحسب طلب التصميم:
  //   • stageActions = الأزرار القابلة للضغط (مرحلة لم تُنجَز بعد) → تُعرض في الهيدر بتصميم زر «تسجيل دفعة».
  //   • stageStatus  = شارات الحالة المنجزة → تُعرض أسفل عدّادات الدفعات داخل الكرت المالي.
  const visaDataLabel = T(stageVisaSrc.length > 1 ? 'التأشيرات' : 'التأشيرة', stageVisaSrc.length > 1 ? 'Visas' : 'Visa')
  const stageActions = []
  const stageStatus = []
  // أزرار مراحل التأشيرة تُحسب من بيانات الفاتورة الفورية فتظهر دون انتظار التحميل الكامل؛ تبقى معطّلة
  // أثناء التحميل فقط (لتفادي فتح نافذة بلا بيانات). بقية الخدمات تنتظر التحميل كالسابق.
  if (isPermVisa) {
    // إنجاز مرحلي لكل تأشيرة على حدة: ما إن يُدخَل رقم حدود تأشيرةٍ تصبح جاهزة لإصدار إقامتها فيظهر زر
    // «بيانات الإقامات» (مقصوراً على التأشيرات الجاهزة)، حتى لو بقيت تأشيرات أخرى بلا أرقام حدود — فيظلّ
    // زر «بيانات التأشيرات» ظاهراً لها أيضاً. هكذا قد يظهر الزرّان معاً في الحالة المختلطة.
    const anyPending = stageVisaSrc.some(v => !String(v.border_number || '').trim())
    // تأشيرة دائمة: الإقامة لا تُفتح لتأشيرةٍ حتى يُنجَز تأمينها ورخصة عملها معاً. المؤقتة بلا هذا الشرط.
    const isPermanentVisa = inv.service_type?.code === 'work_visa_permanent'
    const permStagesDoneOf = v => { const sd = (data.iqamaByVisa || {})[v.id]?.stage_data || {}; return !!sd.insurance && !!sd.work_permit }
    const iqamaStagesReady = v => !isPermanentVisa || permStagesDoneOf(v)
    const anyReadyForIqama = stageVisaSrc.some(v => !!String(v.border_number || '').trim() && !visaIqamaDone(v) && iqamaStagesReady(v))
    if (iqamasAllIssued) {
      // إصدار الإقامة يستلزم إصدار التأشيرة ضمناً، فعند اكتماله نُظهر «تم إصدار الإقامة» فقط.
      stageStatus.push(<StageRow key="iqama" done icon={<DoneCheckIco />} label={T(stageVisaSrc.length > 1 ? 'تم إصدار الإقامات' : 'تم إصدار الإقامة', stageVisaSrc.length > 1 ? 'Iqamas issued' : 'Iqama issued')} />)
    } else {
      // زر «بيانات التأشيرات» — للتأشيرات التي لم يُدخَل لها رقم حدود بعد (النافذة تعرض غير المكتملة فقط).
      if (anyPending && modalAllowed(user, 'invoices', 'inv_border_numbers')) {
        stageActions.push(<StageRow key="visa" color={C.gold} label={visaDataLabel} icon={<VisaDataIco />}
          disabled={!canStageEdit || data.loading || !issuancePaid}
          title={!issuancePaid ? T('ادفع دفعة «إصدار التأشيرة» أولاً','Pay the visa-issuance installment first') : undefined}
          onClick={() => setBorderModal(true)} />)
      } else if (visasAllIssued) {
        // كل التأشيرات صدرت ولا تأشيرات معلّقة → شارة «تم إصدار التأشيرات» المنجزة.
        stageStatus.push(<StageRow key="visa" done icon={<DoneCheckIco />} label={T(stageVisaSrc.length > 1 ? 'تم إصدار التأشيرات' : 'تم إصدار التأشيرة', stageVisaSrc.length > 1 ? 'Visas issued' : 'Visa issued')} />)
      }
      // زر «بيانات الإقامات» — يظهر بمجرد جاهزية تأشيرة واحدة (رقم حدودها مُدخَل وإقامتها لم تُصدر).
      if (anyReadyForIqama && modalAllowed(user, 'invoices', 'inv_iqama_issue')) {
        stageActions.push(<StageRow key="iqama" color={C.gold} label={T(stageVisaSrc.length > 1 ? 'الإقامات' : 'الإقامة', stageVisaSrc.length > 1 ? 'Iqamas' : 'Iqama')} icon={<IqamaDataIco />} disabled={!canStageEdit || data.loading} onClick={() => setIqamaModal(true)} />)
      }
    }
    // تأشيرة وإقامة دائمة فقط: مرحلتان إضافيتان «التأمين» و«رخصة العمل» — تُدخلان في أي وقت بعد إصدار التأشيرة،
    // بلا ترتيب بينهما وبلا ربط بالدفع. تُخزَّن في stage_data على صف إصدار الإقامة لكل تأشيرة.
    if (inv.service_type?.code === 'work_visa_permanent') {
      const issuedVisas = (data.det || []).filter(v => v && v.id && String(v.border_number || '').trim())
      const stageDataOf = vid => (data.iqamaByVisa || {})[vid]?.stage_data || {}
      const insAllDone = issuedVisas.length > 0 && issuedVisas.every(v => !!stageDataOf(v.id).insurance)
      const wpAllDone = issuedVisas.length > 0 && issuedVisas.every(v => !!stageDataOf(v.id).work_permit)
      if (!data.loading && issuedVisas.length > 0) {
        if (insAllDone) stageStatus.push(<StageRow key="st-ins" done icon={<DoneCheckIco />} label={T('تم إدخال بيانات التأمين', 'Insurance saved')} />)
        else if (canStageEdit && modalAllowed(user, 'invoices', 'inv_visa_stage_insurance')) stageActions.push(<StageRow key="ins" color={C.gold} label={T('التأمين', 'Insurance')} icon={<RenewalDataIco />} onClick={() => setInsuranceModal(true)} />)
        if (wpAllDone) stageStatus.push(<StageRow key="st-wp" done icon={<DoneCheckIco />} label={T('تم إدخال رخصة العمل', 'Work permit saved')} />)
        else if (canStageEdit && modalAllowed(user, 'invoices', 'inv_visa_stage_work_permit')) stageActions.push(<StageRow key="wp" color={C.gold} label={T('رخصة العمل', 'Work permit')} icon={<RenewalDataIco />} onClick={() => setWorkPermitModal(true)} />)
      }
    }
  } else if (!data.loading) {
    // الحالات النهائية لا تُظهر زر إجراء: منجز (شارة) · ملغى · رفض المحاسب للنقل الخارجي.
    const _c = inv.service_type?.code
    const reqCancelled = inv.service_request?.status?.code === 'cancelled'
    const acctRejected = needsAcctApproval(_c) && inv.service_request?.accountant_status === 'rejected'
    if (reqDone) {
      // تعديل الراتب: المعاملة منجزة لكنها «بانتظار إرجاع الراتب الأساسي» — نعرض زر «إرجاع الراتب».
      const salaryPhase = (Array.isArray(data?.det) ? data.det[0] : null)?.details?.salary_phase
      if (baseSvcCode(_c) === 'name_translation' && salaryPhase === 'awaiting_return') {
        stageStatus.push(<StageRow key="done" done icon={<DoneCheckIco />} label={T('منجزة · بانتظار إرجاع الراتب الأساسي','Completed · awaiting base-salary return')} />)
        if (!cancelledRO && !reqCancelled && canPerm(user, 'invoices.edit') && modalAllowed(user, 'invoices', 'inv_action_salary_return')) {
          stageActions.push(<StageRow key="salreturn" color={C.gold} label={T('إرجاع الراتب','Salary Return')} icon={<RenewalDataIco />} onClick={onReturnSalary} />)
        }
      } else {
        stageStatus.push(<StageRow key="done" done icon={<DoneCheckIco />} label={T('المعاملة منجزة','Transaction completed')} />)
      }
    } else if (!cancelledRO && !reqCancelled && !acctRejected && canPerm(user, 'invoices.edit') && modalAllowed(user, 'invoices', 'inv_action_done')) {
      // زر المرحلة يخصّ كل خدمة: نقل الكفالة يفتح «بيانات التجديد» (مهنة + انتهاء الإقامة + ملف مقيم)،
      // وبقية الخدمات (رواتب سبلاير/المستندات/النقل الخارجي) تفتح نافذة «حالة المعاملة».
      const isTransferStage = baseSvcCode(_c) === 'transfer'
      const isRenewalStage = baseSvcCode(_c) === 'iqama_renewal'
      if (isTransferStage) {
        // نقل الكفالة: «حالة المعاملة» على 3 مراحل متتابعة — التأمين ← رخصة العمل (تُتخطّى عند «نقل فقط») ← بيانات مقيم.
        const tc = data?.tc || {}
        const sd = (tc.stage_data && typeof tc.stage_data === 'object') ? tc.stage_data : {}
        const transferOnly = !!tc.transfer_only
        const transferDone = !!sd.transfer
        const insDone = !!sd.insurance
        const wpDone = !!sd.work_permit
        // مكتملة فقط بعد إدخال المرحلة فعلاً — لا من أعمدة الحسبة (المهنة/الانتهاء المتوقع) الموجودة سلفاً.
        const muqeemDone = !!sd.muqeem
        // شارات الحالة للمراحل المُنجَزة/الملغاة (تظهر أثناء التقدّم قبل اكتمال المعاملة).
        const transferCancelled = sd.transfer?.status === 'cancelled'
        const insCancelled = sd.insurance?.status === 'cancelled'
        const wpCancelled = sd.work_permit?.status === 'cancelled'
        if (transferDone) stageStatus.push(<StageRow key="st-tr" done color={transferCancelled ? C.red : C.ok} icon={<DoneCheckIco />} label={transferCancelled ? T('النقل — ملغاة','Transfer — cancelled') : T('تم النقل','Transfer done')} />)
        if (insDone) stageStatus.push(<StageRow key="st-ins" done color={insCancelled ? C.red : C.ok} icon={<DoneCheckIco />} label={insCancelled ? T('التأمين — ملغاة','Insurance — cancelled') : T('تم إدخال بيانات التأمين','Insurance saved')} />)
        if (!transferOnly && wpDone) stageStatus.push(<StageRow key="st-wp" done color={wpCancelled ? C.red : C.ok} icon={<DoneCheckIco />} label={wpCancelled ? T('رخصة العمل — ملغاة','Work permit — cancelled') : T('تم إدخال رخصة العمل','Work permit saved')} />)
        // المرحلة القابلة للإجراء التالية (بالتتابع) — النقل أولاً ثم التأمين ثم رخصة العمل ثم الإقامة.
        if (!transferDone) stageActions.push(<StageRow key="mark" color={C.gold} label={T('النقل','Transfer')} icon={<TransferStageIco />} onClick={() => openTransferStage('transfer')} />)
        else if (!insDone) stageActions.push(<StageRow key="mark" color={C.gold} label={T('التأمين','Insurance')} icon={<RenewalDataIco />} onClick={() => openTransferStage('insurance')} />)
        else if (!transferOnly && !wpDone) stageActions.push(<StageRow key="mark" color={C.gold} label={T('رخصة العمل','Work Permit')} icon={<RenewalDataIco />} onClick={() => openTransferStage('workpermit')} />)
        else if (!muqeemDone) stageActions.push(<StageRow key="mark" color={C.gold} label={T('الإقامة','Iqama')} icon={<RenewalDataIco />} onClick={() => openTransferStage('muqeem')} />)
      } else if (isRenewalStage) {
        // تجديد الإقامة: «حالة المعاملة» على مرحلتين متتابعتين — التأمين (مع خيار «لا يحتاج») ثم الإقامة.
        const tc = data?.tc || {}
        const sd = (tc.stage_data && typeof tc.stage_data === 'object') ? tc.stage_data : {}
        const insDone = !!sd.insurance
        const iqamaDone = !!sd.iqama
        const insCancelled = sd.insurance?.status === 'cancelled'
        const insSkipped = sd.insurance?.status === 'skipped'
        if (insDone) stageStatus.push(<StageRow key="st-ins" done color={insCancelled ? C.red : insSkipped ? C.gold : C.ok} icon={<DoneCheckIco />} label={insCancelled ? T('التأمين — ملغاة','Insurance — cancelled') : insSkipped ? T('التأمين — لا يحتاج','Insurance — not needed') : T('تم إدخال بيانات التأمين','Insurance saved')} />)
        if (!insDone) stageActions.push(<StageRow key="mark" color={C.gold} label={T('التأمين','Insurance')} icon={<RenewalDataIco />} onClick={() => openTransferStage('insurance')} />)
        else if (!iqamaDone) stageActions.push(<StageRow key="mark" color={C.gold} label={T('الإقامة','Iqama')} icon={<RenewalDataIco />} onClick={() => openTransferStage('iqama')} />)
      } else {
        // خدمات موافقة المحاسب قبل الموافقة: الزر يفتح مرحلة «موافقة المحاسب» — فنسمّيه بها وأيقونتها.
        const acctApprovalStage = needsAcctApproval(_c) && inv.service_request?.accountant_status !== 'approved'
        stageActions.push(acctApprovalStage
          ? <StageRow key="mark" color={C.gold} label={T('موافقة المحاسب','Accountant Approval')} icon={<AcctApprovalIco />} onClick={onMarkDone} />
          : <StageRow key="mark" color={C.gold} label={T('حالة المعاملة','Transaction Status')} icon={<TxnStatusIco />} onClick={onMarkDone} />)
      }
    }
  }

  return (
    <div style={{ fontFamily: F, paddingTop: 0, paddingBottom: 80, color: 'var(--tx2)' }}>
      {/* Top bar: back */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <BackButton onBack={onBack} label={T('رجوع','Back')} />
      </div>
      {/* Header — underlined title + tags */}
      <div style={{ marginBottom: 18, marginTop: 6 }}>
        {/* صف العنوان (يمين) + كتلة المراحل بتصميم زر «تسجيل دفعة» (يسار) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <line x1="10" y1="9" x2="8" y2="9"/>
            </svg>
            <div style={{ fontSize: 22, fontWeight: 600, color: C.gold, letterSpacing: '-.2px' }}>{T('تفاصيل الفاتورة','Invoice Details')}</div>
          </div>
          {stageActions.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap', minWidth: 220 }}>
              {stageActions}
            </div>
          )}
        </div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap', fontSize: 13, color: 'var(--tx3)' }}>
          {(() => {
            const isVisa = VISA_SVC_CODES.has(inv.service_type?.code)
            const visaApps = Array.isArray(inv.service_request?.visa_applications) ? inv.service_request.visa_applications : []
            const va = visaApps[0] || null
            // الكودان الجديدان (دائمة/مؤقتة) يحملان النوع في اسم الخدمة، فلا نُلحق نوع التأشيرة ثانيةً.
            const isSplitVisa = inv.service_type?.code === 'work_visa_permanent' || inv.service_type?.code === 'work_visa_temporary'
            const sub = (!isSplitVisa && va?.visa_type) ? (isAr ? va.visa_type.value_ar : (va.visa_type.value_en || va.visa_type.value_ar)) : null
            const qty = isVisa ? ((data?.det || []).length || visaApps.length || Number(inv.service_request?.quantity || 0)) : Number(inv.service_request?.quantity || 0)
            const full = [isAr ? (svc.label_ar_full || svc.label_ar) : (svc.label_en_full || svc.label_en), sub].filter(Boolean).join(' ')
            const showQty = isVisa && qty > 0
            return (
              <span style={{ color: C.gold, fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
                {showQty && <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 800 }}>×{qty}</span>}
                <span>{full}</span>
              </span>
            )
          })()}
          <span style={{ width: 3.5, height: 3.5, borderRadius: '50%', background: 'rgba(255,255,255,.2)' }} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, direction: 'ltr' }}>
            <CopyBtn text={noDash(inv.invoice_no)} />
            <span style={{ color: C.gold, fontFamily: 'monospace', fontWeight: 700, fontSize: 14 }}>{noDash(inv.invoice_no)}</span>
          </span>
          {inv.branch?.branch_code && (
            <>
              <span style={{ width: 3.5, height: 3.5, borderRadius: '50%', background: 'rgba(255,255,255,.2)' }} />
              <span title={T('المكتب','Branch')} style={{ color: C.gold, fontWeight: 700, fontSize: 13.5, direction: 'ltr', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span>{inv.branch.branch_code}</span>
              </span>
            </>
          )}
          <span style={{ width: 3.5, height: 3.5, borderRadius: '50%', background: 'rgba(255,255,255,.2)' }} />
          <span style={{ color: 'var(--tx4)', fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 5, direction: 'ltr' }}>
            <span style={{ direction: 'ltr' }}>{(() => {
              const d = inv.created_at ? new Date(inv.created_at) : null
              if (!d || isNaN(d)) return '—'
              const p = n => String(n).padStart(2, '0')
              return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} · ${p(d.getHours())}:${p(d.getMinutes())}`
            })()}</span>
          </span>
          {overdueCount > 0 && (
            <>
              <span style={{ width: 3.5, height: 3.5, borderRadius: '50%', background: 'rgba(255,255,255,.2)' }} />
              <span style={{ padding: '4px 11px', borderRadius: 999, background: 'rgba(229,134,122,.10)', border: '1px solid ' + C.red, color: C.red, fontSize: 11.5, fontWeight: 800, letterSpacing: '.3px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{overdueCount} {T(overdueCount === 1 ? 'دفعة متأخرة' : 'دفعات متأخرة', overdueCount === 1 ? 'overdue payment' : 'overdue payments')}</span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* شريط الإلغاء — ختم «ملغاة» مائل + سبب الإلغاء ومَن ألغى ومتى (من cancel_log). */}
      {inv.status?.code === 'cancelled' && (() => {
        const log = Array.isArray(inv.cancel_log) ? inv.cancel_log : []
        const last = log.length ? log[log.length - 1] : null
        const reason = (last?.reason || '').trim()
        return (
          <div style={{ position: 'relative', overflow: 'hidden', marginBottom: 18, borderRadius: 14, background: 'rgba(232,114,101,.07)', border: '1px solid rgba(232,114,101,.28)', padding: '15px 18px' }}>
            <div aria-hidden="true" style={{ position: 'absolute', top: '50%', insetInlineStart: '50%', transform: 'translate(-50%,-50%) rotate(-18deg)', fontSize: 52, fontWeight: 800, color: 'rgba(232,114,101,.10)', border: '3px solid rgba(232,114,101,.13)', borderRadius: 14, padding: '6px 38px', pointerEvents: 'none', whiteSpace: 'nowrap', fontFamily: F }}>
              {T('ملغاة','VOID')}
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 12, borderInlineStart: '3px solid ' + C.red, paddingInlineStart: 13 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.red, letterSpacing: '.2px' }}>{T('هذه الفاتورة ملغاة','This invoice is cancelled')}</div>
                {reason && (
                  <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.7, marginTop: 5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    <span style={{ color: C.red, fontWeight: 600 }}>{T('السبب','Reason')}: </span>{reason}
                  </div>
                )}
                {last && (last.by_name || last.at) && (
                  <div style={{ marginTop: 7, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--tx4)' }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span style={{ fontSize: 11.5, color: 'var(--tx4)', fontWeight: 600 }}>{T('تم الإلغاء','Cancelled')}{last.by_name ? ` ${T('بواسطة','by')} ${last.by_name}` : ''}</span>
                    {last.at && <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, direction: 'ltr', flexShrink: 0 }}>{fmtDateTime(last.at)}</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {data.loading ? <InvoiceDetailSkeleton /> : (
      <InvoiceDetailLayout user={user} inv={inv} data={data} isAr={isAr} T={T} svc={svc} payT={payT} total={total} paid={paid} remaining={remaining} pct={pct} stageStatus={[]} sb={sb} toast={toast} onRecordPayment={onRecordPayment} onRefund={onRefund} onCancelInv={onCancelInv} onPrint={onPrint} onEditWorker={cancelledRO || !canPerm(user, 'invoices.edit') || !modalAllowed(user, 'invoices', 'inv_worker_pick') ? undefined : () => setWorkerModal(true)} onEditService={cancelledRO || !canPerm(user, 'invoices.edit') || !modalAllowed(user, 'invoices', 'inv_service_edit') ? undefined : () => setSvcModal(true)} onEditOffice={cancelledRO || !canPerm(user, 'invoices.edit') || !modalAllowed(user, 'invoices', 'inv_service_edit') ? undefined : () => setOfficeModal(true)} onEditVisa={cancelledRO || !canPerm(user, 'invoices.edit') || !modalAllowed(user, 'invoices', 'inv_permanent_visa_edit') ? undefined : () => setVisaEditModal(true)} onEditBorders={cancelledRO || !canPerm(user, 'invoices.edit') || !modalAllowed(user, 'invoices', 'inv_border_numbers') ? undefined : () => setBorderModal(true)} onEditClient={cancelledRO || !canPerm(user, 'invoices.edit') || !modalAllowed(user, 'invoices', 'inv_client_edit') ? undefined : () => setClientModal(true)} onEditAgent={cancelledRO || !canPerm(user, 'invoices.edit') || !modalAllowed(user, 'invoices', 'inv_agent_edit') ? undefined : () => setAgentModal(true)} onEditNote={cancelledRO || !canPerm(user, 'invoices.edit') || !modalAllowed(user, 'invoices', 'inv_note_edit') ? undefined : () => setNoteModal(true)} onEditPricing={cancelledRO || !canPerm(user, 'invoices.edit') || !modalAllowed(user, 'invoices', 'inv_pricing_edit') ? undefined : () => setPricingModal(true)} onEditPayment={cancelledRO || !canPerm(user, 'invoices.record_payment') || !modalAllowed(user, 'invoices', 'inv_payment_edit') ? undefined : setPayEdit} canPayPerm={canPerm(user, 'invoices.record_payment')} canRefundPerm={canPerm(user, 'invoices.refund') && !gmLock} canCancelPerm={canPerm(user, 'invoices.cancel') && !gmLock} gmLock={gmLock} onOpenService={onOpenService} />
      )}

      {actionModal && <ActionModal type={actionModal} stage={doneStage} onClose={() => { setActionModal(null); setDoneStage(null) }} sb={sb} T={T} isAr={isAr} inv={inv} total={total} paid={paid} remaining={remaining} toast={toast} user={user} onSaved={() => setRefreshTick(t => t + 1)} visaDet={data?.det || []} svcCode={data?.code} insts={data?.insts || []} />}

      {workerModal && (
        <WorkerPickModal sb={sb} toast={toast} T={T} isAr={isAr}
          srId={inv.service_request?.id}
          currentWorker={data?.det?.[0]?.worker || null}
          editorId={user?.id || null}
          editorName={user?.person?.name_ar || user?.person?.name_en || null}
          onClose={() => setWorkerModal(false)}
          onSaved={reloadInvoiceFull} />
      )}

      {svcModal && (
        <ServiceEditModal sb={sb} toast={toast} T={T} isAr={isAr} user={user}
          srId={inv.service_request?.id}
          invId={inv.id}
          svcName={isAr ? (svc.label_ar_full || svc.label_ar) : (svc.label_en_full || svc.label_en)}
          svcCode={data?.code || inv.service_type?.code}
          currentDescription={data?.det?.[0]?.description || ''}
          currentBranchId={inv.branch?.id || null}
          currentDetails={data?.det?.[0]?.details || null}
          currentWorkerPhone={(Array.isArray(inv.service_request?.other_applications) ? inv.service_request.other_applications[0] : inv.service_request?.other_applications)?.worker_phone || ''}
          editorId={user?.id || null}
          editorName={user?.person?.name_ar || user?.person?.name_en || null}
          onClose={() => setSvcModal(false)}
          onSaved={reloadInvoiceFull} />
      )}

      {officeModal && (
        <OfficeEditModal sb={sb} toast={toast} T={T} user={user}
          srId={inv.service_request?.id}
          invId={inv.id}
          currentBranchId={inv.branch?.id || null}
          editorId={user?.id || null}
          editorName={user?.person?.name_ar || user?.person?.name_en || null}
          onClose={() => setOfficeModal(false)}
          onSaved={reloadInvoiceFull} />
      )}

      {clientModal && (() => {
        // «العميل هو نفس العامل»: العميل موجود لكن صفّ الطلب يحمل worker_id فارغاً مع worker_facility_id —
        // أي لا يوجد سجل عامل منفصل والمنشأة موجودة، فالعامل هو العميل نفسه. عندها نسمح بتعديل الجوال فقط.
        const sr = inv.service_request
        const pickW = rel => Array.isArray(rel) ? rel[0]?.worker : rel?.worker
        const pickF = rel => Array.isArray(rel) ? rel[0]?.facility : rel?.facility
        const apps = [sr?.transfer_applications, sr?.ajeer_applications, sr?.iqama_renewal_applications, sr?.supplier_payroll_applications, sr?.other_applications]
        const workerIsClient = !!sr?.client && !apps.some(pickW) && apps.some(pickF)
        // عامل الفاتورة (الدائم) — لقيد رقم جوال العميل ضمن «أرقام جوال الفواتير» للعامل تلقائياً.
        const linkedWorkerId = apps.map(pickW).find(Boolean)?.id || null
        return (
          <ClientEditModal sb={sb} toast={toast} T={T} user={user}
            client={sr?.client || null}
            workerIsClient={workerIsClient}
            linkedWorkerId={linkedWorkerId}
            editorId={user?.id || null}
            editorName={user?.person?.name_ar || user?.person?.name_en || null}
            invId={inv.id}
            onClose={() => setClientModal(false)}
            onSaved={reloadInvoiceFull} />
        )
      })()}

      {agentModal && (
        <AgentEditModal sb={sb} toast={toast} T={T} user={user}
          agent={inv.agent || inv.service_request?.service_request_agents?.[0]?.agent || null}
          editorId={user?.id || null}
          editorName={user?.person?.name_ar || user?.person?.name_en || null}
          invId={inv.id}
          onClose={() => setAgentModal(false)}
          onSaved={reloadInvoiceFull} />
      )}

      {noteModal && (
        <NoteEditModal sb={sb} toast={toast} T={T} inv={inv} user={user}
          editorId={user?.id || null}
          editorName={user?.person?.name_ar || user?.person?.name_en || null}
          onClose={() => setNoteModal(false)}
          onSaved={reloadInvoiceFull} />
      )}

      {pricingModal && (
        <PricingEditModal sb={sb} toast={toast} T={T} isAr={isAr} inv={inv} paid={paid} user={user}
          onClose={() => setPricingModal(false)}
          onSaved={reloadInvoiceFull} />
      )}

      {visaEditModal && (
        <PermanentVisaEditModal sb={sb} toast={toast} T={T} isAr={isAr} inv={inv} data={data}
          editorId={user?.id || null}
          editorName={user?.person?.name_ar || user?.person?.name_en || null}
          onClose={() => setVisaEditModal(false)}
          onSaved={reloadInvoiceFull} />
      )}

      {borderModal && (
        <BorderNumbersModal sb={sb} toast={toast} T={T} isAr={isAr} visas={data?.det || []}
          editorId={user?.id || null}
          editorName={user?.person?.name_ar || user?.person?.name_en || null}
          onClose={() => setBorderModal(false)}
          onSaved={reloadInvoiceFull} />
      )}

      {payEdit && (
        <PaymentEditModal sb={sb} toast={toast} T={T} isAr={isAr} inv={inv} payment={payEdit} user={user}
          onClose={() => setPayEdit(null)}
          onSaved={reloadInvoiceFull} />
      )}

      {iqamaModal && (
        <IqamaIssueModal sb={sb} toast={toast} T={T} isAr={isAr} inv={inv} user={user}
          visas={stageVisas} iqamaSet={iqamaSet} iqamaByVisa={data.iqamaByVisa || {}} residencePaidOf={residencePaidOf}
          onClose={() => setIqamaModal(false)}
          onSaved={reloadInvoiceFull} />
      )}

      {insuranceModal && (
        <VisaStageDataModal stage="insurance" sb={sb} toast={toast} T={T} isAr={isAr} inv={inv} user={user}
          visas={stageVisas} iqamaByVisa={data.iqamaByVisa || {}} fileByVisa={data.visaInsFileByVisa || {}}
          onClose={() => setInsuranceModal(false)}
          onSaved={reloadInvoiceFull} />
      )}

      {workPermitModal && (
        <VisaStageDataModal stage="work_permit" sb={sb} toast={toast} T={T} isAr={isAr} inv={inv} user={user}
          visas={stageVisas} iqamaByVisa={data.iqamaByVisa || {}} fileByVisa={data.visaWpFileByVisa || {}}
          onClose={() => setWorkPermitModal(false)}
          onSaved={reloadInvoiceFull} />
      )}
    </div>
  )
}

const fmtAmt = (v) => {
  const s = String(v ?? '')
  if (!s) return ''
  const [intPart, decPart] = s.split('.')
  const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decPart !== undefined ? `${withSep}.${decPart}` : withSep
}
const unfmtAmt = (s) => String(s ?? '').replace(/,/g, '').trim()

// خانة اختيار الحساب البنكي — تعرض كل التفاصيل بوضوح: البنك، اسم الحساب، الآيبان، رقم الحساب.
// مشترَكة بين تسجيل الدفعة (الحساب الوارد) والاسترجاع (الحساب الصادر) لتوحيد الشكل.
const bankAcctLabel  = a => `${a.bank_name || ''}${a.account_name ? ' — ' + a.account_name : ''}`
// نص البحث — كل الحقول كي يطابق البحث على البنك أو الاسم أو الآيبان أو رقم الحساب.
const bankAcctSearch = a => [a.bank_name, a.account_name, a.iban, a.account_number].filter(Boolean).join(' ')
const renderBankAcctCell = (accent, T) => (a, sel) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: '100%' }}>
    <span style={{ fontSize: 14, fontWeight: 600, color: sel ? accent : 'var(--tx)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Landmark size={13} strokeWidth={2} style={{ flexShrink: 0, opacity: .85 }} />
      {a.bank_name || '—'}
      {a.is_primary && <span style={{ fontSize: 9.5, fontWeight: 700, color: C.gold, background: 'rgba(212,160,23,.12)', border: '1px solid rgba(212,160,23,.3)', borderRadius: 5, padding: '1px 6px' }}>{T('رئيسي', 'Primary')}</span>}
    </span>
    {a.account_name && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx3)' }}>{a.account_name}</span>}
    {a.iban && <span style={{ fontSize: 11, color: 'var(--tx3)', direction: 'ltr', fontFamily: 'ui-monospace, monospace', letterSpacing: '.4px' }}>{a.iban}</span>}
    {a.account_number && <span style={{ fontSize: 10.5, color: 'var(--tx4)' }}>{T('رقم الحساب', 'Acct No')}: {a.account_number}</span>}
  </div>
)

// نموذج تفاصيل الدفع — حقول FormKit بالكامل؛ تتلوّن الأقسام تلقائياً بلون العملية (AccentContext).
// حالة البيانات (المبلغ/الطريقة/المرجع/الإيصال/الحساب) تبقى في ActionModal ليُرسلها onSubmit.
const PaymentDetailsForm = ({ T, color, remaining,
  paidAmount, setPaidAmount,
  paymentMethod, setPaymentMethod,
  transferReference, setTransferReference,
  transferReceipt, setTransferReceipt,
  selBankAccId, setSelBankAccId,
  bankAccounts,
  notes, setNotes,
  showIqamaPassport = false,
  iqamaBorderNumber, setIqamaBorderNumber, iqamaWorkerName, setIqamaWorkerName, iqamaBorderDup = false,
  // part: 'all' (نقداً — صفحة واحدة) | 'details' (الحوالة، الخطوة ١) | 'receipt' (الحوالة، الخطوة ٢)
  part = 'all',
}) => {
  const eff = Number(remaining) || 0
  const p = Number(paidAmount) || 0
  // نفس منطق الضبط القديم: لا سالب، ولا يتجاوز المتبقي على الفاتورة.
  const clampAmount = v => {
    if (v === '') { setPaidAmount(''); return }
    let n = Number(v); if (isNaN(n)) return
    if (n < 0) n = 0
    if (n > eff) n = eff
    setPaidAmount(String(n))
  }
  const amountHint = eff > 0
    ? (p >= eff ? T('مدفوع بالكامل ✓', 'Paid in full ✓') : `${T('المتبقي', 'Remaining')} ${fmtAmt((eff - p).toFixed(2))}`)
    : undefined

  // خطوة الإيصال + الملاحظة — صفحة مستقلّة في الحوالة البنكية كي لا يظهر تمرير عند إرفاق الإيصال.
  if (part === 'receipt') {
    return (
      <ModalSection Icon={FileText} label={T('الإيصال والملاحظة', 'Receipt & Note')}>
        <div style={GRID}>
          <FileField req multiple compact label={T('إيصال الحوالة', 'Transfer Receipt')}
            hint={T('يمكن رفع أكثر من ملف', 'Multiple files allowed')}
            value={transferReceipt} onChange={setTransferReceipt} />
          <TextArea full label={T('ملاحظة', 'Note')} hint={T('اختياري', 'optional')} rows={2}
            value={notes} onChange={setNotes} placeholder={T('ملاحظة خاصة بهذه الدفعة…', 'A note for this payment…')} />
        </div>
      </ModalSection>
    )
  }

  // خطوة الملاحظة المستقلّة — في الدفع النقدي تُعرض الملاحظة في خطوة منفصلة (الحوالة تجمع الإيصال + الملاحظة معاً).
  if (part === 'note') {
    return (
      <ModalSection Icon={FileText} label={T('ملاحظة', 'Note')} hint={T('اختياري', 'optional')}>
        <div style={GRID}>
          <TextArea full label={undefined} rows={4}
            value={notes} onChange={setNotes} placeholder={T('ملاحظة خاصة بهذه الدفعة…', 'A note for this payment…')} />
        </div>
      </ModalSection>
    )
  }

  // الجزء الأساسي: المبلغ + طريقة الدفع (+ الحساب البنكي عند الحوالة). في الدفع النقدي
  // الملاحظة نُقلت إلى خطوة مستقلّة (part='note') لتفادي ازدحام الصفحة مع صورة الجواز.
  return (
    <ModalSection Icon={Wallet} label={T('تفاصيل الدفع', 'Payment Details')}>
      {/* كل حقل في صفّ مستقل؛ المبلغ المدفوع هو الأبرز (big). */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <CurrencyField big full label={T('المبلغ المدفوع', 'Paid Amount')} req hint={amountHint}
          value={paidAmount} onChange={clampAmount} unit={T('ريال', 'SAR')} />
        <Segmented req full label={T('طريقة الدفع', 'Payment Method')} value={paymentMethod} onChange={setPaymentMethod}
          options={[{ v: 'cash', l: T('نقداً', 'Cash'), c: color }, { v: 'bank', l: T('حوالة بنكية', 'Bank'), c: color }]} />
        {/* الحوالة: «إيصال الحوالة» يظهر في نفس خطوة المبلغ (الخطوة 3) بدل خطوة منفصلة. */}
        {part === 'details' && (
          <FileField full req multiple label={T('إيصال الحوالة', 'Transfer Receipt')}
            hint={T('يمكن رفع أكثر من ملف', 'Multiple files allowed')}
            value={transferReceipt} onChange={setTransferReceipt} />
        )}
        {/* صورة الجواز انتقلت إلى الخطوة المستقلّة الأخيرة (part='note') مع الملاحظة. */}
      </div>
    </ModalSection>
  )
}

// اختيار الدفعة المراد سدادها — قائمة بطاقات قابلة للتحديد (تظهر فقط عند تعدّد الدفعات).
// يعرض كل صف اسم الدفعة (المرحلة) + حالتها + المتبقي عليها.
const InstallmentPicker = ({ T, isAr, color, insts, selectedId, onSelect, lockedIds }) => (
  <ModalSection Icon={Wallet} label={T('اختيار الدفعة', 'Select Installment')}>
    {/* إخفاء شريط تمرير جسم النافذة أثناء عرض قائمة الدفعات — مقصور على هذه النافذة عبر :has(.ip-scope). */}
    <style>{`.fk-body:has(.ip-scope)::-webkit-scrollbar{width:0;height:0;display:none}.fk-body:has(.ip-scope){scrollbar-width:none;-ms-overflow-style:none}`}</style>
    <span className="ip-scope" style={{ display: 'none' }} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {insts.map(ins => {
        const m = deriveInstMeta(ins, T, isAr)
        const insRemaining = Math.max(0, m.insTotal - m.insPaid)
        const active = selectedId === ins.id
        const locked = !!(lockedIds && lockedIds.has && lockedIds.has(ins.id))
        // الدفعة المرتبطة بتأشيرة بلا رقم حدود تُعطَّل — لا يمكن سدادها حتى يُدخَل رقم الحدود.
        const noBorder = !!ins.visa_application_id && !String(ins.visa_application?.border_number || '').trim()
        const blocked = locked || noBorder
        const label = m.milestone || (insts.length === 1 ? T('دفعة واحدة', 'Single payment') : instOrdinalLabel(ins.installment_order, isAr))
        return (
          <button key={ins.id} type="button" disabled={blocked} onClick={() => { if (!blocked) onSelect(ins.id) }}
            title={locked ? T('تُفتح بعد سداد الدفعة السابقة بالكامل', 'Unlocks once the previous installment is fully paid')
              : noBorder ? T('أدخِل رقم الحدود للتأشيرة أولاً', 'Enter the visa border number first') : undefined}
            style={{ textAlign: 'start', cursor: blocked ? 'not-allowed' : 'pointer', opacity: blocked ? .55 : 1, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: active ? color + '14' : 'var(--hoverBg)', border: '1.5px solid ' + (active ? color : 'var(--bd)'), transition: '.15s', fontFamily: F }}>
            <span style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: active ? color : 'var(--tx6)', color: active ? '#10240f' : 'var(--tx3)', border: active ? 'none' : '1px solid var(--bd)' }}>
              {blocked
                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                : ins.installment_order}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: active ? color : 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
              {(() => {
                // بعد إصدار الإقامة لهذه التأشيرة نعرض رقم الإقامة؛ وإلا رقم الحدود؛ وإلا «بانتظار رقم الحدود».
                const iqArr = Array.isArray(ins.visa_application?.iqama_issuance_applications) ? ins.visa_application.iqama_issuance_applications : (ins.visa_application?.iqama_issuance_applications ? [ins.visa_application.iqama_issuance_applications] : [])
                const iqNo = iqArr.map(x => (x && x.deleted_at == null) ? String(x.iqama_number || '').trim() : '').find(Boolean) || ''
                const border = String(ins.visa_application?.border_number || '').trim()
                const row = (label, val) => (
                  <div style={{ fontSize: 9.5, color: C.gold, fontWeight: 600, marginTop: 2 }}>
                    {label} · <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{val}</span>
                  </div>
                )
                if (iqNo) return row(T('رقم الإقامة', 'Iqama No.'), iqNo)
                if (border) return row(T('رقم الحدود', 'Border No.'), border)
                if (noBorder) return <div style={{ fontSize: 9.5, color: C.gold, fontWeight: 600, marginTop: 2 }}>{T('بانتظار إدخال رقم الحدود', 'Awaiting border number')}</div>
                return null
              })()}
              {(() => {
                const va = ins.visa_application
                if (!va) return null
                const desc = [
                  isAr ? (va.nationality?.name_ar || va.nationality?.name_en) : (va.nationality?.name_en || va.nationality?.name_ar),
                  isAr ? (va.embassy?.name_ar || va.embassy?.name_en) : (va.embassy?.name_en || va.embassy?.name_ar),
                  isAr ? (va.occupation?.name_ar || va.occupation?.name_en) : (va.occupation?.name_en || va.occupation?.name_ar),
                  va.gender === 'female' ? T('أنثى', 'Female') : va.gender === 'male' ? T('ذكر', 'Male') : '',
                ].filter(Boolean).join(' · ')
                return desc ? <div style={{ fontSize: 9.5, color: 'var(--tx3)', fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{desc}</div> : null
              })()}
              {/* حالة الدفعة — تُخفى «لم يُسدد» (المتبقّي يكفي للدلالة)؛ تظهر فقط للمقفلة أو «جزئي/مسدّد». */}
              {(locked || m.state !== 'unpaid') && (
                <div style={{ fontSize: 10.5, color: locked ? 'var(--tx4)' : m.stateC, fontWeight: 600, marginTop: 2 }}>
                  {locked ? T('مقفلة — تُفتح بعد سداد الدفعة السابقة', 'Locked — unlocks after the previous installment') : m.stateLabel}
                </div>
              )}
            </div>
            <div style={{ flexShrink: 0, textAlign: 'end' }}>
              <div style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{T('المتبقي', 'Remaining')}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: active ? color : 'var(--tx2)', direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(insRemaining)}</div>
            </div>
          </button>
        )
      })}
    </div>
  </ModalSection>
)

// نموذج تفاصيل الاسترجاع — مرآة نموذج الدفع، والسقف هو المدفوع على الفاتورة.
const RefundDetailsForm = ({ T, color, paid,
  refundAmount, setRefundAmount,
  refundMethod, setRefundMethod,
  transferReceipt, setTransferReceipt,
}) => {
  const eff = Number(paid) || 0
  const r = Number(refundAmount) || 0
  const clampAmount = v => {
    if (v === '') { setRefundAmount(''); return }
    let n = Number(v); if (isNaN(n)) return
    if (n < 0) n = 0
    if (n > eff) n = eff
    setRefundAmount(String(n))
  }
  const amountHint = eff > 0
    ? (r >= eff ? T('استرجاع كامل المدفوع', 'Full refund') : `${T('الأقصى', 'Max')} ${fmtAmt(eff.toFixed(2))}`)
    : undefined

  return (
    <ModalSection Icon={Wallet} label={T('تفاصيل الاسترجاع', 'Refund Details')}>
      {/* كل حقل في صفّ مستقل؛ المبلغ المسترجع هو الأبرز (big) — مرآة نافذة الدفع. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <CurrencyField big full label={T('المبلغ المسترجع', 'Refund Amount')} req hint={amountHint}
          value={refundAmount} onChange={clampAmount} unit={T('ريال', 'SAR')} />
        <Segmented req full label={T('طريقة الاسترجاع', 'Refund Method')} value={refundMethod} onChange={setRefundMethod}
          options={[{ v: 'cash', l: T('نقداً', 'Cash'), c: color }, { v: 'bank', l: T('حوالة بنكية', 'Bank'), c: color }]} />
        {/* إيصال الحوالة في نفس الخطوة عند اختيار الحوالة البنكية. */}
        {refundMethod === 'bank' && (
          <FileField req multiple label={T('إيصال الحوالة', 'Transfer Receipt')}
            hint={T('يمكن رفع أكثر من ملف', 'Multiple files allowed')}
            value={transferReceipt} onChange={setTransferReceipt} />
        )}
      </div>
    </ModalSection>
  )
}

// سبب الاسترجاع — حقل نصّي إلزامي واحد. الحالة مرفوعة لـ ActionModal.
const RefundReasonForm = ({ T, notes, setNotes }) => (
  <ModalSection Icon={FileText} label={T('سبب الاسترجاع', 'Refund Reason')}>
    <TextArea full req rows={4}
      value={notes} onChange={setNotes} placeholder={T('اذكر سبب الاسترجاع…', 'Explain the refund reason…')} />
  </ModalSection>
)

// نوع الاسترجاع (لخدمات التأشيرة): كلي على الفاتورة، أو استرجاع تأشيرة محددة (يُختار عددها من القائمة).
const visaPickLabel = (v, isAr, T) => (isAr ? v.nationality?.name_ar : (v.nationality?.name_en || v.nationality?.name_ar)) || T('تأشيرة', 'Visa')
const visaPickSub = (v, isAr, T) => [v.border_number ? `#${v.border_number}` : null, v.file_number != null ? `${T('ملف', 'File')} ${v.file_number}` : null, isAr ? v.occupation?.name_ar : (v.occupation?.name_en || v.occupation?.name_ar)].filter(Boolean).join(' · ')
const RefundScopeForm = ({ T, isAr, color, scope, setScope, visaList, visaId, setVisaId }) => (
  <ModalSection Icon={RotateCcw} label={T('نوع الاسترجاع', 'Refund Type')}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Segmented req full label={T('نوع الاسترجاع', 'Refund Type')} value={scope} onChange={setScope}
        options={[{ v: 'total', l: T('كلي', 'Full'), c: color }, { v: 'visa', l: T('تأشيرة', 'Per-Visa'), c: color }]} />
      {scope === 'visa' && (
        <FKSelect full req label={T('التأشيرة', 'Visa')} placeholder={T('اختر التأشيرة…', 'Choose a visa…')}
          value={visaId} onChange={setVisaId}
          options={visaList} getKey={v => v.id}
          getLabel={v => visaPickLabel(v, isAr, T)} getSub={v => visaPickSub(v, isAr, T)} />
      )}
    </div>
  </ModalSection>
)

// استرجاع تأشيرة — إلغاؤها وإزالتها من الفاتورة مع توزيع يدوي للمبلغ على الدفعات.
// تُحذف دفعة «إصدار إقامة» واحدة تلقائيًا (لتبقى دفعات الإقامة = عدد التأشيرات)، ويوزّع المستخدم
// باقي المبلغ على الدفعات المشتركة. مقسّمة لخطوتين بلا تمرير: part='amounts' (الحقول) و part='summary' (الملخّص).
const VisaRefundDistForm = ({ T, isAr, color, visa, sharedInsts, residenceInst, milestoneLabel,
  distDisplay, setDistFor, totalDeduct, totalRefund, newTotal, part = 'amounts' }) => {
  const sub = visa ? visaPickSub(visa, isAr, T) : ''
  const sumRow = (label, value, c) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 800, color: c, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(value)}</span>
    </div>
  )
  if (part === 'summary') {
    return (
      <ModalSection Icon={Wallet} label={T('ملخص الاسترجاع', 'Refund Summary')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {residenceInst && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '11px 13px', borderRadius: 10, background: color + '12', border: `1px dashed ${color}55` }}>
              <span style={{ fontSize: 12, color, fontWeight: 700 }}>{T('دفعة إصدار الإقامة — تُحذف واحدة', 'Residence installment — one removed')}</span>
              <span style={{ fontSize: 14, color, fontWeight: 800, direction: 'ltr' }}>−{num(Number(residenceInst.total_amount) || 0)}</span>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '13px 14px', borderRadius: 10, background: 'var(--inputBg)', border: '1px solid var(--bd)' }}>
            {sumRow(T('إجمالي النقص من الفاتورة', 'Total reduced'), totalDeduct, C.gold)}
            {sumRow(T('المبلغ المسترجع (المدفوع)', 'Refunded (paid)'), totalRefund, C.red)}
            <div style={{ height: 1, background: 'rgba(255,255,255,.06)' }} />
            {sumRow(T('الإجمالي الجديد', 'New total'), newTotal, C.ok)}
          </div>
        </div>
      </ModalSection>
    )
  }
  return (
    <ModalSection Icon={Wallet} label={T('توزيع الاسترجاع على الدفعات', 'Distribute across installments')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* بطاقة التأشيرة — سطر واحد مدمج */}
        {visa && (
          <div style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 9, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tx2)' }}>{visaPickLabel(visa, isAr, T)}</span>
            {sub && <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>· {sub}</span>}
          </div>
        )}
        <div style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600 }}>
          {T('كم يُحذف من كل دفعة مشتركة؟ تُحذف دفعة إقامة واحدة تلقائيًا، والجزء المدفوع يُسترجَع.',
             'How much to deduct from each shared installment? One residence installment is removed automatically; the paid portion is refunded.')}
        </div>
        {/* صف مدمج لكل دفعة: الاسم + المدفوع/الإجمالي على اليمين، وحقل المبلغ على اليسار */}
        {sharedInsts.map(it => {
          const total = Number(it.total_amount) || 0, paid = Number(it.paid_amount) || 0
          return (
            <div key={it.id} style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tx2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{milestoneLabel(it) || T('دفعة', 'Installment')}</span>
                <span style={{ fontSize: 9.5, color: 'var(--tx5)', fontWeight: 600, direction: 'ltr', textAlign: 'right' }}>{T('مدفوع', 'Paid')} {num(paid)} / {num(total)}</span>
              </div>
              <div style={{ flexShrink: 0, width: 150 }}>
                <CurrencyField value={distDisplay(it)} onChange={v => setDistFor(it.id, v)} unit={T('ريال', 'SAR')} />
              </div>
            </div>
          )
        })}
      </div>
    </ModalSection>
  )
}

// الخطوة الأخيرة للاسترجاع لكل تأشيرة — طريقة الاسترجاع (+ إيصال الحوالة) والسبب معًا.
const VisaRefundFinalForm = ({ T, color, refundMethod, setRefundMethod, transferReceipt, setTransferReceipt, notes, setNotes }) => (
  <ModalSection Icon={FileText} label={T('الطريقة والسبب', 'Method & Reason')}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Segmented req full label={T('طريقة الاسترجاع', 'Refund Method')} value={refundMethod} onChange={setRefundMethod}
        options={[{ v: 'cash', l: T('نقداً', 'Cash'), c: color }, { v: 'bank', l: T('حوالة بنكية', 'Bank'), c: color }]} />
      {refundMethod === 'bank' && (
        <FileField req multiple label={T('إيصال الحوالة', 'Transfer Receipt')} hint={T('يمكن رفع أكثر من ملف', 'Multiple files allowed')}
          value={transferReceipt} onChange={setTransferReceipt} />
      )}
      <TextArea full req label={T('سبب الاسترجاع', 'Refund Reason')} rows={3}
        value={notes} onChange={setNotes} placeholder={T('اذكر سبب الاسترجاع…', 'Explain the refund reason…')} />
    </div>
  </ModalSection>
)

// سبب الإلغاء — تحذير + ملاحظة نصية. الحالة مرفوعة لـ ActionModal.
const CancelReasonForm = ({ T, reason, setReason }) => (
  <>
    <ModalSection Icon={Ban} label={T('سبب الإلغاء', 'Cancellation Reason')}>
      <TextArea req full rows={4} value={reason} onChange={setReason}
        placeholder={T('اذكر سبب الإلغاء...', 'Explain why...')} />
    </ModalSection>
    <div style={{ marginTop: 12, fontSize: 12.5, color: FKC.red, padding: '10px 14px', borderRadius: 10, background: `${FKC.red}14`, border: `1px solid ${FKC.red}33`, display: 'flex', alignItems: 'flex-start', gap: 8, fontWeight: 600, lineHeight: 1.8, fontFamily: F }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>{T('بإلغاء الفاتورة تُلغى جميع دفعاتها ومدفوعاتها المسجّلة نهائيًا، ولا يمكن التراجع عن هذا الإجراء.', 'Cancelling the invoice permanently voids all its recorded installments and payments. This action cannot be undone.')}</span>
    </div>
  </>
)

// ───────────── بيانات الفاتورة — تصميم الدفتر ─────────────
// صفوف بشريط لوني: الإجمالي / المدفوع / المتبقّي. الصف محل التركيز مبرز
// (المتبقّي في الدفعة، المدفوع في الاسترجاع/الإلغاء).
const IIRow = ({ accent, label, value, color, big }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: big ? '13px 14px' : '11px 14px', borderRadius: 10, background: big ? accent + '14' : FKC.inputBg, border: '1px solid ' + (big ? accent + '55' : 'rgba(255,255,255,.05)') }}>
    <span style={{ width: 4, alignSelf: 'stretch', borderRadius: 999, background: accent, flexShrink: 0 }} />
    <span style={{ flex: 1, fontSize: big ? 13 : 12, color: big ? FKC.tx : FKC.tx3, fontWeight: big ? 800 : 600 }}>{label}</span>
    <span style={{ fontSize: big ? 20 : 15, fontWeight: 800, color, direction: 'ltr', fontVariantNumeric: 'tabular-nums', letterSpacing: '-.3px' }}>{value}</span>
  </div>
)
const InvoiceInfoSection = ({ T, type, total, paid, remaining }) => {
  const focusOnPaid = type === 'refund' || type === 'cancel'
  const remC = remaining > 0 ? FKC.gold : FKC.ok
  return (
    <ModalSection Icon={Info} label={T('بيانات الفاتورة', 'Invoice Info')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <IIRow accent={FKC.tx4} label={T('الإجمالي', 'Total')} value={num(total)} color={FKC.tx} />
        <IIRow accent={FKC.ok} label={T('المدفوع', 'Paid')} value={num(paid)} color={FKC.ok} big={focusOnPaid} />
        <IIRow accent={remC} label={T('المتبقي', 'Remaining')} value={num(remaining)} color={remC} big={!focusOnPaid} />
      </div>
    </ModalSection>
  )
}

const ActionModal = ({ type, stage = null, onClose, sb, T, isAr, inv, total, paid, remaining, toast, user, onSaved, visaDet = [], svcCode, insts = [] }) => {
  const [submitting, setSubmitting] = useState(false)
  // When a write succeeds, the modal transforms into an in-place success screen
  // (mirrors the invoice-issuance success view) instead of toasting + closing.
  const [done, setDone] = useState(null)
  // Validation/failure messages surface in the modal's red footer bar (on the
  // submit page) instead of a toast — cleared at submit start and on close.
  const [actErr, setActErr] = useState(null)

  // ─── إجراء الطلب (للخدمات غير نقل الكفالة، مثل رواتب سبلاير) ───
  // النافذة تعرض خيارين «تم الإنجاز»/«إلغاء» + حقل ملاحظة اختياري لإيضاح أي شيء.
  const [doneChoice, setDoneChoice] = useState('done')
  const [doneNote, setDoneNote] = useState('')
  // المستندات: عند «تم الإنجاز» يُطلب إرفاق ملف المستند (مطلوب) — يُرفع كمرفق للطلب.
  const isDocSvc = baseSvcCode(svcCode) === 'documents'
  const [doneFile, setDoneFile] = useState(null)
  // مدخلات إنجاز الخدمات المُدارة بالسجل (طباعة الإقامة · التأمين الطبي · تغيير المهنة · تعديل الراتب).
  // القيم غير الملفّية في doneVals، والملفات في doneFiles — تُقاد من DONE_INPUTS.
  const doneInputs = doneInputsFor(baseSvcCode(svcCode))
  const [doneVals, setDoneVals] = useState({})
  const [doneFiles, setDoneFiles] = useState({})
  // تعبئة القيم النصّية/التاريخية من details الموجودة (مثلاً المهنة الجديدة المُدخلة وقت الطلب).
  useEffect(() => {
    if (type !== 'done' || !doneInputs.length) return
    const dt = (Array.isArray(visaDet) ? visaDet[0] : null)?.details || {}
    const init = {}
    for (const f of doneInputs) {
      if (f.type === 'file') continue
      if (dt[f.key] != null && dt[f.key] !== '') init[f.key] = f.type === 'date' ? String(dt[f.key]).slice(0, 10) : String(dt[f.key])
    }
    setDoneVals(init)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, svcCode])
  // تغيير المهنة: قائمة المهن من قاعدة البيانات لحقل «المهنة الجديدة» (دروب داون بدل نص حر).
  const [occOptions, setOccOptions] = useState([])
  useEffect(() => {
    if (type !== 'done' || baseSvcCode(svcCode) !== 'profession_change') return
    let alive = true
    ;(async () => {
      const { data } = await sb.from('occupations').select('name_ar,name_en').is('is_active', true).order('name_ar').limit(5000)
      if (alive) setOccOptions((data || []).filter(o => o && o.name_ar))
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, svcCode])
  // تعديل الراتب — نافذة «إرجاع الراتب» (المرحلة الثانية): الراتب الأساسي + صورة شاشته.
  // الراتب الأساسي يبدأ دائماً بـ400 (القيمة الافتراضية المعتمدة).
  const [salReturnVals, setSalReturnVals] = useState({ base_salary: '400' })
  const [salReturnFiles, setSalReturnFiles] = useState({})
  // خدمات موافقة المحاسب (النقل الخارجي · خروج وعودة · خروج نهائي) — آلة حالات: موافقة المحاسب (نعم/لا) ثم إنجاز/إلغاء.
  const isExtTransfer = baseSvcCode(svcCode) === 'external_transfer_approval'
  const needsAcct = needsAcctApproval(svcCode)
  const acctStatus = inv.service_request?.accountant_status || 'pending'  // pending | approved | rejected
  const acctPending = needsAcct && acctStatus !== 'approved'  // مرحلة موافقة المحاسب
  const [acctChoice, setAcctChoice] = useState('yes')             // yes | no
  const [extTarget700, setExtTarget700] = useState('')            // الرقم الموحد للشركة الناقلة (10، يبدأ 7)
  const [extManager, setExtManager] = useState('')               // اسم المدير

  // ─── بيانات التجديد (نوع done) — المهنة + تاريخ انتهاء الإقامة + ملف مقيم ───
  // تُحفظ على حسبة التنازل المرتبطة (transfer_calculation) ويُرفع ملف مقيم كمرفق للطلب.
  const [renewTcId, setRenewTcId] = useState(null)
  const [renewOccupationId, setRenewOccupationId] = useState('')
  const [renewOccupation, setRenewOccupation] = useState('')
  const [renewIqamaExpiry, setRenewIqamaExpiry] = useState('')
  const [renewMuqeemFile, setRenewMuqeemFile] = useState(null)
  const [renewOccupations, setRenewOccupations] = useState([])
  // ─── مراحل «حالة المعاملة» لنقل الكفالة (التأمين · رخصة العمل · بيانات مقيم) ───
  const [trTransferOnly, setTrTransferOnly] = useState(false)
  // التأمين
  const [insCompany, setInsCompany] = useState('')
  const [insPolicyNo, setInsPolicyNo] = useState('')
  const [insExpiry, setInsExpiry] = useState('')
  const [insAmount, setInsAmount] = useState('')
  const [insFile, setInsFile] = useState(null)
  // رخصة العمل
  const [wpDuration, setWpDuration] = useState('')
  const [wpExpiry, setWpExpiry] = useState('')
  const [wpAmount, setWpAmount] = useState('')
  const [wpFile, setWpFile] = useState(null)
  // بيانات مقيم — التجديد عبر تواصل (نعم/لا) + يعيد استخدام renewOccupation*/renewIqamaExpiry/renewMuqeemFile
  const [muqViaContact, setMuqViaContact] = useState(null)
  useEffect(() => {
    if (!sb || type !== 'done') return
    let alive = true
    ;(async () => {
      sb.from('occupations').select('id,name_ar,name_en,code').eq('is_active', true)
        .order('sort_order', { nullsFirst: false }).order('name_ar').limit(5000)
        .then(({ data }) => { if (alive && data) setRenewOccupations(data) })
      // التجديد يقرأ من iqama_renewal_calculation (بلا عمود transfer_only)؛ النقل من transfer_calculation.
      const _renewal = baseSvcCode(svcCode) === 'iqama_renewal'
      const _tbl = _renewal ? 'iqama_renewal_calculation' : 'transfer_calculation'
      const _sel = _renewal ? 'id, occupation_id, occupation_name_ar, expected_expiry_date, stage_data' : 'id, occupation_id, occupation_name_ar, expected_expiry_date, transfer_only, stage_data'
      const { data } = await sb.from(_tbl).select(_sel)
        .eq('invoice_id', inv.id).is('deleted_at', null).maybeSingle()
      if (alive && data) {
        setRenewTcId(data.id)
        setRenewOccupationId(data.occupation_id || '')
        setRenewOccupation(data.occupation_name_ar || '')
        setRenewIqamaExpiry(data.expected_expiry_date ? String(data.expected_expiry_date).slice(0, 10) : '')
        if (!_renewal) setTrTransferOnly(!!data.transfer_only)
        const sd = (data.stage_data && typeof data.stage_data === 'object') ? data.stage_data : {}
        if (sd.insurance) { setInsCompany(sd.insurance.company || ''); setInsPolicyNo(sd.insurance.policy_no || ''); setInsExpiry(sd.insurance.expiry ? String(sd.insurance.expiry).slice(0, 10) : ''); setInsAmount(sd.insurance.amount != null ? String(sd.insurance.amount) : '') }
        if (sd.work_permit) { setWpDuration(sd.work_permit.duration_months != null ? String(sd.work_permit.duration_months) : ''); setWpExpiry(sd.work_permit.expiry ? String(sd.work_permit.expiry).slice(0, 10) : ''); setWpAmount(sd.work_permit.amount != null ? String(sd.work_permit.amount) : '') }
        if (sd.muqeem && sd.muqeem.via_contact != null) setMuqViaContact(!!sd.muqeem.via_contact)
        // مرحلة الإقامة للتجديد (إعادة فتح للعرض): المهنة + تاريخ الانتهاء
        if (sd.iqama) { if (sd.iqama.occupation_id) setRenewOccupationId(sd.iqama.occupation_id); if (sd.iqama.occupation_name_ar) setRenewOccupation(sd.iqama.occupation_name_ar); if (sd.iqama.iqama_expiry) setRenewIqamaExpiry(String(sd.iqama.iqama_expiry).slice(0, 10)) }
      }
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sb, type, inv.id])

  // دفعة إصدار الإقامة — ربط الدفعة بتأشيرة: المستخدم يختار التأشيرة برقم حدودها ويرفع
  // صورة الجواز؛ بعد نجاح الدفعة تُنشأ معاملة مستقلة للتأشيرة (iqama_issuance_applications)
  // فتظهر في تبويب الفحص الطبي. التأشيرات المرتبطة سابقاً تُستبعد من القائمة.
  const isWorkVisa = /^work_visa/.test(svcCode || '')
  // التأشيرة الدائمة فقط لها دفعات إقامة لكل تأشيرة (مرتبطة بـ visa_application_id)؛ المؤقتة دفعة
  // واحدة بلا ربط — فلا يُعرض لها استرجاع «تأشيرة» (كان يُعرض فيُصفّر الفاتورة لحالة fully_paid خاطئة).
  const isPermanentVisa = isWorkVisa && (svcCode === 'work_visa_permanent' || (insts || []).some(it => it.visa_application_id))
  const [linkVisaId, setLinkVisaId] = useState('')
  const [passportFile, setPassportFile] = useState(null)
  const [spawnedVisaIds, setSpawnedVisaIds] = useState(new Set())
  useEffect(() => {
    if (!sb || (type !== 'payment' && type !== 'refund') || !isWorkVisa) return
    const ids = (visaDet || []).map(v => v.id).filter(Boolean)
    if (!ids.length) return
    let alive = true
    ;(async () => {
      const { data } = await sb.from('iqama_issuance_applications')
        .select('visa_application_id').in('visa_application_id', ids).is('deleted_at', null)
      if (alive) setSpawnedVisaIds(new Set((data || []).map(r => r.visa_application_id)))
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sb, type, isWorkVisa])
  const linkCandidates = (type === 'payment' && isWorkVisa)
    ? (visaDet || []).filter(v => v.visa_number && v.border_number && !spawnedVisaIds.has(v.id))
    : []

  // ─── lifted form state (each operation has its own slice) ─────────────────
  // payment
  // يبدأ المبلغ فارغاً دائماً (يظهر 0.00) — لا يُعبّأ تلقائياً بالمتبقّي.
  const [paidAmount, setPaidAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [payTransferRef, setPayTransferRef] = useState('')
  const [payTransferReceipt, setPayTransferReceipt] = useState([])
  const [paySelBankAccId, setPaySelBankAccId] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  // رقم الحدود (يُعبّأ مسبقاً من التأشيرة) واسم العامل — يُدخلان مع دفعة «إصدار الإقامة»
  // ويُحفظان على صف التأشيرة (worker_name / border_number).
  const [iqamaBorderNumber, setIqamaBorderNumber] = useState('')
  const [iqamaWorkerName, setIqamaWorkerName] = useState('')
  // رقم الحدود يجب أن يكون فريداً — نتحقق مقابل التأشيرات الأخرى عند اكتمال 10 أرقام.
  const [iqamaBorderDup, setIqamaBorderDup] = useState(false)
  // Installment targeting — when an invoice has more than one still-payable
  // installment, the user must pick which one to pay before entering an amount.
  const [selectedInstId, setSelectedInstId] = useState('')
  const payableInsts = (insts || [])
    .filter(i => (Number(i.total_amount) - Number(i.paid_amount)) > 0.005)
    .slice().sort((a, b) => (a.installment_order || 0) - (b.installment_order || 0))
  // دفعة مرتبطة بتأشيرة (إصدار الإقامة للدائمة / التوكيل للمؤقتة) تُعرض دائماً في مُنتقي الدفعات ليحدّدها
  // المستخدم صراحةً ويرى اشتراط رقم الحدود — حتى لو كانت الوحيدة المتبقّية.
  const hasVisaLinkedPayable = isWorkVisa && payableInsts.some(it => it.visa_application_id)
  const needsInstPick = type === 'payment' && (payableInsts.length > 1 || hasVisaLinkedPayable)
  const selInst = (insts || []).find(i => i.id === selectedInstId) || null
  const instRemaining = selInst ? Math.max(0, Number(selInst.total_amount) - Number(selInst.paid_amount)) : remaining
  // المبلغ المدفوع يبدأ فارغاً (0.00) ويُدخله المستخدم يدوياً — لا يُعبّأ تلقائياً بمتبقّي الدفعة.
  // يُعاد ضبطه عند تبديل الدفعة المختارة كي لا يبقى مبلغ دفعة سابقة؛ والسقف يظل متبقّي الدفعة عبر prop.
  useEffect(() => {
    if (type !== 'payment' || !selectedInstId) return
    setPaidAmount('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInstId])
  // The «إصدار الإقامة» tranche needs a border number picked first (which visa the
  // payment settles) — that visa then spawns its own iqama transaction.
  const milestoneText = it => {
    if (!it) return ''
    const m = it.payment_milestone ? (isAr ? it.payment_milestone.value_ar : (it.payment_milestone.value_en || it.payment_milestone.value_ar)) : ''
    return m || it.notes || ''
  }
  const isIqamaInst = it => /إقامة|اقامة|iqama|residence/i.test(milestoneText(it))
  // Permanent-visa installments settle in stages: visa issuance → visa authorization → residence
  // issuance. A stage stays locked until every earlier-stage installment is fully paid; once the
  // authorization tranche clears, all per-visa residence tranches open together (any order). Other
  // services carry no توكيل/إقامة milestones, so everything is stage 1 → nothing ever locks.
  const instStage = it => {
    if (it.visa_application_id || isIqamaInst(it)) return 3
    if (/توكيل|تفويض|authoriz|wakal/i.test(milestoneText(it))) return 2
    return 1
  }
  const stageRemaining = stage => (insts || [])
    .filter(i => instStage(i) === stage)
    .reduce((s, i) => s + Math.max(0, Number(i.total_amount) - Number(i.paid_amount)), 0)
  const lockedInstIds = (type === 'payment' && isWorkVisa)
    ? new Set(payableInsts.filter(it => {
        const st = instStage(it)
        for (let s = 1; s < st; s++) if (stageRemaining(s) > 0.005) return true
        return false
      }).map(it => it.id))
    : new Set()
  // The installment being paid: the user's pick, or the only payable one when there's no picker.
  const effectiveInst = selInst || (payableInsts.length === 1 ? payableInsts[0] : null)
  // الدفعة التي «تفتح إصدار الإقامة» = الدفعة الأخيرة لكل تأشيرة: في الدائمة هي «إصدار الإقامة»، وفي المؤقتة
  // هي «الوكالة» — كلاهما يحمل visa_application_id (دفعة لكل تأشيرة). فنعتمد على وجود الرابط بالتأشيرة أولاً
  // (يطابق النوعين)، مع احتياط نصّي للوكالة في المؤقتة لو لم تكن مرتبطة. هكذا دفع الوكالة في المؤقتة يفتح
  // ربط التأشيرة وينشئ معاملة الإقامة تماماً كدفع إصدار الإقامة في الدائمة.
  const isTempVisa = svcCode === 'work_visa_temporary'
  const isWakalaInst = it => /توكيل|تفويض|authoriz|wakal/i.test(milestoneText(it))
  const opensIqamaInst = it => isIqamaInst(it) || !!it?.visa_application_id || (isTempVisa && isWakalaInst(it))
  // Show the border-number step only for the per-visa (residence/wakala) tranche. If the invoice has no
  // installment schedule at all, fall back to the legacy always-on behavior for work visas.
  const showIqamaLink = type === 'payment' && linkCandidates.length > 0 &&
    ((insts || []).length === 0 ? true : opensIqamaInst(effectiveInst))
  // دفعة إصدار الإقامة المرتبطة بتأشيرة (الدفعة نفسها تحمل visa_application_id): نطلب صورة جواز العامل
  // هنا في خطوة الدفع — تُحفظ وتظهر في «إصدار الإقامة» ببطاقة المعاملة. نتجنّب التكرار حين تظهر خطوة رقم الحدود.
  const iqamaVisaId = effectiveInst?.visa_application_id || null
  // إدخال اسم العامل ورقم الحدود (وصورة الجواز) نُقِل بالكامل إلى نافذة «إصدار الإقامات» — فلم يعد يُطلب
  // هنا في خطوة تسجيل الدفعة. يبقى المتغيّر معطّلاً دائماً كي تظل منطقية التحقق/الحفظ المرتبطة به محايدة.
  const showIqamaPassport = false
  // التأشيرة المرتبطة بدفعة الإقامة — منها نُعبّئ رقم الحدود مسبقاً.
  const iqamaVisa = iqamaVisaId ? ((visaDet || []).find(v => v.id === iqamaVisaId) || null) : null
  // عند ظهور خطوة الجواز: عبّئ رقم الحدود واسم العامل المحفوظَين سابقاً من التأشيرة.
  useEffect(() => {
    if (!showIqamaPassport || !iqamaVisaId) return
    setIqamaBorderNumber(iqamaVisa?.border_number ? String(iqamaVisa.border_number) : '')
    setIqamaWorkerName(iqamaVisa?.worker_name || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showIqamaPassport, iqamaVisaId])
  // تحقّق تفرّد رقم الحدود — لا يُسمح بتكراره على تأشيرة أخرى. يُفحص عند اكتمال 10 أرقام (مع استثناء التأشيرة الحالية).
  useEffect(() => {
    const bn = (iqamaBorderNumber || '').trim()
    if (!showIqamaPassport || bn.length !== 10) { setIqamaBorderDup(false); return }
    let alive = true
    ;(async () => {
      let q = sb.from('visa_applications').select('id').eq('border_number', bn).is('deleted_at', null).limit(1)
      if (iqamaVisaId) q = q.neq('id', iqamaVisaId)
      const { data } = await q
      if (alive) setIqamaBorderDup((data || []).length > 0)
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iqamaBorderNumber, showIqamaPassport, iqamaVisaId])
  // التأشيرة المرتبطة بدفعة إصدار الإقامة معروفة سلفاً — لا حاجة لقائمة منسدلة: إمّا تحملها الدفعة
  // المختارة (visa_application_id من الخطوة السابقة) أو لأنها التأشيرة الوحيدة المرشّحة. نعرض بياناتها
  // للقراءة فقط؛ تبقى القائمة المنسدلة كحلٍّ احتياطي للحالة النادرة (تعدّد تأشيرات بلا جدول دفعات).
  const linkVisa = showIqamaLink
    ? ((iqamaVisaId && linkCandidates.find(v => v.id === iqamaVisaId))
       || (linkCandidates.length === 1 ? linkCandidates[0] : null))
    : null
  useEffect(() => {
    if (linkVisa) setLinkVisaId(linkVisa.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkVisa?.id])
  // refund
  const [refundAmount, setRefundAmount] = useState('')
  const [refundMethod, setRefundMethod] = useState('cash')
  const [refundTransferReceipt, setRefundTransferReceipt] = useState([])
  const [refundNotes, setRefundNotes] = useState('')
  // استرجاع التأشيرة (لخدمات work_visa فقط): نوع الاسترجاع كلي/تأشيرة، التأشيرة المختارة، والتوزيع اليدوي للمبلغ على الدفعات.
  const [refundScope, setRefundScope] = useState('total') // 'total' | 'visa'
  const [refundVisaId, setRefundVisaId] = useState('')
  const [refundDist, setRefundDist] = useState({}) // معرّف الدفعة المشتركة → المبلغ المُنقَص (توزيع يدوي عند استرجاع تأشيرة)
  // cancel
  const [cancelReason, setCancelReason] = useState('')

  // ─── lookups loaded on mount ─────────────────────────────────────────────
  // payment_method (cash/bank → id), invoice_status='cancelled' → id, and the
  // receiving-bank accounts for the invoice's branch (account_purpose = "التحويلات الواردة").
  const [payMethodIds, setPayMethodIds] = useState({ cash: null, bank: null })
  const [cancelledStatusId, setCancelledStatusId] = useState(null)
  const [fullyPaidStatusId, setFullyPaidStatusId] = useState(null)
  const [activeStatusId, setActiveStatusId] = useState(null)
  // Receiving accounts for payments + outgoing accounts for refunds. Each form
  // sees only the slice that matches its semantic direction.
  const [incomingBankAccounts, setIncomingBankAccounts] = useState([])
  useEffect(() => {
    if (!sb) return
    let alive = true
    ;(async () => {
      const branchId = inv?.branch_id || inv?.branch?.id || null
      const baBase = () => {
        const q = sb.from('bank_account_branches')
          .select('id,branch_id,account_purpose,bank_accounts!inner(id,bank_name,account_name,account_number,iban,is_primary,deleted_at)')
          .is('deleted_at', null).eq('is_active', true)
          .is('bank_accounts.deleted_at', null)
        return branchId ? q.eq('branch_id', branchId) : q
      }
      const [pm, statuses, baIn] = await Promise.all([
        sb.from('lookup_items').select('id,code,category:lookup_categories!inner(category_key)').eq('category.category_key', 'payment_method'),
        // Pull every invoice_status row in one round-trip — we need cancelled +
        // fully_paid + active for the post-write status flips.
        sb.from('lookup_items').select('id,code,category:lookup_categories!inner(category_key)').eq('category.category_key', 'invoice_status'),
        baBase().eq('account_purpose', 'التحويلات الواردة'),
      ])
      if (!alive) return
      const pmMap = {}
      ;(pm.data || []).forEach(r => { pmMap[r.code] = r.id })
      // The bank method's lookup code is 'bank_transfer' (older data may use 'bank').
      setPayMethodIds({ cash: pmMap.cash || null, bank: pmMap.bank_transfer || pmMap.bank || null })
      const stMap = {}
      ;(statuses.data || []).forEach(r => { stMap[r.code] = r.id })
      setCancelledStatusId(stMap.cancelled || null)
      setFullyPaidStatusId(stMap.fully_paid || null)
      setActiveStatusId(stMap.active || null)
      const reshape = (rows) => (rows || []).map(j => ({ ...(j.bank_accounts || {}), _junction_id: j.id, branch_id: j.branch_id, account_purpose: j.account_purpose }))
      setIncomingBankAccounts(reshape(baIn?.data))
    })()
    return () => { alive = false }
  }, [sb, inv?.branch_id, inv?.branch?.id])
  // إجراء «الإنجاز» يختلف بحسب الخدمة: نقل الكفالة يجمع بيانات التجديد (مهنة + انتهاء الإقامة + ملف مقيم)،
  // وبقية الخدمات (رواتب سبلاير وغيرها) تأكيد إنجاز مباشر بلا حقول.
  const isTransferDone = baseSvcCode(svcCode) === 'transfer'
  // تجديد الإقامة: «حالة المعاملة» على مرحلتين — التأمين (مع خيار «لا يحتاج») ثم الإقامة. يعيد استخدام مسار النقل.
  const isRenewalDone = baseSvcCode(svcCode) === 'iqama_renewal'
  const isStagedDone = isTransferDone || isRenewalDone
  const stageCalcTable = isRenewalDone ? 'iqama_renewal_calculation' : 'transfer_calculation'
  // المرحلة الأخيرة التي تُنهي المعاملة: النقل = muqeem · التجديد = iqama.
  const isFinalStage = isRenewalDone ? stage === 'iqama' : stage === 'muqeem'
  const meta = {
    payment: {
      title: T('تسجيل دفعة', 'Record Payment'),
      color: C.ok,
      Icon: Plus,
      submit: T('تسجيل الدفعة', 'Record Payment'),
    },
    refund: {
      title: T('استرجاع دفعة', 'Refund Payment'),
      color: C.red,
      Icon: RotateCcw,
      submit: T('تأكيد الاسترجاع', 'Confirm Refund'),
    },
    cancel: {
      title: T('إلغاء الفاتورة', 'Cancel Invoice'),
      color: C.red,
      Icon: Ban,
      submit: T('تأكيد الإلغاء', 'Confirm Cancel'),
    },
    print: {
      title: T('طباعة الفاتورة', 'Print Invoice'),
      color: C.gold,
      Icon: Printer,
      submit: T('طباعة', 'Print'),
    },
    done: {
      title: isStagedDone ? (isRenewalDone ? (stage === 'insurance' ? T('التأمين', 'Insurance') : T('الإقامة', 'Iqama')) : (stage === 'transfer' ? T('النقل', 'Transfer') : stage === 'insurance' ? T('التأمين', 'Insurance') : stage === 'workpermit' ? T('رخصة العمل', 'Work Permit') : T('الإقامة', 'Iqama'))) : acctPending ? T('موافقة المحاسب', 'Accountant Approval') : T('حالة المعاملة', 'Transaction Status'),
      color: C.gold,
      Icon: isStagedDone ? RotateCcw : CheckCircle2,
      submit: isStagedDone ? (doneChoice === 'cancel' ? T('تأكيد الإلغاء', 'Confirm Cancel') : doneChoice === 'skip' ? T('تأكيد عدم الحاجة', 'Confirm Not Needed') : T('حفظ', 'Save'))
        : acctPending ? (acctChoice === 'no' ? T('تأكيد الرفض', 'Confirm Reject') : T('تأكيد الموافقة', 'Confirm Approval'))
        : (doneChoice === 'cancel' ? T('تأكيد الإلغاء', 'Confirm Cancel') : T('تم الإنجاز', 'Completed')),
    },
    salary_return: {
      title: T('إرجاع الراتب', 'Salary Return'),
      color: C.ok,
      Icon: RotateCcw,
      submit: T('تأكيد الإرجاع', 'Confirm Return'),
    },
  }[type]

  // خيارات الطباعة (محكومة) — تُعرض عبر Checkbox الموحّد في صفحة الطباعة
  const [printOpts, setPrintOpts] = useState({ logo: true, client: true, details: true, stamp: false })

  // ─── onSubmit: actual DB writes per operation type ────────────────────────
  // payment → insert into `payments` (is_valid=true)
  // refund  → invalidate all valid payments on the invoice + store reason/notes
  // cancel  → flip invoice.status_id to "cancelled" + tag notes with the reason
  // print   → no-op (just close)
  //
  // Each branch updates the parent (onSaved) so totals & lists refresh.
  const onSubmit = async () => {
    if (submitting) return
    // حارس دفاعي: إلغاء/استرجاع فاتورة معاملةٍ منجزة مقصور على المدير العام فقط
    // (فوق إخفاء الأزرار في الواجهة — لئلا يُفتح هذا المودال بأي طريقة أخرى).
    if ((type === 'cancel' || type === 'refund') && inv.service_request?.status?.code === 'done' && !isGM(user)) {
      setActErr(T('المعاملة منجزة — الإلغاء والاسترجاع للمدير العام فقط', 'Transaction completed — cancel/refund is restricted to the General Manager'))
      return
    }
    setActErr(null)
    setSubmitting(true)
    let successInfo = null
    try {
      if (type === 'payment') {
        const amt = Number(paidAmount) || 0
        if (amt <= 0) { setActErr(T('أدخل مبلغًا أكبر من صفر', 'Enter an amount greater than zero')); return }
        const pmId = paymentMethod === 'bank' ? payMethodIds.bank : payMethodIds.cash
        if (!pmId) { setActErr(T('تعذر تحديد طريقة الدفع', 'Cannot resolve payment method')); return }
        const branchId = inv.branch_id || inv.branch?.id || null

        // ─── 1. Re-fetch fresh totals so the over-payment guard isn't fooled by
        //        a stale `remaining` prop (the bug the user just reported).
        const { data: invFresh, error: e0 } = await sb.from('invoices')
          .select('total_amount, paid_amount').eq('id', inv.id).maybeSingle()
        if (e0) throw e0
        const totalNum = Number(invFresh?.total_amount) || 0
        const currentPaid = Number(invFresh?.paid_amount) || 0
        const freshRemaining = totalNum - currentPaid
        if (amt > freshRemaining + 0.005) {
          setActErr(T('المبلغ أكبر من المتبقي على الفاتورة', 'Amount exceeds invoice remaining'))
          return
        }

        // ─── 2. Fetch unpaid installments (FIFO) and plan the allocation.
        //        We walk through them in installment_order; each gets as much as
        //        it can absorb until the payment is consumed.
        const { data: insts, error: e1 } = await sb.from('installments')
          .select('id, total_amount, paid_amount, installment_order')
          .eq('invoice_id', inv.id).is('deleted_at', null)
          .order('installment_order')
        if (e1) throw e1
        let allocations = []
        if (selectedInstId) {
          // Targeted payment — apply the whole amount to the chosen installment only.
          const it = (insts || []).find(x => x.id === selectedInstId)
          if (!it) { setActErr(T('تعذّر تحديد الدفعة المحددة', 'Cannot resolve the selected installment')); return }
          const available = Number(it.total_amount) - Number(it.paid_amount)
          if (amt > available + 0.005) { setActErr(T('المبلغ أكبر من المتبقي على الدفعة المحددة', 'Amount exceeds the selected installment remaining')); return }
          allocations = [{ id: it.id, newPaid: Number(it.paid_amount) + amt, becomesFull: amt >= available - 0.005 }]
        } else {
          // No explicit target — walk installments FIFO until the amount is consumed.
          let left = amt
          for (const it of insts || []) {
            if (left <= 0.005) break
            const available = Number(it.total_amount) - Number(it.paid_amount)
            if (available <= 0.005) continue
            const take = Math.min(left, available)
            allocations.push({
              id: it.id,
              newPaid: Number(it.paid_amount) + take,
              becomesFull: take >= available - 0.005,
            })
            left -= take
          }
        }

        // ─── 3. Insert the payment row, linked to the FIRST installment we
        //        touched so the join in the list view still works. If the
        //        payment spans multiple installments we still record it as one
        //        row — that's a simplification matching the current UI.
        const firstInstId = allocations[0]?.id || null
        const { data: payRow, error: e2 } = await sb.from('payments').insert({
          invoice_id: inv.id,
          installment_id: firstInstId,
          service_request_id: inv.service_request?.id || null,
          branch_id: branchId,
          amount: amt,
          payment_method_id: pmId,
          bank_reference: paymentMethod === 'bank' ? (payTransferRef || null) : null,
          bank_account_id: paymentMethod === 'bank' ? (paySelBankAccId || null) : null,
          is_valid: true,
          notes: paymentNotes?.trim() || null,
          created_by: user?.id || null,
        }).select('id').single()
        if (e2) throw e2

        // Persist the bank-transfer receipts (one or more files), linking each to the
        // payment so they show in the deposits/verification view.
        if (paymentMethod === 'bank' && payRow?.id && Array.isArray(payTransferReceipt) && payTransferReceipt.length) {
          for (const f of payTransferReceipt) {
            try {
              const safe = (f.name || 'file').replace(/[^\w.\-]+/g, '_')
              const path = `payments/${payRow.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safe}`
              const { error: upErr } = await sb.storage.from('attachments').upload(path, f, { cacheControl: '3600', upsert: false })
              if (!upErr) {
                const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
                await sb.from('attachments').insert({
                  entity_type: 'payment', entity_id: payRow.id,
                  file_name: f.name, file_url: pub?.publicUrl || path, storage_path: path,
                  mime_type: f.type || null, size_bytes: f.size || null,
                  notes: 'bank_transfer_receipt', uploaded_by: user?.id || null,
                })
              }
            } catch { /* receipt upload is best-effort — never block the payment */ }
          }
        }

        // ─── 4. Update each touched installment. (remaining_amount is generated.)
        const nowIso = new Date().toISOString()
        for (const a of allocations) {
          const { error: eU } = await sb.from('installments').update({
            paid_amount: a.newPaid,
            ...(a.becomesFull ? { paid_date: nowIso } : {}),
          }).eq('id', a.id)
          if (eU) throw eU
        }

        // ─── 5. Roll up to the invoice. If we just settled the last riyal,
        //        flip status to "fully_paid".
        const newInvPaid = currentPaid + amt
        const invPatch = { paid_amount: newInvPaid }
        if (newInvPaid >= totalNum - 0.005 && fullyPaidStatusId) {
          invPatch.status_id = fullyPaidStatusId
        }
        const { error: e3 } = await sb.from('invoices').update(invPatch).eq('id', inv.id)
        if (e3) throw e3

        // ─── 6. دفعة إصدار الإقامة: لو رُبطت الدفعة بتأشيرة، ارفع صورة الجواز وأنشئ
        //        معاملة الإقامة المستقلة لهذه التأشيرة — تظهر فوراً في تبويب الفحص الطبي.
        let linkedVisa = null
        let spawnedIqama = false
        if (linkVisaId) {
          linkedVisa = (visaDet || []).find(v => v.id === linkVisaId) || null
          if (passportFile) {
            try {
              const f = passportFile
              const safe = (f.name || 'passport').replace(/[^\w.\-]+/g, '_')
              const path = `visa-applications/${linkVisaId}/passport/${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${safe}`
              const { error: upErr } = await sb.storage.from('attachments').upload(path, f, { cacheControl: '3600', upsert: false })
              if (!upErr) {
                const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
                await sb.from('attachments').insert({
                  entity_type: 'visa_application', entity_id: linkVisaId,
                  file_name: f.name, file_url: pub?.publicUrl || path, storage_path: path,
                  mime_type: f.type || null, size_bytes: f.size || null,
                  notes: 'passport', uploaded_by: user?.id || null,
                })
              }
            } catch { /* passport upload is best-effort — never block the payment */ }
          }
          // أنشئ معاملة الإقامة المستقلّة فقط عند سداد دفعة «إصدار الإقامة» بالكامل بهذه الدفعة —
          // لا عند دفعة جزئية (كانت تُنشأ على أي مبلغ، فتظهر المعاملة في الفحص الطبي ودفعة الإقامة
          // ما تزال غير مسدّدة). لو لا يوجد جدول دفعات أصلاً (بيانات قديمة) نُبقي السلوك القديم.
          const noSchedule = (insts || []).length === 0
          const iqamaSettled = noSchedule || (!!effectiveInst && allocations.some(a => a.id === effectiveInst.id && a.becomesFull))
          if (iqamaSettled) {
            // المنشأة تُقرأ من صف التأشيرة مباشرة — select الفاتورة لا يتضمن main_facility_id.
            const { data: vRow } = await sb.from('visa_applications').select('main_facility_id').eq('id', linkVisaId).maybeSingle()
            const { error: eSpawn } = await sb.from('iqama_issuance_applications').insert({
              service_request_id: inv.service_request?.id || null,
              visa_application_id: linkVisaId,
              main_facility_id: vRow?.main_facility_id || linkedVisa?.main_facility?.id || null,
              medical_status: 'pending',
              created_by: user?.id || null,
            })
            if (eSpawn) toast?.(T('حُفظت الدفعة لكن تعذر إنشاء معاملة الإقامة', 'Payment saved but spawning the iqama transaction failed'), 'error')
            else spawnedIqama = true
          }
        }

        // دفعة إصدار الإقامة: احفظ اسم العامل ورقم الحدود على التأشيرة — يظهران في صف التأشيرة ببطاقة
        // المعاملة. أفضل-جهد — لا يمنع حفظ الدفعة.
        if (!linkVisaId && showIqamaPassport && iqamaVisaId) {
          try {
            const patch = {}
            const wn = (iqamaWorkerName || '').trim()
            if (wn) patch.worker_name = wn
            const bn = (iqamaBorderNumber || '').trim()
            if (bn && bn !== String(iqamaVisa?.border_number || '')) patch.border_number = bn
            if (Object.keys(patch).length) await sb.from('visa_applications').update(patch).eq('id', iqamaVisaId)
          } catch { /* حفظ اسم العامل/رقم الحدود أفضل-جهد */ }
        }

        successInfo = {
          title: T('تم حفظ الدفعة بنجاح', 'Payment saved'),
          desc: spawnedIqama
            ? T('تمت إضافة الدفعة، وانتقلت التأشيرة المرتبطة إلى الفحص الطبي كمعاملة مستقلة.', 'Payment added — the linked visa moved to medical exam as its own transaction.')
            : T('تمت إضافة الدفعة إلى الفاتورة بنجاح.', 'The payment was added to the invoice successfully.'),
          rows: [
            { label: T('المبلغ المدفوع', 'Amount Paid'), value: num(amt), color: C.ok },
            { label: T('المتبقي', 'Remaining'), value: num(Math.max(0, totalNum - newInvPaid)), color: C.gold },
            ...(spawnedIqama && linkedVisa ? [{ label: T('التأشيرة المرتبطة', 'Linked visa'), value: `#${linkedVisa.border_number}`, color: C.blue }] : []),
          ],
        }
      } else if (type === 'refund') {
        // Partial-refund-capable flow:
        //   • Insert a payment row with NEGATIVE amount representing the refund
        //     (the CHECK constraint was relaxed to amount<>0 in the
        //      payments_allow_negative_for_refunds migration so this is legal).
        //   • Walk installments LIFO (most-recently-paid first) and subtract the
        //     refund amount from each paid_amount until consumed.
        //   • Subtract from invoices.paid_amount and flip status to "active"
        //     (or stay fully_paid if a zero-amount refund slipped through).
        // This preserves the original payment history while letting partial
        // refunds work — the user picks any amount up to currentPaid.
        const { data: invFreshR, error: er0 } = await sb.from('invoices')
          .select('total_amount, paid_amount').eq('id', inv.id).maybeSingle()
        if (er0) throw er0
        const totalNumR = Number(invFreshR?.total_amount) || 0
        const currentPaidR = Number(invFreshR?.paid_amount) || 0
        const branchIdR = inv.branch_id || inv.branch?.id || null
        const rpmId = refundMethod === 'bank' ? payMethodIds.bank : payMethodIds.cash
        if (!rpmId) { setActErr(T('تعذر تحديد طريقة الاسترجاع', 'Cannot resolve refund method')); return }
        const refundLine = (refundNotes || '').trim()
        const nowIsoR = new Date().toISOString()
        const isVisaScope = isPermanentVisa && refundScope === 'visa'

        // رفع إيصالات الحوالة وربطها بسجل الاسترجاع (أفضل-جهد) — مشتركة بين الكلي والتأشيرة.
        const uploadRefundReceipts = async (payId) => {
          if (refundMethod !== 'bank' || !payId || !Array.isArray(refundTransferReceipt) || !refundTransferReceipt.length) return
          for (const f of refundTransferReceipt) {
            try {
              const safe = (f.name || 'file').replace(/[^\w.\-]+/g, '_')
              const path = `payments/${payId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safe}`
              const { error: upErr } = await sb.storage.from('attachments').upload(path, f, { cacheControl: '3600', upsert: false })
              if (!upErr) {
                const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
                await sb.from('attachments').insert({
                  entity_type: 'payment', entity_id: payId,
                  file_name: f.name, file_url: pub?.publicUrl || path, storage_path: path,
                  mime_type: f.type || null, size_bytes: f.size || null,
                  notes: 'refund_transfer_receipt', uploaded_by: user?.id || null,
                })
              }
            } catch { /* رفع الإيصال أفضل-جهد — لا يوقف الاسترجاع */ }
          }
        }

        if (isVisaScope) {
          // ─── استرجاع تأشيرة: إلغاؤها وإزالتها مع توزيع يدوي على الدفعات ───
          // تُحذف دفعة «إصدار إقامة» واحدة (لتبقى دفعات الإقامة = عدد التأشيرات)، ويوزّع المستخدم
          // الباقي على الدفعات المشتركة. لكل دفعة: يُنقَص «المبلغ المُنقَص» من إجماليها، والجزء المدفوع
          // منه يُسترجَع. الإجمالي يَنقص بمجموع المُنقَص، والمدفوع يَنقص بمجموع المسترجَع. تبقى الثوابت:
          // الإجمالي = مجموع إجمالي الدفعات، والمدفوع = مجموع مدفوعها، ولا تتجاوز دفعةٌ مدفوعَها.
          if (!refundVisaId) { setActErr(T('اختر التأشيرة المراد استرجاعها', 'Choose the visa to refund')); return }
          const { data: liveRows, error: erL } = await sb.from('installments')
            .select('id, total_amount, paid_amount, installment_order, notes, visa_application_id, payment_milestone:payment_milestone_id(value_ar,value_en)')
            .eq('invoice_id', inv.id).is('deleted_at', null).order('installment_order')
          if (erL) throw erL
          const isRes = it => { const m = it.payment_milestone ? (it.payment_milestone.value_ar || it.payment_milestone.value_en) : ''; return /إقامة|اقامة|iqama|residence/i.test(m || it.notes || '') }
          const residenceRows = (liveRows || []).filter(isRes)
          const sharedRows = (liveRows || []).filter(it => !isRes(it))
          // دفعة الإقامة المراد حذفها = دفعة التأشيرة المُسترجَعة نفسها (المرتبطة بـ visa_application_id)،
          // لا «غير المدفوعة الأحدث» كما كان (فكان يحذف دفعة تأشيرة أخرى ويُبقي دفعة المسترجَعة يتيمة
          // ولا يُعيد ما دُفع على إقامتها). نلجأ للاستدلال القديم فقط إن لم توجد دفعة مرتبطة (بيانات قديمة).
          const resRm = residenceRows.find(it => it.visa_application_id === refundVisaId)
            || residenceRows.filter(it => Number(it.paid_amount) <= 0.005).sort((a, b) => (b.installment_order || 0) - (a.installment_order || 0))[0]
            || residenceRows.slice().sort((a, b) => (b.installment_order || 0) - (a.installment_order || 0))[0] || null
          const visaCnt = visaCount || 1
          const distOf = it => { const v = refundDist[it.id]; let n = v === undefined ? Math.round((Number(it.total_amount) / visaCnt) * 100) / 100 : Number(v || 0); if (isNaN(n)) n = 0; return Math.max(0, Math.min(Number(it.total_amount) || 0, Math.round(n * 100) / 100)) }
          let totalDeduct = 0, totalRefund = 0
          const instOps = []
          for (const it of sharedRows) {
            const ded = distOf(it); if (ded <= 0.005) continue
            const tot = Number(it.total_amount) || 0, pd = Number(it.paid_amount) || 0
            const refund_i = Math.max(0, Math.round((ded - (tot - pd)) * 100) / 100)
            const newTot = Math.round((tot - ded) * 100) / 100
            const newPaid = Math.round((pd - refund_i) * 100) / 100
            totalDeduct += ded; totalRefund += refund_i
            instOps.push({ id: it.id, newTot, newPaid, del: newTot <= 0.005 && newPaid <= 0.005 })
          }
          if (resRm) { totalDeduct += Number(resRm.total_amount) || 0; totalRefund += Number(resRm.paid_amount) || 0 }
          totalDeduct = Math.round(totalDeduct * 100) / 100
          totalRefund = Math.round(Math.min(totalRefund, currentPaidR) * 100) / 100
          if (totalDeduct <= 0.005) { setActErr(T('حدّد مبلغًا للحذف من الدفعات', 'Specify an amount to deduct from installments')); return }

          // 1) سجل استرجاع بالمبلغ المدفوع المسترجَع (إن وُجد) + لقطة هوية التأشيرة (visa_ref).
          const visaRefSeg = selectedVisa
            ? `visa_ref:${(selectedVisa.nationality?.name_ar || selectedVisa.nationality?.name_en || '').trim()}|${selectedVisa.border_number || ''}|${selectedVisa.file_number ?? ''}`
            : ''
          const refundNoteValue = [visaRefSeg, refundLine].filter(Boolean).join(' — ') || (isAr ? 'استرجاع تأشيرة' : 'Visa refund')
          if (totalRefund > 0.005) {
            const { data: refundRow, error: er2 } = await sb.from('payments').insert({
              invoice_id: inv.id, installment_id: sharedRows[0]?.id || null,
              service_request_id: inv.service_request?.id || null, branch_id: branchIdR,
              amount: -totalRefund, payment_method_id: rpmId, bank_reference: null, bank_account_id: null,
              is_valid: true, notes: refundNoteValue, created_by: user?.id || null,
            }).select('id').single()
            if (er2) throw er2
            await uploadRefundReceipts(refundRow?.id)
          }
          // 2) تطبيق التوزيع على الدفعات المشتركة (إجمالي + مدفوع).
          for (const op of instOps) {
            if (op.del) { await sb.from('installments').update({ deleted_at: nowIsoR }).eq('id', op.id) }
            else { await sb.from('installments').update({ total_amount: op.newTot, paid_amount: op.newPaid, ...(op.newPaid <= 0.005 ? { paid_date: null } : {}) }).eq('id', op.id) }
          }
          // 3) حذف دفعة إقامة واحدة.
          if (resRm) await sb.from('installments').update({ deleted_at: nowIsoR }).eq('id', resRm.id)
          // 4) حذف صف التأشيرة + إنقاص الكمية.
          await sb.from('installments').update({ visa_application_id: null }).eq('visa_application_id', refundVisaId)
          const { error: erDel } = await sb.from('visa_applications').delete().eq('id', refundVisaId)
          if (erDel) throw erDel
          const srIdRm = inv.service_request?.id
          if (srIdRm) {
            const { data: srRow } = await sb.from('service_requests').select('quantity').eq('id', srIdRm).maybeSingle()
            await sb.from('service_requests').update({ quantity: Math.max(0, (Number(srRow?.quantity) || 0) - 1) }).eq('id', srIdRm)
          }
          // 5) تحديث الفاتورة: الإجمالي -= المُنقَص، المدفوع -= المسترجَع، مع تصحيح العدّادات المخزّنة
          //    (عدد الدفعات/الكمية) كي تطابق الصفوف الحيّة بعد الحذف.
          const newTotalV = Math.max(0, Math.round((totalNumR - totalDeduct) * 100) / 100)
          const newPaidV = Math.max(0, Math.round((currentPaidR - totalRefund) * 100) / 100)
          const survivingInst = Math.max(0, (liveRows?.length || 0) - instOps.filter(op => op.del).length - (resRm ? 1 : 0))
          const invPatchV = {
            total_amount: newTotalV, paid_amount: newPaidV, last_activity_at: nowIsoR,
            installments_count: survivingInst, service_quantity: Math.max(0, (visaCount || 1) - 1),
          }
          // fully_paid فقط حين يبقى إجمالي موجب؛ وإلا (فاتورة صُفّرت بالكامل) تبقى active كي لا تُعرض
          // «مسدّدة بالكامل» بينما inferPayState يعرضها «غير مسدّدة» (إجمالي ≤ 0).
          if (newTotalV > 0.005 && newPaidV >= newTotalV - 0.005 && fullyPaidStatusId) invPatchV.status_id = fullyPaidStatusId
          else if (activeStatusId) invPatchV.status_id = activeStatusId
          const { error: er3 } = await sb.from('invoices').update(invPatchV).eq('id', inv.id)
          if (er3) throw er3
          successInfo = {
            title: T('تم تنفيذ الاسترجاع بنجاح', 'Refund processed'),
            desc: T('تم استرجاع التأشيرة وإزالتها من الفاتورة بنجاح.', 'The visa was refunded and removed from the invoice.'),
            rows: [
              { label: T('المبلغ المسترجع', 'Refunded'), value: num(totalRefund), color: C.red },
              { label: T('نقص الإجمالي', 'Total reduced by'), value: num(totalDeduct), color: C.gold },
              { label: T('الإجمالي الجديد', 'New total'), value: num(newTotalV), color: C.ok },
            ],
          }
        } else {
          // ─── استرجاع كلي: مبلغ يدوي يُفكّ من الدفعات المدفوعة (LIFO) — السلوك السابق. ───
          const rAmt = Number(refundAmount) || 0
          if (rAmt <= 0) { setActErr(T('أدخل مبلغ استرجاع أكبر من صفر', 'Enter a refund amount greater than zero')); return }
          if (rAmt > currentPaidR + 0.005) { setActErr(T('مبلغ الاسترجاع أكبر من المدفوع على الفاتورة', 'Refund amount exceeds invoice paid')); return }
          const { data: instsR, error: er1 } = await sb.from('installments')
            .select('id, total_amount, paid_amount, installment_order')
            .eq('invoice_id', inv.id).is('deleted_at', null).order('installment_order', { ascending: false })
          if (er1) throw er1
          let leftR = rAmt
          const deAllocs = []
          for (const it of instsR || []) {
            if (leftR <= 0.005) break
            const paidNum = Number(it.paid_amount) || 0
            if (paidNum <= 0.005) continue
            const take = Math.min(leftR, paidNum)
            deAllocs.push({ id: it.id, newPaid: paidNum - take, becomesEmpty: take >= paidNum - 0.005 })
            leftR -= take
          }
          const refundNoteValue = refundLine || (isAr ? 'استرجاع' : 'Refund')
          const { data: refundRow, error: er2 } = await sb.from('payments').insert({
            invoice_id: inv.id, installment_id: deAllocs[0]?.id || null,
            service_request_id: inv.service_request?.id || null, branch_id: branchIdR,
            amount: -rAmt, payment_method_id: rpmId, bank_reference: null, bank_account_id: null,
            is_valid: true, notes: refundNoteValue, created_by: user?.id || null,
          }).select('id').single()
          if (er2) throw er2
          await uploadRefundReceipts(refundRow?.id)
          for (const a of deAllocs) {
            const { error: erU } = await sb.from('installments').update({ paid_amount: a.newPaid, ...(a.becomesEmpty ? { paid_date: null } : {}) }).eq('id', a.id)
            if (erU) throw erU
          }
          const newInvPaidR = currentPaidR - rAmt
          const invPatchR = { paid_amount: newInvPaidR, last_activity_at: nowIsoR }
          if (newInvPaidR < totalNumR - 0.005 && activeStatusId) invPatchR.status_id = activeStatusId
          const { error: er3 } = await sb.from('invoices').update(invPatchR).eq('id', inv.id)
          if (er3) throw er3
          successInfo = {
            title: T('تم تنفيذ الاسترجاع بنجاح', 'Refund processed'),
            desc: T('تم استرجاع المبلغ المحدد من الفاتورة بنجاح.', 'The selected amount was refunded from the invoice successfully.'),
            rows: [
              { label: T('مبلغ الاسترجاع', 'Refund Amount'), value: num(rAmt), color: C.red },
              { label: T('المتبقي مدفوعًا', 'Remaining Paid'), value: num(Math.max(0, newInvPaidR)), color: C.ok },
            ],
          }
        }
      } else if (type === 'cancel') {
        // Resolve the cancelled-status id on demand if the modal's lookup effect
        // hasn't resolved yet — otherwise a quick confirm silently no-ops.
        let cid = cancelledStatusId
        if (!cid) {
          const { data: st } = await sb.from('lookup_items')
            .select('id,category:lookup_categories!inner(category_key)')
            .eq('category.category_key', 'invoice_status').eq('code', 'cancelled').maybeSingle()
          cid = st?.id || null
        }
        if (!cid) { setActErr(T('تعذر تحديد حالة الإلغاء', 'Cannot resolve cancelled status')); return }
        // حارس التزامن: اقرأ الحالة وسجلّ الإلغاء الطازجَين قبل الكتابة — كي لا نُلغي فاتورةً ألغتها
        // جلسةٌ أخرى (فنطمس سجلّ الإلغاء الأصلي)، ونُلحق على السجلّ الحالي لا على نسخة قديمة.
        const { data: invFreshC } = await sb.from('invoices')
          .select('cancel_log, status:status_id(code)').eq('id', inv.id).maybeSingle()
        if (invFreshC?.status?.code === 'cancelled') { setActErr(T('الفاتورة ملغاة بالفعل', 'Invoice is already cancelled')); return }
        // سجلّ الإلغاء — نُلحق قيداً بحقل cancel_log (jsonb): مَن ألغى، متى، والسبب.
        // نفس نمط note_log/edit_log الموجود. السبب يُعرض لاحقاً في شريط «هذه الفاتورة ملغاة».
        const nowIso = new Date().toISOString()
        const prevCancelLog = Array.isArray(invFreshC?.cancel_log) ? invFreshC.cancel_log : (Array.isArray(inv.cancel_log) ? inv.cancel_log : [])
        const cancelEntry = {
          at: nowIso,
          by: user?.id || null,
          by_name: user?.person?.name_ar || user?.person?.name_en || null,
          reason: (cancelReason || '').trim(),
        }
        // .select() lets us confirm a row was actually updated — if zero rows come
        // back (e.g. a permission/RLS no-op) we surface an error instead of a false success.
        const { data: upd, error } = await sb.from('invoices')
          .update({ status_id: cid, cancel_log: [...prevCancelLog, cancelEntry], last_activity_at: nowIso })
          .eq('id', inv.id).select('id')
        if (error) throw error
        if (!upd || upd.length === 0) { setActErr(T('تعذّر إلغاء الفاتورة — تحقق من الصلاحيات', 'Could not cancel the invoice — check permissions')); return }
        // إلغاء الفاتورة لا يمسّ المعاملة المرتبطة: حالة المعاملة (التاق) تخصّ المعاملة لا الفاتورة،
        // ولها إجراء إلغاء مستقل («إلغاء المعاملة»). فنغيّر حالة الفاتورة فقط ونترك حالة الطلب كما هي.
        successInfo = {
          title: T('تم إلغاء الفاتورة بنجاح', 'Invoice cancelled'),
          desc: T('تم تغيير حالة الفاتورة إلى ملغاة. المعاملة تبقى كما هي.', 'The invoice status was changed to cancelled. The transaction is unchanged.'),
          rows: [],
        }
      } else if (type === 'done') {
        const srId = inv.service_request?.id
        if (!srId) { setActErr(T('لا توجد معاملة مرتبطة بهذه الفاتورة', 'No transaction is linked to this invoice')); return }
        const nowIso = new Date().toISOString()
        const noteTrim = (doneNote || '').trim()
        if (isStagedDone && !isFinalStage) {
          // مرحلة وسطى (نقل الكفالة: نقل/تأمين/رخصة العمل · التجديد: التأمين): تُحفظ في <calc>.stage_data ويُرفع ملفها، بلا إنهاء المعاملة.
          const { data: tcRow } = await sb.from(stageCalcTable).select('id,stage_data').eq('invoice_id', inv.id).is('deleted_at', null).maybeSingle()
          const tcId = tcRow?.id || renewTcId
          if (!tcId) { setActErr(T('تعذّر العثور على الحسبة المرتبطة', 'Could not find the linked quote')); return }
          const sd = (tcRow?.stage_data && typeof tcRow.stage_data === 'object') ? { ...tcRow.stage_data } : {}
          const byName = user?.person?.name_ar || user?.person?.name_en || null
          const sKey = stage === 'insurance' ? 'insurance' : stage === 'transfer' ? 'transfer' : 'work_permit'
          // «ملغاة» للمرحلة: تُسجَّل بحالة cancelled + السبب، بلا حقول/ملف ولا تغيير على الفاتورة.
          if (doneChoice === 'cancel') {
            sd[sKey] = { status: 'cancelled', reason: noteTrim || null, at: nowIso, by: user?.id || null, by_name: byName }
            const { error: eC } = await sb.from(stageCalcTable).update({ stage_data: sd, updated_at: nowIso }).eq('id', tcId)
            if (eC) throw eC
            successInfo = { title: T('تم تسجيل الإلغاء', 'Cancelled'), desc: T('تم تسجيل إلغاء هذه المرحلة.', 'This stage was marked cancelled.'), rows: [] }
          } else if (doneChoice === 'skip') {
            // «لا يحتاج» (التأمين في التجديد): تُعلَّم المرحلة كغير مطلوبة وتُتابَع المرحلة التالية، بلا حقول/ملف.
            sd[sKey] = { status: 'skipped', reason: noteTrim || null, at: nowIso, by: user?.id || null, by_name: byName }
            const { error: eS } = await sb.from(stageCalcTable).update({ stage_data: sd, updated_at: nowIso }).eq('id', tcId)
            if (eS) throw eS
            successInfo = { title: T('تم التخطّي', 'Skipped'), desc: T('تم تعليم هذه المرحلة كغير مطلوبة. يمكنك متابعة المرحلة التالية.', 'This stage was marked as not needed. You can proceed to the next stage.'), rows: [] }
          } else {
          const patch = { updated_at: nowIso }
          let noteKey, file, doneTitle
          if (stage === 'transfer') {
            // مرحلة «النقل» — تأكيد فقط (نعم/لا)، بلا حقول أو ملف.
            sd.transfer = { status: 'done', at: nowIso, by: user?.id || null, by_name: byName }
            doneTitle = T('تم تسجيل النقل', 'Transfer marked done')
          } else if (stage === 'insurance') {
            sd.insurance = { status: 'done', company: insCompany.trim(), policy_no: insPolicyNo.trim(), expiry: insExpiry || null, amount: String(insAmount).trim() === '' ? null : Number(insAmount), at: nowIso, by: user?.id || null, by_name: byName }
            // أعمدة التأمين تختلف بين الجدولين: التجديد يخزّن في medical_insurance_*، النقل في insurance_*.
            if (isRenewalDone) { patch.medical_insurance_company = insCompany.trim() || null; patch.medical_insurance_policy = insPolicyNo.trim() || null; patch.medical_insurance_end = insExpiry || null; patch.medical_insured = true }
            else { patch.insurance_company = insCompany.trim() || null; patch.insurance_expiry = insExpiry || null }
            noteKey = isRenewalDone ? 'ren_ins_file' : 'tr_ins_file'; file = insFile; doneTitle = T('تم حفظ بيانات التأمين', 'Insurance saved')
          } else {
            sd.work_permit = { status: 'done', duration_months: wpDuration ? Number(wpDuration) : null, expiry: wpExpiry || null, amount: String(wpAmount).trim() === '' ? null : Number(wpAmount), at: nowIso, by: user?.id || null, by_name: byName }
            patch.work_permit_expiry = wpExpiry || null
            noteKey = 'tr_wp_file'; file = wpFile; doneTitle = T('تم حفظ بيانات رخصة العمل', 'Work permit saved')
          }
          patch.stage_data = sd
          const { error: eSt } = await sb.from(stageCalcTable).update(patch).eq('id', tcId)
          if (eSt) throw eSt
          if (file) {
            try {
              const safe = (file.name || noteKey).replace(/[^\w.\-]+/g, '_')
              const path = `service-requests/${srId}/${noteKey}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safe}`
              const { error: upErr } = await sb.storage.from('attachments').upload(path, file, { cacheControl: '3600', upsert: false })
              if (!upErr) {
                const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
                await sb.from('attachments').insert({ entity_type: 'service_request', entity_id: srId, file_name: file.name, file_url: pub?.publicUrl || path, storage_path: path, mime_type: file.type || null, size_bytes: file.size || null, notes: noteKey, uploaded_by: user?.id || null })
              }
            } catch { /* رفع ملف المرحلة أفضل-جهد */ }
          }
          successInfo = { title: doneTitle, desc: T('تم حفظ بيانات المرحلة. يمكنك متابعة المرحلة التالية.', 'Stage data saved. You can proceed to the next stage.'), rows: [] }
          }
        } else if (acctPending) {
          // خدمات موافقة المحاسب — مرحلة موافقة المحاسب: نعم→approved / لا→rejected (سبب إجباري).
          const approve = acctChoice === 'yes'
          const { data: srA, error: eA } = await sb.from('service_requests')
            .update({ accountant_status: approve ? 'approved' : 'rejected', accountant_note: noteTrim || null, accountant_by: user?.id || null, accountant_at: nowIso, updated_at: nowIso })
            .eq('id', srId).select('id')
          if (eA) throw eA
          if (!srA || srA.length === 0) { setActErr(T('تعذّر حفظ قرار المحاسب — تحقق من الصلاحيات', 'Could not save accountant decision — check permissions')); return }
          successInfo = approve
            ? { title: T('تمت موافقة المحاسب', 'Accountant approved'), desc: T('تم تحديث الحالة إلى «تمت الموافقة من المحاسب».', 'Status updated to accountant-approved.'), rows: [] }
            : { title: T('تم الرفض من المحاسب', 'Accountant rejected'), desc: T('تم تحديث الحالة إلى «تم الإلغاء من المحاسب».', 'Status updated to rejected by accountant.'), rows: [] }
        } else if (doneChoice === 'cancel') {
          // إجراء «إلغاء» = تحويل حالة الطلب فقط إلى «ملغي» — لا يُلغى/يُبطل أي شيء على الفاتورة نفسها.
          // المرحلة الأخيرة (النقل: muqeem · التجديد: iqama): نسجّل أيضاً إلغاء المرحلة في stage_data.
          if (inv.service_request?.status?.code === 'cancelled') { setActErr(T('المعاملة ملغاة بالفعل', 'The transaction is already cancelled')); return }
          if (isStagedDone) {
            try {
              const finalKey = isRenewalDone ? 'iqama' : 'muqeem'
              const { data: tcRow } = await sb.from(stageCalcTable).select('id,stage_data').eq('invoice_id', inv.id).is('deleted_at', null).maybeSingle()
              if (tcRow?.id) {
                const sd = (tcRow.stage_data && typeof tcRow.stage_data === 'object') ? { ...tcRow.stage_data } : {}
                sd[finalKey] = { status: 'cancelled', reason: noteTrim || null, at: nowIso, by: user?.id || null, by_name: user?.person?.name_ar || user?.person?.name_en || null }
                await sb.from(stageCalcTable).update({ stage_data: sd, updated_at: nowIso }).eq('id', tcRow.id)
              }
            } catch { /* تسجيل إلغاء مرحلة الإقامة أفضل-جهد */ }
          }
          const { data: rstC } = await sb.from('lookup_items')
            .select('id,category:lookup_categories!inner(category_key)')
            .eq('category.category_key', 'request_status').eq('code', 'cancelled').maybeSingle()
          const rcid = rstC?.id || null
          if (!rcid) { setActErr(T('تعذر تحديد حالة الإلغاء', 'Cannot resolve cancelled status')); return }
          const { data: srC, error: eC } = await sb.from('service_requests')
            .update({ status_id: rcid, cancelled_at: nowIso, cancelled_by: user?.id || null, cancelled_reason: noteTrim || null, updated_at: nowIso })
            .eq('id', srId).select('id')
          if (eC) throw eC
          if (!srC || srC.length === 0) { setActErr(T('تعذّر تحديث حالة الطلب — تحقق من الصلاحيات', 'Could not update the request status — check permissions')); return }
          successInfo = {
            title: T('تم تحديث حالة الطلب', 'Request status updated'),
            desc: T('تم تغيير حالة المعاملة إلى «ملغي». الفاتورة تبقى كما هي.', 'The transaction status was changed to cancelled. The invoice is unchanged.'),
            rows: [],
          }
        } else {
          // إجراء «تم الإنجاز» — تحويل حالة المعاملة المرتبطة إلى «منجز».
          if (inv.service_request?.status?.code === 'done') { setActErr(T('المعاملة منجزة بالفعل', 'The transaction is already completed')); return }
          const { data: rst } = await sb.from('lookup_items')
            .select('id,category:lookup_categories!inner(category_key)')
            .eq('category.category_key', 'request_status').eq('code', 'done').maybeSingle()
          const rdid = rst?.id || null
          if (!rdid) { setActErr(T('تعذر تحديد حالة الإنجاز', 'Cannot resolve the completed status')); return }
          // .select() لتأكيد تحديث صفٍّ فعلاً — صفر صفوف يعني منع RLS فنُظهر خطأً بدل نجاحٍ زائف.
          const { data: srUpd, error: eDone } = await sb.from('service_requests')
            .update({ status_id: rdid, completed_by: user?.id || null, completed_at: nowIso, updated_at: nowIso })
            .eq('id', srId).select('id')
          if (eDone) throw eDone
          if (!srUpd || srUpd.length === 0) { setActErr(T('تعذّر إنجاز المعاملة — تحقق من الصلاحيات', 'Could not complete the transaction — check permissions')); return }
          // المرحلة الأخيرة (النقل: مقيم · التجديد: الإقامة): المهنة + انتهاء الإقامة + ملف مقيم — أفضل-جهد كي لا تمنع الإنجاز.
          if (isStagedDone) {
            const finalKey = isRenewalDone ? 'iqama' : 'muqeem'
            try {
              // تُحفظ في stage_data + الأعمدة (المهنة/الانتهاء) للعرض/الطباعة.
              const { data: tcRow } = await sb.from(stageCalcTable).select('id,stage_data').eq('invoice_id', inv.id).is('deleted_at', null).maybeSingle()
              const tcId = tcRow?.id || renewTcId
              const sd = (tcRow?.stage_data && typeof tcRow.stage_data === 'object') ? { ...tcRow.stage_data } : {}
              sd[finalKey] = { status: 'done', via_contact: muqViaContact, iqama_expiry: renewIqamaExpiry || null, occupation_id: renewOccupationId || null, occupation_name_ar: (renewOccupation || '').trim() || null, at: nowIso, by: user?.id || null, by_name: user?.person?.name_ar || user?.person?.name_en || null }
              const patch = { stage_data: sd, updated_at: nowIso }
              if (renewOccupationId) { patch.occupation_id = renewOccupationId; patch.occupation_name_ar = (renewOccupation || '').trim() || null }
              if (renewIqamaExpiry) patch.expected_expiry_date = renewIqamaExpiry
              const q = sb.from(stageCalcTable).update(patch)
              await (tcId ? q.eq('id', tcId) : q.eq('invoice_id', inv.id))
            } catch { /* حفظ بيانات الإقامة أفضل-جهد */ }
            if (renewMuqeemFile && srId) {
              try {
                const f = renewMuqeemFile
                const noteK = isRenewalDone ? 'ren_muqeem_file' : 'muqeem_file'
                const safe = (f.name || 'muqeem').replace(/[^\w.\-]+/g, '_')
                const path = `service-requests/${srId}/${noteK}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safe}`
                const { error: upErr } = await sb.storage.from('attachments').upload(path, f, { cacheControl: '3600', upsert: false })
                if (!upErr) {
                  const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
                  await sb.from('attachments').insert({
                    entity_type: 'service_request', entity_id: srId,
                    file_name: f.name, file_url: pub?.publicUrl || path, storage_path: path,
                    mime_type: f.type || null, size_bytes: f.size || null,
                    notes: noteK, uploaded_by: user?.id || null,
                  })
                }
              } catch { /* رفع ملف مقيم أفضل-جهد */ }
            }
          }
          // ملاحظة الإنجاز الاختيارية (لغير الخدمات المرحلية) — تُحفظ على الطلب في completion_note.
          if (!isStagedDone && noteTrim) {
            try { await sb.from('service_requests').update({ completion_note: noteTrim }).eq('id', srId) } catch { /* حفظ ملاحظة الإنجاز أفضل-جهد */ }
          }
          // الموافقة للنقل الخارجي عند الإنجاز: حفظ الرقم الموحد للشركة الناقلة + اسم المدير في other_applications.details.
          if (isExtTransfer && srId) {
            try {
              const { data: oaRows } = await sb.from('other_applications').select('id,details').eq('service_request_id', srId).is('deleted_at', null).limit(1)
              const oa = Array.isArray(oaRows) ? oaRows[0] : null
              if (oa?.id) {
                const merged = { ...(oa.details || {}), transfer_company_700: extTarget700.trim(), manager_name: extManager.trim() }
                await sb.from('other_applications').update({ details: merged }).eq('id', oa.id)
              }
            } catch { /* حفظ بيانات الناقلة أفضل-جهد */ }
          }
          // المستندات: رفع ملف المستند كمرفق للطلب (entity_type=service_request, notes=document_file).
          if (isDocSvc && doneFile && srId) {
            try {
              const f = doneFile
              const safe = (f.name || 'document').replace(/[^\w.\-]+/g, '_')
              const path = `service-requests/${srId}/document/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safe}`
              const { error: upErr } = await sb.storage.from('attachments').upload(path, f, { cacheControl: '3600', upsert: false })
              if (!upErr) {
                const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
                await sb.from('attachments').insert({
                  entity_type: 'service_request', entity_id: srId,
                  file_name: f.name, file_url: pub?.publicUrl || path, storage_path: path,
                  mime_type: f.type || null, size_bytes: f.size || null,
                  notes: 'document_file', uploaded_by: user?.id || null,
                })
              }
            } catch { /* رفع ملف المستند أفضل-جهد */ }
          }
          // مدخلات إنجاز الخدمات المُدارة بالسجل: القيم النصّية/التاريخية → other_applications.details،
          // والملفّات → مرفقات الطلب (notes = مفتاح الحقل). تعديل الراتب يبدأ مرحلة «انتظار إرجاع الراتب».
          if (doneInputs.length && srId) {
            const detailPatch = {}
            for (const f of doneInputs) {
              if (f.type === 'file') continue
              const v = doneVals[f.key]
              if (v == null || String(v).trim() === '') continue
              detailPatch[f.key] = f.type === 'number' ? Number(v) : (f.type === 'date' ? v : String(v).trim())
            }
            // تعديل الراتب: حدّد مرحلة الانتظار واحسب تاريخ إرجاع الراتب من «مدة الراتب» المُدخلة وقت الطلب.
            if (baseSvcCode(svcCode) === 'name_translation') {
              detailPatch.salary_phase = 'awaiting_return'
              const months = Number((Array.isArray(visaDet) ? visaDet[0] : null)?.details?.salary_months || 0)
              if (months > 0) { const rd = new Date(nowIso); rd.setMonth(rd.getMonth() + months); detailPatch.salary_return_date = rd.toISOString().slice(0, 10) }
            }
            if (Object.keys(detailPatch).length) {
              try {
                const { data: oaRows } = await sb.from('other_applications').select('id,details').eq('service_request_id', srId).is('deleted_at', null).limit(1)
                const oa = Array.isArray(oaRows) ? oaRows[0] : null
                if (oa?.id) await sb.from('other_applications').update({ details: { ...(oa.details || {}), ...detailPatch } }).eq('id', oa.id)
              } catch { /* حفظ مدخلات الإنجاز أفضل-جهد */ }
            }
            for (const f of doneInputs) {
              if (f.type !== 'file' || !doneFiles[f.key]) continue
              try {
                const file = doneFiles[f.key]
                const safe = (file.name || f.key).replace(/[^\w.\-]+/g, '_')
                const path = `service-requests/${srId}/${f.key}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safe}`
                const { error: upErr } = await sb.storage.from('attachments').upload(path, file, { cacheControl: '3600', upsert: false })
                if (!upErr) {
                  const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
                  await sb.from('attachments').insert({
                    entity_type: 'service_request', entity_id: srId,
                    file_name: file.name, file_url: pub?.publicUrl || path, storage_path: path,
                    mime_type: file.type || null, size_bytes: file.size || null,
                    notes: f.key, uploaded_by: user?.id || null,
                  })
                }
              } catch { /* رفع ملف الإنجاز أفضل-جهد */ }
            }
          }
          const isSalaryDone = baseSvcCode(svcCode) === 'name_translation'
          successInfo = {
            title: isStagedDone ? T('تم حفظ البيانات', 'Data saved') : T('تم إنجاز المعاملة', 'Transaction completed'),
            desc: isStagedDone
              ? T('تم تحديث حالة المعاملة إلى «منجز» وحفظ بيانات المرحلة.', 'The transaction was completed and the stage data was saved.')
              : isSalaryDone
                ? T('تم تعديل الراتب، والمعاملة الآن «بانتظار إرجاع الراتب الأساسي».', 'Salary modified — the transaction is now awaiting return to base salary.')
                : T('تم تحديث حالة المعاملة إلى «منجز».', 'The transaction status was changed to completed.'),
            rows: [],
          }
        }
      } else if (type === 'salary_return') {
        // تعديل الراتب — المرحلة الثانية: إرجاع الراتب للراتب الأساسي + رفع صورة شاشة الراتب الأساسي.
        const srId = inv.service_request?.id
        if (!srId) { setActErr(T('لا توجد معاملة مرتبطة بهذه الفاتورة', 'No transaction is linked to this invoice')); return }
        const nowIso = new Date().toISOString()
        try {
          const { data: oaRows } = await sb.from('other_applications').select('id,details').eq('service_request_id', srId).is('deleted_at', null).limit(1)
          const oa = Array.isArray(oaRows) ? oaRows[0] : null
          if (!oa?.id) { setActErr(T('تعذّر العثور على بيانات المعاملة', 'Could not find the transaction record')); return }
          const merged = { ...(oa.details || {}), salary_phase: 'returned', salary_returned_at: nowIso, salary_returned_by: user?.id || null, salary_returned_by_name: user?.person?.name_ar || user?.person?.name_en || null }
          const bs = salReturnVals.base_salary
          if (bs != null && String(bs).trim() !== '') merged.base_salary = Number(bs)
          await sb.from('other_applications').update({ details: merged }).eq('id', oa.id)
        } catch (e) { setActErr((isAr ? 'خطأ: ' : 'Error: ') + (e?.message || '')); return }
        const file = salReturnFiles.salary_base_file
        if (file) {
          try {
            const safe = (file.name || 'salary_base').replace(/[^\w.\-]+/g, '_')
            const path = `service-requests/${srId}/salary_base_file/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safe}`
            const { error: upErr } = await sb.storage.from('attachments').upload(path, file, { cacheControl: '3600', upsert: false })
            if (!upErr) {
              const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
              await sb.from('attachments').insert({
                entity_type: 'service_request', entity_id: srId,
                file_name: file.name, file_url: pub?.publicUrl || path, storage_path: path,
                mime_type: file.type || null, size_bytes: file.size || null,
                notes: 'salary_base_file', uploaded_by: user?.id || null,
              })
            }
          } catch { /* رفع صورة الراتب الأساسي أفضل-جهد */ }
        }
        successInfo = {
          title: T('تم إرجاع الراتب', 'Salary returned'),
          desc: T('تم إرجاع الراتب إلى الراتب الأساسي وإغلاق المعاملة.', 'The salary was returned to base and the transaction is closed.'),
          rows: [],
        }
      }
      // print: nothing to write — just close. Real printing logic stays out of this
      // commit so we can keep the change focused on the persistence work the user asked for.
      onSaved?.()
      if (successInfo) setDone(successInfo)
      else onClose()
    } catch (e) {
      setActErr((isAr ? 'خطأ: ' : 'Error: ') + (e?.message || (isAr ? 'فشلت العملية' : 'Operation failed')))
    } finally {
      setSubmitting(false)
    }
  }

  // ─── شاشة النجاح — العبارة الموحّدة فقط (نمط معرض الفورمات) ────────────────
  const successNode = done ? <SuccessView title={done.title} /> : undefined

  // ─── صفحة بيانات الفاتورة — أول صفحة في كل عملية (InfoRow الموحّد) ─────────
  const invoiceInfo = (
    <InvoiceInfoSection T={T} type={type} total={total} paid={paid} remaining={remaining} />
  )

  // ─── خيارات الطباعة — Checkbox الموحّد (محكومة بالحالة) ───────────────────
  const printOptions = (
    <ModalSection Icon={Printer} label={T('خيارات الطباعة', 'Print Options')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '6px 4px' }}>
        <Checkbox label={T('شعار المؤسسة', 'Company Logo')} checked={printOpts.logo} onChange={v => setPrintOpts(p => ({ ...p, logo: v }))} />
        <Checkbox label={T('بيانات العميل', 'Client Info')} checked={printOpts.client} onChange={v => setPrintOpts(p => ({ ...p, client: v }))} />
        <Checkbox label={T('تفاصيل الدفعات والمدفوعات', 'Installments & Payments')} checked={printOpts.details} onChange={v => setPrintOpts(p => ({ ...p, details: v }))} />
        <Checkbox label={T('ختم وتوقيع', 'Stamp & Signature')} checked={printOpts.stamp} onChange={v => setPrintOpts(p => ({ ...p, stamp: v }))} />
      </div>
    </ModalSection>
  )

  // ─── تأكيد الإنجاز — نقل الكفالة يجمع بيانات التجديد؛ بقية الخدمات تأكيدٌ مباشر بلا حقول ───────
  const trStageLabel = stage === 'transfer' ? T('النقل', 'Transfer') : stage === 'insurance' ? T('بيانات التأمين', 'Insurance') : stage === 'workpermit' ? T('رخصة العمل', 'Work Permit') : T('الإقامة', 'Iqama')
  // التجديد: زر «لا يحتاج» (تخطّي) يظهر في مرحلة التأمين فقط — بين «تم الإنجاز» و«ملغاة».
  const showSkipChoice = isRenewalDone && stage === 'insurance'
  const doneConfirm = isStagedDone ? (
    <ModalSection Icon={RotateCcw} label={trStageLabel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 2px' }}>
        {/* خياران (أو ثلاثة عند التأمين في التجديد): «تم الإنجاز» (أخضر) · «لا يحتاج» (ذهبي) · «ملغاة» (أحمر). */}
        <div style={{ display: 'grid', gridTemplateColumns: showSkipChoice ? '1fr 1fr 1fr' : '1fr 1fr', gap: 6 }}>
          {(showSkipChoice ? [{ key: 'done', color: C.ok, label: T('تم الإنجاز', 'Completed') }, { key: 'skip', color: C.gold, label: T('لا يحتاج', 'Not Needed') }, { key: 'cancel', color: C.red, label: T('ملغاة', 'Cancelled') }] : [{ key: 'done', color: C.ok, label: T('تم الإنجاز', 'Completed') }, { key: 'cancel', color: C.red, label: T('ملغاة', 'Cancelled') }]).map(o => {
            const sel = doneChoice === o.key
            return (
              <button key={o.key} type="button" onClick={() => setDoneChoice(o.key)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '14px 12px', borderRadius: 9, cursor: 'pointer', fontFamily: F, fontSize: 14, fontWeight: sel ? 600 : 500, transition: '.18s', background: sel ? o.color + '14' : FKC.inputBg, border: '1px solid ' + (sel ? o.color + '80' : 'rgba(255,255,255,.08)'), color: sel ? o.color : FKC.tx3 }}>
                {sel ? <CheckCircle2 size={20} strokeWidth={2} style={{ flexShrink: 0 }} /> : <Circle size={20} strokeWidth={2} style={{ flexShrink: 0, opacity: .5 }} />}
                <span>{o.label}</span>
              </button>
            )
          })}
        </div>
        {doneChoice === 'cancel' ? (
          <TextArea grow full req label={T('السبب', 'Reason')} value={doneNote} onChange={setDoneNote} placeholder={T('اكتب سبب الإلغاء…', 'Explain the cancellation reason…')} />
        ) : doneChoice === 'skip' ? (
          <div style={{ fontSize: 12.5, color: FKC.tx3, fontFamily: F, lineHeight: 1.8, padding: '2px 2px' }}>{T('سيتم تعليم مرحلة التأمين كغير مطلوبة (التأمين ساري) والانتقال إلى مرحلة الإقامة.', 'The insurance stage will be marked as not needed (insurance still valid) and you can proceed to the Iqama stage.')}</div>
        ) : stage === 'transfer' ? null : stage === 'insurance' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <TextField req label={T('اسم الشركة', 'Company')} value={insCompany} onChange={setInsCompany} />
            <TextField req label={T('رقم بوليصة التأمين', 'Policy No')} value={insPolicyNo} onChange={setInsPolicyNo} />
            <DateField req label={T('تاريخ انتهاء التأمين', 'Insurance Expiry')} value={insExpiry} onChange={setInsExpiry} lang={isAr ? 'ar' : 'en'} />
            <CurrencyField req label={T('المبلغ', 'Amount')} value={insAmount} onChange={setInsAmount} unit={T('ريال', 'SAR')} />
            <FileField full req label={T('ملف بوليصة التأمين', 'Policy File')} value={insFile} onChange={setInsFile} />
          </div>
        ) : stage === 'workpermit' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FKSelect req label={T('المدة', 'Duration')} placeholder={T('اختر المدة…', 'Select duration…')}
              options={[3, 6, 9, 12].map(n => ({ n }))} getKey={o => String(o.n)} getLabel={o => `${o.n} ${T('أشهر', 'months')}`}
              value={wpDuration ? String(wpDuration) : ''} onChange={v => setWpDuration(v)} />
            <DateField req label={T('تاريخ انتهاء رخصة العمل', 'Work Permit Expiry')} value={wpExpiry} onChange={setWpExpiry} lang={isAr ? 'ar' : 'en'} />
            <CurrencyField full req label={T('المبلغ', 'Amount')} value={wpAmount} onChange={setWpAmount} unit={T('ريال', 'SAR')} />
            <FileField full req label={T('رخصة العمل', 'Work Permit File')} value={wpFile} onChange={setWpFile} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* «التجديد عبر تواصل» — يظهر في نقل الكفالة وتجديد الإقامة. */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)', marginBottom: 9 }}>{T('التجديد عبر تواصل', 'Renewal via contact')}<span style={{ color: '#c0392b' }}> *</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[{ key: true, color: C.ok, label: T('نعم', 'Yes') }, { key: false, color: C.red, label: T('لا', 'No') }].map(o => {
                  const sel = muqViaContact === o.key
                  return (
                    <button key={String(o.key)} type="button" onClick={() => setMuqViaContact(o.key)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '14px 12px', borderRadius: 9, cursor: 'pointer', fontFamily: F, fontSize: 14, fontWeight: sel ? 600 : 500, transition: '.18s', background: sel ? o.color + '14' : FKC.inputBg, border: '1px solid ' + (sel ? o.color + '80' : 'rgba(255,255,255,.08)'), color: sel ? o.color : FKC.tx3 }}>
                      {sel ? <CheckCircle2 size={20} strokeWidth={2} style={{ flexShrink: 0 }} /> : <Circle size={20} strokeWidth={2} style={{ flexShrink: 0, opacity: .5 }} />}
                      <span>{o.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <DateField req label={T('تاريخ انتهاء الإقامة', 'Iqama Expiry Date')} value={renewIqamaExpiry} onChange={setRenewIqamaExpiry} lang={isAr ? 'ar' : 'en'} />
            <FKSelect req label={T('المهنة', 'Occupation')} placeholder={T('اختر المهنة…', 'Select occupation…')}
              options={renewOccupations} getKey={o => o.id} getLabel={o => o.name_ar || o.name_en || ''} getSub={o => o.name_en || ''}
              value={renewOccupationId}
              onChange={(id, item) => { setRenewOccupationId(id); setRenewOccupation(item?.name_ar || item?.name_en || '') }} />
            <FileField full req label={T('ملف مقيم', 'Muqeem File')} value={renewMuqeemFile} onChange={setRenewMuqeemFile} />
          </div>
        )}
      </div>
    </ModalSection>
  ) : acctPending ? (
    /* خدمات موافقة المحاسب — المرحلة الأولى: موافقة المحاسب (نعم/لا) + نص (إجباري عند الرفض). */
    <ModalSection Icon={CheckCircle2} label={T('موافقة المحاسب', 'Accountant Approval')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 2px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {[
            { key: 'yes', color: C.ok, label: T('نعم — موافقة', 'Yes — Approve') },
            { key: 'no', color: C.red, label: T('لا — رفض', 'No — Reject') },
          ].map(o => {
            const sel = acctChoice === o.key
            return (
              <button key={o.key} type="button" onClick={() => setAcctChoice(o.key)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '18px 12px', borderRadius: 9, cursor: 'pointer', fontFamily: F, fontSize: 14, fontWeight: sel ? 600 : 500, transition: '.18s',
                  background: sel ? o.color + '14' : FKC.inputBg, border: '1px solid ' + (sel ? o.color + '80' : 'rgba(255,255,255,.08)'),
                  color: sel ? o.color : FKC.tx3, boxShadow: sel ? 'none' : 'inset 0 1px 2px rgba(0,0,0,.2)' }}>
                {sel ? <CheckCircle2 size={22} strokeWidth={2} style={{ flexShrink: 0 }} /> : <Circle size={22} strokeWidth={2} style={{ flexShrink: 0, opacity: .5 }} />}
                <span>{o.label}</span>
              </button>
            )
          })}
        </div>
        <TextArea full rows={3} value={doneNote} onChange={setDoneNote}
          placeholder={acctChoice === 'no' ? T('سبب رفض المحاسب (مطلوب)…', 'Accountant rejection reason (required)…') : T('ملاحظة المحاسب (اختياري)…', 'Accountant note (optional)…')} />
      </div>
    </ModalSection>
  ) : (
    <ModalSection Icon={CheckCircle2} label={T('حالة المعاملة', 'Transaction Status')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 2px' }}>
        {/* خياران: «تم الإنجاز» (أخضر) أو «إلغاء» (أحمر) — يُحدّد ما يُكتب عند التأكيد. */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {[
            { key: 'done', color: C.ok, label: T('تم الإنجاز', 'Completed') },
            { key: 'cancel', color: C.red, label: T('ملغاة', 'Cancelled') },
          ].map(o => {
            const sel = doneChoice === o.key
            return (
              <button key={o.key} type="button" onClick={() => setDoneChoice(o.key)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '18px 12px', borderRadius: 9, cursor: 'pointer', fontFamily: F, fontSize: 14, fontWeight: sel ? 600 : 500, transition: '.18s',
                  background: sel ? o.color + '14' : FKC.inputBg,
                  border: '1px solid ' + (sel ? o.color + '80' : 'rgba(255,255,255,.08)'),
                  color: sel ? o.color : FKC.tx3,
                  boxShadow: sel ? 'none' : 'inset 0 1px 2px rgba(0,0,0,.2)' }}>
                {sel ? <CheckCircle2 size={22} strokeWidth={2} style={{ flexShrink: 0 }} /> : <Circle size={22} strokeWidth={2} style={{ flexShrink: 0, opacity: .5 }} />}
                <span>{o.label}</span>
              </button>
            )
          })}
        </div>
        {/* غلاف بارتفاع ثابت — تملأ منطقة النص ما تبقّى منه (grow) فلا يتغيّر ارتفاع النافذة
            ولا «يتمدّد/ينكمش» الحقل بحركة عند التبديل بين «تم الإنجاز» و«ملغاة». */}
        <div style={{ minHeight: 286, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* المستندات: عند «تم الإنجاز» يُطلب إرفاق ملف المستند (مطلوب) — يتمدّد ليملأ المساحة المتبقية. */}
          {isDocSvc && doneChoice === 'done' && (
            <FileField full grow req label={T('إرفاق المستند', 'Attach document')} value={doneFile} onChange={setDoneFile} />
          )}
          {/* مدخلات إنجاز الخدمات المُدارة بالسجل — مقادة من DONE_INPUTS. الحقول النصّية/التاريخية/القائمة في
              عمودين أعلى، ثم حقول الملفات أسفلها (آخرها يتمدّد ليملأ المساحة المتبقية فلا يبقى فراغ). */}
          {doneChoice === 'done' && doneInputs.length > 0 && (() => {
            const nonFiles = doneInputs.filter(f => f.type !== 'file')
            const fileFields = doneInputs.filter(f => f.type === 'file')
            return (<>
              {nonFiles.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {nonFiles.map(f => {
                    const lbl = T(f.inLabel_ar || f.label_ar, f.inLabel_en || f.label_en)
                    if (f.type === 'date') return <DateField key={f.key} full req={f.req} label={lbl} value={doneVals[f.key] || ''} onChange={v => setDoneVals(s => ({ ...s, [f.key]: v }))} lang={isAr ? 'ar' : 'en'} />
                    if (f.type === 'select') return <FKSelect key={f.key} full req={f.req} label={lbl} placeholder={T('اختر المهنة…', 'Select occupation…')} value={doneVals[f.key] || ''} onChange={v => setDoneVals(s => ({ ...s, [f.key]: v }))} options={occOptions} getKey={o => o.name_ar} getLabel={o => isAr ? o.name_ar : (o.name_en || o.name_ar)} getSub={o => o.name_en || ''} />
                    return <TextField key={f.key} full={f.full} req={f.req} label={lbl} value={doneVals[f.key] || ''} onChange={v => setDoneVals(s => ({ ...s, [f.key]: v }))} />
                  })}
                </div>
              )}
              {fileFields.map((f, i) => (
                <FileField key={f.key} full grow={!f.fixedHeight && i === fileFields.length - 1} req={f.req} label={T(f.inLabel_ar || f.label_ar, f.inLabel_en || f.label_en)} value={doneFiles[f.key] || null} onChange={v => setDoneFiles(s => ({ ...s, [f.key]: v }))} />
              ))}
            </>)
          })()}
          {/* النقل الخارجي عند «تم الإنجاز»: الرقم الموحد للشركة الناقلة (10، يبدأ 7) + اسم المدير — في عمودين. */}
          {isExtTransfer && doneChoice === 'done' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <TextField req label={T('الرقم الموحد للشركة الناقلة', 'Transferring company unified no')} value={extTarget700}
                onChange={v => { let raw = String(v).replace(/[^0-9]/g, '').slice(0, 10); if (raw && raw[0] !== '7') raw = '7' + raw.slice(1); setExtTarget700(raw) }}
                placeholder="7XXXXXXXXX" dir="ltr" />
              <TextField req label={T('اسم المدير', 'Manager name')} value={extManager} onChange={setExtManager} />
            </div>
          )}
          {/* الإلغاء فقط: «السبب» حقل إجباري بعنوان ظاهر يملأ المتبقّي (grow). الإنجاز بلا حقل ملاحظة. */}
          {doneChoice === 'cancel' && (
            <TextArea grow full req label={T('السبب', 'Reason')} value={doneNote} onChange={setDoneNote}
              placeholder={T('اكتب سبب الإلغاء…', 'Explain the cancellation reason…')} />
          )}
        </div>
      </div>
    </ModalSection>
  )

  // تعديل الراتب — نافذة «إرجاع الراتب» (المرحلة الثانية): الراتب الأساسي + صورة شاشة الراتب الأساسي.
  // الإطار وكرت الإرفاق يتمدّدان (flex/grow) ليملآ النافذة كاملةً بلا فراغ أسفلها.
  const salaryReturnConfirm = (
    <ModalSection flex Icon={RotateCcw} label={T('إرجاع الراتب للراتب الأساسي', 'Return salary to base')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 2px', flex: 1, minHeight: 0 }}>
        {SALARY_RETURN_INPUTS.map(f => {
          const lbl = T(f.inLabel_ar || f.label_ar, f.inLabel_en || f.label_en)
          if (f.type === 'file') return <FileField key={f.key} full grow req={f.req} label={lbl} value={salReturnFiles[f.key] || null} onChange={v => setSalReturnFiles(s => ({ ...s, [f.key]: v }))} />
          // الراتب الأساسي ثابت (400) — يُعرض للقراءة فقط بلا إمكانية تعديل.
          return (
            <div key={f.key} style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)', marginBottom: 9, textAlign: 'start', display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span>{lbl}{f.req && <span style={{ color: '#c0392b' }}> *</span>}</span>
              </div>
              <div style={{ display: 'flex', direction: 'ltr', alignItems: 'center', justifyContent: 'center', gap: 6, border: '1px solid transparent', borderRadius: 9, background: 'var(--inputBg)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', height: 42 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#2ecc71', flexShrink: 0 }}>{T('ريال', 'SAR')}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)' }}>{salReturnVals[f.key] || '400'}</span>
              </div>
            </div>
          )
        })}
      </div>
    </ModalSection>
  )

  // Each flow is a sequence of FormKit Modal pages. Page `valid` gates the
  // Next/Save button; the heavy DB writes still live in onSubmit, untouched.
  const payFormProps = {
    T, color: meta.color, remaining: instRemaining,
    paidAmount, setPaidAmount,
    paymentMethod, setPaymentMethod,
    transferReference: payTransferRef, setTransferReference: setPayTransferRef,
    transferReceipt: payTransferReceipt, setTransferReceipt: setPayTransferReceipt,
    selBankAccId: paySelBankAccId, setSelBankAccId: setPaySelBankAccId,
    bankAccounts: incomingBankAccounts,
    notes: paymentNotes, setNotes: setPaymentNotes,
    showIqamaPassport,
    iqamaBorderNumber, setIqamaBorderNumber, iqamaWorkerName, setIqamaWorkerName, iqamaBorderDup,
  }
  const refundFormProps = {
    T, color: meta.color, paid,
    refundAmount, setRefundAmount,
    refundMethod, setRefundMethod,
    transferReceipt: refundTransferReceipt, setTransferReceipt: setRefundTransferReceipt,
  }
  // استرجاع التأشيرة — القائمة، التأشيرة المختارة، وتقسيم الدفعات (إقامة/مشتركة) للتوزيع اليدوي.
  // استرجاع «تأشيرة» متاح للدائمة فقط، ويستبعد التأشيرات التي صدرت لها معاملة إقامة مستقلة
  // (لئلا يُيتّمها حذفُ صف التأشيرة) — كما في linkCandidates للدفع.
  const visaList = isPermanentVisa ? (visaDet || []).filter(v => !spawnedVisaIds.has(v.id)) : []
  const visaCount = visaList.length
  const selectedVisa = visaList.find(v => v.id === refundVisaId) || null
  const residenceInstsR = (insts || []).filter(it => isIqamaInst(it))
  const sharedInstsR = (insts || []).filter(it => !isIqamaInst(it))
  // دفعة الإقامة التي ستُحذف: غير مدفوعة إن أمكن، الأحدث ترتيبًا.
  const residenceToRemoveR = residenceInstsR.find(it => it.visa_application_id === refundVisaId)
    || residenceInstsR.filter(it => Number(it.paid_amount) <= 0.005).sort((a, b) => (b.installment_order || 0) - (a.installment_order || 0))[0]
    || residenceInstsR.slice().sort((a, b) => (b.installment_order || 0) - (a.installment_order || 0))[0] || null
  // قيمة التوزيع لكل دفعة مشتركة: الافتراضي = إجمالي الدفعة ÷ عدد التأشيرات (قابل للتعديل)، مقيّد [0..الإجمالي].
  const distSuggestR = it => Math.min(Number(it.total_amount) || 0, Math.round((Number(it.total_amount) / Math.max(1, visaCount)) * 100) / 100)
  const distValR = it => { const v = refundDist[it.id]; let n = v === undefined ? distSuggestR(it) : Number(v || 0); if (isNaN(n)) n = 0; return Math.max(0, Math.min(Number(it.total_amount) || 0, Math.round(n * 100) / 100)) }
  const distDisplayR = it => { const v = refundDist[it.id]; return v === undefined ? String(distSuggestR(it)) : v }
  const distRefundR = it => { const ded = distValR(it); const rem = (Number(it.total_amount) || 0) - (Number(it.paid_amount) || 0); return Math.max(0, Math.round((ded - rem) * 100) / 100) }
  const setDistFor = (id, v) => setRefundDist(prev => ({ ...prev, [id]: v }))
  const visaTotalDeductR = Math.round((sharedInstsR.reduce((s, it) => s + distValR(it), 0) + (residenceToRemoveR ? (Number(residenceToRemoveR.total_amount) || 0) : 0)) * 100) / 100
  const visaTotalRefundR = Math.round(Math.min(sharedInstsR.reduce((s, it) => s + distRefundR(it), 0) + (residenceToRemoveR ? (Number(residenceToRemoveR.paid_amount) || 0) : 0), Number(paid) || 0) * 100) / 100
  const visaNewTotalR = Math.max(0, Math.round(((Number(total) || 0) - visaTotalDeductR) * 100) / 100)
  const pages = type === 'payment'
    ? [
        { valid: true, content: invoiceInfo },
        // اختيار الدفعة — تظهر فقط حين تحتوي الفاتورة على أكثر من دفعة قابلة للسداد:
        // يجب تحديد الدفعة أولاً ثم إدخال المبلغ (يُسقَف بمتبقّي الدفعة المختارة).
        ...(needsInstPick ? [{
          title: T('اختيار الدفعة','Select Installment'),
          valid: !!selectedInstId,
          content: (
            <InstallmentPicker T={T} isAr={isAr} color={meta.color} insts={payableInsts} selectedId={selectedInstId} onSelect={setSelectedInstId} lockedIds={lockedInstIds} />
          ),
        }] : []),
        // رقم الحدود — تظهر فقط حين تكون الدفعة المختارة هي «إصدار الإقامة». التأشيرة معروفة سلفاً
        // (دفعة الإصدار تحملها أو لأنها الوحيدة) فنعرض بياناتها للقراءة بدل قائمة منسدلة؛ تتحول تلك
        // التأشيرة لمعاملة إقامة مستقلة. القائمة المنسدلة احتياط للحالة النادرة (تعدّد بلا جدول دفعات).
        // ملاحظة: التأشيرة المرتبطة بدفعة إصدار الإقامة تُحدَّد تلقائياً (linkVisaId عبر تأثير linkVisa)
        // فلا حاجة لخطوة عرض/اختيار يدوية — حفظ الدفعة ينشئ صف إصدار الإقامة من linkVisaId مباشرةً.
        // خطوة تفاصيل الدفع (المبلغ + الطريقة + الحساب + الإيصال للحوالة + صورة الجواز) ثم خطوة الملاحظة
        // المستقلّة — للحالتين. هكذا «إيصال الحوالة» في خطوة الدفع (الخطوة 3) والملاحظة في الأخيرة (الخطوة 4).
        ...(paymentMethod === 'bank'
          ? [
              { valid: Number(paidAmount) > 0 && payTransferReceipt.length > 0, content: (
                <PaymentDetailsForm part="details" {...payFormProps} />
              ) },
              { valid: (!showIqamaPassport || (!!iqamaWorkerName.trim() && iqamaBorderNumber.trim().length === 10 && !iqamaBorderDup)), content: (
                <PaymentDetailsForm part="note" {...payFormProps} />
              ) },
            ]
          : [
              { valid: Number(paidAmount) > 0, content: (
                <PaymentDetailsForm part="all" {...payFormProps} />
              ) },
              { valid: (!showIqamaPassport || (!!iqamaWorkerName.trim() && iqamaBorderNumber.trim().length === 10 && !iqamaBorderDup)), content: (
                <PaymentDetailsForm part="note" {...payFormProps} />
              ) },
            ]),
      ]
    : type === 'refund'
    ? [
        { valid: true, content: invoiceInfo },
        // لخدمات التأشيرة: خطوة اختيار نوع الاسترجاع (كلي/تأشيرة) + تحديد التأشيرة.
        ...(isPermanentVisa && visaCount >= 1 ? [{
          title: T('نوع الاسترجاع','Refund Type'),
          valid: refundScope === 'total' || !!refundVisaId,
          content: (
            <RefundScopeForm T={T} isAr={isAr} color={meta.color}
              scope={refundScope} setScope={setRefundScope}
              visaList={visaList} visaId={refundVisaId} setVisaId={setRefundVisaId} />
          ),
        }] : []),
        // «تأشيرة»: ثلاث خطوات مدمجة بلا تمرير — توزيع المبالغ، ثم الملخّص، ثم الطريقة والسبب.
        // «كلي»: مبلغ يدوي (مع الطريقة) ثم السبب — كما كان.
        ...((isWorkVisa && refundScope === 'visa')
          ? [
              { title: T('توزيع الاسترجاع','Distribute'),
                valid: visaTotalDeductR > 0,
                content: (
                  <VisaRefundDistForm part="amounts" T={T} isAr={isAr} color={meta.color} visa={selectedVisa}
                    sharedInsts={sharedInstsR} residenceInst={residenceToRemoveR} milestoneLabel={milestoneText}
                    distDisplay={distDisplayR} setDistFor={setDistFor}
                    totalDeduct={visaTotalDeductR} totalRefund={visaTotalRefundR} newTotal={visaNewTotalR} />
                ) },
              { title: T('ملخص الاسترجاع','Refund Summary'),
                valid: visaTotalDeductR > 0,
                content: (
                  <VisaRefundDistForm part="summary" T={T} isAr={isAr} color={meta.color} visa={selectedVisa}
                    sharedInsts={sharedInstsR} residenceInst={residenceToRemoveR} milestoneLabel={milestoneText}
                    distDisplay={distDisplayR} setDistFor={setDistFor}
                    totalDeduct={visaTotalDeductR} totalRefund={visaTotalRefundR} newTotal={visaNewTotalR} />
                ) },
              { title: T('الطريقة والسبب','Method & Reason'),
                valid: (refundNotes || '').trim().length > 0 && (refundMethod !== 'bank' || (refundTransferReceipt?.length || 0) > 0),
                content: (
                  <VisaRefundFinalForm T={T} color={meta.color}
                    refundMethod={refundMethod} setRefundMethod={setRefundMethod}
                    transferReceipt={refundTransferReceipt} setTransferReceipt={setRefundTransferReceipt}
                    notes={refundNotes} setNotes={setRefundNotes} />
                ) },
            ]
          : [
              { valid: Number(refundAmount) > 0 && (refundMethod !== 'bank' || (refundTransferReceipt?.length || 0) > 0),
                content: <RefundDetailsForm {...refundFormProps} /> },
              { valid: (refundNotes || '').trim().length > 0, content: (
                <RefundReasonForm T={T} notes={refundNotes} setNotes={setRefundNotes} />
              ) },
            ]),
      ]
    : type === 'cancel'
    ? [
        { valid: true, content: invoiceInfo },
        { valid: (cancelReason || '').trim().length > 0, content: (
          <CancelReasonForm
            T={T}
            reason={cancelReason} setReason={setCancelReason}
          />
        ) },
      ]
    : type === 'done'
    ? [
        { valid: isStagedDone ? (
              doneChoice === 'cancel' ? !!doneNote.trim()
              : doneChoice === 'skip' ? true
              : stage === 'transfer' ? true
              : stage === 'insurance' ? (!!insCompany.trim() && !!insPolicyNo.trim() && !!insExpiry && String(insAmount).trim() !== '' && !!insFile)
              : stage === 'workpermit' ? (!!wpDuration && !!wpExpiry && String(wpAmount).trim() !== '' && !!wpFile)
              : (muqViaContact !== null && !!renewIqamaExpiry && !!renewOccupationId && !!renewMuqeemFile))
            : acctPending ? (acctChoice === 'no' ? !!doneNote.trim() : true)
            : doneChoice === 'cancel' ? !!doneNote.trim()
            : (isExtTransfer && doneChoice === 'done') ? (/^7\d{9}$/.test(extTarget700) && !!extManager.trim())
            : (isDocSvc && doneChoice === 'done') ? !!doneFile
            : (doneInputs.length && doneChoice === 'done') ? doneInputs.every(f => !f.req ? true : (f.type === 'file' ? !!doneFiles[f.key] : !!String(doneVals[f.key] || '').trim()))
            : true, content: doneConfirm },
      ]
    : type === 'salary_return'
    ? [
        { valid: SALARY_RETURN_INPUTS.every(f => !f.req ? true : (f.type === 'file' ? !!salReturnFiles[f.key] : !!String(salReturnVals[f.key] || '').trim())),
          content: salaryReturnConfirm },
      ]
    : [
        { valid: true, content: printOptions },
      ]

  // Surface validation/failure messages in the footer of the page where Save lives
  // (the last step), combining with any live-validation error already on it.
  if (pages.length) {
    const lastIdx = pages.length - 1
    pages[lastIdx] = { ...pages[lastIdx], error: pages[lastIdx].error || actErr }
  }

  return (
    <Modal
      open onClose={onClose} success={successNode}
      title={meta.title} Icon={meta.Icon} accent={meta.color} width={540}
      height={isTransferDone && stage === 'transfer' ? 380 : (isRenewalDone && type === 'done' ? 570 : (type === 'done' ? 'auto' : undefined))}
      onSubmit={onSubmit} submitting={submitting} submitLabel={meta.submit}
      submitIcon={type === 'done' && !isStagedDone ? (doneChoice === 'cancel' ? Ban : CheckCircle2) : undefined}
      nextLabel={T('التالي','Next')} backLabel={T('السابق','Previous')}
      pages={pages}
    />
  )
}

/* ─── shared building blocks ─── */
const cardChrome = { background: 'var(--card-grad2)', border: '1px solid var(--bd)', borderRadius: 16, overflow: 'hidden' }
const cardHeader = { padding: '14px 22px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: 10 }
const cardTitle  = { fontSize: 16, fontWeight: 600, color: C.gold, letterSpacing: '.2px' }
const cardSub    = { fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }

const ActionToolbar = ({ T, onRecordPayment, onRefund, onCancelInv, onPrint }) => {
  const btn = (color, bgLight, bdLight) => ({
    height: 40, padding: '0 16px', borderRadius: 11, background: bgLight, border: '1px solid ' + bdLight, color, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: F, fontSize: 13, fontWeight: 700, transition: '.18s', boxShadow: 'var(--shadow-sm)'
  })
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <button onClick={onRecordPayment} style={btn(C.ok, 'rgba(46,204,113,.10)', 'rgba(46,204,113,.32)')}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
        <span>{T('تسجيل دفعة','Record Payment')}</span>
      </button>
      <button onClick={onRefund} style={btn(C.red, 'rgba(232,114,101,.10)', 'rgba(232,114,101,.30)')}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7"/></svg>
        <span>{T('استرجاع','Refund')}</span>
      </button>
      <button onClick={onCancelInv} style={btn(C.red, 'rgba(229,134,122,.10)', 'rgba(229,134,122,.30)')}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>
        <span>{T('إلغاء','Cancel')}</span>
      </button>
      <button onClick={onPrint} style={btn('rgba(255,255,255,.78)', 'rgba(255,255,255,.04)', 'rgba(255,255,255,.10)')}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        <span>{T('طباعة','Print')}</span>
      </button>
    </div>
  )
}

const ClientRows = ({ inv, T, user }) => {
  // When client_id is null but the request has a worker (workerIsClient at create time),
  // fall back to the worker as the displayed party.
  const sr = inv.service_request
  const pickWorker = (rel) => Array.isArray(rel) ? rel[0]?.worker : rel?.worker
  const workerFromApp = pickWorker(sr?.transfer_applications)
                     || pickWorker(sr?.ajeer_applications)
                     || pickWorker(sr?.iqama_renewal_applications)
                     || pickWorker(sr?.supplier_payroll_applications)
                     || pickWorker(sr?.other_applications)
                     || null
  const c = sr?.client || workerFromApp
  const isWorker = !sr?.client && !!workerFromApp
  const primary = c?.name_ar || c?.name_en
  const secondary = c?.name_ar && c?.name_en ? c.name_en : null
  const idValue = c?.id_number || c?.iqama_number
  const isLatinName = /[A-Za-z]/.test(primary || '')
  // Boxed cells — same inset style as the worker card in the transfer pricing page.
  const cells = [
    { label: isWorker ? T('الإقامة','Iqama') : T('الهوية','ID'), value: idValue, mono: true, vis: fieldVisible(user, 'invoices', 'client_id_number') },
    { label: T('الجوال','Phone'), value: fmtPhone(c?.phone), mono: true, vis: fieldVisible(user, 'invoices', 'client_phone') },
  ].filter(f => f.value && f.vis !== false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {primary && fieldVisible(user, 'invoices', 'client_name') && (
        <div style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {T('الاسم','Name')}
            {isWorker && (
              <span title={T('العامل هو العميل','Worker is the client')} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 4, background: 'rgba(212,160,23,.10)', border: '1px solid rgba(212,160,23,.32)', color: C.gold, fontSize: 9, fontWeight: 700 }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                {T('العامل هو العميل','worker = client')}
              </span>
            )}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, direction: 'ltr' }}>
            <CopyBtn text={primary} />
            <span style={{ fontSize: 14, color: 'var(--tx1)', fontWeight: 600, lineHeight: 1.4, direction: isLatinName ? 'ltr' : 'rtl' }}>{primary}</span>
          </span>
          {secondary && <div style={{ fontSize: 11, color: 'var(--tx4)', fontFamily: 'monospace', fontWeight: 500, direction: 'ltr', textAlign: 'right' }}>{secondary}</div>}
        </div>
      )}
      {cells.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, cells.length))},1fr)`, gap: 8 }}>
          {cells.map((f, i) => (
            <div key={i} style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{f.label}</span>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, direction: 'ltr' }}>
                <CopyBtn text={f.value} />
                <span style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 600, wordBreak: 'break-word', direction: f.mono ? 'ltr' : 'rtl', ...(f.mono ? { fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' } : {}) }}>{f.value}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Entity "hero" sub-card — gold-bordered card with an icon badge, the name in gold + an English
// subtitle, then the official numbers as inset cells. Shared shape between worker and facility so
// the invoice "العامل ومنشأته" card matches the transaction facility card design.
// onOpen — when provided, the whole card becomes a clickable link to the worker/facility
// detail page (copy buttons inside stopPropagation, so they never trigger navigation).
const EntityHero = ({ icon, primary, secondary, latin, cells, onOpen, openTitle }) => (
  <div
    role={onOpen ? 'button' : undefined} tabIndex={onOpen ? 0 : undefined} title={onOpen ? openTitle : undefined}
    onClick={onOpen || undefined}
    onKeyDown={onOpen ? (e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }) : undefined}
    onMouseEnter={onOpen ? (e => { const n = e.currentTarget.querySelector('[data-hero-name]'); if (n) n.style.textDecoration = 'underline' }) : undefined}
    onMouseLeave={onOpen ? (e => { const n = e.currentTarget.querySelector('[data-hero-name]'); if (n) n.style.textDecoration = 'none' }) : undefined}
    style={{ position: 'relative', border: '1px solid rgba(212,160,23,.4)', background: 'linear-gradient(135deg,rgba(212,160,23,.12),rgba(255,255,255,.02))', boxShadow: 'var(--shadow-md)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 14, cursor: onOpen ? 'pointer' : 'default' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(212,160,23,.1)', border: '1.5px solid rgba(212,160,23,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, direction: 'ltr' }}>
          <CopyBtn text={primary} />
          <span data-hero-name style={{ minWidth: 0, fontSize: 15.5, fontWeight: 600, color: C.gold, letterSpacing: '-.2px', direction: latin ? 'ltr' : 'rtl', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textUnderlineOffset: 3 }}>{primary}</span>
        </span>
        {secondary && <span style={{ fontSize: 11, color: 'var(--tx5)', fontWeight: 600, direction: 'ltr', textAlign: 'right', opacity: .7 }}>{secondary}</span>}
      </div>
    </div>
    {cells.length > 0 && (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, cells.length))},1fr)`, gap: 8 }}>
        {cells.map((c, i) => (
          <div key={i} style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{c.label}</span>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, direction: 'ltr' }}>
              <CopyBtn text={c.value} />
              <span style={{ minWidth: 0, fontSize: 13, color: c.value ? 'var(--tx2)' : 'var(--tx4)', fontWeight: 600, direction: c.value ? 'ltr' : 'rtl', fontFamily: c.value ? 'monospace' : undefined, fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.value || '—'}</span>
            </span>
          </div>
        ))}
      </div>
    )}
  </div>
)

// Worker + facility rows — worker and his facility each render as an EntityHero gold card
// (mirrors the transaction facility card): icon badge + name + the official numbers.
const WorkerRows = ({ worker, facility, T, user }) => {
  const w = worker
  if (!w) return null
  const wNameVis = fieldVisible(user, 'invoices', 'worker_name')
  const wPrimary = wNameVis ? (w.name_ar || w.name_en) : null
  const wSecondary = wNameVis && w.name_ar && w.name_en && w.name_en !== w.name_ar ? w.name_en : null
  const isLatinName = /[A-Za-z]/.test(wPrimary || '')
  const wCells = [
    { label: T('الإقامة','Iqama'), value: w.iqama_number, vis: fieldVisible(user, 'invoices', 'worker_iqama_number') },
    { label: T('الجوال','Phone'), value: fmtPhone(w.phone), vis: fieldVisible(user, 'invoices', 'worker_phone') },
  ].filter(f => f.value && f.vis !== false)
  const f = facility
  const fNameVis = fieldVisible(user, 'invoices', 'facility_name')
  const fPrimary = fNameVis ? (f?.name_ar || f?.name_en) : null
  const fSecondary = fNameVis && f?.name_ar && f?.name_en && f?.name_en !== f?.name_ar ? f.name_en : null
  // Facility numbers always render all three labels — empty ones show a "—" placeholder instead of hiding.
  const fCells = f ? [
    { label: T('الرقم الموحد','Unified No'), value: f.unified_number, vis: fieldVisible(user, 'invoices', 'facility_unified_number') },
    { label: T('رقم الموارد البشرية','HRSD No'), value: f.hrsd_number, vis: fieldVisible(user, 'invoices', 'facility_hrsd_number') },
    { label: T('رقم التأمينات','GOSI No'), value: f.gosi_number, vis: fieldVisible(user, 'invoices', 'facility_gosi_number') },
  ].filter(c => c.vis !== false) : []
  // Worker badge shows his nationality flag (falls back to a generic person icon when missing).
  const wNat = fieldVisible(user, 'invoices', 'worker_nationality') ? w.nationality : null
  const wIcon = wNat?.flag_url
    ? <img src={wNat.flag_url} alt={wNat.name_ar || ''} title={wNat.name_ar || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 11, flexShrink: 0 }} />
    : (flagEmoji(wNat?.code) ? <span title={wNat?.name_ar || ''} style={{ fontSize: 30, lineHeight: 1 }}>{flagEmoji(wNat?.code)}</span> : <User size={24} color={C.gold} strokeWidth={1.8} />)
  // Clicking a card opens that worker/facility's detail page (only when a real DB id exists —
  // the "worker is the client" case has no worker row, so it stays non-clickable).
  const openWorker = w.id ? () => { try { window.dispatchEvent(new CustomEvent('app-navigate-worker', { detail: { id: w.id } })) } catch {} } : undefined
  const openFacility = f?.id ? () => { try { window.dispatchEvent(new CustomEvent('app-navigate-facility', { detail: { id: f.id } })) } catch {} } : undefined
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <EntityHero icon={wIcon} primary={wPrimary} secondary={wSecondary} latin={isLatinName} cells={wCells} onOpen={openWorker} openTitle={T('فتح صفحة العامل','Open worker page')} />
      {f && (fPrimary || fCells.some(c => c.value)) && (
        <EntityHero icon={<Building2 size={24} color={C.gold} strokeWidth={1.8} />} primary={fPrimary} secondary={fSecondary} latin={false} cells={fCells} onOpen={openFacility} openTitle={T('فتح صفحة المنشأة','Open facility page')} />
      )}
    </div>
  )
}

// Broker/agent rows — mirrors ClientRows so the agent renders in its own card identical to the client card.
const BrokerRows = ({ agent, T, user }) => {
  const a = agent
  if (!a) return null
  const primary = a.name_ar || a.name_en
  const secondary = a.name_ar && a.name_en ? a.name_en : null
  const isLatinName = /[A-Za-z]/.test(primary || '')
  // Boxed cells — identical to the client card (name on top, then ID + phone in inset cells).
  const cells = [
    { label: T('الهوية','ID'), value: a.id_number, mono: true, vis: fieldVisible(user, 'invoices', 'agent_id_number') },
    { label: T('الجوال','Phone'), value: fmtPhone(a.phone), mono: true, vis: fieldVisible(user, 'invoices', 'agent_phone') },
  ].filter(f => f.value && f.vis !== false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {primary && fieldVisible(user, 'invoices', 'agent_name') && (
        <div style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{T('الاسم','Name')}</span>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, direction: 'ltr' }}>
            <CopyBtn text={primary} />
            <span style={{ fontSize: 14, color: 'var(--tx1)', fontWeight: 600, lineHeight: 1.4, direction: isLatinName ? 'ltr' : 'rtl' }}>{primary}</span>
          </span>
          {secondary && <div style={{ fontSize: 11, color: 'var(--tx4)', fontFamily: 'monospace', fontWeight: 500, direction: 'ltr', textAlign: 'right' }}>{secondary}</div>}
        </div>
      )}
      {cells.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, cells.length))},1fr)`, gap: 8 }}>
          {cells.map((f, i) => (
            <div key={i} style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{f.label}</span>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, direction: 'ltr' }}>
                <CopyBtn text={f.value} />
                <span style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 600, wordBreak: 'break-word', direction: f.mono ? 'ltr' : 'rtl', ...(f.mono ? { fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' } : {}) }}>{f.value}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Work-visa "بيانات المعاملة" card: service header, then every visa listed in full,
// grouped by file. The quantity reflects the real number of visa rows (not the stored
// service_request.quantity, which can be 1 even when the request bundles many visas).
const VisaInfoRows = ({ inv, isAr, T, svc, data, user }) => {
  const det = data?.det || []
  const qtyVis = fieldVisible(user, 'invoices', 'visa_quantity')
  const compVis = fieldVisible(user, 'invoices', 'visa_composition')
  const qty = det.length || Number(inv.service_request?.quantity || 0)
  const natOf = r => (isAr ? r.nationality?.name_ar : (r.nationality?.name_en || r.nationality?.name_ar)) || '—'
  const occOf = r => (isAr ? r.occupation?.name_ar : (r.occupation?.name_en || r.occupation?.name_ar)) || ''
  const embOf = r => (isAr ? r.embassy?.name_ar : (r.embassy?.name_en || r.embassy?.name_ar)) || ''
  const genOf = r => r.gender === 'female' ? T('أنثى', 'Female') : r.gender === 'male' ? T('ذكر', 'Male') : ''
  // اسم العامل ورقم الحدود المُسجَّلان عند دفعة «إصدار الإقامة» — يُعرضان في صف التأشيرة عند توفّرهما.
  const workerOf = r => r.worker_name || ''
  const borderOf = r => r.border_number || ''
  // تاريخ بصيغة رقمية «سنة-شهر-يوم» (يُعرض LTR فيكون اليوم على اليمين).
  const fmtIntlDate = d => { if (!d) return d; const x = new Date(d); if (isNaN(x.getTime())) return d; const p = n => String(n).padStart(2, '0'); return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}` }
  // كرت تأشيرة واحدة — تصميم «بلاطات إحصائية»: رأس (رقم + جنسية + بيانات + اسم العامل)،
  // ثم بلاطة صغيرة لكل رقم مهم (الحدود/الإقامة/الانتهاء)، ورابط ملف المقيم أسفلها. خلفية مستقلة لكل تأشيرة.
  const VisaCard = ({ r, n }) => {
    const sub = [embOf(r), occOf(r), genOf(r)].filter(Boolean).join(' · ')
    const name = workerOf(r), border = borderOf(r)
    const iq = data?.iqamaByVisa?.[r.id] || null
    const muq = data?.muqeemByVisa?.[r.id] || null
    const vf = data?.visaFileByVisa?.[r.id] || null
    const iqNum = iq?.iqama_number, iqExp = iq?.iqama_expiry
    const tiles = [
      r.unified_number && fieldVisible(user, 'invoices', 'visa_unified_number') && { label: T('الرقم الموحد', 'Unified no.'), value: r.unified_number },
      r.visa_number && fieldVisible(user, 'invoices', 'visa_number') && { label: T('رقم التأشيرة', 'Visa no.'), value: r.visa_number },
      border && fieldVisible(user, 'invoices', 'visa_border_number') && { label: T('رقم الحدود', 'Border'), value: border },
      iqNum && { label: T('رقم الإقامة', 'Iqama'), value: iqNum, span: 2 },
      iqExp && { label: T('انتهاء الإقامة', 'Iqama expiry'), value: fmtIntlDate(iqExp) },
    ].filter(Boolean)
    return (
      <div style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '11px 12px', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 9, marginBottom: tiles.length || muq || vf ? 10 : 0 }}>
          <span style={{ flexShrink: 0, alignSelf: 'stretch', width: 22, borderRadius: 6, background: svc.c + '1a', border: '1px solid ' + svc.c + '40', color: svc.c, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontVariantNumeric: 'tabular-nums' }}>{n}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 700 }}>{compVis ? natOf(r) : ''}</div>
            {compVis && sub && <div style={{ fontSize: 11.5, color: 'var(--tx3)', fontWeight: 600, marginTop: 2 }}>{sub}</div>}
          </div>
          {name && <span style={{ fontSize: 12.5, color: 'var(--tx2)', fontWeight: 700 }}>{name}</span>}
        </div>
        {tiles.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(tiles.length, 3)},1fr)`, gap: 8 }}>
            {tiles.map((t, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,.04)', borderRadius: 8, padding: '8px 10px', gridColumn: t.span ? `span ${t.span}` : 'auto' }}>
                <div style={{ fontSize: 9.5, color: 'var(--tx4)', marginBottom: 4 }}>{t.label}</div>
                {/* القيمة تبدأ من اليمين (ترتيب RTL) مع زر نسخ على اليسار */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--tx2)', direction: 'ltr', fontWeight: 600, fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.value}</span>
                  <CopyBtn text={String(t.value)} />
                </div>
              </div>
            ))}
          </div>
        )}
        {(vf || muq) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 10 }}>
            {vf && <a href={vf.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: C.gold, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              {T('ملف التأشيرة', 'Visa file')}
            </a>}
            {muq && <a href={muq.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: C.ok, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              {T('ملف مقيم', 'Muqeem file')}
            </a>}
          </div>
        )}
      </div>
    )
  }
  const single = det.length === 1 ? det[0] : null
  return (
    <>
      <div style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
        <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{T('الخدمة','Service')}</span>
        <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-start', gap: 6 }}>
          <span style={{ color: C.gold, fontWeight: 600, fontSize: 14 }}>{isAr ? (svc.label_ar_full || svc.label_ar) : (svc.label_en_full || svc.label_en)}</span>
          {qty > 0 && qtyVis && <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: C.gold, fontSize: 14 }}>{'×' + qty}</span>}
        </span>
      </div>
      {data?.loading && (
        <div style={{ fontSize: 11, color: 'var(--tx4)', textAlign: 'center', padding: '10px 0' }}>{T('جاري تحميل التفاصيل…','Loading details…')}</div>
      )}
      {!data?.loading && det.length > 0 && (
        <>
          <SectionLabel label={single ? (single.file_number != null ? T('بيانات التأشيرات وتوزيع الملفات','Visa Details & File Distribution') : T('بيانات التأشيرة','Visa Info')) : T('بيانات التأشيرات','Visa Details')} color={single?.file_number != null ? C.cyan : svc.c} />
          {single ? (
            <>
              {single.file_number != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 2px 8px' }}>
                  <span style={{ fontSize: 11.5, color: C.cyan, fontWeight: 700 }}>{T('ملف واحد','One File')}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, direction: isAr ? 'rtl' : 'ltr' }}>1 {T('تأشيرة','visa')}</span>
                </div>
              )}
              <VisaCard r={single} n={1} />
            </>
          ) : (() => {
            const withFile = det.filter(r => r && r.file_number != null)
            const showFiles = withFile.length > 0
            const list = showFiles ? withFile : det
            const byFile = {}
            list.forEach(r => { const fn = r.file_number != null ? r.file_number : 0; (byFile[fn] = byFile[fn] || []).push(r) })
            const fileNos = Object.keys(byFile).map(Number).sort((a, b) => a - b)
            const arOrd = ['الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر']
            const enOrd = ['First','Second','Third','Fourth','Fifth','Sixth','Seventh','Eighth','Ninth','Tenth']
            const fileLabel = idx => fileNos.length === 1
              ? T('ملف واحد', 'One File')
              : T(`الملف ${arOrd[idx] || idx + 1}`, `${enOrd[idx] || 'File ' + (idx + 1)} File`)
            let n = 0
            return fileNos.map((fn, idx) => {
              const items = byFile[fn]
              return (
                <div key={fn} style={{ marginTop: idx === 0 ? 0 : 6 }}>
                  {showFiles && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 2px 8px' }}>
                      <span style={{ fontSize: 11.5, color: C.cyan, fontWeight: 700 }}>{fileLabel(idx)}</span>
                      <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, direction: isAr ? 'rtl' : 'ltr' }}>{items.length} {visaWord(items.length, T)}</span>
                    </div>
                  )}
                  {items.map((r, i) => { n++; return <VisaCard key={i} r={r} n={n} /> })}
                </div>
              )
            })
          })()}
        </>
      )}
    </>
  )
}

// Derives which milestones of a work-visa transaction have been reached.
const deriveVisaMeta = (data) => {
  const d = data?.det?.[0]
  const f = d?.main_facility
  const w = d?.worker
  const hasFacility = !!(f && (f.name_ar || f.unified_number || f.gosi_number || f.qiwa_prefix || f.qiwa_number))
  const hasVisa = !!(d && (d.visa_number || d.border_number || d.visa_cost))
  const hasWakalah = !!(d && (d.wakalah_number || d.wakalah_date || d.wakalah_office || d.wakalah_status))
  const hasIqama = !!(w && (w.name_ar || w.name_en || w.iqama_number || w.iqama_expiry_date))
  return { d, f, w, hasFacility, hasVisa, hasWakalah, hasIqama }
}

// Furthest milestone reached → the status shown on the "بيانات المعاملة" header.
const visaStatusBadge = (data, T) => {
  const { hasFacility, hasVisa, hasWakalah, hasIqama } = deriveVisaMeta(data)
  if (hasIqama) return { label: T('تم إصدار الإقامة','Iqama issued'), color: C.ok }
  if (hasWakalah) return { label: T('تم إصدار الوكالة','PoA issued'), color: C.purple }
  if (hasVisa) return { label: T('تم إصدار التأشيرة','Visa issued'), color: C.gold }
  if (hasFacility) return { label: T('تم تعيين المنشأة','Facility assigned'), color: C.blue }
  return { label: T('جديد','New'), color: C.gray }
}

// صف صورة جواز العامل — مصغّر (إن كان صورة) + رابط فتح، مع رقم الحدود للتعرّف على التأشيرة.
// يظهر ضمن «إصدار الإقامة» ببطاقة المعاملة.
const PassportRow = ({ T, att, borderNo }) => {
  const url = att?.file_url
  if (!url) return null
  const isImg = /\.(png|jpe?g|gif|webp|bmp)$/i.test(att.file_name || url)
  return (
    <div style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
      <span style={{ flex: 1, fontSize: 11.5, color: 'var(--tx3)', fontWeight: 700 }}>
        {T('صورة جواز العامل', 'Worker Passport')}
        {borderNo ? <span style={{ color: 'var(--tx4)', fontWeight: 600 }}> · {T('رقم الحدود', 'Border')} <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{borderNo}</span></span> : ''}
      </span>
      {isImg && <a href={url} target="_blank" rel="noreferrer" style={{ flexShrink: 0, lineHeight: 0 }}><img src={url} alt="" style={{ width: 42, height: 30, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--bd)' }} /></a>}
      <a href={url} target="_blank" rel="noreferrer" style={{ flexShrink: 0, fontSize: 11.5, color: C.gold, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
        {T('فتح', 'Open')}
      </a>
    </div>
  )
}

// Work-visa "بيانات المعاملة" card: facility, visa issuance, authorization, and iqama issuance info.
const VisaExecutionRows = ({ inv, isAr, T, data }) => {
  const date = (v) => v ? fmtGreg(v, isAr) : null
  const lbl = (o) => o ? (isAr ? o.value_ar || o.name_ar : (o.value_en || o.value_ar || o.name_en || o.name_ar)) : null
  if (data?.loading) return <div style={{ fontSize: 11, color: 'var(--tx4)', textAlign: 'center', padding: '10px 0' }}>{T('جاري تحميل التفاصيل…','Loading details…')}</div>
  const { d, f, w, hasFacility, hasVisa, hasWakalah, hasIqama } = deriveVisaMeta(data)
  if (!d) return null
  const emptyNote = (ar, en) => <div style={{ fontSize: 11.5, color: 'var(--tx4)', textAlign: 'center', padding: '12px 0', fontWeight: 600 }}>{T(ar, en)}</div>
  return (
    <>
      <SectionLabel label={T('المنشأة','Facility')} color={C.blue} />
      {hasFacility ? (
        <>
          <Row label={T('المنشأة','Facility')} value={f?.name_ar || f?.unified_number} />
          <Row label={T('الرقم الموحد','Unified Number')} value={f?.unified_number} mono />
          <Row label={T('رقم التأمينات','GOSI No')} value={f?.gosi_number} mono />
          <Row label={T('رقم قوى','Qiwa No')} value={[f?.qiwa_prefix, f?.qiwa_number].filter(Boolean).join('-') || null} mono />
        </>
      ) : emptyNote('لم يتم تحديد المنشأة بعد','No facility assigned yet')}

      <SectionLabel label={T('إصدار التأشيرة','Visa Issuance')} color={C.gold} />
      {hasVisa ? (
        <>
          <Row label={T('رقم التأشيرة','Visa No')} value={d.visa_number} mono />
          <BorderRow T={T} borderNo={d.border_number} visaUsed={d.visa_used} visaNo={d.visa_number} />
          {d.visa_cost && <Row label={T('قيمة التأشيرة','Visa Cost')} value={num(d.visa_cost) + ' ' + T('ر.س','SAR')} mono color={C.gold} />}
        </>
      ) : emptyNote('لم يتم إصدار التأشيرة بعد','Visa not issued yet')}

      <SectionLabel label={T('توكيل التأشيرة','Visa Authorization')} color={C.purple} />
      {hasWakalah ? (
        <>
          {d.wakalah_date && <Row label={T('تاريخ الوكالة','Wakalah Date')} value={date(d.wakalah_date)} mono />}
          {d.wakalah_number && <Row label={T('رقم الوكالة','Wakalah No')} value={d.wakalah_number} mono />}
          {d.wakalah_office && <Row label={T('مكتب الوكالة','Wakalah Office')} value={d.wakalah_office} />}
          {d.wakalah_status && <Row label={T('حالة الوكالة','Wakalah Status')} value={lbl(d.wakalah_status)} />}
        </>
      ) : emptyNote('لم يتم توكيل التأشيرة بعد','Visa not authorized yet')}

      <SectionLabel label={T('إصدار الإقامة','Iqama Issuance')} color={C.ok} />
      {(() => {
        // صور جوازات العمال تُرفع عند سداد دفعات الإقامة (واحدة لكل تأشيرة) — تظهر كلها هنا، كلٌّ برقم حدودها،
        // حتى قبل إصدار الإقامة الفعلي. (بطاقة المعاملة ملخّصة على التأشيرة الأولى لبقية الحقول.)
        const passports = (data?.det || [])
          .map(v => ({ borderNo: v.border_number, att: data?.passports?.[v.id]?.[0] || null }))
          .filter(x => x.att)
        return (
          <>
            {hasIqama ? (
              <>
                <Row label={T('اسم العامل','Worker Name')} value={w?.name_ar || w?.name_en} />
                <Row label={T('رقم الإقامة','Iqama No')} value={w?.iqama_number} mono copy />
                <Row label={T('تاريخ انتهاء الإقامة','Iqama Expiry')} value={date(w?.iqama_expiry_date)} mono />
              </>
            ) : (!passports.length && emptyNote('لم يتم إصدار الإقامة بعد','Iqama not issued yet'))}
            {passports.map((p, i) => <PassportRow key={i} T={T} att={p.att} borderNo={p.borderNo} />)}
          </>
        )
      })()}
    </>
  )
}

const TransactionRows = ({ inv, isAr, T, svc, payT, data, user }) => {
  const code = data?.code || inv.service_type?.code
  const d = data?.det?.[0]
  const descVis = fieldVisible(user, 'invoices', 'service_description')
  const chamberTextVis = fieldVisible(user, 'invoices', 'service_chamber_text')
  const date = (v) => v ? fmtGreg(v, isAr) : null
  const isTransfer = code === 'transfer'
  const svcName = isAr ? (svc.label_ar_full || svc.label_ar) : (svc.label_en_full || svc.label_en)
  // اسم العامل — يُعرض تحت اسم الخدمة داخل بطاقة الخدمة.
  // نقل الكفالة: الاسم من حسبة التنازل المرتبطة (tc.worker_name) وليس العميل.
  // بقية الخدمات: من سجل العامل المرتبط بالطلب، ثم العميل كحلٍّ أخير.
  const _sr = inv.service_request
  const _pickWorker = rel => Array.isArray(rel) ? rel[0]?.worker : rel?.worker
  const _w = _pickWorker(_sr?.transfer_applications) || _pickWorker(_sr?.ajeer_applications)
    || _pickWorker(_sr?.iqama_renewal_applications) || _pickWorker(_sr?.supplier_payroll_applications)
    || _pickWorker(_sr?.other_applications) || d?.worker || null
  const _wObjName = _w ? (isAr ? (_w.name_ar || _w.name_en) : (_w.name_en || _w.name_ar)) : null
  const workerName = (isTransfer ? (data?.tc?.worker_name || null) : null)
    || _wObjName
    || (_sr?.client ? (isAr ? (_sr.client.name_ar || _sr.client.name_en) : (_sr.client.name_en || _sr.client.name_ar)) : null)
  // رقم إقامة العامل — نقل الكفالة من الحسبة، وإلا من سجل العامل، ثم هوية العميل كحلٍّ أخير.
  const workerIqama = (isTransfer ? (data?.tc?.iqama_number || null) : null) || _w?.iqama_number || _sr?.client?.id_number || null
  // خروج وعودة: نوع العملية (إصدار/تمديد) لا يُحفظ في details، فنستنتجه من عنوان بند التسعيرة («تمديد خروج وعودة …»).
  const erOpLabel = code === 'exit_reentry_visa'
    ? ((Array.isArray(inv?.pricing_breakdown) && inv.pricing_breakdown.some(l => String(l?.label || '').includes('تمديد'))) ? T('تمديد', 'Extension') : T('إصدار', 'Issuance'))
    : null

  // Service-specific extras (dates/durations only) — worker + facility now live in the
  // dedicated "العامل ومنشأته" card, so they're not repeated here.
  const extraCells = []
  // حقول تُدمج داخل كرت اسم الخدمة (مثل التأمين الطبي/رواتب سبلاير) بدل كروت مستقلة.
  const splCells = []
  // نقل الكفالة: بيانات الإقامة من حسبة التنازل المرتبطة (تاريخ الانتهاء · مدة التجديد · الانتهاء المتوقع).
  if (isTransfer && data?.tc) {
    const tc = data.tc
    // تُدمج داخل كرت اسم الخدمة (مثل عقد أجير) بدل كروت مستقلة.
    if (workerIqama && workerIqama !== '—') splCells.push({ label: T('رقم الإقامة','Iqama No'), value: workerIqama, mono: true })
    if (tc.iqama_expiry_gregorian) splCells.push({ label: T('تاريخ انتهاء الإقامة','Iqama Expiry'), value: date(tc.iqama_expiry_gregorian), mono: true })
    // «نقل فقط»: العلَم transfer_only/renew_iqama يحسم القيمة حتى لو بقيت أشهر تجديد قديمة في renewal_months (نفس منطق كرت الحسبة في App.jsx).
    const transferOnly = tc.transfer_only === true || tc.renew_iqama === false
    if (transferOnly) { splCells.push({ label: T('مدة التجديد','Renewal Duration'), value: T('نقل فقط','Transfer Only'), gold: true }) }
    else if (Number(tc.renewal_months) > 0) { const n = Number(tc.renewal_months); splCells.push({ label: T('مدة التجديد','Renewal Duration'), value: n + ' ' + (n >= 3 && n <= 10 ? T('أشهر','months') : T('شهر','month')), gold: true }) }
    if (tc.expected_expiry_date) splCells.push({ label: T('تاريخ انتهاء الإقامة المتوقع','Expected Iqama Expiry'), value: date(tc.expected_expiry_date), mono: true })
  }
  if (!isTransfer && d && code === 'ajeer') {
    // عقد أجير في other_applications.details: الرقم الموحد للمنشأة المستعارة + المدينة + مدة العقد.
    // تُدمج داخل كرت اسم الخدمة (مثل التأمين الطبي). رقم العقد ومرفق التصريح يُدخَلان في «حالة المعاملة».
    const dt = d.details || {}
    // نفس ترتيب كرت الخدمة في صفحة المعاملة (يمين→يسار: الرقم الموحد · مدة العقد · المدينة).
    if (dt.borrower_700) splCells.push({ label: T('الرقم الموحد للمنشأة المستعارة','Borrower Unified No'), value: dt.borrower_700 })
    if (dt.contract_months) splCells.push({ label: T('مدة العقد','Duration'), value: dt.contract_months + ' ' + T('شهر','months') })
    if (dt.city_name) splCells.push({ label: T('المدينة','City'), value: dt.city_name })
  }
  if (!isTransfer && d && code === 'iqama_renewal') {
    if (d.duration_months) extraCells.push({ label: T('مدة التجديد','Renewal Duration'), value: d.duration_months + ' ' + T('شهر','months') })
    if (d.current_expire_date) extraCells.push({ label: T('الانتهاء الحالي','Current Expiry'), value: date(d.current_expire_date), mono: true })
    if (d.new_expire_date) extraCells.push({ label: T('الانتهاء الجديد','New Expiry'), value: date(d.new_expire_date), mono: true })
    // إعفاء رخصة العمل + المهنة الحالية/الجديدة عند تغيير المهنة — من حسبة التجديد المرتبطة.
    const rtc = data?.tc
    if (rtc) {
      const isExempt = rtc.exemption !== false
      extraCells.push({ label: T('هل يوجد إعفاء؟','Exemption?'), value: isExempt ? T('نعم','Yes') : T('لا','No'), color: isExempt ? '#27a046' : C.red })
      if (rtc.change_profession) {
        if (rtc.occupation_name_ar) extraCells.push({ label: T('المهنة الحالية','Current Occupation'), value: rtc.occupation_name_ar })
        if (rtc.new_occupation_name_ar) extraCells.push({ label: T('المهنة الجديدة','New Occupation'), value: rtc.new_occupation_name_ar, gold: true })
      }
    }
  }
  // رواتب سبلاير: حقول الطلب الخاصة (عدد أشهر الرواتب غير المدفوعة + إجمالي الرواتب) من جدولها المخصّص
  // supplier_payroll_applications — تُحمَّل في data.det عبر TABLES/SELECTS، لا من details JSONB.
  // تُعرض مدمجة داخل كرت اسم الخدمة (splCells) بدل كروت مستقلة.
  if (!isTransfer && d && code === 'supplier_payroll') {
    if (d.unpaid_salaries_count != null && d.unpaid_salaries_count !== '') {
      const n = Number(d.unpaid_salaries_count)
      splCells.push({ label: T('أشهر الرواتب غير المدفوعة','Unpaid salary months'), value: n + ' ' + (n >= 3 && n <= 10 ? T('أشهر','months') : T('شهر','month')) })
    }
    if (d.total_amount != null && Number(d.total_amount) > 0) {
      splCells.push({ label: T('إجمالي الرواتب','Total Salaries'), value: num(d.total_amount) + ' ' + T('ريال','SAR') })
    }
  }
  // الموافقة للنقل الخارجي: حقل «السبب» يُدمج داخل كرت اسم الخدمة (مثل رواتب سبلاير) بدل كرت مستقل.
  if (!isTransfer && d && code === 'external_transfer_approval' && d.details?.reason) {
    splCells.push({ label: T('السبب','Reason'), value: d.details.reason })
  }
  // الغرفة التجارية: نوع التصديق يُدمج داخل كرت اسم الخدمة (مثل التأمين الطبي). نص الطلب يبقى سطراً فرعياً أدناه.
  if (!isTransfer && d && code === 'other' && d.details?.chamber_subtype) {
    const cs = d.details.chamber_subtype
    splCells.push({ label: T('نوع التصديق','Type'), value: cs === 'printed' ? T('تصديق مطبوعات','Printed certification') : cs === 'open_request' ? T('طلب مفتوح','Open request') : cs })
  }
  // التأمين الطبي/طباعة الإقامة: تاريخ ميلاد العامل وعمره (من سجل العامل) — مدمجان داخل كرت اسم الخدمة (مثل رواتب سبلاير).
  if (!isTransfer && ['medical_insurance', 'iqama_print'].includes(code) && _w?.birth_date) {
    splCells.push({ label: T('تاريخ الميلاد','Birth Date'), value: date(_w.birth_date) })
    const bd = new Date(_w.birth_date)
    if (!isNaN(bd)) {
      const age = Math.floor((Date.now() - bd) / 31557600000)
      splCells.push({ label: T('العمر','Age'), value: age + ' ' + T('سنة','yrs') })
    }
  }

  // ── Registry-driven services (passport_update · final_exit_visa · exit_reentry_visa · تعديل الراتب ·
  // profession_change · medical_insurance …) — render their service-specific fields from
  // other_applications.details using the same `detail` config that drives صفحة المعاملة.
  // Only the `d:`-sourced fields are shown here (العامل/المنشأة already live in their own card),
  // and services with bespoke rendering above (ajeer · الغرفة «other» · iqama_print) are skipped.
  if (!isTransfer && d && !['ajeer', 'other', 'iqama_print', 'iqama_renewal', 'external_transfer_approval'].includes(code)) {
    const reg = TXN_SERVICES[code]
    if (reg?.detail) {
      const dt = d.details || {}
      // مستندات / تغيير المهنة / تعديل الراتب / خروج نهائي / خروج وعودة: حقول الطلب تُدمج داخل كرت اسم الخدمة (مثل رواتب سبلاير) بدل كروت مستقلة.
      const target = (code === 'documents' || code === 'profession_change' || code === 'name_translation' || code === 'final_exit_visa' || code === 'exit_reentry_visa') ? splCells : extraCells
      for (const f of reg.detail) {
        if (!f.src || !f.src.startsWith('d:')) continue
        let v = dt[f.src.slice(2)]
        if (v == null || v === '') continue
        if (f.opts) v = f.opts[v] || v
        if (f.date) v = date(v)
        else if (f.months && !isNaN(Number(v))) { const n = Number(v); v = n + ' ' + (n >= 3 && n <= 10 ? T('أشهر','months') : T('شهر','month')) }
        else if (f.money && !isNaN(Number(v))) v = num(v) + ' ' + T('ريال','SAR')
        else if (f.suffix) v = String(v) + f.suffix
        target.push({ label: T(f.l_ar, f.l_en), value: v, mono: !!f.mono, gold: !!f.money })
      }
    }
  }

  // خروج وعودة (تمديد): أضف رقم التأشيرة بعد المدة — يظهر فقط عند التمديد ووجود رقم محفوظ في details.
  if (code === 'exit_reentry_visa') {
    const dt = d?.details || {}
    const isExtend = dt.op_mode === 'extend' || (Array.isArray(inv?.pricing_breakdown) && inv.pricing_breakdown.some(l => String(l?.label || '').includes('تمديد')))
    if (isExtend && dt.visa_number) extraCells.push({ label: T('رقم التأشيرة', 'Visa No'), value: String(dt.visa_number), mono: true })
  }

  const boxStyle = { background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Boxed service name, with the typed description shown as a sub-line
          below so the service detail isn't lost. */}
      <div style={boxStyle}>
        <span style={{ fontSize: 14, color: C.gold, fontWeight: 600, lineHeight: 1.4 }}>{svcName}</span>
        {workerName && !isZeroSvc(code) && !SELF_PARTY_DONE_SVCS.includes(code) && (
          <span style={{ fontSize: 13, color: 'var(--tx)', fontWeight: 700, lineHeight: 1.5, direction: 'rtl', marginTop: 4 }}>{workerName}</span>
        )}
        {/* نوع التصديق ونص الطلب صارا يُعرضان أسفل (بعد splCells) — مثل التأمين الطبي */}
        {/* طباعة الإقامة: سبب الطلب المُدخل في النموذج */}
        {code === 'iqama_print' && d?.details?.print_reason && (
          <span style={{ fontSize: 12.5, color: 'var(--tx)', fontWeight: 600, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', direction: 'rtl', marginTop: 4 }}>
            <span style={{ color: 'var(--tx4)', fontWeight: 600 }}>{T('السبب','Reason')}: </span>{d.details.print_reason}
          </span>
        )}
        {code === 'exit_reentry_visa' ? (
          <span style={{ fontSize: 12.5, color: 'var(--tx)', fontWeight: 600, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', direction: 'rtl', marginTop: 4 }}>{erOpLabel}</span>
        ) : descVis && d?.description && d.description !== svcName && (
          <span style={{ fontSize: 12.5, color: 'var(--tx)', fontWeight: 600, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', direction: 'rtl', marginTop: 4 }}>{d.description}</span>
        )}
        {/* رواتب سبلاير: حقول الطلب (الأشهر + الإجمالي) مدمجة داخل كرت اسم الخدمة بفاصل علوي. */}
        {splCells.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(2, splCells.length)},1fr)`, gap: 14, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--bd)' }}>
            {splCells.map((c, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{c.label}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, direction: c.mono ? 'ltr' : 'rtl', ...(c.mono ? { justifyContent: 'flex-end' } : {}) }}>
                  {c.mono && <CopyBtn text={c.value} />}
                  <span style={{ fontSize: 13, color: c.color || (c.gold ? C.gold : 'var(--tx2)'), fontWeight: (c.gold || c.color) ? 700 : 600, direction: c.mono ? 'ltr' : 'rtl', whiteSpace: 'pre-wrap', wordBreak: 'break-word', ...(c.mono ? { fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' } : {}) }}>{c.value}</span>
                </span>
              </div>
            ))}
          </div>
        )}
        {/* الغرفة التجارية: نص الطلب يُعرض أسفل «نوع التصديق» */}
        {code === 'other' && chamberTextVis && d?.details?.chamber_text && (
          <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', direction: 'rtl', marginTop: 6 }}>{d.details.chamber_text}</span>
        )}
        {/* ملف المطبوعات المرفق — رابط نصّي بسيط، أسفل «نوع التصديق» */}
        {d?.details?.chamber_file?.url && (
          <a href={d.details.chamber_file.url} target="_blank" rel="noopener noreferrer"
            style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', color: C.gold, fontSize: 12.5, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, direction: 'rtl' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            <span>{T('عرض ملف المطبوعات المرفق','View attached printout')}</span>
          </a>
        )}
      </div>

      {!isTransfer && data?.loading && (
        <div style={{ fontSize: 11, color: 'var(--tx4)', textAlign: 'center', padding: '6px 0' }}>{T('جاري تحميل التفاصيل…','Loading details…')}</div>
      )}

      {/* Service-specific cells — boxed, same inset style as the client card cells */}
      {extraCells.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(3, extraCells.length)},1fr)`, gap: 8 }}>
          {extraCells.map((c, i) => (
            <div key={i} style={boxStyle}>
              <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{c.label}</span>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, direction: 'ltr' }}>
                {c.mono && <CopyBtn text={c.value} />}
                <span style={{ fontSize: 13, color: c.color || (c.gold ? C.gold : 'var(--tx2)'), fontWeight: c.gold || c.color ? 700 : 600, wordBreak: 'break-word', direction: c.mono ? 'ltr' : 'rtl', ...(c.mono ? { fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' } : {}) }}>{c.value}</span>
              </span>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

// ───────────────────── الملخص المالي — تصميم الهيرو ─────────────────────
// رأس متدرّج ذهبي يبرز إجمالي الفاتورة، تحته بطاقتا المسدّد/المتبقي، شريط نسبة السداد،
// ثم فوتر يجمع منشئ الفاتورة + عدد الدفعات + عدد المدفوعات.
const SAR = (T) => T('ريال', 'SAR')
const remColor = (r) => r > 0 ? C.red : r < 0 ? C.ok : 'var(--tx)'

const FinPill = ({ color, label, value, unit }) => {
  // بطاقة داكنة مع شريط لون عمودي على جهة البداية والرقم ملوّن
  return (
    <div style={{ position: 'relative', padding: '12px 14px', borderRadius: 12, background: 'var(--inputBg)', border: '1px solid var(--bd)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, insetInlineStart: 0, width: 4, background: color }} />
      <div style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600, marginBottom: 5 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, direction: 'ltr', justifyContent: 'flex-start' }}>
        {unit && <span style={{ fontSize: 11, fontWeight: 700, color, opacity: .72 }}>{unit}</span>}
        <span style={{ fontSize: 19, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.5px' }}>{value}</span>
      </div>
    </div>
  )
}
const FinMetaRow = ({ label, value, valueColor = 'var(--tx2)', ltr = false }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, gap: 10 }}>
    <span style={{ color: 'var(--tx4)' }}>{label}</span>
    <span style={{ color: valueColor, fontWeight: 700, ...(ltr ? { direction: 'ltr', fontVariantNumeric: 'tabular-nums' } : {}) }}>{value}</span>
  </div>
)

const FinancialSummaryCard = ({ inv, data, isAr, T, total, paid, remaining, pct, payT, stageStatus, user }) => {
  const person = inv.creator?.person
  const full = (isAr ? (person?.name_ar || person?.name_en) : (person?.name_en || person?.name_ar)) || ''
  const twoNames = full.trim().split(/\s+/).filter(Boolean).slice(0, 2).join(' ')
  const nInst = data.insts?.length || 0
  const nPays = data.pays?.length || 0
  const visTotal = fieldVisible(user, 'invoices', 'fin_total')
  const visPaid = fieldVisible(user, 'invoices', 'fin_paid')
  const visRemaining = fieldVisible(user, 'invoices', 'fin_remaining')
  const visRatio = fieldVisible(user, 'invoices', 'fin_pay_ratio')
  const visInstCount = fieldVisible(user, 'invoices', 'fin_installments_count')
  const visPayCount = fieldVisible(user, 'invoices', 'fin_payments_count')
  const visDuration = fieldVisible(user, 'invoices', 'fin_expected_duration')
  const visExpiry = fieldVisible(user, 'invoices', 'fin_expected_expiry')
  const visQuote = fieldVisible(user, 'invoices', 'fin_quote_ref')
  const visOfficeFee = fieldVisible(user, 'invoices', 'fin_office_fee_net')
  const visGovFees = fieldVisible(user, 'invoices', 'fin_government_fees')
  return (
    <div style={cardChrome}>
      {/* رأس متدرّج ذهبي — العنوان + إجمالي الفاتورة */}
      <div style={{ position: 'relative', padding: '16px 22px 20px', background: `linear-gradient(135deg, ${C.gold} 0%, #b8860b 100%)`, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -34, insetInlineEnd: -18, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,.10)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#000' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#000', letterSpacing: '.2px' }}>{T('المبلغ الإجمالي', 'Total Amount')}</span>
          {twoNames && (
            <span style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 999, background: 'rgba(0,0,0,.14)', color: '#000', fontSize: 9.5, fontWeight: 600 }}>
              {twoNames}
            </span>
          )}
        </div>
        {visTotal && (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 6, marginTop: 2 }}>
          <span style={{ fontSize: 32, fontWeight: 900, color: '#000', direction: 'ltr', fontVariantNumeric: 'tabular-nums', letterSpacing: '-1px' }}>{num(total)}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#000' }}>{SAR(T)}</span>
        </div>
        )}
      </div>
      {/* بطاقتا المسدّد والمتبقي */}
      {(visPaid || visRemaining) && (
      <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: (visPaid && visRemaining) ? '1fr 1fr' : '1fr', gap: 10 }}>
        {visPaid && <FinPill color={C.ok} label={T('المدفوع', 'Paid')} value={num(paid)} unit={SAR(T)} />}
        {visRemaining && <FinPill color={remColor(remaining)} label={T('المتبقي', 'Remaining')} value={num(remaining)} unit={SAR(T)} />}
      </div>
      )}
      {/* نسبة السداد */}
      {visRatio && (
      <div style={{ padding: '0 18px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, color: 'var(--tx3)' }}>
          <span>{T('نسبة السداد', 'Paid')}</span>
          <span style={{ color: payT.c, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,.04)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${payT.c}, ${payT.c}dd)`, transition: 'width .3s' }} />
        </div>
      </div>
      )}
      {/* فوتر: عدّادات الدفعات والمدفوعات */}
      <div style={{ padding: '14px 22px', borderTop: '1px solid var(--bd)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visInstCount && <FinMetaRow label={T('عدد الدفعات', 'Installments')} value={nInst} ltr />}
        {visPayCount && <FinMetaRow label={T('عدد المدفوعات', 'Payments')} value={nPays} ltr />}
        {/* رقم الحسبة — فوق المدة المتوقعة مباشرةً. */}
        {data.quote && visQuote && (() => { const isRenewal = data.code === 'iqama_renewal'; const ev = isRenewal ? 'app-navigate-renewal-calc' : 'app-navigate-transfer-calc'; return <FinMetaRow label={T('رقم الحسبة', 'Quote No.')} valueColor={C.gold} value={<span onClick={() => { try { window.dispatchEvent(new CustomEvent(ev, { detail: { q: data.quote } })) } catch {} }} title={isRenewal ? T('فتح تفاصيل حسبة تجديد الإقامة', 'Open renewal quote details') : T('فتح تفاصيل حسبة نقل الكفالة', 'Open transfer quote details')} style={{ direction: 'ltr', unicodeBidi: 'isolate', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>{noDash(data.quote)}</span>} />})()}
        {/* نقل الكفالة وتجديد الإقامة: المدة المتوقعة في الإقامة + الانتهاء المتوقع — كما في كرت الملخص المالي بصفحة الحسبة. */}
        {(data.code === 'transfer' || data.code === 'iqama_renewal') && data.tc && (() => {
          const tc = data.tc
          const moU = n => isAr ? ((n >= 3 && n <= 10) ? 'أشهر' : 'شهر') : (n === 1 ? 'month' : 'months')
          const dyU = n => isAr ? ((n >= 3 && n <= 10) ? 'أيام' : 'يوم') : (n === 1 ? 'day' : 'days')
          const join = isAr ? ' و ' : ' · '
          let durLabel = ''
          if (data.code === 'iqama_renewal') {
            // التجديد: المدة المتوقعة بالأشهر (مجمّدة في expected_duration_months وإلا renewal_months).
            const rmo = Number(tc.expected_duration_months != null ? tc.expected_duration_months : (tc.renewal_months || 0))
            if (rmo > 0) durLabel = rmo + ' ' + moU(rmo)
          } else {
            const dm = Number(tc.duration_months || 0), dd = Number(tc.duration_days || 0), ed = Number(tc.expected_iqama_days || 0), rm = Number(tc.renewal_months || 0)
            if (dm > 0 || dd > 0) { const p = []; if (dm > 0) p.push(dm + ' ' + moU(dm)); if (dd > 0) p.push(dd + ' ' + dyU(dd)); durLabel = p.join(join) }
            else if (ed > 0) { const mo = Math.floor(ed / 30), dy = ed % 30; const p = []; if (mo > 0) p.push(mo + ' ' + moU(mo)); if (dy > 0) p.push(dy + ' ' + dyU(dy)); durLabel = p.join(join) }
            else if (rm > 0) durLabel = rm + ' ' + moU(rm)
          }
          return (<>
            {durLabel && visDuration && <FinMetaRow label={T('المدة المتوقعة', 'Expected Duration')} valueColor={C.gold} value={durLabel} />}
            {visExpiry && (() => {
              // الإنتهاء المتوقع — العمود المجمّد، وإلا (سجلات بابل المستوردة) يُحسب بنفس صيغة كرت الحسبة:
              // البداية = انتهاء الإقامة (أو تاريخ التسعير + 7 أيام إن انتهت ≥ 30 يومًا) + أشهر التجديد.
              let expExpiry = tc.expected_expiry_date
              if (!expExpiry && data.code === 'transfer' && !(tc.transfer_only || tc.renew_iqama === false)) {
                const exp = tc.iqama_expiry_gregorian ? new Date(tc.iqama_expiry_gregorian) : null
                const ren = Number(tc.renewal_months || 0)
                if (exp && !isNaN(exp) && ren > 0) {
                  const ref = tc.priced_at ? new Date(tc.priced_at) : new Date()
                  ref.setHours(0, 0, 0, 0); exp.setHours(0, 0, 0, 0)
                  const start = Math.floor((ref - exp) / 86400000) >= 30
                    ? (() => { const d = new Date(ref); d.setDate(d.getDate() + 7); return d })()
                    : new Date(exp)
                  start.setMonth(start.getMonth() + ren)
                  expExpiry = start.toISOString().slice(0, 10)
                }
              }
              return expExpiry ? <FinMetaRow label={T('الإنتهاء المتوقع', 'Expected Expiry')} valueColor={C.gold} value={fmtGreg(expExpiry, isAr)} ltr /> : null
            })()}
          </>)
        })()}
        {/* الرسوم المكتبية والحكومية — من الحسبة المرتبطة (نقل/تجديد)، تحت مرجع الحسبة مباشرةً كما في كرت الملخص المالي بصفحة الحسبة. */}
        {(data.code === 'transfer' || data.code === 'iqama_renewal') && data.tc && data.tc.office_fee_net != null && visOfficeFee && <FinMetaRow label={T('الرسوم المكتبية', 'Office Fees')} valueColor={C.gold} value={<span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, direction: 'rtl' }}><span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{Number(data.tc.office_fee_net).toLocaleString('en-US')}</span><span>{T('ريال', 'SAR')}</span></span>} />}
        {(data.code === 'transfer' || data.code === 'iqama_renewal') && data.tc && data.tc.government_fees != null && visGovFees && <FinMetaRow label={T('الرسوم الحكومية', 'Government Fees')} value={<span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, direction: 'rtl' }}><span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{Number(data.tc.government_fees).toLocaleString('en-US')}</span><span>{T('ريال', 'SAR')}</span></span>} />}
        {/* شارات الحالة المنجزة — أسفل العدّادات */}
        {Array.isArray(stageStatus) && stageStatus.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2 }}>
            {stageStatus}
          </div>
        )}
      </div>
    </div>
  )
}

const PaymentRow = ({ p, isAr, T, overflow = 0, onEdit, editLog, user }) => {
  const valid = p.is_valid
  const visAmount = fieldVisible(user, 'invoices', 'payment_amount')
  const visMethod = fieldVisible(user, 'invoices', 'payment_method')
  const visBankRef = fieldVisible(user, 'invoices', 'payment_bank_reference')
  const visNotes = fieldVisible(user, 'invoices', 'payment_notes')
  const visDate = fieldVisible(user, 'invoices', 'payment_date')
  const visCreator = fieldVisible(user, 'invoices', 'payment_creator')
  const visReceipt = fieldVisible(user, 'invoices', 'payment_receipt')
  const isRefund = Number(p.amount) < 0
  // الحوالة البنكية تُميَّز بالكود (bank_transfer/bank)، ومع البيانات القديمة بنصّ الطريقة.
  const isBank = !isRefund && (p.payment_method?.code ? /bank/i.test(p.payment_method.code) : /حوالة|bank/i.test(p.payment_method?.value_ar || p.payment_method?.value_en || ''))
  // الاسترجاع بالبرتقالي (ليتميّز عن الإلغاء)؛ الملغاة بالأحمر؛ الحوالة البنكية بالأزرق السماوي؛ الدفعة النقدية بالأخضر.
  const accent = isRefund ? C.orange : (!valid ? C.red : (isBank ? C.blue : C.ok))
  const tint = isRefund ? 'rgba(243,156,18,' : (!valid ? 'rgba(232,114,101,' : (isBank ? 'rgba(93,173,226,' : 'rgba(46,204,113,'))
  const method = p.payment_method ? (isAr ? p.payment_method.value_ar : (p.payment_method.value_en || p.payment_method.value_ar)) : ''
  const person = p.creator?.person
  const full = (isAr ? (person?.name_ar || person?.name_en) : (person?.name_en || person?.name_ar)) || ''
  const twoNames = full.trim().split(/\s+/).filter(Boolean).slice(0, 2).join(' ')
  const [datePart, timePart] = fmtDateTime(p.payment_date, isAr).split(' · ')
  // الاسترجاع يخزّن مقاطع مُهيكلة في notes (refund_reason_id:… و visa_ref:…) مفصولة بـ « — » مع نصّ السبب.
  // نعرض نصّ السبب فقط، ونستخرج «visa_ref:» لعرض التأشيرة ورقم الحدود في سطر مستقل.
  const noteSegs = (p.notes || '').split(' — ').map(s => s.trim()).filter(Boolean)
  const noteText = noteSegs.filter(s => !/^refund_reason_id:/.test(s) && !/^visa_ref:/.test(s)).join(' — ')
  const visaRef = (() => {
    const seg = noteSegs.find(s => /^visa_ref:/.test(s))
    if (!seg) return null
    const [nat, border, file] = seg.replace(/^visa_ref:/, '').split('|')
    return { nat: (nat || '').trim(), border: (border || '').trim(), file: (file || '').trim() }
  })()
  const hasLog = Array.isArray(editLog) && editLog.length > 0
  return (
    <div style={{ marginBottom: 6 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: 12, background: 'var(--inputBg)', border: '1px solid var(--bd)', opacity: valid ? 1 : 0.6 }}>
      <span style={{ width: 34, alignSelf: 'stretch', minHeight: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tint + '.12)', color: accent, border: '1px solid ' + tint + '.28)' }}>
        {isRefund
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/></svg>}
      </span>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          {visAmount && <span style={{ fontSize: 19, color: accent, fontWeight: 800, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(Math.abs(p.amount))}</span>}
          {visAmount && <span style={{ fontSize: 12, color: accent, fontWeight: 700 }}>{SAR(T)}</span>}
          {method && visMethod && <span style={{ fontSize: 9.5, fontWeight: 700, color: accent, background: tint + '.1)', padding: '2px 8px', borderRadius: 999 }}>{method}</span>}
          {isRefund && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 800, color: '#1a1a1a', background: accent, padding: '3px 9px', borderRadius: 6, letterSpacing: '.3px' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
              {T('استرجاع','Refund')}
            </span>
          )}
          {!valid && <span style={{ fontSize: 9.5, fontWeight: 700, color: C.red, background: 'rgba(232,114,101,.1)', padding: '2px 8px', borderRadius: 999 }}>{T('ملغاة','Voided')}</span>}
          {overflow > 0 && (
            <span style={{ fontSize: 9.5, padding: '2px 8px', borderRadius: 999, background: 'rgba(212,160,23,.12)', border: '1px solid rgba(212,160,23,.32)', color: C.gold, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              <span>+{num(overflow)} {T('للدفعة التالية','to next')}</span>
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 10, color: 'var(--tx4)' }}>
          {twoNames && visCreator && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: C.gold, fontWeight: 700 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>{twoNames}</span>
            </span>
          )}
          {p.bank_reference && visBankRef && <span style={{ direction: 'ltr', fontFamily: 'monospace' }}>{p.bank_reference}</span>}
        </div>
        {visaRef && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 10.5 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: accent, fontWeight: 700, background: tint + '.1)', border: '1px solid ' + tint + '.28)', padding: '2px 8px', borderRadius: 6 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h4M14 14h4"/></svg>
              <span>{visaRef.nat || T('تأشيرة', 'Visa')}</span>
              {visaRef.file && <span style={{ opacity: .8 }}>· {T('ملف', 'File')} {visaRef.file}</span>}
            </span>
            <span style={{ color: 'var(--tx4)', fontWeight: 600 }}>
              {T('رقم الحدود', 'Border')}: <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', color: 'var(--tx2)', fontWeight: 700 }}>{visaRef.border || '—'}</span>
            </span>
          </div>
        )}
        {noteText && visNotes && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, fontSize: 10.5, color: 'var(--tx3)', lineHeight: 1.5 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span style={{ wordBreak: 'break-word' }}>{noteText}</span>
          </div>
        )}
        {/* الإيصالات — رابط بسيط أسفل كرت الدفعة (تحت الملاحظة) */}
        {visReceipt && Array.isArray(p.receipts) && p.receipts.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 2 }}>
            {p.receipts.map((r, i) => (
              <a key={r.id || i} href={r.file_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                title={r.file_name || T('إيصال الحوالة','Transfer Receipt')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: accent, textDecoration: 'none' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h5"/></svg>
                <span style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>{T('الإيصال','Receipt')}{p.receipts.length > 1 ? ` ${i + 1}` : ''}</span>
              </a>
            ))}
          </div>
        )}
      </div>
      {visDate && (
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
        <span style={{ fontSize: 10.5, color: 'var(--tx3)', direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{datePart}</span>
        {timePart && <span style={{ fontSize: 9.5, color: 'var(--tx4)', direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{timePart}</span>}
      </div>
      )}
      {onEdit && valid && (
        <button onClick={() => onEdit(p)} title={T('تعديل الدفعة','Edit payment')}
          style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 8, background: 'rgba(212,160,23,.06)', border: '1px dashed var(--accent-bd)', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        </button>
      )}
    </div>
    {/* سجل تعديل هذه الدفعة — أسلوب ثانوي واضح (ليس كرت دفعة): خيط منقّط جانبي + نص مصغّر. */}
    {hasLog && (
      <div style={{ marginTop: 3, marginInlineStart: 22, paddingInlineStart: 10, borderInlineStart: '2px dashed rgba(212,160,23,.35)', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {editLog.map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 10, color: 'var(--tx4)' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            <span style={{ color: C.gold, fontWeight: 700 }}>{T('تعديل','Edited')}</span>
            {(c.changes || []).map((ch, j) => (
              <span key={j} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span>{ch.field === 'amount' ? T('المبلغ','Amount') : ch.field === 'method' ? T('الطريقة','Method') : T('الملاحظة','Note')}:</span>
                <span style={{ color: 'var(--tx2)', fontWeight: 700 }}>{ch.to || '—'}</span>
                {ch.from && <span style={{ color: 'var(--tx5)', textDecoration: 'line-through' }}>{ch.from}</span>}
              </span>
            ))}
            {c.by_name && <span>· {c.by_name}</span>}
            <span style={{ direction: 'ltr' }}>· {fmtDateTime(c.at)}</span>
          </div>
        ))}
      </div>
    )}
    </div>
  )
}

/* ═════ Installment timeline — vertical stepper showing each stage ═════ */
const deriveInstMeta = (ins, T, isAr) => {
  const insTotal = Number(ins.total_amount || 0)
  const insPaid = Number(ins.paid_amount || 0)
  const state = insPaid >= insTotal && insTotal > 0 ? 'paid' : (insPaid > 0 ? 'partial' : 'unpaid')
  const stateC = state === 'paid' ? C.ok : (state === 'partial' ? C.gold : 'rgba(255,255,255,.32)')
  const stateBg = state === 'paid' ? 'rgba(46,204,113,.16)' : (state === 'partial' ? 'rgba(212,160,23,.14)' : 'rgba(255,255,255,.05)')
  const stateLabel = state === 'paid' ? T('مسدّد','Paid') : (state === 'partial' ? T('جزئي','Partial') : T('لم يُسدد','Unpaid'))
  const milestone = ins.payment_milestone
    ? (isAr ? ins.payment_milestone.value_ar : (ins.payment_milestone.value_en || ins.payment_milestone.value_ar))
    : (ins.notes || null)
  return { insTotal, insPaid, state, stateC, stateBg, stateLabel, milestone }
}
const CheckIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>

// Ordinal payment label — "الدفعة الأولى" / "First Installment" instead of a bare "دفعة 1".
const AR_ORD = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة', 'التاسعة', 'العاشرة']
const EN_ORD = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth']
const instOrdinalLabel = (n, isAr) => isAr ? ('الدفعة ' + (AR_ORD[n - 1] || n)) : ((EN_ORD[n - 1] || ('#' + n)) + ' Installment')

const InstallmentRow = ({ ins, n, last, single, T, isAr, user }) => { const m = deriveInstMeta(ins, T, isAr)
  const visOrder = fieldVisible(user, 'invoices', 'installment_order')
  const visAmount = fieldVisible(user, 'invoices', 'installment_amount')
  const visStatus = fieldVisible(user, 'invoices', 'installment_status')
  const visExpected = fieldVisible(user, 'invoices', 'installment_expected_date')
  return (
  <div style={{ position: 'relative', paddingBottom: last ? 0 : 18 }}>
    <span style={{ position: 'absolute', insetInlineStart: -22, top: 4, width: 24, height: 24, borderRadius: '50%', background: m.stateBg, border: '2px solid ' + m.stateC, color: m.stateC, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>{m.state === 'paid' ? <CheckIcon/> : n}</span>
    <div style={{ paddingInlineStart: 12 }}>
      {visOrder && <div style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 700, marginBottom: 4 }}>{m.milestone || (single ? T('دفعة واحدة', 'Single payment') : instOrdinalLabel(ins.installment_order, isAr))}</div>}
      {visAmount && <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 22, color: m.state === 'paid' ? C.ok : C.gold, fontWeight: 800, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(m.insTotal)}</span>
        <span style={{ fontSize: 13, color: C.gold, fontWeight: 700 }}>{SAR(T)}</span>
        {/* «جزئي» يُخفى لأن شريط التقدّم أسفله يوضّح المدفوع/المتبقي — تبقى «مسدّد»/«لم يُسدد» لباقي الحالات */}
        {m.state !== 'partial' && visStatus && <span style={{ fontSize: 10, color: m.stateC, fontWeight: 700 }}>{m.stateLabel}</span>}
      </div>}
      {visStatus && m.state === 'partial' && (() => {
        const insRemaining = Math.max(0, m.insTotal - m.insPaid)
        const insPct = m.insTotal ? Math.min(100, Math.round((m.insPaid / m.insTotal) * 100)) : 0
        return (
          <div style={{ marginTop: 6 }}>
            <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
              <div style={{ width: insPct + '%', height: '100%', background: C.ok, borderRadius: 999, transition: 'width .3s' }} />
            </div>
            <div style={{ marginTop: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, fontWeight: 700 }}>
              <span style={{ color: C.ok }}><span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(m.insPaid)}</span> {T('مدفوع','Paid')}</span>
              <span style={{ color: C.gold }}><span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(insRemaining)}</span> {T('متبقٍ','Remaining')}</span>
            </div>
          </div>
        )
      })()}
      {visExpected && ins.expected_date && (
        <div style={{ marginTop: 4, fontSize: 10, color: 'var(--tx4)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>{T('التاريخ المتوقع','Expected')}:</span>
          <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', color: 'var(--tx3)' }}>{fmtGreg(ins.expected_date, isAr)}</span>
        </div>
      )}
    </div>
  </div>
  )
}
const TimelineCol = ({ items, T, isAr, user }) => (
  <div style={{ position: 'relative', paddingInlineStart: 22 }}>
    {items.length > 1 && <div style={{ position: 'absolute', insetInlineStart: 13, top: 14, bottom: 14, width: 2, background: 'rgba(255,255,255,.06)' }} />}
    {items.map((ins, i) => <InstallmentRow key={ins.id} ins={ins} n={i + 1} last={i === items.length - 1} single={false} T={T} isAr={isAr} user={user} />)}
  </div>
)
const TimelineHead = ({ icon, title, sub }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 7, background: 'rgba(212,160,23,.12)', border: '1px solid rgba(212,160,23,.3)', color: C.gold, flexShrink: 0 }}>{icon}</span>
    <span style={{ fontSize: 12.5, fontWeight: 700, color: C.gold }}>{title}</span>
    {sub && <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{sub}</span>}
  </div>
)
const InstallmentTimeline = ({ insts, T, isAr, user }) => {
  // Schedule shape: one shared combined «إصدار التأشيرة والتوكيل» tranche (no visa link) shown first,
  // then one «إصدار الإقامة» tranche per visa under its own header. Legacy/cash schedules stay flat.
  const visaInsts = insts.filter(x => x.visa_application_id)
  const txnInsts = insts.filter(x => !x.visa_application_id)
  if (!visaInsts.length) return (
    <div style={{ position: 'relative', paddingInlineStart: 22 }}>
      {insts.length > 1 && <div style={{ position: 'absolute', insetInlineStart: 13, top: 14, bottom: 14, width: 2, background: 'rgba(255,255,255,.06)' }} />}
      {insts.map((ins, i) => <InstallmentRow key={ins.id} ins={ins} n={ins.installment_order} last={i === insts.length - 1} single={insts.length === 1} T={T} isAr={isAr} user={user} />)}
    </div>
  )
  const groups = []; const map = new Map()
  visaInsts.forEach(ins => { const k = ins.visa_application_id; if (!map.has(k)) { const g = { key: k, visa: ins.visa_application, items: [] }; map.set(k, g); groups.push(g) } map.get(k).items.push(ins) })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {txnInsts.length > 0 && (() => {
        // المؤقتة: الدفعة المشتركة هي «إصدار التأشيرة» فقط (التوكيل لكل تأشيرة). الدائمة: إصدار + توكيل مشتركان.
        const sharedHasAuth = txnInsts.some(it => /توكيل|تفويض|authoriz|wakal/i.test(String(it.notes || '') + String(it.payment_milestone?.value_ar || '')))
        return (
        <div>
          <TimelineHead title={sharedHasAuth ? T('التأشيرة والتوكيل','Visa & authorization') : T('إصدار التأشيرة','Visa issuance')} sub={T('مشتركة لكل التأشيرات','shared — all visas')}
            icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>} />
          <TimelineCol items={txnInsts} T={T} isAr={isAr} user={user} />
        </div>
        )
      })()}
      {groups.map((g, gi) => (
        <div key={g.key}>
          <TimelineHead title={`${T('تأشيرة','Visa')} ${gi + 1}`} sub={g.visa?.border_number ? `${T('رقم الحدود','Border')} ${g.visa.border_number}` : null}
            icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>} />
          <TimelineCol items={g.items} T={T} isAr={isAr} user={user} />
        </div>
      ))}
    </div>
  )
}

// التسعير — كرت مستقل: بنود التسعيرة المحفوظة وقت الإنشاء (إن وُجدت)، وإلا ملخّص الإجمالي/المسدّد/المتبقي للفواتير القديمة.
// خروج وعودة: «إصدار خروج وعودة (مفردة)» → «خروج وعودة (إصدار-مفردة)» — دمج العملية مع نوع التأشيرة في القوس
// (للفواتير القديمة المخزّنة بالصيغة السابقة؛ المولّد الجديد يحفظها بالصيغة الجديدة مباشرة).
const fmtLineLabel = (label, T = (a) => a) => {
  const raw = String(label || '')
  // «رسوم كرت العمل» (الصيغة المخزّنة قديماً) تُعرض «رخصة العمل».
  if (raw === 'رسوم كرت العمل') return T('رخصة العمل', 'Work Permit')
  // خروج نهائي: يُعرض بند الرسم كـ«رسوم المكتب».
  if (raw === 'رسوم خروج نهائي') return T('رسوم المكتب', 'Office Fee')
  const m = raw.match(/^(إصدار|تمديد)\s+خروج وعودة\s*\(([^)]+)\)\s*$/)
  return m ? `${T('خروج وعودة', 'Exit / Re-entry')} (${T(m[1], m[1] === 'إصدار' ? 'Issue' : 'Extend')}-${m[2].trim()})` : raw
}
const PricingCard = ({ breakdown, total = 0, paid = 0, remaining = 0, absher = 0, tc = null, T, onEdit, log = [], svcCode = null, user }) => {
  const visBreakdown = fieldVisible(user, 'invoices', 'pricing_breakdown')
  const visOfficeFee = fieldVisible(user, 'invoices', 'pricing_office_fees')
  const visAbsher = fieldVisible(user, 'invoices', 'pricing_absher_discount')
  const visOfficeDisc = fieldVisible(user, 'invoices', 'pricing_office_discount')
  const visTotal = fieldVisible(user, 'invoices', 'pricing_total')
  return (
  <div style={cardChrome}>
    <div style={cardHeader}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
      <span style={cardTitle}>{T('التسعير','Pricing')}</span>
      {onEdit && (
        <button onClick={onEdit} title={T('تعديل التسعير','Edit pricing')}
          style={{ marginInlineStart: 'auto', height: 32, padding: '0 14px', borderRadius: 9, background: 'rgba(212,160,23,.06)', border: '1px dashed var(--accent-bd)', color: 'var(--accent)', fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <span>{T('تعديل','Edit')}</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        </button>
      )}
    </div>
    <div style={{ padding: '14px 22px' }}>
      {(() => {
        // نقل الكفالة: اعرض نفس تفصيل وتصميم كرت «التسعيرة» في حسبة التنازل، مبنيّاً من الحسبة المرتبطة (tc).
        const isTransferTc = !!(tc && Number(tc.transfer_fee || 0) > 0)
        if (isTransferTc) {
          const nmSar = v => (v === null || v === undefined || v === '') ? '—' : num(v) + ' ' + T('ريال', 'SAR')
          const ren = Number(tc.renewal_months || 0)
          const renSuffix = ren > 0 ? T(` (${ren} شهر)`, ` (${ren} mo)`) : ''
          // أشهر تجديد الإقامة المحتسبة (تشمل المتأخرة) — نفس صيغة كرت التسعيرة في الحسبة.
          const billedMos = (() => { let billed = ren; const exp = tc.iqama_expiry_gregorian ? new Date(tc.iqama_expiry_gregorian) : null; if (exp && !isNaN(exp)) { const refD = tc.priced_at ? new Date(tc.priced_at) : new Date(); refD.setHours(0, 0, 0, 0); exp.setHours(0, 0, 0, 0); if (exp < refD) { const end = new Date(refD); end.setMonth(end.getMonth() + ren); let m = (end.getFullYear() - exp.getFullYear()) * 12 + (end.getMonth() - exp.getMonth()); let d = end.getDate() - exp.getDate(); if (d < 0) { m -= 1; d += new Date(end.getFullYear(), end.getMonth(), 0).getDate() } billed = d > 0 ? m + 1 : m } } return billed })()
          const renIqamaSuffix = billedMos > 0 ? T(` (${billedMos} شهر)`, ` (${billedMos} mo)`) : ''
          const lateFine = Number(tc.late_fine_amount || 0)
          const officeFeeV = Number(tc.office_fee || 0)
          const subtotalV = Number(tc.subtotal || 0)
          const totalV = Number(tc.total_amount || 0)
          const lineItems = [
            Number(tc.transfer_fee || 0) > 0 ? [T('رسوم نقل الكفالة', 'Sponsorship Transfer Fee'), tc.transfer_fee, null] : null,
            Number(tc.iqama_renewal_fee || 0) > 0 ? [T('تجديد الإقامة', 'Iqama Renewal') + renIqamaSuffix, tc.iqama_renewal_fee, null] : null,
            Number(tc.work_permit_fee || 0) > 0 ? [T('رخصة العمل', 'Work Permit') + renSuffix, tc.work_permit_fee, null] : null,
            Number(tc.prof_change_fee || 0) > 0 ? [T('تغيير المهنة', 'Change Occupation'), tc.prof_change_fee, null] : null,
            Number(tc.medical_fee || 0) > 0 ? [T('التأمين الطبي', 'Medical Insurance'), tc.medical_fee, null] : null,
            lateFine > 0 ? [T('غرامة الإقامة', 'Iqama Late Fine'), lateFine, '#e5867a'] : null,
            ...((Array.isArray(tc.extras) ? tc.extras : []).map(e => { const a = Number(e?.amount) || 0; return a > 0 ? [e?.name || T('بند إضافي', 'Extra'), a, C.blue] : null }).filter(Boolean)),
          ].filter(Boolean)
          return (
            <>
              {visBreakdown && lineItems.map((it, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', minHeight: 26 }}><span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600 }}>{it[0]}</span><span style={{ fontSize: 12.5, color: it[2] || 'var(--tx2)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{nmSar(it[1])}</span></div>)}
              <div style={{ marginTop: 8, borderTop: '1px solid var(--bd)', paddingTop: 10 }}>
                {officeFeeV > 0 && visOfficeFee && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}><span style={{ fontSize: 13, color: 'var(--tx3)', fontWeight: 600 }}>{T('رسوم المكتب', 'Office Fees')}</span><span style={{ fontSize: 14, color: 'var(--tx)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{nmSar(officeFeeV)}</span></div>}
                {visBreakdown && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}><span style={{ fontSize: 13, color: C.gold, fontWeight: 600 }}>{T('الإجمالي الابتدائي', 'Subtotal')}</span><span style={{ fontSize: 14, color: C.gold, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{nmSar(subtotalV)}</span></div>}
                {Number(tc.absher_discount || 0) > 0 && visAbsher && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}><span style={{ fontSize: 13, color: '#27a046', fontWeight: 600 }}>{T('خصم أبشر', 'Absher Discount')}</span><span style={{ fontSize: 14, color: '#27a046', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{nmSar(Number(tc.absher_discount || 0))}</span></div>}
                {Number(tc.manual_discount || 0) > 0 && visOfficeDisc && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}><span style={{ fontSize: 13, color: '#27a046', fontWeight: 600 }}>{T('خصم المكتب', 'Office Discount')}</span><span style={{ fontSize: 14, color: '#27a046', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{nmSar(Number(tc.manual_discount || 0))}</span></div>}
              </div>
              {visTotal && <div style={{ margin: '10px 0 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'var(--inputBg)', borderRadius: 12, border: '1px solid var(--bd)' }}><span style={{ color: C.gold, fontWeight: 700, fontSize: 14.5 }}>{T('الإجمالي النهائي', 'Final Total')}</span><span style={{ color: C.gold, fontWeight: 800, fontSize: 24, fontVariantNumeric: 'tabular-nums' }}>{num(totalV)} <span style={{ fontSize: 12, fontWeight: 600 }}>{T('ريال', 'SAR')}</span></span></div>}
            </>
          )
        }
        // تجديد الإقامة: اعرض نفس تفصيل وتصميم كرت «التسعيرة» في حسبة التجديد، مبنيّاً من الحسبة المرتبطة (tc).
        const isRenewalTc = !!(tc && (tc.iqama_renewal_fee != null || tc.work_permit_fee != null || tc.medical_fee != null))
        if (isRenewalTc) {
          const nmSar = v => (v === null || v === undefined || v === '') ? '—' : num(v) + ' ' + T('ريال', 'SAR')
          const renMonths = Number(tc.renewal_months || 0)
          const renSuffix = renMonths > 0 ? T(` (${renMonths} شهر)`, ` (${renMonths} mo)`) : ''
          // مجمّد في أعمدة الحسبة وقت الإصدار؛ الحساب احتياطي للسجلات القديمة فقط.
          const billedIqamaMos = tc.billed_renewal_months != null ? Number(tc.billed_renewal_months) : (() => { let billed = renMonths; const exp = tc.iqama_expiry_gregorian ? new Date(tc.iqama_expiry_gregorian) : null; if (exp && !isNaN(exp)) { const ref = tc.priced_at ? new Date(tc.priced_at) : new Date(); ref.setHours(0, 0, 0, 0); exp.setHours(0, 0, 0, 0); if (exp < ref) { const end = new Date(ref); end.setMonth(end.getMonth() + renMonths); let m = (end.getFullYear() - exp.getFullYear()) * 12 + (end.getMonth() - exp.getMonth()); let d = end.getDate() - exp.getDate(); if (d < 0) { m -= 1; d += new Date(end.getFullYear(), end.getMonth(), 0).getDate() } billed = d > 0 ? m + 1 : m } } return billed })()
          const renIqamaSuffix = billedIqamaMos > 0 ? T(` (${billedIqamaMos} شهر)`, ` (${billedIqamaMos} mo)`) : ''
          const extras = (Array.isArray(tc.extras) ? tc.extras : []).filter(e => Number(e?.amount) > 0)
          const cover = tc.office_cover != null ? Number(tc.office_cover) : Math.max(0, Number(tc.iqama_renewal_fee || 0) + Number(tc.work_permit_fee || 0) + Number(tc.medical_fee || 0) - Number(tc.gov_excess || 0))
          const officeFeeV = Number(tc.office_fee || 0); const totalV = Number(tc.total_amount || 0)
          const lineItems = [
            Number(tc.iqama_renewal_fee || 0) > 0 ? [T('تجديد الإقامة', 'Iqama Renewal') + renIqamaSuffix, tc.iqama_renewal_fee, null] : null,
            Number(tc.work_permit_fee || 0) > 0 ? [T('رخصة العمل', 'Work Permit') + renSuffix, tc.work_permit_fee, null] : null,
            Number(tc.prof_change_fee || 0) > 0 ? [T('تغيير المهنة', 'Change Occupation'), tc.prof_change_fee, null] : null,
            Number(tc.medical_fee || 0) > 0 ? [T('التأمين الطبي', 'Medical Insurance'), tc.medical_fee, null] : null,
            Number(tc.late_fine_amount || 0) > 0 ? [T('غرامة تأخّر الإقامة', 'Iqama Late Fine'), tc.late_fine_amount, '#e5867a'] : null,
            ...extras.map(e => [e.name || T('بند إضافي', 'Extra'), Number(e.amount || 0), C.blue]),
          ].filter(Boolean)
          return (
            <div style={{ borderRadius: 12, border: '1px solid var(--bd)', background: 'var(--inputBg)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>
              {visBreakdown && lineItems.map((it, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 26 }}><span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600 }}>{it[0]}</span><span style={{ fontSize: 12.5, color: it[2] || 'var(--tx2)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{nmSar(it[1])}</span></div>)}
              {officeFeeV > 0 && visOfficeFee && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 26 }}><span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600 }}>{T('رسوم المكتب', 'Office Fees')}</span><span style={{ fontSize: 12.5, color: 'var(--tx2)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{nmSar(officeFeeV)}</span></div>}
              {cover > 0 && visOfficeDisc && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 26 }}><span style={{ fontSize: 12, color: '#27a046', fontWeight: 600 }}>{T('خصم عام', 'General Discount')}</span><span style={{ fontSize: 12.5, color: '#27a046', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{nmSar(cover)}</span></div>}
              {((Number(tc.absher_discount || 0) > 0 && visAbsher) || (Number(tc.manual_discount || 0) > 0 && visOfficeDisc)) && <div style={{ marginTop: 4, borderTop: '1px solid var(--bd)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Number(tc.absher_discount || 0) > 0 && visAbsher && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: '#27a046', fontWeight: 600 }}>{T('خصم أبشر', 'Absher Discount')}</span><span style={{ fontSize: 14, color: '#27a046', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{nmSar(Number(tc.absher_discount || 0))}</span></div>}
                {Number(tc.manual_discount || 0) > 0 && visOfficeDisc && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: '#27a046', fontWeight: 600 }}>{T('خصم المكتب', 'Office Discount')}</span><span style={{ fontSize: 14, color: '#27a046', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{nmSar(Number(tc.manual_discount || 0))}</span></div>}
              </div>}
              {visTotal && <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--inputBg)', borderRadius: 10, border: '1px solid var(--bd)' }}><span style={{ fontSize: 14.5, color: C.gold, fontWeight: 700 }}>{T('الإجمالي النهائي', 'Final Total')}</span><span style={{ fontSize: 18, color: C.gold, fontWeight: 800, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(totalV)}</span></div>}
            </div>
          )
        }
        return (Array.isArray(breakdown) && breakdown.length > 0) ? (() => {
        // الخصم = مجموع البنود − الإجمالي النهائي. نعرض «الإجمالي الابتدائي» و«خصم المكتب» و«الإجمالي النهائي»
        // تماماً كبطاقة تسعيرة حسبة التنازل — وإلا (بلا خصم) نكتفي بسطر «الإجمالي».
        const lineSum = breakdown.reduce((s, l) => s + (Number(l.amount) || 0), 0)
        const disc = Math.max(0, lineSum - (Number(total) || 0))
        // الخصم الكلي يشمل خصم أبشر (المجلوب من الحسبة) + خصم المكتب — نفصلهما عند توفّر مبلغ أبشر.
        const absherDisc = Math.min(Math.max(0, Number(absher) || 0), disc)
        const officeDisc = Math.max(0, disc - absherDisc)
        // عدد الأشهر بجانب تجديد الإقامة (المُحتسبة، تشمل المتأخرة) ورسوم كرت العمل (أشهر التجديد) — من الحسبة المرتبطة.
        const tcRen = Number(tc?.renewal_months || 0)
        const tcBilled = (() => {
          if (!tc || tcRen <= 0) return tcRen
          let billed = tcRen
          const iqExp = tc.iqama_expiry_gregorian ? new Date(tc.iqama_expiry_gregorian) : null
          if (iqExp && !isNaN(iqExp)) {
            const ref = new Date(tc.priced_at || Date.now()); ref.setHours(0, 0, 0, 0); iqExp.setHours(0, 0, 0, 0)
            if (iqExp < ref) {
              const end = new Date(ref); end.setMonth(end.getMonth() + tcRen)
              let mm = (end.getFullYear() - iqExp.getFullYear()) * 12 + (end.getMonth() - iqExp.getMonth())
              let d = end.getDate() - iqExp.getDate(); if (d < 0) { mm -= 1; d += new Date(end.getFullYear(), end.getMonth(), 0).getDate() }
              billed = d > 0 ? mm + 1 : mm
            }
          }
          return billed
        })()
        const moLbl = n => (n >= 3 && n <= 10) ? T('أشهر', 'months') : T('شهر', 'month')
        const monthSuffix = label => {
          const s = String(label || '')
          if (/تجديد الإقامة|تجديد الاقامة/.test(s) && tcBilled > 0) return ` (${tcBilled} ${moLbl(tcBilled)})`
          if (/كرت العمل|رخصة العمل/.test(s) && tcRen > 0) return ` (${tcRen} ${moLbl(tcRen)})`
          return ''
        }
        return (
        <div style={{ borderRadius: 12, border: '1px solid var(--bd)', background: 'var(--inputBg)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>
          {visBreakdown && breakdown.map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 14 }}>
              <span style={{ color: 'var(--tx2)', fontWeight: 600, fontSize: 12.5 }}>{((l.label === 'رسوم عقد أجير' || l.label === 'رسوم أساسية') ? T('رسوم العقد', 'Contract Fee') : fmtLineLabel(l.label, T)) + monthSuffix(l.label)}</span>
              <span style={{ color: 'var(--tx1)', fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(l.amount)}</span>
            </div>
          ))}
          {disc > 0 ? (
            <>
              {visBreakdown && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 9, borderTop: '1px solid var(--bd)' }}>
                <span style={{ fontSize: 13, color: C.gold, fontWeight: 600 }}>{T('الإجمالي الابتدائي','Subtotal')}</span>
                <span style={{ fontSize: 14, color: C.gold, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(lineSum)}</span>
              </div>
              )}
              {absherDisc > 0 && visAbsher && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontSize: 13, color: '#27a046', fontWeight: 600 }}>{T('خصم أبشر','Absher Discount')}</span>
                  <span style={{ fontSize: 14, color: '#27a046', fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(absherDisc)}</span>
                </div>
              )}
              {officeDisc > 0 && visOfficeDisc && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  {/* تغيير المهنة/خروج وعودة: الخصم اليدوي هو «رصيد أبشر» المُدخل، فيُسمّى «خصم أبشر» لا «خصم المكتب». */}
                  <span style={{ fontSize: 13, color: '#27a046', fontWeight: 600 }}>{(svcCode === 'profession_change' || svcCode === 'exit_reentry_visa') ? T('خصم أبشر','Absher Discount') : T('خصم المكتب','Office Discount')}</span>
                  <span style={{ fontSize: 14, color: '#27a046', fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(officeDisc)}</span>
                </div>
              )}
              {visTotal && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 3, padding: '12px 14px', background: 'var(--inputBg)', borderRadius: 10, border: '1px solid var(--bd)' }}>
                <span style={{ fontSize: 14.5, color: C.gold, fontWeight: 700 }}>{T('الإجمالي النهائي','Final Total')}</span>
                <span style={{ fontSize: 18, color: C.gold, fontWeight: 800, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(total)}</span>
              </div>
              )}
            </>
          ) : (
            visTotal && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 9, borderTop: '1px solid var(--bd)' }}>
              <span style={{ fontSize: 16, color: C.gold, fontWeight: 600 }}>{T('الإجمالي','Total')}</span>
              <span style={{ fontSize: 16, color: C.gold, fontWeight: 800, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(total)}</span>
            </div>
            )
          )}
        </div>
        )
      })() : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            visTotal ? { label: T('الإجمالي','Total'), value: total, c: C.gold } : null,
            { label: T('المسدّد','Paid'), value: paid, c: C.ok },
            { label: T('المتبقي','Remaining'), value: remaining, c: remaining > 0 ? C.red : 'var(--tx2)' },
          ].filter(Boolean).map((s, i) => (
            <div key={i} style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{s.label}</span>
              <span style={{ fontSize: 15, color: s.c, fontWeight: 800, direction: 'ltr', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{num(s.value)}</span>
            </div>
          ))}
        </div>
      )})()}
      <ChangeLog T={T} title={T('سجل تعديل التسعير', 'Pricing edit log')} entries={log}
        actionLabel={T('تم تعديل التسعير', 'Pricing edited')}
        renderDetail={c => <PricingChanges T={T} entry={c} />} />
    </div>
  </div>
  )
}

const InstallmentsWithPayments = ({ data, breakdown, total = 0, paid = 0, remaining = 0, isAr, T, onEditPayment, paymentLog, user }) => {
  if (data.loading) return (
    <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--tx4)', fontSize: 12 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>
      <span>{T('جاري تحميل الدفعات والمدفوعات…','Loading installments & payments…')}</span>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
  const insts = (data.insts || []).slice().sort((a, b) => (a.installment_order || 0) - (b.installment_order || 0))
  // ترتيب زمني تصاعدي: الأقدم أعلى والأحدث أسفل.
  const pays = (data.pays || []).slice().sort((a, b) => (a.payment_date || '').localeCompare(b.payment_date || ''))
  if (!insts.length && !pays.length) return <div style={{ padding: 22, textAlign: 'center', color: 'var(--tx4)', fontSize: 12 }}>{T('لا توجد دفعات ولا مدفوعات','No installments or payments')}</div>

  return (
    <div style={{ padding: '4px 22px 14px' }}>
      {/* Installments — target breakdown */}
      <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 700, letterSpacing: '.3px', margin: '6px 0 4px' }}>
        {T('الدفعات','Installments')} ({insts.length})
      </div>
      {insts.length === 0 ? (
        <div style={{ padding: '6px 0 10px', fontSize: 11, color: 'var(--tx4)' }}>{T('لا توجد دفعات','No installments')}</div>
      ) : (
        <InstallmentTimeline insts={insts} isAr={isAr} T={T} user={user} />
      )}

      {/* Payments — all actual payments */}
      <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 700, letterSpacing: '.3px', margin: '16px 0 4px' }}>
        {T('المدفوعات','Payments')} ({pays.length})
      </div>
      {pays.length === 0 ? (
        <div style={{ padding: '6px 0', fontSize: 11, color: 'var(--tx4)' }}>{T('لا توجد مدفوعات','No payments yet')}</div>
      ) : (
        <div>
          {pays.map(p => <PaymentRow key={p.id} p={p} isAr={isAr} T={T} onEdit={onEditPayment} user={user}
            editLog={(Array.isArray(paymentLog) ? paymentLog : []).filter(e => e.payment_id === p.id)} />)}
        </div>
      )}
    </div>
  )
}

const HeaderChips = ({ inv, isAr, T, svc, payT }) => (
  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
    <span style={{ padding: '4px 12px', borderRadius: 8, background: svc.bg, border: '1px solid ' + svc.bd, color: svc.c, fontSize: 12, fontWeight: 700 }}>{isAr ? svc.label_ar : svc.label_en}</span>
    <span style={{ padding: '4px 12px', borderRadius: 999, border: '1.5px solid ' + payT.c, color: payT.c, fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>{isAr ? payT.stamp_ar : payT.stamp_en}</span>
    <span style={{ fontSize: 12, color: 'var(--tx3)' }}>{fmtGreg(inv.created_at, isAr)}</span>
    {inv.branch?.branch_code && <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--bd)', color: 'var(--tx3)', direction: 'ltr', fontWeight: 700 }}>{inv.branch.branch_code}</span>}
  </div>
)

// Single-page A4 invoice print, mirroring the transfer-quote print (4 languages,
// gold/cream theme, hidden-iframe printing). Includes every section EXCEPT the
// "بيانات المعاملة" execution card (facility/visa/wakalah/iqama).
// Bilingual one-page invoice document — mirrors the Transfer Quote (تسعيرة التنازل) print:
// white A4, office logo, AR+EN header, gold section banners, field grids, dotted-leader rows,
// gold total box + status stamp. The body localizes into the chosen language (ar · en · hi · ur · bn);
// the office header stays bilingual AR/EN for brand consistency.
const printInvoice = (inv, data, printLang = 'ar') => {
  const html2 = buildInvoiceDoc(inv, data, printLang)
  const invoiceNo = noDash(inv.invoice_no || '')
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:-9999px;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow.document
  doc.open(); doc.write(html2); doc.close()
  // اسم ملف الـ PDF عند «حفظ بصيغة PDF» يأتي من عنوان نافذة الصفحة الأم (لا الـ iframe) في Chrome —
  // فنضبطه مؤقتاً إلى رقم الفاتورة أثناء الطباعة ثم نُعيد العنوان الأصلي.
  const prevTitle = document.title
  const fileTitle = invoiceNo || prevTitle
  const restoreTitle = () => { document.title = prevTitle }
  const cleanup = () => { restoreTitle(); try { document.body.removeChild(iframe) } catch {} }
  setTimeout(() => {
    try {
      document.title = fileTitle
      iframe.contentWindow.focus()
      iframe.contentWindow.onafterprint = () => { restoreTitle(); setTimeout(cleanup, 100) }
      iframe.contentWindow.print()
    }
    catch { cleanup() }
  }, 900)
  setTimeout(cleanup, 60000)
}

// تغيير عامل الفاتورة (الخدمات العامة) — يعتمد نفس تصميم خطوة «العامل» في نافذة إنشاء
// الخدمة: بحث مباشر، بطاقات نتائج زجاجية، ثم بطاقة العامل المُختار + إطار بيانات العامل
// وإطار بيانات المنشأة. الاختيار يحفظ worker_id + worker_facility_id على other_applications؛
// المنشأة تتبع العامل تلقائياً (current_facility_id).
const fmtWDate = (d) => { if (!d) return '—'; const dt = new Date(d); if (isNaN(dt)) return '—'; return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}` }
const wDateStatus = (d) => { if (!d) return 'none'; const dt = new Date(d), now = new Date(), days = Math.round((dt - now) / 86400000); if (days < 0) return 'expired'; if (days < 30) return 'soon'; return 'ok' }
const WST = { expired: '#c0392b', soon: '#e5b534', ok: '#27a046', none: 'var(--tx5)' }
function WorkerPickModal({ sb, toast, T, isAr, srId, currentWorker, editorId, editorName, onClose, onSaved }) {
  const currentId = currentWorker?.id || null
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(null)
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (selected) return
    const needle = q.trim()
    if (needle.length < 2) { setResults([]); setSearching(false); return }
    setSearching(true)
    const t = setTimeout(async () => {
      const pattern = `%${needle.replace(/[%,]/g, '')}%`
      const SEL = 'id,name_ar,name_en,iqama_number,iqama_expiry_date,phone,nationality:nationality_id(code,name_ar,flag_url),current_occupation:current_occupation_id(name_ar),current_facility:current_facility_id(id,name_ar,name_en,unified_number,hrsd_number,gosi_number)'
      const orFilter = `name_ar.ilike.${pattern},name_en.ilike.${pattern},iqama_number.ilike.${pattern},phone.ilike.${pattern}`
      // نبحث في العُمّال الدائمين (workers) والمؤقتين (temproryworkers) معاً — كلاهما يُخزَّن في worker_id بنفس الشكل.
      const [wp, wt] = await Promise.all([
        sb.from('workers').select(SEL).or(orFilter).is('deleted_at', null).limit(30),
        sb.from('temproryworkers').select(SEL).or(orFilter).is('deleted_at', null).limit(30),
      ])
      const rows = [
        ...(wp.data || []).map(w => ({ ...w, worker_type: 'permanent' })),
        ...(wt.data || []).map(w => ({ ...w, worker_type: 'temporary' })),
      ]
      // إزالة التكرار: نفس الشخص (رقم إقامة واحد) قد يَرِد بعدّة سجلات عُمّال — سجلّ لكل منشأة، أثر هجرة بابل.
      // نُبقي سجلاً واحداً لكل رقم إقامة: نُفضّل العامل الحالي، ثم الدائم على المؤقت، ثم الأكثر اكتمالاً (منشأة برقم موحّد).
      const seen = new Map()
      const score = w => (currentId && w.id === currentId ? 8 : 0) + (w.worker_type === 'permanent' ? 4 : 0) + (w.current_facility?.unified_number ? 2 : w.current_facility ? 1 : 0)
      for (const w of rows) {
        const key = (w.iqama_number && String(w.iqama_number).trim()) || `${w.worker_type}:${w.id}`
        const prev = seen.get(key)
        if (!prev || score(w) > score(prev)) seen.set(key, w)
      }
      setResults(Array.from(seen.values()).slice(0, 15))
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [q, sb, selected])
  // نفس الشخص = نفس رقم الإقامة (أو نفس السجل عند غياب الإقامة) — يمنع «تغيير» العامل إلى نفسه.
  const sameAsCurrent = !!selected && !!currentWorker && (() => {
    const a = selected.iqama_number && String(selected.iqama_number).trim()
    const b = currentWorker.iqama_number && String(currentWorker.iqama_number).trim()
    return (a && b) ? a === b : selected.id === currentId
  })()
  const confirm = async () => {
    const w = selected
    if (!w?.id || saving || !srId || sameAsCurrent) return
    setErr(''); setSaving(true)
    try {
      // سجلّ التغيير — يُلحق بحقل details.worker_changes (jsonb): من غيّر، متى، ومن كان العامل قبل التعديل.
      const nowIso = new Date().toISOString()
      const nm = o => o ? (isAr ? (o.name_ar || o.name_en) : (o.name_en || o.name_ar)) || null : null
      const entry = {
        at: nowIso, by: editorId || null, by_name: editorName || null,
        from_id: currentWorker?.id || null, from_name: nm(currentWorker), from_iqama: currentWorker?.iqama_number || null,
        to_id: w.id, to_name: nm(w), to_iqama: w.iqama_number || null,
      }
      // العامل يجرّ منشأته معه — worker_facility_id يتبع current_facility الخاص بالعامل.
      const patchBase = { worker_id: w.id, worker_facility_id: w.current_facility?.id || null, updated_by: editorId || null, updated_at: nowIso }
      const { data: rows } = await sb.from('other_applications').select('id,details').eq('service_request_id', srId).is('deleted_at', null)
      if (rows && rows.length) {
        const { error } = await Promise.all(rows.map(r => {
          const det = (r.details && typeof r.details === 'object') ? r.details : {}
          const log = Array.isArray(det.worker_changes) ? det.worker_changes : []
          return sb.from('other_applications').update({ ...patchBase, details: { ...det, worker_changes: [...log, entry] } }).eq('id', r.id)
        })).then(res => ({ error: res.find(x => x.error)?.error }))
        if (error) throw error
      } else {
        const { error } = await sb.from('other_applications').update({ ...patchBase, details: { worker_changes: [entry] } }).eq('service_request_id', srId)
        if (error) throw error
      }
      onSaved?.(w); setDone(true)
    } catch { setErr(T('تعذر الحفظ','Save failed')) }
    finally { setSaving(false) }
  }
  // علم الجنسية داخل شارة دائرية بنفس مقاس خطوة العامل في نافذة الإنشاء.
  const flagEl = (w, size) => {
    const nat = w.nationality
    const url = nat?.flag_url
    return (
      <div title={nat?.name_ar || ''} style={{ width: size, height: size, borderRadius: 12, background: 'var(--inputBg)', border: '1px solid var(--bd)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {url ? <img src={url} alt={nat?.name_ar || ''} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : (flagEmoji(nat?.code) ? <span style={{ fontSize: Math.round(size * 0.5), lineHeight: 1 }}>{flagEmoji(nat?.code)}</span> : <Globe size={Math.round(size * 0.42)} strokeWidth={1.6} color="rgba(255,255,255,.35)" />)}
      </div>
    )
  }
  const infoBox = (Icon, label, value, valColor) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 9, background: 'var(--inputBg)', border: '1px solid var(--bd)', minWidth: 0 }}>
      <Icon size={13} color={valColor || C.gold} strokeWidth={1.8} style={{ flexShrink: 0 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 9, color: 'var(--tx5)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12, color: valColor || 'var(--tx)', fontWeight: 600, direction: 'ltr', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
      </div>
    </div>
  )
  // بطاقة نتيجة (غير مختارة) — زجاجية، نفس كرت العامل في نافذة الإنشاء.
  const WkResult = ({ w }) => {
    const nm = (isAr ? (w.name_ar || w.name_en) : (w.name_en || w.name_ar)) || '—'
    const isCur = currentId && currentId === w.id
    return (
      <div onClick={() => { setErr(''); setSelected(w) }}
        style={{ cursor: 'pointer', position: 'relative', border: '1px solid var(--bd)', background: 'linear-gradient(135deg,rgba(255,255,255,.05),rgba(255,255,255,.012))', boxShadow: 'var(--shadow-md)', transition: 'all .22s ease', padding: 14, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
        onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(212,160,23,.08),rgba(255,255,255,.02))'; e.currentTarget.style.borderColor = 'rgba(212,160,23,.25)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(255,255,255,.05),rgba(255,255,255,.012))'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {flagEl(w, 48)}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--tx)', letterSpacing: '-.2px' }}>{nm}</span>
              {isCur && <span style={{ fontSize: 9.5, fontWeight: 600, color: C.gold, background: 'rgba(212,160,23,.12)', border: '1px solid rgba(212,160,23,.3)', borderRadius: 20, padding: '2px 8px' }}>{T('الحالي','Current')}</span>}
              {w.worker_type === 'temporary' && <span style={{ fontSize: 9.5, fontWeight: 600, color: '#5dade2', background: 'rgba(93,173,226,.12)', border: '1px solid rgba(93,173,226,.3)', borderRadius: 20, padding: '2px 8px' }}>{T('مؤقت','Temporary')}</span>}
            </span>
            {w.name_en && nm !== w.name_en && <span style={{ fontSize: 11, color: 'var(--tx5)', fontWeight: 600, direction: 'ltr', opacity: .7 }}>{w.name_en}</span>}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {w.iqama_number && infoBox(CreditCard, T('رقم الإقامة','Iqama No'), w.iqama_number)}
          {infoBox(Calendar, T('انتهاء الإقامة','Iqama Expiry'), fmtWDate(w.iqama_expiry_date), WST[wDateStatus(w.iqama_expiry_date)])}
          {w.phone && infoBox(Phone, T('الجوال','Phone'), fmtPhone(w.phone))}
        </div>
      </div>
    )
  }
  // إطار بيانات (عامل/منشأة) — حدّ ذهبي + عنوان عائم يقطع الحدّ (نفس نافذة الإنشاء).
  const Fieldset = ({ label, children }) => (
    <div style={{ marginTop: 19, padding: '14px 14px 12px', borderRadius: 12, border: '1.5px solid rgba(212,160,23,.35)', position: 'relative' }}>
      <div style={{ position: 'absolute', top: -9, right: 14, background: 'var(--modal-bg)', padding: '0 8px', fontSize: 12, fontWeight: 600, color: C.gold, fontFamily: F, maxWidth: 'calc(100% - 28px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
      {children}
    </div>
  )
  const pillBase = { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 11px', borderRadius: 9, background: 'rgba(255,255,255,.03)', border: '1px solid var(--bd)', minHeight: 40 }
  const pLbl = { fontSize: 10, color: 'var(--tx5)', fontWeight: 600, letterSpacing: '.2px', lineHeight: 1.2 }
  const pVal = { fontSize: 13, color: 'var(--tx)', fontWeight: 600, direction: 'ltr', lineHeight: 1.2, textAlign: 'right' }
  // العامل المُختار — بطاقة بشارة «محدد» + زر إلغاء أحمر، يتبعها إطارا العامل والمنشأة.
  const SelectedView = () => {
    const w = selected
    const nm = (isAr ? (w.name_ar || w.name_en) : (w.name_en || w.name_ar)) || '—'
    const fac = w.current_facility
    const iqStat = wDateStatus(w.iqama_expiry_date)
    const workerLabel = w.name_ar || w.name_en || T('بيانات العامل','Worker Info')
    const facilityLabel = fac?.name_ar || fac?.name_en || T('بيانات المنشأة','Facility Info')
    return (
      <>
        <div style={{ position: 'relative', border: '1px solid rgba(212,160,23,.4)', background: 'linear-gradient(135deg,rgba(212,160,23,.12),rgba(255,255,255,.02))', boxShadow: 'var(--shadow-md)', padding: 14, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => { setSelected(null) }} title={T('تغيير العامل','Change worker')}
            style={{ position: 'absolute', top: 8, left: 8, width: 28, height: 28, borderRadius: 8, background: 'rgba(192,57,43,.12)', border: '1px solid rgba(192,57,43,.35)', color: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2, transition: '.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(192,57,43,.22)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(192,57,43,.12)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          {flagEl(w, 48)}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15.5, fontWeight: 600, color: C.gold, letterSpacing: '-.2px' }}>{nm}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 600, color: C.gold, background: 'rgba(212,160,23,.12)', border: '1px solid rgba(212,160,23,.3)', borderRadius: 20, padding: '2px 8px' }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>{T('محدد','Selected')}
              </span>
              {w.worker_type === 'temporary' && <span style={{ fontSize: 9.5, fontWeight: 600, color: '#5dade2', background: 'rgba(93,173,226,.12)', border: '1px solid rgba(93,173,226,.3)', borderRadius: 20, padding: '2px 8px' }}>{T('مؤقت','Temporary')}</span>}
            </div>
            {w.name_en && nm !== w.name_en && <span style={{ fontSize: 11, color: 'var(--tx5)', fontWeight: 600, direction: 'ltr', opacity: .7 }}>{w.name_en}</span>}
          </div>
        </div>
        {/* إطار بيانات العامل */}
        <Fieldset label={workerLabel}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr 1fr', gap: 10 }}>
            <div style={pillBase}>
              <CreditCard size={12} color={C.gold} strokeWidth={1.8} style={{ flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 0 }}><span style={pLbl}>{T('رقم الإقامة','Iqama No')}</span><span style={pVal}>{w.iqama_number || '—'}</span></div>
              {w.iqama_number && <CopyBtn text={w.iqama_number} />}
            </div>
            <div style={pillBase}>
              <Briefcase size={12} color={C.gold} strokeWidth={1.8} style={{ flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}><span style={pLbl}>{T('المهنة','Occupation')}</span><span style={{ ...pVal, fontFamily: F, direction: 'rtl', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.current_occupation?.name_ar || '—'}</span></div>
            </div>
            <div style={pillBase}>
              <Calendar size={12} color={WST[iqStat]} strokeWidth={1.8} style={{ flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}><span style={pLbl}>{T('انتهاء الإقامة','Iqama Expiry')}</span><span style={{ ...pVal, color: WST[iqStat] }}>{fmtWDate(w.iqama_expiry_date)}</span></div>
            </div>
            <div style={pillBase}>
              <BadgeCheck size={12} color={WST.none} strokeWidth={1.8} style={{ flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}><span style={pLbl}>{T('رخصة العمل','Work Permit')}</span><span style={{ ...pVal, color: WST.none }}>—</span></div>
            </div>
          </div>
        </Fieldset>
        {/* إطار بيانات المنشأة — تتبع العامل تلقائياً */}
        <Fieldset label={facilityLabel}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div style={pillBase}>
              <Hash size={12} color={C.gold} strokeWidth={1.8} style={{ flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 0 }}><span style={pLbl}>{T('الرقم الموحد','Unified No')}</span><span style={{ ...pVal, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fac?.unified_number || '—'}</span></div>
              {fac?.unified_number && <CopyBtn text={fac.unified_number} />}
            </div>
            <div style={pillBase}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 0 }}><span style={pLbl}>{T('رقم الموارد البشرية','HRSD No')}</span><span style={{ ...pVal, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fac?.hrsd_number || '—'}</span></div>
              {fac?.hrsd_number && <CopyBtn text={fac.hrsd_number} />}
            </div>
            <div style={pillBase}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"/></svg>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 0 }}><span style={pLbl}>{T('رقم التأمينات','GOSI No')}</span><span style={{ ...pVal, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fac?.gosi_number || '—'}</span></div>
              {fac?.gosi_number && <CopyBtn text={fac.gosi_number} />}
            </div>
          </div>
          {!fac && <div style={{ marginTop: 4, fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, textAlign: 'center' }}>{T('لا توجد منشأة مرتبطة بهذا العامل','No facility linked to this worker')}</div>}
        </Fieldset>
      </>
    )
  }
  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: F, height: '100%', minHeight: 0 }}>
      <ModalSection Icon={User} flex bodyStyle={{ gap: 10 }} style={{ marginTop: 6 }}
        label={T('العامل','Worker')} hint={T('المنشأة تتبع العامل تلقائياً','Facility follows the worker')}>
        {!selected && (
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', color: 'var(--tx4)', pointerEvents: 'none', display: 'inline-flex' }}>
              <Search size={16} strokeWidth={2} />
            </span>
            <input type="text" value={q} onChange={e => setQ(e.target.value)} autoFocus
              placeholder={T('ابحث بالاسم أو رقم الإقامة…','Search by name or Iqama…')}
              style={{ width: '100%', height: 42, padding: '0 14px 0 40px', borderRadius: 10, background: 'var(--inputBg)', border: '1px solid var(--bd)', color: 'var(--tx1)', fontFamily: F, fontSize: 12.5, outline: 'none', boxSizing: 'border-box', textAlign: 'right' }} />
          </div>
        )}
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          <style>{`.wk-results::-webkit-scrollbar{width:0;display:none}`}</style>
          <div className="wk-results" style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', paddingInline: 2, scrollbarWidth: 'none' }}>
            {selected ? <SelectedView /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {q.trim().length < 2 && <div style={{ padding: '16px', fontSize: 11.5, color: 'var(--tx5)', textAlign: 'center' }}>{T('اكتب حرفين على الأقل للبحث…','Type at least two characters…')}</div>}
                {q.trim().length >= 2 && searching && <div style={{ padding: '16px', fontSize: 12, color: 'var(--tx4)', textAlign: 'center' }}>{T('جارٍ البحث…','Searching…')}</div>}
                {q.trim().length >= 2 && !searching && results.length === 0 && <div style={{ padding: 14, borderRadius: 10, background: 'rgba(212,160,23,.05)', border: '1px dashed rgba(212,160,23,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}><div style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600 }}>{T('لا يوجد عامل بهذا البحث','No worker matches this search')}</div></div>}
                {!searching && results.map(w => <WkResult key={w.id} w={w} />)}
              </div>
            )}
          </div>
        </div>
      </ModalSection>
    </div>
  )
  return (
    <Modal open onClose={onClose} title={T('تغيير العامل','Change worker')} Icon={User} width={620} accent={C.gold}
      success={done ? <SuccessView title={T('تم تغيير العامل','Worker changed')} /> : undefined}
      pages={[{ valid: !!selected && !sameAsCurrent, error: err || (sameAsCurrent ? T('هذا هو العامل الحالي — اختر عاملاً مختلفاً لتأكيد التغيير', 'This is the current worker — pick a different one to confirm the change') : undefined), content }]}
      onSubmit={confirm} submitting={saving} submitIcon={CheckCircle2} submitLabel={T('تأكيد تغيير العامل','Confirm worker change')} />
  )
}

// تعديل بيانات العميل من داخل الفاتورة — الاسم/الهوية/الجوال/الجنسية، تُحفظ على جدول clients.
// (المكتب يُعدَّل من صفحة العملاء.) يتبع نفس فورمات FormKit ونمط الحفظ الموحّد.
function ClientEditModal({ sb, toast, T, client, workerIsClient = false, linkedWorkerId = null, editorId, editorName, invId, onClose, onSaved, user }) {
  // Per-field permission gates (invoices tab). A hidden field is not rendered and never blocks submit.
  const visName = fieldVisible(user, 'invoices', 'client_name')
  const visNat = fieldVisible(user, 'invoices', 'client_nationality')
  const visId = fieldVisible(user, 'invoices', 'client_id_number')
  const visPhone = fieldVisible(user, 'invoices', 'client_phone')
  const init = {
    name_ar: client?.name_ar || client?.name_en || '',
    id_number: client?.id_number || '',
    phone: String(client?.phone || '').replace(/^\+?966/, '').replace(/^0/, '').replace(/\D/g, '').slice(0, 9),
    nationality_id: client?.nationality_id || '',
  }
  const [f, setF] = useState(init)
  // نبذر القائمة بجنسية العميل الحالية لتظهر فوراً، ثم نستبدلها بالقائمة الكاملة عند وصولها (تفادياً للتأخّر).
  const [nats, setNats] = useState(() => (client?.nationality_id && client?.nationality
    ? [{ id: client.nationality_id, name_ar: client.nationality.name_ar, name_en: client.nationality.name_en || client.nationality.name_ar }]
    : []))
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => { setErr(''); setF(p => ({ ...p, [k]: v })) }
  // قائمة الجنسيات — نفس مصدر صفحة العملاء.
  useEffect(() => {
    sb.from('nationalities').select('id,name_ar,name_en').eq('is_active', true).order('name_ar')
      .then(({ data }) => setNats(data || []))
  }, [])
  const idDigits = (f.id_number || '').replace(/\D/g, '')
  const phoneDigits = (f.phone || '').replace(/\D/g, '')
  // «العميل هو نفس العامل»: العميل والعامل شخص واحد — نقفل الاسم والجنسية والهوية (هي بيانات العامل
  // نفسها) ونسمح بتعديل رقم الجوال فقط.
  const lock = !!workerIsClient
  // زر التعديل يُفعَّل فقط عند وجود تغيير فعلي عن القيم الأصلية (إضافةً لصحّة الحقول).
  const norm = s => String(s ?? '').replace(/\D/g, '')
  const phoneDirty = norm(f.phone) !== norm(init.phone)
  const dirty = lock ? phoneDirty
    : (f.name_ar.trim() !== init.name_ar.trim() || norm(f.id_number) !== norm(init.id_number) || phoneDirty || String(f.nationality_id || '') !== String(init.nationality_id || ''))
  // Hidden field ⇒ treated as already-valid so it cannot block submit (mirrors other pages).
  const okName = !visName || !!f.name_ar.trim()
  const okId = !visId || idDigits.length === 10
  const okPhone = !visPhone || phoneDigits.length === 9
  const okNat = !visNat || !!f.nationality_id
  const valid = lock
    ? (okPhone && dirty)
    : (!!(okName && okId && okPhone && okNat) && dirty)
  const save = async () => {
    if (saving || !client?.id || !valid) return
    setErr(''); setSaving(true)
    try {
      const nowIso = new Date().toISOString()
      const next = { name_ar: f.name_ar.trim(), id_number: idDigits, phone: phoneDigits ? '966' + phoneDigits : '', nationality_id: f.nationality_id }
      // سجلّ التعديل — يُلحق بحقل edit_log (jsonb): من عدّل، متى، وما الذي تغيّر. نقرأ السجل الحالي أولاً لتفادي الكتابة فوق تعديلات متزامنة.
      const changes = clientEditChanges(client, next, nats)
      let editLog
      if (changes.length) {
        const { data: cur } = await sb.from('clients').select('edit_log').eq('id', client.id).maybeSingle()
        const log = Array.isArray(cur?.edit_log) ? cur.edit_log : []
        // inv = الفاتورة التي تمّ التعديل منها — ليُعرض السجل في فاتورته فقط لا في كل فواتير العميل.
        editLog = [...log, { at: nowIso, by: editorId || null, by_name: editorName || null, inv: invId || null, changes }]
      }
      const patch = {
        name_ar: next.name_ar || null,
        id_number: next.id_number || null,
        phone: next.phone || null,
        nationality_id: next.nationality_id || null,
        updated_by: editorId || null,
        updated_at: nowIso,
      }
      if (editLog) patch.edit_log = editLog
      const { data, error } = await sb.from('clients').update(patch).eq('id', client.id).select()
      if (error) throw error
      if (!(data || []).length) { setErr(T('لم يتم الحفظ — صلاحية غير كافية','Not saved — insufficient permission')); setSaving(false); return }
      // قيد رقم الجوال ضمن «أرقام جوال الفواتير» للعامل المرتبط بالفاتورة — إضافة تلقائية مع تفادي
      // التكرار. أفضل جهد: فشلها لا يُفشل حفظ بيانات العميل.
      if (linkedWorkerId && next.phone) {
        try {
          const { data: wRow } = await sb.from('workers').select('billing_mobiles').eq('id', linkedWorkerId).maybeSingle()
          const cur = Array.isArray(wRow?.billing_mobiles) ? wRow.billing_mobiles : []
          const last9 = s => String(s || '').replace(/\D/g, '').slice(-9)
          if (!cur.some(x => last9(x) === last9(next.phone))) {
            await sb.from('workers').update({ billing_mobiles: [...cur, next.phone] }).eq('id', linkedWorkerId)
          }
        } catch { /* تجاهل — قيد الجوال إضافي */ }
      }
      onSaved?.(); setDone(true)
    } catch { setErr(T('تعذر الحفظ','Save failed')) }
    finally { setSaving(false) }
  }
  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: F }}>
      {lock && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px', borderRadius: 10, background: 'rgba(212,160,23,.08)', border: '1px solid rgba(212,160,23,.28)', color: C.goldSoft, fontSize: 11.5, fontWeight: 600, fontFamily: F }}>
          <Link2 size={14} strokeWidth={2.2} style={{ flexShrink: 0 }} />
          <span>{T('العميل هو نفس العامل — يمكن تعديل رقم الجوال فقط، وبقية البيانات تتبع سجل العامل.','Client is the worker — only the phone can be edited; the rest follows the worker record.')}</span>
        </div>
      )}
      <ModalSection Icon={User} label={T('بيانات العميل','Client Details')} style={{ marginTop: 6 }}>
        <div style={GRID}>
          {visName && <TextField label={T('الاسم','Name')} req value={f.name_ar} onChange={v => set('name_ar', v)} placeholder={T('اسم العميل','Client name')} disabled={lock || !fieldEditable(user, 'invoices', 'client_name')} />}
          {visNat && <FKSelect label={T('الجنسية','Nationality')} req value={f.nationality_id} onChange={v => set('nationality_id', v)} placeholder={T('— اختر —','— Select —')}
            options={nats} getKey={n => n.id} getLabel={n => T(n.name_ar, n.name_en || n.name_ar)} disabled={lock || !fieldEditable(user, 'invoices', 'client_nationality')} />}
          {visId && <IdField label={T('رقم الهوية','ID Number')} req value={f.id_number} onChange={v => set('id_number', v)} placeholder="0000000000" disabled={lock || !fieldEditable(user, 'invoices', 'client_id_number')} />}
          {visPhone && <PhoneField label={T('رقم الجوال','Phone')} req value={f.phone} onChange={v => set('phone', v)} disabled={!fieldEditable(user, 'invoices', 'client_phone')} />}
        </div>
      </ModalSection>
    </div>
  )
  return (
    <Modal open onClose={onClose} title={T('تعديل بيانات العميل','Edit client')} Icon={User} width={560} height="auto" accent={C.gold}
      success={done ? <SuccessView title={T('تم حفظ التعديلات','Changes saved')} /> : undefined}
      pages={[{ valid, error: err || undefined, content }]}
      onSubmit={save} submitting={saving} submitIcon={CheckCircle2} submitLabel={T('تعديل بيانات العميل','Edit client details')} />
  )
}

// تعديل بيانات الوسيط من داخل الفاتورة — الاسم/الهوية/الجوال/الجنسية، تُحفظ على جدول agents.
// (المكتب والعمولة يُعدَّلان من صفحة الوسطاء.) يتبع نفس فورمات FormKit ونمط حفظ ClientEditModal.
function AgentEditModal({ sb, toast, T, agent, editorId, editorName, invId, onClose, onSaved, user }) {
  const visName = fieldVisible(user, 'invoices', 'agent_name')
  const visNat = fieldVisible(user, 'invoices', 'agent_nationality')
  const visId = fieldVisible(user, 'invoices', 'agent_id_number')
  const visPhone = fieldVisible(user, 'invoices', 'agent_phone')
  const init = {
    name_ar: agent?.name_ar || agent?.name_en || '',
    id_number: agent?.id_number || '',
    phone: String(agent?.phone || '').replace(/^\+?966/, '').replace(/^0/, '').replace(/\D/g, '').slice(0, 9),
    nationality_id: agent?.nationality_id || '',
  }
  const [f, setF] = useState(init)
  // نبذر القائمة بجنسية الوسيط الحالية لتظهر فوراً، ثم نستبدلها بالقائمة الكاملة عند وصولها.
  const [nats, setNats] = useState(() => (agent?.nationality_id && agent?.nationality
    ? [{ id: agent.nationality_id, name_ar: agent.nationality.name_ar, name_en: agent.nationality.name_en || agent.nationality.name_ar }]
    : []))
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => { setErr(''); setF(p => ({ ...p, [k]: v })) }
  useEffect(() => {
    sb.from('nationalities').select('id,name_ar,name_en').eq('is_active', true).order('name_ar')
      .then(({ data }) => setNats(data || []))
  }, [])
  const idDigits = (f.id_number || '').replace(/\D/g, '')
  const phoneDigits = (f.phone || '').replace(/\D/g, '')
  // زر الحفظ يُفعَّل فقط عند تغيير فعلي عن القيم الأصلية (إضافةً لصحّة الحقول).
  const norm = s => String(s ?? '').replace(/\D/g, '')
  const dirty = f.name_ar.trim() !== init.name_ar.trim() || norm(f.id_number) !== norm(init.id_number)
    || norm(f.phone) !== norm(init.phone) || String(f.nationality_id || '') !== String(init.nationality_id || '')
  // Hidden field ⇒ treated as already-valid so it cannot block submit.
  const okName = !visName || !!f.name_ar.trim()
  const okId = !visId || idDigits.length === 10
  const okPhone = !visPhone || phoneDigits.length === 9
  const okNat = !visNat || !!f.nationality_id
  const valid = !!(okName && okId && okPhone && okNat) && dirty
  const save = async () => {
    if (saving || !agent?.id || !valid) return
    setErr(''); setSaving(true)
    try {
      const nowIso = new Date().toISOString()
      const next = { name_ar: f.name_ar.trim(), id_number: idDigits, phone: phoneDigits ? '966' + phoneDigits : '', nationality_id: f.nationality_id }
      // سجلّ التعديل — يُلحق بحقل edit_log (jsonb): من عدّل، متى، وما الذي تغيّر. نقرأ الحالي أولاً تفادياً للكتابة فوق تعديلات متزامنة.
      const changes = clientEditChanges(agent, next, nats)
      let editLog
      if (changes.length) {
        const { data: cur } = await sb.from('agents').select('edit_log').eq('id', agent.id).maybeSingle()
        const log = Array.isArray(cur?.edit_log) ? cur.edit_log : []
        editLog = [...log, { at: nowIso, by: editorId || null, by_name: editorName || null, inv: invId || null, changes }]
      }
      const patch = {
        name_ar: next.name_ar || null,
        id_number: next.id_number || null,
        phone: next.phone || null,
        nationality_id: next.nationality_id || null,
        updated_by: editorId || null,
        updated_at: nowIso,
      }
      if (editLog) patch.edit_log = editLog
      const { data, error } = await sb.from('agents').update(patch).eq('id', agent.id).select()
      if (error) throw error
      if (!(data || []).length) { setErr(T('لم يتم الحفظ — صلاحية غير كافية','Not saved — insufficient permission')); setSaving(false); return }
      onSaved?.(); setDone(true)
    } catch { setErr(T('تعذر الحفظ','Save failed')) }
    finally { setSaving(false) }
  }
  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: F }}>
      <ModalSection Icon={User} label={T('بيانات الوسيط','Agent Details')} style={{ marginTop: 6 }}>
        <div style={GRID}>
          {visName && <TextField label={T('الاسم','Name')} req value={f.name_ar} onChange={v => set('name_ar', v)} placeholder={T('اسم الوسيط','Agent name')} disabled={!fieldEditable(user, 'invoices', 'agent_name')} />}
          {visNat && <FKSelect label={T('الجنسية','Nationality')} req value={f.nationality_id} onChange={v => set('nationality_id', v)} placeholder={T('— اختر —','— Select —')}
            options={nats} getKey={n => n.id} getLabel={n => T(n.name_ar, n.name_en || n.name_ar)} disabled={!fieldEditable(user, 'invoices', 'agent_nationality')} />}
          {visId && <IdField label={T('رقم الهوية','ID Number')} req value={f.id_number} onChange={v => set('id_number', v)} placeholder="0000000000" disabled={!fieldEditable(user, 'invoices', 'agent_id_number')} />}
          {visPhone && <PhoneField label={T('رقم الجوال','Phone')} req value={f.phone} onChange={v => set('phone', v)} disabled={!fieldEditable(user, 'invoices', 'agent_phone')} />}
        </div>
      </ModalSection>
    </div>
  )
  return (
    <Modal open onClose={onClose} title={T('تعديل بيانات الوسيط','Edit agent')} Icon={User} width={560} height="auto" accent={C.gold}
      success={done ? <SuccessView title={T('تم حفظ التعديلات','Changes saved')} /> : undefined}
      pages={[{ valid, error: err || undefined, content }]}
      onSubmit={save} submitting={saving} submitIcon={CheckCircle2} submitLabel={T('تعديل بيانات الوسيط','Edit agent details')} />
  )
}

// تعديل تفاصيل الخدمة — نافذة بنفس تفاصيل بطاقة «الخدمة» في الفاتورة.
// • الخدمات العامة: المكتب + الوصف (المخزَّن في other_applications.description).
// • خدمة الغرفة التجارية (code 'other'): نفس حقول نافذة الإنشاء — نوع التصديق + رقم جوال العامل +
//   ملف المطبوعات / نص الطلب — بالإضافة إلى المكتب، بدل خانة الوصف.
function ServiceEditModal({ sb, toast, T, isAr, srId, invId, svcName, svcCode, currentDescription, currentBranchId, currentDetails, currentWorkerPhone, editorId, editorName, onClose, onSaved, user }) {
  const isChamber = svcCode === 'other'
  const visOffice = fieldVisible(user, 'invoices', 'service_office')
  const editOffice = fieldEditable(user, 'invoices', 'service_office')
  const visDesc = fieldVisible(user, 'invoices', 'service_description')
  const editDesc = fieldEditable(user, 'invoices', 'service_description')
  const visChamberText = fieldVisible(user, 'invoices', 'service_chamber_text')
  const editChamberText = fieldEditable(user, 'invoices', 'service_chamber_text')
  const det0 = (currentDetails && typeof currentDetails === 'object') ? currentDetails : {}
  const [desc, setDesc] = useState(currentDescription || '')
  const [branchId, setBranchId] = useState(currentBranchId || '')
  const [branches, setBranches] = useState([])
  // حقول الغرفة التجارية
  const [subtype, setSubtype] = useState(det0.chamber_subtype || 'printed')
  const [chamberText, setChamberText] = useState(det0.chamber_text || '')
  const [chamberFile, setChamberFile] = useState(null) // ملف جديد لاستبدال المرفق الحالي
  const existingFile = det0.chamber_file || null
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  // قائمة المكاتب — نفس مصدر فلتر الفواتير (الجدول يحمل branch_code فقط، بلا أسماء).
  useEffect(() => {
    sb.from('branches').select('id,branch_code').order('branch_code')
      .then(({ data }) => setBranches(data || []))
  }, [])
  // زر الحفظ يُفعَّل فقط عند وجود تعديل فعلي.
  const branchChanged = String(branchId || '') !== String(currentBranchId || '')
  const chamberDirty = isChamber && (
    subtype !== (det0.chamber_subtype || 'printed') ||
    (subtype === 'open_request' && chamberText.trim() !== (det0.chamber_text || '').trim()) ||
    (subtype === 'printed' && !!chamberFile)
  )
  const dirty = isChamber ? (chamberDirty || branchChanged) : ((desc.trim() !== (currentDescription || '').trim()) || branchChanged)
  const save = async () => {
    if (saving || !srId || !dirty) return
    setErr(''); setSaving(true)
    try {
      const nowIso = new Date().toISOString()
      const codeOf = id => branches.find(b => b.id === id)?.branch_code || null
      // اقرأ الصفّ الحالي لإلحاق السجلّ (details.service_changes) دون الكتابة فوق قيم متزامنة.
      const { data: rows } = await sb.from('other_applications').select('id,details,worker_phone,description').eq('service_request_id', srId).is('deleted_at', null)
      const cur = rows?.[0] || {}
      const det = (cur.details && typeof cur.details === 'object') ? cur.details : {}
      const log = Array.isArray(det.service_changes) ? det.service_changes : []
      const changes = []
      const patch = { updated_by: editorId || null, updated_at: nowIso }
      let nextDetails = { ...det }
      if (isChamber) {
        if (subtype !== (det.chamber_subtype || 'printed')) changes.push({ field: 'chamber_subtype', from: det.chamber_subtype || null, to: subtype })
        nextDetails.chamber_subtype = subtype
        if (subtype === 'open_request') {
          const t = chamberText.trim()
          if (t !== (det.chamber_text || '').trim()) changes.push({ field: 'chamber_text', from: det.chamber_text || null, to: t || null })
          nextDetails.chamber_text = t || null
          // نُبقي ملف المطبوعات المرفق سابقاً كما هو — لا نحذفه عند التحويل لطلب مفتوح، ليبقى ظاهراً في بطاقة الخدمة.
        } else {
          // تصديق مطبوعات — ارفع ملفاً جديداً إن اختير، وإلا أبقِ الملف الحالي.
          let fileRef = existingFile
          if (chamberFile) {
            const safe = String(chamberFile.name || 'file').replace(/[^\w.\-]+/g, '_')
            const path = `chamber/${srId}/${Date.now()}-${safe}`
            const { error: upErr } = await sb.storage.from('attachments').upload(path, chamberFile, { cacheControl: '3600', upsert: false })
            if (upErr) throw upErr
            const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
            fileRef = { name: chamberFile.name || safe, path, url: pub?.publicUrl || path, mime: chamberFile.type || null, size: chamberFile.size || null }
            // نخزّن الاسم والرابط معاً في السجل ليكون كل ملف (السابق والجديد) قابلاً للفتح بالنقر.
            changes.push({ field: 'chamber_file', from: existingFile ? { name: existingFile.name || null, url: existingFile.url || null } : null, to: { name: fileRef.name || null, url: fileRef.url || null } })
          }
          if (fileRef) nextDetails.chamber_file = fileRef
          delete nextDetails.chamber_text
        }
      } else {
        const newDesc = desc.trim()
        if (newDesc !== (currentDescription || '').trim()) changes.push({ field: 'description', from: (currentDescription || '').trim() || null, to: newDesc || null })
        patch.description = newDesc || null
      }
      if (branchChanged) changes.push({ field: 'office', from: codeOf(currentBranchId), to: codeOf(branchId) })
      if (changes.length) nextDetails.service_changes = [...log, { at: nowIso, by: editorId || null, by_name: editorName || null, changes }]
      patch.details = nextDetails
      const { error } = await sb.from('other_applications').update(patch).eq('service_request_id', srId).is('deleted_at', null)
      if (error) throw error
      // مزامنة مسمّى سطر التسعير مع نوع التصديق عند تغييره — حتى لا يبقى «تصديق طلب مفتوح» بعد التحويل
      // إلى «تصديق مطبوعات» (والعكس). نطابق فقط الأسطر بالمسمّى القياسي للغرفة كي لا نطمس تسعيرة معدّلة يدوياً.
      if (isChamber && invId && subtype !== (det.chamber_subtype || 'printed')) {
        const CHAMBER_LBL = { printed: 'تصديق المطبوعات', open_request: 'تصديق طلب مفتوح' }
        const known = new Set([...Object.values(CHAMBER_LBL), 'الغرفة التجارية'])
        const newLbl = CHAMBER_LBL[subtype] || 'الغرفة التجارية'
        const { data: invRow } = await sb.from('invoices').select('pricing_breakdown').eq('id', invId).maybeSingle()
        const bd = Array.isArray(invRow?.pricing_breakdown) ? invRow.pricing_breakdown : []
        let touched = false
        const nextBd = bd.map(l => {
          const cur = String(l?.label || '').trim()
          if (known.has(cur) && cur !== newLbl) { touched = true; return { ...l, label: newLbl } }
          return l
        })
        if (touched) { const { error: eb } = await sb.from('invoices').update({ pricing_breakdown: nextBd }).eq('id', invId); if (eb) throw eb }
      }
      // المكتب — يُحدَّث على الفاتورة وطلب الخدمة معاً للحفاظ على التطابق (كرت «المكتب» يقرأ من الفاتورة).
      if (branchChanged) {
        const bid = branchId || null
        if (invId) { const { error: e1 } = await sb.from('invoices').update({ branch_id: bid }).eq('id', invId); if (e1) throw e1 }
        const { error: e2 } = await sb.from('service_requests').update({ branch_id: bid }).eq('id', srId); if (e2) throw e2
      }
      onSaved?.(); setDone(true)
    } catch { setErr(T('تعذر الحفظ','Save failed')) }
    finally { setSaving(false) }
  }
  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: F, flex: 1, minHeight: 0 }}>
      <ModalSection flex Icon={FileText} label={T('تفاصيل الخدمة','Service Details')} style={{ marginTop: 6 }}>
        <div style={GRID}>
          {visOffice && <FKSelect full label={T('المكتب','Office')} value={branchId} onChange={v => { setErr(''); setBranchId(v) }} placeholder={T('— اختر —','— Select —')}
            options={branches} getKey={b => b.id} getLabel={b => b.branch_code || '—'} disabled={!editOffice} />}
          {isChamber ? (
            <>
              <Segmented full height={64} label={T('نوع التصديق','Certification Type')} value={subtype} onChange={v => { setErr(''); setSubtype(v) }}
                options={[{ v: 'printed', l: T('تصديق مطبوعات','Printed'), sub: T('يرفق ملف المطبوعات','attach printout') }, { v: 'open_request', l: T('طلب مفتوح','Open request'), sub: T('يكتب نص الطلب','write request text') }]} />
              {subtype === 'open_request' ? (
                visChamberText && (
                  <div style={{ ...FULL, ...(editChamberText ? {} : { opacity: .55, pointerEvents: 'none' }) }}>
                    <TextArea full rows={4} label={T('نص الطلب','Request text')} value={chamberText} onChange={v => { if (!editChamberText) return; setErr(''); setChamberText(v) }} placeholder={T('اكتب نص الطلب…','Write the request…')} />
                  </div>
                )
              ) : (
                <FileField full label={existingFile ? T('استبدال ملف المطبوعات','Replace printout file') : T('ملف المطبوعات','Printout file')}
                  value={chamberFile} onChange={f => { setErr(''); setChamberFile(f) }} />
              )}
              {/* الملف المرفق حالياً — يظهر في كلا النوعين كي لا يضيع، مع رابط لفتحه. */}
              {existingFile?.url && (
                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', borderRadius: 9, background: 'rgba(212,160,23,.06)', border: '1px solid rgba(212,160,23,.22)' }}>
                  <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, flexShrink: 0 }}>{T('الملف المرفق حالياً','Current attached file')}:</span>
                  <a href={existingFile.url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: C.gold, fontSize: 12, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, direction: 'rtl', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{existingFile.name || T('عرض الملف','View file')}</span>
                  </a>
                </div>
              )}
            </>
          ) : (
            visDesc && (
              <div style={{ ...FULL, ...(editDesc ? {} : { opacity: .55, pointerEvents: 'none' }) }}>
                <TextArea full rows={4} label={T('الوصف','Description')}
                  value={desc} onChange={v => { if (!editDesc) return; setErr(''); setDesc(v) }} placeholder={T('وصف الخدمة لهذا الطلب…','Service description for this request…')} />
              </div>
            )
          )}
        </div>
      </ModalSection>
    </div>
  )
  return (
    <Modal open onClose={onClose} title={T('تعديل تفاصيل الخدمة','Edit service details')} Icon={FileText} width={560} height={540} accent={C.gold}
      success={done ? <SuccessView title={T('تم حفظ التعديلات','Changes saved')} /> : undefined}
      pages={[{ valid: dirty, error: err || undefined, content }]}
      onSubmit={save} submitting={saving} submitIcon={CheckCircle2} submitLabel={T('تعديل تفاصيل الخدمة','Edit service details')} />
  )
}

// تعديل المكتب فقط — للخدمات ذات الجداول المخصّصة (نقل/أجير/تجديد/إصدار إقامة) التي لا تستخدم
// نافذة «تعديل تفاصيل الخدمة» (تلك تكتب في other_applications). يُحدَّث المكتب على الفاتورة وطلب
// الخدمة معاً (كرت «المكتب» يقرأ من الفاتورة)، ويُلحق التغيير بسجلّ invoices.service_log.
function OfficeEditModal({ sb, toast, T, srId, invId, currentBranchId, editorId, editorName, onClose, onSaved, user }) {
  const editOffice = fieldEditable(user, 'invoices', 'service_office')
  const [branchId, setBranchId] = useState(currentBranchId || '')
  const [branches, setBranches] = useState([])
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  // قائمة المكاتب — نفس مصدر فلتر الفواتير (الجدول يحمل branch_code فقط، بلا أسماء).
  useEffect(() => {
    sb.from('branches').select('id,branch_code').order('branch_code')
      .then(({ data }) => setBranches(data || []))
  }, [])
  const branchChanged = String(branchId || '') !== String(currentBranchId || '')
  const save = async () => {
    if (saving || !invId || !srId || !branchChanged) return
    setErr(''); setSaving(true)
    try {
      const nowIso = new Date().toISOString()
      const codeOf = id => branches.find(b => b.id === id)?.branch_code || null
      const bid = branchId || null
      // اقرأ السجلّ الحالي لإلحاق القيد دون الكتابة فوق قيم متزامنة.
      const { data: invRow } = await sb.from('invoices').select('service_log').eq('id', invId).maybeSingle()
      const log = Array.isArray(invRow?.service_log) ? invRow.service_log : []
      const entry = { at: nowIso, by: editorId || null, by_name: editorName || null, changes: [{ field: 'office', from: codeOf(currentBranchId), to: codeOf(bid) }] }
      const { error: e1 } = await sb.from('invoices').update({ branch_id: bid, service_log: [...log, entry] }).eq('id', invId); if (e1) throw e1
      const { error: e2 } = await sb.from('service_requests').update({ branch_id: bid }).eq('id', srId); if (e2) throw e2
      onSaved?.(); setDone(true)
    } catch { setErr(T('تعذر الحفظ','Save failed')) }
    finally { setSaving(false) }
  }
  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: F, flex: 1, minHeight: 0 }}>
      <ModalSection flex Icon={FileText} label={T('المكتب','Office')} style={{ marginTop: 6 }}>
        <div style={GRID}>
          <FKSelect full label={T('المكتب','Office')} value={branchId} onChange={v => { setErr(''); setBranchId(v) }} placeholder={T('— اختر —','— Select —')}
            options={branches} getKey={b => b.id} getLabel={b => b.branch_code || '—'} disabled={!editOffice} />
        </div>
      </ModalSection>
    </div>
  )
  return (
    <Modal open onClose={onClose} title={T('تعديل المكتب','Edit office')} Icon={FileText} width={520} height={380} accent={C.gold}
      success={done ? <SuccessView title={T('تم حفظ التعديلات','Changes saved')} /> : undefined}
      pages={[{ valid: branchChanged, error: err || undefined, content }]}
      onSubmit={save} submitting={saving} submitIcon={CheckCircle2} submitLabel={T('تعديل المكتب','Edit office')} />
  )
}

// يعيد اشتقاق حالة الفاتورة (نشطة ↔ مدفوعة بالكامل) من المبالغ بعد أي تعديل، تماماً كما
// يفعل تسجيل الدفعة/الاسترجاع. يتجاهل الفواتير الملغاة. يُرجع جزء التحديث (status_id).
const invoiceStatusPatch = async (sb, statusCode, paid, total) => {
  if (statusCode === 'cancelled') return {}
  const { data } = await sb.from('lookup_items')
    .select('id,code,category:lookup_categories!inner(category_key)')
    .eq('category.category_key', 'invoice_status')
  const map = {}; (data || []).forEach(r => { map[r.code] = r.id })
  const want = (total > 0 && paid >= total - 0.005) ? 'fully_paid' : 'active'
  return map[want] ? { status_id: map[want] } : {}
}

// تعديل ملاحظات الفاتورة — العامة (تظهر في الطباعة) والخاصة (داخلية). تُحفظ على invoices.
function NoteEditModal({ sb, toast, T, inv, editorId, editorName, onClose, onSaved, user }) {
  const visNote = fieldVisible(user, 'invoices', 'note_public')
  const editNote = fieldEditable(user, 'invoices', 'note_public')
  const [pub, setPub] = useState(inv?.note_public || '')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  // زر الحفظ يُفعَّل فقط عند وجود تعديل فعلي على الملاحظة.
  const dirty = pub.trim() !== (inv?.note_public || '').trim()
  const save = async () => {
    if (saving || !inv?.id || !dirty) return
    setErr(''); setSaving(true)
    try {
      const nowIso = new Date().toISOString()
      const newPub = pub.trim()
      // سجلّ تعديل الملاحظة — يُلحق بحقل note_log (jsonb): من عدّل، متى، وما الذي تغيّر. نقرأ السجلّ الحالي أولاً.
      const { data: cur } = await sb.from('invoices').select('note_log').eq('id', inv.id).maybeSingle()
      const log = Array.isArray(cur?.note_log) ? cur.note_log : []
      const entry = { at: nowIso, by: editorId || null, by_name: editorName || null,
        changes: [{ field: 'note', from: (inv?.note_public || '').trim() || null, to: newPub || null }] }
      const { error } = await sb.from('invoices')
        .update({ note_public: newPub || null, note_log: [...log, entry], last_activity_at: nowIso })
        .eq('id', inv.id)
      if (error) throw error
      onSaved?.(); setDone(true)
    } catch { setErr(T('تعذر الحفظ','Save failed')) }
    finally { setSaving(false) }
  }
  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: F }}>
      <ModalSection Icon={FileText} label={T('ملاحظة','Note')} style={{ marginTop: 6 }}>
        <div style={GRID}>
          {visNote && (
            <div style={{ ...FULL, ...(editNote ? {} : { opacity: .55, pointerEvents: 'none' }) }}>
              <TextArea full rows={4} label={T('ملاحظة الفاتورة','Invoice Note')} hint={T('تظهر في الطباعة','shown on print')}
                value={pub} onChange={v => { if (!editNote) return; setErr(''); setPub(v) }} placeholder={T('ملاحظة تظهر للعميل…','Note visible to the client…')} />
            </div>
          )}
        </div>
      </ModalSection>
    </div>
  )
  return (
    <Modal open onClose={onClose} title={T('تعديل الملاحظة','Edit note')} Icon={FileText} width={560} height="auto" accent={C.gold}
      success={done ? <SuccessView title={T('تم حفظ التعديلات','Changes saved')} /> : undefined}
      pages={[{ valid: dirty, error: err || undefined, content }]}
      onSubmit={save} submitting={saving} submitIcon={CheckCircle2} submitLabel={T('حفظ الملاحظة','Save note')} />
  )
}

// قيمة طويلة تُقصَّ بثبات في مكانها (بلا تلميح متصفّح خارج النافذة)، وعند مرور الفأرة تنزلق أفقياً
// في نفس الموضع لتكشف النص كاملاً ثم تعود — تلاشٍ خفيف عند الحافة يُشير إلى وجود بقية مخفية.
const MarqueeValue = ({ value, ltr, color }) => {
  const wrapRef = useRef(null)
  const txtRef = useRef(null)
  const [over, setOver] = useState(0)
  const [hov, setHov] = useState(false)
  const measure = () => {
    const w = wrapRef.current, t = txtRef.current
    if (w && t) setOver(Math.max(0, t.scrollWidth - w.clientWidth))
  }
  const dur = Math.max(0.5, over / 55)
  return (
    <span ref={wrapRef}
      onMouseEnter={() => { measure(); setHov(true) }}
      onMouseLeave={() => setHov(false)}
      style={{ position: 'relative', display: 'block', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '62%', direction: ltr ? 'ltr' : 'rtl',
        WebkitMaskImage: over && !hov ? `linear-gradient(${ltr ? 'to right' : 'to left'}, #000 80%, transparent)` : 'none',
        maskImage: over && !hov ? `linear-gradient(${ltr ? 'to right' : 'to left'}, #000 80%, transparent)` : 'none' }}>
      <span ref={txtRef}
        style={{ display: 'inline-block', color: color || 'var(--tx2)', fontWeight: 700,
          transform: hov && over ? `translateX(${ltr ? -over : over}px)` : 'translateX(0)',
          transition: `transform ${dur}s linear` }}>
        {value || '—'}
      </span>
    </span>
  )
}

// إدخال أرقام الحدود لكل تأشيرة عمل (دائمة/مؤقتة) — نافذة منبثقة تعرض صفّاً لكل تأشيرة (الجنسية/المهنة/الملف)
// مع حقل رقم الحدود، وتحفظ التغييرات على visa_applications.border_number. متاحة من بطاقة «الخدمة» في تفصيل الفاتورة.
function BorderNumbersModal({ sb, toast, T, isAr, visas, editorId, editorName, onClose, onSaved }) {
  const rows = (Array.isArray(visas) ? visas : []).filter(v => v && v.id)
  const [vals, setVals] = useState(() => Object.fromEntries(rows.map(r => [r.id, r.border_number ? String(r.border_number) : ''])))
  const [unifieds, setUnifieds] = useState(() => Object.fromEntries(rows.map(r => [r.id, r.unified_number ? String(r.unified_number) : ''])))
  const [visaNos, setVisaNos] = useState(() => Object.fromEntries(rows.map(r => [r.id, r.visa_number ? String(r.visa_number) : ''])))
  const [files, setFiles] = useState({})   // files[visaId] = ملف التأشيرة المرفق (File)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const [active, setActive] = useState(0)   // التأشيرة المعروضة حالياً (تبويبات)
  const natOf = r => (isAr ? r.nationality?.name_ar : (r.nationality?.name_en || r.nationality?.name_ar)) || '—'
  const occOf = r => (isAr ? r.occupation?.name_ar : (r.occupation?.name_en || r.occupation?.name_ar)) || ''
  const embOf = r => (isAr ? r.embassy?.name_ar : (r.embassy?.name_en || r.embassy?.name_ar)) || ''
  const genOf = r => r.gender === 'female' ? T('أنثى','Female') : r.gender === 'male' ? T('ذكر','Male') : ''
  // مسمّى التأشيرة بصيغة ترتيبية: «التأشيرة الأولى» بدل «تأشيرة 1».
  const arOrd = ['الأولى','الثانية','الثالثة','الرابعة','الخامسة','السادسة','السابعة','الثامنة','التاسعة','العاشرة']
  const enOrd = ['First','Second','Third','Fourth','Fifth','Sixth','Seventh','Eighth','Ninth','Tenth']
  const visaLabel = idx => T(`التأشيرة ${arOrd[idx] || idx + 1}`, `${enOrd[idx] || ('Visa ' + (idx + 1))} Visa`)
  // التأشيرات المُدخَل لها رقم حدود مسبقاً تُخفى — نعرض فقط ما لم يُدخَل بعد.
  const shown = rows.filter(r => !String(r.border_number || '').trim())
  // الحقول الأربعة (الرقم الموحّد، رقم التأشيرة، رقم الحدود، ملف التأشيرة) إلزامية معاً كوحدة واحدة:
  //  • التأشيرة التي تُترك فارغة تماماً تُتخطّى (لا تُحفظ).
  //  • من بدأ إدخال أيّ حقل منها يلزمه إكمالها جميعاً بالصيغة الصحيحة قبل تفعيل «حفظ».
  const rawOf = r => ({
    b: String(vals[r.id] ?? '').trim(),       // رقم الحدود
    u: String(unifieds[r.id] ?? '').trim(),   // الرقم الموحّد للمنشأة
    v: String(visaNos[r.id] ?? '').trim(),    // رقم التأشيرة
    f: files[r.id] || null,                   // ملف التأشيرة
  })
  const touched = r => { const x = rawOf(r); return !!(x.b || x.u || x.v || x.f) }
  // الصيغ: الرقم الموحّد يبدأ بـ7، رقم التأشيرة بـ1، رقم الحدود بـ3 — وكلّها 10 أرقام بالضبط، والملف مرفق.
  const complete = r => { const x = rawOf(r); return /^7\d{9}$/.test(x.u) && /^1\d{9}$/.test(x.v) && /^3\d{9}$/.test(x.b) && !!x.f }
  // التحقّق والحفظ يقتصران على التأشيرات المعروضة (غير المُدخَلة بعد) — التأشيرات المحفوظة سابقاً تُستثنى تماماً
  // فلا تُطالَب بإعادة إرفاق ملفها (ملفها رُفع سابقاً ولا يوجد في حالة هذه النافذة). كل تأشيرة مستقلّة عن الأخرى.
  const touchedRows = shown.filter(touched)
  const dirty = touchedRows.length > 0
  const allComplete = touchedRows.every(complete)
  // رقم الحدود فريد ولا يتكرّر: لا يجوز تطابقه مع تأشيرة أخرى — لا داخل النموذج ولا في قاعدة البيانات.
  const allRowIds = rows.map(r => r.id)
  // أرقام الحدود المحفوظة سابقاً على بقية تأشيرات هذه الفاتورة (غير المعروضة) — لمنع تطابق رقم جديد معها.
  const savedBorders = rows.filter(r => !shown.includes(r)).map(r => String(r.border_number || '').trim()).filter(b => /^3\d{9}$/.test(b))
  // أرقام الحدود الصحيحة المُدخَلة حالياً (لكشف التكرار داخل النموذج وللاستعلام عن تكرارها في القاعدة).
  const enteredBorders = touchedRows.map(r => String(vals[r.id] ?? '').trim()).filter(b => /^3\d{9}$/.test(b))
  const bordersKey = enteredBorders.slice().sort().join(',')
  const [dbTaken, setDbTaken] = useState(() => new Set())   // أرقام حدود مستخدَمة على تأشيرات أخرى في القاعدة
  useEffect(() => {
    const nums = Array.from(new Set(enteredBorders))
    if (!nums.length) { setDbTaken(new Set()); return }
    let cancelled = false
    ;(async () => {
      let q = sb.from('visa_applications').select('id,border_number').in('border_number', nums)
      if (allRowIds.length) q = q.not('id', 'in', `(${allRowIds.join(',')})`)   // نستثني تأشيرات هذا النموذج
      const { data, error } = await q
      if (cancelled || error) return
      setDbTaken(new Set((data || []).map(d => String(d.border_number || '').trim()).filter(Boolean)))
    })()
    return () => { cancelled = true }
  }, [bordersKey])   // eslint-disable-line react-hooks/exhaustive-deps
  const dupInModal = r => { const b = String(vals[r.id] ?? '').trim(); return /^3\d{9}$/.test(b) && (enteredBorders.filter(x => x === b).length > 1 || savedBorders.includes(b)) }
  const dupInDb = r => dbTaken.has(String(vals[r.id] ?? '').trim())
  const allUnique = touchedRows.every(r => !dupInModal(r) && !dupInDb(r))
  // أول حقل ناقص/غير صحيح ضمن التأشيرات المبدوء إدخالها — لإظهار رسالة دقيقة أسفل النموذج.
  const validationErr = (() => {
    for (const r of touchedRows) {
      const x = rawOf(r)
      if (!/^7\d{9}$/.test(x.u)) return T('الرقم الموحد يجب أن يبدأ بـ7 ويكون 10 أرقام','Unified number must start with 7 and be 10 digits')
      if (!/^1\d{9}$/.test(x.v)) return T('رقم التأشيرة يجب أن يبدأ بـ1 ويكون 10 أرقام','Visa number must start with 1 and be 10 digits')
      if (!/^3\d{9}$/.test(x.b)) return T('رقم الحدود يجب أن يبدأ بـ3 ويكون 10 أرقام','Border number must start with 3 and be 10 digits')
      if (!x.f) return T('أرفق ملف التأشيرة','Attach the visa file')
    }
    for (const r of touchedRows) {
      if (dupInModal(r)) return T('رقم الحدود مكرّر بين التأشيرات — يجب أن يكون فريداً','Border number is duplicated across visas — it must be unique')
      if (dupInDb(r)) return T('رقم الحدود مستخدَم مسبقاً على تأشيرة أخرى','Border number is already used on another visa')
    }
    return undefined
  })()
  const save = async () => {
    if (saving || !dirty || !allComplete || !allUnique) return
    setErr(''); setSaving(true)
    try {
      // نحفظ فقط التأشيرات المبدوء إدخالها (مكتملة الحقول الأربعة) — والفارغة تماماً تُتخطّى.
      const changed = touchedRows
      // تحقّق نهائي من تفرّد رقم الحدود لحظة الحفظ (يمنع التسابق إن أُدخِل نفس الرقم على تأشيرة أخرى بين الفحص والحفظ).
      const wantBorders = changed.map(r => String(vals[r.id] ?? '').trim()).filter(b => /^3\d{9}$/.test(b))
      if (wantBorders.length) {
        let cq = sb.from('visa_applications').select('id,border_number').in('border_number', Array.from(new Set(wantBorders)))
        if (allRowIds.length) cq = cq.not('id', 'in', `(${allRowIds.join(',')})`)
        const { data: clash, error: cErr } = await cq
        if (cErr) throw cErr
        if (clash && clash.length) { setErr(T('رقم الحدود مستخدَم مسبقاً على تأشيرة أخرى','Border number is already used on another visa')); setSaving(false); return }
      }
      for (const r of changed) {
        const nv = String(vals[r.id] ?? '').trim() || null
        const uv = String(unifieds[r.id] ?? '').trim() || null
        const vno = String(visaNos[r.id] ?? '').trim() || null
        const { error } = await sb.from('visa_applications').update({ border_number: nv, unified_number: uv, visa_number: vno }).eq('id', r.id)
        if (error) throw error
        // مرفق «ملف التأشيرة» — أفضل-جهد، لا يمنع الحفظ. يُربط بالتأشيرة (entity_type='visa_application') بملاحظة 'visa_file'.
        const vf = files[r.id]
        if (vf) {
          try {
            const safe = (vf.name || 'visa').replace(/[^\w.\-]+/g, '_')
            const path = `visa-applications/${r.id}/visa-file/${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${safe}`
            const { error: upErr } = await sb.storage.from('attachments').upload(path, vf, { cacheControl: '3600', upsert: false })
            if (!upErr) {
              const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
              await sb.from('attachments').insert({
                entity_type: 'visa_application', entity_id: r.id,
                file_name: vf.name, file_url: pub?.publicUrl || path, storage_path: path,
                mime_type: vf.type || null, size_bytes: vf.size || null,
                notes: 'visa_file', uploaded_by: editorId || null,
              })
            }
          } catch { /* مرفق التأشيرة أفضل-جهد */ }
        }
      }
      onSaved?.(); setDone(true)
    } catch { setErr(T('تعذر الحفظ','Save failed')) }
    finally { setSaving(false) }
  }
  // صف مفتاح/قيمة (تصميم F) — اسم الحقل يميناً وقيمته يساراً، مع فاصل سفلي للصفوف العلوية.
  const KV = ({ label, value, ltr, divider, full }) => (
    <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, fontSize: 11.5, minWidth: 0, gridColumn: full ? '1 / -1' : 'auto', paddingBottom: divider ? 5 : 0, borderBottom: divider ? '1px solid var(--bd)' : 'none' }}>
      <span style={{ color: 'var(--tx4)', fontWeight: 600, flexShrink: 0 }}>{label}</span>
      <MarqueeValue value={value} ltr={ltr} />
    </span>
  )
  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: F }}>
      {rows.length === 0 ? (
        <ModalSection Icon={Hash} label={T('أرقام الحدود','Border numbers')} style={{ marginTop: 6 }}>
          <div style={{ fontSize: 12.5, color: 'var(--tx4)', fontWeight: 600, textAlign: 'center', padding: '14px 0' }}>{T('لا توجد تأشيرات','No visas')}</div>
        </ModalSection>
      ) : shown.length === 0 ? (
        <ModalSection Icon={Hash} label={T('أرقام الحدود','Border numbers')} style={{ marginTop: 6 }}>
          <div style={{ fontSize: 12.5, color: 'var(--tx4)', fontWeight: 600, textAlign: 'center', padding: '14px 0' }}>{T('تم إدخال أرقام الحدود لكل التأشيرات','All border numbers entered')}</div>
        </ModalSection>
      ) : (() => {
        // تبويبات التأشيرات — تظهر التأشيرات غير المُدخَلة فقط، واحدة في كل مرة، مع الإبقاء على ترتيبها الأصلي.
        const r = shown[active] || shown[0]
        const i = rows.indexOf(r)
        return (
          <>
            {shown.length > 1 && (
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {shown.map((row, sIdx) => {
                  const idx = rows.indexOf(row)
                  const isAct = idx === i
                  const filled = String(vals[row.id] ?? '').trim().length === 10
                  return (
                    <button key={row.id} type="button" onClick={() => setActive(sIdx)}
                      style={{ flex: 1, minWidth: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 10px', borderRadius: 9, cursor: 'pointer', fontFamily: F, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                        background: isAct ? C.gold + '1a' : 'transparent',
                        border: '1px ' + (isAct ? 'solid ' + C.gold : 'dashed rgba(255,255,255,.14)'),
                        color: isAct ? C.gold : 'var(--tx3)', transition: '.15s' }}>
                      <span>{visaLabel(idx)}</span>
                      {filled && <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.ok, flexShrink: 0 }} />}
                    </button>
                  )
                })}
              </div>
            )}
            <ModalSection key={r.id} Icon={Hash} label={visaLabel(i)} style={{ marginTop: 6 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px 18px', padding: '2px 2px 8px', borderBottom: '1px solid var(--bd)' }}>
                  <KV label={T('الجنسية','Nationality')} value={natOf(r)} />
                  <KV label={T('السفارة','Embassy')} value={embOf(r)} />
                  <KV label={T('المهنة','Occupation')} value={occOf(r)} />
                  <KV label={T('الجنس','Gender')} value={genOf(r)} />
                </div>
                <TextField full req label={T('الرقم الموحد للمنشأة','Establishment unified no.')} value={unifieds[r.id] || ''}
                  onChange={v => { setErr(''); setUnifieds(p => ({ ...p, [r.id]: v })) }}
                  filter="digits" maxLength={10} dir="ltr" align="center" placeholder="7XXXXXXXXX" />
                <div style={GRID}>
                  <TextField req label={T('رقم التأشيرة','Visa number')} value={visaNos[r.id] || ''}
                    onChange={v => { setErr(''); setVisaNos(p => ({ ...p, [r.id]: v })) }}
                    filter="digits" maxLength={10} dir="ltr" align="center" placeholder="1XXXXXXXXX" />
                  <TextField req label={T('رقم الحدود','Border number')} value={vals[r.id] || ''}
                    onChange={v => { setErr(''); setVals(p => ({ ...p, [r.id]: v })) }}
                    filter="digits" maxLength={10} dir="ltr" align="center" placeholder="3XXXXXXXXX" />
                </div>
                <FileField full req dropHeight={72} label={T('ملف التأشيرة','Visa file')}
                  value={files[r.id] || null} onChange={f => { setErr(''); setFiles(p => ({ ...p, [r.id]: f })) }} />
              </div>
            </ModalSection>
          </>
        )
      })()}
    </div>
  )
  return (
    <Modal open onClose={onClose} title={rows.length === 1 ? T('بيانات التأشيرة','Visa data') : T('بيانات التأشيرات','Visas data')} Icon={Hash} width={560} height="auto" accent={C.gold}
      success={done ? <SuccessView title={rows.length === 1 ? T('تم حفظ بيانات التأشيرة','Visa data saved') : T('تم حفظ بيانات التأشيرات','Visas data saved')} /> : undefined}
      pages={[{ valid: dirty && allComplete && allUnique, error: err || validationErr, content }]}
      onSubmit={save} submitting={saving} submitIcon={CheckCircle2} submitLabel={T('حفظ','Save')} />
  )
}

// بيانات التأمين / رخصة العمل لتأشيرة وإقامة دائمة — مرحلتان تُدخلان في أي وقت بعد إصدار التأشيرة (بلا ترتيب/دفع).
// تُخزَّن في stage_data على صف إصدار الإقامة لكل تأشيرة (يُنشأ الصف عند الحاجة)، والملف مرفق اختياري.
function VisaStageDataModal({ stage, sb, toast, T, isAr, inv, user, visas, iqamaByVisa, fileByVisa, onClose, onSaved }) {
  const isIns = stage === 'insurance'
  const fileNote = isIns ? 'visa_ins_file' : 'visa_wp_file'
  // مؤهَّلة = صدرت لها التأشيرة (رقم حدود) — التأمين/رخصة العمل تأتيان بعد إصدار التأشيرة.
  const rows = (Array.isArray(visas) ? visas : []).filter(v => v && v.id && String(v.border_number || '').trim())
  const sdOf = vid => (iqamaByVisa || {})[vid]?.stage_data || {}
  const exOf = vid => sdOf(vid)[stage] || null
  const [form, setForm] = useState(() => Object.fromEntries(rows.map(r => {
    const e = exOf(r.id) || {}
    return [r.id, isIns
      ? { company: e.company || '', policy_no: e.policy_no || '', expiry: e.expiry || '', amount: e.amount != null ? String(e.amount) : '' }
      : { duration: e.duration_months != null ? String(e.duration_months) : '', expiry: e.expiry || '', amount: e.amount != null ? String(e.amount) : '' }]
  })))
  const [files, setFiles] = useState({})
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const [active, setActive] = useState(0)
  const natOf = r => (isAr ? r.nationality?.name_ar : (r.nationality?.name_en || r.nationality?.name_ar)) || '—'
  const occOf = r => (isAr ? r.occupation?.name_ar : (r.occupation?.name_en || r.occupation?.name_ar)) || ''
  const embOf = r => (isAr ? r.embassy?.name_ar : (r.embassy?.name_en || r.embassy?.name_ar)) || ''
  const genOf = r => r.gender === 'female' ? T('أنثى', 'Female') : r.gender === 'male' ? T('ذكر', 'Male') : ''
  const arOrd = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة', 'التاسعة', 'العاشرة']
  const enOrd = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth']
  const visaLabel = idx => T(`التأشيرة ${arOrd[idx] || idx + 1}`, `${enOrd[idx] || ('Visa ' + (idx + 1))} Visa`)
  const fOf = vid => form[vid] || {}
  const setF = (vid, patch) => { setErr(''); setForm(p => ({ ...p, [vid]: { ...p[vid], ...patch } })) }
  // مكتملة = كل الحقول المطلوبة مُدخلة بالصيغة الصحيحة (التأمين: شركة/بوليصة/انتهاء/مبلغ · رخصة العمل: مدة/انتهاء/مبلغ).
  // الملف إلزامي: إمّا ملف جديد مُرفق الآن أو ملف محفوظ سابقاً لتلك التأشيرة.
  const hasFile = vid => !!files[vid] || !!(fileByVisa || {})[vid]
  const complete = vid => {
    const f = fOf(vid)
    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(String(f.expiry || '').trim())
    const amtOk = Number(String(f.amount || '').replace(/,/g, '')) > 0
    const base = isIns
      ? !!String(f.company || '').trim() && !!String(f.policy_no || '').trim() && dateOk && amtOk
      : !!String(f.duration || '').trim() && dateOk && amtOk
    return base && hasFile(vid)
  }
  // مبدوءة = أُدخِل أيّ حقل، أو وُجد ملف جديد، أو كانت محفوظة سابقاً (قيمها معبّأة).
  const touched = vid => {
    const f = fOf(vid)
    return !!(String(f.company || '').trim() || String(f.policy_no || '').trim() || String(f.duration || '').trim() || String(f.expiry || '').trim() || String(f.amount || '').trim() || files[vid] || exOf(vid))
  }
  const touchedRows = rows.filter(r => touched(r.id))
  const dirty = touchedRows.length > 0
  const allComplete = touchedRows.every(r => complete(r.id))
  const save = async () => {
    if (saving || !dirty || !allComplete) return
    setErr(''); setSaving(true)
    try {
      const at = new Date().toISOString()
      const byName = (isAr ? (user?.person?.name_ar || user?.person?.name_en) : (user?.person?.name_en || user?.person?.name_ar)) || null
      for (const r of touchedRows) {
        const f = fOf(r.id)
        const obj = isIns
          ? { company: String(f.company).trim(), policy_no: String(f.policy_no).trim(), expiry: String(f.expiry).trim(), amount: Number(String(f.amount).replace(/,/g, '')), by_id: user?.id || null, by_name: byName, at }
          : { duration_months: Number(f.duration), expiry: String(f.expiry).trim(), amount: Number(String(f.amount).replace(/,/g, '')), by_id: user?.id || null, by_name: byName, at }
        const existRow = (iqamaByVisa || {})[r.id] || null
        const newStageData = { ...(existRow?.stage_data && typeof existRow.stage_data === 'object' ? existRow.stage_data : {}), [stage]: obj }
        if (existRow) {
          const { error } = await sb.from('iqama_issuance_applications').update({ stage_data: newStageData }).eq('visa_application_id', r.id).is('deleted_at', null)
          if (error) throw error
        } else {
          const facId = r.main_facility?.id || null
          const { error } = await sb.from('iqama_issuance_applications').insert({
            service_request_id: inv.service_request?.id || null,
            visa_application_id: r.id,
            main_facility_id: facId,
            stage_data: newStageData,
            created_by: user?.id || null,
          })
          if (error) throw error
        }
        // مرفق ملف المرحلة — أفضل-جهد، لا يمنع الحفظ.
        const vf = files[r.id]
        if (vf) {
          try {
            const safe = (vf.name || stage).replace(/[^\w.\-]+/g, '_')
            const path = `visa-applications/${r.id}/${fileNote}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${safe}`
            const { error: upErr } = await sb.storage.from('attachments').upload(path, vf, { cacheControl: '3600', upsert: false })
            if (!upErr) {
              const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
              await sb.from('attachments').insert({
                entity_type: 'visa_application', entity_id: r.id,
                file_name: vf.name, file_url: pub?.publicUrl || path, storage_path: path,
                mime_type: vf.type || null, size_bytes: vf.size || null,
                notes: fileNote, uploaded_by: user?.id || null,
              })
            }
          } catch { /* المرفق أفضل-جهد */ }
        }
      }
      onSaved?.(); setDone(true)
    } catch (e) { setErr(T('تعذر الحفظ', 'Save failed') + (e?.message ? ': ' + e.message : '')) }
    finally { setSaving(false) }
  }
  const titleAr = isIns ? 'بيانات التأمين' : 'بيانات رخصة العمل'
  const titleEn = isIns ? 'Insurance data' : 'Work permit data'
  const KV = ({ label, value }) => (
    <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, fontSize: 11.5, minWidth: 0 }}>
      <span style={{ color: 'var(--tx4)', fontWeight: 600, flexShrink: 0 }}>{label}</span>
      <MarqueeValue value={value} />
    </span>
  )
  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: F }}>
      {rows.length === 0 ? (
        <ModalSection Icon={RenewalDataIco} label={T(titleAr, titleEn)} style={{ marginTop: 6 }}>
          <div style={{ fontSize: 12.5, color: 'var(--tx4)', fontWeight: 600, textAlign: 'center', padding: '14px 0' }}>{T('لا توجد تأشيرات صادرة بعد', 'No issued visas yet')}</div>
        </ModalSection>
      ) : (() => {
        const r = rows[active] || rows[0]
        const i = active
        const f = fOf(r.id)
        return (
          <>
            {rows.length > 1 && (
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {rows.map((row, idx) => {
                  const isAct = idx === i
                  return (
                    <button key={row.id} type="button" onClick={() => setActive(idx)}
                      style={{ flex: 1, minWidth: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 10px', borderRadius: 9, cursor: 'pointer', fontFamily: F, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                        background: isAct ? C.gold + '1a' : 'transparent',
                        border: '1px ' + (isAct ? 'solid ' + C.gold : 'dashed rgba(255,255,255,.14)'),
                        color: isAct ? C.gold : 'var(--tx3)', transition: '.15s' }}>
                      <span>{visaLabel(idx)}</span>
                      {complete(row.id) && <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.ok, flexShrink: 0 }} />}
                    </button>
                  )
                })}
              </div>
            )}
            <ModalSection key={r.id} Icon={RenewalDataIco} label={visaLabel(i)} style={{ marginTop: 6 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px 18px', padding: '2px 2px 8px', borderBottom: '1px solid var(--bd)' }}>
                  <KV label={T('الجنسية', 'Nationality')} value={natOf(r)} />
                  <KV label={T('المهنة', 'Occupation')} value={occOf(r)} />
                  {r.worker_name && <KV label={T('اسم العامل', 'Worker')} value={r.worker_name} />}
                  {r.border_number && <KV label={T('رقم الحدود', 'Border')} value={String(r.border_number)} />}
                </div>
                {isIns ? (
                  <>
                    <div style={GRID}>
                      <TextField req label={T('اسم الشركة', 'Company')} value={f.company || ''} onChange={v => setF(r.id, { company: v })} />
                      <TextField req label={T('رقم بوليصة التأمين', 'Policy No')} value={f.policy_no || ''} onChange={v => setF(r.id, { policy_no: v })} />
                      <DateField req label={T('تاريخ انتهاء التأمين', 'Insurance Expiry')} value={f.expiry || ''} onChange={v => setF(r.id, { expiry: v })} lang={isAr ? 'ar' : 'en'} />
                      <CurrencyField req label={T('المبلغ', 'Amount')} value={f.amount || ''} onChange={v => setF(r.id, { amount: v })} unit={T('ريال', 'SAR')} />
                    </div>
                    <FileField full req dropHeight={72} label={T('ملف بوليصة التأمين', 'Policy File')} value={files[r.id] || null} onChange={file => { setErr(''); setFiles(p => ({ ...p, [r.id]: file })) }} />
                    {!files[r.id] && (fileByVisa || {})[r.id] && <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, marginTop: -4 }}>{T('يوجد ملف محفوظ — ارفع ملفاً جديداً لاستبداله', 'A file is saved — upload a new one to replace it')}</div>}
                  </>
                ) : (
                  <>
                    <div style={GRID}>
                      <FKSelect req label={T('المدة', 'Duration')} placeholder={T('اختر المدة…', 'Select duration…')}
                        options={[3, 6, 9, 12, 24].map(n => ({ n }))} getKey={o => String(o.n)} getLabel={o => `${o.n} ${T('أشهر', 'months')}`}
                        value={f.duration ? String(f.duration) : ''} onChange={v => setF(r.id, { duration: v })} />
                      <DateField req label={T('تاريخ انتهاء رخصة العمل', 'Work Permit Expiry')} value={f.expiry || ''} onChange={v => setF(r.id, { expiry: v })} lang={isAr ? 'ar' : 'en'} />
                      <CurrencyField full req label={T('المبلغ', 'Amount')} value={f.amount || ''} onChange={v => setF(r.id, { amount: v })} unit={T('ريال', 'SAR')} />
                    </div>
                    <FileField full req dropHeight={72} label={T('ملف رخصة العمل', 'Work Permit File')} value={files[r.id] || null} onChange={file => { setErr(''); setFiles(p => ({ ...p, [r.id]: file })) }} />
                    {!files[r.id] && (fileByVisa || {})[r.id] && <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, marginTop: -4 }}>{T('يوجد ملف محفوظ — ارفع ملفاً جديداً لاستبداله', 'A file is saved — upload a new one to replace it')}</div>}
                  </>
                )}
              </div>
            </ModalSection>
          </>
        )
      })()}
    </div>
  )
  return (
    <Modal open onClose={onClose} title={T(titleAr, titleEn)} Icon={CheckCircle2} width={560} height="auto" accent={C.gold}
      success={done ? <SuccessView title={T('تم الحفظ', 'Saved')} /> : undefined}
      pages={[{ valid: dirty && allComplete, error: err, content }]}
      onSubmit={save} submitting={saving} submitIcon={CheckCircle2} submitLabel={T('حفظ', 'Save')} />
  )
}

/* ─── أزرار الإنجاز المرحلية (هيدر تفاصيل الفاتورة) — زر أخضر + شارة «✓ تم» ─── */
const CheckBadgeIco = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
// أيقونة «بيانات التأشيرة» — جواز/مستند تأشيرة
const VisaDataIco = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="9" r="2.5"/><path d="M8.5 16.5c0-1.7 1.6-3 3.5-3s3.5 1.3 3.5 3"/></svg>
// أيقونة «بيانات الإقامة» — بطاقة هوية/إقامة
const IqamaDataIco = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M5.5 16c.4-1.3 1.4-2 2.5-2s2.1.7 2.5 2"/><line x1="14" y1="10" x2="19" y2="10"/><line x1="14" y1="14" x2="17" y2="14"/></svg>
// أيقونة «بيانات التجديد» — أسهم تجديد دائرية
const RenewalDataIco = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>
// أيقونة مرحلة «النقل» — سهمان متعاكسان (نقل الكفالة)
const TransferStageIco = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>
// أيقونة «صح» للحالة المنجزة
const DoneCheckIco = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>
// بيانات المعاملة — حافظة بأسطر بيانات (لزر إجراء الطلب في الخدمات غير التأشيرية).
const TxnDataIco = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6"/><path d="M9 16h6"/></svg>
// حالة المعاملة — دائرة بعلامة صح (مطابقة لأيقونة كرت «حالة المعاملة»).
const TxnStatusIco = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
// موافقة المحاسب — حافظة بعلامة صح (لزر مرحلة موافقة المحاسب في النقل الخارجي).
const AcctApprovalIco = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>
// صف إنجاز ممتد بعرض كامل (داخل فوتر بطاقة الملخص) — بلا حواف دائرية:
//  • حالة منجزة (done): شريط بإطار جانبي ملوّن + نقطة نابضة + نص (نمط خلية الحالة في المعاملات).
//  • إجراء قابل للضغط: صف مركزي بلون أخضر + أيقونة، مع تظليل خفيف عند المرور.
// صفّ مرحلة — بتصميم زر «تسجيل دفعة» (ActionGridButton): منقّط/مدوّر للأزرار، وحالة منجزة بحدّ ممتلئ خفيف.
const StageRow = ({ label, onClick, disabled = false, done = false, title, color = C.ok, icon }) => { const { dir } = useFKLang(); return done ? (
  // حالة منجزة — بنفس تصميم تاق الحالة في صفحة المعاملات (StatusCell): إطار جانبي ملوّن + خلفية خفيفة + نقطة نابضة.
  <div title={title} style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: 6, borderInlineStart: `3px solid ${color}`, background: `${color}10`, padding: '8px 11px', direction: dir, textAlign: 'center', fontFamily: F, fontSize: 12.5, fontWeight: 600, color, whiteSpace: 'nowrap' }}>
    <span className="txn-dot-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
    <span>{label}</span>
    {icon}
  </div>
) : (
  <button onClick={onClick} disabled={disabled} title={title}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.filter = 'brightness(.93)' }}
    onMouseLeave={e => { if (!disabled) e.currentTarget.style.filter = 'none' }}
    style={{ flex: 1, minWidth: 120, height: 36, padding: '0 12px', borderRadius: 8, background: disabled ? 'transparent' : 'linear-gradient(160deg,#23201a,#141210)', border: `1px solid ${disabled ? 'var(--bd)' : 'rgba(212,160,23,.5)'}`, color: disabled ? 'var(--tx4)' : '#F0CB6A', cursor: disabled ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: F, fontSize: 12, fontWeight: 700, boxShadow: disabled ? 'none' : '0 5px 16px rgba(0,0,0,.26), inset 0 1px 0 rgba(212,160,23,.18)', transition: 'filter .15s ease' }}>
    <span>{label}</span>
    {icon || <CheckBadgeIco />}
  </button>
) }

// إصدار الإقامات — تأشيرة دائمة: إنشاء صفّ إقامة (iqama_issuance_applications) لكل تأشيرة سُدّدت دفعة إقامتها
// ولم تُنشأ لها إقامة بعد. التأشيرات غير المسدّدة تُعرض محجوبة (الدفع محترم) ولا تُنشأ لها إقامة.
function IqamaIssueModal({ sb, toast, T, isAr, inv, user, visas, iqamaSet, iqamaByVisa, residencePaidOf, onClose, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  // form[visaId] = { iqamaNumber, iqamaExpiry, muqeemFile } — بيانات الإقامة المُدخلة لكل تأشيرة جاهزة.
  const [form, setForm] = useState({})
  const [active, setActive] = useState(0)   // التأشيرة المعروضة حالياً (تبويبات)
  const rows = (Array.isArray(visas) ? visas : []).filter(v => v && v.id)
  // المؤقتة: نطلب «اسم العامل» ضمن إصدار الإقامة (لا يُدخَل في خطوة دفع كالدائمة).
  const isTemp = inv?.service_type?.code === 'work_visa_temporary'
  const nameVal = v => { const w = fOf(v.id).workerName; return (w === undefined ? (v.worker_name || '') : w) }
  // اسم العامل إلزامي لكل التأشيرات في إصدار الإقامة (يُحفظ على صف التأشيرة).
  const nameOk = v => String(nameVal(v)).trim().length > 0
  // «صادرة» = بيانات الإقامة مُدخلة فعلاً (رقم إقامة). صفّ الإصدار الذي أُنشئ عند سداد الدفعة بلا بيانات
  // يبقى «جاهزاً» لإدخال البيانات (لا يُخفى) — وعند الحفظ نُحدّث ذلك الصف بدل إنشاء صفّ مكرّر.
  const iqamaNumberOf = id => String((iqamaByVisa || {})[id]?.iqama_number || '').trim()
  // تأشيرة دائمة: الإقامة لا تُصدر لتأشيرةٍ حتى يُنجَز تأمينها ورخصة عملها معاً. المؤقتة بلا هذا الشرط.
  const isPermanent = inv?.service_type?.code === 'work_visa_permanent'
  const stagesDoneOf = id => { const sd = (iqamaByVisa || {})[id]?.stage_data || {}; return !!sd.insurance && !!sd.work_permit }
  // الجاهزية لإصدار الإقامة مشروطة بإدخال رقم الحدود (إصدار التأشيرة) أولاً — التأشيرة بلا رقم حدود تُعدّ
  // «محجوبة» ولا تظهر هنا (تُكمَل من نافذة «بيانات التأشيرات»)، فقد يُفتح الزرّان معاً في الحالة المختلطة.
  const stateOf = v => iqamaNumberOf(v.id) ? 'issued' : ((String(v.border_number || '').trim() && (!isPermanent || stagesDoneOf(v.id))) ? 'eligible' : 'blocked')
  const eligible = rows.filter(v => stateOf(v) === 'eligible')
  // نعرض فقط التأشيرات الجاهزة (رقم حدودها مُدخَل ولم تُصدر إقامتها) — الصادرة والمحجوبة تُخفى، مع الإبقاء على الترقيم.
  const shown = rows.filter(v => stateOf(v) === 'eligible')
  const natOf = v => (isAr ? v.nationality?.name_ar : (v.nationality?.name_en || v.nationality?.name_ar)) || ''
  const embOf = v => (isAr ? v.embassy?.name_ar : (v.embassy?.name_en || v.embassy?.name_ar)) || ''
  const occOf = v => (isAr ? v.occupation?.name_ar : (v.occupation?.name_en || v.occupation?.name_ar)) || ''
  const genOf = v => v.gender === 'female' ? T('أنثى','Female') : v.gender === 'male' ? T('ذكر','Male') : ''
  // مسمّى التأشيرة بصيغة ترتيبية: «التأشيرة الأولى» بدل «تأشيرة 1».
  const arOrd = ['الأولى','الثانية','الثالثة','الرابعة','الخامسة','السادسة','السابعة','الثامنة','التاسعة','العاشرة']
  const enOrd = ['First','Second','Third','Fourth','Fifth','Sixth','Seventh','Eighth','Ninth','Tenth']
  const visaLabel = idx => T(`التأشيرة ${arOrd[idx] || idx + 1}`, `${enOrd[idx] || ('Visa ' + (idx + 1))} Visa`)
  const fOf = id => form[id] || {}
  const setField = (id, patch) => setForm(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  // تأشيرة مكتملة الإدخال (للنقطة الخضراء على التبويب): صادرة سابقاً، أو جاهزة وأُكملت حقولها.
  // رقم الإقامة يبدأ بـ2 ويكون 10 أرقام بالضبط.
  const iqamaNumOk = v => /^2\d{9}$/.test((fOf(v.id).iqamaNumber || '').trim())
  const visaComplete = v => stateOf(v) === 'issued' || (stateOf(v) === 'eligible' && iqamaNumOk(v) && /^\d{4}-\d{2}-\d{2}$/.test((fOf(v.id).iqamaExpiry || '').trim()) && !!fOf(v.id).muqeemFile && nameOk(v))
  // رقم الإقامة فريد ولا يتكرّر (نفس نظام رقم الحدود): لا داخل النموذج ولا في قاعدة البيانات.
  const enteredIqamas = eligible.map(v => (fOf(v.id).iqamaNumber || '').trim()).filter(b => /^2\d{9}$/.test(b))
  const iqamasKey = enteredIqamas.slice().sort().join(',')
  const [iqDbTaken, setIqDbTaken] = useState(() => new Set())   // أرقام إقامة مستخدَمة على تأشيرات أخرى
  const eligibleIds = eligible.map(v => v.id)
  useEffect(() => {
    const nums = Array.from(new Set(enteredIqamas))
    if (!nums.length) { setIqDbTaken(new Set()); return }
    let cancelled = false
    ;(async () => {
      let q = sb.from('iqama_issuance_applications').select('visa_application_id,iqama_number').in('iqama_number', nums).is('deleted_at', null)
      if (eligibleIds.length) q = q.not('visa_application_id', 'in', `(${eligibleIds.join(',')})`)   // نستثني تأشيرات هذا النموذج
      const { data, error } = await q
      if (cancelled || error) return
      setIqDbTaken(new Set((data || []).map(d => String(d.iqama_number || '').trim()).filter(Boolean)))
    })()
    return () => { cancelled = true }
  }, [iqamasKey])   // eslint-disable-line react-hooks/exhaustive-deps
  const iqDupInModal = v => { const b = (fOf(v.id).iqamaNumber || '').trim(); return /^2\d{9}$/.test(b) && enteredIqamas.filter(x => x === b).length > 1 }
  const iqDupInDb = v => iqDbTaken.has((fOf(v.id).iqamaNumber || '').trim())
  const iqUnique = v => !iqDupInModal(v) && !iqDupInDb(v)
  // إصدار كل تأشيرة مستقلّ: نحفظ فقط التأشيرات التي بُدئ إدخال بياناتها (رقم إقامة/تاريخ/ملف)، والباقية تُتخطّى.
  // فلا يُشترط ملء كل التأشيرات الجاهزة معاً — يكفي إكمال واحدة وحفظها وحدها.
  // «مبدوءة» = أُدخِل أيّ حقل منها (اسم العامل/رقم الإقامة/التاريخ/الملف). فمتى بُدئت تأشيرة وجب إكمال كل حقولها
  // قبل تفعيل «حفظ» — فلا يُحفظ شيء ما دامت تأشيرة واحدة ناقصة، حتى لو كانت تأشيرة أخرى مكتملة. والفارغة تماماً تُتخطّى.
  const iqEntered = v => { const f = fOf(v.id); return !!(String(f.iqamaNumber || '').trim() || String(f.iqamaExpiry || '').trim() || f.muqeemFile || String(nameVal(v)).trim()) }
  const touchedEligible = eligible.filter(iqEntered)
  // كل تأشيرة مبدوءة يلزمها رقم إقامة (يبدأ بـ2، 10 أرقام، فريد) وتاريخ انتهاء صحيح ومرفق ملف مقيم واسم العامل.
  const allFilled = touchedEligible.length > 0 && touchedEligible.every(v => iqamaNumOk(v) && iqUnique(v) && /^\d{4}-\d{2}-\d{2}$/.test((fOf(v.id).iqamaExpiry || '').trim()) && !!fOf(v.id).muqeemFile && nameOk(v))
  // رسالة دقيقة لأول تكرار في رقم الإقامة.
  const iqDupErr = (() => {
    for (const v of eligible) {
      if (iqDupInModal(v)) return T('رقم الإقامة مكرّر بين التأشيرات — يجب أن يكون فريداً','Iqama number is duplicated across visas — it must be unique')
      if (iqDupInDb(v)) return T('رقم الإقامة مستخدَم مسبقاً على تأشيرة أخرى','Iqama number is already used on another visa')
    }
    return undefined
  })()
  const submit = async () => {
    if (saving || !touchedEligible.length || !allFilled) return
    setErr(''); setSaving(true)
    try {
      // تحقّق نهائي من تفرّد رقم الإقامة لحظة الحفظ (يمنع التسابق).
      const wantIqamas = touchedEligible.map(v => (fOf(v.id).iqamaNumber || '').trim()).filter(b => /^2\d{9}$/.test(b))
      if (wantIqamas.length) {
        let cq = sb.from('iqama_issuance_applications').select('iqama_number').in('iqama_number', Array.from(new Set(wantIqamas))).is('deleted_at', null)
        if (eligibleIds.length) cq = cq.not('visa_application_id', 'in', `(${eligibleIds.join(',')})`)
        const { data: clash, error: cErr } = await cq
        if (cErr) throw cErr
        if (clash && clash.length) { setErr(T('رقم الإقامة مستخدَم مسبقاً على تأشيرة أخرى','Iqama number is already used on another visa')); setSaving(false); return }
      }
      for (const v of touchedEligible) {
        const { iqamaNumber, iqamaExpiry, muqeemFile } = fOf(v.id)
        // نحفظ اسم العامل على صف التأشيرة لكل التأشيرات (يُدخَل هنا ضمن إصدار الإقامة).
        {
          const wn = String(nameVal(v)).trim()
          if (wn && wn !== String(v.worker_name || '').trim()) await sb.from('visa_applications').update({ worker_name: wn }).eq('id', v.id)
        }
        const { data: vRow } = await sb.from('visa_applications').select('main_facility_id').eq('id', v.id).maybeSingle()
        const facId = vRow?.main_facility_id || v.main_facility?.id || null
        // صفّ إصدار موجود مسبقاً (أُنشئ عند سداد دفعة الإصدار بلا بيانات) → حدّثه؛ وإلا أنشئ صفاً جديداً.
        if (iqamaSet.has(v.id)) {
          const { error } = await sb.from('iqama_issuance_applications').update({
            main_facility_id: facId,
            iqama_number: (iqamaNumber || '').trim() || null,
            iqama_expiry: (iqamaExpiry || '').trim() || null,
          }).eq('visa_application_id', v.id).is('deleted_at', null)
          if (error) throw error
        } else {
          const { error } = await sb.from('iqama_issuance_applications').insert({
            service_request_id: inv.service_request?.id || null,
            visa_application_id: v.id,
            main_facility_id: facId,
            iqama_number: (iqamaNumber || '').trim() || null,
            iqama_expiry: (iqamaExpiry || '').trim() || null,
            medical_status: 'pending',
            created_by: user?.id || null,
          })
          if (error) throw error
        }
        // مرفق «ملف مقيم» — أفضل-جهد، لا يمنع الحفظ. يُربط بالتأشيرة (entity_type متاح) بملاحظة 'muqeem'.
        if (muqeemFile) {
          try {
            const f = muqeemFile
            const safe = (f.name || 'muqeem').replace(/[^\w.\-]+/g, '_')
            const path = `visa-applications/${v.id}/muqeem/${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${safe}`
            const { error: upErr } = await sb.storage.from('attachments').upload(path, f, { cacheControl: '3600', upsert: false })
            if (!upErr) {
              const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
              await sb.from('attachments').insert({
                entity_type: 'visa_application', entity_id: v.id,
                file_name: f.name, file_url: pub?.publicUrl || path, storage_path: path,
                mime_type: f.type || null, size_bytes: f.size || null,
                notes: 'muqeem', uploaded_by: user?.id || null,
              })
            }
          } catch { /* مرفق المقيم أفضل-جهد */ }
        }
      }
      onSaved?.(); setDone(true)
    } catch (e) { setErr(T('تعذّر إنشاء الإقامات','Could not create iqamas') + (e?.message ? ': ' + e.message : '')) }
    finally { setSaving(false) }
  }
  const stMeta = st => st === 'issued'
    ? { c: C.ok, label: T('إقامة صادرة','Issued') }
    : st === 'eligible'
      ? { c: C.blue, label: T('سيتم إصدارها','Will be issued') }
      : { c: C.warn, label: T('بانتظار سداد دفعة الإقامة','Awaiting iqama payment') }
  // صف مفتاح/قيمة (تصميم F) — اسم الحقل يميناً وقيمته يساراً، مع فاصل سفلي للصفوف العلوية.
  const KV = ({ label, value, ltr, divider, full, color }) => (
    <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, fontSize: 11.5, minWidth: 0, gridColumn: full ? '1 / -1' : 'auto', paddingBottom: divider ? 5 : 0, borderBottom: divider ? '1px solid var(--bd)' : 'none' }}>
      <span style={{ color: 'var(--tx4)', fontWeight: 600, flexShrink: 0 }}>{label}</span>
      <MarqueeValue value={value} ltr={ltr} color={color} />
    </span>
  )
  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: F }}>
      {shown.length === 0 && rows.length > 0 && (
        <div style={{ fontSize: 12.5, color: C.ok, padding: '12px 14px', borderRadius: 10, background: `${C.ok}12`, border: `1px solid ${C.ok}33`, fontWeight: 600, textAlign: 'center' }}>
          {T('تم إصدار إقامات كل التأشيرات','All iqamas already issued')}
        </div>
      )}
      {shown.length > 0 && (() => {
        // تبويبات التأشيرات — تظهر فقط التأشيرات غير الصادرة، مع الإبقاء على ترقيمها الأصلي.
        const v = shown[active] || shown[0]
        const i = rows.indexOf(v)
        const st = stateOf(v); const m = stMeta(st)
        return (
          <>
            {shown.length > 1 && (
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {shown.map((row, sIdx) => {
                  const idx = rows.indexOf(row)
                  const isAct = idx === i
                  return (
                    <button key={row.id} type="button" onClick={() => setActive(sIdx)}
                      style={{ flex: 1, minWidth: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 10px', borderRadius: 9, cursor: 'pointer', fontFamily: F, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                        background: isAct ? C.ok + '1a' : 'transparent',
                        border: '1px ' + (isAct ? 'solid ' + C.ok : 'dashed rgba(255,255,255,.14)'),
                        color: isAct ? C.ok : 'var(--tx3)', transition: '.15s' }}>
                      <span>{visaLabel(idx)}</span>
                      {visaComplete(row) && <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.ok, flexShrink: 0 }} />}
                    </button>
                  )
                })}
              </div>
            )}
            <ModalSection key={v.id} Icon={BadgeCheck} label={`${visaLabel(i)}${v.border_number ? ' · ' + v.border_number : ''}`} style={{ marginTop: 6 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* مواصفات التأشيرة */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px 18px', padding: '2px 2px 8px', borderBottom: st === 'eligible' ? '1px solid var(--bd)' : 'none' }}>
                  <KV label={T('الجنسية','Nationality')} value={natOf(v)} divider />
                  <KV label={T('السفارة','Embassy')} value={embOf(v)} divider />
                  <KV label={T('المهنة','Occupation')} value={occOf(v)} divider />
                  <KV label={T('الجنس','Gender')} value={genOf(v)} divider />
                  <KV full label={T('رقم الحدود','Border No.')} value={v.border_number || ''} ltr color={C.gold} />
                </div>
                {/* إدخال بيانات الإقامة — فقط للتأشيرة الجاهزة */}
                {st === 'eligible' ? (
                  <div style={GRID}>
                    <TextField full req label={T('اسم العامل','Worker name')}
                      value={nameVal(v)} onChange={val => setField(v.id, { workerName: val })}
                      placeholder={T('اسم العامل','Worker name')} />
                    <IdField req prefix="2" label={T('رقم الإقامة','Iqama number')}
                      value={fOf(v.id).iqamaNumber || ''} onChange={val => setField(v.id, { iqamaNumber: val })} />
                    <DateField req label={T('تاريخ انتهاء الإقامة','Iqama expiry')}
                      value={fOf(v.id).iqamaExpiry || ''} onChange={val => setField(v.id, { iqamaExpiry: val })} />
                    <FileField full req dropHeight={60} label={T('ملف مقيم','Muqeem file')}
                      value={fOf(v.id).muqeemFile || null} onChange={val => setField(v.id, { muqeemFile: val })} />
                  </div>
                ) : (
                  <div style={{ fontSize: 11.5, color: m.c, fontWeight: 700, textAlign: 'center', padding: '4px 0' }}>{m.label}</div>
                )}
              </div>
            </ModalSection>
          </>
        )
      })()}
      {!eligible.length && rows.some(v => stateOf(v) === 'blocked') && (
        <div style={{ fontSize: 12.5, color: C.warn, padding: '10px 14px', borderRadius: 10, background: `${C.warn}14`, border: `1px solid ${C.warn}33`, fontWeight: 600, lineHeight: 1.8, textAlign: 'center' }}>
          {T('لا توجد تأشيرات جاهزة — يجب سداد دفعة الإقامة لكل تأشيرة أولاً.','No visa is ready — each visa needs its iqama installment paid first.')}
        </div>
      )}
    </div>
  )
  return (
    <Modal open onClose={onClose} title={rows.length === 1 ? T('إصدار الإقامة','Issue Iqama') : T('إصدار الإقامات','Issue Iqamas')} Icon={BadgeCheck} width={560} height="auto" accent={C.ok}
      success={done ? <SuccessView title={rows.length === 1 ? T('تم إصدار الإقامة','Iqama issued') : T('تم إصدار الإقامات','Iqamas issued')} /> : undefined}
      pages={[{ valid: allFilled, error: err || iqDupErr, content }]}
      onSubmit={submit} submitting={saving} submitIcon={CheckCircle2} submitLabel={T('حفظ','Save')} />
  )
}

// تعديل دفعة مُسجّلة — المبلغ/طريقة الدفع/التاريخ/المرجع. يزامن الدفعةَ المرتبطة وإجمالي
// مدفوع الفاتورة بفارق المبلغ (delta)، ويعيد ضبط الحالة. remaining_amount عمود مُولَّد.
function PaymentEditModal({ sb, toast, T, isAr, inv, payment, onClose, onSaved, user }) {
  const isRefund = Number(payment.amount) < 0
  const origMethod = /نقد|cash/i.test(payment.payment_method?.value_ar || payment.payment_method?.value_en || '') ? 'cash' : 'bank'
  const origAbs = Math.abs(Number(payment.amount) || 0)
  // ملاحظة الدفعة — ننظّف بادئة «refund_reason_id:» للبيانات القديمة فنعرض/نحفظ النص فقط.
  const origNotes = (payment.notes || '').split(' — ').map(s => s.trim()).filter(s => s && !/^refund_reason_id:/.test(s)).join(' — ')
  const [amount, setAmount] = useState(String(origAbs))
  const [method, setMethod] = useState(origMethod)
  const [notes, setNotes] = useState(origNotes)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const [pmIds, setPmIds] = useState({ cash: null, bank: null })
  useEffect(() => {
    if (!sb) return
    let alive = true
    ;(async () => {
      const { data } = await sb.from('lookup_items')
        .select('id,code,category:lookup_categories!inner(category_key)')
        .eq('category.category_key', 'payment_method')
      if (!alive) return
      const m = {}; (data || []).forEach(r => { m[r.code] = r.id })
      setPmIds({ cash: m.cash || null, bank: m.bank_transfer || m.bank || null })
    })()
    return () => { alive = false }
  }, [sb])

  const absVal = Number(amount) || 0
  // Per-field permission gates (invoices tab). A hidden field is not rendered and never blocks submit.
  const visAmount = fieldVisible(user, 'invoices', 'payment_amount')
  const visMethod = fieldVisible(user, 'invoices', 'payment_method')
  const visNotes = fieldVisible(user, 'invoices', 'payment_notes')
  const valid = (!visAmount || absVal > 0) && (!isRefund || !visNotes || notes.trim().length > 0)
  const save = async () => {
    if (saving || !valid || !payment.id) return
    setErr(''); setSaving(true)
    try {
      const newAmount = isRefund ? -absVal : absVal
      const delta = newAmount - (Number(payment.amount) || 0)
      // مبالغ الفاتورة الطازجة كي لا نبني على paid_amount قديم.
      const { data: invFresh, error: e0 } = await sb.from('invoices')
        .select('total_amount, paid_amount, payment_log, status:status_id(code)').eq('id', inv.id).maybeSingle()
      if (e0) throw e0
      const totalNum = Number(invFresh?.total_amount) || 0
      const newInvPaid = (Number(invFresh?.paid_amount) || 0) + delta
      if (newInvPaid < -0.005) { setErr(T('المبلغ يجعل مدفوع الفاتورة سالباً','Amount would make invoice paid negative')); setSaving(false); return }
      if (newInvPaid > totalNum + 0.005) { setErr(T('المبلغ يجعل مدفوع الفاتورة أكبر من الإجمالي','Amount would make invoice paid exceed total')); setSaving(false); return }

      // مزامنة جدول الدفعات: وزّع الفارق على كل الدفعات بحيث يبقى مجموع مدفوعها = مدفوع الفاتورة.
      // (لا نكتفي بـ payment.installment_id: الدفعة المقدّمة وقت الإصدار قد لا تحمل ربطاً وتُوزَّع على
      //  عدة دفعات، فالاكتفاء بدفعةٍ واحدة كان يُحدث انحرافاً دائماً بين مدفوع الدفعات ومدفوع الفاتورة.)
      //  موجب = تعبئة FIFO بالترتيب، سالب = تفريغ LIFO عكسياً — كمنطق التسجيل/الاسترجاع. (remaining مُولَّد.)
      const r2p = n => Math.round((Number(n) || 0) * 100) / 100
      const { data: instRows } = await sb.from('installments')
        .select('id, total_amount, paid_amount, installment_order, visa_application_id, notes')
        .eq('invoice_id', inv.id).is('deleted_at', null).order('installment_order')
      if (Array.isArray(instRows) && instRows.length && Math.abs(delta) > 0.005) {
        const nowI = new Date().toISOString()
        const apply = async (it, np) => {
          const tot = Number(it.total_amount) || 0
          await sb.from('installments').update({
            paid_amount: r2p(np),
            paid_date: (tot > 0 && np >= tot - 0.005) ? nowI : null,
          }).eq('id', it.id)
        }
        if (delta > 0) {
          let left = r2p(delta)
          for (const it of instRows) {
            if (left <= 0.005) break
            const tot = Number(it.total_amount) || 0, pd = Number(it.paid_amount) || 0
            const room = r2p(tot - pd); if (room <= 0.005) continue
            const take = r2p(Math.min(left, room)); left = r2p(left - take)
            await apply(it, pd + take)
          }
        } else {
          // خطّط التفريغ (LIFO) أولاً ثم تحقّق قبل الكتابة: لو كان سيُنزل دفعةَ إقامةٍ صدرت لها معاملة
          // إقامة مستقلة دون «مدفوعة بالكامل»، امنع التعديل ووجّه للاسترجاع — كي لا تبقى معاملة الإقامة
          // قائمة في تبويبات الأقسام بينما إيرادها لم يَعُد محصّلاً (تجاوز عكسي لقفل الدفع).
          const isIqaNote = it => /إقامة|اقامة|iqama|residence/i.test(it.notes || '')
          let spawned = new Set()
          const srIdP = inv.service_request?.id
          if (srIdP) {
            const { data: sp } = await sb.from('iqama_issuance_applications')
              .select('visa_application_id').eq('service_request_id', srIdP).is('deleted_at', null)
            spawned = new Set((sp || []).map(r => r.visa_application_id).filter(Boolean))
          }
          let leftSim = r2p(-delta)
          const plan = []
          for (const it of instRows.slice().reverse()) {
            if (leftSim <= 0.005) break
            const pd = Number(it.paid_amount) || 0; if (pd <= 0.005) continue
            const take = r2p(Math.min(leftSim, pd)); leftSim = r2p(leftSim - take)
            plan.push({ it, np: r2p(pd - take) })
          }
          const blocked = plan.some(p => p.it.visa_application_id && spawned.has(p.it.visa_application_id)
            && isIqaNote(p.it) && p.np < (Number(p.it.total_amount) || 0) - 0.005)
          if (blocked) { setErr(T('هذا التعديل يُلغي سداد دفعة إقامةٍ صدرت لها معاملة إقامة — استخدم الاسترجاع بدل تعديل الدفعة', 'This edit would unsettle a residence installment that already started an iqama transaction — use refund instead')); setSaving(false); return }
          for (const p of plan) await apply(p.it, p.np)
        }
      }

      const pmId = method === 'bank' ? pmIds.bank : pmIds.cash
      const payPatch = { amount: newAmount, bank_reference: method === 'bank' ? (payment.bank_reference || null) : null, notes: notes.trim() || null }
      if (pmId) payPatch.payment_method_id = pmId
      const { error: e1 } = await sb.from('payments').update(payPatch).eq('id', payment.id)
      if (e1) throw e1

      // سجلّ تعديل الدفعات — يُلحق بـ payment_log (نفس نمط note_log/pricing_log): ماذا تغيّر، من، ومتى.
      const mLabel = m => m === 'bank' ? T('حوالة بنكية', 'Bank') : T('نقداً', 'Cash')
      const changes = []
      if (absVal !== origAbs) changes.push({ field: 'amount', from: origAbs, to: absVal })
      if (method !== origMethod) changes.push({ field: 'method', from: mLabel(origMethod), to: mLabel(method) })
      if (notes.trim() !== origNotes.trim()) changes.push({ field: 'notes', from: origNotes.trim(), to: notes.trim() })
      const nowIso = new Date().toISOString()
      const invPatch = { paid_amount: newInvPaid, last_activity_at: nowIso, ...await invoiceStatusPatch(sb, invFresh?.status?.code, newInvPaid, totalNum) }
      if (changes.length) {
        const plog = Array.isArray(invFresh?.payment_log) ? invFresh.payment_log : []
        invPatch.payment_log = [...plog, { at: nowIso, by: user?.id || null, by_name: user?.person?.name_ar || user?.person?.name_en || null, payment_id: payment.id, isRefund, changes }]
      }
      const { error: e2 } = await sb.from('invoices').update(invPatch).eq('id', inv.id)
      if (e2) throw e2

      onSaved?.(); setDone(true)
    } catch { setErr(T('تعذر الحفظ','Save failed')) }
    finally { setSaving(false) }
  }

  // لون العملية: أخضر للدفعة العادية، أحمر للاسترجاع (يوحّد لون النافذة مع نوع العملية).
  const color = isRefund ? C.red : C.ok
  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: F }}>
      <ModalSection Icon={Wallet} label={isRefund ? T('تفاصيل الاسترجاع','Refund Details') : T('تفاصيل الدفعة','Payment Details')} style={{ marginTop: 6 }}>
        {/* المبلغ بارز + كل حقل في صفّ مستقل — مطابقة لنافذة تسجيل دفعة. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {visAmount && <CurrencyField big full req label={isRefund ? T('مبلغ الاسترجاع','Refund Amount') : T('المبلغ','Amount')}
            value={amount} onChange={v => { setErr(''); setAmount(v) }} unit={T('ريال','SAR')} disabled={!fieldEditable(user, 'invoices', 'payment_amount')} />}
          {visMethod && <Segmented full label={T('طريقة الدفع','Payment Method')} value={method} onChange={v => { setErr(''); setMethod(v) }}
            options={[{ v: 'cash', l: T('نقداً','Cash'), c: color }, { v: 'bank', l: T('حوالة بنكية','Bank'), c: color }]} disabled={!fieldEditable(user, 'invoices', 'payment_method')} />}
          {visNotes && (() => { const editNotes = fieldEditable(user, 'invoices', 'payment_notes'); return (
          <div style={{ ...FULL, ...(editNotes ? {} : { opacity: .55, pointerEvents: 'none' }) }}>
            <TextArea full req={isRefund} rows={3}
              label={isRefund ? T('السبب','Reason') : T('ملاحظة','Note')}
              value={notes} onChange={v => { if (!editNotes) return; setErr(''); setNotes(v) }}
              placeholder={isRefund ? T('اذكر سبب الاسترجاع…','Explain the refund reason…') : T('ملاحظة خاصة بهذه الدفعة…','A note for this payment…')} />
          </div>
          )})()}
        </div>
      </ModalSection>
    </div>
  )
  return (
    <Modal open onClose={onClose} title={T('تعديل الدفعة','Edit payment')} Icon={Wallet} width={560} height="auto" accent={color}
      success={done ? <SuccessView title={T('تم حفظ التعديلات','Changes saved')} /> : undefined}
      pages={[{ valid, error: err || undefined, content }]}
      onSubmit={save} submitting={saving} submitIcon={CheckCircle2} submitLabel={T('تعديل الدفعة','Update payment')} />
  )
}

// تعديل تسعير الفاتورة — بنود التسعيرة (اسم + مبلغ) والإجمالي. يحدّث total_amount و
// pricing_breakdown ويعيد ضبط الحالة. لا يعيد توزيع جدول الدفعات (يُدار من مكانه).
function PricingEditModal({ sb, toast, T, inv, paid = 0, onClose, onSaved, user }) {
  const hasBreakdown = Array.isArray(inv.pricing_breakdown) && inv.pricing_breakdown.length > 0
  const [lines, setLines] = useState(hasBreakdown ? inv.pricing_breakdown.map(l => ({ label: l.label || '', amount: String(l.amount ?? '') })) : [])
  const [flatTotal, setFlatTotal] = useState(String(Number(inv.total_amount) || ''))
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const computedTotal = hasBreakdown ? lines.reduce((s, l) => s + (Number(l.amount) || 0), 0) : (Number(flatTotal) || 0)
  // Per-field permission gates (invoices tab). Line items keyed by pricing_breakdown; flat total by pricing_total.
  const visBreakdown = fieldVisible(user, 'invoices', 'pricing_breakdown')
  const editBreakdown = fieldEditable(user, 'invoices', 'pricing_breakdown')
  const visTotal = fieldVisible(user, 'invoices', 'pricing_total')
  const editTotal = fieldEditable(user, 'invoices', 'pricing_total')
  const setLine = (i, k, v) => { setErr(''); setLines(p => p.map((l, j) => j === i ? { ...l, [k]: v } : l)) }
  const addLine = () => setLines(p => [...p, { label: '', amount: '' }])
  // البند الأول (الخدمة الأساسية) لا يُحذف — حماية على مستوى المنطق إضافةً لإخفاء زرّه.
  const removeLine = i => { if (i === 0) return; setLines(p => p.filter((_, j) => j !== i)) }
  const valid = computedTotal >= 0 && (!hasBreakdown || lines.every(l => l.label.trim()))
  const save = async () => {
    if (saving || !inv?.id) return
    if (computedTotal < paid - 0.005) { setErr(T('الإجمالي أقل من المبلغ المدفوع','Total is less than the paid amount')); return }
    setErr(''); setSaving(true)
    try {
      const nowIso = new Date().toISOString()
      const { data: invFresh } = await sb.from('invoices').select('paid_amount, pricing_log, status:status_id(code)').eq('id', inv.id).maybeSingle()
      const curPaid = Number(invFresh?.paid_amount) || 0
      const newLines = hasBreakdown ? lines.map(l => ({ label: l.label.trim(), amount: Number(l.amount) || 0 })) : []
      const patch = { total_amount: computedTotal, last_activity_at: nowIso }
      if (hasBreakdown) patch.pricing_breakdown = newLines
      // سجلّ تعديل التسعير — يُلحق بـ pricing_log (نفس نمط note_log): تغيّر الإجمالي + كل بند. نقرأ السجل الحالي أولاً لتفادي الكتابة فوق تعديلات متزامنة.
      const oldTotal = Number(inv.total_amount) || 0
      const changes = pricingEditChanges(inv.pricing_breakdown, newLines)
      if (oldTotal !== computedTotal || changes.length) {
        const log = Array.isArray(invFresh?.pricing_log) ? invFresh.pricing_log : []
        patch.pricing_log = [...log, { at: nowIso, by: user?.id || null, by_name: user?.person?.name_ar || user?.person?.name_en || null, total: { from: oldTotal, to: computedTotal }, changes }]
      }
      const stPatch = await invoiceStatusPatch(sb, invFresh?.status?.code, curPaid, computedTotal)
      const { error } = await sb.from('invoices').update({ ...patch, ...stPatch }).eq('id', inv.id)
      if (error) throw error
      // مزامنة جدول الدفعات مع الإجمالي الجديد كي لا يبقى مجموع الدفعات مخالفاً للتسعير:
      //  • دفعة واحدة → تُضبط على الإجمالي مباشرة.
      //  • دفعات متعددة → الدفعات المسدّدة بالكامل تبقى كما هي، والفرق (إجمالي جديد − مجموع الدفعات الحالي)
      //    يُوزّع على الدفعات غير المسدّدة نسبياً لمتبقّي كلٍّ منها (آخر دفعة مفتوحة تستوعب فرق التقريب).
      // remaining_amount عمود محسوب فيتحدّث تلقائياً.
      const { data: insRows } = await sb.from('installments').select('id,total_amount,paid_amount,installment_order').eq('invoice_id', inv.id).is('deleted_at', null).order('installment_order')
      if (Array.isArray(insRows) && insRows.length) {
        const r2 = n => Math.round((Number(n) || 0) * 100) / 100
        const sumT = insRows.reduce((s, r) => s + (Number(r.total_amount) || 0), 0)
        const delta = r2(computedTotal - sumT)
        if (Math.abs(delta) > 0.005) {
          if (insRows.length === 1) {
            const only = insRows[0]
            if (computedTotal >= Number(only.paid_amount) - 0.005) {
              await sb.from('installments').update({ total_amount: computedTotal }).eq('id', only.id)
            }
          } else {
            // أعِد توزيع جدول الدفعات بحيث: مجموع إجمالي الدفعات = الإجمالي الجديد دائماً،
            // ولا تقل أي دفعة عن مسدّدها. نبدأ كل دفعة من مسدّدها (أرضية) ثم نوزّع الزيادة
            // (الإجمالي الجديد − مجموع المسدّد) بنسبة متبقّي كل دفعة — فإن كانت كل الدفعات مسدّدة
            // بالكامل (لا متبقٍّ) تستوعب آخرُ دفعة الزيادةَ بالكامل. هذا مطابق للسلوك السابق
            // للدفعات المدفوعة جزئياً، ويُصلح حالة رفع إجمالي فاتورة مسدّدة بالكامل (كان الفرق يضيع).
            const rows = insRows.slice().sort((a, b) => (Number(a.installment_order) || 0) - (Number(b.installment_order) || 0))
            const paidArr = rows.map(r => r2(Number(r.paid_amount) || 0))
            const floorSum = r2(paidArr.reduce((s, v) => s + v, 0))
            let extra = r2(computedTotal - floorSum); if (extra < 0) extra = 0
            const remArr = rows.map((r, i) => Math.max(0, r2((Number(r.total_amount) || 0) - paidArr[i])))
            const remSum = r2(remArr.reduce((s, v) => s + v, 0))
            const weights = remSum > 0.005 ? remArr.map(v => v / remSum) : rows.map((_, i) => i === rows.length - 1 ? 1 : 0)
            const newTotals = paidArr.slice()
            let acc = 0
            for (let i = 0; i < rows.length; i++) {
              const add = i === rows.length - 1 ? r2(extra - acc) : r2(extra * weights[i])
              acc = r2(acc + add)
              newTotals[i] = r2(newTotals[i] + add)
            }
            for (let i = 0; i < rows.length; i++) {
              if (r2(newTotals[i]) !== r2(Number(rows[i].total_amount) || 0)) {
                await sb.from('installments').update({ total_amount: r2(newTotals[i]) }).eq('id', rows[i].id)
              }
            }
          }
        }
      }
      onSaved?.(); setDone(true)
    } catch { setErr(T('تعذر الحفظ','Save failed')) }
    finally { setSaving(false) }
  }
  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: F }}>
      <ModalSection Icon={Wallet} label={T('التسعير','Pricing')} style={{ marginTop: 6 }}>
        {hasBreakdown ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {lines.map((l, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <TextField label={i === 0 ? T('البند','Item') : undefined} value={l.label} onChange={v => setLine(i, 'label', v)} placeholder={T('اسم البند','Item label')} disabled={!editBreakdown} />
                </div>
                <div style={{ width: 130 }}>
                  <CurrencyField label={i === 0 ? T('المبلغ','Amount') : undefined} value={l.amount} onChange={v => setLine(i, 'amount', v)} unit={T('ريال','SAR')} disabled={!editBreakdown} />
                </div>
                {(i === 0 || !editBreakdown) ? (
                  // الخدمة الأساسية لا تُحذف — مسافة فارغة بنفس عرض الزر للحفاظ على المحاذاة.
                  <div style={{ flexShrink: 0, width: 38, height: 42 }} />
                ) : (
                  <button type="button" onClick={() => removeLine(i)} title={T('حذف','Remove')}
                    style={{ flexShrink: 0, width: 38, height: 42, borderRadius: 9, border: '1px solid rgba(232,114,101,.3)', background: 'rgba(232,114,101,.08)', color: C.red, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                  </button>
                )}
              </div>
            ))}
            {editBreakdown && <button type="button" onClick={addLine}
              style={{ alignSelf: 'flex-end', height: 36, padding: '0 14px', borderRadius: 9, border: '1px dashed var(--accent-bd)', background: 'rgba(212,160,23,.06)', color: 'var(--accent)', fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, direction: 'ltr' }}>
              <Plus size={14} /> <span>{T('إضافة بند','Add item')}</span>
            </button>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--bd)' }}>
              <span style={{ fontSize: 15, color: C.gold, fontWeight: 700 }}>{T('الإجمالي','Total')}</span>
              <span style={{ fontSize: 16, color: C.gold, fontWeight: 800, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(computedTotal)}</span>
            </div>
          </div>
        ) : (
          visTotal && (
          <div style={GRID}>
            <CurrencyField full label={T('إجمالي الفاتورة','Invoice Total')} req value={flatTotal} onChange={v => { setErr(''); setFlatTotal(v) }} unit={T('ريال','SAR')} disabled={!editTotal} />
          </div>
          )
        )}
      </ModalSection>
    </div>
  )
  return (
    <Modal open onClose={onClose} title={T('تعديل التسعير','Edit pricing')} Icon={Wallet} width={560} height="min(600px, 92vh)" accent={C.gold}
      success={done ? <SuccessView title={T('تم حفظ التعديلات','Changes saved')} /> : undefined}
      pages={[{ valid, error: err || undefined, content }]}
      onSubmit={save} submitting={saving} submitIcon={CheckCircle2} submitLabel={T('حفظ التسعير','Save pricing')} />
  )
}

// سجلّ تغييرات موحّد — يُعرض أسفل البطاقات (العميل/العامل/الخدمة/الملاحظة) بنمط واحد:
// أيقونة تاريخ + عنوان، ثم بطاقة لكل تعديل (الأحدث أولاً) فيها «تم… بواسطة فلان» + الوقت + التفاصيل.
const ChangeLog = ({ T, title, entries, actionLabel, renderDetail }) => {
  if (!Array.isArray(entries) || !entries.length) return null
  return (
    <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 7 }}>
      <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>
        {title}
      </span>
      {[...entries].reverse().map((c, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '9px 11px', borderRadius: 10, background: 'var(--inputBg)', border: '1px solid var(--bd)' }}>
          <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 7, background: 'rgba(212,160,23,.1)', border: '1px solid rgba(212,160,23,.28)', color: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </span>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', minWidth: 0 }}>
                <span style={{ fontSize: 11.5, color: 'var(--tx2)', fontWeight: 700 }}>{actionLabel}</span>
                {c.by_name && <span style={{ fontSize: 11, color: C.gold, fontWeight: 700 }}>{T('بواسطة', 'by')} {c.by_name}</span>}
              </div>
              <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, direction: 'ltr', flexShrink: 0 }}>{fmtDateTime(c.at)}</span>
            </div>
            {renderDetail && renderDetail(c)}
          </div>
        </div>
      ))}
    </div>
  )
}

// تفاصيل تغييرات الحقول داخل ChangeLog — لكل حقل: التسمية، القيمة الجديدة، والقديمة (مشطوبة) أو «جديد».
const FieldChanges = ({ T, changes, LBL, showVal }) => (
  <>{(Array.isArray(changes) ? changes : []).map((ch, j) => (
    <div key={j} style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
      <span>{T(LBL[ch.field]?.[0] || ch.field, LBL[ch.field]?.[1] || ch.field)}:</span>
      <span style={{ color: 'var(--tx2)', fontWeight: 700 }}>{showVal ? showVal(ch.field, ch.to) : (ch.to || '—')}</span>
      {ch.from
        ? <span style={{ color: 'var(--tx5)' }}>({T('كان', 'was')}: <span style={{ textDecoration: 'line-through' }}>{showVal ? showVal(ch.field, ch.from) : ch.from}</span>)</span>
        : <span style={{ color: 'var(--tx5)' }}>({T('جديد', 'new')})</span>}
    </div>
  ))}</>
)

// فرق بنود التسعيرة بين الحالة القديمة والجديدة (مقارنة بالترتيب) — لكل بند: مُضاف/محذوف/تغيّر مبلغه أو اسمه.
const pricingEditChanges = (oldLines, newLines) => {
  const O = Array.isArray(oldLines) ? oldLines : []
  const N = Array.isArray(newLines) ? newLines : []
  const out = []
  for (let i = 0; i < Math.max(O.length, N.length); i++) {
    const o = O[i], n = N[i]
    const oL = (o?.label || '').trim(), nL = (n?.label || '').trim()
    const oA = o ? Number(o.amount) || 0 : null, nA = n ? Number(n.amount) || 0 : null
    if (o && !n) out.push({ label: oL || '—', from: oA, to: null })
    else if (!o && n) out.push({ label: nL || '—', from: null, to: nA })
    else if (o && n && (oL !== nL || oA !== nA)) out.push({ label: nL || oL || '—', from: oA, to: nA, fromLabel: oL !== nL ? oL : undefined })
  }
  return out
}

// تفاصيل تغيير التسعير داخل ChangeLog — تغيّر الإجمالي + كل بند (مُضاف/محذوف/تعديل).
const PricingChanges = ({ T, entry }) => {
  const rowS = { fontSize: 11, color: 'var(--tx4)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }
  const lines = Array.isArray(entry.changes) ? entry.changes : []
  const tot = entry.total
  return (
    <>
      {tot && Number(tot.from) !== Number(tot.to) && (
        <div style={rowS}>
          <span style={{ color: C.gold }}>{T('الإجمالي', 'Total')}:</span>
          <span style={{ color: 'var(--tx2)', fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(tot.to)}</span>
          <span style={{ color: 'var(--tx5)' }}>({T('كان', 'was')}: <span style={{ textDecoration: 'line-through', direction: 'ltr' }}>{num(tot.from)}</span>)</span>
        </div>
      )}
      {lines.map((ch, j) => (
        <div key={j} style={rowS}>
          <span>{ch.label}{ch.fromLabel ? <span style={{ color: 'var(--tx5)' }}> ({T('كان', 'was')}: <span style={{ textDecoration: 'line-through' }}>{ch.fromLabel}</span>)</span> : ''}:</span>
          {ch.to == null
            ? <span style={{ color: C.red, fontWeight: 700 }}>{T('حُذف', 'removed')} <span style={{ color: 'var(--tx5)', fontWeight: 600 }}>(<span style={{ textDecoration: 'line-through', direction: 'ltr' }}>{num(ch.from)}</span>)</span></span>
            : <>
                <span style={{ color: 'var(--tx2)', fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(ch.to)}</span>
                {ch.from == null
                  ? <span style={{ color: 'var(--tx5)' }}>({T('جديد', 'new')})</span>
                  : <span style={{ color: 'var(--tx5)' }}>({T('كان', 'was')}: <span style={{ textDecoration: 'line-through', direction: 'ltr' }}>{num(ch.from)}</span>)</span>}
              </>}
        </div>
      ))}
    </>
  )
}

// ═══════════════════ تعديل التأشيرة الدائمة (المكتب + المجموعات + توزيع الملفات) ═══════════════════
// نافذة منبثقة بنفس تصميم ويزارد الإنشاء: مجموعات (جنسية/سفارة/مهنة/جنس/عدد) ثم توزيعها على ملفات
// (الملف يضم ≤4 تأشيرات متطابقة الجنسية/السفارة/الجنس/المهنة). تُحمَّل البيانات الحالية وتُسوَّى عند الحفظ
// مع الحفاظ على صفوف التأشيرات القائمة (مع روابط الدفعات/المنشأة) ما دامت سمتُها لم تتغيّر.
const vBucketKey = g => `${g?.nationality || ''}|${g?.embassy || ''}|${g?.gender || ''}|${g?.profession || ''}`
const vFilesValid = (files, groups) => {
  const byId = Object.fromEntries((groups || []).map(g => [String(g.id), g]))
  if (!files || !files.length) return (groups || []).every(g => (parseInt(g.count) || 0) <= 0)
  const need = {}; for (const g of groups || []) { const c = parseInt(g.count) || 0; if (c > 0) need[String(g.id)] = c }
  const have = {}
  for (const f of files) {
    const ks = new Set(); let fc = 0
    for (const [gid, n] of Object.entries(f.assignments || {})) {
      const cnt = parseInt(n) || 0; if (cnt <= 0) continue
      const g = byId[String(gid)]; if (!g) return false
      ks.add(vBucketKey(g)); fc += cnt
      have[String(gid)] = (have[String(gid)] || 0) + cnt
    }
    if (ks.size > 1 || fc > 4) return false
  }
  for (const k of new Set([...Object.keys(need), ...Object.keys(have)])) { if ((need[k] || 0) !== (have[k] || 0)) return false }
  return true
}
const vPackFiles = (groups) => {
  const buckets = []
  for (const g of groups || []) {
    const cnt = parseInt(g.count) || 0; if (cnt <= 0) continue
    const key = vBucketKey(g)
    let b = buckets.find(x => x.key === key)
    if (!b) { b = { key, items: [] }; buckets.push(b) }
    b.items.push({ id: g.id, rem: cnt })
  }
  const files = []; let fid = 1
  for (const b of buckets) {
    let total = b.items.reduce((s, it) => s + it.rem, 0)
    while (total > 0) {
      const take = Math.min(4, total); total -= take
      const a = {}; let need = take
      while (need > 0) { const it = b.items.find(x => x.rem > 0); if (!it) break; const t = Math.min(it.rem, need); a[it.id] = (a[it.id] || 0) + t; it.rem -= t; need -= t }
      files.push({ id: fid++, assignments: a })
    }
  }
  return files
}

function PermanentVisaEditModal({ sb, toast, T, isAr, inv, data, editorId, editorName, onClose, onSaved }) {
  const srId = inv.service_request?.id
  const MAX_VISAS = 4, MAX_FILES = 4
  const ORD_AR = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن']
  const ORD_AR_F = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة']

  const [loading, setLoading] = useState(true)
  const [lkCountries, setLkCountries] = useState([])
  const [lkEmbassies, setLkEmbassies] = useState([])
  const [lkOccupations, setLkOccupations] = useState([])
  const [branches, setBranches] = useState([])
  const [branchId, setBranchId] = useState(inv.branch?.id || '')
  const [groups, setGroups] = useState([])
  const [files, setFiles] = useState([])
  const [origRows, setOrigRows] = useState([])
  const [origGroups, setOrigGroups] = useState([])   // لقطة المجموعات الأصلية (لمقارنة سجل التعديل)
  const [origFiles, setOrigFiles] = useState([])     // لقطة توزيع الملفات الأصلي
  const [refIds, setRefIds] = useState(new Set())
  const [expanded, setExpanded] = useState(new Set())
  const [autoMode, setAutoMode] = useState(true)
  const [page, setPage] = useState(0)        // 0 المكتب · 1 المجموعات · 2 الملفات
  const [dragInfo, setDragInfo] = useState(null)
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  // تحميل القوائم (الجنسيات/السفارات/المهن) + المكاتب + صفوف التأشيرات الحالية، ثم اشتقاق المجموعات والملفات منها.
  useEffect(() => {
    if (!sb || !srId) return
    let alive = true
    ;(async () => {
      const [brRes, occRes, natRes, emRes, vaRes, instRes] = await Promise.all([
        sb.from('branches').select('id,branch_code').order('branch_code'),
        sb.from('occupations').select('id,name_ar,code').is('is_active', true).order('name_ar').limit(2000),
        sb.from('nationalities').select('id,name_ar,code,country_name_ar,flag_url').is('is_active', true).order('name_ar'),
        sb.from('embassies').select('id,name_ar,name_en,nationality_id').is('is_active', true).order('name_ar'),
        sb.from('visa_applications').select('id,file_number,gender,nationality_id,occupation_id,embassy_id,visa_number,border_number,wakalah_number,wakalah_date,wakalah_office,visa_used,main_facility_id').eq('service_request_id', srId),
        sb.from('installments').select('visa_application_id').eq('invoice_id', inv.id).is('deleted_at', null),
      ])
      if (!alive) return
      setBranches(brRes.data || [])
      setLkOccupations((occRes.data || []).map(o => ({ id: o.id, value_ar: o.name_ar, code: o.code })))
      const GCC = new Set(['SA', 'AE', 'KW', 'QA', 'BH', 'OM'])
      const seen = new Set(), uniq = []
      for (const c of (natRes.data || [])) { const code = (c.code || '').toUpperCase(); const nat = c.name_ar; if (nat && !seen.has(nat) && !GCC.has(code)) { seen.add(nat); uniq.push({ id: c.id, nationality_ar: c.name_ar, code: c.code, flag_url: c.flag_url || null }) } }
      setLkCountries(uniq)
      setLkEmbassies((emRes.data || []).map(e => ({ id: e.id, country_id: e.nationality_id || null, city_ar: e.name_ar, name_en: e.name_en || null })))
      const rows = vaRes.data || []
      setOrigRows(rows)
      setRefIds(new Set((instRes.data || []).map(i => i.visa_application_id).filter(Boolean)))
      // اشتقاق المجموعات: صفوف متطابقة (جنسية/سفارة/جنس/مهنة) = مجموعة واحدة، عددها = عدد الصفوف.
      const sigOf = r => `${r.nationality_id || ''}|${r.embassy_id || ''}|${r.gender || ''}|${r.occupation_id || ''}`
      const sigMap = new Map(); let gid = 1
      for (const r of rows) {
        const sig = sigOf(r)
        if (!sigMap.has(sig)) sigMap.set(sig, { id: gid++, sig, nationality: r.nationality_id || '', embassy: r.embassy_id || '', profession: r.occupation_id || '', gender: r.gender || 'male', count: 0 })
        sigMap.get(sig).count++
      }
      const grps = [...sigMap.values()].map(g => ({ ...g, count: String(g.count) }))
      const finalGroups = grps.length ? grps : [{ id: 1, sig: '|||', nationality: '', embassy: '', profession: '', gender: 'male', count: '1' }]
      setGroups(finalGroups)
      setOrigGroups(finalGroups)
      setExpanded(new Set([finalGroups[0].id]))
      // اشتقاق الملفات من file_number الحالي.
      const sigToGid = {}; finalGroups.forEach(g => { sigToGid[g.sig] = g.id })
      const byFile = {}
      for (const r of rows) { const fn = r.file_number != null ? r.file_number : 1; byFile[fn] = byFile[fn] || {}; const g = sigToGid[sigOf(r)]; if (g != null) byFile[fn][g] = (byFile[fn][g] || 0) + 1 }
      const fileNos = Object.keys(byFile).map(Number).sort((a, b) => a - b)
      const fls = fileNos.map((fn, i) => ({ id: i + 1, assignments: byFile[fn] }))
      const finalFiles = fls.length ? fls : vPackFiles(finalGroups)
      setFiles(finalFiles)
      setOrigFiles(finalFiles)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [sb, srId, inv.id])

  // ─── مشتقّات ───
  const totalVisas = groups.reduce((s, g) => s + (parseInt(g.count) || 0), 0)
  const fileCount = f => Object.values(f.assignments || {}).reduce((s, n) => s + (parseInt(n) || 0), 0)
  const sumF = files.reduce((s, f) => s + fileCount(f), 0)
  const remaining = totalVisas - sumF
  const groupAssigned = gid => files.reduce((s, f) => s + (parseInt(f.assignments?.[gid]) || 0), 0)
  const groupRem = gid => { const g = groups.find(x => x.id === gid); return (parseInt(g?.count) || 0) - groupAssigned(gid) }
  const bucketOfFile = f => { for (const g of groups) { if ((parseInt(f.assignments?.[g.id]) || 0) > 0) return vBucketKey(g) } return null }
  const groupBucket = gid => vBucketKey(groups.find(x => x.id === gid))
  const isGroupComplete = g => !!(g.nationality && g.embassy && g.profession && g.gender && (parseInt(g.count) || 0) >= 1)
  const groupsValid = groups.length > 0 && groups.every(isGroupComplete) && totalVisas >= 1 && totalVisas <= MAX_VISAS
  const filesValid = vFilesValid(files, groups) && sumF === totalVisas && totalVisas > 0
  const multiGroup = groups.length > 1

  // ─── محرّرات المجموعات ───
  const updateGroup = (id, patch) => setGroups(gs => gs.map(g => g.id === id ? { ...g, ...patch, sig: vBucketKey({ ...g, ...patch }) } : g))
  const addGroup = () => {
    if (groups.length >= 4) return
    if (totalVisas >= MAX_VISAS) { setErr(T(`الحد الأقصى ${MAX_VISAS} تأشيرة`, `Max ${MAX_VISAS} visas`)); return }
    const newId = Math.max(0, ...groups.map(g => g.id)) + 1
    setGroups(gs => [...gs, { id: newId, sig: '|||', nationality: '', embassy: '', profession: '', gender: 'male', count: '1' }])
    setExpanded(new Set([newId]))
  }
  const removeGroup = (id) => {
    setGroups(gs => {
      const next = gs.filter(g => g.id !== id)
      setExpanded(prev => prev.has(id) ? (next.length ? new Set([next[0].id]) : new Set()) : prev)
      return next
    })
    setFiles(fs => fs.map(f => { const a = { ...(f.assignments || {}) }; delete a[id]; return { ...f, assignments: a } }))
  }

  // ─── محرّرات الملفات (نفس منطق الويزارد) ───
  const incGroup = (fid, gid) => { if (remaining <= 0) return; setAutoMode(false); setFiles(fs => fs.map(f => {
    if (f.id !== fid) return f
    if (fileCount(f) >= 4) return f
    const bk = bucketOfFile(f); if (bk && bk !== groupBucket(gid)) return f
    return { ...f, assignments: { ...(f.assignments || {}), [gid]: (parseInt(f.assignments?.[gid]) || 0) + 1 } }
  })) }
  const decGroup = (fid, gid) => { setAutoMode(false); setFiles(fs => fs.map(f => {
    if (f.id !== fid) return f
    const cur = parseInt(f.assignments?.[gid]) || 0; if (cur <= 0) return f
    const next = { ...(f.assignments || {}) }; next[gid] = cur - 1; if (next[gid] <= 0) delete next[gid]
    return { ...f, assignments: next }
  })) }
  const addFile = () => { setAutoMode(false); setFiles(fs => fs.length >= MAX_FILES ? fs : [...fs, { id: Math.max(0, ...fs.map(f => f.id)) + 1, assignments: {} }]) }
  const removeFile = (fid) => { setAutoMode(false); setFiles(fs => fs.filter(f => f.id !== fid)) }
  const moveVisa = (fromFid, toFid, gid) => {
    if (fromFid === toFid) return
    const dest = files.find(f => f.id === toFid); if (!dest) return
    if (fileCount(dest) >= 4) return
    const destBk = bucketOfFile(dest); if (destBk && destBk !== groupBucket(gid)) return
    setAutoMode(false)
    setFiles(fs => fs.map(f => {
      if (f.id === fromFid) { const cur = parseInt(f.assignments?.[gid]) || 0; if (cur <= 0) return f; const next = { ...(f.assignments || {}) }; next[gid] = cur - 1; if (next[gid] <= 0) delete next[gid]; return { ...f, assignments: next } }
      if (f.id === toFid) { if (fileCount(f) >= 4) return f; return { ...f, assignments: { ...(f.assignments || {}), [gid]: (parseInt(f.assignments?.[gid]) || 0) + 1 } } }
      return f
    }))
  }
  const goFiles = () => { if (!groupsValid) { setErr(T('أكمل بيانات كل المجموعات', 'Complete every group')); return } if (!vFilesValid(files, groups)) setFiles(vPackFiles(groups)); setErr(''); setPage(2) }

  // ─── الحفظ: تسوية صفوف visa_applications مع الحفاظ على الصفوف القائمة ما أمكن ───
  const save = async () => {
    if (saving) return
    if (!groupsValid) { setErr(T('أكمل بيانات كل المجموعات', 'Complete every group')); setPage(1); return }
    if (!filesValid) { setErr(T('وزّع جميع التأشيرات على الملفات', 'Distribute all visas across files')); setPage(2); return }
    setErr(''); setSaving(true)
    try {
      const groupById = Object.fromEntries(groups.map(g => [String(g.id), g]))
      // الشرائح المطلوبة: ملفات غير فارغة مُعاد ترقيمها 1..N، ولكل تأشيرة سمتها ورقم ملفها.
      const nonEmpty = files.filter(f => fileCount(f) > 0)
      const desiredBySig = {}, sigAttrs = {}
      nonEmpty.forEach((f, fi) => {
        const fileNo = fi + 1
        Object.entries(f.assignments || {}).forEach(([gid, cnt]) => {
          const g = groupById[String(gid)]; if (!g) return
          const sig = vBucketKey(g)
          sigAttrs[sig] = { nat: g.nationality || null, occ: g.profession || null, emb: g.embassy || null, gender: g.gender || null }
          for (let k = 0; k < (parseInt(cnt) || 0); k++) (desiredBySig[sig] = desiredBySig[sig] || []).push(fileNo)
        })
      })
      // الصفوف القائمة مفهرسة بالسمة — نُفضّل الإبقاء على الصفوف التي تحمل بيانات/تقدّماً.
      const hasData = r => !!(r.visa_number || r.border_number || r.wakalah_number || r.wakalah_date || r.wakalah_office || r.main_facility_id || r.visa_used)
      const existingBySig = {}
      for (const r of origRows) { const sig = `${r.nationality_id || ''}|${r.embassy_id || ''}|${r.gender || ''}|${r.occupation_id || ''}`; (existingBySig[sig] = existingBySig[sig] || []).push(r) }
      Object.values(existingBySig).forEach(arr => arr.sort((a, b) => (hasData(b) ? 1 : 0) - (hasData(a) ? 1 : 0)))
      const updates = [], inserts = [], deleteIds = []
      for (const sig of new Set([...Object.keys(desiredBySig), ...Object.keys(existingBySig)])) {
        const want = desiredBySig[sig] || [], have = existingBySig[sig] || []
        const reuse = Math.min(want.length, have.length)
        for (let i = 0; i < reuse; i++) if (Number(have[i].file_number) !== Number(want[i])) updates.push({ id: have[i].id, file_number: want[i] })
        for (let i = reuse; i < have.length; i++) deleteIds.push(have[i].id)
        const at = sigAttrs[sig]
        for (let i = reuse; i < want.length; i++) inserts.push({ service_request_id: srId, main_facility_id: null, file_number: want[i], nationality_id: at.nat, occupation_id: at.occ, embassy_id: at.emb, gender: at.gender })
      }
      const bid = branchId || null
      // ─── تسوية دفعات الإقامة + التسعير مع تغيّر عدد التأشيرات ───
      // الإقامة تُسعّر لكل تأشيرة (مطابقةً لإنشاء الفاتورة): لكل تأشيرة مضافة نُنشئ دفعة «عند إصدار
      // الإقامة» ونزيد الإجمالي بقيمتها، ولكل تأشيرة محذوفة نحذف دفعتها ونُنقص الإجمالي. لا نحذف عبر
      // هذا التعديل تأشيرةً سُدّد جزءٌ من إقامتها (يُستخدم الاسترجاع لها) كي لا تبقى مبالغ مدفوعة بلا تأشيرة.
      const r2v = n => Math.round((Number(n) || 0) * 100) / 100
      const { data: liveInst } = await sb.from('installments')
        .select('id,total_amount,paid_amount,installment_order,notes,visa_application_id,payment_milestone:payment_milestone_id(value_ar,value_en)')
        .eq('invoice_id', inv.id).is('deleted_at', null).order('installment_order')
      const isRes = it => { const m = it.payment_milestone ? (it.payment_milestone.value_ar || it.payment_milestone.value_en) : ''; return /إقامة|اقامة|iqama|residence/i.test(m || it.notes || '') }
      const resRows = (liveInst || []).filter(isRes)
      const residencePot = r2v(resRows.reduce((s, r) => s + (Number(r.total_amount) || 0), 0))
      const unit = resRows.length > 0 ? r2v(residencePot / resRows.length) : 0
      // امنع حذف تأشيرة سُدّد جزءٌ من إقامتها عبر التعديل — وجّه للاسترجاع.
      for (const id of deleteIds) {
        const rr = resRows.find(r => r.visa_application_id === id)
        if (rr && Number(rr.paid_amount) > 0.005) { setErr(T('لا يمكن حذف تأشيرة سُدّد جزءٌ من إقامتها — استخدم الاسترجاع', 'Cannot remove a visa whose residence is partly paid — use refund instead')); setPage(1); return }
      }
      for (const u of updates) { const { error } = await sb.from('visa_applications').update({ file_number: u.file_number }).eq('id', u.id); if (error) throw error }
      let insertedIds = []
      if (inserts.length) { const { data: insRet, error } = await sb.from('visa_applications').insert(inserts).select('id'); if (error) throw error; insertedIds = (insRet || []).map(r => r.id) }
      // احذف دفعات إقامة التأشيرات المحذوفة (مع فكّ الربط لتفادي قيد المرجع) قبل حذف صفوف التأشيرات.
      let totalDelta = 0, removedResCount = 0
      for (const id of deleteIds) {
        const rr = resRows.find(r => r.visa_application_id === id)
        if (rr) { const { error } = await sb.from('installments').update({ deleted_at: new Date().toISOString(), visa_application_id: null }).eq('id', rr.id); if (error) throw error; totalDelta = r2v(totalDelta - (Number(rr.total_amount) || 0)); removedResCount++ }
      }
      if (deleteIds.length) { const { error } = await sb.from('visa_applications').delete().in('id', deleteIds); if (error) throw error }
      // أنشئ دفعة إقامة لكل تأشيرة مضافة (بقيمة الوحدة) وزِد الإجمالي بها.
      let nextOrder = Math.max(0, ...(liveInst || []).map(r => Number(r.installment_order) || 0))
      const newResRows = insertedIds.map(id => { nextOrder += 1; return { invoice_id: inv.id, service_request_id: srId, branch_id: bid, visa_application_id: id, installment_order: nextOrder, total_amount: unit, paid_amount: 0, expected_date: null, paid_date: null, payment_method_id: null, notes: 'عند إصدار الإقامة' } })
      if (newResRows.length) { const { error } = await sb.from('installments').insert(newResRows); if (error) throw error; totalDelta = r2v(totalDelta + unit * newResRows.length) }
      // المكتب + الكمية على طلب الخدمة، والمكتب على الفاتورة (كرت «المكتب» يقرأ من الفاتورة).
      if (srId) { const { error } = await sb.from('service_requests').update({ branch_id: bid, quantity: totalVisas }).eq('id', srId); if (error) throw error }
      // سجل تعديل التأشيرات — يُلحق بـ invoices.service_log (نفس نمط note_log/pricing_log) ويُعرض في كرت الخدمة.
      const brCode = id => branches.find(b => b.id === id)?.branch_code || null
      const gLabel = g => { const nat = lkCountries.find(c => c.id === g.nationality)?.nationality_ar || ''; const emb = lkEmbassies.find(e => e.id === g.embassy)?.city_ar || ''; const occ = lkOccupations.find(o => o.id === g.profession)?.value_ar || ''; const gen = g.gender === 'female' ? T('أنثى', 'Female') : T('ذكر', 'Male'); return [nat, emb, occ, gen].filter(Boolean).join(' · ') + ` ×${parseInt(g.count) || 0}` }
      const compStr = grps => grps.map(gLabel).join(' ، ')
      const layoutStr = fls => fls.filter(f => fileCount(f) > 0).map((f, i) => `${T('ملف', 'F')}${i + 1}:${fileCount(f)}`).join(' · ')
      const changes = []
      if ((branchId || null) !== (inv.branch?.id || null)) changes.push({ field: 'office', from: brCode(inv.branch?.id), to: brCode(branchId) })
      { const oc = compStr(origGroups), nc = compStr(groups); if (oc !== nc) changes.push({ field: 'composition', from: oc, to: nc }) }
      { const ol = layoutStr(origFiles), nl = layoutStr(nonEmpty); if (ol !== nl) changes.push({ field: 'files', from: ol, to: nl }) }
      const invPatch = { branch_id: bid, service_quantity: totalVisas }
      // أعِد عدد الدفعات المخزّن والتسعير والحالة عند تغيّر عدد التأشيرات (لتبقى متّسقة مع الصفوف الحيّة).
      invPatch.installments_count = Math.max(0, (liveInst || []).length - removedResCount + newResRows.length)
      if (Math.abs(totalDelta) > 0.005) {
        const newTotal = r2v((Number(inv.total_amount) || 0) + totalDelta)
        invPatch.total_amount = newTotal
        const { data: fp } = await sb.from('invoices').select('paid_amount, status:status_id(code)').eq('id', inv.id).maybeSingle()
        Object.assign(invPatch, await invoiceStatusPatch(sb, fp?.status?.code, Number(fp?.paid_amount) || 0, newTotal))
      }
      if (changes.length) {
        const { data: cur } = await sb.from('invoices').select('service_log').eq('id', inv.id).maybeSingle()
        const log = Array.isArray(cur?.service_log) ? cur.service_log : []
        invPatch.service_log = [...log, { at: new Date().toISOString(), by: editorId || null, by_name: editorName || null, changes }]
      }
      if (inv.id) { const { error } = await sb.from('invoices').update(invPatch).eq('id', inv.id); if (error) throw error }
      onSaved?.(); setDone(true)
    } catch { setErr(T('تعذر الحفظ', 'Save failed')); setPage(2) }
    finally { setSaving(false) }
  }

  // ─── المحتوى ───
  const officePage = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: F, width: '100%' }}>
      <ModalSection Icon={Building2} label={T('المكتب', 'Office')} style={{ marginTop: 6 }}>
        <div style={GRID}>
          <FKSelect full label={T('المكتب', 'Office')} value={branchId} onChange={setBranchId} placeholder={T('— اختر —', '— Select —')}
            options={branches} getKey={b => b.id} getLabel={b => b.branch_code || '—'} getSub={b => b.branch_code || ''} />
        </div>
      </ModalSection>
    </div>
  )

  // ─── صفحة المجموعات ───
  const activeId = groups.find(g => expanded.has(g.id))?.id || groups[0]?.id
  const activeGroup = groups.find(g => g.id === activeId)
  const activeIdx = groups.findIndex(g => g.id === activeId)
  const natCell = (o, sel) => <span style={{ fontSize: 14, fontWeight: 600, color: sel ? C.gold : 'rgba(255,255,255,.92)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>{o.nationality_ar}{o.flag_url && <img src={o.flag_url} alt="" width={16} height={12} style={{ borderRadius: 2, objectFit: 'cover' }} />}</span>
  const groupsPage = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, width: '100%', fontFamily: F }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5 }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: C.gold, lineHeight: 1, letterSpacing: '-.5px' }}>{totalVisas}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx4)' }}>{visaWord(totalVisas, T)}</span>
        </div>
        {groups.length < 4 && (
          <button type="button" onClick={addGroup} title={T('إضافة مجموعة', 'Add group')}
            style={{ height: 30, padding: '0 13px', background: 'rgba(212,160,23,.06)', border: '1.3px dashed var(--accent-bd)', borderRadius: 9, color: 'var(--accent)', fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span>{T('مجموعة', 'Group')}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        )}
      </div>
      {groups.length > 1 && (
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--bd)' }}>
          {groups.map((gg, i) => {
            const isAct = gg.id === activeId, done2 = isGroupComplete(gg)
            return (
              <button key={gg.id} type="button" onClick={() => setExpanded(new Set([gg.id]))}
                style={{ flex: 1, minWidth: 0, height: 36, border: 'none', background: 'transparent', color: isAct ? C.gold : 'var(--tx4)', fontFamily: F, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 6px', borderBottom: isAct ? `2px solid ${C.gold}` : '2px solid transparent', marginBottom: -1 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{T('المجموعة', 'Group')} {(isAr ? ORD_AR_F[i] : null) || (i + 1)}</span>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: done2 ? '#2ea043' : 'var(--tx5)', flexShrink: 0 }} />
                <span style={{ fontSize: 10.5, fontWeight: 600, opacity: .7 }}>{gg.count || 0}×</span>
              </button>
            )
          })}
        </div>
      )}
      {activeGroup && (() => {
        const g = activeGroup
        const filteredEm = g.nationality ? lkEmbassies.filter(e => e.country_id === g.nationality) : []
        return (
          <div style={{ border: '1.5px solid rgba(212,160,23,.35)', borderRadius: 12, padding: '18px 14px 12px', marginTop: groups.length > 1 ? 14 : 12, position: 'relative', display: 'flex', flexDirection: 'column', gap: 10, width: '100%', boxSizing: 'border-box' }}>
            <div style={{ position: 'absolute', top: -9, insetInlineStart: 14, background: 'var(--modal-bg)', padding: '0 8px', fontSize: 12, fontWeight: 600, color: C.gold, fontFamily: F }}>{T('المجموعة', 'Group')} {(isAr ? ORD_AR_F[activeIdx] : null) || (activeIdx + 1)}</div>
            {groups.length > 1 && (
              <button type="button" onClick={() => removeGroup(g.id)} title={T('حذف', 'Delete')}
                style={{ position: 'absolute', top: -13, left: 14, height: 26, padding: '0 12px', borderRadius: 9, border: '1.3px dashed rgba(192,57,43,.55)', background: 'var(--modal-bg)', color: C.red, cursor: 'pointer', fontSize: 11, fontFamily: F, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                <span>{T('حذف', 'Delete')}</span>
              </button>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <FKSelect label={T('الجنسية', 'Nationality')} req placeholder={T('اختر الجنسية...', 'Choose nationality...')}
                value={g.nationality || null} onChange={id => updateGroup(g.id, { nationality: id || '', embassy: '' })}
                options={lkCountries} getKey={o => o.id} getLabel={o => o.nationality_ar} getSub={o => o.nationality_ar}
                renderSelected={o => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{o.nationality_ar}{o.flag_url && <img src={o.flag_url} alt="" width={16} height={12} style={{ borderRadius: 2, objectFit: 'cover' }} />}</span>}
                renderCell={natCell} />
              <FKSelect label={T('السفارة', 'Embassy')} req disabled={!g.nationality || filteredEm.length === 0}
                placeholder={!g.nationality ? T('اختر الجنسية أولاً', 'Pick nationality first') : (filteredEm.length === 0 ? T('لا توجد سفارة', 'No embassy') : T('اختر المدينة...', 'Choose city...'))}
                value={g.embassy || null} onChange={id => updateGroup(g.id, { embassy: id || '' })}
                options={filteredEm} getKey={o => o.id} getLabel={o => o.city_ar} getSub={o => o.name_en || ''} />
            </div>
            <FKSelect label={T('المهنة', 'Occupation')} req full placeholder={T('اختر المهنة...', 'Choose occupation...')}
              value={g.profession || null} onChange={id => updateGroup(g.id, { profession: id || '' })}
              options={lkOccupations} getKey={o => o.id} getLabel={o => o.value_ar} getSub={o => o.value_ar} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Segmented label={T('الجنس', 'Gender')} req value={g.gender} onChange={v => updateGroup(g.id, { gender: v })}
                options={[{ v: 'male', l: T('ذكر', 'Male'), c: '#3483b4' }, { v: 'female', l: T('أنثى', 'Female'), c: '#e078a8' }]} />
              <FKStepper label={T('عدد التأشيرات', 'Visa count')} req value={parseInt(g.count) || 1} min={1} max={MAX_VISAS}
                onChange={n => { const others = totalVisas - (parseInt(g.count) || 0); const cap = Math.max(1, MAX_VISAS - others); updateGroup(g.id, { count: String(Math.min(Math.max(1, n), cap)) }) }} />
            </div>
          </div>
        )
      })()}
      {totalVisas > 1 && (
        <div style={{ padding: '2px 2px' }}>
          <Checkbox checked={autoMode} label={autoMode ? T('توزيع تلقائي', 'Auto distribute') : T('توزيع تلقائي (اضغط للعودة)', 'Auto distribute (click to revert)')}
            onChange={() => { if (autoMode) { setAutoMode(false); goFiles() } else { setAutoMode(true) } }} />
        </div>
      )}
    </div>
  )

  // ─── صفحة توزيع الملفات ───
  const distPct = totalVisas > 0 ? Math.min(100, Math.round((sumF / totalVisas) * 100)) : 0
  const isComplete = remaining === 0 && totalVisas > 0
  const isOver = remaining < 0
  const canAddMore = files.length < MAX_FILES
  const filesPage = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, width: '100%', fontFamily: F }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, paddingBottom: 8, borderBottom: '1px solid var(--bd)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: isComplete ? '#2ea043' : isOver ? '#c0392b' : C.gold }}>
          <span>{totalVisas}/{sumF}</span><span>·</span><span>{isComplete ? T('مكتمل', 'Done') : isOver ? T('زيادة', 'Over') : T('متبقي', 'Left')}</span>
        </span>
        <div style={{ flex: 1, minWidth: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${distPct}%`, background: isComplete ? '#2ea043' : isOver ? '#c0392b' : C.gold, borderRadius: 2, transition: 'width .3s' }} />
        </div>
        {multiGroup && files.length > 1 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#b497e8' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9l4-4 4 4M9 5v14M19 15l-4 4-4-4M15 19V5"/></svg>
            <span>{T('اسحب للنقل', 'Drag to move')}</span>
          </span>
        )}
        <button type="button" onClick={() => { setFiles(vPackFiles(groups)); setAutoMode(true); setErr('') }} style={{ border: '1.3px dashed var(--accent-bd)', borderRadius: 9, color: 'var(--accent)', cursor: 'pointer', height: 30, padding: '0 13px', fontSize: 12, fontWeight: 600, fontFamily: F, background: 'var(--accent-soft)', boxShadow: '0 2px 8px var(--shadowClr)' }}>{T('تلقائي', 'Auto')}</button>
        {canAddMore && (
          <button type="button" onClick={addFile} style={{ border: '1.3px dashed var(--accent-bd)', borderRadius: 9, color: 'var(--accent)', cursor: 'pointer', height: 30, padding: '0 13px', fontSize: 12, fontWeight: 600, fontFamily: F, background: 'var(--accent-soft)', boxShadow: '0 2px 8px var(--shadowClr)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span>{T('ملف', 'File')}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingLeft: 2 }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${files.length}, minmax(0, ${multiGroup ? '230px' : '180px'}))`, justifyContent: 'center', gap: 12, alignItems: 'stretch', gridAutoRows: '1fr', minHeight: '100%' }}>
          {files.map((f, i) => {
            const c = fileCount(f), full = c >= 4
            const fBk = bucketOfFile(f)
            const isDragSource = !!dragInfo && dragInfo.fileId === f.id
            const isValidDrop = !!dragInfo && dragInfo.fileId !== f.id && !full && (!fBk || fBk === groupBucket(dragInfo.groupId))
            return (
              <div key={f.id}
                onDragOver={e => { if (isValidDrop) { e.preventDefault(); e.dataTransfer.dropEffect = 'move' } }}
                onDrop={e => { if (!dragInfo || dragInfo.fileId === f.id) return; e.preventDefault(); moveVisa(dragInfo.fileId, f.id, dragInfo.groupId); setDragInfo(null) }}
                style={{ position: 'relative', display: 'flex', flexDirection: 'column', maxHeight: 215, borderRadius: 12, border: `1.5px ${isValidDrop ? 'dashed' : 'solid'} ${isValidDrop ? 'rgba(52,152,219,.6)' : full ? 'rgba(46,160,67,.35)' : c > 0 ? 'rgba(212,160,23,.25)' : 'rgba(255,255,255,.08)'}`, background: isValidDrop ? 'rgba(52,152,219,.1)' : full ? 'rgba(46,160,67,.05)' : c > 0 ? 'rgba(212,160,23,.04)' : 'rgba(255,255,255,.015)', overflow: 'hidden', transition: '.2s', opacity: isDragSource ? .55 : 1 }}>
                {files.length > 1 && (
                  <button type="button" onClick={() => removeFile(f.id)} title={T('حذف', 'Delete')}
                    style={{ position: 'absolute', top: 6, left: 6, width: 20, height: 20, borderRadius: 5, border: 'none', background: 'rgba(192,57,43,.15)', color: C.red, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 2 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 8px 4px', borderBottom: '1px solid var(--bd)', background: 'rgba(255,255,255,.02)' }}>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: full ? '#2ea043' : C.gold }}>{T('الملف', 'File')} {(isAr ? ORD_AR[i] : null) || (i + 1)}</span>
                  <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--tx5)' }}>•</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: full ? '#2ea043' : c > 0 ? C.gold : 'var(--tx5)', lineHeight: 1 }}><span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--tx5)' }}>4/</span>{c}</span>
                </div>
                {multiGroup ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '6px 6px 8px', flex: 1, justifyContent: 'center', minHeight: 0 }}>
                    {groups.map((g, gi) => {
                      const cnt = parseInt(f.assignments?.[g.id]) || 0
                      const natLbl = g.nationality ? (lkCountries.find(co => co.id === g.nationality)?.nationality_ar || `${T('المجموعة', 'Group')} ${gi + 1}`) : `${T('المجموعة', 'Group')} ${gi + 1}`
                      const profLbl = g.profession ? (lkOccupations.find(o => o.id === g.profession)?.value_ar || '') : ''
                      const gR = groupRem(g.id)
                      const compatible = !fBk || vBucketKey(g) === fBk
                      const canInc = !full && gR > 0 && compatible
                      const canDec = cnt > 0
                      if (cnt === 0 && (gR <= 0 || !compatible)) return null
                      const isDraggingThis = !!dragInfo && dragInfo.fileId === f.id && dragInfo.groupId === g.id
                      return (
                        <div key={g.id} draggable={cnt > 0}
                          onDragStart={e => { if (cnt <= 0) { e.preventDefault(); return } setDragInfo({ fileId: f.id, groupId: g.id }); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', `visa:${f.id}:${g.id}`) } catch (_) {} }}
                          onDragEnd={() => setDragInfo(null)}
                          title={cnt > 0 ? T('اسحب لنقل تأشيرة', 'Drag to move a visa') : ''}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 5px', borderRadius: 6, background: isDraggingThis ? 'rgba(52,152,219,.15)' : cnt > 0 ? 'rgba(212,160,23,.08)' : 'rgba(255,255,255,.015)', border: `1px solid ${isDraggingThis ? 'rgba(52,152,219,.5)' : cnt > 0 ? 'rgba(212,160,23,.18)' : 'rgba(255,255,255,.04)'}`, cursor: cnt > 0 ? 'grab' : 'default', opacity: isDraggingThis ? .6 : 1 }}>
                          <button type="button" onClick={() => decGroup(f.id, g.id)} disabled={!canDec} title={T('إنقاص', 'Decrease')}
                            style={{ width: 20, height: 20, borderRadius: 5, border: 'none', background: canDec ? 'rgba(192,57,43,.12)' : 'transparent', color: canDec ? C.red : 'var(--tx6)', cursor: canDec ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>−</button>
                          <span style={{ fontSize: 12, fontWeight: 600, color: cnt > 0 ? C.gold : 'var(--tx5)', minWidth: 12, textAlign: 'center', flexShrink: 0 }}>{cnt}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: cnt > 0 ? 'var(--tx2)' : 'var(--tx4)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }} title={profLbl ? `${natLbl} · ${profLbl}` : natLbl}>{natLbl}{profLbl && <span style={{ fontSize: 9, fontWeight: 500, color: 'var(--tx5)', marginRight: 4 }}> · {profLbl}</span>}</span>
                          <button type="button" onClick={() => incGroup(f.id, g.id)} disabled={!canInc} title={T('إضافة', 'Add')}
                            style={{ width: 20, height: 20, borderRadius: 5, border: 'none', background: canInc ? 'rgba(46,160,67,.12)' : 'transparent', color: canInc ? '#2ea043' : 'var(--tx6)', cursor: canInc ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>+</button>
                        </div>
                      )
                    })}
                    {c === 0 && <div style={{ fontSize: 10, color: 'var(--tx5)', textAlign: 'center', padding: '8px 4px' }}>{T('أضف تأشيرات من المجموعات', 'Add visas from groups')}</div>}
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, padding: '10px 0 8px', flex: 1, minHeight: 0 }}>
                      {[1, 2, 3, 4].map(n => { const filled = n <= c; const gid = groups[0]?.id; return (
                        <button key={n} type="button" onClick={() => { if (!gid) return; const target = Math.min(n, c + Math.max(0, remaining)); if (target < 1) return; setAutoMode(false); setFiles(fs => fs.map(ff => ff.id === f.id ? { ...ff, assignments: { [gid]: target } } : ff)) }}
                          style={{ width: 9, height: 9, borderRadius: '50%', border: 'none', background: filled ? (full ? '#2ea043' : C.gold) : 'rgba(255,255,255,.12)', cursor: 'pointer', padding: 0 }} title={`${T('اضبط على', 'Set to')} ${n}`} />
                      ) })}
                    </div>
                    <div style={{ display: 'flex', borderTop: '1px solid var(--bd)', marginTop: 'auto' }}>
                      <button type="button" onClick={() => { const gid = groups[0]?.id; if (gid) decGroup(f.id, gid) }} disabled={c <= 1}
                        style={{ flex: 1, height: 28, border: 'none', background: 'transparent', color: 'var(--tx3)', fontSize: 16, fontWeight: 600, cursor: c <= 1 ? 'not-allowed' : 'pointer', opacity: c <= 1 ? .25 : 1, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <div style={{ width: 1, background: 'rgba(255,255,255,.05)' }} />
                      <button type="button" onClick={() => { const gid = groups[0]?.id; if (gid) incGroup(f.id, gid) }} disabled={c >= 4 || remaining <= 0}
                        style={{ flex: 1, height: 28, border: 'none', background: 'transparent', color: 'var(--tx3)', fontSize: 16, fontWeight: 600, cursor: (c >= 4 || remaining <= 0) ? 'not-allowed' : 'pointer', opacity: (c >= 4 || remaining <= 0) ? .25 : 1, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  const pages = [
    { title: T('المكتب', 'Office'), valid: true, content: officePage },
    { title: T('بيانات التأشيرات', 'Visa details'), valid: groupsValid, error: page === 1 ? err : '', content: groupsPage },
    { title: T('توزيع الملفات', 'File distribution'), valid: filesValid, error: page === 2 ? err : '', content: filesPage },
  ]

  return (
    <Modal open onClose={onClose} title={T('تعديل تأشيرة وإقامة دائمة', 'Edit permanent visa')} Icon={CalendarRange} width={760} accent={C.gold}
      success={done ? <SuccessView title={T('تم حفظ التعديلات', 'Changes saved')} /> : undefined}
      page={page} pages={loading ? [{ valid: false, content: <div style={{ padding: 40, textAlign: 'center', color: 'var(--tx4)', fontFamily: F }}>{T('جاري التحميل…', 'Loading…')}</div> }] : pages}
      onNext={() => { if (page === 0) { setErr(''); setPage(1) } else if (page === 1) goFiles() }}
      onBack={() => { setErr(''); setPage(p => Math.max(0, p - 1)) }}
      onSubmit={save} submitting={saving} submitIcon={CheckCircle2} submitLabel={T('حفظ التعديلات', 'Save changes')} />
  )
}

// كود المكتب الذي صدرت منه الفاتورة — يُعرض ضمن كرت الخدمة (صندوق بنفس نمط الحقول).
const OfficeCodeBox = ({ code, T }) => !code ? null : (
  <div style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
    <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{T('المكتب','Office')}</span>
    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, direction: 'ltr' }}>
      <span style={{ fontSize: 14, color: C.gold, fontWeight: 700, direction: 'ltr', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>{code}</span>
    </span>
  </div>
)

// هيكل تحميل صفحة تفاصيل الفاتورة — يطابق تخطيط InvoiceDetailLayout (عمودان: كروت يسارًا + ملخّص مالي
// ثابت يمينًا) بنفس chrome الكروت، فيظهر فور الفتح بدل ظهور الكروت واحدًا تلو الآخر مع تحميل البيانات.
const InvoiceDetailSkeleton = () => {
  const SkHead = () => (
    <div style={cardHeader}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(212,160,23,.45)', flexShrink: 0 }} />
      <Shimmer w={130} h={16} />
    </div>
  )
  const SkRows = ({ n = 3 }) => (
    <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 13 }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Shimmer w={`${28 + (i * 7) % 14}%`} h={11} />
          <Shimmer w={`${42 + (i * 11) % 20}%`} h={13} />
        </div>
      ))}
    </div>
  )
  const SkCard = ({ n = 3 }) => <div style={cardChrome}><SkHead /><SkRows n={n} /></div>
  // كرت العامل/المنشأة: «هيرو» (صورة + اسم) ثم شبكة خلايا صغيرة (جوال/إقامة…).
  const SkEntityCard = () => (
    <div style={cardChrome}>
      <SkHead />
      <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
          <Shimmer w={150} h={15} /><Shimmer w={40} h={40} r={12} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[0, 1].map(i => (
            <div key={i} style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              <Shimmer w="40%" h={9} /><Shimmer w="70%" h={13} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
  // كرت جدول (الدفعات/المدفوعات): شريط رأس صفوف + صفوف.
  const SkTableCard = ({ rows = 3 }) => (
    <div style={cardChrome}>
      <SkHead />
      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '8% 30% 22% 22% 18%', alignItems: 'center', gap: 8 }}>
            {[0, 1, 2, 3, 4].map(j => <Shimmer key={j} w={j === 1 ? '80%' : '55%'} h={11} />)}
          </div>
        ))}
      </div>
    </div>
  )
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, alignItems: 'flex-start' }}>
      {/* الـ Shimmer المستورد يعتمد على keyframes اسمها sk-shimmer، ولا يحقنها إلا مكوّنات Skeleton الكبيرة؛ نحقنها هنا مرة واحدة. */}
      <style>{`@keyframes sk-shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SkEntityCard />
        <SkCard n={3} />
        <SkTableCard rows={3} />
        <SkTableCard rows={2} />
      </div>
      <div style={{ position: 'sticky', top: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* الملخّص المالي — صندوق الإجمالي الذهبي + شريط نسبة السداد + مؤشّرات */}
        <div style={cardChrome}>
          <div style={{ background: 'linear-gradient(135deg, rgba(212,160,23,.18), rgba(212,160,23,.06))', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Shimmer w="45%" h={14} style={{ background: 'linear-gradient(90deg, rgba(0,0,0,.10) 25%, rgba(0,0,0,.18) 37%, rgba(0,0,0,.10) 63%)', backgroundSize: '400% 100%' }} />
            <Shimmer w="60%" h={30} />
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><Shimmer w="30%" h={11} /><Shimmer w="22%" h={16} /></div>
            <Shimmer w="100%" h={8} r={999} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><Shimmer w="35%" h={11} /><Shimmer w="20%" h={11} /></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><Shimmer w="40%" h={11} /><Shimmer w="18%" h={11} /></div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[0, 1].map(i => <Shimmer key={i} w="100%" h={40} r={10} />)}
        </div>
        <Shimmer w="100%" h={40} r={10} />
      </div>
    </div>
  )
}

// كرت «التعليقات» — مطابق لكرت التعليقات في صفحة المعاملات: سجلّ تعليقات طلب الخدمة (service_request_notes)
// مع المرفقات وزر «إضافة تعليق». مرتبط بنفس طلب الخدمة للفاتورة.
function InvoiceCommentsCard({ sb, T, isAr, toast, inv, user }) {
  const srId = inv?.service_request?.id || null
  const visText = fieldVisible(user, 'invoices', 'comment_text')
  const visAtt = fieldVisible(user, 'invoices', 'comment_attachments')
  const visCreator = fieldVisible(user, 'invoices', 'comment_creator')
  const visDate = fieldVisible(user, 'invoices', 'comment_datetime')
  const [notes, setNotes] = useState([])
  const [open, setOpen] = useState(false)
  const reload = async () => {
    if (!srId) return
    const { data } = await sb.from('service_request_notes')
      .select('id,note,created_at,created_by,author:created_by(person:persons!users_person_id_fkey(name_ar,name_en))')
      .eq('service_request_id', srId).is('deleted_at', null).order('created_at', { ascending: true })
    const list = data || []
    const ids = list.map(n => n.id)
    const attByNote = {}
    if (ids.length) {
      const { data: atts } = await sb.from('attachments')
        .select('id,entity_id,file_name,file_url,created_at')
        .eq('entity_type', 'service_request_note').in('entity_id', ids).is('deleted_at', null)
        .order('created_at', { ascending: true })
      ;(atts || []).forEach(a => { (attByNote[a.entity_id] = attByNote[a.entity_id] || []).push(a) })
    }
    setNotes(list.map(n => ({ ...n, attachments: attByNote[n.id] || [] })))
  }
  useEffect(() => { reload() }, [srId])   // eslint-disable-line react-hooks/exhaustive-deps
  if (!srId) return null
  return (
    <div style={cardChrome}>
      <div style={{ ...cardHeader, gap: 10, flexWrap: 'wrap' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} />
        <span style={{ ...cardTitle, color: C.blue }}>{T('التعليقات','Comments')}</span>
      </div>
      <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notes.map(n => {
            const p = n.author?.person
            const name = ((isAr ? (p?.name_ar || p?.name_en) : (p?.name_en || p?.name_ar)) || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join(' ')
            const dt = new Date(n.created_at)
            const hhmm = String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0')
            return (
              <div key={n.id} style={{ background: 'var(--inputBg)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid var(--bd)' }}>
                {visText && <span style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 600, lineHeight: 1.6, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{n.note}</span>}
                {visAtt && Array.isArray(n.attachments) && n.attachments.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    {n.attachments.map((a, i) => (
                      <a key={a.id || i} href={a.file_url} target="_blank" rel="noreferrer" title={a.file_name || T('مرفق','Attachment')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: C.gold, textDecoration: 'none' }}>
                        <Paperclip size={12} strokeWidth={2} />
                        <span style={{ textDecoration: 'underline', textUnderlineOffset: 3, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'ltr' }}>{a.file_name || (T('مرفق','Attachment') + ' ' + (i + 1))}</span>
                      </a>
                    ))}
                  </div>
                )}
                {(visCreator || visDate) && (
                <div style={{ display: 'flex', direction: isAr ? 'rtl' : 'ltr', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 10.5, color: 'var(--tx5)' }}>
                  {name && visCreator ? <span style={{ fontWeight: 600, color: C.gold }}>{name}</span> : <span />}
                  {visDate && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
                    <span>{fmtGreg(n.created_at, isAr)}</span>
                    <span>{hhmm}</span>
                  </span>}
                </div>
                )}
              </div>
            )
          })}
          {notes.length === 0 && <span style={{ fontSize: 11.5, color: 'var(--tx5)' }}>{T('لا توجد تعليقات بعد','No comments yet')}</span>}
          {modalAllowed(user, 'invoices', 'inv_comment_add') && (
          <button onClick={() => setOpen(true)}
            onMouseEnter={e => { e.currentTarget.style.background = C.blue + '1f' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            style={{ alignSelf: 'stretch', justifyContent: 'center', height: 42, padding: '0 16px', borderRadius: 9, background: 'transparent', border: '1px dashed ' + C.blue + '80', color: C.blue, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, transition: '.15s' }}>
            {T('إضافة تعليق','Add comment')}
            <Plus size={15} strokeWidth={2.4} />
          </button>
          )}
        </div>
      </div>
      {open && <InvoiceCommentModal sb={sb} T={T} toast={toast} srId={srId} user={user} onClose={() => setOpen(false)} onSaved={reload} />}
    </div>
  )
}

// نافذة «إضافة تعليق» — مطابقة لنظيرتها في صفحة المعاملات: نص + مرفق واحد اختياري.
function InvoiceCommentModal({ sb, T, toast, srId, user, onClose, onSaved }) {
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState(null)
  const [done, setDone] = useState(false)
  const submit = async () => {
    const note = text.trim()
    if (!note) return
    setSubmitting(true); setErr(null)
    try {
      const { data: row, error } = await sb.from('service_request_notes')
        .insert({ service_request_id: srId, note, created_by: user?.id || null })
        .select('id').single()
      if (error || !row) throw (error || new Error('insert failed'))
      if (file) {
        const safe = (file.name || 'file').replace(/[^\w.\-]+/g, '_')
        const path = `service-request-note/${row.id}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${safe}`
        const { error: upErr } = await sb.storage.from('attachments').upload(path, file, { cacheControl: '3600', upsert: false })
        if (!upErr) {
          const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
          await sb.from('attachments').insert({
            entity_type: 'service_request_note', entity_id: row.id,
            file_name: file.name, file_url: pub?.publicUrl || path, storage_path: path,
            mime_type: file.type || null, size_bytes: file.size || null, uploaded_by: user?.id || null,
          })
        }
      }
      await onSaved?.()
      setDone(true)
    } catch (e) {
      setSubmitting(false)
      setErr(T('تعذّر إضافة التعليق: ', 'Failed to add comment: ') + (e?.message || e))
    }
  }
  return (
    <Modal open onClose={onClose} title={T('إضافة تعليق', 'Add comment')} Icon={MessageSquare} width={560} height={520} accent={C.gold}
      success={done ? <SuccessView title={T('تمت إضافة التعليق', 'Comment added')} /> : undefined}
      pages={[{ valid: !!text.trim(), error: err, content: (
        <ModalSection Icon={MessageSquare} label={T('تفاصيل التعليق', 'Comment details')}>
          <div style={GRID}>
            <TextArea req full label={T('نص التعليق', 'Comment text')} value={text} onChange={v => { setText(v); setErr(null) }}
              placeholder={T('اكتب تعليقك…', 'Write your comment…')} rows={4} />
            <FileField full label={T('المرفق', 'Attachment')}
              hint={T('يمكن إرفاق ملف واحد', 'You can attach a single file')} value={file} onChange={setFile} />
          </div>
        </ModalSection>
      ) }]}
      onSubmit={submit} submitting={submitting} submitLabel={T('إضافة', 'Add')} submitIcon={Plus} />
  )
}

const InvoiceDetailLayout = ({ user, inv, data, isAr, T, svc, payT, total, paid, remaining, pct, stageStatus, sb, toast, onRecordPayment, onRefund, onCancelInv, onPrint, onEditWorker, onEditService, onEditOffice, onEditVisa, onEditBorders, onEditClient, onEditAgent, onEditNote, onEditPricing, onEditPayment, onOpenService, canPayPerm = true, canRefundPerm = true, canCancelPerm = true, gmLock = false }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, alignItems: 'flex-start' }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* كرت العميل يظهر فقط للخدمات التي تتطلب عميلاً (تأشيرات العمل، نقل الكفالة، تجديد الإقامة،
          والخدمة العامة). بقية الخدمات «على طول العامل» — يُختار العامل مباشرةً بلا عميل — فلا كرت عميل.
          ويُخفى أيضاً للخدمات المُتطلِّبة عميلاً متى كان «العامل هو العميل» (الطرف نفسه يظهر في كرت العامل). */}
      {cardVisible(user, 'invoices', 'client') && (() => {
        const code = inv.service_type?.code
        // الخدمات التي تتطلب عميلاً منفصلاً (تطابق CLIENT_SERVICES في نموذج الطلب عبر SVC_CODE_MAP).
        const CLIENT_REQUIRED = new Set(['work_visa_permanent', 'work_visa_temporary', 'transfer', 'iqama_renewal', 'general'])
        if (!CLIENT_REQUIRED.has(code)) return null
        const sr = inv.service_request
        const pickW = rel => Array.isArray(rel) ? rel[0]?.worker : rel?.worker
        const pickF = rel => Array.isArray(rel) ? rel[0]?.facility : rel?.facility
        const apps = [sr?.transfer_applications, sr?.ajeer_applications, sr?.iqama_renewal_applications, sr?.supplier_payroll_applications, sr?.other_applications]
        // العامل هو العميل: إمّا لا يوجد سجل عميل منفصل والعامل يحلّ محلّه، أو يوجد عميل بلا عامل منفصل لكن بمنشأة.
        const workerIsClient = (!sr?.client && apps.some(pickW)) || (!!sr?.client && !apps.some(pickW) && apps.some(pickF))
        if (workerIsClient) return null
        return (
      <div style={cardChrome}>
        <div style={cardHeader}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
          <span style={cardTitle}>{T('العميل','Client')}</span>
          {(() => {
            if (!fieldVisible(user, 'invoices', 'client_nationality')) return null
            const nat = inv.service_request?.client?.nationality
            if (!nat) return null
            const fl = nat.flag_url
            const em = flagEmoji(nat.code)
            return fl
              ? <img src={fl} alt={nat.name_ar || ''} title={nat.name_ar || ''} style={{ width: 22, height: 16, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />
              : (em ? <span title={nat.name_ar || ''} style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{em}</span> : null)
          })()}
          {!!onEditClient && !!inv.service_request?.client && canCardBtn(user, 'invoices', 'client', 'edit') && (
            <button onClick={onEditClient} title={T('تعديل بيانات العميل','Edit client')}
              style={{ marginInlineStart: 'auto', height: 32, padding: '0 14px', borderRadius: 9, background: 'rgba(212,160,23,.06)', border: '1px dashed var(--accent-bd)', color: 'var(--accent)', fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <span>{T('تعديل','Edit')}</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </button>
          )}
        </div>
        <div style={{ padding: '16px 22px' }}>
          <ClientRows inv={inv} T={T} user={user} />
          {(() => {
            // سجلّ تعديل بيانات العميل (من clients.edit_log المشترك) — يُعرض فقط القيود التي تمّت من هذه
            // الفاتورة (entry.inv === inv.id)، لا كل تعديلات العميل عبر فواتيره الأخرى.
            const allLog = Array.isArray(inv.service_request?.client?.edit_log) ? inv.service_request.client.edit_log : []
            const log = allLog.filter(e => e && e.inv === inv.id)
            if (!log.length) return null
            const LBL = { name: ['الاسم', 'Name'], id: ['رقم الهوية', 'ID Number'], phone: ['رقم الجوال', 'Phone'], nationality: ['الجنسية', 'Nationality'] }
            const showVal = (field, v) => v ? (field === 'phone' ? fmtPhone(v) : v) : '—'
            return (
              <ChangeLog T={T} title={T('سجل تعديل بيانات العميل', 'Client edit log')} entries={log}
                actionLabel={T('تم تعديل بيانات العميل', 'Client details edited')}
                renderDetail={c => <FieldChanges T={T} changes={c.changes} LBL={LBL} showVal={showVal} />} />
            )
          })()}
        </div>
      </div>
        )
      })()}
      {cardVisible(user, 'invoices', 'worker_facility') && (() => {
        const sr = inv.service_request
        const pick = (rel, key) => Array.isArray(rel) ? rel[0]?.[key] : rel?.[key]
        const apps = [sr?.transfer_applications, sr?.ajeer_applications, sr?.iqama_renewal_applications, sr?.supplier_payroll_applications, sr?.other_applications]
        const realWorker = apps.map(a => pick(a, 'worker')).find(Boolean) || null
        const facility = apps.map(a => pick(a, 'facility')).find(Boolean) || null
        // «العميل هو نفس العامل»: the general-service row keeps worker_id null (no separate worker
        // record) but still carries a facility. Surface the client as the worker so the card — and
        // especially its facility (المنشأة) — still shows instead of vanishing entirely.
        const otherApp = Array.isArray(sr?.other_applications) ? sr.other_applications[0] : sr?.other_applications
        const workerIsClient = !realWorker && !!sr?.client && !!otherApp
        // رقم جوال العامل المُدخل في هذه الفاتورة — من other_applications أو supplier_payroll_applications
        // (رواتب سبلاير) — يُعرض في كرت العامل بجانب الإقامة. يُخزَّن بـ9 خانات بلا 966، فنُطبّع لصيغة 966…
        // ليُنسّقه fmtPhone كبقية الأرقام.
        const spApp = Array.isArray(sr?.supplier_payroll_applications) ? sr.supplier_payroll_applications[0] : sr?.supplier_payroll_applications
        const invWorkerPhone = (() => { const d = String(otherApp?.worker_phone || spApp?.worker_phone || '').replace(/\D/g, ''); return d ? (d.startsWith('966') ? d : '966' + d.slice(-9)) : null })()
        const worker = realWorker
          ? { ...realWorker, phone: invWorkerPhone || realWorker.phone }
          : (workerIsClient ? {
              name_ar: sr.client.name_ar, name_en: sr.client.name_en, phone: invWorkerPhone || sr.client.phone,
              iqama_number: sr.client.id_number, nationality: sr.client.nationality,
            } : null)
        // The worker is editable only for general-bucket services (خدمة عامة …) whose worker is
        // stored in other_applications. Transfer/Ajeer carry their own gov-process facility model,
        // and the client-as-worker case is locked to the client — both stay read-only here.
        const editable = !!onEditWorker && realWorker && realWorker === pick(sr?.other_applications, 'worker') && canCardBtn(user, 'invoices', 'worker_facility', 'edit')
        // سجلّ تغيير العامل (من details.worker_changes) — يُعرض أسفل البطاقة: من غيّر، متى، والعامل السابق.
        const det0 = Array.isArray(data?.det) ? data.det[0] : null
        const changes = Array.isArray(det0?.details?.worker_changes) ? det0.details.worker_changes : []
        if (!worker) return null
        return (
          <div style={cardChrome}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
              <span style={cardTitle}>{T('العامل والمنشأة','Worker & Facility')}</span>
              {workerIsClient && (
                <span title={T('العامل هو العميل','Worker is the client')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 7, background: 'rgba(212,160,23,.16)', border: '1px solid rgba(212,160,23,.42)', color: C.goldSoft, fontSize: 10.5, fontWeight: 700 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/></svg>
                  {T('= العميل','= client')}
                </span>
              )}
              {editable && (
                <button onClick={onEditWorker} title={T('تغيير العامل','Change worker')}
                  style={{ marginInlineStart: 'auto', height: 32, padding: '0 14px', borderRadius: 9, background: 'rgba(212,160,23,.06)', border: '1px dashed var(--accent-bd)', color: 'var(--accent)', fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <span>{T('تعديل','Edit')}</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </button>
              )}
            </div>
            <div style={{ padding: '16px 22px' }}>
              <WorkerRows worker={worker} facility={facility} T={T} user={user} />
              <ChangeLog T={T} title={T('سجل تغيير العامل','Worker change log')} entries={changes}
                actionLabel={T('تم تغيير العامل','Worker changed')}
                renderDetail={c => c.from_name ? (
                  <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span>{T('العامل السابق','Previous worker')}:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--tx2)', fontWeight: 700 }}>{c.from_name}</span>
                      {c.from_iqama && <span style={{ fontFamily: 'monospace', direction: 'ltr', color: 'var(--tx3)' }}>{c.from_iqama}</span>}
                    </div>
                  </div>
                ) : null} />
            </div>
          </div>
        )
      })()}
      {cardVisible(user, 'invoices', 'service') && (baseSvcCode(data?.code || inv.service_type?.code) === 'work_visa' ? (() => {
        // تعديل بيانات التأشيرات وتوزيع الملفات والمكتب — متاح للتأشيرة الدائمة والمؤقتة (المنشأة تُختار لاحقاً، فالتعديل هنا آمن).
        const rawCode = data?.code || inv.service_type?.code
        const visaEditable = !!onEditVisa && (rawCode === 'work_visa_permanent' || rawCode === 'work_visa_temporary') && canCardBtn(user, 'invoices', 'service', 'edit')
        // أرقام الحدود تُدخَل الآن من المراحل («بيانات التأشيرة») في الدائمة والمؤقتة معاً — فلا حاجة لزر مستقل.
        const bordersEditable = false
        return (
        <div style={cardChrome}>
          <div style={cardHeader}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
            <span style={cardTitle}>{T('الخدمة','Service')}</span>
            {bordersEditable && (
              <button onClick={onEditBorders} title={T('إدخال أرقام الحدود','Enter border numbers')}
                style={{ marginInlineStart: 'auto', height: 32, padding: '0 14px', borderRadius: 9, background: 'rgba(212,160,23,.06)', border: '1px dashed var(--accent-bd)', color: 'var(--accent)', fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <span>{T('أرقام الحدود','Border numbers')}</span>
                <Hash size={13} strokeWidth={2.4} />
              </button>
            )}
            {visaEditable && (
              <button onClick={onEditVisa} title={T('تعديل التأشيرات','Edit visas')}
                style={{ marginInlineStart: bordersEditable ? 0 : 'auto', height: 32, padding: '0 14px', borderRadius: 9, background: 'rgba(212,160,23,.06)', border: '1px dashed var(--accent-bd)', color: 'var(--accent)', fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <span>{T('تعديل','Edit')}</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              </button>
            )}
          </div>
          <div style={{ padding: '14px 22px' }}>
            <VisaInfoRows inv={inv} isAr={isAr} T={T} svc={svc} data={data} user={user} />
            <ChangeLog T={T} title={T('سجل تعديل التأشيرات', 'Visa edit log')} entries={Array.isArray(inv.service_log) ? inv.service_log : []}
              actionLabel={T('تم تعديل بيانات التأشيرات', 'Visa details edited')}
              renderDetail={c => <FieldChanges T={T} changes={c.changes} LBL={{ office: ['المكتب', 'Office'], composition: ['بيانات التأشيرات', 'Visa details'], files: ['توزيع الملفات', 'File distribution'] }} />} />
          </div>
        </div>
        )
      })() : (() => {
        // The service detail is editable only for general-bucket services whose row lives
        // in other_applications (dedicated-table services carry their own gov-process model).
        const svcCode = baseSvcCode(data?.code || inv.service_type?.code)
        const svcEditable = !!onEditService && !['transfer', 'ajeer', 'iqama_renewal', 'iqama_issuance'].includes(svcCode) && canCardBtn(user, 'invoices', 'service', 'edit')
        // الخدمات ذات الجداول المخصّصة (نقل/أجير/تجديد/إصدار إقامة) لا تستخدم نافذة تعديل تفاصيل الخدمة،
        // لكن يبقى المكتب قابلاً للتعديل عبر نافذة مستقلة — يظهر زرّها فقط لهذه الخدمات.
        const officeEditable = !!onEditOffice && ['transfer', 'ajeer', 'iqama_renewal', 'iqama_issuance'].includes(svcCode) && fieldEditable(user, 'invoices', 'service_office') && canCardBtn(user, 'invoices', 'service', 'edit')
        // سجلّ تعديل المكتب لهذه الخدمات يُخزَّن في invoices.service_log (نفس نمط نافذة تعديل التأشيرات).
        const officeChanges = officeEditable ? (Array.isArray(inv.service_log) ? inv.service_log : []) : []
        // سجلّ تعديل الخدمة (من other_applications.details.service_changes) — تغييرات الوصف/المكتب.
        const det0 = Array.isArray(data?.det) ? data.det[0] : null
        const svcChanges = Array.isArray(det0?.details?.service_changes) ? det0.details.service_changes : []
        const SVC_LBL = {
          description: ['الوصف', 'Description'], office: ['المكتب', 'Office'],
          chamber_subtype: ['نوع التصديق', 'Certification type'],
          chamber_text: ['نص الطلب', 'Request text'],
          chamber_file: ['ملف المطبوعات', 'Printout file'],
        }
        // الملف الحالي المرفق — يُستخدم لربط الإدخالات القديمة (التي خزّنت الاسم فقط) بالرابط عند تطابق الاسم.
        const curFile = det0?.details?.chamber_file || null
        // قِيَم بعض الحقول رموزٌ إنجليزية (نوع التصديق) — نعرضها بمسمّاها العربي؛ وملف المطبوعات رابطٌ قابل للنقر.
        const SVC_VAL = (field, v) => {
          if (field === 'chamber_subtype') return v === 'printed' ? T('تصديق مطبوعات', 'Printed certification') : v === 'open_request' ? T('طلب مفتوح', 'Open request') : (v || '—')
          if (field === 'chamber_file') {
            if (!v) return '—'
            const name = (v && typeof v === 'object') ? v.name : v
            let url = (v && typeof v === 'object') ? v.url : null
            // إدخالات قديمة خزّنت الاسم فقط — اربطها بالملف الحالي إن تطابق الاسم.
            if (!url && curFile && curFile.name === name) url = curFile.url
            if (!name) return '—'
            return url
              ? <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}>{name}</a>
              : name
          }
          return v || '—'
        }
        return (
          <div style={cardChrome}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
              <span style={cardTitle}>{T('الخدمة','Service')}</span>
              {svcEditable && (
                <button onClick={onEditService} title={T('تعديل الخدمة','Edit service')}
                  style={{ marginInlineStart: 'auto', height: 32, padding: '0 14px', borderRadius: 9, background: 'rgba(212,160,23,.06)', border: '1px dashed var(--accent-bd)', color: 'var(--accent)', fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <span>{T('تعديل','Edit')}</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </button>
              )}
              {officeEditable && (
                <button onClick={onEditOffice} title={T('تعديل المكتب','Edit office')}
                  style={{ marginInlineStart: 'auto', height: 32, padding: '0 14px', borderRadius: 9, background: 'rgba(212,160,23,.06)', border: '1px dashed var(--accent-bd)', color: 'var(--accent)', fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <span>{T('تعديل المكتب','Edit office')}</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </button>
              )}
            </div>
            <div style={{ padding: '14px 22px' }}>
              <TransactionRows inv={inv} isAr={isAr} T={T} svc={svc} payT={payT} data={data} user={user} />
              <ChangeLog T={T} title={T('سجل تعديل الخدمة', 'Service edit log')} entries={svcChanges}
                actionLabel={T('تم تعديل تفاصيل الخدمة', 'Service details edited')}
                renderDetail={c => <FieldChanges T={T} changes={c.changes} LBL={SVC_LBL} showVal={SVC_VAL} />} />
              {officeEditable && (
                <ChangeLog T={T} title={T('سجل تعديل المكتب', 'Office edit log')} entries={officeChanges}
                  actionLabel={T('تم تعديل المكتب', 'Office edited')}
                  renderDetail={c => <FieldChanges T={T} changes={c.changes} LBL={{ office: ['المكتب', 'Office'] }} />} />
              )}
            </div>
          </div>
        )
      })())}
      {cardVisible(user, 'invoices', 'pricing') && !isZeroSvc(data?.code || inv.service_type?.code) && (
      <PricingCard breakdown={inv.pricing_breakdown} total={total} paid={paid} remaining={remaining} absher={data.absherDiscount || 0} tc={data.tc} T={T} onEdit={canCardBtn(user, 'invoices', 'pricing', 'edit') ? onEditPricing : undefined} log={inv.pricing_log} svcCode={data?.code || inv.service_type?.code} user={user} />
      )}
      {cardVisible(user, 'invoices', 'installments_payments') && total > 0 && (
      <div style={cardChrome}>
        <div style={cardHeader}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
          <span style={cardTitle}>{T('الدفعات والمدفوعات','Installments & Payments')}</span>
        </div>
        <InstallmentsWithPayments data={data} breakdown={inv.pricing_breakdown} total={total} paid={paid} remaining={remaining} isAr={isAr} T={T} onEditPayment={canCardBtn(user, 'invoices', 'installments_payments', 'edit') ? onEditPayment : undefined} paymentLog={inv.payment_log} user={user} />
      </div>
      )}
      {cardVisible(user, 'invoices', 'notes') && (() => {
        const notePublic = (inv.note_public || '').trim()
        const noteLog = Array.isArray(inv.note_log) ? inv.note_log : []
        // مع زر التعديل تظهر البطاقة دائماً (لإضافة ملاحظة)؛ بدونه تظهر فقط حين توجد ملاحظة أو سجلّ.
        if (!notePublic && !onEditNote && !noteLog.length) return null
        const NOTE_LBL = { note: ['ملاحظة الفاتورة', 'Invoice Note'] }
        return (
          <div style={cardChrome}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
              <span style={cardTitle}>{isZeroSvc(data?.code || inv.service_type?.code) ? T('الملاحظة','Note') : T('ملاحظة الفاتورة','Invoice Note')}</span>
              {onEditNote && canCardBtn(user, 'invoices', 'notes', 'edit') && (
                <button onClick={onEditNote} title={T('تعديل الملاحظة','Edit note')}
                  style={{ marginInlineStart: 'auto', height: 32, padding: '0 14px', borderRadius: 9, background: 'rgba(212,160,23,.06)', border: '1px dashed var(--accent-bd)', color: 'var(--accent)', fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <span>{notePublic ? T('تعديل','Edit') : T('إضافة','Add')}</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </button>
              )}
            </div>
            <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {!notePublic && (
                <div style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600, textAlign: 'center', padding: '6px 0' }}>{T('لا توجد ملاحظة','No note')}</div>
              )}
              {notePublic && (
                <div style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 600, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', direction: 'rtl' }}>{notePublic}</span>
                </div>
              )}
              <ChangeLog T={T} title={T('سجل تعديل الملاحظة', 'Note edit log')} entries={noteLog}
                actionLabel={T('تم تعديل الملاحظة', 'Note edited')}
                renderDetail={c => <FieldChanges T={T} changes={c.changes} LBL={NOTE_LBL} />} />
            </div>
          </div>
        )
      })()}
      {cardVisible(user, 'invoices', 'agent') && (() => {
        const agent = inv.agent || inv.service_request?.service_request_agents?.[0]?.agent || null
        if (!agent) return null
        const nat = agent.nationality
        const natVis = fieldVisible(user, 'invoices', 'agent_nationality')
        const fl = natVis ? nat?.flag_url : null
        const em = natVis ? flagEmoji(nat?.code) : null
        return (
          <div style={cardChrome}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
              <span style={cardTitle}>{T('الوسيط','Agent')}</span>
              {fl
                ? <img src={fl} alt={nat?.name_ar || ''} title={nat?.name_ar || ''} style={{ width: 22, height: 16, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />
                : (em ? <span title={nat?.name_ar || ''} style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{em}</span> : null)}
              {!!onEditAgent && !!agent.id && canCardBtn(user, 'invoices', 'agent', 'edit') && (
                <button onClick={onEditAgent} title={T('تعديل بيانات الوسيط','Edit agent')}
                  style={{ marginInlineStart: 'auto', height: 32, padding: '0 14px', borderRadius: 9, background: 'rgba(212,160,23,.06)', border: '1px dashed var(--accent-bd)', color: 'var(--accent)', fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <span>{T('تعديل','Edit')}</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </button>
              )}
            </div>
            <div style={{ padding: '16px 22px' }}>
              <BrokerRows agent={agent} T={T} user={user} />
              {(() => {
                // سجلّ تعديل بيانات الوسيط (من agents.edit_log) — يُعرض فقط قيود هذه الفاتورة (entry.inv === inv.id).
                const allLog = Array.isArray(agent.edit_log) ? agent.edit_log : []
                const log = allLog.filter(e => e && e.inv === inv.id)
                if (!log.length) return null
                const LBL = { name: ['الاسم', 'Name'], id: ['رقم الهوية', 'ID Number'], phone: ['رقم الجوال', 'Phone'], nationality: ['الجنسية', 'Nationality'] }
                const showVal = (field, v) => v ? (field === 'phone' ? fmtPhone(v) : v) : '—'
                return (
                  <ChangeLog T={T} title={T('سجل تعديل بيانات الوسيط', 'Agent edit log')} entries={log}
                    actionLabel={T('تم تعديل بيانات الوسيط', 'Agent details edited')}
                    renderDetail={c => <FieldChanges T={T} changes={c.changes} LBL={LBL} showVal={showVal} />} />
                )
              })()}
            </div>
          </div>
        )
      })()}
      {cardVisible(user, 'invoices', 'service_transaction') && ['work_visa', 'other', 'ajeer'].includes(baseSvcCode(data?.code || inv.service_type?.code)) && (() => {
        // بطاقة «معاملة الخدمة» — تعرض حالات المراحل المنجزة (تم إصدار التأشيرة/الإقامة).
        // تظهر فقط عند وجود حالة منجزة.
        const sky = '#38BDF8'
        if (!Array.isArray(stageStatus) || stageStatus.length === 0) return null
        return (
          <div style={cardChrome}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: sky }} />
              <span style={{ ...cardTitle, color: sky }}>{T('معاملة الخدمة','Service Transaction')}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 22px' }}>
              {stageStatus}
            </div>
          </div>
        )
      })()}
      {/* كرت التعليقات — آخر كرت في العمود الرئيسي (نفس تصميم/وظيفة كرت تعليقات المعاملات). */}
      {cardVisible(user, 'invoices', 'comments') && <InvoiceCommentsCard sb={sb} T={T} isAr={isAr} toast={toast} inv={inv} user={user} />}
    </div>
    <div style={{ position: 'sticky', top: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {total > 0 && cardVisible(user, 'invoices', 'financial_summary') && (
      <FinancialSummaryCard inv={inv} data={data} isAr={isAr} T={T} total={total} paid={paid} remaining={remaining} pct={pct} payT={payT} user={user}
        stageStatus={(cardVisible(user, 'invoices', 'service_transaction') && ['work_visa', 'other', 'ajeer'].includes(baseSvcCode(data?.code || inv.service_type?.code))) ? undefined : stageStatus} />
      )}
      {/* كرت «حالة المعاملة» — أعلى قسم الطباعة؛ بخلفية كرت الوسيط (cardChrome). يظهر في كل الفواتير:
          صفّ لكل تأشيرة في خدمات التأشيرات، وصفّ حالة عام (منجزة/قيد التنفيذ/ملغاة) لبقية الخدمات. */}
      {(() => {
        const _code = data?.code || inv.service_type?.code
        const isPermVisa = _code === 'work_visa_permanent' || _code === 'work_visa_temporary'
        const visas = isPermVisa ? (data?.det || []).filter(v => v && v.id) : []
        if (isPermVisa && !visas.length) return null
        // الخدمات غير التأشيرية: حالة المعاملة العامة من حالة الطلب/الفاتورة.
        // الحالات هنا: ملغاة / منجزة / وإلا «جديد» (الافتراضي عند الإنشاء). «قيد التنفيذ» تخصّ التأشيرات فقط.
        const reqCode = inv.service_request?.status?.code
        // خدمات موافقة المحاسب: حالات وسطى من موافقة المحاسب قبل الإنجاز/الإلغاء.
        const _acct = inv.service_request?.accountant_status
        // خدمات موافقة المحاسب (النقل الخارجي · خروج وعودة · خروج نهائي): حالة من مرحلتين — موافقة المحاسب ثم المعاملة.
        const needsAcct = needsAcctApproval(_code)
        // تعديل الراتب: حالة من مرحلتين منفصلتين — (١) تعديل الراتب للراتب الجديد، (٢) إرجاع الراتب الأساسي.
        const isSalaryEdit = baseSvcCode(_code) === 'name_translation'
        // حالة المعاملة تخصّ المعاملة وحدها — إلغاء الفاتورة لا يجعل المعاملة ملغاة.
        const isCancelled = reqCode === 'cancelled'
        const genStage = isCancelled ? 'cancelled'
          : reqCode === 'done' ? 'done'
          : needsAcct
            ? (_acct === 'rejected' ? 'acct_rejected' : _acct === 'approved' ? 'acct_approved' : 'awaiting_acct')
          : 'new'
        // النقل الخارجي يُعرض مرحلتين: (١) موافقة المحاسب، (٢) الإنجاز/الإلغاء بعدها.
        const acctStage = _acct === 'approved' ? 'acct_approved' : _acct === 'rejected' ? 'acct_rejected' : 'awaiting_acct'
        const finalStage = reqCode === 'done' ? 'done'
          : (isCancelled || _acct === 'rejected') ? 'cancelled'
          : 'awaiting_done'
        // كتلة تفصيلية موحَّدة تُعرض أسفل أي شارة مرحلة: عدّاد (حيّ أو مدة ثابتة) + بيانات إضافية + مَن/متى + ملاحظة.
        // counterFrom/counterTo: بداية ونهاية العدّاد (to محذوف ⇒ عدّاد حيّ). whenAt: وقت العرض في سطر «مَن/متى».
        const metaBlock = ({ accent, counterFrom, counterTo, whenAt, person, note, extraRows = [], docFile = null, docLabel = null, attachments = [] }) => {
          const byName = person ? (isAr ? (person.name_ar || person.name_en) : (person.name_en || person.name_ar)) : null
          const atts = (attachments || []).filter(a => a && a.url)
          if (!counterFrom && !byName && !note && !docFile && !extraRows.length && !atts.length) return null
          return (
            <div style={{ marginTop: 8 }}>
              {counterFrom && <ElapsedCounter at={counterFrom} to={counterTo} accent={accent} T={T} />}
              {/* مَن/متى أولاً — مباشرةً تحت كرتي العدّاد (اليوم/الساعة). */}
              {(byName || whenAt) && (
                <div style={{ marginTop: counterFrom ? 8 : 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  {byName ? (
                    <span style={{ fontSize: 10.5, color: 'var(--tx3)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      {byName}
                    </span>
                  ) : <span />}
                  {whenAt && <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{fmtDateTime(whenAt)}</span>}
                </div>
              )}
              {extraRows.length > 0 && (
                <div style={{ marginTop: (counterFrom || byName || whenAt) ? 8 : 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {extraRows.map(([lbl, val, mono, color, copy], i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600 }}>{lbl}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {copy && <CopyBtn text={val} />}
                        <span style={{ fontSize: 12, color: color || 'var(--tx2)', fontWeight: 600, ...(mono ? { direction: 'ltr', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' } : {}) }}>{val}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {note && (
                <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--tx2)', fontWeight: 600, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', direction: 'rtl' }}>{note}</div>
              )}
              {docFile && (
                <a href={docFile.file_url} target="_blank" rel="noopener noreferrer" style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, color: C.gold, fontSize: 12, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  {docLabel || T('عرض المستند المرفق', 'View attached document')}
                </a>
              )}
              {atts.map((a, i) => (
                <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, color: C.gold, fontSize: 12, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  {a.label}
                </a>
              ))}
            </div>
          )
        }
        return (
          <div style={{ ...cardChrome, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              <span style={{ fontSize: 16, fontWeight: 600, color: C.gold, letterSpacing: '.2px' }}>{T('المعاملة', 'Transaction')}</span>
              <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.05)' }} />
              {/* تاق منشئ الفاتورة — يُعرض هنا فقط حين يكون الكرت المالي مخفياً (إجمالي صفري) كي لا يتكرّر. */}
              {total <= 0 && (() => {
                const person = inv.creator?.person
                const full = (isAr ? (person?.name_ar || person?.name_en) : (person?.name_en || person?.name_ar)) || ''
                const twoNames = full.trim().split(/\s+/).filter(Boolean).slice(0, 2).join(' ')
                return twoNames ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, whiteSpace: 'nowrap' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.gold, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.goldSoft }}>{twoNames}</span>
                  </span>
                ) : null
              })()}
            </div>
            {/* بيانات المعاملة — أرقام/تفاصيل الخدمة (تأشيرات · نقل · تجديد · أجير · أخرى) مباشرةً في كرت المعاملة. */}
            {!isPermVisa && (() => {
              const _c = baseSvcCode(data?.code || inv.service_type?.code)
              // نقل الكفالة: لا نعرض كرت «بيانات المعاملة» (مكرّر مع كرتَي العميل/الحسبة) — بطلب المستخدم.
              if (_c === 'transfer') return null
              const det = Array.isArray(data?.det) ? data.det : []
              const tc = data?.tc || {}
              const mk = (val) => (val != null && String(val).trim() !== '' && String(val) !== 'null') ? String(val) : null
              const groups = []
              if (_c === 'work_visa') {
                det.filter(v => v && v.id).forEach((v, idx, arr) => {
                  const natName = v.nationality ? (isAr ? (v.nationality.name_ar || v.nationality.name_en) : (v.nationality.name_en || v.nationality.name_ar)) : null
                  const occName = v.occupation ? (isAr ? (v.occupation.name_ar || v.occupation.name_en) : (v.occupation.name_en || v.occupation.name_ar)) : null
                  const wkStatus = v.wakalah_status ? (isAr ? v.wakalah_status.value_ar : v.wakalah_status.value_en) : null
                  const rows = [
                    [T('رقم التأشيرة', 'Visa No'), mk(v.visa_number), true, null, true],
                    [T('رقم الحدود', 'Border No'), mk(v.border_number), true, null, true],
                    [T('الرقم الموحد', 'Unified No'), mk(v.unified_number), true, null, true],
                    [T('رقم الوكالة', 'Wakala No'), mk(v.wakalah_number), true, null, true],
                    [T('حالة الوكالة', 'Wakala Status'), mk(wkStatus), false],
                    [T('الجنسية', 'Nationality'), mk(natName), false],
                    [T('المهنة', 'Occupation'), mk(occName), false],
                  ].filter(r => r[1])
                  if (rows.length) groups.push({ title: arr.length > 1 ? `${T('التأشيرة', 'Visa')} ${idx + 1}` : null, rows })
                })
              } else if (_c === 'transfer') {
                const d = det[0] || {}; const w = d.worker
                const rows = [
                  [T('رقم المرجع', 'Reference'), mk(d.reference_number || tc.quote_no), true, null, true],
                  [T('رقم الإقامة', 'Iqama No'), mk(w?.iqama_number || tc.iqama_number), true, null, true],
                  [T('العامل', 'Worker'), mk(w ? (isAr ? (w.name_ar || w.name_en) : (w.name_en || w.name_ar)) : tc.worker_name), false],
                  [T('المهنة الجديدة', 'New Occupation'), mk(d.new_occupation ? (isAr ? d.new_occupation.name_ar : d.new_occupation.name_en) : tc.new_occupation_name_ar), false],
                  [T('انتهاء الإقامة', 'Iqama Expiry'), (d.iqama_expiry_date || tc.iqama_expiry_gregorian) ? fmtGreg(d.iqama_expiry_date || tc.iqama_expiry_gregorian, isAr) : null, false, C.gold],
                  [T('حالة النقل', 'Transfer Status'), mk(d.status ? (isAr ? d.status.value_ar : d.status.value_en) : null), false],
                  [T('حالة العامل', 'Worker Status'), mk(d.worker_status ? (isAr ? d.worker_status.value_ar : d.worker_status.value_en) : null), false],
                  [T('حالة قوى', 'Qiwa Status'), mk(d.transfer_qiwa_status), false],
                  [T('حالة مقيم', 'Muqeem Status'), mk(d.transfer_muqeem_status), false],
                  [T('المنشأة', 'Facility'), mk(d.main_facility?.name_ar), false],
                ].filter(r => r[1])
                if (rows.length) groups.push({ title: null, rows })
              } else if (_c === 'iqama_renewal') {
                const d = det[0] || {}
                const rows = [
                  [T('رقم الإقامة', 'Iqama No'), mk(d.worker?.iqama_number || tc.iqama_number), true, null, true],
                  [T('مدة التجديد', 'Renewal Months'), (d.duration_months || tc.renewal_months) ? `${d.duration_months || tc.renewal_months} ${T('شهر', 'months')}` : null, false],
                  [T('الانتهاء الحالي', 'Current Expiry'), d.current_expire_date ? fmtGreg(d.current_expire_date, isAr) : null, false],
                  [T('الانتهاء الجديد', 'New Expiry'), (d.new_expire_date || tc.expected_expiry_date) ? fmtGreg(d.new_expire_date || tc.expected_expiry_date, isAr) : null, false, C.gold],
                  [T('المنشأة', 'Facility'), mk(d.worker_facility?.name_ar), false],
                ].filter(r => r[1])
                if (rows.length) groups.push({ title: null, rows })
              } else if (_c === 'ajeer') {
                const d = det[0] || {}
                const rows = [
                  [T('رقم الإقامة', 'Iqama No'), mk(d.worker?.iqama_number), true, null, true],
                  [T('منشأة أجير', 'Ajeer Facility'), mk(d.ajeer_facility?.name_ar || d.notes), false],
                  [T('المنشأة الرئيسية', 'Main Facility'), mk(d.main_facility?.name_ar), false],
                  [T('المدة', 'Duration'), d.duration_months ? `${d.duration_months} ${T('شهر', 'months')}` : null, false],
                  [T('البداية', 'Start'), d.start_date ? fmtGreg(d.start_date, isAr) : null, false],
                  [T('النهاية', 'End'), d.end_date ? fmtGreg(d.end_date, isAr) : null, false],
                ].filter(r => r[1])
                if (rows.length) groups.push({ title: null, rows })
              } else {
                const d = det[0] || {}
                const rows = [
                  [T('رقم الإقامة', 'Iqama No'), mk(d.worker?.iqama_number), true, null, true],
                  [T('الوصف', 'Description'), mk(d.description), false],
                ].filter(r => r[1])
                if (rows.length) groups.push({ title: null, rows })
              }
              if (!groups.length) return null
              return (
                <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(212,160,23,.05)', border: '1px solid rgba(212,160,23,.12)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.goldSoft, marginBottom: 8, letterSpacing: '.2px' }}>{T('بيانات المعاملة', 'Transaction Data')}</div>
                  {groups.map((g, gi) => (
                    <div key={gi} style={gi > 0 ? { marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--bd)' } : undefined}>
                      {g.title && <div style={{ fontSize: 11.5, fontWeight: 700, color: C.goldSoft, marginBottom: 6 }}>{g.title}</div>}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {g.rows.map(([lbl, val, mono, color, copy], i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>{lbl}</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              {copy && <CopyBtn text={String(val)} />}
                              <span style={{ fontSize: 12.5, color: color || 'var(--tx2)', fontWeight: 600, ...(mono ? { direction: 'ltr', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' } : {}) }}>{val}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {isPermVisa
                ? visas.map((v, i) => {
                    // كل تأشيرة = مرحلتان موضّحتان (مثل بقية الفواتير): «التأشيرة» ثم «الإقامة» —
                    // لكلٍّ تاق الحالة + عدّاد + المدخلات (رقم الحدود/الإقامة…) + مَن نفّذ + التاريخ والوقت + الملف.
                    const iq = (data?.iqamaByVisa || {})[v.id] || null
                    const iqNum = String(iq?.iqama_number || '').trim()
                    const visaDone = !!String(v.border_number || '').trim()
                    const iqamaDone = !!iqNum
                    const visaFile = (data?.visaFileByVisa || {})[v.id] || null
                    const muqeemFileV = (data?.muqeemByVisa || {})[v.id] || null
                    const natName = isAr ? (v.nationality?.name_ar || v.nationality?.name_en) : (v.nationality?.name_en || v.nationality?.name_ar)
                    const occName = isAr ? (v.occupation?.name_ar || v.occupation?.name_en) : (v.occupation?.name_en || v.occupation?.name_ar)
                    // مرحلة «التأشيرة» — منجزة بمجرد إدخال رقم الحدود.
                    const visaExtra = []
                    if (v.unified_number) visaExtra.push([T('الرقم الموحد', 'Unified No'), v.unified_number, true, null, true])
                    if (v.border_number) visaExtra.push([T('رقم الحدود', 'Border No'), v.border_number, true, null, true])
                    if (v.visa_number) visaExtra.push([T('رقم التأشيرة', 'Visa No'), v.visa_number, true, null, true])
                    if (natName) visaExtra.push([T('الجنسية', 'Nationality'), natName, false])
                    if (occName) visaExtra.push([T('المهنة', 'Occupation'), occName, false])
                    if (visaDone && v.visa_issue_date) visaExtra.push([T('تاريخ إصدار التأشيرة', 'Visa Issue Date'), fmtGreg(v.visa_issue_date, isAr), false])
                    const visaWhen = visaDone ? (visaFile?.created_at || v.updated_at) : null
                    const visaMeta = metaBlock({
                      accent: visaDone ? C.gold : '#38BDF8',
                      counterFrom: inv.created_at,
                      counterTo: visaWhen || undefined,
                      whenAt: visaWhen,
                      person: visaDone ? v.editor?.person : null,
                      extraRows: visaExtra,
                      attachments: (visaDone && visaFile?.file_url) ? [{ url: visaFile.file_url, label: T('عرض ملف التأشيرة', 'View visa file') }] : [],
                    })
                    // مرحلة «الإقامة» — لا تظهر إلا بعد إصدار التأشيرة.
                    const iqExtra = []
                    if (v.worker_name) iqExtra.push([T('اسم العامل', 'Worker Name'), v.worker_name, false])
                    if (iqNum) iqExtra.push([T('رقم الإقامة', 'Iqama No'), iqNum, true, null, true])
                    if (iq?.iqama_expiry) iqExtra.push([T('تاريخ انتهاء الإقامة', 'Iqama Expiry'), fmtGreg(iq.iqama_expiry, isAr), false, C.gold])
                    const iqMeta = metaBlock({
                      accent: iqamaDone ? C.ok : '#38BDF8',
                      counterFrom: visaWhen || inv.created_at,
                      counterTo: iqamaDone ? iq?.created_at : undefined,
                      whenAt: iqamaDone ? iq?.created_at : null,
                      person: iqamaDone ? iq?.creator?.person : null,
                      extraRows: iqExtra,
                      attachments: (iqamaDone && muqeemFileV?.file_url) ? [{ url: muqeemFileV.file_url, label: T('عرض ملف المقيم', 'View resident file') }] : [],
                    })
                    // تأشيرة وإقامة دائمة: مرحلتان إضافيتان بين التأشيرة والإقامة — «التأمين» و«رخصة العمل» (من stage_data).
                    const isPermanent = _code === 'work_visa_permanent'
                    const sd = (iq?.stage_data && typeof iq.stage_data === 'object') ? iq.stage_data : {}
                    const ins = sd.insurance || null
                    const wp = sd.work_permit || null
                    const insFile = (data?.visaInsFileByVisa || {})[v.id] || null
                    const wpFile = (data?.visaWpFileByVisa || {})[v.id] || null
                    const insExtra = []
                    if (ins) {
                      if (ins.company) insExtra.push([T('شركة التأمين', 'Company'), ins.company, false])
                      if (ins.policy_no) insExtra.push([T('رقم البوليصة', 'Policy No'), ins.policy_no, true, null, true])
                      if (ins.expiry) insExtra.push([T('تاريخ انتهاء التأمين', 'Insurance Expiry'), fmtGreg(ins.expiry, isAr), false, C.gold])
                      if (ins.amount != null) insExtra.push([T('المبلغ', 'Amount'), `${num(ins.amount)} ${T('ريال', 'SAR')}`, false])
                    }
                    const insMeta = metaBlock({
                      accent: ins ? C.gold : '#38BDF8',
                      counterFrom: visaWhen || inv.created_at,
                      counterTo: ins ? ins.at : undefined,
                      whenAt: ins ? ins.at : null,
                      person: ins?.by_name ? { name_ar: ins.by_name, name_en: ins.by_name } : null,
                      extraRows: insExtra,
                      attachments: (ins && insFile?.file_url) ? [{ url: insFile.file_url, label: T('عرض ملف التأمين', 'View insurance file') }] : [],
                    })
                    const wpExtra = []
                    if (wp) {
                      if (wp.duration_months != null) wpExtra.push([T('المدة', 'Duration'), `${wp.duration_months} ${T('أشهر', 'months')}`, false])
                      if (wp.expiry) wpExtra.push([T('تاريخ انتهاء رخصة العمل', 'Work Permit Expiry'), fmtGreg(wp.expiry, isAr), false, C.gold])
                      if (wp.amount != null) wpExtra.push([T('المبلغ', 'Amount'), `${num(wp.amount)} ${T('ريال', 'SAR')}`, false])
                    }
                    const wpMeta = metaBlock({
                      accent: wp ? C.gold : '#38BDF8',
                      counterFrom: visaWhen || inv.created_at,
                      counterTo: wp ? wp.at : undefined,
                      whenAt: wp ? wp.at : null,
                      person: wp?.by_name ? { name_ar: wp.by_name, name_en: wp.by_name } : null,
                      extraRows: wpExtra,
                      attachments: (wp && wpFile?.file_url) ? [{ url: wpFile.file_url, label: T('عرض ملف رخصة العمل', 'View work permit file') }] : [],
                    })
                    return (
                      <div key={v.id} style={i > 0 ? { marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--bd)' } : undefined}>
                        {visas.length > 1 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.gold, flexShrink: 0 }} />
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: C.goldSoft }}>{T('التأشيرة', 'Visa')} {i + 1}</span>
                            {v.border_number && <span style={{ fontSize: 11, color: 'var(--tx4)', direction: 'ltr', fontVariantNumeric: 'tabular-nums', marginInlineStart: 'auto' }}>#{v.border_number}</span>}
                          </div>
                        )}
                        <TxnStatusBar T={T} stage={visaDone ? 'issued' : 'new'} phase={T('التأشيرة', 'Visa')}
                          label={visaDone ? T('تم الإصدار', 'Issued') : T('بانتظار الإصدار', 'Awaiting issuance')} />
                        {visaMeta}
                        {/* تأشيرة دائمة: التأمين ورخصة العمل (بلا ترتيب بينهما) بين التأشيرة والإقامة. */}
                        {visaDone && isPermanent && (
                          <>
                            <div style={{ marginTop: 16 }}>
                              <TxnStatusBar T={T} stage={ins ? 'issued' : 'awaiting_done'} phase={T('التأمين', 'Insurance')}
                                label={ins ? T('تم الإصدار', 'Issued') : T('بانتظار الإصدار', 'Awaiting issuance')} />
                              {insMeta}
                            </div>
                            <div style={{ marginTop: 16 }}>
                              <TxnStatusBar T={T} stage={wp ? 'issued' : 'awaiting_done'} phase={T('رخصة العمل', 'Work Permit')}
                                label={wp ? T('تم الإصدار', 'Issued') : T('بانتظار الإصدار', 'Awaiting issuance')} />
                              {wpMeta}
                            </div>
                          </>
                        )}
                        {visaDone && (
                          <div style={{ marginTop: 16 }}>
                            <TxnStatusBar T={T} stage={iqamaDone ? 'done' : 'awaiting_done'} phase={T('الإقامة', 'Iqama')}
                              label={iqamaDone ? T('تم الإصدار', 'Issued') : T('بانتظار الإصدار', 'Awaiting issuance')} />
                            {iqMeta}
                          </div>
                        )}
                      </div>
                    )
                  })
                : needsAcct
                  ? (() => {
                      // خدمات موافقة المحاسب: كل مرحلة (المحاسب · المعاملة) لها شارتها وكتلتها التفصيلية المستقلّة.
                      const sr = inv.service_request
                      const det0 = Array.isArray(data?.det) ? data.det[0] : null
                      const dt = det0?.details || {}
                      const acctDecided = _acct === 'approved' || _acct === 'rejected'
                      // مرحلة المحاسب: العدّاد من الإنشاء حتى قرار المحاسب (أو حيّ ما دام بالانتظار).
                      const acctMeta = metaBlock({
                        accent: acctStage === 'acct_approved' ? C.gold : acctStage === 'acct_rejected' ? C.red : '#38BDF8',
                        counterFrom: inv.created_at,
                        counterTo: acctDecided ? sr?.accountant_at : undefined,
                        whenAt: acctDecided ? sr?.accountant_at : null,
                        person: acctDecided ? sr?.accountant?.person : null,
                        note: acctDecided ? (sr?.accountant_note || '').trim() : '',
                      })
                      // مرحلة المعاملة (بعد الموافقة): العدّاد من وقت الموافقة حتى الإنجاز/الإلغاء (أو حيّ ما دامت بالانتظار).
                      let compMeta = null
                      if (_acct === 'approved') {
                        const extra = []
                        const compAtts = []
                        if (finalStage === 'done') {
                          // النقل الخارجي: الرقم الموحد للشركة الناقلة + اسم المدير.
                          if (dt.transfer_company_700) extra.push([T('الرقم الموحد للشركة الناقلة', 'Transferring company no'), dt.transfer_company_700, true])
                          if (dt.manager_name) extra.push([T('اسم المدير', 'Manager name'), dt.manager_name, false])
                          // مدخلات الإنجاز المُدارة بالسجل (خروج وعودة/نهائي: رقم التأشيرة · انتهاء التأشيرة · مرفق التأشيرة).
                          const fmap = data?.doneFilesMap || {}
                          for (const f of (DONE_INPUTS[baseSvcCode(_code)] || [])) {
                            if (f.type === 'file') { const a = fmap[f.key]; if (a) compAtts.push({ url: a.file_url, label: T('عرض ', 'View ') + T(f.label_ar, f.label_en) }) }
                            else if (dt[f.key] != null && dt[f.key] !== '') {
                              const v = f.type === 'date' ? fmtGreg(dt[f.key], isAr) : (f.money ? `${num(dt[f.key])} ${T('ريال', 'SAR')}` : String(dt[f.key]))
                              extra.push([T(f.label_ar, f.label_en), v, !!f.mono])
                            }
                          }
                        }
                        const compEnd = finalStage === 'done' ? sr?.completed_at : finalStage === 'cancelled' ? sr?.cancelled_at : undefined
                        compMeta = metaBlock({
                          accent: finalStage === 'done' ? C.ok : finalStage === 'cancelled' ? C.red : '#38BDF8',
                          counterFrom: sr?.accountant_at || inv.created_at,
                          counterTo: compEnd,
                          whenAt: compEnd || null,
                          person: finalStage === 'done' ? sr?.completer?.person : finalStage === 'cancelled' ? sr?.canceller?.person : null,
                          note: finalStage === 'done' ? (sr?.completion_note || '').trim() : finalStage === 'cancelled' ? (sr?.cancelled_reason || '').trim() : '',
                          extraRows: extra,
                          attachments: compAtts,
                        })
                      }
                      return (<>
                        <div>
                          <TxnStatusBar T={T} stage={acctStage} phase={T('المحاسب', 'Accountant')}
                            label={acctStage === 'acct_approved' ? T('تمت الموافقة', 'Approved')
                              : acctStage === 'acct_rejected' ? T('تم الرفض', 'Rejected')
                              : T('بالانتظار', 'Pending')} />
                          {acctMeta}
                        </div>
                        {/* شارة المعاملة لا تظهر إلا بعد موافقة المحاسب — قبلها (انتظار/رفض) لم تبدأ المعاملة.
                            مسافة علوية أكبر لتفصل مرحلة المعاملة عن مرحلة المحاسب بوضوح. */}
                        {_acct === 'approved' && (
                          <div style={{ marginTop: 16 }}>
                            <TxnStatusBar T={T} stage={finalStage} phase={T('المعاملة', 'Transaction')}
                              label={finalStage === 'done' ? T('منجزة', 'Completed')
                                : finalStage === 'cancelled' ? T('ملغاة', 'Cancelled')
                                : T('بالانتظار', 'Pending')} />
                            {compMeta}
                          </div>
                        )}
                      </>)
                    })()
                  : isSalaryEdit
                  ? (() => {
                      // تعديل الراتب: مرحلتان منفصلتان — كلٌّ لها شارتها وكتلتها (مَن نفّذ، متى، المرفق).
                      const sr = inv.service_request
                      const det0 = Array.isArray(data?.det) ? data.det[0] : null
                      const dt = det0?.details || {}
                      const fmap = data?.doneFilesMap || {}
                      const phase = dt.salary_phase  // undefined | 'awaiting_return' | 'returned'
                      // المرحلة ١ (تعديل الراتب للراتب الجديد) تُنجَز عند «تم الإنجاز» (دخول مرحلة الإرجاع أو حالة الطلب «منجز»).
                      const mod1Done = reqCode === 'done' || phase === 'awaiting_return' || phase === 'returned'
                      // المرحلة المنجزة تأخذ شكل «تمت الموافقة» (ذهبي + صح) مثل مرحلة المحاسب.
                      const mod1Stage = isCancelled ? 'cancelled' : mod1Done ? 'acct_approved' : 'new'
                      const ret2Stage = phase === 'returned' ? 'done' : 'awaiting_done'
                      const newSalFile = fmap.salary_new_file
                      const mod1Meta = metaBlock({
                        accent: mod1Stage === 'acct_approved' ? C.gold : mod1Stage === 'cancelled' ? C.red : '#38BDF8',
                        counterFrom: inv.created_at,
                        counterTo: mod1Done ? sr?.completed_at : isCancelled ? sr?.cancelled_at : undefined,
                        whenAt: mod1Done ? sr?.completed_at : isCancelled ? sr?.cancelled_at : null,
                        person: mod1Done ? sr?.completer?.person : isCancelled ? sr?.canceller?.person : null,
                        note: mod1Done ? (sr?.completion_note || '').trim() : isCancelled ? (sr?.cancelled_reason || '').trim() : '',
                        attachments: (mod1Done && newSalFile?.file_url) ? [{ url: newSalFile.file_url, label: T('عرض صورة شاشة الراتب الجديد', 'View new-salary screenshot') }] : [],
                      })
                      let ret2Meta = null
                      if (mod1Done && !isCancelled) {
                        const baseFile = fmap.salary_base_file
                        const extra = []
                        if (dt.salary_return_date) extra.push([T('تاريخ إرجاع الراتب', 'Salary Return Date'), fmtGreg(dt.salary_return_date, isAr), false])
                        if (phase === 'returned' && dt.base_salary != null) extra.push([T('الراتب الأساسي', 'Base Salary'), `${num(dt.base_salary)}`, true])
                        ret2Meta = metaBlock({
                          accent: ret2Stage === 'done' ? C.ok : '#38BDF8',
                          counterFrom: sr?.completed_at || inv.created_at,
                          counterTo: phase === 'returned' ? dt.salary_returned_at : undefined,
                          whenAt: phase === 'returned' ? dt.salary_returned_at : null,
                          person: (phase === 'returned' && dt.salary_returned_by_name) ? { name_ar: dt.salary_returned_by_name, name_en: dt.salary_returned_by_name } : null,
                          extraRows: extra,
                          attachments: (phase === 'returned' && baseFile?.file_url) ? [{ url: baseFile.file_url, label: T('عرض صورة شاشة الراتب الأساسي', 'View base-salary screenshot') }] : [],
                        })
                      }
                      return (<>
                        <div>
                          <TxnStatusBar T={T} stage={mod1Stage} phase={T('تعديل الراتب', 'Salary Edit')}
                            label={mod1Stage === 'acct_approved' ? T('تم التعديل للراتب الجديد', 'Changed to new salary')
                              : mod1Stage === 'cancelled' ? T('ملغاة', 'Cancelled')
                              : T('جديد', 'New')} />
                          {mod1Meta}
                        </div>
                        {/* المرحلة الثانية لا تظهر إلا بعد إنجاز تعديل الراتب — لتنفصل بوضوح. */}
                        {mod1Done && !isCancelled && (
                          <div style={{ marginTop: 16 }}>
                            <TxnStatusBar T={T} stage={ret2Stage} phase={T('إرجاع الراتب', 'Salary Return')}
                              label={ret2Stage === 'done' ? T('تم إرجاع الراتب الأساسي', 'Base salary returned')
                                : T('بانتظار إرجاع الراتب الأساسي', 'Awaiting base-salary return')} />
                            {ret2Meta}
                          </div>
                        )}
                      </>)
                    })()
                  : (_code === 'transfer' && genStage !== 'cancelled')
                  ? (() => {
                      // نقل الكفالة: «حالة المعاملة» مقسومة لثلاث مراحل — كلٌّ لها تاق وعدّاد ومَن نفّذ وتاريخ/وقت.
                      const tc = data?.tc || {}
                      const sd = (tc.stage_data && typeof tc.stage_data === 'object') ? tc.stage_data : {}
                      const transferOnly = !!tc.transfer_only
                      const ins = sd.insurance, wp = sd.work_permit, mu = sd.muqeem
                      // المدة الفعلية للإقامة = من نفس يوم بداية حساب المدة المتوقعة (يوم التسعير) حتى تاريخ انتهاء الإقامة الفعلي — لتُقارن مباشرةً بالمدة المتوقعة في الملخص.
                      const muActualDur = (() => {
                        if (!mu || mu.status === 'cancelled' || !mu.iqama_expiry) return null
                        const exp = new Date(mu.iqama_expiry); const start = tc.priced_at ? new Date(tc.priced_at) : (mu.at ? new Date(mu.at) : new Date())
                        if (isNaN(exp.getTime())) return null
                        start.setHours(0, 0, 0, 0); exp.setHours(0, 0, 0, 0)
                        if (exp <= start) return T('منتهية', 'Expired')
                        let m = (exp.getFullYear() - start.getFullYear()) * 12 + (exp.getMonth() - start.getMonth())
                        let d = exp.getDate() - start.getDate()
                        if (d < 0) { m -= 1; d += new Date(exp.getFullYear(), exp.getMonth(), 0).getDate() }
                        const moU = n => isAr ? ((n >= 3 && n <= 10) ? 'أشهر' : 'شهر') : (n === 1 ? 'month' : 'months')
                        const dyU = n => isAr ? ((n >= 3 && n <= 10) ? 'أيام' : 'يوم') : (n === 1 ? 'day' : 'days')
                        const parts = []
                        if (m > 0) parts.push(`${m} ${moU(m)}`)
                        if (d > 0) parts.push(`${d} ${dyU(d)}`)
                        return parts.length ? parts.join(isAr ? ' و ' : ' ') : T('أقل من يوم', '< 1 day')
                      })()
                      const personOf = s => s?.by_name ? { name_ar: s.by_name, name_en: s.by_name } : null
                      const stageBar = (key, phaseLabel, sObj, prevAt, fileAtt, extraRows) => {
                        const cancelled = sObj?.status === 'cancelled'
                        const st = !sObj ? 'awaiting_done' : cancelled ? 'cancelled' : 'done'
                        return (
                          <div style={{ marginTop: key === 'transfer' ? 0 : 16 }}>
                            <TxnStatusBar T={T} stage={st} phase={phaseLabel}
                              label={!sObj ? T('بالانتظار', 'Pending') : cancelled ? T('ملغاة', 'Cancelled') : T('منجز', 'Completed')} />
                            {sObj && metaBlock({ accent: cancelled ? C.red : C.ok, counterFrom: prevAt, counterTo: sObj.at, whenAt: sObj.at, person: personOf(sObj), note: cancelled ? (sObj.reason || '') : '', extraRows: cancelled ? [] : extraRows, attachments: (!cancelled && fileAtt) ? [{ url: fileAtt.file_url, label: T('عرض الملف', 'View file') }] : [] })}
                          </div>
                        )
                      }
                      return (<>
                        {stageBar('transfer', T('النقل', 'Transfer'), sd.transfer, inv.created_at, null, [])}
                        {stageBar('insurance', T('التأمين', 'Insurance'), ins, sd.transfer?.at || inv.created_at, data?.insFileAtt, ins ? [
                          [T('اسم الشركة', 'Company'), ins.company || '—', false],
                          [T('رقم بوليصة التأمين', 'Policy No'), ins.policy_no || '—', true],
                          [T('تاريخ انتهاء التأمين', 'Insurance Expiry'), ins.expiry ? fmtGreg(ins.expiry, isAr) : '—', false],
                          [T('المبلغ', 'Amount'), ins.amount != null ? `${num(ins.amount)} ${T('ريال', 'SAR')}` : '—', false],
                        ] : [])}
                        {!transferOnly && stageBar('workpermit', T('رخصة العمل', 'Work Permit'), wp, ins?.at || inv.created_at, data?.wpFileAtt, wp ? [
                          [T('المدة', 'Duration'), wp.duration_months != null ? `${wp.duration_months} ${T('أشهر', 'months')}` : '—', false],
                          [T('تاريخ انتهاء رخصة العمل', 'Work Permit Expiry'), wp.expiry ? fmtGreg(wp.expiry, isAr) : '—', false],
                          [T('المبلغ', 'Amount'), wp.amount != null ? `${num(wp.amount)} ${T('ريال', 'SAR')}` : '—', false],
                        ] : [])}
                        {stageBar('muqeem', T('الإقامة', 'Iqama'), mu, wp?.at || ins?.at || inv.created_at, data?.muqeemFile, mu ? [
                          [T('التجديد عبر تواصل', 'Renewal via contact'), mu.via_contact ? T('نعم', 'Yes') : T('لا', 'No'), false],
                          [T('تاريخ انتهاء الإقامة', 'Iqama Expiry'), mu.iqama_expiry ? fmtGreg(mu.iqama_expiry, isAr) : '—', false, C.gold],
                          [T('المدة الفعلية', 'Actual Duration'), muActualDur || '—', false, C.gold],
                          [T('المهنة', 'Occupation'), mu.occupation_name_ar || '—', false],
                        ] : [])}
                      </>)
                    })()
                  : (_code === 'iqama_renewal' && genStage !== 'cancelled')
                  ? (() => {
                      // تجديد الإقامة: «حالة المعاملة» على مرحلتين — التأمين (مع «لا يحتاج») ثم الإقامة. كلٌّ لها تاق وعدّاد ومَن نفّذ وملف.
                      const tc = data?.tc || {}
                      const sd = (tc.stage_data && typeof tc.stage_data === 'object') ? tc.stage_data : {}
                      const ins = sd.insurance, iq = sd.iqama
                      // المدة الفعلية للإقامة = من يوم التسعير حتى تاريخ انتهاء الإقامة الفعلي — لتُقارن بالمدة المتوقعة.
                      const iqActualDur = (() => {
                        if (!iq || iq.status === 'cancelled' || !iq.iqama_expiry) return null
                        const exp = new Date(iq.iqama_expiry); const start = tc.priced_at ? new Date(tc.priced_at) : (iq.at ? new Date(iq.at) : new Date())
                        if (isNaN(exp.getTime())) return null
                        start.setHours(0, 0, 0, 0); exp.setHours(0, 0, 0, 0)
                        if (exp <= start) return T('منتهية', 'Expired')
                        let m = (exp.getFullYear() - start.getFullYear()) * 12 + (exp.getMonth() - start.getMonth())
                        let d = exp.getDate() - start.getDate()
                        if (d < 0) { m -= 1; d += new Date(exp.getFullYear(), exp.getMonth(), 0).getDate() }
                        const moU = n => isAr ? ((n >= 3 && n <= 10) ? 'أشهر' : 'شهر') : (n === 1 ? 'month' : 'months')
                        const dyU = n => isAr ? ((n >= 3 && n <= 10) ? 'أيام' : 'يوم') : (n === 1 ? 'day' : 'days')
                        const parts = []
                        if (m > 0) parts.push(`${m} ${moU(m)}`)
                        if (d > 0) parts.push(`${d} ${dyU(d)}`)
                        return parts.length ? parts.join(isAr ? ' و ' : ' ') : T('أقل من يوم', '< 1 day')
                      })()
                      const personOf = s => s?.by_name ? { name_ar: s.by_name, name_en: s.by_name } : null
                      const stageBar = (key, phaseLabel, sObj, prevAt, fileAtt, extraRows) => {
                        const cancelled = sObj?.status === 'cancelled'
                        const skipped = sObj?.status === 'skipped'
                        const st = !sObj ? 'awaiting_done' : cancelled ? 'cancelled' : 'done'
                        return (
                          <div style={{ marginTop: key === 'insurance' ? 0 : 16 }}>
                            <TxnStatusBar T={T} stage={st} phase={phaseLabel}
                              label={!sObj ? T('بالانتظار', 'Pending') : cancelled ? T('ملغاة', 'Cancelled') : skipped ? T('لا يحتاج', 'Not Needed') : T('منجز', 'Completed')} />
                            {sObj && metaBlock({ accent: cancelled ? C.red : skipped ? C.gold : C.ok, counterFrom: prevAt, counterTo: sObj.at, whenAt: sObj.at, person: personOf(sObj), note: (cancelled || skipped) ? (sObj.reason || '') : '', extraRows: (cancelled || skipped) ? [] : extraRows, attachments: (!cancelled && !skipped && fileAtt) ? [{ url: fileAtt.file_url, label: T('عرض الملف', 'View file') }] : [] })}
                          </div>
                        )
                      }
                      return (<>
                        {stageBar('insurance', T('التأمين', 'Insurance'), ins, inv.created_at, data?.insFileAtt, ins ? [
                          [T('اسم الشركة', 'Company'), ins.company || '—', false],
                          [T('رقم بوليصة التأمين', 'Policy No'), ins.policy_no || '—', true],
                          [T('تاريخ انتهاء التأمين', 'Insurance Expiry'), ins.expiry ? fmtGreg(ins.expiry, isAr) : '—', false],
                          [T('المبلغ', 'Amount'), ins.amount != null ? `${num(ins.amount)} ${T('ريال', 'SAR')}` : '—', false],
                        ] : [])}
                        {stageBar('iqama', T('الإقامة', 'Iqama'), iq, ins?.at || inv.created_at, data?.muqeemFile, iq ? [
                          [T('التجديد عبر تواصل', 'Renewal via contact'), iq.via_contact ? T('نعم', 'Yes') : T('لا', 'No'), false],
                          [T('تاريخ انتهاء الإقامة', 'Iqama Expiry'), iq.iqama_expiry ? fmtGreg(iq.iqama_expiry, isAr) : '—', false, C.gold],
                          [T('المدة الفعلية', 'Actual Duration'), iqActualDur || '—', false, C.gold],
                          [T('المهنة', 'Occupation'), iq.occupation_name_ar || '—', false],
                        ] : [])}
                      </>)
                    })()
                  : <TxnStatusBar T={T} stage={genStage} phase={T('المعاملة', 'Transaction')}
                      label={genStage === 'done' ? T('منجزة', 'Completed')
                        : genStage === 'cancelled' ? T('ملغاة', 'Cancelled')
                        : T('جديد', 'New')} />}
            </div>
            {/* الحالة الابتدائية «جديد» (خدمات غير موافقة المحاسب): عدّاد منذ إصدار الطلب والفاتورة. */}
            {!isPermVisa && !needsAcct && !isSalaryEdit && _code !== 'transfer' && _code !== 'iqama_renewal' && genStage === 'new' && inv.created_at && (
              <div style={{ marginTop: 8 }}>
                <ElapsedCounter at={inv.created_at} accent="#38BDF8" T={T} />
              </div>
            )}
            {/* كتلة تفصيلية موحَّدة لكل الخدمات (غير التأشيرات والنقل الخارجي): العدّاد + مَن أنجز/ألغى + التاريخ/الوقت
                + المدخلات الكاملة + الملاحظة + المرفقات. الحالات النهائية: العدّاد = المدة من الإنشاء حتى الإنجاز/الإلغاء. */}
            {!isPermVisa && !needsAcct && !isSalaryEdit && ((_code !== 'transfer' && _code !== 'iqama_renewal') || genStage === 'cancelled') && genStage !== 'new' && (() => {
              const sr = inv.service_request
              const accent = genStage === 'cancelled' ? C.red : C.ok
              const at = genStage === 'cancelled' ? sr?.cancelled_at : sr?.completed_at
              const person = genStage === 'cancelled' ? sr?.canceller?.person : sr?.completer?.person
              const note = genStage === 'cancelled' ? (sr?.cancelled_reason || '').trim() : (sr?.completion_note || '').trim()
              // مدخلات الإنجاز الخاصة بالخدمة — تُعرض كصفوف + روابط مرفقات ضمن الكتلة.
              const extraRows = []
              const attachments = []
              let docFile = null, docLabel = null
              if (genStage === 'done') {
                if (baseSvcCode(_code) === 'documents') { docFile = data?.documentFile; docLabel = T('عرض المستند المرفق', 'View attached document') }
                const inputs = DONE_INPUTS[baseSvcCode(_code)] || []
                if (inputs.length) {
                  const dt = (Array.isArray(data?.det) ? data.det[0] : null)?.details || {}
                  const fmap = data?.doneFilesMap || {}
                  for (const f of inputs) {
                    if (f.type === 'file') { const a = fmap[f.key]; if (a) attachments.push({ url: a.file_url, label: T('عرض ', 'View ') + T(f.label_ar, f.label_en) }) }
                    else if (dt[f.key] != null && dt[f.key] !== '') {
                      const v = f.type === 'date' ? fmtGreg(dt[f.key], isAr) : (f.money ? `${num(dt[f.key])} ${T('ريال', 'SAR')}` : String(dt[f.key]))
                      extraRows.push([T(f.label_ar, f.label_en), v, !!f.mono])
                    }
                  }
                  // تعديل الراتب: مرحلة الانتظار/الإرجاع — تاريخ إرجاع الراتب + الراتب الأساسي + صورته.
                  if (baseSvcCode(_code) === 'name_translation') {
                    const ph = dt.salary_phase
                    if (ph === 'awaiting_return' || ph === 'returned') {
                      extraRows.push([T('المرحلة', 'Phase'), ph === 'returned' ? T('تم إرجاع الراتب الأساسي', 'Base salary returned') : T('بانتظار إرجاع الراتب الأساسي', 'Awaiting base-salary return'), false])
                      if (dt.salary_return_date) extraRows.push([T('تاريخ إرجاع الراتب', 'Salary Return Date'), fmtGreg(dt.salary_return_date, isAr), false])
                      if (ph === 'returned' && dt.base_salary != null) extraRows.push([T('الراتب الأساسي', 'Base Salary'), `${num(dt.base_salary)}`, true])
                      const bf = fmap.salary_base_file
                      if (bf) attachments.push({ url: bf.file_url, label: T('عرض صورة شاشة الراتب الأساسي', 'View base-salary screenshot') })
                    }
                  }
                }
              }
              return metaBlock({ accent, counterFrom: inv.created_at, counterTo: at, whenAt: at, person, note, extraRows, docFile, docLabel, attachments })
            })()}
          </div>
        )
      })()}
      {(() => {
        // Action buttons depend on invoice state: a cancelled invoice exposes none,
        // a fully-paid one hides "record payment", an unpaid one hides "refund".
        const cancelled = inv.status?.code === 'cancelled'
        // Same branch-scope gate used in InvoiceDetailPage: the user may act on this
        // invoice only when its office is within their permitted branches.
        const invBranchCan = canTabBranch(user, 'invoices', inv.branch_id || inv.branch?.id || null)
        const canPay = !cancelled && invBranchCan && remaining > 0.005 && canPayPerm && modalAllowed(user, 'invoices', 'inv_action_payment')
        const canRefund = !cancelled && invBranchCan && paid > 0.005 && canRefundPerm && modalAllowed(user, 'invoices', 'inv_action_refund')
        // رواتب سبلاير: لا يُعرض زر إلغاء الفاتورة (تُدار حالة الطلب من زر «تأكيد الإنجاز» فقط).
        const canCancel = !cancelled && invBranchCan && canCancelPerm && !isZeroSvc(inv.service_type?.code) && modalAllowed(user, 'invoices', 'inv_action_cancel')
        const showGmNote = gmLock && !cancelled
        if (!canPay && !canRefund && !canCancel && !showGmNote) return null
        return (
          <>
          {(canPay || canRefund || canCancel) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {canPay && (
              <div style={{ gridColumn: canRefund ? 'auto' : 'span 2', display: 'grid' }}>
                <ActionGridButton onClick={onRecordPayment} color={C.ok} label={T('تسجيل دفعة','Record Payment')}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                </ActionGridButton>
              </div>
            )}
            {canRefund && (
              <div style={{ gridColumn: canPay ? 'auto' : 'span 2', display: 'grid' }}>
                <ActionGridButton onClick={onRefund} color={C.red} label={T('استرجاع','Refund')}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                </ActionGridButton>
              </div>
            )}
            {canCancel && (
              <div style={{ gridColumn: 'span 2', display: 'grid' }}>
                <ActionGridButton onClick={onCancelInv} color={C.red} label={T('إلغاء','Cancel')}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>
                </ActionGridButton>
              </div>
            )}
          </div>
          )}
          {showGmNote && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, background: 'rgba(212,160,23,.08)', border: '1px solid rgba(212,160,23,.18)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)', lineHeight: 1.5 }}>{T('المعاملة منجزة — إلغاء أو استرجاع الفاتورة يتطلب صلاحية المدير العام.', 'Transaction completed — cancelling or refunding requires the General Manager.')}</span>
            </div>
          )}
          </>
        )
      })()}
      {canPerm(user, 'invoices.print') && modalAllowed(user, 'invoices', 'inv_action_print') && (<>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: C.gold }}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: '.3px' }}>{T('طباعة','Print')}</span>
        <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.05)' }} />
      </div>
      {/* كل لغات الطباعة معاً — اثنتان في كل صف، والأخيرة منفردة. (مكتب الفاتورة ثنائي اللغة + لغة العامل: هندي/أردو/بنغالي) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[{ k: 'ar', l: 'عربي', cc: 'sa' }, { k: 'en', l: 'English', cc: 'gb' }, { k: 'hi', l: 'हिन्दी', cc: 'in' }, { k: 'ur', l: 'اردو', cc: 'pk' }, { k: 'bn', l: 'বাংলা', cc: 'bd' }].map(o => (
          <PrintLangButton key={o.k} o={o} T={T} onPrint={() => printInvoice(inv, data, o.k)} />
        ))}
      </div>
      </>)}
    </div>
  </div>
)

// صف حالة المعاملة العام (للخدمات غير التأشيرية) — منجزة (أخضر/صح) · قيد التنفيذ (ذهبي/ساعة) · ملغاة (أحمر/x).
const TxnStatusBar = ({ T, stage, phase, label }) => {
  const m = stage === 'done' ? { c: C.ok, label: T('المعاملة منجزة', 'Transaction completed'), icon: 'check' }
    : stage === 'cancelled' ? { c: C.red, label: T('المعاملة ملغاة', 'Transaction cancelled'), icon: 'x' }
    : stage === 'acct_rejected' ? { c: C.red, label: T('تم الإلغاء من المحاسب', 'Rejected by accountant'), icon: 'x' }
    : stage === 'acct_approved' ? { c: C.gold, label: T('تمت الموافقة من المحاسب', 'Approved by accountant'), icon: 'check' }
    : stage === 'issued' ? { c: C.gold, label: T('تم الإصدار', 'Issued'), icon: 'check' }
    : stage === 'awaiting_acct' ? { c: '#38BDF8', label: T('في انتظار موافقة المحاسب', 'Awaiting accountant approval'), icon: 'clock' }
    : stage === 'awaiting_done' ? { c: '#38BDF8', label: T('بانتظار الإنجاز', 'Awaiting completion'), icon: 'clock' }
    : stage === 'new' ? { c: '#38BDF8', label: T('جديد', 'New'), icon: 'clock' }
    : { c: C.gold, label: T('قيد التنفيذ', 'In progress'), icon: 'clock' }
  const icon = m.icon === 'check'
    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={m.c} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
    : m.icon === 'x'
    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={m.c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" /></svg>
    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={m.c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></svg>
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderInlineStart: '3px solid ' + m.c, background: m.c + '10', padding: '8px 12px', color: m.c, fontSize: 12.5, fontWeight: 600, fontFamily: F }}>
      <span className="txn-dot-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: m.c, flexShrink: 0 }} />
      {phase && <span style={{ fontSize: 10.5, fontWeight: 700, opacity: .85, padding: '2px 7px', borderRadius: 6, background: m.c + '24', flexShrink: 0 }}>{phase}</span>}
      <span>{label || m.label}</span>
      <span style={{ marginInlineStart: 'auto', display: 'inline-flex' }}>{icon}</span>
    </div>
  )
}

// عدّاد حيّ منذ تغيير الحالة — مربّعا «يوم» و«ساعة» يتحدّثان تلقائياً كل دقيقة.
// at = البداية. to (اختياري) = النهاية — حينها يعرض مدةً ثابتة (البداية→النهاية) بلا عدٍّ حيّ،
// تُستخدم للحالات النهائية لقياس المدة التي استغرقتها المعاملة (إنشاء→إنجاز/إلغاء).
const ElapsedCounter = ({ at, to, accent = C.gold, T }) => {
  const fixedTo = to != null ? new Date(to).getTime() : NaN
  const fixed = !isNaN(fixedTo)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (fixed) return  // مدة ثابتة — لا حاجة للتحديث الدوري
    const id = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(id)
  }, [fixed])
  const t = at ? new Date(at).getTime() : NaN
  if (isNaN(t)) return null
  const ms = Math.max(0, (fixed ? fixedTo : now) - t)
  const totalH = Math.floor(ms / 3600000)
  const days = Math.floor(totalH / 24)
  const hours = totalH % 24
  const box = (val, lbl) => (
    <div style={{ flex: 1, textAlign: 'center', background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '8px 4px' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: accent, direction: 'ltr', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>{val}</div>
      <div style={{ fontSize: 9, color: 'var(--tx4)', fontWeight: 600 }}>{lbl}</div>
    </div>
  )
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {/* RTL: العنصر الأول يمين — الساعة يميناً واليوم يساراً. */}
      {box(hours, T('ساعة', 'hours'))}
      {box(days, T('يوم', 'days'))}
    </div>
  )
}

// Single print-language button: office flag + native language name, triggers printInvoice in that language.
const PrintLangButton = ({ o, T, onPrint }) => (
  <button onClick={onPrint} title={T('طباعة بـ ','Print in ') + o.l}
    style={{ height: 40, padding: '0 10px', borderRadius: 10, background: 'rgba(212,160,23,.06)', border: '1px solid rgba(212,160,23,.22)', color: C.gold, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: F, fontSize: 12, fontWeight: 700, transition: '.15s' }}
    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.14)'; e.currentTarget.style.borderColor = 'rgba(212,160,23,.45)' }}
    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,160,23,.06)'; e.currentTarget.style.borderColor = 'rgba(212,160,23,.22)' }}>
    <img src={`https://flagcdn.com/w40/${o.cc}.png`} alt="" width="18" height="13" style={{ display: 'block', borderRadius: 2, objectFit: 'cover', flexShrink: 0 }} />
    <span>{o.l}</span>
  </button>
)

// نمط زر «تعديل» المنقّط الشفّاف — بحدود وخط بلون الزر (أخضر/أزرق/أحمر) مع تظليل خفيف عند المرور.
const ActionGridButton = ({ onClick, color, label, children }) => (
  <button
    onClick={onClick}
    onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(.93)' }}
    onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
    style={{ height: 44, padding: '0 14px', borderRadius: 9, background: color, border: '1px solid ' + color, color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: F, fontSize: 12.5, fontWeight: 700, boxShadow: '0 3px 7px rgba(0,0,0,.2)', transition: 'filter .15s ease' }}
  >
    <span>{label}</span>
    {children}
  </button>
)

const Section = ({ title, children }) => (
  <div style={{ padding: '18px 28px', borderBottom: '1px solid var(--bd2)' }}>
    <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 700, marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' }}>{title}</div>
    {children}
  </div>
)
const CopyBtn = ({ text }) => {
  const { T } = useFKLang()
  const [done, setDone] = useState(false)
  if (text == null || text === '') return null
  return (
    <button
      title={T('نسخ', 'Copy')}
      onClick={e => { e.stopPropagation(); try { navigator.clipboard?.writeText(String(text)); setDone(true); setTimeout(() => setDone(false), 1200) } catch {} }}
      style={{ width: 18, height: 18, padding: 0, borderRadius: 4, background: 'transparent', border: 'none', color: done ? C.ok : 'var(--tx4)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: '.18s', flexShrink: 0 }}
      onMouseEnter={e => { if (!done) e.currentTarget.style.color = C.gold }}
      onMouseLeave={e => { if (!done) e.currentTarget.style.color = 'var(--tx4)' }}
    >
      {done
        ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
    </button>
  )
}

const Row = ({ label, value, mono, color, copy }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', alignItems: 'center', minHeight: 28, gap: 10 }}>
    <span style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600 }}>{label}</span>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, direction: mono ? 'ltr' : undefined }}>
      <span style={{ fontSize: 13, color: color || 'var(--tx2)', fontVariantNumeric: mono ? 'tabular-nums' : undefined, fontFamily: mono ? 'monospace' : F, fontWeight: 600 }}>{value || '—'}</span>
      {copy && value ? <CopyBtn text={value} /> : null}
    </span>
  </div>
)

const SectionLabel = ({ label, color = C.gold }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0 6px', marginTop: 4 }}>
    <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}aa` }} />
    <span style={{ fontSize: 10.5, color: color, fontWeight: 700, letterSpacing: '.6px' }}>{label}</span>
    <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.05)' }} />
  </div>
)

const BorderRow = ({ T, borderNo, visaUsed, visaNo }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', alignItems: 'center', minHeight: 28, gap: 10 }}>
    <span style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600 }}>{T('رقم الحدود','Border No')}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {(visaNo || borderNo) && <span style={{
        padding: '2px 8px', borderRadius: 999, fontSize: 9.5, fontWeight: 800, letterSpacing: '.4px',
        background: visaUsed ? 'rgba(46,204,113,.12)' : 'rgba(255,255,255,.04)',
        border: '1px solid ' + (visaUsed ? 'rgba(46,204,113,.32)' : 'rgba(255,255,255,.08)'),
        color: visaUsed ? C.ok : 'var(--tx4)',
      }}>{visaUsed ? T('مستخدمة','Used') : T('لم تستخدم','Not Used')}</span>}
      <span style={{ fontSize: 13, color: 'var(--tx2)', fontFamily: 'monospace', direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{borderNo || '—'}</span>
    </div>
  </div>
)

const selS = { padding: '9px 12px', background: 'rgba(255,255,255,.04)', border: '1px solid var(--bd)', borderRadius: 10, color: 'var(--tx1)', fontSize: 13, fontFamily: F, minWidth: 130 }
const btnFilter = (active) => ({ height: 44, padding: '0 16px', borderRadius: 12, background: active ? 'var(--accent-soft)' : 'var(--search-bg)', border: '1px solid ' + (active ? 'var(--accent-bd)' : 'transparent'), color: active ? 'var(--accent)' : 'var(--tx2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F, display: 'flex', alignItems: 'center', gap: 8, boxSizing: 'border-box', boxShadow: active ? 'var(--shadow-sm)' : 'none' })
const btnPg = (disabled) => ({ padding: '8px 16px', background: disabled ? 'rgba(255,255,255,.03)' : 'rgba(212,160,23,.12)', border: '1px solid ' + (disabled ? 'rgba(255,255,255,.06)' : 'rgba(212,160,23,.3)'), borderRadius: 10, color: disabled ? 'var(--tx4)' : C.gold, fontSize: 12, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: F })
