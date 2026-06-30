# Permission Inventory — `renewal_calc` (حسبة تجديد الإقامة / Iqama Renewal Quotations)

**File:** `C:/dev/jisr-app/src/pages/RenewalCalcPage.jsx` (1502 lines)
**Module:** `renewal_calc` — actions: `view, create, price, approve, invoice, edit, delete`
**Catalog source of truth:** `C:/dev/jisr-app/src/lib/permCatalog.js` (MODULE_ACTIONS @86–91; CARDS @303–307; tabModule map @189; module meta @211)
**Permission helpers:** `C:/dev/jisr-app/src/lib/permissions.js`

**Counts:** Detail cards = **6** (4 gated + 2 ungated) · Fields = **44** (across detail cards + modals) · Buttons = **18 distinct** · Modals = **4** · Stages = **3** (status lifecycle, not a wizard).

**Card keys (rendered):** `worker_data`, `renewal_options`, `pricing`, `financial_summary`, `comments` (ungated), `actions_print` (ungated).
**Catalog-only card key (NOT rendered as its own card):** `professional_data`, `timeline`.
**Modal keys:** `approve_quote`, `cancel_quote`, `edit_card`, `add_comment`.

---

## A. LIST VIEW — actions, filters, stat cards, row actions

### A.1 Toolbar / header buttons
| Proposed key | Arabic label | Element | Gate | file:line |
|---|---|---|---|---|
| `btn_new_renewal_quote` | حسبة تجديد إقامة | New-quote button (calls `onNewCalc`→opens `RenewalCalculator`) | `can(user,'renewal_calc.create')` | 770 |
| `btn_back` | رجوع | Back button (detail→list) | none | 909 |

> Note: there is **no list-level row "create from quote / invoice" button** here. The actual «إصدار فاتورة من التسعيرة» (`renewal_calc.invoice`) action lives in `ServiceRequestPage.jsx` (@1892–1896), not on this page. The `invoice` permission is therefore **declared but not enforced anywhere in this file.**

### A.2 Search & filters
| Proposed key | Arabic label | Type | Backing field(s) | file:line |
|---|---|---|---|---|
| `flt_search` | ابحث باسم العامل أو رقم الإقامة أو رقم التسعيرة | free-text | `worker_name, iqama_number, quote_no, phone` | 1394 (logic @1289–1291) |
| `flt_toggle_adv` | تصفية | open/close advanced panel | — | 1396 |
| `flt_clear` | مسح الفلاتر | reset advFilter | — | 1398 |
| `flt_date_from` | تاريخ من | date | `priced_at ?? created_at` | 1406 |
| `flt_date_to` | تاريخ إلى | date | `priced_at ?? created_at` | 1407 |
| `flt_status` | الحالة | select (الكل/مسعّرة/مصدّقة/مفوترة/مكتملة/ملغاة) | `status` | 1408–1415 |
| `flt_employee` | اسم الموظف | text | `priced_user / approved_user / created_user` names | 1416 |
| `flt_office_min` | رسوم المكتب من | number | `office_fee` | 1417 |
| `flt_office_max` | رسوم المكتب إلى | number | `office_fee` | 1418 |

### A.3 Status tabs (the stat cards double as toggle filters via `listFilter`)
| Proposed key | Arabic label | Toggles `listFilter`= | file:line |
|---|---|---|---|
| `tab_approved` | مصدّقة | `approved` | 1351–1353 |
| `tab_invoiced` | مفوترة | `invoiced` (also includes `completed`) | 1351–1353 |
| `tab_status_priced` | مسعّرة | `priced` (status-distribution card) | 1379 |
| `tab_status_approved` | مصدّقة | `approved` | 1379 |
| `tab_status_invoiced` | مفوترة | `invoiced` | 1379 |
| `tab_status_cancelled` | ملغاة | `cancelled` | 1379 |

### A.4 Stat cards (3 cards; all-time totals over the searched set)
| Proposed key | Arabic label | Shows | file:line |
|---|---|---|---|
| `stat_average` | المتوسط | avg `total_amount` + quote count (`عدد التسعيرات`) | 1334–1347 |
| `stat_approved_invoiced` | مصدّقة + مفوترة | stacked counts of `approved` & `invoiced+completed` | 1350–1364 |
| `stat_status_distribution` | الحالات | bar + per-status counts | 1367–1385 |

> Stat cards are NOT permission-gated; they are derived from the office-scoped `rows`. Office scoping is the only access control on the list (see §E).

### A.5 Row card & row actions (one card per quote, grouped by day)
| Proposed key | Arabic label | Element | Gate | file:line |
|---|---|---|---|---|
| `row_open_detail` | تفاصيل التسعيرة | whole-row click → opens detail | none | 1451 |
| `row_validity_ring` | صلاحية 5 أيام | 5-day validity ring/badge | none | 1455–1467 |
| `row_official_stamp` | الختم الرسمي | last-stage stamp badge | none | 1486–1490 |

Row display fields (read-only): worker_name (1472), nationality flag (1473), iqama_number (1476), phone (1477), branch code (1478), service tag (1479), invoice_no/quote_no (1480), iqama-expired warning (1482/1443), total_amount (1494).

---

## B. DETAIL VIEW — cards (each: Fields table + Buttons + current gate)

Detail render starts @784. Layout: main column (worker/renewal/pricing/comments) + sticky sidebar (financial_summary + actions/print). Cards use generic `gridCard()` (@831) and `EntityHero` (@859). Every editable field is written direct to `iqama_renewal_calculation` and logged to `iqama_renewal_calculation_audit`.

### B.1 Card `worker_data` — «العامل والمنشأة» (Worker & Facility)
**Gate:** `cardVisible(user,'renewal_calc','worker_data')` @963. **Edit gate:** `editBtn('worker')` @969 → opens edit_card modal (card=`worker`). Note: this single card visually merges worker + facility + (in print) professional data.

**Worker sub-hero fields** (@972–981):
| Arabic label | table.column | editable | file:line |
|---|---|---|---|
| الاسم (primary) | `iqama_renewal_calculation.worker_name` | y (modal) | 974 |
| رقم الإقامة | `iqama_renewal_calculation.iqama_number` | y (modal) | 976 |
| انتهاء الإقامة | `iqama_renewal_calculation.iqama_expiry_gregorian` | y (modal `professional`) | 977 |
| المهنة الحالية | `iqama_renewal_calculation.occupation_name_ar` (fallback `workers.current_occupation_id`/`occupation_ar` via `detailWorkerOcc`) | y (modal `professional`) | 978 |
| العمر | derived from `iqama_renewal_calculation.dob` | n (dob editable in modal) | 979 |
| رقم الجوال | `iqama_renewal_calculation.phone` | y (modal) | 980 |

**Facility sub-hero fields** (@982–991, shown only if `detailFacility`; derived from `workers.current_facility_id`→`facilities`):
| Arabic label | table.column | editable | file:line |
|---|---|---|---|
| الرقم الموحد | `facilities.unified_number` | n (read-only derived) | 987 |
| رقم وزارة العمل | `facilities.hrsd_number` | n | 988 |
| رقم التأمينات | `facilities.gosi_number` | n | 989 |

Change-log block for `CARD_FIELDS.worker` keys @992.

**Buttons:** `card_worker_edit` (تعديل) @969.

### B.2 Card `renewal_options` — «التجديد» (Renewal)
**Gate:** `cardVisible(user,'renewal_calc','renewal_options')` @997. **Edit:** `editBtn('renewal')` (passed as `editCard` arg to gridCard) @1003 → edit_card modal (card=`renewal`).

| Arabic label | table.column | editable | file:line |
|---|---|---|---|
| الإعفاء | `iqama_renewal_calculation.exemption` (bool) | y | 998 |
| مدة التجديد | `iqama_renewal_calculation.renewal_months` | y | 999 |
| تغيير المهنة | `iqama_renewal_calculation.change_profession` (bool) | y | 1000 |
| المهنة الجديدة | `iqama_renewal_calculation.new_occupation_name_ar` (only if change_profession) | y | 1001 |
| انتهاء رخصة العمل | `iqama_renewal_calculation.work_permit_expiry` | y | 1002 |

**Buttons:** `card_renewal_edit` (تعديل) @1003 (rendered by `editBtn` @801).

### B.3 Card `pricing` — «التسعيرة» (Pricing)
**Gate:** `cardVisible(user,'renewal_calc','pricing')` @1006. **Edit:** `editBtn('pricing')` @1011 → edit_card modal (card=`pricing`). Read-only display of line items; totals recomputed via `computeRenewalDerived`.

Display rows (all from `iqama_renewal_calculation`, read-only here; editable in modal):
| Arabic label | table.column | editable | file:line |
|---|---|---|---|
| تجديد الإقامة (+billed mo) | `iqama_renewal_fee` | y (modal) | 1025 |
| رخصة العمل (+mo) | `work_permit_fee` | y (modal) | 1026 |
| تغيير المهنة | `prof_change_fee` | y (modal) | 1027 |
| التأمين الطبي | `medical_fee` | y (modal) | 1028 |
| غرامة تأخّر الإقامة | `late_fine_amount` | y (modal) | 1029 |
| (بنود إضافية) | `extras[]` (jsonb) | n | 1030 |
| رسوم المكتب | `office_fee` | y (modal) | 1035 |
| الخصم (تغطية المكتب) | `office_cover` (frozen; fallback compute) | n | 1036 |
| خصم أبشر | `absher_discount` | y (modal) | 1039 |
| خصم المكتب | `manual_discount` | y (modal) | 1040 |
| الإجمالي النهائي | `total_amount` (derived: `subtotal`,`gov_excess` involved) | n | 1042 |

Change-log block for `CARD_FIELDS.pricing` keys @1043.
**Buttons:** `card_pricing_edit` (تعديل) @1011.

### B.4 Card `financial_summary` — «الملخص المالي» (Financial Summary, sidebar)
**Gate:** `cardVisible(user,'renewal_calc','financial_summary')` @1086. Read-only.

| Arabic label | table.column (frozen snapshot, fallback compute) | file:line |
|---|---|---|
| (hero total) | `total_amount` | 1127 |
| رسوم المكتب | `office_fee_net` (fallback office_fee−cover−manual) | 1133 |
| رسوم حكومية | `government_fees` (fallback sum of gov fees) | 1134 |
| الخصم | `office_cover` | 1146 |
| خصم أبشر | `absher_discount` | 1147 |
| خصم المكتب | `manual_discount` | 1148 |
| المدة المتوقعة | `expected_duration_months` (fallback renewal_months) | 1149 |
| الإنتهاء المتوقع | `expected_expiry_date` | 1150 |
| الفاتورة | `invoice_id` (link, only if invoiced) | 1151 |

**Buttons:** `fin_open_invoice` (الفاتورة link → `app-navigate-invoice`) @1151. Gate: none (only shows when `invoice_id` & invoiced).

### B.5 Card `comments` — «التعليقات» (Comments) ⚠ UNGATED
**Gate:** NONE (no `cardVisible`). @1050. Timeline merges `quotation_notes` with milestone markers (priced/approved/invoiced from `priced_at/approved_at/invoiced_at`).
Fields: note text (`quotation_notes.note`), attachments (`attachments` where entity_type='quotation_note'), author/date.
**Buttons:** `card_comments_add` (إضافة تعليق) @1078 → add_comment modal. Gate: none.

### B.6 Card `actions_print` — «الإجراءات + الطباعة» (Actions & Print, sidebar) ⚠ partially gated
Not wrapped in a `cardVisible`; the buttons inside have their own gates. @1158.

| Proposed key | Arabic label | Gate | file:line |
|---|---|---|---|
| `btn_approve` | تصديق الحسبة | `canApprove = canCardBtn(user,'renewal_calc','timeline','approve')` AND `status==='priced'` AND not expired | 1159/1162/1166 |
| `btn_cancel` | إلغاء الحسبة | `canApprove` AND `status∈{priced,approved}` | 1163/1171 |
| `btn_print_ar` | طباعة عربي | none | 1184–1188 |
| `btn_print_en` | طباعة English | none | 1184 |
| `btn_print_hi` | طباعة हिन्दी | none | 1184 |
| `btn_print_ur` | طباعة اردو | none | 1184 |
| `btn_print_bn` | طباعة বাংলা | none | 1184 |

> **Drift:** Cancel reuses the `timeline.approve` gate (`canApprove`); there is no distinct `cancel`/`delete` permission wired. The catalog has `delete` but it is **not enforced** in this file.

### B.7 Detail header (not a card)
`btn_copy_quote_no` (نسخ رقم التسعيرة) @920; done-stamps @931; validity ring @937–955. No gates.

---

## C. STAGES (مراحل) — status lifecycle (NOT a step wizard)

There is no multi-step wizard inside this page. The "stages" are the quote **status lifecycle** rendered as stamps/milestones and gated transitions. The actual add-wizard is the separate `RenewalCalculator.jsx`; the invoice transition is in `ServiceRequestPage.jsx`.

| Proposed stage key | Arabic label | status value | Set by (cols) | Transition trigger | Gate | file:line |
|---|---|---|---|---|---|---|
| `stage_draft` | مسودة | `draft` | created_by/created_at | RenewalCalculator insert | `renewal_calc.create` | (external) |
| `stage_priced` | مسعّرة | `priced` | `priced_by, priced_at` | RenewalCalculator save | `renewal_calc.price` (declared) | (external) |
| `stage_approved` | مصدّقة | `approved` | `approved_by, approved_at, approval_note, manual_discount, total_amount` | **approve_quote modal** `submitApproval` | `canCardBtn(...,'timeline','approve')` | 288–308 / 1159 |
| `stage_invoiced` | مفوترة | `invoiced` (+`completed`) | `invoiced_by, invoiced_at, invoice_id` | ServiceRequestPage invoice creation | `renewal_calc.invoice` (declared, enforced externally) | (external) |
| `stage_cancelled` | ملغاة | `cancelled` | `cancelled_by, cancelled_at, cancel_reason` | **cancel_quote modal** `submitCancel` | reuses `timeline.approve` gate | 311–325 / 1163 |

Stamp/milestone builders: `buildStamps` @250, `doneStamps` @894, comments milestones @1054.

---

## D. MODALS / POPUPS (4)

### D.1 Modal `approve_quote` — «تصديق الحسبة» (Approve Quote)
**Trigger:** `btn_approve` @1166 (sidebar). **Render:** @1197–1227. Icon `BadgeCheck`. Writes status→`approved` via `submitApproval` (@288). Success = in-modal `SuccessView` @1203.
| Arabic label | table.column | editable | file:line |
|---|---|---|---|
| إجمالي التسعيرة | `total_amount` (display) | n | 1210–1211 |
| خصم المكتب (اختياري) | `manual_discount` (entered as `discValue`→capped→applied) | y | 1216 |
| الإجمالي بعد الخصم | derived `total_amount` | n (computed) | 1219 |
| (note, implicit) | `approval_note` (set from `approveForm.approval_note`, no visible input in current modal body) | — | 297/1204 subtitle only |

Discount cap logic `computeApprovalDiscount` @147; gated by `discountEnabled` (admin pricing config) @145.
**Buttons:** `approve_submit` (تصديق الحسبة) @1205; `approve_close` (modal close) @1202.

### D.2 Modal `cancel_quote` — «إلغاء الحسبة» (Cancel Quote)
**Trigger:** `btn_cancel` @1171. **Render:** @1230–1248. Icon `AlertCircle`. Writes status→`cancelled` via `submitCancel` (@311). In-modal `SuccessView` @1234.
| Arabic label | table.column | editable | file:line |
|---|---|---|---|
| سبب الإلغاء (اختياري) | `cancel_reason` (from `cancelForm.reason`) | y | 1242 |

**Buttons:** `cancel_submit` (تأكيد الإلغاء) @1236; `cancel_close` @1233.

### D.3 Modal `edit_card` — «تعديل بيانات…» (Edit-Card) — 4 variants
**Trigger:** `editBtn(card)` per card (worker @969, renewal @1003, pricing @1011); plus a `professional` variant whose trigger is **dead** (no card renders `editBtn('professional')`). **Render:** @1251–1280. Writes via `saveCardEdit` (@345) to `iqama_renewal_calculation` + audit rows to `iqama_renewal_calculation_audit`. Field→column map = `CARD_FIELDS` @328–333; labels @336.

**Variant `worker`** (title تعديل بيانات العامل) @1255–1261:
| Arabic label | table.column | editable | file:line |
|---|---|---|---|
| الاسم | `worker_name` | y | 1256 |
| رقم الإقامة | `iqama_number` | y | 1257 |
| رقم الجوال | `phone` | y | 1258 |
| الجنسية | `nationality_id` (+denormalized `nationality` name @364) | y | 1259 |
| تاريخ الميلاد | `dob` | y | 1260 |

**Variant `professional`** (title تعديل البيانات المهنية) @1262–1266 — *modal exists; trigger currently unreachable:*
| Arabic label | table.column | editable | file:line |
|---|---|---|---|
| المهنة | `occupation_name_ar` | y | 1263 |
| انتهاء الإقامة (ميلادي) | `iqama_expiry_gregorian` | y | 1264 |
| انتهاء الإقامة (هجري) | `iqama_expiry_hijri` | y | 1265 |

**Variant `renewal`** (title تعديل خيارات التجديد) @1267–1273:
| Arabic label | table.column | editable | file:line |
|---|---|---|---|
| مدة التجديد (شهر) | `renewal_months` | y | 1268 |
| تغيير المهنة | `change_profession` | y | 1269 |
| المهنة الجديدة | `new_occupation_name_ar` | y | 1270 |
| الإعفاء | `exemption` | y | 1271 |
| انتهاء رخصة العمل | `work_permit_expiry` | y | 1272 |

**Variant `pricing`** (title تعديل التسعيرة) @1274–1277:
| Arabic label | table.column | editable | file:line |
|---|---|---|---|
| رسوم المكتب | `office_fee` | y | 1275 |
| تجديد الإقامة | `iqama_renewal_fee` | y | 1275 |
| غرامة تأخّر الإقامة | `late_fine_amount` | y | 1275 |
| رسوم رخصة العمل | `work_permit_fee` | y | 1275 |
| التأمين الطبي | `medical_fee` | y | 1275 |
| تغيير المهنة | `prof_change_fee` | y | 1275 |
| الزائد عن الحدود الحكومية | `gov_excess` | y | 1275 |
| خصم أبشر | `absher_discount` | y | 1275 |
| خصم المكتب | `manual_discount` | y | 1275 |
| الإجمالي بعد التعديل | derived `subtotal`/`total_amount` | n | 1276 |

**Buttons:** `editcard_save` (حفظ) @1279; `editcard_close` @1278.
> All four variants are gated only by their respective `editBtn` visibility. `editBtn` is rendered unconditionally inside each visible card — it does **NOT** call `canCardBtn`/`cardActionAllowed`. So edit is currently visible to anyone who can see the card (drift — see §F).

### D.4 Modal `add_comment` — «إضافة تعليق» (Add Comment)
**Component:** `RenewalNoteModal` @30–69. **Trigger:** `card_comments_add` @1078; rendered @1283. Writes to `quotation_notes` (via `iqama_renewal_calculation_id`) + optional file to `attachments` (entity_type `quotation_note`). In-modal `SuccessView` @57.
| Arabic label | table.column | editable | file:line |
|---|---|---|---|
| نص التعليق | `quotation_notes.note` | y | 61 |
| المرفق | `attachments.file_url/storage_path` (bucket `attachments`) | y | 63 |

**Buttons:** `comment_submit` (إضافة) @67; `comment_close` @56.

---

## E. CURRENT PERMISSION WIRING (every call, file:line, what it gates)

**In `RenewalCalcPage.jsx`:**
| file:line | Call | Gates |
|---|---|---|
| 118 | `tabOffices(user, 'renewal_calc')` → `officeScope` | List+stats office scope: non-GM sees only their offices' quotes (query @174). null = unrestricted (GM / mode 'all'). |
| 770 | `canPerm(user, 'renewal_calc.create')` | Shows `btn_new_renewal_quote`. |
| 963 | `cardVisible(user,'renewal_calc','worker_data')` | Worker & Facility card. |
| 997 | `cardVisible(user,'renewal_calc','renewal_options')` | Renewal card. |
| 1006 | `cardVisible(user,'renewal_calc','pricing')` | Pricing card. |
| 1086 | `cardVisible(user,'renewal_calc','financial_summary')` | Financial Summary card. |
| 1159 | `canCardBtn(user,'renewal_calc','timeline','approve')` → `canApprove` | Gates BOTH `btn_approve` (with status==='priced') AND `btn_cancel` (status∈priced/approved). |

**Helper semantics (`permissions.js`):**
- `isGM` @23 — GM (`المدير العام`) bypasses every check.
- `hasPerm(user,module,action)` @36 — flat check over `user.perms`.
- `can(user,'module.action')` @53 — splits on first dot; used as `canPerm` here.
- `cardVisible(user,tab,cardKey)` @102 — visible unless `ui_visibility['card:renewal_calc:<key>']===false`.
- `canCardAction`/`canCardBtn` @127/135 — if action is grantable in MODULE_ACTIONS, requires `hasPerm` + per-card not-excluded; else (in-card-only) pure per-card visibility. For `('timeline','approve')`: `approve` IS in `MODULE_ACTIONS.renewal_calc` ⇒ requires `hasPerm(user,'renewal_calc','approve')` AND `cardact:renewal_calc:timeline:approve !== false`.
- `tabOffices`/`tabOfficePolicy` @151/140 — office scope policy (inherit/all/specific).
- `tabModule('renewal_calc') === 'renewal_calc'` (permCatalog @189).

**NOT used in this file (available but absent):** `canCardAction` direct, `cardActionAllowed`, `hasPerm` direct, `isGM` direct, `canTab`, `canTabBranch`, `canViewPage`/`PAGE_VIEW_PERM` (note: `renewal_calc` is **absent** from `PAGE_VIEW_PERM` @66 ⇒ the page itself is **never view-gated**; anyone routed to it renders it — only the list rows are office-scoped).

---

## F. DRIFT vs CATALOG (permCatalog.js @303–307)

Catalog declares cards: `worker_data, professional_data, renewal_options, pricing, financial_summary, timeline` and one card-action `timeline.approve`.

1. **`professional_data` card is NOT rendered.** Professional fields (occupation, iqama expiry G/H) were merged into `worker_data` (display) and into the `professional` edit-modal variant. The `cardVisible('professional_data')` gate exists in catalog but is never called ⇒ hiding it does nothing. **Action:** either drop `professional_data` from catalog, or split it back out, or remap its fields' visibility under `worker_data`.
2. **`timeline` is not a real card** — it is a synthetic key used only at @1159 to gate the approve/cancel buttons. No card titled "سجل المراحل" renders (milestones live inside the ungated `comments` card and the header stamps). **Action:** rename catalog `timeline`→ an `actions` (الإجراءات) card, or fold the approve/cancel gate under `pricing`/`financial_summary`.
3. **Two rendered cards are missing from catalog:** `comments` (التعليقات, ungated @1050) and `actions_print` (الإجراءات والطباعة, @1158). **Action:** add `comments` and `actions`/`print` cards to catalog; add `cardVisible` wraps.
4. **Edit buttons are not gated by `edit` permission.** `editBtn` (@801, called @969/1003/1011) renders unconditionally inside each visible card — no `canCardBtn(...,'edit')`/`cardActionAllowed`. The `edit` action is declared in MODULE_ACTIONS but never enforced in the UI. **Action:** wrap each `editBtn` in `canCardBtn(user,'renewal_calc',<card>,'edit')`.
5. **`cancel`/`delete` not separately gated.** Cancel reuses the `approve` gate; `delete` (declared) is unused. **Action:** introduce a `cancel` action (or reuse `delete`) and gate `btn_cancel` independently; add a card-action `cancel` under the actions card.
6. **`price` action declared but unused in this file** (pricing happens in `RenewalCalculator.jsx`; here pricing fields are edited under the generic `edit` flow). 
7. **`invoice` action declared but enforced only in `ServiceRequestPage.jsx`** — not on this page.
8. **Page-level view is not gated** — `renewal_calc` absent from `PAGE_VIEW_PERM`. The `view` action is effectively only soft-enforced via list office-scoping. **Action:** add `renewal_calc: 'renewal_calc.view'` to `PAGE_VIEW_PERM`.
9. **`financial_summary` card-action gap:** the `fin_open_invoice` link and the print buttons have no granular keys/gates. **Action:** add buttons to catalog if per-role hiding of print/invoice-link is desired.

---

## G. DB TABLES & RPCs

**Primary table:** `iqama_renewal_calculation` — direct `SELECT/UPDATE` (no RPC). Read @173; updates @301 (approve), @318 (cancel), @375 (card edit). Also written by `RenewalCalculator.jsx` @446 (insert) and `ServiceRequestPage.jsx` @1896 (invoice transition).

Columns referenced (from CARD_FIELDS @328 + render + submit):
- Identity/worker: `worker_id, worker_name, iqama_number, phone, nationality_id, nationality, dob`
- Professional: `occupation_name_ar, iqama_expiry_gregorian, iqama_expiry_hijri, iqama_expired`
- Renewal: `renewal_months, change_profession, new_occupation_name_ar, exemption, work_permit_expiry`
- Pricing (editable): `office_fee, iqama_renewal_fee, late_fine_amount, work_permit_fee, medical_fee, prof_change_fee, gov_excess, absher_discount, manual_discount`
- Derived/frozen (read-only, via `computeRenewalDerived` / `lib/renewalDerived.js`): `subtotal, total_amount, office_cover, office_fee_net, government_fees, billed_renewal_months, expected_expiry_date, expected_duration_months`
- Extras: `extras` (jsonb array)
- Lifecycle: `status, quote_no, branch_id, invoice_id, created_by/created_at, priced_by/priced_at, approved_by/approved_at, approval_note, invoiced_by/invoiced_at, cancelled_by/cancelled_at, cancel_reason, updated_by/updated_at, deleted_at`

**Audit table:** `iqama_renewal_calculation_audit` — FK column is **`quotation_id`** (not `iqama_renewal_calculation_id`). Read @203; insert @377. Columns: `quotation_id, field_name, old_value, new_value, source ('employee'|...), changed_by, changed_at`. Source taxonomy `SRC_META` @27 (muqeem/chi/hrsd/employee/system).

**Notes table:** `quotation_notes` — FK column **`iqama_renewal_calculation_id`**. Insert @40; read @211. Columns: `id, note, created_at, created_by, deleted_at, iqama_renewal_calculation_id`.

**Attachments:** `attachments` table + `attachments` storage bucket; `entity_type='quotation_note'`, `entity_id=quotation_notes.id`. Insert @49; read @213. (Per memory: entity_type CHECK allowlist must include `quotation_note`.)

**Joined/derived (read-only, for display):**
- `users` (@177, `USER_SELECT` @24) — priced/approved/invoiced/created/cancelled user names + branch code.
- `branches` (@178) — branch code map.
- `nationalities` (@179) — flag + name.
- `workers` (@223) — `current_facility_id, current_occupation_id, occupation_ar` (worker's facility + official occupation fallback).
- `facilities` (@227) — `name_ar/en, unified_number, hrsd_number, gosi_number`.

**Config (non-DB):** `getIqamaRenewalPricingConfig()` (`lib/kafalaPricing.js`) @143 — `iqamaOfficeDiscountEnabled` gates approve-modal discount input.

**RPCs:** none used by this page (all direct table ops). No `search_*`/`*_stats` RPC here — list & stats computed client-side over the office-scoped `rows`.
