-- The invoice LIST (search_invoice_ids) previously filtered the date range on
-- invoice ISSUE date only (via invoice_match_ids p_from/p_to = created_at), so an
-- invoice issued on an earlier day but PAID / REFUNDED / CANCELLED within the
-- selected range never appeared in the list — even though the stat cards
-- (invoice_period_stats, money-by-payment-date) counted it. Mismatch.
--
-- Fix: move the date window out of invoice_match_ids for the list path and match
-- on ANY activity in range: issued OR a payment/refund/void by payment_date OR
-- cancelled (cancel day = last_activity_at). invoice_match_ids and
-- invoice_period_stats are left UNCHANGED, so the cards keep their exact meaning.
-- last_activity_at already reflects payment/cancel activity, so the client-side
-- day grouping places these invoices under their activity day automatically.

CREATE OR REPLACE FUNCTION public.search_invoice_ids(
  p_branch_ids uuid[] DEFAULT NULL::uuid[], p_branch_exact_ids uuid[] DEFAULT NULL::uuid[],
  p_service_type_ids uuid[] DEFAULT NULL::uuid[], p_pay_statuses text[] DEFAULT NULL::text[],
  p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date,
  p_amount_min numeric DEFAULT NULL::numeric, p_amount_max numeric DEFAULT NULL::numeric,
  p_payment_plan text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_search_field text DEFAULT NULL::text,
  p_req_status_id uuid DEFAULT NULL::uuid, p_accountant_status text DEFAULT NULL::text,
  p_agent_id uuid DEFAULT NULL::uuid, p_nationality_id uuid DEFAULT NULL::uuid, p_overdue boolean DEFAULT NULL::boolean,
  p_limit integer DEFAULT 30, p_offset integer DEFAULT 0, p_req_stages text[] DEFAULT NULL::text[])
 RETURNS TABLE(id uuid, total bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_oscope uuid[] := public.current_user_invoice_office_scope();
  v_sscope uuid[] := public.current_user_invoice_service_scope();
  v_office uuid[];
  v_service uuid[];
  v_lo timestamptz := case when p_from is null then null else ((p_from::timestamp + interval '5 hours') at time zone 'Asia/Riyadh') end;
  v_hi timestamptz := case when p_to   is null then null else (((p_to + 1)::timestamp + interval '5 hours') at time zone 'Asia/Riyadh') end;
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

  return query
  with base as (
    select i.id as iid, i.last_activity_at, i.created_at, i.status_id
    from invoices i
    where i.id in (
      select public.invoice_match_ids(
        v_office, p_branch_exact_ids, v_service, p_pay_statuses,
        null::date, null::date,   -- date range applied below on ACTIVITY (issue / payment / cancel), not just issue
        p_amount_min, p_amount_max, p_payment_plan, p_search, p_search_field,
        p_req_status_id, p_accountant_status, p_agent_id, p_nationality_id, p_overdue, p_req_stages)
    )
  ),
  m as (
    select b.iid, b.last_activity_at, b.created_at
    from base b
    left join lookup_items st on st.id = b.status_id
    where (v_lo is null and v_hi is null)
       or ((v_lo is null or b.created_at >= v_lo) and (v_hi is null or b.created_at < v_hi))
       or exists (
         select 1 from payments p
         where p.invoice_id = b.iid and p.deleted_at is null
           and (v_lo is null or p.payment_date >= v_lo)
           and (v_hi is null or p.payment_date <  v_hi))
       or (st.code = 'cancelled'
           and (v_lo is null or b.last_activity_at >= v_lo)
           and (v_hi is null or b.last_activity_at <  v_hi))
  )
  select m.iid, count(*) over() as total
  from m
  order by m.last_activity_at desc nulls last, m.created_at desc nulls last, m.iid
  limit coalesce(p_limit, 30) offset coalesce(p_offset, 0);
end$function$;
