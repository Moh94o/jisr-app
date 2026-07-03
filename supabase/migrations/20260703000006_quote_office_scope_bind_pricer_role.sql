-- Durable office-binding for quote pages, mirroring current_user_invoice_office_scope().
-- Office-bound roles (منشىء فواتير, مسعر) are ALWAYS capped to their own office(s)
-- (users.branch_ids + primary_branch_id) for viewing quotes, regardless of how their
-- role grant was assigned (even an all-branches grant). This makes the pricer role
-- office-bound by design — a new مسعر is auto-restricted with no per-user tuning.
-- Returns NULL = unrestricted (super admin / all-branches non-bound roles),
--         uuid[] = the offices whose quotes the user may see (branchless rows excluded),
--         empty  = no own office → falls through to the grant model (never lock out).
CREATE OR REPLACE FUNCTION public.current_user_quote_offices(p_module text)
RETURNS uuid[]
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_user uuid := public.current_app_user_id(); v_bound boolean; v_own uuid[]; v_m uuid[]; v_i uuid[];
begin
  if v_user is null then return array[]::uuid[]; end if;
  if public.current_user_is_super_admin() then return null; end if;
  -- office-bound roles: own offices, regardless of grant
  select exists(
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
     where ur.user_id = v_user and r.name_ar in ('منشىء فواتير', 'مسعر')
  ) into v_bound;
  if v_bound then
    select array_agg(distinct b) into v_own
      from public.users u,
           lateral unnest(coalesce(u.branch_ids, '{}'::uuid[])
             || case when u.primary_branch_id is not null then array[u.primary_branch_id] else '{}'::uuid[] end) b
     where u.id = v_user;
    if v_own is not null and array_length(v_own, 1) is not null then
      return v_own;
    end if;
    -- no assigned office → fall through (never lock out)
  end if;
  v_m := public.current_user_perm_branches(p_module, 'view');
  v_i := public.current_user_perm_branches('invoices', 'view');
  if v_m is null or v_i is null then return null; end if;   -- unrestricted somewhere
  return array(select distinct unnest(coalesce(v_m, '{}'::uuid[]) || coalesce(v_i, '{}'::uuid[])));
end$function$;

DROP POLICY IF EXISTS tc_select_authenticated ON public.transfer_calculation;
CREATE POLICY tc_select_authenticated ON public.transfer_calculation
  FOR SELECT
  USING (
    current_user_is_super_admin()
    OR current_user_quote_offices('quotations') IS NULL
    OR branch_id = ANY (current_user_quote_offices('quotations'))
    OR (invoice_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.invoices i WHERE i.id = transfer_calculation.invoice_id))
  );

DROP POLICY IF EXISTS irc_select ON public.iqama_renewal_calculation;
CREATE POLICY irc_select ON public.iqama_renewal_calculation
  FOR SELECT
  USING (
    current_user_is_super_admin()
    OR current_user_quote_offices('renewal_calc') IS NULL
    OR branch_id = ANY (current_user_quote_offices('renewal_calc'))
    OR (invoice_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.invoices i WHERE i.id = iqama_renewal_calculation.invoice_id))
  );
