create or replace view public.v_ops_qawaem as
with old as (
  select distinct on (d.request_body->>'crNationalNumber') d.request_body->>'crNationalNumber' cr, d.response_body rb
    from sbc_sync_debug d
   where d.endpoint = 'Qawaem/GetCRSubmissionInfo' and d.response_status = 200 and jsonb_typeof(d.response_body) = 'array'
   order by d.request_body->>'crNationalNumber', d.created_at desc
), olde as (
  -- one old filing per facility × calendar × year: the latest (a resubmission
  -- leaves two entries for the same year)
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
