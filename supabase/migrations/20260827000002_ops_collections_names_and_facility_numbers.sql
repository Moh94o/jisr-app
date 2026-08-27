-- ═══ v_ops_collections — اسم العميل/الوسيط بالإنجليزية، وأرقام المنشأة ═══════
--
-- (1) الاسم كان يُقرأ من `name_ar` وحده، فيفرغ عمود «العميل» لكل من سُجّل اسمه
--     بالإنجليزية فقط: 466 صفّاً من 559 بلا اسم. يُقرأ الآن كما تقرؤه بقيّة
--     شاشات البرنامج — العربي وإلا الإنجليزي. ونفس العلّة في اسم الوسيط.
--
-- (2) عمود «المنشأة» في شيت تحصيل الفواتير صار يعرض **الرقم الموحّد** (الهويّة
--     التي يُبحث بها في مقيم وقوى والتأمينات والمركز السعودي) وتحته بطاقةٌ
--     بأرقامها الثلاثة — فتُضاف الأرقام إلى العرض بدل استنتاجها من الاسم.
--
-- ⚠️ تعديلٌ نصّيّ على التعريف القائم لا إعادةَ كتابةٍ له (13 كيلوبايت): إعادةُ
--    كتابته بيدٍ بابُ خطأ صامت. والأعمدة الجديدة تُلحق **بآخر** قائمة الأعمدة —
--    `CREATE OR REPLACE VIEW` يقرأ الإدراج في الوسط إعادةَ تسميةٍ لما بعده
--    فيرفضه. وترتيب الأعمدة في العرض لا يعني الشيت شيئاً: يختارها بالاسم.
--
-- مطبَّقة على الإنتاج في 2026-08-27؛ هذا الملف سجلُّها في المستودع.

DO $mig$
DECLARE v text; anchor text := E'    i.last_activity_at\n   FROM invoices i';
BEGIN
  v := pg_get_viewdef('public.v_ops_collections'::regclass, true);

  -- (1) الاسم: العربي وإلا الإنجليزي
  IF position('COALESCE(NULLIF(btrim(c.name_ar)' in v) = 0 THEN
    IF position('c.name_ar AS client_name' in v) = 0
       OR position('ag.name_ar AS agent_name' in v) = 0 THEN
      RAISE EXCEPTION 'تعريف العرض تغيّر: لم يُعثر على تعبير اسم العميل أو الوسيط';
    END IF;
    v := replace(v, 'c.name_ar AS client_name',
         'COALESCE(NULLIF(btrim(c.name_ar), ''''), NULLIF(btrim(c.name_en), '''')) AS client_name');
    v := replace(v, 'ag.name_ar AS agent_name',
         'COALESCE(NULLIF(btrim(ag.name_ar), ''''), NULLIF(btrim(ag.name_en), '''')) AS agent_name');
  END IF;

  -- (2) أرقام المنشأة الثلاثة — تُلحق بالآخر
  IF position('facility_unified' in v) = 0 THEN
    IF position(anchor in v) = 0 THEN
      RAISE EXCEPTION 'تعريف العرض تغيّر: لم يُعثر على نهاية قائمة الأعمدة';
    END IF;
    v := replace(v, anchor,
         E'    i.last_activity_at,\n'
      || E'    f.unified_number AS facility_unified,\n'
      || E'    f.gosi_number AS facility_gosi,\n'
      || E'    f.hrsd_number AS facility_hrsd\n'
      || E'   FROM invoices i');
  END IF;

  EXECUTE 'CREATE OR REPLACE VIEW public.v_ops_collections WITH (security_invoker=true) AS ' || v;
END
$mig$;
