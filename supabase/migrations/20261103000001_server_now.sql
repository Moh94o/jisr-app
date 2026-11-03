-- ساعة الخادم: الواجهة تحسب «اليوم» (يوم العمل من 5 فجراً بتوقيت الرياض) منها
-- بدل ساعة الجهاز — جهاز ساعته متأخرة يوماً كان يعرض كروت إحصاء الأمس.
create or replace function public.server_now()
returns timestamptz
language sql
stable
as $$ select now() $$;

grant execute on function public.server_now() to anon, authenticated;
