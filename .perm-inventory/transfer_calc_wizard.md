# Permission Inventory — حاسبة نقل الكفالة (Kafala Transfer Calculator Wizard)

**Source file:** `C:/dev/jisr-app/src/pages/KafalaCalculator.jsx` (1982 lines)
**Component:** `export default function KafalaCalculator({ sb, user, toast, lang, onClose, onGoToTransferCalc })` — file:579
**Chrome:** Rendered inside `FKModal` (FormKit) — header + stepper + footer (next/back/submit) are FKModal-provided. file:1834-1840
**Mounted by:** `App.jsx:1163` as `{showKafalaCalc && <KafalaCalculator .../>}`. Opened from `TransferCalcPage`'s «New Calc» button (`onNewCalc={()=>setShowKafalaCalc(true)}`, App.jsx:1121).
**Permission module:** `quotations` (catalog actions: view / create / price / approve / invoice / edit / delete — permCatalog.js:80-85). The transfer_calc PAGE is gated by `transfer_calc: 'quotations.view'` (permissions.js:75).

> NOTE: there is **NO permission code inside this file** — no `can()/hasPerm()/isGM()/canTab()/cardVisible()` anywhere in KafalaCalculator.jsx. All gating is at the mount/parent layer. See section E.

---

## Wizard model (4 steps, single shared body, `tab` index 0–3)

State: `const [tab, setTab] = useState(0)` (file:586). Steps come from `tabs[]` (file:1275-1280) and are mapped to FKModal `pages[]` (file:1825-1830). The body (`wizardBody`, file:1323) renders only the active `tab`. Two screens existed historically (`screen` state, file:585) but the "home" screen was removed — wizard always opens at the form.

**Ordered stage keys:** `worker` → `details` → `pricing` → `review`

| idx | key (proposed snake_case) | id in code | Arabic title | EN title | Icon | file:line |
|----|---------------------------|-----------|--------------|----------|------|-----------|
| 0 | `worker_data` | `worker` | بيانات العامل | Worker Data | User | 1276 |
| 1 | `worker_details` | `details` | تفاصيل العامل | Worker Details | ArrowLeftRight | 1277 |
| 2 | `pricing` | `pricing` | التسعيرة | Pricing | Calculator | 1278 |
| 3 | `review` | `review` | مراجعة | Review | CheckCircle2 | 1279 |

---

# A. Stages / Steps

## Stage 0 — `worker_data` · بيانات العامل (file:1331-1458)

Entering "Next" from this step auto-triggers the HRSD inquiry overlay if a valid iqama is present and HRSD is still idle (`tryNextTab`, file:1252-1256). On a valid iqama typed, Muqeem auto-lookup fires (debounced effect, file:1089-1131). When Muqeem returns data (`mqLocked = !!muqeemData`, file:879), iqama-expiry + occupation render **read-only** (`MqLocked`) instead of editable. Those two fields only render once Muqeem is resolved (`mqResolved`, file:882) — i.e. they are hidden until lookup completes/fails.

### Fields

| field key | Arabic label | DB column (issue-quotation → transfer_calculation) | editable | file:line |
|-----------|--------------|----------------------------------------------------|----------|-----------|
| `iqama` | رقم الإقامة | `iqama_number` | yes (10-digit, `[12]\d{9}`); changing it resets name/expiry/occupation/status/transferCount + clears HRSD & Muqeem | 1379-1396 |
| `dob` | تاريخ الميلاد | `dob` | yes (DateField, greg/hijri) | 1399 |
| `nationality` | الجنسية | `nationality` (name_ar string) | yes (FKSelect + flag) | 1402-1410 |
| `phone` | رقم الجوال | `phone` (stripped of +966) | yes (9-digit, `5[013-9]\d{7}`) | 1424-1432 |
| `iqamaExpiry` | تاريخ انتهاء الإقامة (ميلادي) | `iqama_expiry_gregorian` | yes when not mqLocked; **read-only (MqLocked)** when Muqeem returned it. Hidden until `mqResolved`. | 1437-1445 |
| `occupation` (+`occupationId`) | المهنة | `occupation_name_ar` / `occupation_id` | yes (OccSelect) when not mqLocked; **read-only (MqLocked)** when Muqeem returned it. Hidden until `mqResolved`. | 1446-1455 |

> Indirect/derived also written from data captured here: `iqama_expiry_hijri` (muqeem), `iqama_expired`, `muqeem_fetched_at`, `resident_status_ar` (muqeem `statusAr` ?? `legalStatus`), `gender` (form default 'ذكر', no UI control on this step).

### Buttons / interactive controls

| button key | label | action | file:line |
|-----------|-------|--------|-----------|
| `muqeem_reconnect` | إعادة الاتصال / Reconnect | `retryMuqeem()` — re-run Muqeem lookup (only shown when status unavailable/error) | 1369-1374 |
| (date triple-selects) | السنة/الشهر/اليوم | inside DateField/HijriDate for dob — set `dob` | 1342-1346 |

(Step navigation Next/Back are FKModal footer — see section B.)

---

## Stage 1 — `worker_details` · تفاصيل العامل (file:1463-1518)

Read-only **summary** step. Every value is a display tile (`Field`) — NONE are editable. Pulls from HRSD result + Muqeem + form. No buttons (besides global nav).

### Fields (all read-only display)

| field key | Arabic label | source / DB lineage | editable | file:line |
|-----------|--------------|---------------------|----------|-----------|
| `display_name` | الإسم | `hrsdCheck.result.name` ?? `f.name` → `worker_name` | no | 1505 |
| `display_iqama` | رقم الإقامة | `f.iqama` → `iqama_number` | no | 1506 |
| `display_age` | العمر | derived from `f.dob` | no | 1507 |
| `display_occupation` | المهنة | `f.occupation` → `occupation_name_ar` | no | 1508 |
| `display_worker_status` | حالة العامل | `hrsdCheck.result.workerStatus` → `hrsd_worker_status` | no | 1512 |
| `display_muqeem_status` | حالة مقيم | `muqeemData.statusAr` → `resident_status_ar` | no | 1513 |
| `display_iqama_expiry_g` | انتهاء الإقامة (ميلادي) | `f.iqamaExpiry` → `iqama_expiry_gregorian` | no | 1514 |
| `display_iqama_expiry_h` | انتهاء الإقامة (هجري) | `hijriExpiry` (derived) → `iqama_expiry_hijri` | no | 1515 |

### Buttons
None (navigation only).

---

## Stage 2 — `pricing` · التسعيرة (file:1523-1654)

The pricing fee-engine step. Most amounts are pulled from admin config (`getKafalaPricingConfig`) into `makeInitialForm` (file:655-671) and are editable here. **`mqLocked` hides the manual Transfer-Fee card** (file:1587) because the fee is auto-computed from Muqeem sponsor-change count.

> DEAD CODE: `togChip` helper (file:1524-1539) and the `discount`/`discount_on` fields (file:1541) are defined but **never rendered**. Only `absherBalance` is actually surfaced (in Stage 3). Flag for permission config: do NOT expose a `discount` toggle here unless it's wired.

### Fields

| field key | Arabic label | DB column | editable | file:line |
|-----------|--------------|-----------|----------|-----------|
| `transferOnly` / `renewalMonths` (`renewIqama`) | تجديد الإقامة (نقل فقط / 3·6·9·12 شهر) | `transfer_only`, `renew_iqama`, `renewal_months` | yes (RenewalPill segmented). «نقل فقط» pill hidden if days-left < `transferOnlyMinDays` | 1564-1583 |
| `transferFeeInput` | رسوم النقل (1010/2000/4000 options) | `transfer_fee` | yes (RenewalPill options) — **card hidden when `mqLocked`** | 1587-1601 |
| `changeProfession` | تغيير المهنة | `change_profession` | yes (YesNo) | 1604-1606 |
| `newOccupation` (+`newOccupationId`) | المهنة الجديدة | `new_occupation_name_ar` / `new_occupation_id` | yes (OccSelect) — only shown when `changeProfession` | 1607-1611 |
| `extras[]` (name + amount) | رسوم إضافية | `extras` (jsonb array) | yes (add/remove rows) | 1615-1635 |

> Note: the per-month fee amounts (`iqamaRenewalFee`, `workPermitRate`, `medicalFee`, `officeFee`, `profChangeInput`) live in form state from config but have **no editable input on this step** — they flow straight to submit (`iqama_renewal_fee`, `work_permit_fee`, `medical_fee`, `office_fee`, `prof_change_fee`). The Total hero (file:1638-1652) is display-only.

### Buttons

| button key | label | action | file:line |
|-----------|-------|--------|-----------|
| `renewal_pill_*` | نقل فقط / 3 / 6 / 9 / 12 | set `transferOnly`+`renewalMonths`+`renewIqama` | 1567-1579 |
| `transfer_fee_pill_*` | 1010 / 2000 / 4000 ريال | set `transferFeeInput` | 1593 |
| `change_prof_yesno` | نعم / لا | set `changeProfession` | 1605 |
| `extra_add` | + (Add) | `addExtra()` (file:947) — push {name,amount} to `extras` | 1619 |
| `extra_remove_*` | × (Remove) | `removeExtra(i)` (file:952) | 1630 |

---

## Stage 3 — `review` · مراجعة (file:1659-1818)

Final review + the **only two inline edit controls** that survive to this step. Worker block (file:1662-1725) is read-only display (name/mobile/iqama/new-occupation/current+expected expiry/expected duration). Cost summary (file:1729-1815) lists each fee line; two are interactive:

### Fields (interactive on this step)

| field key | Arabic label | DB column | editable | file:line |
|-----------|--------------|-----------|----------|-----------|
| `transferFeeInput` (inline) | رسوم نقل الكفالة (inline number box) | `transfer_fee` | yes — only when `!mqLocked` (`transferEditable`) | 1772-1776 |
| `renewalAdd500` | (±) غرامة تأخير on the «تجديد الإقامة» row | `add_late_fine` (+ `late_fine_amount`) | yes (toggle +/−) — only shown when `iqamaExpired || iqamaInGracePeriod` | 1763-1770 |
| `absherBalance` (+`absherBalance_on`) | خصم أبشر | `absher_discount` | yes (toggle switch + amount input) | 1790-1805 |

All other cost rows (transfer/renewal/work-permit/prof-change/medical/office/extras/subtotal/grand-total) are read-only display. file:1746-1811.

### Buttons

| button key | label | action | file:line |
|-----------|-------|--------|-----------|
| `renewal_fine_toggle` | (±) add/remove late fine | toggle `renewalAdd500` | 1764 |
| `absher_toggle` | (switch) تفعيل خصم أبشر | toggle `absherBalance_on` | 1797 |

Submit happens via the FKModal footer «إصدار / Issue» (section B).

---

# B. Navigation & global buttons (FKModal footer, file:1834-1840)

| button key | label | action | file:line |
|-----------|-------|--------|-----------|
| `nav_next` | التالي / Next | `onNextClick` → validates tab0Errors (step 0) / tab2Errors (step 2); on step 0 idle, fires `startHrsdCheck()` instead of advancing; else `setTab(tab+1)` | 1316-1320, 1838 (`onNext`) |
| `nav_back` | السابق / Back | `setTab(max(0,tab-1))` + clear errors/issueErr | 1838 (`onBack`) |
| `nav_submit` (issue) | إصدار / Issue (Send icon) | `issueQuote()` → `issueQuoteImpl()` → edge fn `issue-quotation` (only active/enabled on final step via FKModal) | 1839-1840 |
| `modal_close` | × / Close | `onClose()` (+ `setIssueErr(null)`) | 1834 |

**Step-gating (validation):**
- `tab0Errors` (file:1292-1307) gates Next on step 0 — requires iqama, dob, phone, iqamaExpiry, occupation; blocks if `dupQuote` exists (an active approved/invoiced transfer quote for same iqama).
- `tab2Errors` (file:1309-1315) gates Next on step 2 — requires renewal period or transferOnly, transfer fee > 0 (unless mqLocked), new occupation if changeProfession.
- `pages[].valid` mirrors these (file:1828); footer error line from `pages[].error` (file:1829), where step 3 shows `issueErr`.
- `dupQuote` guard: queries `transfer_calculation` for an existing active quote on the same iqama (file:678-698) — surfaces as a step-0 error.

---

# C. Sub-modals / confirmation popups

The wizard spawns **2 overlay sub-modals** in addition to the main FKModal (3 modal surfaces total). Both render via the component's own portal-less fixed overlays (not FKModal).

### C1. HRSD / Ministry-of-Labor Inquiry overlay (file:1906-1978)
Triggered by `startHrsdCheck()` (auto on Next from step 0, or Retry). Backed by **Netlify function `/.netlify/functions/check-hrsd-worker`** (file:959; actions `init` + `verify`). Has captcha (~13s TTL `CAPTCHA_TTL`, file:99) with auto-refresh. Phases: `loading | captcha | verifying | error` (state `hrsdCheck.phase`, file:612).

| button key | label | action | file:line |
|-----------|-------|--------|-----------|
| `hrsd_close` | × | `closeHrsdCheck()` (marks skipped) | 1909 |
| `hrsd_skip` (loading) | تخطّي والمتابعة | close + `setTab(1)` — only after `errorCount >= HRSD_SKIP_AFTER` (3) | 1923 |
| `hrsd_captcha_refresh` | (↻) رمز تحقق جديد | `refreshHrsdCaptcha()` | 1937 |
| `hrsd_verify` | تحقق / Verify | `submitHrsdCaptcha()` | 1951 |
| `hrsd_retry` (error) | إعادة المحاولة / Retry | `startHrsdCheck()` | 1969 |
| `hrsd_skip_err` (error) | تخطّي والمتابعة | close + `setTab(1)` — only after 3 errors | 1971 |
| (captcha input) | ______ | sets `hrsdCheck.captchaInput`, Enter = verify | 1941-1949 |

HRSD writes to submit payload: `hrsd_worker_status`, `hrsd_verified_at`, and `worker_name` (name applied to `f.name`).

### C2. Muqeem auto-lookup (NOT a modal — inline status pill)
No popup; an inline status indicator on the iqama field (file:1358-1378) with phases `loading | ok | unavailable | error`. Backed by **Supabase edge fn `query-muqeem`** (PROD project, file:1051 / `MUQEEM_FN_URL`). The «إعادة الاتصال» button is the only control (listed under Stage 0). Listed here for completeness because it is an external-service sub-flow.

---

# D. Result / success screen (file:1843-1903)

`issuedQuote` success modal — shown after a successful `issue-quotation`. State `issuedQuote = { quoteNo, workerName, iqNo, total, warnings }` (file:636, set at 1248). Green-check confirm modal (in-modal SuccessView, not a toast).

Displays: «تم إصدار الحسبة», worker name line, any `warnings[]` (danger/warn chips), then rows: Calculation No. (`quote_no`, copyable), Iqama Number (copyable), Total.

| action key | label | action | file:line |
|-----------|-------|--------|-----------|
| `success_copy_*` | (copy icon) نسخ | `navigator.clipboard.writeText(...)` for quoteNo / iqama | 1844-1856, 1893-1894 |
| `success_goto_calc` | الحسبة / Calculation (back-arrow) | `setIssuedQuote(null)` then `onGoToTransferCalc(quoteNo)` → navigates to `transfer_calc` page (hash `#transfer_calc?q=…`, App.jsx:1163); falls back to `onClose()` | 1898 |
| `success_dismiss` | (overlay click) | `setIssuedQuote(null)` | 1872 |

> No explicit "Print" or "New" action on this success screen — navigation to the transfer_calc list is the single forward action; printing lives on the TransferCalcPage detail.

---

# E. Current permission wiring

**Inside KafalaCalculator.jsx: NONE.** Confirmed by grep — zero `can()/hasPerm()/isGM()/canTab()/tabOffices()/cardVisible()/user.perms` references in the 1982-line file. The `user` prop is passed in (file:579) but never used for gating; it is only threaded for future use. Granular per-field/per-button permission does **not exist yet** — this is the gap to fill.

**Mount / parent-level gating (where `quotations` is enforced today):**

| location | gate | what it controls |
|----------|------|------------------|
| `lib/permissions.js:75` | `transfer_calc: 'quotations.view'` | Access to the whole transfer_calc PAGE/tab (the only route from which the wizard opens). permissions.js:63 comment confirms the tab is gated by `quotations`. |
| `lib/permCatalog.js:80-85` | `quotations` actions: `view, create, price, approve, invoice, edit, delete` | The action catalog for this module (single source of truth for the control panel). |
| `lib/permCatalog.js:189` | `transfer_calc: 'quotations'` (tabModuleMap) | Maps the transfer_calc tab → `quotations` module. |
| `lib/permCatalog.js:210` | `quotations: { label_ar:'تسعيرات التنازل', icon:'calc', sort:50 }` | Module metadata. |
| `App.jsx:1121` | `onNewCalc={()=>setShowKafalaCalc(true)}` (in `TransferCalcPage`) | The «new calc» entry button — this is where a `quotations.create` guard should sit (currently the wizard opens unconditionally once the page is reachable). |
| `App.jsx:1163` | `{showKafalaCalc && <KafalaCalculator .../>}` | Mount point; no guard wrapping. |

**Implication for the granular system:** every field/button in sections A–D currently has **no per-control gate**. The natural mapping:
- whole-wizard open → `quotations.create`
- editable pricing fields (transferFeeInput, renewalAdd500, absherBalance, extras, renewalMonths, changeProfession) → `quotations.price`
- the final «إصدار / Issue» submit → `quotations.create` (or a dedicated `quotations.approve` if issuance == certification in this flow)
- HRSD/Muqeem lookups → could be their own sub-permission (not in catalog today)

---

# F. DB tables & RPCs (trace of final submit)

**Primary write — edge function, not a direct table insert:**
`sb.functions.invoke('issue-quotation', { body: payload })` — file:1240. The browser does NOT insert directly; the edge function `issue-quotation` performs the insert (returns `{ ok, row: { quote_no, total_amount } }`).

**Target table:** `transfer_calculation` (confirmed by the dup-check read at file:683-688, and the field shape of the payload). Columns written via the payload (file:1191-1235):

- Worker identity: `iqama_number`, `worker_name`, `phone`, `dob`, `nationality`, `gender`
- Muqeem/iqama: `muqeem_fetched_at`, `iqama_expiry_gregorian`, `iqama_expiry_hijri`, `iqama_expired`, `occupation_id`, `occupation_name_ar`, `resident_status_code` (null), `resident_status_ar`, `sponsor_changes`
- HRSD: `hrsd_worker_status`, `hrsd_verified_at`
- Insurance (all null/false here): `insurance_status`, `insurance_expiry`, `insurance_company`, `insurance_waived`, `chi_verified_at`
- Service flags: `transfer_only`, `renew_iqama`, `renewal_months`, `change_profession`, `new_occupation_id`, `new_occupation_name_ar`, `add_late_fine`
- Fees: `transfer_fee`, `iqama_renewal_fee`, `work_permit_fee`, `prof_change_fee`, `medical_fee`, `office_fee`, `late_fine_amount`, `absher_discount`, `manual_discount` (0), `extras` (jsonb)
- Derived: `expected_expiry_date`, `duration_months`, `duration_days`, `warnings` (jsonb)

**Reads (direct Supabase, file):**
- `transfer_calculation` — dup-quote check by iqama, status in (approved/invoiced/completed) (file:683-688)
- `branches` — branch_code for the dup quote (file:692) and (line 645) `nationalities`, (599-606) `occupations` + `lookup_items`/`lookup_categories` for occupation & resident_status dropdowns.

**External service edge/serverless functions invoked:**
| fn | host | purpose | file:line |
|----|------|---------|-----------|
| `issue-quotation` | Supabase edge (`sb.functions.invoke`) | **final submit** → insert transfer_calculation, returns quote_no + total | 1240 |
| `query-muqeem` | Supabase edge (PROD project), `MUQEEM_FN_URL` | auto resident lookup (iqama expiry/occupation/status/sponsor changes) | 1051, 1089-1131 |
| `check-hrsd-worker` | **Netlify function** `/.netlify/functions/check-hrsd-worker` | HRSD/Ministry-of-Labor worker name + status (captcha flow) | 959, 961-975 |

**Auth/session:** `sb.auth.getSession()` checked before submit (file:1236-1237); session token auto-attached by `functions.invoke`.

---

## Summary counts

- **Stages/steps:** 4 — `worker_data`, `worker_details`, `pricing`, `review`
- **Fields:** ~22 distinct (6 on worker_data incl. 2 mqLocked-conditional · 8 read-only display on worker_details · 5 on pricing · 3 inline-editable on review; plus several config-driven fee fields that submit without a UI control)
- **Buttons / interactive controls:** ~20 (Stage controls: muqeem_reconnect, renewal pills×5, transfer-fee pills×3, change_prof yes/no, extra add, extra remove, renewal_fine toggle, absher toggle; Nav: next, back, submit, close; Success: copy×2, goto_calc, dismiss; HRSD: close, skip, captcha_refresh, verify, retry, skip_err)
- **Sub-modals / overlays:** 2 (HRSD inquiry overlay; issuedQuote success modal) + 1 inline external-service flow (Muqeem status pill). Main FKModal = 3rd modal surface.
- **Permission controls inside file:** 0 (all gating at parent — `quotations` module).
