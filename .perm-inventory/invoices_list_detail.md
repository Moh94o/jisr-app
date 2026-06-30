# Invoices — List & Detail Inventory

File: `C:/dev/jisr-app/src/InvoicePage.jsx` (8622 lines)
Permission lib: `C:/dev/jisr-app/src/lib/permissions.js`

Components:
- `InvoicePage` (list page) — line 735
- `InvoiceDetailPage` (detail logic + handlers + modals) — line 1406
- `InvoiceDetailLayout` (detail render / cards) — line 7584
- `StatsCards` (KPI cards) — line 657
- `InvoiceCommentsCard` — line 7456 / `InvoiceCommentModal` — line 7532

Permission import (line 4):
`import { can as canPerm, isGM, cardVisible, canCardBtn, tabOffices } from './lib/permissions.js'`

Catalog tab id = `invoices`. Card gates use `cardVisible(user,'invoices','<key>')`; per-card buttons use `canCardBtn(user,'invoices','<key>','<action>')`. Tab module mapping comes from `permCatalog.js` (`tabModule('invoices')`).

---

## A. Toolbar / header actions

| key | Arabic label | does what | file:line | current gate | opens-modal? |
|---|---|---|---|---|---|
| `inv_toolbar_new_invoice` | «فاتورة جديدة» | Calls `onNewInvoice` prop (host opens ServiceRequestPage create wizard) | 1077–1085 | `onNewInvoice && canPerm(user,'invoices.create')` (1077) | Yes — host wizard (ServiceRequestPage), not in this file |

Notes:
- There is **no** export/print/bulk-action button on the list toolbar. Print exists only on the detail view (section D footer). No row-level bulk select.
- The only other "header" affordance is the **Filter** toggle button (see section B).

---

## B. Filters / search / status tabs / stat cards

### B.1 Search box
| key | Arabic label | does what | file:line | gate |
|---|---|---|---|---|
| `inv_search` | placeholder «ابحث عن أي شيء: اسم، إقامة، هوية، جوال، حدود، منشأة، رقم فاتورة أو طلب…» | Debounced (300ms) smart search; drives `dq`→`p_search` in `search_invoice_ids` RPC | input 1098–1103; debounce 788; clear-btn 1104–1111 | none |

### B.2 Filter toggle + clear-all
| key | Arabic label | does what | file:line | gate |
|---|---|---|---|---|
| `inv_filter_toggle` | «تصفية» | Toggles advanced filter panel (`advOpen`) | 1117–1135 | none |
| `inv_filter_clear_all` | title «مسح الفلاتر» | Clears all filters (branch/date/service/pay/amount/plan/stage/acct/agent/nat/overdue) | 1115, 1120–1131 | none (shown only when `hasFilters`) |
| `inv_search_clear` | title «مسح» | Clears search box | 1104–1111 | none |

### B.3 Advanced filter panel (`advOpen`, 1141–1197)
| key | Arabic label | control / field | file:line |
|---|---|---|---|
| `inv_filter_period_presets` | «فترة سريعة» (اليوم/أمس/هذا الأسبوع/هذا الشهر) | date preset chips → set `from`/`to` | 1146–1160 |
| `inv_filter_period_clear` | «مسح التاريخ» | clears from/to | 1161–1163 |
| `inv_filter_branch` | «المكتب» | multi `FKDropdown` → `branchSel` → `p_branch_exact_ids` | 1167–1169 |
| `inv_filter_date_from` | «تاريخ من» | `DateField` → `from` → `p_from` | 1171–1173 |
| `inv_filter_date_to` | «تاريخ إلى» | `DateField` → `to` → `p_to` | 1175–1177 |
| `inv_filter_service_type` | «نوع الخدمة» | multi dropdown → `serviceType` → `p_service_type_ids` | 1179–1181 |
| `inv_filter_txn_status` | «حالة المعاملة» | multi dropdown (computed stage codes) → `reqStage` → `p_req_stages` | 1183–1185 |
| `inv_filter_pay_status` | «حالة السداد» (مدفوعة بالكامل/جزئياً/مستردة/ملغاة) | multi dropdown → `payFilter` → `p_pay_statuses` | 1187–1189 |
| `inv_filter_agent` | «الوسيط» | dropdown → `agentFilter` → `p_agent_id` | 1191–1193 |

State vars exist but **not rendered** in current panel (defined 777–784; still piped to `statFilters` 880–897): `amountMin/amountMax` (`p_amount_min/max`), `paymentPlan` (`p_payment_plan`), `accStatus` (`p_accountant_status`), `natFilter` (`p_nationality_id`), `overdue` (`p_overdue`). Flag as latent filter keys: `inv_filter_amount_min`, `inv_filter_amount_max`, `inv_filter_payment_plan`, `inv_filter_accountant_status`, `inv_filter_nationality`, `inv_filter_overdue`.

The branch dropdown is **office-scoped**: list pre-filtered to `officeScope` (`tabOffices(user,'invoices')`) at 813.

### B.4 Status tabs / chips
There are **no** separate status tab/chip strip; status filtering is via the `inv_filter_pay_status` and `inv_filter_txn_status` dropdowns inside the panel. Day grouping headers (1226–1239) are display-only, not gateable.

### B.5 Stat / KPI cards (`StatsCards`, 657–733; rendered at 1092)
| key | Arabic label | content | file:line |
|---|---|---|---|
| `inv_stat_cash` | «نقدًا» | Today/filtered cash sum + receipts count (`periodStats.cash`) | 668–681 |
| `inv_stat_bank_transfers` | «تحويلات بنكية» | bank+pos sum + count (`periodStats.bank`) | 685, 689–699 |
| `inv_stat_refunded_cancelled` | «مرتجعة أو ملغاة» | voided+cancelled sum + count | 686, 689–699 |
| `inv_stat_services_today` | «الخدمات» | per-service distribution bar + grid (today/filtered) | 705–730 |

Data source: `invoice_period_stats` RPC (950–996), all office-scoped via `p_branch_ids = officeScope`. Cards reflect active filter when any filter set (881). Consider one gate key per card if hide-by-role is wanted; currently always shown.

### B.6 Pagination (1369–1397)
Prev/next/jump controls — display-only, not gateable. Keys if needed: `inv_pager_prev`, `inv_pager_next`, `inv_pager_jump`.

---

## C. Row actions

Each list row is an `<InvCard>` (rendered 1361). **The row has NO inline action buttons/menu.** The entire card is one click target:

| key | Arabic label | does what | file:line | gate |
|---|---|---|---|---|
| `inv_row_open` | (whole card) | `onClick={() => setDetail(r)}` → opens full-page detail (`InvoiceDetailPage`) | 1361 | none (any user who can view the list) |

Rows render status/stage tags, pay state, party, amounts (1240–1362) but expose no per-row edit/delete/menu. All actions live on the detail view (sections A/D).

---

## D. Detail cards (`InvoiceDetailLayout`, 7584; handlers in `InvoiceDetailPage` 1406)

Card edit handlers are passed from line **1932**. EVERY edit handler is uniformly gated:
`cancelledRO || !canPerm(user,'invoices.edit') ? undefined : () => set<X>Modal(true)` — i.e. the edit button only renders when the user holds `invoices.edit` AND the invoice is not cancelled (`cancelledRO = inv.status?.code==='cancelled'`, 1671). `onEditPayment` instead requires `invoices.record_payment` (1932).

Pre-detail VOID banner (cancelled invoices): 1900–1929 (display only, no gate).

---

### card `client` — «العميل» (7590)
Renders via `ClientRows`. Shown for services with a separate client.

Fields (read-only display; the editable surface is the modal):
| key | label | table.column | editable | file:line |
|---|---|---|---|---|
| `client_name` | اسم العميل | `clients.name_ar` / `name_en` | via modal | 7590+ (ClientRows ~3933) |
| `client_id_number` | رقم الهوية | `clients.id_number` | via modal | ClientRows |
| `client_phone` | الجوال | `clients.phone` | via modal | ClientRows |
| `client_nationality` | الجنسية | `clients.nationality_id` → `nationalities` | via modal | ClientRows |
| `client_edit_log` | سجل التعديلات | `clients.edit_log` (jsonb) | no | ~7635 |

Buttons:
| key | label | action | opens-modal | DB table | file:line |
|---|---|---|---|---|---|
| `client_edit` | «تعديل» | `onEditClient` → `setClientModal(true)` | **ClientEditModal** (5417; rendered 1963) | `clients` (update name_ar,id_number,phone,nationality_id,updated_by,updated_at,edit_log @5475) + best-effort `workers.billing_mobiles` @5486 | 7616–7617 |

current gate: card `cardVisible(user,'invoices','client')` (7590); button `canCardBtn(user,'invoices','client','edit')` (7616) AND handler present (handler gated by `invoices.edit` + not cancelled @1932).

---

### card `worker_facility` — «العامل والمنشأة» (7644)
Renders via `WorkerRows`. Shows worker + facility. "Worker is client" badge when applicable.

Fields:
| key | label | table.column | editable | file:line |
|---|---|---|---|---|
| `worker_name` | اسم العامل | `workers.name_ar`/`name_en` | via modal (general bucket only) | 7644+ (WorkerRows ~4033) |
| `worker_iqama_number` | رقم الإقامة | `workers.iqama_number` | via modal | WorkerRows |
| `worker_phone` | الجوال | `workers.phone` / `other_applications.worker_phone` | via modal | WorkerRows |
| `worker_nationality` | الجنسية | `workers.nationality_id` → `nationalities` | via modal | WorkerRows |
| `worker_occupation` | المهنة | `workers.occupation`/`occupation_id` | via modal | WorkerRows |
| `facility_name` | المنشأة | `facilities.name_ar`/`name_en` | via modal | WorkerRows |
| `facility_unified_number` | الرقم الموحد | `facilities.unified_number` | via modal | WorkerRows |
| `facility_hrsd_number` | رقم مكتب العمل | `facilities.hrsd_number` | via modal | WorkerRows |
| `facility_gosi_number` | رقم التأمينات | `facilities.gosi_number` | via modal | WorkerRows |
| `worker_change_log` | سجل تغيير العامل | from `other_applications.details.worker_changes` | no | ~7695 |

Buttons:
| key | label | action | opens-modal | DB table | file:line |
|---|---|---|---|---|---|
| `worker_facility_edit` | «تعديل» | `onEditWorker` → `setWorkerModal(true)` | **WorkerPickModal** (5166; rendered 1937) | `other_applications` (update worker_id,worker_facility_id,updated_by,updated_at,details @5233–5237) | 7669, 7686 |

current gate: card `cardVisible(user,'invoices','worker_facility')` (7644); button `canCardBtn(user,'invoices','worker_facility','edit')` (7669) AND editable only when worker belongs to `other_applications` (general bucket).

---

### card `service` — «الخدمة» (7710)
Two variants by service code.

**Variant A — VISA services** (`work_visa_permanent`/`work_visa_temporary`), renders `VisaInfoRows` (~4115):
Fields: `visa_office`, `visa_composition` (nationality/embassy/gender/profession), `visa_file_distribution`, `visa_quantity` — all from `visa_applications` + `service_requests.quantity`; via modal.

Buttons:
| key | label | action | opens-modal | DB table | file:line |
|---|---|---|---|---|---|
| `service_edit_visa` | «تعديل» | `onEditVisa` → `setVisaEditModal(true)` | **PermanentVisaEditModal** (6912; rendered 2010) | `visa_applications` (file_number @7102, insert @7104, delete @7111), `installments` (@7109/7115), `service_requests` (branch_id,quantity @7117), `invoices` (totals @7141) | 7713, 7729 |
| `service_edit_borders` | «أرقام الحدود» | `onEditBorders` → `setBorderModal(true)` | **BorderNumbersModal** (5838; rendered 2018) | `visa_applications` (border_number,unified_number,visa_number @5933) + `attachments` (visa_file @5944) | 7715, 7722 (currently `bordersEditable=false`) |

**Variant B — non-visa** (`other`/`general`; excludes transfer/ajeer/iqama_renewal/iqama_issuance), renders `TransactionRows` (~4348):
Fields:
| key | label | table.column | editable | file:line |
|---|---|---|---|---|
| `service_description` | الوصف | `other_applications.description` | via modal | ~7755 |
| `service_office` | الجهة/المكتب | `other_applications.details.office` | via modal | TransactionRows |
| `service_chamber_subtype` | نوع الطلب (مطبوع/طلب مفتوح) | `other_applications.details` (printed/open_request) | via modal | ~7762 |
| `service_chamber_text` | نص الطلب | `other_applications.details` | via modal | ~7755 |
| `service_chamber_file` | المرفق/المطبوع | `other_applications.details` (file url) → `attachments` | no (link) | ~7770 |

Buttons:
| key | label | action | opens-modal | DB table | file:line |
|---|---|---|---|---|---|
| `service_edit` | «تعديل» | `onEditService` → `setSvcModal(true)` | **ServiceEditModal** (5605; rendered 1947) | `other_applications` (description,details,updated_by,updated_at @5678), `invoices` (pricing_breakdown @5694 / branch_id @5699), `service_requests` (branch_id @5700) | 7748, 7782 |

current gate: card `cardVisible(user,'invoices','service')` (7710); buttons `canCardBtn(user,'invoices','service','edit')` (7713 visa / 7748 non-visa).

---

### card `pricing` — «التسعير» (7798)
`PricingCard` (~4900). Shown when `!isZeroSvc` and `total>0`. Renders 3 layouts (transfer / iqama_renewal / standard breakdown).

Fields (all read from `inv.pricing_breakdown` jsonb + frozen columns; not directly editable — edited via modal):
| key | label | source | editable | file:line |
|---|---|---|---|---|
| `pricing_line_items` | بنود التسعير | `inv.pricing_breakdown[]` | via modal | PricingCard 4900+ |
| `pricing_office_fees` | رسوم المكتب | breakdown / `office_fee_net` | via modal | PricingCard |
| `pricing_government_fees` | الرسوم الحكومية | breakdown / `government_fees` | via modal | PricingCard |
| `pricing_absher_discount` | خصم أبشر | `data.absherDiscount` | via modal | 7799 |
| `pricing_office_discount` | خصم المكتب | breakdown / manual_discount | via modal | PricingCard |
| `pricing_total` | الإجمالي | `inv.total_amount` | via modal | PricingCard |
| `pricing_log` | سجل التسعير | `inv.pricing_log` (jsonb) | no | ~5069 |

Buttons:
| key | label | action | opens-modal | DB table | file:line |
|---|---|---|---|---|---|
| `pricing_edit` | «تعديل» | `onEditPricing` → `setPricingModal(true)` | **PricingEditModal** (6645; rendered 2004) | `invoices` (total_amount,pricing_breakdown,last_activity_at,pricing_log,status_id @6677), `installments` (total_amount @6693/6717) | 7799 |

current gate: card `cardVisible(user,'invoices','pricing')` (7798); button `canCardBtn(user,'invoices','pricing','edit')` (7799).

---

### card `installments_payments` — «الدفعات والمدفوعات» (7801)
`InstallmentsWithPayments` (~5076). Shown when `total>0`.

Fields:
| key | label | table.column | editable | file:line |
|---|---|---|---|---|
| `installment_order` | الدفعة (الأولى/الثانية…) | `installments.installment_order` | no | ~4851 (InstallmentTimeline) |
| `installment_total` | مبلغ الدفعة | `installments.total_amount` | via pricing/visa modal | InstallmentTimeline |
| `installment_status` | الحالة (مسدّد/جزئي/لم يُسدد) | derived from `installments.paid_amount` | no | InstallmentTimeline |
| `installment_expected_date` | التاريخ المتوقع | `installments.expected_date` | no | InstallmentTimeline |
| `installment_milestone` | معلم الدفعة | `installments.payment_milestone`/`notes` | no | ~1694 |
| `payment_amount` | المبلغ | `payments.amount` | via modal | ~4655 (PaymentRow) |
| `payment_method` | طريقة الدفع | `payments.payment_method_id` | via modal | PaymentRow |
| `payment_date` | التاريخ | `payments.payment_date` | no | PaymentRow |
| `payment_bank_reference` | المرجع البنكي | `payments.bank_reference` | via modal | PaymentRow |
| `payment_creator` | بواسطة | `payments.created_by` | no | PaymentRow |
| `payment_notes` | الملاحظة/السبب | `payments.notes` | via modal | PaymentRow |
| `payment_receipt` | الإيصال | `attachments` (payment) | no (link) | ~4740 |
| `payment_edit_log` | سجل تعديل الدفعة | per-payment log | no | ~4759 |

Buttons:
| key | label | action | opens-modal | DB table | file:line |
|---|---|---|---|---|---|
| `payment_edit` | «تعديل» (per valid payment row) | `onEditPayment` → `setPayEdit(payment)` | **PaymentEditModal** (6493; rendered 2026) | `payments` (amount,bank_reference,notes,payment_method_id @6593), `installments` (paid_amount,paid_date @6549), `invoices` (paid_amount,last_activity_at,payment_log,status_id @6608) | 7807; per-row 4752 |

current gate: card `cardVisible(user,'invoices','installments_payments')` (7801); button `canCardBtn(user,'invoices','installments_payments','edit')` (7807) AND handler requires `invoices.record_payment` (1932). Note the **record-payment / refund** buttons live in the footer block (section D footer), not in this card.

---

### card `notes` — «ملاحظة الفاتورة» (7810)
Shown when note exists OR editable OR has log.

Fields:
| key | label | table.column | editable | file:line |
|---|---|---|---|---|
| `note_public` | نص الملاحظة | `invoices.note_public` | via modal | ~7835 |
| `note_log` | سجل الملاحظة | `invoices.note_log` (jsonb) | no | ~7838 |

Buttons:
| key | label | action | opens-modal | DB table | file:line |
|---|---|---|---|---|---|
| `notes_edit` | «تعديل»/«إضافة» | `onEditNote` → `setNoteModal(true)` | **NoteEditModal** (5763; rendered 1996) | `invoices` (note_public,note_log,last_activity_at @5781) | 7821–7822 |

current gate: card `cardVisible(user,'invoices','notes')` (7810); button `canCardBtn(user,'invoices','notes','edit')` (7821).

---

### card `agent` — «الوسيط» (7845)
Renders `BrokerRows` (~4072). Shown when agent exists.

Fields:
| key | label | table.column | editable | file:line |
|---|---|---|---|---|
| `agent_name` | اسم الوسيط | `agents.name_ar`/`name_en` | via modal | 7845+ (BrokerRows) |
| `agent_id_number` | رقم الهوية | `agents.id_number` | via modal | BrokerRows |
| `agent_phone` | الجوال | `agents.phone` | via modal | BrokerRows |
| `agent_nationality` | الجنسية | `agents.nationality_id` → `nationalities` | via modal | BrokerRows |
| `agent_edit_log` | سجل التعديلات | `agents.edit_log` (jsonb) | no | ~7877 |

Buttons:
| key | label | action | opens-modal | DB table | file:line |
|---|---|---|---|---|---|
| `agent_edit` | «تعديل» | `onEditAgent` → `setAgentModal(true)` | **AgentEditModal** (5523; rendered 1986) | `agents` (name_ar,id_number,phone,nationality_id,updated_by,updated_at,edit_log @5573) | 7859–7860 |

current gate: card `cardVisible(user,'invoices','agent')` (7845); button `canCardBtn(user,'invoices','agent','edit')` (7859) AND `agent.id` present.

---

### card `service_transaction` — «معاملة الخدمة» (7886)
Shown for `work_visa`/`other`/`ajeer` base codes AND only when `stageStatus[]` non-empty. **Read-only** (status rows only). Renders completed-stage `StageRow`s.

Fields (display only, no DB write here):
| key | label | source | editable | file:line |
|---|---|---|---|---|
| `txn_stage_status` | حالة المرحلة (تم إصدار التأشيرة/الإقامة، منجزة، قيد التنفيذ، ملغاة, بانتظار المحاسب…) | derived from `visa_applications`, `transfer_calculation.stage_data`, `iqama_renewal_calculation.stage_data`, `service_requests.status`/`accountant_status` | no | 7886–7902; TxnStatusBar 8481 |

Buttons: none in the card.

current gate: card `cardVisible(user,'invoices','service_transaction')` (7886, also referenced 7909).

> NOTE: The **actionable** stage buttons (which open the stage modals) are NOT in this card — they live in the detail HEADER as `stageActions` (see "Detail header stage actions" below). They are gated by `canStageEdit` (= `!cancelledRO && canPerm(user,'invoices.edit')`, 1706), NOT by a card key. This is permission DRIFT worth a dedicated key.

---

### card `comments` (no catalog key) — «التعليقات» (`InvoiceCommentsCard`, 7456; rendered 7904)
Always rendered when `service_request.id` exists. **NOT gated by `cardVisible`.**

Fields:
| key | label | table.column | editable | file:line |
|---|---|---|---|---|
| `comment_text` | نص التعليق | `service_request_notes.note` | no | ~7494 |
| `comment_attachments` | المرفقات | `attachments` (service_request) | no (links) | ~7495 |
| `comment_creator` | بواسطة | `service_request_notes.created_by` | no | ~7489 |
| `comment_datetime` | التاريخ/الوقت | `service_request_notes.created_at` | no | 7509–7510 |

Buttons:
| key | label | action | opens-modal | DB table | file:line |
|---|---|---|---|---|---|
| `comments_add` | «إضافة تعليق» | `setOpen(true)` | **InvoiceCommentModal** (7532; rendered 7526) | `service_request_notes` (insert: service_request_id,note,created_by @7544) + `attachments` (@7553) | 7517–7523 |

current gate: **NONE** (always shown, no `cardVisible`/`canCardBtn`). DRIFT — propose key `comments` + `comments_add`.

---

### card `financial_summary` (no catalog key) — «المبلغ الإجمالي» (`FinancialSummaryCard`, ~4577; rendered 7907)
Sticky sidebar; shown when `total>0`. **NOT gated.** Read-only.

Fields:
| key | label | source | editable | file:line |
|---|---|---|---|---|
| `fin_total` | الإجمالي (ريال) | `inv.total_amount` | no | ~4591 |
| `fin_creator` | بواسطة | `inv.created_by` | no | ~4591 |
| `fin_paid` | المدفوع | `inv.paid_amount` | no | FinancialSummaryCard |
| `fin_remaining` | المتبقي | `inv.remaining_amount` | no | FinancialSummaryCard |
| `fin_pay_ratio` | نسبة السداد | derived | no | FinancialSummaryCard |
| `fin_installments_count` | عدد الدفعات | `installments` count | no | ~4619 |
| `fin_payments_count` | عدد المدفوعات | `payments` count | no | ~4620 |
| `fin_expected_duration` | المدة المتوقعة | `transfer_calculation`/`iqama_renewal_calculation` (expected_duration_*) | no | ~4639 |
| `fin_expected_expiry` | تاريخ الانتهاء المتوقع | calc (expected_expiry_date) | no | ~4640 |
| `fin_quote_ref` | مرجع التسعيرة | calc id (link) | no (link) | ~4643 |

Buttons: none.
current gate: **NONE** (always shown when total>0). DRIFT — propose key `financial_summary`.

---

### Detail header stage actions (`stageActions`, built 1712–1842; rendered 1843–1847)
Actionable buttons in the detail hero; gate = `canStageEdit` (1706) = `!cancelledRO && canPerm(user,'invoices.edit')`. NOT per-card.

| key | Arabic label | action / opens-modal | DB target | file:line |
|---|---|---|---|---|
| `stage_visa_data` | «التأشيرة»/«التأشيرات» | `setVisaEditModal`? → actually border/visa data; opens **BorderNumbersModal**-equivalent flow | `visa_applications` | 1732 |
| `stage_iqama_data` | «الإقامة»/«الإقامات» | `setIqamaModal(true)` → **IqamaIssueModal** (6260; rendered 2032) | `iqama_issuance_applications` (insert/update iqama_number,iqama_expiry,main_facility_id @6360/6367), `visa_applications.worker_name` @6354, `attachments`(muqeem) @6387 | 1742 |
| `stage_insurance` | «التأمين» | `setInsuranceModal(true)` → **VisaStageDataModal** stage=insurance (6038; rendered 2039) | `iqama_issuance_applications.stage_data` @6099/6103, `attachments` @6121 | 1754, 1799, 1811 |
| `stage_work_permit` | «رخصة العمل» | `setWorkPermitModal(true)` → **VisaStageDataModal** stage=work_permit (rendered 2046) | `iqama_issuance_applications.stage_data`, `attachments` | 1756, 1800 |
| `stage_salary_return` | «إرجاع الراتب» | `onReturnSalary` → **ActionModal** type=salary_return (1657; ActionModal 2418) | `other_applications.details`, `attachments` | 1770 |
| `stage_transfer_mark` | «النقل» | `openTransferStage('transfer')` → **ActionModal** type=done (1659) | `transfer_calculation.stage_data`, `service_requests` | 1798 |
| `stage_transfer_insurance` | «التأمين» | `openTransferStage('insurance')` → **ActionModal** done | `transfer_calculation.stage_data`, `attachments` | 1799, 1811 |
| `stage_transfer_workpermit` | «رخصة العمل» | `openTransferStage('workpermit')` → **ActionModal** done | `transfer_calculation.stage_data` | 1800 |
| `stage_transfer_muqeem` | «الإقامة» | `openTransferStage('muqeem')` → **ActionModal** done | `transfer_calculation.stage_data` | 1801 |
| `stage_renewal_insurance` | «التأمين» | `openTransferStage('insurance')` → **ActionModal** done | `iqama_renewal_calculation.stage_data` | 1811 |
| `stage_renewal_iqama` | «الإقامة» | `openTransferStage('iqama')` → **ActionModal** done | `iqama_renewal_calculation.stage_data` | 1812 |
| `stage_acct_approval` | (موافقة المحاسب) | `acctApprovalStage` → **ActionModal** done (accountant gate) | `service_requests` (accountant_status,accountant_note,accountant_by,accountant_at @3289) | 1816 |

---

### Detail FOOTER action block (8417–8476)
| key | Arabic label | action / opens-modal | gate | file:line |
|---|---|---|---|---|
| `inv_action_record_payment` | «تسجيل دفعة» | `onRecordPayment` → **ActionModal** type=payment (1652; 2418) | `canPay = !cancelled && remaining>0.005 && canPayPerm`; `canPayPerm = canPerm(user,'invoices.record_payment')` (1932) | 8421, 8431–8436 |
| `inv_action_refund` | «استرجاع» | `onRefund` → **ActionModal** type=refund (1653) | `canRefund = !cancelled && paid>0.005 && canRefundPerm`; `canRefundPerm = canPerm(user,'invoices.refund') && !gmLock` (1932). Also blocked at 2791 if request done & non-GM | 8422, 8438–8443 |
| `inv_action_cancel` | «إلغاء» | `onCancelInv` → **ActionModal** type=cancel (1654) | `canCancel = !cancelled && canCancelPerm && !isZeroSvc`; `canCancelPerm = canPerm(user,'invoices.cancel') && !gmLock` (1932) | 8424, 8445–8450 |
| `inv_gm_lock_note` | «المعاملة منجزة — إلغاء أو استرجاع الفاتورة يتطلب صلاحية المدير العام.» | informational note (no action) | `showGmNote = gmLock && !cancelled` | 8425, 8454–8459 |
| `inv_print_ar` | «عربي» | `printInvoice(inv,data,'ar')` | `canPerm(user,'invoices.print')` (8463) | 8471–8472 |
| `inv_print_en` | «English» | `printInvoice(...,'en')` | same | 8471–8472 |
| `inv_print_hi` | «हिन्दी» | `printInvoice(...,'hi')` | same | 8471–8472 |
| `inv_print_ur` | «اردو» | `printInvoice(...,'ur')` | same | 8471–8472 |
| `inv_print_bn` | «বাংলা» | `printInvoice(...,'bn')` | same | 8471–8472 |

(`printInvoice` is read-only; no DB write.)

---

## E. Current permission wiring (every call — file:line + what)

| file:line | call | gates |
|---|---|---|
| 4 | import `canPerm, isGM, cardVisible, canCardBtn, tabOffices` | — |
| 741 | `tabOffices(user, 'invoices')` → `officeScope` | office scope for list, stats, branch filter list |
| 813 | uses `officeScope` to filter branches dropdown | branch filter options |
| 854 | uses `officeScope` to scope invoice count query | total count |
| 882 | `p_branch_ids: officeScope` in statFilters | all stat RPCs + list RPC |
| 1077 | `canPerm(user, 'invoices.create')` | "فاتورة جديدة" toolbar button |
| 1676 | `gmLock = reqDone && !isGM(user)` | cancel/refund restricted to GM when request done |
| 1706 | `canStageEdit = !cancelledRO && canPerm(user, 'invoices.edit')` | header stage-action buttons (visa/iqama/insurance/wp/transfer/renewal/salary) |
| 1769 | `!cancelledRO && !reqCancelled && canPerm(user,'invoices.edit')` | salary-return stage action availability |
| 1775 | `!cancelledRO && !reqCancelled && !acctRejected && canPerm(user,'invoices.edit')` | transfer/renewal stage actions availability |
| 1932 | `canPerm(user,'invoices.edit')` ×7 (worker/service/visa/borders/client/agent/note/pricing) | each card edit handler (undefined if no perm or cancelled) |
| 1932 | `canPerm(user,'invoices.record_payment')` | onEditPayment + `canPayPerm` |
| 1932 | `canPerm(user,'invoices.refund') && !gmLock` | `canRefundPerm` |
| 1932 | `canPerm(user,'invoices.cancel') && !gmLock` | `canCancelPerm` |
| 1932 | `gmLock` passed to layout | footer GM-lock note |
| 2791 | `(type==='cancel'||'refund') && req.status==='done' && !isGM(user)` | hard-blocks cancel/refund in ActionModal for non-GM on done requests |
| 7590 | `cardVisible(user,'invoices','client')` | client card |
| 7616 | `canCardBtn(user,'invoices','client','edit')` | client edit button |
| 7644 | `cardVisible(user,'invoices','worker_facility')` | worker/facility card |
| 7669 | `canCardBtn(user,'invoices','worker_facility','edit')` | worker edit button |
| 7710 | `cardVisible(user,'invoices','service')` | service card |
| 7713 | `canCardBtn(user,'invoices','service','edit')` | visa edit button |
| 7748 | `canCardBtn(user,'invoices','service','edit')` | non-visa service edit button |
| 7798 | `cardVisible(user,'invoices','pricing')` | pricing card |
| 7799 | `canCardBtn(user,'invoices','pricing','edit')` | pricing edit button |
| 7801 | `cardVisible(user,'invoices','installments_payments')` | installments/payments card |
| 7807 | `canCardBtn(user,'invoices','installments_payments','edit')` | payment edit button |
| 7810 | `cardVisible(user,'invoices','notes')` | notes card |
| 7821 | `canCardBtn(user,'invoices','notes','edit')` | note edit button |
| 7845 | `cardVisible(user,'invoices','agent')` | agent card |
| 7859 | `canCardBtn(user,'invoices','agent','edit')` | agent edit button |
| 7886 | `cardVisible(user,'invoices','service_transaction')` | service_transaction card |
| 7909 | `cardVisible(user,'invoices','service_transaction')` | controls whether stageStatus is shown in FinancialSummaryCard vs service_transaction card |
| 8463 | `canPerm(user,'invoices.print')` | entire print language block |

Helpers NOT used in this file (available but uncalled here): `canCardAction` (alias used as `canCardBtn`), `cardActionAllowed`, `hasPerm` (called indirectly via `can`), `canTab`, `canTabBranch`, `canViewPage`. `cardVisible`, `canCardBtn`, `canPerm`(=`can`), `isGM`, `tabOffices` are the active set.

---

## F. Drift vs catalog

**Catalog claims (per task):** client, worker_facility, service, pricing, installments_payments, agent, notes, service_transaction.

Verified present in code — all 8 confirmed with `cardVisible(user,'invoices',<key>)`.

**In code but MISSING from catalog (ungated cards/actions — recommend adding keys):**
1. `comments` card («التعليقات», 7904) + button `comments_add` («إضافة تعليق», 7517) — NO gate at all (always shown). Writes `service_request_notes`.
2. `financial_summary` card («المبلغ الإجمالي», 7907) — NO gate (always shown when total>0).
3. Footer financial actions are gated only by `canPerm` flags, NOT by any card/cardact key — consider granular keys: `inv_action_record_payment`, `inv_action_refund`, `inv_action_cancel`.
4. Header **stage-action buttons** (visa/iqama/insurance/work_permit/transfer/renewal/salary-return/accountant) gated only by blanket `canStageEdit` (`invoices.edit`), no per-stage/per-card key. These open IqamaIssueModal / VisaStageDataModal / ActionModal and write `iqama_issuance_applications`, `transfer_calculation`, `iqama_renewal_calculation`, `service_requests`. High-value granular gates.
5. Toolbar `inv_filter_*` and `inv_stat_*` and `inv_search` have no gates (likely fine, but list them if filters/stat cards should be role-hideable).
6. Latent filter state with no UI (amount_min/max, payment_plan, accountant_status, nationality, overdue) — present in `statFilters` but not rendered.
7. Print buttons share ONE gate (`invoices.print`); no per-language gate (probably intended).

**Catalog entries NOT found in code:** none — all 8 catalog card keys exist. (No `borders` or separate `visa` card key; border/visa edits live inside the `service` card via the same `service.edit` action.)

---

## G. DB tables & RPCs this page uses (for save/update)

**RPCs (read):**
- `search_invoice_ids` (1006) — paged list ids + total
- `invoice_period_stats` (957/958/988/989) — KPI cards
- Views: `v_invoice_stats`, `v_invoice_daily`, `v_invoice_aging` (851–853)

**Tables WRITTEN (update/insert/delete) from detail handlers & ActionModal (lines 1406–7372):**
- `invoices` — update: paid_amount, status_id, total_amount, pricing_breakdown, pricing_log, note_public, note_log, branch_id, last_activity_at, cancel_log, installments_count, service_quantity, payment_log (2910, 3106, 3152, 3191, 5694, 5699, 5781, 6608, 6677, 7141)
- `payments` — insert (2857, 3068, 3137); update amount/bank_reference/notes/payment_method_id (6593)
- `installments` — update paid_amount/paid_date/total_amount/deleted_at/visa_application_id (2896, 3079–3085, 3146, 6549, 6693, 6717, 7109); insert (7115)
- `service_requests` — update status_id/quantity/branch_id/accountant_*/cancelled_*/completed_*/completion_note (3091, 3210, 3289, 3317, 3336, 3376, 5700, 7117)
- `other_applications` — update worker_id/worker_facility_id/description/details (3385, 3427, 3472, 5233–5237, 5678)
- `clients` — update name_ar/id_number/phone/nationality_id/edit_log (5475)
- `agents` — update name_ar/id_number/phone/nationality_id/edit_log (5573)
- `workers` — update billing_mobiles (5486)
- `visa_applications` — update border_number/unified_number/visa_number/worker_name/file_number; insert; delete (2965, 3086, 5933, 6354, 7102, 7104, 7111)
- `iqama_issuance_applications` — insert/update iqama_number/iqama_expiry/main_facility_id/stage_data/medical_status (2944, 6099–6103, 6360–6367)
- `transfer_calculation` — update stage_data (3242, 3248, 3270, 3307)
- `iqama_renewal_calculation` — update stage_data (same handlers, calc table chosen by service)
- `attachments` — insert (entity_type in payment/visa_application/service_request) for receipts, passport, muqeem, visa files (2882, 2927, 3013, 3279, 3364, 3398, 3439, 3482, 5944, 6121, 6387, 7553)
- `service_request_notes` — insert note (comments) (7544)

**Tables READ for lookups:** `branches`, `lookup_items`(service_type/invoice_status), `agents`, `nationalities`, `occupations`, `bank_account_branches`.
