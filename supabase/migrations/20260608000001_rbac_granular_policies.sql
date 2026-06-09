-- ============================================================
-- Align RLS write/read policies with the granular permission
-- system (v_user_effective_permissions) on the core business
-- tables. Previously: SELECT = any authenticated, write = GM-only,
-- which ignored the per-user permission toggles entirely.
--
-- Model now (super admin / المدير العام bypasses via
-- current_user_is_super_admin()):
--   write  -> current_user_has_permission('<module>.<action>')
--   read   -> current_user_has_permission('<module>.view'),
--             with "related-access" escape hatches so deeply
--             embedded rows (client/agent/worker/payment shown on
--             the invoice screen) stay visible to invoice viewers.
--
-- Reference / widely-embedded tables (branches, persons,
-- nationalities, regions, cities, roles, lookups, users,
-- service_requests, transfer_calculation, …) are intentionally
-- left untouched to avoid breaking cross-table joins.
-- ============================================================

-- ---------- facilities (module: facilities) ----------
drop policy if exists facilities_select_authenticated on public.facilities;
drop policy if exists facilities_insert_priv on public.facilities;
drop policy if exists facilities_update_priv on public.facilities;
drop policy if exists facilities_delete_priv on public.facilities;

create policy facilities_select on public.facilities for select to authenticated
  using (current_user_is_super_admin() or current_user_has_permission('facilities.view'));
create policy facilities_insert on public.facilities for insert to authenticated
  with check (current_user_is_super_admin() or current_user_has_permission('facilities.create'));
create policy facilities_update on public.facilities for update to authenticated
  using (current_user_is_super_admin() or current_user_has_permission('facilities.edit'))
  with check (current_user_is_super_admin() or current_user_has_permission('facilities.edit'));
create policy facilities_delete on public.facilities for delete to authenticated
  using (current_user_is_super_admin() or current_user_has_permission('facilities.delete'));

-- ---------- workers (module: workers) ----------
-- read escape hatch: workers are embedded on the invoice screen
drop policy if exists workers_select_authenticated on public.workers;
drop policy if exists workers_insert_priv on public.workers;
drop policy if exists workers_update_priv on public.workers;
drop policy if exists workers_delete_priv on public.workers;

create policy workers_select on public.workers for select to authenticated
  using (current_user_is_super_admin() or current_user_has_permission('workers.view')
         or current_user_has_permission('invoices.view') or current_user_has_permission('quotations.view'));
create policy workers_insert on public.workers for insert to authenticated
  with check (current_user_is_super_admin() or current_user_has_permission('workers.create'));
create policy workers_update on public.workers for update to authenticated
  using (current_user_is_super_admin() or current_user_has_permission('workers.edit'))
  with check (current_user_is_super_admin() or current_user_has_permission('workers.edit'));
create policy workers_delete on public.workers for delete to authenticated
  using (current_user_is_super_admin() or current_user_has_permission('workers.delete'));

-- ---------- invoices (module: invoices) ----------
-- read escape hatch: invoice logs appear on client/agent detail pages
drop policy if exists invoices_select_authenticated on public.invoices;
drop policy if exists invoices_insert_priv on public.invoices;
drop policy if exists invoices_update_priv on public.invoices;
drop policy if exists invoices_delete_priv on public.invoices;

create policy invoices_select on public.invoices for select to authenticated
  using (current_user_is_super_admin() or current_user_has_permission('invoices.view')
         or current_user_has_permission('admin_clients.view') or current_user_has_permission('admin_agents.view'));
create policy invoices_insert on public.invoices for insert to authenticated
  with check (current_user_is_super_admin() or current_user_has_permission('invoices.create'));
create policy invoices_update on public.invoices for update to authenticated
  using (current_user_is_super_admin() or current_user_has_permission('invoices.edit'))
  with check (current_user_is_super_admin() or current_user_has_permission('invoices.edit'));
create policy invoices_delete on public.invoices for delete to authenticated
  using (current_user_is_super_admin() or current_user_has_permission('invoices.delete'));

-- ---------- clients (module: admin_clients) ----------
-- read escape hatch: clients are embedded on the invoice screen
drop policy if exists clients_select_authenticated on public.clients;
drop policy if exists clients_insert_priv on public.clients;
drop policy if exists clients_update_priv on public.clients;
drop policy if exists clients_delete_priv on public.clients;

create policy clients_select on public.clients for select to authenticated
  using (current_user_is_super_admin() or current_user_has_permission('admin_clients.view')
         or current_user_has_permission('invoices.view') or current_user_has_permission('quotations.view'));
create policy clients_insert on public.clients for insert to authenticated
  with check (current_user_is_super_admin() or current_user_has_permission('admin_clients.create'));
create policy clients_update on public.clients for update to authenticated
  using (current_user_is_super_admin() or current_user_has_permission('admin_clients.edit'))
  with check (current_user_is_super_admin() or current_user_has_permission('admin_clients.edit'));
create policy clients_delete on public.clients for delete to authenticated
  using (current_user_is_super_admin());

-- ---------- agents (module: admin_agents) ----------
-- read escape hatch: agents are embedded on the invoice screen
drop policy if exists agents_select_authenticated on public.agents;
drop policy if exists agents_insert_priv on public.agents;
drop policy if exists agents_update_priv on public.agents;
drop policy if exists agents_delete_priv on public.agents;

create policy agents_select on public.agents for select to authenticated
  using (current_user_is_super_admin() or current_user_has_permission('admin_agents.view')
         or current_user_has_permission('invoices.view') or current_user_has_permission('quotations.view'));
create policy agents_insert on public.agents for insert to authenticated
  with check (current_user_is_super_admin() or current_user_has_permission('admin_agents.create'));
create policy agents_update on public.agents for update to authenticated
  using (current_user_is_super_admin() or current_user_has_permission('admin_agents.edit'))
  with check (current_user_is_super_admin() or current_user_has_permission('admin_agents.edit'));
create policy agents_delete on public.agents for delete to authenticated
  using (current_user_is_super_admin());

-- ---------- payments (actions live under module: invoices) ----------
-- read escape hatch: payments are embedded on the invoice screen
drop policy if exists payments_select_authenticated on public.payments;
drop policy if exists payments_insert_priv on public.payments;
drop policy if exists payments_update_priv on public.payments;
drop policy if exists payments_delete_priv on public.payments;

create policy payments_select on public.payments for select to authenticated
  using (current_user_is_super_admin() or current_user_has_permission('payments.view')
         or current_user_has_permission('invoices.view'));
create policy payments_insert on public.payments for insert to authenticated
  with check (current_user_is_super_admin() or current_user_has_permission('invoices.record_payment')
         or current_user_has_permission('invoices.edit'));
create policy payments_update on public.payments for update to authenticated
  using (current_user_is_super_admin() or current_user_has_permission('invoices.record_payment')
         or current_user_has_permission('invoices.refund') or current_user_has_permission('invoices.edit'))
  with check (current_user_is_super_admin() or current_user_has_permission('invoices.record_payment')
         or current_user_has_permission('invoices.refund') or current_user_has_permission('invoices.edit'));
create policy payments_delete on public.payments for delete to authenticated
  using (current_user_is_super_admin());

-- ---------- deposits + children (module: deposits) ----------
drop policy if exists deposits_select on public.deposits;
drop policy if exists deposits_insert on public.deposits;
drop policy if exists deposits_update on public.deposits;
drop policy if exists deposits_delete on public.deposits;

create policy deposits_select on public.deposits for select to authenticated
  using (current_user_is_super_admin() or current_user_has_permission('deposits.view'));
create policy deposits_insert on public.deposits for insert to authenticated
  with check (current_user_is_super_admin() or current_user_has_permission('deposits.create'));
create policy deposits_update on public.deposits for update to authenticated
  using (current_user_is_super_admin() or current_user_has_permission('deposits.edit'))
  with check (current_user_is_super_admin() or current_user_has_permission('deposits.edit'));
create policy deposits_delete on public.deposits for delete to authenticated
  using (current_user_is_super_admin());

do $$
declare t text;
begin
  foreach t in array array['deposit_payments','deposit_notes','deposit_references'] loop
    execute format('drop policy if exists %I on public.%I', t||'_select', t);
    execute format('drop policy if exists %I on public.%I', t||'_insert', t);
    execute format('drop policy if exists %I on public.%I', t||'_update', t);
    execute format('drop policy if exists %I on public.%I', t||'_delete', t);
    execute format($f$create policy %I on public.%I for select to authenticated
      using (current_user_is_super_admin() or current_user_has_permission('deposits.view'))$f$, t||'_select', t);
    execute format($f$create policy %I on public.%I for insert to authenticated
      with check (current_user_is_super_admin() or current_user_has_permission('deposits.create') or current_user_has_permission('deposits.edit'))$f$, t||'_insert', t);
    execute format($f$create policy %I on public.%I for update to authenticated
      using (current_user_is_super_admin() or current_user_has_permission('deposits.edit'))
      with check (current_user_is_super_admin() or current_user_has_permission('deposits.edit'))$f$, t||'_update', t);
    execute format($f$create policy %I on public.%I for delete to authenticated
      using (current_user_is_super_admin())$f$, t||'_delete', t);
  end loop;
end $$;
