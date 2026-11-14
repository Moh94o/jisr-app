-- Fiscal years per facility, driven by the founding contract (facility_fiscal_years):
--   ends = first_fy_end + 12 months × n (up to today); Qawaem labels a year by the calendar year it
--   ends in; deadline = end + 6 months (نظام الشركات م17/2).
-- No contract: only the filed years Qawaem knows of, plus one placeholder row whose status comes from
--   the legal bounds (first year 6–18 months from registration ⇒ deadline between +12 and +24 months).
drop view if exists public.v_ops_qawaem;
drop view if exists public.v_qawaem_years;

create view public.v_qawaem_years as
with cur as (select (now() at time zone 'Asia/Riyadh')::date d),
fac as (
  select v.unified_number, v.issue_g, s.entity_type_ar ent,
         f.first_fy_end, f.basis
    from v_qawaem_facilities v
    left join sbc_facilities s on s.cr_national_number = v.unified_number
    left join facility_fiscal_years f on f.unified_number = v.unified_number and f.first_fy_end is not null
),
ends as (   -- contract facilities: every fiscal year that has ended
  select fac.unified_number, fac.basis, (fac.first_fy_end + make_interval(months => 12 * n))::date fy_end, n
    from fac, cur, generate_series(0, 40) n
   where fac.first_fy_end is not null and (fac.first_fy_end + make_interval(months => 12 * n))::date <= cur.d
),
contract_rows as (
  select e.unified_number, 'G'::char(1) calendar, extract(year from e.fy_end)::int fiscal_year,
         case when e.n = 0 then f.issue_g else (e.fy_end - interval '12 months' + interval '1 day')::date end fy_start,
         e.fy_end, (e.fy_end + interval '6 months')::date deadline, e.basis fy_basis,
         q.is_filed, q.first_pending_at, q.approved_at, q.check_error, q.last_checked_at
    from ends e
    join fac f on f.unified_number = e.unified_number
    left join qawaem_filings q on q.unified_number = e.unified_number and q.calendar = 'G' and q.fiscal_year = extract(year from e.fy_end)::int
),
first_open as (   -- contract facilities whose first fiscal year has not ended yet
  select f.unified_number, 'G'::char(1) calendar, extract(year from f.first_fy_end)::int fiscal_year,
         f.issue_g fy_start, f.first_fy_end fy_end, (f.first_fy_end + interval '6 months')::date deadline, f.basis fy_basis
    from fac f, cur where f.first_fy_end is not null and f.first_fy_end > cur.d
),
other_filed as (  -- filings Qawaem knows of that are not one of the contract's years (or no contract at all)
  select q.unified_number, q.calendar, q.fiscal_year, q.is_filed, q.first_pending_at, q.approved_at, q.check_error, q.last_checked_at
    from qawaem_filings q
   where q.is_filed
     and not exists (select 1 from contract_rows c where c.unified_number = q.unified_number and c.calendar = q.calendar and c.fiscal_year = q.fiscal_year)
),
lastchk as (select unified_number, max(last_checked_at) t from qawaem_filings group by 1)
select c.unified_number, c.calendar, c.fiscal_year,
       case when c.approved_at is not null then 'Approved by SBC'
            when c.is_filed then 'Filed - not approved yet'
            when c.is_filed is null then 'Check failed'
            when c.deadline < cur.d then 'Overdue'
            else 'Not due yet' end filing_status,
       c.first_pending_at::date filed_on, c.approved_at::date approved_on,
       c.fy_start, c.fy_end, c.deadline, c.fy_basis, c.check_error, c.last_checked_at
  from contract_rows c, cur
union all
select o.unified_number, o.calendar, o.fiscal_year, 'First year not ended', null, null,
       o.fy_start, o.fy_end, o.deadline, o.fy_basis, null, l.t
  from first_open o left join lastchk l on l.unified_number = o.unified_number
union all
select o.unified_number, o.calendar, o.fiscal_year,
       case when o.approved_at is not null then 'Approved by SBC' else 'Filed - not approved yet' end,
       o.first_pending_at::date, o.approved_at::date, null, null, null,
       case when f.first_fy_end is null then 'no_contract' else 'outside_contract' end, null, o.last_checked_at
  from other_filed o join fac f on f.unified_number = o.unified_number
union all
select f.unified_number, 'G', null,
       case when f.ent = 'مؤسسة' then 'Establishment - none filed'
            when f.issue_g is null then 'Unknown'
            when (f.issue_g + interval '24 months')::date <= cur.d then 'Overdue (no contract)'
            when (f.issue_g + interval '12 months')::date <= cur.d then 'Maybe overdue (no contract)'
            else 'Not due yet' end,
       null, null, null, null,
       case when f.issue_g is not null then (f.issue_g + interval '24 months')::date end,
       'no_contract', null, l.t
  from fac f cross join cur left join lastchk l on l.unified_number = f.unified_number
 where f.first_fy_end is null
   and l.t is not null
   and not exists (select 1 from qawaem_filings q where q.unified_number = f.unified_number and q.is_filed);

grant select on public.v_qawaem_years to authenticated;

create view public.v_ops_qawaem as
with old as (   -- static facts of filings read before the old SBC endpoint died (2026-09-10)
  select distinct on (d.request_body->>'crNationalNumber') d.request_body->>'crNationalNumber' cr, d.response_body rb
    from sbc_sync_debug d
   where d.endpoint = 'Qawaem/GetCRSubmissionInfo' and d.response_status = 200 and jsonb_typeof(d.response_body) = 'array'
   order by d.request_body->>'crNationalNumber', d.created_at desc
), olde as (
  select distinct on (o.cr, 2, 3) o.cr,
         case when (e.value->>'isHijriDate')::boolean then 'H' else 'G' end cal,
         (e.value->>'year')::int y, e.value v
    from old o, jsonb_array_elements(o.rb) e(value)
   order by o.cr, 2, 3, e.value->>'firstPendingDate' desc nulls last
), fac as (
  select distinct on (unified_number) unified_number, name_ar, gosi_number, hrsd_number
    from facilities where deleted_at is null and merged_into_id is null and unified_number is not null
   order by unified_number, updated_at desc nulls last
)
select y.unified_number || '_' || coalesce(y.calendar || y.fiscal_year::text, 'none') id,
       coalesce(fac.name_ar, s.entity_full_name_ar::character varying) facility_ar,
       y.unified_number,
       coalesce(fac.gosi_number, s.gosi_registration_number::character varying) gosi_number,
       coalesce(fac.hrsd_number, case when s.hrsd_labor_office_id is not null and s.hrsd_sequence_number is not null
                                      then (s.hrsd_labor_office_id || '-') || s.hrsd_sequence_number end) hrsd_number,
       s.cr_confirm_date_gregorian annual_confirm_date,
       s.cr_confirm_date_hijri annual_confirm_hijri,
       y.fiscal_year::text fiscal_year,
       y.filing_status,
       case y.calendar when 'H' then 'هجري' else 'ميلادي' end calendar_type,
       -- the fiscal year itself (start → end): from the contract, else SBC's old record
       case when y.fy_end is not null then coalesce(to_char(y.fy_start, 'YYYY-MM-DD'), '') || ' → ' || to_char(y.fy_end, 'YYYY-MM-DD')
            when o.v ->> 'startDate' is not null and o.v ->> 'filingDate' is not null then (o.v ->> 'startDate') || ' → ' || (o.v ->> 'filingDate') end statutory_period,
       to_char(y.fy_end, 'YYYY-MM-DD') fy_end,
       to_char(y.deadline, 'YYYY-MM-DD') deadline,
       case y.fy_basis when 'contract' then 'عقد التأسيس' when 'contract_amended' then 'عقد التأسيس (معدّل)'
                       when 'outside_contract' then 'لا تطابق سنوات العقد' else 'لا يوجد عقد' end fy_basis,
       to_char(y.filed_on, 'YYYY-MM-DD') filed_on,
       to_char(y.approved_on, 'YYYY-MM-DD') approved_on,
       nullif(o.v ->> 'firmName', '') audit_firm,
       case when y.filed_on is not null and y.deadline is not null then case when y.filed_on <= y.deadline then 'نعم' else 'لا' end
            when o.v is null then null when (o.v ->> 'isOnTime')::boolean then 'نعم' else 'لا' end on_time,
       case when o.v is null then null when (o.v ->> 'isUnAudit')::boolean then 'نعم' else 'لا' end unaudited,
       case when o.v is null then null when (o.v ->> 'isResubmission')::boolean then 'نعم' else 'لا' end resubmission,
       o.v ->> 'filingCode' filing_code,
       to_char(y.last_checked_at at time zone 'Asia/Riyadh', 'YYYY-MM-DD') last_checked
  from v_qawaem_years y
  left join sbc_facilities s on s.cr_national_number = y.unified_number
  left join fac on fac.unified_number = y.unified_number
  left join olde o on o.cr = y.unified_number and o.cal = y.calendar and o.y = y.fiscal_year;

grant select on public.v_ops_qawaem to authenticated, service_role;

-- Make sure every contract fiscal year gets checked, even one labelled before the CR issue year
-- (converted / amended companies).
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
  ), fy as (select unified_number, extract(year from first_fy_end)::int y0 from facility_fiscal_years where first_fy_end is not null),
  cand as (
    select v.unified_number un, 'G'::char(1) cal, y
      from v_qawaem_facilities v cross join cur left join fy on fy.unified_number = v.unified_number,
           generate_series(greatest(least(coalesce(extract(year from v.issue_g)::int, cur.gy - 3), coalesce(fy.y0, 9999)), 2013), cur.gy) y
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
