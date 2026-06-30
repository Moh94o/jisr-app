# Permission Inventory — حاسبة تجديد الإقامة (Iqama Renewal Calculator Wizard)

**Component:** `RenewalCalculator`
**File:** `C:/dev/jisr-app/src/pages/RenewalCalculator.jsx` (1089 lines, ≈97KB)
**Rendered from:** `C:/dev/jisr-app/src/App.jsx:1164` (`{showRenewalCalc && <RenewalCalculator … />}`); launched from `RenewalCalcPage` via `onNewCalc={()=>setShowRenewalCalc(true)}` (App.jsx:1122).
**Modal shell:** FormKit `Modal` (controlled wizard mode) — `C:/dev/jisr-app/src/components/ui/FormKit.jsx:1027`.
**Permission module (target):** `renewal_calc` — actions: `view / create / price / approve / invoice / edit / delete`.
**Compute helper:** `C:/dev/jisr-app/src/lib/renewalDerived.js` (`computeRenewalDerived` — frozen-snapshot derived columns).

> **IMPORTANT FINDING:** This component currently has **ZERO permission gating** — no `can()`, `hasPerm()`, `isGM()`, `canTab()`, `tabOffices()`, `cardVisible()`, or any `user.perms` reads anywhere in the file. The only `user` reads are `user?.id`, `user?.branch_id`, `user?.primary_branch_id` (used to stamp the saved row). The parent launch in App.jsx is also ungated. See Section E.

---

## Wizard model (how steps work)

State `tab` (0–5) drives 6 steps. `pages = titles.map(...)` builds the FormKit wizard pages (RenewalCalculator.jsx:946–955). The shared `body` variable (line 588) holds **all** steps; each step block is gated by `tab === N`. Navigation handled by FormKit footer (Back/Next/Submit). `onNext` (line 956) clamps to 5; `onBack` (line 968) clamps to 0. Only **step 0** has a real `valid` gate (`tab0Valid`); steps 1–5 are always `valid: true`.

`tab0Valid = !!worker && phoneValid && !workerDataIncomplete && !dupQuote` (line 947).

---

## A. Stages / Steps

### Stage 0 — `worker` · «العامل» (Worker)
- file:line — block `tab === 0`: **RenewalCalculator.jsx:591–720**; title `T('العامل','Worker')` line 946.
- Purpose: search/select worker (live search, no button) + mandatory mobile number. Blocks progress if worker data incomplete or a duplicate active quote exists.

**Fields**

| key | Arabic label | DB table.column (final write) | editable | file:line |
|---|---|---|---|---|
| `worker_search_q` | «ابحث بالاسم أو رقم الإقامة…» | — (search box; reads `workers` table) | y | 599 |
| `worker_select` | (worker result card click → `pickWorker`) | sets `worker_id` / `iqama_number` / `worker_name` / `dob` / `nationality_id` / `gender` / `occupation_name_ar` / `iqama_expiry_gregorian` on `iqama_renewal_calculation` | y (select) | 610, 230 |
| `worker_iqama_number` (display) | «رقم الإقامة» | `iqama_renewal_calculation.iqama_number` | n (read-only) | 679 |
| `worker_occupation` (display) | «الوظيفة» | `iqama_renewal_calculation.occupation_name_ar` | n | 684 |
| `worker_iqama_expiry` (display) | «انتهاء الإقامة» | `iqama_renewal_calculation.iqama_expiry_gregorian` | n | 688 |
| `worker_age` (display) | «العمر» | (derived from `dob`) | n | 692 |
| `phone` | «رقم الجوال» * (required, +966, 9 digits, regex `^5\d{8}$`) | `iqama_renewal_calculation.phone` (saved as `'0'+phone`) | y | 701 |

Notes: worker card also has a remove/X button (key `worker_clear`, line 659 → `setWorker(null)`). Incomplete-data banner (line 705) lists missing required worker fields (`missingWorkerFields`, lines 479–486): iqama_number, birth_date, work_permit_expiry **or** iqama_expiry (depends on `cfg.iqamaWpBasis`), occupation. Duplicate-quote error surfaced via `pages[0].error` (line 952).

**Buttons**

| key | label | action | file:line |
|---|---|---|---|
| `worker_clear` | (X icon, «تغيير العامل») | `setWorker(null)` | 659 |
| (result row) | worker card | `pickWorker(w)` → select worker | 610 |

---

### Stage 1 — `details` · «التفاصيل» (Worker Details)
- file:line — block `tab === 1 && worker`: **RenewalCalculator.jsx:723–771**; title `T('التفاصيل','Details')` line 946.
- Purpose: read-only review of worker data + establishment. **No editable inputs.** (Medical-insurance card intentionally removed — insurance now mandatory; comment line 768.)

**Fields** (all read-only display via `<Field>` / establishment pills)

| key | Arabic label | DB source column | editable | file:line |
|---|---|---|---|---|
| `d_name` | «الإسم» | `worker_name` | n | 730 |
| `d_iqama_number` | «رقم الإقامة» | `iqama_number` | n | 731 |
| `d_iqama_expiry` | «انتهاء الإقامة (ميلادي)» | `iqama_expiry_gregorian` | n | 732 |
| `d_age` | «العمر» | (from `dob`) | n | 733 |
| `d_occupation` | «الوظيفة» | `occupation_name_ar` | n | 734 |
| `d_fac_unified` | «الرقم الموحد» | (worker.facility.unified_number — not written to quote) | n | 747 |
| `d_fac_hrsd` | «رقم الموارد البشرية» | (facility.hrsd_number — not written) | n | 752 |
| `d_fac_gosi` | «رقم التأمينات» | (facility.gosi_number — not written) | n | 757 |

**Buttons:** none (only `CopyBtn` copy-to-clipboard helpers on facility numbers — lines 748, 753, 758; not state-changing).

---

### Stage 2 — `renewal_options` · «التجديد» (Renewal Options)
- file:line — block `tab === 2 && calc`: **RenewalCalculator.jsx:774–804**; title `T('التجديد','Renewal')` line 946.
- Purpose: the actual pricing inputs (exemption, period, profession change). **Section: iqama / work-permit pricing inputs.**

**Fields**

| key | Arabic label | DB table.column | editable | file:line |
|---|---|---|---|---|
| `exemption` | «هل يوجد إعفاء؟» (Yes/No) | `iqama_renewal_calculation.exemption` (`f.exemption !== false`) | y | 778–779 |
| `renewalMonths` | «مدة التجديد» (3/6/9/12 mo) | `iqama_renewal_calculation.renewal_months` | y | 782–784 |
| `changeProfession` | «تغيير المهنة» (Yes/No) | `iqama_renewal_calculation.change_profession` | y | 787–788 |
| `newOccupationId` / `newOccupation` | «المهنة الجديدة» (Select, shown only if changeProfession) | `iqama_renewal_calculation.new_occupation_id` + `new_occupation_name_ar` | y | 791–793 |

Notes: profession-change-exempt info banner when `calc.profChangeIsFree` (line 794). Exemption=No switches work-permit to no-exempt bracket pricing (calc logic lines 364–371).

**Buttons:** none beyond the ToggleGroup/YesNo/Select inputs above.

---

### Stage 3 — `pricing` · «التسعيرة» (Pricing / Government Fees)
- file:line — block `tab === 3 && calc`: **RenewalCalculator.jsx:807–811**; renders `govFeesDetail` (KCard defined lines 504–567); title `T('التسعيرة','Pricing')` line 946.
- Purpose: read-only accounting table of government fees with cover/excess per section.

**Fields** (all computed/read-only rows in the gov-fees table — sections: iqama / work-permit / medical / profession-change)

| key | Arabic label | DB column (frozen at save) | editable | file:line |
|---|---|---|---|---|
| `iqama_renewal_fee` | «تجديد الإقامة» (Total / Covered / Excess cols) | `iqama_renewal_fee` (+ `iqamaExcess` within `gov_excess`) | n | 517 |
| `work_permit_fee` | «رخصة العمل» | `work_permit_fee` (+ `wpExcess`) | n | 518 |
| `medical_fee` | «التأمين الطبي» | `medical_fee` (+ `medExcess`) | n | 519 |
| `prof_change_fee` | «تغيير المهنة» (only if >0) | `prof_change_fee` | n | 520 |
| (totals row) | «الإجمالي / يشمله المكتب / الزائد على العميل» | `government_fees` / `office_cover` / `gov_excess` | n | 556–561 |

**Buttons:** none (display only). `wpBasisFellBack` warning banner line 508.

---

### Stage 4 — `review` · «المراجعة» (Review)
- file:line — block `tab === 4 && calc`: **RenewalCalculator.jsx:814–846**; title `T('المراجعة','Review')` line 946.
- Purpose: timeline (current → +period → after-renewal) + summary cards (office fee / excess on customer) + expected-total hero.

**Fields** (all read-only display)

| key | Arabic label | DB column | editable | file:line |
|---|---|---|---|---|
| `r_current_iqama` | «الإقامة الحالية» | `iqama_expiry_gregorian` | n | 821–822 |
| `r_period` | «+ N شهر» | `renewal_months` | n | 833 |
| `r_after_renewal` | «بعد التجديد» | `expected_expiry_date` (calc.expectedExpiry) | n | 837–838 |
| `r_office_fee` | «رسوم المكتب» (summary card) | `office_fee` | n | 574–575 |
| `r_client_excess` | «الزائد على العميل» (summary card) | `gov_excess` + `prof_change_fee` | n | 578–582 |
| `r_expected_total` | «الإجمالي المتوقع» (hero) | `total_amount` (grandTotal) | n | 490–501 |

**Buttons:** none.

---

### Stage 5 — `cost` · «التكلفة» (Cost Summary / Issue step — LAST)
- file:line — block `tab === 5 && calc`: **RenewalCalculator.jsx:849–941**; title `T('التكلفة','Cost')` line 946. This is the final page → footer shows the **Issue** (submit) button.
- Purpose: full itemized cost summary with two **editable inline controls**: repeat-violation fine toggle and Absher discount. Sections: iqama renewal / iqama late-fine / work-permit / medical / profession-change / additional-fees / office-fee.

**Fields**

| key | Arabic label | DB table.column | editable | file:line |
|---|---|---|---|---|
| `c_iqama_renewal` | «تجديد الإقامة» | `iqama_renewal_fee` | n (display) | 865–867 |
| `repeatViolation` | (±) toggle on «غرامة تأخّر الإقامة» (only when `calc.inGrace`) | `iqama_renewal_calculation.repeat_violation` (affects `late_fine_amount`) | **y** | 886–894 |
| `c_late_fine` | «غرامة تأخّر الإقامة» | `late_fine_amount` | n (display; value from toggle) | 871 |
| `c_work_permit` | «رخصة العمل» | `work_permit_fee` | n | 872 |
| `c_medical` | «التأمين الطبي» | `medical_fee` | n | 873 |
| `c_prof_change` | «تغيير المهنة» (if changeProfession) | `prof_change_fee` | n | 874 |
| `c_extras` | «رسوم إضافية» (only if extrasTotal>0) | `iqama_renewal_calculation.extras` (jsonb) | n in UI* | 875 |
| `c_office_fee` | «رسوم المكتب كاملة» | `office_fee` | n | 876 |
| `c_subtotal` | «إجمالي الرسوم» | `subtotal` (gross) / `government_fees` | n | 902–904 |
| `c_office_discount` | «خصم المكتب» | `office_cover` | n | 907–912 |
| `absher_on` | «خصم أبشر» (toggle switch) | (gates `absher_discount`) | **y** | 921 |
| `absher` | Absher discount amount input | `iqama_renewal_calculation.absher_discount` | **y** | 927 |
| `c_grand_total` | «الإجمالي» | `total_amount` | n | 932–935 |

\* `extras` exists in state (`f.extras`, line 157) and is persisted (`extras: f.extras || []`, line 439) but there is **NO UI editor** for it in this wizard — it always stays `[]`. Flag for the permission model: field exists in DB write but is dead in UI.

**Buttons**

| key | label | action | file:line |
|---|---|---|---|
| `repeat_fine_toggle` | (± icon) | `set('repeatViolation', !f.repeatViolation)` | 886 |
| `absher_toggle` | (switch) | `set('absher_on', !f.absher_on)` | 921 |
| `issue` (submit) | «إصدار» (Issue) | `save()` → insert quote | FormKit footer (see B) / 969–970 |

---

## B. Navigation & Global Buttons

Rendered by FormKit `Modal` footer (FormKit.jsx:1064–1071, 1170–1175). Wired from RenewalCalculator.jsx:962–970.

| key | label (ar/en) | shown when | action | file:line |
|---|---|---|---|---|
| `nav_back` | «السابق» / «Back» | `cur > 0` (steps 1–5) | `onBack` → `setTab(t => Math.max(0, t-1))` | FormKit:1065 ; RC:968 |
| `nav_next` | «التالي» / «Next» | not last step (steps 0–4) | `onNext` → `setTab(t => Math.min(5, t+1))`; gated `disabled={!curValid}` (step 0 uses `tab0Valid`) | FormKit:1070 ; RC:956–960 |
| `submit_issue` | «إصدار» / «Issue» (icon `Send`) | last step (step 5) | `onSubmit` → `save()`; `disabled={!curValid || submitting}` | FormKit:1069 ; RC:969–970, 422–454 |
| `modal_close` | (X icon) | always (header) | `onClose()` → `setShowRenewalCalc(false)` | FormKit:1121 ; RC:964 |
| `overlay_close` | (click backdrop) | always | `onClose()` (closeOnOverlay default) | FormKit:1103 |

`submitLabel = T('إصدار','Issue')`, `submitIcon = Send` (RC:970). Modal title «حسبة تجديد إقامة» / «Iqama Renewal Calc», icon `RefreshCw`, `variant="create"`, `width=640 height=700` (RC:965–966).

---

## C. Sub-modals / Confirmations

### C1. Medical-insurance / CHI captcha lookup modal
- file:line — **RenewalCalculator.jsx:972–1034** (rendered when `chi.phase !== 'idle'`, zIndex 2200).
- **STATUS: present in code but currently UNREACHABLE.** As of the 2026-06-27 "insurance mandatory" change, no UI button calls `startChiCheck()` anymore (the insurance card was removed from Stage 1, comment line 768; `onNext` no longer triggers CHI, comment line 958). The whole CHI machinery (`startChiCheck`, `submitChiCaptcha`, `refreshChiCaptcha`, `closeChi`, lines 234–300) is dormant. Flag for the permission model: dead sub-flow, but still in the file.
- CHI endpoint: `'/.netlify/functions/check-chi-insurance'` (CHI_FN_URL, line 38). On success writes to `workers` (insurance_expiry_date / insurance_company / insurance_policy_number / insurance_checked_at, lines 279–284).
- Phases: `loading` (985), `captcha` (992), `verifying` (1014), `error` (1021).
- Buttons (if it were reachable):

| key | label | action | file:line |
|---|---|---|---|
| `chi_close` | (X) | `closeChi()` | 977 |
| `chi_refresh` | «رمز تحقق جديد» | `refreshChiCaptcha()` | 1002 |
| `chi_check` | «استعلام» / «Check» | `submitChiCaptcha()` | 1010 |
| `chi_retry` | «إعادة المحاولة» | `startChiCheck()` | 1028 |
| `chi_error_close` | «إغلاق» | `closeChi()` | 1029 |

Captcha countdown `ChiCountdown` TTL=120s (lines 39, 51–66), max 3 attempts (CHI_MAX_ATTEMPTS, line 40).

### C2. Duplicate-quote guard (inline, not a modal)
- file:line — effect **RenewalCalculator.jsx:165–184** queries `iqama_renewal_calculation` for active (`approved/invoiced/completed`) quotes for the same iqama → `dupQuote`. Blocks step 0 (`tab0Valid` includes `!dupQuote`, line 947) and surfaces `pages[0].error` (line 952–953). No popup; inline error in footer.

### C3. Worker-data-incomplete guard (inline banner)
- file:line — **RenewalCalculator.jsx:705–710** banner + `pages[0].error` fallback (line 954). Not a modal.

---

## D. Result / Success Screen

- file:line — **RenewalCalculator.jsx:1037–1085** (rendered when `issuedQuote` truthy, custom overlay zIndex 2300 — **not** FormKit's built-in `success` prop).
- Set by `save()` on successful insert (line 451): `{ quoteNo, workerName, iqNo, total, warnings }`.
- Shows success check, message «تم إصدار التسعيرة», warning chips (expired → danger; in-grace → warn; built lines 448–450), and three info rows:
  - «رقم طلب التسعيرة» (Quote No., `noDash(quoteNo)`) + copy — line 1075
  - «رقم الإقامة» (Iqama Number) + copy — line 1076
  - «الإجمالي» (Total) — line 1077

**Actions**

| key | label | action | file:line |
|---|---|---|---|
| `success_overlay_close` | (click backdrop) | `setIssuedQuote(null)` | 1055 |
| `success_copy_quote` / `success_copy_iqama` | (copy icons) | clipboard write | 1051 (inline `CopyBtn`) |
| `success_go_quote` | «التسعيرة» / «Quote» | `setIssuedQuote(null)` → `onGoToRenewalCalc(quoteNo)` (navigate to renewal_calc page) else `onClose()` | 1080 |

---

## E. Current Permission Wiring

**None inside the component.** Confirmed via grep for `can(`, `hasPerm`, `isGM`, `canTab`, `tabOffices`, `cardVisible`, `perms`, `permission`, `user.perms`, `.role` — only matches are the DB-table string `iqama_renewal_calculation` and unrelated occurrences. The component:
- receives props `sb, user, toast, lang, onClose, onGoToRenewalCalc` (line 143) — `user` is used **only** to stamp the saved row: `created_by: user?.id` and `branch_id: user?.branch_id || user?.primary_branch_id` (RC:441–442). No `user.perms`/role checks.
- has no per-stage / per-field / per-button visibility or enable gating tied to permissions. The only gates are business-rule validity (`tab0Valid`, `workerDataIncomplete`, `dupQuote`, `phoneValid`).

**Parent (App.jsx):** launch is also ungated.
- `const [showRenewalCalc, setShowRenewalCalc] = useState(false)` — App.jsx:598
- Sidebar entry `pricing_hub` → `{id:'renewal_calc', l:'حسبة تجديد الإقامات'}` — App.jsx:668
- Page render `pg==='renewal_calc' && <RenewalCalcPage … onNewCalc={()=>setShowRenewalCalc(true)} />` — App.jsx:1122 (the "+ new calc" button lives in `RenewalCalcPage`, not here — **review that file for any `view`/`create` gating on the list/new-calc button**).
- Modal render — App.jsx:1164.

**Gap summary (what the new `renewal_calc` permission model must wire up):**
- `view` — gate sidebar tab + RenewalCalcPage list (parent, not this file).
- `create` — gate the launch (`onNewCalc`) + the whole modal.
- `price` — gate Stage 2 inputs (exemption / renewalMonths / changeProfession / newOccupation) + Stage 5 editable controls (repeatViolation toggle, absher).
- `approve` / `invoice` — live in `RenewalCalcPage` (status transitions priced→approved→invoiced), **not** in this wizard.
- `edit` — card edits live in `RenewalCalcPage` (per renewalDerived.js header comment, line 7).
- `delete` — not in this file.

---

## F. DB Tables & RPCs

**Primary write target:** `iqama_renewal_calculation` (Supabase, via `sb.from(...).insert(...)`).
- Insert in `save()` — **RenewalCalculator.jsx:446**: `sb.from('iqama_renewal_calculation').insert(row).select('quote_no').maybeSingle()`. `quote_no` is DB-generated (returned, shown on success screen).
- Row shape — RC:429–443 (explicit columns) + RC:445 frozen-derived merge.

**Columns written (the `row` object, lines 429–443):**
`worker_id, iqama_number, worker_name, phone, dob, nationality_id, gender, occupation_name_ar, iqama_expiry_gregorian, iqama_expired, renewal_months, change_profession, new_occupation_name_ar, new_occupation_id, repeat_violation, exemption, iqama_renewal_fee, late_fine_amount, work_permit_fee, prof_change_fee, medical_fee, office_fee, medical_insured, medical_insurance_end, medical_insurance_company, medical_insurance_policy, gov_excess, extras (jsonb), absher_discount, subtotal, total_amount, status (='priced'), priced_at, created_by, branch_id`.

**Frozen-snapshot derived columns** (merged via `Object.assign(row, computeRenewalDerived(row))`, RC:445; computed in `renewalDerived.js:19–68`):
`billed_renewal_months, office_cover, office_fee_net, government_fees, expected_duration_months, expected_expiry_date`.

**Other tables touched (reads / best-effort writes):**
- `workers` — search (RC:207), random preview sample (RC:18–28), and CHI best-effort update of `insurance_expiry_date / insurance_company / insurance_policy_number / insurance_checked_at` (RC:279–284) — **currently unreachable** (CHI dead).
- `iqama_renewal_calculation` — duplicate-quote read (RC:169–174: `id, quote_no, status, priced_at, branch_id`).
- `branches` — branch_code lookup for dup-quote display (RC:178).
- `nationalities` — flags/labels (RC:187).
- `occupations` — new-occupation list (RC:193–196).
- `lookup_items` + `lookup_categories` — find `archived` occupation category to exclude (RC:192).

**Edge / Netlify functions:**
- CHI insurance check: `POST /.netlify/functions/check-chi-insurance` (`callChiFn`, RC:235–244; actions `init` / `verify`). Currently dormant.

**RPCs:** none called from this file (no `sb.rpc(...)`). `quote_no` generation and any status workflow RPCs live elsewhere (likely DB trigger / `RenewalCalcPage`).

**Pricing config source:** `getIqamaRenewalPricingConfig()` from `C:/dev/jisr-app/src/lib/kafalaPricing.js` (RC:4, 186) — supplies all cover limits, brackets, fines, office-fee mode, work-permit basis, etc.
