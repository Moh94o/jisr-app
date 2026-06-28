-- ============================================================
-- Transaction-chain RLS: permission-based INSERT/UPDATE
-- ------------------------------------------------------------
-- The RBAC granular-policies pass left the service-request
-- transaction chain on a *placeholder* "GM / super-admin only"
-- policy, while invoices/clients/workers/payments were already
-- converted to granular permission checks. Result: a non-GM user
-- with invoices.create (who CAN reach the «إصدار الفاتورة» button)
-- was blocked at the very first write — INSERT into service_requests
-- — with: new row violates row-level security policy.
--
-- This aligns the whole issue/edit-invoice chain with the invoices
-- table itself:
--   INSERT  -> super_admin OR invoices.create
--   UPDATE  -> super_admin OR invoices.edit
-- ============================================================

do $$
declare
  t text;
  txn_tables text[] := array[
    'service_requests',
    'service_request_agents',
    'visa_applications',
    'transfer_applications',
    'transfer_application_fees',
    'ajeer_applications',
    'iqama_renewal_applications',
    'iqama_issuance_applications',
    'other_applications',
    'supplier_payroll_applications',
    'installments',
    'transaction_fees'
  ];
begin
  foreach t in array txn_tables loop
    -- INSERT
    execute format('drop policy if exists %I on public.%I', t || '_insert_priv', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated '
      || 'with check (current_user_is_super_admin() OR current_user_has_permission(''invoices.create''))',
      t || '_insert_priv', t);

    -- UPDATE
    execute format('drop policy if exists %I on public.%I', t || '_update_priv', t);
    execute format(
      'create policy %I on public.%I for update to authenticated '
      || 'using (current_user_is_super_admin() OR current_user_has_permission(''invoices.edit'')) '
      || 'with check (current_user_is_super_admin() OR current_user_has_permission(''invoices.edit''))',
      t || '_update_priv', t);
  end loop;
end $$;
