-- تحصيل الفواتير: مدّة التجديد على صفّ فاتورة «تجديد الإقامة» — عمود جديد في آخر العرض
-- (`renewal_months`) ليُكتب اسم الخدمة بمدّتها («تجديد الإقامة 6 أشهر»).
-- المدّة من **طلب التجديد** أولاً (iqama_renewal_applications.duration_months) ثم من الحسبة.
-- العرض طويل، فيُعاد بناؤه من تعريفه القائم بإلحاق العمود — ويبقى security_invoker كما هو.
do $$
declare d text; a text := 'f.hrsd_number AS facility_hrsd'; n int;
begin
  d := pg_get_viewdef('public.v_ops_collections'::regclass, true);
  if position('AS renewal_months' in d) > 0 then return; end if;
  n := (length(d) - length(replace(d, a, ''))) / length(a);
  if n <> 1 then raise exception 'anchor found % times', n; end if;
  d := replace(d, a, a || ',
    CASE WHEN stc.code::text = ''iqama_renewal''::text THEN COALESCE(
        NULLIF(( SELECT max(ra.duration_months) FROM iqama_renewal_applications ra
                  WHERE ra.service_request_id = sr.id AND ra.deleted_at IS NULL), 0),
        ( SELECT max(COALESCE(rc.expected_duration_months, rc.renewal_months)) FROM iqama_renewal_calculation rc
           WHERE rc.invoice_id = i.id AND rc.deleted_at IS NULL))
    END AS renewal_months');
  execute 'create or replace view public.v_ops_collections with (security_invoker = true) as ' || d;
end $$;
