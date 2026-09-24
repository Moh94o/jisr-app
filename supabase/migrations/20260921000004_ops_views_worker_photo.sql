-- صورة العامل في بطاقته داخل جداول العمل (طلب المستخدم 2026-09-21).
-- المصدر `workers.photo_path` (مزامنة مقيم · bucket عام `muqeem-pdfs`) — ٢٥٩٦
-- من ٣٨٦١ عاملاً لها صورة، ومن لا صورةَ له يبقى حرفُ اسمه كما في عمود الصورة.
-- العرضان يصلان `workers` أصلاً، فالإضافة عمودٌ يُلحَق بآخر قائمة الاختيار.
do $$
declare v text; d text; p int;
begin
  foreach v in array array['public.v_ops_iqama_renewals', 'public.v_ops_service_requests'] loop
    if to_regclass(v) is null then continue; end if;
    d := pg_get_viewdef(v::regclass, true);
    if strpos(d, 'photo_path') > 0 then continue; end if;
    p := strpos(d, E'\n   FROM ');
    if p = 0 then raise exception 'no top-level FROM in %', v; end if;
    execute 'create or replace view ' || v || ' as ' || left(d, p - 1) || E',\n    w.photo_path' || substr(d, p);
  end loop;
end $$;
