# Invoice Schema Alignment — ServiceRequest Page

**Date:** 2026-04-17
**Project:** Supabase `gcvshzutdslmdkwqwteh` (Jisr Business)
**Scope:** Verify `invoices`, `invoice_items`, `invoice_installments`, `invoice_payments`, `invoice_templates` schemas match what [src/ServiceRequestPage.jsx](src/ServiceRequestPage.jsx) actually needs.

## TL;DR

**The schema already covers every field the ServiceRequest page *currently writes* to the invoice family.** There are no blocking gaps.

What looks like "gaps" splits into three buckets:

1. **Page bugs, not schema bugs** — The page collects broker info, bank receipt files, and bank reference numbers, but `handleSubmit()` never writes them. The target columns already exist (`invoices.broker_id`, `invoice_payments.receipt_image_url`, `invoice_payments.reference_number`).
2. **Data the page computes but deliberately doesn't persist** — `installmentsList`, `visaInstallments`, `kafalaInstallments` are built in state as previews for the user, but the page never writes to `invoice_installments`. That's a behavior gap, not a schema gap. The `invoice_installments` table is only written from [src/InvoicePage.jsx](src/InvoicePage.jsx).
3. **Data that logically belongs to `transactions` / `transaction_field_values`, not invoices** — visa groups, dynamic Step 3 fields (iqama dates, nationality, profession choices, document scope/type, etc.), and custom-service descriptions go into `transactions` + `transaction_field_values`. Out of scope for this alignment.

The only genuinely useful *additive* schema changes are **3 small columns** that let the page cleanly persist visa-installment structure and item categories when we wire that up. See §2.4.

---

## 2.1 Current invoice-family schema

Fetched via `information_schema.columns`. Columns below are the current truth.

### `invoices` (32 columns)
`id` uuid PK · `invoice_number` varchar · `client_id` uuid FK · `broker_id` uuid FK · `branch_id` uuid FK · `transaction_id` uuid FK · `facility_id` uuid · `worker_id` uuid · `total_amount` numeric NOT NULL default 0 · `discount_amount` numeric · `discount_type` varchar default 'fixed' · `vat_rate` numeric default 15 · `vat_amount` numeric · `net_amount` numeric · `paid_amount` numeric · `remaining_amount` numeric · `status` varchar NOT NULL default 'unpaid' · `invoice_type` varchar default 'client' · `payment_method` varchar · `payment_terms_type` varchar(20) default 'full' · `payment_terms_days` int default 7 · `early_discount_pct` numeric · `late_penalty_pct` numeric · `service_category` varchar(50) · `issue_date` date · `due_date` date · `notes` text · `data_source` varchar default 'system' · `migration_batch_id` uuid · `original_reference` varchar · `deleted_reason` text · `created_at` / `updated_at` / `created_by` / `updated_by` / `deleted_at` / `deleted_by`.

### `invoice_items` (15 columns)
`id` uuid PK · `invoice_id` uuid FK NOT NULL · `item_type` varchar NOT NULL default 'service' · `description_ar` varchar NOT NULL · `description_en` varchar · `sub_service_id` uuid FK · `visa_id` uuid · `worker_id` uuid · `quantity` int NOT NULL default 1 · `unit_price` numeric NOT NULL default 0 · `discount` numeric default 0 · `vat_rate` numeric default 15 · `vat_amount` numeric · `line_total` numeric · `line_total_with_vat` numeric · `sort_order` int default 0 · `notes` text · `created_at`.

### `invoice_installments` (15 columns)
`id` uuid PK · `invoice_id` uuid FK NOT NULL · `installment_order` int NOT NULL · `milestone_id` uuid · `amount` numeric NOT NULL · `due_date` date NOT NULL · `status` varchar NOT NULL default 'pending' · `paid_date` date · `notes` text · `created_at` / `updated_at` / `created_by` / `updated_by` / `deleted_at` / `deleted_by`.

### `invoice_payments` (22 columns)
`id` uuid PK · `invoice_id` uuid FK NOT NULL · `installment_id` uuid FK · `amount` numeric NOT NULL · `payment_method` varchar NOT NULL default 'cash' · `payment_date` date NOT NULL · `payment_status` text default 'paid' · `reference_number` varchar · `bank_name` varchar · `receipt_number` varchar · `receipt_image_url` text · `transaction_id` uuid · `notes` text · `collected_by_user_id` uuid · `paid_by` uuid · `confirmed_by` uuid · `confirmed_at` timestamptz · `data_source` varchar default 'system' · `migration_batch_id` uuid · `created_at` / `updated_at` / `created_by` / `updated_by` / `deleted_at` / `deleted_by`.

### `invoice_templates` (17 columns)
`id` uuid PK · `template_id` uuid FK · `numbering_prefix` varchar default 'INV' · `numbering_format` varchar default `'{prefix}-{year}-{seq}'` · `auto_generate` bool default false · `trigger_event` varchar default 'on_creation' · `trigger_phase_order` int · `default_payment_terms_days` int default 7 · `default_vat_rate` numeric default 15 · `include_gov_fees` bool default true · `include_installments` bool default false · `default_installment_count` int default 1 · `line_items_config` jsonb default `'[]'` · `notes_template` text · `is_active` bool default true · `created_at`.

---

## 2.2 ServiceRequest data requirements (grouped by target table)

Pulled from the Phase 1 audit of `handleSubmit()` in [src/ServiceRequestPage.jsx:1020-1171](src/ServiceRequestPage.jsx:1020).

### Maps to `invoices` (one row per submission, when service is priced)
*(only created if `!FREE_SVCS.has(selSvc) && totalAmount > 0`)*

| UI/code field | How computed | Written to |
|---|---|---|
| `invNum` | `\`INV-${year}-${seq}\`` | `invoice_number` |
| `finalClientId` | `selClient.id` or inserted new client | `client_id` |
| `branchId` (prop) | from parent context | `branch_id` |
| `tx.id` | inserted transaction | `transaction_id` |
| `pricing.subtotal` / `totalOverride` | from step 4 compute | `total_amount` |
| 0 | hardcoded | `discount_amount` |
| `totalAmount` | `pricing.total` or `totalOverride` | `net_amount` |
| `Math.min(paidAmount, total)` | step 5 | `paid_amount` |
| `total - paidNow` | step 5 | `remaining_amount` |
| `'unpaid' / 'partially_paid' / 'paid'` | derived | `status` |
| `'client'` | hardcoded | `invoice_type` |
| `paymentMethod` | step 5 (`'cash'` / `'bank'`) | `payment_method` |
| `today` | `Date().toISOString().slice(0,10)` | `issue_date` |
| `today + 7d` | computed | `due_date` |
| `selectedService.category` | from sub_services | `service_category` |
| `'full'` | hardcoded | `payment_terms_type` |
| `7` | hardcoded | `payment_terms_days` |
| `user.id` | prop | `created_by` |

### Maps to `invoice_items` (one row per submission, OR one row per pricing line for complex services)

| UI/code field | How computed | Written to |
|---|---|---|
| `inv.id` | prior insert | `invoice_id` |
| `'service'` | hardcoded | `item_type` |
| `serviceUuid` | resolved sub_service.id | `sub_service_id` |
| `selectedService.name_ar` OR `pricing.rules.rules[i].label` | step 3 | `description_ar` |
| `1` | hardcoded | `quantity` |
| `pricing.price` OR `pricing.rules.rules[i].amount` | step 4 compute | `unit_price` |
| `0` | hardcoded | `discount` |

### Maps to `invoice_payments` (zero or one row at creation)
*(only inserted if `paidNow > 0`)*

| UI/code field | Written to |
|---|---|
| `inv.id` | `invoice_id` |
| `paidNow` | `amount` |
| `paymentMethod` | `payment_method` |
| `today` | `payment_date` |
| `'دفعة عند رفع الطلب'` | `notes` |
| `user.id` | `created_by` |

### Maps to `invoice_installments`
**Zero rows written by this page.** The page computes previews (`installmentsList`, `visaInstallments`, `kafalaInstallments`) for the UI, but never inserts. Installments are only materialized by [src/InvoicePage.jsx:151](src/InvoicePage.jsx:151) when a user manually creates/edits an invoice with `pay_system==='installment'`.

### Maps to `invoice_templates`
**Zero reads, zero writes.** The ServiceRequest page does not touch `invoice_templates` at all.

### Goes to `transactions` / `transaction_field_values` / `transaction_steps` (not invoices)
For the record — these are flagged as *out of scope* for this alignment task. Listed so I don't accidentally propose invoice columns for them:

- `transaction_number`, `service_variant_id` (string key like `'kafala_transfer'`), `service_id` (UUID), `visa_count`, `priority`, `start_date`, `due_date`, `status`, `client_note`, `internal_note`, `notes`
- Every dynamic Step 3 field (iqama dates, nationality, embassy, profession, gender, exit type, document scope/type/lang, custom service description, renewal months, region/city for ajeer, passport numbers/dates, etc.) → `transaction_field_values` (key/value).
- `visaGroups[]` and `visaFiles[]` → collected in state but **not persisted anywhere today**. This is transaction-level data (group of visa applicants), not invoice data. Schema gap exists here but it's not an invoice-family concern.

---

## 2.3 Gap table

Columns: `UI field (code) | Code type | Target table | Target column | Status`

### Fields currently written — all ✅ Match

| UI field | Code type | Target table | Target column | Status |
|---|---|---|---|---|
| `invNum` | string | `invoices` | `invoice_number` | ✅ Match |
| `selClient.id` / new client id | uuid | `invoices` | `client_id` | ✅ Match |
| `branchId` | uuid | `invoices` | `branch_id` | ✅ Match |
| `tx.id` | uuid | `invoices` | `transaction_id` | ✅ Match |
| `subtotal` | number | `invoices` | `total_amount` | ✅ Match |
| `totalAmount` | number | `invoices` | `net_amount` | ✅ Match |
| `paidNow` | number | `invoices` | `paid_amount` | ✅ Match |
| `remNow` | number | `invoices` | `remaining_amount` | ✅ Match |
| `payStatus` | string | `invoices` | `status` | ✅ Match |
| `'client'` | string | `invoices` | `invoice_type` | ✅ Match |
| `paymentMethod` | `'cash'\|'bank'` | `invoices` | `payment_method` | ✅ Match |
| `today` | date | `invoices` | `issue_date` | ✅ Match |
| `today + 7d` | date | `invoices` | `due_date` | ✅ Match |
| `selectedService.category` | string | `invoices` | `service_category` | ✅ Match |
| `'full'` | string | `invoices` | `payment_terms_type` | ✅ Match |
| `7` | int | `invoices` | `payment_terms_days` | ✅ Match |
| `user.id` | uuid | `invoices` | `created_by` | ✅ Match |
| `inv.id` | uuid | `invoice_items` | `invoice_id` | ✅ Match |
| `'service'` | string | `invoice_items` | `item_type` | ✅ Match |
| `serviceUuid` | uuid | `invoice_items` | `sub_service_id` | ✅ Match |
| `line.label` / service name | string | `invoice_items` | `description_ar` | ✅ Match |
| `1` | int | `invoice_items` | `quantity` | ✅ Match |
| `line.amount` / `pricing.price` | number | `invoice_items` | `unit_price` | ✅ Match |
| `0` | number | `invoice_items` | `discount` | ✅ Match |
| `inv.id` | uuid | `invoice_payments` | `invoice_id` | ✅ Match |
| `paidNow` | number | `invoice_payments` | `amount` | ✅ Match |
| `paymentMethod` | string | `invoice_payments` | `payment_method` | ✅ Match |
| `today` | date | `invoice_payments` | `payment_date` | ✅ Match |
| `'دفعة عند رفع الطلب'` | string | `invoice_payments` | `notes` | ✅ Match |
| `user.id` | uuid | `invoice_payments` | `created_by` | ✅ Match |

**Score:** 30/30 ✅. Every field the page actually writes has a matching column with the right type.

### Fields collected by the page but never written — page bugs, not schema gaps

| UI field | Code type | Where it *should* go | Status |
|---|---|---|---|
| `selBroker.id` / `newBroker` | uuid / object | `invoices.broker_id`, also `transactions.broker_id` | 💡 **Target columns exist.** Page collects broker in Step 2 (`hasBroker`, `brokerMode`, `selBroker`, `newBroker`) but `handleSubmit()` never writes `broker_id` to either table. **Fix is in the page, not the DB.** |
| `transferReceipt` (File) | File | `invoice_payments.receipt_image_url` (after upload to Supabase Storage) | 💡 **Target column exists.** Page collects drag-n-drop receipt but there is no upload call. **Page + storage-bucket work, not schema.** |
| `transferReference` | string | `invoice_payments.reference_number` | 💡 **Target column exists.** Page collects it but the `invoice_payments.insert(...)` object omits it. **Fix is in the page.** |

### Fields the page uses as UI-only state — no persistence expected

| UI field | Purpose | Verdict |
|---|---|---|
| `paymentType` (`'full'\|'installments'`) | toggles which step-5 inputs are shown | Rolled into `invoices.payment_terms_type`. No new column needed. |
| `installmentsCount`, `firstInstallmentDate`, `installmentsList` | scheduled installment preview | Would go to `invoice_installments` rows *if* the page wrote them. Not a column gap — a page-behavior gap. |
| `visaInstallments.{issuance, authorization, residencePerVisa}` | visa 3-way payment split | Same — would be persisted as 3 `invoice_installments` rows. See §2.4 for a small helper column. |
| `totalOverride` | visa total override | Already rolled into `invoices.total_amount` / `net_amount`. ✅ |
| `kafalaPayMode`, `kafalaInstallments[]` | kafala payment plan preview | Same — belongs in `invoice_installments` rows. |
| `paidAmount` (step-5 input) | split into invoice.paid_amount + invoice_payments row | ✅ both destinations exist |
| `receiptDrag`, `showSummaryScreen`, `addAdminNote`, `addClientNote`, `copiedQiwa`, `copiedUnified` | transient UI state | Never persist. Correct. |

### Data that belongs outside the invoice family — flagged, NOT proposed for invoice tables

| UI field | Belongs in | Not proposing invoice column because |
|---|---|---|
| `visaGroups[]` (nationality, embassy, profession, gender, count) | new table e.g. `transaction_visa_groups` or `transactions.visa_groups` jsonb | These describe *who the visas are for* — a transaction artifact, not invoice line items. |
| `visaFiles[]` (file distribution) | new table e.g. `visa_file_assignments` | Workflow tracking, not billing. |
| `fields.*` (all Step 3 dynamic inputs) | `transaction_field_values` (already the target) | Correct location. No invoice concern. |
| `customName`, `fields.custom_desc` | `transactions.notes` (customName already goes here) + `transaction_field_values.field_value` (custom_desc) | Not invoice-layer. |
| `selectedService.pricing_rules` usage | `sub_services.pricing_rules` (read-only for compute) | Not invoice-layer. |
| `clientNote`, `internalNote` | `transactions.client_note` / `.internal_note` (already written) | ✅ correctly routed |

### Schema columns currently unused by the ServiceRequest page (💡 informational only)

Included for completeness — **none of these are drops**, just noting that the schema is richer than this one page needs.

| Table | Unused columns | Comment |
|---|---|---|
| `invoices` | `broker_id`, `facility_id`, `worker_id`, `vat_amount`, `vat_rate`, `discount_type`, `early_discount_pct`, `late_penalty_pct`, `notes`, `original_reference`, `data_source`, `migration_batch_id`, `deleted_reason` | broker/facility/worker should be set (page bug). VAT hardcoded to 0 (business decision). Discount is always 0 here but reachable via invoice edit flow. |
| `invoice_items` | `description_en`, `visa_id`, `worker_id`, `vat_rate`, `vat_amount`, `line_total`, `line_total_with_vat`, `sort_order`, `notes` | Most are derived on read or left for other flows. |
| `invoice_installments` | *entire table* | Never written by this page (see above). |
| `invoice_payments` | `installment_id`, `reference_number`, `bank_name`, `receipt_image_url`, `receipt_number`, `transaction_id`, `payment_status`, `confirmed_by`, `confirmed_at`, `paid_by`, `collected_by_user_id` | Most would populate once page fully wires bank-transfer and installment flows. |
| `invoice_templates` | *entire table* | Not used by this page. |

---

## 2.4 Proposed additive changes

Given the code/schema match is already ≈ complete, I'm proposing **only 3 small columns**, each tied to a specific observed need from the page's state:

### A. `invoice_installments.label_ar` — human label for an installment line

**Why:** `kafalaInstallments[]` and `visaInstallments` give meaningful names to each scheduled payment (`'دفعة الإصدار'`, `'رسوم الإقامة'`, `'القسط الأول'`). Today the only place to stash that is `notes` — overloaded with user comments. A dedicated `label_ar` keeps display labels separate from notes.

**Column:** `invoice_installments.label_ar VARCHAR(160) NULL`
**Index:** none (low cardinality, read-as-part-of-row)
**Justification to UI field:** `visaInstallments.{issuance, authorization, residencePerVisa}` naturally render as labels. If the page later writes these to `invoice_installments`, it can do so without cramming into `notes`.

### B. `invoice_installments.phase` — enum-ish phase key for visa splits

**Why:** Visa services split totals 3 ways (`issuance`, `authorization`, `residence`) or 2 ways (temporary visas: no authorization). A machine-readable phase lets reports group by it without string-matching the Arabic label.

**Column:** `invoice_installments.phase VARCHAR(32) NULL`
**Check constraint:** `phase IS NULL OR phase IN ('issuance','authorization','residence','standard','final','custom')`
**Justification to UI field:** the three buckets in `visaInstallments` map 1:1 to phases. Non-visa services write `'standard'` or leave NULL.

### C. `invoice_items.category` — classify line items

**Why:** kafala/iqama invoices mix **fees** (`رسوم النقل`, `رسوم كرت العمل`), **services** (`التأمين الطبي`, `رسوم المكتب`), **add-ons** (kafala `extras[]`), and **deductions** (`absherBalance`, `discount`). Today they're all `item_type = 'service'`. A `category` column lets the UI group them in breakdowns and lets accounting separate recoverable government fees from service revenue.

**Column:** `invoice_items.category VARCHAR(32) NULL DEFAULT 'service'`
**Check constraint:** `category IN ('service','gov_fee','medical','office','extra','deduction','other')`
**Justification to UI field:** `pricing.rules.rules[i].label` currently carries this semantically in Arabic; we want it explicit. Maps cleanly:
- `رسوم النقل`, `رسوم كرت العمل`, `تغيير المهنة` → `gov_fee`
- `التأمين الطبي` → `medical`
- `رسوم المكتب` → `office`
- items from `extras[]` → `extra`
- `absherBalance`, `discount` (if ever written as negative items) → `deduction`
- everything else → `service` (default)

### What I'm NOT proposing (and why)

- **No new column for broker** — `invoices.broker_id` and `transactions.broker_id` already exist. The page just needs to set them. Page fix, not schema fix.
- **No new column for bank receipt file** — `invoice_payments.receipt_image_url` already exists. Need storage-upload flow in the page.
- **No new column for bank reference number** — `invoice_payments.reference_number` already exists. Need page to pass `transferReference` into the insert.
- **No changes to `invoice_templates`** — the page doesn't use it.
- **No column renames / drops** — per task rules (additive only).
- **Nothing for visa groups or visa file distribution** — that data belongs in transactions-side tables. Flagged separately in §2.5.

---

## 2.5 Non-schema findings (page-level issues to fix separately)

Not fixes for this task — listed so they're tracked.

1. **Broker never persisted.** `handleSubmit()` at [src/ServiceRequestPage.jsx:1068](src/ServiceRequestPage.jsx:1068) omits `broker_id` from the `transactions.insert(...)` object and from the `invoices.insert(...)` object, even though Step 2 collects it and can create a new broker row. The broker record is effectively orphaned.

2. **Bank receipt file never uploaded.** `transferReceipt` (File) is captured via drag-n-drop but there is no `sb.storage.from(...).upload(...)` call. The file is discarded when the page closes.

3. **Bank reference number never written.** `transferReference` is captured but the `invoice_payments.insert(...)` call at [src/ServiceRequestPage.jsx:1141](src/ServiceRequestPage.jsx:1141) does not include it.

4. **Installment preview never persisted.** The page shows `installmentsList`, `kafalaInstallments`, and `visaInstallments` on Step 4 summary but writes nothing to `invoice_installments`. Either that's intentional (users finalize installments later via InvoicePage) or it's a gap the team decided to defer. Either way — document the intent.

5. **`service_id` resolution is best-effort, falls back to NULL silently.** At [src/ServiceRequestPage.jsx:1058](src/ServiceRequestPage.jsx:1058), if `SVC_CODE_MAP[selSvc]` doesn't match any `sub_services.code`, `service_id` is set to NULL with no warning. Harder to debug later.

6. **No server-side validation.** All validation is client-side (`canNext()` around [src/ServiceRequestPage.jsx:828](src/ServiceRequestPage.jsx:828)). A malicious caller could `INSERT` directly since RLS policies are currently `qual=true` for `authenticated` (this is the project-wide pattern — flagged but not new to this audit).

7. **Transaction number generation has a race.** `count` is read, then incremented client-side to form `TXN-YYYY-NNNNN`. Two concurrent requests will collide. Should be moved to a DB sequence or RPC.

8. **`VAT` hardcoded to 0** in the page's pricing calc (line 735), but `invoices.vat_rate` defaults to 15 and `invoice_items.vat_rate` defaults to 15. If the defaults ever kick in (via another path), invoices will silently differ. Worth aligning defaults to 0 or computing VAT for real.

9. **`transaction_field_values` stores all values as strings.** Dates and numbers are coerced via `String(val)`. Downstream readers must parse. Acceptable if it's the agreed contract.

10. **Visa groups and file distribution are ephemeral.** `visaGroups[]` and `visaFiles[]` are built, validated, displayed — and never persisted. On reload, the information is gone. This likely needs its own schema work (e.g. `transaction_visa_groups` + `transaction_visa_files`), out of scope here.

---

## 🛑 Phase 2 complete — awaiting approval before Phase 3

**Summary for sign-off:**
- 30/30 fields the page currently writes → already have matching columns ✅
- 3 proposed additive columns (§2.4): `invoice_installments.label_ar`, `invoice_installments.phase`, `invoice_items.category` — each justified by a specific UI concept
- 10 non-schema findings to track separately
- No drops, no renames, no type changes

Reply **"approved, proceed"** to kick off Phase 3 (migration + apply + verify + regenerate types + commit + push). Or tell me to add/remove columns first.
