// ═══════════════════════════════════════════════════════════════════════════
// Transaction STAGES — MVP "stage-in-service" model.
//
// Each service (service_type.code) runs through an ordered list of stage codes
// (SERVICE_STAGES). Each stage (STAGE_DEFS) is a small reusable card: a few
// fields + file uploads, captured on the transaction detail page (StepCard in
// TransactionsPage) and stored in `transaction_stages` (fields JSONB) +
// `attachments` (files, entity_type='transaction_stage').
//
// This is the SAME data the future department-routed workflow (see
// workflowConfig.js) will consume — so the later "split into department tabs"
// is a routing change, not a data re-model. «اصدار وتجديد الإقامة» (iqama_issuance)
// is intentionally shared across permanent/temporary visa + transfer + renewal.
//
// Field shape: { key, label_ar, label_en, type, required?, accept?, options?, direction?, placeholder? }
//   type:  'text' | 'date' | 'select' | 'textarea' | 'file'
//   file:  accept 'pdf' (PDF only) or 'image' (image OR pdf). `key` doubles as the
//          attachments.notes tag for that file slot.
// Stage flags: accountant_approval:true → the stage shows the «موافقة المحاسب» gate.
//
// NOTE: services that already capture intake fields via the TXN_SERVICES registry
// (passport_update, profession_change, documents, general, external_transfer_approval)
// only add their NEW pieces here (file / approval / extra fields) to avoid double entry.
// ═══════════════════════════════════════════════════════════════════════════

export const STAGE_DEFS = {
  // ── shared visa/iqama building blocks ──
  visa_issuance: {
    ar: 'إصدار التأشيرة', en: 'Visa Issuance', c: '#5dade2',
    fields: [
      { key: 'visa_number',  label_ar: 'رقم التأشيرة', label_en: 'Visa No.',  type: 'text', direction: 'ltr', required: true },
      { key: 'border_number',label_ar: 'رقم الحدود',   label_en: 'Border No.',type: 'text', direction: 'ltr' },
      { key: 'visa_file',    label_ar: 'ملف التأشيرة', label_en: 'Visa File', type: 'file', accept: 'image' },
    ],
  },
  iqama_issuance: {
    ar: 'إصدار وتجديد الإقامة', en: 'Iqama Issuance & Renewal', c: '#2ecc71',
    fields: [
      { key: 'iqama_number', label_ar: 'رقم الإقامة',           label_en: 'Iqama No.',     type: 'text', direction: 'ltr' },
      { key: 'iqama_expiry', label_ar: 'تاريخ انتهاء الإقامة',  label_en: 'Iqama Expiry',  type: 'date', required: true },
      { key: 'muqeem_file',  label_ar: 'ملف مقيم',              label_en: 'Muqeem File',   type: 'file', accept: 'pdf' },
    ],
  },

  // ── single-step services ──
  ajeer: {
    ar: 'عقد أجير', en: 'Ajeer Contract', c: '#9b59b6',
    fields: [
      { key: 'ajeer_contract_no', label_ar: 'رقم عقد أجير',     label_en: 'Ajeer Contract No.', type: 'text', direction: 'ltr', required: true },
      { key: 'ajeer_expiry',      label_ar: 'تاريخ انتهاء العقد',label_en: 'Contract Expiry',    type: 'date' },
      { key: 'contract_file',     label_ar: 'ملف العقد',         label_en: 'Contract File',      type: 'file', accept: 'pdf' },
    ],
  },
  chamber: {
    ar: 'الغرفة التجارية', en: 'Chamber of Commerce', c: '#0D47A1',
    fields: [
      { key: 'request_no',   label_ar: 'رقم الطلب', label_en: 'Request No.', type: 'text', direction: 'ltr', required: true },
      { key: 'chamber_file', label_ar: 'الملف',     label_en: 'File',        type: 'file', accept: 'image' },
    ],
  },
  medical_insurance: {
    ar: 'التأمين الطبي', en: 'Medical Insurance', c: '#16a085',
    fields: [
      { key: 'insurance_company', label_ar: 'اسم شركة التأمين',          label_en: 'Insurance Company',     type: 'text', required: true },
      { key: 'insurance_expiry',  label_ar: 'تاريخ انتهاء التأمين الجديد',label_en: 'New Insurance Expiry',  type: 'date', required: true },
      { key: 'policy_file',       label_ar: 'وثيقة البوليصة',            label_en: 'Policy File',           type: 'file', accept: 'pdf' },
    ],
  },
  profession_change: {
    ar: 'تغيير المهنة', en: 'Occupation Change', c: '#bb8fce',
    fields: [
      { key: 'muqeem_file', label_ar: 'ملف مقيم بالمهنة الجديدة', label_en: 'Muqeem File (new occupation)', type: 'file', accept: 'pdf' },
    ],
  },
  external_transfer: {
    ar: 'الموافقة للنقل الخارجي', en: 'External Transfer Approval', c: '#f39c12', accountant_approval: true,
    fields: [
      { key: 'new_company', label_ar: 'اسم الشركة الجديدة', label_en: 'New Company',  type: 'text', required: true },
      { key: 'company_700', label_ar: 'الرقم الموحد (700)', label_en: 'Unified (700)',type: 'text', direction: 'ltr' },
      { key: 'owner_name',  label_ar: 'اسم المالك',         label_en: 'Owner Name',   type: 'text' },
    ],
  },
  salary_update: {
    ar: 'تعديل الرواتب', en: 'Salary Update', c: '#27ae60',
    fields: [
      { key: 'gosi_salary_file', label_ar: 'ملف الراتب الجديد من التأمينات', label_en: 'New GOSI Salary File', type: 'file', accept: 'pdf' },
    ],
  },
  exit_reentry: {
    ar: 'إصدار/تمديد خروج وعودة', en: 'Exit / Re-entry', c: '#5dade2',
    fields: [
      { key: 'visa_number', label_ar: 'رقم التأشيرة', label_en: 'Visa No.',  type: 'text', direction: 'ltr', required: true },
      { key: 'visa_file',   label_ar: 'ملف التأشيرة', label_en: 'Visa File', type: 'file', accept: 'image' },
    ],
  },
  final_exit: {
    ar: 'خروج نهائي', en: 'Final Exit', c: '#e87265', accountant_approval: true,
    fields: [
      { key: 'visa_number', label_ar: 'رقم التأشيرة', label_en: 'Visa No.',  type: 'text', direction: 'ltr', required: true },
      { key: 'visa_file',   label_ar: 'ملف التأشيرة', label_en: 'Visa File', type: 'file', accept: 'image' },
    ],
  },
  passport_update: {
    ar: 'تحديث بيانات الجواز', en: 'Passport Update', c: '#5dade2',
    fields: [
      { key: 'passport_file', label_ar: 'صورة البيانات الجديدة', label_en: 'New Data Image', type: 'file', accept: 'image' },
    ],
  },
  iqama_print: {
    ar: 'طباعة الإقامة', en: 'Iqama Print', c: '#d4a017',
    fields: [
      { key: 'receipt_date', label_ar: 'تاريخ الاستلام', label_en: 'Receipt Date', type: 'date', required: true },
      { key: 'iqama_photo',  label_ar: 'صورة الإقامة',   label_en: 'Iqama Photo',  type: 'file', accept: 'image' },
    ],
  },
  documents: {
    ar: 'المستندات', en: 'Documents', c: '#d4a017',
    fields: [
      { key: 'document_file', label_ar: 'المستند', label_en: 'Document', type: 'file', accept: 'image' },
    ],
  },
  general: {
    ar: 'تفاصيل الخدمة العامة', en: 'General Service', c: '#7f8c8d',
    fields: [
      { key: 'general_file', label_ar: 'ملف مرفق', label_en: 'Attachment', type: 'file', accept: 'image' },
    ],
  },
}

// service_type.code → ordered stage codes (use the real code, not the normalized data.code).
export const SERVICE_STAGES = {
  work_visa_permanent: ['visa_issuance', 'iqama_issuance'],
  work_visa_temporary: ['visa_issuance', 'iqama_issuance'],
  transfer:            ['iqama_issuance'],
  iqama_renewal:       ['iqama_issuance'],
  ajeer:               ['ajeer'],
  other:               ['chamber'],
  medical_insurance:   ['medical_insurance'],
  profession_change:   ['profession_change'],
  external_transfer_approval: ['external_transfer'],
  name_translation:    ['salary_update'],
  exit_reentry_visa:   ['exit_reentry'],
  final_exit_visa:     ['final_exit'],
  passport_update:     ['passport_update'],
  iqama_print:         ['iqama_print'],
  documents:           ['documents'],
  general:             ['general'],
}

export const stagesForService = (code) => SERVICE_STAGES[code] || []
export const stageDef = (stageCode) => STAGE_DEFS[stageCode] || null
export const serviceHasStages = (code) => !!(code && SERVICE_STAGES[code])
