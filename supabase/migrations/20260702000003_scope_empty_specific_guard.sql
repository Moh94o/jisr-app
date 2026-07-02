-- Guard against the "restrict-to-nothing" misconfiguration in invoice scopes.
-- An empty `specific` list (mode='specific', ids=[]) previously resolved to an
-- empty uuid[] which locked the user out of every invoice (SELECT) and every
-- create (office scope) — e.g. a "منشئ فواتير" assigned an office but with the
-- service scope accidentally left as specific+empty saw zero invoices.
-- Fix: treat an empty specific list as "no restriction":
--   • service scope  → NULL (all service types)
--   • office scope   → fall back to the role-granted branches (inherit)

CREATE OR REPLACE FUNCTION public.current_user_invoice_service_scope()
 RETURNS uuid[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_user uuid := public.current_app_user_id(); v_vis jsonb; v_pol jsonb; v_ids uuid[];
begin
  if v_user is null or public.current_user_is_super_admin() then return null; end if;
  select ui_visibility into v_vis from public.users where id = v_user;
  v_pol := v_vis -> 'svc:invoices';
  if coalesce(v_pol ->> 'mode', 'all') <> 'specific' then return null; end if;
  select array_agg(x::uuid) into v_ids from jsonb_array_elements_text(coalesce(v_pol -> 'ids', '[]'::jsonb)) x;
  -- empty specific list = restrict-to-nothing misconfig ⇒ treat as no restriction
  if v_ids is null or array_length(v_ids,1) is null then return null; end if;
  return v_ids;
end$function$;

CREATE OR REPLACE FUNCTION public.current_user_invoice_office_scope()
 RETURNS uuid[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_user uuid := public.current_app_user_id(); v_vis jsonb; v_pol jsonb; v_mode text; v_ids uuid[];
begin
  if v_user is null or public.current_user_is_super_admin() then return null; end if;
  select ui_visibility into v_vis from public.users where id = v_user;
  v_pol := v_vis -> 'office:invoices'; v_mode := coalesce(v_pol ->> 'mode', 'inherit');
  if v_mode = 'all' then return null; end if;
  if v_mode = 'specific' then
    select array_agg(x::uuid) into v_ids from jsonb_array_elements_text(coalesce(v_pol -> 'ids', '[]'::jsonb)) x;
    -- empty specific list = misconfig ⇒ fall back to role-granted branches (inherit)
    if v_ids is not null and array_length(v_ids,1) is not null then return v_ids; end if;
  end if;
  return public.current_user_perm_branches('invoices','view');
end$function$;
