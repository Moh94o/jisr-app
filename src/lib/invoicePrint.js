// ⚠ AUTO-EXTRACTED from InvoicePage.jsx printInvoice() by scripts/extract-invoice-print.mjs.
// Pure JS (no React / no DOM). Returns the full Royal Black & Gold 2-page A4 invoice
// HTML document string. Shared by the React print button and the WhatsApp invoice bot
// (rendered to PDF headlessly via Puppeteer). Keep this the single source of truth for
// the invoice design — edit here, both consumers update.
import { noDash } from './utils.js'
import { TXN_SERVICES } from '../pages/txnServices.js'
import { DONE_INPUTS, SELF_PARTY_DONE_SVCS } from './doneInputs.js'

const C = {
  gold: '#D4A017', goldSoft: '#e8c77a',
  blue: '#5dade2', purple: '#bb8fce', cyan: '#16a085', orange: '#f39c12', gray: '#95a5a6',
  ok: '#2ecc71', warn: '#eab308', red: '#e87265',
}
const fmtPhone = (phone) => {
  if (!phone) return phone
  const s = String(phone).replace(/[^\d]/g, '')
  if (s.startsWith('966') && s.length === 12) return '0' + s.slice(3)
  return s
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
const svcThemeFor = (st) => {
  const t = st?.code && SVC_THEME[st.code]
  if (t) return t
  return { ...SVC_THEME.general, label_ar: st?.value_ar || 'خدمة', label_en: st?.value_en || st?.value_ar || 'Service' }
}
const VISA_SVC_CODES = new Set(['work_visa', 'work_visa_permanent', 'work_visa_temporary'])
const baseSvcCode = (code) => (VISA_SVC_CODES.has(code) ? 'work_visa' : code)

export function buildInvoiceDoc(inv, data, printLang = 'ar') {
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
    borrowerUnifiedNo: { ar: 'الرقم الموحد للمنشأة المستعارة', en: 'Borrower Unified No.', hi: 'उधार प्रतिष्ठान एकीकृत नंबर', ur: 'مستعار ادارے کا متحدہ نمبر', bn: 'ধার প্রতিষ্ঠানের ইউনিফাইড নম্বর' },
    hrsdNo: { ar: 'رقم الموارد', en: 'HRSD No.', hi: 'HRSD नंबर', ur: 'HRSD نمبر', bn: 'HRSD নম্বর' },
    gosiNo: { ar: 'رقم التأمينات', en: 'GOSI No.', hi: 'GOSI नंबर', ur: 'GOSI نمبر', bn: 'GOSI নম্বর' },
    service: { ar: 'الخدمة', en: 'Service', hi: 'सेवा', ur: 'خدمت', bn: 'সেবা' },
    serviceType: { ar: 'نوع الخدمة', en: 'Service Type', hi: 'सेवा का प्रकार', ur: 'خدمت کی قسم', bn: 'সেবার ধরন' },
    description: { ar: 'وصف الخدمة', en: 'Service Description', hi: 'सेवा विवरण', ur: 'خدمت کی تفصیل', bn: 'সেবার বিবরণ' },
    quantity: { ar: 'الكمية', en: 'Quantity', hi: 'मात्रा', ur: 'تعداد', bn: 'পরিমাণ' },
    embassy: { ar: 'السفارة', en: 'Embassy', hi: 'दूतावास', ur: 'سفارت خانہ', bn: 'দূতাবাস' },
    occupation: { ar: 'المهنة', en: 'Occupation', hi: 'पेशा', ur: 'پیشہ', bn: 'পেশা' },
    professional: { ar: 'البيانات المهنية والنقل', en: 'Professional & Transfer', hi: 'पेशेवर एवं स्थानांतरण', ur: 'پیشہ ورانہ و منتقلی', bn: 'পেশাগত ও স্থানান্তর' },
    transferData: { ar: 'النقل', en: 'Transfer', hi: 'स्थानांतरण', ur: 'منتقلی', bn: 'স্থানান্তর' },
    personalInfo: { ar: 'البيانات الرئيسية', en: 'Personal Info', hi: 'मुख्य विवरण', ur: 'بنیادی معلومات', bn: 'মূল তথ্য' },
    birthDate: { ar: 'الميلاد', en: 'Birth Date', hi: 'जन्म', ur: 'پیدائش', bn: 'জন্ম' },
    age: { ar: 'العمر', en: 'Age', hi: 'आयु', ur: 'عمر', bn: 'বয়স' },
    newOccupation: { ar: 'المهنة الجديدة', en: 'New Occupation', hi: 'नया पेशा', ur: 'نیا پیشہ', bn: 'নতুন পেশা' },
    transferTimes: { ar: 'عدد مرات نقل الخدمات', en: 'Transfer Count', hi: 'स्थानांतरण संख्या', ur: 'منتقلی کی تعداد', bn: 'স্থানান্তর সংখ্যা' },
    residentStatus: { ar: 'حالة المقيم', en: 'Resident Status', hi: 'निवासी स्थिति', ur: 'مقیم کی حیثیت', bn: 'বাসিন্দার অবস্থা' },
    expectedIqamaExpiry: { ar: 'تاريخ انتهاء الإقامة المتوقع', en: 'Expected Iqama Expiry', hi: 'अपेक्षित इक़ामा समाप्ति', ur: 'متوقع اقامہ میعاد', bn: 'প্রত্যাশিত ইকামা মেয়াদ' },
    iqamaExpiry: { ar: 'الانتهاء', en: 'Expiry', hi: 'समाप्ति', ur: 'میعاد', bn: 'মেয়াদ' },
    expectedDuration: { ar: 'المدة المتوقعة في الإقامة', en: 'Expected Duration', hi: 'अपेक्षित अवधि', ur: 'متوقع مدت', bn: 'প্রত্যাশিত সময়কাল' },
    notGuaranteed: { ar: 'تقديرية وغير مضمونة', en: 'estimated · not guaranteed', hi: 'अनुमानित · गारंटीकृत नहीं', ur: 'تخمینی · ضمانت نہیں', bn: 'আনুমানিক · নিশ্চিত নয়' },
    notGuaranteedNote: { ar: 'مدة تقديرية غير مضمونة، وقد تختلف عند التنفيذ.', en: 'Estimated duration, not guaranteed and may vary at execution.', hi: 'अनुमानित अवधि, गारंटीकृत नहीं और निष्पादन के समय भिन्न हो सकती है।', ur: 'تخمینی مدت، ضمانت نہیں اور تنفیذ کے وقت مختلف ہو سکتی ہے۔', bn: 'আনুমানিক সময়কাল, নিশ্চিত নয় এবং বাস্তবায়নের সময় ভিন্ন হতে পারে।' },
    currentOccupation: { ar: 'المهنة الحالية', en: 'Current Occupation', hi: 'वर्तमान पेशा', ur: 'موجودہ پیشہ', bn: 'বর্তমান পেশা' },
    noticePeriod: { ar: 'فترة الإشعار', en: 'Notice Period', hi: 'नोटिस अवधि', ur: 'نوٹس مدت', bn: 'নোটিশ পিরিয়ড' },
    employerConsent: { ar: 'موافقة صاحب العمل الحالي', en: 'Current Employer Consent', hi: 'वर्तमान नियोक्ता की सहमति', ur: 'موجودہ آجر کی رضامندی', bn: 'বর্তমান নিয়োগকর্তার সম্মতি' },
    yesV: { ar: 'نعم', en: 'Yes', hi: 'हाँ', ur: 'جی ہاں', bn: 'হ্যাঁ' },
    noV: { ar: 'لا', en: 'No', hi: 'नहीं', ur: 'نہیں', bn: 'না' },
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
    currentIqamaExpiry: { ar: 'انتهاء الإقامة الحالي', en: 'Current Iqama Expiry', hi: 'वर्तमान इक़ामा समाप्ति', ur: 'موجودہ اقامہ میعاد', bn: 'বর্তমান ইকামা মেয়াদ' },
    newExpiry: { ar: 'الانتهاء الجديد', en: 'New Expiry', hi: 'नई समाप्ति', ur: 'نئی میعاد', bn: 'নতুন মেয়াদ' },
    months: { ar: 'شهر', en: 'months', hi: 'माह', ur: 'ماہ', bn: 'মাস' },
    installments: { ar: 'الدفعات', en: 'Installments', hi: 'किस्तें', ur: 'اقساط', bn: 'কিস্তি' },
    payments: { ar: 'المدفوعات', en: 'Payments', hi: 'भुगतान', ur: 'ادائیگیاں', bn: 'পেমেন্ট' },
    paid: { ar: 'المدفوع', en: 'Paid', hi: 'भुगतान किया', ur: 'ادا شدہ', bn: 'পরিশোধিত' },
    remaining: { ar: 'المتبقي', en: 'Remaining', hi: 'शेष', ur: 'باقی', bn: 'বাকি' },
    total: { ar: 'الإجمالي', en: 'Total', hi: 'कुल', ur: 'کल', bn: 'মোট' },
    subtotalInitial: { ar: 'الإجمالي الابتدائي', en: 'Subtotal', hi: 'उप-योग', ur: 'ذیلی کل', bn: 'উপমোট' },
    absherDiscount: { ar: 'خصم أبشر', en: 'Absher Discount', hi: 'अबशर छूट', ur: 'ابشر رعایت', bn: 'আবশের ছাড়' },
    officeDiscount: { ar: 'خصم المكتب', en: 'Office Discount', hi: 'कार्यालय छूट', ur: 'دفتر رعایت', bn: 'অফিস ছাড়' },
    finalTotal: { ar: 'الإجمالي النهائي', en: 'Final Total', hi: 'अंतिम कुल', ur: 'حتمی کل', bn: 'চূড়ান্ত মোট' },
    refund: { ar: 'استرجاع', en: 'Refund', hi: 'वापसी', ur: 'واپسی', bn: 'ফেরত' },
    singlePayment: { ar: 'دفعة واحدة', en: 'Single Payment', hi: 'एकमुश्त भुगतान', ur: 'یکمشت ادائیگی', bn: 'একক পেমেন্ট' },
    payment: { ar: 'دفعة', en: 'Installment', hi: 'किस्त', ur: 'قسط', bn: 'কিস্তি' },
    note: { ar: 'ملاحظة', en: 'Note', hi: 'टिप्पणी', ur: 'نوٹ', bn: 'নোট' },
    stPaid: { ar: 'مدفوعة', en: 'PAID', hi: 'भुगतान किया', ur: 'ادا شدہ', bn: 'পরিশোধিত' },
    stPartial: { ar: 'مدفوعة جزئياً', en: 'PARTIAL', hi: 'आंशिक', ur: 'جزوی', bn: 'আংশিক' },
    stUnpaid: { ar: 'غير مدفوعة', en: 'UNPAID', hi: 'अदत्त', ur: 'غیر ادا شدہ', bn: 'অপরিশোধিত' },
    cancelled: { ar: 'ملغاة', en: 'CANCELLED', hi: 'रद्द', ur: 'منسوخ', bn: 'বাতিল' },
    fullyPaid: { ar: 'مدفوعة بالكامل', en: 'PAID IN FULL', hi: 'पूर्ण भुगतान', ur: 'مکمل ادا شدہ', bn: 'সম্পূর্ণ পরিশোধিত' },
    mVisaIssue: { ar: 'إصدار التأشيرة', en: 'Visa Issuance', hi: 'वीज़ा जारी', ur: 'ویزا اجراء', bn: 'ভিসা ইস্যু' },
    mWakalah: { ar: 'الوكالة', en: 'Wakalah', hi: 'वकालह', ur: 'وکالہ', bn: 'ওয়াকালাহ' },
    mIqamaIssue: { ar: 'إصدار الإقامة', en: 'Iqama Issuance', hi: 'इक़ामा जारी', ur: 'اقامہ اجراء', bn: 'ইকামা ইস্যু' },
    tagIqamaIssued: { ar: 'تم إصدار الإقامة', en: 'Iqama issued', hi: 'इक़ामा जारी', ur: 'اقامہ جاری', bn: 'ইকামা ইস্যু হয়েছে' },
    tagVisaIssued: { ar: 'تم إصدار التأشيرة', en: 'Visa issued', hi: 'वीज़ा जारी', ur: 'ویزا جاری', bn: 'ভিসা ইস্যু হয়েছে' },
    tagPending: { ar: 'جديد', en: 'New', hi: 'नया', ur: 'نیا', bn: 'নতুন' },
    iqamaNo: { ar: 'رقم الإقامة', en: 'Iqama No', hi: 'इक़ामा नं', ur: 'اقامہ نمبر', bn: 'ইকামা নং' },
    iqamaExp: { ar: 'انتهاء الإقامة', en: 'Iqama Expiry', hi: 'इक़ामा समाप्ति', ur: 'اقامہ میعاد', bn: 'ইকামা মেয়াদ' },
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
    remaining: { ar: 'المتبقي', en: 'Remaining', hi: 'शेष', ur: 'باقی', bn: 'বাকি' },
    noPayments: { ar: 'لا توجد مدفوعات مستلمة بعد', en: 'No payments received yet', hi: 'अभी तक कोई भुगतान नहीं', ur: 'ابھی کوئی ادائیگی موصول نہیں', bn: 'এখনও কোনো পেমেন্ট নেই' },
    parties: { ar: 'الأطراف', en: 'Parties', hi: 'पक्ष', ur: 'فریقین', bn: 'পক্ষসমূহ' },
    clientData: { ar: 'العميل', en: 'Client', hi: 'ग्राहक', ur: 'کلائنٹ', bn: 'ক্লায়েন্ট' },
    clientWorkerData: { ar: 'العميل والعامل', en: 'Client & Worker', hi: 'ग्राहक एवं कर्मचारी', ur: 'کلائنٹ اور ملازم', bn: 'ক্লায়েন্ট ও কর্মী' },
    workerData: { ar: 'العامل', en: 'Worker', hi: 'कर्मचारी', ur: 'ملازم', bn: 'কর্মী' },
    establishment: { ar: 'بيانات المنشأة', en: 'Establishment', hi: 'प्रतिष्ठान', ur: 'ادارہ', bn: 'প্রতিষ্ঠান' },
    establishmentTitle: { ar: 'المنشأة', en: 'Establishment', hi: 'प्रतिष्ठान', ur: 'ادارہ', bn: 'প্রতিষ্ঠান' },
    workerEstTitle: { ar: 'العامل والمنشأة', en: 'Worker & Establishment', hi: 'कर्मचारी एवं प्रतिष्ठान', ur: 'ملازم اور ادارہ', bn: 'কর্মী ও প্রতিষ্ঠান' },
    agentData: { ar: 'الوسيط', en: 'Agent', hi: 'एजेंट', ur: 'ایجنٹ', bn: 'এজেন্ট' },
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
    serviceDetails: { ar: 'الخدمة', en: 'Service', hi: 'सेवा', ur: 'خدمت', bn: 'সেবা' },
    unpaidSalariesMonths: { ar: 'أشهر الرواتب غير المدفوعة', en: 'Unpaid salary months', hi: 'अवैतनिक वेतन माह', ur: 'غیر ادا شدہ تنخواہ ماہ', bn: 'অপরিশোধিত বেতনের মাস' },
    totalSalaries: { ar: 'إجمالي الرواتب', en: 'Total Salaries', hi: 'कुल वेतन', ur: 'کل تنخواہیں', bn: 'মোট বেতন' },
    zeroInvoice: { ar: 'فاتورة صفرية', en: 'Zero Invoice', hi: 'शून्य चालान', ur: 'صفر انوائس', bn: 'শূন্য চালান' },
    stNew: { ar: 'جديد', en: 'New', hi: 'नया', ur: 'نیا', bn: 'নতুন' },
    stInProgress: { ar: 'قيد التنفيذ', en: 'In Progress', hi: 'प्रगति में', ur: 'جاری', bn: 'চলমান' },
    stDone: { ar: 'منجز', en: 'Completed', hi: 'पूर्ण', ur: 'مکمل', bn: 'সম্পন্ন' },
    stCancelled: { ar: 'ملغي', en: 'Cancelled', hi: 'रद्द', ur: 'منسوخ', bn: 'বাতিল' },
    stAwaitingAcct: { ar: 'في انتظار موافقة المحاسب', en: 'Awaiting accountant approval', hi: 'लेखाकार स्वीकृति प्रतीक्षित', ur: 'اکاؤنٹنٹ کی منظوری کا انتظار', bn: 'অ্যাকাউন্ট্যান্ট অনুমোদনের অপেক্ষায়' },
    stAcctApproved: { ar: 'تمت الموافقة من المحاسب', en: 'Approved by accountant', hi: 'लेखाकार द्वारा स्वीकृत', ur: 'اکاؤنٹنٹ کی جانب سے منظور', bn: 'অ্যাকাউন্ট্যান্ট কর্তৃক অনুমোদিত' },
    stAcctRejected: { ar: 'تم الإلغاء من المحاسب', en: 'Rejected by accountant', hi: 'लेखाकार द्वारा अस्वीकृत', ur: 'اکاؤنٹنٹ کی جانب سے مسترد', bn: 'অ্যাকাউন্ট্যান্ট কর্তৃক প্রত্যাখ্যাত' },
    // وسوم مرحلتي النقل الخارجي (تطابق الشاشة): المحاسب · المعاملة + نصوص مختصرة.
    phaseAccountant: { ar: 'المحاسب', en: 'Accountant', hi: 'लेखाकार', ur: 'اکاؤنٹنٹ', bn: 'অ্যাকাউন্ট্যান্ট' },
    phaseTransaction: { ar: 'المعاملة', en: 'Transaction', hi: 'लेन-देन', ur: 'ٹرانزیکشن', bn: 'লেনদেন' },
    stApprovedShort: { ar: 'تمت الموافقة', en: 'Approved', hi: 'स्वीकृत', ur: 'منظور', bn: 'অনুমোদিত' },
    stRejectedShort: { ar: 'تم الرفض', en: 'Rejected', hi: 'अस्वीकृत', ur: 'مسترد', bn: 'প্রত্যাখ্যাত' },
    stCompletedShort: { ar: 'منجزة', en: 'Completed', hi: 'पूर्ण', ur: 'مکمل', bn: 'সম্পন্ন' },
    stCancelledShort: { ar: 'ملغاة', en: 'Cancelled', hi: 'रद्द', ur: 'منسوخ', bn: 'বাতিল' },
    stPendingShort: { ar: 'بالانتظار', en: 'Pending', hi: 'लंबित', ur: 'زیر التواء', bn: 'অপেক্ষমাণ' },
    stSkippedShort: { ar: 'لا يحتاج', en: 'Not Needed', hi: 'आवश्यक नहीं', ur: 'ضرورت نہیں', bn: 'প্রয়োজন নেই' },
    insCompanyLbl: { ar: 'شركة التأمين', en: 'Insurance Co.', hi: 'बीमा कंपनी', ur: 'انشورنس کمپنی', bn: 'বীমা কোম্পানি' },
    insPolicyLbl: { ar: 'رقم البوليصة', en: 'Policy No', hi: 'पॉलिसी नं', ur: 'پالیسی نمبر', bn: 'পলিসি নং' },
    // وسوم مراحل نقل الكفالة في قسم «المعاملة» بالطباعة (التأمين · رخصة العمل · الإقامة تعيد استخدام مفتاح iqama).
    stgTransfer: { ar: 'النقل', en: 'Transfer', hi: 'स्थानांतरण', ur: 'منتقلی', bn: 'স্থানান্তর' },
    stgInsurance: { ar: 'التأمين', en: 'Insurance', hi: 'बीमा', ur: 'انشورنس', bn: 'বীমা' },
    stgWorkPermit: { ar: 'رخصة العمل', en: 'Work Permit', hi: 'वर्क परमिट', ur: 'ورک پرمٹ', bn: 'ওয়ার্ক পারমিট' },
    // قسم «المعاملة» في الطباعة (للخدمات الصفرية): الحالة + بيانات الإنجاز/الموافقة.
    transactionSec: { ar: 'المعاملة', en: 'Transaction', hi: 'लेन-देन', ur: 'ٹرانزیکشن', bn: 'লেনদেন' },
    txnBy: { ar: 'بواسطة', en: 'By', hi: 'द्वारा', ur: 'بذریعہ', bn: 'দ্বারা' },
    txnDate: { ar: 'التاريخ', en: 'Date', hi: 'तारीख', ur: 'تاریخ', bn: 'তারিখ' },
    transferCompanyNo: { ar: 'الرقم الموحد للشركة الناقلة', en: 'Transferring company no', hi: 'स्थानांतरण कंपनी संख्या', ur: 'منتقل کرنے والی کمپنی نمبر', bn: 'স্থানান্তর কোম্পানি নম্বর' },
    managerName: { ar: 'اسم المدير', en: 'Manager name', hi: 'प्रबंधक का नाम', ur: 'منیجر کا نام', bn: 'ম্যানেজারের নাম' },
    accountantNote: { ar: 'ملاحظة المحاسب', en: 'Accountant note', hi: 'लेखाकार टिप्पणी', ur: 'اکاؤنٹنٹ نوٹ', bn: 'অ্যাকাউন্ট্যান্ট নোট' },
    completionNote: { ar: 'ملاحظة الإنجاز', en: 'Completion note', hi: 'पूर्णता टिप्पणी', ur: 'تکمیل نوٹ', bn: 'সম্পন্নের নোট' },
    cancelNote: { ar: 'سبب الإلغاء', en: 'Cancellation reason', hi: 'रद्द करने का कारण', ur: 'منسوخی کی وجہ', bn: 'বাতিলের কারণ' },
    iqamaReceivedDate: { ar: 'تاريخ استلام الإقامة', en: 'Iqama Receipt Date', hi: 'इक़ामा प्राप्ति तिथि', ur: 'اقامہ وصولی کی تاریخ', bn: 'ইকামা প্রাপ্তির তারিখ' },
    iqamaPhotoLabel: { ar: 'صورة الإقامة', en: 'Iqama Photo', hi: 'इक़ामा फोटो', ur: 'اقامہ کی تصویر', bn: 'ইকামা ছবি' },
    attachedYes: { ar: 'مرفقة', en: 'Attached', hi: 'संलग्न', ur: 'منسلک', bn: 'সংযুক্ত' },
    salaryPhase: { ar: 'المرحلة', en: 'Phase', hi: 'चरण', ur: 'مرحلہ', bn: 'পর্যায়' },
    salaryAwaitingReturn: { ar: 'بانتظار إرجاع الراتب الأساسي', en: 'Awaiting base-salary return', hi: 'मूल वेतन वापसी की प्रतीक्षा', ur: 'بنیادی تنخواہ کی واپسی کا انتظار', bn: 'মূল বেতন ফেরতের অপেক্ষায়' },
    salaryReturned: { ar: 'تم إرجاع الراتب الأساسي', en: 'Base salary returned', hi: 'मूल वेतन वापस किया गया', ur: 'بنیادی تنخواہ واپس کر دی گئی', bn: 'মূল বেতন ফেরত দেওয়া হয়েছে' },
    salaryReturnDate: { ar: 'تاريخ إرجاع الراتب', en: 'Salary Return Date', hi: 'वेतन वापसी तिथि', ur: 'تنخواہ واپسی کی تاریخ', bn: 'বেতন ফেরতের তারিখ' },
    baseSalary: { ar: 'الراتب الأساسي', en: 'Base Salary', hi: 'मूल वेतन', ur: 'بنیادی تنخواہ', bn: 'মূল বেতন' },
    baseSalaryScreenshot: { ar: 'صورة شاشة الراتب الأساسي', en: 'Base-salary screenshot', hi: 'मूल वेतन स्क्रीनशॉट', ur: 'بنیادی تنخواہ اسکرین شاٹ', bn: 'মূল বেতন স্ক্রিনশট' },
    newSalaryScreenshot: { ar: 'صورة شاشة الراتب الجديد', en: 'New-salary screenshot', hi: 'नया वेतन स्क्रीनशॉट', ur: 'نئی تنخواہ اسکرین شاٹ', bn: 'নতুন বেতন স্ক্রিনশট' },
    phaseSalaryEdit: { ar: 'تعديل الراتب', en: 'Salary Edit', hi: 'वेतन संशोधन', ur: 'تنخواہ ترمیم', bn: 'বেতন সম্পাদনা' },
    phaseSalaryReturn: { ar: 'إرجاع الراتب', en: 'Salary Return', hi: 'वेतन वापसी', ur: 'تنخواہ واپسی', bn: 'বেতন ফেরত' },
    salaryEditedNew: { ar: 'تم التعديل للراتب الجديد', en: 'Changed to new salary', hi: 'नए वेतन में बदला', ur: 'نئی تنخواہ پر تبدیل', bn: 'নতুন বেতনে পরিবর্তিত' },
    zeroInvoiceNote: { ar: 'لا توجد مبالغ مستحقة — هذه الفاتورة للتوثيق وحفظ بيانات الطلب فقط', en: 'No amount due — this invoice documents the request only', hi: 'कोई राशि देय नहीं — यह चालान केवल अनुरोध के दस्तावेज़ हेतु है', ur: 'کوئی رقم واجب الادا نہیں — یہ انوائس صرف درخواست کے ریکارڈ کے لیے ہے', bn: 'কোনো বকেয়া নেই — এই চালান শুধু অনুরোধের নথির জন্য' },
    operation: { ar: 'العملية', en: 'Operation', hi: 'संक्रिया', ur: 'عمل', bn: 'অপারেশন' },
    opIssue: { ar: 'إصدار', en: 'Issuance', hi: 'जारी करना', ur: 'اجرا', bn: 'ইস্যু' },
    opExtend: { ar: 'تمديد', en: 'Extension', hi: 'विस्तार', ur: 'توسیع', bn: 'এক্সটেনশন' },
    vtSingle: { ar: 'مفردة', en: 'Single', hi: 'एकल', ur: 'واحد', bn: 'একক' },
    vtMultiple: { ar: 'متعددة', en: 'Multiple', hi: 'बहु', ur: 'متعدد', bn: 'একাধিক' },
    exitReentryShort: { ar: 'خروج وعودة', en: 'Exit / Re-entry', hi: 'निकास / पुनः प्रवेश', ur: 'خروج و واپسی', bn: 'এক্সিট / রি-এন্ট্রি' },
    visaNo: { ar: 'رقم التأشيرة', en: 'Visa No', hi: 'वीज़ा नं', ur: 'ویزا نمبر', bn: 'ভিসা নং' },
    officeFee: { ar: 'رسوم المكتب (تشمل رسوم السجل التجاري وقوى ومقيم والغرفة التجارية والسعودة)', en: 'Office Fee (incl. Commercial Registration, Qiwa, Muqeem, Chamber of Commerce & Saudization)', hi: 'कार्यालय शुल्क (वाणिज्यिक रजिस्टर, क़िवा, मुक़ीम, वाणिज्य चैंबर और सऊदीकरण शुल्क सहित)', ur: 'دفتر فیس (تجارتی رجسٹریشن، قوی، مقیم، چیمبر آف کامرس اور سعودائزیشن کی فیسوں سمیت)', bn: 'অফিস ফি (বাণিজ্যিক রেজিস্ট্রেশন, কিওয়া, মুকিম, চেম্বার অফ কমার্স ও সৌদিকরণ ফি সহ)' },
    officeFeeSaudization: { ar: 'رسوم المكتب (تشمل السعودة)', en: 'Office Fee (incl. Saudization)', hi: 'कार्यालय शुल्क (सऊदीकरण सहित)', ur: 'دفتر فیس (سعودائزیشن سمیت)', bn: 'অফিস ফি (সৌদিকরণ সহ)' },
    officeFeeShort: { ar: 'رسوم المكتب', en: 'Office Fee', hi: 'कार्यालय शुल्क', ur: 'دفتر فیس', bn: 'অফিস ফি' },
    professionChangeFee: { ar: 'رسم تغيير المهنة', en: 'Occupation Change Fee', hi: 'पेशा परिवर्तन शुल्क', ur: 'پیشہ تبدیلی فیس', bn: 'পেশা পরিবর্তন ফি' },
    salaryAdjFee: { ar: 'رسم تعديل الراتب', en: 'Salary Adjustment Fee', hi: 'वेतन समायोजन शुल्क', ur: 'تنخواہ ایڈجسٹمنٹ فیس', bn: 'বেতন সমন্বয় ফি' },
    contractFee: { ar: 'رسوم العقد', en: 'Contract Fee', hi: 'अनुबंध शुल्क', ur: 'معاہدہ فیس', bn: 'চুক্তি ফি' },
    transferFee: { ar: 'رسوم نقل الكفالة', en: 'Sponsorship Transfer', hi: 'प्रायोजन स्थानांतरण', ur: 'کفالہ منتقلی', bn: 'স্পনসরশিপ স্থানান্তর' },
    iqamaRenewal: { ar: 'تجديد الإقامة', en: 'Iqama Renewal', hi: 'इक़ामा नवीनीकरण', ur: 'اقامہ تجدید', bn: 'ইকামা নবায়ন' },
    workPermit: { ar: 'رخصة العمل', en: 'Work Permit', hi: 'कार्य परमिट', ur: 'ورک پرمٹ', bn: 'ওয়ার্ক পারমিট' },
    iqamaPrintFee: { ar: 'طباعة الإقامة', en: 'Iqama Print', hi: 'इक़ामा प्रिंट', ur: 'اقامہ پرنٹ', bn: 'ইকামা প্রিন্ট' },
    medicalIns: { ar: 'التأمين الطبي', en: 'Medical Insurance', hi: 'चिकित्सा बीमा', ur: 'طبی بیمہ', bn: 'চিকিৎসা বীমা' },
    lateFine: { ar: 'غرامة الإقامة', en: 'Iqama Late Fine', hi: 'इक़ामा विलंब जुर्माना', ur: 'تاخیر جرمانہ', bn: 'বিলম্ব জরিমানা' },
    saudizationFactor: { ar: 'معامل السعودة', en: 'Saudization Factor', hi: 'सऊदीकरण कारक', ur: 'سعودائزیشن عنصر', bn: 'সৌদিকরণ গুণক' },
    certType: { ar: 'نوع التصديق', en: 'Certification Type', hi: 'प्रमाणन प्रकार', ur: 'تصدیق کی قسم', bn: 'সত্যায়ন ধরন' },
    chamberPrinted: { ar: 'تصديق مطبوعات', en: 'Printed Certification', hi: 'मुद्रित प्रमाणन', ur: 'مطبوعہ تصدیق', bn: 'মুদ্রিত সত্যায়ন' },
    chamberOpen: { ar: 'طلب مفتوح', en: 'Open Request', hi: 'खुला अनुरोध', ur: 'کھلی درخواست', bn: 'উন্মুক্ত অনুরোধ' },
    chamberOpenCert: { ar: 'تصديق طلب مفتوح', en: 'Open Request Certification', hi: 'खुला अनुरोध प्रमाणन', ur: 'کھلی درخواست کی تصدیق', bn: 'উন্মুক্ত অনুরোধ সত্যায়ন' },
    requestText: { ar: 'نص الطلب', en: 'Request Text', hi: 'अनुरोध पाठ', ur: 'درخواست متن', bn: 'অনুরোধের বিবরণ' },
    printReason: { ar: 'سبب طلب الطباعة', en: 'Print Reason', hi: 'प्रिंट कारण', ur: 'پرنٹ کی وجہ', bn: 'প্রিন্টের কারণ' },
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
  // المهنة تُخزَّن كاسم عربي نصّي (تغيير المهنة) — نترجمها للإنجليزية عبر خريطة occMap المُمرّرة مع البيانات.
  const occMap = (data && data.occMap) || {}
  const occTr = v => { const s = String(v || ''); return (printLang !== 'ar' && printLang !== 'ur' && occMap[s]) ? occMap[s] : s }
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
  // خدمة الغرفة التجارية (code === 'other') — الطرف يُعرض كـ«بيانات العميل والعامل» مع رقم الجوال.
  const isChamber = code === 'other'
  // رقم جوال العامل المُدخل في هذه الفاتورة (other_applications.worker_phone) — يُطبّع لصيغة 966… كبقية الأرقام.
  const otherApp0 = Array.isArray(sr.other_applications) ? sr.other_applications[0] : sr.other_applications
  const spApp0 = Array.isArray(sr.supplier_payroll_applications) ? sr.supplier_payroll_applications[0] : sr.supplier_payroll_applications
  const invWorkerPhone = (() => { const d = String(otherApp0?.worker_phone || spApp0?.worker_phone || '').replace(/\D/g, ''); return d ? (d.startsWith('966') ? d : '966' + d.slice(-9)) : null })()
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
  // فواتير نقل الكفالة: نبني البنود من حسبة التنازل مباشرة (لا حساب في الفاتورة) — كل قيمة من الحسبة كما هي.
  const tcB = (code === 'transfer' && data?.tc) ? data.tc : null
  const breakdown = tcB
    ? [
        ['رسوم نقل الكفالة', tcB.transfer_fee],
        ['تجديد الإقامة', tcB.iqama_renewal_fee],
        ['رخصة العمل', tcB.work_permit_fee],
        ['رسم تغيير المهنة', tcB.prof_change_fee],
        ['التأمين الطبي', tcB.medical_fee],
        ['غرامة الإقامة', tcB.late_fine_amount],
        ...(Array.isArray(tcB.extras) ? tcB.extras.map(e => [e?.name || '', e?.amount]) : []),
        ['رسوم المكتب', tcB.office_fee],
      ].filter(([, amt]) => Number(amt) > 0).map(([label, amount]) => ({ label, amount: Number(amount) }))
    : (Array.isArray(inv.pricing_breakdown) ? inv.pricing_breakdown : [])
  const officeAccts = data?.officeAccounts || []

  // ============================================================
  //  Royal Black & Gold — 2-page invoice document (live data)
  //  Chosen design; replaces the legacy gold/cream template above.
  // ============================================================
  const curTxt = printLang === 'ar' ? 'ريال' : printLang === 'ur' ? 'ریال' : 'SAR'
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
  // الترتيب مهم: نُقدّم نص الملاحظة (توكيل/إقامة/تأشيرة) على رابط التأشيرة، لأن دفعة التوكيل في المؤقتة
  // مرتبطة بتأشيرة أيضاً — فلو فحصنا الرابط أولاً لظهرت «إقامة» بدل «الوكالة».
  const milestoneKeyFor = (it) => {
    const note = it.notes || ''
    if (/توكيل|تفويض|wakal|authoriz/i.test(note)) return 'mWakalah'
    if (/إقامة|اقامة|iqama|residence/i.test(note)) return 'mIqamaIssue'
    if (/تأشيرة|visa/i.test(note)) return 'mVisaIssue'
    if (it.visa_application_id) return 'mIqamaIssue'   // احتياط: دفعة لكل تأشيرة بلا ملاحظة واضحة
    return null
  }
  const isStagedVisa = code === 'work_visa_permanent' || code === 'work_visa_temporary'
  const milestoneOf = (it, i) => {
    const ord = it.installment_order || (i + 1)
    const k = isStagedVisa ? milestoneKeyFor(it) : null
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
        <div class="hero-eyebrow">${lab(heroIsRefund ? 'refund' : 'lastPayment')} <span class="star">★</span></div>
        ${lastPay
      ? `<div class="hero-amount"><span class="val">${num2(nm(Math.abs(Number(lastPay.amount || 0))))}</span><span class="cur">${curTxt}</span></div>${heroAgainst ? `<div class="hero-sub">${lab('against')} <b>${esc(heroAgainst)}</b></div>` : ''}`
      : `<div class="hero-amount"><span class="val" style="font-size:32px">—</span></div><div class="hero-sub">${lab('noPayments')}</div>`}
      </div>
      <div class="hero-side">
        ${lastPay ? `<div class="hero-fact"><div class="k">${lab('date')}</div><div class="v">${num2(fmtD(lastPay.payment_date))}</div></div><div class="hero-fact"><div class="k">${lab('method')}</div><div class="v">${esc(heroMethod)}</div></div>` : ''}
        <div class="hero-fact full"><div class="k">${lab(lastPay ? 'remainingAfter' : 'remaining')}</div><div class="v remain">${num2(nm(remA))} ${cur}</div></div>
      </div>
    </section></div>`

  // ── Office code chip (shown in the header instead of the payment status) ──
  const officeCodeBlk = officeCode ? `<div class="office-code">${lab('branchCode')} <span class="num">${esc(officeCode)}</span></div>` : ''

  // ── Parties (client / worker / establishment / agent) ──
  // الأطراف = العميل + الوسيط فقط؛ العامل والمنشأة يُعرضان تحت الخدمة (بطلب العميل)
  // جوال الطرف: للغرفة التجارية نُفضّل جوال العامل المُدخل بالفاتورة، ثم جوال السجل.
  // عقد أجير (code === 'ajeer') يُعامَل كالغرفة التجارية: الطرف يُعرض كـ«بيانات العميل والعامل» مع رقم الجوال.
  const isAjeer = code === 'ajeer'
  // طباعة الإقامة (code === 'iqama_print') — العامل هو الطرف نفسه؛ يُعرض كـ«بيانات العميل والعامل» مع رقم الجوال المُدخل بالفاتورة.
  const isIqamaPrint = code === 'iqama_print'
  // تأشيرة خروج وعودة: العميل هو نفس العامل — يُعرض الطرف كـ«بيانات العميل والعامل» مع رقم الجوال.
  const isExitReentry = code === 'exit_reentry_visa'
  // تغيير المهنة: العامل هو الطرف نفسه — يُعرض كـ«بيانات العميل والعامل» مع رقم الجوال المُدخل بالفاتورة (مثل خروج وعودة).
  const isProfessionChange = code === 'profession_change'
  // جوال الطرف: للغرفة التجارية وعقد أجير وطباعة الإقامة وخروج وعودة وتغيير المهنة نُفضّل جوال العامل المُدخل بالفاتورة (other_applications.worker_phone)،
  // ثم جوال سجل العميل/العامل — لأن «العميل هو نفس العامل» يُخزَّن جواله في الفاتورة لا في سجل العميل.
  const clientPhone = ((isChamber || isAjeer || isIqamaPrint || isExitReentry || isProfessionChange || code === 'final_exit_visa' || code === 'medical_insurance' || code === 'supplier_payroll' || code === 'documents' || code === 'external_transfer_approval') ? invWorkerPhone : null) || (client && client.phone) || ''
  // طباعة الإقامة/التأمين/تغيير المهنة/تعديل الراتب: الطرف هو العامل نفسه — العنوان «العامل» فقط.
  const clientHdr = SELF_PARTY_DONE_SVCS.includes(code) ? 'workerData'
    : (workerIsClient || ((isChamber || isAjeer) && !distinctWorker) || isExitReentry) ? 'clientWorkerData' : 'clientData'
  // كرت بيانات العامل ضمن الأطراف (لفواتير نقل الكفالة) — بنفس تنسيق كرت العميل/الوسيط مع العلم في الترويسة.
  const tcParty = (code === 'transfer' && data?.tc && data.tc.worker_name) ? data.tc : null
  let workerPartyCard = ''
  if (tcParty) {
    const wPhoneP = tcParty.phone ? '0' + String(tcParty.phone).replace(/^0+/, '') : ''
    const ageP = (() => { if (!tcParty.dob) return null; const b = new Date(tcParty.dob); if (isNaN(b)) return null; const t = new Date(); let a = t.getFullYear() - b.getFullYear(); const mo = t.getMonth() - b.getMonth(); if (mo < 0 || (mo === 0 && t.getDate() < b.getDate())) a--; return a >= 0 ? a : null })()
    const natObjP = { flag_url: tcParty.nationality_flag, name_ar: tcParty.nationality, name_en: tcParty.nationality }
    workerPartyCard = `<div class="card full"><h4>${lab('workerData')}${natBadge(natObjP)}</h4>${kvRow(lab('name'), esc(tcParty.worker_name), true)}${tcParty.iqama_number ? kvRow(lab('iqama'), num2(tcParty.iqama_number)) : ''}${tcParty.iqama_expiry_gregorian ? kvRow(lab('iqamaExpiry'), num2(fmtD(tcParty.iqama_expiry_gregorian))) : ''}${tcParty.dob ? kvRow(lab('birthDate'), `<span style="display:inline-flex;align-items:baseline;gap:5px;direction:ltr">${num2(fmtD(tcParty.dob))}${ageP != null ? ` <span style="color:var(--ink-soft)">(${num2(ageP)})</span>` : ''}</span>`) : ''}${wPhoneP ? kvRow(lab('phone'), num2(wPhoneP)) : ''}</div>`
  }
  const clientCard = `<div class="card${agent ? '' : ' full'}"><h4>${lab(clientHdr)}${natBadge(client && client.nationality)}</h4>${nameBoth(client)}${clientId ? kvRow(isWorker ? lab('iqama') : lab('id'), num2(clientId)) : ''}${clientPhone ? kvRow(lab('phone'), num2(fmtPhone(clientPhone))) : ''}</div>`
  let agentCard = ''
  if (agent) {
    agentCard = `<div class="card"><h4>${lab('agentData')}${natBadge(agent.nationality)}</h4>${kvRow(lab('name'), esc(personName(agent)), true)}${agent.id_number ? kvRow(lab('id'), num2(agent.id_number)) : ''}${agent.phone ? kvRow(lab('phone'), num2(fmtPhone(agent.phone))) : ''}</div>`
  }
  const partiesBlk = secTitle('parties') + `<div class="cards">${clientCard}${agentCard}${workerPartyCard}</div>`

  let workerCard = ''
  if (distinctWorker) {
    const w = distinctWorker
    // تجديد الإقامة: تاريخ انتهاء الإقامة الحالي يظهر تحت رقم الإقامة في كرت العامل (بدل قسم الخدمة).
    const renewCurExp = (code === 'iqama_renewal' && d0?.current_expire_date) ? kvRow(lab('iqamaExpiry'), num2(fmtD(d0.current_expire_date))) : ''
    workerCard = `<div class="card"><h4>${lab('workerData')}${natBadge(w.nationality)}</h4>${nameBoth(w)}${w.iqama_number ? kvRow(lab('iqama'), num2(w.iqama_number)) : ''}${renewCurExp}${w.phone ? kvRow(lab('phone'), num2(fmtPhone(w.phone))) : ''}${w.occupation ? kvRow(lab('occupation'), esc(localize(w.occupation) || '')) : ''}</div>`
  }
  let estCard = ''
  const estF = facilityFromApp
  if (estF) {
    estCard = `<div class="card${distinctWorker ? '' : ' full'}">${estF.name_ar ? kvRow(lab('facilityName'), esc(estF.name_ar), true) : ''}${kvRow(lab('unifiedNo'), estF.unified_number ? num2(estF.unified_number) : '—')}${estF.hrsd_number ? kvRow(lab('hrsdNo'), num2(estF.hrsd_number)) : ''}${estF.gosi_number ? kvRow(lab('gosiNo'), num2(estF.gosi_number)) : ''}</div>`
  }
  const workerEstBlk = (workerCard || estCard) ? secTitle(workerCard ? 'workerEstTitle' : 'establishmentTitle') + `<div class="cards">${workerCard}${estCard}</div>` : ''

  // ── البيانات المهنية والنقل — لفواتير نقل الكفالة، من الحسبة المرتبطة (نفس كرت طباعة الحسبة) ──
  let profBlk = ''
  if (code === 'transfer' && data?.tc) {
    const tc = data.tc
    // ترجمة قيم حالة المقيم/العامل المحدودة لكل اللغات (نفس خريطة طباعة الحسبة).
    const VAL = {
      'صالح': { en: 'Valid', hi: 'वैध', ur: 'کارآمد', bn: 'বৈধ' },
      'منتهي': { en: 'Expired', hi: 'समाप्त', ur: 'ختم شدہ', bn: 'মেয়াদোত্তীর্ণ' },
      'منتهية': { en: 'Expired', hi: 'समाप्त', ur: 'ختم شدہ', bn: 'মেয়াদোত্তীর্ণ' },
      'تحت الإجراء': { en: 'Under Process', hi: 'प्रक्रियाधीन', ur: 'زیرِ کارروائی', bn: 'প্রক্রিয়াধীন' },
      'على رأس العمل': { en: 'On the Job', hi: 'कार्यरत', ur: 'برسرِ کار', bn: 'কর্মরত' },
      'هروب': { en: 'Absconded', hi: 'फ़रार', ur: 'فرار', bn: 'পলাতক' },
      'تغيب': { en: 'Absent', hi: 'अनुपस्थित', ur: 'غیر حاضر', bn: 'অনুপস্থিত' },
      'متغيب': { en: 'Absent', hi: 'अनुपस्थित', ur: 'غیر حاضر', bn: 'অনুপস্থিত' },
      'خارج المملكة': { en: 'Outside KSA', hi: 'देश से बाहर', ur: 'مملکت سے باہر', bn: 'দেশের বাইরে' },
      'خروج نهائي': { en: 'Final Exit', hi: 'अंतिम प्रस्थान', ur: 'حتمی خروج', bn: 'চূড়ান্ত প্রস্থান' },
      'نقل خدمات': { en: 'Services Transferred', hi: 'सेवाएँ स्थानांतरित', ur: 'خدمات منتقل', bn: 'সেবা স্থানান্তরিত' },
      'نُقلت خدماته': { en: 'Services Transferred', hi: 'सेवाएँ स्थानांतरित', ur: 'خدمات منتقل', bn: 'সেবা স্থানান্তরিত' },
      'موقوف': { en: 'Suspended', hi: 'निलंबित', ur: 'معطل', bn: 'স্থগিত' },
    }
    const tVal = v => { const s = String(v || '').trim(); if (!s) return ''; if (printLang === 'ar') return s; const t = VAL[s]; return (t && t[printLang]) || (t && t.en) || s }
    const residentCombined = [tc.resident_status_ar, tc.hrsd_worker_status].filter(s => s && String(s).trim()).map(tVal).join(' · ')
    // المدة المتوقعة في الإقامة — نفس منطق طباعة الحسبة (أشهر/أيام مع جمع صحيح حسب اللغة).
    const durLabel = (() => {
      const moU = n => printLang === 'ar' ? ((n >= 3 && n <= 10) ? 'أشهر' : 'شهر') : printLang === 'en' ? (n === 1 ? 'month' : 'months') : printLang === 'hi' ? 'माह' : printLang === 'bn' ? 'মাস' : 'ماہ'
      const dyU = n => printLang === 'ar' ? ((n >= 3 && n <= 10) ? 'أيام' : 'يوم') : printLang === 'en' ? (n === 1 ? 'day' : 'days') : printLang === 'hi' ? 'दिन' : printLang === 'bn' ? 'দিন' : 'دن'
      const join = printLang === 'ar' ? ' و ' : ' · '
      const dm = Number(tc.duration_months || 0), dd = Number(tc.duration_days || 0), ed = Number(tc.expected_iqama_days || 0), rm = Number(tc.renewal_months || 0)
      if (dm > 0 || dd > 0) { const p = []; if (dm > 0) p.push(dm + ' ' + moU(dm)); if (dd > 0) p.push(dd + ' ' + dyU(dd)); return p.join(join) }
      if (ed > 0) { const mo = Math.floor(ed / 30), dy = ed % 30; const p = []; if (mo > 0) p.push(mo + ' ' + moU(mo)); if (dy > 0) p.push(dy + ' ' + dyU(dy)); return p.join(join) }
      if (rm > 0) return rm + ' ' + moU(rm)
      return ''
    })()
    const profRows = [
      residentCombined ? kvRow(lab('residentStatus'), esc(residentCombined)) : '',
      (tc.sponsor_changes != null && tc.sponsor_changes !== '') ? kvRow(lab('transferTimes'), num2(String(tc.sponsor_changes))) : '',
      tc.occupation_name_ar ? kvRow(lab('currentOccupation'), esc(tc.occupation_name_ar)) : '',
      (tc.change_profession && tc.new_occupation_name_ar) ? kvRow(lab('newOccupation'), esc(tc.new_occupation_name_ar)) : '',
      typeof tc.has_notice_period === 'boolean' ? kvRow(lab('noticePeriod'), lab(tc.has_notice_period ? 'yesV' : 'noV')) : '',
      typeof tc.employer_consent === 'boolean' ? kvRow(lab('employerConsent'), lab(tc.employer_consent ? 'yesV' : 'noV')) : '',
      (durLabel || tc.expected_expiry_date) ? (
        `<div class="kv" style="border-bottom:0"><span class="k">${lab('expectedDuration')}</span><span class="v">${[durLabel ? esc(durLabel) : '', tc.expected_expiry_date ? `<span style="direction:ltr;font-family:monospace">${num2(fmtD(tc.expected_expiry_date))}</span>` : ''].filter(Boolean).join(' <span style="color:var(--ink-soft)">·</span> ')}</span></div>`
        + `<div style="display:flex;align-items:center;gap:5px;color:var(--warn);font-size:9px;font-weight:600;padding:1px 0 0">⚠ ${lab('notGuaranteedNote')}</div>`
      ) : '',
    ].filter(Boolean).join('')
    // بيانات النقل فقط في صفحة 2 — البيانات الرئيسية للعامل انتقلت إلى قسم «الأطراف» في صفحة 1.
    profBlk = profRows ? secTitle('transferData') + `<div class="card full">${profRows}</div>` : ''
  }

  // ── Service (+ ajeer/iqama/visa specifics) ──
  let svcExtra = ''
  if (code === 'ajeer' && d0) {
    // عقد أجير: حقول الفاتورة من other_applications.details (رقم العقد ومرفق التصريح لا يُطبعان — يُدخَلان في المعاملة).
    const dt = d0.details || {}
    const rows = [
      dt.borrower_700 ? kvRow(lab('borrowerUnifiedNo'), esc(String(dt.borrower_700))) : '',
      dt.city_name ? kvRow(lab('city'), esc(String(dt.city_name))) : '',
      dt.contract_months ? kvRow(lab('duration'), `${num2(dt.contract_months)} ${lab('months')}`) : '',
    ].filter(Boolean).join('')
    if (rows) svcExtra += `<div class="est-grid" style="margin-top:2.5mm">${rows}</div>`
  }
  if (code === 'iqama_renewal' && d0) {
    // «الانتهاء الحالي» نُقل لكرت العامل (تحت رقم الإقامة)؛ هنا يبقى مدة التجديد + الانتهاء الجديد.
    const rows = [
      d0.duration_months ? kvRow(lab('renewalDuration'), `${num2(d0.duration_months)} ${lab('months')}`) : '',
      d0.new_expire_date ? kvRow(lab('newExpiry'), num2(fmtD(d0.new_expire_date))) : '',
    ].filter(Boolean).join('')
    if (rows) svcExtra += `<div class="est-grid" style="margin-top:2.5mm">${rows}</div>`
  }
  if (code === 'iqama_print' && d0?.details?.print_reason) {
    svcExtra += `<div class="est-grid" style="margin-top:2.5mm">${kvRow(lab('printReason'), esc(d0.details.print_reason))}</div>`
  }
  if (code === 'supplier_payroll' && d0) {
    // رواتب سبلاير: عدد أشهر الرواتب غير المدفوعة + إجمالي الرواتب (أعمدة على الجدول المخصّص لا details).
    const rows = [
      (d0.unpaid_salaries_count != null && d0.unpaid_salaries_count !== '') ? kvRow(lab('unpaidSalariesMonths'), `${num2(d0.unpaid_salaries_count)} ${lab('months')}`) : '',
      (d0.total_amount != null && Number(d0.total_amount) > 0) ? kvRow(lab('totalSalaries'), `${num2(nm(d0.total_amount))} ${cur}`) : '',
    ].filter(Boolean).join('')
    if (rows) svcExtra += `<div class="est-grid" style="margin-top:2.5mm">${rows}</div>`
  }
  // ── Registry-driven services (passport_update · final_exit_visa · exit_reentry_visa · تعديل الراتب ·
  // profession_change …) — print their service-specific fields from other_applications.details using the
  // same `detail` config that drives the on-screen detail + صفحة المعاملة. Only `d:`-sourced fields are
  // printed (العامل/المنشأة already print in their own cards); services rendered above are skipped.
  if (!['ajeer', 'other', 'iqama_print', 'iqama_renewal'].includes(code) && !isVisa && d0) {
    const reg = TXN_SERVICES[code]
    if (reg?.detail) {
      const dt = d0.details || {}
      const regLab = f => esc((rtl ? f.l_ar : f.l_en) || f.l_ar || f.l_en || '')
      const rows = reg.detail.map(f => {
        if (!f.src || !f.src.startsWith('d:')) return ''
        // تغيير المهنة: «المهنة الحالية» تُطبع عبر الكتلة المخصّصة أدناه (مع بديل من سجل العامل) — نتجنّب تكرارها هنا.
        if (code === 'profession_change' && f.src === 'd:current_occupation') return ''
        let v = dt[f.src.slice(2)]
        if (v == null || v === '') return ''
        // exit_type (single/multiple) خرائط opts عربية فقط — نترجمها حسب لغة الفاتورة
        if (f.src === 'd:exit_type') v = lab(v === 'multiple' ? 'vtMultiple' : 'vtSingle')
        else if (code === 'profession_change' && f.src === 'd:new_occupation') v = occTr(v)
        else if (f.opts) v = f.opts[v] || v
        if (f.date) return kvRow(regLab(f), num2(fmtD(v)))
        if (f.months && !isNaN(Number(v))) return kvRow(regLab(f), `${num2(v)} ${lab('months')}`)
        if (f.money && !isNaN(Number(v))) return kvRow(regLab(f), `${num2(nm(v))} ${cur}`)
        if (f.suffix) return kvRow(regLab(f), `${num2(v)}${esc(f.suffix)}`)
        if (f.mono) return kvRow(regLab(f), num2(v))
        return kvRow(regLab(f), esc(String(v)))
      }).filter(Boolean)
      // تغيير المهنة: المهنة الحالية (لقطة وقت الطلب من details، أو من سجل العامل كبديل) تُطبع قبل المهنة الجديدة.
      if (code === 'profession_change') {
        const wco = d0.worker && d0.worker.current_occupation
        const cur = (dt.current_occupation ? occTr(dt.current_occupation) : '') || (wco ? (rtl ? wco.name_ar : (wco.name_en || wco.name_ar)) : '')
        if (cur) rows.unshift(kvRow(lab('currentOccupation'), esc(String(cur))))
      }
      // خروج وعودة: نوع العملية (إصدار/تمديد) لا يُحفظ في details — نستنتجه من عنوان بند التسعيرة («تمديد …»).
      if (code === 'exit_reentry_visa') {
        const isExt = (dt.op_mode === 'extend') || breakdown.some(l => String((l && l.label) || '').includes('تمديد'))
        rows.unshift(kvRow(lab('operation'), lab(isExt ? 'opExtend' : 'opIssue')))
        if (isExt && dt.visa_number) rows.push(kvRow(lab('visaNo'), num2(String(dt.visa_number))))
      }
      const rowsHtml = rows.join('')
      if (rowsHtml) svcExtra += `<div class="est-grid" style="margin-top:2.5mm">${rowsHtml}</div>`
    }
  }
  // التأمين الطبي: تاريخ ميلاد العامل وعمره (من سجل العامل) — تُطبع ضمن قسم الخدمة (مطابقة للشاشة). الجوال يظهر في كرت العامل.
  if (code === 'medical_insurance' && client && client.birth_date) {
    const rows = [kvRow(lab('birthDate'), num2(fmtD(client.birth_date)))]
    const b = new Date(client.birth_date)
    if (!isNaN(b)) { const t = new Date(); let a = t.getFullYear() - b.getFullYear(); const mo = t.getMonth() - b.getMonth(); if (mo < 0 || (mo === 0 && t.getDate() < b.getDate())) a--; if (a >= 0) rows.push(kvRow(lab('age'), num2(a))) }
    if (rows.length) svcExtra += `<div class="est-grid" style="margin-top:2.5mm">${rows.join('')}</div>`
  }
  if (isChamber && d0) {
    // تفاصيل خدمة الغرفة التجارية: نوع التصديق (مطبوعات/طلب مفتوح) + نص الطلب — من other_applications.details.
    const sub = d0.details?.chamber_subtype
    const subLbl = sub === 'printed' ? lab('chamberPrinted') : sub === 'open_request' ? lab('chamberOpen') : (sub ? esc(sub) : '')
    const rows = [
      subLbl ? kvRow(lab('certType'), subLbl) : '',
      d0.details?.chamber_text ? kvRow(lab('requestText'), esc(d0.details.chamber_text)) : '',
    ].filter(Boolean).join('')
    if (rows) svcExtra += `<div class="est-grid" style="margin-top:2.5mm">${rows}</div>`
  }
  if (isVisa && det.length === 1 && d0) {
    const rows = [
      d0.main_facility && d0.main_facility.name_ar ? kvRow(lab('facility'), esc(d0.main_facility.name_ar)) : '',
      // ترتيب الطباعة: الرقم الموحّد ← رقم التأشيرة ← رقم الحدود.
      (d0.main_facility && d0.main_facility.unified_number && !d0.unified_number) ? kvRow(lab('unifiedNo'), num2(d0.main_facility.unified_number)) : '',
      // الرقم الموحد للمنشأة (المُدخَل على التأشيرة) قبل رقم التأشيرة ورقم الحدود.
      (d0.file_number == null && d0.unified_number) ? kvRow(lab('unifiedNo'), num2(d0.unified_number)) : '',
      // رقم التأشيرة يظهر داخل بطاقة توزيع الملفات عند وجود ملف — لا نكرّره هنا.
      (d0.file_number == null && d0.visa_number) ? kvRow(lab('visaNo'), num2(d0.visa_number)) : '',
      // رقم الحدود يظهر تحت وصف التأشيرة في بطاقة توزيع الملفات عند وجود ملف — لا نكرّره كحقل هنا.
      (d0.file_number == null && d0.border_number) ? kvRow(lab('borderNo'), num2(d0.border_number)) : '',
      d0.wakalah_number ? kvRow(lab('wakalahNo'), num2(d0.wakalah_number)) : '',
      // المهنة والسفارة تظهران داخل بطاقة توزيع الملفات أدناه — لا نكرّرهما هنا عند وجود ملف.
      (d0.file_number == null && d0.occupation) ? kvRow(lab('occupation'), esc(localize(d0.occupation) || '')) : '',
      (d0.file_number == null && d0.embassy) ? kvRow(lab('embassy'), esc(localize(d0.embassy) || '')) : '',
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
        const fileLbl = fileNos2.length === 1 ? lab('oneFile') : (lab('file') + ' ' + (idx + 1))
        // كرت لكل تأشيرة (تصميم: تاق جانبي + شبكة حقول معنونة): رأس (الجنسية + السفارة/المهنة/الجنس) مع تاق الحالة،
        // ثم اسم العامل، ثم خانات معنونة لكل رقم متوفّر (الحدود/الإقامة/انتهاء الإقامة) — مطابق لتصميم الموقع.
        const entriesHtml = items.map(r => {
          // «تم إصدار الإقامة» = رقم إقامة مُدخَل فعلاً، لا مجرد وجود صف إصدار (يُنشأ عند سداد الدفعة بلا بيانات).
          const iqIssued = !!String((data?.iqamaByVisa || {})[r.id]?.iqama_number || '').trim()
          const stCls = iqIssued ? 'ok' : (r.border_number ? 'visa' : 'pending')
          const stLbl = lab(iqIssued ? 'tagIqamaIssued' : (r.border_number ? 'tagVisaIssued' : 'tagPending'))
          const tag = `<span class="fd-tag ${stCls}"><span class="fd-tdot"></span><span>${esc(stLbl)}</span>${stCls !== 'pending' ? '<span class="fd-tchk">✓</span>' : ''}</span>`
          const nat = natName(r.nationality) || '—'
          const sub = [localize(r.embassy), localize(r.occupation), genLabel(r.gender)].filter(Boolean).join(' · ')
          const iq = (data?.iqamaByVisa || {})[r.id] || null
          const cells = [
            // ترتيب الطباعة: الرقم الموحّد ← رقم التأشيرة ← رقم الحدود.
            r.unified_number ? { k: lab('unifiedNo'), v: num2(r.unified_number) } : null,
            r.visa_number ? { k: lab('visaNo'), v: num2(r.visa_number) } : null,
            r.border_number ? { k: lab('borderNo'), v: num2(r.border_number) } : null,
            iq?.iqama_number ? { k: lab('iqamaNo'), v: num2(iq.iqama_number) } : null,
            iq?.iqama_expiry ? { k: lab('iqamaExp'), v: num2(fmtD(iq.iqama_expiry)) } : null,
          ].filter(Boolean)
          const gridHtml = cells.length ? `<div class="fd-grid" style="grid-template-columns:repeat(${cells.length},1fr)">${cells.map(c => `<div class="fd-cell"><div class="fd-cell-k">${esc(c.k)}</div><div class="fd-cell-v">${c.v}</div></div>`).join('')}</div>` : ''
          return `<div class="fd-v"><div class="fd-vhead"><span class="fd-vname">${esc(nat)}${sub ? ` <span class="fd-vsub">· ${esc(sub)}</span>` : ''}</span>${tag}</div>${r.worker_name ? `<div class="fd-worker"><span class="fd-dot"></span>${esc(r.worker_name)}</div>` : ''}${gridHtml}</div>`
        }).join('')
        return `<div class="fd-file"><div class="fd-flabel">${esc(fileLbl)} <span class="fd-count">${num2(items.length)} ${lab('visas')}</span></div>${entriesHtml}</div>`
      }).join('')
      fileDistBlk = `<div class="fd">${filesHtml2}</div>`
    }
  }
  // خروج وعودة: نعرض اسم الخدمة المترجَم مسبوقاً بشرطة («- تأشيرة خروج وعودة») بدل الوصف العربي المخزّن (المكرّر وغير المترجَم).
  // إن كان الوصف المخزَّن مجرّد اسم الخدمة العربي (لا ملاحظة حرّة)، نعرض اسم الخدمة المترجَم بدلاً من النص العربي المخزَّن.
  const svcAr = svcTheme.label_ar_full || svcTheme.label_ar
  const descIsSvcName = !!(d0 && d0.description && (d0.description === svcAr || d0.description === svcName))
  const descText = code === 'exit_reentry_visa' ? `- ${svcName}` : (descIsSvcName ? svcName : ((d0 && d0.description && d0.description !== svcName) ? d0.description : ''))
  // قسم «الخدمة» يكرّر اسم الخدمة الظاهر كعنوان رئيسي في الصفحة الأولى — يُعرض فقط عند وجود عدد تأشيرات لبيان الكمية، وإلا يُحذف.
  // التأشيرة (دائمة/مؤقتة): الاسم والكمية يظهران أصلاً في العنوان الرئيسي (×العدد)، فالقسم مكرّر بالكامل ويُحذف.
  const serviceBlk = (showQty && code !== 'work_visa_temporary' && code !== 'work_visa_permanent') ? secTitle('service') + `<div class="card full"><div class="service-row"><div><div class="service-name">${esc(svcName || '—')}</div></div><div class="qty-badge"><span class="lbl">${lab('quantity')}</span>${num2(qty)}</div></div></div>` : ''
  // تاغ حالة الطلب — يُعرض في رأس كرت «الخدمة» (جديد · قيد التنفيذ · منجز · ملغي) بألوان الـ pill.
  const reqStatusCode = sr?.status?.code || ''
  const acct = sr?.accountant_status
  // خدمات تمرّ على بوّابة موافقة المحاسب (النقل الخارجي · خروج وعودة · خروج نهائي).
  const needsAcct = !!TXN_SERVICES[baseSvcCode(code)]?.needs_accountant_approval
  // شارة حالة منفردة (حد جانبي + خلفية خفيفة + نقطة + نص بلون الحالة)، مع وسم مرحلة اختياري.
  const statusTag = (t, c, bg, phase, full, endText) =>
    `<span class="status-bar${full ? ' status-bar-full' : ''}" style="border-inline-start:3px solid ${c};background:${bg};color:${c}"><span class="status-dot" style="background:${c}"></span>${phase ? `<span class="phase-chip" style="color:${c}">${phase}</span>` : ''}${t}${endText ? `<span class="status-when">${endText}</span>` : ''}</span>`
  // الخدمات الصفرية (رواتب سبلاير · مستندات · موافقة النقل الخارجي): حالتها وبياناتها في قسم «المعاملة» المستقل.
  const isZeroPrint = code === 'supplier_payroll' || code === 'documents' || code === 'external_transfer_approval' || SELF_PARTY_DONE_SVCS.includes(code)
  const reqStatusTag = (() => {
    // بقية الخدمات: «منجز» (أخضر) · «ملغي» (أحمر) · وإلا «جديد» (أزرق).
    const m = reqStatusCode === 'done' ? { t: lab('stDone'), c: 'var(--ok)', bg: 'var(--ok-bg)' }
      : reqStatusCode === 'cancelled' ? { t: lab('stCancelled'), c: 'var(--no)', bg: 'var(--no-bg)' }
      : { t: lab('stNew'), c: '#185FA5', bg: '#E6F1FB' }
    return statusTag(m.t, m.c, m.bg)
  })()
  // كرت تفاصيل الخدمة — الحالة تُنقل لقسم «المعاملة» في الخدمات الصفرية، فلا تظهر داخل رأس الخدمة.
  const hasSvcDetails = !!(descText || svcExtra.trim() || fileDistBlk.trim())
  // نقل الكفالة وتجديد الإقامة: الحالة تُعرض كمراحل في قسم «المعاملة»، فلا تُكرَّر شارة الحالة في رأس الخدمة.
  // التأشيرات ذات بطاقات توزيع الملفات: كل تأشيرة تحمل تاق حالتها الخاص، فلا نكرّر تاق الحالة المجمّع في الرأس.
  const hideSvcStatusTag = isZeroPrint || code === 'transfer' || code === 'iqama_renewal' || (isVisa && !!fileDistBlk.trim())
  const svcHead = `<div class="svc-head">${descText ? `<span class="desc-text">${esc(descText)}</span>` : '<span></span>'}${hideSvcStatusTag ? '' : reqStatusTag}</div>`
  const svcDetailsInner = svcHead + svcExtra + fileDistBlk
  const svcDetailsBlk = hasSvcDetails ? secTitle('serviceDetails') + `<div class="card full">${svcDetailsInner}</div>` : ''
  // قسم «المعاملة» (للخدمات الصفرية فقط): الحالة + بيانات الموافقة/الإنجاز/الإلغاء — مرحلتان للنقل الخارجي.
  const txnBlk = isZeroPrint ? (() => {
    const dt = d0?.details || {}
    const pname = p => p ? (rtl ? (p.name_ar || p.name_en) : (p.name_en || p.name_ar)) : ''
    const fmtDT = d => { if (!d) return ''; const x = new Date(d); if (isNaN(x)) return ''; return `${fmtD(d)} · ${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}` }
    // التاريخ صار بجانب تاق الحالة (endText) — فلم يعد ضمن صفوف البيانات.
    const metaRows = (person, noteLbl, noteVal, extra = '') => {
      let r = extra
      r += kvRow(lab('txnBy'), esc(pname(person)))
      if (noteVal) r += kvRow(noteLbl, esc(String(noteVal).trim()))
      return r ? `<div class="est-grid" style="margin-top:2.5mm">${r}</div>` : ''
    }
    const whenTxt = d => { const s = fmtDT(d); return s ? num2(s) : '' }
    const RED = '#C0392B', GREEN = '#1E7E34', BLUE = '#0C7FB8', GOLD = '#B8860B'
    let inner = ''
    if (needsAcct) {
      const acctWhen = (acct === 'approved' || acct === 'rejected') ? whenTxt(sr?.accountant_at) : ''
      const acctT = acct === 'approved' ? statusTag(lab('stApprovedShort'), GOLD, 'rgba(212,160,23,.10)', lab('phaseAccountant'), true, acctWhen)
        : acct === 'rejected' ? statusTag(lab('stRejectedShort'), RED, 'rgba(192,57,43,.08)', lab('phaseAccountant'), true, acctWhen)
        : statusTag(lab('stPendingShort'), BLUE, 'rgba(56,189,248,.12)', lab('phaseAccountant'), true)
      inner += `<div>${acctT}</div>`
      if (acct === 'approved' || acct === 'rejected') inner += metaRows(sr?.accountant?.person, lab('accountantNote'), sr?.accountant_note)
      // مرحلة المعاملة لا تظهر إلا بعد موافقة المحاسب.
      if (acct === 'approved') {
        const compWhen = reqStatusCode === 'done' ? whenTxt(sr?.completed_at) : reqStatusCode === 'cancelled' ? whenTxt(sr?.cancelled_at) : ''
        const compT = reqStatusCode === 'done' ? statusTag(lab('stCompletedShort'), GREEN, 'rgba(39,160,70,.10)', lab('phaseTransaction'), true, compWhen)
          : reqStatusCode === 'cancelled' ? statusTag(lab('stCancelledShort'), RED, 'rgba(192,57,43,.08)', lab('phaseTransaction'), true, compWhen)
          : statusTag(lab('stPendingShort'), BLUE, 'rgba(56,189,248,.12)', lab('phaseTransaction'), true)
        inner += `<div style="margin-top:3mm">${compT}</div>`
        if (reqStatusCode === 'done') {
          // النقل الخارجي: الرقم الموحد للشركة الناقلة + اسم المدير.
          let extra = (dt.transfer_company_700 ? kvRow(lab('transferCompanyNo'), num2(dt.transfer_company_700)) : '') + (dt.manager_name ? kvRow(lab('managerName'), esc(dt.manager_name)) : '')
          // مدخلات الإنجاز المُدارة بالسجل (خروج وعودة/نهائي: رقم التأشيرة · انتهاء التأشيرة · مرفق التأشيرة).
          for (const f of (DONE_INPUTS[code] || [])) {
            if (f.type === 'file') { if (data?.doneFilesMap?.[f.key]) extra += kvRow(esc(rtl ? f.label_ar : f.label_en), lab('attachedYes')) }
            else if (dt[f.key] != null && dt[f.key] !== '') {
              const val = f.type === 'date' ? num2(fmtD(dt[f.key])) : (f.money ? `${num2(nm(dt[f.key]))} ${cur}` : esc(String(dt[f.key])))
              extra += kvRow(esc(rtl ? f.label_ar : f.label_en), val)
            }
          }
          inner += metaRows(sr?.completer?.person, lab('completionNote'), sr?.completion_note, extra)
        } else if (reqStatusCode === 'cancelled') {
          inner += metaRows(sr?.canceller?.person, lab('cancelNote'), sr?.cancelled_reason)
        }
      }
    } else if (code === 'name_translation') {
      // تعديل الراتب: مرحلتان منفصلتان — (١) تعديل الراتب للراتب الجديد (ذهبي)، (٢) إرجاع الراتب الأساسي.
      const ph = dt.salary_phase  // undefined | 'awaiting_return' | 'returned'
      const cancelled = reqStatusCode === 'cancelled'
      const mod1Done = reqStatusCode === 'done' || ph === 'awaiting_return' || ph === 'returned'
      // المرحلة ١
      const m1When = mod1Done ? whenTxt(sr?.completed_at) : cancelled ? whenTxt(sr?.cancelled_at) : ''
      const m1Tag = cancelled ? statusTag(lab('stCancelledShort'), RED, 'rgba(192,57,43,.08)', lab('phaseSalaryEdit'), true, m1When)
        : mod1Done ? statusTag(lab('salaryEditedNew'), GOLD, 'rgba(212,160,23,.10)', lab('phaseSalaryEdit'), true, m1When)
        : statusTag(lab('stNew'), BLUE, 'rgba(56,189,248,.12)', lab('phaseSalaryEdit'), true)
      inner += `<div>${m1Tag}</div>`
      if (mod1Done) {
        const ex1 = data?.doneFilesMap?.salary_new_file ? kvRow(lab('newSalaryScreenshot'), lab('attachedYes')) : ''
        inner += metaRows(sr?.completer?.person, lab('completionNote'), sr?.completion_note, ex1)
      } else if (cancelled) {
        inner += metaRows(sr?.canceller?.person, lab('cancelNote'), sr?.cancelled_reason)
      }
      // المرحلة ٢ — تظهر بعد إنجاز المرحلة ١ (غير الملغاة).
      if (mod1Done && !cancelled) {
        const m2When = ph === 'returned' ? whenTxt(dt.salary_returned_at) : ''
        const m2Tag = ph === 'returned' ? statusTag(lab('salaryReturned'), GREEN, 'rgba(39,160,70,.10)', lab('phaseSalaryReturn'), true, m2When)
          : statusTag(lab('salaryAwaitingReturn'), BLUE, 'rgba(56,189,248,.12)', lab('phaseSalaryReturn'), true)
        inner += `<div style="margin-top:3mm">${m2Tag}</div>`
        let ex2 = ''
        if (dt.salary_return_date) ex2 += kvRow(lab('salaryReturnDate'), num2(fmtD(dt.salary_return_date)))
        if (ph === 'returned' && dt.base_salary != null) ex2 += kvRow(lab('baseSalary'), `${num2(nm(dt.base_salary))} ${cur}`)
        if (ph === 'returned' && data?.doneFilesMap?.salary_base_file) ex2 += kvRow(lab('baseSalaryScreenshot'), lab('attachedYes'))
        if (ph === 'returned' && dt.salary_returned_by_name) ex2 += kvRow(lab('txnBy'), esc(String(dt.salary_returned_by_name)))
        if (ex2) inner += `<div class="est-grid" style="margin-top:2.5mm">${ex2}</div>`
      }
    } else {
      const stWhen = reqStatusCode === 'done' ? whenTxt(sr?.completed_at) : reqStatusCode === 'cancelled' ? whenTxt(sr?.cancelled_at) : ''
      const st = reqStatusCode === 'done' ? statusTag(lab('stCompletedShort'), GREEN, 'rgba(39,160,70,.10)', '', true, stWhen)
        : reqStatusCode === 'cancelled' ? statusTag(lab('stCancelledShort'), RED, 'rgba(192,57,43,.08)', '', true, stWhen)
        : statusTag(lab('stNew'), '#185FA5', '#E6F1FB', '', true)
      inner += `<div>${st}</div>`
      if (reqStatusCode === 'done') {
        // مدخلات إنجاز الخدمات المُدارة بالسجل تُطبع ضمن قسم «المعاملة» (قيم نصّية/تاريخية + إشارة «مرفقة» للملفّات).
        let extra = ''
        const inputs = DONE_INPUTS[code] || []
        const dlab = f => esc(rtl ? f.label_ar : f.label_en)
        for (const f of inputs) {
          if (f.type === 'file') { if (data?.doneFilesMap?.[f.key]) extra += kvRow(dlab(f), lab('attachedYes')) }
          else if (dt[f.key] != null && dt[f.key] !== '') {
            // المهنة الجديدة مخزّنة بالعربي — تُترجم للإنجليزية في اللغات غير العربية (مثل بقية أسماء المهن).
            const tv = (code === 'profession_change' && f.key === 'new_occupation') ? occTr(dt[f.key]) : dt[f.key]
            const val = f.type === 'date' ? num2(fmtD(dt[f.key])) : (f.money ? `${num2(nm(dt[f.key]))} ${cur}` : esc(String(tv)))
            extra += kvRow(dlab(f), val)
          }
        }
        inner += metaRows(sr?.completer?.person, lab('completionNote'), sr?.completion_note, extra)
      }
      else if (reqStatusCode === 'cancelled') inner += metaRows(sr?.canceller?.person, lab('cancelNote'), sr?.cancelled_reason)
    }
    return secTitle('transactionSec') + `<div class="card full">${inner}</div>`
  })() : ''

  // قسم «المعاملة» لنقل الكفالة (تحت قسم «النقل»): تاقات مراحل المعاملة (التأمين · رخصة العمل · الإقامة)
  // + حقلا بيانات الإقامة المُدخلة (تاريخ الانتهاء + المهنة). يطابق كرت «حالة المعاملة» في الشاشة.
  const txnTransferBlk = (code === 'transfer' && data?.tc) ? (() => {
    const tc = data.tc
    const sd = (tc.stage_data && typeof tc.stage_data === 'object') ? tc.stage_data : {}
    const transferOnly = !!tc.transfer_only
    const TG = '#1E7E34', TR = '#C0392B', TB = '#0C7FB8' // أخضر منجز · أحمر ملغاة · أزرق بالانتظار
    const stageTag = (phaseLbl, sObj) => {
      if (!sObj) return statusTag(lab('stPendingShort'), TB, 'rgba(56,189,248,.12)', phaseLbl, true)
      if (sObj.status === 'cancelled') return statusTag(lab('stCancelledShort'), TR, 'rgba(192,57,43,.08)', phaseLbl, true)
      return statusTag(lab('stCompletedShort'), TG, 'rgba(39,160,70,.10)', phaseLbl, true)
    }
    const mu = sd.muqeem
    const tags = [
      `<div>${stageTag(lab('stgTransfer'), sd.transfer)}</div>`,
      `<div style="margin-top:2mm">${stageTag(lab('stgInsurance'), sd.insurance)}</div>`,
      transferOnly ? '' : `<div style="margin-top:2mm">${stageTag(lab('stgWorkPermit'), sd.work_permit)}</div>`,
      `<div style="margin-top:2mm">${stageTag(lab('iqama'), mu)}</div>`,
    ].filter(Boolean).join('')
    // حقلا بيانات الإقامة بعد إنجاز مرحلة الإقامة فعلاً: تاريخ انتهاء الإقامة + المهنة.
    const iqRows = (mu && mu.status !== 'cancelled') ? [
      mu.iqama_expiry ? kvRow(lab('iqamaExp'), num2(fmtD(mu.iqama_expiry))) : '',
      mu.occupation_name_ar ? kvRow(lab('occupation'), esc(mu.occupation_name_ar)) : '',
    ].filter(Boolean).join('') : ''
    const iqGrid = iqRows ? `<div class="est-grid" style="margin-top:2.5mm">${iqRows}</div>` : ''
    return secTitle('transactionSec') + `<div class="card full">${tags}${iqGrid}</div>`
  })() : ''

  // قسم «المعاملة» لتجديد الإقامة: مرحلتان (التأمين · الإقامة) + حقول كل مرحلة المُدخلة. يطابق كرت «حالة المعاملة».
  const txnRenewalBlk = (code === 'iqama_renewal' && data?.tc) ? (() => {
    const tc = data.tc
    const sd = (tc.stage_data && typeof tc.stage_data === 'object') ? tc.stage_data : {}
    const TG = '#1E7E34', TR = '#C0392B', TB = '#0C7FB8', TY = '#B8860B' // منجز · ملغاة · بالانتظار · لا يحتاج
    const stageTag = (phaseLbl, sObj) => {
      if (!sObj) return statusTag(lab('stPendingShort'), TB, 'rgba(56,189,248,.12)', phaseLbl, true)
      if (sObj.status === 'cancelled') return statusTag(lab('stCancelledShort'), TR, 'rgba(192,57,43,.08)', phaseLbl, true)
      if (sObj.status === 'skipped') return statusTag(lab('stSkippedShort'), TY, 'rgba(184,134,11,.10)', phaseLbl, true)
      return statusTag(lab('stCompletedShort'), TG, 'rgba(39,160,70,.10)', phaseLbl, true)
    }
    const ins = sd.insurance, iq = sd.iqama
    const tags = [
      `<div>${stageTag(lab('stgInsurance'), ins)}</div>`,
      `<div style="margin-top:2mm">${stageTag(lab('iqama'), iq)}</div>`,
    ].join('')
    // بيانات الإقامة المُدخلة (عند الإنجاز): تاريخ الانتهاء + المهنة — نفس نقل الكفالة (بلا تفاصيل التأمين).
    const iqRows = (iq && iq.status !== 'cancelled') ? [
      iq.iqama_expiry ? kvRow(lab('iqamaExp'), num2(fmtD(iq.iqama_expiry))) : '',
      iq.occupation_name_ar ? kvRow(lab('occupation'), esc(iq.occupation_name_ar)) : '',
    ].filter(Boolean).join('') : ''
    const grid = iqRows ? `<div class="est-grid" style="margin-top:2.5mm">${iqRows}</div>` : ''
    return secTitle('transactionSec') + `<div class="card full">${tags}${grid}</div>`
  })() : ''

  // ── Installments table ──
  // عمود «رقم الإقامة» — للتأشيرة الدائمة فقط: يُعرض رقم إقامة التأشيرة المرتبطة عند دفعة «إصدار الإقامة».
  const showBorderCol = isStagedVisa
  const instTbl = insts.length ? secTitle('schedule') + `<table><thead><tr><th style="width:34px" class="c">#</th><th>${lab('milestone')}</th>${showBorderCol ? `<th class="c">${lab('iqamaNo')}</th>` : ''}<th class="c">${lab('expectedDate')}</th><th class="l">${lab('amount')}</th><th class="c">${lab('status')}</th></tr></thead><tbody>${insts.map((it, i) => {
    const ord = it.installment_order || (i + 1)
    const tot = Number(it.total_amount || 0), pd = Number(it.paid_amount || 0)
    const st = pd >= tot && tot > 0 ? 'ok' : (pd > 0 ? 'partial' : 'no')
    const stTxt = lab(st === 'ok' ? 'stPaid' : st === 'partial' ? 'stPartial' : 'stUnpaid')
    const stageKey = isStagedVisa ? milestoneKeyFor(it) : null
    const stage = (stageKey ? lab(stageKey) : null) || localize(it.payment_milestone) || ''
    const mLbl = insts.length === 1 ? lab('singlePayment') : instOrdLabel(ord)
    // خلية رقم الإقامة: تُعرض لأي دفعة مرتبطة بتأشيرة (إصدار الإقامة في الدائمة / الوكالة في المؤقتة)، وإلا شرطة.
    const iqNo = it.visa_application_id ? ((data?.iqamaByVisa || {})[it.visa_application_id]?.iqama_number || '') : ''
    const borderCell = showBorderCol ? `<td class="c">${iqNo ? num2(iqNo) : '—'}</td>` : ''
    // الدفعة الأولى بلا تاريخ متوقّع: تُستحقّ عند إصدار الفاتورة، فنعرض تاريخ الإصدار بدلاً من شرطة.
    const expDate = it.expected_date || ((ord === 1 || i === 0) ? inv.created_at : null)
    return `<tr><td class="c">${num2(ord)}</td><td><span class="milestone">${esc(mLbl)}</span>${stage ? ` — <span class="stage">${esc(stage)}</span>` : ''}</td>${borderCell}<td class="c">${expDate ? num2(fmtD(expDate)) : '—'}</td><td class="l"><span class="amt">${num2(nm(tot))}</span></td><td class="c"><span class="pill ${st}">${esc(stTxt)}</span></td></tr>`
  }).join('')}</tbody></table>` : ''

  // ── Payments table ──
  const payTbl = pays.length ? secTitle('paymentsReceived') + `<table><thead><tr><th class="c" style="width:12%">#</th><th class="c" style="width:27%">${lab('amount')}</th><th class="c" style="width:30%">${lab('date')}</th><th class="c">${lab('method')}</th></tr></thead><tbody>${pays.map((p, i) => {
    const refund = Number(p.amount) < 0
    const method = localize(p.payment_method) || lab('payment')
    const isLast = i === pays.length - 1
    return `<tr class="${isLast ? 'row-latest' : ''}"><td class="c">${num2(i + 1)}</td><td class="c"><span class="amt"${refund ? ' style="color:var(--no)"' : ''}>${num2(nm(p.amount))} ${cur}</span></td><td class="c">${num2(fmtD(p.payment_date))}</td><td class="c">${esc(method)}${refund ? ` <span class="latest-tag no">${lab('refund')}</span>` : (isLast ? ` <span class="latest-tag">${lab('latest')}</span>` : '')}</td></tr>`
  }).join('')}</tbody></table>` : ''

  // ── Pricing + financial summary ──
  // بند تسعيرة خروج وعودة يُخزَّن نصاً عربياً («خروج وعودة (إصدار-مفردة)» أو القديم «إصدار خروج وعودة (مفردة)») — نعيد بناءه
  // من العملية ونوع التأشيرة عبر lab() فيُترجَم حسب لغة الفاتورة. بنود الإضافات الحرّة (يكتبها الموظف) تبقى كما أُدخلت.
  const fmtPriceLabel = (label) => {
    const s = String(label || '')
    if (s.includes('خروج وعودة')) {
      const op = s.includes('تمديد') ? 'opExtend' : 'opIssue'
      const vt = s.includes('متعددة') ? 'vtMultiple' : 'vtSingle'
      return `${lab('exitReentryShort')} (${lab(op)}-${lab(vt)})`
    }
    if (s.includes('رسوم مكتب') || s.includes('رسوم المكتب')) return lab(code === 'profession_change' ? 'officeFeeSaudization' : (code === 'exit_reentry_visa' || code === 'other') ? 'officeFeeShort' : 'officeFee')
    if (s.includes('رسم تغيير المهنة')) return lab('professionChangeFee')
    if (s.includes('تعديل الراتب')) return lab('salaryAdjFee')
    if (s.includes('خروج نهائي')) return lab('officeFeeShort')
    if (s.includes('نقل الكفالة') || s.includes('رسوم النقل')) return lab('transferFee')
    if (s.includes('تجديد الإقامة') || s.includes('تجديد الاقامة')) return lab('iqamaRenewal')
    if (s.includes('كرت العمل') || s.includes('رخصة العمل')) return lab('workPermit')
    if (s.includes('طباعة الإقامة') || s.includes('طباعة الاقامة')) return lab('iqamaPrintFee')
    if (s.includes('التأمين الطبي') || s.includes('تأمين طبي')) return lab('medicalIns')
    if (s.includes('غرامة')) return lab('lateFine')
    if (s === 'رسوم أساسية' || s.includes('رسوم عقد أجير') || s.includes('رسوم العقد')) return lab('contractFee')
    if (s.includes('معامل السعودة')) { const m = s.match(/×\s*\d+/); return lab('saudizationFactor') + (m ? ' ' + m[0] : '') }
    if (s.includes('تصديق طلب مفتوح')) return lab('chamberOpenCert')
    if (s.includes('تصديق المطبوعات') || s.includes('تصديق مطبوعات')) return lab('chamberPrinted')
    return s
  }
  // الخصومات (مثل طباعة حسبة نقل الكفالة): مجموع البنود − الإجمالي النهائي = الخصم الكلي،
  // نفصله إلى «خصم أبشر» (من الحسبة المرتبطة) و«خصم المكتب» (الباقي)، ونعرض الإجمالي الابتدائي والنهائي.
  const lineSum = breakdown.reduce((s, l) => s + (Number(l.amount) || 0), 0)
  const disc = Math.max(0, lineSum - totalA)
  const absherDisc = Math.min(Math.max(0, Number(data?.tc?.absher_discount || 0)), disc)
  const officeDisc = Math.max(0, disc - absherDisc)
  // خلية المبلغ: العملة على اليسار في العربية/الأردو (ريال 2,000)، وعلى اليمين في الإنجليزية وغيرها (2,000 SAR).
  const curLeft = printLang === 'ar' || printLang === 'ur'
  const amtCell = (v, neg) => {
    const numPart = `<span>${neg ? '-' : ''}${num2(nm(v))}</span>`
    const curPart = `<span class="riyal" style="margin:0">${curTxt}</span>`
    return `<span style="display:inline-flex;align-items:baseline;gap:4px;direction:ltr">${curLeft ? curPart + numPart : numPart + curPart}</span>`
  }
  const priceTotalRows = disc > 0
    ? `<tr class="sub-row"><td>${lab('subtotalInitial')}</td><td class="l">${amtCell(lineSum)}</td></tr>${absherDisc > 0 ? `<tr class="disc-row"><td>${lab('absherDiscount')}</td><td class="l">${amtCell(absherDisc)}</td></tr>` : ''}${officeDisc > 0 ? `<tr class="disc-row"><td>${lab((code === 'profession_change' || code === 'exit_reentry_visa') ? 'absherDiscount' : 'officeDiscount')}</td><td class="l">${amtCell(officeDisc)}</td></tr>` : ''}<tr class="total-row"><td>${lab('finalTotal')}</td><td class="l">${amtCell(totalA)}</td></tr>`
    : `<tr class="total-row"><td>${lab('total')}</td><td class="l">${amtCell(totalA)}</td></tr>`
  // عدد الأشهر بجانب بنود تجديد الإقامة (الأشهر المُحتسبة، تشمل المتأخرة) ورسوم كرت العمل (أشهر التجديد) — نفس طباعة الحسبة.
  const monthsTc = (code === 'transfer' && data?.tc) ? data.tc : null
  const moW = n => printLang === 'ar' ? ((n >= 3 && n <= 9) ? 'شهر' : 'شهور') : printLang === 'en' ? (n === 1 ? 'month' : 'months') : printLang === 'hi' ? 'माह' : printLang === 'bn' ? 'মাস' : 'ماہ'
  const renMo = monthsTc ? Number(monthsTc.renewal_months || 0) : 0
  const billedMo = (() => {
    if (!monthsTc || renMo <= 0) return renMo
    let billed = renMo
    const iqExp = monthsTc.iqama_expiry_gregorian ? new Date(monthsTc.iqama_expiry_gregorian) : null
    if (iqExp && !isNaN(iqExp)) {
      const ref = new Date(monthsTc.priced_at || inv.created_at || Date.now()); ref.setHours(0, 0, 0, 0); iqExp.setHours(0, 0, 0, 0)
      if (iqExp < ref) {
        const end = new Date(ref); end.setMonth(end.getMonth() + renMo)
        let mm = (end.getFullYear() - iqExp.getFullYear()) * 12 + (end.getMonth() - iqExp.getMonth())
        let d = end.getDate() - iqExp.getDate(); if (d < 0) { mm -= 1; d += new Date(end.getFullYear(), end.getMonth(), 0).getDate() }
        billed = d > 0 ? mm + 1 : mm
      }
    }
    return billed
  })()
  const monthSuffix = raw => {
    if (!monthsTc) return ''
    const s = String(raw || '')
    if (/تجديد الإقامة|تجديد الاقامة/.test(s) && billedMo > 0) return ` (${billedMo} ${moW(billedMo)})`
    if (/كرت العمل|رخصة العمل|رخصة عمل|تصريح العمل/.test(s) && renMo > 0) return ` (${renMo} ${moW(renMo)})`
    return ''
  }
  const priceTbl = breakdown.length ? `<table class="price-table"><thead><tr><th>${lab('item')}</th><th class="l">${lab('value')}</th></tr></thead><tbody>${breakdown.map(l => `<tr><td>${esc(fmtPriceLabel(l.label || '') + monthSuffix(l.label))}</td><td class="l">${amtCell(l.amount)}</td></tr>`).join('')}${priceTotalRows}</tbody></table>` : ''
  const pctPaid = pctOf(paidA, totalA)
  // الإجمالي الابتدائي والخصومات تظهر في جدول البنود — فلا نكرّرها هنا، نكتفي بالإجمالي النهائي.
  const discRows = `<div class="sum-row"><span class="k">${lab(disc > 0 ? 'finalTotal' : 'total')}</span><span class="v">${num2(nm(totalA))} ${cur}</span></div>`
  const summaryBlk = `<div class="summary-card">${discRows}<div class="sum-row paid"><span class="k">${lab('paid')}</span><span class="v">${num2(nm(paidA))} ${cur}</span></div><div class="sum-row remain"><span class="k">${lab('remaining')}</span><span class="v">${num2(nm(remA))} ${cur}</span></div><div class="progress"><div class="track"><div class="fill" style="width:${pctPaid}%"></div></div><div class="cap"><span><b>${num2(pctPaid + '%')}</b></span><span>${num2(nm(paidA))} / ${num2(nm(totalA))}</span></div></div></div>`
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
  // العربية والإنجليزية تكتفيان بسطر واحد؛ اللغات الأخرى تُذيّل بترجمة إنجليزية مساعدة.
  const noticeBlk = `<div class="notice"><div class="ttl">⚠ ${lab('importantNotice')}</div><div class="ar">${esc(noticePrimary)}</div>${(printLang === 'en' || printLang === 'ar') ? '' : `<div class="en">${esc(noticeByLang.en)}</div>`}</div>`

  // ختم مائل في خلفية الصفحتين: «ملغاة» (أحمر) للفواتير الملغاة، أو «مدفوعة بالكامل» (أخضر)
  // لأي فاتورة سُدِّدت بالكامل (المتبقي = 0 وعليها مبلغ) وليست ملغاة.
  const fullyPaid = !cancelled && totalA > 0 && remA <= 0
  const wm2 = cancelled
    ? `<div class="cancel-wm">${lab('cancelled')}</div>`
    : (fullyPaid ? `<div class="paid-wm">${lab('fullyPaid')}</div>` : '')

  // رواتب سبلاير: فاتورة صفرية تُطبع في صفحة واحدة — ترويسة + شارة «صفرية» + الأطراف والمنشأة وتفاصيل الطلب.
  const isSupplierPayroll = code === 'supplier_payroll' || code === 'documents' || code === 'external_transfer_approval'
  const mastheadHtml = `
  <header class="masthead">
    <span class="corner tl"></span><span class="corner tr"></span>
    <div class="mast-row">
      <div class="brand">
        ${logoImg}
        <div class="group">HUSSAIN OFFICES</div>
        <div class="name-ar">تأشيرة البناء والإنشاء</div>
        <div class="name-en">VISA ALBINA &amp; ALINSHA</div>
        <div class="meta"><span class="ar">${printLang === 'ar' ? 'المملكة العربية السعودية، الجبيل' : 'Kingdom of Saudi Arabia – Al Jubail'}</span><span class="mob"><span>${lab('phone')}:</span><span class="num">${esc(officePhone)}</span></span></div>
      </div>
      <div class="inv-id">
        <div class="tag">${lab('serviceInvoice')}</div>
        <div class="no-box"><div class="no-lbl">${lab('invoiceNoLbl')}</div><div class="no-val"><span class="num">${esc(invoiceNo)}</span></div></div>
        <div class="date-line">${lab('issueDate')}: <span class="num">${fmtD(inv.created_at)}</span></div>
        ${officeCodeBlk}
      </div>
    </div>
  </header>`
  const zeroBannerBlk = `
    <div class="hero-wrap">
      <div class="svc-type"><span class="svc-name">${esc(svcName || '—')}</span></div>
      <div class="zero-banner">
        <div class="zb-left"><span class="zb-badge">${lab('zeroInvoice')}</span></div>
        <div class="zb-right"><div class="zb-note">${lab('zeroInvoiceNote')}</div></div>
      </div>
    </div>`
  const onePageBody = `
<div class="page">
  ${wm2}
  ${mastheadHtml}
  ${zeroBannerBlk}
  <div class="pad">
    ${partiesBlk}
    ${workerEstBlk}
    ${svcDetailsBlk}
    ${txnBlk}
    ${noteBlk}
  </div>
  <div class="page-foot"><div class="footer-bar"><span class="kufi">تأشيرة البناء والإنشاء — VISA ALBINA &amp; ALINSHA</span><span>${lab('invoice')} <span class="num">${esc(invoiceNo)}</span> · ${lab('page')} <span class="num">1 / 1</span></span></div></div>
</div>`
  const twoPageBody = `
<div class="page">
  ${wm2}
  ${mastheadHtml}
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
    <div class="l-side">${logoImg}<div><div class="mh-name">تأشيرة البناء والإنشاء</div><div class="mh-en">VISA ALBINA &amp; ALINSHA</div></div></div>
    <div class="mh-inv"><div class="l">${lab('invoiceNoLbl')}</div><div class="v"><span class="num">${esc(invoiceNo)}</span></div></div>
  </div>
  <div class="pad">
    ${serviceBlk}
    ${workerEstBlk}
    ${profBlk}
    ${svcDetailsBlk}
    ${txnTransferBlk}
    ${txnRenewalBlk}
    ${txnBlk}
    ${noteBlk}
    <div class="page2-bottom">
    ${priceSummaryBlk}
    ${bankBlk}
    ${noticeBlk}
    <div class="footer-bar" style="justify-content:center"><span class="kufi">${printLang === 'ar' ? 'شكراً لتعاملكم معنا' : lab('thankYou')}</span></div>
    </div>
  </div>
  <div class="page-num"><span class="kufi">تأشيرة البناء والإنشاء</span> · ${lab('invoice')} <span class="num">${esc(invoiceNo)}</span> · ${lab('page')} <span class="num">2 / 2</span></div>
</div>`

  const html2 = `<!DOCTYPE html><html dir="${rtl ? 'rtl' : 'ltr'}" lang="${printLang}"><head><meta charset="utf-8"><title>${esc(invoiceNo) || lab('invoice')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Reem+Kufi:wght@400;500;600;700&family=Tajawal:wght@300;400;500;700;800&family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Sans+Bengali:wght@400;600;700&family=Noto+Naskh+Arabic:wght@400;600;700&family=Playfair+Display:wght@700&display=swap">
<style>
:root{--ink:#1a1a1a;--ink-soft:#4a4640;--charcoal:#14110b;--gold:#d4af37;--gold-deep:#b8932c;--gold-soft:#e8d49a;--gold-faint:#f6efdc;--paper:#fff;--line:#e4ddcb;--hair:#cdbf95;--ok:#1c7a4a;--ok-bg:#e7f3ec;--warn:#a8741a;--warn-bg:#fbf2dd;--no:#9a2f2f;--no-bg:#f6e6e6}
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
html,body{background:#cfcfcf}
body{font-family:'Tajawal','Noto Naskh Arabic','Noto Sans Devanagari','Noto Sans Bengali',sans-serif;color:var(--ink);font-size:12.5px;line-height:1.35;-webkit-font-smoothing:antialiased}
.num{direction:ltr;font-variant-numeric:tabular-nums;unicode-bidi:isolate;display:inline-block}
h1,h2,h3,h4,.kufi{font-family:'Reem Kufi','Tajawal',sans-serif}
@page{size:A4;margin:0}
.page{width:210mm;min-height:297mm;margin:0 auto;background:var(--paper);position:relative;overflow:hidden;box-shadow:0 2px 18px rgba(0,0,0,.25);display:flex;flex-direction:column}
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
.inv-id .office-code{margin-top:7px;align-self:stretch;justify-content:center}
.brand{display:flex;flex-direction:column;align-items:flex-start}
.logo{width:120px;height:auto;display:block;margin-bottom:5px}
.brand .group{font-family:'Playfair Display',serif;font-weight:700;font-size:23px;color:var(--gold);letter-spacing:.5px;direction:ltr;line-height:1.05;margin-bottom:16px}
.brand .name-ar{font-family:'Reem Kufi',sans-serif;font-weight:700;font-size:16.5px;color:var(--gold-soft);letter-spacing:.3px;line-height:1.2}
.brand .name-en{font-family:'Reem Kufi',sans-serif;font-weight:500;font-size:11px;color:#9b9482;letter-spacing:2.2px;margin-top:6px}
.brand .meta{margin-top:auto;padding-top:10px;font-size:12px;color:#d8d2c2;line-height:1.45}
.brand .meta .ar{display:block}
.brand .meta .en{display:block;color:#9b9482;font-size:10.5px;letter-spacing:.4px}
.brand .meta .mob{display:flex;align-items:center;gap:6px;margin-top:1px;font-size:12.5px;color:var(--gold-soft)}
.inv-id{text-align:end;align-items:flex-end}
.inv-id .tag{font-family:'Reem Kufi',sans-serif;font-size:13.5px;letter-spacing:1px;color:#fff;font-weight:600}
.inv-id .tag-en{font-size:9.5px;letter-spacing:3px;color:#9b9482;display:block;margin-top:1px}
.inv-id .no-box{margin-top:7px;border:1px solid var(--gold);background:rgba(212,175,55,.07);padding:6px 14px;display:block;text-align:center}
.inv-id .no-lbl{font-size:9.5px;color:#b9b09a;letter-spacing:1.5px;display:block;text-align:left}
.inv-id .no-val{font-family:'Reem Kufi',sans-serif;font-size:18px;color:var(--gold);font-weight:700}
.inv-id .date-line{margin-top:6px;font-size:10.5px;color:#cfc8b6}
.inv-id .date-line .num{color:#fff;font-weight:700}
.office-code{display:inline-flex;align-items:center;gap:7px;margin-top:8px;padding:4px 14px;border:1px solid var(--gold);background:rgba(212,175,55,.08);color:var(--gold-soft);font-family:'Reem Kufi',sans-serif;font-weight:600;font-size:12px;letter-spacing:1px}
.office-code .num{color:var(--gold);font-weight:700;font-size:13.5px}
.hero-wrap{padding:3.5mm 14mm 0}
.svc-type{display:flex;align-items:center;justify-content:center;gap:9px;margin-bottom:3.5mm}
.svc-type .svc-name{font-family:'Reem Kufi',sans-serif;font-size:24px;font-weight:700;color:var(--charcoal);letter-spacing:.3px}
.svc-type .svc-qty{font-family:'Reem Kufi',sans-serif;font-size:13.5px;font-weight:700;color:var(--gold);background:var(--charcoal);padding:2px 10px}
.hero{background:linear-gradient(140deg,#1c1810 0%,#14110b 60%,#0c0904 100%);color:#fff;position:relative;padding:4mm 8mm 3.5mm;display:flex;gap:8mm;align-items:stretch;border:1px solid #2c2517}
.hero::before{content:"";position:absolute;inset:0;border:1px solid rgba(212,175,55,.32);margin:5px;pointer-events:none}
.hero .corner{position:absolute;width:20px;height:20px;z-index:2}
.hero .corner.tl{top:0;right:0;border-top:2px solid var(--gold);border-right:2px solid var(--gold)}
.hero .corner.tr{top:0;left:0;border-top:2px solid var(--gold);border-left:2px solid var(--gold)}
.hero .corner.bl{bottom:0;right:0;border-bottom:2px solid var(--gold);border-right:2px solid var(--gold)}
.hero .corner.br{bottom:0;left:0;border-bottom:2px solid var(--gold);border-left:2px solid var(--gold)}
.hero-main{flex:0 0 auto;min-width:72mm;position:relative;z-index:1}
.hero-eyebrow{display:flex;align-items:center;gap:8px;font-family:'Reem Kufi',sans-serif;font-weight:700;font-size:15.5px;letter-spacing:.5px;color:var(--gold-soft)}
.hero-eyebrow .star{color:var(--gold);font-size:14.5px}
.hero-eyebrow .en{font-family:'Reem Kufi',sans-serif;font-size:9.5px;letter-spacing:2.5px;color:#8d856f}
.hero-amount{display:flex;align-items:baseline;gap:9px;margin-top:3px}
.hero-amount .val{font-family:'Reem Kufi',sans-serif;font-weight:700;font-size:42px;line-height:1;color:var(--gold);letter-spacing:.5px;text-shadow:0 1px 0 rgba(0,0,0,.4)}
.hero-amount .cur{font-size:19px;color:var(--gold-soft);font-weight:500;font-family:'Reem Kufi',sans-serif}
.riyal{margin-inline-start:5px;white-space:nowrap}
.flag{width:21px;height:14px;object-fit:cover;border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.18);vertical-align:middle;margin-inline-start:7px}
.nat-txt{font-size:11px;color:var(--gold-deep);font-weight:600;margin-inline-start:6px}
.hero-sub{margin-top:5px;font-size:11px;color:#cdc6b4}
.hero-sub b{color:#fff;font-weight:700}
.hero-side{flex:1;position:relative;z-index:1;display:grid;grid-template-columns:1fr 1fr;align-content:center;border-inline-start:1px solid rgba(212,175,55,.25);padding-inline-start:8mm;margin-inline-start:2mm}
.hero-fact{padding:4px 10px 4px 0}
.hero-fact .k{font-size:10.5px;color:var(--gold-soft);letter-spacing:1.2px;font-family:'Reem Kufi',sans-serif;font-weight:600}
.hero-fact .v{font-size:14px;color:#fff;font-weight:700;margin-top:2px}
.hero-fact.full{grid-column:1 / -1;border-top:1px solid rgba(255,255,255,.08);margin-top:3px;padding-top:6px}
.hero-fact.full .k{color:var(--gold-soft);font-size:10.5px;font-weight:600}
.hero-fact .v.remain{color:#D83A3A;font-family:'Reem Kufi',sans-serif;font-size:19px}
.sec-title{display:flex;align-items:center;gap:9px;margin:4.5mm 0 2.5mm}
.sec-title .bar{width:4px;height:14px;background:var(--gold)}
.sec-title h3{font-family:'Reem Kufi',sans-serif;font-weight:700;font-size:14px;color:var(--charcoal);letter-spacing:.3px}
.sec-title .ln{flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--hair))}
[dir=ltr] .sec-title .ln{background:linear-gradient(90deg,var(--hair),transparent)}
.sec-title .en{font-size:9.5px;letter-spacing:2px;color:#a99a6c;font-family:'Reem Kufi',sans-serif}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:4mm}
.card{border:1px solid var(--line);border-top:2px solid var(--gold);background:#fff;padding:3.5mm 4mm 3mm}
.card.full{grid-column:1 / -1}
.desc-text{font-size:12.5px;line-height:1.65;color:var(--ink);font-weight:500;white-space:pre-wrap;word-break:break-word}
.svc-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.status-bar{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;font-family:'Reem Kufi',sans-serif;font-weight:600;font-size:11px;letter-spacing:.3px;white-space:nowrap;flex-shrink:0}
.status-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0}
.status-bar-full{display:flex;width:100%}
.status-when{margin-inline-start:auto;font-size:9.5px;font-weight:600;opacity:.85}
/* الشارتان تبدآن من نفس الحافّة وبعرض متساوٍ (عموديًّا) — stretch يوحّد عرضهما. */
.status-stack{display:inline-flex;flex-direction:column;gap:4px;align-items:stretch;flex-shrink:0}
.phase-chip{font-size:8.5px;font-weight:700;padding:1px 5px;border-radius:4px;background:rgba(0,0,0,.05);opacity:.9}
.card h4{font-family:'Reem Kufi',sans-serif;font-weight:600;font-size:12px;color:var(--gold-deep);margin-bottom:2.5mm;letter-spacing:.3px;display:flex;justify-content:flex-start;align-items:center}
.card h4 .en{font-size:9px;letter-spacing:1.5px;color:#b3a576;font-weight:400}
.kv{display:flex;justify-content:space-between;gap:10px;padding:2.5px 0;border-bottom:1px dotted #ece5d3}
.kv:last-child{border-bottom:0}
.kv .k{color:var(--ink-soft);font-size:11px;white-space:nowrap}
.kv .v{color:var(--ink);font-weight:500;font-size:11.5px;text-align:end}
.kv .v.strong{font-weight:700}
.est-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 7mm}
.service-row{display:flex;justify-content:space-between;align-items:center}
.service-name{font-family:'Reem Kufi',sans-serif;font-size:14.5px;color:var(--charcoal);font-weight:600}
.service-en{font-size:9.5px;color:#a99a6c;letter-spacing:1px;margin-top:1px}
.qty-badge{background:var(--charcoal);color:var(--gold);font-family:'Reem Kufi',sans-serif;font-weight:700;padding:5px 14px;font-size:14px;display:flex;align-items:center;gap:7px}
.qty-badge .lbl{font-size:9.5px;color:#c9bf9f;font-weight:400;letter-spacing:1px}
.fd{margin-top:1mm}
.fd-file{margin-bottom:2mm}
.fd-flabel{display:flex;justify-content:space-between;align-items:baseline;font-family:'Reem Kufi',sans-serif;font-size:11.5px;color:var(--gold-deep);font-weight:600;margin-bottom:1mm}
.fd-count{font-size:9.5px;color:#a99a6c}
.fd-item{display:flex;justify-content:space-between;font-size:11px;color:var(--ink);padding:1px 0}
.fd-x{font-weight:700;direction:ltr}
.fd-v{padding:2mm 0 0;margin-top:1.5mm;border-top:1px dotted #ece5d3}
.fd-v:first-child{border-top:0;margin-top:0.5mm}
.fd-vhead{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:1.5mm}
.fd-vname{font-size:11.5px;color:var(--ink);font-weight:700}
.fd-vsub{font-size:10px;color:#6b6048;font-weight:600}
.fd-worker{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--ink);font-weight:700;margin-bottom:1.5mm}
.fd-dot{width:5px;height:5px;border-radius:50%;background:var(--gold-deep);flex-shrink:0}
.fd-grid{display:grid;gap:1px;background:var(--line);border:1px solid var(--line)}
.fd-cell{background:#fff;padding:1.5mm 2.5mm}
.fd-cell-k{font-size:8.5px;color:#a99a6c;margin-bottom:1px}
.fd-cell-v{font-size:11px;color:var(--ink);font-weight:600;direction:ltr;text-align:right;font-variant-numeric:tabular-nums}
.fd-tag{display:inline-flex;align-items:center;gap:5px;font-size:9.5px;font-weight:700;padding:3px 10px;letter-spacing:.2px;line-height:1.5;white-space:nowrap;flex-shrink:0;border-inline-start-width:3px;border-inline-start-style:solid}
.fd-tdot{width:5px;height:5px;border-radius:50%;background:currentColor;flex-shrink:0}
.fd-tchk{font-weight:800;font-size:10.5px}
.fd-tag.ok{color:var(--ok);background:var(--ok-bg);border-inline-start-color:var(--ok)}
.fd-tag.visa{color:var(--warn);background:var(--warn-bg);border-inline-start-color:var(--warn)}
.fd-tag.pending{color:#1f7bc4;background:#e6f1fb;border-inline-start-color:#1f7bc4}
table{width:100%;border-collapse:collapse}
thead th{background:var(--charcoal);color:var(--gold-soft);font-family:'Reem Kufi',sans-serif;font-weight:500;font-size:10.5px;letter-spacing:.5px;padding:5.5px 9px;text-align:start}
thead th.c{text-align:center}
thead th.l{text-align:end}
tbody td{padding:5.5px 9px;font-size:11.5px;border-bottom:1px solid var(--line);color:var(--ink)}
tbody td.c{text-align:center}
tbody td.l{text-align:end}
tbody tr:nth-child(even){background:#faf7ee}
tbody td .milestone{font-weight:500}
tbody td .stage{font-family:'Reem Kufi',sans-serif;font-size:10px;color:var(--gold-deep);letter-spacing:.3px}
td .amt{font-weight:700}
.pill{display:inline-block;font-family:'Reem Kufi',sans-serif;font-weight:500;font-size:10px;padding:2.5px 9px;border:1px solid transparent;letter-spacing:.3px;white-space:nowrap}
.pill.ok{background:var(--ok-bg);color:var(--ok);border-color:#bcdcc7}
.pill.partial{background:var(--warn-bg);color:var(--warn);border-color:#e6cf8f}
.pill.no{background:var(--no-bg);color:var(--no);border-color:#e3bcbc}
.pill .sub{font-size:9px;opacity:.85}
.row-latest{box-shadow:inset 3px 0 0 var(--gold)}
.latest-tag{font-family:'Reem Kufi',sans-serif;font-size:9px;letter-spacing:1px;color:var(--charcoal);background:var(--gold);padding:1.5px 6px;margin-inline-start:7px}
.latest-tag.no{background:var(--no);color:#fff}
.price-summary{display:grid;grid-template-columns:1.25fr 1fr;gap:6mm;align-items:start}
.price-table tbody td{font-size:11.5px}
.price-table .total-row td{background:var(--charcoal);color:var(--gold);font-family:'Reem Kufi',sans-serif;font-weight:700;font-size:14px;border-bottom:0}
.price-table .total-row td .num{color:var(--gold-soft)}
.price-table .sub-row td{background:var(--gold-faint);color:var(--gold-deep);font-weight:700;font-size:12.5px}
.price-table .sub-row td .num{color:var(--gold-deep)}
.price-table .disc-row td{color:var(--ok);font-weight:700}
.price-table .disc-row td .num{color:var(--ok)}
.summary-card{border:1px solid var(--charcoal);background:linear-gradient(160deg,#1c1810,#14110b);color:#fff;padding:3mm 5mm}
.summary-card .sum-row{display:flex;justify-content:space-between;align-items:baseline;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.09)}
.summary-card .sum-row .k{font-size:11.5px;color:#c9c0aa;font-family:'Reem Kufi',sans-serif}
.summary-card .sum-row .v{font-size:14.5px;font-weight:700;color:#E6B43C}
.summary-card .sum-row.paid .v{color:#2FA85A}
.summary-card .sum-row.paid .k{color:#2FA85A}
.summary-card .sum-row.remain{border-bottom:0;margin-top:1px;padding-top:5px;border-top:1.5px solid var(--gold)}
.summary-card .sum-row.remain .k{color:var(--gold-soft);font-size:13px}
.summary-card .sum-row.remain .v{color:#D83A3A;font-family:'Reem Kufi',sans-serif;font-size:19px}
.progress{margin-top:2.5mm}
.progress .track{height:6px;background:rgba(255,255,255,.12);position:relative;overflow:hidden}
.progress .fill{position:absolute;top:0;inset-inline-start:0;bottom:0;background:linear-gradient(90deg,var(--gold-deep),var(--gold))}
.progress .cap{display:flex;justify-content:space-between;margin-top:4px;font-size:10px;color:#b3a983}
.progress .cap b{color:var(--gold-soft)}
.bank-card{border:1px solid var(--line);border-inline-start:3px solid var(--gold);background:var(--gold-faint);padding:3.5mm 4mm 3mm}
.note-card{font-size:11.5px;line-height:1.6;color:var(--ink);white-space:pre-wrap}
.notice{margin-top:3mm;background:var(--charcoal);color:#e9e2cf;padding:2.5mm 6mm;position:relative}
.notice::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--gold-deep),var(--gold),var(--gold-deep))}
.notice .ttl{font-family:'Reem Kufi',sans-serif;font-weight:600;color:var(--gold);font-size:11.5px;letter-spacing:.5px;margin-bottom:1.5px;display:flex;align-items:center;gap:7px}
.notice .ar{font-size:10px;line-height:1.4;color:#ddd5c1}
.notice .en{font-size:9.5px;line-height:1.5;color:#9b937e;direction:ltr;text-align:left;margin-top:4px;border-top:1px solid rgba(255,255,255,.08);padding-top:4px}
.footer-bar{display:flex;justify-content:space-between;align-items:center;padding:4mm 0;font-size:10px;color:#8a826b}
.footer-bar .kufi{color:var(--gold-deep);letter-spacing:1px}
.footer-bar .signs{display:flex;gap:12mm}
.footer-bar .sign{text-align:center}
.footer-bar .sign .ln2{width:38mm;border-top:1px solid var(--hair);margin-bottom:3px}
/* فوتر الصفحة الأولى داخل التدفّق ومدفوع لأسفل الصفحة (margin-top:auto) بدل تموضع مطلق — فلا يتداخل مع
   جداول الدفعات/المدفوعات مهما طالت، ويظلّ ملتصقاً بأسفل الصفحة حين يكون المحتوى قصيراً. */
.page-foot{margin-top:auto;padding:0 14mm 5mm}
.mini-head{background:linear-gradient(135deg,#1f1a10,#14110b);color:#fff;padding:5mm 14mm;display:flex;justify-content:space-between;align-items:center;position:relative}
.mini-head::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2.5px;background:linear-gradient(90deg,var(--gold-deep),var(--gold),var(--gold-deep))}
.mini-head .l-side{display:flex;align-items:center;gap:11px}
.mini-head .logo{width:78px;margin-bottom:0}
.mini-head .mh-name{font-family:'Reem Kufi',sans-serif;font-weight:700;color:var(--gold);font-size:14.5px}
.mini-head .mh-en{font-size:9px;color:#9b9482;letter-spacing:2px}
.mini-head .mh-inv{text-align:left}
.mini-head .mh-inv .l{font-size:9.5px;color:#b9b09a;letter-spacing:1px}
.mini-head .mh-inv .v{font-family:'Reem Kufi',sans-serif;color:var(--gold);font-weight:700;font-size:14.5px}
.page-num{text-align:center;font-size:9.5px;color:#a99a6c;letter-spacing:1px;padding:5mm 14mm 7mm}
.page-num .kufi{color:var(--gold-deep)}
.cancel-wm{position:absolute;top:46%;left:50%;transform:translate(-50%,-50%) rotate(-24deg);font-family:'Reem Kufi',sans-serif;font-size:120px;font-weight:700;color:rgba(154,47,47,.10);letter-spacing:8px;white-space:nowrap;pointer-events:none;z-index:5}
.paid-wm{position:absolute;top:46%;left:50%;transform:translate(-50%,-50%) rotate(-24deg);font-family:'Reem Kufi',sans-serif;font-size:96px;font-weight:700;color:rgba(28,122,74,.10);letter-spacing:6px;white-space:nowrap;pointer-events:none;z-index:5}
.zero-banner{border:1.4px solid var(--hair);border-radius:11px;overflow:hidden;display:flex;align-items:stretch;background:#fff}
.zero-banner .zb-left{background:var(--charcoal);padding:5mm 7mm;display:flex;align-items:center;justify-content:center;text-align:center;min-width:46mm}
.zero-banner .zb-badge{font-family:'Reem Kufi',sans-serif;font-weight:700;font-size:15px;letter-spacing:1px;color:var(--gold)}
.zero-banner .zb-right{flex:1;padding:5mm 7mm;display:flex;flex-direction:column;justify-content:center}
.zero-banner .zb-svc{font-family:'Reem Kufi',sans-serif;font-size:17px;font-weight:700;color:var(--charcoal);margin-bottom:2mm}
.zero-banner .zb-note{font-size:11px;color:var(--ink-soft);line-height:1.55}
@media print{html,body{background:#fff}.page{box-shadow:none;margin:0}.page+.page{margin-top:0}}
</style></head><body>${isSupplierPayroll ? onePageBody : twoPageBody}
</body></html>`

  return html2
}
