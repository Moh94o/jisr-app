-- Qawaem labels a fiscal year by the year it ends in; a year that ends on 1 January (contracts
-- «من 2 يناير إلى 1 يناير») is in substance the previous calendar year ⇒ label = year(end − 1 day).
create or replace view public.v_qawaem_years as
with cur as (select (now() at time zone 'Asia/Riyadh')::date d),
fac as (
  select v.unified_number, v.issue_g, s.entity_type_ar ent,
         f.first_fy_end, f.basis
    from v_qawaem_facilities v
    left join sbc_facilities s on s.cr_national_number = v.unified_number
    left join facility_fiscal_years f on f.unified_number = v.unified_number and f.first_fy_end is not null
),
ends as (
  select fac.unified_number, fac.basis, (fac.first_fy_end + make_interval(months => 12 * n))::date fy_end, n
    from fac, cur, generate_series(0, 40) n
   where fac.first_fy_end is not null and (fac.first_fy_end + make_interval(months => 12 * n))::date <= cur.d
),
contract_rows as (
  select e.unified_number, 'G'::char(1) calendar, extract(year from e.fy_end - 1)::int fiscal_year,
         case when e.n = 0 then f.issue_g else (e.fy_end - interval '12 months' + interval '1 day')::date end fy_start,
         e.fy_end, (e.fy_end + interval '6 months')::date deadline, e.basis fy_basis,
         q.is_filed, q.first_pending_at, q.approved_at, q.check_error, q.last_checked_at
    from ends e
    join fac f on f.unified_number = e.unified_number
    left join qawaem_filings q on q.unified_number = e.unified_number and q.calendar = 'G' and q.fiscal_year = extract(year from e.fy_end - 1)::int
),
first_open as (
  select f.unified_number, 'G'::char(1) calendar, extract(year from f.first_fy_end - 1)::int fiscal_year,
         f.issue_g fy_start, f.first_fy_end fy_end, (f.first_fy_end + interval '6 months')::date deadline, f.basis fy_basis
    from fac f, cur where f.first_fy_end is not null and f.first_fy_end > cur.d
),
other_filed as (
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
