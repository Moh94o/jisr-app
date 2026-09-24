-- «بطاقة العامل» في جداول العمل تعرض تاريخ الميلاد (طلب المستخدم 2026-09-21).
-- البطاقة تُبنى من حقول الصفّ الحاضر وحدها — فما لا يحمله العرض لا يُعرض.
-- والعرضان يصلان `workers` أصلاً (`w.passport_number` منه)، فالإضافة عمودٌ واحد
-- يُلحَق **بآخر** قائمة الاختيار: CREATE OR REPLACE VIEW لا يقبل إدراجاً في وسطها.
do $$
declare v text; d text; nd text; p int;
begin
  foreach v in array array['public.v_ops_iqama_renewals', 'public.v_ops_service_requests'] loop
    d := pg_get_viewdef(v::regclass, true);
    if strpos(d, 'birth_date') > 0 then continue; end if;   -- مُطبَّقة سلفاً
    p := strpos(d, E'\n   FROM ');                          -- الـFROM العلويّ وحده بثلاث مسافات
    if p = 0 then raise exception 'no top-level FROM in %', v; end if;
    nd := left(d, p - 1) || E',\n    w.birth_date' || substr(d, p);
    execute 'create or replace view ' || v || ' as ' || nd;
  end loop;
end $$;
