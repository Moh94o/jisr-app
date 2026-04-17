# _v2 Tables — Code Reference Audit

**Date:** 2026-04-17
**Repo:** Moh94o/jisr-app (worktree `goofy-tharp-d4e8a4`, branch `claude/goofy-tharp-d4e8a4`)
**Scope:** 29 `_v2` suffixed Supabase tables

## Summary
- Total tables checked: **29**
- Tables with ZERO references: **29**
- Tables with passive references only: **0**
- Tables with ACTIVE code references: **0**

**All 29 tables have zero references anywhere in the codebase** — no imports, no Supabase queries, no type usage, no comments, no documentation. The only `_v2` string found in the entire project is a filename reference to `migration_v2.sql` (a past migration file), and that refers to the filename — not any of the 29 audited tables.

## Locations searched

| Path | Exists? | Notes |
|---|---|---|
| `src/` | ✓ | React/JS source (main code) |
| `sql/` | ✓ | Contains `migration_v2.sql`, `migration_v3_features.sql` |
| `public/` | ✓ | Static assets |
| `dist/` | ✓ | Vite build output — searched for completeness |
| `.claude/` | ✓ | Claude Code config |
| `.env` | ✓ | Env file |
| `package.json`, `vite.config.js`, `netlify.toml`, `index.html`, `CLAUDE.md` | ✓ | Root config |
| `docs/` | ✗ | Does not exist (created by this audit) |
| `supabase/` (migrations, functions, seed) | ✗ | Does not exist — Supabase CLI/migrations folder not present in repo |
| `.env.example` | ✗ | Not present |

`node_modules/`, `.git/`, and lockfiles excluded from all searches.

## Search methodology

Two passes, both with ripgrep via the Grep tool:

1. **Per-name alternation search** — a single word-bounded regex with all 29 table names joined by `|`, run against `src/`, `sql/`, `public/`, and `.claude/`. Word boundaries (`\b...\b`) prevent substring-only matches.
2. **Broad `_v2` sweep** — grep for any `_v2` occurrence across the project, to catch dynamic string construction (e.g. `` `${base}_v2` ``), typos, or comments missed by the word-bounded pass.

---

## Per-table findings

For every one of the 29 tables below, the per-table search returned **zero hits** across `src/`, `sql/`, `public/`, `.claude/`, `dist/`, and all root config files.

### agents_v2
- **Active refs:** 0
- **Passive refs:** 0
- **Files:** —

### approval_flows_v2
- **Active refs:** 0
- **Passive refs:** 0
- **Files:** —

### audit_log_v2
- **Active refs:** 0
- **Passive refs:** 0
- **Files:** —

### clients_v2
- **Active refs:** 0
- **Passive refs:** 0
- **Files:** —

### commercial_records_v2
- **Active refs:** 0
- **Passive refs:** 0
- **Files:** —

### countries_nationalities_v2
- **Active refs:** 0
- **Passive refs:** 0
- **Files:** —

### daily_payments_v2
- **Active refs:** 0
- **Passive refs:** 0
- **Files:** —

### exemption_transfers_v2
- **Active refs:** 0
- **Passive refs:** 0
- **Files:** —

### facilities_v2
- **Active refs:** 0
- **Passive refs:** 0
- **Files:** —

### gosi_establishments_v2
- **Active refs:** 0
- **Passive refs:** 0
- **Files:** —

### installments_v2
- **Active refs:** 0
- **Passive refs:** 0
- **Files:** —

### invoices_v2
- **Active refs:** 0
- **Passive refs:** 0
- **Files:** —

### main_requests_v2
- **Active refs:** 0
- **Passive refs:** 0
- **Files:** —

### notifications_v2
- **Active refs:** 0
- **Passive refs:** 0
- **Files:** —

### offices_v2
- **Active refs:** 0
- **Passive refs:** 0
- **Files:** —

### owners_v2
- **Active refs:** 0
- **Passive refs:** 0
- **Files:** —

### perm_visa_apps_v2
- **Active refs:** 0
- **Passive refs:** 0
- **Files:** —

### regions_cities_v2
- **Active refs:** 0
- **Passive refs:** 0
- **Files:** —

### saudization_records_v2
- **Active refs:** 0
- **Passive refs:** 0
- **Files:** —

### service_pricing_v2
- **Active refs:** 0
- **Passive refs:** 0
- **Files:** —

### settings_v2
- **Active refs:** 0
- **Passive refs:** 0
- **Files:** —

### sms_messages_v2
- **Active refs:** 0
- **Passive refs:** 0
- **Files:** —

### transfer_apps_v2
- **Active refs:** 0
- **Passive refs:** 0
- **Files:** —

### users_v2
- **Active refs:** 0
- **Passive refs:** 0
- **Files:** —

### whatsapp_groups_v2
- **Active refs:** 0
- **Passive refs:** 0
- **Files:** —

### whatsapp_log_v2
- **Active refs:** 0
- **Passive refs:** 0
- **Files:** —

### whatsapp_templates_v2
- **Active refs:** 0
- **Passive refs:** 0
- **Files:** —

### workers_v2
- **Active refs:** 0
- **Passive refs:** 0
- **Files:** —

### wps_payroll_v2
- **Active refs:** 0
- **Passive refs:** 0
- **Files:** —

---

## Broad `_v2` sweep (anything missed above)

Single hit in the entire project (excluding `node_modules`):

| File | Line | Snippet | Classification |
|---|---|---|---|
| `sql/migration_v3_features.sql` | 3 | `-- Run this in Supabase SQL Editor AFTER migration_v2.sql` | **Passive** — comment referencing the **filename** `migration_v2.sql`, not any `_v2` table. Not one of the 29 audited tables. |

Additional hits in `node_modules/@types/node/sqlite.d.ts` (`sqlite3_close_v2`, `sqlite3_create_function_v2`) are unrelated — they are SQLite C API function names in third-party type defs, not table references.

**No dynamic construction detected.** No occurrences of patterns like `` `${x}_v2` ``, `x + '_v2'`, or `'_v2'` string literals anywhere in source code.

---

## Bottom line

### Safe to drop from a code perspective (all 29)

All 29 tables have zero code references — no imports, no `.from('<name>')` Supabase calls, no TS types, no docs, no comments, no dynamic construction. From the code side, every one of the following can be dropped without breaking anything in this repo:

```
agents_v2                    gosi_establishments_v2       settings_v2
approval_flows_v2            installments_v2              sms_messages_v2
audit_log_v2                 invoices_v2                  transfer_apps_v2
clients_v2                   main_requests_v2             users_v2
commercial_records_v2        notifications_v2             whatsapp_groups_v2
countries_nationalities_v2   offices_v2                   whatsapp_log_v2
daily_payments_v2            owners_v2                    whatsapp_templates_v2
exemption_transfers_v2       perm_visa_apps_v2            workers_v2
facilities_v2                regions_cities_v2            wps_payroll_v2
                             saudization_records_v2
                             service_pricing_v2
```

### Tables needing code cleanup first

None.

### Caveats (not a code issue, but worth checking before dropping)

This audit only verifies that **this Git repo's code** has no references. It does **not** verify:

- Supabase Database Functions / triggers / RLS policies / views written inside Supabase itself (not checked in this repo)
- Supabase Edge Functions deployed remotely (no `supabase/functions/` in repo)
- Any other application or service that connects to the same Supabase project
- Data value — dropping tables deletes their rows; this audit makes no claim about whether the data is still needed

Before running `DROP TABLE`, you should also verify no DB-side objects (functions/triggers/views/policies) reference them — that can't be answered from code alone.
