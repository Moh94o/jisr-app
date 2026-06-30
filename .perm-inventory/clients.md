# Permission Inventory — العملاء (Clients) Page

- **File:** `C:/dev/jisr-app/src/pages/admin/ClientsPage.jsx` (837 lines)
- **Permission module:** `admin_clients`  ·  actions in catalog: `view`, `create`, `edit`, `delete`
- **Page-view gate:** `admin_clients.view` (via `PAGE_VIEW_PERM` in `lib/permissions.js:77` → `canViewPage`)
- **Tab module mapping:** `TAB_MODULE.admin_clients = 'admin_clients'` (`permCatalog.js:192`)
- **DB tables touched:** `clients` (primary editable entity), `service_requests`, `invoices`, `payments`, `branches`, `nationalities`
- **Components:** `ClientsPage` (list), `ClientRow` (row), `ClientDetailPage` (detail), `InvoiceRow` (invoice log item), `ClientEditModal` (edit popup)

> NOTE: The app stores clients in their **own `clients` table** (NOT the canonical `persons` table). All editable client fields below are `clients.*` columns. The module declares `create` and `delete`, but **neither an Add-client button, a delete control, nor an export button exist anywhere in this file** — those actions are unwired in the UI (see Section E. Drift).

---

## A. List view — actions / filters / stat-cards / row actions

### A.1 Toolbar buttons
| key | Arabic label | element | file:line | gate today | notes |
|---|---|---|---|---|---|
| `list_add_client` | إضافة عميل | — | — | none (does not exist) | Module declares `admin_clients.create` but there is **no add button** in this file. Proposed for future wiring → gate `canTab(user,'admin_clients','create')`. |
| `list_export` | تصدير | — | — | none (does not exist) | `exportToExcel` util exists in `utils.js` but is **not imported/used** here. Proposed future button. |
| `list_filter_toggle` | تصفية | `<button onClick={setAdvOpen}>` | 399–413 | none | Toggles advanced-filter panel; turns gold when filters active; carries inline clear-filters “×” chip (403–409). |
| `list_clear_filters` | مسح الفلاتر | clear “×” chip inside filter button | 402–409 | none | Resets `filters` to empty + page 0. |

### A.2 Search & filters
| key | Arabic label | bound column | file:line | gate today | notes |
|---|---|---|---|---|---|
| `search_box` | ابحث بالاسم، رقم الهوية، الجوال… | `clients.name_ar/name_en/id_number/phone` (ilike OR) | 394–398; query 328–331 | none | Resets page on change. |
| `filter_branch` | المكتب | `clients.branch_id` | 419–423; query 326 | office-scoped | Options pre-filtered to `officeScope` (226). Uses `Drop`. |
| `filter_nationality` | الجنسية | `clients.nationality_id` | 424–428; query 327 | none | Options from `nationalities` table. |

### A.3 Stat / hero cards (top of list)
| key | Arabic label | source | file:line | gate today | notes |
|---|---|---|---|---|---|
| `list_stat_clients_total` | العملاء (+ جديد هذا الشهر) | `count(clients)` + `created_at >= month start` | `HeroStat` 387–388; calc 244–312 | none | Reflects active filters/search. Footer = new-this-month. |
| `list_stat_nationality_donut` | التوزّع حسب الجنسيات | `clients.nationality_id` grouped | `NatDonutCard` 389; calc 257–258, 342 | none | Top-6 nationalities donut. |
| `list_pagination` | ترقيم الصفحات (السابق/التالي) | — | 448–458 | none | Prev/Next buttons (`btnPg`), only when `total > PAGE(36)`. |

### A.4 Row actions (`ClientRow`, 468–522)
| key | Arabic label | element | file:line | gate today | notes |
|---|---|---|---|---|---|
| `row_open_detail` | فتح بطاقة العميل | whole card `onClick` | 442, 491, 500 | none | Opens `ClientDetailPage`. Only row interaction. |
| `row_invoiced_badge` | إجمالي الفوترة (شارة) | derived from invoices | 515–519 | none | Display-only: invoiced total + due/“مسدّد بالكامل”. |

---

## B. Detail view — cards (`ClientDetailPage`, 527–682)

Detail loads via `selectedClient` (357–363). Pass `canEdit = can(user,'admin_clients.edit')` (361). Detail header (name/icon) at 580–589 — display-only, not gated.

### B.1 Card `client_info` — «بيانات العميل»  (`InfoSectionCard`, 596–607; items 562–570)
Gate: `cardVisible(user,'admin_clients','client_info')` (596). Edit button gate: `canCardBtn(user,'admin_clients','client_info','edit')` (598).

**Fields**
| key | Arabic label | table.column | editable | file:line |
|---|---|---|---|---|
| `ci_name` | الاسم | `clients.name_ar` (falls back name_en) | y (modal) | 563 |
| `ci_name_en` | الاسم بالإنجليزية | `clients.name_en` | n (display only; shown only if both names exist) | 564 |
| `ci_id_number` | رقم الهوية | `clients.id_number` | y (modal) | 565 |
| `ci_phone` | الجوال | `clients.phone` | y (modal) | 566 |
| `ci_nationality` | الجنسية | `clients.nationality_id` → `nationalities.name_ar/en` | y (modal) | 567 |
| `ci_branch` | المكتب | `clients.branch_ids[]` (fallback `branch_id`) → `branches.branch_code` | y (modal) | 568 |
| `ci_joined` | تاريخ الإضافة | `clients.created_at` | n | 569 |

**Buttons**
| key | Arabic label | file:line | gate today |
|---|---|---|---|
| `ci_btn_edit` | تعديل | 598–606 | `canCardBtn(user,'admin_clients','client_info','edit')` → opens `ClientEditModal` |

### B.2 Card `invoices_log` — «سجل الفواتير»  (610–629; rows via `InvoiceRow` 687–746)
Gate: `cardVisible(user,'admin_clients','invoices_log')` (610). Data: `service_requests` → embedded `invoices` (533–540). Header shows count (615).

**Fields (per invoice row, display only)**
| key | Arabic label | table.column | editable | file:line |
|---|---|---|---|---|
| `il_invoice_no` | رقم الفاتورة | `invoices.invoice_no` (fallback id slice) | n (clickable link) | 693, 697–698 |
| `il_service_chip` | الخدمة (+ ×كمية للتأشيرات) | `service_requests.service_type_id`→`value_ar/en` + `service_requests.quantity` | n | 702–710 |
| `il_branch_chip` | المكتب | `service_requests.branch_id`→`branch_code` | n | 711 |
| `il_total` | الإجمالي | `invoices.total_amount` | n | 730–731 |
| `il_paid` | المدفوع | `invoices.paid_amount` | n | 738 |
| `il_remaining` | المتبقي | `invoices.remaining_amount` | n | 737–738 |
| `il_paid_full` | تم السداد بالكامل | derived (`remaining<=0`) | n | 712, 739 |

**Buttons**
| key | Arabic label | file:line | gate today |
|---|---|---|---|
| `il_btn_open_invoice` | فتح تفاصيل الفاتورة | 697–698; handler `openInvoice` 560 | none — fires `app-navigate-invoice` CustomEvent (cross-page nav; gated by Invoices page). |

### B.3 Card `financial_summary` — «الملخص المالي»  (635–654)
Gate: `cardVisible(user,'admin_clients','financial_summary')` (635). Computed from the client's invoices (545–548).

**Fields (display only)**
| key | Arabic label | source | editable | file:line |
|---|---|---|---|---|
| `fs_invoiced` | الفوترة | Σ `invoices.total_amount` | n | 639 |
| `fs_paid` | المسدّد | Σ `invoices.paid_amount` | n | 640 |
| `fs_remaining` | المتبقي | invoiced − paid | n | 641–642 |
| `fs_paid_pct` | نسبة السداد | paid/invoiced % bar | n | 644–651 |

**Buttons:** none.

### B.4 Card `stats` — «إحصاءات»  (655–673)
Gate: `cardVisible(user,'admin_clients','stats')` (655). Computed from `service_requests` (550–555).

**Fields (display only)**
| key | Arabic label | source | editable | file:line |
|---|---|---|---|---|
| `st_workers` | عدد العمال | Σ `service_requests.quantity` | n | 660 |
| `st_visas` | عدد التأشيرات | count requests where service_type code ⊃ `work_visa` | n | 661 |
| `st_kafala` | نقل الكفالة | count requests where code ⊃ `kafala`/`transfer` | n | 662 |
| `st_invoices` | عدد الفواتير | count of requests with an invoice | n | 663 |
| `st_last_invoice` | آخر فاتورة | max `invoices.created_at` (days-ago) | n | 664 |

**Buttons:** none.

### Current gate summary (detail cards)
- All four cards guarded only by `cardVisible(...)`. Only one action button exists across the whole detail view: `ci_btn_edit` (gated by `canCardBtn(... 'edit')`).

---

## C. Modals / popups

### C.1 Modal `client_edit` — «تعديل بيانات العميل»  (`ClientEditModal`, 751–833)
- **Trigger:** `ci_btn_edit` in `client_info` card (599 → `setEditing(true)`; rendered 676–679).
- **Type:** FormKit `FKModal` variant="edit", width 560.
- **Save target:** `clients.update(...).eq('id', client.id)` (804). Writes `edit_log` jsonb append (800–803) + `updated_by`/`updated_at` (796–797). Empty update array ⇒ “insufficient permission” message (806). Success → in-modal `SuccessView` (814) then auto-close (770–774). (Matches MEMORY: modal success, not toast.)

**Fields**
| key | Arabic label | table.column | editable | required | file:line |
|---|---|---|---|---|---|
| `cem_name` | الاسم | `clients.name_ar` | y | yes | 820 |
| `cem_id_number` | رقم الهوية | `clients.id_number` | y | yes (10 digits) | 821 |
| `cem_phone` | رقم الجوال | `clients.phone` (stored `966` + 9 digits) | y | yes (9 digits) | 822 |
| `cem_nationality` | الجنسية | `clients.nationality_id` | y | yes | 823–824 |
| `cem_branch` | المكتب | `clients.branch_ids[]` (+ `branch_id`=ids[0]) | y | yes (≥1) | 825–826 |

**Buttons**
| key | Arabic label | file:line | gate today |
|---|---|---|---|
| `cem_btn_submit` | تعديل | 815 (`onSubmit=save`) | disabled until `valid` (767); gated upstream by `ci_btn_edit`; DB RLS enforces final write. |
| `cem_btn_close` | إغلاق | 812 (`onClose`) | none (FormKit chrome). |

> No add-client modal, no delete-confirm modal, no merge/link-person modal exist in this file. (Catalog/prompt expectation of those is unmet — see Section E.)

---

## D. Current permission wiring (every call, file:line)

**In `ClientsPage.jsx`:**
| file:line | call | gates |
|---|---|---|
| 4 | `import { can as canPerm, cardVisible, canCardBtn, tabOffices }` | imports from `lib/permissions.js` |
| 203 | `tabOffices(user, 'admin_clients')` → `officeScope` | office scoping of all list queries + stat calc + branch filter options |
| 226 | `officeScope ? all.filter(b=>officeScope.includes(b.id)) : all` | branch-filter dropdown options |
| 232 | `inOffice(qb)` → `qb.or('branch_id.in.(…),branch_id.is.null')` | stat-card source rows (clients/SRs/invoices) |
| 325 | `qb.or('branch_id.in.(${officeScope}),branch_id.is.null')` | paginated list query |
| 361 | `canEdit={canPerm(user, 'admin_clients.edit')}` | passed to detail (currently **unused** inside detail — see drift) |
| 596 | `cardVisible(user,'admin_clients','client_info')` | show/hide client_info card |
| 598 | `canCardBtn(user,'admin_clients','client_info','edit')` | show/hide edit button (also requires `admin_clients.edit` perm via `canCardAction`) |
| 610 | `cardVisible(user,'admin_clients','invoices_log')` | show/hide invoices_log card |
| 635 | `cardVisible(user,'admin_clients','financial_summary')` | show/hide financial_summary card |
| 655 | `cardVisible(user,'admin_clients','stats')` | show/hide stats card |

**Helper semantics (`lib/permissions.js`):**
- `isGM` (23) — GM bypasses every check.
- `hasPerm` (36) / `can` (53) — module.action holding (GM⇒true).
- `cardVisible` (102) — `ui_visibility['card:admin_clients:<key>'] !== false`.
- `canCardAction`/`canCardBtn` (115/127/135) — `cardact:admin_clients:<key>:<action>` AND (for grantable actions like `edit`) `hasPerm(user,'admin_clients',action)`.
- `tabOffices` (151) — `office:admin_clients` policy → null (GM/all) or specific/inherited branch ids.

**Not used in this file:** `canCardBtn` for create/delete (no such buttons), `hasPerm`/`isGM`/`canTab`/`canTabBranch`/`cardActionAllowed` called directly. The passed `canEdit` prop (361) is **never read** inside `ClientDetailPage`.

---

## E. Drift vs catalog (`permCatalog.js`)

Current catalog (`permCatalog.js:310–313`):
```
admin_clients: [
  C('client_info','بيانات العميل','core', EDIT), C('invoices_log','سجل الفواتير'),
  C('financial_summary','الملخص المالي'), C('stats','إحصاءات'),
]
```
Module actions (`permCatalog.js:105–108`): `view, create, edit, delete`.

| area | catalog says | code reality | drift |
|---|---|---|---|
| Cards | client_info, invoices_log, financial_summary, stats | **identical 4 cards** | ✅ none — catalog is accurate |
| client_info actions | `EDIT` (edit only) | only `edit` button exists | ✅ matches |
| `create` action | declared | **no Add-client button / modal in UI** | ⚠️ action ungated/unreachable in this page |
| `delete` action | declared | **no delete control / confirm modal** | ⚠️ action ungated/unreachable in this page |
| invoices_log / financial_summary / stats | no actions listed | none in code | ✅ matches |
| Modals | (cards only — catalog doesn't model modals) | `client_edit` modal exists | catalog covers it via `client_info.edit`; no add/delete/merge modal exists |

**Conclusion:** catalog card list is **NOT stale** — it exactly mirrors the code. The only gap is that the module's `create`/`delete` actions have **no UI surface** in `ClientsPage.jsx` (clients are presumably created elsewhere / not deletable from here). The `canEdit` prop computed at line 361 is dead (unused).

---

## F. DB tables & RPCs

**Tables read:**
- `clients` — `id, name_ar, name_en, id_number, phone, created_at, nationality_id, branch_id, branch_ids, deleted_at, edit_log, updated_by, updated_at` (+ embedded `nationality:nationality_id`, `branch:branch_id`). Queries: 223-237, 234, 317-332, 800.
- `service_requests` — `id, client_id, request_ref_no, request_date, quantity, service_type_id, status_id, branch_id, deleted_at` (+ embedded `invoices`). Queries: 235, 236, 533-540.
- `invoices` — `id, invoice_no, total_amount, paid_amount, remaining_amount, created_at, service_request_id, deleted_at`. Queries: 236, 538.
- `payments` — `service_request_id, payment_date, deleted_at` (used only for list sort by last-payment; **not** office-scoped, line 237).
- `branches` — `id, branch_code` (filter + branch labels). Query: 223.
- `nationalities` — `id, name_ar, name_en, flag_url, is_active`. Query: 228.

**Writes:**
- `clients.update(patch)` (804) — the only mutation. Fields: name_ar, id_number, phone, nationality_id, branch_id, branch_ids, updated_by, updated_at, edit_log.
- `clients.select('edit_log')` (800) — read-before-append for edit log.

**RPCs:** none (no `.rpc(...)` calls in this file — unlike Invoices page, clients list/stats are computed client-side in `useMemo`).

**Cross-page event:** `window.dispatchEvent('app-navigate-invoice', {detail:{id}})` (560) — opens an invoice in the Invoices page.
