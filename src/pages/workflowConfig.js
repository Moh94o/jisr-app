// ═══════════════════════════════════════════════════════════════════════════
//  Workflow configuration — single source of truth for the stage-based
//  transaction workflow. See WORKFLOW_STAGES.md for the full design rationale.
//
//  Model:
//   • A transaction (service_request) flows through an ordered list of STAGES.
//   • Each stage belongs to a DEPARTMENT — the department owns that stage's
//     work and gets it routed to its sidebar tab.
//   • PIPELINES maps each service type → its ordered stage codes.
//
//  Departments are FIXED for now (the six below). Stage→department mapping and
//  per-service pipelines are config-driven so they can move to the DB later
//  without touching component code. Roles/permissions are layered on next.
// ═══════════════════════════════════════════════════════════════════════════

// ── Departments (sidebar tabs / work owners) ──
// `role` ties the department to an existing roles row when one already exists;
// `isNew` flags the four departments we still need to create as roles.
export const DEPARTMENTS = [
  { code: 'dept_billing',  ar: 'الاستقبال والفوترة', en: 'Intake & Billing',      color: '#D4A017', icon: 'invoice',  role: 'مصدر فواتير', isNew: false },
  { code: 'dept_visa',     ar: 'قسم التأشيرات',       en: 'Visas Dept.',           color: '#5dade2', icon: 'calendar', role: null,          isNew: true  },
  { code: 'dept_iqama',    ar: 'قسم الإقامات',        en: 'Iqama Dept.',           color: '#2ecc71', icon: 'role',     role: null,          isNew: true  },
  { code: 'dept_transfer', ar: 'قسم النقل وقوى',      en: 'Transfer & Qiwa Dept.', color: '#f39c12', icon: 'broker',   role: null,          isNew: true  },
  { code: 'dept_docs',     ar: 'قسم المستندات',       en: 'Documents Dept.',       color: '#16a085', icon: 'notes',    role: null,          isNew: true  },
  { code: 'dept_admin',    ar: 'الإدارة',             en: 'Administration',        color: '#bb8fce', icon: 'settings', role: 'مدير مكتب',   isNew: false },
]

// ── Stage catalog (each entry becomes one sidebar tab once the engine lands) ──
export const STAGES = [
  { code: 'intake_invoice',    ar: 'استلام وفوترة',     en: 'Intake & Invoice',     dept: 'dept_billing',  note: 'إنشاء الطلب + الفاتورة + الدفع' },
  { code: 'visa_issuance',     ar: 'إصدار التأشيرة',    en: 'Visa Issuance',        dept: 'dept_visa',     note: 'رقم التأشيرة + رقم الحدود + ملف PDF' },
  { code: 'wakalah',           ar: 'الوكالة',           en: 'Wakalah',              dept: 'dept_visa',     note: 'السجل التجاري + مكتب التوكيل' },
  { code: 'exit_reentry',      ar: 'خروج وعودة',        en: 'Exit / Re-entry',      dept: 'dept_visa',     note: 'إصدار / تمديد التأشيرة' },
  { code: 'final_exit',        ar: 'خروج نهائي',        en: 'Final Exit',           dept: 'dept_visa',     note: 'إصدار تأشيرة خروج نهائي للعامل' },
  { code: 'passport_update',   ar: 'تحديث الجواز',      en: 'Passport Update',      dept: 'dept_visa',     note: 'تحديث بيانات الجواز' },
  { code: 'medical_exam',      ar: 'الفحص الطبي',       en: 'Medical Exam',         dept: 'dept_iqama',    note: 'اسم العامل + صورة الفحص' },
  { code: 'work_permit',       ar: 'رخصة العمل',        en: 'Work Permit',          dept: 'dept_iqama',    note: 'تاريخ انتهاء الرخصة' },
  { code: 'medical_insurance', ar: 'التأمين الطبي',     en: 'Medical Insurance',    dept: 'dept_iqama',    note: 'تاريخ انتهاء التأمين' },
  { code: 'iqama_issuance',    ar: 'إصدار الإقامة',     en: 'Iqama Issuance',       dept: 'dept_iqama',    note: 'رقم الإقامة + الانتهاء + ملف مقيم' },
  { code: 'iqama_delivery',    ar: 'توصيل الإقامة',     en: 'Iqama Delivery',       dept: 'dept_iqama',    note: 'تاريخ الوصول + صورة الإقامة' },
  { code: 'iqama_print',       ar: 'طباعة الإقامة',     en: 'Iqama Print',          dept: 'dept_iqama',    note: 'طباعة وتسليم' },
  { code: 'transfer_request',  ar: 'طلب نقل الكفالة',   en: 'Transfer Request',     dept: 'dept_transfer', note: 'تقديم النقل على قوى' },
  { code: 'transfer_approval', ar: 'موافقة النقل',      en: 'Transfer Approval',    dept: 'dept_transfer', note: 'موافقة الطرفين + السداد' },
  { code: 'profession_change', ar: 'تغيير المهنة',      en: 'Occupation Change',    dept: 'dept_transfer', note: 'تقديم وتحديث المهنة' },
  { code: 'salary_update',     ar: 'تعديل الراتب',      en: 'Salary Update',        dept: 'dept_transfer', note: 'تحديث الأجر في قوى / مدد' },
  { code: 'ajeer_contract',    ar: 'عقد أجير',          en: 'Ajeer Contract',       dept: 'dept_transfer', note: 'إصدار عقد أجير' },
  { code: 'chamber',           ar: 'الغرفة التجارية',   en: 'Chamber',              dept: 'dept_docs',     note: 'تصديق / إجراء الغرفة' },
  { code: 'documents',         ar: 'مستندات',           en: 'Documents',            dept: 'dept_docs',     note: 'تجهيز / تسليم مستندات' },
  { code: 'generic_task',      ar: 'إجراء عام',         en: 'General Task',         dept: 'dept_docs',     note: 'خطوة عامة غير مصنّفة' },
  { code: 'review_close',      ar: 'مراجعة وإغلاق',     en: 'Review & Close',       dept: 'dept_admin',    note: 'تأكيد الاكتمال وإغلاق المعاملة' },
]

// ── Service labels (mirrors TX_TYPES in App.jsx) ──
export const SERVICE_LABELS = {
  work_visa_permanent: { ar: 'تأشيرة وإقامة دائمة',          en: 'Permanent Visa & Iqama' },
  work_visa_temporary: { ar: 'تأشيرة وإقامة مؤقتة',          en: 'Temporary Visa & Iqama' },
  transfer:            { ar: 'نقل كفالة',                    en: 'Sponsorship Transfer' },
  iqama_renewal:       { ar: 'تجديد الإقامة',               en: 'Iqama Renewal' },
  ajeer:               { ar: 'عقد أجير',                     en: 'Ajeer Contract' },
  other:               { ar: 'الغرفة التجارية',             en: 'Chamber of Commerce' },
  medical_insurance:   { ar: 'تأمين طبي',                   en: 'Medical Insurance' },
  profession_change:   { ar: 'تغيير المهنة',                en: 'Occupation Change' },
  name_translation:    { ar: 'تعديل الراتب',                en: 'Salary Adjustment' },
  exit_reentry_visa:   { ar: 'تأشيرة خروج وعودة',           en: 'Exit / Re-entry Visa' },
  final_exit_visa:     { ar: 'خروج نهائي',      en: 'Final Exit' },
  passport_update:     { ar: 'تحديث بيانات الجواز',         en: 'Passport Update' },
  iqama_print:         { ar: 'طباعة الإقامة',               en: 'Iqama Print' },
  documents:           { ar: 'مستندات',                     en: 'Documents' },
  general:             { ar: 'خدمة عامة',                    en: 'General' },
}

// ── Pipelines: service code → ordered stage codes ──
// Permanent work visa is taken verbatim from the existing 8 cards in
// TransactionsPage.jsx. The rest are first-draft and pending the user's review.
export const PIPELINES = {
  work_visa_permanent: ['intake_invoice', 'visa_issuance', 'wakalah', 'medical_exam', 'work_permit', 'medical_insurance', 'iqama_issuance', 'iqama_delivery', 'review_close'],
  work_visa_temporary: ['intake_invoice', 'visa_issuance', 'ajeer_contract', 'review_close'],
  transfer:            ['intake_invoice', 'transfer_request', 'transfer_approval', 'iqama_issuance', 'review_close'],
  iqama_renewal:       ['intake_invoice', 'medical_insurance', 'iqama_issuance', 'iqama_delivery', 'review_close'],
  ajeer:               ['intake_invoice', 'ajeer_contract', 'review_close'],
  other:               ['intake_invoice', 'chamber', 'review_close'],
  medical_insurance:   ['intake_invoice', 'medical_insurance', 'review_close'],
  profession_change:   ['intake_invoice', 'profession_change', 'review_close'],
  name_translation:    ['intake_invoice', 'salary_update', 'review_close'],
  exit_reentry_visa:   ['intake_invoice', 'exit_reentry', 'review_close'],
  final_exit_visa:     ['intake_invoice', 'final_exit', 'review_close'],
  passport_update:     ['intake_invoice', 'passport_update', 'review_close'],
  iqama_print:         ['intake_invoice', 'iqama_print', 'review_close'],
  documents:           ['intake_invoice', 'documents', 'review_close'],
  general:             ['intake_invoice', 'generic_task', 'review_close'],
}

// ── Lookups & derived helpers ──
export const DEPT_BY_CODE  = Object.fromEntries(DEPARTMENTS.map(d => [d.code, d]))
export const STAGE_BY_CODE = Object.fromEntries(STAGES.map(s => [s.code, s]))

// Stages owned by a department, in catalog order.
export const stagesOfDept = (deptCode) => STAGES.filter(s => s.dept === deptCode)

// Service codes whose pipeline passes through any stage of this department.
export const servicesThroughDept = (deptCode) => {
  const stageCodes = new Set(stagesOfDept(deptCode).map(s => s.code))
  return Object.keys(PIPELINES).filter(svc => PIPELINES[svc].some(st => stageCodes.has(st)))
}

// Human label for a service code (falls back to the raw code).
export const serviceLabel = (code, lang = 'ar') =>
  (SERVICE_LABELS[code] && SERVICE_LABELS[code][lang]) || code
