create or replace function public.qawaem_enqueue(p_force boolean default false) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with cur as (
    select extract(year from (now() at time zone 'Asia/Riyadh'))::int gy,
           public.qawaem_hijri_year((now() at time zone 'Asia/Riyadh')::date) hy
  ), known as (
    select unified_number,
           coalesce(bool_or(is_filed) filter (where calendar = 'G'), false) g,
           coalesce(bool_or(is_filed) filter (where calendar = 'H'), false) h
      from qawaem_filings group by 1
  ), cand as (
    select v.unified_number un, 'G'::char(1) cal, y
      from v_qawaem_facilities v, cur,
           generate_series(greatest(coalesce(extract(year from v.issue_g)::int, cur.gy - 3), 2013), cur.gy) y
    union all
    select v.unified_number, 'H', y
      from v_qawaem_facilities v, cur,
           generate_series(greatest(coalesce(v.issue_h, cur.hy - 3), 1434), cur.hy) y
  ), ins as (
    insert into qawaem_queue (unified_number, calendar, fiscal_year)
    select c.un, c.cal, c.y
      from cand c
      left join known k on k.unified_number = c.un
      left join qawaem_filings q on q.unified_number = c.un and q.calendar = c.cal and q.fiscal_year = c.y
     where (p_force or q.approved_at is null)
       and (p_force or q.last_checked_at is null or q.last_checked_at < now() - interval '20 days' or q.check_error is not null)
       and not (c.cal = 'H' and coalesce(k.g, false) and not coalesce(k.h, false))
       and not (c.cal = 'G' and coalesce(k.h, false) and not coalesce(k.g, false))
    on conflict do nothing
    returning 1
  )
  select count(*) into n from ins;
  return n;
end $$;
