-- The «الملغاة» card dated a cancelled invoice by `coalesce(cancel_log last at,
-- UPDATED_AT)`. Bubble-migrated cancelled invoices have no cancel_log, so any bulk
-- UPDATE that touches updated_at (e.g. the invoices.search_text rebuild on
-- 2026-07-01 11:31Z) drops ALL of them into that day: prod showed 116 phantom
-- cancellations / 501,050 SAR for 2026-07-01 while real cancellations were ZERO.
--
-- Fix (surgical): the no-cancel_log fallback becomes CREATED_AT — never
-- updated_at — so a migrated row can only count in the period it was issued in
-- (mirrors the copyDaySummary fix in InvoicePage.jsx). Everything else is
-- byte-identical to the deployed body (plpgsql SECURITY DEFINER + office/service
-- scope — deployed version had diverged from 20260702000004 in this repo).
-- wa_day_summary embeds this function's output as `stats`, so the WhatsApp bot's
-- day summary (120 phantom / 525,450 for the same day) is fixed by this change.
--
-- Applied via Supabase MCP on sandbox (zqkweecwbsjxseelrirr) then prod
-- (gcvshzutdslmdkwqwteh) on 2026-07-03 — both had identical bodies (md5 ffc82780).

CREATE OR REPLACE FUNCTION public.invoice_period_stats(p_start timestamp with time zone DEFAULT NULL::timestamp with time zone, p_branch_ids uuid[] DEFAULT NULL::uuid[], p_branch_exact uuid DEFAULT NULL::uuid, p_service_type_ids uuid[] DEFAULT NULL::uuid[], p_pay_statuses text[] DEFAULT NULL::text[], p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_amount_min numeric DEFAULT NULL::numeric, p_amount_max numeric DEFAULT NULL::numeric, p_search text DEFAULT NULL::text, p_payment_plan text DEFAULT NULL::text, p_search_field text DEFAULT NULL::text, p_req_status_id uuid DEFAULT NULL::uuid, p_accountant_status text DEFAULT NULL::text, p_agent_id uuid DEFAULT NULL::uuid, p_nationality_id uuid DEFAULT NULL::uuid, p_overdue boolean DEFAULT NULL::boolean, p_branch_exact_ids uuid[] DEFAULT NULL::uuid[], p_req_stages text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_oscope uuid[] := public.current_user_invoice_office_scope();
  v_sscope uuid[] := public.current_user_invoice_service_scope();
  v_office uuid[];
  v_service uuid[];
  v_result jsonb;
begin
  v_office := case
    when v_oscope is null then p_branch_ids
    when p_branch_ids is null then v_oscope
    else array(select unnest(p_branch_ids) intersect select unnest(v_oscope))
  end;
  v_service := case
    when v_sscope is null then p_service_type_ids
    when p_service_type_ids is null then v_sscope
    else array(select unnest(p_service_type_ids) intersect select unnest(v_sscope))
  end;

  with
    mids as (
      select public.invoice_match_ids(
        v_office,
        coalesce(p_branch_exact_ids, case when p_branch_exact is not null then array[p_branch_exact] end),
        v_service, p_pay_statuses, p_from, p_to,
        p_amount_min, p_amount_max, p_payment_plan, p_search, p_search_field,
        p_req_status_id, p_accountant_status, p_agent_id, p_nationality_id, p_overdue, p_req_stages) as id
    ),
    midsp as (
      select public.invoice_match_ids(
        v_office,
        coalesce(p_branch_exact_ids, case when p_branch_exact is not null then array[p_branch_exact] end),
        v_service, p_pay_statuses, null::date, null::date,
        p_amount_min, p_amount_max, p_payment_plan, p_search, p_search_field,
        p_req_status_id, p_accountant_status, p_agent_id, p_nationality_id, p_overdue, p_req_stages) as id
    ),
    pay as (
      select
        coalesce(sum(case when pm.code = 'cash' and p.is_valid and pist.code is distinct from 'cancelled' then p.amount end), 0) as cash_sum,
        count(*) filter (where pm.code = 'cash' and p.is_valid and pist.code is distinct from 'cancelled')                       as cash_cnt,
        coalesce(sum(case when pm.code in ('bank_transfer','pos') and p.is_valid and p.amount > 0 and pist.code is distinct from 'cancelled' then p.amount end), 0) as bank_sum,
        count(*) filter (where pm.code in ('bank_transfer','pos') and p.is_valid and p.amount > 0 and pist.code is distinct from 'cancelled')     as bank_cnt,
        coalesce(sum(case when not p.is_valid then abs(p.amount)
                          when p.amount < 0   then -p.amount
                          else 0 end), 0)                                            as voided_sum,
        count(*) filter (where not p.is_valid or p.amount < 0)                        as voided_cnt
      from payments p
      left join lookup_items pm ON pm.id = p.payment_method_id
      left join invoices       pinv ON pinv.id = p.invoice_id
      left join lookup_items   pist ON pist.id = pinv.status_id
      where p.deleted_at is null
        and (case
               when p_from is not null or p_to is not null then
                 (p_from is null or p.payment_date >= ((p_from::timestamp + interval '5 hours') at time zone 'Asia/Riyadh'))
                 and (p_to is null or p.payment_date < (((p_to + 1)::timestamp + interval '5 hours') at time zone 'Asia/Riyadh'))
               else (p_start is null or p.payment_date >= p_start)
             end)
        and p.invoice_id in (select id from midsp)
    ),
    inv as (
      select
        coalesce(sum(i.paid_amount), 0) as cancelled_sum,
        count(*)                        as cancelled_cnt
      from invoices i
      join lookup_items s ON s.id = i.status_id and s.code = 'cancelled'
      where i.deleted_at is null
        and i.id in (select id from midsp)
        -- cancel moment = last cancel_log entry; rows without cancel_log (Bubble-
        -- migrated) fall back to created_at — NEVER updated_at (bulk updates move it).
        and (case
               when p_from is not null or p_to is not null then
                 (p_from is null or coalesce((i.cancel_log -> -1 ->> 'at')::timestamptz, i.created_at) >= ((p_from::timestamp + interval '5 hours') at time zone 'Asia/Riyadh'))
                 and (p_to is null or coalesce((i.cancel_log -> -1 ->> 'at')::timestamptz, i.created_at) < (((p_to + 1)::timestamp + interval '5 hours') at time zone 'Asia/Riyadh'))
               else (p_start is null or coalesce((i.cancel_log -> -1 ->> 'at')::timestamptz, i.created_at) >= p_start)
             end)
    ),
    svc as (
      select coalesce(jsonb_agg(jsonb_build_object('code', code, 'cnt', cnt, 'sum', total) order by cnt desc), '[]'::jsonb) as items
      from (
        select coalesce(st.code, 'general') as code,
               sum(case when st.code in ('work_visa','work_visa_permanent','work_visa_temporary')
                          then coalesce(nullif(va.n, 0), sr.quantity, 0)
                          else 1 end) as cnt,
               coalesce(sum(i.total_amount), 0) as total
        from invoices i
        left join lookup_items st     ON st.id = i.service_type_id
        left join lookup_items sstat  ON sstat.id = i.status_id
        left join service_requests sr ON sr.id = i.service_request_id
        left join lateral (
          select count(*) as n from visa_applications va
          where va.service_request_id = sr.id and va.deleted_at is null
        ) va ON true
        where i.deleted_at is null
          and (('cancelled' = any(p_pay_statuses)) or sstat.code is distinct from 'cancelled')
          and (p_start is null or coalesce(sr.request_date, i.created_at) >= p_start)
          and i.id in (select id from mids)
        group by coalesce(st.code, 'general')
      ) g
    )
  select jsonb_build_object(
    'cash',      jsonb_build_object('cnt', pay.cash_cnt,      'sum', pay.cash_sum),
    'bank',      jsonb_build_object('cnt', pay.bank_cnt,      'sum', pay.bank_sum),
    'voided',    jsonb_build_object('cnt', pay.voided_cnt,    'sum', pay.voided_sum),
    'cancelled', jsonb_build_object('cnt', inv.cancelled_cnt, 'sum', inv.cancelled_sum),
    'services',  svc.items
  ) into v_result
  from pay, inv, svc;

  return v_result;
end$function$;

NOTIFY pgrst, 'reload schema';
