// ═══════════════════════════════════════════════════════════════════════════
// مدخلات إنجاز الخدمات المُدارة بالسجل — تُدخَل في نافذة «حالة المعاملة» عند «تم الإنجاز».
// المصدر الموحَّد الذي يقود: نافذة الإنجاز (ActionModal) · كرت حالة المعاملة في صفحة التفاصيل
// · قسم «المعاملة» في الطباعة (invoicePrint.js).
//
// لكل خدمة قائمة حقول؛ الحقل غير الملفّي يُحفظ في other_applications.details[key]،
// والحقل الملفّي يُرفع كمرفق للطلب (attachments بـ entity_type=service_request, notes=key).
// type: 'text' | 'date' | 'number' | 'file'.  req = إجباري.  mono/money = تنسيق العرض.
// inLabel_* = عنوان الحقل داخل النافذة (إن اختلف عن عنوان العرض label_*).
// ═══════════════════════════════════════════════════════════════════════════
export const DONE_INPUTS = {
  iqama_print: [
    { key: 'iqama_received_date', label_ar: 'تاريخ استلام الإقامة', label_en: 'Iqama Receipt Date', type: 'date', req: true },
    { key: 'iqama_photo', label_ar: 'صورة الإقامة', label_en: 'Iqama Photo', type: 'file', req: true, inLabel_ar: 'إرفاق صورة من الإقامة', inLabel_en: 'Attach Iqama photo' },
  ],
  medical_insurance: [
    { key: 'ins_company', label_ar: 'اسم الشركة', label_en: 'Insurance Company', type: 'text', req: true },
    { key: 'ins_policy_no', label_ar: 'رقم بوليصة التأمين', label_en: 'Policy No', type: 'text', req: true, mono: true },
    { key: 'ins_expiry', label_ar: 'تاريخ انتهاء التأمين', label_en: 'Insurance Expiry', type: 'date', req: true },
    { key: 'ins_policy_file', label_ar: 'ملف بوليصة التأمين', label_en: 'Policy File', type: 'file', req: true, fixedHeight: true, inLabel_ar: 'إرفاق ملف بوليصة التأمين', inLabel_en: 'Attach policy file' },
  ],
  profession_change: [
    { key: 'new_occupation', label_ar: 'المهنة الجديدة', label_en: 'New Occupation', type: 'select', source: 'occupations', req: true },
    { key: 'pc_muqeem_file', label_ar: 'ملف مقيم', label_en: 'Muqeem File', type: 'file', req: true, inLabel_ar: 'إرفاق ملف مقيم', inLabel_en: 'Attach Muqeem file' },
  ],
  // خروج وعودة / خروج نهائي: تمرّان أولاً على بوّابة موافقة المحاسب، ثم عند الإنجاز تُدخَل بيانات التأشيرة الصادرة.
  exit_reentry_visa: [
    { key: 'visa_number', label_ar: 'رقم التأشيرة', label_en: 'Visa No', type: 'text', req: true, mono: true, full: true, digits: 9 },
    { key: 'visa_expiry', label_ar: 'تاريخ انتهاء التأشيرة', label_en: 'Visa Expiry', type: 'date', req: true },
    { key: 'visa_attachment', label_ar: 'مرفق التأشيرة', label_en: 'Visa Attachment', type: 'file', req: true, fixedHeight: true, inLabel_ar: 'إرفاق التأشيرة', inLabel_en: 'Attach visa' },
  ],
  final_exit_visa: [
    { key: 'visa_number', label_ar: 'رقم التأشيرة', label_en: 'Visa No', type: 'text', req: true, mono: true, full: true, digits: 9 },
    { key: 'visa_expiry', label_ar: 'تاريخ انتهاء التأشيرة', label_en: 'Visa Expiry', type: 'date', req: true },
    { key: 'visa_attachment', label_ar: 'مرفق التأشيرة', label_en: 'Visa Attachment', type: 'file', req: true, fixedHeight: true, inLabel_ar: 'إرفاق التأشيرة', inLabel_en: 'Attach visa' },
  ],
  // تعديل الراتب (name_translation): المرحلة الأولى عند الإنجاز — صورة شاشة الراتب الجديد فقط.
  // ثم تدخل المعاملة مرحلة «بانتظار إرجاع الراتب الأساسي» (انظر SALARY_RETURN_INPUTS).
  name_translation: [
    { key: 'salary_new_file', label_ar: 'صورة شاشة الراتب الجديد', label_en: 'New-salary screenshot', type: 'file', req: true, inLabel_ar: 'إرفاق صورة شاشة حساب العامل بالراتب الجديد', inLabel_en: 'Attach worker-account screenshot (new salary)' },
  ],
  // عقد أجير: عند الإنجاز يُدخَل رقم العقد + تاريخ انتهاء الرخصة + ملف العقد.
  ajeer: [
    { key: 'ajeer_contract_no', label_ar: 'رقم فاتورة العقد', label_en: 'Contract Invoice No', type: 'text', req: true, mono: true, full: true },
    { key: 'ajeer_license_expiry', label_ar: 'تاريخ انتهاء رخصة عقد أجير', label_en: 'Ajeer License Expiry', type: 'date', req: true },
    { key: 'ajeer_contract_file', label_ar: 'ملف العقد', label_en: 'Contract File', type: 'file', req: true, fixedHeight: true, inLabel_ar: 'إرفاق ملف العقد', inLabel_en: 'Attach contract file' },
  ],
  // الغرفة التجارية (code = 'other'): عند الإنجاز يُدخَل رقم الطلب + ملف التصديق.
  other: [
    { key: 'chamber_request_no', label_ar: 'رقم الطلب', label_en: 'Request No', type: 'text', req: true, mono: true, full: true },
    { key: 'chamber_cert_file', label_ar: 'ملف التصديق من الغرفة التجارية', label_en: 'Chamber Certification File', type: 'file', req: true, inLabel_ar: 'إرفاق ملف التصديق من الغرفة التجارية', inLabel_en: 'Attach chamber certification file' },
  ],
}

// تعديل الراتب — المرحلة الثانية: إرجاع الراتب للراتب الأساسي (نافذة «إرجاع الراتب»).
export const SALARY_RETURN_INPUTS = [
  { key: 'base_salary', label_ar: 'الراتب الأساسي', label_en: 'Base Salary', type: 'number', req: true, money: true },
  { key: 'salary_base_file', label_ar: 'صورة شاشة الراتب الأساسي', label_en: 'Base-salary screenshot', type: 'file', req: true, inLabel_ar: 'إرفاق صورة شاشة حساب العامل بالراتب الأساسي', inLabel_en: 'Attach worker-account screenshot (base salary)' },
]

// الخدمات التي تأخذ معاملة طباعة الإقامة نفسها: الطرف = العامل فقط، وقسم «المعاملة» مستقل في الطباعة.
export const SELF_PARTY_DONE_SVCS = ['iqama_print', 'medical_insurance', 'profession_change', 'name_translation', 'exit_reentry_visa', 'final_exit_visa', 'ajeer', 'other']

// كل مفاتيح الملفّات (notes) عبر كل الخدمات والمراحل — لتحميلها دفعة واحدة من جدول attachments.
export const DONE_FILE_NOTES = ['iqama_photo', 'ins_policy_file', 'pc_muqeem_file', 'salary_new_file', 'salary_base_file', 'visa_attachment', 'ajeer_contract_file', 'chamber_cert_file']

export const doneInputsFor = (code) => DONE_INPUTS[code] || []
