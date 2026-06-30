# Permission Inventory — TransferCalcPage (حسبة نقل الكفالة)

**File:** `C:/dev/jisr-app/src/App.jsx`
**Component:** `TransferCalcPage` — lines **1492–3077** (next fn `AppointmentsPage` starts 3080).
**Permission module:** `quotations` (tab `transfer_calc` → module `quotations`, per `permCatalog.js:189`).
**Canonical actions (permCatalog.js:80-85):** `view`, `create`, `price`, `approve`, `invoice`, `edit`, `delete`.
**Office scope:** `tabOffices(user,'transfer_calc')` — `App.jsx:1496`.

**Data sources:** table `transfer_calculation` (main), `transfer_calculation_audit` (field-level change log, joined on `quotation_id`), `quotation_notes` + `attachments` (comments), `users`/`persons`/`branches`/`nationalities` (lookups).
**Write path:** all edits/status changes go through Edge Function `update-quotation` (actions: `update_fields`, `adjust_fees`, `change_status`, `approve_with_data`), which writes `transfer_calculation` + appends `transfer_calculation_audit`. The page never writes the table directly.

> **Catalog gap confirmed:** `permCatalog.js` defines only the 7 module-level `quotations` actions above. There are **no** card/field/button/modal keys for this page anywhere in the catalog. `lib/permissions.js` documents an *intended* per-card mechanism `ui_visibility['card:<tab>:<key>']` (permissions.js:15-16) but **TransferCalcPage never reads it** — no `cardVisible`/`canCardBtn`/`canCardAction` calls exist in the component. Proposed keys below are new.

> **Dead code (do not wire):** `printCalc` (defined 2004) is never invoked — real print is `printTransferDoc` (2851). `viewRow` state (1499) is set by the row "eye" button (2503) but **has no render block inside this component** — the preview modal it implies does not exist here (the `viewRow` FKModal at 1353 belongs to a *different* component). The legacy create/edit wizard modal `pop` (2958-3076) is deprecated: its `save()` is a no-op toast (1565) and `openEdit` (1578) is never called.

---

## A. LIST VIEW — actions / filters / stat-cards / row-actions

### A.1 Toolbar / page actions
| key (proposed) | Arabic label | file:line | current gate |
|---|---|---|---|
| `list.btn.new_calc` | حسبة نقل كفالة | 2207-2213 | **`canPerm(user,'quotations.create')`** (2207) → opens overlay Kafala calculator via `onNewCalc()` |

### A.2 Search & filters
| key (proposed) | Arabic label | file:line | gate |
|---|---|---|---|
| `list.search` | ابحث باسم العامل أو رقم الإقامة أو رقم التسعيرة | 2449 | none (client-side `searchQ`; matches worker name/iqama/quote_no/id) |
| `list.filter.toggle` | تصفية | 2451-2454 | none (toggles `advOpen`) |
| `list.filter.clear` | مسح الفلاتر | 2453 | none |
| `list.filter.date_from` | تاريخ من | 2458 | none → `advFilter.from` vs `created_at` |
| `list.filter.date_to` | تاريخ إلى | 2459 | none → `advFilter.to` vs `created_at` |
| `list.filter.status` | الحالة | 2460 | none → `advFilter.service` (priced/approved/invoiced/completed) |
| `list.filter.employee` | اسم الموظف | 2461 | none → matches `priced_by`/`approved_by`/`created_by` |
| `list.filter.office_fee_min` | رسوم المكتب من | 2462 | none → `meta.office_fee` |
| `list.filter.office_fee_max` | رسوم المكتب إلى | 2463 | none → `meta.office_fee` |
| `list.office_filter` | (GM office dropdown; state `officeFilter`/`officeDropOpen`) | 1501-1502, 2227 | **GM-only** behaviour: non-GM locked to `user.branch_id` server-side via `tcOrScope`; GM filters via dropdown |

### A.3 Status tabs (clickable filters — set `listFilter`)
Status pipeline derived from `transfer_calculation.status`. Clicking a status chip toggles `listFilter`.
| key | label | file:line | source |
|---|---|---|---|
| `list.tab.priced` | مسعّرة | 2402,2413 | `status='priced'` |
| `list.tab.approved` | مصدّقة | 2386,2402,2413 | `status='approved'` |
| `list.tab.invoiced` | مفوترة | 2386,2402,2413 | `status='invoiced'` (+`completed`) |
| `list.tab.cancelled` | ملغاة | 2402,2413 | `status='cancelled'` |

### A.4 Stat cards (KPI strip) — all derived/computed, no gate
| key (proposed) | Arabic label | file:line | source |
|---|---|---|---|
| `list.stat.avg_office_fee` | المتوسط (متوسط رسوم المكتب/شهر) | 2369-2382 | computed `officeStats.perMonth` from `office_fee` ÷ expected months |
| `list.stat.approved_count` | مصدّقة | 2385-2397 | `sCounts.approved` (also acts as filter) |
| `list.stat.invoiced_count` | مفوترة | 2385-2397 | `sCounts.invoiced+completed` (also filter) |
| `list.stat.status_breakdown` | الحالات | 2400-2418 | `sCounts` distribution bar + legend (legend items act as filters) |

> Note: extra computed aggregates exist in scope (`totalRevenue`, `totalProfit`, `avgQuote`, `conversionRate`, `margin`, `periodSeries`, `spark`, trends 2274-2361) but are **not all rendered** as visible cards in the current JSX — only the four above render. Treat non-rendered ones as out-of-scope for visibility keys.

### A.5 Row card (each quote) — `onClick` row → opens detail (`setDetailsRow`)
| key (proposed) | Arabic label | file:line | gate | action |
|---|---|---|---|---|
| `list.row.open_detail` | (فتح التفاصيل بالنقر على الصف) | 2500 | none | `setDetailsRow` |
| `list.row.btn.preview` | معاينة الحسبة (زر العين) | 2503-2517 | none | `setViewRow` — **NB: no preview modal rendered → effectively dead** |
| `list.row.btn.copy_no` | نسخ رقم التسعيرة/الفاتورة | 2518-2519, 2549 | none | clipboard copy of quote_no/invoice_no |
| `list.row.validity_ring` | حلقة صلاحية 5 أيام (عرض فقط) | 2504-2516 | none | display-only countdown |
| `list.row.stamp` | ختم الحالة (مسعّرة/مصدّقة/مفوترة) | 2556-2584 | none | display-only `OfficialStampBadge` |

---

## B. DETAIL VIEW — cards / sections

Detail view JSX: **2595–2860**. Layout: main column (2683-2809) + sticky sidebar (2811-2858). Per-card unified Edit button `editBtn(card)` defined **2689** (dashed gold "تعديل") — **ungated**, rendered in card headers. Cards rendered via `gridCard(...)` helper (2698). Each editable card opens the per-card edit modal (`openCardEdit` 1556 → modal at 2862, save `saveCardEdit` 1557).

`CARD_FIELDS` map (1552) defines exactly which columns each card edits.

### B.0 Detail header (above cards)
| key | label | file:line | gate |
|---|---|---|---|
| `detail.btn.back` | رجوع | 2635 | none → `setDetailsRow(null)` |
| `detail.copy_quote_no` | نسخ رقم التسعيرة | 2646 | none |
| `detail.header.stamps` | أختام المراحل (مسعّرة/مصدّقة/مفوترة/ملغاة) | 2658 | none (display) |
| `detail.header.validity_ring` | حلقة صلاحية 5 أيام | 2659-2679 | none (hidden when invoiced/completed/cancelled) |

### B.1 Card `worker` — العامل
Header 2699 + 2711-2716. Edit card id `'worker'`. Editable cols (CARD_FIELDS.worker): `worker_name, iqama_number, phone, nationality_id, dob`.

| field key | Arabic label | table.column | editable | display line |
|---|---|---|---|---|
| `worker.name` | الإسم | `transfer_calculation.worker_name` | Y | 2712 |
| `worker.iqama_number` | رقم الإقامة | `transfer_calculation.iqama_number` | Y | 2713 |
| `worker.phone` | رقم الجوال | `transfer_calculation.phone` | Y | 2714 |
| `worker.nationality` | الجنسية (flag badge; edited via `nationality_id`) | `transfer_calculation.nationality_id` (+ legacy `nationality` text) | Y | flag 2709/2716; audit keys incl. `nationality_id,nationality` |
| `worker.dob` | تاريخ الميلاد | `transfer_calculation.dob` | Y | 2715 |

**Buttons:** `worker.btn.edit` — تعديل — 2699 (`editBtn('worker')`) — **gate: none**.
**Current gate (card):** none.

### B.2 Card `professional` — البيانات المهنية
Header/fields 2717-2725. Edit card id `'professional'`. Editable cols: `occupation_name_ar, sponsor_changes, change_profession, new_occupation_name_ar, hrsd_worker_status, resident_status_ar, iqama_expiry_gregorian, iqama_expiry_hijri`.

| field key | Arabic label | table.column | editable | line |
|---|---|---|---|---|
| `professional.occupation` | المهنة الحالية | `transfer_calculation.occupation_name_ar` | Y | 2718 |
| `professional.new_occupation` | المهنة الجديدة | `transfer_calculation.new_occupation_name_ar` | Y (shown if `change_profession`) | 2719 |
| `professional.change_profession` | تغيير المهنة (toggle in edit modal) | `transfer_calculation.change_profession` | Y | edit 2875 |
| `professional.sponsor_changes` | عدد مرات نقل الخدمات | `transfer_calculation.sponsor_changes` | Y | 2720 |
| `professional.hrsd_worker_status` | حالة العامل | `transfer_calculation.hrsd_worker_status` | Y | 2721 |
| `professional.resident_status` | حالة المقيم | `transfer_calculation.resident_status_ar` | Y | 2722 |
| `professional.iqama_expiry_g` | انتهاء الإقامة (ميلادي) | `transfer_calculation.iqama_expiry_gregorian` | Y | 2723 |
| `professional.iqama_expiry_h` | انتهاء الإقامة (هجري) | `transfer_calculation.iqama_expiry_hijri` | Y | 2724 |

**Buttons:** `professional.btn.edit` — تعديل — 2717/2725 (`editBtn('professional')`) — **gate: none**.

### B.3 Card `conditions` — النقل (Transfer conditions)
Header/fields 2726-2730. Edit card id `'conditions'`. Editable cols: `has_notice_period, employer_consent`.

| field key | Arabic label | table.column | editable | line |
|---|---|---|---|---|
| `conditions.renewal_period` | مدة التجديد | `transfer_calculation.renewal_months` (+`transfer_only`,`renew_iqama`) | N (display-only here) | 2727 |
| `conditions.has_notice_period` | فترة الإشعار | `transfer_calculation.has_notice_period` | Y | 2728 |
| `conditions.employer_consent` | موافقة صاحب العمل الحالي | `transfer_calculation.employer_consent` | Y | 2729 |

**Buttons:** `conditions.btn.edit` — تعديل — 2726/2730 (`editBtn('conditions')`) — **gate: none**.

### B.4 Card `pricing` — التسعيرة
Header 2748 + line-items 2738-2760. Edit card id `'pricing'` → uses `adjust_fees`. Editable cols (CARD_FIELDS.pricing): `transfer_fee, iqama_renewal_fee, work_permit_fee, prof_change_fee, medical_fee, office_fee, late_fine_amount, absher_discount, manual_discount`.

| field key | Arabic label | table.column | editable | line |
|---|---|---|---|---|
| `pricing.transfer_fee` | رسوم نقل الكفالة | `transfer_calculation.transfer_fee` | Y | 2739 |
| `pricing.iqama_renewal_fee` | تجديد الإقامة | `transfer_calculation.iqama_renewal_fee` | Y | 2740 |
| `pricing.work_permit_fee` | رخصة العمل | `transfer_calculation.work_permit_fee` | Y | 2741 |
| `pricing.prof_change_fee` | تغيير المهنة | `transfer_calculation.prof_change_fee` | Y | 2742 |
| `pricing.medical_fee` | التأمين الطبي | `transfer_calculation.medical_fee` | Y | 2743 |
| `pricing.late_fine_amount` | غرامة الإقامة | `transfer_calculation.late_fine_amount` | Y | 2744 |
| `pricing.office_fee` | رسوم المكتب | `transfer_calculation.office_fee` | Y | 2753 / edit 2887 |
| `pricing.absher_discount` | خصم أبشر | `transfer_calculation.absher_discount` | Y | 2755 / edit 2887 |
| `pricing.manual_discount` | خصم المكتب | `transfer_calculation.manual_discount` | Y | 2756 / edit 2887 |
| `pricing.extras` | بنود إضافية | `transfer_calculation.extras` (jsonb array) | N (display; edited only in calculator) | 2745 |
| `pricing.subtotal` | الإجمالي الابتدائي | `transfer_calculation.subtotal` | N (derived) | 2754 |
| `pricing.total_amount` | الإجمالي النهائي | `transfer_calculation.total_amount` | N (derived) | 2758 |

**Buttons:** `pricing.btn.edit` — تعديل — 2748 (`editBtn('pricing')`) — **gate: none**.

### B.5 Card `comments` — التعليقات
Header 2764, timeline 2766-2798 (notes + stage milestones merged). Source: `quotation_notes` + `attachments(entity_type='quotation_note')`.
| field/element key | Arabic label | source | line |
|---|---|---|---|
| `comments.timeline` | التعليقات + معالم المراحل | `quotation_notes`, stage timestamps | 2775-2796 |
| `comments.attachment_link` | مرفق | `attachments.file_url` | 2793 |

**Buttons:** `comments.btn.add` — إضافة تعليق — 2799 → opens `QuoteNoteModal` (`setQuoteNoteModal(true)`) — **gate: none**.

### B.6 Card `notes` — ملاحظات (conditional)
Rendered only if legacy free-text notes / `internal_notes` present. 2804-2807. Display-only.
| field key | Arabic label | source | line |
|---|---|---|---|
| `notes.internal` | ملاحظات داخلية | `_meta.internal_notes` | 2805 |
| `notes.free_text` | ملاحظات | `transfer_calculation.notes` (non-JSON legacy) | 2806 |

### B.7 Sidebar card `financial_summary` — الملخص المالي (sticky)
Header 2821, body 2816-2839. Display-only computed.
| field key | Arabic label | table.column / source | line |
|---|---|---|---|
| `summary.total` | الإجمالي (المبلغ النهائي) | `transfer_calculation.total_amount` | 2825 |
| `summary.office_fee_net` | الرسوم المكتبية | `transfer_calculation.office_fee_net` (frozen) | 2830 |
| `summary.government_fees` | الرسوم الحكومية | `transfer_calculation.government_fees` (frozen) | 2831 |
| `summary.absher_discount` | خصم أبشر | `transfer_calculation.absher_discount` | 2834 |
| `summary.manual_discount` | خصم المكتب | `transfer_calculation.manual_discount` | 2835 |
| `summary.expected_duration` | المدة المتوقعة | `expected_duration_months/days` | 2836 |
| `summary.expected_expiry` | الإنتهاء المتوقع | `transfer_calculation.expected_expiry_date` | 2837 |
| `summary.invoice_link` | الفاتورة (رابط) | `transfer_calculation.invoice_id` | 2838 (click → navigate-invoice) |

**Buttons (sidebar action grid 2842-2856):**
| button key | Arabic label | file:line | gate | action |
|---|---|---|---|---|
| `actions.btn.approve` | تصديق الحسبة | 2843 | **`isGM || user.perms.some(module==='quotations' && action==='approve')`** AND `status==='priced'` AND not expired | opens Approve modal (`setApproveForm`) |
| `actions.btn.cancel` | إلغاء الحسبة | 2843 | **same `canApprove`** AND `status in (priced,approved)` | opens Cancel modal (`setCancelForm`) |
| `actions.btn.print_ar` | عربي | 2850-2855 | none | `printTransferDoc(dr,'ar')` |
| `actions.btn.print_en` | English | 2850-2855 | none | `printTransferDoc(dr,'en')` |
| `actions.btn.print_hi` | हिन्दी | 2850-2855 | none | `printTransferDoc(dr,'hi')` |
| `actions.btn.print_ur` | اردو | 2850-2855 | none | `printTransferDoc(dr,'ur')` |
| `actions.btn.print_bn` | বাংলা | 2850-2855 | none | `printTransferDoc(dr,'bn')` |

> **Gaps vs catalog:** there is **no UI button** in this component for `quotations.price` or `quotations.invoice` (pricing happens in the calculator overlay; invoicing happens from the Invoices page via quote selection). `quotations.edit` is exercised by the per-card Edit buttons (currently ungated). `quotations.delete` has no UI here (rows are soft-deleted elsewhere; cancel ≠ delete).

---

## C. STAGES (مراحل)

This page has **no multi-step transaction stages** like the service tabs. The "stages" are the **status pipeline** of one `transfer_calculation` row, advanced only via Edge Function `change_status`/`approve_with_data`. Status machine (`stNext` 1561, labels `stLabel` 1559):

| stage key | Arabic label | column value | entered by | shown |
|---|---|---|---|---|
| `stage.draft` | مسودة | `status='draft'` | calculator | stamp/badge |
| `stage.priced` | مسعّرة | `status='priced'` (+`priced_at`,`priced_by`) | calculator issues quote | stamp 2560, milestone 2771 |
| `stage.approved` | مصدّقة | `status='approved'` (+`approved_at`,`approved_by`) | **Approve modal** (B.7) | stamp 2564, milestone 2772 |
| `stage.invoiced` | مفوترة | `status='invoiced'` (+`invoiced_at`,`invoiced_by`,`invoice_id`) | Invoices page | stamp 2565, milestone 2773 |
| `stage.completed` | مكتملة | `status='completed'` | downstream | — |
| `stage.cancelled` | ملغاة | `status='cancelled'` (+`cancelled_at`,`cancelled_by`,`cancel_reason`) | **Cancel modal** (D.3) | stamp 2658 |

The only stage transition **triggerable from this page** is priced→approved (Approve modal) and priced/approved→cancelled (Cancel modal). Each is gated by `canApprove` (see B.7).

---

## D. MODALS

### D.1 Modal `card_edit` — تعديل بيانات الكرت (per-card inline edit)
Defined 2862-2893. `FKModal variant="edit"`. Title varies by card (`titles` 2863). Trigger: any card `editBtn(card)` (2689). Submit: `saveCardEdit` (1557) → Edge Fn `update-quotation` (`update_fields` for worker/professional/conditions; `adjust_fees` for pricing). **Trigger gate: none.**
Title set: تعديل بيانات العامل / تعديل البيانات المهنية / تعديل شروط النقل / تعديل التسعيرة.

Fields by sub-form (label | column | editable | line):
- **worker** (2865-2871): الإسم|`worker_name`|Y|2866 · رقم الإقامة|`iqama_number`|Y|2867 · رقم الجوال|`phone`|Y|2868 · الجنسية|`nationality_id`|Y|2869 · تاريخ الميلاد|`dob`|Y|2870
- **professional** (2872-2881): المهنة|`occupation_name_ar`|Y|2873 · عدد مرات نقل الخدمات|`sponsor_changes`|Y|2874 · تغيير المهنة|`change_profession`|Y|2875 · المهنة الجديدة|`new_occupation_name_ar`|Y|2876 · حالة العامل|`hrsd_worker_status`|Y|2877 · حالة المقيم|`resident_status_ar`|Y|2878 · انتهاء الإقامة (ميلادي)|`iqama_expiry_gregorian`|Y|2879 · انتهاء الإقامة (هجري)|`iqama_expiry_hijri`|Y|2880
- **conditions** (2882-2885): فترة الإشعار|`has_notice_period`|Y|2883 · موافقة صاحب العمل الحالي|`employer_consent`|Y|2884
- **pricing** (2886-2889): رسوم نقل الكفالة|`transfer_fee` · تجديد الإقامة|`iqama_renewal_fee` · رخصة العمل|`work_permit_fee` · تغيير المهنة|`prof_change_fee` · التأمين الطبي|`medical_fee` · غرامة الإقامة|`late_fine_amount` · رسوم المكتب|`office_fee` · خصم أبشر|`absher_discount` · خصم المكتب|`manual_discount` — all Y, all line 2887; plus computed "الإجمالي بعد التعديل" (2888, display).

Buttons: حفظ (submit, 2891); close (X). 

### D.2 Modal `approve` — تصديق الحسبة
Defined 2895-2936. `FKModal variant="edit"`, 1-2 pages. Trigger: `actions.btn.approve` (2843). Submit: `submitApproval` (1532) → Edge Fn `update-quotation` action `approve_with_data`. Success → in-modal `SuccessView` (2912). **Trigger gate: `canApprove` (isGM || perms approve), status=priced, not expired.**

Fields (label | column | editable | line):
| field | column | editable | line |
|---|---|---|---|
| فترة الإشعار (req) | `has_notice_period` | Y | 2920 |
| موافقة صاحب العمل الحالي (req) | `employer_consent` | Y | 2921 |
| اسم العامل (req, only if missing) | `worker_name` | Y | 2926 |
| خصم المكتب (اختياري) | `manual_discount` | Y (only if `kafalaOfficeDiscountEnabled`) | 2931 |
| الإجمالي بعد الخصم | (computed) | N | 2932 |

> `submitApproval` whitelist (1532) also forwards if set: `worker_name, phone, dob, nationality_id, gender, work_permit_expiry, has_notice_period, employer_consent, manual_discount, approval_note`.

Buttons: تصديق الحسبة (submit 2914); التالي/السابق (page nav 2915); close.

### D.3 Modal `cancel` — إلغاء الحسبة
Defined 2938-2956. `FKModal variant="edit"`. Trigger: `actions.btn.cancel` (2843). Submit: `submitCancel` (1537) → Edge Fn `update-quotation` action `change_status` (status=`cancelled`, `cancel_reason`). Success → in-modal `SuccessView` (2942). **Trigger gate: same `canApprove`.**
| field | column | editable | line |
|---|---|---|---|
| سبب الإلغاء (اختياري) | `transfer_calculation.cancel_reason` | Y | 2950 |

Buttons: تأكيد الإلغاء (submit 2944); close.

### D.4 Modal `add_comment` — إضافة تعليق (`QuoteNoteModal`)
Component defined **1451-1490** (module-level), rendered 2802. Trigger: `comments.btn.add` (2799). Submit `submit` (1457) → insert `quotation_notes` (+ optional `attachments` upload, entity_type `quotation_note`). Success → in-modal `SuccessView` (1478). **Trigger gate: none.**
| field | column | editable | line |
|---|---|---|---|
| نص التعليق (req) | `quotation_notes.note` | Y | 1482 |
| المرفق (ملف واحد) | `attachments` (uploaded file) | Y | 1484 |

Buttons: إضافة (submit 1488); close.

### D.5 Modal `legacy_wizard` — حسبة نقل كفالة (DEPRECATED / dead)
Defined 2958-3076. `FKModal` 7 pages (worker info, documents, additional details, transfer details, costs, extras & dates, summary). Trigger `openAdd` (1570) / `openEdit` (1578) — **neither is called anywhere**. Submit `save` (1565) = **no-op toast** ("use the transfer-quote modal"). **Do not assign permission keys; recommend removal.** (Field list spans 2972-3068 against form-local state, not table columns.)

---

## E. CURRENT PERMISSION WIRING (every gate, file:line)

| file:line | primitive | gates |
|---|---|---|
| App.jsx:45 | `import { canViewPage, can as canPerm, tabOffices } from './lib/permissions.js'` | imports |
| App.jsx:1494 | `isGM = user?.role?.name_ar==='المدير العام' \|\| name_en==='General Manager'` | local GM flag (used for office filter default + approve/cancel) |
| App.jsx:1496 | `officeScope = useMemo(()=>tabOffices(user,'transfer_calc'),[user])` | list+stats office scope (null=GM/all) |
| App.jsx:1497 | `tcOrScope = officeScope ? branch_id.in.(...) , branch_id.is.null : null` | applied to the `transfer_calculation` query (1518,1519) |
| App.jsx:1501 | `officeFilter = isGM ? '' : (user?.branch_id\|\|'')` | non-GM locked to own branch |
| App.jsx:2207 | **`canPerm(user,'quotations.create')`** | New Transfer Calc button visibility |
| App.jsx:2227 | `if(isGM && officeFilter && rowBranch!==officeFilter) return false` | GM client-side office filter on list |
| App.jsx:2342 | `if(!isGM && user?.branch_id && rb!==user.branch_id)` / `if(isGM && officeFilter...)` | period-chart office scoping |
| App.jsx:2843 | **`const canApprove = isGM \|\| user.perms.some(p=>p.module==='quotations' && p.action==='approve')`** | Approve button (status=priced), Cancel button (status priced/approved) |

**Page-level gate (parent, outside component):** `App.jsx:1113` `if(!canViewPage(user,pg)) return null` and `1101` blocked overlay — these enforce `quotations.view` to reach the tab. (`canViewPage`/`tabModule` in permissions.js map `transfer_calc`→`quotations`.)

**Not used in this component (notable absences):** `cardVisible`, `canCardBtn`, `canCardAction`, `cardActionAllowed`, `hasPerm` (direct), `ui_visibility['card:transfer_calc:*']`, and any gate for `quotations.price` / `quotations.invoice` / `quotations.edit` / `quotations.delete`. All detail cards + their Edit buttons + print + comments are **ungated** today.

---

## F. DB TABLES & RPCs / EDGE FUNCTIONS

**Tables**
- `transfer_calculation` — primary row. Columns referenced: `id, quote_no, status, created_at, updated_at, deleted_at, priced_at, priced_by, approved_at, approved_by, invoiced_at, invoiced_by, invoice_id, created_by, cancelled_at, cancelled_by, cancel_reason, branch_id, worker_name, iqama_number, phone, dob, gender, nationality_id, nationality, occupation_name_ar, change_profession, new_occupation_name_ar, sponsor_changes, hrsd_worker_status, resident_status_ar, iqama_expiry_gregorian, iqama_expiry_hijri, work_permit_expiry, has_notice_period, employer_consent, transfer_only, renew_iqama, renewal_months, billed_renewal_months, expected_duration_months, expected_duration_days, expected_expiry_date, expected_iqama_days, transfer_fee, iqama_renewal_fee, work_permit_fee, prof_change_fee, medical_fee, office_fee, office_fee_net, late_fine_amount, absher_discount, manual_discount, subtotal, total_amount, government_fees, extras(jsonb), warnings(jsonb), insurance_status`. Query `select('*')` 1515,1518-1519; office filter via `.or(tcOrScope)`; `.is('deleted_at',null)`.
- `transfer_calculation_audit` — field-level change log. Cols: `quotation_id, field_name, old_value, new_value, source, changed_by, changed_at`. Read 1538 & 1557 (joined `changed_user:changed_by(name_ar,name_en)`), grouped by `field_name`. Drives per-field source badges + change-log.
- `quotation_notes` — comments. Cols: `id, transfer_calculation_id, note, created_by, created_at, deleted_at`. Insert 1462; read 1542.
- `attachments` — comment files. `entity_type='quotation_note'`, `entity_id=note.id`, `file_name, file_url, storage_path, mime_type, size_bytes, uploaded_by`. Insert 1470; read 1544.
- `users` (+ `persons`, `branches`) — actor lookup, mapped via `buildUserMap` (1517). `nationalities` — flag/name lookup (1519).

**Edge Function** `update-quotation` (POST `${sb.supabaseUrl}/functions/v1/update-quotation`, bearer session token). Actions:
| action | called from | writes |
|---|---|---|
| `update_fields` | `saveCardEdit` (1557) — worker/professional/conditions | `transfer_calculation` data cols + audit |
| `adjust_fees` | `saveCardEdit` (1557) — pricing card | `transfer_calculation` fee cols + audit |
| `change_status` | `changeStatus` (1563) + `submitCancel` (1537) | `status` (+cancel metadata) |
| `approve_with_data` | `submitApproval` (1532) | declarations + discount, status→approved, + audit |

**Client-side compute helpers (no DB):** `calcTransferFee` 1567, `calcIqamaFine` 1568, `calcIqamaRenewal` 1569 (used only by deprecated wizard); `getKafalaPricingConfig()` (1532,2898) reads service pricing config (localStorage/DB) to toggle office-discount field.

**Print:** `printTransferDoc(r,lang)` 1583-2003 (Royal Black & Gold 2-page A4, active). `printCalc` 2004+ — **defined, never called (dead)**.
