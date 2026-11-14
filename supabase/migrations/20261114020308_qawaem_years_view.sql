-- One row per facility × fiscal year to display, from qawaem_filings (monthly
-- check of the public Qawaem enquiry API).
--  * calendar shown = Hijri only if the facility filed a Hijri year and no
--    Gregorian one; otherwise Gregorian.
--  * filed years always shown; not-filed years only when past (y < current year)
--    and the CR existed for it — the issue year counts only if the CR was issued
--    in the first half of it (a CR issued later may run its first fiscal year
--    into the next year, up to 18 months).
--  * a facility with nothing to show gets one placeholder row.
create or replace view public.v_qawaem_years as
with cur as (
  select extract(year from (now() at time zone 'Asia/Riyadh'))::int gy,
         public.qawaem_hijri_year((now() at time zone 'Asia/Riyadh')::date) hy
), fac as (
  select v.unified_number, v.issue_g, v.issue_h,
         case when s.cr_issue_date_hijri is not null then nullif(split_part(s.cr_issue_date_hijri, '-', 2), '')::int end issue_hm
    from v_qawaem_facilities v
    left join sbc_facilities s on s.cr_national_number = v.unified_number
), cal as (
  select f.unified_number,
         case when bool_or(q.is_filed) filter (where q.calendar = 'H')
               and not coalesce(bool_or(q.is_filed) filter (where q.calendar = 'G'), false) then 'H' else 'G' end cal,
         max(q.last_checked_at) last_checked
    from fac f join qawaem_filings q on q.unified_number = f.unified_number
   group by 1
), yrs as (
  select f.unified_number, q.calendar, q.fiscal_year, q.is_filed, q.first_pending_at, q.approved_at,
         q.check_error, q.last_checked_at
    from fac f
    join cal c on c.unified_number = f.unified_number
    join qawaem_filings q on q.unified_number = f.unified_number and q.calendar = c.cal
    cross join cur
   where q.is_filed
      or (q.check_error is not null and q.is_filed is null)
      or (q.calendar = 'G' and f.issue_g is not null and q.fiscal_year < cur.gy
          and (q.fiscal_year > extract(year from f.issue_g) or (q.fiscal_year = extract(year from f.issue_g) and extract(month from f.issue_g) <= 6)))
      or (q.calendar = 'H' and f.issue_h is not null and q.fiscal_year < cur.hy
          and (q.fiscal_year > f.issue_h or (q.fiscal_year = f.issue_h and coalesce(f.issue_hm, 12) <= 6)))
)
select y.unified_number, y.calendar, y.fiscal_year,
       case when y.approved_at is not null then 'Approved by SBC'
            when y.is_filed then 'Filed - not approved yet'
            when y.is_filed is null then 'Check failed'
            else 'Not filed' end filing_status,
       y.first_pending_at::date filed_on, y.approved_at::date approved_on, y.check_error, y.last_checked_at
  from yrs y
union all
select c.unified_number, c.cal, null, 'No filings found', null, null, null, c.last_checked
  from cal c
 where not exists (select 1 from yrs y where y.unified_number = c.unified_number);

grant select on public.v_qawaem_years to authenticated;

drop view if exists public.v_ops_qawaem;
create view public.v_ops_qawaem as
with old as (   -- static facts of filings read before the old SBC endpoint died (2026-09-10)
  select distinct on (d.request_body->>'crNationalNumber') d.request_body->>'crNationalNumber' cr, d.response_body rb
    from sbc_sync_debug d
   where d.endpoint = 'Qawaem/GetCRSubmissionInfo' and d.response_status = 200 and jsonb_typeof(d.response_body) = 'array'
   order by d.request_body->>'crNationalNumber', d.created_at desc
), olde as (
  select o.cr, e.value v, case when (e.value->>'isHijriDate')::boolean then 'H' else 'G' end cal, (e.value->>'year')::int y
    from old o, jsonb_array_elements(o.rb) e(value)
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
       case when o.v ->> 'startDate' is not null and o.v ->> 'filingDate' is not null
            then (o.v ->> 'startDate') || ' → ' || (o.v ->> 'filingDate') end statutory_period,
       to_char(y.filed_on, 'YYYY-MM-DD') filed_on,
       to_char(y.approved_on, 'YYYY-MM-DD') approved_on,
       nullif(o.v ->> 'firmName', '') audit_firm,
       case when o.v is null then null when (o.v ->> 'isOnTime')::boolean then 'نعم' else 'لا' end on_time,
       case when o.v is null then null when (o.v ->> 'isUnAudit')::boolean then 'نعم' else 'لا' end unaudited,
       case when o.v is null then null when (o.v ->> 'isResubmission')::boolean then 'نعم' else 'لا' end resubmission,
       o.v ->> 'filingCode' filing_code,
       to_char(y.last_checked_at at time zone 'Asia/Riyadh', 'YYYY-MM-DD') last_checked
  from v_qawaem_years y
  left join sbc_facilities s on s.cr_national_number = y.unified_number
  left join fac on fac.unified_number = y.unified_number
  left join olde o on o.cr = y.unified_number and o.cal = y.calendar and o.y = y.fiscal_year;

grant select on public.v_ops_qawaem to authenticated, anon, service_role;

-- Carry the two manual follow-ups over to the new row keys.
update public.ops_sheet_rows set row_key = '7043720627_G2025' where view_key = 'qawaem' and row_key = '7043720627_2184314';
update public.ops_sheet_rows set row_key = '7051766165_G2026' where view_key = 'qawaem' and row_key = '7051766165_2363188';
