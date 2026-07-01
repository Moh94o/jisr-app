// ═══════════════════════════════════════════════════════════════════════════
// Central registry for المعاملات (Transactions) service tabs.
//
// Single source of truth that drives, per service_type `code`:
//   • theme  — accent color + bilingual label (TransactionsPage SVC_THEME / cards)
//   • hero   — page title + description (TransactionsPage HERO)
//   • party  — who the request is raised for ('worker' = worker is the client)
//   • billable / pricing — whether the add-wizard creates an invoice
//   • listMode — which specific columns the list shows ('worker' | 'facility' | 'default')
//   • inputs — the add-wizard step-3 fields (same shape as SERVICE_INPUTS)
//   • detail — the fields rendered on the detail page (ApplicationDetails)
//
// Adding a new transaction tab is now: one entry here + (if new) one service_type
// lookup row + one TXN_SECTIONS line in App.jsx. The list/detail/actions/wizard all
// read from this file, mirroring the رواتب سبلاير (supplier_payroll) reference build.
//
// `inputs` keys that aren't a dedicated column on other_applications are written into
// the `details` JSONB column; the detail page reads them back from there
// (detail field source 'd:<key>'). Standard sources: w_name, w_iqama, w_phone,
// f_name, f_unified, f_hrsd, f_gosi, desc.
// ═══════════════════════════════════════════════════════════════════════════

const months = (n) => Array.from({ length: n }, (_, i) => ({ value: String(i + 1), label: `${i + 1} ${i + 1 >= 3 && i + 1 <= 10 ? 'أشهر' : 'شهر'}` }))
const years = (back = 6) => { const base = 1446; return Array.from({ length: back }, (_, i) => ({ value: String(base - i), label: `${base - i}هـ` })) }

export const TXN_SERVICES = {
  /* ─────── existing services routed via other_applications — now given specificity ─────── */
  passport_update: {
    theme: { c: '#5dade2', label_ar: 'تحديث بيانات الجواز', label_en: 'Passport Update' },
    hero: { ar: 'تحديث بيانات الجواز', en: 'Passport Update', dAr: 'إصدار ومتابعة طلبات تحديث بيانات جوازات العمّال', dEn: 'Issue and track worker passport-data update requests' },
    party: 'worker', billable: true, listMode: 'worker',
    // مفاتيح الحقول مطابقة لنموذج المعالج المخصّص (update_mode · new_passport_*) وتُحفظ في
    // other_applications.details عبر passportDetails في مُنشئ الطلب — فتُقرأ هنا وفي تفصيل الفاتورة وطباعتها.
    detail: [
      { src: 'w_name', l_ar: 'العامل', l_en: 'Worker' },
      { src: 'w_iqama', l_ar: 'رقم الإقامة', l_en: 'Iqama No', mono: true },
      { src: 'f_name', l_ar: 'المنشأة', l_en: 'Facility' },
      { src: 'd:update_mode', l_ar: 'نوع التحديث', l_en: 'Update Type', opts: { extend: 'تمديد الانتهاء', renew: 'تجديد (جواز جديد)' } },
      { src: 'd:new_passport_no', l_ar: 'رقم الجواز الجديد', l_en: 'New Passport No', mono: true },
      { src: 'd:new_passport_issue_city_name', l_ar: 'مكان الإصدار', l_en: 'Issue Place' },
      { src: 'd:new_passport_issue_date', l_ar: 'تاريخ الإصدار', l_en: 'Issue Date', mono: true, date: true },
      { src: 'd:new_passport_expiry', l_ar: 'انتهاء الجواز', l_en: 'Passport Expiry', mono: true, date: true },
    ],
  },
  profession_change: {
    theme: { c: '#bb8fce', label_ar: 'تغيير المهنة', label_en: 'Occupation Change' },
    hero: { ar: 'تغيير المهنة', en: 'Occupation Change', dAr: 'إصدار ومتابعة طلبات تغيير مهن العمّال', dEn: 'Issue and track worker profession-change requests' },
    party: 'worker', billable: true, listMode: 'worker',
    inputs: [
      { key: 'current_occupation', label_ar: 'المهنة الحالية', type: 'text' },
      { key: 'new_occupation', label_ar: 'المهنة الجديدة', type: 'select', required: true, source: 'occupations' },
    ],
    detail: [
      { src: 'w_name', l_ar: 'العامل', l_en: 'Worker' },
      { src: 'w_iqama', l_ar: 'رقم الإقامة', l_en: 'Iqama No', mono: true },
      { src: 'f_name', l_ar: 'المنشأة', l_en: 'Facility' },
      { src: 'd:current_occupation', l_ar: 'المهنة الحالية', l_en: 'Current Occupation' },
      { src: 'd:new_occupation', l_ar: 'المهنة الجديدة', l_en: 'New Occupation', color: '#2ecc71' },
    ],
  },
  external_transfer_approval: {
    theme: { c: '#f39c12', label_ar: 'الموافقة للنقل الخارجي', label_en: 'External Transfer Approval' },
    hero: { ar: 'الموافقة للنقل الخارجي', en: 'External Transfer Approval', dAr: 'إصدار ومتابعة طلبات الموافقة على النقل الخارجي للعمّال', dEn: 'Issue and track external transfer-approval requests' },
    party: 'worker', billable: false, listMode: 'worker', needs_accountant_approval: true,
    inputs: [
      { key: 'target_facility_700', label_ar: 'الرقم الموحد للمنشأة المنقول إليها', type: 'text', direction: 'ltr', placeholder: '7XX XXX XXXX' },
      { key: 'reason', label_ar: 'السبب', type: 'textarea', grid_col: '1', placeholder: 'اكتب سبب طلب الموافقة على النقل الخارجي...' },
    ],
    detail: [
      { src: 'w_name', l_ar: 'العامل', l_en: 'Worker' },
      { src: 'w_iqama', l_ar: 'رقم الإقامة', l_en: 'Iqama No', mono: true },
      { src: 'f_name', l_ar: 'المنشأة الحالية', l_en: 'Current Facility' },
      { src: 'd:target_facility_700', l_ar: 'الرقم الموحد للوجهة', l_en: 'Target Unified No', mono: true },
      { src: 'd:reason', l_ar: 'السبب', l_en: 'Reason', wide: true },
    ],
  },
  exit_reentry_visa: {
    theme: { c: '#5dade2', label_ar: 'خروج وعودة', label_en: 'Exit / Re-entry Visa' },
    hero: { ar: 'خروج وعودة', en: 'Exit / Re-entry Visa', dAr: 'إصدار ومتابعة طلبات تأشيرات الخروج والعودة للعمّال ومدّتها — تمرّ على موافقة المحاسب', dEn: 'Issue and track worker exit / re-entry visa requests and their duration — routed through accountant approval' },
    party: 'worker', billable: true, listMode: 'worker', needs_accountant_approval: true,
    // مفاتيح الحقول مطابقة لما يقرأه حاسب السعر (exit_type · duration_months) كي لا يتأثر التسعير،
    // وتُحفظ الآن في other_applications.details فتظهر في صفحة التفاصيل.
    inputs: [
      { key: 'exit_type', label_ar: 'نوع التأشيرة', type: 'select', required: true, options: [
        { value: 'single', label: 'مفردة' }, { value: 'multiple', label: 'متعددة' },
      ] },
      { key: 'duration_months', label_ar: 'المدة', type: 'select', required: true, options: months(24) },
    ],
    detail: [
      { src: 'w_name', l_ar: 'العامل', l_en: 'Worker' },
      { src: 'w_iqama', l_ar: 'رقم الإقامة', l_en: 'Iqama No', mono: true },
      { src: 'f_name', l_ar: 'المنشأة', l_en: 'Facility' },
      { src: 'd:exit_type', l_ar: 'نوع التأشيرة', l_en: 'Visa Type', opts: { single: 'مفردة', multiple: 'متعددة' } },
      { src: 'd:duration_months', l_ar: 'المدة', l_en: 'Duration', months: true },
    ],
  },
  final_exit_visa: {
    theme: { c: '#e87265', label_ar: 'خروج نهائي', label_en: 'Final Exit' },
    hero: { ar: 'خروج نهائي', en: 'Final Exit', dAr: 'إصدار ومتابعة طلبات تأشيرات الخروج النهائي للعمّال — تمرّ على موافقة المحاسب', dEn: 'Issue and track worker final-exit visa requests — routed through accountant approval' },
    party: 'worker', billable: true, listMode: 'worker', needs_accountant_approval: true,
    inputs: [
      { key: 'reason', label_ar: 'السبب', type: 'textarea', grid_col: '1', placeholder: 'اكتب سبب طلب تأشيرة الخروج النهائي...' },
    ],
    detail: [
      { src: 'w_name', l_ar: 'العامل', l_en: 'Worker' },
      { src: 'w_iqama', l_ar: 'رقم الإقامة', l_en: 'Iqama No', mono: true },
      { src: 'f_name', l_ar: 'المنشأة', l_en: 'Facility' },
      { src: 'd:reason', l_ar: 'السبب', l_en: 'Reason', wide: true },
    ],
  },
  iqama_print: {
    theme: { c: '#B07D00', label_ar: 'طباعة الإقامة', label_en: 'Iqama Print' },
    hero: { ar: 'طباعة الإقامة', en: 'Iqama Print', dAr: 'إصدار ومتابعة طلبات طباعة الإقامات وتسليمها للعمّال', dEn: 'Issue and track iqama print & delivery requests for workers' },
    party: 'worker', billable: true, listMode: 'worker',
    inputs: [
      { key: 'print_reason', label_ar: 'السبب', type: 'textarea', required: true, grid_col: '1', placeholder: 'اكتب سبب طلب طباعة الإقامة...' },
    ],
    detail: [
      { src: 'w_name', l_ar: 'العامل', l_en: 'Worker' },
      { src: 'w_iqama', l_ar: 'رقم الإقامة', l_en: 'Iqama No', mono: true },
      { src: 'f_name', l_ar: 'المنشأة', l_en: 'Facility' },
      { src: 'd:print_reason', l_ar: 'السبب', l_en: 'Reason', wide: true },
    ],
  },
  name_translation: {
    theme: { c: '#27ae60', label_ar: 'تعديل الراتب', label_en: 'Salary Adjustment' },
    hero: { ar: 'تعديل الراتب', en: 'Salary Adjustment', dAr: 'إصدار ومتابعة طلبات تعديل رواتب العمّال', dEn: 'Issue and track worker salary-adjustment requests' },
    party: 'worker', billable: true, listMode: 'worker',
    inputs: [
      { key: 'new_salary', label_ar: 'الراتب الجديد', type: 'number', required: true, placeholder: '0' },
      { key: 'salary_months', label_ar: 'مدة الراتب', type: 'select', required: true, options: months(24) },
    ],
    detail: [
      { src: 'w_name', l_ar: 'العامل', l_en: 'Worker' },
      { src: 'w_iqama', l_ar: 'رقم الإقامة', l_en: 'Iqama No', mono: true },
      { src: 'f_name', l_ar: 'المنشأة', l_en: 'Facility' },
      { src: 'd:new_salary', l_ar: 'الراتب الجديد', l_en: 'New Salary', mono: true, money: true, color: '#2ecc71' },
      { src: 'd:salary_months', l_ar: 'مدة الراتب', l_en: 'Salary Months', months: true },
    ],
  },
  medical_insurance: {
    theme: { c: '#16a085', label_ar: 'تأمين طبي', label_en: 'Medical Insurance' },
    hero: { ar: 'تأمين طبي', en: 'Medical Insurance', dAr: 'إصدار ومتابعة طلبات التأمين الطبي للعمّال', dEn: 'Issue and track worker medical-insurance requests' },
    party: 'worker', billable: true, listMode: 'worker',
    // لا مدخلات إضافية وقت الطلب — العامل مُختار، والسعر يُحسب من عمره؛ التفاصيل تعرض بيانات العامل والمنشأة.
    detail: [
      { src: 'w_name', l_ar: 'العامل', l_en: 'Worker' },
      { src: 'w_iqama', l_ar: 'رقم الإقامة', l_en: 'Iqama No', mono: true },
      { src: 'f_name', l_ar: 'المنشأة', l_en: 'Facility' },
    ],
  },
  // «الغرفة التجارية» تُخزَّن تحت الكود القديم 'other'. المعالج يرسمها بواجهة مخصّصة (selSvc==='chamber_certification')،
  // فهذه المدخلات لا تُغيّر المعالج (مفتاحه chamber_certification) لكنها تُحفظ في details وتظهر في صفحة التفاصيل.
  other: {
    theme: { c: '#2980b9', label_ar: 'الغرفة التجارية', label_en: 'Chamber of Commerce' },
    hero: { ar: 'الغرفة التجارية', en: 'Chamber of Commerce', dAr: 'إصدار ومتابعة طلبات التصديق عبر الغرفة التجارية', dEn: 'Issue and track Chamber of Commerce certification requests' },
    party: 'worker', billable: true, listMode: 'worker',
    inputs: [
      { key: 'chamber_subtype', label_ar: 'نوع التصديق', type: 'select', options: [
        { value: 'printed', label: 'تصديق مطبوعات' }, { value: 'open_request', label: 'طلب مفتوح' },
      ] },
      { key: 'chamber_text', label_ar: 'نص الطلب', type: 'textarea', grid_col: '1' },
    ],
    detail: [
      { src: 'w_name', l_ar: 'العميل', l_en: 'Client' },
      { src: 'w_iqama', l_ar: 'رقم الإقامة', l_en: 'Iqama No', mono: true },
      { src: 'f_name', l_ar: 'المنشأة', l_en: 'Facility' },
      { src: 'd:chamber_subtype', l_ar: 'نوع التصديق', l_en: 'Type', opts: { printed: 'تصديق مطبوعات', open_request: 'طلب مفتوح' } },
      { src: 'd:chamber_text', l_ar: 'نص الطلب', l_en: 'Request Text', wide: true },
    ],
  },
  // عقد أجير: خدمة مُدارة بالكامل عبر السجل مثل «الغرفة التجارية» — تُخزَّن في other_applications
  // وتُعرَض تفاصيلها عبر مُحرّك السجل العام. وقت إنشاء الفاتورة يجمع المعالج: الرقم الموحد للمنشأة
  // المستعارة + المدينة + مدة العقد بالأشهر (فرع ajeer_contract المخصّص). أمّا «رقم العقد» ومرفق
  // «تصريح عقد أجير» فيُدخَلان لاحقًا في صفحة المعاملة عبر بطاقة المتابعة (مرّة واحدة) — مثل رقم معاملة
  // الغرفة وملفها. تجديد الإقامة وحده يبقى في جدوله الخاص.
  ajeer: {
    theme: { c: '#bb8fce', label_ar: 'عقد أجير', label_en: 'Ajeer Contract' },
    hero: { ar: 'عقد أجير', en: 'Ajeer Contract', dAr: 'إصدار ومتابعة عقود الأجير للعمّال بين المنشآت', dEn: 'Issue and track worker Ajeer contracts between facilities' },
    party: 'worker', billable: true, listMode: 'worker',
    // يرسمها المعالج عبر فرع ajeer_contract المخصّص؛ وجودها هنا يجعل مُنشئ الطلب يحفظها ضمن details
    // (المدينة تُحفظ كـ id؛ يُضاف city_name منفصلًا في الحفظ ليُعرض في التفاصيل).
    inputs: [
      { key: 'borrower_700', label_ar: 'الرقم الموحد للمنشأة المستعارة', type: 'text', required: true, direction: 'ltr' },
      { key: 'city', label_ar: 'المدينة', type: 'select', required: true, source: 'cities' },
      { key: 'contract_months', label_ar: 'مدة العقد', type: 'select', required: true },
    ],
    detail: [
      { src: 'w_name', l_ar: 'العامل', l_en: 'Worker' },
      { src: 'w_iqama', l_ar: 'رقم الإقامة', l_en: 'Iqama No', mono: true },
      { src: 'f_name', l_ar: 'المنشأة', l_en: 'Facility' },
      { src: 'd:borrower_700', l_ar: 'الرقم الموحد للمنشأة المستعارة', l_en: 'Borrower Unified No', mono: true, wide: true },
      { src: 'd:city_name', l_ar: 'المدينة', l_en: 'City' },
      { src: 'd:contract_months', l_ar: 'مدة العقد', l_en: 'Duration', months: true },
    ],
  },
  iqama_renewal: {
    theme: { c: '#16a085', label_ar: 'تجديد الإقامة', label_en: 'Iqama Renewal' },
    hero: { ar: 'تجديد الإقامة', en: 'Iqama Renewal', dAr: 'إصدار ومتابعة طلبات تجديد إقامات العمّال ومدّتها', dEn: 'Issue and track worker iqama-renewal requests and their duration' },
    party: 'worker', billable: true, listMode: 'worker',
  },
  saudization: {
    theme: { c: '#16a085', label_ar: 'السعودة', label_en: 'Saudization' },
    hero: { ar: 'السعودة', en: 'Saudization', dAr: 'إصدار ومتابعة طلبات السعودة ونطاقات المنشآت', dEn: 'Issue and track Saudization & Nitaqat requests' },
    party: 'worker', billable: true, listMode: 'facility',
    inputs: [
      { key: 'current_pct', label_ar: 'نسبة السعودة الحالية %', type: 'number' },
      { key: 'target_pct', label_ar: 'نسبة السعودة المستهدفة %', type: 'number', required: true },
      { key: 'nitaqat_band', label_ar: 'النطاق', type: 'select', options: [
        { value: 'platinum', label: 'بلاتيني' }, { value: 'high_green', label: 'أخضر مرتفع' },
        { value: 'mid_green', label: 'أخضر متوسط' }, { value: 'low_green', label: 'أخضر منخفض' },
        { value: 'yellow', label: 'أصفر' }, { value: 'red', label: 'أحمر' },
      ] },
    ],
    detail: [
      { src: 'f_name', l_ar: 'المنشأة', l_en: 'Facility' },
      { src: 'f_unified', l_ar: 'الرقم الموحد', l_en: 'Unified No', mono: true },
      { src: 'd:current_pct', l_ar: 'النسبة الحالية', l_en: 'Current %', mono: true, suffix: '%' },
      { src: 'd:target_pct', l_ar: 'النسبة المستهدفة', l_en: 'Target %', mono: true, suffix: '%', color: '#2ecc71' },
      { src: 'd:nitaqat_band', l_ar: 'النطاق', l_en: 'Nitaqat Band', opts: { platinum: 'بلاتيني', high_green: 'أخضر مرتفع', mid_green: 'أخضر متوسط', low_green: 'أخضر منخفض', yellow: 'أصفر', red: 'أحمر' } },
    ],
  },
  general: {
    theme: { c: '#7f8c8d', label_ar: 'خدمة عامة', label_en: 'General' },
    hero: { ar: 'خدمة عامة', en: 'General', dAr: 'الطلبات المصنّفة ضمن «الخدمة العامة» — أي معاملة لا تندرج تحت خدمة محدّدة — ومتابعة حالتها', dEn: 'Requests under the “General” service — any transaction not tied to a specific service — tracked by status' },
    party: 'worker', billable: true, listMode: 'worker',
    inputs: [
      { key: 'description', label_ar: 'وصف الخدمة', type: 'textarea', required: true, grid_col: '1', placeholder: 'اكتب تفاصيل الخدمة المطلوبة...' },
    ],
    detail: [
      { src: 'w_name', l_ar: 'العامل', l_en: 'Worker' },
      { src: 'w_iqama', l_ar: 'رقم الإقامة', l_en: 'Iqama No', mono: true },
      { src: 'f_name', l_ar: 'المنشأة', l_en: 'Facility' },
      { src: 'desc', l_ar: 'الوصف', l_en: 'Description', wide: true },
    ],
  },

  /* ─────── documents — existing lookup, now a full tab ─────── */
  documents: {
    theme: { c: '#B07D00', label_ar: 'استخراج الوثائق', label_en: 'Document Issuance' },
    hero: { ar: 'استخراج الوثائق', en: 'Document Issuance', dAr: 'إصدار ومتابعة طلبات استخراج الوثائق والمستندات الرسمية', dEn: 'Issue and track official document-issuance requests' },
    party: 'worker', billable: true, listMode: 'worker',
    inputs: [
      { key: 'doc_type', label_ar: 'نوع المستند', type: 'select', required: true, options: [
        { value: 'commercial_register', label: 'السجل التجاري' }, { value: 'resident_file', label: 'ملف مقيم' },
        { value: 'iqama_copy', label: 'صورة إقامة' }, { value: 'contract', label: 'عقد عمل' },
        { value: 'salary_cert', label: 'تعريف بالراتب' }, { value: 'other', label: 'أخرى' },
      ] },
      { key: 'doc_lang', label_ar: 'لغة المستند', type: 'select', required: true, options: [
        { value: 'ar', label: 'عربي' }, { value: 'en', label: 'إنجليزي' },
      ] },
      { key: 'copies', label_ar: 'عدد النسخ', type: 'number' },
    ],
    detail: [
      { src: 'w_name', l_ar: 'المستفيد', l_en: 'Beneficiary' },
      { src: 'w_iqama', l_ar: 'رقم الإقامة', l_en: 'Iqama No', mono: true },
      { src: 'f_name', l_ar: 'المنشأة', l_en: 'Facility' },
      { src: 'd:doc_type', l_ar: 'نوع المستند', l_en: 'Document Type', opts: { commercial_register: 'السجل التجاري', resident_file: 'ملف مقيم', iqama_copy: 'صورة إقامة', contract: 'عقد عمل', salary_cert: 'تعريف بالراتب', other: 'أخرى' } },
      { src: 'd:doc_lang', l_ar: 'اللغة', l_en: 'Language', opts: { ar: 'عربي', en: 'إنجليزي' } },
      { src: 'd:copies', l_ar: 'عدد النسخ', l_en: 'Copies', mono: true },
    ],
  },

  /* ─────── new stub tabs — full DB-backed builds ─────── */
  najiz_wakala: {
    theme: { c: '#9b59b6', label_ar: 'وكالات ناجز', label_en: 'Najiz Agencies' },
    hero: { ar: 'وكالات ناجز', en: 'Najiz Agencies', dAr: 'إصدار ومتابعة الوكالات الإلكترونية عبر منصة ناجز', dEn: 'Issue and track electronic agencies via the Najiz portal' },
    party: 'worker', billable: true, listMode: 'facility',
    inputs: [
      { key: 'wakala_type', label_ar: 'نوع الوكالة', type: 'select', required: true, options: [
        { value: 'government', label: 'وكالة جهات حكومية' }, { value: 'banking', label: 'وكالة بنكية' },
        { value: 'litigation', label: 'وكالة مرافعة' }, { value: 'general', label: 'وكالة عامة' },
      ] },
      { key: 'agent_name', label_ar: 'اسم الوكيل', type: 'text', required: true },
      { key: 'wakala_number', label_ar: 'رقم الوكالة', type: 'text', direction: 'ltr' },
      { key: 'wakala_expiry', label_ar: 'تاريخ انتهاء الوكالة', type: 'date' },
    ],
    detail: [
      { src: 'f_name', l_ar: 'المنشأة', l_en: 'Facility' },
      { src: 'f_unified', l_ar: 'الرقم الموحد', l_en: 'Unified No', mono: true },
      { src: 'd:wakala_type', l_ar: 'نوع الوكالة', l_en: 'Agency Type', opts: { government: 'جهات حكومية', banking: 'بنكية', litigation: 'مرافعة', general: 'عامة' } },
      { src: 'd:agent_name', l_ar: 'اسم الوكيل', l_en: 'Agent Name' },
      { src: 'd:wakala_number', l_ar: 'رقم الوكالة', l_en: 'Agency No', mono: true },
      { src: 'd:wakala_expiry', l_ar: 'انتهاء الوكالة', l_en: 'Expiry', mono: true, date: true },
    ],
  },
  gosi_salary_update: {
    theme: { c: '#27ae60', label_ar: 'رواتب التأمينات', label_en: 'GOSI Salaries' },
    hero: { ar: 'رواتب التأمينات', en: 'GOSI Salaries', dAr: 'إصدار ومتابعة طلبات تحديث رواتب التأمينات الاجتماعية للعمّال', dEn: 'Issue and track GOSI salary-update requests for workers' },
    party: 'worker', billable: true, listMode: 'worker',
    inputs: [
      { key: 'gosi_salary', label_ar: 'الراتب لدى التأمينات', type: 'number', required: true },
      { key: 'effective_month', label_ar: 'شهر السريان', type: 'select', options: months(12) },
    ],
    detail: [
      { src: 'w_name', l_ar: 'العامل', l_en: 'Worker' },
      { src: 'w_iqama', l_ar: 'رقم الإقامة', l_en: 'Iqama No', mono: true },
      { src: 'f_name', l_ar: 'المنشأة', l_en: 'Facility' },
      { src: 'f_gosi', l_ar: 'رقم التأمينات', l_en: 'GOSI No', mono: true },
      { src: 'd:gosi_salary', l_ar: 'الراتب لدى التأمينات', l_en: 'GOSI Salary', mono: true, money: true, color: '#B07D00' },
      { src: 'd:effective_month', l_ar: 'شهر السريان', l_en: 'Effective Month', months: true },
    ],
  },
  wps_mudad: {
    theme: { c: '#16a085', label_ar: 'حماية الأجور (مدد)', label_en: 'WPS (Mudad)' },
    hero: { ar: 'حماية الأجور (مدد)', en: 'Wage Protection (Mudad)', dAr: 'إصدار ومتابعة طلبات رفع ملفات حماية الأجور عبر منصة مدد', dEn: 'Issue and track wage-protection (WPS) file uploads via Mudad' },
    party: 'worker', billable: true, listMode: 'facility',
    inputs: [
      { key: 'salary_month', label_ar: 'شهر الرواتب', type: 'select', required: true, options: months(12) },
      { key: 'file_status', label_ar: 'حالة الملف', type: 'select', options: [
        { value: 'matched', label: 'مطابق' }, { value: 'not_matched', label: 'غير مطابق' }, { value: 'pending', label: 'قيد المراجعة' },
      ] },
      { key: 'workers_count', label_ar: 'عدد العمّال', type: 'number' },
    ],
    detail: [
      { src: 'f_name', l_ar: 'المنشأة', l_en: 'Facility' },
      { src: 'f_unified', l_ar: 'الرقم الموحد', l_en: 'Unified No', mono: true },
      { src: 'd:salary_month', l_ar: 'شهر الرواتب', l_en: 'Salary Month', months: true },
      { src: 'd:workers_count', l_ar: 'عدد العمّال', l_en: 'Workers', mono: true },
      { src: 'd:file_status', l_ar: 'حالة الملف', l_en: 'File Status', opts: { matched: 'مطابق', not_matched: 'غير مطابق', pending: 'قيد المراجعة' } },
    ],
  },
  zatca: {
    theme: { c: '#e67e22', label_ar: 'الزكاة والدخل', label_en: 'ZATCA' },
    hero: { ar: 'الزكاة والدخل', en: 'ZATCA', dAr: 'إصدار ومتابعة إقرارات الزكاة وضريبة القيمة المضافة للمنشآت', dEn: 'Issue and track Zakat & VAT declarations for facilities' },
    party: 'worker', billable: true, listMode: 'facility',
    inputs: [
      { key: 'declaration_type', label_ar: 'نوع الإقرار', type: 'select', required: true, options: [
        { value: 'vat', label: 'ضريبة القيمة المضافة' }, { value: 'zakat', label: 'الزكاة' }, { value: 'withholding', label: 'ضريبة الاستقطاع' },
      ] },
      { key: 'period', label_ar: 'الفترة', type: 'select', options: [
        { value: 'q1', label: 'الربع الأول' }, { value: 'q2', label: 'الربع الثاني' }, { value: 'q3', label: 'الربع الثالث' }, { value: 'q4', label: 'الربع الرابع' }, { value: 'annual', label: 'سنوي' },
      ] },
      { key: 'amount', label_ar: 'مبلغ الإقرار', type: 'number' },
    ],
    detail: [
      { src: 'f_name', l_ar: 'المنشأة', l_en: 'Facility' },
      { src: 'f_unified', l_ar: 'الرقم الموحد', l_en: 'Unified No', mono: true },
      { src: 'd:declaration_type', l_ar: 'نوع الإقرار', l_en: 'Declaration', opts: { vat: 'القيمة المضافة', zakat: 'الزكاة', withholding: 'الاستقطاع' } },
      { src: 'd:period', l_ar: 'الفترة', l_en: 'Period', opts: { q1: 'الربع الأول', q2: 'الربع الثاني', q3: 'الربع الثالث', q4: 'الربع الرابع', annual: 'سنوي' } },
      { src: 'd:amount', l_ar: 'مبلغ الإقرار', l_en: 'Amount', mono: true, money: true, color: '#B07D00' },
    ],
  },
  violation_fee: {
    theme: { c: '#e87265', label_ar: 'المخالفات والرسوم', label_en: 'Violations & Fees' },
    hero: { ar: 'المخالفات والرسوم', en: 'Violations & Fees', dAr: 'تسجيل ومتابعة المخالفات والرسوم الحكومية وسدادها', dEn: 'Record and track government violations & fees and their settlement' },
    party: 'worker', billable: true, listMode: 'worker',
    inputs: [
      { key: 'authority', label_ar: 'الجهة', type: 'select', required: true, options: [
        { value: 'jawazat', label: 'الجوازات' }, { value: 'mol', label: 'مكتب العمل' }, { value: 'traffic', label: 'المرور' }, { value: 'baladi', label: 'البلدية' }, { value: 'gosi', label: 'التأمينات' }, { value: 'other', label: 'أخرى' },
      ] },
      { key: 'violation_number', label_ar: 'رقم المخالفة', type: 'text', direction: 'ltr' },
      { key: 'amount', label_ar: 'مبلغ المخالفة', type: 'number', required: true },
    ],
    detail: [
      { src: 'w_name', l_ar: 'الطرف', l_en: 'Party' },
      { src: 'w_iqama', l_ar: 'رقم الإقامة', l_en: 'Iqama No', mono: true },
      { src: 'f_name', l_ar: 'المنشأة', l_en: 'Facility' },
      { src: 'd:authority', l_ar: 'الجهة', l_en: 'Authority', opts: { jawazat: 'الجوازات', mol: 'مكتب العمل', traffic: 'المرور', baladi: 'البلدية', gosi: 'التأمينات', other: 'أخرى' } },
      { src: 'd:violation_number', l_ar: 'رقم المخالفة', l_en: 'Violation No', mono: true },
      { src: 'd:amount', l_ar: 'مبلغ المخالفة', l_en: 'Amount', mono: true, money: true, color: '#e87265' },
    ],
  },
  financial_statement: {
    theme: { c: '#3498db', label_ar: 'القوائم المالية', label_en: 'Financial Statements' },
    hero: { ar: 'القوائم المالية', en: 'Financial Statements', dAr: 'إعداد ومتابعة طلبات القوائم المالية السنوية للمنشآت', dEn: 'Prepare and track annual financial-statement requests' },
    party: 'worker', billable: true, listMode: 'facility',
    inputs: [
      { key: 'fiscal_year', label_ar: 'السنة المالية', type: 'select', required: true, options: [
        { value: '2025', label: '2025' }, { value: '2024', label: '2024' }, { value: '2023', label: '2023' }, { value: '2022', label: '2022' },
      ] },
      { key: 'statement_type', label_ar: 'نوع القائمة', type: 'select', options: [
        { value: 'audited', label: 'مدققة' }, { value: 'unaudited', label: 'غير مدققة' }, { value: 'zakat', label: 'لأغراض الزكاة' },
      ] },
    ],
    detail: [
      { src: 'f_name', l_ar: 'المنشأة', l_en: 'Facility' },
      { src: 'f_unified', l_ar: 'الرقم الموحد', l_en: 'Unified No', mono: true },
      { src: 'd:fiscal_year', l_ar: 'السنة المالية', l_en: 'Fiscal Year', mono: true },
      { src: 'd:statement_type', l_ar: 'نوع القائمة', l_en: 'Statement Type', opts: { audited: 'مدققة', unaudited: 'غير مدققة', zakat: 'لأغراض الزكاة' } },
    ],
  },
  subscription_renewal: {
    theme: { c: '#1abc9c', label_ar: 'الاشتراكات والتجديدات', label_en: 'Subscriptions & Renewals' },
    hero: { ar: 'الاشتراكات والتجديدات', en: 'Subscriptions & Renewals', dAr: 'إصدار ومتابعة تجديد اشتراكات المنشآت في المنصات الحكومية', dEn: 'Issue and track facility subscription renewals across government platforms' },
    party: 'worker', billable: true, listMode: 'facility',
    inputs: [
      { key: 'platform', label_ar: 'المنصة', type: 'select', required: true, options: [
        { value: 'qiwa', label: 'قوى' }, { value: 'mudad', label: 'مدد' }, { value: 'gosi', label: 'التأمينات' }, { value: 'baladi', label: 'بلدي' }, { value: 'chamber', label: 'الغرفة التجارية' }, { value: 'absher', label: 'أبشر أعمال' },
      ] },
      { key: 'period_months', label_ar: 'مدة الاشتراك', type: 'select', required: true, options: months(24) },
      { key: 'expiry_date', label_ar: 'تاريخ انتهاء الاشتراك', type: 'date' },
    ],
    detail: [
      { src: 'f_name', l_ar: 'المنشأة', l_en: 'Facility' },
      { src: 'f_unified', l_ar: 'الرقم الموحد', l_en: 'Unified No', mono: true },
      { src: 'd:platform', l_ar: 'المنصة', l_en: 'Platform', opts: { qiwa: 'قوى', mudad: 'مدد', gosi: 'التأمينات', baladi: 'بلدي', chamber: 'الغرفة التجارية', absher: 'أبشر أعمال' } },
      { src: 'd:period_months', l_ar: 'مدة الاشتراك', l_en: 'Duration', months: true },
      { src: 'd:expiry_date', l_ar: 'انتهاء الاشتراك', l_en: 'Expiry', mono: true, date: true, color: '#2ecc71' },
    ],
  },
}

// Codes that store their flexible fields in other_applications.details and render via the registry.
export const TXN_REGISTRY_CODES = Object.keys(TXN_SERVICES)

// Helper: resolve the registry entry for a service_type code (null for built-in specials).
export const txnServiceFor = (code) => (code && TXN_SERVICES[code]) || null
