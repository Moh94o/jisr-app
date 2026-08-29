-- Fix: invoices inserted while already inside another trigger (pg_trigger_depth() >= 1)
-- silently skipped search_text population, leaving it NULL and thus invisible to the
-- invoice search RPC (position(pattern in NULL) never matches). Browsing was unaffected.
--
-- Proof of root cause: affected invoices still received wa_outbox rows, so the sibling
-- AFTER INSERT trigger wa_invoices_aiu (no WHEN clause) fired; only the depth-guarded
-- tg_inv_search_self (WHEN pg_trigger_depth() = 0) was skipped.
--
-- Fix: fire the fill trigger at ANY depth; prevent infinite recursion with a value guard
-- in the refresh (the recursive self-UPDATE touches 0 rows once search_text already
-- equals the freshly built value, so it terminates at depth 2).
--
-- Applied to production (gcvshzutdslmdkwqwteh) via Supabase migration
-- `invoice_search_text_depth_independent`. NOT applied to sandbox (jisr-dev) — that
-- environment uses a different search architecture with no search_text column.

create or replace function public.inv_refresh_search_one(p_id uuid)
returns void
language plpgsql
as $fn$
declare v text;
begin
  v := public.invoice_build_search_text(p_id);
  -- value guard: skip when unchanged -> the recursive self-UPDATE affects 0 rows and stops
  update public.invoices
     set search_text = v
   where id = p_id
     and search_text is distinct from v;
exception when others then null;
end $fn$;

drop trigger if exists tg_inv_search_self on public.invoices;
create trigger tg_inv_search_self
  after insert or update on public.invoices
  for each row
  execute function public.trg_inv_search_self();

-- One-time backfill of any rows the old guard left NULL (idempotent).
update public.invoices
   set search_text = public.invoice_build_search_text(id)
 where search_text is null;
