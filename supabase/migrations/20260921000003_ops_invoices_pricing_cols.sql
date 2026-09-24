-- بطاقة الفاتورة في جداول العمل تعرض **تفصيل الرسوم** (طلب المستخدم 2026-09-21).
-- التفصيل يُبنى بأسماء `quoteFeeFields` — مصدر أسماء البنود نفسه الذي يحرّر به
-- كرت التسعير ويُطبع به قالب الفاتورة، فلا يفترق ما في الشيت عمّا في الصفحة.
-- ويحتاج من الفاتورة شيئين لم يكن `v_ops_invoices` يحملهما: رمز الخدمة (يحدّد
-- شكل التسعيرة) وبنود الفاتورة العاديّة (`pricing_breakdown`). كلاهما يُلحَق
-- بآخر قائمة الاختيار — CREATE OR REPLACE VIEW لا يقبل إدراجاً في وسطها.
do $$
declare d text; p int;
begin
  if to_regclass('public.v_ops_invoices') is null then return; end if;   -- نسخةٌ بلا شيتات
  d := pg_get_viewdef('public.v_ops_invoices'::regclass, true);
  if strpos(d, 'service_code') > 0 then return; end if;                  -- مُطبَّقة سلفاً
  p := strpos(d, E'\n   FROM ');
  if p = 0 then raise exception 'no top-level FROM in v_ops_invoices'; end if;
  execute 'create or replace view public.v_ops_invoices as '
    || left(d, p - 1) || E',\n    st.code AS service_code,\n    i.pricing_breakdown' || substr(d, p);
end $$;
