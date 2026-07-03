-- wa_day_summary's own day_inv/by_service window was properly bounded
-- [day 05:00 Riyadh, next day 05:00 Riyadh), but the embedded `stats` key called
-- invoice_period_stats(p_start := wa_business_day_start(day)) — LOWER bound only.
-- So a business-day summary leaked later activity into its money/cancelled cards:
-- the final summary (posted 05:05 next morning) leaked ~5 minutes, and any
-- re-generation for an older day leaked everything since (e.g. day 2026-07-01
-- rendered with the 4 real cancellations of 07-02).
--
-- Fix: pass p_from/p_to := p_business_day instead. invoice_period_stats' date
-- window ((d::timestamp + interval '5 hours') at time zone 'Asia/Riyadh') is the
-- exact same instant as wa_business_day_start(d) (d 02:00 UTC), so the stats
-- window now coincides with day_inv's and with the invoice-page day-filter cards.
--
-- Applied via Supabase MCP on sandbox (zqkweecwbsjxseelrirr) then prod
-- (gcvshzutdslmdkwqwteh) on 2026-07-03 — both had identical bodies (md5 cd4bdc83).

CREATE OR REPLACE FUNCTION public.wa_day_summary(p_business_day date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with day_inv as (
    select i.id, i.total_amount, i.service_request_id,
           svc.value_ar as ar, svc.value_en as en, svc.code as code
    from invoices i
    left join lookup_items st  on st.id  = i.status_id
    left join lookup_items svc on svc.id = i.service_type_id
    left join service_requests sr on sr.id = i.service_request_id
    where i.deleted_at is null
      and coalesce(sr.request_date, i.created_at) >= public.wa_business_day_start(p_business_day)
      and coalesce(sr.request_date, i.created_at) <  public.wa_business_day_start(p_business_day + 1)
      and st.code is distinct from 'cancelled'
  ),
  inv_qty as (
    select di.*,
      case when di.code in ('work_visa','work_visa_permanent','work_visa_temporary')
        then greatest((select count(*) from visa_applications va
                       where va.service_request_id = di.service_request_id and va.deleted_at is null), 1)
        else 1 end as qty
    from day_inv di
  ),
  by_svc as (
    select coalesce(ar, 'أخرى') as ar, coalesce(en, 'Other') as en, code,
           count(*) as cnt, sum(qty) as qty
    from inv_qty
    group by ar, en, code
    order by count(*) desc, ar
  )
  select jsonb_build_object(
    'business_day',   p_business_day,
    'stats',          public.invoice_period_stats(p_from := p_business_day, p_to := p_business_day),
    'invoice_count',  (select count(*) from day_inv),
    'invoiced_total', (select coalesce(sum(total_amount),0) from day_inv),
    'by_service',     (select coalesce(jsonb_agg(jsonb_build_object('ar',ar,'en',en,'code',code,'cnt',cnt,'qty',qty)), '[]'::jsonb) from by_svc)
  );
$function$;

NOTIFY pgrst, 'reload schema';
