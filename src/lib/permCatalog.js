// ════════════════════════════════════════════════════════════════════════
// permCatalog.js — the single source of truth for the granular permission
// system. Every sidebar tab is described here with:
//   • module        → the permission module that gates its actions
//   • actions[]     → every actionable button (create/edit/delete/special),
//                     each seeded into the DB `permissions` catalog and
//                     enforced both in the UI (can()) and DB RLS.
//   • cards[]       → every card/section on the record's DETAIL page, each
//                     individually hideable per user. Card visibility lives in
//                     users.ui_visibility under the key `card:<tab>:<key>`
//                     (default VISIBLE — only an explicit `false` hides it).
//
// Per-tab office scoping lives in users.ui_visibility under `office:<tab>`
// ( { mode:'inherit'|'all'|'specific', ids:[branchId…] } ; default inherit ).
//
// This file is imported by:
//   • lib/permissions.js   (cardVisible / cardActionAllowed / tabOffices / tabModule)
//   • PermissionsPage.jsx  (the control-panel editor — reads MODULE_ACTIONS + TAB_CARDS)
//   • the individual tab pages (to gate buttons and cards)
// and mirrored by the DB migration that seeds `public.permissions`.
//
// ┌─ SINGLE SOURCE OF TRUTH ───────────────────────────────────────────────┐
// │ This catalog IS the permissions control panel. To add or remove a       │
// │ button or card and have it appear in the GM's control panel:            │
// │   • New TAB ACTION (page-level add/edit/delete/special): add it to      │
// │     MODULE_ACTIONS[<module>], then re-run scripts/genPermSql.mjs and    │
// │     apply the generated SQL (idempotent — only seeds the new rows).     │
// │   • New DETAIL CARD: add C('<key>','<عنوان>') to TAB_CARDS[<tab>].      │
// │   • New BUTTON INSIDE A CARD: add ca('<action>','<عنوان>',kind) to that │
// │     card's actions array.                                               │
// │ Then gate it in the page with can()/cardVisible()/canCardBtn(). The     │
// │ editor renders every entry here automatically — no editor change needed.│
// └─────────────────────────────────────────────────────────────────────────┘
// ════════════════════════════════════════════════════════════════════════

// ── Shared action label sets ────────────────────────────────────────────
const A = (action, label_ar, kind = action) => ({ action, label_ar, kind })

// Action lists keyed by module. Order = display order in the editor.
export const MODULE_ACTIONS = {
  home: [A('view', 'عرض اللوحة', 'view')],

  facilities: [
    A('view', 'عرض المنشآت', 'view'), A('create', 'إضافة منشأة', 'create'),
    A('edit', 'تعديل المنشآت', 'edit'), A('delete', 'حذف المنشآت', 'delete'),
    A('sync', 'مزامنة المنشآت', 'sync'),
  ],
  workers: [
    A('view', 'عرض العمالة', 'view'), A('create', 'إضافة عامل', 'create'),
    A('edit', 'تعديل العمالة', 'edit'), A('delete', 'حذف العمالة', 'delete'),
    A('sync', 'مزامنة العمالة', 'sync'),
  ],
  temp_workers: [
    A('view', 'عرض العمالة المؤقتة', 'view'), A('create', 'إضافة عامل مؤقت', 'create'),
    A('edit', 'تعديل العمالة المؤقتة', 'edit'), A('delete', 'حذف العمالة المؤقتة', 'delete'),
  ],
  work_visas: [
    A('view', 'عرض تأشيرات العمل', 'view'), A('edit', 'تعديل حالة الاستخدام', 'edit'),
  ],

  invoices: [
    A('view', 'عرض الفواتير', 'view'), A('create', 'إصدار فاتورة', 'create'),
    A('edit', 'تعديل الفواتير', 'edit'), A('delete', 'حذف الفواتير', 'delete'),
    A('record_payment', 'تسجيل دفعة', 'special'), A('cancel', 'إلغاء الفاتورة', 'special'),
    A('refund', 'استرجاع الفاتورة', 'special'), A('print', 'طباعة الفاتورة', 'print'),
    // موافقة المحاسب: صلاحية فعلية (لا مجرد نافذة) — بوّابة اعتماد المحاسب للخدمات التي تتطلبها.
    A('accountant_approve', 'موافقة المحاسب', 'special'),
  ],
  payments: [
    A('view', 'عرض المدفوعات', 'view'), A('pay', 'تسجيل سداد خدمة', 'special'),
    A('edit', 'تعديل السداد', 'edit'),
  ],
  ext_payments: [
    A('view', 'عرض السدادات الخارجية', 'view'), A('create', 'إضافة حوالة بنكية', 'create'),
    A('edit', 'تعديل السداد الخارجي', 'edit'),
  ],
  deposits: [
    A('view', 'عرض الإيداعات', 'view'), A('create', 'رفع طلب إيداع', 'create'),
    A('edit', 'تعديل الإيداعات', 'edit'),
  ],

  quotations: [
    A('view', 'عرض التسعيرات', 'view'), A('create', 'إنشاء تسعيرة', 'create'),
    A('price', 'تسعير', 'special'), A('approve', 'تصديق التسعيرة', 'special'),
    A('invoice', 'إصدار فاتورة من التسعيرة', 'special'),
    A('edit', 'تعديل التسعيرة', 'edit'), A('delete', 'حذف تسعيرة', 'delete'),
  ],
  renewal_calc: [
    A('view', 'عرض تسعيرات التجديد', 'view'), A('create', 'إنشاء تسعيرة تجديد', 'create'),
    A('price', 'تسعير', 'special'), A('approve', 'تصديق التسعيرة', 'special'),
    A('invoice', 'إصدار فاتورة من التسعيرة', 'special'),
    A('edit', 'تعديل التسعيرة', 'edit'), A('delete', 'حذف التسعيرة', 'delete'),
  ],

  sync_hub: [
    A('access', 'الوصول لمركز المزامنة', 'view'), A('sync', 'تنفيذ المزامنة', 'sync'),
    A('manage_operator', 'إدارة المشغّل', 'special'),
  ],

  // Per-service transaction modules share a common action shape.
  // (generated below by buildSvc)
  saudization: [
    A('view', 'عرض السعودة', 'view'), A('create', 'إضافة معاملة سعودة', 'create'),
    A('edit', 'تعديل', 'edit'), A('complete', 'تأكيد الإنجاز', 'special'),
  ],

  admin_clients: [
    A('view', 'عرض العملاء', 'view'), A('create', 'إضافة عميل', 'create'),
    A('edit', 'تعديل العملاء', 'edit'), A('delete', 'حذف العملاء', 'delete'),
  ],
  admin_agents: [
    A('view', 'عرض الوسطاء', 'view'), A('create', 'إضافة وسيط', 'create'),
    A('edit', 'تعديل الوسطاء', 'edit'), A('delete', 'حذف الوسطاء', 'delete'),
  ],

  admin_offices: [
    A('view', 'عرض المكاتب', 'view'), A('create', 'إضافة مكتب', 'create'),
    A('edit', 'تعديل المكاتب', 'edit'), A('delete', 'حذف المكاتب', 'delete'),
  ],
  admin_bank_accounts: [
    A('view', 'عرض الحسابات البنكية', 'view'), A('create', 'إضافة حساب بنكي', 'create'),
    A('edit', 'تعديل الحسابات البنكية', 'edit'), A('delete', 'حذف الحسابات البنكية', 'delete'),
  ],
  admin_permissions: [
    A('view', 'عرض المستخدمين', 'view'), A('create', 'إضافة مستخدم', 'create'),
    A('edit', 'تعديل المستخدمين', 'edit'), A('manage_permissions', 'إدارة الصلاحيات', 'special'),
  ],
  admin_services: [
    A('view', 'عرض إدارة الخدمات', 'view'), A('edit', 'تعديل الخدمات', 'edit'),
  ],
  admin_fees: [
    A('view', 'عرض الرسوم', 'view'), A('create', 'إضافة رسم', 'create'),
    A('edit', 'تعديل الرسوم', 'edit'), A('delete', 'حذف الرسوم', 'delete'),
  ],
  settings_fields: [
    A('view', 'عرض الحقول', 'view'), A('create', 'إضافة خانة/عنصر', 'create'),
    A('edit', 'تعديل الحقول', 'edit'), A('delete', 'حذف الحقول', 'delete'),
  ],
}

// ── Per-service transaction modules ─────────────────────────────────────
// Every service tab in transactions_hub maps to its own module svc_<code>,
// so the GM can control each service independently.
const SVC_ACTIONS = (extra = []) => [
  A('view', 'عرض المعاملات', 'view'), A('create', 'طلب خدمة جديد', 'create'),
  A('edit', 'تعديل المعاملة', 'edit'), A('delete', 'حذف المعاملة', 'delete'),
  A('complete', 'تأكيد الإنجاز', 'special'), A('cancel', 'إلغاء المعاملة', 'special'),
  A('attach', 'إدارة المرفقات', 'special'), ...extra,
]
// tab id → service module
export const SVC_TAB_MODULE = {
  'work-visa-permanent': 'svc_work_visa_permanent',
  'work-visa-temporary': 'svc_work_visa_temporary',
  'transfer': 'svc_transfer',
  'iqama-renewal': 'svc_iqama_renewal',
  'ajeer': 'svc_ajeer',
  'chamber': 'svc_chamber',
  'medical-insurance': 'svc_medical_insurance',
  'profession-change': 'svc_profession_change',
  'external-transfer': 'svc_external_transfer',
  'salary': 'svc_salary',
  'exit-reentry': 'svc_exit_reentry',
  'final-exit': 'svc_final_exit',
  'passport-update': 'svc_passport_update',
  'iqama-print': 'svc_iqama_print',
  'documents': 'svc_documents',
  'supplier-payroll': 'svc_supplier_payroll',
  'general': 'svc_general',
  'accountant-approvals': 'svc_accountant_approvals',
}
Object.values(SVC_TAB_MODULE).forEach(m => {
  if (m === 'svc_accountant_approvals') {
    MODULE_ACTIONS[m] = [
      A('view', 'عرض الموافقات', 'view'), A('approve', 'موافقة المحاسب', 'special'),
      A('reject', 'رفض الطلب', 'special'),
    ]
  } else {
    MODULE_ACTIONS[m] = SVC_ACTIONS(
      m === 'svc_work_visa_permanent' || m === 'svc_work_visa_temporary'
        ? [A('issue_visa', 'إصدار التأشيرة', 'special'), A('register_iqama', 'تسجيل الإقامة', 'special')]
        : []
    )
  }
})

// ── tab id → permission module ──────────────────────────────────────────
export const TAB_MODULE = {
  home: 'home',
  facilities: 'facilities', workers: 'workers', temp_workers: 'temp_workers', work_visas: 'work_visas',
  invoices: 'invoices', deposits: 'deposits', payments: 'payments', ext_payments: 'ext_payments',
  transfer_calc: 'quotations', renewal_calc: 'renewal_calc',
  sync_hub: 'sync_hub', sync_log: 'sync_hub',
  saudization: 'saudization',
  admin_clients: 'admin_clients', admin_agents: 'admin_agents',
  admin_offices: 'admin_offices', admin_bank_accounts: 'admin_bank_accounts',
  admin_permissions: 'admin_permissions', admin_services: 'admin_services',
  admin_fees: 'admin_fees', settings_fields: 'settings_fields',
  ...SVC_TAB_MODULE,
}

// ── Module display metadata (for the DB catalog seeding) ────────────────
export const MODULE_META = {
  home: { label_ar: 'الرئيسية', icon: 'home', sort: 10 },
  facilities: { label_ar: 'المنشآت', icon: 'facility', sort: 20 },
  workers: { label_ar: 'العمالة الدائمة', icon: 'labor', sort: 30 },
  temp_workers: { label_ar: 'العمالة المؤقتة', icon: 'labor', sort: 31 },
  work_visas: { label_ar: 'تأشيرات العمل', icon: 'labor', sort: 32 },
  invoices: { label_ar: 'الفواتير', icon: 'invoice', sort: 40 },
  deposits: { label_ar: 'الإيداعات', icon: 'deposit', sort: 41 },
  payments: { label_ar: 'سدادات الخدمات', icon: 'receipt', sort: 42 },
  ext_payments: { label_ar: 'سدادات خارجية', icon: 'receipt', sort: 43 },
  quotations: { label_ar: 'تسعيرات التنازل', icon: 'calc', sort: 50 },
  renewal_calc: { label_ar: 'تسعيرات التجديد', icon: 'refresh', sort: 51 },
  sync_hub: { label_ar: 'مركز المزامنة', icon: 'facility', sort: 110 },
  svc_work_visa_permanent: { label_ar: 'تأشيرة وإقامة دائمة', icon: 'transaction', sort: 60 },
  svc_work_visa_temporary: { label_ar: 'تأشيرة وإقامة مؤقتة', icon: 'transaction', sort: 61 },
  svc_transfer: { label_ar: 'نقل كفالة', icon: 'transaction', sort: 62 },
  svc_iqama_renewal: { label_ar: 'تجديد الإقامة', icon: 'transaction', sort: 63 },
  svc_ajeer: { label_ar: 'عقد أجير', icon: 'transaction', sort: 64 },
  svc_chamber: { label_ar: 'الغرفة التجارية', icon: 'transaction', sort: 65 },
  svc_medical_insurance: { label_ar: 'تأمين طبي', icon: 'transaction', sort: 66 },
  svc_profession_change: { label_ar: 'تغيير المهنة', icon: 'transaction', sort: 67 },
  svc_external_transfer: { label_ar: 'الموافقة للنقل الخارجي', icon: 'transaction', sort: 68 },
  svc_salary: { label_ar: 'تعديل الراتب', icon: 'transaction', sort: 69 },
  svc_exit_reentry: { label_ar: 'خروج وعودة', icon: 'transaction', sort: 70 },
  svc_final_exit: { label_ar: 'خروج نهائي', icon: 'transaction', sort: 71 },
  svc_passport_update: { label_ar: 'تحديث بيانات الجواز', icon: 'transaction', sort: 72 },
  svc_iqama_print: { label_ar: 'طباعة الإقامة', icon: 'transaction', sort: 73 },
  svc_documents: { label_ar: 'مستندات', icon: 'transaction', sort: 74 },
  svc_supplier_payroll: { label_ar: 'طلب رواتب سبلاير', icon: 'transaction', sort: 75 },
  svc_general: { label_ar: 'خدمة عامة', icon: 'transaction', sort: 76 },
  svc_accountant_approvals: { label_ar: 'موافقات المحاسب', icon: 'transaction', sort: 77 },
  saudization: { label_ar: 'السعودة', icon: 'tasks', sort: 80 },
  admin_clients: { label_ar: 'العملاء', icon: 'clients', sort: 90 },
  admin_agents: { label_ar: 'الوسطاء', icon: 'broker', sort: 91 },
  admin_offices: { label_ar: 'المكاتب', icon: 'branch', sort: 100 },
  admin_bank_accounts: { label_ar: 'الحسابات البنكية', icon: 'bank', sort: 101 },
  admin_permissions: { label_ar: 'المستخدمون والصلاحيات', icon: 'userPerm', sort: 102 },
  admin_services: { label_ar: 'إدارة الخدمات', icon: 'notes', sort: 103 },
  admin_fees: { label_ar: 'الرسوم', icon: 'payment', sort: 104 },
  settings_fields: { label_ar: 'الحقول', icon: 'settings', sort: 105 },
}

// ── Per-tab detail-page cards ───────────────────────────────────────────
// Each card carries: key, Arabic label, group, and `actions` — the action
// BUTTONS inside that card (edit / add / delete / special). The editor shows
// a visibility toggle PLUS a toggle per action so the GM can grant edit but
// exclude it on a specific card. Card lists are verified against the real
// detail page of each tab (a card listed here actually renders there).
const ca = (action, label_ar, kind = 'special') => ({ action, label_ar, kind })
const C = (key, label_ar, group = 'core', actions = []) => ({ key, label_ar, group, actions })

// Reusable action sets.
const EDIT = [ca('edit', 'تعديل', 'edit')]
const EDIT_CLIENT = [ca('edit', 'تعديل بيانات العميل', 'edit')]
// Transaction comments/actions card — varies per service.
const CMT_FULL = [ca('complete', 'تأكيد الإنجاز'), ca('cancel', 'إلغاء المعاملة'), ca('add_comment', 'إضافة تعليق'), ca('approve', 'موافقة المحاسب'), ca('reject', 'رفض الطلب')]
const CMT_BASIC = [ca('complete', 'تأكيد الإنجاز'), ca('cancel', 'إلغاء المعاملة'), ca('add_comment', 'إضافة تعليق')]
const CMT_NOTE = [ca('add_comment', 'إضافة تعليق')]
const CMT_ACC = [ca('approve', 'موافقة المحاسب'), ca('reject', 'رفض الطلب')]
// Read-only overview trio shared by service tabs.
const TXN_RO = () => [C('overview', 'نظرة عامة'), C('installments', 'الدفعات'), C('status_timeline', 'سجل الحالة')]

export const TAB_CARDS = {
  // The المنشآت tab detail is the basic registry page (decoupled from Sync Hub);
  // the external-platform cards (GOSI/Qiwa/SBC/Muqeem) live in the Sync Hub view,
  // not here, so only the basic-registry cards are listed.
  facilities: [
    C('facility_data', 'بيانات المنشأة', 'core', EDIT), C('facility_numbers', 'أرقام المنشأة', 'core', EDIT),
    C('workforce', 'العمالة'), C('invoices_services', 'الفواتير والخدمات'),
    C('activity_log', 'سجل الإضافات والتعديلات'), C('facility_status', 'حالة المنشأة'),
  ],
  workers: [
    C('personal_data', 'البيانات الشخصية', 'core', EDIT), C('professional_data', 'البيانات المهنية', 'core', EDIT),
    C('passport_data', 'بيانات الجواز', 'core', EDIT),
    C('medical_insurance_data', 'بيانات التأمين الطبي', 'core', [ca('check_insurance', 'استعلام التأمين')]),
    C('exit_visa_data', 'تأشيرات الخروج والعودة', 'core', EDIT), C('billing_contact_data', 'بيانات التواصل الفاتورية'),
    C('actual_data', 'البيانات الفعلية', 'core', EDIT), C('facility_branch', 'المنشأة والفرع'),
    C('invoices_services', 'الفواتير والخدمات'), C('activity_log', 'سجل الإضافات والتعديلات'),
    C('iqama_status', 'حالة الإقامة'), C('exit_visa_status', 'حالة تأشيرة الخروج'),
  ],
  temp_workers: [
    C('personal_data', 'البيانات الشخصية', 'core', EDIT), C('professional_data', 'البيانات المهنية', 'core', EDIT),
    C('passport_data', 'بيانات الجواز', 'core', EDIT),
    C('medical_insurance_data', 'بيانات التأمين الطبي', 'core', [ca('check_insurance', 'استعلام التأمين')]),
    C('exit_visa_data', 'تأشيرات الخروج والعودة', 'core', EDIT), C('billing_contact_data', 'بيانات التواصل الفاتورية'),
    C('actual_data', 'البيانات الفعلية', 'core', EDIT), C('facility_and_branch', 'المنشأة والفرع'),
    C('invoices_and_services', 'الفواتير والخدمات'), C('activity_log', 'سجل الإضافات والتعديلات'),
  ],
  work_visas: [],
  invoices: [
    C('client', 'العميل', 'core', EDIT), C('worker_facility', 'العامل والمنشأة', 'core', [ca('edit', 'تغيير العامل', 'edit')]),
    C('service', 'الخدمة', 'core', EDIT), C('pricing', 'التسعير', 'core', EDIT),
    C('installments_payments', 'الدفعات والمدفوعات', 'core', [ca('edit', 'تعديل الدفعة', 'edit')]),
    C('agent', 'الوسيط', 'core', EDIT), C('notes', 'الملاحظات', 'core', EDIT),
    C('service_transaction', 'معاملة الخدمة'),
    C('comments', 'التعليقات', 'core', CMT_NOTE), C('financial_summary', 'المبلغ الإجمالي'),
  ],
  payments: [C('payment_summary', 'ملخص السداد'), C('confirm_payment', 'تأكيد السداد', 'core', [ca('pay', 'توثيق السداد')])],
  ext_payments: [],
  deposits: [
    C('operation_details', 'الحوالة / الإيداع'), C('attachments', 'المرفقات'),
    C('verification_details', 'بيانات التحقق', 'core', [ca('edit', 'تعبئة / تعديل البيانات', 'edit')]),
    C('action', 'الإجراء', 'core', [ca('edit', 'تأكيد التحقق', 'edit'), ca('add_note', 'إضافة ملاحظة')]),
  ],
  // حسبة نقل الكفالة (transfer quotations) — detail cards (none existed before).
  transfer_calc: [
    C('worker', 'العامل', 'core', EDIT), C('professional', 'البيانات المهنية', 'core', EDIT),
    C('conditions', 'شروط النقل', 'core', EDIT), C('pricing', 'التسعيرة', 'core', EDIT),
    C('comments', 'التعليقات', 'core', CMT_NOTE), C('notes', 'ملاحظات'),
    C('financial_summary', 'الملخص المالي والإجراءات', 'core', [ca('approve', 'تصديق الحسبة'), ca('cancel', 'إلغاء الحسبة')]),
  ],
  // حسبة تجديد الإقامة — cards reconciled with the real page (writes are direct).
  renewal_calc: [
    C('worker_data', 'العامل والمنشأة', 'core', EDIT), C('renewal_options', 'خيارات التجديد', 'core', EDIT),
    C('pricing', 'التسعيرة', 'core', EDIT), C('financial_summary', 'الملخص المالي'),
    C('comments', 'التعليقات', 'core', CMT_NOTE),
    C('actions_print', 'الإجراءات والطباعة', 'core', [ca('approve', 'تصديق الحسبة'), ca('cancel', 'إلغاء الحسبة')]),
  ],
  sync_hub: [C('facilities_overview', 'المنشآت'), C('sync_activities_log', 'أنشطة المزامنة')],
  sync_log: [C('sync_activities_feed', 'أنشطة المزامنة')],
  admin_clients: [
    C('client_info', 'بيانات العميل', 'core', EDIT), C('invoices_log', 'سجل الفواتير'),
    C('financial_summary', 'الملخص المالي'), C('stats', 'إحصاءات'),
  ],
  admin_agents: [
    C('agent_info', 'بيانات الوسيط', 'core', EDIT), C('invoices_log', 'سجل الفواتير'),
    C('financial_summary', 'الملخص المالي'), C('statistics', 'إحصاءات'),
  ],
  admin_offices: [
    C('location_and_address', 'العنوان والموقع', 'core', EDIT),
    C('rent_contract', 'عقد الإيجار', 'core', [ca('edit', 'تعديل', 'edit'), ca('create', 'عقد / دفعة جديدة', 'create'), ca('delete', 'حذف دفعة', 'delete')]),
    C('municipal_license', 'رخصة بلدي', 'core', [ca('edit', 'تعديل', 'edit'), ca('create', 'إضافة جديدة', 'create')]),
    C('safety_certificate', 'شهادة السلامة', 'core', [ca('edit', 'تعديل', 'edit'), ca('create', 'إضافة جديدة', 'create')]),
    C('electricity_bills', 'الكهرباء', 'core', [ca('edit', 'تعديل', 'edit'), ca('create', 'فاتورة جديدة', 'create')]),
    C('internet_bills', 'الإنترنت', 'core', [ca('edit', 'تعديل', 'edit'), ca('create', 'فاتورة جديدة', 'create')]),
    C('water_bills', 'الماء', 'core', [ca('edit', 'تعديل', 'edit'), ca('create', 'فاتورة جديدة', 'create')]),
    C('users_and_staff', 'المستخدمون'), C('documents', 'المستندات'),
    C('overview_stats', 'نظرة عامة', 'core', [ca('toggle', 'تفعيل / تعطيل المكتب')]),
  ],
  admin_bank_accounts: [
    C('account_data', 'بيانات الحساب', 'core', EDIT), C('linked_offices', 'المكاتب المرتبطة'),
    C('bank_cards', 'البطاقات البنكية', 'core', [ca('create', 'بطاقة جديدة', 'create'), ca('edit', 'تعديل البطاقة', 'edit'), ca('toggle', 'تفعيل / تعطيل البطاقة')]),
    C('attachments', 'المرفقات'),
    C('overview', 'نظرة عامة', 'core', [ca('toggle', 'تفعيل / تعطيل الحساب')]),
  ],
  admin_permissions: [
    C('identity', 'الهوية'), C('work_info', 'بيانات العمل', 'core', EDIT), C('permissions', 'الصلاحيات'),
  ],
  admin_services: [
    C('default_pricing', 'التسعير الافتراضي', 'core', EDIT),
    C('document_types', 'أنواع المستندات', 'core', [ca('create', 'إضافة', 'create'), ca('edit', 'تعديل', 'edit'), ca('delete', 'حذف', 'delete')]),
    C('branch_overrides', 'التخصيصات حسب المكتب', 'core', [ca('create', 'إضافة تخصيص', 'create'), ca('edit', 'تعديل', 'edit'), ca('delete', 'حذف التخصيص', 'delete')]),
    C('operations_and_billing', 'التشغيل والفوترة', 'core', [ca('toggle_active', 'تفعيل / تعطيل'), ca('toggle_billable', 'حالة الفوترة')]),
  ],
  admin_fees: [],
  settings_fields: [],
  // ── service tabs (cards verified per service) ──
  'work-visa-permanent': [
    C('client_worker', 'العميل والعامل', 'core', EDIT_CLIENT),
    C('visa_file', 'ملف التأشيرات', 'core', [ca('edit', 'تعديل التأشيرة', 'edit'), ca('issue_visa', 'إصدار التأشيرة')]),
    C('establishment_distribute', 'توزيع التأشيرات', 'core', [ca('distribute', 'توزيع التأشيرات')]),
    C('iqama', 'الإقامة', 'core', [ca('register_iqama', 'تسجيل الإقامة'), ca('edit', 'تعديل', 'edit')]),
    C('work_permit', 'رخصة العمل والإقامة', 'core', EDIT),
    ...TXN_RO(), C('comments', 'التعليقات والإجراءات', 'core', CMT_FULL),
  ],
  'work-visa-temporary': [
    C('client_worker', 'العميل والعامل', 'core', EDIT_CLIENT),
    C('visa_file', 'ملف التأشيرات', 'core', [ca('edit', 'تعديل التأشيرة', 'edit'), ca('issue_visa', 'إصدار التأشيرة')]),
    C('iqama', 'الإقامة', 'core', [ca('register_iqama', 'تسجيل الإقامة'), ca('edit', 'تعديل', 'edit')]),
    C('work_permit', 'رخصة العمل والإقامة', 'core', EDIT),
    ...TXN_RO(), C('comments', 'التعليقات والإجراءات', 'core', CMT_BASIC),
  ],
  'transfer': [
    C('overview', 'نظرة عامة'), C('transfer_fees', 'رسوم النقل'),
    C('installments', 'الدفعات'), C('status_timeline', 'سجل الحالة'),
    C('comments', 'التعليقات والإجراءات', 'core', CMT_BASIC),
  ],
  'iqama-renewal': [
    C('application', 'تفاصيل الطلب'), ...TXN_RO(), C('comments', 'التعليقات والإجراءات', 'core', CMT_BASIC),
  ],
  'ajeer': [
    C('worker_facility', 'العامل والمنشأة'), C('service', 'الخدمة'), C('notes', 'الملاحظات'),
    C('contract_followup', 'متابعة عقد أجير', 'core', [ca('attach', 'إرفاق ملف'), ca('edit', 'تعديل', 'edit')]),
    ...TXN_RO(), C('comments', 'التعليقات والإجراءات', 'core', CMT_NOTE),
  ],
  'chamber': [
    C('worker_facility', 'العامل والمنشأة'), C('service', 'الخدمة'),
    ...TXN_RO(), C('comments', 'التعليقات والإجراءات', 'core', CMT_NOTE),
  ],
  'medical-insurance': [C('application', 'تفاصيل الطلب'), ...TXN_RO(), C('comments', 'التعليقات والإجراءات', 'core', CMT_FULL)],
  'profession-change': [C('application', 'تفاصيل الطلب'), ...TXN_RO(), C('comments', 'التعليقات والإجراءات', 'core', CMT_FULL)],
  'external-transfer': [C('application', 'تفاصيل الطلب'), ...TXN_RO(), C('comments', 'التعليقات والإجراءات', 'core', CMT_FULL)],
  'salary': [C('application', 'تفاصيل الطلب'), ...TXN_RO(), C('comments', 'التعليقات والإجراءات', 'core', CMT_FULL)],
  'exit-reentry': [C('application', 'تفاصيل الطلب'), ...TXN_RO(), C('comments', 'التعليقات والإجراءات', 'core', CMT_FULL)],
  'final-exit': [C('application', 'تفاصيل الطلب'), ...TXN_RO(), C('comments', 'التعليقات والإجراءات', 'core', CMT_FULL)],
  'passport-update': [C('application', 'تفاصيل الطلب'), ...TXN_RO(), C('comments', 'التعليقات والإجراءات', 'core', CMT_BASIC)],
  'iqama-print': [C('application', 'تفاصيل الطلب'), ...TXN_RO(), C('comments', 'التعليقات والإجراءات', 'core', CMT_BASIC)],
  'documents': [C('application', 'تفاصيل الطلب'), ...TXN_RO(), C('comments', 'التعليقات والإجراءات', 'core', CMT_BASIC)],
  'supplier-payroll': [C('application', 'تفاصيل الطلب'), ...TXN_RO(), C('comments', 'التعليقات والإجراءات', 'core', CMT_BASIC)],
  'general': [...TXN_RO(), C('comments', 'التعليقات والإجراءات', 'core', CMT_NOTE)],
  'accountant-approvals': [
    C('client_worker', 'العميل والعامل'), C('application', 'تفاصيل الطلب'),
    C('overview', 'نظرة عامة'), C('status_timeline', 'سجل الحالة'),
    C('comments', 'التعليقات والإجراءات', 'core', CMT_ACC),
  ],
  saudization: [C('application', 'تفاصيل الطلب'), ...TXN_RO(), C('comments', 'التعليقات والإجراءات', 'core', CMT_BASIC)],
}

// Card-group display labels (used by the editor to group facility cards etc.).
export const CARD_GROUP_LABELS = {
  core: 'البطاقات الأساسية', gosi: 'التأمينات الاجتماعية (GOSI)',
  hrsd: 'الموارد البشرية (HRSD)', qiwa: 'قوى (Qiwa)', sbc: 'مركز الأعمال (SBC)',
  muqeem: 'مقيم (Muqeem)',
}

// ════════════════════════════════════════════════════════════════════════
// GRANULAR LAYER — fields, modals, wizard stages (per-user ui_visibility)
// ────────────────────────────────────────────────────────────────────────
// Below the card sits the FIELD. Each field can be hidden (read) and/or locked
// (edit) per user. Modals (popups) get an access toggle; wizard STAGES get a
// visibility toggle. All three are stored on users.ui_visibility (per-user,
// default allowed/visible) and read by lib/permissions.js
// (fieldVisible / fieldEditable / modalAllowed / stageVisible). The editor in
// PermissionsPage.jsx renders every entry below automatically.
//
//   F(key, label_ar, group, opts)  group = the card key (detail page) OR the
//     stage key (wizard) this field lays out under. opts.edit:true ⇒ the field
//     has an editable input (editor shows an edit-LOCK toggle; opts.table+col
//     give the physical column the DB field-lock trigger guards). Field keys
//     are UNIQUE within a tab.
//   M(key, label_ar)  a popup/modal whose opening can be blocked.
//   S(key, label_ar)  a wizard step whose visibility can be toggled.
// ════════════════════════════════════════════════════════════════════════
const F = (key, label_ar, group, opts = {}) => ({
  key, label_ar, group, edit: !!opts.edit, table: opts.table || null,
  col: opts.col || null, cols: opts.cols || null,   // cols: a field backed by >1 column
})
const M = (key, label_ar) => ({ key, label_ar })
const S = (key, label_ar) => ({ key, label_ar })

// Tabs that expose a SERVICE-TYPE scope control (which service types the user
// may see) and/or a STAT-CARDS mode control (real / zero / hidden) in the editor.
export const TAB_SERVICE_SCOPE = ['invoices']
export const TAB_STATS_MODE = ['invoices']

// Filled per tab as each page is wired. Empty tabs simply show no field/modal/
// stage controls in the editor (graceful — nothing to gate yet).
export const TAB_FIELDS = {
  // ── العملاء (clients) ──────────────────────────────────────────────
  admin_clients: [
    // بطاقة بيانات العميل (editable via the edit modal → DB-locked)
    F('ci_name', 'الاسم', 'client_info', { edit: true, table: 'clients', col: 'name_ar' }),
    F('ci_name_en', 'الاسم بالإنجليزية', 'client_info'),
    F('ci_id_number', 'رقم الهوية', 'client_info', { edit: true, table: 'clients', col: 'id_number' }),
    F('ci_phone', 'الجوال', 'client_info', { edit: true, table: 'clients', col: 'phone' }),
    F('ci_nationality', 'الجنسية', 'client_info', { edit: true, table: 'clients', col: 'nationality_id' }),
    F('ci_branch', 'المكتب', 'client_info', { edit: true, table: 'clients', cols: ['branch_id', 'branch_ids'] }),
    F('ci_joined', 'تاريخ الإضافة', 'client_info'),
    // سجل الفواتير (عرض فقط)
    F('il_invoice_no', 'رقم الفاتورة', 'invoices_log'),
    F('il_service', 'الخدمة', 'invoices_log'),
    F('il_branch', 'المكتب', 'invoices_log'),
    F('il_total', 'الإجمالي', 'invoices_log'),
    F('il_paid', 'المدفوع', 'invoices_log'),
    F('il_remaining', 'المتبقي', 'invoices_log'),
    // الملخص المالي (عرض فقط)
    F('fs_invoiced', 'إجمالي الفوترة', 'financial_summary'),
    F('fs_paid', 'المدفوع', 'financial_summary'),
    F('fs_remaining', 'المتبقي', 'financial_summary'),
    F('fs_paid_pct', 'نسبة السداد', 'financial_summary'),
    // إحصاءات (عرض فقط)
    F('st_workers', 'عدد العمال', 'stats'),
    F('st_visas', 'عدد التأشيرات', 'stats'),
    F('st_kafala', 'نقل الكفالة', 'stats'),
    F('st_invoices', 'عدد الفواتير', 'stats'),
    F('st_last_invoice', 'آخر فاتورة', 'stats'),
  ],
  // ── حسبة نقل الكفالة (transfer_calc → table transfer_calculation) ───
  // Editable fields key = column name (DB field-lock + the update-quotation
  // edge function both resolve column→key 1:1 via field_lock_map).
  transfer_calc: [
    F('worker_name', 'الإسم', 'worker', { edit: true, table: 'transfer_calculation', col: 'worker_name' }),
    F('iqama_number', 'رقم الإقامة', 'worker', { edit: true, table: 'transfer_calculation', col: 'iqama_number' }),
    F('phone', 'رقم الجوال', 'worker', { edit: true, table: 'transfer_calculation', col: 'phone' }),
    F('nationality_id', 'الجنسية', 'worker', { edit: true, table: 'transfer_calculation', cols: ['nationality_id', 'nationality'] }),
    F('dob', 'تاريخ الميلاد', 'worker', { edit: true, table: 'transfer_calculation', col: 'dob' }),
    F('occupation_name_ar', 'المهنة الحالية', 'professional', { edit: true, table: 'transfer_calculation', col: 'occupation_name_ar' }),
    F('new_occupation_name_ar', 'المهنة الجديدة', 'professional', { edit: true, table: 'transfer_calculation', col: 'new_occupation_name_ar' }),
    F('change_profession', 'تغيير المهنة', 'professional', { edit: true, table: 'transfer_calculation', col: 'change_profession' }),
    F('sponsor_changes', 'عدد مرات نقل الخدمات', 'professional', { edit: true, table: 'transfer_calculation', col: 'sponsor_changes' }),
    F('hrsd_worker_status', 'حالة العامل', 'professional', { edit: true, table: 'transfer_calculation', col: 'hrsd_worker_status' }),
    F('resident_status_ar', 'حالة المقيم', 'professional', { edit: true, table: 'transfer_calculation', col: 'resident_status_ar' }),
    F('iqama_expiry_gregorian', 'انتهاء الإقامة (ميلادي)', 'professional', { edit: true, table: 'transfer_calculation', col: 'iqama_expiry_gregorian' }),
    F('iqama_expiry_hijri', 'انتهاء الإقامة (هجري)', 'professional', { edit: true, table: 'transfer_calculation', col: 'iqama_expiry_hijri' }),
    F('renewal_period', 'مدة التجديد', 'conditions', { edit: true, table: 'transfer_calculation', col: 'renewal_months' }),
    F('has_notice_period', 'فترة الإشعار', 'conditions', { edit: true, table: 'transfer_calculation', col: 'has_notice_period' }),
    F('employer_consent', 'موافقة صاحب العمل', 'conditions', { edit: true, table: 'transfer_calculation', col: 'employer_consent' }),
    F('transfer_fee', 'رسوم نقل الكفالة', 'pricing', { edit: true, table: 'transfer_calculation', col: 'transfer_fee' }),
    F('iqama_renewal_fee', 'تجديد الإقامة', 'pricing', { edit: true, table: 'transfer_calculation', col: 'iqama_renewal_fee' }),
    F('work_permit_fee', 'رخصة العمل', 'pricing', { edit: true, table: 'transfer_calculation', col: 'work_permit_fee' }),
    F('prof_change_fee', 'رسوم تغيير المهنة', 'pricing', { edit: true, table: 'transfer_calculation', col: 'prof_change_fee' }),
    F('medical_fee', 'التأمين الطبي', 'pricing', { edit: true, table: 'transfer_calculation', col: 'medical_fee' }),
    F('late_fine_amount', 'غرامة تأخير التجديد', 'pricing', { edit: true, table: 'transfer_calculation', col: 'late_fine_amount' }),
    F('office_fee', 'رسوم المكتب', 'pricing', { edit: true, table: 'transfer_calculation', col: 'office_fee' }),
    F('absher_discount', 'خصم أبشر', 'pricing', { edit: true, table: 'transfer_calculation', col: 'absher_discount' }),
    F('manual_discount', 'خصم المكتب', 'pricing', { edit: true, table: 'transfer_calculation', col: 'manual_discount' }),
    F('pr_extras', 'بنود إضافية', 'pricing'),
    F('pr_subtotal', 'الإجمالي الابتدائي', 'pricing'),
    F('pr_total', 'الإجمالي النهائي', 'pricing'),
    F('sum_total', 'الإجمالي', 'financial_summary'),
    F('sum_office_fee_net', 'الرسوم المكتبية', 'financial_summary'),
    F('sum_government_fees', 'الرسوم الحكومية', 'financial_summary'),
    F('sum_absher', 'خصم أبشر', 'financial_summary'),
    F('sum_manual', 'خصم المكتب', 'financial_summary'),
    F('sum_duration', 'المدة المتوقعة', 'financial_summary'),
    F('sum_expiry', 'الانتهاء المتوقع', 'financial_summary'),
    F('sum_invoice', 'الفاتورة', 'financial_summary'),
    // ── حاسبة نقل الكفالة (KafalaCalculator wizard) — UI-only (create flow) ──
    F('w_iqama', 'رقم الإقامة', 'w_worker_data'), F('w_dob', 'تاريخ الميلاد', 'w_worker_data'),
    F('w_nationality', 'الجنسية', 'w_worker_data'), F('w_phone', 'رقم الجوال', 'w_worker_data'),
    F('w_iqama_expiry', 'انتهاء الإقامة', 'w_worker_data'), F('w_occupation', 'المهنة', 'w_worker_data'),
    F('w_d_name', 'الإسم', 'w_worker_details'), F('w_d_iqama', 'رقم الإقامة', 'w_worker_details'),
    F('w_d_age', 'العمر', 'w_worker_details'), F('w_d_occupation', 'المهنة', 'w_worker_details'),
    F('w_d_worker_status', 'حالة العامل', 'w_worker_details'), F('w_d_muqeem_status', 'حالة مقيم', 'w_worker_details'),
    F('w_d_iqama_expiry_g', 'انتهاء الإقامة (ميلادي)', 'w_worker_details'), F('w_d_iqama_expiry_h', 'انتهاء الإقامة (هجري)', 'w_worker_details'),
    F('w_renewal_period', 'مدة التجديد', 'w_pricing'), F('w_transfer_fee', 'رسوم النقل', 'w_pricing'),
    F('w_change_profession', 'تغيير المهنة', 'w_pricing'), F('w_new_occupation', 'المهنة الجديدة', 'w_pricing'),
    F('w_extras', 'رسوم إضافية', 'w_pricing'),
    F('w_review_transfer_fee', 'رسوم نقل الكفالة', 'w_review'), F('w_late_fine', 'غرامة التأخير', 'w_review'),
    F('w_absher', 'خصم أبشر', 'w_review'),
  ],
  // ── حسبة تجديد الإقامة (renewal_calc → iqama_renewal_calculation, direct writes) ──
  renewal_calc: [
    F('worker_name', 'الاسم', 'worker_data', { edit: true, table: 'iqama_renewal_calculation', col: 'worker_name' }),
    F('iqama_number', 'رقم الإقامة', 'worker_data', { edit: true, table: 'iqama_renewal_calculation', col: 'iqama_number' }),
    F('phone', 'رقم الجوال', 'worker_data', { edit: true, table: 'iqama_renewal_calculation', col: 'phone' }),
    F('nationality_id', 'الجنسية', 'worker_data', { edit: true, table: 'iqama_renewal_calculation', cols: ['nationality_id', 'nationality'] }),
    F('dob', 'تاريخ الميلاد / العمر', 'worker_data', { edit: true, table: 'iqama_renewal_calculation', col: 'dob' }),
    F('rd_occupation', 'المهنة الحالية', 'worker_data'),
    F('rd_iqama_expiry', 'انتهاء الإقامة', 'worker_data'),
    F('rd_fac_unified', 'الرقم الموحد للمنشأة', 'worker_data'),
    F('rd_fac_hrsd', 'رقم وزارة العمل', 'worker_data'),
    F('rd_fac_gosi', 'رقم التأمينات', 'worker_data'),
    F('exemption', 'الإعفاء', 'renewal_options', { edit: true, table: 'iqama_renewal_calculation', col: 'exemption' }),
    F('renewal_months', 'مدة التجديد', 'renewal_options', { edit: true, table: 'iqama_renewal_calculation', col: 'renewal_months' }),
    F('change_profession', 'تغيير المهنة', 'renewal_options', { edit: true, table: 'iqama_renewal_calculation', col: 'change_profession' }),
    F('new_occupation_name_ar', 'المهنة الجديدة', 'renewal_options', { edit: true, table: 'iqama_renewal_calculation', col: 'new_occupation_name_ar' }),
    F('work_permit_expiry', 'انتهاء رخصة العمل', 'renewal_options', { edit: true, table: 'iqama_renewal_calculation', col: 'work_permit_expiry' }),
    F('iqama_renewal_fee', 'تجديد الإقامة', 'pricing', { edit: true, table: 'iqama_renewal_calculation', col: 'iqama_renewal_fee' }),
    F('work_permit_fee', 'رخصة العمل', 'pricing', { edit: true, table: 'iqama_renewal_calculation', col: 'work_permit_fee' }),
    F('prof_change_fee', 'رسوم تغيير المهنة', 'pricing', { edit: true, table: 'iqama_renewal_calculation', col: 'prof_change_fee' }),
    F('medical_fee', 'التأمين الطبي', 'pricing', { edit: true, table: 'iqama_renewal_calculation', col: 'medical_fee' }),
    F('late_fine_amount', 'غرامة تأخير التجديد', 'pricing', { edit: true, table: 'iqama_renewal_calculation', col: 'late_fine_amount' }),
    F('office_fee', 'رسوم المكتب', 'pricing', { edit: true, table: 'iqama_renewal_calculation', col: 'office_fee' }),
    F('gov_excess', 'الزائد عن الحدود الحكومية', 'pricing', { edit: true, table: 'iqama_renewal_calculation', col: 'gov_excess' }),
    F('absher_discount', 'خصم أبشر', 'pricing', { edit: true, table: 'iqama_renewal_calculation', col: 'absher_discount' }),
    F('manual_discount', 'خصم المكتب', 'pricing', { edit: true, table: 'iqama_renewal_calculation', col: 'manual_discount' }),
    F('rp_extras', 'بنود إضافية', 'pricing'),
    F('rp_office_cover', 'الخصم (تغطية المكتب)', 'pricing'),
    F('rp_total', 'الإجمالي النهائي', 'pricing'),
    F('rf_office_fee_net', 'رسوم المكتب', 'financial_summary'),
    F('rf_government_fees', 'الرسوم الحكومية', 'financial_summary'),
    F('rf_office_cover', 'الخصم', 'financial_summary'),
    F('rf_absher', 'خصم أبشر', 'financial_summary'),
    F('rf_manual', 'خصم المكتب', 'financial_summary'),
    F('rf_duration', 'المدة المتوقعة', 'financial_summary'),
    F('rf_expiry', 'الانتهاء المتوقع', 'financial_summary'),
    F('rf_invoice', 'الفاتورة', 'financial_summary'),
    // ── حاسبة تجديد الإقامة (RenewalCalculator wizard) — UI-only (create flow) ──
    F('rw_search', 'بحث العامل', 'rw_worker'), F('rw_phone', 'رقم الجوال', 'rw_worker'),
    F('rw_iqama', 'رقم الإقامة', 'rw_worker'), F('rw_occupation', 'الوظيفة', 'rw_worker'),
    F('rw_expiry', 'انتهاء الإقامة', 'rw_worker'), F('rw_age', 'العمر', 'rw_worker'),
    F('rw_d_name', 'الإسم', 'rw_details'), F('rw_d_iqama', 'رقم الإقامة', 'rw_details'),
    F('rw_d_expiry', 'انتهاء الإقامة', 'rw_details'), F('rw_d_age', 'العمر', 'rw_details'),
    F('rw_d_occupation', 'الوظيفة', 'rw_details'), F('rw_d_fac_unified', 'الرقم الموحد', 'rw_details'),
    F('rw_d_fac_hrsd', 'رقم الموارد البشرية', 'rw_details'), F('rw_d_fac_gosi', 'رقم التأمينات', 'rw_details'),
    F('rw_exemption', 'الإعفاء', 'rw_renewal_options'), F('rw_period', 'مدة التجديد', 'rw_renewal_options'),
    F('rw_change_profession', 'تغيير المهنة', 'rw_renewal_options'), F('rw_new_occupation', 'المهنة الجديدة', 'rw_renewal_options'),
    F('rw_work_permit', 'رخصة العمل', 'rw_renewal_options'),
    F('rw_fees', 'بنود الرسوم', 'rw_pricing'),
    F('rw_review', 'مراجعة', 'rw_review'),
    F('rw_absher', 'خصم أبشر', 'rw_cost'), F('rw_manual', 'خصم المكتب', 'rw_cost'), F('rw_cost_rows', 'بنود التكلفة', 'rw_cost'),
  ],
  // ── الفواتير (invoices) — editable fields locked on invoice-owned tables.
  // client/agent/worker fields are display-only here (their DB edit-locks are
  // owned by admin_clients/admin_agents/workers tabs to avoid double-ownership).
  invoices: [
    F('client_name', 'اسم العميل', 'client'), F('client_id_number', 'رقم هوية العميل', 'client'),
    F('client_phone', 'جوال العميل', 'client'), F('client_nationality', 'جنسية العميل', 'client'),
    F('worker_name', 'اسم العامل', 'worker_facility'), F('worker_iqama_number', 'رقم الإقامة', 'worker_facility'),
    F('worker_phone', 'جوال العامل', 'worker_facility'), F('worker_nationality', 'جنسية العامل', 'worker_facility'),
    F('worker_occupation', 'المهنة', 'worker_facility'), F('facility_name', 'المنشأة', 'worker_facility'),
    F('facility_unified_number', 'الرقم الموحد', 'worker_facility'), F('facility_hrsd_number', 'رقم مكتب العمل', 'worker_facility'),
    F('facility_gosi_number', 'رقم التأمينات', 'worker_facility'),
    F('service_description', 'وصف الخدمة', 'service', { edit: true, table: 'other_applications', col: 'description' }),
    F('service_office', 'الجهة / المكتب', 'service'), F('service_chamber_text', 'نص الطلب', 'service'),
    F('visa_office', 'مكتب التأشيرة', 'service'), F('visa_composition', 'تركيب التأشيرة', 'service'),
    F('visa_quantity', 'عدد التأشيرات', 'service', { edit: true, table: 'service_requests', col: 'quantity' }),
    F('visa_border_number', 'رقم الحدود', 'service', { edit: true, table: 'visa_applications', col: 'border_number' }),
    F('visa_unified_number', 'الرقم الموحد للتأشيرة', 'service', { edit: true, table: 'visa_applications', col: 'unified_number' }),
    F('visa_number', 'رقم التأشيرة', 'service', { edit: true, table: 'visa_applications', col: 'visa_number' }),
    F('pricing_total', 'إجمالي التسعير', 'pricing', { edit: true, table: 'invoices', col: 'total_amount' }),
    F('pricing_breakdown', 'بنود التسعير', 'pricing', { edit: true, table: 'invoices', col: 'pricing_breakdown' }),
    F('pricing_office_fees', 'رسوم المكتب', 'pricing'), F('pricing_government_fees', 'الرسوم الحكومية', 'pricing'),
    F('pricing_absher_discount', 'خصم أبشر', 'pricing'), F('pricing_office_discount', 'خصم المكتب', 'pricing'),
    F('installment_amount', 'مبلغ الدفعة', 'installments_payments', { edit: true, table: 'installments', col: 'total_amount' }),
    F('installment_order', 'ترتيب الدفعة', 'installments_payments'), F('installment_status', 'حالة الدفعة', 'installments_payments'),
    F('installment_expected_date', 'التاريخ المتوقع', 'installments_payments'),
    F('payment_amount', 'مبلغ المدفوع', 'installments_payments', { edit: true, table: 'payments', col: 'amount' }),
    F('payment_method', 'طريقة الدفع', 'installments_payments', { edit: true, table: 'payments', col: 'payment_method_id' }),
    F('payment_bank_reference', 'المرجع البنكي', 'installments_payments', { edit: true, table: 'payments', col: 'bank_reference' }),
    F('payment_notes', 'ملاحظة المدفوع', 'installments_payments', { edit: true, table: 'payments', col: 'notes' }),
    F('payment_date', 'تاريخ الدفع', 'installments_payments'), F('payment_creator', 'بواسطة', 'installments_payments'),
    F('payment_receipt', 'الإيصال', 'installments_payments'),
    F('note_public', 'نص الملاحظة', 'notes', { edit: true, table: 'invoices', col: 'note_public' }),
    F('agent_name', 'اسم الوسيط', 'agent'), F('agent_id_number', 'رقم هوية الوسيط', 'agent'),
    F('agent_phone', 'جوال الوسيط', 'agent'), F('agent_nationality', 'جنسية الوسيط', 'agent'),
    F('txn_stage_status', 'حالة المرحلة', 'service_transaction'),
    F('comment_text', 'نص التعليق', 'comments'), F('comment_attachments', 'مرفقات التعليق', 'comments'),
    F('comment_creator', 'كاتب التعليق', 'comments'), F('comment_datetime', 'تاريخ التعليق', 'comments'),
    F('fin_total', 'الإجمالي', 'financial_summary'), F('fin_paid', 'المدفوع', 'financial_summary'),
    F('fin_remaining', 'المتبقي', 'financial_summary'), F('fin_pay_ratio', 'نسبة السداد', 'financial_summary'),
    F('fin_installments_count', 'عدد الدفعات', 'financial_summary'), F('fin_payments_count', 'عدد المدفوعات', 'financial_summary'),
    F('fin_expected_duration', 'المدة المتوقعة', 'financial_summary'), F('fin_expected_expiry', 'الانتهاء المتوقع', 'financial_summary'),
    F('fin_quote_ref', 'مرجع التسعيرة', 'financial_summary'),
    F('fin_office_fee_net', 'الرسوم المكتبية', 'financial_summary'), F('fin_government_fees', 'الرسوم الحكومية', 'financial_summary'),
  ],
}
export const TAB_MODALS = {
  admin_clients: [M('client_edit', 'تعديل بيانات العميل')],
  invoices: [
    M('inv_action_payment', 'تسجيل دفعة'), M('inv_action_refund', 'استرجاع دفعة'),
    M('inv_action_cancel', 'إلغاء الفاتورة'), M('inv_action_print', 'طباعة الفاتورة'),
    // أزرار مراحل المعاملة — مفتاح مستقل لكل خدمة/مرحلة كما تظهر في صفحة الفاتورة.
    M('inv_stage_transfer', 'نقل الكفالة · النقل'), M('inv_stage_transfer_insurance', 'نقل الكفالة · التأمين'),
    M('inv_stage_transfer_workpermit', 'نقل الكفالة · رخصة العمل'), M('inv_stage_transfer_iqama', 'نقل الكفالة · الإقامة'),
    M('inv_stage_renewal_insurance', 'تجديد الإقامة · التأمين'), M('inv_stage_renewal_iqama', 'تجديد الإقامة · الإقامة'),
    M('inv_stage_status', 'حالة المعاملة'),
    M('inv_action_salary_return', 'إرجاع الراتب'),
    M('inv_worker_pick', 'تغيير العامل'), M('inv_client_edit', 'تعديل بيانات العميل'),
    M('inv_agent_edit', 'تعديل بيانات الوسيط'), M('inv_service_edit', 'تعديل تفاصيل الخدمة'),
    M('inv_note_edit', 'تعديل الملاحظة'), M('inv_border_numbers', 'بيانات التأشيرة / الحدود'),
    M('inv_visa_stage_insurance', 'بيانات التأمين'), M('inv_visa_stage_work_permit', 'بيانات رخصة العمل'),
    M('inv_iqama_issue', 'إصدار الإقامة'), M('inv_payment_edit', 'تعديل الدفعة'),
    M('inv_pricing_edit', 'تعديل التسعير'), M('inv_permanent_visa_edit', 'تعديل تأشيرة وإقامة دائمة'),
    M('inv_comment_add', 'إضافة تعليق'),
  ],
  transfer_calc: [
    M('card_edit', 'نافذة تعديل الكروت'), M('approve', 'تصديق الحسبة'),
    M('cancel', 'إلغاء الحسبة'), M('add_comment', 'إضافة تعليق'),
  ],
  renewal_calc: [
    M('edit_card', 'نافذة تعديل الكروت'), M('approve_quote', 'تصديق الحسبة'),
    M('cancel_quote', 'إلغاء الحسبة'), M('add_comment', 'إضافة تعليق'),
  ],
}
export const TAB_STAGES = {
  // حاسبة نقل الكفالة (KafalaCalculator) — 4 steps
  transfer_calc: [
    S('w_worker_data', 'بيانات العامل'), S('w_worker_details', 'تفاصيل العامل'),
    S('w_pricing', 'التسعيرة'), S('w_review', 'المراجعة'),
  ],
  // حاسبة تجديد الإقامة (RenewalCalculator) — 6 steps
  renewal_calc: [
    S('rw_worker', 'العامل'), S('rw_details', 'التفاصيل'), S('rw_renewal_options', 'التجديد'),
    S('rw_pricing', 'التسعيرة'), S('rw_review', 'المراجعة'), S('rw_cost', 'التكلفة'),
  ],
}

// ── helpers ─────────────────────────────────────────────────────────────
export const tabModule = (tabId) => TAB_MODULE[tabId] || tabId
export const tabCards = (tabId) => TAB_CARDS[tabId] || []
export const moduleActions = (mod) => MODULE_ACTIONS[mod] || []
export const tabFields = (tabId) => TAB_FIELDS[tabId] || []
export const tabModals = (tabId) => TAB_MODALS[tabId] || []
export const tabStages = (tabId) => TAB_STAGES[tabId] || []
// Fields laid out under one card/stage group (used by the editor).
export const groupFields = (tabId, groupKey) => (TAB_FIELDS[tabId] || []).filter(f => f.group === groupKey)
// Every editable field bound to a physical column — drives the DB field-lock
// map seed (scripts/genFieldLockSql.mjs) so the trigger knows column → key.
export const lockableFields = () => {
  const out = []
  for (const [tab, fields] of Object.entries(TAB_FIELDS)) {
    for (const f of (fields || [])) {
      if (!f.edit || !f.table) continue
      const cols = f.cols || (f.col ? [f.col] : [])
      for (const c of cols) out.push({ tab, key: f.key, table: f.table, col: c })
    }
  }
  return out
}

// All modules, for migration parity / iteration.
export const ALL_MODULES = Object.keys(MODULE_ACTIONS)
