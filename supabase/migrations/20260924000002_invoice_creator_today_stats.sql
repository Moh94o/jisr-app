-- «صانع الفواتير»: يرى كروت الإحصاء لليوم في تبويب الفواتير.
--
-- تبويب الفواتير ممنوعٌ افتراضاً (current_user_stats_mode / statsMode ⇒ 'zero')،
-- فيُمنح الدورُ 'real' صراحةً. غيرُ المدير العام والمحاسب تبقى كروته مثبّتةً على
-- «اليوم» ومقيّدةً بمكتبه في الواجهة وفي invoice_period_stats — فلا يتّسع شيءٌ غير ذلك.
update public.roles
   set ui_visibility = coalesce(ui_visibility, '{}'::jsonb) || jsonb_build_object('stats:invoices', 'real')
 where name_ar in ('صانع الفواتير', 'صانع فواتير');
