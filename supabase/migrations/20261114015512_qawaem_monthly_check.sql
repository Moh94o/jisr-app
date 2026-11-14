create extension if not exists http with schema extensions;

-- Results: one row per facility × calendar × fiscal year, from the public
-- Qawaem enquiry API (qawaemextapi.scbc.gov.sa/api/QawaemServices/GetCREnquiry).
create table if not exists public.qawaem_filings (
  unified_number   text not null,
  calendar         char(1) not null check (calendar in ('G','H')),   -- G ميلادي · H هجري
  fiscal_year      int  not null,
  is_filed         boolean,
  first_pending_at timestamp,      -- تاريخ الإيداع (توقيت الرياض كما يرجعه المركز)
  approved_at      timestamp,      -- تاريخ الاعتماد
  http_status      int,
  check_error      text,
  raw              jsonb,
  last_checked_at  timestamptz,
  status_changed_at timestamptz,
  created_at       timestamptz not null default now(),
  primary key (unified_number, calendar, fiscal_year)
);
alter table public.qawaem_filings enable row level security;
drop policy if exists qawaem_filings_read on public.qawaem_filings;
create policy qawaem_filings_read on public.qawaem_filings for select to authenticated using (true);
grant select on public.qawaem_filings to authenticated;

create table if not exists public.qawaem_queue (
  unified_number text not null,
  calendar       char(1) not null,
  fiscal_year    int not null,
  enqueued_at    timestamptz not null default now(),
  next_try_at    timestamptz not null default now(),
  attempts       int not null default 0,
  last_error     text,
  primary key (unified_number, calendar, fiscal_year)
);
alter table public.qawaem_queue enable row level security;
grant select on public.qawaem_queue to authenticated;
drop policy if exists qawaem_queue_read on public.qawaem_queue;
create policy qawaem_queue_read on public.qawaem_queue for select to authenticated using (true);

-- Approximate Hijri year of a Gregorian date (matches the real Hijri year on
-- all 835 SBC CR issue dates).
create or replace function public.qawaem_hijri_year(d date) returns int
language sql immutable as $$ select (floor((d - date '0622-07-16')::numeric / 354.36707) + 1)::int $$;

-- Facilities to check, with their CR issue date (Gregorian + Hijri year).
create or replace view public.v_qawaem_facilities as
with f as (
  select distinct on (unified_number) unified_number un, name_ar, cr_issue_date
    from facilities
   where deleted_at is null and merged_into_id is null and unified_number ~ '^7\d{9}$'
   order by unified_number, updated_at desc nulls last
), u as (
  select un from f
  union
  select cr_national_number from sbc_facilities where cr_national_number ~ '^7\d{9}$'
)
select u.un unified_number,
       coalesce(s.cr_issue_date_gregorian, f.cr_issue_date::date) issue_g,
       coalesce(nullif(split_part(s.cr_issue_date_hijri, '-', 3), '')::int,
                public.qawaem_hijri_year(coalesce(s.cr_issue_date_gregorian, f.cr_issue_date::date))) issue_h
  from u
  left join f on f.un = u.un
  left join sbc_facilities s on s.cr_national_number = u.un;

-- Build the month's work list. Every year from the CR issue year to the current
-- year, in both calendars until the facility's calendar is known (a filed year
-- in one calendar and none in the other). Approved years are final and skipped;
-- anything checked in the last 20 days is skipped unless p_force.
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
       and not (c.cal = 'H' and k.g and not k.h)
       and not (c.cal = 'G' and k.h and not k.g)
    on conflict do nothing
    returning 1
  )
  select count(*) into n from ins;
  return n;
end $$;

-- Drain the queue for ~p_max_seconds (called every minute by pg_cron).
create or replace function public.qawaem_worker(p_max_seconds int default 45) returns int
language plpgsql security definer set search_path = public, extensions as $$
declare
  r record; resp extensions.http_response; v jsonb; n int := 0;
  started timestamptz := clock_timestamp();
  fp timestamp; ap timestamp; filed boolean;
begin
  if not exists (select 1 from qawaem_queue where next_try_at <= now()) then return 0; end if;
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '20');
  loop
    exit when clock_timestamp() - started > make_interval(secs => p_max_seconds);
    select * into r from qawaem_queue where next_try_at <= now()
      order by enqueued_at, unified_number, calendar, fiscal_year
      limit 1 for update skip locked;
    exit when not found;
    n := n + 1;
    begin
      resp := extensions.http_get('https://qawaemextapi.scbc.gov.sa/api/QawaemServices/GetCREnquiry?crno='
                                  || r.unified_number || '&fiscalyear=' || r.fiscal_year);
      if resp.status <> 200 or left(ltrim(resp.content), 1) <> '[' then
        raise exception 'HTTP % %', resp.status, left(coalesce(resp.content, ''), 120);
      end if;
      v := (resp.content::jsonb) -> 0;
      if v is null or not (v ? 'IsAvailability') then
        raise exception 'unexpected body %', left(resp.content, 120);
      end if;
      filed := lower(v ->> 'IsAvailability') = 'true';
      fp := case when jsonb_typeof(v -> 'FirstPendingDate') = 'string' then (v ->> 'FirstPendingDate')::timestamp end;
      ap := case when jsonb_typeof(v -> 'ApprovedDate') = 'string' then (v ->> 'ApprovedDate')::timestamp end;
      insert into qawaem_filings as q (unified_number, calendar, fiscal_year, is_filed, first_pending_at, approved_at,
                                       http_status, check_error, raw, last_checked_at, status_changed_at)
      values (r.unified_number, r.calendar, r.fiscal_year, filed, fp, ap, resp.status, null, v, now(), now())
      on conflict (unified_number, calendar, fiscal_year) do update set
        is_filed = excluded.is_filed, first_pending_at = excluded.first_pending_at, approved_at = excluded.approved_at,
        http_status = excluded.http_status, check_error = null, raw = excluded.raw, last_checked_at = now(),
        status_changed_at = case when q.is_filed is distinct from excluded.is_filed
                                   or q.approved_at is distinct from excluded.approved_at
                                 then now() else q.status_changed_at end;
      delete from qawaem_queue where unified_number = r.unified_number and calendar = r.calendar and fiscal_year = r.fiscal_year;
    exception when others then
      if r.attempts + 1 >= 5 then
        insert into qawaem_filings as q (unified_number, calendar, fiscal_year, check_error, last_checked_at)
        values (r.unified_number, r.calendar, r.fiscal_year, sqlerrm, now())
        on conflict (unified_number, calendar, fiscal_year) do update set check_error = excluded.check_error, last_checked_at = now();
        delete from qawaem_queue where unified_number = r.unified_number and calendar = r.calendar and fiscal_year = r.fiscal_year;
      else
        update qawaem_queue set attempts = attempts + 1, last_error = sqlerrm,
               next_try_at = now() + make_interval(mins => 10 * (attempts + 1))
         where unified_number = r.unified_number and calendar = r.calendar and fiscal_year = r.fiscal_year;
      end if;
    end;
  end loop;
  return n;
end $$;

revoke all on function public.qawaem_enqueue(boolean) from public, anon, authenticated;
revoke all on function public.qawaem_worker(int) from public, anon, authenticated;
revoke all on public.v_qawaem_facilities from anon;
