import React, { useEffect, useMemo, useState, useRef } from 'react'
import { DateField, Sel } from './pages/KafalaCalculator.jsx'
import BackButton from './components/BackButton'
import { can as canPerm, isGM } from './lib/permissions.js'
import { noDash, clientEditChanges } from './lib/utils.js'
import { OFFICE_LOGO_SVG } from './lib/officeBrand.js'
import { Modal, SuccessView, EmptyState, ModalSection, InfoRow, InfoGrid, GRID, FULL, CurrencyField, Segmented, TextField, TextArea, IdField, PhoneField, Select as FKSelect, FileField, Checkbox, C as FKC } from './components/ui/FormKit.jsx'
import { Plus, RotateCcw, Ban, Printer, Info, Wallet, FileText, Landmark, Building2, User, Search, CheckCircle2, CreditCard, Briefcase, Calendar, CalendarRange, BadgeCheck, Hash, Phone, Globe, Link2 } from 'lucide-react'
import { Stepper as FKStepper } from './components/ui/FormKit.jsx'

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
  other:         <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 2"/></svg>,
  general:       <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>,
}

/* ═════════════ Invoice card ═════════════
   Classic frame (amount block + divider + progress strip) on the left, and a
   right-side client column: name + flag, then the invoice no above the phone,
   in a labelled 2-column grid (ID, phone, branch, service).
   `S` is the compact spacing / type-scale preset chosen for this card. */
const CARD_S = { pad: '12px 18px', colGap: 16, amountW: 168, stack: 9, name: 14.5, inv: 11, flag: 24, gCol: 16, gRow: 9, cell: 3, lblSize: 9, lblColor: 'var(--tx4)', lblSpace: '.2px', lblUpper: 'none', valSize: 11.5, valColor: 'var(--tx2)', valWeight: 600, total: 23, totalLbl: 13, pay: 10.5, date: 11 }
// ── Loading skeleton — mirrors the stat cards + invoice card layout exactly so
//    the page loads without any shift when the real data arrives. ──
function InvoiceSkeleton({ listRows = 8 }) {
  const shimmer = {
    display: 'inline-block', borderRadius: 6,
    background: 'linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.11) 37%, rgba(255,255,255,.04) 63%)',
    backgroundSize: '400% 100%', animation: 'inv-shimmer 1.4s ease infinite',
  }
  const bar = (w, h = 11, r = 6) => <span style={{ ...shimmer, width: w, height: h, borderRadius: r }} />
  const card = { borderRadius: 16, background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)', minHeight: 190 }
  return (
    <div>
      <style>{`@keyframes inv-shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}`}</style>
      {/* بطاقات الإحصاء — نفس تخطيط الصفحة (نقدًا · جانبية · الخدمات) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 1.5fr', gap: 14, marginBottom: 24 }}>
        {/* نقدًا */}
        <div style={{ ...card, padding: '18px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>{bar(10, 10, 999)}{bar('30%', 22)}</div>
          {bar('55%', 40)}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)' }}>{bar('30%', 10)}{bar('12%', 12)}</div>
        </div>
        {/* جانبية — مؤشّران */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
          {[0, 1].map(i => (
            <div key={i} style={{ flex: 1, padding: '12px 16px', borderTop: i ? '1px solid rgba(255,255,255,.06)' : 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
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
          <div key={i} style={{ borderRadius: 14, background: 'radial-gradient(ellipse at top, rgba(212,160,23,.05) 0%, #222 60%)', border: '1px solid rgba(255,255,255,.05)', boxShadow: '0 4px 14px rgba(0,0,0,.22)', padding: '12px 18px' }}>
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
              <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,.06)', minHeight: 60 }} />
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

function InvCard({ d, T, isAr, toast, onClick }) {
  const S = CARD_S
  const statusColor = d.cancelled ? C.red : d.payT.c
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
  if (isPaid) statusList.push({ color: C.ok, label: T('مسدّدة', 'PAID'), amount: d.paid })
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
    <span style={{ fontSize: size, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, letterSpacing: '-.2px' }}>{d.name}</span>
  )

  const wrap = (extra) => ({
    position: 'relative', cursor: 'pointer', borderRadius: 14, overflow: 'hidden',
    opacity: d.cancelled ? .72 : 1, transition: 'all .15s',
    ...extra,
  })
  // Hover border follows the status color, except a still-unpaid card would glow red — swap that for the gold accent.
  const hoverColor = (!d.cancelled && statusColor === C.red) ? C.gold : statusColor
  const hoverOn = e => { e.currentTarget.style.borderColor = hoverColor + '66' }
  const hoverOff = (col) => e => { e.currentTarget.style.borderColor = col }

  const baseBorder = d.cancelled ? 'rgba(232,114,101,.28)' : 'rgba(255,255,255,.05)'

  // ── Field-label icons — sit next to the label, not the value ──
  const ICON = {
    id: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M15 8h2M15 12h2M7 16h10"/></svg>,
    phone: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    branch: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>,
    invoice: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/></svg>,
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
  const reqCode = d.reqStatusCode
  const reqDone = reqCode === 'done'
  // تظهر لأي فاتورة لها معاملة مرتبطة — حتى الملغاة (أخضر «منجز» / أزرق «لم تُنجز بعد»)
  const showReqIcon = !!reqCode
  const reqIcoColor = reqDone ? C.ok : C.blue
  const reqIcoTitle = reqDone ? T('المعاملة منجزة', 'Transaction completed') : T('المعاملة لم تُنجز بعد', 'Transaction not completed')
  const reqIcon = showReqIcon ? (
    <div title={reqIcoTitle} style={{ width: 30, height: 30, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: reqIcoColor + '1f', border: '1px solid ' + reqIcoColor + '59', flexShrink: 0 }}>
      {reqDone
        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={reqIcoColor} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={reqIcoColor} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></svg>}
    </div>
  ) : null

  const rightCol = (
    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: S.stack }}>
      {/* name + flag on top (flag after the name) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Name /><Flag />
      </div>
      {/* row 1: ID · phone · branch  ·  row 2: service · invoice no */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: `${S.gRow}px ${S.gCol}px` }}>
        {gcell(ICON.id, d.partyIdLabel, d.partyId && <span style={{ ...valStyle, direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>{d.partyId}</span>)}
        {gcell(ICON.phone, T('الجوال', 'Phone'), d.phone && <a href={`tel:${d.phone}`} onClick={stopClick} title={d.phone} style={{ ...valStyle, direction: 'ltr', textDecoration: 'none' }}>{d.phoneDisplay}</a>)}
        {gcell(ICON.branch, T('المكتب', 'Branch'), d.branchCode && <span style={valStyle}>{d.branchCode}</span>)}
        {gcell(d.svcIcon, T('الخدمة', 'Service'), <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: C.gold, fontSize: S.valSize, fontWeight: 700 }}>{d.showQty && <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 800 }}>×{d.qty}</span>}<span>{d.fullLabel}</span></span>)}
        {gcell(ICON.invoice, T('رقم الفاتورة', 'Invoice no'), <InvNo />)}
      </div>
    </div>
  )

  // ── Fixed classic frame: right column · divider · amount block · progress strip ──
  return (
    <div onClick={onClick} className="inv-card" onMouseEnter={hoverOn} onMouseLeave={hoverOff(baseBorder)} style={wrap({
      background: d.cancelled ? 'radial-gradient(ellipse at top, rgba(232,114,101,.06) 0%, #222 60%)' : 'radial-gradient(ellipse at top, rgba(212,160,23,.06) 0%, #222 60%)',
      border: '1px solid ' + baseBorder, boxShadow: '0 4px 14px rgba(0,0,0,.22)',
    })}>

      {/* شارة الحالة — لسان عمودي بحالة الفاتورة ومبلغها */}
      {statusList.map((st, i) => statusTab(st, i))}

      <div style={{ padding: S.pad, ...(statusList.length ? { paddingInlineEnd: 18 + statusList.length * 32 } : {}) }}>
        <div style={{ display: 'grid', gridTemplateColumns: `1fr${reqIcon ? ' auto' : ''} 1px ${S.amountW}px`, gap: S.colGap, alignItems: 'center' }}>
          {rightCol}
          {reqIcon}
          <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,.06)', minHeight: 60 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: S.totalLbl, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.3px', textTransform: 'uppercase' }}>{T('الإجمالي', 'Total')}</span>
              <span style={{ fontSize: S.date, color: 'var(--tx4)', fontWeight: 600 }}>{d.shortDate}</span>
            </div>
            <div style={{ fontSize: S.total, fontWeight: 700, color: C.gold, fontVariantNumeric: 'tabular-nums', direction: 'ltr', letterSpacing: '-.5px', lineHeight: 1 }}>{num(d.total)}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: S.pay }}>
                <span style={{ color: 'var(--tx2)', fontWeight: 600 }}>{T('المسدّد', 'Paid')}</span>
                <span style={{ color: d.paid > 0 ? C.ok : '#fff', fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{d.paid > 0 ? '+ ' + num(d.paid) : num(0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: S.pay }}>
                <span style={{ color: 'var(--tx2)', fontWeight: 600 }}>{T('المتبقي', 'Remaining')}</span>
                <span style={{ color: d.remaining > 0 ? C.red : '#fff', fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{d.remaining > 0 ? '− ' + num(d.remaining) : num(0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,.05)' }}>
        <div style={{ height: '100%', width: d.cancelled ? '100%' : `${d.pct}%`, background: statusColor, transition: 'width .3s' }} />
      </div>
    </div>
  )
}

/* ─── Tiny bits ─── */
const Pill = ({ count, label, color, money }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 14px', borderRadius: 999,
    background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)',
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
      background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
      border: '1px solid rgba(255,255,255,.05)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
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
        <div style={{ position: 'relative', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)', fontSize: 11, color: 'var(--tx3)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
        payments(amount,is_valid,deleted_at,payment_date),
        service_type:service_type_id(code,value_ar,value_en),
        status:status_id(code,value_ar,value_en),
        branch:branch_id(id,branch_code,phone),
        agent:agent_id(id,name_ar,name_en,id_number,phone,nationality_id,edit_log,nationality:nationality_id(code,name_ar,flag_url)),
        service_request:service_request_id(
          id, request_ref_no, request_date, quantity,
          status:status_id(code,value_ar,value_en),
          client:client_id(id,name_ar,name_en,phone,id_number,nationality_id,edit_log,nationality:nationality_id(code,name_ar,flag_url)),
          visa_applications(visa_type:visa_type_id(code,value_ar,value_en)),
          transfer_applications(worker:worker_id(name_ar,name_en,phone,iqama_number,nationality:nationality_id(code,name_ar,flag_url)),facility:main_facility_id(name_ar,unified_number,hrsd_number,gosi_number)),
          ajeer_applications(worker:worker_id(name_ar,name_en,phone,iqama_number,nationality:nationality_id(code,name_ar,flag_url)),facility:main_facility_id(name_ar,unified_number,hrsd_number,gosi_number)),
          iqama_renewal_applications(worker:worker_id(name_ar,name_en,phone,iqama_number,nationality:nationality_id(code,name_ar,flag_url)),facility:worker_facility_id(name_ar,unified_number,hrsd_number,gosi_number)),
          other_applications(worker:worker_id(name_ar,name_en,phone,iqama_number,nationality:nationality_id(code,name_ar,flag_url)),facility:worker_facility_id(name_ar,unified_number,hrsd_number,gosi_number)),
          supplier_payroll_applications(worker:worker_id(name_ar,name_en,phone,iqama_number,nationality:nationality_id(code,name_ar,flag_url)),facility:worker_facility_id(name_ar,unified_number,hrsd_number,gosi_number)),
          service_request_agents(agent:agent_id(id,name_ar,name_en,id_number,phone,nationality_id,edit_log,nationality:nationality_id(code,name_ar,flag_url)))
        )
      `
export default function InvoicePage({ sb, lang, user, branchId, toast, onNewInvoice, emptyIcon, onOpenService }) {
  const isAr = lang !== 'en'
  const T = (a, e) => (isAr ? a : e)

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
  const [serviceType, setServiceType] = useState('')
  const [payFilter, setPayFilter] = useState('') // paid | partial | unpaid
  const [branchFilter, setBranchFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [paymentPlan, setPaymentPlan] = useState('') // cash | installment
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [advOpen, setAdvOpen] = useState(false)

  // Lookups
  const [branches, setBranches] = useState([])
  const [services, setServices] = useState([])

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
    ]).then(([b, s, st]) => {
      if (!alive) return
      setBranches(b.data || [])
      setServices(s.data || [])
      setCancelledStatusId(st.data?.[0]?.id || null)
    })
    return () => { alive = false }
  }, [sb])

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
      sb.from('invoices').select('id', { count: 'exact', head: true }).is('deleted_at', null),
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
  }, [sb, refreshTick])

  // Daily + weekly KPI breakdown (cash / bank+pos / cancelled / voided)
  useEffect(() => {
    let alive = true
    const todayStart = riyadhDayStart()
    const weekStart = new Date(todayStart.getTime() - 6 * 24 * 3600 * 1000)
    const norm = (x) => ({ cnt: Number(x?.cnt) || 0, sum: Number(x?.sum) || 0 })
    Promise.all([
      sb.rpc('invoice_period_stats', { p_start: todayStart.toISOString() }),
      sb.rpc('invoice_period_stats', { p_start: weekStart.toISOString() }),
    ]).then(([t, w]) => {
      if (!alive) return
      if (t.data) {
        setPeriodStats({
          cash: norm(t.data.cash),
          bank: norm(t.data.bank),
          cancelled: norm(t.data.cancelled),
          voided: norm(t.data.voided),
        })
      }
      if (w.data) {
        setWeekStats({
          cash: norm(w.data.cash),
          bank: norm(w.data.bank),
          voided: norm(w.data.voided),
        })
      }
    })
    return () => { alive = false }
  }, [sb, refreshTick])

  // Service distribution — today AND last 7 days (shown as two separate cards)
  useEffect(() => {
    let alive = true
    const todayStart = riyadhDayStart()
    const weekStart = new Date(todayStart.getTime() - 6 * 24 * 3600 * 1000)
    const norm = (rows) => (rows || []).map(s => ({ code: s.code, cnt: Number(s.cnt) || 0, sum: Number(s.sum) || 0 }))
    Promise.all([
      sb.rpc('invoice_period_stats', { p_start: todayStart.toISOString() }),
      sb.rpc('invoice_period_stats', { p_start: weekStart.toISOString() }),
    ]).then(([t, w]) => {
      if (!alive) return
      setSvcToday(norm(t.data?.services))
      setSvcWeek(norm(w.data?.services))
    })
    return () => { alive = false }
  }, [sb, refreshTick])

  // Paged invoice list
  useEffect(() => {
    let alive = true
    setLoading(true); setErr(null)
    let qb = sb
      .from('invoices')
      .select(INVOICE_SELECT, { count: 'exact' })
      .is('deleted_at', null)
      .order('last_activity_at', { ascending: false, nullsFirst: false })
      .range(page * PAGE, page * PAGE + PAGE - 1)

    if (branchFilter) qb = qb.eq('branch_id', branchFilter)
    if (serviceType) qb = qb.eq('service_type_id', serviceType)
    if (from) qb = qb.gte('created_at', from)
    if (to) qb = qb.lte('created_at', to + 'T23:59:59')
    if (q.trim()) qb = qb.ilike('invoice_no', `%${q.trim()}%`)
    if (payFilter === 'paid')    qb = qb.eq('remaining_amount', 0)
    if (payFilter === 'unpaid')  qb = qb.eq('paid_amount', 0).gt('total_amount', 0)
    if (payFilter === 'partial') qb = qb.gt('paid_amount', 0).gt('remaining_amount', 0)
    if (paymentPlan) qb = qb.eq('payment_plan', paymentPlan)
    if (amountMin)   qb = qb.gte('total_amount', Number(amountMin))
    if (amountMax)   qb = qb.lte('total_amount', Number(amountMax))

    qb.then(({ data, count, error }) => {
      if (!alive) return
      if (error) { setErr(error.message); setLoading(false); return }
      setRows(data || []); setTotal(count || 0); setLoading(false)
    })
    return () => { alive = false }
  }, [sb, page, branchFilter, serviceType, payFilter, from, to, q, paymentPlan, amountMin, amountMax, refreshTick])

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
      const k = businessDayKey(r.last_activity_at || r.created_at) || 'بدون'
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
            <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px', lineHeight: 1.2 }}>{T('الفواتير','Invoices')}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>{T('إدارة الفواتير وحالات السداد ومتابعة الدفعات والمدفوعات','Manage invoices, payment status, installments and payments')}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx4)', marginTop: 6, lineHeight: 1.6, opacity: .8 }}>{T('كروت الإحصاء تعرض حركة اليوم وتبدأ من الساعة 5:00 فجراً بتوقيت الرياض', 'The stat cards show today’s activity, starting at 5:00 AM Riyadh time')}</div>
          </div>
          {onNewInvoice && canPerm(user, 'invoices.create') && (
            <button onClick={onNewInvoice}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.12)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              style={{ height: 42, padding: '0 18px', borderRadius: 11, background: 'transparent', border: '1px dashed rgba(212,160,23,.5)', color: C.gold, fontFamily: F, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', flexShrink: 0, transition: 'background .15s ease, border-color .15s ease' }}>
              {T('فاتورة جديدة','New Invoice')}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          )}
        </div>
      </div>

      {initialLoading ? <InvoiceSkeleton listRows={8} /> : (<>

      {/* Stats + Services — Hero + Sidebar + Services (refined layout) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 1.5fr', gap: 14, marginBottom: 24 }}>
        {/* Hero — big primary KPI: نقدية */}
        <div style={{
          position: 'relative', padding: '18px 22px', borderRadius: 16,
          background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
          border: '1px solid rgba(255,255,255,.05)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          overflow: 'hidden', minHeight: 190,
        }}>
          <div style={{ position: 'absolute', insetInlineStart: -60, top: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${C.gold}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
          {/* Top — label with dot */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.gold, boxShadow: `0 0 10px ${C.gold}aa` }} />
            <span style={{ fontSize: 24, color: '#fff', fontWeight: 600, letterSpacing: '.2px' }}>{T('نقدًا','Cash')}</span>
          </div>
          {/* Center — big number with currency */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 7, justifyContent: 'flex-start', direction: 'ltr' }}>
            <span style={{ fontSize: 42, fontWeight: 800, color: C.gold, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{num(periodStats.cash.sum)}</span>
          </div>
          {/* Bottom — count badge */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)' }}>
            <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600 }}>{T('عدد العمليات','Receipts')}</span>
            <span style={{ fontSize: 13, color: C.gold, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(periodStats.cash.cnt)}</span>
          </div>
        </div>

        {/* Sidebar — 2 secondary KPIs stacked, balanced */}
        <div style={{
          borderRadius: 16,
          background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
          border: '1px solid rgba(255,255,255,.05)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 190,
        }}>
          {[
            { label: T('تحويلات بنكية','Bank Transfers'), val: periodStats.bank.sum, cnt: periodStats.bank.cnt, c: C.blue },
            { label: T('مرتجعة أو ملغاة','Refunded / Cancelled'), val: periodStats.voided.sum + periodStats.cancelled.sum, cnt: periodStats.voided.cnt + periodStats.cancelled.cnt, c: C.red },
          ].map((s, i) => (
            <div key={i} style={{
              position: 'relative', padding: '12px 16px', flex: 1,
              borderTop: i > 0 ? '1px solid rgba(255,255,255,.06)' : 'none',
              display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6,
              overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', insetInlineStart: -25, top: '50%', transform: 'translateY(-50%)', width: 70, height: 70, borderRadius: '50%', background: `radial-gradient(circle, ${s.c}10 0%, transparent 70%)`, pointerEvents: 'none' }} />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 5 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.c }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{s.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>({num(s.cnt)})</span>
                </div>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', direction: 'ltr' }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: s.c, fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-.5px' }}>{num(s.val)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Services card — list all main services with mini progress bars */}
        {(() => {
          // Explicitly listed services; every other service_type rolls up into one "خدمات أخرى" bucket
          // (general/خدمة عامة, تأمين طبي, خروج وعودة … — anything not named below).
          const MAIN_SVC = ['work_visa_permanent', 'work_visa_temporary', 'transfer', 'iqama_renewal', 'ajeer', 'other']
          const OTHER_BUCKET = '__other__'
          const mergeAll = (svc) => {
            const map = Object.fromEntries(svc.map(s => [s.code, s]))
            const listed = MAIN_SVC.map(code => map[code] || { code, cnt: 0, sum: 0 })
            const rest = svc.filter(s => !MAIN_SVC.includes(s.code))
            const otherCnt = rest.reduce((a, b) => a + (b.cnt || 0), 0)
            const otherSum = rest.reduce((a, b) => a + (b.sum || 0), 0)
            return [...listed, { code: OTHER_BUCKET, cnt: otherCnt, sum: otherSum }]
          }
          const themeFor = (code) => code === OTHER_BUCKET
            ? { c: C.gray, label_ar: 'خدمات أخرى', label_en: 'Other Services' }
            : (SVC_THEME[code] || SVC_THEME.general)
          const todaySvcs = mergeAll(svcToday)
          const todayTotal = todaySvcs.reduce((a, b) => a + b.cnt, 0)
          const max = Math.max(...todaySvcs.map(s => s.cnt), 1)

          return (
            <div style={{
              borderRadius: 16,
              background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
              border: '1px solid rgba(255,255,255,.05)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
              padding: '12px 16px',
              display: 'flex', flexDirection: 'column', gap: 10, minHeight: 190,
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>{T('الخدمات — اليوم','Services — Today')}</span>
                <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>
                  <span style={{ color: C.gold, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(todayTotal)}</span> {T(todayTotal >= 3 && todayTotal <= 10 ? 'خدمات' : 'خدمة','services')}
                </span>
              </div>
              {/* Single stacked bar showing all services */}
              {todayTotal > 0 && (
                <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,.04)' }}>
                  {todaySvcs.filter(s => s.cnt > 0).map(s => {
                    const theme = themeFor(s.code)
                    const pct = (s.cnt / todayTotal) * 100
                    return <div key={s.code} title={`${theme.label_ar}: ${s.cnt}`} style={{ width: pct + '%', background: theme.c }} />
                  })}
                </div>
              )}
              {/* Services labels list (2 columns, no individual bars) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px 16px' }}>
                {todaySvcs.map(s => {
                  const theme = themeFor(s.code)
                  const isZero = s.cnt === 0
                  return (
                    <div key={s.code} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 600, opacity: isZero ? 0.45 : 1 }}>
                      <span style={{ color: isZero ? 'var(--tx4)' : theme.c, fontVariantNumeric: 'tabular-nums', direction: 'ltr', minWidth: 14, textAlign: 'center', flexShrink: 0, fontWeight: 700 }}>{num(s.cnt)}</span>
                      <span style={{ color: 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{T(theme.label_ar, theme.label_en)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Filter row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', color: 'var(--tx4)' }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            placeholder={T('ابحث برقم الفاتورة…','Search by invoice no…')}
            value={q}
            onChange={e => { setQ(e.target.value); setPage(0) }}
            style={{ width: '100%', height: 44, padding: '0 14px 0 38px', borderRadius: 12, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', color: '#fff', fontSize: 13, fontFamily: F, boxSizing: 'border-box' }}
          />
        </div>
        {(() => {
          const hasFilters = !!(branchFilter || serviceType || payFilter || from || to || paymentPlan || amountMin || amountMax)
          const clearAll = () => { setBranchFilter(''); setFrom(''); setTo(''); setServiceType(''); setPayFilter(''); setPaymentPlan(''); setAmountMin(''); setAmountMax(''); setPage(0) }
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
        const fInp = { height: 42, padding: '0 14px', borderRadius: 9, border: '1px solid transparent', background: 'rgba(0,0,0,.18)', color: 'var(--tx)', fontFamily: F, fontSize: 14, fontWeight: 600, outline: 'none', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', transition: '.2s', width: '100%', boxSizing: 'border-box' }
        return (
          <div style={{ marginBottom: 22, padding: '16px 18px', background: 'var(--modal-bg)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.04)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
              <div>
                <div style={fLbl}>{T('المكتب','Branch')}</div>
                <Sel value={branchFilter} onChange={v => { setBranchFilter(v); setPage(0) }} placeholder={T('كل المكاتب','All branches')} options={[{ v: '', l: T('كل المكاتب','All branches') }, ...branches.map(b => ({ v: b.id, l: b.branch_code }))]} />
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
                <Sel value={serviceType} onChange={v => { setServiceType(v); setPage(0) }} placeholder={T('الكل','All')} options={[{ v: '', l: T('الكل','All') }, ...services.map(s => ({ v: s.id, l: isAr ? s.value_ar : (s.value_en || s.value_ar) }))]} />
              </div>
              <div>
                <div style={fLbl}>{T('حالة السداد','Pay Status')}</div>
                <Sel value={payFilter} onChange={v => { setPayFilter(v); setPage(0) }} placeholder={T('الكل','All')} options={[{ v: '', l: T('الكل','All') }, { v: 'paid', l: T('مسدّدة','Paid') }, { v: 'partial', l: T('جزئي','Partial') }, { v: 'unpaid', l: T('غير مسدّدة','Unpaid') }]} />
              </div>
              <div>
                <div style={fLbl}>{T('خطة الدفع','Payment Plan')}</div>
                <Sel value={paymentPlan} onChange={v => { setPaymentPlan(v); setPage(0) }} placeholder={T('الكل','All')} options={[{ v: '', l: T('الكل','All') }, { v: 'cash', l: T('نقد','Cash') }, { v: 'installment', l: T('دفعات','Installments') }]} />
              </div>
              <div>
                <div style={fLbl}>{T('المبلغ من','Amount Min')}</div>
                <input type="number" inputMode="decimal" value={amountMin} onChange={e => { setAmountMin(e.target.value); setPage(0) }} placeholder="0" style={{ ...fInp, textAlign: 'center', direction: 'ltr' }} />
              </div>
              <div>
                <div style={fLbl}>{T('المبلغ إلى','Amount Max')}</div>
                <input type="number" inputMode="decimal" value={amountMax} onChange={e => { setAmountMax(e.target.value); setPage(0) }} placeholder="∞" style={{ ...fInp, textAlign: 'center', direction: 'ltr' }} />
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
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: dayKey === todayStr ? C.gold : 'var(--tx2)' }}>{dayLabel(dayKey)}</span>
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
                const phone = party?.phone
                const overdueDays = pay === 'unpaid' ? Math.max(0, Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000)) : 0
                const shortDate = (() => { try { const d = new Date(r.created_at); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') } catch { return '' } })()
                const svcCode = r.service_type?.code || 'general'
                const svcIcon = SVC_ICON[baseSvcCode(svcCode)] || SVC_ICON.general
                const nat = party?.nationality
                const isVisa = VISA_SVC_CODES.has(r.service_type?.code)
                const visaApps = Array.isArray(r.service_request?.visa_applications) ? r.service_request.visa_applications : []
                const qty = isVisa ? (visaApps.length || Number(r.service_request?.quantity || 0)) : Number(r.service_request?.quantity || 0)
                const va = visaApps[0] || null
                const subLabel = va?.visa_type ? (isAr ? va.visa_type.value_ar : (va.visa_type.value_en || va.visa_type.value_ar)) : null
                const fullLabel = [isAr ? (svc.label_ar_full || svc.label_ar) : (svc.label_en_full || svc.label_en), subLabel].filter(Boolean).join(' ')
                const d = {
                  name: party?.name_ar || party?.name_en || T('— بدون عميل —', '— no client —'),
                  partyIsWorker,
                  partyId,
                  partyIdLabel: partyIsWorker ? T('رقم الإقامة', 'Iqama number') : T('رقم الهوية', 'ID number'),
                  phone, phoneDisplay: phone ? phone.replace(/^966/, '0') : '',
                  branchCode: r.branch?.branch_code || '',
                  agentName: (r.agent?.name_ar || r.agent?.name_en) ? (isAr ? (r.agent.name_ar || r.agent.name_en) : (r.agent.name_en || r.agent.name_ar)) : '',
                  flagUrl: nat?.flag_url || '', flagAlt: nat?.name_ar || '', flagEmojiChar: flagEmoji(nat?.code),
                  svc, svcIcon, fullLabel, qty, showQty: isVisa && qty > 0,
                  total, paid, remaining, pct,
                  pay, payT, cancelled, overdueDays, refundedAmt,
                  shortDate, invoiceNo: r.invoice_no,
                  reqStatusCode: r.service_request?.status?.code || null,
                }
                return <InvCard key={r.id} d={d} T={T} isAr={isAr} toast={toast} onClick={() => setDetail(r)} />
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
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,.06)', margin: '4px 4px 14px' }}>
          <style>{`
            .inv-pg-btn{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);border:none;color:${C.gold};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:.2s;font-family:${F}}
            .inv-pg-btn:hover:not(:disabled){background:${C.gold};color:#000}
            .inv-pg-btn:disabled{cursor:not-allowed;color:var(--tx4);background:rgba(255,255,255,.06)}
            .inv-pg-input{width:42px;height:32px;background:transparent;border:none;outline:none;color:${C.gold};font-family:${F};font-size:14px;font-weight:700;text-align:center;direction:ltr;-moz-appearance:textfield;font-variant-numeric:tabular-nums}
            .inv-pg-input::-webkit-outer-spin-button,.inv-pg-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
          `}</style>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 13, color: '#fff', fontWeight: 700, fontFamily: F }}><span style={{ color: C.gold }}>{fromN}–{toN}</span> {T('من','of')} {num(total)}</span>
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
  useEffect(() => { setInv(invProp) }, [invProp])
  const [data, setData] = useState({ loading: true })
  const [actionModal, setActionModal] = useState(null)
  const [workerModal, setWorkerModal] = useState(false)
  const [svcModal, setSvcModal] = useState(false)
  const [clientModal, setClientModal] = useState(false)
  const [agentModal, setAgentModal] = useState(false)
  const [noteModal, setNoteModal] = useState(false)
  const [pricingModal, setPricingModal] = useState(false)
  const [visaEditModal, setVisaEditModal] = useState(false)
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
        work_visa: `id,visa_number,visa_cost,border_number,wakalah_number,wakalah_date,wakalah_office,visa_used,visa_used_date_check,gender,file_number,
          main_facility:main_facility_id(name_ar,unified_number,gosi_number,qiwa_prefix,qiwa_number),
          nationality:nationality_id(name_ar,name_en),
          occupation:occupation_id(name_ar,name_en),
          embassy:embassy_id(name_ar,name_en),
          visa_type:visa_type_id(value_ar,value_en),
          visa_order_kind:visa_order_kind_id(value_ar,value_en),
          wakalah_status:wakalah_status_id(value_ar,value_en)`,
        transfer: `id,reference_number,total_price_initial,total_price_final,discount,office_cost,iqama_expiry_date,
          worker:worker_id(name_ar,name_en,iqama_number,phone),
          main_facility:main_facility_id(name_ar,unified_number,gosi_number,qiwa_prefix,qiwa_number),
          new_occupation:new_occupation_id(name_ar,name_en),
          status:status_id(value_ar,value_en),
          worker_status:worker_status_id(value_ar,value_en)`,
        ajeer: `id,duration_months,start_date,end_date,
          worker:worker_id(name_ar,name_en,iqama_number),
          ajeer_facility:ajeer_facility_id(name_ar,unified_number,gosi_number,qiwa_prefix,qiwa_number),
          main_facility:main_facility_id(name_ar,unified_number,gosi_number,qiwa_prefix,qiwa_number),
          ajeer_city:ajeer_city_id(name_ar,name_en)`,
        iqama_renewal: `id,duration_months,current_expire_date,new_expire_date,
          worker:worker_id(name_ar,name_en,iqama_number),
          worker_facility:worker_facility_id(name_ar,unified_number)`,
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
          worker:worker_id(id,name_ar,name_en,iqama_number),
          worker_facility:worker_facility_id(name_ar,unified_number)`,
      }
      const TABLES = { work_visa: 'visa_applications', transfer: 'transfer_applications', ajeer: 'ajeer_applications', iqama_renewal: 'iqama_renewal_applications', iqama_issuance: 'iqama_issuance_applications', other: 'other_applications' }
      // Every service without a dedicated table (general, medical_insurance, exit_reentry_visa, the registry
      // tabs…) stores its detail row in other_applications, so unknown codes fall back to it.
      const tbl = TABLES[baseSvcCode(code)] || 'other_applications'
      const sel = SELECTS[baseSvcCode(code)] || SELECTS.other

      const isTransfer = baseSvcCode(code) === 'transfer'
      const branchId = inv.branch?.id
      const [insts, pays, det, quote, banks] = await Promise.all([
        sb.from('installments').select('id,installment_order,total_amount,paid_amount,expected_date,paid_date,receipt_no,bank_reference,notes,visa_application_id,visa_application:visa_application_id(border_number,file_number),payment_method:payment_method_id(value_ar,value_en),payment_milestone:payment_milestone_id(value_ar,value_en)').eq('invoice_id', inv.id).is('deleted_at', null).order('installment_order'),
        sb.from('payments').select('id,amount,payment_date,is_valid,receipt_no,bank_reference,notes,payment_method:payment_method_id(value_ar,value_en,code),installment_id,creator:created_by(person:person_id(name_ar,name_en))').eq('invoice_id', inv.id).is('deleted_at', null).order('payment_date', { ascending: false }),
        (tbl && srId) ? sb.from(tbl).select(sel).eq('service_request_id', srId) : Promise.resolve({ data: [] }),
        // Transfer invoices link back to their pricing quote via transfer_calculation.invoice_id.
        isTransfer ? sb.from('transfer_calculation').select('quote_no').eq('invoice_id', inv.id).is('deleted_at', null).maybeSingle() : Promise.resolve({ data: null }),
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
      if (alive) setData({ loading: false, insts: insts.data || [], pays: paysWithReceipts, det: det.data || [], code, quote: quote?.data?.quote_no || null, officeAccounts, passports: passportByVisa })
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

  return (
    <div style={{ fontFamily: F, paddingTop: 0, paddingBottom: 80, color: 'var(--tx2)' }}>
      {/* Top bar: back */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <BackButton onBack={onBack} label={T('رجوع','Back')} />
      </div>

      {/* Header — underlined title + tags */}
      <div style={{ marginBottom: 18, marginTop: 6 }}>
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
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap', fontSize: 13, color: 'var(--tx3)' }}>
          {(() => {
            const isVisa = VISA_SVC_CODES.has(inv.service_type?.code)
            const visaApps = Array.isArray(inv.service_request?.visa_applications) ? inv.service_request.visa_applications : []
            const va = visaApps[0] || null
            const sub = va?.visa_type ? (isAr ? va.visa_type.value_ar : (va.visa_type.value_en || va.visa_type.value_ar)) : null
            const qty = isVisa ? ((data?.det || []).length || visaApps.length || Number(inv.service_request?.quantity || 0)) : Number(inv.service_request?.quantity || 0)
            const full = [isAr ? (svc.label_ar_full || svc.label_ar) : (svc.label_en_full || svc.label_en), sub].filter(Boolean).join(' ')
            const showQty = isVisa && qty > 0
            return (
              <span style={{ color: svc.c, fontSize: 14, fontWeight: 800, display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
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
                <div style={{ fontSize: 14, fontWeight: 800, color: C.red, letterSpacing: '.2px' }}>{T('هذه الفاتورة ملغاة','This invoice is cancelled')}</div>
                {reason && (
                  <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.7, marginTop: 5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    <span style={{ color: C.red, fontWeight: 700 }}>{T('السبب','Reason')}: </span>{reason}
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

      <InvoiceDetailLayout inv={inv} data={data} isAr={isAr} T={T} svc={svc} payT={payT} total={total} paid={paid} remaining={remaining} pct={pct} onRecordPayment={onRecordPayment} onRefund={onRefund} onCancelInv={onCancelInv} onPrint={onPrint} onEditWorker={cancelledRO ? undefined : () => setWorkerModal(true)} onEditService={cancelledRO ? undefined : () => setSvcModal(true)} onEditVisa={cancelledRO ? undefined : () => setVisaEditModal(true)} onEditClient={cancelledRO ? undefined : () => setClientModal(true)} onEditAgent={cancelledRO ? undefined : () => setAgentModal(true)} onEditNote={cancelledRO ? undefined : () => setNoteModal(true)} onEditPricing={cancelledRO ? undefined : () => setPricingModal(true)} onEditPayment={cancelledRO || !canPerm(user, 'invoices.record_payment') ? undefined : setPayEdit} canPayPerm={canPerm(user, 'invoices.record_payment')} canRefundPerm={canPerm(user, 'invoices.refund') && !gmLock} canCancelPerm={canPerm(user, 'invoices.cancel') && !gmLock} gmLock={gmLock} onOpenService={onOpenService} />

      {actionModal && <ActionModal type={actionModal} onClose={() => setActionModal(null)} sb={sb} T={T} isAr={isAr} inv={inv} total={total} paid={paid} remaining={remaining} toast={toast} user={user} onSaved={() => setRefreshTick(t => t + 1)} visaDet={data?.det || []} svcCode={data?.code} insts={data?.insts || []} />}

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
        <ServiceEditModal sb={sb} toast={toast} T={T} isAr={isAr}
          srId={inv.service_request?.id}
          invId={inv.id}
          svcName={isAr ? (svc.label_ar_full || svc.label_ar) : (svc.label_en_full || svc.label_en)}
          currentDescription={data?.det?.[0]?.description || ''}
          currentBranchId={inv.branch?.id || null}
          editorId={user?.id || null}
          editorName={user?.person?.name_ar || user?.person?.name_en || null}
          onClose={() => setSvcModal(false)}
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
        return (
          <ClientEditModal sb={sb} toast={toast} T={T}
            client={sr?.client || null}
            workerIsClient={workerIsClient}
            editorId={user?.id || null}
            editorName={user?.person?.name_ar || user?.person?.name_en || null}
            invId={inv.id}
            onClose={() => setClientModal(false)}
            onSaved={reloadInvoiceFull} />
        )
      })()}

      {agentModal && (
        <AgentEditModal sb={sb} toast={toast} T={T}
          agent={inv.agent || inv.service_request?.service_request_agents?.[0]?.agent || null}
          editorId={user?.id || null}
          editorName={user?.person?.name_ar || user?.person?.name_en || null}
          invId={inv.id}
          onClose={() => setAgentModal(false)}
          onSaved={reloadInvoiceFull} />
      )}

      {noteModal && (
        <NoteEditModal sb={sb} toast={toast} T={T} inv={inv}
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

      {payEdit && (
        <PaymentEditModal sb={sb} toast={toast} T={T} isAr={isAr} inv={inv} payment={payEdit} user={user}
          onClose={() => setPayEdit(null)}
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
    <span style={{ fontSize: 14, fontWeight: 600, color: sel ? accent : 'rgba(255,255,255,.92)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Landmark size={13} strokeWidth={2} style={{ flexShrink: 0, opacity: .85 }} />
      {a.bank_name || '—'}
      {a.is_primary && <span style={{ fontSize: 9.5, fontWeight: 700, color: C.gold, background: 'rgba(212,160,23,.12)', border: '1px solid rgba(212,160,23,.3)', borderRadius: 5, padding: '1px 6px' }}>{T('رئيسي', 'Primary')}</span>}
    </span>
    {a.account_name && <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.62)' }}>{a.account_name}</span>}
    {a.iban && <span style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', direction: 'ltr', fontFamily: 'ui-monospace, monospace', letterSpacing: '.4px' }}>{a.iban}</span>}
    {a.account_number && <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,.42)' }}>{T('رقم الحساب', 'Acct No')}: {a.account_number}</span>}
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
  iqamaPassport, setIqamaPassport, showIqamaPassport = false,
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
          {showIqamaPassport && (
            <FileField full req label={T('صورة جواز العامل', 'Worker Passport')}
              hint={T('تُحفظ وتظهر في «إصدار الإقامة» ببطاقة المعاملة', 'Saved and shown in the residence card')}
              value={iqamaPassport} onChange={setIqamaPassport} />
          )}
          <TextArea full label={T('ملاحظة', 'Note')} hint={T('اختياري', 'optional')} rows={2}
            value={notes} onChange={setNotes} placeholder={T('ملاحظة خاصة بهذه الدفعة…', 'A note for this payment…')} />
        </div>
      </ModalSection>
    )
  }

  // خطوة الملاحظة المستقلّة — في الدفع النقدي تُعرض الملاحظة في خطوة منفصلة (الحوالة تجمع الإيصال + الملاحظة معاً).
  if (part === 'note') {
    return (
      <ModalSection Icon={FileText} label={showIqamaPassport ? T('المستندات والملاحظة', 'Documents & Note') : T('ملاحظة', 'Note')}>
        <div style={GRID}>
          {showIqamaPassport && (
            <FileField full req label={T('صورة جواز العامل', 'Worker Passport')}
              hint={T('تُحفظ وتظهر في «إصدار الإقامة» ببطاقة المعاملة', 'Saved and shown in the residence card')}
              value={iqamaPassport} onChange={setIqamaPassport} />
          )}
          <TextArea full label={T('ملاحظة', 'Note')} hint={T('اختياري', 'optional')} rows={4}
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
        {paymentMethod === 'bank' && (
          <FKSelect req full label={T('الحساب البنكي المستلم', 'Receiving Account')}
            placeholder={T('اختر الحساب…', 'Choose account…')}
            value={selBankAccId} onChange={setSelBankAccId}
            options={bankAccounts || []}
            getKey={a => a.id}
            getLabel={bankAcctLabel} getSub={bankAcctSearch}
            renderCell={renderBankAcctCell(color, T)} />
        )}
        {/* الحوالة: «إيصال الحوالة» يظهر في نفس خطوة المبلغ/الحساب (الخطوة 3) بدل خطوة منفصلة. */}
        {part === 'details' && (
          <FileField full req multiple compact label={T('إيصال الحوالة', 'Transfer Receipt')}
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
    <div style={{ fontSize: 11.5, color: 'var(--tx4)', fontWeight: 600, marginBottom: 10 }}>
      {T('هذه الفاتورة تحتوي على أكثر من دفعة — اختر الدفعة المراد سدادها.', 'This invoice has multiple installments — choose which one to pay.')}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {insts.map(ins => {
        const m = deriveInstMeta(ins, T, isAr)
        const insRemaining = Math.max(0, m.insTotal - m.insPaid)
        const active = selectedId === ins.id
        const locked = !!(lockedIds && lockedIds.has && lockedIds.has(ins.id))
        const label = m.milestone || (insts.length === 1 ? T('دفعة واحدة', 'Single payment') : instOrdinalLabel(ins.installment_order, isAr))
        return (
          <button key={ins.id} type="button" disabled={locked} onClick={() => { if (!locked) onSelect(ins.id) }}
            title={locked ? T('تُفتح بعد سداد الدفعة السابقة بالكامل', 'Unlocks once the previous installment is fully paid') : undefined}
            style={{ textAlign: 'start', cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? .55 : 1, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: active ? color + '14' : 'rgba(255,255,255,.03)', border: '1.5px solid ' + (active ? color : 'rgba(255,255,255,.08)'), transition: '.15s', fontFamily: F }}>
            <span style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: active ? color : 'rgba(255,255,255,.06)', color: active ? '#10240f' : 'var(--tx3)', border: active ? 'none' : '1px solid rgba(255,255,255,.12)' }}>
              {locked
                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                : ins.installment_order}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: active ? color : 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
              {ins.visa_application && (
                <div style={{ fontSize: 9.5, color: C.gold, fontWeight: 600, marginTop: 2 }}>
                  {ins.visa_application.border_number
                    ? <>{T('رقم الحدود','Border No.')} · <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{ins.visa_application.border_number}</span></>
                    : T('تأشيرة','Visa')}
                </div>
              )}
              <div style={{ fontSize: 10.5, color: locked ? 'rgba(255,255,255,.4)' : m.stateC, fontWeight: 600, marginTop: 2 }}>
                {locked ? T('مقفلة — تُفتح بعد سداد الدفعة السابقة', 'Locked — unlocks after the previous installment') : m.stateLabel}
              </div>
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
    <TextArea full req label={T('السبب', 'Reason')} rows={4}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '13px 14px', borderRadius: 10, background: 'rgba(0,0,0,.22)', border: '1px solid rgba(255,255,255,.06)' }}>
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
          <div style={{ background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 9, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
            <div key={it.id} style={{ background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
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
    <div style={{ fontSize: 12.5, color: FKC.red, padding: '10px 14px', borderRadius: 10, background: `${FKC.red}14`, border: `1px solid ${FKC.red}33`, display: 'flex', alignItems: 'flex-start', gap: 8, fontWeight: 600, lineHeight: 1.8, fontFamily: F }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>{T('تنبيه: الإلغاء يعيد جميع الدفعات والمدفوعات ولا يمكن التراجع.', 'Warning: Cancelling resets all installments and payments. Cannot be undone.')}</span>
    </div>
    <ModalSection Icon={Ban} label={T('سبب الإلغاء', 'Cancellation Reason')}>
      <TextArea req full label={T('السبب', 'Reason')} rows={4} value={reason} onChange={setReason}
        placeholder={T('اذكر سبب الإلغاء...', 'Explain why...')} />
    </ModalSection>
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

const ActionModal = ({ type, onClose, sb, T, isAr, inv, total, paid, remaining, toast, user, onSaved, visaDet = [], svcCode, insts = [] }) => {
  const [submitting, setSubmitting] = useState(false)
  // When a write succeeds, the modal transforms into an in-place success screen
  // (mirrors the invoice-issuance success view) instead of toasting + closing.
  const [done, setDone] = useState(null)
  // Validation/failure messages surface in the modal's red footer bar (on the
  // submit page) instead of a toast — cleared at submit start and on close.
  const [actErr, setActErr] = useState(null)

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
  // صورة جواز العامل لدفعة «إصدار الإقامة» — تُرفع مع الدفعة وتُربط بتأشيرة الدفعة (visa_application_id).
  const [iqamaPassportFile, setIqamaPassportFile] = useState(null)
  // Installment targeting — when an invoice has more than one still-payable
  // installment, the user must pick which one to pay before entering an amount.
  const [selectedInstId, setSelectedInstId] = useState('')
  const payableInsts = (insts || [])
    .filter(i => (Number(i.total_amount) - Number(i.paid_amount)) > 0.005)
    .slice().sort((a, b) => (a.installment_order || 0) - (b.installment_order || 0))
  const needsInstPick = type === 'payment' && payableInsts.length > 1
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
  // Show the border-number step only for the iqama-issuance tranche. If the invoice has no
  // installment schedule at all, fall back to the legacy always-on behavior for work visas.
  const showIqamaLink = type === 'payment' && linkCandidates.length > 0 &&
    ((insts || []).length === 0 ? true : isIqamaInst(effectiveInst))
  // دفعة إصدار الإقامة المرتبطة بتأشيرة (الدفعة نفسها تحمل visa_application_id): نطلب صورة جواز العامل
  // هنا في خطوة الدفع — تُحفظ وتظهر في «إصدار الإقامة» ببطاقة المعاملة. نتجنّب التكرار حين تظهر خطوة رقم الحدود.
  const iqamaVisaId = effectiveInst?.visa_application_id || null
  const showIqamaPassport = type === 'payment' && isWorkVisa && isIqamaInst(effectiveInst) && !!iqamaVisaId && !showIqamaLink
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

        // دفعة إصدار الإقامة بلا خطوة رقم الحدود: ارفع صورة جواز العامل واربطها بتأشيرة الدفعة كي تظهر
        // في «إصدار الإقامة» ببطاقة المعاملة. الرفع أفضل-جهد — لا يمنع حفظ الدفعة.
        if (!linkVisaId && iqamaPassportFile && iqamaVisaId) {
          try {
            const f = iqamaPassportFile
            const safe = (f.name || 'passport').replace(/[^\w.\-]+/g, '_')
            const path = `visa-applications/${iqamaVisaId}/passport/${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${safe}`
            const { error: upErr } = await sb.storage.from('attachments').upload(path, f, { cacheControl: '3600', upsert: false })
            if (!upErr) {
              const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
              await sb.from('attachments').insert({
                entity_type: 'visa_application', entity_id: iqamaVisaId,
                file_name: f.name, file_url: pub?.publicUrl || path, storage_path: path,
                mime_type: f.type || null, size_bytes: f.size || null,
                notes: 'passport', uploaded_by: user?.id || null,
              })
            }
          } catch { /* رفع الجواز أفضل-جهد */ }
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
        // عند إلغاء الفاتورة تُلغى المعاملة المرتبطة أيضًا (حالة الطلب → «ملغي») —
        // إلا إذا كانت المعاملة «منجز» فتبقى كما هي (لا نُرجِع معاملةً مُنجزة إلى ملغاة).
        // أفضل جهد: إن تعذّر التحديث لا نتراجع عن إلغاء الفاتورة، بل ننبّه فقط.
        const srId = inv.service_request?.id
        const srDone = inv.service_request?.status?.code === 'done'
        let reqCancelled = false
        if (srId && !srDone) {
          try {
            const { data: rst } = await sb.from('lookup_items')
              .select('id,category:lookup_categories!inner(category_key)')
              .eq('category.category_key', 'request_status').eq('code', 'cancelled').maybeSingle()
            const rcid = rst?.id || null
            if (rcid) {
              const { data: srUpd } = await sb.from('service_requests')
                .update({ status_id: rcid, cancelled_at: nowIso, cancelled_reason: (cancelReason || '').trim() || null, updated_at: nowIso })
                .eq('id', srId).select('id')
              if (srUpd && srUpd.length) reqCancelled = true
              else toast?.(T('أُلغيت الفاتورة، لكن تعذّر تحديث حالة المعاملة', 'Invoice cancelled, but the transaction status could not be updated'), 'error')
            }
          } catch { toast?.(T('أُلغيت الفاتورة، لكن تعذّر تحديث حالة المعاملة', 'Invoice cancelled, but the transaction status could not be updated'), 'error') }
        }
        successInfo = {
          title: T('تم إلغاء الفاتورة بنجاح', 'Invoice cancelled'),
          desc: reqCancelled
            ? T('تم تغيير حالة الفاتورة إلى ملغاة، وحالة المعاملة إلى ملغي.', 'The invoice status changed to cancelled, and the transaction to cancelled.')
            : srDone
              ? T('تم تغيير حالة الفاتورة إلى ملغاة. المعاملة منجزة وتبقى كما هي.', 'The invoice was cancelled. The transaction is completed and stays unchanged.')
              : T('تم تغيير حالة الفاتورة إلى ملغاة.', 'The invoice status was changed to cancelled.'),
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
    iqamaPassport: iqamaPassportFile, setIqamaPassport: setIqamaPassportFile, showIqamaPassport,
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
        // رقم الحدود — تظهر فقط حين تكون الدفعة المختارة هي «إصدار الإقامة»: يجب أولاً
        // تحديد أي تأشيرة (برقم الحدود) قبل الدفع — تتحول تلك التأشيرة لمعاملة إقامة مستقلة.
        ...(showIqamaLink ? [{
          title: T('رقم الحدود','Border Number'),
          valid: !!linkVisaId && !!passportFile,
          content: (
            <ModalSection Icon={FileText} label={T('تحديد التأشيرة (رقم الحدود) لدفعة إصدار الإقامة','Pick the visa (border number) for the iqama-issuance installment')}>
              <div style={GRID}>
                <FKSelect full req label={T('رقم الحدود','Border number')}
                  hint={T('إلزامي: حدّد أي تأشيرة تخص دفعة إصدار الإقامة — تتحول لمعاملة مستقلة في الفحص الطبي بعد حفظ الدفعة','Required: pick which visa this iqama-issuance payment settles — it becomes its own medical-exam transaction once saved')}
                  placeholder={T('اختر رقم الحدود…','Choose a border number…')}
                  value={linkVisaId} onChange={setLinkVisaId}
                  options={linkCandidates}
                  getKey={v => v.id}
                  getLabel={v => `#${v.border_number} — ${isAr ? (v.nationality?.name_ar || '') : (v.nationality?.name_en || v.nationality?.name_ar || '')}`}
                  getSub={v => [v.visa_number ? `${T('تأشيرة','Visa')} ${v.visa_number}` : null, isAr ? v.occupation?.name_ar : v.occupation?.name_en].filter(Boolean).join(' · ')} />
                {linkVisaId && (
                  <FileField full label={T('صورة الجواز','Passport copy')} req
                    value={passportFile} onChange={setPassportFile} />
                )}
              </div>
            </ModalSection>
          ),
        }] : []),
        // خطوة تفاصيل الدفع (المبلغ + الطريقة + الحساب + الإيصال للحوالة + صورة الجواز) ثم خطوة الملاحظة
        // المستقلّة — للحالتين. هكذا «إيصال الحوالة» في خطوة الدفع (الخطوة 3) والملاحظة في الأخيرة (الخطوة 4).
        ...(paymentMethod === 'bank'
          ? [
              { valid: Number(paidAmount) > 0 && !!paySelBankAccId && payTransferReceipt.length > 0, content: (
                <PaymentDetailsForm part="details" {...payFormProps} />
              ) },
              { valid: (!showIqamaPassport || !!iqamaPassportFile), content: (
                <PaymentDetailsForm part="note" {...payFormProps} />
              ) },
            ]
          : [
              { valid: Number(paidAmount) > 0, content: (
                <PaymentDetailsForm part="all" {...payFormProps} />
              ) },
              { valid: (!showIqamaPassport || !!iqamaPassportFile), content: (
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
              { title: T('تفاصيل الاسترجاع','Refund Details'),
                valid: Number(refundAmount) > 0 && (refundMethod !== 'bank' || (refundTransferReceipt?.length || 0) > 0),
                content: <RefundDetailsForm {...refundFormProps} /> },
              { title: T('سبب الاسترجاع','Refund Reason'), valid: (refundNotes || '').trim().length > 0, content: (
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
      onSubmit={onSubmit} submitting={submitting} submitLabel={meta.submit}
      nextLabel={T('التالي','Next')} backLabel={T('السابق','Previous')}
      pages={pages}
    />
  )
}

/* ─── shared building blocks ─── */
const cardChrome = { background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, overflow: 'hidden' }
const cardHeader = { padding: '14px 22px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 10 }
const cardTitle  = { fontSize: 16, fontWeight: 600, color: C.gold, letterSpacing: '.2px' }
const cardSub    = { fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }

const ActionToolbar = ({ T, onRecordPayment, onRefund, onCancelInv, onPrint }) => {
  const btn = (color, bgLight, bdLight) => ({
    height: 40, padding: '0 16px', borderRadius: 11, background: bgLight, border: '1px solid ' + bdLight, color, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: F, fontSize: 13, fontWeight: 700, transition: '.18s', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.04)'
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

const ClientRows = ({ inv, T }) => {
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
    { label: isWorker ? T('الإقامة','Iqama') : T('الهوية','ID'), value: idValue, mono: true },
    { label: T('الجوال','Phone'), value: fmtPhone(c?.phone), mono: true },
  ].filter(f => f.value)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {primary && (
        <div style={{ background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
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
          {secondary && <div style={{ fontSize: 11, color: 'var(--tx4)', fontFamily: 'monospace', fontWeight: 500, direction: 'ltr' }}>{secondary}</div>}
        </div>
      )}
      {cells.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, cells.length))},1fr)`, gap: 8 }}>
          {cells.map((f, i) => (
            <div key={i} style={{ background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
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
const EntityHero = ({ icon, primary, secondary, latin, cells }) => (
  <div style={{ position: 'relative', border: '1px solid rgba(212,160,23,.4)', background: 'linear-gradient(135deg,rgba(212,160,23,.12),rgba(255,255,255,.02))', boxShadow: '0 4px 16px rgba(0,0,0,.28)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(212,160,23,.1)', border: '1.5px solid rgba(212,160,23,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, direction: 'ltr' }}>
          <CopyBtn text={primary} />
          <span style={{ minWidth: 0, fontSize: 15.5, fontWeight: 600, color: C.gold, letterSpacing: '-.2px', direction: latin ? 'ltr' : 'rtl', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{primary}</span>
        </span>
        {secondary && <span style={{ fontSize: 11, color: 'var(--tx5)', fontWeight: 600, direction: 'ltr', textAlign: 'right', opacity: .7 }}>{secondary}</span>}
      </div>
    </div>
    {cells.length > 0 && (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, cells.length))},1fr)`, gap: 8 }}>
        {cells.map((c, i) => (
          <div key={i} style={{ background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
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
const WorkerRows = ({ worker, facility, T }) => {
  const w = worker
  if (!w) return null
  const wPrimary = w.name_ar || w.name_en
  const wSecondary = w.name_ar && w.name_en && w.name_en !== w.name_ar ? w.name_en : null
  const isLatinName = /[A-Za-z]/.test(wPrimary || '')
  const wCells = [
    { label: T('الإقامة','Iqama'), value: w.iqama_number },
    { label: T('الجوال','Phone'), value: fmtPhone(w.phone) },
  ].filter(f => f.value)
  const f = facility
  const fPrimary = f?.name_ar || f?.name_en
  const fSecondary = f?.name_ar && f?.name_en && f?.name_en !== f?.name_ar ? f.name_en : null
  // Facility numbers always render all three labels — empty ones show a "—" placeholder instead of hiding.
  const fCells = f ? [
    { label: T('الرقم الموحد','Unified No'), value: f.unified_number },
    { label: T('رقم الموارد البشرية','HRSD No'), value: f.hrsd_number },
    { label: T('رقم التأمينات','GOSI No'), value: f.gosi_number },
  ] : []
  // Worker badge shows his nationality flag (falls back to a generic person icon when missing).
  const wNat = w.nationality
  const wIcon = wNat?.flag_url
    ? <img src={wNat.flag_url} alt={wNat.name_ar || ''} title={wNat.name_ar || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 11, flexShrink: 0 }} />
    : (flagEmoji(wNat?.code) ? <span title={wNat?.name_ar || ''} style={{ fontSize: 30, lineHeight: 1 }}>{flagEmoji(wNat?.code)}</span> : <User size={24} color={C.gold} strokeWidth={1.8} />)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <EntityHero icon={wIcon} primary={wPrimary} secondary={wSecondary} latin={isLatinName} cells={wCells} />
      {f && (fPrimary || fCells.some(c => c.value)) && (
        <EntityHero icon={<Building2 size={24} color={C.gold} strokeWidth={1.8} />} primary={fPrimary} secondary={fSecondary} latin={false} cells={fCells} />
      )}
    </div>
  )
}

// Broker/agent rows — mirrors ClientRows so the agent renders in its own card identical to the client card.
const BrokerRows = ({ agent, T }) => {
  const a = agent
  if (!a) return null
  const primary = a.name_ar || a.name_en
  const secondary = a.name_ar && a.name_en ? a.name_en : null
  const isLatinName = /[A-Za-z]/.test(primary || '')
  // Boxed cells — identical to the client card (name on top, then ID + phone in inset cells).
  const cells = [
    { label: T('الهوية','ID'), value: a.id_number, mono: true },
    { label: T('الجوال','Phone'), value: fmtPhone(a.phone), mono: true },
  ].filter(f => f.value)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {primary && (
        <div style={{ background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{T('الاسم','Name')}</span>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, direction: 'ltr' }}>
            <CopyBtn text={primary} />
            <span style={{ fontSize: 14, color: 'var(--tx1)', fontWeight: 600, lineHeight: 1.4, direction: isLatinName ? 'ltr' : 'rtl' }}>{primary}</span>
          </span>
          {secondary && <div style={{ fontSize: 11, color: 'var(--tx4)', fontFamily: 'monospace', fontWeight: 500, direction: 'ltr' }}>{secondary}</div>}
        </div>
      )}
      {cells.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, cells.length))},1fr)`, gap: 8 }}>
          {cells.map((f, i) => (
            <div key={i} style={{ background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
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
const VisaInfoRows = ({ inv, isAr, T, svc, data }) => {
  const det = data?.det || []
  const qty = det.length || Number(inv.service_request?.quantity || 0)
  const natOf = r => (isAr ? r.nationality?.name_ar : (r.nationality?.name_en || r.nationality?.name_ar)) || '—'
  const occOf = r => (isAr ? r.occupation?.name_ar : (r.occupation?.name_en || r.occupation?.name_ar)) || ''
  const embOf = r => (isAr ? r.embassy?.name_ar : (r.embassy?.name_en || r.embassy?.name_ar)) || ''
  const genOf = r => r.gender === 'female' ? T('أنثى', 'Female') : r.gender === 'male' ? T('ذكر', 'Male') : ''
  const single = det.length === 1 ? det[0] : null
  return (
    <>
      <Row label={T('نوع الخدمة','Service')} value={isAr ? (svc.label_ar_full || svc.label_ar) : (svc.label_en_full || svc.label_en)} color={svc.c} />
      {qty > 0 && <Row label={T('الكمية','Quantity')} value={'×' + qty} mono />}
      {data?.loading && (
        <div style={{ fontSize: 11, color: 'var(--tx4)', textAlign: 'center', padding: '10px 0' }}>{T('جاري تحميل التفاصيل…','Loading details…')}</div>
      )}
      {!data?.loading && det.length > 0 && (
        <>
          <SectionLabel label={single ? (single.file_number != null ? T('بيانات التأشيرات وتوزيع الملفات','Visa Details & File Distribution') : T('بيانات التأشيرة','Visa Info')) : T('بيانات التأشيرات','Visa Details')} color={single?.file_number != null ? C.cyan : svc.c} />
          {single ? (
            single.file_number != null ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0 2px' }}>
                  <span style={{ fontSize: 11.5, color: C.cyan, fontWeight: 700 }}>{T('ملف واحد','One File')}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, direction: 'rtl' }}>1 {T('تأشيرة','visa')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                  <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 6, background: svc.c + '1a', border: '1px solid ' + svc.c + '40', color: svc.c, fontSize: 10.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontVariantNumeric: 'tabular-nums' }}>1</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 700 }}>{natOf(single)}</div>
                    {(() => { const sub = [embOf(single), occOf(single), genOf(single)].filter(Boolean).join(' · '); return sub ? <div style={{ fontSize: 11.5, color: 'var(--tx3)', fontWeight: 600, marginTop: 2 }}>{sub}</div> : null })()}
                  </div>
                </div>
              </>
            ) : (
              <>
                <Row label={T('الجنسية','Nationality')} value={natOf(single)} />
                <Row label={T('السفارة','Embassy')} value={embOf(single)} />
                <Row label={T('المهنة','Occupation')} value={occOf(single)} />
                {genOf(single) && <Row label={T('الجنس','Gender')} value={genOf(single)} />}
              </>
            )
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0 2px' }}>
                      <span style={{ fontSize: 11.5, color: C.cyan, fontWeight: 700 }}>{fileLabel(idx)}</span>
                      <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, direction: 'rtl' }}>{items.length} {visaWord(items.length, T)}</span>
                    </div>
                  )}
                  {items.map((r, i) => {
                    n++
                    const sub = [embOf(r), occOf(r), genOf(r)].filter(Boolean).join(' · ')
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                        <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 6, background: svc.c + '1a', border: '1px solid ' + svc.c + '40', color: svc.c, fontSize: 10.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontVariantNumeric: 'tabular-nums' }}>{n}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 700 }}>{natOf(r)}</div>
                          {sub && <div style={{ fontSize: 11.5, color: 'var(--tx3)', fontWeight: 600, marginTop: 2 }}>{sub}</div>}
                        </div>
                      </div>
                    )
                  })}
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
    <div style={{ background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
      <span style={{ flex: 1, fontSize: 11.5, color: 'var(--tx3)', fontWeight: 700 }}>
        {T('صورة جواز العامل', 'Worker Passport')}
        {borderNo ? <span style={{ color: 'var(--tx4)', fontWeight: 600 }}> · {T('رقم الحدود', 'Border')} <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{borderNo}</span></span> : ''}
      </span>
      {isImg && <a href={url} target="_blank" rel="noreferrer" style={{ flexShrink: 0, lineHeight: 0 }}><img src={url} alt="" style={{ width: 42, height: 30, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(255,255,255,.1)' }} /></a>}
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

const TransactionRows = ({ inv, isAr, T, svc, payT, data }) => {
  const code = data?.code || inv.service_type?.code
  const d = data?.det?.[0]
  const date = (v) => v ? fmtGreg(v, isAr) : null
  const isTransfer = code === 'transfer'
  const svcName = isAr ? (svc.label_ar_full || svc.label_ar) : (svc.label_en_full || svc.label_en)

  // Service-specific extras (dates/durations only) — worker + facility now live in the
  // dedicated "العامل ومنشأته" card, so they're not repeated here.
  const extraCells = []
  if (!isTransfer && d && code === 'ajeer') {
    if (d.ajeer_facility) extraCells.push({ label: T('منشأة الأجير','Ajeer Facility'), value: d.ajeer_facility?.name_ar || d.ajeer_facility?.unified_number })
    if (d.ajeer_city) extraCells.push({ label: T('المدينة','City'), value: isAr ? d.ajeer_city?.name_ar : (d.ajeer_city?.name_en || d.ajeer_city?.name_ar) })
    if (d.duration_months) extraCells.push({ label: T('المدة','Duration'), value: d.duration_months + ' ' + T('شهر','months') })
    if (d.start_date) extraCells.push({ label: T('تاريخ البدء','Start Date'), value: date(d.start_date), mono: true })
    if (d.end_date) extraCells.push({ label: T('تاريخ الانتهاء','End Date'), value: date(d.end_date), mono: true })
  }
  if (!isTransfer && d && code === 'iqama_renewal') {
    if (d.duration_months) extraCells.push({ label: T('مدة التجديد','Renewal Duration'), value: d.duration_months + ' ' + T('شهر','months') })
    if (d.current_expire_date) extraCells.push({ label: T('الانتهاء الحالي','Current Expiry'), value: date(d.current_expire_date), mono: true })
    if (d.new_expire_date) extraCells.push({ label: T('الانتهاء الجديد','New Expiry'), value: date(d.new_expire_date), mono: true })
  }

  const boxStyle = { background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Boxed service name, with the typed description shown as a sub-line
          below so the service detail isn't lost. */}
      <div style={boxStyle}>
        <span style={{ fontSize: 14, color: C.gold, fontWeight: 600, lineHeight: 1.4 }}>{svcName}</span>
        {d?.description && d.description !== svcName && (
          <span style={{ fontSize: 12.5, color: '#fff', fontWeight: 600, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', direction: 'rtl', marginTop: 4 }}>{d.description}</span>
        )}
      </div>

      {/* Transfer invoices link to their pricing quote (تسعيرة التنازل) */}
      {isTransfer && data?.quote && <QuoteLink quote={data.quote} T={T} />}

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
                <span style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 600, wordBreak: 'break-word', direction: c.mono ? 'ltr' : 'rtl', ...(c.mono ? { fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' } : {}) }}>{c.value}</span>
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
const remColor = (r) => r > 0 ? C.red : r < 0 ? C.ok : '#fff'

const FinPill = ({ color, label, value, unit }) => {
  // بطاقة داكنة مع شريط لون عمودي على جهة البداية والرقم ملوّن
  return (
    <div style={{ position: 'relative', padding: '12px 14px', borderRadius: 12, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', overflow: 'hidden' }}>
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

const FinancialSummaryCard = ({ inv, data, isAr, T, total, paid, remaining, pct, payT }) => {
  const person = inv.creator?.person
  const full = (isAr ? (person?.name_ar || person?.name_en) : (person?.name_en || person?.name_ar)) || ''
  const twoNames = full.trim().split(/\s+/).filter(Boolean).slice(0, 2).join(' ')
  const nInst = data.insts?.length || 0
  const nPays = data.pays?.length || 0
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
        <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 6, marginTop: 2 }}>
          <span style={{ fontSize: 32, fontWeight: 900, color: '#000', direction: 'ltr', fontVariantNumeric: 'tabular-nums', letterSpacing: '-1px' }}>{num(total)}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#000' }}>{SAR(T)}</span>
        </div>
      </div>
      {/* بطاقتا المسدّد والمتبقي */}
      <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <FinPill color={C.ok} label={T('المدفوع', 'Paid')} value={num(paid)} unit={SAR(T)} />
        <FinPill color={remColor(remaining)} label={T('المتبقي', 'Remaining')} value={num(remaining)} unit={SAR(T)} />
      </div>
      {/* نسبة السداد */}
      <div style={{ padding: '0 18px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, color: 'var(--tx3)' }}>
          <span>{T('نسبة السداد', 'Paid')}</span>
          <span style={{ color: payT.c, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,.04)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${payT.c}, ${payT.c}dd)`, transition: 'width .3s' }} />
        </div>
      </div>
      {/* فوتر: عدّادات الدفعات والمدفوعات */}
      <div style={{ padding: '14px 22px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <FinMetaRow label={T('عدد الدفعات', 'Installments')} value={nInst} ltr />
        <FinMetaRow label={T('عدد المدفوعات', 'Payments')} value={nPays} ltr />
      </div>
    </div>
  )
}

const PaymentRow = ({ p, isAr, T, overflow = 0, onEdit, editLog }) => {
  const valid = p.is_valid
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: 12, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', opacity: valid ? 1 : 0.6 }}>
      <span style={{ width: 34, alignSelf: 'stretch', minHeight: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tint + '.12)', color: accent, border: '1px solid ' + tint + '.28)' }}>
        {isRefund
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/></svg>}
      </span>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 19, color: accent, fontWeight: 800, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(Math.abs(p.amount))}</span>
          <span style={{ fontSize: 12, color: accent, fontWeight: 700 }}>{SAR(T)}</span>
          {method && <span style={{ fontSize: 9.5, fontWeight: 700, color: accent, background: tint + '.1)', padding: '2px 8px', borderRadius: 999 }}>{method}</span>}
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
          {twoNames && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: C.gold, fontWeight: 700 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>{twoNames}</span>
            </span>
          )}
          {p.bank_reference && <span style={{ direction: 'ltr', fontFamily: 'monospace' }}>{p.bank_reference}</span>}
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
        {noteText && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, fontSize: 10.5, color: 'var(--tx3)', lineHeight: 1.5 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span style={{ wordBreak: 'break-word' }}>{noteText}</span>
          </div>
        )}
        {/* الإيصالات — رابط بسيط أسفل كرت الدفعة (تحت الملاحظة) */}
        {Array.isArray(p.receipts) && p.receipts.length > 0 && (
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
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
        <span style={{ fontSize: 10.5, color: 'var(--tx3)', direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{datePart}</span>
        {timePart && <span style={{ fontSize: 9.5, color: 'var(--tx4)', direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{timePart}</span>}
      </div>
      {onEdit && valid && (
        <button onClick={() => onEdit(p)} title={T('تعديل الدفعة','Edit payment')}
          style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 8, background: 'transparent', border: '1px dashed rgba(212,160,23,.45)', color: C.gold, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

const InstallmentRow = ({ ins, n, last, single, T, isAr }) => { const m = deriveInstMeta(ins, T, isAr); return (
  <div style={{ position: 'relative', paddingBottom: last ? 0 : 18 }}>
    <span style={{ position: 'absolute', insetInlineStart: -22, top: 4, width: 24, height: 24, borderRadius: '50%', background: m.stateBg, border: '2px solid ' + m.stateC, color: m.stateC, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>{m.state === 'paid' ? <CheckIcon/> : n}</span>
    <div style={{ paddingInlineStart: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 700, marginBottom: 4 }}>{m.milestone || (single ? T('دفعة واحدة', 'Single payment') : instOrdinalLabel(ins.installment_order, isAr))}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 22, color: m.state === 'paid' ? C.ok : C.gold, fontWeight: 800, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(m.insTotal)}</span>
        <span style={{ fontSize: 13, color: C.gold, fontWeight: 700 }}>{SAR(T)}</span>
        {/* «جزئي» يُخفى لأن شريط التقدّم أسفله يوضّح المدفوع/المتبقي — تبقى «مسدّد»/«لم يُسدد» لباقي الحالات */}
        {m.state !== 'partial' && <span style={{ fontSize: 10, color: m.stateC, fontWeight: 700 }}>· {m.stateLabel}</span>}
      </div>
      {m.state === 'partial' && (() => {
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
      {ins.expected_date && (
        <div style={{ marginTop: 4, fontSize: 10, color: 'var(--tx4)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>{T('التاريخ المتوقع','Expected')}:</span>
          <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', color: 'var(--tx3)' }}>{fmtGreg(ins.expected_date, isAr)}</span>
        </div>
      )}
    </div>
  </div>
)}
const TimelineCol = ({ items, T, isAr }) => (
  <div style={{ position: 'relative', paddingInlineStart: 22 }}>
    {items.length > 1 && <div style={{ position: 'absolute', insetInlineStart: 13, top: 14, bottom: 14, width: 2, background: 'rgba(255,255,255,.06)' }} />}
    {items.map((ins, i) => <InstallmentRow key={ins.id} ins={ins} n={i + 1} last={i === items.length - 1} single={false} T={T} isAr={isAr} />)}
  </div>
)
const TimelineHead = ({ icon, title, sub }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 7, background: 'rgba(212,160,23,.12)', border: '1px solid rgba(212,160,23,.3)', color: C.gold, flexShrink: 0 }}>{icon}</span>
    <span style={{ fontSize: 12.5, fontWeight: 700, color: C.gold }}>{title}</span>
    {sub && <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>· {sub}</span>}
  </div>
)
const InstallmentTimeline = ({ insts, T, isAr }) => {
  // Schedule shape: one shared combined «إصدار التأشيرة والتوكيل» tranche (no visa link) shown first,
  // then one «إصدار الإقامة» tranche per visa under its own header. Legacy/cash schedules stay flat.
  const visaInsts = insts.filter(x => x.visa_application_id)
  const txnInsts = insts.filter(x => !x.visa_application_id)
  if (!visaInsts.length) return (
    <div style={{ position: 'relative', paddingInlineStart: 22 }}>
      {insts.length > 1 && <div style={{ position: 'absolute', insetInlineStart: 13, top: 14, bottom: 14, width: 2, background: 'rgba(255,255,255,.06)' }} />}
      {insts.map((ins, i) => <InstallmentRow key={ins.id} ins={ins} n={ins.installment_order} last={i === insts.length - 1} single={insts.length === 1} T={T} isAr={isAr} />)}
    </div>
  )
  const groups = []; const map = new Map()
  visaInsts.forEach(ins => { const k = ins.visa_application_id; if (!map.has(k)) { const g = { key: k, visa: ins.visa_application, items: [] }; map.set(k, g); groups.push(g) } map.get(k).items.push(ins) })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {txnInsts.length > 0 && (
        <div>
          <TimelineHead title={T('التأشيرة والتوكيل','Visa & authorization')} sub={T('مشتركة لكل التأشيرات','shared — all visas')}
            icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>} />
          <TimelineCol items={txnInsts} T={T} isAr={isAr} />
        </div>
      )}
      {groups.map((g, gi) => (
        <div key={g.key}>
          <TimelineHead title={`${T('تأشيرة','Visa')} ${gi + 1}`} sub={g.visa?.border_number ? `${T('رقم الحدود','Border')} ${g.visa.border_number}` : null}
            icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>} />
          <TimelineCol items={g.items} T={T} isAr={isAr} />
        </div>
      ))}
    </div>
  )
}

// التسعير — كرت مستقل: بنود التسعيرة المحفوظة وقت الإنشاء (إن وُجدت)، وإلا ملخّص الإجمالي/المسدّد/المتبقي للفواتير القديمة.
const PricingCard = ({ breakdown, total = 0, paid = 0, remaining = 0, T, onEdit, log = [] }) => (
  <div style={cardChrome}>
    <div style={cardHeader}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
      <span style={cardTitle}>{T('التسعير','Pricing')}</span>
      {onEdit && (
        <button onClick={onEdit} title={T('تعديل التسعير','Edit pricing')}
          style={{ marginInlineStart: 'auto', height: 32, padding: '0 14px', borderRadius: 9, background: 'transparent', border: '1px dashed rgba(212,160,23,.5)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <span>{T('تعديل','Edit')}</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        </button>
      )}
    </div>
    <div style={{ padding: '14px 22px' }}>
      {Array.isArray(breakdown) && breakdown.length > 0 ? (
        <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,.05)', background: 'rgba(0,0,0,.18)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>
          {breakdown.map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 14 }}>
              <span style={{ color: 'var(--tx2)', fontWeight: 600, fontSize: 12.5 }}>{l.label}</span>
              <span style={{ color: 'var(--tx1)', fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(l.amount)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 9, borderTop: '1px solid rgba(255,255,255,.08)' }}>
            <span style={{ fontSize: 16, color: C.gold, fontWeight: 600 }}>{T('الإجمالي','Total')}</span>
            <span style={{ fontSize: 16, color: C.gold, fontWeight: 800, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(total)}</span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: T('الإجمالي','Total'), value: total, c: C.gold },
            { label: T('المسدّد','Paid'), value: paid, c: C.ok },
            { label: T('المتبقي','Remaining'), value: remaining, c: remaining > 0 ? C.red : 'var(--tx2)' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{s.label}</span>
              <span style={{ fontSize: 15, color: s.c, fontWeight: 800, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(s.value)}</span>
            </div>
          ))}
        </div>
      )}
      <ChangeLog T={T} title={T('سجل تعديل التسعير', 'Pricing edit log')} entries={log}
        actionLabel={T('تم تعديل التسعير', 'Pricing edited')}
        renderDetail={c => <PricingChanges T={T} entry={c} />} />
    </div>
  </div>
)

const InstallmentsWithPayments = ({ data, breakdown, total = 0, paid = 0, remaining = 0, isAr, T, onEditPayment, paymentLog }) => {
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
        <InstallmentTimeline insts={insts} isAr={isAr} T={T} />
      )}

      {/* Payments — all actual payments */}
      <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 700, letterSpacing: '.3px', margin: '16px 0 4px' }}>
        {T('المدفوعات','Payments')} ({pays.length})
      </div>
      {pays.length === 0 ? (
        <div style={{ padding: '6px 0', fontSize: 11, color: 'var(--tx4)' }}>{T('لا توجد مدفوعات','No payments yet')}</div>
      ) : (
        <div>
          {pays.map(p => <PaymentRow key={p.id} p={p} isAr={isAr} T={T} onEdit={onEditPayment}
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
    {inv.branch?.branch_code && <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,.08)', color: 'var(--tx3)', direction: 'ltr', fontWeight: 700 }}>{inv.branch.branch_code}</span>}
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
  const rtl = printLang === 'ar' || printLang === 'ur'
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
  const nm = v => { const n = Number(v || 0); return (n < 0 ? '- ' : '') + Math.abs(n).toLocaleString('en-US') }
  const fmtD = d => { if (!d) return '—'; const dt = new Date(d); if (isNaN(dt)) return '—'; return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}` }

  // ── Label dictionary (ar · en · hi · ur · bn) ──
  const L = {
    invoice: { ar: 'فاتورة', en: 'Invoice', hi: 'चालान', ur: 'انوائس', bn: 'চালান' },
    office: { ar: 'المكتب', en: 'Office', hi: 'कार्यालय', ur: 'دفتر', bn: 'অফিস' },
    client: { ar: 'العميل', en: 'Client', hi: 'ग्राहक', ur: 'کلائنٹ', bn: 'ক্লায়েন্ট' },
    agent: { ar: 'الوسيط', en: 'Agent', hi: 'एजेंट', ur: 'ایجنٹ', bn: 'এজেন্ট' },
    workerFacility: { ar: 'العامل والمنشأة', en: 'Worker & Facility', hi: 'कर्मचारी एवं प्रतिष्ठान', ur: 'ملازم اور ادارہ', bn: 'কর্মী ও প্রতিষ্ঠান' },
    name: { ar: 'الاسم', en: 'Name', hi: 'नाम', ur: 'نام', bn: 'নাম' },
    id: { ar: 'الهوية', en: 'ID', hi: 'पहचान', ur: 'شناختی نمبر', bn: 'পরিচয় নম্বর' },
    iqama: { ar: 'الإقامة', en: 'Iqama', hi: 'इक़ामा', ur: 'اقامہ', bn: 'ইকামা' },
    phone: { ar: 'الجوال', en: 'Phone', hi: 'फ़ोन', ur: 'فون', bn: 'ফোন' },
    nationality: { ar: 'الجنسية', en: 'Nationality', hi: 'राष्ट्रीयता', ur: 'قومیت', bn: 'জাতীয়তা' },
    workerName: { ar: 'اسم العامل', en: 'Worker Name', hi: 'कर्मचारी का नाम', ur: 'ملازم کا نام', bn: 'কর্মীর নাম' },
    facility: { ar: 'المنشأة', en: 'Facility', hi: 'प्रतिष्ठान', ur: 'ادارہ', bn: 'প্রতিষ্ঠান' },
    facilityName: { ar: 'اسم المنشأة', en: 'Facility Name', hi: 'प्रतिष्ठान का नाम', ur: 'ادارے کا نام', bn: 'প্রতিষ্ঠানের নাম' },
    unifiedNo: { ar: 'الرقم الموحد', en: 'Unified No.', hi: 'एकीकृत नंबर', ur: 'متحدہ نمبر', bn: 'ইউনিফাইড নম্বর' },
    hrsdNo: { ar: 'رقم الموارد', en: 'HRSD No.', hi: 'HRSD नंबर', ur: 'HRSD نمبر', bn: 'HRSD নম্বর' },
    gosiNo: { ar: 'رقم التأمينات', en: 'GOSI No.', hi: 'GOSI नंबर', ur: 'GOSI نمبر', bn: 'GOSI নম্বর' },
    service: { ar: 'الخدمة', en: 'Service', hi: 'सेवा', ur: 'خدمت', bn: 'সেবা' },
    serviceType: { ar: 'نوع الخدمة', en: 'Service Type', hi: 'सेवा का प्रकार', ur: 'خدمت کی قسم', bn: 'সেবার ধরন' },
    description: { ar: 'وصف الخدمة', en: 'Service Description', hi: 'सेवा विवरण', ur: 'خدمت کی تفصیل', bn: 'সেবার বিবরণ' },
    quantity: { ar: 'الكمية', en: 'Quantity', hi: 'मात्रा', ur: 'تعداد', bn: 'পরিমাণ' },
    embassy: { ar: 'السفارة', en: 'Embassy', hi: 'दूतावास', ur: 'سفارت خانہ', bn: 'দূতাবাস' },
    occupation: { ar: 'المهنة', en: 'Occupation', hi: 'पेशा', ur: 'پیشہ', bn: 'পেশা' },
    gender: { ar: 'الجنس', en: 'Gender', hi: 'लिंग', ur: 'جنس', bn: 'লিঙ্গ' },
    male: { ar: 'ذكر', en: 'Male', hi: 'पुरुष', ur: 'مرد', bn: 'পুরুষ' },
    female: { ar: 'أنثى', en: 'Female', hi: 'महिला', ur: 'عورت', bn: 'মহিলা' },
    txnDetails: { ar: 'بيانات المعاملة', en: 'Transaction Details', hi: 'लेन-देन विवरण', ur: 'لین دین کی تفصیلات', bn: 'লেনদেন বিবরণ' },
    visaNo: { ar: 'رقم التأشيرة', en: 'Visa No.', hi: 'वीज़ा संख्या', ur: 'ویزا نمبر', bn: 'ভিসা নম্বর' },
    borderNo: { ar: 'رقم الحدود', en: 'Border No.', hi: 'बॉर्डर नंबर', ur: 'بارڈر نمبر', bn: 'বর্ডার নম্বর' },
    wakalahNo: { ar: 'رقم الوكالة', en: 'Wakalah No.', hi: 'वकालह नंबर', ur: 'وکالہ نمبر', bn: 'ওয়াকালাহ নম্বর' },
    file: { ar: 'الملف', en: 'File', hi: 'फ़ाइल', ur: 'فائل', bn: 'ফাইল' },
    oneFile: { ar: 'ملف واحد', en: 'One File', hi: 'एक फ़ाइल', ur: 'ایک فائل', bn: 'একটি ফাইল' },
    visas: { ar: 'تأشيرة', en: 'visas', hi: 'वीज़ा', ur: 'ویزے', bn: 'ভিসা' },
    city: { ar: 'المدينة', en: 'City', hi: 'शहर', ur: 'شہر', bn: 'শহর' },
    duration: { ar: 'المدة', en: 'Duration', hi: 'अवधि', ur: 'مدت', bn: 'মেয়াদ' },
    renewalDuration: { ar: 'مدة التجديد', en: 'Renewal Duration', hi: 'नवीनीकरण अवधि', ur: 'تجدید مدت', bn: 'নবায়ন মেয়াদ' },
    startDate: { ar: 'تاريخ البدء', en: 'Start Date', hi: 'आरंभ तिथि', ur: 'آغاز کی تاریخ', bn: 'শুরুর তারিখ' },
    endDate: { ar: 'تاريخ الانتهاء', en: 'End Date', hi: 'समाप्ति तिथि', ur: 'اختتام کی تاریخ', bn: 'শেষ তারিখ' },
    currentExpiry: { ar: 'الانتهاء الحالي', en: 'Current Expiry', hi: 'वर्तमान समाप्ति', ur: 'موجودہ میعاد', bn: 'বর্তমান মেয়াদ' },
    newExpiry: { ar: 'الانتهاء الجديد', en: 'New Expiry', hi: 'नई समाप्ति', ur: 'نئی میعاد', bn: 'নতুন মেয়াদ' },
    months: { ar: 'شهر', en: 'months', hi: 'माह', ur: 'ماہ', bn: 'মাস' },
    installments: { ar: 'الدفعات', en: 'Installments', hi: 'किस्तें', ur: 'اقساط', bn: 'কিস্তি' },
    payments: { ar: 'المدفوعات', en: 'Payments', hi: 'भुगतान', ur: 'ادائیگیاں', bn: 'পেমেন্ট' },
    paid: { ar: 'المدفوع', en: 'Paid', hi: 'भुगतान किया', ur: 'ادا شدہ', bn: 'পরিশোধিত' },
    remaining: { ar: 'المتبقي', en: 'Remaining', hi: 'शेष', ur: 'باقی', bn: 'বাকি' },
    total: { ar: 'الإجمالي', en: 'Total', hi: 'कुल', ur: 'کل', bn: 'মোট' },
    refund: { ar: 'استرجاع', en: 'Refund', hi: 'वापसी', ur: 'واپسی', bn: 'ফেরত' },
    singlePayment: { ar: 'دفعة واحدة', en: 'Single Payment', hi: 'एकमुश्त भुगतान', ur: 'یکمشت ادائیگی', bn: 'একক পেমেন্ট' },
    payment: { ar: 'دفعة', en: 'Installment', hi: 'किस्त', ur: 'قسط', bn: 'কিস্তি' },
    note: { ar: 'ملاحظة', en: 'Note', hi: 'टिप्पणी', ur: 'نوٹ', bn: 'নোট' },
    stPaid: { ar: 'مدفوعة', en: 'PAID', hi: 'भुगतान किया', ur: 'ادا شدہ', bn: 'পরিশোধিত' },
    stPartial: { ar: 'مدفوعة جزئياً', en: 'PARTIAL', hi: 'आंशिक', ur: 'جزوی', bn: 'আংশিক' },
    stUnpaid: { ar: 'غير مدفوعة', en: 'UNPAID', hi: 'अदत्त', ur: 'غیر ادا شدہ', bn: 'অপরিশোধিত' },
    cancelled: { ar: 'ملغاة', en: 'CANCELLED', hi: 'रद्द', ur: 'منسوخ', bn: 'বাতিল' },
    mVisaIssue: { ar: 'إصدار التأشيرة', en: 'Visa Issuance', hi: 'वीज़ा जारी', ur: 'ویزا اجراء', bn: 'ভিসা ইস্যু' },
    mWakalah: { ar: 'الوكالة', en: 'Wakalah', hi: 'वकालह', ur: 'وکالہ', bn: 'ওয়াকালাহ' },
    mIqamaIssue: { ar: 'إصدار الإقامة', en: 'Iqama Issuance', hi: 'इक़ामा जारी', ur: 'اقامہ اجراء', bn: 'ইকামা ইস্যু' },
    pricing: { ar: 'بيانات التسعير', en: 'Pricing', hi: 'मूल्य निर्धारण', ur: 'قیمتوں کی تفصیل', bn: 'মূল্য নির্ধারণ' },
    officeAccount: { ar: 'حساب المكتب', en: 'Office Bank Account', hi: 'कार्यालय बैंक खाता', ur: 'دفتر کا بینک اکاؤنٹ', bn: 'অফিস ব্যাংক অ্যাকাউন্ট' },
    bankName: { ar: 'البنك', en: 'Bank', hi: 'बैंक', ur: 'بینک', bn: 'ব্যাংক' },
    accountName: { ar: 'اسم الحساب', en: 'Account Name', hi: 'खाता नाम', ur: 'اکاؤنٹ کا نام', bn: 'অ্যাকাউন্টের নাম' },
    accountNumber: { ar: 'رقم الحساب', en: 'Account No.', hi: 'खाता संख्या', ur: 'اکاؤنٹ نمبر', bn: 'অ্যাকাউন্ট নম্বর' },
    iban: { ar: 'الآيبان', en: 'IBAN', hi: 'IBAN', ur: 'آئی بان (IBAN)', bn: 'আইবিএএন' },
    page: { ar: 'صفحة', en: 'Page', hi: 'पृष्ठ', ur: 'صفحہ', bn: 'পৃষ্ঠা' },
    contd: { ar: 'تتمة الفاتورة', en: 'Invoice — continued', hi: 'चालान — जारी', ur: 'انوائس — جاری', bn: 'চালান — চলমান' },
    // ── Royal Black & Gold design labels ──
    serviceInvoice: { ar: 'فاتورة خدمات', en: 'Service Invoice', hi: 'सेवा चालान', ur: 'سروس انوائس', bn: 'সেবা চালান' },
    invoiceNoLbl: { ar: 'رقم الفاتورة', en: 'Invoice No.', hi: 'चालान संख्या', ur: 'انوائس نمبر', bn: 'চালান নম্বর' },
    issueDate: { ar: 'تاريخ الإصدار', en: 'Issue Date', hi: 'जारी तिथि', ur: 'تاریخ اجرا', bn: 'ইস্যু তারিখ' },
    lastPayment: { ar: 'آخر دفعة مستلمة', en: 'Latest Payment', hi: 'अंतिम भुगतान', ur: 'آخری ادائیگی', bn: 'সর্বশেষ পেমেন্ট' },
    against: { ar: 'مقابل', en: 'For', hi: 'के लिए', ur: 'بمقابل', bn: 'বাবদ' },
    method: { ar: 'الطريقة', en: 'Method', hi: 'तरीका', ur: 'طریقہ', bn: 'পদ্ধতি' },
    date: { ar: 'التاريخ', en: 'Date', hi: 'तारीख', ur: 'تاریخ', bn: 'তারিখ' },
    remainingAfter: { ar: 'المتبقي بعد هذه الدفعة', en: 'Remaining', hi: 'शेष', ur: 'باقی رقم', bn: 'বাকি' },
    noPayments: { ar: 'لا توجد مدفوعات مستلمة بعد', en: 'No payments received yet', hi: 'अभी तक कोई भुगतान नहीं', ur: 'ابھی کوئی ادائیگی موصول نہیں', bn: 'এখনও কোনো পেমেন্ট নেই' },
    parties: { ar: 'الأطراف', en: 'Parties', hi: 'पक्ष', ur: 'فریقین', bn: 'পক্ষসমূহ' },
    clientData: { ar: 'بيانات العميل', en: 'Client', hi: 'ग्राहक', ur: 'کلائنٹ', bn: 'ক্লায়েন্ট' },
    clientWorkerData: { ar: 'بيانات العميل والعامل', en: 'Client & Worker', hi: 'ग्राहक एवं कर्मचारी', ur: 'کلائنٹ اور ملازم', bn: 'ক্লায়েন্ট ও কর্মী' },
    workerData: { ar: 'بيانات العامل', en: 'Worker', hi: 'कर्मचारी', ur: 'ملازم', bn: 'কর্মী' },
    establishment: { ar: 'بيانات المنشأة', en: 'Establishment', hi: 'प्रतिष्ठान', ur: 'ادارہ', bn: 'প্রতিষ্ঠান' },
    agentData: { ar: 'بيانات الوسيط', en: 'Agent', hi: 'एजेंट', ur: 'ایجنٹ', bn: 'এজেন্ট' },
    schedule: { ar: 'الدفعات', en: 'Schedule', hi: 'किस्तें', ur: 'اقساط', bn: 'কিস্তি' },
    paymentsReceived: { ar: 'المدفوعات المستلمة', en: 'Payments Received', hi: 'प्राप्त भुगतान', ur: 'موصولہ ادائیگیاں', bn: 'প্রাপ্ত পেমেন্ট' },
    milestone: { ar: 'البند', en: 'Item', hi: 'मद', ur: 'آئٹم', bn: 'আইটেম' },
    expectedDate: { ar: 'التاريخ المتوقع', en: 'Date', hi: 'तारीख', ur: 'تاریخ', bn: 'তারিখ' },
    amount: { ar: 'المبلغ', en: 'Amount', hi: 'राशि', ur: 'رقم', bn: 'পরিমাণ' },
    status: { ar: 'الحالة', en: 'Status', hi: 'स्थिति', ur: 'حالت', bn: 'অবস্থা' },
    item: { ar: 'البند', en: 'Item', hi: 'मद', ur: 'آئٹم', bn: 'আইটেম' },
    value: { ar: 'القيمة', en: 'Value', hi: 'मूल्य', ur: 'قیمت', bn: 'মূল্য' },
    pricingSummary: { ar: 'بيانات التسعير والملخّص المالي', en: 'Pricing & Summary', hi: 'मूल्य एवं सारांश', ur: 'قیمت اور خلاصہ', bn: 'মূল্য ও সারসংক্ষেপ' },
    bankDetails: { ar: 'الحساب البنكي', en: 'Bank Details', hi: 'बैंक विवरण', ur: 'بینک تفصیلات', bn: 'ব্যাংক বিবরণ' },
    serviceDetails: { ar: 'تفاصيل الخدمة', en: 'Service Details', hi: 'सेवा विवरण', ur: 'خدمت کی تفصیل', bn: 'সেবার বিবরণ' },
    latest: { ar: 'الأحدث', en: 'Latest', hi: 'नवीनतम', ur: 'تازہ ترین', bn: 'সর্বশেষ' },
    importantNotice: { ar: 'إشعار هام', en: 'Important Notice', hi: 'महत्वपूर्ण सूचना', ur: 'اہم اطلاع', bn: 'গুরুত্বপূর্ণ বিজ্ঞপ্তি' },
    thankYou: { ar: 'شكراً لتعاملكم معنا', en: 'Thank You', hi: 'धन्यवाद', ur: 'شکریہ', bn: 'ধন্যবাদ' },
    officeSign: { ar: 'توقيع المكتب', en: 'Office Signature', hi: 'कार्यालय हस्ताक्षर', ur: 'دفتر کے دستخط', bn: 'অফিস স্বাক্ষর' },
    clientSign: { ar: 'توقيع العميل', en: 'Client Signature', hi: 'ग्राहक हस्ताक्षर', ur: 'کلائنٹ کے دستخط', bn: 'ক্লায়েন্ট স্বাক্ষর' },
    branchCode: { ar: 'المكتب', en: 'Office', hi: 'कार्यालय', ur: 'دفتر', bn: 'অফিস' },
  }
  const lab = k => esc((L[k] && (L[k][printLang] || L[k].en || L[k].ar)) || k)
  // Value localizer — ar/ur prefer the Arabic-script name, en/hi/bn prefer the Latin name.
  const localize = o => { if (!o) return ''; const a = o.value_ar || o.name_ar || ''; const e = o.value_en || o.name_en || ''; return (printLang === 'ar' || printLang === 'ur') ? (a || e) : (e || a) }
  const personName = p => { if (!p) return '—'; const a = p.name_ar || '', e = p.name_en || ''; return ((printLang === 'ar' || printLang === 'ur') ? (a || e) : (e || a)) || '—' }
  const natName = nat => nat ? (localize(nat) || '—') : '—'
  const natFlag = nat => nat?.flag_url ? ` <img class="flag" src="${esc(nat.flag_url)}" alt=""/>` : ''
  const fld = (labHtml, valHtml) => `<div class="field"><div class="label">${labHtml}</div><div class="value">${valHtml}</div></div>`
  const grid = cells => `<div class="tbl g3">${cells.filter(Boolean).join('')}</div>`
  const banner = (k, count) => `<div class="banner">${lab(k)}${count != null ? ` <span class="bcount">(<span class="num">${count}</span>)</span>` : ''}</div>`
  const mono = v => `<span class="mono">${esc(v)}</span>`

  // Ordinal installment fallback label ("الدفعة الأولى" / "First Installment" / "किस्त 1").
  const arOrdF = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة', 'التاسعة', 'العاشرة']
  const enOrd = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth']
  const arOrdM = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر']
  const instOrdLabel = n => printLang === 'ar' ? ('الدفعة ' + (arOrdF[n - 1] || n)) : printLang === 'en' ? ((enOrd[n - 1] || ('#' + n)) + ' Installment') : ((L.payment[printLang] || 'Installment') + ' ' + n)

  // ── Data extraction (mirrors the on-screen detail layout) ──
  const sr = inv.service_request || {}
  const code = data?.code || inv.service_type?.code
  const isVisa = baseSvcCode(code) === 'work_visa'
  const pickWorker = rel => Array.isArray(rel) ? rel[0]?.worker : rel?.worker
  const pickFac = rel => Array.isArray(rel) ? rel[0]?.facility : rel?.facility
  const workerFromApp = pickWorker(sr.transfer_applications) || pickWorker(sr.ajeer_applications) || pickWorker(sr.iqama_renewal_applications) || pickWorker(sr.supplier_payroll_applications) || pickWorker(sr.other_applications) || null
  const facilityFromApp = pickFac(sr.transfer_applications) || pickFac(sr.ajeer_applications) || pickFac(sr.iqama_renewal_applications) || pickFac(sr.supplier_payroll_applications) || pickFac(sr.other_applications) || null
  const client = sr.client || workerFromApp
  const isWorker = !sr.client && !!workerFromApp
  const distinctWorker = (sr.client && workerFromApp) ? workerFromApp : null
  // «العميل هو نفس العامل»: عميل موجود بلا عامل منفصل لكن توجد منشأة — فالعميل هو العامل نفسه (مطابق لمنطق clientModal).
  const workerIsClient = !!sr.client && !workerFromApp && !!facilityFromApp
  const det = data?.det || []
  const d0 = det[0] || {}
  const agent = inv.agent || sr.service_request_agents?.[0]?.agent || null
  const qty = isVisa ? (det.length || Number(sr.quantity || 0)) : Number(sr.quantity || 0)
  // الكمية تُعرض فقط لتأشيرة وإقامة دائمة/مؤقتة (حيث تتعدد التأشيرات)؛ لبقية الخدمات هي 1 دائماً فلا تظهر.
  const showQty = (code === 'work_visa_permanent' || code === 'work_visa_temporary') && qty > 0
  // اسم الخدمة الكامل (نفس ما يظهر في الشاشة): «خدمة عامة» وليس قيمة اللوكاب «عام».
  const svcTheme = svcThemeFor(inv.service_type)
  const svcName = (printLang === 'ar' || printLang === 'ur') ? (svcTheme.label_ar_full || svcTheme.label_ar) : (svcTheme.label_en_full || svcTheme.label_en)
  const officeCode = inv.branch?.branch_code || ''
  const officePhone = inv.branch?.phone ? String(inv.branch.phone).replace(/^\+?966/, '0') : '0569036528'
  const cancelled = inv.status?.code === 'cancelled'
  const clientName = personName(client)
  const clientId = client?.id_number || client?.iqama_number
  const invoiceNo = noDash(inv.invoice_no || '')
  const genLabel = g => g === 'female' ? lab('female') : g === 'male' ? lab('male') : ''
  const insts = (data?.insts || []).slice().sort((a, b) => (a.installment_order || 0) - (b.installment_order || 0))
  // ترتيب زمني تصاعدي: الأقدم أعلى والأحدث أسفل.
  const pays = (data?.pays || []).slice().sort((a, b) => (a.payment_date || '').localeCompare(b.payment_date || ''))

  // permanent-visa milestone keys (reused by the Black & Gold installments table)
  const permKeys = ['mVisaIssue', 'mWakalah', 'mIqamaIssue']
  const totalA = Number(inv.total_amount || 0), paidA = Number(inv.paid_amount || 0), remA = Number(inv.remaining_amount || 0)
  const notePublic = (inv.note_public || '').trim()
  const breakdown = Array.isArray(inv.pricing_breakdown) ? inv.pricing_breakdown : []
  const officeAccts = data?.officeAccounts || []

  // ============================================================
  //  Royal Black & Gold — 2-page invoice document (live data)
  //  Chosen design; replaces the legacy gold/cream template above.
  // ============================================================
  const curTxt = (printLang === 'ar' || printLang === 'ur') ? 'ر.س' : 'SAR'
  const cur = `<span class="riyal">${curTxt}</span>`
  const pctOf = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0
  const num2 = v => `<span class="num">${esc(v)}</span>`
  const accent = () => '' // التسميات الإنجليزية الزخرفية مُزالة (لغة الفاتورة عربية)
  const secTitle = k => `<div class="sec-title"><span class="bar"></span><h3>${lab(k)}</h3><span class="ln"></span>${accent(k)}</div>`
  const kvRow = (k, v, strong) => v ? `<div class="kv"><span class="k">${k}</span><span class="v${strong ? ' strong' : ''}">${v}</span></div>` : ''
  // علم الجنسية صغير بجانب الاسم (مع نص احتياطي إن لم يوجد علم)
  const natBadge = nat => {
    if (!nat) return ''
    if (nat.flag_url) return ` <img class="flag" src="${esc(nat.flag_url)}" alt="${esc(natName(nat))}" title="${esc(natName(nat))}"/>`
    const n = natName(nat); return n ? ` <span class="nat-txt">${esc(n)}</span>` : ''
  }
  const logoImg = '' // اللوقو مُزال بطلب العميل — يبقى اسم المكتب النصّي فقط
  // person name in both scripts (primary localized first)
  // اسم واحد بلغة الفاتورة (عربي للعربية/الأردو، لاتيني لغيرها) — لا يظهر الاسم العربي في الفواتير غير العربية
  const nameBoth = p => kvRow(lab('name'), esc(personName(p)), true)
  // مرحلة الدفعة للتأشيرة الدائمة تُشتق هيكلياً (من الرابط بالتأشيرة + نص الملاحظة)، لا من ترتيب الدفعة —
  // كي لا تفقد دفعةُ الإقامة الثانية فأكثر مسمّاها (permKeys ثلاثة عناصر فقط فكان order≥4 يعطي undefined).
  const milestoneKeyFor = (it) => {
    const note = it.notes || ''
    if (it.visa_application_id || /إقامة|اقامة|iqama|residence/i.test(note)) return 'mIqamaIssue'
    if (/توكيل|تفويض|wakal|authoriz/i.test(note)) return 'mWakalah'
    if (/تأشيرة|visa/i.test(note)) return 'mVisaIssue'
    return null
  }
  const milestoneOf = (it, i) => {
    const ord = it.installment_order || (i + 1)
    const k = (code === 'work_visa_permanent') ? milestoneKeyFor(it) : null
    return (k ? lab(k) : null) || localize(it.payment_milestone) || (insts.length === 1 ? lab('singlePayment') : instOrdLabel(ord))
  }

  // ── HERO: آخر دفعة (latest payment) ──
  const lastPay = pays.length ? pays[pays.length - 1] : null
  const heroIsRefund = !!(lastPay && Number(lastPay.amount) < 0)
  const heroMethod = lastPay ? (localize(lastPay.payment_method) || lab('payment')) : ''
  const activeInst =
    insts.find(it => { const t = +it.total_amount || 0, p = +it.paid_amount || 0; return p > 0 && p < t }) ||
    insts.slice().reverse().find(it => (+it.paid_amount || 0) > 0) ||
    insts.find(it => (+it.paid_amount || 0) <= 0) || null
  const heroAgainst = activeInst ? milestoneOf(activeInst, insts.indexOf(activeInst)) : ''
  const heroBlk = `
    <div class="hero-wrap">
      <div class="svc-type"><span class="svc-name">${esc(svcName || '—')}</span>${showQty ? `<span class="svc-qty">×${esc(qty)}</span>` : ''}</div>
      <section class="hero">
      <span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>
      <div class="hero-main">
        <div class="hero-eyebrow"><span class="star">★</span> ${lab(heroIsRefund ? 'refund' : 'lastPayment')}</div>
        ${lastPay
      ? `<div class="hero-amount"><span class="val">${num2(nm(Math.abs(Number(lastPay.amount || 0))))}</span><span class="cur">${curTxt}</span></div>${heroAgainst ? `<div class="hero-sub">${lab('against')} <b>${esc(heroAgainst)}</b></div>` : ''}`
      : `<div class="hero-amount"><span class="val" style="font-size:26px">—</span></div><div class="hero-sub">${lab('noPayments')}</div>`}
      </div>
      <div class="hero-side">
        ${lastPay ? `<div class="hero-fact"><div class="k">${lab('date')}</div><div class="v">${num2(fmtD(lastPay.payment_date))}</div></div><div class="hero-fact"><div class="k">${lab('method')}</div><div class="v">${esc(heroMethod)}</div></div>` : ''}
        <div class="hero-fact full"><div class="k">${lab('remainingAfter')}</div><div class="v remain">${num2(nm(remA))} ${cur}</div></div>
      </div>
    </section></div>`

  // ── Office code chip (shown in the header instead of the payment status) ──
  const officeCodeBlk = officeCode ? `<div class="office-code">${lab('branchCode')} <span class="num">${esc(officeCode)}</span></div>` : ''

  // ── Parties (client / worker / establishment / agent) ──
  // الأطراف = العميل + الوسيط فقط؛ العامل والمنشأة يُعرضان تحت الخدمة (بطلب العميل)
  const clientCard = `<div class="card${agent ? '' : ' full'}"><h4>${lab(workerIsClient ? 'clientWorkerData' : 'clientData')}${natBadge(client && client.nationality)}</h4>${nameBoth(client)}${clientId ? kvRow(isWorker ? lab('iqama') : lab('id'), num2(clientId)) : ''}${client && client.phone ? kvRow(lab('phone'), num2(fmtPhone(client.phone))) : ''}</div>`
  let agentCard = ''
  if (agent) {
    agentCard = `<div class="card"><h4>${lab('agentData')}${natBadge(agent.nationality)}</h4>${kvRow(lab('name'), esc(personName(agent)), true)}${agent.id_number ? kvRow(lab('id'), num2(agent.id_number)) : ''}${agent.phone ? kvRow(lab('phone'), num2(fmtPhone(agent.phone))) : ''}</div>`
  }
  const partiesBlk = secTitle('parties') + `<div class="cards">${clientCard}${agentCard}</div>`

  let workerCard = ''
  if (distinctWorker) {
    const w = distinctWorker
    workerCard = `<div class="card"><h4>${lab('workerData')}${natBadge(w.nationality)}</h4>${nameBoth(w)}${w.iqama_number ? kvRow(lab('iqama'), num2(w.iqama_number)) : ''}${w.phone ? kvRow(lab('phone'), num2(fmtPhone(w.phone))) : ''}${w.occupation ? kvRow(lab('occupation'), esc(localize(w.occupation) || '')) : ''}</div>`
  }
  let estCard = ''
  const estF = facilityFromApp
  if (estF) {
    estCard = `<div class="card${distinctWorker ? '' : ' full'}"><h4>${lab('establishment')} ${accent('establishment')}</h4>${estF.name_ar ? kvRow(lab('facilityName'), esc(estF.name_ar), true) : ''}${kvRow(lab('unifiedNo'), estF.unified_number ? num2(estF.unified_number) : '—')}${estF.hrsd_number ? kvRow(lab('hrsdNo'), num2(estF.hrsd_number)) : ''}${estF.gosi_number ? kvRow(lab('gosiNo'), num2(estF.gosi_number)) : ''}</div>`
  }
  const workerEstBlk = (workerCard || estCard) ? `<div class="cards" style="margin-top:4mm">${workerCard}${estCard}</div>` : ''

  // ── Service (+ ajeer/iqama/visa specifics) ──
  let svcExtra = ''
  if (code === 'ajeer' && d0) {
    const rows = [
      d0.ajeer_facility ? kvRow(lab('facility'), esc(d0.ajeer_facility.name_ar || d0.ajeer_facility.unified_number || '—')) : '',
      d0.ajeer_city ? kvRow(lab('city'), esc(localize(d0.ajeer_city) || '—')) : '',
      d0.duration_months ? kvRow(lab('duration'), `${num2(d0.duration_months)} ${lab('months')}`) : '',
      d0.start_date ? kvRow(lab('startDate'), num2(fmtD(d0.start_date))) : '',
      d0.end_date ? kvRow(lab('endDate'), num2(fmtD(d0.end_date))) : '',
    ].filter(Boolean).join('')
    if (rows) svcExtra += `<div class="est-grid" style="margin-top:2.5mm">${rows}</div>`
  }
  if (code === 'iqama_renewal' && d0) {
    const rows = [
      d0.duration_months ? kvRow(lab('renewalDuration'), `${num2(d0.duration_months)} ${lab('months')}`) : '',
      d0.current_expire_date ? kvRow(lab('currentExpiry'), num2(fmtD(d0.current_expire_date))) : '',
      d0.new_expire_date ? kvRow(lab('newExpiry'), num2(fmtD(d0.new_expire_date))) : '',
    ].filter(Boolean).join('')
    if (rows) svcExtra += `<div class="est-grid" style="margin-top:2.5mm">${rows}</div>`
  }
  if (isVisa && det.length === 1 && d0) {
    const rows = [
      d0.main_facility && d0.main_facility.name_ar ? kvRow(lab('facility'), esc(d0.main_facility.name_ar)) : '',
      d0.main_facility && d0.main_facility.unified_number ? kvRow(lab('unifiedNo'), num2(d0.main_facility.unified_number)) : '',
      d0.visa_number ? kvRow(lab('visaNo'), num2(d0.visa_number)) : '',
      d0.border_number ? kvRow(lab('borderNo'), num2(d0.border_number)) : '',
      d0.wakalah_number ? kvRow(lab('wakalahNo'), num2(d0.wakalah_number)) : '',
      d0.occupation ? kvRow(lab('occupation'), esc(localize(d0.occupation) || '')) : '',
      d0.embassy ? kvRow(lab('embassy'), esc(localize(d0.embassy) || '')) : '',
    ].filter(Boolean).join('')
    if (rows) svcExtra += `<div class="est-grid" style="margin-top:2.5mm">${rows}</div>`
  }
  let fileDistBlk = ''
  if (isVisa) {
    const visaRows2 = det.filter(r => r && r.file_number != null)
    if (visaRows2.length) {
      const byFile2 = {}
      visaRows2.forEach(r => { (byFile2[r.file_number] = byFile2[r.file_number] || []).push(r) })
      const fileNos2 = Object.keys(byFile2).map(Number).sort((a, b) => a - b)
      const filesHtml2 = fileNos2.map((fn, idx) => {
        const items = byFile2[fn]
        const agg = {}
        items.forEach(r => { const k = [natName(r.nationality) || '—', localize(r.embassy) || '', localize(r.occupation) || '', (r.gender === 'female' ? lab('female') : r.gender === 'male' ? lab('male') : '')].filter(Boolean).join(' · '); agg[k] = (agg[k] || 0) + 1 })
        const fileLbl = fileNos2.length === 1 ? lab('oneFile') : (lab('file') + ' ' + (idx + 1))
        const itemsHtml = Object.entries(agg).map(([k, c]) => `<div class="fd-item"><span>${esc(k)}</span><span class="fd-x">×${c}</span></div>`).join('')
        return `<div class="fd-file"><div class="fd-flabel">${esc(fileLbl)} <span class="fd-count">${num2(items.length)} ${lab('visas')}</span></div>${itemsHtml}</div>`
      }).join('')
      fileDistBlk = `<div class="fd">${filesHtml2}</div>`
    }
  }
  const descText = (d0 && d0.description && d0.description !== svcName) ? d0.description : ''
  const serviceBlk = secTitle('service') + `<div class="card full"><div class="service-row"><div><div class="service-name">${esc(svcName || '—')}</div></div>${showQty ? `<div class="qty-badge"><span class="lbl">${lab('quantity')}</span>${num2(qty)}</div>` : ''}</div></div>`
  // كرت تفاصيل الخدمة (الوصف المُدخل + التفاصيل الخاصة بالخدمة) — يُعرض تحت بيانات العامل/المنشأة
  const svcDetailsInner = (descText ? `<div class="desc-text">${esc(descText)}</div>` : '') + svcExtra + fileDistBlk
  const svcDetailsBlk = svcDetailsInner.trim() ? secTitle('serviceDetails') + `<div class="card full">${svcDetailsInner}</div>` : ''

  // ── Installments table ──
  const instTbl = insts.length ? secTitle('schedule') + `<table><thead><tr><th style="width:34px" class="c">#</th><th>${lab('milestone')}</th><th class="c">${lab('expectedDate')}</th><th class="l">${lab('amount')}</th><th class="c">${lab('status')}</th></tr></thead><tbody>${insts.map((it, i) => {
    const ord = it.installment_order || (i + 1)
    const tot = Number(it.total_amount || 0), pd = Number(it.paid_amount || 0)
    const st = pd >= tot && tot > 0 ? 'ok' : (pd > 0 ? 'partial' : 'no')
    const stTxt = lab(st === 'ok' ? 'stPaid' : st === 'partial' ? 'stPartial' : 'stUnpaid')
    const stageKey = (code === 'work_visa_permanent') ? milestoneKeyFor(it) : null
    const stage = (stageKey ? lab(stageKey) : null) || localize(it.payment_milestone) || ''
    const mLbl = insts.length === 1 ? lab('singlePayment') : instOrdLabel(ord)
    return `<tr><td class="c">${num2(ord)}</td><td><span class="milestone">${esc(mLbl)}</span>${stage ? ` — <span class="stage">${esc(stage)}</span>` : ''}</td><td class="c">${it.expected_date ? num2(fmtD(it.expected_date)) : '—'}</td><td class="l"><span class="amt">${num2(nm(tot))} ${cur}</span></td><td class="c"><span class="pill ${st}">${esc(stTxt)}${st === 'partial' ? ` <span class="sub">(${num2(nm(pd))})</span>` : ''}</span></td></tr>`
  }).join('')}</tbody></table>` : ''

  // ── Payments table ──
  const payTbl = pays.length ? secTitle('paymentsReceived') + `<table><thead><tr><th style="width:34px" class="c">#</th><th>${lab('method')}</th><th class="c">${lab('date')}</th><th class="l">${lab('amount')}</th></tr></thead><tbody>${pays.map((p, i) => {
    const refund = Number(p.amount) < 0
    const method = localize(p.payment_method) || lab('payment')
    const isLast = i === pays.length - 1
    return `<tr class="${isLast ? 'row-latest' : ''}"><td class="c">${num2(i + 1)}</td><td>${esc(method)}${refund ? ` <span class="latest-tag no">${lab('refund')}</span>` : (isLast ? ` <span class="latest-tag">${lab('latest')}</span>` : '')}</td><td class="c">${num2(fmtD(p.payment_date))}</td><td class="l"><span class="amt"${refund ? ' style="color:var(--no)"' : ''}>${num2(nm(p.amount))} ${cur}</span></td></tr>`
  }).join('')}</tbody></table>` : ''

  // ── Pricing + financial summary ──
  const priceTbl = breakdown.length ? `<table class="price-table"><thead><tr><th>${lab('item')}</th><th class="l">${lab('value')}</th></tr></thead><tbody>${breakdown.map(l => `<tr><td>${esc(l.label || '')}</td><td class="l">${num2(nm(l.amount))} ${cur}</td></tr>`).join('')}<tr class="total-row"><td>${lab('total')}</td><td class="l">${num2(nm(totalA))} ${cur}</td></tr></tbody></table>` : ''
  const pctPaid = pctOf(paidA, totalA)
  const summaryBlk = `<div class="summary-card"><div class="sum-row"><span class="k">${lab('total')}</span><span class="v">${num2(nm(totalA))} ${cur}</span></div><div class="sum-row paid"><span class="k">${lab('paid')}</span><span class="v">${num2(nm(paidA))} ${cur}</span></div><div class="sum-row remain"><span class="k">${lab('remaining')}</span><span class="v">${num2(nm(remA))} ${cur}</span></div><div class="progress"><div class="track"><div class="fill" style="width:${pctPaid}%"></div></div><div class="cap"><span><b>${num2(pctPaid + '%')}</b></span><span>${num2(nm(paidA))} / ${num2(nm(totalA))}</span></div></div></div>`
  const priceSummaryBlk = secTitle('pricingSummary') + (priceTbl ? `<div class="price-summary">${priceTbl}${summaryBlk}</div>` : summaryBlk)

  // ── Bank + note ──
  const bankBlk = officeAccts.length ? secTitle('bankDetails') + officeAccts.map(a => {
    const bankName = rtl ? (a.bank_name || a.bank_name_en) : (a.bank_name_en || a.bank_name)
    const acctName = rtl ? (a.account_name || a.account_name_en) : (a.account_name_en || a.account_name)
    return `<div class="bank-card"><div class="est-grid">${kvRow(lab('bankName'), esc(bankName || '—'), true)}${acctName ? kvRow(lab('accountName'), esc(acctName)) : ''}${a.account_number ? kvRow(lab('accountNumber'), num2(a.account_number)) : ''}${a.iban ? kvRow(lab('iban'), `<span class="num">${esc(a.iban)}</span>`, true) : ''}</div></div>`
  }).join('') : ''
  const noteBlk = notePublic ? secTitle('note') + `<div class="bank-card note-card">${esc(notePublic)}</div>` : ''

  // ── Legal notice (printLang primary + English) ──
  const noticeByLang = {
    ar: 'المكتب غير مسؤول عن أي مدفوعات تتم بدون فاتورة رسمية، ويجب على العميل طلب فاتورة لجميع تعاملاته.',
    en: 'The office is not responsible for any payment made without an official invoice. The client must request an invoice for all transactions.',
    hi: 'कार्यालय आधिकारिक चालान के बिना किसी भी भुगतान के लिए ज़िम्मेदार नहीं है। ग्राहक को सभी लेन-देन के लिए चालान माँगना चाहिए।',
    ur: 'دفتر سرکاری انوائس کے بغیر کسی بھی ادائیگی کا ذمہ دار نہیں۔ کلائنٹ کو تمام لین دین کے لیے انوائس مانگنا چاہیے۔',
    bn: 'অফিসিয়াল চালান ছাড়া কোনো অর্থপ্রদানের জন্য অফিস দায়ী নয়। ক্লায়েন্টকে সকল লেনদেনের জন্য চালান চাইতে হবে।',
  }
  const noticePrimary = noticeByLang[printLang] || noticeByLang.en
  const noticeBlk = `<div class="notice"><div class="ttl">⚠ ${lab('importantNotice')}</div><div class="ar">${esc(noticePrimary)}</div>${printLang === 'en' ? '' : `<div class="en">${esc(noticeByLang.en)}</div>`}</div>`

  const wm2 = cancelled ? `<div class="cancel-wm">${lab('cancelled')}</div>` : ''

  const html2 = `<!DOCTYPE html><html dir="${rtl ? 'rtl' : 'ltr'}" lang="${printLang}"><head><meta charset="utf-8"><title>${lab('invoice')} ${esc(invoiceNo)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Reem+Kufi:wght@400;500;600;700&family=Tajawal:wght@300;400;500;700;800&family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Sans+Bengali:wght@400;600;700&family=Noto+Naskh+Arabic:wght@400;600;700&display=swap">
<style>
:root{--ink:#1a1a1a;--ink-soft:#4a4640;--charcoal:#14110b;--gold:#d4af37;--gold-deep:#b8932c;--gold-soft:#e8d49a;--gold-faint:#f6efdc;--paper:#fff;--line:#e4ddcb;--hair:#cdbf95;--ok:#1c7a4a;--ok-bg:#e7f3ec;--warn:#a8741a;--warn-bg:#fbf2dd;--no:#9a2f2f;--no-bg:#f6e6e6}
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
html,body{background:#cfcfcf}
body{font-family:'Tajawal','Noto Naskh Arabic','Noto Sans Devanagari','Noto Sans Bengali',sans-serif;color:var(--ink);font-size:11px;line-height:1.35;-webkit-font-smoothing:antialiased}
.num{direction:ltr;font-variant-numeric:tabular-nums;unicode-bidi:isolate;display:inline-block}
h1,h2,h3,h4,.kufi{font-family:'Reem Kufi','Tajawal',sans-serif}
@page{size:A4;margin:0}
.page{width:210mm;min-height:297mm;margin:0 auto;background:var(--paper);position:relative;overflow:hidden;box-shadow:0 2px 18px rgba(0,0,0,.25)}
.page+.page{margin-top:8mm;page-break-before:always;break-before:page}
.page2{display:flex;flex-direction:column}
.page2 .pad{flex:1;display:flex;flex-direction:column}
.page2-bottom{margin-top:auto}
.pad{padding:0 14mm}
.masthead{background:linear-gradient(135deg,#1f1a10 0%,#14110b 55%,#0e0b06 100%);color:#fff;padding:8mm 14mm 6mm;position:relative}
.masthead::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:linear-gradient(90deg,var(--gold-deep),var(--gold),var(--gold-soft),var(--gold),var(--gold-deep))}
.masthead .corner{position:absolute;width:24px;height:24px;opacity:.9}
.masthead .corner.tl{top:5mm;right:5mm;border-top:1.5px solid var(--gold);border-right:1.5px solid var(--gold)}
.masthead .corner.tr{top:5mm;left:5mm;border-top:1.5px solid var(--gold);border-left:1.5px solid var(--gold)}
.mast-row{display:flex;justify-content:space-between;align-items:stretch;gap:14px}
.inv-id{display:flex;flex-direction:column}
.inv-id .office-code{margin-top:auto;align-self:flex-end}
.brand{display:flex;flex-direction:column;align-items:flex-start}
.logo{width:120px;height:auto;display:block;margin-bottom:5px}
.brand .group{font-family:'Reem Kufi',sans-serif;font-weight:700;font-size:21px;color:var(--gold);letter-spacing:2px;direction:ltr;line-height:1.05;margin-bottom:9px}
.brand .name-ar{font-family:'Reem Kufi',sans-serif;font-weight:700;font-size:15px;color:var(--gold-soft);letter-spacing:.3px;line-height:1.2}
.brand .name-en{font-family:'Reem Kufi',sans-serif;font-weight:500;font-size:9.5px;color:#9b9482;letter-spacing:2.2px;margin-top:6px}
.brand .meta{margin-top:auto;padding-top:10px;font-size:10.5px;color:#d8d2c2;line-height:1.75}
.brand .meta .ar{display:block}
.brand .meta .en{display:block;color:#9b9482;font-size:9px;letter-spacing:.4px}
.brand .meta .mob{display:flex;align-items:center;gap:6px;margin-top:5px;font-size:11px;color:var(--gold-soft)}
.inv-id{text-align:end;min-width:62mm}
.inv-id .tag{font-family:'Reem Kufi',sans-serif;font-size:12px;letter-spacing:1px;color:#fff;font-weight:600}
.inv-id .tag-en{font-size:8px;letter-spacing:3px;color:#9b9482;display:block;margin-top:1px}
.inv-id .no-box{margin-top:7px;border:1px solid var(--gold);background:rgba(212,175,55,.07);padding:6px 12px;display:inline-block;min-width:54mm}
.inv-id .no-lbl{font-size:8px;color:#b9b09a;letter-spacing:1.5px}
.inv-id .no-val{font-family:'Reem Kufi',sans-serif;font-size:16px;color:var(--gold);font-weight:700}
.inv-id .date-line{margin-top:6px;font-size:9px;color:#cfc8b6}
.inv-id .date-line .num{color:#fff;font-weight:700}
.office-code{display:inline-flex;align-items:center;gap:7px;margin-top:8px;padding:5px 13px;border:1px solid var(--gold);background:rgba(212,175,55,.08);color:var(--gold-soft);font-family:'Reem Kufi',sans-serif;font-weight:600;font-size:10.5px;letter-spacing:1px}
.office-code .num{color:var(--gold);font-weight:700;font-size:12px}
.hero-wrap{padding:5mm 14mm 0}
.svc-type{display:flex;align-items:center;justify-content:center;gap:9px;margin-bottom:3.5mm}
.svc-type .svc-name{font-family:'Reem Kufi',sans-serif;font-size:18px;font-weight:700;color:var(--charcoal);letter-spacing:.3px}
.svc-type .svc-qty{font-family:'Reem Kufi',sans-serif;font-size:12px;font-weight:700;color:var(--gold);background:var(--charcoal);padding:2px 10px}
.hero{background:linear-gradient(140deg,#1c1810 0%,#14110b 60%,#0c0904 100%);color:#fff;position:relative;padding:6mm 8mm 5.5mm;display:flex;gap:8mm;align-items:stretch;border:1px solid #2c2517}
.hero::before{content:"";position:absolute;inset:0;border:1px solid rgba(212,175,55,.32);margin:5px;pointer-events:none}
.hero .corner{position:absolute;width:20px;height:20px;z-index:2}
.hero .corner.tl{top:0;right:0;border-top:2px solid var(--gold);border-right:2px solid var(--gold)}
.hero .corner.tr{top:0;left:0;border-top:2px solid var(--gold);border-left:2px solid var(--gold)}
.hero .corner.bl{bottom:0;right:0;border-bottom:2px solid var(--gold);border-right:2px solid var(--gold)}
.hero .corner.br{bottom:0;left:0;border-bottom:2px solid var(--gold);border-left:2px solid var(--gold)}
.hero-main{flex:0 0 auto;min-width:72mm;position:relative;z-index:1}
.hero-eyebrow{display:flex;align-items:center;gap:8px;font-family:'Reem Kufi',sans-serif;font-weight:700;font-size:14px;letter-spacing:.5px;color:var(--gold-soft)}
.hero-eyebrow .star{color:var(--gold);font-size:13px}
.hero-eyebrow .en{font-family:'Reem Kufi',sans-serif;font-size:8px;letter-spacing:2.5px;color:#8d856f}
.hero-amount{display:flex;align-items:baseline;gap:9px;margin-top:5px}
.hero-amount .val{font-family:'Reem Kufi',sans-serif;font-weight:700;font-size:48px;line-height:1;color:var(--gold);letter-spacing:.5px;text-shadow:0 1px 0 rgba(0,0,0,.4)}
.hero-amount .cur{font-size:17px;color:var(--gold-soft);font-weight:500;font-family:'Reem Kufi',sans-serif}
.riyal{margin-inline-start:5px;white-space:nowrap}
.flag{width:21px;height:14px;object-fit:cover;border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.18);vertical-align:middle;margin-inline-start:7px}
.nat-txt{font-size:9.5px;color:var(--gold-deep);font-weight:600;margin-inline-start:6px}
.hero-sub{margin-top:7px;font-size:9.5px;color:#cdc6b4}
.hero-sub b{color:#fff;font-weight:700}
.hero-side{flex:1;position:relative;z-index:1;display:grid;grid-template-columns:1fr 1fr;align-content:center;border-inline-start:1px solid rgba(212,175,55,.25);padding-inline-start:8mm;margin-inline-start:2mm}
.hero-fact{padding:4px 10px 4px 0}
.hero-fact .k{font-size:8px;color:#8d856f;letter-spacing:1.2px;font-family:'Reem Kufi',sans-serif}
.hero-fact .v{font-size:12.5px;color:#fff;font-weight:700;margin-top:2px}
.hero-fact.full{grid-column:1 / -1;border-top:1px solid rgba(255,255,255,.08);margin-top:3px;padding-top:6px}
.hero-fact .v.remain{color:var(--gold);font-family:'Reem Kufi',sans-serif;font-size:17px}
.sec-title{display:flex;align-items:center;gap:9px;margin:4.5mm 0 2.5mm}
.sec-title .bar{width:4px;height:14px;background:var(--gold)}
.sec-title h3{font-family:'Reem Kufi',sans-serif;font-weight:700;font-size:12.5px;color:var(--charcoal);letter-spacing:.3px}
.sec-title .ln{flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--hair))}
[dir=ltr] .sec-title .ln{background:linear-gradient(90deg,var(--hair),transparent)}
.sec-title .en{font-size:8px;letter-spacing:2px;color:#a99a6c;font-family:'Reem Kufi',sans-serif}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:4mm}
.card{border:1px solid var(--line);border-top:2px solid var(--gold);background:#fff;padding:3.5mm 4mm 3mm}
.card.full{grid-column:1 / -1}
.desc-text{font-size:11px;line-height:1.65;color:var(--ink);font-weight:500;white-space:pre-wrap;word-break:break-word}
.card h4{font-family:'Reem Kufi',sans-serif;font-weight:600;font-size:10.5px;color:var(--gold-deep);margin-bottom:2.5mm;letter-spacing:.3px;display:flex;justify-content:flex-start;align-items:center}
.card h4 .en{font-size:7.5px;letter-spacing:1.5px;color:#b3a576;font-weight:400}
.kv{display:flex;justify-content:space-between;gap:10px;padding:2.5px 0;border-bottom:1px dotted #ece5d3}
.kv:last-child{border-bottom:0}
.kv .k{color:var(--ink-soft);font-size:9.5px;white-space:nowrap}
.kv .v{color:var(--ink);font-weight:500;font-size:10px;text-align:end}
.kv .v.strong{font-weight:700}
.est-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 7mm}
.service-row{display:flex;justify-content:space-between;align-items:center}
.service-name{font-family:'Reem Kufi',sans-serif;font-size:13px;color:var(--charcoal);font-weight:600}
.service-en{font-size:8px;color:#a99a6c;letter-spacing:1px;margin-top:1px}
.qty-badge{background:var(--charcoal);color:var(--gold);font-family:'Reem Kufi',sans-serif;font-weight:700;padding:5px 14px;font-size:12.5px;display:flex;align-items:center;gap:7px}
.qty-badge .lbl{font-size:8px;color:#c9bf9f;font-weight:400;letter-spacing:1px}
.fd{margin-top:3mm;border-top:1px dashed var(--hair);padding-top:2.5mm}
.fd-file{margin-bottom:2mm}
.fd-flabel{display:flex;justify-content:space-between;align-items:baseline;font-family:'Reem Kufi',sans-serif;font-size:10px;color:var(--gold-deep);font-weight:600;margin-bottom:1mm}
.fd-count{font-size:8px;color:#a99a6c}
.fd-item{display:flex;justify-content:space-between;font-size:9.5px;color:var(--ink);padding:1px 0}
.fd-x{font-weight:700;direction:ltr}
table{width:100%;border-collapse:collapse}
thead th{background:var(--charcoal);color:var(--gold-soft);font-family:'Reem Kufi',sans-serif;font-weight:500;font-size:9px;letter-spacing:.5px;padding:5.5px 9px;text-align:start}
thead th.c{text-align:center}
thead th.l{text-align:end}
tbody td{padding:5.5px 9px;font-size:10px;border-bottom:1px solid var(--line);color:var(--ink)}
tbody td.c{text-align:center}
tbody td.l{text-align:end}
tbody tr:nth-child(even){background:#faf7ee}
tbody td .milestone{font-weight:500}
tbody td .stage{font-family:'Reem Kufi',sans-serif;font-size:8.5px;color:var(--gold-deep);letter-spacing:.3px}
td .amt{font-weight:700}
.pill{display:inline-block;font-family:'Reem Kufi',sans-serif;font-weight:500;font-size:8.5px;padding:2.5px 9px;border:1px solid transparent;letter-spacing:.3px;white-space:nowrap}
.pill.ok{background:var(--ok-bg);color:var(--ok);border-color:#bcdcc7}
.pill.partial{background:var(--warn-bg);color:var(--warn);border-color:#e6cf8f}
.pill.no{background:var(--no-bg);color:var(--no);border-color:#e3bcbc}
.pill .sub{font-size:7.5px;opacity:.85}
.row-latest{box-shadow:inset 3px 0 0 var(--gold)}
.latest-tag{font-family:'Reem Kufi',sans-serif;font-size:7.5px;letter-spacing:1px;color:var(--charcoal);background:var(--gold);padding:1.5px 6px;margin-inline-start:7px}
.latest-tag.no{background:var(--no);color:#fff}
.price-summary{display:grid;grid-template-columns:1.25fr 1fr;gap:6mm;align-items:start}
.price-table tbody td{font-size:10px}
.price-table .total-row td{background:var(--charcoal);color:var(--gold);font-family:'Reem Kufi',sans-serif;font-weight:700;font-size:12.5px;border-bottom:0}
.price-table .total-row td .num{color:var(--gold-soft)}
.summary-card{border:1px solid var(--charcoal);background:linear-gradient(160deg,#1c1810,#14110b);color:#fff;padding:5mm}
.summary-card .sum-row{display:flex;justify-content:space-between;align-items:baseline;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.09)}
.summary-card .sum-row .k{font-size:10px;color:#c9c0aa;font-family:'Reem Kufi',sans-serif}
.summary-card .sum-row .v{font-size:13px;font-weight:700}
.summary-card .sum-row.paid .v{color:#9fe0b8}
.summary-card .sum-row.remain{border-bottom:0;margin-top:2px;padding-top:7px;border-top:1.5px solid var(--gold)}
.summary-card .sum-row.remain .k{color:var(--gold-soft);font-size:11.5px}
.summary-card .sum-row.remain .v{color:var(--gold);font-family:'Reem Kufi',sans-serif;font-size:22px}
.progress{margin-top:4mm}
.progress .track{height:7px;background:rgba(255,255,255,.12);position:relative;overflow:hidden}
.progress .fill{position:absolute;top:0;inset-inline-start:0;bottom:0;background:linear-gradient(90deg,var(--gold-deep),var(--gold))}
.progress .cap{display:flex;justify-content:space-between;margin-top:5px;font-size:8.5px;color:#b3a983}
.progress .cap b{color:var(--gold-soft)}
.bank-card{border:1px solid var(--line);border-inline-start:3px solid var(--gold);background:var(--gold-faint);padding:3.5mm 4mm 3mm}
.note-card{font-size:10px;line-height:1.6;color:var(--ink);white-space:pre-wrap}
.notice{margin-top:4.5mm;background:var(--charcoal);color:#e9e2cf;padding:4mm 6mm;position:relative}
.notice::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--gold-deep),var(--gold),var(--gold-deep))}
.notice .ttl{font-family:'Reem Kufi',sans-serif;font-weight:600;color:var(--gold);font-size:10.5px;letter-spacing:.5px;margin-bottom:3px;display:flex;align-items:center;gap:7px}
.notice .ar{font-size:9px;line-height:1.55;color:#ddd5c1}
.notice .en{font-size:8px;line-height:1.5;color:#9b937e;direction:ltr;text-align:left;margin-top:4px;border-top:1px solid rgba(255,255,255,.08);padding-top:4px}
.footer-bar{display:flex;justify-content:space-between;align-items:center;padding:4mm 0;font-size:8.5px;color:#8a826b}
.footer-bar .kufi{color:var(--gold-deep);letter-spacing:1px}
.footer-bar .signs{display:flex;gap:12mm}
.footer-bar .sign{text-align:center}
.footer-bar .sign .ln2{width:38mm;border-top:1px solid var(--hair);margin-bottom:3px}
.page-foot{position:absolute;left:0;right:0;bottom:11mm;padding:0 14mm}
.mini-head{background:linear-gradient(135deg,#1f1a10,#14110b);color:#fff;padding:5mm 14mm;display:flex;justify-content:space-between;align-items:center;position:relative}
.mini-head::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2.5px;background:linear-gradient(90deg,var(--gold-deep),var(--gold),var(--gold-deep))}
.mini-head .l-side{display:flex;align-items:center;gap:11px}
.mini-head .logo{width:78px;margin-bottom:0}
.mini-head .mh-name{font-family:'Reem Kufi',sans-serif;font-weight:700;color:var(--gold);font-size:13px}
.mini-head .mh-en{font-size:7.5px;color:#9b9482;letter-spacing:2px}
.mini-head .mh-inv{text-align:left}
.mini-head .mh-inv .l{font-size:8px;color:#b9b09a;letter-spacing:1px}
.mini-head .mh-inv .v{font-family:'Reem Kufi',sans-serif;color:var(--gold);font-weight:700;font-size:13px}
.page-num{text-align:center;font-size:8px;color:#a99a6c;letter-spacing:1px;padding:5mm 14mm 7mm}
.page-num .kufi{color:var(--gold-deep)}
.cancel-wm{position:absolute;top:46%;left:50%;transform:translate(-50%,-50%) rotate(-24deg);font-family:'Reem Kufi',sans-serif;font-size:120px;font-weight:700;color:rgba(154,47,47,.10);letter-spacing:8px;white-space:nowrap;pointer-events:none;z-index:5}
@media print{html,body{background:#fff}.page{box-shadow:none;margin:0}.page+.page{margin-top:0}}
</style></head><body>
<div class="page">
  ${wm2}
  <header class="masthead">
    <span class="corner tl"></span><span class="corner tr"></span>
    <div class="mast-row">
      <div class="brand">
        ${logoImg}
        <div class="group">HUSSAIN OFFICES</div>
        <div class="name-ar">تأشيرة البناء والإنشاء</div>
        <div class="name-en">VISA ALBINA &amp; ALINSHA</div>
        <div class="meta"><span class="ar">المملكة العربية السعودية، الجبيل</span><span class="en">Kingdom of Saudi Arabia – Al Jubail</span><span class="mob"><span>${lab('phone')}:</span><span class="num">${esc(officePhone)}</span></span></div>
      </div>
      <div class="inv-id">
        <div class="tag">${lab('serviceInvoice')}</div>
        <div class="no-box"><div class="no-lbl">${lab('invoiceNoLbl')}</div><div class="no-val"><span class="num">${esc(invoiceNo)}</span></div></div>
        <div class="date-line">${lab('issueDate')}: <span class="num">${fmtD(inv.created_at)}</span></div>
        ${officeCodeBlk}
      </div>
    </div>
  </header>
  ${heroBlk}
  <div class="pad">
    ${partiesBlk}
    ${instTbl}
    ${payTbl}
  </div>
  <div class="page-foot"><div class="footer-bar"><span class="kufi">تأشيرة البناء والإنشاء — VISA ALBINA &amp; ALINSHA</span><span>${lab('invoice')} <span class="num">${esc(invoiceNo)}</span> · ${lab('page')} <span class="num">1 / 2</span></span></div></div>
</div>
<div class="page page2">
  ${wm2}
  <div class="mini-head">
    <div class="l-side">${logoImg}<div><div class="mh-name">تأشيرة البناء والإنشاء</div><div class="mh-en">VISA ALBINA &amp; ALINSHA · HUSSAIN OFFICES</div></div></div>
    <div class="mh-inv"><div class="l">${lab('invoiceNoLbl')}</div><div class="v"><span class="num">${esc(invoiceNo)}</span></div></div>
  </div>
  <div class="pad">
    ${serviceBlk}
    ${workerEstBlk}
    ${svcDetailsBlk}
    ${noteBlk}
    <div class="page2-bottom">
    ${priceSummaryBlk}
    ${bankBlk}
    ${noticeBlk}
    <div class="footer-bar" style="justify-content:center"><span class="kufi">${printLang === 'ar' ? 'شكراً لتعاملكم معنا' : lab('thankYou')}</span></div>
    </div>
  </div>
  <div class="page-num"><span class="kufi">تأشيرة البناء والإنشاء</span> · ${lab('invoice')} <span class="num">${esc(invoiceNo)}</span> · ${lab('page')} <span class="num">2 / 2</span></div>
</div>
</body></html>`

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:-9999px;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow.document
  doc.open(); doc.write(html2); doc.close()
  const cleanup = () => { try { document.body.removeChild(iframe) } catch {} }
  setTimeout(() => {
    try { iframe.contentWindow.focus(); iframe.contentWindow.onafterprint = () => setTimeout(cleanup, 100); iframe.contentWindow.print() }
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
      const { data } = await sb.from('workers')
        .select('id,name_ar,name_en,iqama_number,iqama_expiry_date,phone,nationality:nationality_id(code,name_ar,flag_url),current_occupation:current_occupation_id(name_ar),current_facility:current_facility_id(id,name_ar,name_en,unified_number,hrsd_number,gosi_number)')
        .or(`name_ar.ilike.${pattern},name_en.ilike.${pattern},iqama_number.ilike.${pattern},phone.ilike.${pattern}`)
        .is('deleted_at', null)
        .limit(30)
      // إزالة التكرار: نفس الشخص (رقم إقامة واحد) قد يَرِد بعدّة سجلات عُمّال — سجلّ لكل منشأة، أثر هجرة بابل.
      // نُبقي سجلاً واحداً لكل رقم إقامة: نُفضّل العامل الحالي إن ظهر، ثم الأكثر اكتمالاً (منشأة برقم موحّد).
      const seen = new Map()
      const score = w => (currentId && w.id === currentId ? 4 : 0) + (w.current_facility?.unified_number ? 2 : w.current_facility ? 1 : 0)
      for (const w of (data || [])) {
        const key = (w.iqama_number && String(w.iqama_number).trim()) || `id:${w.id}`
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
      <div title={nat?.name_ar || ''} style={{ width: size, height: size, borderRadius: 12, background: 'rgba(0,0,0,.25)', border: '1px solid rgba(255,255,255,.08)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {url ? <img src={url} alt={nat?.name_ar || ''} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : (flagEmoji(nat?.code) ? <span style={{ fontSize: Math.round(size * 0.5), lineHeight: 1 }}>{flagEmoji(nat?.code)}</span> : <Globe size={Math.round(size * 0.42)} strokeWidth={1.6} color="rgba(255,255,255,.35)" />)}
      </div>
    )
  }
  const infoBox = (Icon, label, value, valColor) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 9, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', minWidth: 0 }}>
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
        style={{ cursor: 'pointer', position: 'relative', border: '1px solid rgba(255,255,255,.08)', background: 'linear-gradient(135deg,rgba(255,255,255,.05),rgba(255,255,255,.012))', boxShadow: '0 4px 16px rgba(0,0,0,.28)', transition: 'all .22s ease', padding: 14, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
        onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(212,160,23,.08),rgba(255,255,255,.02))'; e.currentTarget.style.borderColor = 'rgba(212,160,23,.25)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(255,255,255,.05),rgba(255,255,255,.012))'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {flagEl(w, 48)}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15.5, fontWeight: 600, color: 'rgba(255,255,255,.95)', letterSpacing: '-.2px' }}>{nm}</span>
              {isCur && <span style={{ fontSize: 9.5, fontWeight: 600, color: C.gold, background: 'rgba(212,160,23,.12)', border: '1px solid rgba(212,160,23,.3)', borderRadius: 20, padding: '2px 8px' }}>{T('الحالي','Current')}</span>}
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
  const pillBase = { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 11px', borderRadius: 9, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', minHeight: 40 }
  const pLbl = { fontSize: 10, color: 'var(--tx5)', fontWeight: 600, letterSpacing: '.2px', lineHeight: 1.2 }
  const pVal = { fontSize: 13, color: '#fff', fontWeight: 600, direction: 'ltr', lineHeight: 1.2, textAlign: 'right' }
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
        <div style={{ position: 'relative', border: '1px solid rgba(212,160,23,.4)', background: 'linear-gradient(135deg,rgba(212,160,23,.12),rgba(255,255,255,.02))', boxShadow: '0 4px 16px rgba(0,0,0,.28)', padding: 14, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
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
              style={{ width: '100%', height: 42, padding: '0 14px 0 40px', borderRadius: 10, background: 'rgba(0,0,0,.25)', border: '1px solid rgba(255,255,255,.08)', color: 'var(--tx1)', fontFamily: F, fontSize: 12.5, outline: 'none', boxSizing: 'border-box', textAlign: 'right' }} />
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
function ClientEditModal({ sb, toast, T, client, workerIsClient = false, editorId, editorName, invId, onClose, onSaved }) {
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
  const valid = lock
    ? (phoneDigits.length === 9 && dirty)
    : (!!(f.name_ar.trim() && idDigits.length === 10 && phoneDigits.length === 9 && f.nationality_id) && dirty)
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
          <TextField label={T('الاسم','Name')} req value={f.name_ar} onChange={v => set('name_ar', v)} placeholder={T('اسم العميل','Client name')} disabled={lock} />
          <FKSelect label={T('الجنسية','Nationality')} req value={f.nationality_id} onChange={v => set('nationality_id', v)} placeholder={T('— اختر —','— Select —')}
            options={nats} getKey={n => n.id} getLabel={n => T(n.name_ar, n.name_en || n.name_ar)} disabled={lock} />
          <IdField label={T('رقم الهوية','ID Number')} req value={f.id_number} onChange={v => set('id_number', v)} placeholder="0000000000" disabled={lock} />
          <PhoneField label={T('رقم الجوال','Phone')} req value={f.phone} onChange={v => set('phone', v)} />
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
function AgentEditModal({ sb, toast, T, agent, editorId, editorName, invId, onClose, onSaved }) {
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
  const valid = !!(f.name_ar.trim() && idDigits.length === 10 && phoneDigits.length === 9 && f.nationality_id) && dirty
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
          <TextField label={T('الاسم','Name')} req value={f.name_ar} onChange={v => set('name_ar', v)} placeholder={T('اسم الوسيط','Agent name')} />
          <FKSelect label={T('الجنسية','Nationality')} req value={f.nationality_id} onChange={v => set('nationality_id', v)} placeholder={T('— اختر —','— Select —')}
            options={nats} getKey={n => n.id} getLabel={n => T(n.name_ar, n.name_en || n.name_ar)} />
          <IdField label={T('رقم الهوية','ID Number')} req value={f.id_number} onChange={v => set('id_number', v)} placeholder="0000000000" />
          <PhoneField label={T('رقم الجوال','Phone')} req value={f.phone} onChange={v => set('phone', v)} />
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

// تعديل تفاصيل الخدمة العامة — نافذة بنفس تفاصيل بطاقة «الخدمة» في الفاتورة:
// اسم الخدمة (للعرض فقط — يتبع نوع الخدمة) + الوصف القابل للتعديل المخزَّن في other_applications.
function ServiceEditModal({ sb, toast, T, isAr, srId, invId, svcName, currentDescription, currentBranchId, editorId, editorName, onClose, onSaved }) {
  const [desc, setDesc] = useState(currentDescription || '')
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
  // زر الحفظ يُفعَّل فقط عند وجود تعديل فعلي (الوصف أو المكتب).
  const branchChanged = String(branchId || '') !== String(currentBranchId || '')
  const dirty = (desc.trim() !== (currentDescription || '').trim()) || branchChanged
  const save = async () => {
    if (saving || !srId || !dirty) return
    setErr(''); setSaving(true)
    try {
      const nowIso = new Date().toISOString()
      const newDesc = desc.trim()
      // اجمع تغييرات الحقول لسجلّ التعديل (الوصف/المكتب) — بأكواد المكاتب لقراءة بشرية.
      const codeOf = id => branches.find(b => b.id === id)?.branch_code || null
      const changes = []
      if (newDesc !== (currentDescription || '').trim()) changes.push({ field: 'description', from: (currentDescription || '').trim() || null, to: newDesc || null })
      if (branchChanged) changes.push({ field: 'office', from: codeOf(currentBranchId), to: codeOf(branchId) })
      // اقرأ التفاصيل الحالية لإلحاق السجلّ (details.service_changes) دون الكتابة فوق سجلّ سابق.
      const { data: rows } = await sb.from('other_applications').select('id,details').eq('service_request_id', srId).is('deleted_at', null)
      const det = (rows?.[0]?.details && typeof rows[0].details === 'object') ? rows[0].details : {}
      const log = Array.isArray(det.service_changes) ? det.service_changes : []
      const nextDetails = changes.length
        ? { ...det, service_changes: [...log, { at: nowIso, by: editorId || null, by_name: editorName || null, changes }] }
        : det
      const { error } = await sb.from('other_applications')
        .update({ description: newDesc || null, details: nextDetails, updated_by: editorId || null, updated_at: nowIso })
        .eq('service_request_id', srId).is('deleted_at', null)
      if (error) throw error
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: F }}>
      <ModalSection Icon={FileText} label={T('تفاصيل الخدمة','Service Details')} style={{ marginTop: 6 }}>
        <div style={GRID}>
          <FKSelect full label={T('المكتب','Office')} value={branchId} onChange={v => { setErr(''); setBranchId(v) }} placeholder={T('— اختر —','— Select —')}
            options={branches} getKey={b => b.id} getLabel={b => b.branch_code || '—'} />
          <TextArea full rows={4} label={T('الوصف','Description')}
            value={desc} onChange={v => { setErr(''); setDesc(v) }} placeholder={T('وصف الخدمة لهذا الطلب…','Service description for this request…')} />
        </div>
      </ModalSection>
    </div>
  )
  return (
    <Modal open onClose={onClose} title={T('تعديل تفاصيل الخدمة','Edit service details')} Icon={FileText} width={560} height="auto" accent={C.gold}
      success={done ? <SuccessView title={T('تم حفظ التعديلات','Changes saved')} /> : undefined}
      pages={[{ valid: dirty, error: err || undefined, content }]}
      onSubmit={save} submitting={saving} submitIcon={CheckCircle2} submitLabel={T('تعديل تفاصيل الخدمة','Edit service details')} />
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
function NoteEditModal({ sb, toast, T, inv, editorId, editorName, onClose, onSaved }) {
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
          <TextArea full rows={4} label={T('ملاحظة الفاتورة','Invoice Note')} hint={T('تظهر في الطباعة','shown on print')}
            value={pub} onChange={v => { setErr(''); setPub(v) }} placeholder={T('ملاحظة تظهر للعميل…','Note visible to the client…')} />
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
  const valid = absVal > 0 && (!isRefund || notes.trim().length > 0)
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
          <CurrencyField big full req label={isRefund ? T('مبلغ الاسترجاع','Refund Amount') : T('المبلغ','Amount')}
            value={amount} onChange={v => { setErr(''); setAmount(v) }} unit={T('ريال','SAR')} />
          <Segmented full label={T('طريقة الدفع','Payment Method')} value={method} onChange={v => { setErr(''); setMethod(v) }}
            options={[{ v: 'cash', l: T('نقداً','Cash'), c: color }, { v: 'bank', l: T('حوالة بنكية','Bank'), c: color }]} />
          <TextArea full req={isRefund} rows={3}
            label={isRefund ? T('السبب','Reason') : T('ملاحظة','Note')}
            value={notes} onChange={v => { setErr(''); setNotes(v) }}
            placeholder={isRefund ? T('اذكر سبب الاسترجاع…','Explain the refund reason…') : T('ملاحظة خاصة بهذه الدفعة…','A note for this payment…')} />
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
                  <TextField label={i === 0 ? T('البند','Item') : undefined} value={l.label} onChange={v => setLine(i, 'label', v)} placeholder={T('اسم البند','Item label')} />
                </div>
                <div style={{ width: 130 }}>
                  <CurrencyField label={i === 0 ? T('المبلغ','Amount') : undefined} value={l.amount} onChange={v => setLine(i, 'amount', v)} unit={T('ريال','SAR')} />
                </div>
                {i === 0 ? (
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
            <button type="button" onClick={addLine}
              style={{ alignSelf: 'flex-start', height: 36, padding: '0 14px', borderRadius: 9, border: '1px dashed rgba(212,160,23,.5)', background: 'transparent', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Plus size={14} /> <span>{T('إضافة بند','Add item')}</span>
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.08)' }}>
              <span style={{ fontSize: 15, color: C.gold, fontWeight: 700 }}>{T('الإجمالي','Total')}</span>
              <span style={{ fontSize: 16, color: C.gold, fontWeight: 800, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(computedTotal)}</span>
            </div>
          </div>
        ) : (
          <div style={GRID}>
            <CurrencyField full label={T('إجمالي الفاتورة','Invoice Total')} req value={flatTotal} onChange={v => { setErr(''); setFlatTotal(v) }} unit={T('ريال','SAR')} />
          </div>
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
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '9px 11px', borderRadius: 10, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)' }}>
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
            style={{ height: 30, padding: '0 13px', background: 'transparent', border: '1.3px dashed rgba(212,160,23,.55)', borderRadius: 9, color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span>{T('مجموعة', 'Group')}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        )}
      </div>
      {groups.length > 1 && (
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          {groups.map((gg, i) => {
            const isAct = gg.id === activeId, done2 = isGroupComplete(gg)
            return (
              <button key={gg.id} type="button" onClick={() => setExpanded(new Set([gg.id]))}
                style={{ flex: 1, minWidth: 0, height: 36, border: 'none', background: 'transparent', color: isAct ? C.gold : 'var(--tx4)', fontFamily: F, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 6px', borderBottom: isAct ? `2px solid ${C.gold}` : '2px solid transparent', marginBottom: -1 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{T('المجموعة', 'Group')} {ORD_AR_F[i] || (i + 1)}</span>
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
            <div style={{ position: 'absolute', top: -9, right: 14, background: 'var(--modal-bg)', padding: '0 8px', fontSize: 12, fontWeight: 600, color: C.gold, fontFamily: F }}>{T('المجموعة', 'Group')} {ORD_AR_F[activeIdx] || (activeIdx + 1)}</div>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: isComplete ? '#2ea043' : isOver ? '#c0392b' : C.gold }}>
          <span>{sumF}/{totalVisas}</span><span>·</span><span>{isComplete ? T('مكتمل', 'Done') : isOver ? T('زيادة', 'Over') : T('متبقي', 'Left')}</span>
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
        <button type="button" onClick={() => { setFiles(vPackFiles(groups)); setAutoMode(true); setErr('') }} style={{ border: '1.3px dashed rgba(212,160,23,.55)', borderRadius: 9, color: C.gold, cursor: 'pointer', height: 30, padding: '0 13px', fontSize: 12, fontWeight: 600, fontFamily: F, background: 'transparent' }}>{T('تلقائي', 'Auto')}</button>
        {canAddMore && (
          <button type="button" onClick={addFile} style={{ border: '1.3px dashed rgba(212,160,23,.55)', borderRadius: 9, color: C.gold, cursor: 'pointer', height: 30, padding: '0 13px', fontSize: 12, fontWeight: 600, fontFamily: F, background: 'transparent', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 8px 4px', borderBottom: '1px solid rgba(255,255,255,.05)', background: 'rgba(255,255,255,.02)' }}>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: full ? '#2ea043' : C.gold }}>{T('الملف', 'File')} {ORD_AR[i] || (i + 1)}</span>
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
                    <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,.05)', marginTop: 'auto' }}>
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
  <div style={{ background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
    <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{T('المكتب','Office')}</span>
    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, direction: 'ltr' }}>
      <span style={{ fontSize: 14, color: C.gold, fontWeight: 700, direction: 'ltr', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>{code}</span>
    </span>
  </div>
)

const InvoiceDetailLayout = ({ inv, data, isAr, T, svc, payT, total, paid, remaining, pct, onRecordPayment, onRefund, onCancelInv, onPrint, onEditWorker, onEditService, onEditVisa, onEditClient, onEditAgent, onEditNote, onEditPricing, onEditPayment, onOpenService, canPayPerm = true, canRefundPerm = true, canCancelPerm = true, gmLock = false }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, alignItems: 'flex-start' }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={cardChrome}>
        <div style={cardHeader}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
          <span style={cardTitle}>{T('العميل','Client')}</span>
          {(() => {
            const nat = inv.service_request?.client?.nationality
            if (!nat) return null
            const fl = nat.flag_url
            const em = flagEmoji(nat.code)
            return fl
              ? <img src={fl} alt={nat.name_ar || ''} title={nat.name_ar || ''} style={{ width: 22, height: 16, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />
              : (em ? <span title={nat.name_ar || ''} style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{em}</span> : null)
          })()}
          {!!onEditClient && !!inv.service_request?.client && (
            <button onClick={onEditClient} title={T('تعديل بيانات العميل','Edit client')}
              style={{ marginInlineStart: 'auto', height: 32, padding: '0 14px', borderRadius: 9, background: 'transparent', border: '1px dashed rgba(212,160,23,.5)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <span>{T('تعديل','Edit')}</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </button>
          )}
        </div>
        <div style={{ padding: '16px 22px' }}>
          <ClientRows inv={inv} T={T} />
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
      {(() => {
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
        const worker = realWorker || (workerIsClient ? {
          name_ar: sr.client.name_ar, name_en: sr.client.name_en, phone: sr.client.phone,
          iqama_number: sr.client.id_number, nationality: sr.client.nationality,
        } : null)
        // The worker is editable only for general-bucket services (خدمة عامة …) whose worker is
        // stored in other_applications. Transfer/Ajeer carry their own gov-process facility model,
        // and the client-as-worker case is locked to the client — both stay read-only here.
        const editable = !!onEditWorker && realWorker && realWorker === pick(sr?.other_applications, 'worker')
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
                  style={{ marginInlineStart: 'auto', height: 32, padding: '0 14px', borderRadius: 9, background: 'transparent', border: '1px dashed rgba(212,160,23,.5)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <span>{T('تعديل','Edit')}</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </button>
              )}
            </div>
            <div style={{ padding: '16px 22px' }}>
              <WorkerRows worker={worker} facility={facility} T={T} />
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
      {baseSvcCode(data?.code || inv.service_type?.code) === 'work_visa' ? (() => {
        // تعديل بيانات التأشيرات وتوزيع الملفات والمكتب — متاح للتأشيرة الدائمة فقط (المنشأة تُختار لاحقاً، فالتعديل هنا آمن).
        const rawCode = data?.code || inv.service_type?.code
        const visaEditable = !!onEditVisa && rawCode === 'work_visa_permanent'
        return (
        <div style={cardChrome}>
          <div style={cardHeader}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
            <span style={cardTitle}>{T('الخدمة','Service')}</span>
            {visaEditable && (
              <button onClick={onEditVisa} title={T('تعديل التأشيرات','Edit visas')}
                style={{ marginInlineStart: 'auto', height: 32, padding: '0 14px', borderRadius: 9, background: 'transparent', border: '1px dashed rgba(212,160,23,.5)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <span>{T('تعديل','Edit')}</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              </button>
            )}
          </div>
          <div style={{ padding: '14px 22px' }}>
            <OfficeCodeBox code={inv.branch?.branch_code} T={T} />
            <VisaInfoRows inv={inv} isAr={isAr} T={T} svc={svc} data={data} />
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
        const svcEditable = !!onEditService && !['transfer', 'ajeer', 'iqama_renewal', 'iqama_issuance'].includes(svcCode)
        // سجلّ تعديل الخدمة (من other_applications.details.service_changes) — تغييرات الوصف/المكتب.
        const det0 = Array.isArray(data?.det) ? data.det[0] : null
        const svcChanges = Array.isArray(det0?.details?.service_changes) ? det0.details.service_changes : []
        const SVC_LBL = { description: ['الوصف', 'Description'], office: ['المكتب', 'Office'] }
        return (
          <div style={cardChrome}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
              <span style={cardTitle}>{T('الخدمة','Service')}</span>
              {svcEditable && (
                <button onClick={onEditService} title={T('تعديل الخدمة','Edit service')}
                  style={{ marginInlineStart: 'auto', height: 32, padding: '0 14px', borderRadius: 9, background: 'transparent', border: '1px dashed rgba(212,160,23,.5)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <span>{T('تعديل','Edit')}</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </button>
              )}
            </div>
            <div style={{ padding: '14px 22px' }}>
              <OfficeCodeBox code={inv.branch?.branch_code} T={T} />
              <TransactionRows inv={inv} isAr={isAr} T={T} svc={svc} payT={payT} data={data} />
              <ChangeLog T={T} title={T('سجل تعديل الخدمة', 'Service edit log')} entries={svcChanges}
                actionLabel={T('تم تعديل تفاصيل الخدمة', 'Service details edited')}
                renderDetail={c => <FieldChanges T={T} changes={c.changes} LBL={SVC_LBL} />} />
            </div>
          </div>
        )
      })()}
      <PricingCard breakdown={inv.pricing_breakdown} total={total} paid={paid} remaining={remaining} T={T} onEdit={onEditPricing} log={inv.pricing_log} />
      <div style={cardChrome}>
        <div style={cardHeader}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
          <span style={cardTitle}>{T('الدفعات والمدفوعات','Installments & Payments')}</span>
        </div>
        <InstallmentsWithPayments data={data} breakdown={inv.pricing_breakdown} total={total} paid={paid} remaining={remaining} isAr={isAr} T={T} onEditPayment={onEditPayment} paymentLog={inv.payment_log} />
      </div>
      {baseSvcCode(data?.code || inv.service_type?.code) === 'work_visa' && (() => {
        // بطاقة «المعاملة» (مراحل التنفيذ) أُزيلت من الفاتورة — تفاصيلها تعيش في صفحة الخدمة. نعرض هنا
        // رقماً مرجعياً قابلاً للنقر يفتح طلب الخدمة مباشرة في تبويب معاملات التأشيرة (دائمة/مؤقتة).
        const rawCode = data?.code || inv.service_type?.code || ''
        const srId = inv.service_request?.id
        const refCode = noDash(inv.invoice_no ? inv.invoice_no.replace(/^INV/i, 'TXN') : ['TXN', inv.branch?.branch_code, String(inv.service_request?.request_ref_no || '').slice(-6)].filter(Boolean).join('-'))
        const can = !!(srId && onOpenService)
        return (
          <div style={cardChrome}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
              <span style={cardTitle}>{T('معاملة الخدمة','Service Transaction')}</span>
            </div>
            <button type="button" disabled={!can} onClick={() => { if (can) onOpenService({ srId, svcCode: rawCode }) }}
              title={T('فتح تفاصيل الخدمة ومراحل التنفيذ','Open service details & execution stages')}
              style={{ width: '100%', textAlign: 'start', cursor: can ? 'pointer' : 'default', background: 'transparent', border: 'none', padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 14, fontFamily: F, transition: 'background .15s' }}
              onMouseEnter={e => { if (can) e.currentTarget.style.background = 'rgba(212,160,23,.04)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(212,160,23,.1)', border: '1px solid rgba(212,160,23,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={19} color={C.gold} strokeWidth={1.8} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>{T('الرقم المرجعي للمعاملة','Transaction Reference')}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.gold, direction: 'ltr', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', marginTop: 3, textAlign: 'right' }}>{refCode}</div>
              </div>
              {can && (
                <div style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, color: C.gold, fontSize: 12, fontWeight: 700 }}>
                  <span>{T('تفاصيل الخدمة','Service details')}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </div>
              )}
            </button>
          </div>
        )
      })()}
      {(() => {
        const agent = inv.agent || inv.service_request?.service_request_agents?.[0]?.agent || null
        if (!agent) return null
        const nat = agent.nationality
        const fl = nat?.flag_url
        const em = flagEmoji(nat?.code)
        return (
          <div style={cardChrome}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
              <span style={cardTitle}>{T('الوسيط','Agent')}</span>
              {fl
                ? <img src={fl} alt={nat?.name_ar || ''} title={nat?.name_ar || ''} style={{ width: 22, height: 16, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />
                : (em ? <span title={nat?.name_ar || ''} style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{em}</span> : null)}
              {!!onEditAgent && !!agent.id && (
                <button onClick={onEditAgent} title={T('تعديل بيانات الوسيط','Edit agent')}
                  style={{ marginInlineStart: 'auto', height: 32, padding: '0 14px', borderRadius: 9, background: 'transparent', border: '1px dashed rgba(212,160,23,.5)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <span>{T('تعديل','Edit')}</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </button>
              )}
            </div>
            <div style={{ padding: '16px 22px' }}>
              <BrokerRows agent={agent} T={T} />
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
      {(() => {
        const notePublic = (inv.note_public || '').trim()
        const noteLog = Array.isArray(inv.note_log) ? inv.note_log : []
        // مع زر التعديل تظهر البطاقة دائماً (لإضافة ملاحظة)؛ بدونه تظهر فقط حين توجد ملاحظة أو سجلّ.
        if (!notePublic && !onEditNote && !noteLog.length) return null
        const NOTE_LBL = { note: ['ملاحظة الفاتورة', 'Invoice Note'] }
        return (
          <div style={cardChrome}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
              <span style={cardTitle}>{T('الملاحظات','Notes')}</span>
              {onEditNote && (
                <button onClick={onEditNote} title={T('تعديل الملاحظة','Edit note')}
                  style={{ marginInlineStart: 'auto', height: 32, padding: '0 14px', borderRadius: 9, background: 'transparent', border: '1px dashed rgba(212,160,23,.5)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
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
                <div style={{ background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{T('ملاحظة الفاتورة','Invoice Note')}</span>
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
    </div>
    <div style={{ position: 'sticky', top: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <FinancialSummaryCard inv={inv} data={data} isAr={isAr} T={T} total={total} paid={paid} remaining={remaining} pct={pct} payT={payT} />
      {(() => {
        // Action buttons depend on invoice state: a cancelled invoice exposes none,
        // a fully-paid one hides "record payment", an unpaid one hides "refund".
        const cancelled = inv.status?.code === 'cancelled'
        const canPay = !cancelled && remaining > 0.005 && canPayPerm
        const canRefund = !cancelled && paid > 0.005 && canRefundPerm
        const canCancel = !cancelled && canCancelPerm
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
    </div>
  </div>
)

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
    onMouseEnter={e => { e.currentTarget.style.background = color + '14' }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    style={{ height: 44, padding: '0 14px', borderRadius: 9, background: 'transparent', border: '1px dashed ' + color + '80', color, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: F, fontSize: 12.5, fontWeight: 700, transition: 'background .15s ease' }}
  >
    <span>{label}</span>
    {children}
  </button>
)

const Section = ({ title, children }) => (
  <div style={{ padding: '18px 28px', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
    <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 700, marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' }}>{title}</div>
    {children}
  </div>
)
const CopyBtn = ({ text }) => {
  const [done, setDone] = useState(false)
  if (text == null || text === '') return null
  return (
    <button
      title="نسخ"
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

// Underlined, clickable link to a transfer pricing quote's detail page (تسعيرة التنازل).
const QuoteLink = ({ quote, T }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', alignItems: 'center', minHeight: 28, gap: 10 }}>
    <span style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600 }}>{T('تسعيرة التنازل','Transfer Quote')}</span>
    <button
      onClick={() => { try { window.dispatchEvent(new CustomEvent('app-navigate-transfer-calc', { detail: { q: quote } })) } catch {} }}
      title={T('فتح تفاصيل تسعيرة التنازل','Open transfer quote details')}
      style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: C.gold, fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', direction: 'ltr', textDecoration: 'underline', textUnderlineOffset: 3, transition: 'opacity .15s' }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '.75' }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
    >{noDash(quote)}</button>
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

const selS = { padding: '9px 12px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, color: 'var(--tx1)', fontSize: 13, fontFamily: F, minWidth: 130 }
const btnFilter = (active) => ({ height: 44, padding: '0 16px', borderRadius: 12, background: active ? 'rgba(212,160,23,.12)' : 'rgba(0,0,0,.18)', border: '1px solid ' + (active ? 'rgba(212,160,23,.3)' : 'rgba(255,255,255,.05)'), color: active ? C.gold : 'var(--tx2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F, display: 'flex', alignItems: 'center', gap: 8, boxSizing: 'border-box' })
const btnPg = (disabled) => ({ padding: '8px 16px', background: disabled ? 'rgba(255,255,255,.03)' : 'rgba(212,160,23,.12)', border: '1px solid ' + (disabled ? 'rgba(255,255,255,.06)' : 'rgba(212,160,23,.3)'), borderRadius: 10, color: disabled ? 'var(--tx4)' : C.gold, fontSize: 12, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: F })
