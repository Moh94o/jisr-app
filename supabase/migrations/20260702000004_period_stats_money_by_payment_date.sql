-- Financial stat cards (نقد / تحويلات بنكية / مرتجع) should reflect the money
-- ACTUALLY RECEIVED within the selected date range — by PAYMENT date — including
-- payments made on invoices issued on earlier days. Previously the date filter
-- (p_from/p_to) matched invoice issue date only, so collections on older invoices
-- were dropped from the cash/bank cards (mismatch vs the WhatsApp day summary).
--
-- Fix: keep services + invoice counts filtered by invoice issue date (`mids`),
-- but compute the payment cards from a date-free invoice set (`midsp` = same
-- branch/service/etc. filters, NO issue-date filter) intersected with a
-- PAYMENT-date window. Default (today, p_start given) behaviour is unchanged.

CREATE OR REPLACE FUNCTION public.invoice_period_stats(
  p_start timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_branch_ids uuid[] DEFAULT NULL::uuid[],
  p_branch_exact uuid DEFAULT NULL::uuid,
  p_service_type_ids uuid[] DEFAULT NULL::uuid[],
  p_pay_statuses text[] DEFAULT NULL::text[],
  p_from date DEFAULT NULL::date,
  p_to date DEFAULT NULL::date,
  p_amount_min numeric DEFAULT NULL::numeric,
  p_amount_max numeric DEFAULT NULL::numeric,
  p_search text DEFAULT NULL::text,
  p_payment_plan text DEFAULT NULL::text,
  p_search_field text DEFAULT NULL::text,
  p_req_status_id uuid DEFAULT NULL::uuid,
  p_accountant_status text DEFAULT NULL::text,
  p_agent_id uuid DEFAULT NULL::uuid,
  p_nationality_id uuid DEFAULT NULL::uuid,
  p_overdue boolean DEFAULT NULL::boolean,
  p_branch_exact_ids uuid[] DEFAULT NULL::uuid[],
  p_req_stages text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  with
    -- invoices matching ALL filters incl. issue-date range → services + counts
    mids as (
      select public.invoice_match_ids(
        p_branch_ids,
        coalesce(p_branch_exact_ids, case when p_branch_exact is not null then array[p_branch_exact] end),
        p_service_type_ids, p_pay_statuses, p_from, p_to,
        p_amount_min, p_amount_max, p_payment_plan, p_search, p_search_field,
        p_req_status_id, p_accountant_status, p_agent_id, p_nationality_id, p_overdue, p_req_stages) as id
    ),
    -- same filters but WITHOUT the issue-date range → basis for money-received cards
    midsp as (
      select public.invoice_match_ids(
        p_branch_ids,
        coalesce(p_branch_exact_ids, case when p_branch_exact is not null then array[p_branch_exact] end),
        p_service_type_ids, p_pay_statuses, null::date, null::date,
        p_amount_min, p_amount_max, p_payment_plan, p_search, p_search_field,
        p_req_status_id, p_accountant_status, p_agent_id, p_nationality_id, p_overdue, p_req_stages) as id
    ),
    pay as (
      select
        coalesce(sum(case when pm.code = 'cash' and p.is_valid then p.amount end), 0) as cash_sum,
        count(*) filter (where pm.code = 'cash' and p.is_valid)                       as cash_cnt,
        coalesce(sum(case when pm.code in ('bank_transfer','pos') and p.is_valid and p.amount > 0 then p.amount end), 0) as bank_sum,
        count(*) filter (where pm.code in ('bank_transfer','pos') and p.is_valid and p.amount > 0)     as bank_cnt,
        coalesce(sum(case when not p.is_valid then abs(p.amount)
                          when p.amount < 0   then -p.amount
                          else 0 end), 0)                                            as voided_sum,
        count(*) filter (where not p.is_valid or p.amount < 0)                        as voided_cnt
      from payments p
      left join lookup_items pm ON pm.id = p.payment_method_id
      left join invoices       pinv ON pinv.id = p.invoice_id
      left join lookup_items   pist ON pist.id = pinv.status_id
      where p.deleted_at is null
        and (('cancelled' = any(p_pay_statuses)) or pist.code is distinct from 'cancelled')
        -- money received in range: by PAYMENT date when a date filter is set,
        -- otherwise fall back to p_start (default «today») behaviour.
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
        coalesce(sum(case when s.code = 'cancelled' then i.paid_amount end), 0) as cancelled_sum,
        count(*) filter (where s.code = 'cancelled')                            as cancelled_cnt
      from invoices i
      left join lookup_items s        ON s.id  = i.status_id
      left join service_requests sr   ON sr.id = i.service_request_id
      where i.deleted_at is null
        and (p_start is null or coalesce(sr.request_date, i.created_at) >= p_start)
        and i.id in (select id from mids)
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
  )
  from pay, inv, svc;
$function$;
