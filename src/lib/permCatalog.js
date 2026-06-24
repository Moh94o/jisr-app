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
  svc_exit_reentry: { label_ar: 'تأشيرة خروج وعودة', icon: 'transaction', sort: 70 },
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
  ],
  payments: [C('payment_summary', 'ملخص السداد'), C('confirm_payment', 'تأكيد السداد', 'core', [ca('pay', 'توثيق السداد')])],
  ext_payments: [],
  deposits: [
    C('operation_details', 'الحوالة / الإيداع'), C('attachments', 'المرفقات'),
    C('verification_details', 'بيانات التحقق', 'core', [ca('edit', 'تعبئة / تعديل البيانات', 'edit')]),
    C('action', 'الإجراء', 'core', [ca('edit', 'تأكيد التحقق', 'edit'), ca('add_note', 'إضافة ملاحظة')]),
  ],
  renewal_calc: [
    C('worker_data', 'بيانات العامل'), C('professional_data', 'البيانات المهنية'),
    C('renewal_options', 'خيارات التجديد'), C('pricing', 'التسعيرة'),
    C('financial_summary', 'الملخص المالي'), C('timeline', 'سجل المراحل', 'core', [ca('approve', 'تصديق التسعيرة')]),
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

// ── helpers ─────────────────────────────────────────────────────────────
export const tabModule = (tabId) => TAB_MODULE[tabId] || tabId
export const tabCards = (tabId) => TAB_CARDS[tabId] || []
export const moduleActions = (mod) => MODULE_ACTIONS[mod] || []

// All modules, for migration parity / iteration.
export const ALL_MODULES = Object.keys(MODULE_ACTIONS)
