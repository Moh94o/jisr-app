# _v2 Tables — Database-Side Audit

**Date:** 2026-04-17
**Project:** Supabase `gcvshzutdslmdkwqwteh` (Jisr Business)
**Companion to:** [`v2_tables_code_audit.md`](./v2_tables_code_audit.md)

Paired with the code audit — the code side was 0 references. This report covers the database-side objects (FKs, RLS, triggers, views, functions, indexes, data) to determine whether the 29 `_v2` tables can be safely dropped.

---

## 1. Summary table (per table)

Columns: `rows | inbound_FKs (from non-v2 tables) | outbound_FKs (to other v2 tables) | triggers | policies | indexes | verdict`

| Table | Rows | In-FKs | Out-FKs | Triggers | Policies | Indexes | Verdict |
|---|---:|---:|---:|---:|---:|---:|---|
| agents_v2 | 0 | **0** | 1 | 1 | 8 | 1 | DROP |
| approval_flows_v2 | 0 | **0** | 0 | 0 | 8 | 1 | DROP |
| audit_log_v2 | 0 | **0** | 1 | 0 | 8 | 1 | DROP |
| clients_v2 | 0 | **0** | 1 | 1 | 8 | 1 | DROP |
| commercial_records_v2 | 0 | **0** | 1 | 1 | 8 | 1 | DROP |
| countries_nationalities_v2 | 0 | **0** | 0 | 0 | 8 | 1 | DROP |
| daily_payments_v2 | 0 | **0** | 1 | 1 | 8 | 1 | DROP |
| exemption_transfers_v2 | 0 | **0** | 3 | 1 | 8 | 1 | DROP |
| facilities_v2 | 0 | **0** | 2 | 1 | 8 | 3 | DROP |
| gosi_establishments_v2 | 0 | **0** | 1 | 1 | 8 | 1 | DROP |
| installments_v2 | 0 | **0** | 1 | 1 | 8 | 2 | DROP |
| invoices_v2 | 0 | **0** | 3 | 1 | 8 | 3 | DROP |
| main_requests_v2 | 0 | **0** | 5 | 1 | 8 | 3 | DROP |
| notifications_v2 | 0 | **0** | 1 | 0 | 8 | 1 | DROP |
| offices_v2 | 0 | **0** | 0 | 1 | 8 | 2 | DROP |
| owners_v2 | 0 | **0** | 0 | 1 | 8 | 2 | DROP |
| perm_visa_apps_v2 | 0 | **0** | 2 | 1 | 8 | 1 | DROP |
| regions_cities_v2 | 0 | **0** | 0 | 0 | 8 | 1 | DROP |
| saudization_records_v2 | 0 | **0** | 1 | 1 | 8 | 1 | DROP |
| service_pricing_v2 | 0 | **0** | 0 | 1 | 8 | 1 | DROP |
| settings_v2 | **5** | **0** | 0 | 0 | 8 | 2 | DROP (data duplicated — see §4) |
| sms_messages_v2 | 0 | **0** | 0 | 0 | 8 | 1 | DROP |
| transfer_apps_v2 | 0 | **0** | 4 | 1 | 8 | 1 | DROP |
| users_v2 | 0 | **0** | 1 | 1 | 8 | 2 | DROP |
| whatsapp_groups_v2 | 0 | **0** | 0 | 1 | 8 | 1 | DROP |
| whatsapp_log_v2 | 0 | **0** | 1 | 0 | 8 | 1 | DROP |
| whatsapp_templates_v2 | 0 | **0** | 0 | 1 | 8 | 1 | DROP |
| workers_v2 | 0 | **0** | 1 | 1 | 8 | 2 | DROP |
| wps_payroll_v2 | 0 | **0** | 2 | 1 | 8 | 1 | DROP |

**The critical column is `In-FKs` — inbound foreign keys from tables outside the `_v2` family. Every single row is 0.** Nothing in production depends on any `_v2` table.

Totals: **5 rows** (all in `settings_v2`), **0 external FKs**, **21 triggers**, **232 RLS policies**, **41 indexes** — all auto-dropped by `DROP TABLE`.

---

## 2. Views / Functions / Triggers / Policies

### Views referencing `_v2`
**None.** Query returned `[]`.

### Functions/procedures referencing `_v2`
**None.** Query returned `[]`.

### Triggers on `_v2` tables (21 total)
Every trigger is `BEFORE UPDATE EXECUTE FUNCTION update_updated_at()`. All tied to the `update_updated_at()` helper function. `update_updated_at()` itself is **not** dropped — it's shared by other tables — so dropping the `_v2` tables removes these triggers but leaves the function intact (good).

Triggers (tied to their table):
`agents_v2_updated`, `clients_v2_updated`, `commercial_records_v2` → `cr_v2_updated`, `daily_payments_v2` → `dp_v2_updated`, `exemption_transfers_v2` → `et_v2_updated`, `facilities_v2_updated`, `gosi_establishments_v2` → `gosi_v2_updated`, `installments_v2` → `inst_v2_updated`, `invoices_v2` → `inv_v2_updated`, `main_requests_v2` → `req_v2_updated`, `offices_v2_updated`, `owners_v2_updated`, `perm_visa_apps_v2` → `pva_v2_updated`, `saudization_records_v2` → `sr_v2_updated`, `service_pricing_v2` → `sp_v2_updated`, `transfer_apps_v2` → `ta_v2_updated`, `users_v2_updated`, `whatsapp_groups_v2` → `wg_v2_updated`, `whatsapp_templates_v2` → `wt_v2_updated`, `workers_v2_updated`, `wps_payroll_v2` → `wps_v2_updated`.

**Flag:** 8 tables have no `_updated` trigger (`approval_flows_v2`, `audit_log_v2`, `countries_nationalities_v2`, `notifications_v2`, `regions_cities_v2`, `settings_v2`, `sms_messages_v2`, `whatsapp_log_v2`). Not a blocker — just inconsistent scaffolding. Doesn't affect the drop.

### RLS policies on `_v2` tables (232 total)
Each of the 29 tables has exactly 8 **identical permissive** policies — one for each combination of `{anon, authenticated}` × `{SELECT, INSERT, UPDATE, DELETE}`, all with `qual = true`. They effectively allow any anon or authenticated request to do anything to the table.

Representative row (`offices_v2`):
| policy | cmd | qual | with_check |
|---|---|---|---|
| `Allow anon delete offices_v2` | DELETE | true | — |
| `Allow anon insert offices_v2` | INSERT | — | true |
| `Allow anon read offices_v2` | SELECT | true | — |
| `Allow anon update offices_v2` | UPDATE | true | true |
| `Allow authenticated delete offices_v2` | DELETE | true | — |
| `Allow authenticated insert offices_v2` | INSERT | — | true |
| `Allow authenticated read offices_v2` | SELECT | true | — |
| `Allow authenticated update offices_v2` | UPDATE | true | true |

**Security note (unrelated to this drop, but worth flagging):** these wide-open policies are the default pattern across the `_v2` family. They will disappear when the tables drop. If the same pattern exists on your active production tables, that's a separate problem worth reviewing.

---

## 3. Incoming FKs from non-v2 tables → **the blocker check**

```
[]
```

**Zero rows.** No table outside the `_v2` family has a foreign key pointing into any `_v2` table. This is the single most important finding: **dropping these tables cannot break referential integrity elsewhere in the database.**

---

## 4. `settings_v2` data analysis

`settings_v2` is the only `_v2` table with rows (5).

### The 5 rows

| key | value | category |
|---|---|---|
| currency | `SAR` | general |
| timezone | `Asia/Riyadh` | general |
| website_email | `info@jisr-biz.sa` | general |
| website_name_ar | `جسر` | general |
| website_name_en | `Jisr Business` | general |

### Is `settings` the active table? No.
No `public.settings` table exists. However, a `public.system_settings` table **does** exist and holds the same key/value pairs.

### Side-by-side comparison (`settings_v2` vs. `system_settings`)

| key | settings_v2.value | system_settings.setting_value | match? |
|---|---|---|---|
| currency | `SAR` | `SAR` | ✅ identical |
| timezone | `Asia/Riyadh` | `Asia/Riyadh` | ✅ identical |
| website_email | `info@jisr-biz.sa` | `info@jisr-biz.sa` | ✅ identical |
| website_name_ar | `جسر` | `جسر ` (trailing space) | ≈ identical (whitespace only) |
| website_name_en | `Jisr Business` | `Jisr Business` | ✅ identical |

**All 5 rows are already present in `system_settings` with matching values.** `settings_v2` has a simpler schema (`id, key, value, category, updated_at`); `system_settings` has richer metadata (`setting_key, setting_value, label_ar, label_en, input_type, is_editable, …`). The `_v2` version looks like an abandoned earlier design for the same settings concern.

### Recommendation
**No migration needed.** The 5 rows are fully duplicated in the active `system_settings` table. Drop `settings_v2` as-is.

(Optional tidy step before drop: trim the trailing space on `system_settings.setting_key='website_name_ar'` — that's a data-quality nit, not a blocker.)

---

## 5. Proposed drop order

Because there are **zero external FKs**, the simplest and safest approach is a single `DROP ... CASCADE` — the cascade stays confined within the `_v2` family.

### Option A — one-shot CASCADE (recommended, risk-free)

```sql
BEGIN;
DROP TABLE IF EXISTS
  public.agents_v2, public.approval_flows_v2, public.audit_log_v2,
  public.clients_v2, public.commercial_records_v2, public.countries_nationalities_v2,
  public.daily_payments_v2, public.exemption_transfers_v2, public.facilities_v2,
  public.gosi_establishments_v2, public.installments_v2, public.invoices_v2,
  public.main_requests_v2, public.notifications_v2, public.offices_v2,
  public.owners_v2, public.perm_visa_apps_v2, public.regions_cities_v2,
  public.saudization_records_v2, public.service_pricing_v2, public.settings_v2,
  public.sms_messages_v2, public.transfer_apps_v2, public.users_v2,
  public.whatsapp_groups_v2, public.whatsapp_log_v2, public.whatsapp_templates_v2,
  public.workers_v2, public.wps_payroll_v2
CASCADE;
COMMIT;
```

`CASCADE` only cascades within the `_v2` family (FKs, triggers, policies, indexes) — it **cannot** spill outside because nothing outside references any of them (per §3).

### Option B — topological order (no CASCADE needed)

If you prefer explicit ordering without `CASCADE`, drop in this sequence (leaves first, roots last). The 6 orphans (no outbound v2 FKs) can come last:

```sql
-- Level 1: dependents of invoices/requests/templates
DROP TABLE public.installments_v2;
DROP TABLE public.transfer_apps_v2;
DROP TABLE public.perm_visa_apps_v2;
DROP TABLE public.exemption_transfers_v2;
DROP TABLE public.wps_payroll_v2;
DROP TABLE public.saudization_records_v2;
DROP TABLE public.gosi_establishments_v2;
DROP TABLE public.invoices_v2;
DROP TABLE public.daily_payments_v2;
DROP TABLE public.audit_log_v2;
DROP TABLE public.notifications_v2;
DROP TABLE public.whatsapp_log_v2;
DROP TABLE public.commercial_records_v2;

-- Level 2: main tables
DROP TABLE public.main_requests_v2;

-- Level 3: entity tables
DROP TABLE public.workers_v2;
DROP TABLE public.facilities_v2;
DROP TABLE public.clients_v2;
DROP TABLE public.agents_v2;
DROP TABLE public.users_v2;

-- Level 4: roots
DROP TABLE public.owners_v2;
DROP TABLE public.offices_v2;
DROP TABLE public.whatsapp_templates_v2;

-- Orphans (no v2-family FKs, any order)
DROP TABLE public.approval_flows_v2;
DROP TABLE public.countries_nationalities_v2;
DROP TABLE public.regions_cities_v2;
DROP TABLE public.service_pricing_v2;
DROP TABLE public.settings_v2;
DROP TABLE public.sms_messages_v2;
DROP TABLE public.whatsapp_groups_v2;
```

Either option is safe — Option A is less code and equally risk-free given §3.

---

## 6. Bottom line

### **SAFE TO DROP WITH CASCADE.**

- **Code-side refs** (prior audit): 0 across all 29 tables.
- **DB-side external refs:** 0 inbound FKs, 0 views, 0 functions.
- **Intra-v2 cascade surface:** 33 FKs + 21 triggers + 232 policies + 41 indexes — all self-contained within the `_v2` family; all auto-removed by `DROP TABLE`.
- **Only data at risk:** 5 rows in `settings_v2`, fully duplicated in the active `system_settings` table (§4). No migration needed.

Nothing is `BLOCKED`. Nothing needs code cleanup first.

### Before you drop (tiny checklist)
1. Confirm no other app/service connects to this Supabase project and reads `_v2` tables (this audit is scoped to DB + this repo).
2. Take a fresh backup / point-in-time-recovery snapshot.
3. Run in a transaction (the SQL above already wraps Option A in `BEGIN/COMMIT`).
