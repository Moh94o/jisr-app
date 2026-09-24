-- «صانع الفواتير» يغلب في كروت إحصاء الفواتير: من يحمل الدور يرى أرقام اليوم
-- الحقيقية حتى لو كان عنده دورٌ آخر يصفّرها أو يخفيها. (الواجهة: statsMode.)
-- التقييد باليوم وبمكتب المستخدم يبقى كما هو في invoice_period_stats.
create or replace function public.current_user_stats_mode(p_tab text)
 returns text
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select case
    when public.is_general_manager() then 'real'
    when p_tab = 'invoices' and bool_or(is_creator) then 'real'   -- صانع الفواتير يغلب
    when bool_or(v = 'hidden') then 'hidden'
    when bool_or(v = 'zero')   then 'zero'
    when bool_or(v = 'real')   then 'real'
    when p_tab = 'invoices'    then 'zero'      -- تبويب الفواتير ممنوعٌ افتراضاً
    else 'real'
  end
  from (
    select r.ui_visibility->>('stats:' || p_tab) as v,
           r.name_ar in ('صانع الفواتير', 'صانع فواتير') as is_creator
    from public.users u
    join public.roles r
      on r.id = u.role_id
      or r.id in (select ur.role_id from public.user_roles ur where ur.user_id = u.id)
    where u.auth_user_id = auth.uid() and u.is_active and u.deleted_at is null
  ) t;
$function$;
