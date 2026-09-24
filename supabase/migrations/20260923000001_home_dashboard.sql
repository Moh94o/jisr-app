-- لوحة الصفحة الرئيسية: نداءٌ واحد يُرجع كل أرقامها مقسّمةً حسب المكتب × الفترة،
-- فتتبدّل الفترة والمكتب في الواجهة بلا نداءٍ جديد.
--
-- قواعد الأرقام (نفس كروت الفواتير وملخص الواتساب):
--   • «الداخل» = دفعات صحيحة موجبة بتاريخ الدفع، بلا نظر لحالة فاتورتها.
--   • «الخارج» = المرتجعات (دفعات سالبة) + كامل المسدَّد على الفواتير الملغاة، بتاريخ الإلغاء.
--   • يوم العمل يبدأ 05:00 بتوقيت الرياض، والأسبوع يبدأ الجمعة.
--   • الفترة السابقة تُقاس بنفس المدّة المنقضية (حتى اللحظة) لتكون المقارنة عادلة.
-- الأمان: SECURITY DEFINER + نطاق مكاتب المستخدم يُفرض داخلها؛ الأرقام المالية
-- لا تخرج إلا لمن إحصاءات الفواتير له «real».
-- p_from/p_to (اختياريان): فترةٌ مخصّصة تُضاف بالمفتاح 'custom'، وسابقتها = نفس الطول قبلها مباشرة.
drop function if exists public.home_dashboard();
create or replace function public.home_dashboard(p_from date default null, p_to date default null)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_scope uuid[]  := public.current_user_invoice_office_scope();
  v_money boolean := public.current_user_stats_mode('invoices') = 'real';
  v_today date    := ((now() at time zone 'Asia/Riyadh') - interval '5 hours')::date;
  v_result jsonb;
begin
  with
  -- حدود الفترات: [s,e) الحالية و[ps,pe) السابقة بنفس المدّة المنقضية.
  -- ed = نهاية حصرية (للمخصّصة فقط، وإلا «الآن»)؛ psd = بداية السابقة (للمخصّصة: s − الطول).
  pdates as (
    select k, sd, psd, ed from (values
      ('today', v_today, v_today - 1, null::date),
      ('week',  v_today - ((extract(dow from v_today)::int + 2) % 7),
                v_today - ((extract(dow from v_today)::int + 2) % 7) - 7, null::date),
      ('month', date_trunc('month', v_today)::date, (date_trunc('month', v_today) - interval '1 month')::date, null::date),
      ('year',  date_trunc('year',  v_today)::date, (date_trunc('year',  v_today) - interval '1 year')::date, null::date)
    ) t(k, sd, psd, ed)
    union all
    select 'custom', least(p_from, p_to), null::date, greatest(p_from, p_to) + 1
    where p_from is not null and p_to is not null
  ),
  periods0 as (
    select k,
           (sd::timestamp + interval '5 hours') at time zone 'Asia/Riyadh' as s,
           case when ed is null then now()
                else least(now(), (ed::timestamp + interval '5 hours') at time zone 'Asia/Riyadh') end as e,
           case when psd is null then null
                else (psd::timestamp + interval '5 hours') at time zone 'Asia/Riyadh' end as ps0,
           ed
    from pdates
  ),
  periods as (
    select k, s, e,
           case when ps0 is null
                then s - (e - s)
                else ps0 end as ps,
           case when ps0 is null then s else ps0 + (e - s) end as pe
    from periods0
  ),
  inv as materialized (
    -- الوسيط: حقل الفاتورة وإلا جدول service_request_agents (مصدره الفعلي منذ الواجهة الجديدة)
    select i.id, i.branch_id as b, coalesce(i.agent_id, sra.agent_id) as agent_id, i.total_amount, i.paid_amount, i.remaining_amount,
           coalesce(st.code, 'general') as svc,
           (ss.code = 'cancelled') as cancelled,
           coalesce(sr.request_date, i.created_at) as issued_at,
           coalesce((i.cancel_log -> -1 ->> 'at')::timestamptz, i.created_at) as cancelled_at,
           case when st.code like 'work_visa%'
                then coalesce(nullif(va.n, 0), sr.quantity, 1) else 1 end as units
    from invoices i
    left join lookup_items st on st.id = i.service_type_id
    left join lookup_items ss on ss.id = i.status_id
    left join service_requests sr on sr.id = i.service_request_id
    left join (select distinct on (service_request_id) service_request_id, agent_id from service_request_agents
               order by service_request_id, created_at desc) sra on sra.service_request_id = i.service_request_id
    left join (select service_request_id, count(*) as n from visa_applications
               where deleted_at is null group by 1) va on va.service_request_id = i.service_request_id
    where i.deleted_at is null
      and (v_scope is null or i.branch_id = any(v_scope))
  ),
  -- حركة النقد: داخل (موجب) وخارج (مرتجع بتاريخه + مسدَّد الملغاة بتاريخ الإلغاء)
  flow as materialized (
    select inv.b, p.payment_date as ts,
           case when p.amount > 0 then p.amount else 0 end as amt_in,
           case when p.amount > 0 and pm.code = 'cash' then p.amount else 0 end as amt_cash,
           case when p.amount > 0 and pm.code in ('bank_transfer','pos') then p.amount else 0 end as amt_bank,
           case when p.amount < 0 then -p.amount else 0 end as amt_out
    from payments p
    join inv on inv.id = p.invoice_id
    left join lookup_items pm on pm.id = p.payment_method_id
    where p.deleted_at is null and p.is_valid and v_money
    union all
    select inv.b, inv.cancelled_at, 0, 0, 0, sum(p.amount)
    from inv
    join payments p on p.invoice_id = inv.id and p.deleted_at is null and p.is_valid
    where inv.cancelled and v_money
    group by inv.b, inv.cancelled_at, inv.id
  ),
  -- الدفعات الموجبة لكل فاتورة: تفصل «فواتير جديدة» عن «فواتير سابقة سُدِّد عليها في الفترة»
  pays as materialized (
    select inv.b, inv.id, inv.issued_at, p.payment_date as ts, p.amount
    from payments p
    join inv on inv.id = p.invoice_id
    where p.deleted_at is null and p.is_valid and p.amount > 0
  ),
  oldp as (
    select x.b, pr.k,
           count(distinct x.id) filter (where x.issued_at <  pr.s) as old_cnt,
           sum(x.amount)        filter (where x.issued_at <  pr.s) as old_sum,
           count(distinct x.id) filter (where x.issued_at >= pr.s) as new_cnt,
           sum(x.amount)        filter (where x.issued_at >= pr.s) as new_sum
    from pays x cross join periods pr
    where x.ts >= pr.s and x.ts < pr.e
    group by x.b, pr.k
  ),
  fin as (
    select f.b, pr.k,
           sum(f.amt_in)   filter (where f.ts >= pr.s  and f.ts < pr.e)  as in_c,
           sum(f.amt_cash) filter (where f.ts >= pr.s  and f.ts < pr.e)  as cash_c,
           sum(f.amt_bank) filter (where f.ts >= pr.s  and f.ts < pr.e)  as bank_c,
           sum(f.amt_out)  filter (where f.ts >= pr.s  and f.ts < pr.e)  as out_c,
           sum(f.amt_in)   filter (where f.ts >= pr.ps and f.ts < pr.pe) as in_p,
           sum(f.amt_out)  filter (where f.ts >= pr.ps and f.ts < pr.pe) as out_p
    from flow f cross join periods pr
    where f.ts >= pr.ps
    group by f.b, pr.k
  ),
  invp as (
    select inv.b, pr.k,
           count(*)          filter (where not inv.cancelled and inv.issued_at >= pr.s  and inv.issued_at < pr.e)  as cnt_c,
           sum(inv.total_amount) filter (where not inv.cancelled and inv.issued_at >= pr.s and inv.issued_at < pr.e) as sum_c,
           count(*)          filter (where not inv.cancelled and inv.issued_at >= pr.ps and inv.issued_at < pr.pe) as cnt_p,
           sum(inv.total_amount) filter (where not inv.cancelled and inv.issued_at >= pr.ps and inv.issued_at < pr.pe) as sum_p,
           count(*) filter (where inv.cancelled and inv.cancelled_at >= pr.s and inv.cancelled_at < pr.e) as canc_c,
           count(*) filter (where not inv.cancelled and inv.issued_at >= pr.s and inv.issued_at < pr.e
                              and coalesce(inv.remaining_amount, 0) <= 0) as paid_c,
           count(*) filter (where not inv.cancelled and inv.issued_at >= pr.s and inv.issued_at < pr.e
                              and coalesce(inv.remaining_amount, 0) > 0 and coalesce(inv.paid_amount, 0) > 0) as part_c,
           count(*) filter (where not inv.cancelled and inv.issued_at >= pr.s and inv.issued_at < pr.e
                              and coalesce(inv.remaining_amount, 0) > 0 and coalesce(inv.paid_amount, 0) <= 0) as unpaid_c
    from inv cross join periods pr
    where inv.issued_at >= pr.ps or (inv.cancelled and inv.cancelled_at >= pr.s)
    group by inv.b, pr.k
  ),
  svcp as (
    select inv.b, pr.k, inv.svc, count(*) as cnt, sum(inv.units) as units, sum(inv.total_amount) as total
    from inv cross join periods pr
    where not inv.cancelled and inv.issued_at >= pr.s and inv.issued_at < pr.e
    group by inv.b, pr.k, inv.svc
  ),
  -- الوسطاء: فواتير كل وسيط (السارية) لكل مكتب × فترة × خدمة
  agp as (
    select inv.b, pr.k, inv.agent_id as a, inv.svc, count(*) as cnt, sum(inv.total_amount) as total
    from inv cross join periods pr
    where inv.agent_id is not null and not inv.cancelled and inv.issued_at >= pr.s and inv.issued_at < pr.e
    group by inv.b, pr.k, inv.agent_id, inv.svc
  ),
  -- المتبقي على العملاء (كل الفواتير السارية)
  -- المتبقي على العملاء (كل الفواتير السارية) مفصّلاً حسب نوع الخدمة
  recv as (
    select b, svc, count(*) as cnt, sum(remaining_amount) as total
    from inv where not cancelled and coalesce(remaining_amount, 0) > 0
    group by b, svc
  ),
  -- اتجاه يومي آخر 30 يوم عمل، وشهري آخر 12 شهراً
  daily as (
    select b, ((ts at time zone 'Asia/Riyadh') - interval '5 hours')::date as d,
           sum(amt_in) as i, sum(amt_out) as o
    from flow
    where ts >= ((v_today - 29)::timestamp + interval '5 hours') at time zone 'Asia/Riyadh'
    group by 1, 2
  ),
  monthly as (
    select b, to_char(((ts at time zone 'Asia/Riyadh') - interval '5 hours'), 'YYYY-MM') as m,
           sum(amt_in) as i, sum(amt_out) as o
    from flow
    where ts >= ((date_trunc('month', v_today) - interval '11 months')::timestamp + interval '5 hours') at time zone 'Asia/Riyadh'
    group by 1, 2
  ),
  inv_monthly as (
    select b, to_char(((issued_at at time zone 'Asia/Riyadh') - interval '5 hours'), 'YYYY-MM') as m,
           count(*) as n, sum(total_amount) as total
    from inv
    where not cancelled
      and issued_at >= ((date_trunc('month', v_today) - interval '11 months')::timestamp + interval '5 hours') at time zone 'Asia/Riyadh'
    group by 1, 2
  ),
  -- العمالة: مكتب العامل وإلا مكتب منشأته
  wk as materialized (
    select coalesce(w.branch_id, f.branch_id) as b,
           w.iqama_expiry_date as ex,
           coalesce(n.country_name_ar, case
             when w.nationality_ar ~ '(بنج|بنغ)'        then 'بنغلاديش'
             when w.nationality_ar ~ 'هند'              then 'الهند'
             when w.nationality_ar ~ 'باكستان'          then 'باكستان'
             when w.nationality_ar ~ '^مصر'             then 'مصر'
             when w.nationality_ar ~ 'يمن'              then 'اليمن'
             when w.nationality_ar ~ 'نيبال'            then 'نيبال'
             when w.nationality_ar ~ 'سودان'            then 'السودان'
             when w.nationality_ar ~ '(سري ?لان|سيريلان)' then 'سريلانكا'
             when w.nationality_ar ~ '(أفغان|افغان)'    then 'أفغانستان'
             when w.nationality_ar ~ 'فلبين'            then 'الفلبين'
             when nullif(trim(w.nationality_ar), '') is null then 'غير محدد'
             else trim(w.nationality_ar) end) as nat
    from workers w
    left join facilities f on f.id = w.current_facility_id
    left join nationalities n on n.id = w.nationality_id
    where w.deleted_at is null
      and (v_scope is null or coalesce(w.branch_id, f.branch_id) = any(v_scope))
  ),
  wexp as (
    select b, count(*) as total,
           count(*) filter (where ex < v_today) as expired,
           count(*) filter (where ex >= v_today and ex < v_today + 30) as d30,
           count(*) filter (where ex >= v_today + 30 and ex < v_today + 60) as d60,
           count(*) filter (where ex >= v_today + 60 and ex < v_today + 90) as d90,
           count(*) filter (where ex >= v_today + 90) as ok,
           count(*) filter (where ex is null) as unknown
    from wk group by b
  ),
  wnat as (select b, nat, count(*) as n from wk group by b, nat),
  -- المكاتب الظاهرة: كل مكتبٍ له فاتورة أو عامل ضمن النطاق + المكاتب الفعّالة ضمن النطاق
  br as (
    select b.id, b.branch_code, b.name_ar, coalesce(b.is_test, false) as is_test, b.is_active
    from branches b
    where b.deleted_at is null
      and (v_scope is null or b.id = any(v_scope))
      and (b.is_active or exists (select 1 from inv where inv.b = b.id) or exists (select 1 from wk where wk.b = b.id))
  )
  select jsonb_build_object(
    'today',    v_today,
    'custom',   case when p_from is not null and p_to is not null then jsonb_build_object('from', least(p_from, p_to), 'to', greatest(p_from, p_to)) end,
    'money',    v_money,
    'scoped',   v_scope is not null,
    'branches', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'code', branch_code, 'name', name_ar,
                  'test', is_test, 'active', is_active) order by branch_code), '[]') from br),
    'fin',      (select coalesce(jsonb_agg(jsonb_build_object('b', b, 'k', k, 'in', coalesce(in_c,0), 'cash', coalesce(cash_c,0),
                  'bank', coalesce(bank_c,0), 'out', coalesce(out_c,0), 'inP', coalesce(in_p,0), 'outP', coalesce(out_p,0))), '[]') from fin),
    'inv',      (select coalesce(jsonb_agg(jsonb_build_object('b', b, 'k', k, 'cnt', cnt_c, 'sum', coalesce(sum_c,0),
                  'cntP', cnt_p, 'sumP', coalesce(sum_p,0), 'canc', canc_c, 'paid', paid_c, 'part', part_c, 'unpaid', unpaid_c)), '[]') from invp),
    'oldPay',   (select coalesce(jsonb_agg(jsonb_build_object('b', b, 'k', k, 'oldCnt', old_cnt, 'newCnt', new_cnt,
                  'oldSum', case when v_money then coalesce(old_sum,0) end, 'newSum', case when v_money then coalesce(new_sum,0) end)), '[]') from oldp),
    'svc',      (select coalesce(jsonb_agg(jsonb_build_object('b', b, 'k', k, 'svc', svc, 'cnt', cnt, 'units', units,
                  'sum', case when v_money then coalesce(total,0) end)), '[]') from svcp),
    'agents',   (select coalesce(jsonb_agg(jsonb_build_object('b', b, 'k', k, 'a', a, 'svc', svc, 'cnt', cnt,
                  'sum', case when v_money then coalesce(total,0) end)), '[]') from agp),
    'agentNames', (select coalesce(jsonb_object_agg(ag.id, coalesce(nullif(trim(ag.name_ar), ''), ag.name_en)), '{}')
                 from agents ag where ag.id in (select distinct a from agp)),
    'svcNames', (select coalesce(jsonb_object_agg(code, jsonb_build_object('ar', value_ar, 'en', value_en)), '{}')
                 from (select distinct on (li.code) li.code, li.value_ar, li.value_en from lookup_items li
                       where li.code in (select distinct svc from inv) order by li.code, li.is_active desc) s),
    'recv',     (select coalesce(jsonb_agg(jsonb_build_object('b', b, 'svc', svc, 'cnt', cnt,
                  'sum', case when v_money then coalesce(total,0) end)), '[]') from recv),
    'daily',    (select coalesce(jsonb_agg(jsonb_build_object('b', b, 'd', d, 'i', coalesce(i,0), 'o', coalesce(o,0))), '[]') from daily),
    'monthly',  (select coalesce(jsonb_agg(jsonb_build_object('b', b, 'm', m, 'i', coalesce(i,0), 'o', coalesce(o,0))), '[]') from monthly),
    'invMonthly', (select coalesce(jsonb_agg(jsonb_build_object('b', b, 'm', m, 'n', n,
                  'sum', case when v_money then coalesce(total,0) end)), '[]') from inv_monthly),
    'workers',  (select coalesce(jsonb_agg(jsonb_build_object('b', b, 'total', total, 'expired', expired, 'd30', d30,
                  'd60', d60, 'd90', d90, 'ok', ok, 'unknown', unknown)), '[]') from wexp),
    'nat',      (select coalesce(jsonb_agg(jsonb_build_object('b', b, 'nat', nat, 'n', n)), '[]') from wnat)
  ) into v_result;

  -- بلا صلاحية إحصاءات مالية: تُحذف قيم الفواتير والنقد، وتبقى الأعداد
  if not v_money then
    v_result := v_result || jsonb_build_object(
      'inv', (select coalesce(jsonb_agg(e - 'sum' - 'sumP'), '[]') from jsonb_array_elements(v_result->'inv') e));
  end if;

  return v_result;
end
$function$;

revoke all on function public.home_dashboard(date, date) from public, anon;
grant execute on function public.home_dashboard(date, date) to authenticated;
