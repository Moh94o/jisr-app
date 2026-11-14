-- Saudi government hosts refuse connections from Supabase (every region) and
-- the API has no CORS, so the HTTP calls run from a Saudi-network worker
-- (C:\qawaem-bot under PM2). The DB keeps the queue and the results.
drop function if exists public.qawaem_worker(int);
drop extension if exists http;

create table if not exists public.qawaem_bot_config (
  id int primary key default 1 check (id = 1),
  token_sha256 text not null,
  last_claim_at timestamptz,
  last_report_at timestamptz
);
alter table public.qawaem_bot_config enable row level security;  -- no policies: private
insert into public.qawaem_bot_config (id, token_sha256)
values (1, '<sha256 of QAWAEM_BOT_TOKEN — set on the server, not in git>')
on conflict (id) do update set token_sha256 = excluded.token_sha256;

create or replace function public.qawaem_bot_ok(p_token text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from qawaem_bot_config
                  where token_sha256 = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex'))
$$;
revoke all on function public.qawaem_bot_ok(text) from public, anon, authenticated;

-- Hand out up to p_limit due items, leasing them for 10 minutes.
create or replace function public.qawaem_bot_claim(p_token text, p_limit int default 40)
returns table (unified_number text, calendar text, fiscal_year int)
language plpgsql security definer set search_path = public as $$
begin
  if not qawaem_bot_ok(p_token) then raise exception 'denied'; end if;
  update qawaem_bot_config set last_claim_at = now() where id = 1;
  return query
  with c as (
    select q.unified_number, q.calendar, q.fiscal_year from qawaem_queue q
     where q.next_try_at <= now()
     order by q.enqueued_at, q.unified_number, q.calendar, q.fiscal_year
     limit least(greatest(p_limit, 1), 200)
     for update skip locked
  )
  update qawaem_queue q set next_try_at = now() + interval '10 minutes'
    from c where q.unified_number = c.unified_number and q.calendar = c.calendar and q.fiscal_year = c.fiscal_year
  returning q.unified_number, q.calendar::text, q.fiscal_year;
end $$;

-- Record results: [{un, cal, y, status, body}] or [{un, cal, y, error}].
create or replace function public.qawaem_bot_report(p_token text, p_results jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare
  e jsonb; v jsonb; n int := 0; un text; cal char(1); y int; st int; err text;
  filed boolean; fp timestamp; ap timestamp; att int;
begin
  if not qawaem_bot_ok(p_token) then raise exception 'denied'; end if;
  update qawaem_bot_config set last_report_at = now() where id = 1;
  for e in select * from jsonb_array_elements(coalesce(p_results, '[]'::jsonb)) loop
    un := e->>'un'; cal := e->>'cal'; y := (e->>'y')::int; st := (e->>'status')::int; err := e->>'error';
    continue when not exists (select 1 from qawaem_queue where unified_number = un and calendar = cal and fiscal_year = y);
    v := null;
    if err is null and st = 200 then
      begin
        v := ((e->>'body')::jsonb) -> 0;
      exception when others then v := null;
      end;
      if v is null or not (v ? 'IsAvailability') then err := 'unexpected body: ' || left(coalesce(e->>'body', ''), 120); end if;
    elsif err is null then
      err := 'HTTP ' || coalesce(st::text, '?') || ' ' || left(coalesce(e->>'body', ''), 120);
    end if;

    if err is null then
      filed := lower(v->>'IsAvailability') = 'true';
      fp := case when jsonb_typeof(v->'FirstPendingDate') = 'string' then (v->>'FirstPendingDate')::timestamp end;
      ap := case when jsonb_typeof(v->'ApprovedDate') = 'string' then (v->>'ApprovedDate')::timestamp end;
      insert into qawaem_filings as q (unified_number, calendar, fiscal_year, is_filed, first_pending_at, approved_at,
                                       http_status, check_error, raw, last_checked_at, status_changed_at)
      values (un, cal, y, filed, fp, ap, st, null, v, now(), now())
      on conflict (unified_number, calendar, fiscal_year) do update set
        is_filed = excluded.is_filed, first_pending_at = excluded.first_pending_at, approved_at = excluded.approved_at,
        http_status = excluded.http_status, check_error = null, raw = excluded.raw, last_checked_at = now(),
        status_changed_at = case when q.is_filed is distinct from excluded.is_filed
                                   or q.approved_at is distinct from excluded.approved_at
                                 then now() else q.status_changed_at end;
      delete from qawaem_queue where unified_number = un and calendar = cal and fiscal_year = y;
    else
      select attempts into att from qawaem_queue where unified_number = un and calendar = cal and fiscal_year = y;
      if coalesce(att, 0) + 1 >= 5 then
        insert into qawaem_filings as q (unified_number, calendar, fiscal_year, check_error, http_status, last_checked_at)
        values (un, cal, y, err, st, now())
        on conflict (unified_number, calendar, fiscal_year) do update set check_error = excluded.check_error, http_status = excluded.http_status, last_checked_at = now();
        delete from qawaem_queue where unified_number = un and calendar = cal and fiscal_year = y;
      else
        update qawaem_queue set attempts = attempts + 1, last_error = err,
               next_try_at = now() + make_interval(mins => 10 * (attempts + 1))
         where unified_number = un and calendar = cal and fiscal_year = y;
      end if;
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;

revoke all on function public.qawaem_bot_claim(text, int) from public;
revoke all on function public.qawaem_bot_report(text, jsonb) from public;
grant execute on function public.qawaem_bot_claim(text, int) to anon, authenticated;
grant execute on function public.qawaem_bot_report(text, jsonb) to anon, authenticated;

-- Reset the test rows queued earlier.
delete from public.qawaem_queue;

-- Monthly: 06:00 Riyadh on the 1st.
select cron.unschedule(jobid) from cron.job where jobname = 'qawaem-monthly-enqueue';
select cron.schedule('qawaem-monthly-enqueue', '0 3 1 * *', $$select public.qawaem_enqueue();$$);
