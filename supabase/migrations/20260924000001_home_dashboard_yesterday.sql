-- لوحة الرئيسية: فترة «أمس» بعد «اليوم» — من بداية أمس إلى بداية اليوم (يوم العمل يبدأ 05:00 بتوقيت الرياض)،
-- وتُقارَن بأوّل أمس. تُضاف سطراً في pdates دون المساس ببقية الدالة: نعدّل تعريفها الحالي نصّياً.
do $mig$
declare
  d text;
  anchor constant text := $a$('today', v_today, v_today - 1, null::date),$a$;
begin
  select pg_get_functiondef('public.home_dashboard(date,date)'::regprocedure) into d;
  if position($a$'yesterday'$a$ in d) > 0 then
    raise notice 'home_dashboard already has yesterday';
    return;
  end if;
  if position(anchor in d) = 0 then
    raise exception 'home_dashboard: anchor for today period not found';
  end if;
  d := replace(d, anchor, anchor || E'\n      ' || $a$('yesterday', v_today - 1, v_today - 2, v_today),$a$);
  execute d;
end
$mig$;
