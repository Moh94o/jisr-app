-- (1) Tighten iqama_renewal_calculation RLS (replace the wide-open
-- irc_all_authenticated with granular permission policies; mirrors transfer_calculation).
-- The invoice transition (ServiceRequestPage, status→invoiced) stays allowed via invoices.create/edit.
drop policy if exists irc_all_authenticated on public.iqama_renewal_calculation;
drop policy if exists irc_service_write on public.iqama_renewal_calculation;
drop policy if exists irc_select on public.iqama_renewal_calculation;
drop policy if exists irc_insert on public.iqama_renewal_calculation;
drop policy if exists irc_update on public.iqama_renewal_calculation;
drop policy if exists irc_delete on public.iqama_renewal_calculation;
create policy irc_service_write on public.iqama_renewal_calculation for all to service_role using (true) with check (true);
create policy irc_select on public.iqama_renewal_calculation for select to authenticated
  using (current_user_is_super_admin() or current_user_has_permission('renewal_calc.view') or current_user_has_permission('invoices.view'));
create policy irc_insert on public.iqama_renewal_calculation for insert to authenticated
  with check (current_user_is_super_admin() or current_user_has_permission('renewal_calc.create'));
create policy irc_update on public.iqama_renewal_calculation for update to authenticated
  using (current_user_is_super_admin() or current_user_has_permission('renewal_calc.edit') or current_user_has_permission('renewal_calc.price') or current_user_has_permission('renewal_calc.approve') or current_user_has_permission('renewal_calc.invoice') or current_user_has_permission('invoices.create') or current_user_has_permission('invoices.edit'))
  with check (current_user_is_super_admin() or current_user_has_permission('renewal_calc.edit') or current_user_has_permission('renewal_calc.price') or current_user_has_permission('renewal_calc.approve') or current_user_has_permission('renewal_calc.invoice') or current_user_has_permission('invoices.create') or current_user_has_permission('invoices.edit'));
create policy irc_delete on public.iqama_renewal_calculation for delete to authenticated
  using (current_user_is_super_admin());

-- (2) Per-user invoice OFFICE + SERVICE-TYPE scope (mirrors lib/permissions.js
-- tabOffices / tabServiceTypes), enforced server-side so the list/stats RPCs
-- (SECURITY INVOKER) and any direct read are scoped and bypass-proof.
create or replace function public.current_user_invoice_office_scope()
returns uuid[] language plpgsql stable security definer set search_path = public as $$
declare v_user uuid := public.current_app_user_id(); v_vis jsonb; v_pol jsonb; v_mode text; v_ids uuid[];
begin
  if v_user is null or public.current_user_is_super_admin() then return null; end if;
  select ui_visibility into v_vis from public.users where id = v_user;
  v_pol := v_vis -> 'office:invoices'; v_mode := coalesce(v_pol ->> 'mode', 'inherit');
  if v_mode = 'all' then return null; end if;
  if v_mode = 'specific' then
    select array_agg(x::uuid) into v_ids from jsonb_array_elements_text(coalesce(v_pol -> 'ids', '[]'::jsonb)) x;
    return coalesce(v_ids, array[]::uuid[]);
  end if;
  select coalesce(branch_ids, case when primary_branch_id is not null then array[primary_branch_id] else array[]::uuid[] end)
    into v_ids from public.users where id = v_user;
  return coalesce(v_ids, array[]::uuid[]);
end$$;
create or replace function public.current_user_invoice_service_scope()
returns uuid[] language plpgsql stable security definer set search_path = public as $$
declare v_user uuid := public.current_app_user_id(); v_vis jsonb; v_pol jsonb; v_ids uuid[];
begin
  if v_user is null or public.current_user_is_super_admin() then return null; end if;
  select ui_visibility into v_vis from public.users where id = v_user;
  v_pol := v_vis -> 'svc:invoices';
  if coalesce(v_pol ->> 'mode', 'all') <> 'specific' then return null; end if;
  select array_agg(x::uuid) into v_ids from jsonb_array_elements_text(coalesce(v_pol -> 'ids', '[]'::jsonb)) x;
  return coalesce(v_ids, array[]::uuid[]);
end$$;
grant execute on function public.current_user_invoice_office_scope() to authenticated;
grant execute on function public.current_user_invoice_service_scope() to authenticated;

-- (3) Rebuild invoices_select: invoice-page viewers (invoices.view) scoped to
-- allowed offices + service types; admin_clients/admin_agents escape hatches
-- (invoice logs on those detail pages) stay unscoped, as before.
drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices for select to authenticated
using (
  current_user_is_super_admin()
  or current_user_has_permission('admin_clients.view')
  or current_user_has_permission('admin_agents.view')
  or (
    current_user_has_permission('invoices.view')
    and (public.current_user_invoice_office_scope() is null or branch_id = any(public.current_user_invoice_office_scope()))
    and (public.current_user_invoice_service_scope() is null
         or exists (select 1 from public.service_requests sr
                    where sr.id = public.invoices.service_request_id
                      and sr.service_type_id = any(public.current_user_invoice_service_scope())))
  )
);
