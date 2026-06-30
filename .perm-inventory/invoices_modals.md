# Invoices — Modals Inventory

File: `C:/dev/jisr-app/src/InvoicePage.jsx` (8622 lines)

Scope: every MODAL / POPUP / DRAWER / DIALOG in this file. **All overlays render through one shared FormKit `<Modal>` component** (`./components/ui/FormKit.jsx`, imported line 8) using a `pages={[…]}` wizard model where each page has `{ valid, error, content, title }`. The `<Modal>` itself renders the chrome + footer Next/Back/Submit buttons. There are **no** `window.confirm`/`alert`/`createPortal` confirm-sheets (legacy `window.confirm` removed — see line 843). The only `createPortal` (line 410) is a tooltip helper, not a modal.

**State toggles that gate modals** (declared in the page component, lines 1416–1431):
`actionModal` (string: payment|refund|cancel|print|done|salary_return) · `workerModal` · `svcModal` · `clientModal` · `agentModal` · `noteModal` · `pricingModal` · `visaEditModal` · `borderModal` · `iqamaModal` · `insuranceModal` · `workPermitModal` · `payEdit` (object) · plus `InvoiceCommentModal` gated by a local `open` state inside the comments card (line 7526).

Render block where modals are mounted: lines 1935–2051. `ActionModal` covers 6 operation `type`s in one component — each is treated as its own modal below.

---

## ActionModal — multi-type (def: line 2418; final `<Modal>` line 3889)

`ActionModal` is a single component rendering 6 different operations selected by `type`. Triggers: `onRecordPayment`→'payment' (1652), `onRefund`→'refund' (1653), `onCancelInv`→'cancel' (1654), `onPrint`→'print' (1655), `onMarkDone`/`openTransferStage`→'done' (1656,1659), `onReturnSalary`→'salary_return' (1657). Submit handler `onSubmit` (line 2787) branches per `type`. Per-type `meta` (title/color/icon/submitLabel) at line 2736.

### modal `inv_action_payment` — «تسجيل دفعة» / Record Payment (trigger: «تسجيل دفعة» button, ActionGridButton line 8433 / ActionToolbar line 3913; modal def 2418, submit branch 2799)
Wizard pages (line 3759): `invoiceInfo` (read-only) → [`InstallmentPicker` if >1 payable installment] → `PaymentDetailsForm` (cash: 1 page `part='all'`; bank: `part='details'` then `part='note'`) → note page. Sub-forms: `PaymentDetailsForm` (2085), `InstallmentPicker` (2163), `InvoiceInfoSection` (2404).

Fields:
| key | label | table.column | editable | file:line |
|---|---|---|---|---|
| paid_amount | المبلغ المدفوع / Paid Amount | `payments.amount` (+ allocates to `installments.paid_amount`, rolls up `invoices.paid_amount`) | y | 2145 |
| payment_method | طريقة الدفع / Payment Method (cash\|bank) | `payments.payment_method_id` (resolved from lookup) | y | 2147 |
| selected_installment | اختيار الدفعة / Select Installment | targets which `installments` row (FIFO otherwise) | y | 2164/2179 |
| transfer_receipt | إيصال الحوالة / Transfer Receipt (bank only) | `attachments` (entity_type='payment', notes='bank_transfer_receipt') | y | 2117/2151 |
| payment_notes | ملاحظة / Note | `payments.notes` | y | 2120/2132 |
| iqama_border_number | رقم الحدود / Border No (iqama tranche; currently `showIqamaPassport=false`, dormant) | `visa_applications.border_number` | y | 2094 (form), saved 2963 |
| iqama_worker_name | اسم العامل / Worker name (dormant) | `visa_applications.worker_name` | y | 2094, saved 2962 |
| link_visa | (auto-selected linked visa for residence tranche) | spawns `iqama_issuance_applications` row | auto | 2917/2944 |
| passport_file | صورة الجواز / Passport (residence tranche) | `attachments` (entity_type='visa_application', notes='passport') | y | 2919 |

Buttons:
| key | label | action | file:line |
|---|---|---|---|
| next | التالي / Next | advance wizard page | FormKit footer (3895) |
| back | السابق / Previous | previous page | FormKit footer (3895) |
| submit | تسجيل الدفعة / Record Payment | insert payment, allocate installments, roll up invoice | 3893 / handler 2799 |
| cancel | (X close) | onClose | FormKit chrome |
current gate: button shown when `canPay = !cancelled && remaining>0.005 && canPayPerm` where `canPayPerm = canPerm(user,'invoices.record_payment')` (1932, 8421). Defensive re-check in onSubmit is amount-based only.

### modal `inv_action_refund` — «استرجاع دفعة» / Refund Payment (trigger: «استرجاع» button line 8440 / 3917; modal def 2418, submit branch 2980)
Wizard pages (line 3796): `invoiceInfo` → [`RefundScopeForm` if permanent-visa, kلي/تأشيرة] → then either **per-visa** path (`VisaRefundDistForm part='amounts'` → `part='summary'` → `VisaRefundFinalForm`) or **total** path (`RefundDetailsForm` → `RefundReasonForm`). Sub-forms: `RefundDetailsForm` (2235), `RefundReasonForm` (2273), `RefundScopeForm` (2283), `VisaRefundDistForm` (2301), `VisaRefundFinalForm` (2365).

Fields:
| key | label | table.column | editable | file:line |
|---|---|---|---|---|
| refund_amount | المبلغ المسترجع / Refund Amount (total scope) | inserts negative `payments.amount`; subtracts from `installments.paid_amount` LIFO + `invoices.paid_amount` | y | 2257 |
| refund_method | طريقة الاسترجاع / Refund Method (cash\|bank) | `payments.payment_method_id` | y | 2259/2368 |
| refund_scope | نوع الاسترجاع / Refund Type (total\|visa) | controls flow (visa = delete a `visa_applications` row) | y | 2286 |
| refund_visa | التأشيرة / Visa (visa scope) | `visa_applications` row deleted (3086); decrements `service_requests.quantity` | y | 2289 |
| refund_dist[instId] | توزيع الاسترجاع على الدفعات / Distribute (visa scope) | per-installment `installments.total_amount`/`paid_amount` adjust (3078) | y | 2354 |
| refund_transfer_receipt | إيصال الحوالة / Transfer Receipt (bank) | `attachments` (entity_type='payment', notes='refund_transfer_receipt') | y | 2263/2371 |
| refund_notes | سبب الاسترجاع / Refund Reason | `payments.notes` (refund row) | y | 2275/2374 |

Buttons: next / back / submit «تأكيد الاسترجاع» (Confirm Refund, 2747) / cancel(X). Handler 2980.
current gate: shown when `canRefund = !cancelled && paid>0.005 && canRefundPerm`, `canRefundPerm = canPerm(user,'invoices.refund') && !gmLock` (1932, 8422). `gmLock = reqDone && !isGM(user)` (1676). onSubmit defensive guard: done+non-GM blocked (2791).

### modal `inv_action_cancel` — «إلغاء الفاتورة» / Cancel Invoice (trigger: «إلغاء» button line 8447 / 3921; modal def 2418, submit branch 3163)
Wizard pages (line 3846): `invoiceInfo` → `CancelReasonForm` (2381, warning + required reason).

Fields:
| key | label | table.column | editable | file:line |
|---|---|---|---|---|
| cancel_reason | سبب الإلغاء / Cancellation Reason | `invoices.cancel_log[]` (jsonb append; also `service_requests.cancelled_reason`) | y | 2384 |

Buttons: next / back / submit «تأكيد الإلغاء» (Confirm Cancel, 2753) / cancel(X). Handler 3163: flips `invoices.status_id`→cancelled, appends `cancel_log`, sets `service_requests.status_id`→cancelled (unless done).
current gate: shown when `canCancel = !cancelled && canCancelPerm && !isZeroSvc(...)`, `canCancelPerm = canPerm(user,'invoices.cancel') && !gmLock` (1932, 8424).

### modal `inv_action_print` — «طباعة الفاتورة» / Print Invoice (trigger: «طباعة» button line 3925 [ActionToolbar]; modal def 2418)
NOTE: the per-language print buttons in the layout (line 8470-8473, `PrintLangButton`→`printInvoice`) bypass this modal and print directly. The ActionModal 'print' type is the options dialog. Single page `printOptions` (line 3518). Handler is a no-op (just closes, 3497).

Fields (all local UI state, no DB write):
| key | label | table.column | editable | file:line |
|---|---|---|---|---|
| print_logo | شعار المؤسسة / Company Logo | (none — print toggle) | y | 3521 |
| print_client | بيانات العميل / Client Info | (none) | y | 3522 |
| print_details | تفاصيل الدفعات والمدفوعات / Installments & Payments | (none) | y | 3523 |
| print_stamp | ختم وتوقيع / Stamp & Signature | (none) | y | 3524 |

Buttons: submit «طباعة» (Print, 2759) / cancel(X).
current gate: the print SECTION (incl. per-lang buttons) wrapped in `canPerm(user, 'invoices.print')` (line 8463).

### modal `inv_action_done` — «حالة المعاملة / موافقة المحاسب / مرحلة» (trigger: stage `StageRow` buttons via `onMarkDone`/`openTransferStage`, lines 1798-1818; modal def 2418, submit branch 3226)
Most complex `type`. Title/content vary by service: staged (transfer/renewal) vs accountant-approval vs generic done. Stages passed via `stage` prop: transfer|insurance|workpermit|muqeem|iqama. Three content variants: `doneConfirm` staged (3533), accountant (3598), generic `حالة المعاملة` (3623). Sub-step labels: نقل الكفالة = النقل→التأمين→رخصة العمل→الإقامة (transfer-only skips WP); تجديد = التأمين(+«لا يحتاج»)→الإقامة.

Fields (union; presence depends on service/stage):
| key | label | table.column | editable | file:line |
|---|---|---|---|---|
| done_choice | تم الإنجاز / ملغاة / لا يحتاج (done\|cancel\|skip) | drives `service_requests.status_id` or stage_data status | y | 3538/3634 |
| done_note | السبب / ملاحظة / Reason | `service_requests.completion_note` or `<calc>.stage_data[stage].reason` | y | 3550/3619/3685 |
| acct_choice | موافقة المحاسب نعم/لا (yes\|no) | `service_requests.accountant_status` (approved/rejected) | y | 3609 |
| ins_company | اسم الشركة / Company (insurance stage) | `<calc>.stage_data.insurance.company` + `insurance_company`/`medical_insurance_company` | y | 3555 |
| ins_policy_no | رقم بوليصة التأمين / Policy No | `<calc>.stage_data.insurance.policy_no` (+ `medical_insurance_policy`) | y | 3556 |
| ins_expiry | تاريخ انتهاء التأمين / Insurance Expiry | `stage_data.insurance.expiry` (+ `insurance_expiry`/`medical_insurance_end`) | y | 3557 |
| ins_amount | المبلغ / Amount | `stage_data.insurance.amount` | y | 3558 |
| ins_file | ملف بوليصة التأمين / Policy File | `attachments` (notes='tr_ins_file'/'ren_ins_file') | y | 3559 |
| wp_duration | المدة / Duration (work permit) | `stage_data.work_permit.duration_months` | y | 3563 |
| wp_expiry | تاريخ انتهاء رخصة العمل / WP Expiry | `stage_data.work_permit.expiry` (+ `work_permit_expiry`) | y | 3566 |
| wp_amount | المبلغ / Amount | `stage_data.work_permit.amount` | y | 3567 |
| wp_file | رخصة العمل / Work Permit File | `attachments` (notes='tr_wp_file') | y | 3568 |
| muq_via_contact | التجديد عبر تواصل نعم/لا / Renewal via contact | `stage_data.{muqeem\|iqama}.via_contact` | y | 3576 |
| renew_iqama_expiry | تاريخ انتهاء الإقامة / Iqama Expiry (final stage) | `<calc>.expected_expiry_date` + stage_data | y | 3588 |
| renew_occupation | المهنة / Occupation (final stage) | `<calc>.occupation_id`/`occupation_name_ar` | y | 3589 |
| renew_muqeem_file | ملف مقيم / Muqeem File | `attachments` (notes='muqeem_file'/'ren_muqeem_file') | y | 3593 |
| done_file | إرفاق المستند / Attach document (documents svc) | `attachments` (entity_type='service_request', notes='document_file') | y | 3651 |
| ext_target_700 | الرقم الموحد للشركة الناقلة / Transferring company unified no (external transfer) | `other_applications.details.transfer_company_700` | y | 3677 |
| ext_manager | اسم المدير / Manager name (external transfer) | `other_applications.details.manager_name` | y | 3680 |
| done_vals[*] | (config-driven per DONE_INPUTS: e.g. profession_change, etc.) | `other_applications.details[key]` + `attachments` for file types | y | 3655-3671 |

Buttons: next/back / submit (label varies: «تم الإنجاز»/«تأكيد الإلغاء»/«تأكيد الموافقة»/«تأكيد الرفض»/«تأكيد عدم الحاجة»/«حفظ», 2765-2767) / cancel(X). Handler 3226 (writes `service_requests.status_id`→done/cancelled, `accountant_status`, `<calc>.stage_data`, `other_applications.details`).
current gate: stage buttons require `canPerm(user,'invoices.edit')` (1769/1775) and `!cancelledRO`. When `reqDone && !isGM` only a status badge shows (no action button).

### modal `inv_action_salary_return` — «إرجاع الراتب» / Salary Return (trigger: «إرجاع الراتب» StageRow via `onReturnSalary` line 1770; modal def 2418, submit branch 3460)
Single page `salaryReturnConfirm` (3695), driven by `SALARY_RETURN_INPUTS`. Two-phase salary (name_translation) flow.

Fields:
| key | label | table.column | editable | file:line |
|---|---|---|---|---|
| base_salary | الراتب الأساسي / Base salary (read-only, default 400) | `other_applications.details.base_salary` | n (display only) | 3702-3710 |
| salary_base_file | صورة الراتب الأساسي / Salary screenshot | `attachments` (entity_type='service_request', notes='salary_base_file') | y | 3700 |

Buttons: submit «تأكيد الإرجاع» (Confirm Return, 2773) / cancel(X). Handler 3460 sets `other_applications.details.salary_phase='returned'`.
current gate: button shown only when `reqDone && salary_phase==='awaiting_return' && !cancelledRO && !reqCancelled && canPerm(user,'invoices.edit')` (1767-1770).

---

## modal `inv_worker_pick` — «تغيير العامل» / Change worker (def: function line 5166; `<Modal>` line 5408)
Trigger: worker-card edit button → `onEditWorker` → `setWorkerModal(true)` (mounted 1937). Search-and-select picker (search workers + temproryworkers, dedupe by iqama). Selecting a worker shows read-only worker + facility framesets.

Fields:
| key | label | table.column | editable | file:line |
|---|---|---|---|---|
| worker_search | ابحث بالاسم أو رقم الإقامة / Search by name or Iqama | (search only; not persisted) | y | 5386 |
| selected_worker | (picked worker card) | `other_applications.worker_id` + `worker_facility_id` (+ appends `details.worker_changes[]`) | y (select) | 5269/5227 |

Buttons:
| key | label | action | file:line |
|---|---|---|---|
| select_worker | (click result card) | set selected | 5269 |
| clear_worker | (X on selected card) | deselect | 5313 |
| submit | تأكيد تغيير العامل / Confirm worker change | update other_applications.worker_id | 5411 / handler 5213 |
| cancel | (X close) | onClose | 5408 |
current gate: `canCardBtn(user, 'invoices', 'worker_facility', 'edit')` (7669) AND `!cancelledRO && canPerm(user,'invoices.edit')` (1932). Self-pick blocked (`sameAsCurrent`).

---

## modal `inv_client_edit` — «تعديل بيانات العميل» / Edit client (def: function line 5417; `<Modal>` line 5514)
Trigger: client-card edit → `onEditClient` → `setClientModal(true)` (mounted 1963). When «العميل هو نفس العامل» (`workerIsClient`) only phone editable.

Fields:
| key | label | table.column | editable | file:line |
|---|---|---|---|---|
| name_ar | الاسم / Name | `clients.name_ar` | y (locked if workerIsClient) | 5504 |
| nationality_id | الجنسية / Nationality | `clients.nationality_id` | y (locked if workerIsClient) | 5505 |
| id_number | رقم الهوية / ID Number | `clients.id_number` | y (locked if workerIsClient) | 5507 |
| phone | رقم الجوال / Phone | `clients.phone` (also appends to `workers.billing_mobiles`) | y | 5508 |

Buttons: submit «تعديل بيانات العميل» (5517) / cancel(X). Handler 5451 updates `clients` + appends `clients.edit_log[]`.
current gate: `canCardBtn(user, 'invoices', 'client', 'edit')` (7616) AND `!cancelledRO && canPerm(user,'invoices.edit')`.

---

## modal `inv_agent_edit` — «تعديل بيانات الوسيط» / Edit agent (def: function line 5523; `<Modal>` line 5594)
Trigger: agent-card edit → `onEditAgent` → `setAgentModal(true)` (mounted 1986).

Fields:
| key | label | table.column | editable | file:line |
|---|---|---|---|---|
| name_ar | الاسم / Name | `agents.name_ar` | y | 5584 |
| nationality_id | الجنسية / Nationality | `agents.nationality_id` | y | 5585 |
| id_number | رقم الهوية / ID Number | `agents.id_number` | y | 5587 |
| phone | رقم الجوال / Phone | `agents.phone` | y | 5588 |

Buttons: submit «تعديل بيانات الوسيط» (5597) / cancel(X). Handler 5550 updates `agents` + `agents.edit_log[]`.
current gate: `canCardBtn(user, 'invoices', 'agent', 'edit')` (7859) AND `!cancelledRO && canPerm(user,'invoices.edit')`.

---

## modal `inv_service_edit` — «تعديل تفاصيل الخدمة» / Edit service details (def: function line 5605; `<Modal>` line 5743)
Trigger: service-card edit → `onEditService` → `setSvcModal(true)` (mounted 1947). Two shapes: general svc (office + description) vs chamber-of-commerce (`svcCode==='other'`: cert-type + file/text).

Fields:
| key | label | table.column | editable | file:line |
|---|---|---|---|---|
| branch_id | المكتب / Office | `other_applications` (+ `invoices.branch_id` + `service_requests.branch_id`) | y | 5710 |
| description | الوصف / Description (general) | `other_applications.description` | y | 5735 |
| chamber_subtype | نوع التصديق / Certification Type (printed\|open_request) | `other_applications.details.chamber_subtype` (+ syncs pricing label) | y | 5714 |
| chamber_text | نص الطلب / Request text (open_request) | `other_applications.details.chamber_text` | y | 5717 |
| chamber_file | ملف المطبوعات / Printout file (printed) | `attachments` (chamber bucket) → `details.chamber_file` | y | 5719 |

Buttons: submit «تعديل تفاصيل الخدمة» (5746) / cancel(X). Handler 5632 updates `other_applications` + appends `details.service_changes[]`.
current gate: `svcEditable = canCardBtn(user,'invoices','service','edit')` excluding transfer/ajeer/iqama_renewal/iqama_issuance codes (7748) AND `!cancelledRO && canPerm(user,'invoices.edit')`.

---

## modal `inv_note_edit` — «تعديل الملاحظة» / Edit note (def: function line 5763; `<Modal>` line 5800)
Trigger: notes-card edit → `onEditNote` → `setNoteModal(true)` (mounted 1996).

Fields:
| key | label | table.column | editable | file:line |
|---|---|---|---|---|
| note_public | ملاحظة الفاتورة / Invoice Note (shown on print) | `invoices.note_public` | y | 5793 |

Buttons: submit «حفظ الملاحظة» (5803) / cancel(X). Handler 5770 updates `invoices.note_public` + `note_log[]`.
current gate: `canCardBtn(user, 'invoices', 'notes', 'edit')` (7821) AND `!cancelledRO && canPerm(user,'invoices.edit')`.

---

## modal `inv_border_numbers` — «بيانات التأشيرة/التأشيرات» / Visa(s) data (def: function line 5838; `<Modal>` line 6028)
Trigger: «بيانات التأشيرات» StageRow → `setBorderModal(true)` (1735; mounted 2018). Per-visa tabs; shows only visas lacking a border number. Each visa's 4 fields are an all-or-nothing unit.

Fields (per visa tab):
| key | label | table.column | editable | file:line |
|---|---|---|---|---|
| unified_number | الرقم الموحد للمنشأة / Establishment unified no. (starts 7) | `visa_applications.unified_number` | y | 6008 |
| visa_number | رقم التأشيرة / Visa number (starts 1) | `visa_applications.visa_number` | y | 6012 |
| border_number | رقم الحدود / Border number (starts 3, unique) | `visa_applications.border_number` | y | 6015 |
| visa_file | ملف التأشيرة / Visa file | `attachments` (entity_type='visa_application', notes='visa_file') | y | 6019 |

Buttons:
| key | label | action | file:line |
|---|---|---|---|
| visa_tab | (per-visa tab) | switch active visa | 5988 |
| submit | حفظ / Save | update visa_applications + upload files | 6032 / handler 5914 |
| cancel | (X close) | onClose | 6028 |
current gate: button `disabled={!canStageEdit || data.loading || !issuancePaid}` where `canStageEdit = !cancelledRO && canPerm(user,'invoices.edit')` (1706,1733). Payment-gated (issuance installment must be paid).

---

## modal `inv_visa_stage_insurance` / `inv_visa_stage_work_permit` — «بيانات التأمين» / «بيانات رخصة العمل» (def: function `VisaStageDataModal` line 6038; `<Modal>` line 6212)
One component, two instances by `stage` prop. Triggers: insurance → `setInsuranceModal(true)` (1754); work_permit → `setWorkPermitModal(true)` (1756). Mounted 2039/2046. Per-visa tabs over issued visas (border_number present). Permanent-visa only.

Fields — insurance (per visa):
| key | label | table.column | editable | file:line |
|---|---|---|---|---|
| company | اسم الشركة / Company | `iqama_issuance_applications.stage_data.insurance.company` | y | 6183 |
| policy_no | رقم بوليصة التأمين / Policy No | `…stage_data.insurance.policy_no` | y | 6184 |
| expiry | تاريخ انتهاء التأمين / Insurance Expiry | `…stage_data.insurance.expiry` | y | 6185 |
| amount | المبلغ / Amount | `…stage_data.insurance.amount` | y | 6186 |
| ins_file | ملف بوليصة التأمين / Policy File | `attachments` (entity_type='visa_application', notes='visa_ins_file') | y | 6188 |

Fields — work permit (per visa):
| key | label | table.column | editable | file:line |
|---|---|---|---|---|
| duration | المدة / Duration (3/6/9/12/24) | `…stage_data.work_permit.duration_months` | y | 6194 |
| expiry | تاريخ انتهاء رخصة العمل / WP Expiry | `…stage_data.work_permit.expiry` | y | 6197 |
| amount | المبلغ / Amount | `…stage_data.work_permit.amount` | y | 6198 |
| wp_file | ملف رخصة العمل / Work Permit File | `attachments` (notes='visa_wp_file') | y | 6200 |

Buttons: visa_tab (6160) / submit «حفظ» (6215) / cancel(X). Handler 6085 upserts `iqama_issuance_applications.stage_data[stage]`.
current gate: buttons added only `if (canStageEdit)` (1754/1756); `canStageEdit = !cancelledRO && canPerm(user,'invoices.edit')`.

---

## modal `inv_iqama_issue` — «إصدار الإقامة/الإقامات» / Issue Iqama(s) (def: function line 6260; `<Modal>` line 6484)
Trigger: «الإقامات» StageRow → `setIqamaModal(true)` (1742; mounted 2032). Per-visa tabs over eligible visas (border present, iqama not yet issued; permanent requires insurance+work_permit both done). Payment-gated per visa.

Fields (per eligible visa):
| key | label | table.column | editable | file:line |
|---|---|---|---|---|
| worker_name | اسم العامل / Worker name | `visa_applications.worker_name` | y | 6458 |
| iqama_number | رقم الإقامة / Iqama number (starts 2, unique) | `iqama_issuance_applications.iqama_number` | y | 6461 |
| iqama_expiry | تاريخ انتهاء الإقامة / Iqama expiry | `iqama_issuance_applications.iqama_expiry` | y | 6463 |
| muqeem_file | ملف مقيم / Muqeem file | `attachments` (entity_type='visa_application', notes='muqeem') | y | 6465 |

Buttons: visa_tab (6433) / submit «حفظ» (6487) / cancel(X). Handler 6336 updates-or-inserts `iqama_issuance_applications` per visa.
current gate: button `disabled={!canStageEdit || data.loading}` (1742); only eligible (border + stages done) visas accept input.

---

## modal `inv_payment_edit` — «تعديل الدفعة» / Edit payment (def: function line 6493; `<Modal>` line 6636)
Trigger: installments/payments-card per-payment edit → `onEditPayment` → `setPayEdit(payment)` (mounted 2026). Handles both payments and refunds (negative amount → red, reason required). Re-syncs installments + invoice paid by delta.

Fields:
| key | label | table.column | editable | file:line |
|---|---|---|---|---|
| amount | المبلغ / Amount (or مبلغ الاسترجاع / Refund Amount) | `payments.amount` (delta re-distributed across `installments`, rolls up `invoices.paid_amount`) | y | 6623 |
| method | طريقة الدفع / Payment Method (cash\|bank) | `payments.payment_method_id` | y | 6625 |
| notes | ملاحظة / Note (or السبب / Reason; required for refund) | `payments.notes` | y | 6627 |

Buttons: submit «تعديل الدفعة» (6639) / cancel(X). Handler 6522 updates `payments` + appends `invoices.payment_log[]`. Guards against un-settling an iqama-spawned residence installment (6585).
current gate: `onEditPayment` passed only if `canCardBtn(user,'invoices','installments_payments','edit')` (7807) AND `!cancelledRO && canPerm(user,'invoices.record_payment')` (1932).

---

## modal `inv_pricing_edit` — «تعديل التسعير» / Edit pricing (def: function line 6645; `<Modal>` line 6769)
Trigger: pricing-card edit → `onEditPricing` → `setPricingModal(true)` (mounted 2004). Breakdown mode (editable line items + add/remove rows) or flat-total mode. Re-distributes installment schedule to match new total.

Fields:
| key | label | table.column | editable | file:line |
|---|---|---|---|---|
| line[i].label | البند / Item (per breakdown line; line 0 = base, not removable) | `invoices.pricing_breakdown[i].label` | y | 6735 |
| line[i].amount | المبلغ / Amount | `invoices.pricing_breakdown[i].amount` (sums to `total_amount`) | y | 6738 |
| flat_total | إجمالي الفاتورة / Invoice Total (no-breakdown mode) | `invoices.total_amount` | y | 6762 |

Buttons:
| key | label | action | file:line |
|---|---|---|---|
| remove_line | (trash icon, rows >0) | remove pricing line | 6744 |
| add_line | إضافة بند / Add item | append blank line | 6751 |
| submit | حفظ التسعير / Save pricing | update total_amount + pricing_breakdown, re-distribute installments | 6772 / handler 6658 |
| cancel | (X close) | onClose | 6769 |
current gate: `onEditPricing` passed only if `canCardBtn(user,'invoices','pricing','edit')` (7799) AND `!cancelledRO && canPerm(user,'invoices.edit')`. Blocks total < paid.

---

## modal `inv_permanent_visa_edit` — «تعديل تأشيرة وإقامة دائمة» / Edit permanent visa (def: function line 6912; `<Modal>` line 7350) — WIZARD
Trigger: visa-card edit (permanent/temporary) → `onEditVisa` → `setVisaEditModal(true)` (mounted 2010). 3-step wizard mirroring create flow. Re-settles per-visa residence installments + pricing on count change.

Sub-steps (pages array line 7344):
1. `officePage` (title «المكتب»/Office, line 7148) — office select.
2. `groupsPage` (title «بيانات التأشيرات»/Visa details, line 7164) — visa groups (nationality/embassy/occupation/gender/count), add/remove groups, auto-distribute toggle.
3. `filesPage` (title «توزيع الملفات»/File distribution, line 7244) — assign visas to files (≤4 visas/file, homogeneous), drag-to-move, add/remove files.

Fields:
| key | label | table.column | editable | file:line |
|---|---|---|---|---|
| branch_id | المكتب / Office | `service_requests.branch_id` + `invoices.branch_id` | y | 7152 |
| group[].nationality | الجنسية / Nationality | `visa_applications.nationality_id` (per derived row) | y | 7208 |
| group[].embassy | السفارة / Embassy | `visa_applications.embassy_id` | y | 7213 |
| group[].profession | المهنة / Occupation | `visa_applications.occupation_id` | y | 7218 |
| group[].gender | الجنس / Gender (male\|female) | `visa_applications.gender` | y | 7222 |
| group[].count | عدد التأشيرات / Visa count (FKStepper, max 4) | number of `visa_applications` rows in that signature | y | 7224 |
| file_assignments | (file ↔ group counts) | `visa_applications.file_number` (+ creates/deletes residence `installments`, adjusts `invoices.total_amount`) | y | 7268-7333 |

Buttons:
| key | label | action | file:line |
|---|---|---|---|
| add_group | مجموعة / Group + | add visa group | 7172 |
| remove_group | حذف / Delete | remove group | 7201 |
| auto_distribute | توصيع تلقائي / Auto distribute (checkbox) | repack files | 7232 |
| add_file | ملف / File + | add a file | 7261 |
| remove_file | (X on file) | remove file | 7280 |
| auto_files | تلقائي / Auto | repack files | 7259 |
| inc/dec group-in-file | + / − | move visa count between groups/files | 7308/7312/7328/7331 |
| next | التالي / Next | advance (validates group/files) | 7354 |
| back | السابق / Previous | go back | 7355 |
| submit | حفظ التعديلات / Save changes | reconcile visa_applications + installments + pricing | 7356 / handler 7051 |
| cancel | (X close) | onClose | 7351 |
current gate: `visaEditable = canCardBtn(user,'invoices','service','edit')` for work_visa_permanent/temporary codes (7713) AND `!cancelledRO && canPerm(user,'invoices.edit')`. Blocks deleting a visa whose residence is partly paid (7100).

---

## modal `inv_comment_add` — «إضافة تعليق» / Add comment (def: function line 7532; `<Modal>` line 7567)
Trigger: «إضافة تعليق» button inside comments card → local `setOpen(true)` (button 7517; mounted 7526).

Fields:
| key | label | table.column | editable | file:line |
|---|---|---|---|---|
| comment_text | نص التعليق / Comment text | `service_request_notes.note` | y | 7573 |
| attachment | المرفق / Attachment (single file) | `attachments` (entity_type='service_request_note') | y | 7575 |

Buttons: submit «إضافة» (Add, 7580) / cancel(X). Handler 7538 inserts `service_request_notes`.
current gate: none found (no `can()`/`canCardBtn()` wrapping the comment button or modal). RLS on `service_request_notes` is the only enforcement.

---

## Current permission wiring (can()/canCardBtn()/canPerm()/isGM inside or gating modals)

Imports (line 4): `import { can as canPerm, isGM, cardVisible, canCardBtn, tabOffices } from './lib/permissions.js'`

App-level page-perm checks (`canPerm(user, 'invoices.<x>')`):
- `invoices.edit` — gates ALL edit modals (worker/service/visa/borders/client/agent/note/pricing) and all stage/done buttons. Lines 1706, 1769, 1775, 1932 (×8 onEdit* handlers passed `undefined` when false).
- `invoices.record_payment` — gates record-payment button (`canPayPerm`, 1932/8421) and payment-edit modal (`onEditPayment`, 1932).
- `invoices.refund` — gates refund button (`canRefundPerm = canPerm(...) && !gmLock`, 1932/8422).
- `invoices.cancel` — gates cancel button (`canCancelPerm = canPerm(...) && !gmLock`, 1932/8424).
- `invoices.print` — gates entire print section incl. per-language print buttons (8463).

Card-button perms (`canCardBtn(user, 'invoices', '<card>', 'edit')`) — second layer on each edit modal's trigger:
- `'client'` → 7616 (client edit)
- `'worker_facility'` → 7669 (worker pick)
- `'service'` → 7713 (visa edit), 7748 (service edit)
- `'pricing'` → 7799 (pricing edit)
- `'installments_payments'` → 7807 (payment edit)
- `'notes'` → 7821 (note edit)
- `'agent'` → 7859 (agent edit)

GM-only escalation: `gmLock = reqDone && !isGM(user)` (1676) — when a transaction is `done`, non-GM users cannot refund/cancel (button hidden + onSubmit re-checks at 2791). A note banner shows instead (8454).

Other gates baked into modal availability (state-based, not role-based): `cancelledRO` (cancelled invoice = read-only, hides all edit handlers); `issuancePaid` / `residencePaidOf` (payment-gated visa/iqama data entry); `isZeroSvc` (supplier-payroll hides cancel button).

NO permission gate found on: `inv_comment_add` (Add comment) — only DB RLS.

---

## DB tables & RPCs the modals write to

Tables (direct `.update`/`.insert`/`.delete`):
- `invoices` — paid_amount, total_amount, status_id, pricing_breakdown, branch_id, note_public, service_quantity, installments_count, last_activity_at + jsonb logs: `cancel_log`, `note_log`, `pricing_log`, `payment_log`, `service_log`.
- `payments` — insert (incl. negative for refunds), update amount/method/notes/bank_reference/bank_account_id, is_valid.
- `installments` — paid_amount, paid_date, total_amount, deleted_at, visa_application_id; inserts for new residence tranches.
- `service_requests` — status_id, completed_by/at, cancelled_*, accountant_status/note/by/at, completion_note, branch_id, quantity.
- `other_applications` — worker_id, worker_facility_id, description, details (jsonb: worker_changes, service_changes, chamber_*, transfer_company_700, manager_name, salary_phase/base_salary, done-input keys), updated_by/at.
- `clients` — name_ar, id_number, phone, nationality_id, edit_log, updated_by/at.
- `agents` — name_ar, id_number, phone, nationality_id, edit_log.
- `visa_applications` — border_number, unified_number, visa_number, worker_name, file_number, nationality_id, occupation_id, embassy_id, gender; inserts + deletes (visa refund / permanent-visa edit).
- `iqama_issuance_applications` — insert/update: iqama_number, iqama_expiry, main_facility_id, medical_status, stage_data (insurance/work_permit jsonb), created_by.
- `transfer_calculation` / `iqama_renewal_calculation` — stage_data, occupation_id, occupation_name_ar, expected_expiry_date, medical_insurance_*/insurance_*/work_permit_expiry, updated_at.
- `workers` — billing_mobiles (append from client phone edit).
- `service_request_notes` — insert (comment).
- `attachments` — insert (many entity_type/notes combos: payment bank_transfer_receipt / refund_transfer_receipt, visa_application passport/visa_file/visa_ins_file/visa_wp_file/muqeem, service_request document_file/salary_base_file/tr_ins_file/tr_wp_file/muqeem_file/ren_*/done-input keys, service_request_note).
- Storage bucket: `attachments` (all file uploads via `sb.storage.from('attachments')`).

Lookup reads (resolve ids): `lookup_items`+`lookup_categories` (payment_method, invoice_status, request_status), `nationalities`, `occupations`, `embassies`, `branches`, `bank_account_branches`+`bank_accounts`, `workers`/`temproryworkers` (search).

Helper for status recompute: `invoiceStatusPatch(sb, statusCode, paid, total)` (line 5752) — used by payment-edit, pricing-edit, permanent-visa-edit.

RPCs: none called from the modals (all writes are direct table ops). (Invoice list/stats RPCs exist elsewhere in the file but not inside modals.)
