-- Fiscal-year end per facility, read from the founding contract (مادة «السنة المالية»).
-- Filled by qawaem-bot (pdfjs on the PC) from documents/sbc-cr-certificates/{un}-contract.pdf.
create table if not exists public.facility_fiscal_years (
  unified_number  text primary key,
  first_fy_end    date,          -- نهاية السنة المالية الأولى (every year after: +12 months)
  first_fy_end_hijri text,
  basis           text not null check (basis in ('contract', 'contract_amended', 'not_found')),
  clause          text,          -- the article text as extracted (normalised)
  source_updated_at timestamptz, -- storage object updated_at of the contract read
  extracted_at    timestamptz not null default now()
);
alter table public.facility_fiscal_years enable row level security;
drop policy if exists facility_fiscal_years_read on public.facility_fiscal_years;
create policy facility_fiscal_years_read on public.facility_fiscal_years for select to authenticated using (true);
grant select on public.facility_fiscal_years to authenticated;

-- Contracts that have no extraction yet, or changed since it.
create or replace function public.qawaem_bot_fy_todo(p_token text, p_limit int default 100)
returns table (unified_number text, issue_g date, file_updated_at timestamptz)
language plpgsql security definer set search_path = public, storage as $$
begin
  if not qawaem_bot_ok(p_token) then raise exception 'denied'; end if;
  return query
  select c.un, v.issue_g, c.updated_at
    from (select split_part(split_part(o.name, '/', 2), '-', 1) un, o.updated_at
            from storage.objects o
           where o.bucket_id = 'documents' and o.name ~ '^sbc-cr-certificates/[0-9]+-contract\.pdf$') c
    left join public.facility_fiscal_years f on f.unified_number = c.un
    left join public.v_qawaem_facilities v on v.unified_number = c.un
   where f.unified_number is null or f.source_updated_at is distinct from c.updated_at
   order by c.un
   limit least(greatest(p_limit, 1), 1000);
end $$;

-- Upsert extractions: [{un, first_fy_end, first_fy_end_hijri, basis, clause, file_updated_at}]
create or replace function public.qawaem_bot_fy_report(p_token text, p_rows jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not qawaem_bot_ok(p_token) then raise exception 'denied'; end if;
  insert into facility_fiscal_years as f (unified_number, first_fy_end, first_fy_end_hijri, basis, clause, source_updated_at, extracted_at)
  select r->>'un', nullif(r->>'first_fy_end', '')::date, nullif(r->>'first_fy_end_hijri', ''), r->>'basis',
         left(r->>'clause', 600), nullif(r->>'file_updated_at', '')::timestamptz, now()
    from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) r
   where r->>'un' ~ '^[0-9]+$'
  on conflict (unified_number) do update set
    first_fy_end = excluded.first_fy_end, first_fy_end_hijri = excluded.first_fy_end_hijri, basis = excluded.basis,
    clause = excluded.clause, source_updated_at = excluded.source_updated_at, extracted_at = now();
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.qawaem_bot_fy_todo(text, int) from public;
revoke all on function public.qawaem_bot_fy_report(text, jsonb) from public;
grant execute on function public.qawaem_bot_fy_todo(text, int) to anon, authenticated;
grant execute on function public.qawaem_bot_fy_report(text, jsonb) to anon, authenticated;
